import test from "node:test";
import assert from "node:assert/strict";
import { mergeCandidates, parseCsvLike, parseJob, scoreCandidate } from "./logic.js";

test("parseJob extracts core requirements", () => {
  const job = parseJob(`Senior Full Stack Developer\nRemote (US)\n5+ years\nReact, TypeScript, Postgres\nNice to have: Kubernetes`);
  assert.equal(job.seniority, "senior");
  assert.equal(job.remote, true);
  assert.equal(job.minYears, 5);
  assert.ok(job.mustHave.includes("react"));
  assert.ok(job.niceToHave.includes("kubernetes"));
});

test("CSV import creates pool candidates", () => {
  const rows = parseCsvLike(`name,title,skills,email,years\nAsha Verma,Engineer,"React; TypeScript",asha@example.com,4`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, "asha@example.com");
  assert.deepEqual(rows[0].skills, ["react", "typescript"]);
  assert.equal(rows[0].sources[0].plugin, "pool");
});

test("mergeCandidates merges same email", () => {
  const a = parseCsvLike(`name,skills,email\nAsha,react,asha@example.com`)[0];
  const b = parseCsvLike(`name,skills,email\nAsha,typescript,asha@example.com`)[0];
  const merged = mergeCandidates([a, b]);
  assert.equal(merged.length, 1);
  assert.deepEqual(new Set(merged[0].skills), new Set(["react", "typescript"]));
});

test("score is bounded to 100", () => {
  const job = parseJob(`Senior Engineer\nRemote\n5+ years\nReact TypeScript Postgres`);
  const c = parseCsvLike(`name,title,skills,years\nAsha,Senior Engineer,"react;typescript;postgres",8`)[0];
  const score = scoreCandidate(job, c);
  assert.ok(score.score >= 0 && score.score <= 100);
});
