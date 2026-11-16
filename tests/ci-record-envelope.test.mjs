import test from "node:test";
import assert from "node:assert/strict";
import { assessmentInput, HEAD, BASE } from "./ci-record-fixtures.mjs";
import { assessRecords } from "../scripts/sds/ci-record-admission.mjs";
const api = await import("../scripts/sds/ci-record-envelope.mjs").catch((error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; return {}; });
function source(legacy = false) {
  const input = assessmentInput(); if (legacy) { input.records.stages[0].review = null; input.records.stages[0].approvals[0].approvedAt = "2026-11-05"; input.approvalEvidence[0].approvedAt = "2026-11-05"; }
  const assessment = assessRecords(input);
  return { assessment, evaluationScope: { repo: input.target.repo, pr: 7, head: HEAD, base: BASE, target: input.target, checkpoint: "code-generation-submission", rulesetVersion: assessment.rulesetVersion, artifactSetDigest: assessment.artifactSetDigest }, observations: input.observations };
}
function encode(value) { assert.equal(typeof api.encodeEnvelope, "function", "BR7.2 requires complete inline result"); return api.encodeEnvelope(value); }
test("U1-ENV01 complete encode decode equals original evaluation", () => {
  const s = source(), original = encode(s); assert.deepEqual(api.decodeEnvelope(JSON.stringify(original), original), original);
  assert.equal(original.authorization, "NONE"); assert.equal(original.outcome, s.assessment.outcome);
});
test("U1-ENV02 assurance fixed fields cannot be removed or promoted", () => {
  const original = encode(source());
  for (const key of ["authorization", "assurance", "engineAuthenticity", "ownerIdentity", "reviewerExecution"]) {
    const v = structuredClone(original); delete v.assessment[key]; assert.throws(() => api.decodeEnvelope(JSON.stringify(v), original));
    const changed = structuredClone(original); changed.assessment[key] = "verified"; assert.throws(() => api.decodeEnvelope(JSON.stringify(changed), original));
  }
});
test("U1-ENV03 known legacy debt cannot be emptied or fields dropped", () => {
  const original = encode(source(true)); assert.equal(original.assessment.knownRemaining.length, 1);
  const v = structuredClone(original); v.assessment.knownRemaining = []; assert.throws(() => api.decodeEnvelope(JSON.stringify(v), original));
  for (const key of Object.keys(original.assessment.knownRemaining[0])) { const bad = structuredClone(original); delete bad.assessment.knownRemaining[0][key]; assert.throws(() => api.decodeEnvelope(JSON.stringify(bad), original)); }
});
test("U1-ENV04 target head base or scope substitution rejected", () => {
  const original = encode(source());
  for (const key of ["head", "base", "repo", "checkpoint"]) { const v = structuredClone(original); v.evaluationScope[key] = "other"; assert.throws(() => api.decodeEnvelope(JSON.stringify(v), original)); }
});
test("U1-ENV05 dangling references or duplicate observation IDs rejected", () => {
  const s = source(); s.assessment.observationRefs = ["public:missing"]; assert.throws(() => encode(s));
  const dup = source(); dup.observations.push(structuredClone(dup.observations[0])); assert.throws(() => encode(dup));
});
test("U1-ENV06 observations from another scope version or unavailable cannot pass", () => {
  for (const mutate of [(o) => { o.target.intent = "other"; }, (o) => { o.versionRef = "other"; }, (o) => { o.availability = "unavailable"; }, (o) => { o.prObservation.base = "d".repeat(40); }]) {
    const s = source(); mutate(s.observations[0]); assert.throws(() => encode(s));
  }
});
test("U1-ENV07 no original result reference-only or partial envelope refused", () => {
  const original = encode(source());
  assert.throws(() => api.decodeEnvelope(JSON.stringify(original), null));
  assert.throws(() => api.decodeEnvelope(JSON.stringify({ assessmentRef: "public:a" }), original));
  const s = source(); delete s.assessment.conditions.ready; assert.throws(() => encode(s));
});
test("U1-ENV08 C01 C03 C05 C07 preserve source separately from destination", () => {
  const original = encode(source(true));
  for (const boundary of ["C01", "C03", "C05", "C07"]) {
    const carried = { boundary, distributionTarget: "public:example-consumer", source: api.decodeEnvelope(JSON.stringify(original), original) };
    assert.deepEqual(carried.source.assessment.knownRemaining, original.assessment.knownRemaining);
    assert.equal(carried.source.evaluationScope.repo, "watchout/example");
  }
});
