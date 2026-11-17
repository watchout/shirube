// Checks the input JSON and returns a normalized input or the first failure. Pure: it gets the file's text, not a path.
// The checks run in a fixed order; the first failure is the one reported.
import { checkExclusions } from "./exclusions.mjs";
import { DEFAULT_MODE, MODES } from "./judge.mjs";
import { compareCodePoint } from "./order.mjs";
import { checkThreshold } from "./threshold.mjs";

/** @public */
export const DEFAULT_DEADLINE_SECONDS = 600;
/** @public */
export const DEFAULT_TOTAL_BUDGET_SECONDS = 900;
const TEST_FILE_PATTERN = /\.test\.(?:js|mjs|cjs)$/u;
const KNOWN_TOP = new Set(["schemaVersion", "shape", "denominator", "testTargets", "deadlineSeconds", "totalBudgetSeconds", "threshold", "mode", "exclusions"]);
const KNOWN_DENOMINATOR = new Set(["targets"]);
const SHAPE = "node-builtin";

// A test file is recognized by the pattern at the end of its name, which is the same as testing its basename.
export function isTestFile(path) {
  return TEST_FILE_PATTERN.test(path);
}

const failure = (reasonCode, field, detail) => ({ ok: false, failure: { reasonCode, field, detail } });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNonEmptyStringList = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item !== "");

function parseObject(text) {
  if (text === null) return null;
  try {
    const value = JSON.parse(text);
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

function firstUnknownKey(doc) {
  const unknown = Object.keys(doc).filter((key) => !KNOWN_TOP.has(key)).map((key) => key);
  if (isObject(doc.denominator)) {
    for (const key of Object.keys(doc.denominator)) if (!KNOWN_DENOMINATOR.has(key)) unknown.push(`denominator.${key}`);
  }
  return unknown.sort(compareCodePoint)[0] ?? null;
}

function checkShape(doc) {
  if (doc.shape === undefined) return failure("INPUT_FIELD_MISSING", "shape", "The input has no shape.");
  if (doc.shape !== SHAPE) {
    const shown = typeof doc.shape === "string" ? doc.shape : "(not a string)";
    return failure("INPUT_SHAPE_UNSUPPORTED", "shape", `The shape "${shown}" is not supported; the supported shape is ${SHAPE}.`);
  }
  return null;
}

function checkTargets(doc) {
  if (doc.denominator === undefined || (isObject(doc.denominator) && doc.denominator.targets === undefined)) {
    return failure("INPUT_FIELD_MISSING", "denominator.targets", "The input does not declare the files to measure.");
  }
  if (!isObject(doc.denominator)) return failure("INPUT_FIELD_INVALID", "denominator", "denominator must be an object.");
  if (!isNonEmptyStringList(doc.denominator.targets)) {
    return failure("INPUT_FIELD_INVALID", "denominator.targets", "denominator.targets must be a list of one or more non-empty strings.");
  }
  if (doc.testTargets === undefined) return failure("INPUT_FIELD_MISSING", "testTargets", "The input does not declare the tests to run.");
  if (!isNonEmptyStringList(doc.testTargets)) {
    return failure("INPUT_FIELD_INVALID", "testTargets", "testTargets must be a list of one or more non-empty strings.");
  }
  return null;
}

function checkLimit(doc, name, fallback) {
  if (doc[name] === undefined) return { value: fallback };
  if (!Number.isSafeInteger(doc[name]) || doc[name] < 1) return { problem: failure("INPUT_FIELD_INVALID", name, `${name} must be an integer of 1 or more.`) };
  return { value: doc[name] };
}

// The mode must be exactly one of the known modes; leaving it out means the default. Nothing else is read as a mode.
function checkMode(doc) {
  if (doc.mode === undefined) return { value: DEFAULT_MODE };
  if (typeof doc.mode !== "string" || !MODES.includes(doc.mode)) return { problem: failure("INPUT_FIELD_INVALID", "mode", "mode must be one of the known modes.") };
  return { value: doc.mode };
}

// No threshold means no exception. One that is given must pass whole; a failed exception is never dropped or replaced.
function checkException(doc) {
  if (doc.threshold === undefined) return { value: null };
  const checked = checkThreshold(doc.threshold);
  return checked.ok ? { value: checked.threshold } : { problem: checked };
}

// The exclusions list: omitted is none. A failed list is never dropped or replaced by none.
function checkExcluded(doc) {
  const checked = checkExclusions(doc.exclusions);
  return checked.ok ? { value: checked.exclusions } : { problem: checked };
}

// The time limits, then the mode, then the exception, then the exclusions, in that order. The first problem is the one returned.
function checkSettings(doc) {
  const deadline = checkLimit(doc, "deadlineSeconds", DEFAULT_DEADLINE_SECONDS);
  const total = deadline.problem ? deadline : checkLimit(doc, "totalBudgetSeconds", DEFAULT_TOTAL_BUDGET_SECONDS);
  const mode = total.problem ? total : checkMode(doc);
  const exception = mode.problem ? mode : checkException(doc);
  const excluded = exception.problem ? exception : checkExcluded(doc);
  if (excluded.problem) return excluded;
  return { deadlineSeconds: deadline.value, totalBudgetSeconds: total.value, mode: mode.value, threshold: exception.value, exclusions: excluded.value };
}

export function checkInput(text) {
  const doc = parseObject(text);
  if (doc === null) return failure("INPUT_UNREADABLE", "$", "The input could not be read as a JSON object.");
  if (doc.schemaVersion !== 1) return failure("INPUT_VERSION_INVALID", "schemaVersion", "schemaVersion must be the integer 1.");
  const unknown = firstUnknownKey(doc);
  if (unknown !== null) return failure("INPUT_FIELD_UNKNOWN", unknown, `The input has a field this version does not accept: ${unknown}.`);
  const early = checkShape(doc) ?? checkTargets(doc);
  if (early !== null) return early;
  const settings = checkSettings(doc);
  if (settings.problem) return settings.problem;
  return {
    ok: true,
    input: {
      schemaVersion: 1,
      shape: SHAPE,
      declaredTargets: [...doc.denominator.targets],
      testTargets: [...doc.testTargets],
      ...settings,
    },
  };
}
