import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";

const plugins = ["LinkedIn", "Naukri", "Indeed", "GitHub", "Greenhouse", "Lever", "Workable", "Glassdoor"];
const steps = [
  { n: 1, t: "Paste a job", d: "HireWave extracts must-have skills, years, seniority, location and salary from the job description." },
  { n: 2, t: "Connect your sites", d: "Connect live supported sources today and add approved connectors as they become available. Passwords are not stored." },
  { n: 3, t: "Get a ranked slate", d: "Connected sources are searched, duplicates are merged, and candidates are ranked with a visible rubric." },
];

export default function Landing() {
  return (
    <div className="bg-aurora min-h-screen text-teal-50">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-teal-600 shadow-glow" /><span className="font-semibold">HireWave</span></div>
        <nav className="flex items-center gap-3">
          <a href="#how" className="text-sm text-teal-200/80 hover:text-white">How it works</a>
          <a href="#pricing" className="text-sm text-teal-200/80 hover:text-white">Pricing</a>
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/login?mode=signup"><Button>Get started free</Button></Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-800 bg-teal-900/40 px-3 py-1 text-xs text-teal-300 float">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Bring-your-own-account recruiting
        </div>
        <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight">
          The brain and cockpit <br /> <span className="bg-gradient-to-r from-accent to-teal-400 bg-clip-text text-transparent">for your hiring accounts</span>
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-teal-200/80">
          Paste a job, connect the sites you already pay for, and get a ranked, explainable slate — without giving us a single password.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/login?mode=signup"><Button className="!px-5 !py-2.5">Start free trial</Button></Link>
          <Link to="/login"><Button variant="ghost" className="!px-5 !py-2.5">Sign in</Button></Link>
        </div>

        <div className="mt-16 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          </div>
          <div className="relative flex flex-wrap justify-center gap-2">
            {plugins.map((p, i) => (
              <span key={p} className={`rounded-full border border-teal-800 bg-ink-900/70 px-3 py-1.5 text-xs text-teal-200 backdrop-blur ${i % 2 ? "float-slow" : "float"}`}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-semibold text-center">How it works</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <Card key={s.n} className="!bg-ink-900/60">
              <div className="text-xs text-accent">Step {s.n}</div>
              <div className="mt-2 text-lg font-semibold">{s.t}</div>
              <p className="mt-2 text-sm text-teal-200/70">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-semibold text-center">Simple, usage-based pricing</h2>
        <p className="mt-2 text-center text-teal-300/80">Your site subscriptions stay yours. We only charge for our brain.</p>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { name: "Starter", price: "$29", sub: "1 site · 30 searches", perks: ["Ranked slate", "CSV export"] },
            { name: "Growth", price: "$59", sub: "2 famous sites · 100 searches", perks: ["Ranked slate", "Outreach drafts", "CSV export"], hi: true },
            { name: "Pro", price: "$119", sub: "All famous sites · 300 searches", perks: ["Analytics", "Outreach drafts", "CSV export"] },
          ].map((p) => (
            <Card key={p.name} className={p.hi ? "!border-accent/60 !bg-ink-900/80 shadow-glow" : ""}>
              <div className="flex items-baseline justify-between"><div className="text-sm text-teal-300">{p.name}</div>{p.hi && <span className="text-xs text-accent">Popular</span>}</div>
              <div className="mt-2 text-3xl font-bold">{p.price}<span className="text-sm font-normal text-teal-400">/mo</span></div>
              <div className="text-xs text-teal-400/70 mt-1">{p.sub}</div>
              <ul className="mt-4 space-y-1 text-sm text-teal-200/80">{p.perks.map((x) => <li key={x}>• {x}</li>)}</ul>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-teal-900/60 py-6 text-center text-xs text-teal-500/60">
        HireWave · Bring your own account · No passwords stored · Explainable ranking
      </footer>
    </div>
  );
}
