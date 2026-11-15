import test from "node:test";
import assert from "node:assert/strict";
import { nativeApproval, projection } from "./ci-record-fixtures.mjs";
const api = await import("../scripts/sds/ci-record-projection.mjs").catch((error) => {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  return {};
});
function project(value) { assert.equal(typeof api.projectApproval, "function", "BR2.2 requires native-to-public mapping"); return api.projectApproval(value); }
test("U1-PRO01 plan event and version1 receipt map canonical choice", () => {
  assert.deepEqual(project(nativeApproval()), { kind: "plan", choice: "Approve Plan", recordRef: "public:plan-1" });
  const planned = nativeApproval(); planned.target.stage = "units-generation"; planned.target.unit = null;
  planned.native.event = "QUESTION_ANSWERED"; planned.native.fields.Stage = "units-generation"; delete planned.native.fields.Unit;
  planned.planQuestion = { kind: "plan", target: structuredClone(planned.target), offeredChoices: ["Approve Plan", "Revise Plan"], choice: "Approve Plan", recordRef: planned.recordRef, stageContractSha256: "479dbf0c29e1304e28937d4f1275592218860188c42b60ebcb6b71e53d401b11" };
  assert.equal(project(planned)?.choice, "Approve Plan");
  planned.planQuestion.stageContractSha256 = "0".repeat(64); assert.equal(project(planned), null);
});
test("U1-PRO02 summary event checkpoint and authorization agree", () => {
  assert.equal(project(nativeApproval("summary")).choice, "Looks correct");
  const v = nativeApproval("summary"); v.native.fields.Checkpoint = "another"; assert.equal(project(v), null);
});
test("U1-PRO03 stage completion and formally offered Accept as-is", () => {
  const v = nativeApproval("stage-completion");
  assert.equal(project(v).approvedAt, "2026-11-09T01:00:00Z");
  v.native.fields["User Input"] = "Accept as-is"; assert.equal(project(v), null);
  v.offeredChoices.push("Accept as-is"); assert.equal(project(v).choice, "Accept as-is");
});
test("U1-PRO04 negative empty unknown or wrong-kind choice never approves", () => {
  project(nativeApproval());
  for (const kind of ["plan", "summary", "stage-completion"]) for (const choice of ["Request Changes", "Request changes", "Revise Plan", "", " ", "1", "承認", "UNKNOWN", kind === "plan" ? "Looks correct" : "Approve Plan"]) {
    const v = nativeApproval(kind); v.native.fields.Details = choice; v.native.fields["User Input"] = choice; v.receipt.choice = choice;
    assert.equal(project(v), null);
  }
});
test("U1-PRO05 general questions off and skipped never become plan approval", () => {
  for (const mutate of [(v) => { v.native.event = "QUESTION_ANSWERED"; }, (v) => { v.receipt.skipped = true; }, (v) => { v.planEnabled = false; }]) {
    const v = nativeApproval(); mutate(v); assert.equal(project(v), null);
  }
});
test("U1-PRO06 automatic autonomous and completion-only sources rejected", () => {
  for (const mutate of [(v) => { v.native.fields.Autonomous = "true"; }, (v) => { delete v.native.fields["User Input"]; }, (v) => { v.native.event = "STAGE_COMPLETED"; }]) {
    const v = nativeApproval("stage-completion"); mutate(v); assert.equal(project(v), null);
  }
});
test("U1-PRO07 private receipt body and human text never projected", () => {
  const v = nativeApproval(); v.receipt.privateBody = "SYNTHETIC_SECRET_MARKER"; v.native.fields.Raw = "SYNTHETIC_HUMAN_REPLY";
  const out = JSON.stringify(project(v)); assert.equal(/SYNTHETIC|privateBody|Raw/.test(out), false);
  const p = projection(); p.humanReply = "SYNTHETIC_SECRET_MARKER"; assert.throws(() => api.readProjection(JSON.stringify(p)));
});
test("U1-PRO08 target attempt and logical ref correspondence maintained", () => {
  project(nativeApproval());
  const v = nativeApproval(); v.receipt.runFloor = "old"; assert.equal(project(v), null);
  const other = nativeApproval(); other.native.fields.Unit = "u2-other"; assert.equal(project(other), null);
  const badRef = nativeApproval(); badRef.recordRef = ".aidlc-engine/private"; assert.throws(() => project(badRef));
  assert.deepEqual(api.readProjection(JSON.stringify(projection())), projection());
});
