import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button, Card, Badge, Empty, Spinner } from "../components/ui";

export default function Slate() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["slate", id], queryFn: () => api.slate(id) });
  const exp = useMutation({ mutationFn: () => api.exportCsv(id), onSuccess: (csv) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `slate-${id}.csv`; a.click();
  }});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ranked slate</h1>
          <p className="text-sm text-teal-300/70">Merged sources, explainable scores.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/runs"><Button variant="ghost">Run sourcing</Button></Link>
          <Button onClick={() => exp.mutate()} disabled={exp.isPending}>{exp.isPending ? "Preparing…" : "Export CSV"}</Button>
        </div>
      </div>
      {q.isLoading ? <Card className="flex justify-center py-12"><Spinner /></Card>
        : !q.data?.slate.length ? <Empty title="No slate yet" hint="Run sourcing to build a slate for this job." />
        : (
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-teal-900/30 text-teal-300/80 text-left">
                <tr><th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Candidate</th><th className="px-4 py-2.5">Sources</th><th className="px-4 py-2.5 w-64">Score</th><th className="px-4 py-2.5">Why</th><th></th></tr>
              </thead>
              <tbody>
                {q.data.slate.map(({ score, candidate }, i) => (
                  <tr key={candidate.id} className="border-t border-teal-900/60 hover:bg-teal-900/20">
                    <td className="px-4 py-3 text-teal-400/70">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{candidate.name}</div>
                      <div className="text-xs text-teal-400/70">{candidate.title} · {candidate.location ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">{candidate.sources.map((s) => <Badge key={s.plugin}>{s.plugin}</Badge>)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-teal-900"><div className="h-2 rounded-full bg-accent" style={{ width: `${score.score}%` }} /></div>
                        <span className="w-8 text-right font-semibold">{score.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-teal-300/80 max-w-xs">{score.reasons[0]}</td>
                    <td className="px-4 py-3 text-right"><Link to={`/app/candidates/${candidate.id}`} className="text-accent hover:underline">Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
    </div>
  );
}
