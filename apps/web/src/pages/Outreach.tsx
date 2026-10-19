import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Empty } from "../components/ui";

export default function Outreach() {
  const { data } = useQuery({ queryKey: ["messages"], queryFn: api.messages });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Outreach drafts</h1>
      {!data?.messages.length ? <Empty title="No drafts yet" hint="Open a candidate and click Draft email." /> : (
        <div className="space-y-3">
          {data.messages.map((m) => (
            <Card key={m.id}>
              <div className="flex justify-between text-xs text-teal-400/70">
                <span>{m.channel} · {m.subject ?? "—"}</span>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <pre className="mt-2 text-sm whitespace-pre-wrap font-mono text-teal-100/90">{m.body}</pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
