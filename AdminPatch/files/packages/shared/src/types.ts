export type PlanId = "trial" | "starter" | "growth" | "pro" | "business" | "enterprise";
export type Tier = "free" | "famous" | "extra";
export type ConnectorType = "A" | "B" | "C" | "D";
export type Seniority = "junior" | "mid" | "senior";

export interface PluginManifest {
  id: string; name: string; category: string; tier: Tier;
  connectorType: ConnectorType; status: "live" | "planned";
  auth: "none" | "api_key" | "oauth" | "extension";
  envVar?: string; risk: "low" | "medium"; description: string;
}

export interface CandidateSource {
  plugin: string; url?: string; fetchedAt: string;
  /** Optional provider-reported last update; not the same as our last fetch time. */
  providerUpdatedAt?: string;
  /** For CSV imports only: user-supplied claimed source, NOT a verified platform API. */
  sourceLabel?: string;
}

export interface ProfileFieldEvidence {
  field: string; value: string;
  plugin: string; sourceUrl?: string; fetchedAt: string;
  providerUpdatedAt?: string;
  sourceLabel?: string;
  method: "api" | "imported" | "legacy";
}


export interface Candidate {
  id: string; name: string; headline?: string; title?: string;
  company?: string; location?: string; skills: string[];
  yearsExperience?: number; email?: string; links: string[];
  sources: CandidateSource[]; summary?: string;
  /** Multiple source-reported values are kept instead of silently overwritten. */
  profileFields?: ProfileFieldEvidence[];
}

export interface JobSpec {
  id: string; title: string; rawText: string;
  mustHave: string[]; niceToHave: string[];
  minYears?: number; seniority?: Seniority; remote: boolean;
  location?: string; salary?: string; createdAt: string;
}

export interface ScoreBreakdown { skills: number; experience: number; seniority: number; location: number }

export interface ScoredCandidate {
  candidateId: string; score: number; breakdown: ScoreBreakdown;
  matched: string[]; missing: string[]; reasons: string[];
}

export interface ConnectorAuthContext { credential?: string }
export interface SearchContext extends ConnectorAuthContext { limit: number; pool: Candidate[] }

export interface Connector {
  manifest: PluginManifest;
  healthCheck(ctx?: ConnectorAuthContext): Promise<{ ok: boolean; detail: string }>;
  search(job: JobSpec, ctx: SearchContext): Promise<Candidate[]>;
}

export interface Org { id: string; name: string; plan: PlanId; createdAt: string }
export interface User { id: string; orgId: string; email: string; name: string; role: "owner" | "recruiter" | "viewer" | "admin"; createdAt: string }

export interface Run {
  id: string; orgId: string; jobId: string; pluginIds: string[];
  status: "running" | "done" | "error"; totalFound: number; slateSize: number;
  createdAt: string; finishedAt?: string; error?: string;
}

export interface Message {
  id: string; orgId: string; candidateId: string; jobId: string;
  channel: "email" | "linkedin"; subject?: string; body: string; createdAt: string;
}

export interface AuditEvent {
  id: string; orgId: string; actorUserId?: string; action: string;
  detail?: string; createdAt: string;
}
