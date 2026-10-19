import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button, Card, Badge } from "../components/ui";

const PLANS = [
  { id: "trial", name: "Trial", usd: 0, inr: 0, note: "1 search total, 1 site" },
  { id: "starter", name: "Starter", usd: 29, inr: 2499, note: "30 searches/mo · 1 famous site" },
  { id: "growth", name: "Growth", usd: 59, inr: 4999, note: "100 searches/mo · 2 famous + outreach" },
  { id: "pro", name: "Pro", usd: 119, inr: 9999, note: "300 searches/mo · all famous" },
  { id: "business", name: "Business", usd: 299, inr: 24999, note: "1000 searches/mo · all sites + ATS" },
];

const companyLicenceDev = (import.meta as any).env.VITE_ENABLE_COMPANY_LICENSE_DEV === "1";

export default function Billing() {
  const qc = useQueryClient();
  const usage = useQuery({ queryKey: ["usage"], queryFn: api.usage });
  const up = useMutation({ mutationFn: (p: string) => api.upgrade(p), onSuccess: () => { qc.invalidateQueries({ queryKey: ["usage"] }); qc.invalidateQueries({ queryKey: ["plugins"] }); } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-teal-400/70">Current plan</div>
            <div className="text-xl font-semibold">{usage.data?.plan ?? "—"}</div>
          </div>
          <div className="text-right text-sm text-teal-300/80">
            {usage.data && <>{usage.data.searches.used} / {usage.data.searches.limit} searches used</>}
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((p) => {
          const current = usage.data?.planId === p.id;
          return (
            <Card key={p.id} className={current ? "!border-accent/60 shadow-glow" : ""}>
              <div className="flex items-baseline justify-between"><div className="font-medium">{p.name}</div>{current && <Badge>Current</Badge>}</div>
              <div className="mt-1 text-2xl font-semibold">${p.usd}<span className="text-xs text-teal-400">/mo</span></div>
              <div className="text-xs text-teal-400/70">₹{p.inr} · {p.note}</div>
              <Button className="mt-3" disabled={current || up.isPending} onClick={() => up.mutate(p.id)}>
                {current ? "Current plan" : "Switch (dev stub)"}
              </Button>
            </Card>
          );
        })}
      </div>
      {companyLicenceDev && <Card className="space-y-2"><div className="font-semibold">Company licence - local development only</div>
        <div className="text-sm text-teal-300/80">For testing the one-time company software model without monthly search caps. This does not activate a paid production licence.</div>
        <Button variant="ghost" disabled={usage.data?.planId==="enterprise"||up.isPending} onClick={()=>up.mutate("enterprise")}>Activate local company licence</Button>
        {up.error && <p className="text-rose-400 text-sm">{(up.error as Error).message}</p>}
      </Card>}
      <div className="text-xs text-teal-500/70">Development plan changes require the backend HIREWAVE_ALLOW_SET_PLAN=1 setting. A real company licence must be provisioned securely by an administrator, not through this screen.</div>
    </div>
  );
}
