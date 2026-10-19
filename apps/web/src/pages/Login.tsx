import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button, Card } from "../components/ui";

export default function Login() {
  const [sp] = useSearchParams();
  const signupMode = sp.get("mode") === "signup";
  const [mode, setMode] = useState<"login" | "signup">(signupMode ? "signup" : "login");
  const [form, setForm] = useState({ email: "", password: "", name: "", orgName: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setAuth } = useAuth();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = mode === "login" ? await api.login({ email: form.email, password: form.password })
        : await api.signup({ email: form.email, password: form.password, name: form.name, orgName: form.orgName });
      setAuth(r.token, r.user, r.org);
      nav(r.user.role === "admin" ? "/admin" : "/app");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="bg-aurora min-h-screen grid md:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-teal-600 shadow-glow" /><span className="font-semibold">HireWave</span></Link>
          <h1 className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
          <p className="mt-1 text-sm text-teal-300/70">{mode === "login" ? "Sign in to continue sourcing." : "One account, one org, unlimited hiring sites (BYOA)."}</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <>
                <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-teal-800 bg-ink-900/60 px-3 py-2 outline-none focus:border-accent" />
                <input required placeholder="Company / team name" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} className="w-full rounded-lg border border-teal-800 bg-ink-900/60 px-3 py-2 outline-none focus:border-accent" />
              </>
            )}
            <input required type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-teal-800 bg-ink-900/60 px-3 py-2 outline-none focus:border-accent" />
            <input required type="password" placeholder="Password (8+ chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-teal-800 bg-ink-900/60 px-3 py-2 outline-none focus:border-accent" />
            {err && <div className="text-sm text-rose-400">{err}</div>}
            <Button type="submit" disabled={busy} className="w-full !py-2.5">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
          </form>
          <div className="mt-4 text-sm text-teal-300/70">
            {mode === "login" ? "New here?" : "Have an account?"}{" "}
            <button className="text-accent hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
      {/* Right: 3D-ish parallax hub */}
      <div className="hidden md:flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="relative">
          {["LinkedIn", "Naukri", "GitHub", "Indeed", "Lever", "Greenhouse", "Glassdoor", "Workable"].map((p, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = 130 + (i % 2) * 40;
            return (
              <div key={p} className={`absolute rounded-xl border border-teal-800 bg-ink-900/80 px-3 py-1.5 text-xs text-teal-200 backdrop-blur ${i % 2 ? "float-slow" : "float"}`}
                style={{ left: Math.cos(angle) * r, top: Math.sin(angle) * r, transform: "translate(-50%,-50%)" }}>
                {p}
              </div>
            );
          })}
          <Card className="relative z-10 !bg-ink-900/90 shadow-glow border-accent/40">
            <div className="text-xs text-teal-400">Live slate</div>
            <div className="mt-2 font-semibold">Ranked candidates</div>
            <div className="mt-3 space-y-1 text-xs text-teal-200/70">
              <div className="flex justify-between"><span>1. Senior Engineer</span><span className="text-accent">92</span></div>
              <div className="flex justify-between"><span>2. Full Stack Dev</span><span className="text-accent">87</span></div>
              <div className="flex justify-between"><span>3. Backend Eng</span><span className="text-teal-300">74</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
