// Exclusions: the declaration check (BR9) and the set difference from the resolved denominator (BR10). Pure: it reads no
// clock, environment, file or network. It is the one place that takes files out of the denominator and the required
// tests; the judge never sees an exclusion, only the two smaller lists. A failure never carries a path or a reason.
import { compareCodePoint, sortPaths } from "./order.mjs";
import { checkDecisionUrlFragment, checkOneLineSentence } from "./threshold.mjs";

// The keys an input element may have, and the kinds the resolution decides. Each is written here and nowhere else.
/** @public */
export const EXCLUSION_KEYS = Object.freeze(["path", "reason"]);
/** @public */
export const EXCLUSION_KINDS = Object.freeze(["source", "test", "both"]);

const [SOURCE, TEST, BOTH] = EXCLUSION_KINDS;
const failure = (reasonCode, field, detail) => ({ ok: false, failure: { reasonCode, field, detail } });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function checkPath(path, field) {
  if (typeof path === "string" && path !== "") return null;
  return failure("INPUT_FIELD_INVALID", field, `${field} must be a non-empty string.`);
}

// The form first (an object, only the known keys), then the missing keys, then the two values.
function checkElement(element, index) {
  const at = `exclusions[${index}]`;
  if (!isObject(element)) return failure("INPUT_FIELD_INVALID", at, `${at} must be an object.`);
  const unknown = Object.keys(element).filter((key) => !EXCLUSION_KEYS.includes(key)).sort(compareCodePoint)[0];
  if (unknown !== undefined) return failure("INPUT_FIELD_UNKNOWN", `${at}.${unknown}`, `${at} has a field this version does not accept: ${unknown}.`);
  const missing = EXCLUSION_KEYS.find((key) => !Object.hasOwn(element, key));
  if (missing !== undefined) return failure("INPUT_FIELD_MISSING", `${at}.${missing}`, `${at} has no ${missing}.`);
  const reasonField = `${at}.reason`;
  return checkPath(element.path, `${at}.path`) ?? checkOneLineSentence(element.reason, reasonField) ?? checkDecisionUrlFragment(element.reason, reasonField);
}

// The second and later appearance of a path, as written: no folding, no normalizing.
function checkRepeats(list) {
  const seen = new Set();
  for (let index = 0; index < list.length; index += 1) {
    if (seen.has(list[index].path)) return failure("INPUT_FIELD_INVALID", `exclusions[${index}].path`, `exclusions[${index}].path repeats an earlier path.`);
    seen.add(list[index].path);
  }
  return null;
}

// Omitted means none. Every element's form is checked, in order, before any repeat is looked for.
export function checkExclusions(value) {
  if (value === undefined) return { ok: true, exclusions: [] };
  if (!Array.isArray(value)) return failure("INPUT_FIELD_INVALID", "exclusions", "exclusions must be an array.");
  for (let index = 0; index < value.length; index += 1) {
    const problem = checkElement(value[index], index);
    if (problem !== null) return problem;
  }
  const repeat = checkRepeats(value);
  if (repeat !== null) return repeat;
  const reasons = new Map(value.map((element) => [element.path, element.reason]));
  return { ok: true, exclusions: sortPaths([...reasons.keys()]).map((path) => ({ path, reason: reasons.get(path) })) };
}

// source: only in the denominator; test: only in the required tests; both: in both lists.
function kindOf(path, sources, tests) {
  if (sources.has(path)) return tests.has(path) ? BOTH : SOURCE;
  return tests.has(path) ? TEST : null;
}

function decideKinds(exclusions, sources, tests) {
  const excluded = [];
  for (let index = 0; index < exclusions.length; index += 1) {
    const kind = kindOf(exclusions[index].path, sources, tests);
    if (kind === null) return failure("TARGET_UNRESOLVED", `exclusions[${index}].path`, "This exclusion is not a source file of the denominator or a required test file, by exact path.");
    excluded.push({ path: exclusions[index].path, reason: exclusions[index].reason, kind });
  }
  return { excluded };
}

const without = (paths, kinds, excluded) => {
  const removed = new Set(excluded.filter((e) => kinds.includes(e.kind)).map((e) => e.path));
  return paths.filter((path) => !removed.has(path));
};

// Every path must match a file by exact string. With no exclusions the lists come back as they are.
/** @public until resolve.mjs calls it (Step 7) */
export function subtractExclusions(denominatorPaths, requiredTestPaths, exclusions) {
  if (exclusions.length === 0) return { ok: true, denominatorPaths, requiredTestPaths, excluded: [] };
  const decided = decideKinds(exclusions, new Set(denominatorPaths), new Set(requiredTestPaths));
  if (decided.excluded === undefined) return decided;
  const remainingSources = without(denominatorPaths, [SOURCE, BOTH], decided.excluded);
  if (remainingSources.length === 0) return failure("TARGET_EMPTY", "exclusions", "The exclusions leave no file in the denominator.");
  const remainingTests = without(requiredTestPaths, [TEST, BOTH], decided.excluded);
  if (remainingTests.length === 0) return failure("TARGET_EMPTY", "exclusions", "The exclusions leave no required test file.");
  return { ok: true, denominatorPaths: remainingSources, requiredTestPaths: remainingTests, excluded: decided.excluded };
}
