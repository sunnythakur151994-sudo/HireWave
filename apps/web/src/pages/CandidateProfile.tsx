import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PROFILE_GROUPS, PROFILE_LABELS, ensureProfileFields } from "@hirewave/shared/profile";
import type { ProfileFieldEvidence } from "@hirewave/shared";
import { api } from "../lib/api";
import { Button, Card, Badge, Spinner } from "../components/ui";

const isUrl = (text: string) => /^https?:\/\/[^\s]+$/i.test(text);
const fmtDate = (d?: string) => d && !Number.isNaN(Date.parse(d)) ? new Date(d).toLocaleString() : "Not provided";
const formatSource = (f: ProfileFieldEvidence) => f.plugin === "pool"
  ? `Imported${f.sourceLabel ? ` - ${f.sourceLabel} (unverified label)` : " CSV"}`
  : f.plugin === "github" ? "GitHub API" : f.plugin;

export default function CandidateProfile() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const result = useQuery({ queryKey: ["candidateProfile", id], queryFn: () => api.candidateProfile(id) });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: api.jobs });
  const [jobId, setJobId] = useState("");
  const [draft, setDraft] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const draftMut = useMutation({
    mutationFn: async () => {
      const jid = jobId || jobs.data?.jobs[0]?.id;
      if (!jid) throw new Error("Create a job first.");
      return api.draftOutreach({ candidateId: id, jobId: jid, recruiterName: "Recruiter", channel: "email" });
    },
    onSuccess: setDraft, onError: (e) => setErr((e as Error).message),
  });
  const suppress = useMutation({
    mutationFn: () => api.suppress(id),
    onSuccess: () => nav("/app/candidates"),
  });

  if (result.isLoading) return <Card className="flex justify-center py-12"><Spinner /></Card>;
  if (result.error) return <Card className="text-rose-400">{(result.error as Error).message}</Card>;
  const { candidate: cand, availability } = result.data!;
  const facts = ensureProfileFields(cand);
  const grouped = new Map<string, ProfileFieldEvidence[]>();
  for (const entry of facts) grouped.set(entry.field, [...(grouped.get(entry.field) ?? []), entry]);
  const allSources = [...cand.sources].sort((a,b) => b.fetchedAt.localeCompare(a.fetchedAt));
  const conflicting = [...grouped.entries()].filter(([_, items]) => new Set(items.map(x => x.value.toLowerCase())).size > 1).map(([field]) => field);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-teal-400/70 mb-1">Unified candidate profile</p>
          <h1 className="text-2xl font-semibold">{cand.name}</h1>
          <p className="text-sm text-teal-300/70">{cand.title ?? "Title not provided"} · {cand.company ?? "Company not provided"} · {cand.location ?? "Location not provided"}</p>
          <div className="mt-2 flex flex-wrap gap-1">{allSources.map((s, i) => <Badge key={`${s.plugin}-${s.url ?? i}`}>
            {s.plugin === "pool" ? `Imported${s.sourceLabel ? `: ${s.sourceLabel}` : " CSV"}` : s.plugin}
          </Badge>)}</div>
        </div>
        <Button variant="danger" onClick={() => suppress.mutate()} disabled={suppress.isPending}>Remove candidate and suppress</Button>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">Source coverage and freshness</h2>
        <p className="text-xs text-teal-300/80">Only fields returned by an authorized connector or supplied by an authorized import are displayed. An imported source name is not proof of a live API connection. No missing information is inferred.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {allSources.map((s,i) => <div key={`${s.plugin}-${s.url ?? i}`} className="rounded-lg border border-teal-800/60 p-3 text-sm">
            <div className="font-medium">{s.plugin === "pool" ? "Imported CSV" : s.plugin} {s.sourceLabel && <span className="text-teal-300/70">({s.sourceLabel}, unverified)</span>}</div>
            <p className="mt-1 text-xs text-teal-400/70">Fetched/imported: {fmtDate(s.fetchedAt)}</p>
            <p className="text-xs text-teal-400/70">Platform updated: {fmtDate(s.providerUpdatedAt)}</p>
            {s.url && isUrl(s.url) && <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all text-xs underline text-teal-200">Open source profile</a>}
          </div>)}
        </div>
        {conflicting.length > 0 && <div className="text-sm text-amber-200">Different values found for: {conflicting.map(f => PROFILE_LABELS[f] ?? f).join(", ")}. Both versions are retained below for HR review.</div>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROFILE_GROUPS.map((group) => {
          const fields = group.fields.filter((f) => (grouped.get(f) ?? []).length);
          return <Card key={group.key}>
            <h2 className="mb-3 font-semibold">{group.label}</h2>
            {!fields.length ? <p className="text-sm text-teal-400/60">No information returned by connected sources.</p> :
              <div className="space-y-4">{fields.map((field) => {
                const evidence = grouped.get(field) ?? [];
                const different = new Set(evidence.map(e => e.value.toLowerCase())).size > 1;
                return <div key={field} className="border-b border-teal-900/50 pb-3 last:border-b-0 last:pb-0">
                  <div className="mb-1 flex items-center gap-2"><div className="text-xs font-semibold uppercase tracking-wide text-teal-400/70">{PROFILE_LABELS[field]}</div>{different && <Badge tone="amber">Conflicting values</Badge>}</div>
                  {evidence.map((f, i) => <div key={`${f.plugin}-${f.value}-${i}`} className="mb-2 rounded-md bg-ink-950/50 p-2">
                    <p className="break-words text-sm text-teal-100">{isUrl(f.value) ? <a href={f.value} target="_blank" rel="noopener noreferrer" className="underline break-all">{f.value}</a> : f.value}</p>
                    <p className="mt-1 text-xs text-teal-400/70">{formatSource(f)} · {fmtDate(f.fetchedAt)} · {f.method === "api" ? "Official API" : f.method === "imported" ? "Imported record" : "Legacy record"}</p>
                    {f.sourceUrl && isUrl(f.sourceUrl) && <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-300 underline">Original source</a>}
                  </div>)}
                </div>;
              })}</div>}
          </Card>;
        })}
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Candidate-confirmed availability</h2>
        {!availability.length ? <p className="text-sm text-teal-400/70">Not confirmed. Job-platform activity or an old notice period does not prove the candidate is currently available.</p> :
          <div className="space-y-2">{availability.map((a) => <div key={a.jobId} className="rounded-lg border border-teal-800/60 p-3 text-sm">
            <div className="flex gap-2 items-center"><Badge tone={a.status === "available" ? "teal" : a.status === "unavailable" ? "rose" : "slate"}>{a.status}</Badge><span>Job: {jobs.data?.jobs.find(j => j.id === a.jobId)?.title ?? a.jobId}</span></div>
            <p className="mt-1 text-xs text-teal-400/70">Confirmed by candidate on {fmtDate(a.reportedAt)}</p>
            {a.preferredWindow && <p className="text-xs text-teal-300/80">Preferred time: {a.preferredWindow}</p>}
            <p className="text-xs text-teal-400/70">Consented channels: {a.contactConsent.length ? a.contactConsent.join(", ") : "None recorded"}</p>
          </div>)}</div>}
      </Card>

      <Card>
        <div className="font-semibold mb-3">Draft outreach</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="rounded-lg border border-teal-800 bg-ink-900/60 px-3 py-2 text-sm">
            {jobs.data?.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <Button onClick={() => draftMut.mutate()} disabled={draftMut.isPending}>{draftMut.isPending ? "Drafting…" : "Draft email"}</Button>
        </div>
        {err && <div className="mt-2 text-sm text-rose-400">{err}</div>}
        {draft && <div className="mt-3 rounded-lg bg-ink-950/60 border border-teal-900/60 p-3 text-sm whitespace-pre-wrap font-mono text-teal-100/90">
          <div className="text-xs text-teal-400/70 mb-2">To: {draft.to} · Subject: {draft.subject}</div>{draft.body}
        </div>}
      </Card>
    </div>
  );
}
