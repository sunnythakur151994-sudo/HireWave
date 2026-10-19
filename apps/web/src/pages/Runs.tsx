import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button, Card } from "../components/ui";

export default function Runs() {
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: api.jobs });
  const plugins = useQuery({ queryKey: ["plugins"], queryFn: api.plugins });
  const [jobId, setJobId] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const connected = plugins.data?.plugins.filter((p) => p.connected) ?? [];
  useEffect(() => { if (jobs.data?.jobs[0] && !jobId) setJobId(jobs.data.jobs[0].id); }, [jobs.data, jobId]);

  useEffect(() => {
    if (!runId) return;
    const ctrl = new AbortController();
    api.streamRunEvents(runId, (kind, data) => setEvents((x) => [...x, { kind, data }]), ctrl.signal)
      .catch((e) => { if ((e as Error).name !== "AbortError") setErr((e as Error).message); });
    return () => ctrl.abort();
  }, [runId]);

  const start = async () => {
    setBusy(true); setErr(null); setEvents([]); setRunId(null);
    try {
      const ids = connected.map((p) => p.id);
      if (!ids.length) throw new Error("Connect at least one plugin first.");
      const run = await api.startRun({ jobId, pluginIds: ids });
      setRunId(run.id);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sourcing runs</h1>
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-teal-400 mb-1">Job</div>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full rounded-lg border border-teal-800 bg-ink-900/60 px-3 py-2 text-sm">
              {jobs.data?.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-teal-400 mb-1">Plugins</div>
            <div className="text-sm text-teal-200/80">{connected.map((p) => p.name).join(", ") || "None connected"}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-teal-500/70">Connectors run in parallel. Each sourcing run counts as 1 search.</div>
          <Button onClick={start} disabled={busy || !jobId}>{busy ? "Starting…" : "Start run"}</Button>
        </div>
        {err && <div className="mt-2 text-sm text-rose-400">{err}</div>}
      </Card>

      {events.length > 0 && (
        <Card>
          <div className="font-semibold mb-2">Live feed</div>
          <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
            {events.map((e, i) => (
              <div key={i} className={e.kind === "done" ? "text-accent" : e.kind === "error" || e.kind === "plugin_error" ? "text-rose-400" : "text-teal-300/80"}>
                [{e.kind}] {JSON.stringify(e.data)}
              </div>
            ))}
          </div>
          {events.some((e) => e.kind === "done") && (
            <Link to={`/app/jobs/${jobId}/slate`} className="mt-3 inline-block text-sm text-accent hover:underline">Open ranked slate →</Link>
          )}
        </Card>
      )}
    </div>
  );
}
