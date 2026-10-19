import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HireIcon } from "./HireIcon";
import "./guided-tour.css";

type Step = {target:string;title:string;body:string;path?:string;tip?:string};
const steps:Step[] = [
  {target:"#hw-brand",title:"Welcome to HireWave",body:"This is your recruitment workspace. This guided tour will introduce each area using the real interface."},
  {target:"#hw-nav-dashboard",title:"Dashboard overview",body:"Return here for jobs, candidate totals, source distribution and activity. Figures reflect your workspace data."},
  {target:"#hw-metrics",title:"Your recruitment metrics",body:"These cards summarize active roles, candidate profiles, qualified matches, and interview requests."},
  {target:"#hw-nav-jobs",title:"Manage job openings",body:"Use Jobs to review hiring roles and the candidate slate for each position.",path:"/app/jobs"},
  {target:"#hw-create-job",title:"Create a new job",body:"Select this button to enter a job description, required skills, location and experience criteria.",path:"/app/jobs/new"},
  {target:"#hw-nav-plugins",title:"Connect authorized sources",body:"Add supported hiring platforms with your organization’s authorized credentials or approved connections.",path:"/app/plugins"},
  {target:"#hw-nav-runs",title:"Run candidate searches",body:"Start sourcing for a job across supported and connected services. Review the results and source information.",path:"/app/runs"},
  {target:"#hw-candidate-table",title:"Review candidate profiles",body:"Search, sort and filter candidates. Open a profile to inspect documented experience, skills and source records.",path:"/app/candidates"},
  {target:"#hw-nav-automation",title:"Verify eligibility and availability",body:"Check job criteria, identify records requiring review, and confirm candidate availability before proceeding.",path:"/app/automation"},
  {target:"#hw-nav-agents",title:"Coordinate approved outreach",body:"Prepare email, SMS and calling tasks. Review permissions, recipient details and messages before sending.",path:"/app/agents"},
  {target:"#hw-nav-reports",title:"Analyze your sourcing",body:"Use Reports to review real workspace statistics and performance by connected source.",path:"/app/analytics"},
  {target:"#hw-help-button",title:"Help is always available",body:"Select Help & Tour whenever you want to repeat this walkthrough. You are ready to begin!"},
];
const jokes = [
  "Skipping already? The dashboard has barely had time to introduce itself. 😂",
  "A bold move. You may have to meet the Help button again. 😄",
  "Even our mascot needed training. One more click and you're free. 🤣",
  "Speed-running your onboarding? We respect the enthusiasm. 😎",
];
interface Rect {top:number;left:number;width:number;height:number}

export default function GuidedTour({open,onDone}:{open:boolean;onDone:()=>void}) {
  const nav=useNavigate();
  const location=useLocation();
  const [step,setStep]=useState(0);
  const [skipWarning,setSkipWarning]=useState(false);
  const [jokeIndex,setJokeIndex]=useState(0);
  const [rect,setRect]=useState<Rect|null>(null);
  const previouslyFocused=useRef<HTMLElement|null>(null);
  const cardRef=useRef<HTMLElement|null>(null);
  const current=steps[step];
  useEffect(()=>{if(open){setStep(0);setSkipWarning(false);previouslyFocused.current=document.activeElement as HTMLElement;}else previouslyFocused.current?.focus?.();},[open]);
  useLayoutEffect(()=>{
    if(!open)return;
    const measure=()=>{
      const target=document.querySelector(current.target) as HTMLElement|null;
      if(!target){setRect(null);return;}
      const b=target.getBoundingClientRect();
      setRect({left:b.left,top:b.top,width:b.width,height:b.height});
    };
    measure();
    const t=window.setTimeout(()=>{const target=document.querySelector(current.target);target?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});measure();},85);
    window.addEventListener("resize",measure);window.addEventListener("scroll",measure,true);
    return ()=>{clearTimeout(t);window.removeEventListener("resize",measure);window.removeEventListener("scroll",measure,true);};
  },[open,step,location.pathname,current.target]);
  useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();onDone();}if(e.key==="ArrowRight"){e.preventDefault();setStep(s=>Math.min(s+1,steps.length-1));setSkipWarning(false);}if(e.key==="ArrowLeft"){e.preventDefault();setStep(s=>Math.max(s-1,0));setSkipWarning(false);}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[open,onDone]);
  if(!open)return null;
  const vw=window.innerWidth,vh=window.innerHeight;
  const width=Math.min(370,vw-28);
  const preferRight=rect ? rect.left+rect.width+width+25<vw : false;
  const preferLeft=rect ? rect.left-width-22>15 : false;
  const left=rect ? preferRight?rect.left+rect.width+20:preferLeft?rect.left-width-20:Math.max(14,Math.min(vw-width-14,rect.left)) : Math.max(14,(vw-width)/2);
  const top=rect ? Math.max(75,Math.min(vh-345,preferRight||preferLeft?rect.top:rect.top+rect.height+17)) :Math.max(110,(vh-330)/2);
  const targetPoint=rect ? {x:rect.left+Math.min(rect.width*.5,Math.max(20,rect.width-12)),y:rect.top+Math.min(rect.height*.5,28)} : null;
  const arrowStart=rect ? {
    x: targetPoint!.x < left ? left+6 : targetPoint!.x > left+width ? left+width-6 : left+width*.5,
    y: targetPoint!.y < top ? top+9 : targetPoint!.y > top+270 ? top+244 : top+90,
  } : null;
  const arrowPath=rect && targetPoint && arrowStart ? `M ${arrowStart.x} ${arrowStart.y} Q ${(arrowStart.x+targetPoint.x)/2} ${(arrowStart.y+targetPoint.y)/2-35} ${targetPoint.x} ${targetPoint.y}` : "";
  const requestSkip=()=>{if(skipWarning){onDone();return;}setJokeIndex(x=>(x+1)%jokes.length);setSkipWarning(true);};
  const advance=()=>{setSkipWarning(false);if(step>=steps.length-1)onDone();else setStep(n=>n+1);};
  const jumpToFeature=()=>{if(!current.path)return;onDone();nav(current.path);};
  return <div className="hw-guide-root" role="presentation">
    {rect&&<div className="hw-guide-target" style={{left:rect.left-5,top:rect.top-5,width:rect.width+10,height:rect.height+10}} aria-hidden="true"/>}
    {rect&&<svg className="hw-guide-arrow" aria-hidden="true" width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none"><defs><marker id="hw-guide-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ff73dd"/></marker></defs><path d={arrowPath} fill="none" stroke="#ff73dd" strokeWidth="3.5" strokeLinecap="round" markerEnd="url(#hw-guide-arrowhead)"/></svg>}
    <div className="hw-guide-progress" aria-label={`Tutorial step ${step+1} of ${steps.length}`}><span>Step {step+1} of {steps.length}</span><div>{steps.map((_,i)=><button key={i} className={i===step?"active":i<step?"complete":""} onClick={()=>{setStep(i);setSkipWarning(false);}} title={`Go to step ${i+1}`} aria-label={`Tour step ${i+1}`}/>)}</div></div>
    <section ref={cardRef} className={`hw-guide-card ${skipWarning?"hw-guide-laugh":""}`} role="dialog" aria-label="HireWave guided tour" style={{left,top,width}}>
      <div className="hw-guide-card-head"><span className="hw-guide-step">{step+1}/{steps.length}</span><span>HIREWAVE PRODUCT TOUR</span><button onClick={requestSkip} aria-label="Skip tour"><HireIcon name="close" size={15}/></button></div>
      <img className="hw-guide-mascot" src={`/onboarding/mascot-${String(skipWarning?2:step%12+1).padStart(2,"0")}.webp`} alt="HireWave animated 3D-style assistant" draggable={false}/>
      <div className="hw-guide-copy"><h2>{skipWarning?"Leaving so soon? 😂":current.title}</h2><p>{skipWarning?jokes[jokeIndex]:current.body}</p>{skipWarning&&<p className="hw-guide-tears">😂 💧 😂</p>}</div>
      <div className="hw-guide-actions">{!skipWarning&&<button className="hw-guide-secondary" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Back</button>}
        {skipWarning?<><button className="hw-guide-secondary" onClick={()=>setSkipWarning(false)}>Continue tour</button><button className="hw-guide-primary" onClick={onDone}>Skip for real</button></>:
        <><button className="hw-guide-skip" onClick={requestSkip}>Skip</button><button className="hw-guide-primary" onClick={advance}>{step===steps.length-1?"Finish tour":"Next"}<HireIcon name="arrow" size={15}/></button></>}
      </div>
      {!skipWarning&&current.path&&<button className="hw-guide-open-feature" onClick={jumpToFeature}>Open this feature <HireIcon name="arrow" size={13}/></button>}
    </section>
  </div>;
}
