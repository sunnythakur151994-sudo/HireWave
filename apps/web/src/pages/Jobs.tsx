import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button, Card, Empty, Badge } from "../components/ui";

export default function Jobs() {
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: api.jobs });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Link to="/app/jobs/new"><Button>New job</Button></Link>
      </div>
      {!jobs.data?.jobs.length ? <Empty title="No jobs yet" hint="Paste a job description to start sourcing." /> : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-teal-900/30 text-teal-300/80 text-left">
              <tr><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Skills</th><th className="px-4 py-2.5">Location</th><th className="px-4 py-2.5">Created</th><th></th></tr>
            </thead>
            <tbody>
              {jobs.data.jobs.map((j) => (
                <tr key={j.id} className="border-t border-teal-900/60 hover:bg-teal-900/20">
                  <td className="px-4 py-3 font-medium">{j.title}</td>
                  <td className="px-4 py-3 text-teal-300/80">{j.mustHave.join(", ") || "—"}</td>
                  <td className="px-4 py-3">{j.remote ? <Badge>Remote</Badge> : j.location ?? "—"}</td>
                  <td className="px-4 py-3 text-teal-400/70">{new Date(j.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right"><Link className="text-accent hover:underline" to={`/app/jobs/${j.id}/slate`}>Slate →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
