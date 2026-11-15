// Fixed executable view of the adopted FD rules. Adapters never supply a policy path.
export const RULESET = "shirube-u1-functional-rules/1";
export const BUDGET = Object.freeze({ timeoutMs: 20000, totalTimeoutMs: 120000, maxRequests: 100, maxBytesPerResponse: 8000000, automaticRetries: 0 });
export const READY_POLICY = Object.freeze({ cutoffDate: "2026-11-06", timezone: "Asia/Tokyo", approvalKind: "stage-completion", cutoffInstant: "2026-11-05T15:00:00Z" });
export const POSITIVE_CHOICES = Object.freeze({ plan: Object.freeze(["Approve Plan"]), summary: Object.freeze(["Looks correct"]), "stage-completion": Object.freeze(["Approve", "Accept as-is"]) });
export const ASSURANCE = Object.freeze({ assurance: "record-and-current-content-consistency-only", engineAuthenticity: "not-verified-by-gate", ownerIdentity: "not-verified-by-gate", reviewerExecution: "not-verified-by-gate", authorization: "NONE" });
export const REASONS = Object.freeze(["REQUIRED_RECORD_MISSING", "READY_MISSING", "TARGET_MISMATCH", "ATTEMPT_MISMATCH", "ARTIFACT_SET_MISMATCH", "ARTIFACT_DIGEST_MISMATCH", "DESIGN_AUDIT_MISSING", "DESIGN_AUDIT_STALE", "DESIGN_AUDIT_BINDING_MISMATCH", "INPUT_UNOBSERVABLE", "UNSUPPORTED_SCHEMA", "DUPLICATE_RECORD", "RECORD_CONFLICT", "APPROVAL_DATE_UNKNOWN", "APPROVAL_DATE_CONFLICT", "LEGACY_READY_MISSING"]);
export const CHECKPOINT = "code-generation-submission";
export const PURPOSE = "ci-record-admission";
// Installed AI-DLC 2.11.1 stage bytes, observed before implementation. No private engine is shipped.
// Questions are approval evidence rather than mandatory content: public readbacks may replace private Qfiles.
const DEFINITIONS = [
  ["ideation", "intent-capture", "intent-statement stakeholder-map", "297e90ae4be4903dab50a11dbb33fe86d2b8f46f8b2125f877661c86356a5dc6", "aidlc-product-lead-agent"],
  ["ideation", "feasibility", "feasibility-assessment constraint-register raid-log", "682cbc9062bd92a5d9dd029c3a2d43bdf3595a0dac8a6d9e2e8e837ee2295129", null],
  ["ideation", "scope-definition", "scope-document intent-backlog", "75b0c62fdafae2adcc57166b751f6a45de5f83143d519de5029a70c22111ad7b", null],
  ["ideation", "team-formation", "team-assessment skill-matrix mob-composition", "f0363df73f7ae9662d64459f48e7159e14d1e19dc0d4d6f1741c5676dec940ba", null],
  ["ideation", "rough-mockups", "wireframes user-flow", "eaf0146bddd73685244fc2a0e873db45537c8c5c6f000af9bc8159aa440a4429", "aidlc-product-lead-agent"],
  ["ideation", "approval-handoff", "initiative-brief decision-log", "880bfab5b1313fc6bb1681672d3f04c002be7d3be2773e717dd9ede2ca9d8728", null],
  ["inception", "reverse-engineering", "business-overview architecture code-structure api-documentation component-inventory technology-stack dependencies code-quality-assessment reverse-engineering-timestamp", "bd74401a2ea14c06ac65049fda9edb8124edd80b2f1e71a31e8522dd04886d7f", null],
  ["inception", "practices-discovery", "team-practices discovered-rules evidence practices-discovery-timestamp", "36b667a966012faff3deae2a34ca28286d4c3d09831ba3af06b5c0433e82dec7", null],
  ["inception", "requirements-analysis", "requirements", "75cc35e04c988048acd1270ef563eef222b799418c3e224560b05403b95cd9ce", "aidlc-product-lead-agent"],
  ["inception", "user-stories", "stories personas user-stories-assessment traceability", "f9af7dba8d2f4d3b2ea72bdeaed8614a97ec772093545a2bbd36d37440e6716d", "aidlc-product-lead-agent"],
  ["inception", "refined-mockups", "mockups interaction-spec design-system-mapping accessibility-checklist", "c9b46401ed49344b1917d9dbdd98d0ee2b26b153fce306eeb021f71d0279a378", "aidlc-product-lead-agent"],
  ["inception", "domain-design", "components decisions traceability", "a59099a64db0f980ef18b1be7cbd391dffcf24c2120681a4c26df356c28b82ae", "aidlc-architecture-reviewer-agent"],
  ["inception", "units-generation", "unit-of-work unit-of-work-dependency unit-of-work-story-map traceability", "479dbf0c29e1304e28937d4f1275592218860188c42b60ebcb6b71e53d401b11", "aidlc-architecture-reviewer-agent"],
  ["inception", "contract-design", "contract-summary", "c4c66d5ba05d0f4485b1763255c85c1eaa9975c59f2d5165b99626f91c905b2b", "aidlc-architecture-reviewer-agent"],
  ["inception", "delivery-planning", "bolt-plan team-allocation risk-and-sequencing-rationale external-dependency-map", "011bfa98edac1134f986dec8e224ca0a1e3cf55e8677df654656aedaca093c91", null],
  ["construction", "functional-design", "entities rules functional-spec traceability", "b5a18e9737e81f827695a1f0a15613e5d2a56f5998755843d31198ca02e69e9b", "aidlc-architecture-reviewer-agent"],
  ["construction", "nfr-requirements", "performance-requirements security-requirements scalability-requirements reliability-requirements observability-requirements tech-stack-decisions traceability", "8b44eae72f917c36da1f8fb17a442125880c979b669404ef1d2527522b86aca1", "aidlc-architecture-reviewer-agent"],
  ["construction", "nfr-design", "performance-design security-design scalability-design reliability-design observability-design logical-components traceability", "b71893814edd4e2aae6c2761c875229444c584a006bc0845110dc2cd171b35ab", "aidlc-architecture-reviewer-agent"],
  ["construction", "infrastructure-design", "infrastructure-specification monitoring-design cicd-pipeline traceability", "d2c3a488673cd176fd0b13166d38089e9304c2b3059a0634a209c91e6acd8d69", "aidlc-architecture-reviewer-agent"],
  ["construction", "code-generation", "code-generation-plan unit-test-instructions code-summary traceability source-manifest", "4273ed491e99a176e97863a400bc7bab4a22c2337958820c64c012fd9a63da92", "aidlc-architecture-reviewer-agent"],
];
export const STAGE_DEFINITIONS = Object.freeze(DEFINITIONS.map(([phase, stage, names, sha256, reviewer]) => Object.freeze({ phase, stage, outputs: Object.freeze(names.split(" ").filter(Boolean)), sha256, reviewer })));
// Obligations no published table may lower (BR1.2): the fixed stage rules decide them, never the PR's own table.
// Stages after the current one are not asked for, and a dispatched pipeline stage has no summary confirmation.
const NO_SUMMARY_STAGES = Object.freeze(["reverse-engineering", "code-generation"]);
export const stageFloor = (definition) => ({
  completed: definition.phase !== "construction",
  summary: !NO_SUMMARY_STAGES.includes(definition.stage),
  review: definition.phase === "construction" && definition.stage !== "code-generation",
});
export function resolveProfile(purpose, checkpoint) {
  if (purpose !== PURPOSE || checkpoint !== CHECKPOINT) throw new Error("INPUT_UNOBSERVABLE: unsupported caller profile");
  return Object.freeze({ purpose: PURPOSE, checkpoint: CHECKPOINT, rulesetVersion: RULESET });
}
export const isSelfReference = (path, recordPath) => path === recordPath;
export function readAcceptedPlan({ testingContract, summary, unitText, boltText, target, reference, baselineReference }) {
  // A readable view inside the planned code-summary artifact, separate from evidence records.
  // These labels describe observations; they never become native stage state or a new schema.
  const scope = testingContract?.scope, projectType = testingContract?.project_type;
  const rows = [...summary.matchAll(/^\| ([\w-]+) \| ([^|\r\n]+) \| (true|false) \| (true|false) \| (true|false) \| (true|false) \|$/gm)];
  const escaped = target.unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const unitRows = [...unitText.matchAll(/^\| (U\d+) \| ([\w-]+) \|[^\n]*\| (service|embedded|packaging|library|ui|spec) \|/gm)];
  const kind = unitRows.find((row) => row[2] === target.unit)?.[3];
  if (!unitRows.length || !new RegExp(`\\| B1 \\| U1 / ${escaped} \\|`).test(boltText)) return null;
  return { scope, projectType, kind, firstUnit: unitRows[0][2] === target.unit, reference, baselineReference,
    stages: rows.map((m) => ({ stage: m[1], attempt: m[2], completed: m[3] === "true", summaryConfirmed: m[4] === "true", planApproved: m[5] === "true", reviewPerformed: m[6] === "true" })) };
}
function changedArtifactSlot(policy, path, target) {
  const root = `aidlc/spaces/${target.space}/intents/${target.intent}/`;
  const stage = policy.slots.find((s) => s.artifactPaths.some((p) => path.startsWith(p.slice(0, p.lastIndexOf("/") + 1))));
  const current = policy.slots.find((s) => s.stage === "code-generation");
  const code = /^(?:scripts\/sds\/ci-record-[\w-]+\.mjs|scripts\/sds\/gate\.mjs|scripts\/hygiene\/audit-admission\.mjs|tests\/ci-record-[\w-]+\.mjs|docs\/audit\/[\w.-]+\.json|\.github\/workflows\/ci-record-admission\.yml)$/.test(path);
  const readback = path === `${root}construction/${target.unit}/design-approval-records.md`;
  const slot = stage ?? ((code || readback) ? current : null);
  if (!slot || (!code && !readback && !/\.(?:md|json)$/.test(path))) throw new Error("INPUT_UNOBSERVABLE");
  return slot;
}
export function extendChangedArtifacts(policy, paths, target) {
  for (const path of paths) {
    if (path === policy.recordPath || policy.requiredArtifacts.some((x) => x.path === path)) continue;
    const slot = changedArtifactSlot(policy, path, target);
    slot.artifactPaths.push(path); policy.requiredArtifacts.push({ path, stage: slot.stage, unit: slot.unit, attempt: slot.attempt });
  }
  return policy;
}
export function compareArtifactPaths(required, paths) {
  const expected = required.map((x) => x.path);
  return new Set(paths).size === paths.length && expected.length === paths.length && expected.every((p) => paths.includes(p));
}
const invalidPlan = () => ({ outcome: "UNKNOWN", reasonCodes: ["INPUT_UNOBSERVABLE"] });
function profilePlan(plan) {
  return plan && plan.scope === "feature" && plan.projectType === "brownfield" && plan.kind === "service" && plan.firstUnit === true;
}
function planMatches(plan) {
  if (!profilePlan(plan)) return false;
  if (!plan.reference || !plan.baselineReference || plan.exclude !== undefined || !Array.isArray(plan.stages)) return false;
  if (!compareArtifactPaths(STAGE_DEFINITIONS.map((d) => ({ path: d.stage })), plan.stages.map((s) => s.stage))) return false;
  if (STAGE_DEFINITIONS.some((d) => { const floor = stageFloor(d), row = plan.stages.find((s) => s.stage === d.stage); return (floor.completed && row.completed !== true) || (floor.summary && row.summaryConfirmed !== true) || (floor.review && row.reviewPerformed !== true); })) return false;
  return plan.stages.every((s) => typeof s.attempt === "string" && s.attempt.trim() && [s.completed, s.summaryConfirmed, s.reviewPerformed, s.planApproved].every((x) => typeof x === "boolean"));
}
function stageSlot(definition, entry, target, root) {
  const unit = definition.phase === "construction" ? target.unit : null;
  const prefix = definition.stage === "reverse-engineering" ? `aidlc/spaces/${target.space}/codekb/${target.workspace}` : `${root}/${definition.phase}/${unit ? `${unit}/` : ""}${definition.stage}`;
  const artifactPaths = definition.outputs.map((name) => `${prefix}/${name}.${["traceability", "source-manifest"].includes(name) ? "json" : "md"}`);
  const kinds = [entry.planApproved && "plan", entry.summaryConfirmed && "summary", entry.completed && "stage-completion"].filter(Boolean);
  return { stage: definition.stage, unit, attempt: entry.attempt, artifactPaths, kinds, reviewer: definition.reviewer, reviewPerformed: entry.reviewPerformed };
}
export function derivePolicy({ target, checkpoint, plan }) {
  resolveProfile(PURPOSE, checkpoint);
  if (!planMatches(plan)) return invalidPlan();
  const root = `aidlc/spaces/${target.space}/intents/${target.intent}`;
  const slots = STAGE_DEFINITIONS.map((d) => stageSlot(d, plan.stages.find((s) => s.stage === d.stage), target, root));
  const current = slots.find((s) => s.stage === target.stage);
  if (!current || target.stage !== "code-generation" || current.attempt !== target.attempt || !current.kinds.includes("plan") || current.kinds.includes("stage-completion")) return invalidPlan();
  const requiredArtifacts = slots.flatMap((s) => s.artifactPaths.map((path) => ({ path, stage: s.stage, unit: s.unit, attempt: s.attempt })));
  return { outcome: "PASS", reasonCodes: [], rulesetVersion: RULESET, checkpoint, stageGraphRef: "public:aidlc-2.11.1-stage-contracts", acceptedPlanRef: plan.reference,
    stageDefinitions: STAGE_DEFINITIONS, slots, requiredArtifacts,
    requiredApprovals: slots.flatMap((s) => s.kinds.map((kind) => ({ stage: s.stage, unit: s.unit, attempt: s.attempt, kind }))),
    completedStages: slots.filter((s) => s.kinds.includes("stage-completion")), readyPolicy: READY_POLICY,
    recordPath: `${root}/construction/${target.unit}/code-generation/pr-records.json` };
}
