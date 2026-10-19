import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../lib/api";
import { Card, Empty, Badge } from "../components/ui";

export default function Candidates() {
  const { data } = useQuery({ queryKey: ["candidates"], queryFn: api.candidates });
  const [q, setQ] = useState("");
  const items = (data?.candidates ?? []).filter((c) => `${c.name} ${c.title} ${c.company} ${c.skills.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Candidates</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, title, skill…"
        className="w-full max-w-md rounded-lg border border-teal-800 bg-ink-900/60 px-3 py-2 text-sm outline-none focus:border-accent" />
      {!items.length ? <Empty title="No candidates yet" hint="Run sourcing or import a CSV." /> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link key={c.id} to={`/app/candidates/${c.id}`}>
              <Card className="hover:border-accent/50 transition">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-teal-400/70">{c.title} · {c.company ?? "—"}</div>
                <div className="mt-2 text-xs text-teal-300/80">{c.location ?? "Location unknown"}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.skills.slice(0, 5).map((s) => <Badge key={s} tone="slate">{s}</Badge>)}
                </div>
                <div className="mt-2">{c.sources.map((s) => <Badge key={s.plugin}>{s.plugin}</Badge>)}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
