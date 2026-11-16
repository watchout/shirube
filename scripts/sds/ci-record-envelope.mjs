import { isDeepStrictEqual } from "node:util";
import { ASSURANCE, RULESET, CHECKPOINT, READY_POLICY } from "./ci-record-policy.mjs";
import { fields, need, validateTarget, validateRef, validatePublicPath, unique, isSha256, isGitOid } from "./ci-record-input.mjs";
import { parseRecordJson } from "./ci-record-input.mjs";
import { aggregateConditions, sameTarget, approvalInstant } from "./ci-record-admission.mjs";

function remainingChecks(value) {
  fields(value, ["code", "stage", "unit", "attempt", "approvalRecordRef", "approvedAt", "revisitOnReopen"]);
  need(value.code === "LEGACY_READY_MISSING" && value.revisitOnReopen === true);
  validateRef(value.stage); validateRef(value.attempt); validateRef(value.approvalRecordRef); if (value.unit !== null) validateRef(value.unit);
  const instant = approvalInstant({ approvedAt: value.approvedAt, approvedAtFormat: /^\d{4}-\d{2}-\d{2}$/.test(value.approvedAt) ? "date" : "timestamp" });
  need(instant !== null && instant < Date.parse(READY_POLICY.cutoffInstant));
}
function assessmentChecks(a) {
  fields(a, ["assessmentId", "target", "rulesetVersion", "observationRefs", "sensorResultRefs", "applicableConditions", "conditions", "outcome", "reasons", "artifactSetDigest", "knownRemaining", ...Object.keys(ASSURANCE)]);
  validateRef(a.assessmentId); validateTarget(a.target); need(a.rulesetVersion === RULESET && isSha256(a.artifactSetDigest));
  for (const [key, value] of Object.entries(ASSURANCE)) need(a[key] === value);
  for (const c of Object.values(a.conditions)) fields(c, ["outcome", "reasonCodes"]);
  need(aggregateConditions(a.conditions) === a.outcome);
  need(isDeepStrictEqual([...new Set(Object.values(a.conditions).flatMap((c) => c.reasonCodes))], a.reasons));
  fields(a.applicableConditions, ["database", "permissions", "contracts", "security"]);
  for (const category of Object.values(a.applicableConditions)) {
    fields(category, ["outcome", "evidencePaths"]); need(["APPLIES", "NOT_APPLICABLE", "UNKNOWN"].includes(category.outcome));
    unique(category.evidencePaths); need(category.evidencePaths.length > 0); category.evidencePaths.forEach(validatePublicPath);
  }
  need(Array.isArray(a.sensorResultRefs)); a.sensorResultRefs.forEach(validateRef);
  unique(a.observationRefs); need(a.observationRefs.length > 0); a.observationRefs.forEach(validateRef);
  need(Array.isArray(a.knownRemaining)); a.knownRemaining.forEach(remainingChecks);
}
function scopeChecks(scope, assessment) {
  fields(scope, ["repo", "pr", "head", "base", "target", "checkpoint", "rulesetVersion", "artifactSetDigest"]);
  validateTarget(scope.target); need(sameTarget(scope.target, assessment.target) && scope.repo === scope.target.repo);
  need(Number.isSafeInteger(scope.pr) && scope.pr > 0 && isGitOid(scope.head) && isGitOid(scope.base));
  need(scope.checkpoint === CHECKPOINT && scope.rulesetVersion === assessment.rulesetVersion && scope.artifactSetDigest === assessment.artifactSetDigest);
}
function availabilityChecks(o, outcome) {
  need(["observed", "unavailable"].includes(o.availability) && Number.isFinite(Date.parse(o.observedAt)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(o.observedAt));
  fields(o.issuerObservation, ["publisherAuthentication"]); need(o.issuerObservation.publisherAuthentication === ASSURANCE.engineAuthenticity);
  if (o.availability === "observed") { validateRef(o.observedContentRef); need(isSha256(o.observedDigest)); }
  else need(outcome !== "PASS" && o.observedContentRef === null && o.observedDigest === null);
}
function prChecks(value, scope) {
  const p = fields(value, ["repo", "number", "head", "base", "changedPaths", "complete"]);
  need(p.repo === scope.repo && p.number === scope.pr && p.head === scope.head && p.base === scope.base && typeof p.complete === "boolean");
  unique(p.changedPaths); p.changedPaths.forEach(validatePublicPath);
}
function completenessChecks(o, outcome) {
  fields(o.completeness, ["complete", "files", "blobs", "tree"], ["commits"]);
  need(typeof o.completeness.complete === "boolean" && typeof o.completeness.tree === "boolean");
  for (const key of ["files", "blobs", ...(o.completeness.commits !== undefined ? ["commits"] : [])]) need(Number.isSafeInteger(o.completeness[key]) && o.completeness[key] >= 0);
  if (outcome === "PASS") need(o.prObservation.complete && o.completeness.complete && o.completeness.tree);
}
function observationChecks(o, scope, outcome) {
  fields(o, ["observationId", "sourceRef", "issuerObservation", "target", "versionRef", "observedContentRef", "observedDigest", "availability", "observedAt", "prObservation", "completeness"]);
  validateRef(o.observationId); validateRef(o.sourceRef); validateTarget(o.target);
  need(sameTarget(o.target, scope.target) && o.versionRef === scope.rulesetVersion);
  availabilityChecks(o, outcome); prChecks(o.prObservation, scope); completenessChecks(o, outcome);
}
export function validateEnvelope(value, source) {
  fields(value, ["head", "outcome", "reasons", "authorization", "assessment", "evaluationScope", "observations"]);
  assessmentChecks(value.assessment); scopeChecks(value.evaluationScope, value.assessment);
  need(value.head === value.evaluationScope.head && value.outcome === value.assessment.outcome && value.authorization === ASSURANCE.authorization && isDeepStrictEqual(value.reasons, value.assessment.reasons));
  unique(value.observations, (o) => o.observationId); value.observations.forEach((o) => observationChecks(o, value.evaluationScope, value.outcome));
  need(value.assessment.observationRefs.every((ref) => value.observations.some((o) => o.observationId === ref)));
  need(source && isDeepStrictEqual(value, source), "RECORD_CONFLICT");
  return value;
}
export function encodeEnvelope({ assessment, evaluationScope, observations }) {
  const value = structuredClone({ head: evaluationScope.head, outcome: assessment.outcome, reasons: assessment.reasons, authorization: assessment.authorization, assessment, evaluationScope, observations });
  return validateEnvelope(value, value);
}
export function decodeEnvelope(bytes, original) { return validateEnvelope(parseRecordJson(bytes), original); }
