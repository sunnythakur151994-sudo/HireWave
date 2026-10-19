import { createHash } from "node:crypto";
import { makeFieldEvidence, ensureProfileFields, combineProfileFields } from "./profile.js";
import type {
  Candidate, JobSpec, ScoredCandidate, PlanId, PluginManifest, Seniority,
} from "./types.js";

/* ---------- PLANS ---------- */
export interface Plan {
  id: PlanId; label: string; searchesPerMonth: number; seats: number;
  maxCandidatesPerRun: number; famousSlots: number;
  extraPlugins: boolean; outreach: boolean; export: boolean; usd: number; inr: number;
}
export const PLANS: Record<PlanId, Plan> = {
  trial:    { id: "trial",    label: "Free trial", searchesPerMonth: 1,    seats: 1,  maxCandidatesPerRun: 25,  famousSlots: 1,        extraPlugins: true,  outreach: false, export: false, usd: 0,   inr: 0 },
  starter:  { id: "starter",  label: "Starter",    searchesPerMonth: 30,   seats: 1,  maxCandidatesPerRun: 50,  famousSlots: 1,        extraPlugins: false, outreach: false, export: true,  usd: 29,  inr: 2499 },
  growth:   { id: "growth",   label: "Growth",     searchesPerMonth: 100,  seats: 2,  maxCandidatesPerRun: 100, famousSlots: 2,        extraPlugins: false, outreach: true,  export: true,  usd: 59,  inr: 4999 },
  pro:      { id: "pro",      label: "Pro",        searchesPerMonth: 300,  seats: 5,  maxCandidatesPerRun: 200, famousSlots: Infinity, extraPlugins: false, outreach: true,  export: true,  usd: 119, inr: 9999 },
  business: { id: "business", label: "Business",   searchesPerMonth: 1000, seats: 15, maxCandidatesPerRun: 500, famousSlots: Infinity, extraPlugins: true,  outreach: true,  export: true,  usd: 299, inr: 24999 },
  enterprise: { id: "enterprise", label: "Company licence", searchesPerMonth: 1000000, seats: 100, maxCandidatesPerRun: 500, famousSlots: Infinity, extraPlugins: true, outreach: true, export: true, usd: 0, inr: 0 },
};

export function connectError(plan: Plan, m: PluginManifest, connected: PluginManifest[]): string | null {
  if (m.status !== "live") return `${m.name} is not available yet (status: ${m.status}).`;
  if (m.tier === "free") return null;
  const paid = connected.filter((c) => c.tier !== "free" && c.id !== m.id);
  if (plan.id === "trial") return paid.length >= 1 ? "Free trial allows 1 site. Disconnect the other or upgrade." : null;
  if (m.tier === "extra" && !plan.extraPlugins) return `${m.name} is an extra-tier site. Upgrade to Business to unlock all extras.`;
  if (m.tier === "famous" && paid.filter((c) => c.tier === "famous").length >= plan.famousSlots)
    return `${plan.label} includes ${plan.famousSlots} famous site(s). Upgrade to connect more.`;
  return null;
}

/* ---------- SKILLS ---------- */
export const SKILLS: Record<string, string[]> = {
  react: ["react", "react.js", "reactjs"], typescript: ["typescript"], javascript: ["javascript", "ecmascript"],
  "node.js": ["node.js", "nodejs", "node"], postgres: ["postgres", "postgresql"], sql: ["sql"], mysql: ["mysql"], mongodb: ["mongodb", "mongo"],
  redis: ["redis"], aws: ["aws", "amazon web services"], gcp: ["gcp", "google cloud"], azure: ["azure"], docker: ["docker"],
  kubernetes: ["kubernetes", "k8s"], terraform: ["terraform"], "ci/cd": ["ci/cd", "cicd", "github actions", "jenkins"], linux: ["linux"],
  python: ["python"], django: ["django"], flask: ["flask"], fastapi: ["fastapi"], java: ["java"], spring: ["spring boot", "spring"],
  go: ["golang"], rust: ["rust"], "c#": ["c#"], ".net": [".net", "dotnet"], php: ["php"], ruby: ["ruby", "rails", "ruby on rails"],
  angular: ["angular"], vue: ["vue", "vue.js", "vuejs"], "next.js": ["next.js", "nextjs"], graphql: ["graphql"], "rest apis": ["rest api", "rest apis", "restful"],
  "machine learning": ["machine learning", "ml"], pytorch: ["pytorch"], tensorflow: ["tensorflow"], figma: ["figma"], swift: ["swift"], kotlin: ["kotlin"],
  "react native": ["react native"], html: ["html"], css: ["css", "tailwind", "tailwindcss"],
};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SKILL_RES = Object.entries(SKILLS).map(([k, al]) =>
  [k, new RegExp(`(?<![a-z0-9+#.])(?:${al.map(esc).join("|")})(?![a-z0-9+#])`, "i")] as const);

export function extractSkills(text: string): string[] {
  return SKILL_RES.filter(([, re]) => re.test(text)).map(([k]) => k);
}

/* ---------- JOB PARSER ---------- */
export function parseJob(raw: string): JobSpec {
  const text = raw.trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let title = lines[0] && lines[0].length < 80 ? lines[0] : "";
  if (!title) title = text.match(/looking for an? ([^.,]+?) to\b/i)?.[1] ?? "Untitled role";

  const niceIdx = text.search(/nice[- ]to[- ]have|preferred|bonus|plus:/i);
  const mustText = niceIdx >= 0 ? text.slice(0, niceIdx) : text;
  const niceText = niceIdx >= 0 ? text.slice(niceIdx) : "";
  const mustHave = extractSkills(mustText);
  const niceToHave = extractSkills(niceText).filter((s) => !mustHave.includes(s));
  const minYears = Number(text.match(/(\d{1,2})\s*\+?\s*(?:years|yrs)/i)?.[1]) || undefined;
  const seniority: Seniority | undefined =
    /\b(senior|sr\.?|staff|lead|principal)\b/i.test(title) ? "senior"
    : /\b(junior|jr\.?|entry|graduate|intern)\b/i.test(title) ? "junior"
    : minYears ? (minYears >= 5 ? "senior" : minYears >= 2 ? "mid" : "junior") : undefined;
  const remote = /\bremote\b/i.test(text);
  const loc = text.match(/location:\s*([^\n]+)/i)?.[1]?.trim()
    ?? text.match(/remote\s*\(([^)]+)\)/i)?.[1]?.trim()
    ?? text.match(/\b(?:in|based in)\s+([A-Z][A-Za-z]+(?:[ ,]+[A-Z][A-Za-z]+)?)/)?.[1];
  const salary = text.match(/[$€£₹]\s?\d[\d,.]*\s?[kKlL]?(?:\s?[–-]\s?[$€£₹]?\s?\d[\d,.]*\s?[kKlL]?)?/)?.[0];

  return {
    id: "job_" + createHash("sha1").update(text).digest("hex").slice(0, 10),
    title, rawText: text, mustHave, niceToHave, minYears, seniority, remote,
    location: loc, salary, createdAt: new Date().toISOString(),
  };
}


/* ---------- CSV IMPORT ---------- */
function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { cells.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const k of keys) {
    const v = row[k];
    if (v?.trim()) return v.trim();
  }
  return undefined;
};

/** Single source CSV records: source_platform is a user-supplied label, NOT an authenticated platform connector. */
export function parseCsvLike(text: string): Candidate[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map((h) => h.trim().toLowerCase().replace(/[ _-]+/g, ""));
  const fetchedAt = new Date().toISOString();
  const out: Candidate[] = [];

  for (const [rowIndex, line] of lines.slice(1).entries()) {
    const cells = parseCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    const name = pick(row, ["name", "fullname", "candidate", "candidatename"]);
    if (!name) continue;
    const skillsRaw = pick(row, ["skills", "skill", "technologies", "techstack"]) ?? "";
    const rawSkills = skillsRaw.split(/[;|,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    const skills = [...new Set([...extractSkills(skillsRaw), ...rawSkills])];
    const safeUrl = (v: string | undefined) => v && /^https?:\/\/[^\s]+$/i.test(v.trim()) ? v.trim() : undefined;
    const linksRaw = pick(row, ["links", "link", "url", "profile", "profileurl"]) ?? "";
    const sourceUrl = safeUrl(pick(row, ["sourceurl", "originalurl", "platformurl"]));
    const github = safeUrl(pick(row, ["github", "githuburl"]));
    const portfolio = safeUrl(pick(row, ["portfolio", "portfoliourl", "website"]));
    const resumeUrl = safeUrl(pick(row, ["resumeurl", "cvurl"]));
    const yearsRaw = pick(row, ["yearsexperience", "experienceyears", "years", "experience"]);
    const email = pick(row, ["email", "emailaddress", "workemail"])?.toLowerCase();
    const links = [...new Set([
      ...linksRaw.split(/[;|]/).map((x) => safeUrl(x)).filter((x): x is string => !!x),
      github, portfolio, resumeUrl, sourceUrl,
    ].filter((x): x is string => !!x))];
    const sourceLabel = pick(row, ["sourceplatform", "platform", "origin"]); // unverified label
    const providerUpdatedAtRaw = pick(row, ["sourceupdatedat", "profileupdatedat", "lastupdated"]);
    const providerUpdatedAt = providerUpdatedAtRaw && !isNaN(Date.parse(providerUpdatedAtRaw))
      ? new Date(providerUpdatedAtRaw).toISOString() : undefined;
    const source = { plugin: "pool", url: sourceUrl, sourceLabel, fetchedAt, providerUpdatedAt };
    const candidate: Candidate = {
      id: "", name,
      title: pick(row, ["title", "jobtitle", "role"]),
      headline: pick(row, ["headline"]),
      company: pick(row, ["company", "employer"]),
      location: pick(row, ["location", "city"]),
      skills, yearsExperience: yearsRaw && Number.isFinite(Number(yearsRaw)) && Number(yearsRaw) >= 0 && Number(yearsRaw) <= 80 ? Number(yearsRaw) : undefined,
      email, links, sources: [source], summary: pick(row, ["summary", "notes", "bio"]),
    };
    const extra = {
      professionalPhone: pick(row, ["professionalphone", "workphone", "businessphone"]),
      employmentHistory: pick(row, ["employmenthistory", "workhistory", "previouscompanies"]),
      currentRole: pick(row, ["currentrole"]), pastRoles: pick(row, ["pastroles", "previousroles"]),
      education: pick(row, ["education"]), degree: pick(row, ["degree", "qualification"]),
      college: pick(row, ["college", "university", "institution"]),
      graduationYear: pick(row, ["graduationyear", "passingyear"]),
      certifications: pick(row, ["certifications", "certificates"]),
      projects: pick(row, ["projects"]), achievements: pick(row, ["achievements"]),
      repositories: pick(row, ["repositories", "repos"]),
      languages: pick(row, ["languages", "spokenlanguages"]),
      github, portfolio, resumeUrl,
      expectedSalary: pick(row, ["expectedsalary", "expectedctc"]),
      currentSalary: pick(row, ["currentsalary", "currentctc"]),
      noticePeriod: pick(row, ["noticeperiod", "noticeperioddays"]),
      availableFrom: pick(row, ["availablefrom", "joiningdate"]),
      preferredLocations: pick(row, ["preferredlocations", "preferredlocation"]),
      workMode: pick(row, ["workmode", "workarrangement"]),
      preferredRoles: pick(row, ["preferredroles", "desiredrole"]),
      employmentType: pick(row, ["employmenttype"]),
      workAuthorization: pick(row, ["workauthorization", "workpermit"]),
    };
    candidate.profileFields = makeFieldEvidence(candidate, source, "imported", extra);
    // Source-row fingerprint prevents combining unrelated people who share a name, role or company.
    const recordId = pick(row, ["sourcecandidateid", "candidateid", "externalid"]);
    if (!email && !links.length) {
      candidate.id = "cand_" + createHash("sha256").update(
        [sourceLabel ?? "pool", recordId ?? "", JSON.stringify(row), rowIndex].join("|")
      ).digest("hex").slice(0, 16);
    } else candidate.id = makeId(candidate);
    out.push(candidate);
  }
  return mergeCandidates(out);
}

/* ---------- MERGE ---------- */
// Only exact professional email or explicit profile URL can establish a strong identity.
// Never join two people simply because they have the same name, employer, title or location.
const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeUrl = (url: string) => url.trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
function isPersonalProfileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    // A repository, company website or portfolio homepage is NOT a person's unique identifier.
    if (host === "github.com") return /^\/[^/]+$/.test(path) && !["orgs","topics","features","marketplace","settings"].includes(path.slice(1));
    if (host === "linkedin.com") return /^\/in\/[^/]+$/.test(path);
    if (host === "stackoverflow.com") return /^\/users\/\d+(?:\/[^/]+)?$/.test(path);
    // Vendor-owned candidate detail URLs, not arbitrary resumes or company webpages.
    return /^\/(?:candidate|candidates|applicants|profiles|people)\/[A-Za-z0-9_-]{6,}(?:\/)?$/i.test(path);
  } catch { return false; }
}
const keysOf = (c: Partial<Candidate>) => [
  c.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email.trim()) ? "e:" + c.email.trim().toLowerCase() : "",
  ...(c.links ?? []).filter(isPersonalProfileUrl).map((l) => "l:" + normalizeUrl(l)),
].filter(Boolean);

export function candidateIdentityTokens(candidate: Partial<Candidate>): string[] {
  return [...new Set(keysOf(candidate))];
}

export function sharesStrongIdentity(a: Partial<Candidate>, b: Partial<Candidate>): boolean {
  const left = new Set(keysOf(a));
  return keysOf(b).some((k) => left.has(k));
}

export const makeId = (c: Partial<Candidate>) => {
  const fallback = `fallback:${norm(c.name)}:${norm(c.title)}:${norm(c.company)}:${norm(c.location)}:${c.sources?.[0]?.plugin ?? "unknown"}`;
  return "cand_" + createHash("sha256").update(keysOf(c)[0] ?? fallback).digest("hex").slice(0, 16);
};

/** Keep a source's conflicting claims rather than overwriting or losing them. */
export function mergeCandidates(list: Candidate[]): Candidate[] {
  const out: Candidate[] = [];
  const byKey = new Map<string, Candidate>();
  for (const incoming of list) {
    const c = { ...incoming, skills: [...incoming.skills], links: [...incoming.links],
      sources: [...incoming.sources], profileFields: ensureProfileFields(incoming) };
    const hit = keysOf(c).map((k) => byKey.get(k)).find(Boolean) ||
      (c.id ? out.find((existing) => existing.id === c.id) : undefined);
    if (hit) {
      hit.skills = [...new Set([...hit.skills, ...c.skills])];
      hit.links = [...new Set([...hit.links, ...c.links])];
      hit.profileFields = combineProfileFields([...(hit.profileFields ?? []), ...(c.profileFields ?? [])]);
      for (const source of c.sources) {
        const old = hit.sources.find((s) => s.plugin === source.plugin && s.url === source.url && s.sourceLabel === source.sourceLabel);
        if (old) {
          if (source.fetchedAt > old.fetchedAt) old.fetchedAt = source.fetchedAt;
          if (source.providerUpdatedAt && (!old.providerUpdatedAt || source.providerUpdatedAt > old.providerUpdatedAt)) old.providerUpdatedAt = source.providerUpdatedAt;
        } else hit.sources.push(source);
      }
      for (const f of ["headline", "title", "company", "location", "email", "yearsExperience", "summary"] as const)
        if (hit[f] == null && c[f] != null) (hit as any)[f] = c[f];
      keysOf(hit).forEach((k) => byKey.set(k, hit));
    } else {
      c.id ||= makeId(c);
      c.profileFields = combineProfileFields(c.profileFields ?? []);
      keysOf(c).forEach((k) => byKey.set(k, c));
      out.push(c);
    }
  }
  return out;
}

/* ---------- SCORING ---------- */
const LV: Seniority[] = ["junior", "mid", "senior"];
function levelOf(c: Candidate): Seniority | undefined {
  const t = `${c.title ?? ""} ${c.headline ?? ""}`;
  if (/\b(senior|sr\.?|staff|lead|principal)\b/i.test(t)) return "senior";
  if (/\b(junior|jr\.?|intern|graduate)\b/i.test(t)) return "junior";
  if (c.yearsExperience != null) return c.yearsExperience >= 6 ? "senior" : c.yearsExperience >= 3 ? "mid" : "junior";
  return undefined;
}

export function scoreCandidate(job: JobSpec, c: Candidate): ScoredCandidate {
  const have = new Set(c.skills.map((s) => s.toLowerCase()));
  const matchedMust = job.mustHave.filter((s) => have.has(s));
  const matchedNice = job.niceToHave.filter((s) => have.has(s));
  const missing = job.mustHave.filter((s) => !have.has(s));
  const reasons: string[] = [];

  const niceW = job.niceToHave.length ? 15 : 0;
  const mustW = 55 - niceW;
  const skills =
    (job.mustHave.length ? (matchedMust.length / job.mustHave.length) * mustW : mustW) +
    (job.niceToHave.length ? (matchedNice.length / job.niceToHave.length) * niceW : 0);
  reasons.push(job.mustHave.length ? `Matches ${matchedMust.length}/${job.mustHave.length} required skills` : "No required skills detected");
  if (missing.length) reasons.push(`Missing: ${missing.join(", ")}`);
  if (matchedNice.length) reasons.push(`Bonus skills: ${matchedNice.join(", ")}`);

  let experience = 10;
  if (job.minYears && c.yearsExperience != null) {
    experience = Math.min(1, c.yearsExperience / job.minYears) * 20;
    reasons.push(`${c.yearsExperience} yrs experience vs ${job.minYears}+ wanted`);
  } else if (!job.minYears) experience = 20;
  else reasons.push("Years of experience unknown (neutral score)");

  let seniority = 5;
  const cl = levelOf(c);
  if (job.seniority && cl) {
    const d = Math.abs(LV.indexOf(cl) - LV.indexOf(job.seniority));
    seniority = d === 0 ? 10 : d === 1 ? 5 : 0;
    reasons.push(`Level ${cl} vs ${job.seniority} wanted`);
  } else if (!job.seniority) seniority = 10;

  let location = 8;
  const cloc = (c.location ?? "").toLowerCase();
  if (!cloc) { location = 8; reasons.push("Location unknown (neutral)"); }
  else if (job.remote) {
    const region = (job.location ?? "").toLowerCase();
    const us = /\b(us|usa|united states)\b/.test(region);
    const ok = !region || cloc.includes(region) || (us && /(,\s?[a-z]{2}\b|united states|usa|\bus\b)/i.test(c.location ?? ""));
    location = ok ? 15 : 6;
    reasons.push(ok ? "Location fits remote region" : "Outside remote region");
  } else if (job.location) {
    const ok = cloc.includes(job.location.toLowerCase().split(/[ ,(]/)[0]);
    location = ok ? 15 : 0;
    reasons.push(ok ? "Location matches" : "Different location");
  } else location = 15;

  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    candidateId: c.id,
    score: Math.round(skills + experience + seniority + location),
    breakdown: { skills: r(skills), experience: r(experience), seniority, location },
    matched: [...matchedMust, ...matchedNice], missing, reasons,
  };
}
