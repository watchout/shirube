// The wording of the threshold exception and the mode in the outputs. Pure: it takes the one result document and returns
// lines of text. It decides nothing about the run; the document already says whether an exception was used and which mode ran.
// Every phrase for them is written here and nowhere else. Free text (the decision address, the rationale) goes through the
// same sanitizing as file names, even though the input check has already refused anything dangerous.
import { RECORD_ONLY } from "./judge.mjs";
import { summaryPath } from "./sanitize.mjs";

const RECORD_ONLY_LINE = "Record-only mode: this result is recorded and does not fail the job.";
const RECORD_ONLY_NOTICE = "Recorded only, the job is not failed.";
const NOT_OBSERVABLE_NOTE = "(計測不能)";

const usedException = (document) => document.thresholdException !== null;
const isRecordOnly = (document) => document.mode === RECORD_ONLY;
const isUnobservableRun = (document) => document.outcome === "unobservable" && document.inputFailure === null;

// The first lines of the summary, before the heading, when the threshold was lowered.
export function headLines(document, defaultPercent) {
  if (!usedException(document)) return [];
  return [`Threshold lowered to ${document.effectiveThresholdPercent}% (default ${defaultPercent}%) by decision exception.`, ""];
}

export function thresholdCell(document, defaultPercent) {
  if (document.effectiveThresholdPercent === null) return "not applied";
  const lowered = usedException(document) ? ` (lowered from ${defaultPercent}%)` : "";
  return `${document.effectiveThresholdPercent}%${lowered}`;
}

// A recorded-only run that could not be measured says so in both languages; every other heading stays as it was.
export function refineHeading(document, heading) {
  return isRecordOnly(document) && isUnobservableRun(document) ? `${heading} ${NOT_OBSERVABLE_NOTE}` : heading;
}

export function modeLines(document) {
  return isRecordOnly(document) ? ["", RECORD_ONLY_LINE] : [];
}

export function exceptionSection(document) {
  if (!usedException(document)) return [];
  const { decisionUrl, claimedPercent, rationale } = document.thresholdException;
  return ["", "Threshold exception:", `- Decision: ${summaryPath(decisionUrl)}`, `- Claimed value: ${claimedPercent}%`, `- Rationale: ${summaryPath(rationale)}`];
}

// The kind of annotation, from the document alone. An input failure and a failing enforce run are errors; a lowered
// threshold is never a plain notice; a record-only result that is not a match is a warning because the job goes on.
export function noticeLevel(document) {
  if (document.inputFailure !== null) return "error";
  if (document.outcome === "match") return usedException(document) ? "warning" : "notice";
  return isRecordOnly(document) ? "warning" : "error";
}

// The outcome word of the notice. Only a recorded-only run that could not be measured changes it.
export function outcomeLabel(document) {
  return isRecordOnly(document) && isUnobservableRun(document) ? `not observable ${NOT_OBSERVABLE_NOTE}` : document.outcome;
}

// Sentences added after the notice's own text. A plain enforce run with no exception adds nothing, so its notice is as it was.
// The rationale is never in a notice; the decision address is, because it was checked to be a plain GitHub address.
export function noticeExtras(document) {
  const parts = [];
  if (isUnobservableRun(document) && (usedException(document) || isRecordOnly(document))) parts.push(`Threshold ${document.effectiveThresholdPercent}%.`);
  if (usedException(document)) parts.push(`(threshold lowered by exception: ${document.thresholdException.decisionUrl})`);
  if (isRecordOnly(document) && document.outcome !== "match") parts.push(RECORD_ONLY_NOTICE);
  return parts.map((part) => ` ${part}`).join("");
}
