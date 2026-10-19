import type { Candidate, CandidateSource, ProfileFieldEvidence } from "./types.js";

/** Fields are professional/recruitment-related. No protected personal attributes. */
export const PROFILE_GROUPS = [
  { key: "identity", label: "Professional identity", fields: ["name", "headline", "title", "company", "location", "summary"] },
  { key: "contact", label: "Professional contact", fields: ["email", "professionalPhone"] },
  { key: "experience", label: "Experience and employment", fields: ["yearsExperience", "employmentHistory", "currentRole", "pastRoles"] },
  { key: "education", label: "Education and certificates", fields: ["education", "degree", "college", "graduationYear", "certifications"] },
  { key: "skills", label: "Skills and achievements", fields: ["skills", "achievements", "languages"] },
  { key: "projects", label: "Projects, profiles and CV", fields: ["projects", "repositories", "portfolio", "github", "resumeUrl", "links"] },
  { key: "preferences", label: "Job preferences", fields: ["expectedSalary", "currentSalary", "noticePeriod", "availableFrom", "preferredLocations", "workMode", "preferredRoles", "employmentType", "workAuthorization"] },
] as const;

export const PROFILE_LABELS: Record<string, string> = {
  name:"Name", headline:"Headline", title:"Job title", company:"Current company", location:"Location", summary:"About / summary",
  email:"Professional email", professionalPhone:"Published work phone", yearsExperience:"Years of experience",
  employmentHistory:"Employment history", currentRole:"Current role", pastRoles:"Previous roles",
  education:"Education", degree:"Degree", college:"College / institution", graduationYear:"Graduation year", certifications:"Certificates",
  skills:"Skills", achievements:"Achievements", languages:"Languages",
  projects:"Projects", repositories:"Public repositories", portfolio:"Portfolio", github:"GitHub", resumeUrl:"Resume link", links:"Professional links",
  expectedSalary:"Expected salary", currentSalary:"Current salary", noticePeriod:"Notice period", availableFrom:"Stated available from",
  preferredLocations:"Preferred locations", workMode:"Work arrangement", preferredRoles:"Preferred roles", employmentType:"Employment type", workAuthorization:"Work authorization",
};
export const PROFILE_FIELDS = new Set(Object.keys(PROFILE_LABELS));

const normalize = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 1800);
const validUrl = (s: string) => /^https?:\/\/[^\s]+$/i.test(s);
const urlFields = new Set(["portfolio", "github", "resumeUrl"]);

export function makeFieldEvidence(
  candidate: Candidate, source: CandidateSource, method: ProfileFieldEvidence["method"],
  extra: Record<string, string | undefined> = {},
): ProfileFieldEvidence[] {
  const values: Record<string, string | undefined> = {
    name: candidate.name, headline: candidate.headline, title: candidate.title, company: candidate.company,
    location: candidate.location, summary: candidate.summary, email: candidate.email,
    yearsExperience: candidate.yearsExperience == null ? undefined : String(candidate.yearsExperience),
    skills: candidate.skills?.join("; "), links: candidate.links?.join("; "),
    ...extra,
  };
  return Object.entries(values).flatMap(([field, original]) => {
    if (!PROFILE_FIELDS.has(field) || !original?.trim()) return [];
    const value = normalize(original);
    if (!value || (urlFields.has(field) && !validUrl(value))) return [];
    return [{ field, value, plugin: source.plugin, sourceUrl: source.url,
      fetchedAt: source.fetchedAt, providerUpdatedAt: source.providerUpdatedAt,
      sourceLabel: source.sourceLabel, method }];
  });
}

/** Migrate old candidates without guessing an original provider when multiple sources exist. */
export function ensureProfileFields(candidate: Candidate): ProfileFieldEvidence[] {
  if (candidate.profileFields?.length) return candidate.profileFields.filter(f => PROFILE_FIELDS.has(f.field));
  if (candidate.sources.length !== 1) return [];
  return makeFieldEvidence(candidate, candidate.sources[0], "legacy");
}

export function combineProfileFields(items: ProfileFieldEvidence[]): ProfileFieldEvidence[] {
  const map = new Map<string, ProfileFieldEvidence>();
  for (const item of items) {
    if (!PROFILE_FIELDS.has(item.field) || typeof item.value !== "string" || !item.value.trim()) continue;
    const safe: ProfileFieldEvidence = { ...item, value: normalize(item.value) };
    const identity = [safe.field, safe.value.trim().toLowerCase(), safe.plugin, safe.sourceUrl ?? "", safe.sourceLabel ?? ""].join("|#|");
    const prior = map.get(identity);
    if (!prior || (Date.parse(safe.fetchedAt) || 0) >= (Date.parse(prior.fetchedAt) || 0)) map.set(identity, safe);
  }
  return [...map.values()];
}
