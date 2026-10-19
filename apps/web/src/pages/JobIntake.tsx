import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button, Card, Spinner } from "../components/ui";

const SAMPLE = `Senior Full Stack Developer
Remote (US) · Full-time · Senior · $140k–$180k
We're looking for a Senior Full Stack Developer to join our platform team.
Requirements:
- 5+ years building production web applications
- Strong React, TypeScript, and Postgres experience
- AWS deployment experience
Nice to have: Kubernetes, GraphQL`;

export default function JobIntake() {
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const nav = useNavigate();
  const create = useMutation({
    mutationFn: () => api.createJob(text),
    onSuccess: (job) => { qc.invalidateQueries({ queryKey: ["jobs"] }); nav(`/app/jobs/${job.id}/slate`); },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">New job</h1>
      <p className="text-sm text-teal-300/70">Paste a job description. The built-in parser extracts skills, years, seniority, location and salary.</p>
      <Card>
        <textarea
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE}
          className="w-full rounded-lg border border-teal-800 bg-ink-950/70 px-3 py-2 text-sm outline-none focus:border-accent font-mono"
        />
        <div className="mt-3 flex items-center justify-between">
          <button className="text-xs text-teal-400/70 hover:text-teal-200" onClick={() => setText(SAMPLE)}>Use sample JD</button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || text.length < 20}>
            {create.isPending ? <><Spinner /> Parsing…</> : "Create job & open slate"}
          </Button>
        </div>
        {create.error && <div className="mt-2 text-sm text-rose-400">{(create.error as Error).message}</div>}
      </Card>
    </div>
  );
}
