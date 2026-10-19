import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "subtle" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-accent text-ink-950 hover:bg-teal-300",
    ghost: "border border-teal-800 text-teal-100 hover:bg-teal-900/40",
    danger: "bg-rose-500/90 text-white hover:bg-rose-500",
    subtle: "bg-teal-900/40 text-teal-100 hover:bg-teal-800/60",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

export function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-teal-900/60 bg-ink-900/70 backdrop-blur p-5 ${className}`} {...rest}>{children}</div>;
}

export function Badge({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "amber" | "rose" | "slate" }) {
  const tones = { teal: "bg-teal-900/60 text-teal-200 border-teal-800", amber: "bg-amber-500/10 text-amber-300 border-amber-600/40", rose: "bg-rose-500/10 text-rose-300 border-rose-600/40", slate: "bg-slate-500/10 text-slate-300 border-slate-600/40" };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <Card className="!p-4">
      <div className="text-xs uppercase tracking-wider text-teal-400/70">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-teal-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-teal-400/60">{sub}</div>}
    </Card>
  );
}

export function Spinner() { return <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-t-accent" />; }

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return <Card className="text-center py-12"><div className="text-teal-100 font-medium">{title}</div>{hint && <div className="mt-1 text-sm text-teal-400/70">{hint}</div>}</Card>;
}
