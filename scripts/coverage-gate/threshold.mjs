// Checks the threshold exception of the input: a lowered line, the decision it rests on, and why. Pure: it takes the
// parsed value and returns a normalized exception or the first failure. It reads no clock, environment, file or network.
// It checks the shape of the decision URL only; whether that decision exists, who wrote it, and whether its text allows
// the value are not checked here and not checked by the gate at all (the independent audit checks them).
import { DEFAULT_THRESHOLD_HUNDREDTHS } from "./judge.mjs";
import { compareCodePoint } from "./order.mjs";

// The exception's constants. Each is written here and nowhere else.
/** @public */
export const RATIONALE_MAX_LENGTH = 300;
/** @public */
export const RATIONALE_FORBIDDEN = Object.freeze(["::", "%0A", "%0D", "`", "|"]);
/** @public */
export const DECISION_URL_MAX_LENGTH = 300;
/** @public */
export const THRESHOLD_KEYS = Object.freeze(["percent", "decisionUrl", "rationale"]);
// An issue or pull request comment on github.com, exactly. No query, no other fragment, no user, no port.
/** @public */
export const DECISION_URL_SHAPE = /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/(?!\.{1,2}\/)[A-Za-z0-9._-]{1,100}\/(?:issues|pull)\/[1-9][0-9]{0,11}#issuecomment-[1-9][0-9]{0,11}$/u;

const HUNDREDTHS_PER_PERCENT = 100;
const LOWEST_CONTROL_AFTER = 0x20;
const DELETE_CHARACTER = 0x7f;

const invalid = (field, detail) => ({ ok: false, failure: { reasonCode: "INPUT_FIELD_INVALID", field: `threshold.${field}`, detail } });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const toHundredths = (percent) => Math.round(percent * HUNDREDTHS_PER_PERCENT) + 0;

function checkObject(value) {
  if (isObject(value)) return null;
  return { ok: false, failure: { reasonCode: "INPUT_FIELD_INVALID", field: "threshold", detail: "threshold must be an object." } };
}

// The first missing key in the fixed order, then the first unknown key in code-point order.
function checkKeys(value) {
  const missing = THRESHOLD_KEYS.find((key) => !Object.hasOwn(value, key));
  if (missing !== undefined) return { ok: false, failure: { reasonCode: "INPUT_FIELD_MISSING", field: `threshold.${missing}`, detail: `threshold has no ${missing}.` } };
  const unknown = Object.keys(value).filter((key) => !THRESHOLD_KEYS.includes(key)).sort(compareCodePoint)[0];
  if (unknown === undefined) return null;
  return { ok: false, failure: { reasonCode: "INPUT_FIELD_UNKNOWN", field: `threshold.${unknown}`, detail: `threshold has a field this version does not accept: ${unknown}.` } };
}

// A number with at most two decimals, from zero up to but not including the default line.
function checkPercent(percent) {
  const upper = DEFAULT_THRESHOLD_HUNDREDTHS / HUNDREDTHS_PER_PERCENT;
  const readable = typeof percent === "number" && Number.isFinite(percent) && percent >= 0 && percent < upper;
  if (readable && toHundredths(percent) / HUNDREDTHS_PER_PERCENT === percent) return null;
  return invalid("percent", "threshold.percent must be a number from 0 up to, but not including, the default line, with at most two decimals.");
}

// The length is judged first, so the shape pattern never runs over a long value.
function isDecisionUrl(text) {
  return typeof text === "string" && text.length <= DECISION_URL_MAX_LENGTH && DECISION_URL_SHAPE.test(text);
}

function checkDecisionUrl(decisionUrl) {
  if (isDecisionUrl(decisionUrl)) return null;
  return invalid("decisionUrl", "threshold.decisionUrl must be the exact address of a GitHub issue or pull request comment.");
}

// True when the text has more than `limit` code points. Stops after limit + 1, so a huge value costs a bounded amount.
function exceeds(text, limit) {
  const characters = text[Symbol.iterator]();
  for (let counted = 0; counted <= limit; counted += 1) if (characters.next().done) return false;
  return true;
}

function hasControlCharacter(text) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < LOWEST_CONTROL_AFTER || code === DELETE_CHARACTER) return true;
  }
  return false;
}

function failureOf(field, detail) {
  return { ok: false, failure: { reasonCode: "INPUT_FIELD_INVALID", field, detail } };
}

// The sentence rule, shared by the threshold rationale and the exclusion reason: the caller names the field in a failure.
/** @public */
export function checkOneLineSentence(text, field) {
  const problem = failureOf(field, `${field} must be one line of text that is not blank, within the length limit, without control characters or command and table sequences.`);
  if (typeof text !== "string" || text.length > RATIONALE_MAX_LENGTH * 2 || exceeds(text, RATIONALE_MAX_LENGTH)) return problem;
  if (text.trim() === "" || hasControlCharacter(text)) return problem;
  const lower = text.toLowerCase();
  return RATIONALE_FORBIDDEN.some((sequence) => lower.includes(sequence.toLowerCase())) ? problem : null;
}

// Whether a sentence has at least one decision URL as a piece between ASCII spaces. Run it after the sentence rule, so the text is short.
/** @public */
export function checkDecisionUrlFragment(text, field) {
  if (typeof text === "string" && text.split(" ").some(isDecisionUrl)) return null;
  return failureOf(field, `${field} must contain the exact address of a GitHub issue or pull request comment, with a space on each side of it.`);
}

export function checkThreshold(value) {
  const problem = checkObject(value) ?? checkKeys(value) ?? checkPercent(value.percent) ?? checkDecisionUrl(value.decisionUrl) ?? checkOneLineSentence(value.rationale, "threshold.rationale");
  if (problem !== null) return problem;
  return { ok: true, threshold: { percentHundredths: toHundredths(value.percent), decisionUrl: value.decisionUrl, rationale: value.rationale } };
}
