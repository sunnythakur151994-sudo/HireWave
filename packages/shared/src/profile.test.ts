import test from "node:test";
import assert from "node:assert/strict";
import { mergeCandidates, parseCsvLike, sharesStrongIdentity } from "./logic.js";
import { ensureProfileFields } from "./profile.js";
import type { Candidate } from "./types.js";

test("CSV accepts professional fields with source attribution and does not import sensitive attributes", () => {
  const c = parseCsvLike(`name,email,title,education,notice_period,expected_salary,source_platform,source_url,religion,date_of_birth,professional_phone\nRavi,ravi@example.com,Engineer,B.Tech,30 days,10 LPA,Naukri,https://example.com/ravi,Private,1999-01-01,1800123456`)[0];
  const f = ensureProfileFields(c);
  assert.ok(f.some(x => x.field === "education" && x.value === "B.Tech"));
  assert.ok(f.some(x => x.field === "noticePeriod" && x.value === "30 days"));
  assert.ok(f.some(x => x.field === "professionalPhone" && x.value === "1800123456"));
  assert.ok(f.every(x => x.plugin === "pool" && x.sourceLabel === "Naukri" && x.method === "imported"));
  assert.ok(!JSON.stringify(c).includes("Private"));
  assert.ok(!JSON.stringify(c).includes("1999-01-01"));
});

test("Same-email candidate imports preserve source conflicts and latest evidence", () => {
  const first = parseCsvLike(`name,email,company,title,source_platform,source_url\nRavi,ravi@example.com,ACME,Engineer,Naukri,https://example.com/ravi`)[0];
  const second = parseCsvLike(`name,email,company,title,source_platform,source_url\nRavi,ravi@example.com,Globex,Engineer,ATS,https://example.com/ravi-ats`)[0];
  const [merged] = mergeCandidates([first, second]);
  assert.equal(merged.sources.length, 2);
  assert.equal(merged.profileFields?.filter(x => x.field === "company").length, 2);
  assert.deepEqual(new Set(merged.profileFields?.filter(x => x.field === "company").map(x => x.value)), new Set(["ACME", "Globex"]));
  assert.equal(mergeCandidates([merged, first])[0].profileFields?.filter(x => x.field === "company").length, 2);
});

test("No merge on name, company and title alone", () => {
  const first = parseCsvLike(`name,company,title,source_platform\nRahul Sharma,Acme,Engineer,ATS`)[0];
  const second = parseCsvLike(`name,company,title,source_platform\nRahul Sharma,Acme,Engineer,Naukri`)[0];
  assert.equal(sharesStrongIdentity(first,second),false);
  assert.equal(mergeCandidates([first,second]).length, 2);
});

test("No unverified attribution to multiple legacy sources", () => {
  const c: Candidate = {id:"test", name:"Ravi", skills:["python"], links:[], sources:[
    {plugin:"github",fetchedAt:"2025-01-01T00:00:00Z"},
    {plugin:"pool",fetchedAt:"2025-01-02T00:00:00Z"} ]};
  assert.deepEqual(ensureProfileFields(c),[]);
});

test("Merge retains stable ID from the earlier canonical candidate", () => {
  const a = parseCsvLike(`name,email,company\nRavi,ravi@example.com,Acme`)[0];
  const b = parseCsvLike(`name,email,company\nRavi,ravi@example.com,Other`)[0];
  assert.equal(mergeCandidates([a,b])[0].id,a.id);
});

test("Unrelated candidate records sharing company homepage never merge", () => {
  const a = parseCsvLike(`name,links,source_platform\nArun,https://acme.com,ATS`)[0];
  const b = parseCsvLike(`name,links,source_platform\nVarun,https://acme.com,ATS`)[0];
  assert.equal(mergeCandidates([a,b]).length,2);
});

test("Repeated import of same ID without email preserves provenance", () => {
  const a = parseCsvLike(`name,company,source_platform\nRavi,Acme,ATS`)[0];
  const b = parseCsvLike(`name,company,source_platform\nRavi,Acme,ATS`)[0];
  assert.equal(mergeCandidates([a,b]).length,1);
});
