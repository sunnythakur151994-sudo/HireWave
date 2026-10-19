import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, Button, Card, Empty, Spinner } from "../components/ui";

const statusLabels: Record<string,string> = {
  ready_for_hr:"Available - HR review", awaiting_availability:"Awaiting availability",
  needs_review:"Evidence needs review", unavailable:"Not available",
};
const statusColors: Record<string, "teal" | "amber" | "rose" | "slate"> = {
  ready_for_hr:"teal", awaiting_availability:"amber", needs_review:"slate", unavailable:"rose"
};
export default function Automation() {
  const qc=useQueryClient();
  const jobs=useQuery({queryKey:["jobs"],queryFn:api.jobs});
  const [selected,setSelected]=useState<string>("");
  const jobId=selected || jobs.data?.jobs[0]?.id || "";
  const board=useQuery({queryKey:["automation",jobId],queryFn:()=>api.automationBoard(jobId),enabled:!!jobId,refetchInterval:10000});
  const [links,setLinks]=useState<Record<string,string>>({});
  const [sending,setSending]=useState<string|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const [ack,setAck]=useState(false);
  const [busy,setBusy]=useState(false);
  const [sourcing,setSourcing]=useState(false);
  const [sourceStatus,setSourceStatus]=useState("");
  const rows=useMemo(()=>board.data?.candidates??[],[board.data]);

  async function runSourcing(){
    if(!jobId)return;
    setSourcing(true);setErr(null);setSourceStatus("Searching connected platforms…");
    try {
      const run=await api.startRun({jobId});
      for(let i=0;i<90;i++){
        await new Promise(r=>setTimeout(r,1000));
        const current=await api.run(run.id);
        if(current.status==="done"){
          setSourceStatus(`Search completed: ${current.slateSize} candidates scored`);
          await qc.invalidateQueries({queryKey:["automation",jobId]});
          return;
        }
        if(current.status==="error")throw new Error(current.error||"Sourcing failed");
      }
      setSourceStatus("Search is still running. Results will appear when it finishes.");
    }catch(e){setErr((e as Error).message);setSourceStatus("")}
    finally{setSourcing(false)}
  }
  async function invite(id:string,sendEmail:boolean){
    setSending(id);setErr(null);
    try{
      const result=await api.availabilityInvite(jobId,{candidateId:id,sendEmail,contactBasisReviewed:ack});
      if(result.link) setLinks(old=>({...old,[id]:result.link!}));
      if(result.sent) setLinks(old=>({...old,[id]:"Invitation sent using verified email service"}));
      qc.invalidateQueries({queryKey:["automation",jobId]});
    }catch(e){setErr((e as Error).message)}finally{setSending(null)}
  }
  async function requestMeeting(id:string){
    setBusy(true);setErr(null);
    try{await api.requestHRMeeting(jobId,id);await qc.invalidateQueries({queryKey:["automation",jobId]});}
    catch(e){setErr((e as Error).message)}finally{setBusy(false)}
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div><h1 className="text-2xl font-semibold">Recruitment automation</h1>
      <p className="text-sm text-teal-300/70">Sourcing → objective criteria → candidate availability → HR interview request</p></div>
      <div className="flex gap-2"><Button disabled={sourcing||!jobId} onClick={runSourcing}>{sourcing?"Searching…":"Search & classify"}</Button>
      <Link to="/app/runs"><Button variant="ghost">Sourcing history →</Button></Link></div>
    </div>
    <Card className="space-y-3">
      <div className="text-sm font-medium">Job being screened</div>
      <select aria-label="Select job" className="rounded-lg border border-teal-800 bg-ink-950 p-2 text-sm w-full max-w-xl"
        value={jobId} onChange={e=>{setSelected(e.target.value);setLinks({});setErr(null)}}>
        {(jobs.data?.jobs??[]).map(j=><option value={j.id} key={j.id}>{j.title}</option>)}
      </select>
      {board.data?.job && <div className="text-xs text-teal-300/70">Required evidence: {board.data.job.mustHave.join(", ")||"Needs HR review"} · Experience: {board.data.job.minYears??"Not specified"} years</div>}
    </Card>
    {board.data && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Object.entries(board.data.counts).map(([k,v])=><Card key={k} className="!p-4"><div className="text-xl font-semibold">{v}</div><div className="text-xs text-teal-300/80">{statusLabels[k]}</div></Card>)}
    </div>}
    <div className="text-sm text-teal-300/80">Only candidate-confirmed available profiles appear in the ready list. Missing or uncertain profile information always stays visible for HR review.</div>
    <label className="flex items-start gap-2 text-sm text-teal-200/80">
      <input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} className="mt-1 accent-teal-400"/>
      I verified that sending this candidate an individual recruitment invitation is permitted, the address is appropriate, and no opt-out applies. Required for email sending; not needed to create a link.
    </label>
    {sourceStatus && <p className="text-sm text-teal-300">{sourceStatus}</p>}
    {err && <Card className="text-rose-300">{err}</Card>}
    {!jobId?<Empty title="Create a job to begin" hint="Add a job description, connect sources, and run sourcing."/>:
    board.isLoading?<Card className="flex justify-center p-12"><Spinner/></Card>:
    !board.data?.run?<Empty title="Run sourcing first" hint="Open Sourcing runs and search the currently connected platforms."/>:
    rows.length===0?<Empty title="No candidates in the latest slate" hint="Import authorized candidates or connect a supported source."/>:
    <div className="space-y-6">{(["ready_for_hr","awaiting_availability","needs_review","unavailable"] as const).map(category => {
      const entries=rows.filter(row=>row.qualification.category===category);
      if(!entries.length)return null;
      return <section key={category} className="space-y-3">
        <h2 className="text-lg font-semibold text-teal-100">{statusLabels[category]} <span className="text-sm font-normal text-teal-400">({entries.length})</span></h2>
        {entries.map(({candidate,qualification})=>{
      const ready=qualification.category==="ready_for_hr";
      const canInvite=qualification.category==="awaiting_availability";
      const hasMeeting=board.data?.meetingRequests.some(m=>m.candidateId===candidate.id);
      return <Card key={candidate.id} className="space-y-3">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div><Link to={`/app/candidates/${candidate.id}`} className="font-semibold hover:text-accent">{candidate.name}</Link>
          <p className="text-xs text-teal-300/70">{candidate.title || "Profile title unknown"} · {candidate.location||"Location not provided"} · {candidate.sources.join(", ")}</p></div>
          <div className="flex items-center gap-2"><span className="font-bold text-lg">{qualification.score}/100</span><Badge tone={statusColors[qualification.category]}>{statusLabels[qualification.category]}</Badge></div>
        </div>
        <div className="text-xs text-teal-300/80">{qualification.reasons.join(" · ")}</div>
        {qualification.contactConsent.length>0 && <div className="text-xs text-teal-300/80">Candidate communication permission: {qualification.contactConsent.join(", ")}</div>}
        {canInvite && <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" disabled={sending===candidate.id} onClick={()=>invite(candidate.id,false)}>Create secure availability link</Button>
          <Button disabled={sending===candidate.id||!candidate.emailAvailable||!board.data?.services.emailReady||!ack} onClick={()=>invite(candidate.id,true)}>Send individual email inquiry</Button>
          {!board.data?.services.emailReady && <span className="text-xs text-teal-400/70 self-center">Email requires server Resend configuration</span>}
        </div>}
        {ready && <Button disabled={busy||hasMeeting} onClick={()=>requestMeeting(candidate.id)}>{hasMeeting?"Pending HR calendar approval":"Add to HR interview queue"}</Button>}
        {links[candidate.id] && <div className="text-xs rounded bg-ink-950 p-3 break-all"><span className="font-semibold">{links[candidate.id].startsWith("http")?"Share privately with candidate: ":"Status: "}</span>{links[candidate.id]}</div>}
      </Card>
    })}</section>})}</div>}
    {board.data?.meetingRequests.length ? <Card>
      <h2 className="font-semibold mb-3">HR interview requests</h2>
      {board.data.meetingRequests.map(m=><div key={m.id} className="text-sm border-t border-teal-900/50 py-2">Candidate: {rows.find(r=>r.candidate.id===m.candidateId)?.candidate.name||m.candidateId} · Pending calendar verification {m.preferredWindow?` · Preferred: ${m.preferredWindow}`:""}</div>)}
      <p className="text-xs text-teal-400/70">No meeting is marked confirmed until connected HR calendar creates the actual event.</p>
    </Card>:null}
  </div>
}
