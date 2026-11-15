// The single pure decision core. All identities, times and observations are explicit arguments.
import { ASSURANCE, POSITIVE_CHOICES, READY_POLICY, RULESET, REASONS, compareArtifactPaths } from "./ci-record-policy.mjs";
import { fields, need, validateTarget, validateRef, validateProjection, unique, isGitOid } from "./ci-record-input.mjs";
import { artifactSetDigest } from "./ci-record-evidence.mjs";
import { evaluateDesignAudit } from "./ci-record-design-audit.mjs";

const slotKey = (s) => JSON.stringify([s.stage, s.unit, s.attempt]);
export const sameTarget = (a, b) => ["repo", "workspace", "space", "intent", "unit", "stage", "attempt"].every((key) => a?.[key] === b?.[key]);
const condition = (outcome, codes = []) => ({ outcome, reasonCodes: [...new Set(codes)] });
const samePaths = (a, b) => compareArtifactPaths(a.map((path) => ({ path })), b);
const requiredStage = (records, slot) => records.stages.find((s) => slotKey(s) === slotKey(slot));
function approvalMatches(approval, kind, slot) {
  return approval && POSITIVE_CHOICES[kind].includes(approval.choice) && (approval.choice !== "Accept as-is" || slot.acceptAsIsOffered === true);
}
function recordCondition(input) {
  const { records, policy, target } = input, codes = [];
  if (!sameTarget(records.target, target) || records.rulesetVersion !== RULESET) codes.push("TARGET_MISMATCH");
  for (const slot of policy.slots) {
    const stage = requiredStage(records, slot);
    if (!stage) { codes.push(records.stages.some((s) => s.stage === slot.stage && s.unit === slot.unit) ? "ATTEMPT_MISMATCH" : "REQUIRED_RECORD_MISSING"); continue; }
    if (!samePaths(slot.artifactPaths, stage.artifactPaths)) codes.push("ARTIFACT_SET_MISMATCH");
    for (const kind of slot.kinds) {
      const approval = stage.approvals.find((a) => a.kind === kind);
      if (!approvalMatches(approval, kind, slot)) codes.push("REQUIRED_RECORD_MISSING");
    }
  }
  return condition(codes.length ? "FAIL" : "PASS", codes);
}
function strictDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
function strictTimestamp(value) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!m || !strictDate(m[1])) return false;
  if ([m[2], m[3], m[4]].some((x) => Number(x) >= 60) || Number(m[2]) >= 24) return false;
  return m[5] === "Z" || (Number(m[6]) < 24 && Number(m[7]) < 60);
}
export function approvalInstant({ approvedAt: value, approvedAtFormat: format }) {
  if (format === "date" && strictDate(value)) return Date.parse(`${value}T00:00:00+09:00`);
  if (format === "timestamp" && strictTimestamp(value)) return Date.parse(value);
  return null;
}
function currentReview(stage, slot, artifacts) {
  const review = stage.review;
  if (!review || !slot.reviewer || review.reviewer !== slot.reviewer || review.verdict !== "READY") return false;
  if (!samePaths(slot.artifactPaths, review.artifactPaths)) return false;
  const subset = artifacts.filter((e) => slot.artifactPaths.includes(e.path));
  return subset.length > 0 && artifactSetDigest(subset) === review.artifactSetDigest;
}
function approvalDate(approval, stage, evidence, now) {
  const observed = evidence.find((e) => e.recordRef === approval.approvalRecordRef && slotKey(e) === slotKey(stage));
  if (!observed) return { code: "APPROVAL_DATE_UNKNOWN" };
  if (observed.approvedAt !== approval.approvedAt || observed.approvedAtFormat !== approval.approvedAtFormat || approval.recordRef !== approval.approvalRecordRef) return { code: "APPROVAL_DATE_CONFLICT" };
  const instant = approvalInstant(approval);
  if (instant === null) return { code: "APPROVAL_DATE_UNKNOWN" };
  return instant > Date.parse(now) ? { code: "APPROVAL_DATE_CONFLICT" } : { instant };
}
function readySlot(stage, policy, records) {
  const exact = policy.slots.find((s) => slotKey(s) === slotKey(stage));
  if (exact) return { slot: exact, historical: false };
  const current = records.stages.find((s) => s.stage === stage.stage && s.unit === stage.unit && s.attempt !== stage.attempt && stage.approvals.some((a) => a.approvalRecordRef === s.reopenedFromApprovalRef));
  const slot = current && policy.slots.find((s) => slotKey(s) === slotKey(current));
  return { slot, historical: true };
}
function readyForStage(stage, input) {
  const fail = [], unknown = [], knownRemaining = [], { slot, historical } = readySlot(stage, input.policy, input.records);
  if (!slot) return { fail, unknown: ["INPUT_UNOBSERVABLE"], knownRemaining };
  let required = !historical && (slot.reviewPerformed || stage.reopenedFromApprovalRef !== undefined);
  const reviewed = currentReview(stage, slot, input.artifacts);
  for (const approval of stage.approvals.filter((a) => a.kind === "stage-completion")) {
    const date = approvalDate(approval, stage, input.approvalEvidence, input.now);
    if (date.code) { unknown.push(date.code); continue; }
    if (date.instant >= Date.parse(READY_POLICY.cutoffInstant)) required = true;
    else if (!reviewed) knownRemaining.push({ code: "LEGACY_READY_MISSING", stage: stage.stage, unit: stage.unit, attempt: stage.attempt, approvalRecordRef: approval.approvalRecordRef, approvedAt: approval.approvedAt, revisitOnReopen: true });
  }
  if (required && !reviewed) fail.push("READY_MISSING");
  return { fail, unknown, knownRemaining };
}
function readyCondition(input) {
  const stages = input.records.stages.map((stage) => readyForStage(stage, input));
  const fail = stages.flatMap((s) => s.fail), unknown = stages.flatMap((s) => s.unknown), knownRemaining = stages.flatMap((s) => s.knownRemaining);
  for (const e of input.approvalEvidence) if (!input.records.stages.some((s) => slotKey(s) === slotKey(e) && s.approvals.some((a) => a.approvalRecordRef === e.recordRef))) unknown.push("APPROVAL_DATE_CONFLICT");
  const outcome = fail.length ? "FAIL" : unknown.length ? "UNKNOWN" : "PASS";
  return { condition: condition(outcome, [...fail, ...unknown]), knownRemaining };
}
function digestCondition(input, actualDigest) {
  const { records, policy, artifacts } = input, codes = [];
  if (!compareArtifactPaths(policy.requiredArtifacts, records.artifacts.map((e) => e.path))) codes.push("ARTIFACT_SET_MISMATCH");
  if (records.artifactSetDigest !== actualDigest || records.artifacts.some((e) => !artifacts.some((a) => a.path === e.path && a.bytes === e.bytes && a.sha256 === e.sha256))) codes.push("ARTIFACT_DIGEST_MISMATCH");
  return condition(codes.length ? "FAIL" : "PASS", codes);
}
export function aggregateConditions(conditions) {
  need(Object.keys(conditions).length === 4 && ["records", "ready", "digests", "designAudit"].every((k) => conditions[k]));
  for (const [key, c] of Object.entries(conditions)) {
    need(["PASS", "FAIL", "UNKNOWN", ...(key === "designAudit" ? ["NOT_APPLICABLE"] : [])].includes(c.outcome));
    need(Array.isArray(c.reasonCodes) && c.reasonCodes.every((code) => REASONS.includes(code)) && (!["FAIL", "UNKNOWN"].includes(c.outcome) || c.reasonCodes.length > 0));
  }
  return Object.values(conditions).some((c) => c.outcome === "FAIL") ? "FAIL" : Object.values(conditions).some((c) => c.outcome === "UNKNOWN") ? "UNKNOWN" : "PASS";
}
function inputChecks(input) {
  fields(input, ["target", "assessmentId", "now", "policy", "artifacts", "records", "prObservation", "observations", "approvalEvidence", "protectedCategories", "designAuditObservation"]);
  validateTarget(input.target); validateRef(input.assessmentId); validateProjection(input.records);
  need(input.policy?.outcome === "PASS" && input.policy.rulesetVersion === RULESET && input.policy.slots.length > 0, "INPUT_UNOBSERVABLE");
  need(Number.isFinite(Date.parse(input.now)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(input.now));
  const pr = input.prObservation;
  need(pr.repo === input.target.repo && Number.isSafeInteger(pr.number) && pr.number > 0 && isGitOid(pr.head) && isGitOid(pr.base), "INPUT_UNOBSERVABLE");
  need(compareArtifactPaths(input.policy.requiredArtifacts, input.artifacts.map((e) => e.path)), "INPUT_UNOBSERVABLE");
  unique(input.observations, (o) => o.observationId); need(input.observations.length > 0); input.observations.forEach((o) => validateRef(o.observationId));
  need(Array.isArray(input.approvalEvidence));
}
export function assessRecords(input) {
  inputChecks(input);
  const actualDigest = artifactSetDigest(input.artifacts), ready = readyCondition(input);
  const observation = input.designAuditObservation;
  const designAudit = observation?.stale ? condition("FAIL", ["DESIGN_AUDIT_STALE"]) : observation?.availability === "unavailable" ? condition("UNKNOWN", ["INPUT_UNOBSERVABLE"]) : evaluateDesignAudit({ ...observation, categories: input.protectedCategories, artifacts: observation?.artifacts ?? input.artifacts, target: input.target, prObservation: input.prObservation, now: input.now });
  const conditions = { records: recordCondition(input), ready: ready.condition, digests: digestCondition(input, actualDigest), designAudit };
  if (input.prObservation.complete !== true) conditions.records = condition("UNKNOWN", ["INPUT_UNOBSERVABLE"]);
  const reasons = [...new Set(Object.values(conditions).flatMap((c) => c.reasonCodes))];
  return { assessmentId: input.assessmentId, target: structuredClone(input.target), rulesetVersion: RULESET, observationRefs: input.observations.map((o) => o.observationId), sensorResultRefs: [], applicableConditions: structuredClone(input.protectedCategories),
    conditions, outcome: aggregateConditions(conditions), reasons, artifactSetDigest: actualDigest, knownRemaining: ready.knownRemaining, ...ASSURANCE };
}
