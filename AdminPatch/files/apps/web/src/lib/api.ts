export type OutreachChannel = "email" | "sms" | "voice";
export interface AgentTaskView {
  id:string;jobId:string;candidateId:string;channel:OutreachChannel;
  agent:"messaging"|"calling";status:"draft"|"approved"|"sending"|"sent"|"failed"|"cancelled";
  subject?:string;body:string;createdAt:string;updatedAt:string;providerId?:string;error?:string;
}
export interface AgentsBoard {
  job:{id:string;title:string};
  candidates:{id:string;name:string;category:string;consent:OutreachChannel[];emailAvailable:boolean;phoneAvailable:boolean;
    channels:{channel:OutreachChannel;allowed:boolean;reason?:string}[]}[];
  tasks:AgentTaskView[];providers:Record<OutreachChannel,boolean>;sendingEnabled:boolean;limits:Record<OutreachChannel,number>;
}
import type { Qualification, CandidateAvailability, AuditEvent, Candidate, JobSpec, Message, Run, ScoredCandidate } from "@hirewave/shared";

const BASE = (import.meta as any).env.PROD ? ((import.meta as any).env.VITE_API_URL || "") : "";

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem("hw_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function errorMessage(r: Response) {
  const text = await r.text();
  try { return JSON.parse(text).error ?? text; } catch { return text || r.statusText; }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(await errorMessage(r));
  const text = await r.text();
  if (!text) return undefined as T;
  try { return JSON.parse(text); } catch { return text as unknown as T; }
}

export const api = {
  base: BASE,
  signup: (b: { email: string; password: string; name: string; orgName: string }) =>
    request<{ token: string; user: any; org: any }>("/api/auth/signup", { method: "POST", body: JSON.stringify(b) }),
  login: (b: { email: string; password: string }) =>
    request<{ token: string; user: any; org: any }>("/api/auth/login", { method: "POST", body: JSON.stringify(b) }),
  me: () => request<{ user: any; org: any }>("/api/me"),

  adminOverview: () => request<{
    updatedAt:string;totals:Record<string,number>;
    series:{date:string;count:number}[];sourceUsage:{source:string;count:number}[];
    organizations:{id:string;name:string;plan:string;createdAt:string;members:number;jobs:number;candidates:number;connectors:number;searches:number}[];
    recentActivity:{id:string;orgId:string;action:string;createdAt:string}[];
    system:Record<string,unknown>;
  }>("/api/admin/overview"),
  extractContacts: (text:string, source?:string) => request<{plugin:string;connected:boolean;contacts:{type:"email"|"phone"|"profile";value:string;note:string}[];notice:string}>("/api/plugins/hirewavesync/extract",{method:"POST",body:JSON.stringify({text,source})}),
  plugins: () => request<{ plugins: any[] }>("/api/plugins"),
  connectPlugin: (id: string, apiKey?: string) => request<{ connected: string; health: string }>(`/api/plugins/${id}/connect`, { method: "POST", body: JSON.stringify(apiKey ? { apiKey } : {}) }),
  disconnectPlugin: (id: string) => request(`/api/plugins/${id}`, { method: "DELETE" }),
  importCandidates: (csv: string) => request<{ parsed: number; imported: number }>("/api/candidates/import", { method: "POST", body: JSON.stringify({ csv }) }),

  jobs: () => request<{ jobs: JobSpec[] }>("/api/jobs"),
  job: (id: string) => request<JobSpec>(`/api/jobs/${id}`),
  createJob: (text: string) => request<JobSpec>("/api/jobs", { method: "POST", body: JSON.stringify({ text }) }),
  slate: (id: string) => request<{ run: Run | null; slate: { score: ScoredCandidate; candidate: Candidate }[] }>(`/api/jobs/${id}/slate`),
  exportCsv: async (id: string) => {
    const r = await fetch(BASE + `/api/jobs/${id}/export.csv`, { headers: authHeaders() });
    if (!r.ok) throw new Error(await errorMessage(r));
    return r.text();
  },

  startRun: (b: { jobId: string; pluginIds?: string[]; limit?: number }) => request<Run>("/api/runs", { method: "POST", body: JSON.stringify(b) }),
  run: (id: string) => request<Run>(`/api/runs/${id}`),
  streamRunEvents: async (id: string, onEvent: (kind: string, data: any) => void, signal?: AbortSignal) => {
    const r = await fetch(BASE + `/api/runs/${id}/events`, { headers: authHeaders(), signal });
    if (!r.ok) throw new Error(await errorMessage(r));
    if (!r.body) throw new Error("Streaming is not supported by this browser.");
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let kind = "message";
        const dataLines: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) kind = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length) {
          const raw = dataLines.join("\n");
          let data: any = raw;
          try { data = JSON.parse(raw); } catch { /* keep text */ }
          onEvent(kind, data);
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
  },

  candidates: () => request<{ candidates: Candidate[] }>("/api/candidates"),
  candidate: (id: string) => request<Candidate>(`/api/candidates/${id}`),
  candidateProfile: (id: string) => request<{candidate:Candidate; availability: CandidateAvailability[]}>(`/api/candidates/${id}/profile`),
  draftOutreach: (b: { candidateId: string; jobId: string; channel?: "email" | "linkedin"; recruiterName?: string; company?: string }) =>
    request<Message & { to: string }>("/api/outreach/draft", { method: "POST", body: JSON.stringify(b) }),
  messages: () => request<{ messages: Message[] }>("/api/outreach/messages"),

  suppress: (candidateId: string) => request<{ removed: string; blockedFromFutureSearches: boolean }>("/api/privacy/suppress", { method: "POST", body: JSON.stringify({ candidateId }) }),
  suppressed: () => request<{ suppressed: { candidateId: string; emailHash?: string; createdAt: string }[] }>("/api/privacy/suppressed"),
  automationBoard: (jobId: string) => request<{
    job: { id:string; title:string; mustHave:string[]; minYears?:number };
    run: Run | null;
    counts: Record<"ready_for_hr"|"awaiting_availability"|"needs_review"|"unavailable",number>;
    candidates: { candidate: {id:string;name:string;title?:string;company?:string;location?:string;emailAvailable:boolean;sources:string[]};qualification:Qualification }[];
    meetingRequests:{id:string;candidateId:string;status:string;preferredWindow?:string}[];
    services:{emailReady:boolean;smsReady:boolean;voiceReady:boolean;calendarReady:boolean};
  }>(`/api/automation/jobs/${jobId}`),
  availabilityInvite: (jobId:string, body:{candidateId:string;sendEmail:boolean;contactBasisReviewed:boolean}) =>
    request<{sent:boolean;link?:string;status?:string}>(`/api/automation/jobs/${jobId}/invite`,{method:"POST",body:JSON.stringify(body)}),
  availabilityInfo: (token:string) => request<{organization:string;role:string}>(`/api/availability/${encodeURIComponent(token)}`),
  respondAvailability: (token:string, body:{status:"available"|"unavailable";timezone?:string;preferredWindow?:string;contactConsent:string[];doNotContact:boolean}) =>
    request<{recorded:boolean}>(`/api/availability/${encodeURIComponent(token)}`,{method:"POST",body:JSON.stringify(body)}),
  requestHRMeeting: (jobId:string,candidateId:string) =>
    request<{id:string;status:string}>(`/api/automation/jobs/${jobId}/meeting-requests`,{method:"POST",body:JSON.stringify({candidateId})}),
  agentsBoard: (jobId:string) => request<AgentsBoard>(`/api/agents/jobs/${jobId}`),
  prepareAgentTasks: (jobId:string,channel:OutreachChannel,candidateIds:string[]) =>
    request<{outcomes:{candidateId:string;taskId?:string;created?:boolean;error?:string}[]}>(`/api/agents/jobs/${jobId}/prepare`,
      {method:"POST",body:JSON.stringify({channel,candidateIds})}),
  dispatchAgentTasks: (taskIds:string[]) => request<{results:{taskId:string;status:string;error?:string}[]}>("/api/agents/tasks/dispatch",
    {method:"POST",body:JSON.stringify({taskIds,contactBasisReviewed:true})}),
  reviseAgentTask: (id:string,subject:string|undefined,body:string) =>
    request<{id:string;updatedAt:string}>(`/api/agents/tasks/${id}/revise`,
      {method:"POST",body:JSON.stringify({subject,body})}),
  cancelAgentTask: (id:string) => request<{ok:boolean}>(`/api/agents/tasks/${id}/cancel`,{method:"POST"}),
  audit: () => request<{ audit: AuditEvent[] }>("/api/privacy/audit"),

  usage: () => request<{ plan: string; planId: string; price: { usd: number; inr: number }; searches: { used: number; limit: number }; connected: string[]; outreach: boolean; export: boolean; maxCandidatesPerRun: number }>("/api/usage"),
  upgrade: (plan: string) => request<{ plan: string }>("/api/billing/upgrade", { method: "POST", body: JSON.stringify({ plan }) }),
};
