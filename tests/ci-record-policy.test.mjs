import test from "node:test";
import assert from "node:assert/strict";

// Missing implementation is asserted inside the runnable test, not mistaken for runner failure.
const api = await import("../scripts/sds/ci-record-policy.mjs").catch((error) => {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  return {};
});
const target = () => ({ repo: "watchout/example", workspace: "example", space: "default", intent: "261105-example", unit: "u1-example", stage: "code-generation", attempt: "attempt-code-generation" });
const stages = ["intent-capture", "feasibility", "scope-definition", "team-formation", "rough-mockups", "approval-handoff", "reverse-engineering", "practices-discovery", "requirements-analysis", "user-stories", "refined-mockups", "domain-design", "units-generation", "contract-design", "delivery-planning", "functional-design", "nfr-requirements", "nfr-design", "infrastructure-design", "code-generation"];
const plan = () => ({ scope: "feature", projectType: "brownfield", kind: "service", firstUnit: true,
  reference: "public:accepted-plan-v1", baselineReference: "public:audited-plan-v1",
  stages: stages.map((stage) => ({ stage, attempt: `attempt-${stage}`, completed: stages.indexOf(stage) < 15,
    summaryConfirmed: stage !== "code-generation", reviewPerformed: stages.indexOf(stage) >= 15,
    planApproved: stage === "code-generation" })) });
function derive(value = plan()) {
  assert.equal(typeof api.derivePolicy, "function", "BR1.2 requires independent fixed-set derivation");
  return api.derivePolicy({ target: target(), checkpoint: "code-generation-submission", plan: value });
}
test("U1-POL01 fixed nonempty sets include applicable Inception", () => {
  const p = derive();
  assert.equal(p.outcome, "PASS");
  assert.ok(p.requiredArtifacts.some((x) => x.path.endsWith("inception/requirements-analysis/requirements.md")));
  assert.ok(p.requiredArtifacts.some((x) => x.path.endsWith("code-generation/source-manifest.json")));
  assert.ok(p.requiredArtifacts.some((x) => x.path === "aidlc/spaces/default/codekb/example/architecture.md"));
  assert.ok(p.requiredApprovals.some((x) => x.stage === "requirements-analysis" && x.kind === "stage-completion" && x.unit === null));
});
test("U1-POL02 one required artifact cannot disappear", () => {
  const p = derive();
  assert.equal(api.compareArtifactPaths(p.requiredArtifacts, p.requiredArtifacts.slice(1).map((x) => x.path)), false);
});
test("U1-POL03 stages and arbitrary excludes cannot shrink the contract", () => {
  for (const change of [(p) => { p.stages = []; }, (p) => { p.exclude = ["requirements-analysis"]; }, (p) => { p.stages.pop(); }, (p) => { p.stages.find((s) => s.stage === "requirements-analysis").completed = false; }]) {
    const p = plan(); change(p); assert.equal(derive(p).outcome, "UNKNOWN");
  }
});
test("U1-POL04 checkpoint requires current plan but no future approval", () => {
  const p = derive();
  assert.ok(p.requiredApprovals.some((x) => x.stage === "code-generation" && x.kind === "plan"));
  assert.equal(p.requiredApprovals.some((x) => x.stage === "code-generation" && x.kind === "stage-completion"), false);
  assert.equal(p.requiredArtifacts.some((x) => /build-and-test|ci-pipeline/.test(x.path)), false);
});
test("U1-POL05 newly completed stage adds its own approval", () => {
  const p = plan(); p.stages.find((x) => x.stage === "functional-design").completed = true;
  assert.ok(derive(p).requiredApprovals.some((x) => x.stage === "functional-design" && x.kind === "stage-completion"));
});
test("U1-POL06 unknown or conflicting accepted plan stays UNKNOWN", () => {
  for (const p of [null, { ...plan(), scope: "unknown" }, { ...plan(), baselineReference: "" }]) assert.equal(derive(p).outcome, "UNKNOWN");
  const p = plan(); p.stages.push(p.stages[0]); assert.equal(derive(p).outcome, "UNKNOWN");
});
test("U1-POL07 fixed caller profile and exact target slots", () => {
  const p = derive();
  assert.equal(p.rulesetVersion, "shirube-u1-functional-rules/1");
  assert.ok(p.stageDefinitions.every((x) => /^[a-f0-9]{64}$/.test(x.sha256)));
  assert.equal(p.requiredApprovals.find((x) => x.stage === "functional-design").unit, "u1-example");
  assert.throws(() => api.resolveProfile("unknown", "code-generation-submission"));
  assert.throws(() => api.resolveProfile("ci-record-admission", "future"));
  const p2 = plan(); p2.stages.find((x) => x.stage === "code-generation").attempt = "old-attempt";
  assert.equal(derive(p2).outcome, "UNKNOWN");
});
test("U1-POL08 self-reference exclusions have fixed identity and structure", () => {
  const p = derive();
  assert.equal(api.isSelfReference(p.recordPath, p.recordPath), true);
  assert.equal(api.isSelfReference(p.requiredArtifacts[0].path, p.recordPath), false);
  assert.equal(p.requiredArtifacts.some((x) => x.path === p.recordPath), false);
  assert.deepEqual(api.BUDGET, { timeoutMs: 20000, totalTimeoutMs: 120000, maxRequests: 100, maxBytesPerResponse: 8000000, automaticRetries: 0 });
});
test("U1-POL10 a published table cannot lower the summary and review obligations of earlier stages", () => {
  const lowered = (stage, key) => { const v = plan(); v.stages.find((s) => s.stage === stage)[key] = false; return v; };
  for (const [stage, key] of [["intent-capture", "summaryConfirmed"], ["domain-design", "summaryConfirmed"], ["functional-design", "summaryConfirmed"], ["functional-design", "reviewPerformed"], ["infrastructure-design", "reviewPerformed"], ["intent-capture", "completed"]]) {
    assert.deepEqual(derive(lowered(stage, key)), { outcome: "UNKNOWN", reasonCodes: ["INPUT_UNOBSERVABLE"] }, `${stage}.${key}`);
  }
  assert.equal(derive().outcome, "PASS");
  const exempt = plan(); exempt.stages.find((s) => s.stage === "reverse-engineering").summaryConfirmed = false; assert.equal(derive(exempt).outcome, "PASS");
  assert.deepEqual(Object.keys(api.stageFloor(api.STAGE_DEFINITIONS[0])).sort(), ["completed", "review", "summary"]);
});
