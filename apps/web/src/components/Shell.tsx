import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { HireIcon, type HireIconName } from "./HireIcon";
import GuidedTour from "./GuidedTour";
import "./hirewave-dashboard.css";

type NavItem = {to: string; label: string; icon: HireIconName; id: string; end?: boolean};
const navigation: NavItem[] = [
  { to:"/app",label:"Dashboard",icon:"dashboard",id:"dashboard",end:true },
  { to:"/app/jobs",label:"Jobs",icon:"jobs",id:"jobs" },
  { to:"/app/candidates",label:"Candidates",icon:"candidates",id:"candidates" },
  { to:"/app/plugins",label:"Plugins",icon:"plugins",id:"plugins" },
  { to:"/app/runs",label:"Sourcing Runs",icon:"search",id:"runs" },
  { to:"/app/automation",label:"Automation",icon:"shield",id:"automation" },
  { to:"/app/agents",label:"Outreach Agents",icon:"phone",id:"agents" },
  { to:"/app/outreach",label:"Outreach",icon:"outreach",id:"outreach" },
  { to:"/app/analytics",label:"Reports",icon:"reports",id:"reports" },
];

export default function Shell() {
  const { user, org, logout } = useAuth();
  const nav = useNavigate();
  const [tourOpen, setTourOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [popover, setPopover] = useState<"notifications" | "profile" | null>(null);
  const [softTheme, setSoftTheme] = useState(() => localStorage.getItem("hirewave:soft-theme") === "yes");
  const inputRef = useRef<HTMLInputElement>(null);
  const tourKey = useMemo(() => user?.id && org?.id ? `hirewave:guided:v2:${org.id}:${user.id}` : null, [user?.id, org?.id]);

  useEffect(() => { if (tourKey && localStorage.getItem(tourKey) !== "done") setTourOpen(true); }, [tourKey]);
  const completeTour = useCallback(() => {if (tourKey) localStorage.setItem(tourKey,"done");setTourOpen(false);},[tourKey]);
  useEffect(() => {localStorage.setItem("hirewave:soft-theme",softTheme ? "yes" : "no");},[softTheme]);
  useEffect(() => {
    const onKey = (e:KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {e.preventDefault();setSearchOpen(true);}
      if(e.key === "Escape") {setSearchOpen(false);setPopover(null);setMobileOpen(false);}
    };
    window.addEventListener("keydown",onKey);
    return () => window.removeEventListener("keydown",onKey);
  },[]);
  useEffect(() => { if(searchOpen) inputRef.current?.focus();},[searchOpen]);

  const usage = useQuery({ queryKey:["usage"], queryFn:api.usage });
  const jobs = useQuery({ queryKey:["jobs"], queryFn:api.jobs });
  const candidates = useQuery({ queryKey:["candidates"], queryFn:api.candidates });
  const audits = useQuery({ queryKey:["audit"], queryFn:api.audit, enabled:popover === "notifications" });
  const q=search.trim().toLowerCase();
  const searchResults = q ? [
    ...(jobs.data?.jobs ?? []).filter(j => (j.title + " " + j.mustHave.join(" ")).toLowerCase().includes(q)).slice(0,4).map(j => ({label:j.title,sub:"Job",to:`/app/jobs/${j.id}/slate`})),
    ...(candidates.data?.candidates ?? []).filter(c => (c.name + " " + (c.title ?? "") + " " + c.skills.join(" ")).toLowerCase().includes(q)).slice(0,6).map(c=>({label:c.name,sub:c.title || "Candidate",to:`/app/candidates/${c.id}`})),
  ] : [];
  const initial = (user?.name || "U").trim().charAt(0).toUpperCase();
  const userIsPaid = usage.data?.planId && !["trial","free"].includes(usage.data.planId);

  return <div className={`hw-application ${softTheme ? "hw-soft-theme" : ""}`}>
    <button className="hw-mobile-menu" aria-label="Open navigation" onClick={()=>setMobileOpen(true)}><HireIcon name="menu"/></button>
    {mobileOpen && <button className="hw-mobile-backdrop" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`hw-sidebar ${mobileOpen ? "hw-sidebar-open" : ""}`}>
      <Link to="/app" className="hw-brand" onClick={()=>setMobileOpen(false)} id="hw-brand">
        <HireIcon name="activity" size={38}/><span>Hire<span>Wave</span></span>
      </Link>
      <nav className="hw-side-menu" aria-label="Main navigation">
        {navigation.map(item=><NavLink id={`hw-nav-${item.id}`} key={item.to} to={item.to} end={item.end} onClick={()=>setMobileOpen(false)}
          className={({isActive})=>`hw-nav-link ${isActive ? "hw-nav-active" : ""}`}>
          <HireIcon name={item.icon} size={20}/><span>{item.label}</span>{item.id==="agents" && <span className="hw-nav-dot"/>}
        </NavLink>)}
      </nav>
      <div className="hw-side-bottom">
        {!userIsPaid && <div className="hw-upgrade"><div className="hw-upgrade-title"><HireIcon name="crown" size={17}/> Upgrade your workspace</div><p>Unlock more searches, collaboration, and outreach capacity.</p><Link to="/app/billing" className="hw-upgrade-button">Explore plans <HireIcon name="arrow" size={14}/></Link></div>}
        <button id="hw-help-button" className="hw-bottom-link" onClick={()=>{setMobileOpen(false);setTourOpen(true);}}><HireIcon name="help"/> Help & Tour <span className="hw-red-dot"/></button>
        <Link className="hw-bottom-link" to="/app/settings" onClick={()=>setMobileOpen(false)}><HireIcon name="settings"/> Settings</Link>
        <Link className="hw-bottom-link" to="/app/privacy" onClick={()=>setMobileOpen(false)}><HireIcon name="shield"/> Privacy & Audit</Link>
      </div>
    </aside>

    <div className="hw-workspace">
      <header className="hw-topbar">
        <div className="hw-topbar-label">{org?.name || "Recruitment workspace"}</div>
        <button type="button" className="hw-top-search" onClick={()=>setSearchOpen(true)}><HireIcon name="search" size={18}/><span>Search candidates, jobs, or skills...</span><kbd>Ctrl K</kbd></button>
        <div className="hw-top-actions">
          <div className="hw-pop-anchor">
            <button title="Notifications" aria-label="Notifications" className="hw-header-button" onClick={()=>setPopover(popover==="notifications"?null:"notifications")}><HireIcon name="bell" size={20}/></button>
            {popover==="notifications" && <div className="hw-popover"><div className="hw-pop-title">Recent activity</div>{(audits.data?.audit ?? []).slice(-5).reverse().map((a)=><div className="hw-pop-line" key={a.id}><b>{a.action.replace(/[._]/g," ")}</b><small>{new Date(a.createdAt).toLocaleString()}</small></div>)}{!audits.data?.audit?.length && <p className="hw-muted">No activity recorded yet.</p>}<Link className="hw-pop-action" onClick={()=>setPopover(null)} to="/app/privacy">Open audit history →</Link></div>}
          </div>
          <button title="Toggle low-glare theme" aria-label="Toggle low-glare theme" className="hw-header-button" onClick={()=>setSoftTheme(!softTheme)}><HireIcon name={softTheme ? "sun":"moon"} size={20}/></button>
          <div className="hw-pop-anchor">
            <button aria-label="Open account menu" className="hw-account" onClick={()=>setPopover(popover==="profile"?null:"profile")}><span className="hw-avatar">{initial}</span><span className="hw-account-name">{user?.name || "Recruiter"}<small>{org?.name || "Workspace"}</small></span><HireIcon name="chevron" size={13}/></button>
            {popover==="profile" && <div className="hw-popover hw-profile-menu"><div className="hw-pop-title">{user?.name}<small>{user?.email}</small></div><Link onClick={()=>setPopover(null)} to="/app/settings">Account settings</Link><Link onClick={()=>setPopover(null)} to="/app/billing">Billing & plans</Link><button onClick={()=>{setPopover(null);logout();nav("/");}}><HireIcon name="logout" size={15}/> Sign out</button></div>}
          </div>
        </div>
      </header>
      <main className="hw-main"><Outlet/></main>
    </div>
    {searchOpen && <div className="hw-search-shade" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSearchOpen(false);}}>
      <div className="hw-search-dialog" role="dialog" aria-modal="true" aria-label="Search HireWave"><div className="hw-search-inputrow"><HireIcon name="search" size={21}/><input ref={inputRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs, candidates, or skills"/><button aria-label="Close search" onClick={()=>setSearchOpen(false)}><HireIcon name="close" size={19}/></button></div>
        <div className="hw-search-list">{!q ? <p>Start typing to search your workspace. Press Esc to close.</p>:searchResults.length ? searchResults.map((r,i)=><Link key={r.to+i} to={r.to} onClick={()=>{setSearchOpen(false);setSearch("");}}><HireIcon name={r.sub==="Job"?"jobs":"candidates"} size={18}/><span><b>{r.label}</b><small>{r.sub}</small></span><HireIcon name="arrow" size={15}/></Link>) : <p>No matches in your workspace.</p>}</div>
      </div>
    </div>}
    <GuidedTour open={tourOpen} onDone={completeTour}/>
  </div>;
}
