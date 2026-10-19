import type { Candidate, JobSpec } from "./types.js";
export type AgentChannel = "email" | "sms" | "voice";
export const E164 = /^\+[1-9]\d{7,14}$/;
/** Only phone values already present in an authorized profile source; never inferred. */
export function professionalPhone(candidate: Candidate): string | undefined {
  const matches = (candidate.profileFields ?? []).filter(f => f.field === "professionalPhone" && E164.test(f.value.trim()));
  const mostRecent = [...matches].sort((a,b) => b.fetchedAt.localeCompare(a.fetchedAt))[0];
  return mostRecent?.value.trim();
}
export function destinationAvailable(channel: AgentChannel, candidate: Candidate) {
  return channel === "email" ? !!candidate.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)
    : !!professionalPhone(candidate);
}
export function draftAgentOutreach(channel: AgentChannel, candidate: Candidate, job: JobSpec, organization: string) {
  const first = candidate.name.split(" ")[0] || "there";
  const sender = organization.slice(0,80);
  if (channel === "email") return {
    subject: `Following up about ${job.title}`,
    body: `Hello ${first},\n\nThank you for confirming your interest in the ${job.title} opportunity with ${sender}. Our recruiting team would like to coordinate next steps. Please reply with a convenient interview time.\n\nIf you no longer wish to hear from us, please reply OPT OUT.\n\nRegards,\n${sender} recruitment team`,
  };
  if (channel === "sms") return {
    subject: undefined,
    body: `Hi ${first}, ${sender} recruiting here about ${job.title}. Thanks for confirming interest. Please reply with a convenient interview time. Reply STOP to opt out.`,
  };
  return {
    subject: undefined,
    body: `Hello ${first}. This is an automated recruitment follow-up from ${sender} about the ${job.title} opportunity. Thank you for confirming your interest. Please reply to our recruiting email to arrange a suitable interview time. Goodbye.`,
  };
}
