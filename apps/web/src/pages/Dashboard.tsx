import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { HireIcon, type HireIconName } from "../components/HireIcon";
import type { Candidate } from "@hirewave/shared";

type CandidateStatus = "available" | "review" | "unavailable" | "unknown";
type Row = {id:string;name:string;title:string;years?:number;location?:string;skills:string[];notice?:string;status:CandidateStatus;score?:number;sample?:boolean};
const sampleRows: Row[] = [
  {id:"example-1",name:"Alex Morgan",title:"Senior Frontend Engineer",years:5,location:"Bengaluru",skills:["React","Node.js"],notice:"2 months",status:"available",score:92,sample:true},
  {id:"example-2",name:"Jordan Patel",title:"Backend Engineer",years:3,location:"Delhi",skills:["Node.js","Python"],notice:"1 month",status:"available",score:88,sample:true},
  {id:"example-3",name:"Taylor Singh",title:"DevOps Engineer",years:4,location:"Pune",skills:["AWS","Docker"],notice:"Not provided",status:"review",score:84,sample:true},
  {id:"example-4",name:"Casey Rao",title:"UI/UX Designer",years:3,location:"Noida",skills:["Figma","UI/UX"],notice:"1 month",status:"unknown",score:80,sample:true},
];
const sampleJobs = [
  {id:"ex-j1",title:"Senior Frontend Developer",skills:["React","Next.js"],location:"Remote",sample:true},
  {id:"ex-j2",title:"Backend Engineer",skills:["Node.js","Python"],location:"Bengaluru",sample:true},
  {id:"ex-j3",title:"UI/UX Designer",skills:["Figma"],location:"Delhi",sample:true},
  {id:"ex-j4",title:"DevOps Engineer",skills:["AWS","Docker"],location:"Hybrid",sample:true},
];
const palette = ["#147dff","#7d4bff","#ff793f","#10cba2","#ffc247","#81a2cc","#24c1ff","#ed64c9"];

function Metric({label,value,sub,icon,tone,href,preview}:{label:string;value:string|number;sub:string;icon:HireIconName;tone:string;href:string;preview:boolean}) {
  return <Link to={href} className={`hw-metric hw-metric-${tone}`}><div className="hw-metric-top"><span className="hw-metric-icon"><HireIcon name={icon} size={23}/></span><span className="hw-metric-label">{label}</span></div><div className="hw-metric-number">{value}</div><div className="hw-metric-bottom"><span>{sub}</span>{preview && <span className="hw-preview-star">Illustrative</span>}</div><span className="hw-metric-art" aria-hidden="true"/></Link>;
}
function SourceRing({items}:{items:{name:string;count:number}[]}) {
  const total=items.reduce((s,x)=>s+x.count,0);
  let count=0;
  const gradient = total ? items.map((r,i)=>{const start=count/total*100;count+=r.count;const end=count/total*100;return `${palette[i%palette.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;}).join(", ") : "#173458 0% 100%";
  return <div className="hw-source-body"><div className="hw-ring" role="img" aria-label={total ? `Candidate sources from ${items.length} connected data sources` : "No source data yet"} style={{background:`conic-gradient(${gradient})`}}><div className="hw-ring-hole"><strong>{total.toLocaleString("en-IN")}</strong><small>Source records</small></div></div><div className="hw-ring-legend">{items.length ? items.map((r,i)=><div className="hw-legend-row" key={r.name}><i style={{background:palette[i%palette.length]}}/><span title={r.name}>{r.name}</span><b>{Math.round(r.count/total*100)}%</b></div>):<div className="hw-no-source">Connect a recruitment platform to see the distribution.</div>}</div></div>;
}
function prettyDate(date:string|undefined) { if(!date) return "—";const d=new Date(date); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}); }
function statusLabel(s:CandidateStatus) {return s==="available"?"Available":s==="unavailable"?"Unavailable":s==="review"?"Needs review":"Not confirmed";}

export default function Dashboard() {
  const {user,org}=useAuth();
  const jobsQuery=useQuery({queryKey:["jobs"],queryFn:api.jobs});
  const candidatesQuery=useQuery({queryKey:["candidates"],queryFn:api.candidates});
  const usageQuery=useQuery({queryKey:["usage"],queryFn:api.usage});
  const auditQuery=useQuery({queryKey:["audit"],queryFn:api.audit});
  const messagesQuery=useQuery({queryKey:["messages"],queryFn:api.messages});
  const jobs=jobsQuery.data?.jobs ?? [];
  const candidates=candidatesQuery.data?.candidates ?? [];
  const latestJobId=jobs[0]?.id;
  const slateQuery=useQuery({queryKey:["dashboard-slate",latestJobId],queryFn:()=>api.slate(latestJobId!),enabled:!!latestJobId});
  const automationQuery=useQuery({queryKey:["dashboard-automation",latestJobId],queryFn:()=>api.automationBoard(latestJobId!),enabled:!!latestJobId});

  const [preview,setPreview]=useState(false);
  const [term,setTerm]=useState("");
  const [tab,setTab]=useState<"all"|"matched"|"available"|"review">("all");
  const [sort,setSort]=useState<"match"|"name"|"experience">("match");
  const [mode,setMode]=useState<"table"|"grid">("table");
  const [dateRange,setDateRange]=useState<"7"|"30"|"90"|"all">("30");

  const scores=new Map((slateQuery.data?.slate??[]).map(x=>[x.candidate.id,x.score.score]));
  const statusMap=new Map((automationQuery.data?.candidates??[]).map(x=>[x.candidate.id,x.qualification.category]));
  const qualifiedIds=new Set((automationQuery.data?.candidates??[]).filter(x=>x.qualification.criteriaVerified).map(x=>x.candidate.id));
  const recordCount = candidates.reduce((sum,c)=>sum+(c.sources?.length??0),0);
  const sourceCounts = useMemo(()=>{
    const m=new Map<string,number>();
    for(const c of candidates)for(const s of c.sources ?? [])m.set(s.plugin,(m.get(s.plugin)??0)+1);
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));
  },[candidatesQuery.data]);
  const previews = [{name:"LinkedIn",count:524},{name:"Indeed",count:225},{name:"Workable",count:187},{name:"Greenhouse",count:150},{name:"GitHub",count:100},{name:"Other",count:62}];
  const rows:Row[] = preview ? sampleRows : candidates.map((c:Candidate)=>({
    id:c.id,name:c.name,title:c.title??c.headline??"Not provided",years:c.yearsExperience,location:c.location,
    skills:c.skills??[],notice:c.profileFields?.find(x=>/notice.?period/i.test(x.field))?.value,
    status:statusMap.get(c.id)==="ready_for_hr"?"available":statusMap.get(c.id)==="unavailable"?"unavailable":statusMap.get(c.id)==="needs_review"?"review":"unknown",
    score:scores.get(c.id),
  }));
  const matching=preview ? sampleRows.filter(r=>(r.score??0)>=70).length : qualifiedIds.size;
  const ready=rows.filter(r=>r.status==="available").length;
  const filterRows=rows.filter(r=>{
    const hit=[r.name,r.title,r.location,...r.skills].join(" ").toLowerCase().includes(term.trim().toLowerCase());
    return hit && (tab==="all"||tab==="matched"&&(preview?(r.score??0)>=70:qualifiedIds.has(r.id))||tab==="available"&&r.status==="available"||tab==="review"&&r.status==="review");
  }).sort((a,b)=>sort==="name"?a.name.localeCompare(b.name):sort==="experience"?(b.years??-1)-(a.years??-1):(b.score??-1)-(a.score??-1));
  const shownJobs=preview?sampleJobs:jobs.slice(0,4).map(j=>({id:j.id,title:j.title,skills:j.mustHave,location:j.remote?"Remote":j.location||"Any",sample:false}));
  const activities=[
    ...(auditQuery.data?.audit??[]).map(a=>({id:`audit-${a.id}`,title:a.action.replace(/[._]/g," ").replace(/\b\w/g,v=>v.toUpperCase()),date:a.createdAt,icon:"shield" as HireIconName})),
    ...(messagesQuery.data?.messages??[]).map(m=>({id:`message-${m.id}`,title:`${m.channel==="email"?"Email":"LinkedIn"} outreach draft created`,date:m.createdAt,icon:"mail" as HireIconName})),
    ...jobs.map(j=>({id:`job-${j.id}`,title:`Job created: ${j.title}`,date:j.createdAt,icon:"jobs" as HireIconName})),
  ].filter(x=>Number.isFinite(new Date(x.date).getTime())).filter(x=>dateRange==="all"||Date.now()-new Date(x.date).getTime()<Number(dateRange)*864e5).sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,5);
  const firstName=String(user?.name||"Recruiter").split(" ")[0];
  const initialLoad=jobsQuery.isLoading||candidatesQuery.isLoading;

  return <div className="hw-dash">
    <div className="hw-dash-hello"><div><h1>Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, {firstName}! <span aria-hidden="true">👋</span></h1><p>Welcome to {org?.name || "HireWave"}. Manage your recruitment workflow in one place.</p></div><div className="hw-dash-hello-actions"><Link id="hw-create-job" className="hw-create-job" to="/app/jobs/new"><HireIcon name="plus" size={18}/> Create New Job</Link><label className="hw-range"><HireIcon name="calendar" size={16}/><select aria-label="Activity date range" value={dateRange} onChange={e=>setDateRange(e.target.value as typeof dateRange)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select><HireIcon name="chevron" size={14}/></label><button className={`hw-preview-toggle ${preview?"on":""}`} onClick={()=>setPreview(x=>!x)} title="Show illustrative data without importing candidates"><HireIcon name="sparkle" size={15}/>{preview?"Exit sample preview":"Preview sample dashboard"}</button></div></div>
    {preview && <div className="hw-demo-warning"><HireIcon name="sparkle" size={18}/><b>Sample preview active:</b> All displayed names, counts, activity and scores in this mode are illustrative. Nothing has been imported or contacted.<button onClick={()=>setPreview(false)}>Return to real data</button></div>}
    {!preview && (jobsQuery.isError||candidatesQuery.isError)&&<div className="hw-dash-error" role="alert">Unable to retrieve all workspace data. Check that the HireWave API is running and refresh the page.</div>}
    <div className="hw-metrics" id="hw-metrics">
      <Metric label="Active Jobs" value={preview?12:initialLoad?"—":jobs.length} sub="Open recruitment roles" tone="green" icon="users" href="/app/jobs" preview={preview}/>
      <Metric label="Total Candidates" value={preview?1248:initialLoad?"—":candidates.length} sub="Unified profiles" tone="purple" icon="candidates" href="/app/candidates" preview={preview}/>
      <Metric label="Qualified Matches" value={preview?86:slateQuery.isLoading?"—":matching} sub={preview?"Across sample records":latestJobId?"Latest job · criteria verified":"Create a job to verify matches"} tone="gold" icon="briefcase" href="/app/automation" preview={preview}/>
      <Metric label="Interview Requests" value={preview?24:automationQuery.isLoading?"—":automationQuery.data?.meetingRequests.length??0} sub={preview?"Example requests":latestJobId?"Latest job · booking not confirmed":"No job selected"} tone="blue" icon="calendar" href="/app/automation" preview={preview}/>
    </div>
    <div className="hw-content-grid">
      <section className="hw-panel hw-jobs-card" id="hw-recent-jobs"><div className="hw-panel-head"><h2>Recent Jobs</h2><Link to="/app/jobs">View all <HireIcon name="arrow" size={15}/></Link></div>
        <div className="hw-job-list">{shownJobs.length?shownJobs.map((j,i)=><Link className="hw-job-row" key={j.id} to={j.sample?"/app/jobs":`/app/jobs/${j.id}/slate`}><span className={`hw-job-symbol hw-job-symbol-${i%4}`}><HireIcon name="jobs" size={17}/></span><div className="hw-job-detail"><strong>{j.title}</strong><div>{j.skills.slice(0,2).map(skill=><span key={skill} className="hw-skill">{skill}</span>)}</div></div><span className="hw-job-location">{j.location}</span><span className="hw-job-live">{j.sample?"Sample":"View slate"}</span></Link>):<div className="hw-dash-empty"><HireIcon name="jobs" size={28}/><strong>No jobs created yet</strong><span>Create your first role to begin sourcing.</span><Link to="/app/jobs/new">Create a job <HireIcon name="arrow" size={15}/></Link></div>}</div>
      </section>
      <section className="hw-panel hw-sources-card" id="hw-source-chart"><div className="hw-panel-head"><h2>Candidates by Source</h2><Link to="/app/analytics">View details <HireIcon name="arrow" size={15}/></Link></div><SourceRing items={preview?previews:sourceCounts}/><div className="hw-panel-foot">{preview?"Illustrative distribution":`${recordCount} real source record${recordCount===1?"":"s"} across ${candidates.length} candidates`}</div></section>
      <section className="hw-panel hw-activity-card" id="hw-recent-activity"><div className="hw-panel-head"><h2>Recent Activity</h2><Link to="/app/privacy">Audit log <HireIcon name="arrow" size={15}/></Link></div><div className="hw-activity-list">
        {preview ? [{title:"Candidate profile imported",time:"2 minutes ago",icon:"candidates" as HireIconName},{title:"Interview request created",time:"12 minutes ago",icon:"calendar" as HireIconName},{title:"Outreach draft prepared",time:"24 minutes ago",icon:"mail" as HireIconName},{title:"Job added to workspace",time:"1 hour ago",icon:"check" as HireIconName}].map((a,i)=><div key={i} className="hw-activity-row"><span className={`hw-activity-icon a-${i}`}><HireIcon name={a.icon} size={19}/></span><div><b>{a.title}</b><small>{a.time} · Sample</small></div></div>) : activities.length?activities.map((a,i)=><div key={a.id} className="hw-activity-row"><span className={`hw-activity-icon a-${i%4}`}><HireIcon name={a.icon} size={19}/></span><div><b>{a.title}</b><small>{prettyDate(a.date)} · Recorded</small></div></div>):<div className="hw-dash-empty hw-dash-empty-mini"><HireIcon name="clock" size={26}/><strong>No recent activity</strong><span>Activity will appear as your team works.</span></div>}
      </div></section>
    </div>
    <section className="hw-panel hw-candidate-card" id="hw-candidate-table"><div className="hw-candidate-heading"><h2>Candidates</h2><span>{preview?"Sample records":"Live workspace data"}</span></div>
      <div className="hw-candidate-controls"><div className="hw-tabs" aria-label="Candidate categories">{(["all","matched","available","review"] as const).map(k=><button key={k} className={tab===k?"selected":""} onClick={()=>setTab(k)}>{k==="all"?"All":k==="matched"?"Matched":k==="available"?"Available":"Needs Review"} <span>({k==="all"?rows.length:k==="matched"?matching:k==="available"?ready:rows.filter(x=>x.status==="review").length})</span></button>)}</div><div className="hw-candidate-actions"><label className="hw-inline-search"><HireIcon name="search" size={17}/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search candidates..." aria-label="Search candidates"/></label><label className="hw-sort"><HireIcon name="sort" size={16}/><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)} aria-label="Sort candidates"><option value="match">Match</option><option value="name">Name</option><option value="experience">Experience</option></select></label><div className="hw-mode-group"><button className={mode==="table"?"active":""} onClick={()=>setMode("table")} title="Table view" aria-label="Table view"><HireIcon name="list" size={18}/></button><button className={mode==="grid"?"active":""} onClick={()=>setMode("grid")} title="Grid view" aria-label="Grid view"><HireIcon name="grid" size={18}/></button></div></div></div>
      {filterRows.length ? mode==="table" ? <div className="hw-table-wrap"><table className="hw-candidates-table"><thead><tr><th>Candidate</th><th>Position</th><th>Experience</th><th>Location</th><th>Skills</th><th>Notice Period</th><th>Availability</th><th>Match</th></tr></thead><tbody>{filterRows.slice(0,8).map(r=><tr key={r.id}><td><Link to={r.sample?"/app/candidates":`/app/candidates/${r.id}`} className="hw-candidate-name"><span className="hw-candidate-avatar">{r.name.slice(0,1)}</span><b>{r.name}</b></Link></td><td>{r.title}</td><td>{r.years==null?"Not provided":`${r.years} years`}</td><td>{r.location||"Not provided"}</td><td><div className="hw-skill-list">{r.skills.slice(0,3).map(s=><span key={s} className="hw-skill">{s}</span>)}</div></td><td>{r.notice||"Not provided"}</td><td><span className={`hw-status hw-status-${r.status}`}>{statusLabel(r.status)}</span></td><td><span className="hw-score">{r.score==null?"—":`${r.score}%`}</span></td></tr>)}</tbody></table></div>:<div className="hw-candidate-grid">{filterRows.slice(0,8).map(r=><Link key={r.id} className="hw-candidate-tile" to={r.sample?"/app/candidates":`/app/candidates/${r.id}`}><span className="hw-candidate-avatar">{r.name.slice(0,1)}</span><b>{r.name}</b><span>{r.title}</span><span>{r.location||"Location not provided"}</span><span className={`hw-status hw-status-${r.status}`}>{statusLabel(r.status)}</span><span className="hw-score">{r.score==null?"Match pending":`${r.score}% match`}</span></Link>)}</div>
        : <div className="hw-dash-empty hw-candidates-empty"><HireIcon name="candidates" size={32}/><strong>{candidatesQuery.isLoading?"Loading candidates...":term||tab!=="all"?"No candidates match these filters":"No candidates in your workspace yet"}</strong><span>{term||tab!=="all"?"Try a different filter or search.":"Connect a platform or import candidates to populate this table."}</span><div><Link to="/app/plugins">Connect platforms</Link><Link to="/app/candidates">Import candidates</Link></div></div>}
      <div className="hw-candidate-footer"><span>{filterRows.length} displayed record{filterRows.length===1?"":"s"}{!preview && latestJobId?" · Match and availability based on latest job when available":""}</span><Link to="/app/candidates">View all candidates <HireIcon name="arrow" size={14}/></Link></div>
    </section>
  </div>;
}
