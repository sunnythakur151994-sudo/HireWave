import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { HireIcon } from "../components/HireIcon";
import "./admin-portal.css";

type View = "overview" | "organizations" | "integrations" | "audit" | "system";
const tabs: {id:View;label:string;icon:"dashboard"|"users"|"plugins"|"file"|"settings"}[] = [
  {id:"overview",label:"Platform Overview",icon:"dashboard"},
  {id:"organizations",label:"Organizations",icon:"users"},
  {id:"integrations",label:"Integrations",icon:"plugins"},
  {id:"audit",label:"Activity & Audit",icon:"file"},
  {id:"system",label:"System Health",icon:"settings"},
];
const labels:Record<string,string>={
  organizations:"Organizations",recruiters:"Recruiter Accounts",jobs:"Jobs",candidates:"Candidate Records",
  searches:"Sourcing Runs",completedSearches:"Completed Runs",failedSearches:"Failed Runs",
  connections:"Connected Accounts",suppressed:"Opt-outs",outreachTasks:"Outreach Tasks",
  sentTasks:"Sent Tasks",pendingTasks:"Tasks Pending",meetingRequests:"Meeting Requests",
};
const dateTime=(s:string)=>new Date(s).toLocaleString();
export default function AdminPortal() {
  const {user,logout}=useAuth();
  const nav=useNavigate();
  const [tab,setTab]=useState<View>("overview");
  const [query,setQuery]=useState("");
  const [collapsed,setCollapsed]=useState(false);
  const {data,isLoading,error,refetch,isFetching}=useQuery({queryKey:["admin-overview"],queryFn:api.adminOverview,refetchInterval:30000});
  const totals=data?.totals??{};
  const max=Math.max(1,...(data?.series??[]).map(d=>d.count));
  const tenantLookup=useMemo(()=>new Map((data?.organizations??[]).map(t=>[t.id,t.name])),[data?.organizations]);
  const filtered=data?.organizations.filter(o=>`${o.name} ${o.plan}`.toLowerCase().includes(query.toLowerCase()))??[];

  return <div className="hwa-root">
    <aside className={`hwa-sidebar ${collapsed?"hwa-collapsed":""}`}>
      <div className="hwa-brand"><HireIcon name="activity" size={31}/><span>Hire<span>Wave</span></span></div>
      <div className="hwa-sidebar-kicker">SYSTEM ADMINISTRATION</div>
      <nav aria-label="Administrator navigation">
        {tabs.map(item=><button type="button" key={item.id} onClick={()=>setTab(item.id)} className={tab===item.id?"selected":""}>
          <HireIcon name={item.icon} size={18}/><span>{item.label}</span>
        </button>)}
      </nav>
      <div className="hwa-sidefoot"><span>Private administration portal</span>
        <button type="button" onClick={()=>{logout();nav("/login");}}><HireIcon name="logout" size={18}/> Sign out</button>
      </div>
    </aside>
    <main className="hwa-main">
      <header className="hwa-topbar">
        <button className="hwa-iconbutton" aria-label="Toggle sidebar" onClick={()=>setCollapsed(!collapsed)}><HireIcon name="menu" size={19}/></button>
        <div className="hwa-page-heading"><span>HireWave / Administration</span><strong>{tabs.find(t=>t.id===tab)?.label}</strong></div>
        <div className="hwa-top-actions"><span className="hwa-live"><i/> System access</span>
          <button className="hwa-refresh" onClick={()=>refetch()} disabled={isFetching}><HireIcon name="clock" size={15}/> {isFetching?"Refreshing…":"Refresh"}</button>
          <button className="hwa-refresh" onClick={()=>{logout();nav("/login");}}><HireIcon name="logout" size={15}/> Sign out</button>
          <div className="hwa-user"><b>{(user?.name||"A").slice(0,1)}</b><span>{user?.name||"Administrator"}<small>Super administrator</small></span></div>
        </div>
      </header>
      <div className="hwa-content">
        <div className="hwa-intro"><div><span className="hwa-eyebrow">ACCOUNT-WIDE PERFORMANCE</span><h1>{tabs.find(t=>t.id===tab)?.label}</h1><p>Live operational metrics from connected HireWave workspaces. No sample counts are included.</p></div>
          <span className="hwa-updated">Updated {data?.updatedAt?dateTime(data.updatedAt):"—"}</span>
        </div>
        {isLoading && <div className="hwa-placeholder">Loading administrator data…</div>}
        {error && <div className="hwa-error">{(error as Error).message}. Check that this session has administrator access.</div>}
        {data && tab==="overview" && <>
          <div className="hwa-metrics">{["organizations","recruiters","jobs","candidates","searches","connections","outreachTasks","meetingRequests"].map((k,i)=><section key={k} className="hwa-metric" style={{"--hwa-c":i%3===0?"#00d4ff":i%3===1?"#13e4ba":"#af6eff"} as CSSProperties}><span>{labels[k]}</span><b>{(totals[k]??0).toLocaleString()}</b><small>{k==="searches"?"All recorded searches":k==="connections"?"Authorized connector records":"Across customer organizations"}</small></section>)}</div>
          <div className="hwa-grid-two"><section className="hwa-panel"><h2>Sourcing Activity</h2><p>Last 14 days · completed and pending runs included</p><div className="hwa-bars">{data.series.map(x=><div key={x.date} className="hwa-baritem" title={`${x.date}: ${x.count} runs`}><div className="hwa-bar" style={{height:`${Math.max(5,x.count/max*100)}%`}}/><span>{x.date.slice(5)}</span></div>)}</div></section>
            <section className="hwa-panel"><h2>Workflow Summary</h2><p>Recorded system outcomes</p><div className="hwa-summary">{["completedSearches","failedSearches","sentTasks","pendingTasks","suppressed"].map(k=><div key={k}><span>{labels[k]}</span><b>{totals[k]??0}</b></div>)}</div></section></div>
          <section className="hwa-panel"><div className="hwa-panel-title"><h2>Recent Organizations</h2><button onClick={()=>setTab("organizations")}>View all →</button></div><OrganizationTable rows={data.organizations.slice(0,6)} /></section>
        </>}
        {data && tab==="organizations" && <section className="hwa-panel"><div className="hwa-panel-title"><div><h2>Customer Organizations</h2><p>Read-only tenant metrics. Individual candidate records are not exposed here.</p></div><input aria-label="Filter organizations" placeholder="Search organizations" value={query} onChange={e=>setQuery(e.target.value)}/></div><OrganizationTable rows={filtered}/></section>}
        {data && tab==="integrations" && <div className="hwa-grid-two"><section className="hwa-panel"><h2>Connector Adoption</h2><p>Connections across customer organizations</p>{data.sourceUsage.length?data.sourceUsage.map(x=><div className="hwa-connector" key={x.source}><span>{x.source}</span><div><i style={{width:`${Math.max(3,x.count/Math.max(1,...data.sourceUsage.map(v=>v.count))*100)}%`}}/></div><b>{x.count}</b></div>):<div className="hwa-empty">No customer-owned connectors have been authorized yet.</div>}</section>
          <section className="hwa-panel"><h2>Built-in Extensions</h2><p>Available without third-party credentials</p><div className="hwa-module"><b>HireWaveSync Contact Extractor</b><span className="hwa-on">Enabled</span></div><p>Professional email, phone reference and profile URL extraction from recruiter-authorized text. No crawling, messaging or enrichment is performed automatically.</p><div className="hwa-summary"><div><span>Customer connector records</span><b>{totals.connections??0}</b></div></div></section></div>}
        {data && tab==="audit" && <section className="hwa-panel"><h2>Platform Activity</h2><p>Latest 50 administrative-level event summaries. Personal information is not included.</p><div className="hwa-tablewrap"><table><thead><tr><th>Time</th><th>Organization</th><th>Event</th></tr></thead><tbody>{data.recentActivity.map(a=><tr key={a.id}><td>{dateTime(a.createdAt)}</td><td>{tenantLookup.get(a.orgId)||"Unknown"}</td><td>{a.action.replace(/[._]/g," ")}</td></tr>)}{!data.recentActivity.length&&<tr><td colSpan={3}>No activity has been recorded.</td></tr>}</tbody></table></div></section>}
        {data && tab==="system" && <div className="hwa-grid-two"><section className="hwa-panel"><h2>Operational Configuration</h2><p>Current server-reported settings</p><div className="hwa-systemrows">{Object.entries(data.system).filter(([k])=>k!=="contactExtractor").map(([key,value])=><div key={key}><span>{key.replace(/([A-Z])/g," $1").replace(/^./,v=>v.toUpperCase())}</span><b>{typeof value==="boolean"?(value?"Enabled":"Disabled"):String(value)}</b></div>)}</div></section><section className="hwa-panel"><h2>Data & Security</h2><p>Before taking this installation public</p><div className="hwa-notice">Local JSON storage is not a production-grade multi-tenant database. Move to PostgreSQL, configure backups, use strong admin credentials and add MFA before processing real client data.</div><div className="hwa-systemrows"><div><span>Built-in extractor</span><b>Enabled</b></div><div><span>Automatic web scraping</span><b>Disabled</b></div><div><span>Admin data access</span><b>Aggregate-only</b></div></div></section></div>}
      </div>
    </main>
  </div>;
}
function OrganizationTable({rows}:{rows:{id:string;name:string;plan:string;createdAt:string;members:number;jobs:number;candidates:number;connectors:number;searches:number}[]}){
  return <div className="hwa-tablewrap"><table><thead><tr><th>Organization</th><th>Users</th><th>Jobs</th><th>Candidates</th><th>Sources</th><th>Searches</th><th>Created</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.name}</b></td><td>{r.members}</td><td>{r.jobs}</td><td>{r.candidates}</td><td>{r.connectors}</td><td>{r.searches}</td><td>{new Date(r.createdAt).toLocaleDateString()}</td></tr>)}{rows.length===0&&<tr><td colSpan={7}>No organizations to display.</td></tr>}</tbody></table></div>;
}
