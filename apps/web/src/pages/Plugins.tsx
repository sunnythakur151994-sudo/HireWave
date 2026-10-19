import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button, Card, Badge } from "../components/ui";

const CSV_SAMPLE = `name,title,company,location,skills,years,email,links,source_platform,source_url,education,notice_period,expected_salary,preferred_locations,work_mode\nAsha Verma,Full Stack Developer,Acme,Delhi,"react;typescript;node.js",4,asha@example.com,https://example.com/asha,Customer ATS,https://example.com/asha,B.Tech,30 days,12 LPA,Delhi;Remote,Hybrid`;

export default function Plugins() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["plugins"], queryFn: api.plugins });
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [csv, setCsv] = useState("");
  const [contactText, setContactText] = useState("");
  const [extracted, setExtracted] = useState<{type:string;value:string;note:string}[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const connect = useMutation({
    mutationFn: ({ id, apiKey }: { id: string; apiKey?: string }) => api.connectPlugin(id, apiKey),
    onSuccess: (r) => { setNotice(r.health); setErr(null); qc.invalidateQueries({ queryKey: ["plugins"] }); qc.invalidateQueries({ queryKey: ["usage"] }); },
    onError: (e) => setErr((e as Error).message),
  });
  const disconnect = useMutation({
    mutationFn: (id: string) => api.disconnectPlugin(id),
    onSuccess: () => { setErr(null); qc.invalidateQueries({ queryKey: ["plugins"] }); qc.invalidateQueries({ queryKey: ["usage"] }); },
    onError: (e) => setErr((e as Error).message),
  });
  const importCsv = useMutation({
    mutationFn: () => api.importCandidates(csv),
    onSuccess: (r) => { setNotice(`Imported ${r.imported} of ${r.parsed} parsed candidates.`); setErr(null); qc.invalidateQueries({ queryKey: ["candidates"] }); },
    onError: (e) => setErr((e as Error).message),
  });

  const runExtractor = useMutation({
    mutationFn: () => api.extractContacts(contactText),
    onSuccess: (r) => {
      setExtracted(r.contacts);
      setErr(null);
      setNotice(`${r.contacts.length} contact references identified. Results are unverified and have not been saved.`);
    },
    onError: (e) => setErr((e as Error).message),
  });
  // The built-in extractor has a dedicated panel. Avoid a duplicate connector tile.
  const groups = (data?.plugins ?? []).filter(p => p.id !== "hirewavesync").reduce<Record<string, any[]>>((g, p) => ((g[p.category] ??= []).push(p), g), {});
  const poolConnected = data?.plugins.some((p) => p.id === "pool" && p.connected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plugin marketplace</h1>
        <p className="text-sm text-teal-300/70">Connect supported sources. API credentials are encrypted per workspace; passwords are not stored.</p>
      </div>
      {err && <Card className="!border-rose-600/50 text-sm text-rose-300">{err}</Card>}
      {notice && <Card className="!border-accent/40 text-sm text-teal-200">{notice}</Card>}

      <Card className="!border-cyan-600/40" id="hirewavesync-extractor">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">HireWaveSync Contact Extractor</h2>
            <p className="text-xs text-teal-300/70 mt-1">
              Built in and always connected. Paste professional text you are authorized to process.
              This tool does not crawl websites or automatically contact candidates.
            </p>
          </div>
          <Badge tone="teal">Connected</Badge>
        </div>
        <textarea aria-label="Professional contact text" className="mt-3 w-full rounded-lg border border-teal-800 bg-ink-950/70 px-3 py-3 text-xs outline-none focus:border-accent"
          rows={5} maxLength={100000} value={contactText} onChange={e=>setContactText(e.target.value)}
          placeholder="Paste authorized candidate or professional contact text here..." />
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-teal-400/70">Text-only extraction; unsaved and unverified results</span>
          <Button onClick={()=>runExtractor.mutate()} disabled={runExtractor.isPending || !contactText.trim()}>
            {runExtractor.isPending ? "Extracting..." : "Extract Contact References"}
          </Button>
        </div>
        {extracted.length > 0 && <div className="mt-4 overflow-auto">
          <table className="min-w-full text-xs"><thead><tr className="text-teal-200">
            <th className="p-2 text-left">Type</th><th className="p-2 text-left">Reference</th><th className="p-2 text-left">Status</th>
          </tr></thead><tbody>{extracted.map((contact, i)=><tr className="border-t border-teal-900" key={`${contact.type}:${contact.value}:${i}`}>
            <td className="p-2 capitalize">{contact.type}</td><td className="p-2 break-all">{contact.value}</td><td className="p-2 text-teal-400">Unverified</td>
          </tr>)}</tbody></table>
        </div>}
      </Card>

      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <div className="text-xs uppercase tracking-wider text-teal-400/70 mb-2">{cat}</div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Card key={p.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-teal-400/70">{p.tier} · {p.connectorType} · {p.risk} risk</div>
                  </div>
                  {p.connected ? <Badge tone="teal">Connected</Badge> : p.status !== "live" ? <Badge tone="slate">Planned</Badge> : <Badge tone="amber">Available</Badge>}
                </div>
                <p className="text-xs text-teal-300/80 min-h-[2.5em]">{p.description}</p>
                {!p.connected && p.status === "live" && p.auth === "api_key" && (
                  <input type="password" value={keys[p.id] ?? ""} onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
                    placeholder={p.id === "github" ? "GitHub token (optional)" : "API key"}
                    className="w-full rounded-lg border border-teal-800 bg-ink-950/70 px-3 py-2 text-xs outline-none focus:border-accent" />
                )}
                <div className="mt-auto">
                  {p.connected
                    ? <Button variant="danger" onClick={() => disconnect.mutate(p.id)} disabled={disconnect.isPending}>Disconnect</Button>
                    : <Button onClick={() => connect.mutate({ id: p.id, apiKey: keys[p.id] || undefined })} disabled={p.status !== "live" || connect.isPending}>Connect</Button>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold">Import talent pool CSV</div>
            <div className="mt-1 text-xs text-teal-400/70">Import permitted professional information, including source_platform, source_url, education, work history, salary preferences and notice period. Source labels are user-entered, not verified platform connections. Then connect “Imported Talent Pool”.</div>
          </div>
          {poolConnected ? <Badge>Pool connected</Badge> : <Badge tone="amber">Connect pool to search</Badge>}
        </div>
        <textarea rows={7} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={CSV_SAMPLE}
          className="mt-3 w-full rounded-lg border border-teal-800 bg-ink-950/70 px-3 py-2 text-xs font-mono outline-none focus:border-accent" />
        <div className="mt-3 flex justify-between items-center">
          <button className="text-xs text-teal-400 hover:text-teal-200" onClick={() => setCsv(CSV_SAMPLE)}>Use sample CSV</button>
          <Button onClick={() => importCsv.mutate()} disabled={importCsv.isPending || csv.trim().length < 3}>{importCsv.isPending ? "Importing…" : "Import CSV"}</Button>
        </div>
      </Card>
    </div>
  );
}
