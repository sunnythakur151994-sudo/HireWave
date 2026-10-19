import {useState} from "react";
import {useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api";
import {Button,Card,Spinner} from "../components/ui";

export default function Availability(){
  const {token=""}=useParams();
  const info=useQuery({queryKey:["availability",token],queryFn:()=>api.availabilityInfo(token),retry:false});
  const [status,setStatus]=useState<"available"|"unavailable">("available");
  const [preferredWindow,setPreferredWindow]=useState("");
  const [timezone,setTimezone]=useState("Asia/Kolkata");
  const [consent,setConsent]=useState<string[]>([]);
  const [doNotContact,setDoNotContact]=useState(false);
  const [done,setDone]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(){
    setBusy(true);setError("");
    try {await api.respondAvailability(token,{status,timezone,preferredWindow,contactConsent:consent,doNotContact});setDone(true)}
    catch(e){setError((e as Error).message)} finally{setBusy(false)}
  }
  return <div className="min-h-screen bg-ink-950 text-teal-50 p-4 grid place-items-center"><div className="max-w-xl w-full space-y-5">
    <h1 className="text-3xl font-bold text-accent">HireWave</h1>
    {info.isLoading?<Card><Spinner/></Card>:info.error?<Card>This invitation is expired, already used, or unavailable.</Card>:
      done?<Card><h2 className="text-xl font-semibold">Response received</h2><p className="text-sm text-teal-300/80 mt-2">Thank you. The recruiting team can now review your availability and preferences.</p></Card>:
      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Confirm recruitment availability</h2>
        <p className="text-sm text-teal-200/80">{info.data?.organization} is considering candidates for <strong>{info.data?.role}</strong>. This form is voluntary and is not a hiring decision or interview booking.</p>
        <label className="text-sm block">Are you currently interested and available to discuss this role?</label>
        <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full bg-ink-950 border border-teal-800 rounded p-2">
          <option value="available">Yes, I am interested and available</option><option value="unavailable">No, not available/interested</option>
        </select>
        {status==="available"&&<>
          <label className="text-sm block">Preferred interview time / days (optional)</label>
          <input value={preferredWindow} onChange={e=>setPreferredWindow(e.target.value)} maxLength={240} placeholder="e.g. Weekdays 3-5 PM" className="w-full bg-ink-950 border border-teal-800 rounded p-2"/>
          <label className="text-sm block">Time zone</label>
          <input value={timezone} onChange={e=>setTimezone(e.target.value)} maxLength={80} className="w-full bg-ink-950 border border-teal-800 rounded p-2"/>
        </>}
        <p className="text-sm text-teal-200/80">Optional communication permissions (unchecked by default):</p>
        <div className="space-y-2">{(["email","sms","voice"] as const).map(ch=><label key={ch} className="flex gap-2 items-center text-sm">
          <input type="checkbox" className="accent-teal-400" checked={consent.includes(ch)} onChange={e=>setConsent(old=>e.target.checked?[...old,ch]:old.filter(c=>c!==ch))}/>
          {ch==="email"?"Email":ch==="sms"?"SMS":"Phone call"} follow-up about this role
        </label>)}</div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-400" checked={doNotContact} onChange={e=>setDoNotContact(e.target.checked)}/>Do not contact me again (remove my profile from this recruiter's workspace)</label>
        <p className="text-xs text-teal-400/70">You can decline the opportunity and leave all contact permissions unchecked. No communication permissions are assumed from a public profile.</p>
        {error&&<p className="text-rose-300 text-sm">{error}</p>}
        <Button onClick={submit} disabled={busy} className="w-full">{busy?"Submitting…":"Submit response"}</Button>
      </Card>}
  </div></div>
}
