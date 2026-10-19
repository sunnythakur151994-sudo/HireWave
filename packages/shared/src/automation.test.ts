import test from "node:test";
import assert from "node:assert/strict";
import { parseCsvLike, parseJob, scoreCandidate } from "./logic.js";
import { qualifyForWorkflow } from "./automation.js";

const job = parseJob("Senior Engineer\nRemote\n5+ years\nReact TypeScript Postgres");
const candidate = parseCsvLike('name,title,skills,years,email\nAsha,Senior Engineer,"react;typescript;postgres",7,asha@example.com')[0];
const scored = scoreCandidate(job, candidate);

test("candidate meeting recorded requirements still waits for availability", () => {
  const q = qualifyForWorkflow(job, candidate, scored);
  assert.equal(q.category, "awaiting_availability");
  assert.equal(q.availability, "unknown");
});
test("candidate availability self-report moves to HR review list", () => {
  const q = qualifyForWorkflow(job, candidate, scored, {
    orgId: "o", candidateId: candidate.id, jobId: job.id, status: "available",
    reportedBy: "candidate", reportedAt: new Date().toISOString(), contactConsent: ["email"],
  });
  assert.equal(q.category, "ready_for_hr");
  assert.deepEqual(q.contactConsent, ["email"]);
});
test("missing experience is human review and not an automatic reject", () => {
  const c = {...candidate, yearsExperience: undefined};
  const q = qualifyForWorkflow(job, c, scoreCandidate(job,c));
  assert.equal(q.category, "needs_review");
});
test("unavailable candidate is not included in available list", () => {
  const q = qualifyForWorkflow(job, candidate, scored, {
    orgId:"o", candidateId:candidate.id, jobId:job.id, status:"unavailable", reportedBy:"candidate",
    reportedAt:new Date().toISOString(), contactConsent:[]
  });
  assert.equal(q.category,"unavailable");
});
