import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Empty } from "../components/ui";

export default function Analytics() {
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: api.jobs });
  const candidates = useQuery({ queryKey: ["candidates"], queryFn: api.candidates });
  const sourceCounts: Record<string, number> = {};
  for (const c of candidates.data?.candidates ?? []) for (const s of c.sources) sourceCounts[s.plugin] = (sourceCounts[s.plugin] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(sourceCounts));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><div className="text-xs text-teal-400/70">Jobs</div><div className="text-3xl font-semibold">{jobs.data?.jobs.length ?? 0}</div></Card>
        <Card><div className="text-xs text-teal-400/70">Candidates</div><div className="text-3xl font-semibold">{candidates.data?.candidates.length ?? 0}</div></Card>
        <Card><div className="text-xs text-teal-400/70">Avg sources / candidate</div>
          <div className="text-3xl font-semibold">
            {candidates.data?.candidates.length
              ? (candidates.data.candidates.reduce((s, c) => s + c.sources.length, 0) / candidates.data.candidates.length).toFixed(1)
              : "—"}
          </div>
        </Card>
      </div>
      <Card>
        <div className="font-semibold mb-3">Source quality</div>
        {!Object.keys(sourceCounts).length ? <Empty title="No data yet" /> : (
          <div className="space-y-2">
            {Object.entries(sourceCounts).map(([src, n]) => (
              <div key={src} className="flex items-center gap-3">
                <div className="w-28 text-sm text-teal-300/80">{src}</div>
                <div className="flex-1 h-3 rounded-full bg-teal-900"><div className="h-3 rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} /></div>
                <div className="w-8 text-right text-sm">{n}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
