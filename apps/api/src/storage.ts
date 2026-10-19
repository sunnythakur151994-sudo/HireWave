import fs from "node:fs";
import path from "node:path";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type { CandidateAvailability } from "@hirewave/shared";
import type {
  AuditEvent, Candidate, JobSpec, Message, Org, PlanId, Run, ScoredCandidate, User,
} from "@hirewave/shared";
import { PLANS, mergeCandidates, sharesStrongIdentity, candidateIdentityTokens } from "@hirewave/shared";
import { env } from "./env.js";

interface Suppression { orgId: string; candidateId: string; emailHash?: string; identityHashes?: string[]; createdAt: string }
interface StoredCredential { orgId: string; pluginId: string; ciphertext: string; updatedAt: string }

interface AvailabilityInvite {
  id: string; orgId: string; candidateId: string; jobId: string; tokenHash: string;
  createdAt: string; expiresAt: string; sentAt?: string; usedAt?: string;
}
interface MeetingRequest {
  id: string; orgId: string; candidateId: string; jobId: string;
  status: "pending_calendar"; createdAt: string; preferredWindow?: string;
}

export type AgentChannel = "email" | "sms" | "voice";
export type AgentStatus = "draft" | "approved" | "sending" | "sent" | "failed" | "cancelled";
export interface AgentTask {
  id: string; orgId: string; jobId: string; candidateId: string;
  channel: AgentChannel; agent: "messaging" | "calling";
  status: AgentStatus; subject?: string; body: string;
  createdAt: string; updatedAt: string; approvedBy?: string;
  providerId?: string; error?: string;
}

interface DB {
  orgs: Org[];
  users: (User & { passwordHash: string })[];
  connections: { orgId: string; pluginId: string; connectedAt: string }[];
  credentials: StoredCredential[];
  jobs: (JobSpec & { orgId: string })[];
  runs: Run[];
  candidates: (Candidate & { orgId: string })[];
  scores: (ScoredCandidate & { orgId: string; runId: string })[];
  messages: Message[];
  suppressed: Suppression[];
  usage: { orgId: string; month: string; searchesUsed: number }[];
  audits: AuditEvent[];
  availability: CandidateAvailability[];
  availabilityInvites: AvailabilityInvite[];
  meetingRequests: MeetingRequest[];
  agentTasks: AgentTask[];
}

const empty = (): DB => ({
  orgs: [], users: [], connections: [], credentials: [], jobs: [], runs: [], candidates: [],
  scores: [], messages: [], suppressed: [], usage: [], audits: [],
  availability: [], availabilityInvites: [], meetingRequests: [], agentTasks: [],
});

const emailHash = (email?: string) => email
  ? createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
  : undefined;

const credentialKey = createHash("sha256").update(env.credentialsKey).digest();
function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".");
}
function decryptSecret(value: string): string {
  const [iv, tag, encrypted] = value.split(".").map((x) => Buffer.from(x, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Invalid stored credential");
  const decipher = createDecipheriv("aes-256-gcm", credentialKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

class FileStorage {
  private db: DB;
  private file: string;

  constructor() {
    fs.mkdirSync(env.dataDir, { recursive: true });
    this.file = path.join(env.dataDir, "state.json");
    const loaded = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, "utf8")) : {};
    this.db = { ...empty(), ...loaded };
  }

  bootstrapAdmin(email: string, passwordHash: string) {
    if (!email && !passwordHash) return;
    if (!email || !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(passwordHash))
      throw new Error("Admin setup is incomplete. Run scripts/setup-admin.mjs to create a valid admin hash.");
    const existing = this.db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing && existing.role !== "admin")
      throw new Error("Admin email belongs to a recruiter. Use a different admin email; no account was promoted.");
    if (existing && existing.role === "admin") {
      // Only a server operator with access to this environment can rotate the administrator password.
      if (existing.passwordHash !== passwordHash) {
        existing.passwordHash = passwordHash;
        this.save();
        this.addAudit(existing.orgId, "admin.password_rotated", existing.id, "Admin password hash updated");
      }
      return;
    }
    const org: Org = { id: randomUUID(), name: "HireWave Administration", plan: "trial", createdAt: new Date().toISOString() };
    const user: User & { passwordHash: string } = {
      id: randomUUID(), orgId: org.id, email: email.toLowerCase(), name: "System Administrator",
      role: "admin", createdAt: new Date().toISOString(), passwordHash,
    };
    this.db.orgs.push(org); this.db.users.push(user); this.save();
    this.addAudit(org.id, "admin.provisioned", user.id, "System administrator provisioned");
  }

  adminOverview() {
    const regularOrgs = this.db.orgs.filter(o => !this.db.users.some(u => u.orgId === o.id && u.role === "admin"));
    const tenants = new Set(regularOrgs.map(o => o.id));
    const sc = <T extends { orgId: string }>(list: T[]): T[] => list.filter(x => tenants.has(x.orgId));
    const runs = sc(this.db.runs), tasks = sc(this.db.agentTasks);
    const sourceUsage: Record<string,number> = {};
    for (const c of sc(this.db.connections)) sourceUsage[c.pluginId] = (sourceUsage[c.pluginId] || 0) + 1;
    const byDate: Record<string,number> = {};
    for (let d=13;d>=0;d--) {
      const day = new Date(Date.now() - d*86400000).toISOString().slice(0,10);
      byDate[day] = 0;
    }
    for (const run of runs) {
      const day=run.createdAt.slice(0,10);
      if (Object.prototype.hasOwnProperty.call(byDate, day)) byDate[day]++;
    }
    const connected = sc(this.db.connections);
    return {
      updatedAt: new Date().toISOString(),
      totals: {
        organizations: regularOrgs.length, recruiters: this.db.users.filter(u=>u.role!=="admin").length,
        jobs: sc(this.db.jobs).length, candidates: sc(this.db.candidates).length,
        searches: runs.length, completedSearches: runs.filter(r=>r.status==="done").length,
        failedSearches: runs.filter(r=>r.status==="error").length,
        connections: connected.length, suppressed: sc(this.db.suppressed).length,
        outreachTasks: tasks.length, sentTasks: tasks.filter(t=>t.status==="sent").length,
        pendingTasks: tasks.filter(t=>["draft","approved","sending"].includes(t.status)).length,
        meetingRequests: sc(this.db.meetingRequests).length,
      },
      series: Object.entries(byDate).map(([date, count]) => ({date,count})),
      sourceUsage: Object.entries(sourceUsage).map(([source,count])=>({source,count})).sort((a,b)=>b.count-a.count),
      organizations: regularOrgs.map(org=>({
        id:org.id,name:org.name,plan:org.plan,createdAt:org.createdAt,
        members:this.db.users.filter(u=>u.orgId===org.id).length,
        jobs:this.db.jobs.filter(j=>j.orgId===org.id).length,
        candidates:this.db.candidates.filter(c=>c.orgId===org.id).length,
        connectors:connected.filter(c=>c.orgId===org.id).length,
        searches:runs.filter(r=>r.orgId===org.id).length,
      })).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
      recentActivity:this.db.audits.filter(a=>tenants.has(a.orgId))
        .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50)
        .map(a=>({id:a.id,orgId:a.orgId,action:a.action,createdAt:a.createdAt})),
      system:{ storage:"Local JSON", mailConfigured:Boolean(env.resendApiKey && env.recruitmentFromEmail),
        smsConfigured:Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber),
        outboundSendingEnabled:env.agentsSendingEnabled, publicRegistrationEnabled:env.signupEnabled,
        contactExtractor:{connected:true,mode:"Local text extraction; no automatic crawling"},
      },
    };
  }

  save() {
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2));
    fs.renameSync(tmp, this.file);
  }
  private month() { return new Date().toISOString().slice(0, 7); }

  addAudit(orgId: string, action: string, actorUserId?: string, detail?: string) {
    const event: AuditEvent = { id: randomUUID(), orgId, actorUserId, action, detail, createdAt: new Date().toISOString() };
    this.db.audits.push(event);
    if (this.db.audits.length > 5000) this.db.audits = this.db.audits.slice(-5000);
    this.save();
    return event;
  }
  listAudits(orgId: string, limit = 100) {
    return this.db.audits.filter((a) => a.orgId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  createOrgWithUser(input: { email: string; name: string; passwordHash: string; orgName: string }) {
    const org: Org = { id: randomUUID(), name: input.orgName, plan: "trial", createdAt: new Date().toISOString() };
    const user: User & { passwordHash: string } = {
      id: randomUUID(), orgId: org.id, email: input.email.toLowerCase(),
      name: input.name, role: "owner", createdAt: new Date().toISOString(), passwordHash: input.passwordHash,
    };
    this.db.orgs.push(org); this.db.users.push(user); this.save();
    this.addAudit(org.id, "workspace.created", user.id, `Workspace ${org.name} created`);
    return { org, user };
  }
  findUserByEmail(email: string) {
    const u = this.db.users.find((x) => x.email === email.toLowerCase());
    if (!u) return null;
    const org = this.db.orgs.find((o) => o.id === u.orgId);
    return org ? { user: u, org } : null;
  }
  getUser(id: string) { return this.db.users.find((u) => u.id === id) ?? null; }
  getOrg(id: string) { return this.db.orgs.find((o) => o.id === id) ?? null; }
  setPlan(orgId: string, plan: PlanId) { const o = this.getOrg(orgId); if (o) { o.plan = plan; this.save(); } }

  connections(orgId: string) { return this.db.connections.filter((c) => c.orgId === orgId); }
  addConnection(orgId: string, pluginId: string) {
    if (!this.db.connections.some((c) => c.orgId === orgId && c.pluginId === pluginId))
      this.db.connections.push({ orgId, pluginId, connectedAt: new Date().toISOString() });
    this.save();
  }
  removeConnection(orgId: string, pluginId: string) {
    this.db.connections = this.db.connections.filter((c) => !(c.orgId === orgId && c.pluginId === pluginId));
    this.db.credentials = this.db.credentials.filter((c) => !(c.orgId === orgId && c.pluginId === pluginId));
    this.save();
  }
  setCredential(orgId: string, pluginId: string, credential: string) {
    const row = this.db.credentials.find((c) => c.orgId === orgId && c.pluginId === pluginId);
    const ciphertext = encryptSecret(credential.trim());
    if (row) { row.ciphertext = ciphertext; row.updatedAt = new Date().toISOString(); }
    else this.db.credentials.push({ orgId, pluginId, ciphertext, updatedAt: new Date().toISOString() });
    this.save();
  }
  getCredential(orgId: string, pluginId: string) {
    const row = this.db.credentials.find((c) => c.orgId === orgId && c.pluginId === pluginId);
    if (!row) return undefined;
    try { return decryptSecret(row.ciphertext); } catch { return undefined; }
  }

  saveJob(orgId: string, job: JobSpec) {
    const existing = this.db.jobs.findIndex((j) => j.orgId === orgId && j.id === job.id);
    if (existing >= 0) this.db.jobs[existing] = { ...job, orgId }; else this.db.jobs.push({ ...job, orgId });
    this.save();
  }
  listJobs(orgId: string) { return this.db.jobs.filter((j) => j.orgId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  getJob(orgId: string, id: string) { return this.db.jobs.find((j) => j.orgId === orgId && j.id === id) ?? null; }

  createRun(run: Run) { this.db.runs.push(run); this.save(); }
  updateRun(id: string, patch: Partial<Run>) {
    const r = this.db.runs.find((x) => x.id === id); if (!r) return;
    Object.assign(r, patch); this.save();
  }
  getRun(orgId: string, id: string) { return this.db.runs.find((r) => r.orgId === orgId && r.id === id) ?? null; }
  latestRun(orgId: string, jobId: string) {
    return this.db.runs.filter((r) => r.orgId === orgId && r.jobId === jobId && r.status === "done")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  upsertCandidate(orgId: string, c: Candidate) {
    if (this.isSuppressed(orgId, c.id, c.email, c)) return false;
    const existing = this.db.candidates.findIndex((x) => x.orgId === orgId &&
      (x.id === c.id || sharesStrongIdentity(x, c)));
    if (existing >= 0) {
      const previous = this.db.candidates[existing];
      const merged = mergeCandidates([previous, c])[0];
      // Keep canonical ID stable for previously saved score and availability records.
      this.db.candidates[existing] = { ...merged, id: previous.id, orgId };
    } else this.db.candidates.push({ ...mergeCandidates([c])[0], orgId });
    this.save(); return true;
  }
  /** Return the tenant-local stable record ID after any strong-identity merge. */
  canonicalCandidate(orgId: string, c: Candidate): Candidate | null {
    return this.db.candidates.find((x) => x.orgId === orgId &&
      (x.id === c.id || sharesStrongIdentity(x, c))) ?? null;
  }
  listCandidateAvailability(orgId: string, candidateId: string) {
    return this.db.availability.filter((a) => a.orgId === orgId && a.candidateId === candidateId);
  }
  importCandidates(orgId: string, candidates: Candidate[]) {
    let imported = 0;
    for (const c of candidates) if (this.upsertCandidate(orgId, c)) imported++;
    return imported;
  }
  getCandidate(orgId: string, id: string) { return this.db.candidates.find((c) => c.orgId === orgId && c.id === id) ?? null; }
  listCandidates(orgId: string) { return this.db.candidates.filter((c) => c.orgId === orgId); }
  listPoolCandidates(orgId: string) { return this.listCandidates(orgId).filter((c) => c.sources.some((s) => s.plugin === "pool")); }
  saveScores(orgId: string, runId: string, scores: ScoredCandidate[]) {
    this.db.scores = this.db.scores.filter((s) => s.runId !== runId);
    for (const s of scores) this.db.scores.push({ ...s, orgId, runId });
    this.save();
  }
  getSlate(orgId: string, jobId: string) {
    const run = this.latestRun(orgId, jobId);
    if (!run) return { run: null, slate: [] };
    const slate = this.db.scores.filter((s) => s.orgId === orgId && s.runId === run.id)
      .sort((a, b) => b.score - a.score)
      .map((s) => ({ score: s, candidate: this.getCandidate(orgId, s.candidateId) }))
      .filter((x): x is { score: ScoredCandidate & { orgId: string; runId: string }; candidate: Candidate & { orgId: string } } => !!x.candidate);
    return { run, slate };
  }

  getAvailability(orgId: string, jobId: string, candidateId: string) {
    return this.db.availability.find(a => a.orgId === orgId && a.jobId === jobId && a.candidateId === candidateId);
  }
  createAvailabilityInvite(orgId: string, jobId: string, candidateId: string) {
    const existing = this.db.availabilityInvites.filter(i => i.orgId === orgId && i.jobId === jobId && i.candidateId === candidateId);
    const weekAgo = Date.now() - 7 * 86400000;
    if (existing.filter(i => Date.parse(i.createdAt) > weekAgo).length >= 2)
      throw new Error("Maximum two availability invitations per candidate per seven days");
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const invite: AvailabilityInvite = {
      id: randomUUID(), orgId, jobId, candidateId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 14 * 86400000).toISOString(),
    };
    this.db.availabilityInvites.push(invite);
    this.save();
    return { invite, token };
  }
  findAvailabilityInvite(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return this.db.availabilityInvites.find(i => i.tokenHash === tokenHash && !i.usedAt && Date.parse(i.expiresAt) > Date.now());
  }
  revokeAvailabilityInvite(id: string) {
    this.db.availabilityInvites = this.db.availabilityInvites.filter(i => i.id !== id);
    this.save();
  }
  markInviteSent(id: string) {
    const invite = this.db.availabilityInvites.find(i => i.id === id);
    if (invite) { invite.sentAt = new Date().toISOString(); this.save(); }
  }
  sentInvitesToday(orgId: string) {
    const today = new Date().toISOString().slice(0, 10);
    return this.db.availabilityInvites.filter(i => i.orgId === orgId && i.sentAt?.startsWith(today)).length;
  }
  recordCandidateAvailability(token: string, response: Omit<CandidateAvailability, "orgId" | "candidateId" | "jobId" | "reportedBy" | "reportedAt">) {
    const invitation = this.findAvailabilityInvite(token);
    if (!invitation) return null;
    const row: CandidateAvailability = {
      ...response, orgId: invitation.orgId, jobId: invitation.jobId,
      candidateId: invitation.candidateId, reportedBy: "candidate", reportedAt: new Date().toISOString(),
    };
    this.db.availability = this.db.availability.filter(a => !(a.orgId === row.orgId && a.jobId === row.jobId && a.candidateId === row.candidateId));
    this.db.availability.push(row);
    const usedAt = new Date().toISOString();
    for (const other of this.db.availabilityInvites)
      if (other.orgId === row.orgId && other.jobId === row.jobId && other.candidateId === row.candidateId)
        other.usedAt = usedAt;
    this.save();
    return row;
  }
  createMeetingRequest(orgId: string, jobId: string, candidateId: string, preferredWindow?: string) {
    const existing = this.db.meetingRequests.find(r => r.orgId === orgId && r.jobId === jobId && r.candidateId === candidateId);
    if (existing) return existing;
    const row: MeetingRequest = { id: randomUUID(), orgId, jobId, candidateId, status: "pending_calendar", createdAt: new Date().toISOString(), preferredWindow };
    this.db.meetingRequests.push(row); this.save(); return row;
  }
  listMeetingRequests(orgId: string, jobId: string) {
    return this.db.meetingRequests.filter(r => r.orgId === orgId && r.jobId === jobId);
  }

  listAgentTasks(orgId: string, jobId?: string) {
    return this.db.agentTasks.filter(t => t.orgId === orgId && (!jobId || t.jobId === jobId))
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  getAgentTask(orgId: string, id: string) {
    return this.db.agentTasks.find(t => t.orgId === orgId && t.id === id) ?? null;
  }
  createAgentTask(orgId: string, jobId: string, candidateId: string, channel: AgentChannel, subject: string | undefined, body: string) {
    const existing = this.db.agentTasks.find(t => t.orgId === orgId && t.jobId === jobId && t.candidateId === candidateId && t.channel === channel && ["draft","approved","sending","sent","failed"].includes(t.status));
    if (existing) return {task: existing, created: false};
    const now = new Date().toISOString();
    const task: AgentTask = { id:randomUUID(), orgId, jobId, candidateId, channel,
      agent:channel === "voice" ? "calling" : "messaging", status:"draft", subject, body, createdAt:now, updatedAt:now };
    this.db.agentTasks.push(task); this.save();
    return {task, created:true};
  }
  updateAgentTask(orgId: string, id: string, patch: Partial<Pick<AgentTask,"status"|"approvedBy"|"providerId"|"error">>) {
    const task = this.getAgentTask(orgId,id);
    if (!task) return null;
    Object.assign(task, patch, {updatedAt:new Date().toISOString()}); this.save(); return task;
  }
  reviseAgentTask(orgId: string, id: string, subject: string | undefined, body: string) {
    const task = this.getAgentTask(orgId, id);
    if (!task || task.status !== "draft") return null;
    task.subject = subject;
    task.body = body;
    task.approvedBy = undefined;
    task.updatedAt = new Date().toISOString();
    this.save();
    return task;
  }
  recentAgentCount(orgId: string, channel: AgentChannel) {
    const midnight = new Date().toISOString().slice(0,10);
    return this.db.agentTasks.filter(t => t.orgId === orgId && t.channel === channel && ["sent", "sending"].includes(t.status) && t.updatedAt.startsWith(midnight)).length;
  }
  recentlySentToCandidate(orgId:string,candidateId:string,channel:AgentChannel,days=7) {
    const cutoff=Date.now()-days*86400000;
    return this.db.agentTasks.some(t => t.orgId===orgId && t.candidateId===candidateId && t.channel===channel && ["sent","sending","failed"].includes(t.status) && Date.parse(t.updatedAt)>cutoff);
  }
  recentlyContactedCandidate(orgId:string,candidateId:string,hours=24) {
    const cutoff=Date.now()-hours*3600000;
    return this.db.agentTasks.some(t => t.orgId===orgId && t.candidateId===candidateId && ["sent","sending","failed"].includes(t.status) && Date.parse(t.updatedAt)>cutoff);
  }
  cancelAgentTask(orgId:string,id:string) {
    const t=this.getAgentTask(orgId,id);
    if(!t||!["draft","approved","failed"].includes(t.status))return null;
    t.status="cancelled";t.updatedAt=new Date().toISOString();this.save();return t;
  }

  suppress(orgId: string, candidateId: string, email?: string) {
    const hash = emailHash(email);
    const candidate = this.getCandidate(orgId, candidateId);
    // Store one-way hashes of known unique profile IDs/emails so later refreshes
    // cannot re-add the same person under a different canonical ID.
    const identityHashes = candidate ? candidateIdentityTokens(candidate).map((token) =>
      createHash("sha256").update(token).digest("hex")) : [];
    const existing = this.db.suppressed.find((s) => s.orgId === orgId && s.candidateId === candidateId);
    if (existing) {
      existing.identityHashes = [...new Set([...(existing.identityHashes ?? []), ...identityHashes])];
      if (!existing.emailHash) existing.emailHash = hash;
    } else this.db.suppressed.push({ orgId, candidateId, emailHash: hash, identityHashes, createdAt: new Date().toISOString() });
    this.db.candidates = this.db.candidates.filter((c) => !(c.orgId === orgId && c.id === candidateId));
    this.db.scores = this.db.scores.filter((s) => !(s.orgId === orgId && s.candidateId === candidateId));
    this.db.messages = this.db.messages.filter((m) => !(m.orgId === orgId && m.candidateId === candidateId));
    this.db.availability = this.db.availability.filter(a => !(a.orgId === orgId && a.candidateId === candidateId));
    this.db.availabilityInvites = this.db.availabilityInvites.filter(a => !(a.orgId === orgId && a.candidateId === candidateId));
    this.db.meetingRequests = this.db.meetingRequests.filter(a => !(a.orgId === orgId && a.candidateId === candidateId));
    // Do not retain unneeded drafts or personally identifying outreach text after opt-out.
    this.db.agentTasks = this.db.agentTasks.filter(t => !(t.orgId === orgId && t.candidateId === candidateId));
    this.save();
  }
  isSuppressed(orgId: string, candidateId: string, email?: string, candidate?: Candidate) {
    const hash = emailHash(email);
    const identities = new Set((candidate ? candidateIdentityTokens(candidate) : []).map((token) =>
      createHash("sha256").update(token).digest("hex")));
    return this.db.suppressed.some((s) => s.orgId === orgId && (
      s.candidateId === candidateId || (!!hash && s.emailHash === hash) ||
      (s.identityHashes ?? []).some((v) => identities.has(v))
    ));
  }
  listSuppressed(orgId: string) { return this.db.suppressed.filter((s) => s.orgId === orgId); }

  getSearchesUsed(orgId: string, plan: PlanId) {
    if (plan === "trial") return this.db.usage.find((u) => u.orgId === orgId && u.month === "TRIAL")?.searchesUsed ?? 0;
    const month = this.month();
    return this.db.usage.find((u) => u.orgId === orgId && u.month === month)?.searchesUsed ?? 0;
  }
  incrementSearches(orgId: string, plan: PlanId) {
    const month = plan === "trial" ? "TRIAL" : this.month();
    const row = this.db.usage.find((u) => u.orgId === orgId && u.month === month);
    if (row) row.searchesUsed++; else this.db.usage.push({ orgId, month, searchesUsed: 1 });
    this.save();
  }

  saveMessage(m: Message) { this.db.messages.push(m); this.save(); }
  listMessages(orgId: string) { return this.db.messages.filter((m) => m.orgId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  planOf(orgId: string) { return PLANS[(this.getOrg(orgId)?.plan ?? "trial") as PlanId]; }
}

export const storage = new FileStorage();
storage.bootstrapAdmin(env.adminEmail, env.adminPasswordHash);

