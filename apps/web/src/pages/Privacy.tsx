import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Empty } from "../components/ui";

export default function Privacy() {
  const suppressed = useQuery({ queryKey: ["suppressed"], queryFn: api.suppressed });
  const audit = useQuery({ queryKey: ["audit"], queryFn: api.audit });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Privacy center</h1>
      <Card>
        <div className="font-semibold mb-2">MVP privacy controls</div>
        <ul className="text-sm text-teal-300/80 space-y-1 list-disc pl-4">
          <li>Candidate records keep source and fetch timestamps.</li>
          <li>Suppression removes the candidate, scores and stored outreach drafts.</li>
          <li>A non-reversible email hash can be retained to prevent rediscovery without retaining the raw email in the suppression list.</li>
          <li>Ranking uses skills, experience, seniority and location fields; it does not intentionally score protected characteristics.</li>
        </ul>
        <p className="mt-3 text-xs text-amber-300/80">These controls support privacy workflows, but they are not a claim of automatic GDPR/DPDP/CCPA compliance. Production deployment still needs appropriate notices, lawful basis, retention policy and legal review.</p>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Suppression list</div>
        {!suppressed.data?.suppressed.length ? <Empty title="Nobody suppressed yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-teal-300/70 text-left"><tr><th className="py-1.5">Candidate</th><th className="py-1.5">Email fingerprint</th><th className="py-1.5">When</th></tr></thead>
            <tbody>
              {suppressed.data.suppressed.map((s) => (
                <tr key={s.candidateId} className="border-t border-teal-900/60">
                  <td className="py-2 font-mono text-xs">{s.candidateId}</td>
                  <td className="py-2 font-mono text-xs">{s.emailHash ? `${s.emailHash.slice(0, 12)}…` : "—"}</td>
                  <td className="py-2 text-teal-400/70">{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="font-semibold mb-2">Audit trail</div>
        {!audit.data?.audit.length ? <Empty title="No audit events yet" /> : (
          <div className="max-h-80 overflow-auto divide-y divide-teal-900/60 text-sm">
            {audit.data.audit.map((a) => (
              <div key={a.id} className="py-2 flex gap-3 justify-between">
                <div><span className="font-mono text-xs text-accent">{a.action}</span>{a.detail && <span className="ml-2 text-teal-300/70">{a.detail}</span>}</div>
                <div className="text-xs text-teal-500/70 shrink-0">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
