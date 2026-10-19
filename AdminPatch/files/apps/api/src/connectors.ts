import type { Candidate, Connector, JobSpec, PluginManifest } from "@hirewave/shared";
import { extractSkills, makeFieldEvidence } from "@hirewave/shared";
import { env } from "./env.js";

const now = () => new Date().toISOString();

function mk(name: string, title: string, location: string, years: number, skills: string[], company: string): Candidate {
  return {
    id: "", name, title, headline: `${title} at ${company}`, company, location,
    yearsExperience: years, skills,
    links: [`https://example.invalid/demo/${name.toLowerCase().replace(/\s+/g, "-")}`],
    sources: [{ plugin: "demo", fetchedAt: now() }],
    summary: "DEMO DATA — fictional person for testing.",
  };
}
const DEMO: Candidate[] = [
  mk("Demo Asha Verma", "Senior Full Stack Developer", "Austin, TX", 7, ["react", "typescript", "node.js", "postgres", "aws"], "Acme Demo"),
  mk("Demo Ben Carter", "Software Engineer", "Seattle, WA", 4, ["react", "typescript", "node.js", "sql"], "Northwind Demo"),
  mk("Demo Chloe Dubois", "Frontend Developer", "New York, NY", 5, ["react", "javascript", "css", "typescript"], "Globex Demo"),
  mk("Demo Dev Patel", "Staff Engineer", "San Francisco, CA", 10, ["react", "typescript", "postgres", "aws", "kubernetes", "docker"], "Initech Demo"),
  mk("Demo Elena Rossi", "Backend Engineer", "Berlin, Germany", 6, ["python", "postgres", "docker", "aws"], "Umbrella Demo"),
  mk("Demo Farid Khan", "Junior Developer", "Toronto, Canada", 1, ["javascript", "html", "css"], "Stark Demo"),
  mk("Demo Grace Lin", "Lead Engineer", "Denver, CO", 9, ["typescript", "node.js", "postgres", "aws", "graphql"], "Wayne Demo"),
  mk("Demo Hiro Tanaka", "DevOps Engineer", "Remote, EU", 7, ["aws", "terraform", "kubernetes", "docker", "linux"], "Wonka Demo"),
];
export const demoConnector: Connector = {
  manifest: { id: "demo", name: "Demo Talent Pool", category: "Testing", tier: "free", connectorType: "C", status: "live", auth: "none", risk: "low",
    description: "Fictional candidates for trying HireWave without connecting any real site." },
  async healthCheck() { return { ok: true, detail: "Built-in demo data" }; },
  async search(_job, ctx) { return DEMO.slice(0, ctx.limit).map((c) => ({ ...c, skills: [...c.skills], links: [...c.links], sources: [...c.sources] })); },
};

export const poolConnector: Connector = {
  manifest: { id: "pool", name: "Imported Talent Pool", category: "Import", tier: "free", connectorType: "C", status: "live", auth: "none", risk: "low",
    description: "Candidates imported into this workspace from CSV." },
  async healthCheck() { return { ok: true, detail: "Workspace import pool" }; },
  async search(_job, ctx) { return ctx.pool.slice(0, ctx.limit); },
};

const LANG: Record<string, string> = { typescript: "TypeScript", javascript: "JavaScript", python: "Python", go: "Go", rust: "Rust", java: "Java", "c#": "C#", ruby: "Ruby", php: "PHP", kotlin: "Kotlin", swift: "Swift" };
async function gh(path: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "User-Agent": "hirewave", Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const resolvedToken = token || env.githubToken;
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;
  const r = await fetch("https://api.github.com" + path, { headers });
  if (!r.ok) throw new Error(`GitHub API ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json();
}
export const githubConnector: Connector = {
  manifest: { id: "github", name: "GitHub", category: "Developer", tier: "famous", connectorType: "D", status: "live", auth: "api_key", envVar: "GITHUB_TOKEN", risk: "low",
    description: "Search public GitHub developer profiles using the official API. A workspace token is optional but recommended for higher rate limits." },
  async healthCheck(ctx) {
    try { const r = await gh("/rate_limit", ctx?.credential); return { ok: true, detail: `API ready · core remaining: ${r.rate?.remaining ?? r.resources?.core?.remaining ?? "unknown"}` }; }
    catch (e) { return { ok: false, detail: (e as Error).message }; }
  },
  async search(job: JobSpec, ctx) {
    const lang = job.mustHave.map((s) => LANG[s]).find(Boolean);
    const loc = job.remote ? "" : job.location ?? "";
    const q = [lang ? `language:${lang}` : "", loc ? `location:"${loc}"` : "", "type:user", "repos:>3"].filter(Boolean).join(" ");
    const found = await gh(`/search/users?q=${encodeURIComponent(q)}&per_page=${Math.min(ctx.limit, 10)}`, ctx.credential);
    const out: Candidate[] = [];
    for (const u of found.items ?? []) {
      const [p, repos] = await Promise.all([
        gh(`/users/${u.login}`, ctx.credential),
        gh(`/users/${u.login}/repos?per_page=30&sort=pushed`, ctx.credential),
      ]);
      const langs = new Set<string>(); for (const r of repos) if (r.language) langs.add(String(r.language));
      const skills = [...new Set([...extractSkills([...langs].join(" ") + " " + (p.bio ?? "")), ...[...langs].map((l) => l.toLowerCase())])];
      const accountYears = p.created_at ? Math.max(0, Math.round((Date.now() - Date.parse(p.created_at)) / 31557600000)) : undefined;
      const fetchedAt = now();
      const publicRepoLinks = (repos as any[]).filter((r) => !r.private && typeof r.html_url === "string")
        .slice(0, 10).map((r) => r.html_url).join("; ");
      const source = { plugin: "github", url: p.html_url, fetchedAt, providerUpdatedAt: p.updated_at || undefined };
      const candidate: Candidate = {
        id: "", name: p.name || p.login, headline: p.bio || undefined,
        company: p.company?.replace(/^@/, "") || undefined,
        location: p.location || undefined, skills, email: p.email || undefined,
        links: [p.html_url, p.blog].filter((l): l is string => typeof l === "string" && /^https?:\/\//i.test(l)),
        sources: [source],
        summary: `${p.public_repos} public repos, ${p.followers} followers${accountYears != null ? `, GitHub account age ~${accountYears} years` : ""}. Account age is not treated as work experience.`,
      };
      candidate.profileFields = makeFieldEvidence(candidate, source, "api", {
        github: p.html_url, portfolio: typeof p.blog === "string" && /^https?:\/\//i.test(p.blog) ? p.blog : undefined,
        repositories: publicRepoLinks,
      });
      out.push(candidate);
    }
    return out;
  },
};

const planned = (id: string, name: string, category: string, tier: "famous" | "extra", connectorType: "A" | "B" | "D", auth: PluginManifest["auth"], risk: "low" | "medium", description: string): PluginManifest =>
  ({ id, name, category, tier, connectorType, status: "planned", auth, risk, description });

export const hirewavesyncConnector: Connector = {
  manifest:{id:"hirewavesync",name:"HireWaveSync Contact Extractor",category:"Built-in tools",tier:"free",connectorType:"C",status:"live",auth:"none",risk:"low",
    description:"Automatically enabled. Extracts professional contact references from text you are authorized to process. No page crawling or automatic outreach."},
  async healthCheck(){return {ok:true,detail:"Built-in text extraction ready"};},
  async search(){return [];},
};
export const LIVE: Connector[] = [demoConnector, poolConnector, githubConnector, hirewavesyncConnector];
export const PLANNED: PluginManifest[] = [
  planned("linkedin", "LinkedIn", "Professional network", "famous", "B", "extension", "medium", "Planned Browser Assist connector; deployment must follow platform terms and applicable permissions."),
  planned("naukri", "Naukri", "Job board (India)", "famous", "B", "extension", "medium", "Planned Browser Assist or approved partner integration."),
  planned("indeed", "Indeed", "Job board", "famous", "B", "extension", "medium", "Planned Browser Assist or approved partner integration."),
  planned("glassdoor", "Glassdoor", "Job board", "famous", "B", "extension", "medium", "Planned Browser Assist connector."),
  planned("greenhouse", "Greenhouse", "ATS", "extra", "A", "api_key", "low", "Planned official customer-authorized API connector."),
  planned("lever", "Lever", "ATS", "extra", "A", "api_key", "low", "Planned official customer-authorized API connector."),
  planned("workable", "Workable", "ATS", "extra", "A", "api_key", "low", "Planned official customer-authorized API connector."),
  planned("stackoverflow", "Stack Overflow", "Developer", "extra", "D", "none", "low", "Planned public-data connector; verify current API and terms before launch."),
];
export const catalog = (): PluginManifest[] => [...LIVE.map((c) => c.manifest), ...PLANNED];
export const getConnector = (id: string) => LIVE.find((c) => c.manifest.id === id);
export const getManifest = (id: string) => catalog().find((m) => m.id === id);
