import type { Candidate, JobSpec, ScoredCandidate } from "./types.js";

export type Availability = "unknown" | "available" | "unavailable";
export type WorkflowCategory = "ready_for_hr" | "awaiting_availability" | "needs_review" | "unavailable";
export type ContactChannel = "email" | "sms" | "voice";

export interface CandidateAvailability {
  orgId: string;
  candidateId: string;
  jobId: string;
  status: Availability;
  reportedBy: "candidate";
  reportedAt: string;
  timezone?: string;
  availableFrom?: string;
  preferredWindow?: string;
  contactConsent: ContactChannel[];
}

export interface Qualification {
  candidateId: string;
  score: number;
  category: WorkflowCategory;
  criteriaVerified: boolean;
  reasons: string[];
  availability: Availability;
  contactConsent: ContactChannel[];
}

// This is a workflow filter, NOT an autonomous employment decision. Missing public
// profile data is not evidence that a person does not have a skill or qualification.
export function qualifyForWorkflow(
  job: JobSpec,
  candidate: Candidate,
  scored: ScoredCandidate,
  response?: CandidateAvailability,
  minimumScore = 70,
): Qualification {
  const reasons: string[] = [];
  const missing = job.mustHave.filter((skill) => !candidate.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase()));
  if (missing.length) reasons.push(`Required skill evidence missing: ${missing.join(", ")}`);
  if (job.minYears != null) {
    if (candidate.yearsExperience == null) reasons.push("Experience needs verification");
    else if (candidate.yearsExperience < job.minYears) reasons.push(`Experience below stated minimum (${candidate.yearsExperience}/${job.minYears}) - human review`);
  }
  if (!job.remote && job.location) {
    if (!candidate.location) reasons.push("Location/relocation preference unknown");
    else if (!candidate.location.toLowerCase().includes(job.location.toLowerCase().split(/[ ,(]/)[0]))
      reasons.push("Location or relocation needs review");
  }
  if (scored.score < minimumScore) reasons.push(`Score ${scored.score} is below workflow threshold ${minimumScore} - human review`);
  if (!job.mustHave.length) reasons.push("No objective skills parsed from the job - human review required");
  const criteriaVerified = reasons.length === 0;
  const availability = response?.status ?? "unknown";
  const category: WorkflowCategory = !criteriaVerified ? "needs_review"
    : availability === "unavailable" ? "unavailable"
    : availability === "available" ? "ready_for_hr"
    : "awaiting_availability";
  return { candidateId: candidate.id, score: scored.score, category, criteriaVerified,
    reasons: reasons.length ? reasons : ["Recorded job criteria met; not a final hiring decision"],
    availability, contactConsent: response?.contactConsent ?? [] };
}
