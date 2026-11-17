// Builds the one result document and renders every output from it: the JSON file, the job summary, the notice line and
// the output values. Pure: no clock, environment or file. The set of codes comes from the judge; this file only words them.
import { DEFAULT_THRESHOLD_HUNDREDTHS, SCHEMA_VERSION } from "./judge.mjs";
import { compareCodePoint } from "./order.mjs";
import { exceptionSection, headLines, modeLines, noticeExtras, noticeLevel, outcomeLabel, refineHeading, thresholdCell } from "./report-exception.mjs";
import { exclusionNotice, exclusionSection, headWithExclusions } from "./report-exclusions.mjs";
import { sanitizeNotice, sanitizeSummaryText, summaryPath } from "./sanitize.mjs";

export const SUMMARY_LIST_LIMIT = 20;

// One fixed sentence per reason code. No sentence carries a file or key name; those travel in named lists.
export const MESSAGES = Object.freeze({
  INPUT_UNREADABLE: "The input file could not be read as a JSON object.",
  INPUT_VERSION_INVALID: "The input schema version is missing or not supported.",
  INPUT_FIELD_UNKNOWN: "The input has a field this version does not accept.",
  INPUT_FIELD_MISSING: "A required input field is missing.",
  INPUT_FIELD_INVALID: "An input field has a value that is not allowed.",
  INPUT_SHAPE_UNSUPPORTED: "The input shape is not supported by this version.",
  TARGET_UNRESOLVED: "A declared target is not a tracked file or a directory holding tracked files.",
  TARGET_EMPTY: "The declared targets resolve to no tracked file of the needed kind.",
  UNMEASURED_FILES: "Declared files have no coverage record, so they were not measured.",
  TESTS_NOT_RUN: "Required test files did not run.",
  BELOW_THRESHOLD: "Line coverage is below the required threshold.",
  MEASUREMENT_FAILED: "The measurement did not finish in a state that can be read.",
  TEST_FAILED: "A test failed, so the coverage ratio cannot be trusted.",
  MEASUREMENT_TIMED_OUT: "The measurement ran past its deadline and was stopped.",
  MEASUREMENT_BUDGET_EXCEEDED: "The measurement ran past its total budget and was stopped.",
  NO_RECORDS: "No coverage line was counted for the declared files.",
  CHILD_PROCESS_NOT_COUNTABLE: "This Node version is not known to count lines run in child processes.",
  TEMP_CLEANUP_FAILED: "The temporary directory could not be removed.",
  ENTRY_ARGUMENTS_INVALID: "The command line arguments are not in the required form.",
  ENTRY_ENVIRONMENT_INVALID: "The run environment is not usable.",
  ENTRY_OUTPUT_FAILED: "An output could not be written.",
});

const HEADINGS = Object.freeze({ match: "Match", mismatch: "Mismatch", unobservable: "Not observable" });

// hundredths of a percent -> "NN.NN", on integers only, so a shortfall never shows as 100.00.
/** @public */
export function formatPercent(hundredths) {
  const whole = (hundredths - (hundredths % 100)) / 100;
  return `${whole}.${String(hundredths % 100).padStart(2, "0")}`;
}

const orNull = (value, make) => (value === null ? null : make(value));
const DEFAULT_PERCENT = formatPercent(DEFAULT_THRESHOLD_HUNDREDTHS);
const exceptionField = ({ decisionUrl, claimedHundredths, rationale }) => ({ decisionUrl, claimedPercent: formatPercent(claimedHundredths), rationale });

function judgmentFields(verdict) {
  return {
    outcome: verdict.outcome,
    shouldFail: verdict.shouldFail,
    mode: verdict.mode,
    reasonCodes: [...verdict.reasonCodes],
    coveredLines: verdict.coveredLines,
    totalLines: verdict.totalLines,
    lineRatioPercent: orNull(verdict.lineRatioHundredths, formatPercent),
    effectiveThresholdPercent: formatPercent(verdict.effectiveThresholdHundredths),
    thresholdException: orNull(verdict.thresholdException, exceptionField),
  };
}

function denominatorField(declaredTargets, denominatorPaths, verdict) {
  const resolvedFileCount = denominatorPaths.length;
  const unmeasured = verdict.unmeasuredPaths;
  return { declaredTargets: [...declaredTargets], resolvedFileCount, measuredFileCount: unmeasured === null ? null : resolvedFileCount - unmeasured.length };
}

// The exclusions are the ones the resolution decided, with their kind, copied and put in code-point order of the path.
const exclusionsField = (excluded) => excluded.map(({ path, reason, kind }) => ({ path, reason, kind })).sort((a, b) => compareCodePoint(a.path, b.path));

export function buildDocument({ runId, declaredTargets, denominatorPaths, measurement, verdict, excluded }) {
  const exclusions = exclusionsField(excluded);
  return {
    schemaVersion: SCHEMA_VERSION,
    runId,
    ...judgmentFields(verdict),
    measurementDefinition: { ...measurement.measurementDefinition },
    denominator: denominatorField(declaredTargets, denominatorPaths, verdict),
    exclusions,
    exclusionCount: exclusions.length,
    unmeasuredPaths: verdict.unmeasuredPaths && [...verdict.unmeasuredPaths],
    notRunPaths: verdict.notRunPaths && [...verdict.notRunPaths],
    testFailurePaths: [...measurement.testFailurePaths],
    perFile: verdict.perFile && verdict.perFile.map((file) => ({ ...file })),
    recordsSha256: verdict.recordsSha256,
    measurementAttempt: { ...measurement.attempt },
    inputFailure: null,
  };
}

export function buildInputFailureDocument({ runId, failure }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    runId,
    outcome: "unobservable",
    shouldFail: true,
    mode: null,
    reasonCodes: [failure.reasonCode],
    coveredLines: null,
    totalLines: null,
    lineRatioPercent: null,
    effectiveThresholdPercent: null,
    thresholdException: null,
    measurementDefinition: null,
    denominator: null,
    exclusions: [],
    exclusionCount: 0,
    unmeasuredPaths: null,
    notRunPaths: null,
    testFailurePaths: null,
    perFile: null,
    recordsSha256: null,
    measurementAttempt: null,
    inputFailure: { reasonCode: failure.reasonCode, field: failure.field, detail: failure.detail },
  };
}

export function renderJson(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function listSection(title, paths) {
  if (paths === null || paths.length === 0) return [];
  const shown = paths.slice(0, SUMMARY_LIST_LIMIT).map((path) => `- ${summaryPath(path)}`);
  const rest = paths.length - SUMMARY_LIST_LIMIT;
  return ["", `${title} (${paths.length}):`, ...shown, ...(rest > 0 ? [`- and ${rest} more (the full list is in the result file)`] : [])];
}

function inputFailureLines(failure) {
  if (failure === null) return [];
  return ["", `Input problem in ${summaryPath(failure.field)}: ${sanitizeSummaryText(failure.detail)}`];
}

export function renderSummary(document) {
  const ratio = document.lineRatioPercent === null ? "not measured" : `${document.lineRatioPercent}%`;
  return [
    ...headWithExclusions(headLines(document, DEFAULT_PERCENT), document),
    `## Coverage gate: ${refineHeading(document, HEADINGS[document.outcome])}`,
    "",
    "| Item | Value |",
    "|---|---|",
    `| Line coverage | ${ratio} |`,
    `| Threshold | ${thresholdCell(document, DEFAULT_PERCENT)} |`,
    `| Mode | ${document.mode ?? "not applied"} |`,
    `| Exclusions | ${document.exclusionCount} |`,
    ...modeLines(document),
    ...exceptionSection(document),
    ...exclusionSection(document, SUMMARY_LIST_LIMIT),
    "",
    "Reasons:",
    ...document.reasonCodes.map((code) => `- ${code}: ${MESSAGES[code]}`),
    ...inputFailureLines(document.inputFailure),
    ...listSection("Unmeasured files", document.unmeasuredPaths),
    ...listSection("Required tests that did not run", document.notRunPaths),
    ...listSection("Test files that failed", document.testFailurePaths),
    "",
  ].join("\n");
}

function noticeText(document) {
  if (document.outcome === "match") return `Coverage gate: match, ${document.lineRatioPercent}% of ${document.effectiveThresholdPercent}% required.`;
  const ratio = document.lineRatioPercent === null ? "" : ` Line coverage ${document.lineRatioPercent}% of ${document.effectiveThresholdPercent}% required.`;
  return `Coverage gate: ${outcomeLabel(document)} (${document.reasonCodes.join(", ")}).${ratio}`;
}

export function renderNotice(document) {
  return `::${noticeLevel(document)}::${sanitizeNotice(`${noticeText(document)}${noticeExtras(document)}${exclusionNotice(document)}`)}`;
}

export function renderOutputs(document) {
  const judged = document.inputFailure === null;
  const value = (v) => (judged && v !== null ? String(v) : "");
  const lines = [
    ["outcome", document.outcome],
    ["should-fail", String(document.shouldFail)],
    ["mode", value(document.mode)],
    ["line-ratio-percent", value(document.lineRatioPercent)],
    ["effective-threshold-percent", value(document.effectiveThresholdPercent)],
    ["exclusion-count", value(document.exclusionCount)],
    ["schema-version", String(document.schemaVersion)],
  ];
  return `${lines.map(([name, text]) => `${name}=${text}`).join("\n")}\n`;
}
