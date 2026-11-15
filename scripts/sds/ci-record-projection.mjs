// Pure, prepublication mapping of already-authorized native inputs. No file/log reader or issuer.
import { POSITIVE_CHOICES, STAGE_DEFINITIONS } from "./ci-record-policy.mjs";
import { nonempty, parseRecordJson, validateProjection, validateRef, validateTarget } from "./ci-record-input.mjs";

function sameStage(fields, target) {
  return fields?.Stage === target.stage && (fields.Unit ?? null) === target.unit;
}
function planReceiptMatches(input) {
  const { receipt: r, target } = input;
  // Native intent UUID and runFloor are opaque; their authorized mapping is supplied, never generated.
  return nonempty(input.nativeIntentId) && r.intentId === input.nativeIntentId && r.targetId === (target.unit === null ? "stage:code-generation" : `unit:${target.unit}`) && r.runFloor === target.attempt && ["approved", "generation"].includes(r.status);
}
function receiptMatches(input) {
  const { receipt: r, target, kind } = input;
  if (r?.version !== 1 || r.skipped !== undefined) return false;
  if (kind === "plan") return planReceiptMatches(input);
  return r.stage === target.stage && r.unit === target.unit && r.attempt === target.attempt;
}
function stagePlanChoice(input) {
  const q = input.planQuestion, definition = STAGE_DEFINITIONS.find((d) => d.stage === input.target.stage);
  if (!q || q.kind !== "plan" || q.stageContractSha256 !== definition?.sha256 || q.recordRef !== input.recordRef) return null;
  validateTarget(q.target);
  const matches = Object.keys(input.target).every((key) => q.target[key] === input.target[key]);
  return matches && q.offeredChoices?.includes(q.choice) && q.choice === input.native.fields.Details ? q.choice : null;
}
function recordedChoice(input) {
  const { kind, native, receipt } = input, fields = native.fields;
  const event = kind === "plan" ? "PLAN_APPROVAL_RECORDED" : "SUMMARY_CONFIRMATION_RECORDED";
  const checkpoint = kind === "plan" ? "plan-approval" : "summary-confirmation";
  if (native.event !== event || fields.Checkpoint !== checkpoint || !receiptMatches(input)) return null;
  return fields.Details === receipt.choice ? receipt.choice : null;
}
function completionChoice(input) {
  const { native, offeredChoices } = input, choice = native.fields["User Input"];
  return native.event === "GATE_APPROVED" && offeredChoices?.includes(choice) ? choice : null;
}
function checkpointChoice(input) {
  const { kind, native } = input, fields = native?.fields;
  if (!sameStage(fields, input.target) || [true, "true"].includes(fields.Autonomous)) return null;
  if (kind === "stage-completion") return completionChoice(input);
  // A general answer alone cannot approve: other-stage planning also needs its fixed contract/question view.
  if (kind === "plan" && input.target.stage !== "code-generation" && native.event === "QUESTION_ANSWERED") return stagePlanChoice(input);
  return recordedChoice(input);
}
export function projectApproval(input) {
  validateTarget(input.target); validateRef(input.recordRef);
  if (input.planEnabled === false || !Object.hasOwn(POSITIVE_CHOICES, input.kind)) return null;
  const choice = checkpointChoice(input);
  if (!POSITIVE_CHOICES[input.kind].includes(choice)) return null;
  const approval = { kind: input.kind, choice, recordRef: input.recordRef };
  if (input.kind === "stage-completion") {
    validateRef(input.approvalRecordRef);
    if (typeof input.native.recordedAt !== "string") return null;
    Object.assign(approval, { approvedAt: input.native.recordedAt, approvedAtFormat: "timestamp", approvalRecordRef: input.approvalRecordRef });
  }
  return approval;
}
export function readProjection(bytes) { return validateProjection(parseRecordJson(bytes)); }
