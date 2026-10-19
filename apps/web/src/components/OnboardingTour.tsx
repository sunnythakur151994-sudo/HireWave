import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./onboarding-tour.css";

type SceneId = "welcome" | "skip-taunt" | "skip-allowed" | "dashboard" | "platforms" | "job" | "sourcing" | "profile" | "eligibility" | "agents" | "ready" | "help";
type TourScene = { id: SceneId; number: number; heading: string; lead: string; points: string[]; destination?: string; actionLabel?: string };

const SCENES: Record<SceneId, TourScene> = {
  welcome: { id: "welcome", number: 1, heading: "Welcome to HireWave", lead: "Hiring ka pressure kam, control zyada. Chalo poora workspace explore karein! ✨", points: ["One workspace for your hiring team", "Connect your authorized recruiting accounts", "Follow every candidate from search to interview"] },
  "skip-taunt": { id: "skip-taunt", number: 2, heading: "Areee itni jaldi?! 😂", lead: "Guide skip karke baad mein 'ye feature kahan hai?' mat bolna! 😭🤣", points: ["Bas ek chhota sa tour hai, boss", "Par haan, second click par pakka jaane denge"] },
  "skip-allowed": { id: "skip-allowed", number: 3, heading: "Theek hai boss! 😎", lead: "Jao... tum officially impatient ho. Good luck! 😂", points: ["Help menu se kabhi bhi tour replay kar sakte ho", "Hum yahin hain jab zaroorat pade"] },
  dashboard: { id: "dashboard", number: 4, heading: "Ye hai tumhara Control Room.", lead: "Dashboard par hiring activity ka overview milta hai.", points: ["Active jobs aur candidates ka summary", "Connected platforms ki status", "Recent jobs aur activity", "Hiring progress ek hi jagah"], destination: "/app", actionLabel: "Open dashboard" },
  platforms: { id: "platforms", number: 5, heading: "Sab platforms yahan connect karo.", lead: "Apne authorized recruitment accounts ko Plugins section me connect karo.", points: ["Available connectors select karo", "Official credentials ya OAuth se connect karo", "Unsupported platforms ke liye approved access zaroori hai", "Customer-owned CSV bhi import kar sakte ho"], destination: "/app/plugins", actionLabel: "Open plugins" },
  job: { id: "job", number: 6, heading: "Hiring start karne ke liye job banao.", lead: "Role ki requirements set karo, phir sourcing start karo.", points: ["Job title aur required skills", "Experience, location aur work mode", "Salary aur notice-period preferences", "Must-have requirements clearly define karo"], destination: "/app/jobs/new", actionLabel: "Create a job" },
  sourcing: { id: "sourcing", number: 7, heading: "Ab system candidates dhoondhega.", lead: "Connected aur permitted sources se job-relevant results collect honge.", points: ["Job select karke sourcing run start karo", "Available connected sources me search", "Source aur freshness information dekho", "Duplicates ko safer matching se handle karo"], destination: "/app/runs", actionLabel: "Open sourcing runs" },
  profile: { id: "profile", number: 8, heading: "Har candidate ka unified profile.", lead: "Alag platforms par available professional info ek jagah — source ke saath.", points: ["Skills, work experience aur education", "Projects, links aur resume details", "Notice period, contact preferences", "Conflicting values aur source history preserve hoti hai"], destination: "/app/candidates", actionLabel: "View candidates" },
  eligibility: { id: "eligibility", number: 9, heading: "Sirf relevant candidates shortlist honge.", lead: "Requirements evaluate honge; missing data review queue me rahega.", points: ["Eligible / needs review / not eligible", "Requirements aur available evidence compare karo", "Availability candidate se confirm karo", "Hiring ka final decision HR ka rahega"], destination: "/app/automation", actionLabel: "Open automation" },
  agents: { id: "agents", number: 10, heading: "Ab follow-up ka kaam agents sambhalen.", lead: "Approved outreach: email, SMS aur scripted calls.", points: ["Email aur SMS messages review/edit karo", "Calling Agent ka scripted message dekho", "Consent, timing aur daily limits follow karo", "Actual sending ke liye provider setup required hai"], destination: "/app/agents", actionLabel: "Open outreach agents" },
  ready: { id: "ready", number: 11, heading: "Bas itna hi! 🎉", lead: "Ab tum hiring start karne ke liye ready ho!", points: ["Platforms connect karo", "Job banao aur search run karo", "Profiles aur eligibility review karo", "Approved outreach aur next steps manage karo"] },
  help: { id: "help", number: 12, heading: "Kabhi bhi phir se dekh sakte ho.", lead: "Sidebar ke Help & Tour button se ye guide dobara kholo.", points: ["Product Tour kabhi bhi replay karo", "Training ke liye teammates ko dikhao", "Guides aur onboarding tips phir se dekho", "Ab HireWave explore karo! 😄"] },
};

// The skip joke and goodbye are deliberately visual scenes 2 and 3. Normal Next
// navigation moves through 1 and 4–12, while Skip reveals scenes 2–3.
const MAIN_SCENES: SceneId[] = ["welcome", "dashboard", "platforms", "job", "sourcing", "profile", "eligibility", "agents", "ready", "help"];
const JOKES = [
  "Itna confidence? Recruiter ho ya speedrunner? 😂",
  "Guide chhodega, phir Settings mein treasure hunt karega! 😭🤣",
  "Aapki speed dekh ke Next button bhi sharma gaya! 😂",
  "Theek hai, ek aur click aur tum free — pakka! 😎",
];

function Preview({ scene }: { scene: SceneId }) {
  if (scene === "dashboard") return <div className="hw-mock"><div className="hw-mock-head">◉ HireWave <span>Dashboard</span></div><div className="hw-mock-stats"><div><small>ACTIVE JOBS</small><b>12</b></div><div><small>CANDIDATES</small><b>1,248</b></div></div><small>Example dashboard — illustrative values</small><div className="hw-mock-list">✦ Recent activity<div>✓ New application received</div><div>✓ Candidate review updated</div><div>✓ Interview request created</div></div></div>;
  if (scene === "platforms") return <div className="hw-mock"><div className="hw-mock-head">◈ Connect Platforms <span>Plugins</span></div><div className="hw-platform-grid"><div>◈<span>Greenhouse</span><em>Connect</em></div><div>◆<span>Lever</span><em>Connect</em></div><div>◉<span>Workable</span><em>Connect</em></div><div>⌘<span>GitHub</span><em>Connect</em></div></div><small>Access depends on connector availability & authorization.</small></div>;
  if (scene === "job") return <div className="hw-mock"><div className="hw-mock-head">Create New Job <span>Job intake</span></div><label>Job title</label><div className="hw-field">Senior Full Stack Developer</div><label>Required skills</label><div className="hw-field">React · Node.js · TypeScript</div><label>Experience</label><div className="hw-field">5+ years</div><label>Location</label><div className="hw-field">Bengaluru / Remote</div><div className="hw-mock-action">Create job →</div></div>;
  if (scene === "sourcing") return <div className="hw-mock"><div className="hw-mock-head">Sourcing run <span>Example</span></div><div className="hw-source-line">◉ GitHub <span>Authorized</span></div><div className="hw-source-line">◈ Talent pool <span>Connected</span></div><div className="hw-source-line">◇ Partner API <span>Approval needed</span></div><div className="hw-loader"><div /></div><small>Results only from supported, connected sources.</small></div>;
  if (scene === "profile") return <div className="hw-mock"><div className="hw-mock-head">Unified Candidate Profile <span>Sample</span></div><div className="hw-person"><span>RS</span><div><b>Rahul Sharma</b><small>Full Stack Developer · Sample profile</small></div></div><div className="hw-tags"><span>React</span><span>Node.js</span><span>TypeScript</span><span>5+ years</span></div><div className="hw-source-line">Source history <span>2 records</span></div><div className="hw-source-line">Availability <span>Not confirmed</span></div></div>;
  if (scene === "eligibility") return <div className="hw-mock"><div className="hw-mock-head">Eligibility & Availability <span>Sample</span></div><div className="hw-eligibility"><span>Rahul S.</span><strong className="hw-ok">Eligible*</strong></div><div className="hw-eligibility"><span>Priya M.</span><strong className="hw-review">Needs review</strong></div><div className="hw-eligibility"><span>Aman V.</span><strong className="hw-no">Not eligible*</strong></div><small>*Illustration only. HR reviews job evidence and makes the final hiring decision.</small></div>;
  if (scene === "agents") return <div className="hw-mock"><div className="hw-mock-head">Outreach Agents <span>Approval required</span></div><div className="hw-agent-row"><span>✉️</span><div><b>Email Agent</b><small>Draft → review → send</small></div></div><div className="hw-agent-row"><span>💬</span><div><b>SMS Agent</b><small>Approved phone outreach</small></div></div><div className="hw-agent-row"><span>📞</span><div><b>Calling Agent</b><small>Scripted provider calls</small></div></div><small>Providers and contact permissions required.</small></div>;
  if (scene === "help") return <div className="hw-mock"><div className="hw-mock-head">HireWave Help <span>Always here</span></div><div className="hw-source-line">✨ Take product tour <span>Replay</span></div><div className="hw-source-line">⌨ Quick start <span>Guide</span></div><div className="hw-source-line">📖 Read documentation <span>Open</span></div><div className="hw-source-line">☺ You got this! <span>✨</span></div></div>;
  if (scene === "ready") return <div className="hw-mock hw-mock-ready"><div className="hw-ready-icon">✓</div><b>You're ready to hire!</b><span>Connect → Create → Search → Review → Contact</span><div className="hw-mock-action">Go to Dashboard →</div></div>;
  if (scene === "skip-taunt") return <div className="hw-mock hw-mock-joke"><span className="hw-joke-emoji">😂</span><b>Skip attempt detected!</b><span>One more click and the tour closes.</span></div>;
  if (scene === "skip-allowed") return <div className="hw-mock hw-mock-joke"><span className="hw-joke-emoji">😎</span><b>Tour skipped!</b><span>See you from Help & Tour.</span></div>;
  return <div className="hw-mock hw-mock-welcome"><div className="hw-mock-logo">◈</div><b>Welcome to <span>HireWave</span></b><p>One workspace. Better hiring flow.</p><div>Job → Source → Review → Outreach</div></div>;
}

export function OnboardingTour({ open, onDone }: { open: boolean; onDone: () => void }) {
  const navigate = useNavigate();
  const [sceneId, setSceneId] = useState<SceneId>("welcome");
  const [jokeIndex, setJokeIndex] = useState(0);
  const skipOrigin = useRef<SceneId>("welcome");
  const dialog = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const scene = SCENES[sceneId];

  useEffect(() => {
    if (!open) return;
    setSceneId("welcome");
    setJokeIndex(0);
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => dialog.current?.focus());
    return () => { cancelAnimationFrame(focusFrame); document.body.style.overflow = prevOverflow; lastFocus.current?.focus(); };
  }, [open]);

  useEffect(() => {
    if (!open || sceneId !== "skip-allowed") return;
    const t = window.setTimeout(onDone, 1200);
    return () => window.clearTimeout(t);
  }, [open, sceneId, onDone]);

  if (!open) return null;
  const position = MAIN_SCENES.indexOf(sceneId);
  const currentPosition = position >= 0 ? position : MAIN_SCENES.indexOf(skipOrigin.current);
  const atLast = sceneId === "help";

  const goNext = () => {
    const nextIndex = MAIN_SCENES.indexOf(sceneId) + 1;
    if (nextIndex >= MAIN_SCENES.length) onDone();
    else if (nextIndex > 0) setSceneId(MAIN_SCENES[nextIndex]);
  };
  const goBack = () => {
    const currentIndex = MAIN_SCENES.indexOf(sceneId);
    if (currentIndex > 0) setSceneId(MAIN_SCENES[currentIndex - 1]);
  };
  const trySkip = () => {
    if (sceneId === "skip-taunt") { setSceneId("skip-allowed"); return; }
    if (sceneId === "skip-allowed") { onDone(); return; }
    skipOrigin.current = sceneId;
    setJokeIndex((n) => (n + 1) % JOKES.length);
    setSceneId("skip-taunt");
  };
  const returnToTour = () => setSceneId(skipOrigin.current);
  const openSection = () => { if (scene.destination) navigate(scene.destination); onDone(); };
  const sceneImage = `/onboarding/mascot-${String(scene.number).padStart(2, "0")}.webp`;

  return (
    <div className="hw-tour-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) dialog.current?.focus(); }}>
      <div className="hw-tour-shell" role="dialog" aria-modal="true" aria-label="HireWave product tour" tabIndex={-1} ref={dialog}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onDone(); } }}>
        <div className="hw-tour-light hw-tour-light-one" /><div className="hw-tour-light hw-tour-light-two" />
        <div className="hw-tour-top">
          <div className="hw-tour-brand"><span className="hw-tour-brandmark">✦</span><span>HireWave <small>3D PRODUCT TOUR</small></span></div>
          <div className="hw-tour-step-label">SCENE {String(scene.number).padStart(2, "0")} <span>/ 12</span></div>
          <button className="hw-tour-close" type="button" onClick={trySkip} aria-label="Skip product tour">×</button>
        </div>
        <div className="hw-tour-content" key={sceneId}>
          <div className="hw-tour-mascot-stage" aria-hidden="true"
            onMouseMove={(e) => {
              const b = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - b.left) / b.width - .5) * 13;
              const y = ((e.clientY - b.top) / b.height - .5) * -10;
              e.currentTarget.style.setProperty("--hover-y", `${x.toFixed(2)}deg`);
              e.currentTarget.style.setProperty("--hover-x", `${y.toFixed(2)}deg`);
            }}
            onMouseLeave={(e) => {e.currentTarget.style.setProperty("--hover-y","0deg");e.currentTarget.style.setProperty("--hover-x","0deg");}}>
            <div className="hw-tour-orbit hw-tour-orbit-a" /><div className="hw-tour-orbit hw-tour-orbit-b" />
            <div className="hw-tour-mascot-glow" />
            <div className="hw-tour-mascot-card"><img src={sceneImage} alt="" draggable={false} /></div>
            <div className="hw-tour-stand" />
            <span className="hw-tour-sparkle hw-tour-sparkle-a">✦</span><span className="hw-tour-sparkle hw-tour-sparkle-b">✧</span>
            {(sceneId === "skip-taunt") && <span className="hw-tour-tears">💦 😂</span>}
            {(sceneId === "ready") && <span className="hw-tour-confetti">🎉 ✨ 🎊</span>}
          </div>
          <div className="hw-tour-panel">
            <div className="hw-tour-eyebrow"><span className="hw-tour-scenenum">{scene.number}</span>{sceneId === "skip-taunt" ? "FUNNY SKIP REACTION" : sceneId === "skip-allowed" ? "SKIP CONFIRMED" : "YOUR HIREWAVE GUIDE"}</div>
            <h2>{scene.heading}</h2>
            <p className="hw-tour-lead">{scene.lead}</p>
            {sceneId === "skip-taunt" && <p className="hw-tour-roast">{JOKES[jokeIndex]}</p>}
            {sceneId !== "skip-allowed" && <ul className="hw-tour-points">{scene.points.map((item) => <li key={item}><span aria-hidden="true">✓</span><span>{item}</span></li>)}</ul>}
            <div className="hw-tour-sample"><Preview scene={sceneId} /></div>
          </div>
        </div>
        <div className="hw-tour-bottom">
          <div className="hw-tour-dots" aria-label="Tour progress">{MAIN_SCENES.map((id, index) => (
            <button type="button" key={id} className={`hw-tour-dot ${index === currentPosition ? "active" : ""} ${index < currentPosition ? "visited" : ""}`} title={SCENES[id].heading} aria-label={`Go to tour step ${index+1}: ${SCENES[id].heading}`} aria-current={index === currentPosition ? "step" : undefined} onClick={() => setSceneId(id)} />
          ))}</div>
          <div className="hw-tour-actions">
            {sceneId === "skip-taunt" ? <><button className="hw-tour-button hw-tour-outline" onClick={returnToTour}>Okay, dikhao!</button><button className="hw-tour-button hw-tour-primary" onClick={trySkip}>Skip for real 😂</button></>
              : sceneId === "skip-allowed" ? <button className="hw-tour-button hw-tour-primary" onClick={onDone}>See you later 😎</button>
              : <>
                {sceneId !== "welcome" && <button className="hw-tour-button hw-tour-outline" onClick={goBack}>← Back</button>}
                {sceneId !== "welcome" && scene.destination && <button className="hw-tour-button hw-tour-outline hw-tour-section-btn" onClick={openSection}>{scene.actionLabel ?? "Open page"} ↗</button>}
                {sceneId === "welcome" && <button className="hw-tour-button hw-tour-outline" onClick={trySkip}>Skip</button>}
                <button className="hw-tour-button hw-tour-primary" onClick={atLast ? onDone : goNext}>{sceneId === "welcome" ? "Start Tour →" : atLast ? "Go to Dashboard ✓" : "Next →"}</button>
                {sceneId !== "welcome" && <button className="hw-tour-skip-link" onClick={trySkip}>Skip tour</button>}
              </>}
          </div>
        </div>
        <div className="hw-tour-footer-note">Interactive product guide · Sample previews are illustrations, not live recruitment results · Press Esc to exit</div>
      </div>
    </div>
  );
}

export default OnboardingTour;
