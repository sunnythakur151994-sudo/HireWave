import {useMemo,useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Link} from "react-router-dom";
import {api, type OutreachChannel} from "../lib/api";
import {Badge,Button,Card,Empty,Spinner} from "../components/ui";

const chLabel: Record<OutreachChannel,string>={email:"Email",sms:"SMS",voice:"Phone call"};
const agentLabel: Record<OutreachChannel,string>={email:"Messaging Agent",sms:"Messaging Agent",voice:"Calling Agent"};
function DraftEditor({task,busy,onSave,onCancel}:{task:{id:string;channel:OutreachChannel;subject?:string;body:string};busy:boolean;
  onSave:(id:string,subject:string|undefined,body:string)=>Promise<boolean>;onCancel:(id:string)=>Promise<void>}){
  const [editing,setEditing]=useState(false);
  const [subject,setSubject]=useState(task.subject??"");
  const [body,setBody]=useState(task.body);
  return <div className="space-y-2">
    {editing?<>
      {task.channel==='email'&&<label className="block text-xs text-teal-200">Subject
        <input aria-label="Email subject" value={subject} onChange={e=>setSubject(e.target.value)} maxLength={180}
          className="mt-1 block w-full rounded-lg border border-teal-800 bg-ink-950 p-2 text-sm"/>
      </label>}
      <label className="block text-xs text-teal-200">{task.channel==='voice'?'Spoken script':'Message'}
        <textarea aria-label="Outreach message" value={body} onChange={e=>setBody(e.target.value)} maxLength={task.channel==='sms'?320:task.channel==='voice'?650:1500}
          rows={5} className="mt-1 block w-full rounded-lg border border-teal-800 bg-ink-950 p-2 text-sm"/>
      </label>
      <p className="text-xs text-amber-300">Email/SMS must keep opt-out instructions; voice scripts must say the call is automated. Saving does not authorize sending.</p>
      <Button disabled={busy||body.trim().length<20} onClick={async()=>{const saved=await onSave(task.id,task.channel==='email'?subject:undefined,body);if(saved)setEditing(false);}}>Save changes</Button>
      <Button variant="ghost" disabled={busy} onClick={()=>{setSubject(task.subject??'');setBody(task.body);setEditing(false);}}>Discard edits</Button>
    </>:<>
      {task.subject&&<p className="text-xs text-teal-300/85">Subject: {task.subject}</p>}
      <p className="text-sm text-teal-100/80 bg-ink-950 rounded-lg p-3 whitespace-pre-line">{task.body}</p>
      <Button variant="ghost" disabled={busy} onClick={()=>setEditing(true)}>Edit draft</Button>
      <Button variant="ghost" disabled={busy} onClick={()=>onCancel(task.id)}>Cancel draft</Button>
    </>}
  </div>
}

export default function Agents(){
  const qc=useQueryClient();
  const jobs=useQuery({queryKey:["jobs"],queryFn:api.jobs});
  const [selectedJob,setSelectedJob]=useState("");
  const jobId=selectedJob||jobs.data?.jobs[0]?.id||"";
  const board=useQuery({queryKey:["agents",jobId],queryFn:()=>api.agentsBoard(jobId),enabled:!!jobId,refetchInterval:12000});
  const [channel,setChannel]=useState<OutreachChannel>("email");
  const [checked,setChecked]=useState<Record<string,boolean>>({});
  const [draftIds,setDraftIds]=useState<Record<string,boolean>>({});
  const [approved,setApproved]=useState(false);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState("");
  const candidates=useMemo(()=>board.data?.candidates??[],[board.data]);
  const ready=candidates.filter(c=>c.channels.find(x=>x.channel===channel)?.allowed);
  const drafts=(board.data?.tasks??[]).filter(t=>t.channel===channel&&t.status==="draft");
  const activeIds=drafts.filter(t=>draftIds[t.id]!==false).map(t=>t.id);
  async function reload(){await qc.invalidateQueries({queryKey:["agents",jobId]});await qc.invalidateQueries({queryKey:["automation",jobId]});}
  async function prepare(){
    const ids=ready.filter(c=>checked[c.id]).map(c=>c.id);
    if(!ids.length){setErr("Select at least one eligible candidate.");return;}
    setBusy(true);setErr("");setMsg("");
    try{const r=await api.prepareAgentTasks(jobId,channel,ids.slice(0,25));
      setMsg(`Prepared ${r.outcomes.filter(x=>x.created).length} new draft(s); ${r.outcomes.filter(x=>x.error).length} blocked.`);
      setChecked({});await reload();}
    catch(e){setErr((e as Error).message)}finally{setBusy(false)}
  }
  async function dispatch(){
    if(!approved){setErr("Please confirm the legal contact basis and permissions.");return;}
    if(!activeIds.length){setErr("No drafts selected.");return;}
    setBusy(true);setErr("");setMsg("");
    try{const r=await api.dispatchAgentTasks(activeIds.slice(0,10));
      setMsg(`Submitted ${r.results.filter(x=>x.status==="sent").length} to provider, ${r.results.filter(x=>x.status!=="sent").length} blocked/failed. Review task history below.`);
      setDraftIds({});await reload();}
    catch(e){setErr((e as Error).message)}finally{setBusy(false)}
  }
  async function revise(id:string,subject:string|undefined,body:string){
    setBusy(true);setErr("");setMsg("");
    try {await api.reviseAgentTask(id,subject,body);setApproved(false);setMsg("Draft updated. Review it again before sending.");await reload();return true;}
    catch(e){setErr((e as Error).message);return false;}finally{setBusy(false)}
  }
  async function cancel(id:string){setBusy(true);setErr("");try{await api.cancelAgentTask(id);await reload();}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
  return <div className="space-y-6">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Outreach agents</h1>
      <p className="text-sm text-teal-300/75">Two agents: Messaging (email + SMS) and Calling (voice notification). Candidate permission and recruiter approval are required before every send.</p></header>
    <div className="grid md:grid-cols-2 gap-3">
      <Card className="space-y-2"><div className="font-semibold text-teal-100">Messaging Agent</div>
        <p className="text-sm text-teal-300/75">Prepare follow-ups, queue email/SMS, and record provider submissions.</p>
        <div className="text-xs">Email: <Badge tone={board.data?.providers.email?"teal":"amber"}>{board.data?.providers.email?"Ready":"Not configured"}</Badge> · SMS: <Badge tone={board.data?.providers.sms?"teal":"amber"}>{board.data?.providers.sms?"Ready":"Not configured"}</Badge></div></Card>
      <Card className="space-y-2"><div className="font-semibold text-teal-100">Calling Agent</div>
        <p className="text-sm text-teal-300/75">Initiate a short one-way automated voice follow-up through Twilio, when permitted. Conversational calling and call-back handling are not implemented.</p>
        <div className="text-xs">Voice: <Badge tone={board.data?.providers.voice?"teal":"amber"}>{board.data?.providers.voice?"Ready":"Not configured"}</Badge></div></Card>
    </div>
    <Card className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="block text-sm flex-1 min-w-[220px]">Job
          <select value={jobId} onChange={e=>{setSelectedJob(e.target.value);setChecked({});setDraftIds({});setMsg("");}} className="mt-1 block w-full rounded-lg border border-teal-800 bg-ink-950 p-2">
            {(jobs.data?.jobs??[]).map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </label>
        <label className="block text-sm min-w-[160px]">Communication channel
          <select value={channel} onChange={e=>{setChannel(e.target.value as OutreachChannel);setChecked({});setDraftIds({});}} className="mt-1 block w-full rounded-lg border border-teal-800 bg-ink-950 p-2">
            <option value="email">Email</option><option value="sms">SMS</option><option value="voice">Phone call</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-teal-300/75">Select only candidates who passed job criteria, confirmed availability, and opted in for the selected channel. Missing phone/email addresses are excluded automatically.</p>
      {!board.data?.sendingEnabled && <p className="text-sm text-amber-300">Sending is OFF. Set AGENTS_SENDING_ENABLED=true on the server after configuring verified providers and compliance checks. Draft preparation remains available.</p>}
    </Card>
    {err && <Card className="!border-rose-700 text-rose-300 text-sm">{err}</Card>}
    {msg && <Card className="text-teal-300 text-sm">{msg}</Card>}
    {!jobId?<Empty title="Create a job first" hint="Connect permitted sources and run sourcing in Recruitment Automation."/>:
      board.isLoading?<Card><Spinner/></Card>:
      <Card className="space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2"><h2 className="font-semibold">Eligible and consenting candidates · {chLabel[channel]} ({ready.length})</h2><Link className="text-xs text-accent hover:underline" to="/app/automation">View qualification board →</Link></div>
        {ready.length===0?<p className="text-sm text-teal-300/70">No candidate has confirmed eligibility, availability and {chLabel[channel].toLowerCase()} permission yet. Start with an availability invitation in Automation.</p>:
        ready.map(c=><label key={c.id} className="flex items-center gap-3 border-t border-teal-900/50 pt-3 text-sm cursor-pointer">
          <input type="checkbox" checked={!!checked[c.id]} onChange={e=>setChecked(old=>({...old,[c.id]:e.target.checked}))} className="accent-teal-400"/>
          <span className="flex-1">{c.name} <span className="text-teal-300/60">· {chLabel[channel]} permission confirmed</span></span>
          <Badge>Eligible</Badge>
        </label>)}
        <Button disabled={busy||ready.length===0||!ready.some(c=>checked[c.id])} onClick={prepare}>Prepare selected drafts (max 25)</Button>
      </Card>}
    {!!drafts.length&&<Card className="space-y-3">
      <h2 className="font-semibold">Review before sending · {drafts.length} draft(s)</h2>
      {drafts.map(t=><div key={t.id} className="border-t border-teal-900/50 pt-3 space-y-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draftIds[t.id]!==false} onChange={e=>setDraftIds(old=>({...old,[t.id]:e.target.checked}))} className="accent-teal-400"/>
          <strong>{candidates.find(c=>c.id===t.candidateId)?.name??"Candidate"}</strong><Badge>{chLabel[t.channel]}</Badge></label>
        <DraftEditor key={`${t.id}:${t.updatedAt}`} task={t} busy={busy} onSave={revise} onCancel={cancel}/>
      </div>)}
      <label className="flex items-start gap-2 text-sm text-teal-200/85">
        <input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)} className="mt-1 accent-teal-400"/>
        I verified the candidate's express channel permission, applicable outreach rules (including DND/DLT where required), correct contact details, and that these individually reviewed messages may be sent now.
      </label>
      <Button disabled={busy||!approved||!activeIds.length||!board.data?.providers[channel]} onClick={dispatch}>Approve & submit to provider (max 10)</Button>
      <p className="text-xs text-amber-300/80">A failed/ambiguous provider submission is held for manual review to avoid duplicate contact. Sending may incur external provider charges. "Sent" here means provider accepted the request, not confirmed delivery, answer or interview booking. Failed ambiguous requests are never automatically retried.</p>
    </Card>}
    <Card className="space-y-3"><h2 className="font-semibold">Task history</h2>
      {!board.data?.tasks.length?<p className="text-sm text-teal-300/70">No outreach agent tasks yet.</p>:
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-teal-300/75"><th className="py-2">Candidate</th><th>Agent</th><th>Channel</th><th>Status</th><th>Date</th></tr></thead><tbody>
        {board.data.tasks.slice(0,50).map(t=><tr className="border-t border-teal-900/50" key={t.id}>
          <td className="py-2">{candidates.find(c=>c.id===t.candidateId)?.name??"Candidate"}</td>
          <td>{agentLabel[t.channel]}</td><td>{chLabel[t.channel]}</td><td><Badge tone={t.status==="sent"?"teal":t.status==="failed"?"rose":"amber"}>{t.status}</Badge> {t.error&&<span className="block text-xs text-rose-300">{t.error}</span>}</td>
          <td className="text-xs">{new Date(t.updatedAt).toLocaleString()}</td>
        </tr>)}</tbody></table></div>}
    </Card>
  </div>
}
