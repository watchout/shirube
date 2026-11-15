import test from "node:test";
import assert from "node:assert/strict";
import { assessmentInput } from "./ci-record-fixtures.mjs";
const api = await import("../scripts/sds/ci-record-admission.mjs").catch((error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; return {}; });
function assess(value) { assert.equal(typeof api.assessRecords, "function", "BR7.1 requires four-condition pure evaluation"); return api.assessRecords(value); }
test("U1-ADM01 four conditions aggregate with immutable assurance", () => {
  const result = assess(assessmentInput()); assert.equal(result.outcome, "PASS");
  assert.deepEqual(Object.keys(result.conditions), ["records", "ready", "digests", "designAudit"]);
  assert.equal(result.authorization, "NONE"); assert.equal(result.engineAuthenticity, "not-verified-by-gate"); assert.deepEqual(result.sensorResultRefs, []);
});
test("U1-ADM02 missing required record approval or wrong target rejects", () => {
  for (const mutate of [(f) => { f.records.stages[0].approvals = []; }, (f) => { f.records.stages[0].attempt = "old"; }, (f) => { f.records.target.repo = "watchout/other"; }]) {
    const f = assessmentInput(); mutate(f); assert.equal(assess(f).outcome, "FAIL");
  }
  const critical = assessmentInput(); critical.schema = "shirube-admission-context/2"; assert.throws(() => assess(critical));
});
test("U1-ADM03 post-cutoff missing NOT-READY wrong role or stale request", () => {
  for (const mutate of [(r) => null, (r) => ({ ...r, verdict: "NOT-READY" }), (r) => ({ ...r, reviewer: "unknown-role" }), (r) => ({ ...r, artifactSetDigest: "0".repeat(64) })]) {
    const f = assessmentInput(); f.records.stages[0].review = mutate(f.records.stages[0].review); assert.equal(assess(f).conditions.ready.outcome, "FAIL");
  }
});
test("U1-ADM04 declared digest cannot hide same-size content change", () => {
  const f = assessmentInput(); f.artifacts[0].sha256 = "a".repeat(64);
  const r = assess(f); assert.equal(r.outcome, "FAIL"); assert.ok(r.conditions.digests.reasonCodes.includes("ARTIFACT_DIGEST_MISMATCH"));
});
test("U1-ADM05 required audit FAIL UNKNOWN and evidenced exclusion aggregate", () => {
  for (const outcome of ["FAIL", "UNKNOWN", "NOT_APPLICABLE"]) {
    const f = assessmentInput();
    if (outcome !== "NOT_APPLICABLE") f.protectedCategories.contracts.outcome = "APPLIES";
    if (outcome === "UNKNOWN") f.designAuditObservation = { availability: "unavailable" };
    assert.equal(assess(f).outcome, outcome === "NOT_APPLICABLE" ? "PASS" : outcome);
  }
  const f = assessmentInput(); f.protectedCategories.contracts.outcome = "APPLIES"; f.designAuditObservation = { availability: "unavailable" }; f.records.stages[0].approvals = [];
  assert.equal(assess(f).outcome, "FAIL");
});
test("U1-ADM06 strict JST inclusive date and offset timestamp boundaries", () => {
  for (const [date, format, expected] of [["2026-11-05T14:59:59Z", "timestamp", "PASS"], ["2026-11-05T15:00:00Z", "timestamp", "FAIL"], ["2026-11-06", "date", "FAIL"], ["2026-11-05", "date", "PASS"], ["2026-11-05T10:00:00-05:00", "timestamp", "FAIL"], ["2026-11-06T00:00:00", "timestamp", "UNKNOWN"], ["2026-02-30", "date", "UNKNOWN"], ["2026-11-05T25:00:00Z", "timestamp", "UNKNOWN"], ["2030-01-01", "date", "UNKNOWN"]]) {
    const f = assessmentInput(); f.records.stages[0].review = null;
    Object.assign(f.records.stages[0].approvals[0], { approvedAt: date, approvedAtFormat: format }); Object.assign(f.approvalEvidence[0], { approvedAt: date, approvedAtFormat: format });
    assert.equal(assess(f).conditions.ready.outcome, expected, date);
  }
});
test("U1-ADM07 original reapproval reopen and date-only downgrade stay distinct", () => {
  const forged = assessmentInput(); forged.records.stages[0].approvals[0].approvedAt = "2026-11-05"; forged.records.stages[0].review = null;
  assert.equal(assess(forged).conditions.ready.outcome, "UNKNOWN");
  const reopened = assessmentInput(); reopened.records.stages[0].approvals = []; reopened.records.stages[0].review = null; reopened.records.stages[0].reopenedFromApprovalRef = "public:old-approval";
  reopened.policy.requiredApprovals = []; reopened.policy.slots[0].kinds = []; reopened.policy.slots[0].reviewPerformed = true; reopened.approvalEvidence = [];
  assert.equal(assess(reopened).conditions.ready.outcome, "FAIL");
  const history = assessmentInput(), old = structuredClone(history.records.stages[0]);
  Object.assign(old.approvals[0], { approvedAt: "2026-11-05", recordRef: "public:original", approvalRecordRef: "public:original" }); old.review = null;
  const current = history.records.stages[0]; current.attempt = "attempt-2"; current.reopenedFromApprovalRef = "public:original";
  Object.assign(current.approvals[0], { recordRef: "public:reapproved", approvalRecordRef: "public:reapproved" });
  history.policy.slots[0].attempt = "attempt-2"; history.policy.requiredApprovals[0].attempt = "attempt-2";
  history.records.stages.push(old); history.approvalEvidence = [
    { stage: old.stage, unit: old.unit, attempt: old.attempt, recordRef: "public:original", approvedAt: "2026-11-05", approvedAtFormat: "date" },
    { stage: current.stage, unit: current.unit, attempt: current.attempt, recordRef: "public:reapproved", approvedAt: "2026-11-06", approvedAtFormat: "date" },
  ];
  const kept = assess(history); assert.equal(kept.outcome, "PASS"); assert.equal(kept.knownRemaining[0].attempt, "attempt-1");
  old.approvals[0].approvedAt = "2026-11-06"; history.approvalEvidence[0].approvedAt = "2026-11-06";
  assert.equal(assess(history).outcome, "FAIL");
  old.review = structuredClone(current.review); assert.equal(assess(history).outcome, "PASS");
});
test("U1-ADM08 legacy zero-READY debt nonempty scope and deterministic result", () => {
  const f = assessmentInput(); f.records.stages[0].review = null; f.records.stages[0].approvals[0].approvedAt = "2026-11-05"; f.approvalEvidence[0].approvedAt = "2026-11-05";
  const r = assess(f); assert.equal(r.outcome, "PASS"); assert.equal(r.knownRemaining[0].revisitOnReopen, true); assert.equal(r.knownRemaining[0].approvalRecordRef, "public:approval-1");
  assert.deepEqual(assess(structuredClone(f)), r);
  const empty = assessmentInput(); empty.artifacts = []; assert.throws(() => assess(empty));
});
