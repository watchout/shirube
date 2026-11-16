// The judge: the one place that decides what a measurement means. Pure: it takes the declared files, the required
// tests and a MeasurementResult, and returns a verdict. It reads no clock, random source, environment or file.
// Everything is recomputed from the observed line records; no declared or tool-reported ratio is used.
import { createHash } from "node:crypto";
import { sortPaths } from "./order.mjs";

export const SCHEMA_VERSION = 1;
// The modes. "enforce" fails the job on anything but a match; "record-only" records the same result and never fails.
// The names are written here and nowhere else.
const ENFORCE = "enforce";
export const RECORD_ONLY = "record-only";
export const MODES = Object.freeze([ENFORCE, RECORD_ONLY]);
export const DEFAULT_MODE = MODES[0];
// The name U3 used for the only mode there was; it is the default.
/** @public */
export const MODE = MODES[0];
/** @public */
export const OUTCOMES = Object.freeze(["match", "mismatch", "unobservable"]);
/** @public */
export const DEFAULT_THRESHOLD_HUNDREDTHS = 10000;

// Every reason code and the class it belongs to. The set and its meaning live here and nowhere else.
/** @public */
export const REASON_CODES = Object.freeze({
  INPUT_UNREADABLE: "input",
  INPUT_VERSION_INVALID: "input",
  INPUT_FIELD_UNKNOWN: "input",
  INPUT_FIELD_MISSING: "input",
  INPUT_FIELD_INVALID: "input",
  INPUT_SHAPE_UNSUPPORTED: "input",
  TARGET_UNRESOLVED: "input",
  TARGET_EMPTY: "input",
  UNMEASURED_FILES: "mismatch",
  TESTS_NOT_RUN: "mismatch",
  BELOW_THRESHOLD: "mismatch",
  MEASUREMENT_FAILED: "unobservable",
  TEST_FAILED: "unobservable",
  MEASUREMENT_TIMED_OUT: "unobservable",
  MEASUREMENT_BUDGET_EXCEEDED: "unobservable",
  NO_RECORDS: "unobservable",
  CHILD_PROCESS_NOT_COUNTABLE: "unobservable",
  TEMP_CLEANUP_FAILED: "unobservable",
  ENTRY_ARGUMENTS_INVALID: "entry",
  ENTRY_ENVIRONMENT_INVALID: "entry",
  ENTRY_OUTPUT_FAILED: "entry",
});

const CAUSE_TO_CODE = Object.freeze({
  failed: "MEASUREMENT_FAILED",
  test_failed: "TEST_FAILED",
  timed_out: "MEASUREMENT_TIMED_OUT",
  budget_exceeded: "MEASUREMENT_BUDGET_EXCEEDED",
  no_records: "NO_RECORDS",
  child_process_not_countable: "CHILD_PROCESS_NOT_COUNTABLE",
});

// What the caller asked for, fixed before anything is measured: the mode, the line the comparison uses, and the
// exception (if any) that lowered it. An exception is recorded even when the run turns out unobservable or fully covered.
function settings(mode, threshold) {
  if (!MODES.includes(mode)) throw new TypeError("mode is not one of the known modes");
  if (threshold === null) return { mode, effectiveThresholdHundredths: DEFAULT_THRESHOLD_HUNDREDTHS, thresholdException: null };
  const { percentHundredths, decisionUrl, rationale } = threshold;
  return { mode, effectiveThresholdHundredths: percentHundredths, thresholdException: { decisionUrl, claimedHundredths: percentHundredths, rationale } };
}

// The one place that decides whether the job fails: anything but a match, and only in enforce mode.
const failsJob = (outcome, mode) => outcome !== "match" && mode === ENFORCE;

function unobservableVerdict(reasonCodes, { mode, effectiveThresholdHundredths, thresholdException }) {
  return {
    outcome: "unobservable",
    shouldFail: failsJob("unobservable", mode),
    mode,
    reasonCodes,
    coveredLines: null,
    totalLines: null,
    lineRatioHundredths: null,
    effectiveThresholdHundredths,
    thresholdException,
    unmeasuredPaths: null,
    notRunPaths: null,
    perFile: null,
    recordsSha256: null,
  };
}

// The records that count: those of declared files that were measured, grouped by file, lines in numeric order.
function groupTargetRecords(records, denominator, measured) {
  const byPath = new Map();
  for (const { path, lineNumber, hitCount } of records) {
    if (!denominator.has(path) || !measured.has(path)) continue;
    if (!byPath.has(path)) byPath.set(path, []);
    byPath.get(path).push([lineNumber, hitCount]);
  }
  for (const lines of byPath.values()) lines.sort((a, b) => a[0] - b[0]);
  return byPath;
}

function summarize(byPath) {
  const perFile = [];
  const hash = createHash("sha256");
  for (const path of sortPaths([...byPath.keys()])) {
    const lines = byPath.get(path);
    perFile.push({ path, coveredLines: lines.filter(([, hits]) => hits >= 1).length, totalLines: lines.length });
    for (const [lineNumber, hitCount] of lines) hash.update(`${path}\t${lineNumber}\t${hitCount}\n`);
  }
  const sum = (key) => perFile.reduce((n, file) => n + file[key], 0);
  return { perFile, coveredLines: sum("coveredLines"), totalLines: sum("totalLines"), recordsSha256: hash.digest("hex") };
}

// floor(a / b) on integers, with no floating-point division.
function floorDiv(a, b) {
  return (a - (a % b)) / b;
}

function setDifference(wanted, present) {
  const have = new Set(present);
  return sortPaths([...new Set(wanted)].filter((path) => !have.has(path)));
}

function unobservableCodes(measurement) {
  const codes = [];
  if (measurement.kind !== "records") codes.push(CAUSE_TO_CODE[measurement.cause] ?? "MEASUREMENT_FAILED");
  if (measurement.cleanupFailed) codes.push("TEMP_CLEANUP_FAILED");
  return codes;
}

export function judge({ denominatorPaths, requiredTestPaths, measurement, mode = DEFAULT_MODE, threshold = null }) {
  const chosen = settings(mode, threshold);
  const codes = unobservableCodes(measurement);
  if (codes.length > 0) return unobservableVerdict(codes, chosen);
  const denominator = new Set(denominatorPaths);
  const measured = new Set(measurement.measuredPaths);
  const { perFile, coveredLines, totalLines, recordsSha256 } = summarize(groupTargetRecords(measurement.records, denominator, measured));
  if (totalLines === 0) return unobservableVerdict(["NO_RECORDS"], chosen);
  const unmeasuredPaths = setDifference(denominatorPaths, measurement.measuredPaths);
  const notRunPaths = setDifference(requiredTestPaths, measurement.testFilesRun);
  const reasonCodes = [];
  if (unmeasuredPaths.length > 0) reasonCodes.push("UNMEASURED_FILES");
  if (notRunPaths.length > 0) reasonCodes.push("TESTS_NOT_RUN");
  if (coveredLines * 10000 < totalLines * chosen.effectiveThresholdHundredths) reasonCodes.push("BELOW_THRESHOLD");
  const outcome = reasonCodes.length === 0 ? "match" : "mismatch";
  return {
    outcome,
    shouldFail: failsJob(outcome, chosen.mode),
    mode: chosen.mode,
    reasonCodes,
    coveredLines,
    totalLines,
    lineRatioHundredths: floorDiv(coveredLines * 10000, totalLines),
    effectiveThresholdHundredths: chosen.effectiveThresholdHundredths,
    thresholdException: chosen.thresholdException,
    unmeasuredPaths,
    notRunPaths,
    perFile,
    recordsSha256,
  };
}
