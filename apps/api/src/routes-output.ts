import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { env } from "./env.js";
import { storage } from "./storage.js";
import { emitters, getRunEventHistory } from "./runner.js";

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function outputRoutes(app: FastifyInstance) {
  app.get("/api/jobs/:id/slate", { preHandler: [app.authenticate] }, async (req) => {
    const { run, slate } = storage.getSlate(req.user.oid, (req.params as { id: string }).id);
    return { run, slate };
  });

  app.get("/api/candidates/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const c = storage.getCandidate(req.user.oid, (req.params as { id: string }).id);
    if (!c) return reply.code(404).send({ error: "Candidate not found (or removed on request)" });
    return c;
  });
  app.get("/api/candidates/:id/profile", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid } = req.user;
    const c = storage.getCandidate(oid, (req.params as { id: string }).id);
    if (!c) return reply.code(404).send({ error: "Candidate not found (or removed on request)" });
    return { candidate: c, availability: storage.listCandidateAvailability(oid, c.id) };
  });
  app.get("/api/candidates", { preHandler: [app.authenticate] }, async (req) => ({ candidates: storage.listCandidates(req.user.oid) }));

  app.post("/api/outreach/draft", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    const plan = storage.planOf(oid);
    if (!plan.outreach) return reply.code(402).send({ error: `Outreach drafting needs Growth or higher (current: ${plan.label}).` });
    const body = z.object({
      candidateId: z.string(), jobId: z.string(), channel: z.enum(["email", "linkedin"]).default("email"),
      recruiterName: z.string().max(120).optional(), company: z.string().max(160).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });
    const c = storage.getCandidate(oid, body.data.candidateId);
    const job = storage.getJob(oid, body.data.jobId);
    if (!c || !job) return reply.code(404).send({ error: "Unknown candidate or job" });
    const { slate } = storage.getSlate(oid, job.id);
    const sc = slate.find((x) => x.score.candidateId === c.id)?.score;
    const hook = sc?.matched.length ? `your background in ${sc.matched.slice(0, 3).join(", ")}` : "your background";
    const first = c.name.replace(/^Demo\s+/, "").split(" ")[0] || c.name;
    const bodyText = `Hi ${first},\n\nI came across your profile and ${hook} caught my eye. We're hiring a ${job.title}${body.data.company ? " at " + body.data.company : ""}${job.remote ? " (remote)" : job.location ? " in " + job.location : ""}${job.salary ? ", " + job.salary : ""}.\n\nWould you be open to a short chat this week?\n\nBest,\n${body.data.recruiterName ?? "[Your name]"}\n\nIf you'd rather not hear from me, reply \"stop\" and I'll suppress your details from future sourcing.`;
    const msg = {
      id: randomUUID(), orgId: oid, candidateId: c.id, jobId: job.id, channel: body.data.channel,
      subject: body.data.channel === "email" ? `${job.title} opportunity` : undefined,
      body: bodyText, createdAt: new Date().toISOString(),
    };
    storage.saveMessage(msg);
    storage.addAudit(oid, "outreach.drafted", uid, `${body.data.channel} draft for candidate ${c.id}`);
    return { ...msg, to: body.data.channel === "email" ? c.email ?? "(no public email — do not guess one)" : c.links.find((l) => /linkedin\.com/i.test(l)) ?? "(no LinkedIn profile link)" };
  });

  app.get("/api/outreach/messages", { preHandler: [app.authenticate] }, async (req) => ({ messages: storage.listMessages(req.user.oid) }));

  app.get("/api/jobs/:id/export.csv", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    const plan = storage.planOf(oid);
    if (!plan.export) return reply.code(402).send({ error: "CSV export needs Starter or higher." });
    const { slate } = storage.getSlate(oid, (req.params as { id: string }).id);
    const rows = [["rank", "name", "title", "company", "location", "score", "matched", "missing", "email", "sources"].join(",")];
    slate.forEach((x, i) => rows.push([
      i + 1, x.candidate.name, x.candidate.title, x.candidate.company, x.candidate.location,
      x.score.score, x.score.matched.join(";"), x.score.missing.join(";"), x.candidate.email,
      x.candidate.sources.map((s) => s.plugin).join(";"),
    ].map(csvCell).join(",")));
    storage.addAudit(oid, "slate.exported", uid, `${slate.length} candidates exported`);
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="slate-${Date.now()}.csv"`);
    return "\uFEFF" + rows.join("\n");
  });

  app.post("/api/privacy/suppress", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    const body = z.object({ candidateId: z.string() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });
    const c = storage.getCandidate(oid, body.data.candidateId);
    if (!c) return reply.code(404).send({ error: "Candidate not found" });
    storage.suppress(oid, c.id, c.email);
    storage.addAudit(oid, "candidate.suppressed", uid, `Candidate ${c.id} removed and blocked from rediscovery`);
    return { removed: c.id, blockedFromFutureSearches: true };
  });
  app.get("/api/privacy/suppressed", { preHandler: [app.authenticate] }, async (req) => ({ suppressed: storage.listSuppressed(req.user.oid) }));
  app.get("/api/privacy/audit", { preHandler: [app.authenticate] }, async (req) => ({ audit: storage.listAudits(req.user.oid) }));

  app.get("/api/usage", { preHandler: [app.authenticate] }, async (req) => {
    const plan = storage.planOf(req.user.oid);
    return {
      plan: plan.label, planId: plan.id, price: { usd: plan.usd, inr: plan.inr },
      searches: { used: storage.getSearchesUsed(req.user.oid, plan.id), limit: plan.searchesPerMonth },
      connected: storage.connections(req.user.oid).map((c) => c.pluginId),
      outreach: plan.outreach, export: plan.export, maxCandidatesPerRun: plan.maxCandidatesPerRun,
    };
  });

  app.post("/api/billing/upgrade", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    if (!env.allowSetPlan) return reply.code(403).send({ error: "Dev plan switching is disabled. Production plans must change through verified billing webhooks." });
    const body = z.object({ plan: z.enum(["trial", "starter", "growth", "pro", "business", "enterprise"]) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid plan" });
    storage.setPlan(oid, body.data.plan);
    storage.addAudit(oid, "plan.changed_dev", uid, `Plan set to ${body.data.plan} using development stub`);
    return { plan: body.data.plan };
  });

  app.get("/api/runs/:id/events", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const run = storage.getRun(req.user.oid, id);
    if (!run) return reply.code(404).send({ error: "Run not found" });

    const history = getRunEventHistory(id);
    const emitter = emitters.get(id);
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (kind: string, data: unknown) => reply.raw.write(`event: ${kind}\ndata: ${JSON.stringify(data)}\n\n`);
    send("snapshot", run);
    for (const event of history) send(event.kind, event.data);
    if (run.status !== "running" || !emitter) { reply.raw.end(); return; }

    const onEvent = (p: { kind: string; data: unknown }) => {
      send(p.kind, p.data);
      if (p.kind === "done" || p.kind === "error") reply.raw.end();
    };
    emitter.on("event", onEvent);
    const cleanup = () => emitter.off("event", onEvent);
    req.raw.on("close", cleanup);
    reply.raw.on("close", cleanup);
  });
}
