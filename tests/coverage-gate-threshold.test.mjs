// The threshold exception check (BR6.1 to BR6.5). Every value here is fictional.
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THRESHOLD_HUNDREDTHS } from "../scripts/coverage-gate/judge.mjs";
import { DECISION_URL_MAX_LENGTH, DECISION_URL_SHAPE, RATIONALE_FORBIDDEN, RATIONALE_MAX_LENGTH, THRESHOLD_KEYS, checkThreshold } from "../scripts/coverage-gate/threshold.mjs";

const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const GOOD = { percent: 95, decisionUrl: URL_OK, rationale: "Example rationale for a lowered line." };
const withField = (key, value) => ({ ...GOOD, [key]: value });
const fails = (value) => {
  const r = checkThreshold(value);
  assert.equal(r.ok, false, JSON.stringify(value));
  return r.failure;
};
const where = (value) => [fails(value).reasonCode, fails(value).field];
const INVALID = (field) => ["INPUT_FIELD_INVALID", `threshold.${field}`];

test("a complete exception is accepted and the value becomes whole hundredths; the other two are kept as given", () => {
  const r = checkThreshold({ percent: 95.5, decisionUrl: URL_OK, rationale: "  Kept as written, with spaces and 日本語.  " });
  assert.equal(r.ok, true);
  assert.deepEqual(r.threshold, { percentHundredths: 9550, decisionUrl: URL_OK, rationale: "  Kept as written, with spaces and 日本語.  " });
});

test("the constants: 300 characters, five forbidden sequences, a 300-character URL limit, three allowed keys, a shape", () => {
  assert.equal(RATIONALE_MAX_LENGTH, 300);
  assert.equal(DECISION_URL_MAX_LENGTH, 300);
  assert.deepEqual([...RATIONALE_FORBIDDEN], ["::", "%0A", "%0D", "`", "|"]);
  assert.deepEqual([...THRESHOLD_KEYS], ["percent", "decisionUrl", "rationale"]);
  assert.ok(DECISION_URL_SHAPE.test(URL_OK));
  assert.throws(() => RATIONALE_FORBIDDEN.push("x"), TypeError);
});

test("a threshold that is not an object is refused as invalid, never read as no exception", () => {
  for (const value of [null, [], [GOOD], "95", 95, true, false, undefined]) assert.deepEqual(where(value), ["INPUT_FIELD_INVALID", "threshold"], String(value));
});

test("a missing key is named, and when several are missing the first in the order percent, decisionUrl, rationale is", () => {
  assert.deepEqual(where({}), ["INPUT_FIELD_MISSING", "threshold.percent"]);
  assert.deepEqual(where({ decisionUrl: URL_OK, rationale: "r" }), ["INPUT_FIELD_MISSING", "threshold.percent"]);
  assert.deepEqual(where({ percent: 95, rationale: "r" }), ["INPUT_FIELD_MISSING", "threshold.decisionUrl"]);
  assert.deepEqual(where({ percent: 95, decisionUrl: URL_OK }), ["INPUT_FIELD_MISSING", "threshold.rationale"]);
  assert.deepEqual(where({ percent: 95 }), ["INPUT_FIELD_MISSING", "threshold.decisionUrl"]);
});

test("a key other than the three is unknown; the first in code-point order is named; a missing key is reported before an unknown one", () => {
  assert.deepEqual(where({ ...GOOD, extra: 1 }), ["INPUT_FIELD_UNKNOWN", "threshold.extra"]);
  assert.deepEqual(where({ ...GOOD, zeta: 1, alpha: 1 }), ["INPUT_FIELD_UNKNOWN", "threshold.alpha"]);
  assert.deepEqual(where({ percent: 95, extra: 1 }), ["INPUT_FIELD_MISSING", "threshold.decisionUrl"]);
  for (const key of ["__proto__", "constructor", "prototype"]) {
    const parsed = JSON.parse(`{"percent":95,"decisionUrl":${JSON.stringify(URL_OK)},"rationale":"r","${key}":{"polluted":true}}`);
    assert.deepEqual(where(parsed), ["INPUT_FIELD_UNKNOWN", `threshold.${key}`], key);
  }
  assert.equal({}.polluted, undefined);
});

test("percent: 0 up to 99.99 with at most two decimals are accepted and become whole hundredths", () => {
  const cases = [[0, 0], [0.01, 1], [0.07, 7], [1, 100], [12.34, 1234], [50, 5000], [95.5, 9550], [99.9, 9990], [99.99, 9999]];
  for (const [percent, hundredths] of cases) {
    const r = checkThreshold(withField("percent", percent));
    assert.deepEqual([r.ok, r.threshold?.percentHundredths], [true, hundredths], String(percent));
  }
  assert.ok(Object.is(checkThreshold(withField("percent", -0)).threshold.percentHundredths, 0), "-0 is written as 0");
});

test("percent: the default line or more, below zero, more than two decimals, and anything that is not a number are refused", () => {
  const upper = DEFAULT_THRESHOLD_HUNDREDTHS / 100;
  const bad = [upper, upper + 0.01, 1000, -0.01, -1, 99.995, 95.123, 12.345, 1e400, -1e400, Number.NaN, Number.POSITIVE_INFINITY, "95", "", null, true, [95], {}, undefined];
  for (const percent of bad) assert.deepEqual(where(withField("percent", percent)), INVALID("percent"), String(percent));
  assert.equal(checkThreshold(withField("percent", upper - 0.01)).ok, true);
});

test("decisionUrl: an issue or pull request comment on github.com, exactly, is accepted", () => {
  const good = [
    "https://github.com/a/b/issues/1#issuecomment-1",
    "https://github.com/example-org/example-repo/pull/987654321012#issuecomment-123456789012",
    `https://github.com/${"a".repeat(39)}/${"b".repeat(100)}/issues/1#issuecomment-1`,
    "https://github.com/example-org/.github/issues/5#issuecomment-6",
    "https://github.com/example-org/my.repo_name-2/issues/5#issuecomment-6",
  ];
  for (const decisionUrl of good) assert.equal(checkThreshold(withField("decisionUrl", decisionUrl)).ok, true, decisionUrl);
});

test("decisionUrl: another host, scheme, form, number or surrounding text is refused", () => {
  const base = "https://github.com/example-org/example-repo";
  const bad = [
    "http://github.com/example-org/example-repo/issues/1#issuecomment-2",
    "HTTPS://github.com/example-org/example-repo/issues/1#issuecomment-2",
    "https://www.github.com/example-org/example-repo/issues/1#issuecomment-2",
    "https://github.example.com/example-org/example-repo/issues/1#issuecomment-2",
    "https://user@github.com/example-org/example-repo/issues/1#issuecomment-2",
    "https://github.com:443/example-org/example-repo/issues/1#issuecomment-2",
    `${base}/issues/1#issuecomment-2?tab=1`,
    `${base}/issues/1?tab=1#issuecomment-2`,
    `${base}/issues/1#issuecomment-2#x`,
    `${base}/issues/1#issuecomment-2/`,
    `${base}/issues/1#discussion_r2`,
    `${base}/issues/1#issue-2`,
    `${base}/issues/1`,
    `${base}/issues/1#issuecomment-`,
    `${base}/issues/#issuecomment-2`,
    `${base}/discussions/1#issuecomment-2`,
    `${base}/commit/1#issuecomment-2`,
    ` ${base}/issues/1#issuecomment-2`,
    `${base}/issues/1#issuecomment-2 `,
    `${base}/issues/1#issuecomment-2\n`,
    `${base}/issues/01#issuecomment-2`,
    `${base}/issues/0#issuecomment-2`,
    `${base}/issues/1#issuecomment-02`,
    `${base}/issues/1#issuecomment-0`,
    `${base}/issues/1234567890123#issuecomment-2`,
    `${base}/issues/1#issuecomment-1234567890123`,
    `https://github.com/${"a".repeat(40)}/example-repo/issues/1#issuecomment-2`,
    `https://github.com/example-org/${"b".repeat(101)}/issues/1#issuecomment-2`,
    "https://github.com/example_org/example-repo/issues/1#issuecomment-2",
    "https://github.com/example.org/example-repo/issues/1#issuecomment-2",
    "https://github.com/example-org/./issues/1#issuecomment-2",
    "https://github.com/example-org/../issues/1#issuecomment-2",
    "https://github.com//example-repo/issues/1#issuecomment-2",
    "https://github.com/example-org//issues/1#issuecomment-2",
    "", "github.com/a/b/issues/1#issuecomment-2", 12, null, ["x"], undefined,
  ];
  for (const decisionUrl of bad) assert.deepEqual(where(withField("decisionUrl", decisionUrl)), INVALID("decisionUrl"), String(decisionUrl));
});

test("decisionUrl: a URL past the 300-character limit is refused, and the longest URL the shape allows is within it", () => {
  const tooLong = `https://github.com/example-org/example-repo/issues/1#issuecomment-1${"0".repeat(DECISION_URL_MAX_LENGTH)}`;
  assert.ok(tooLong.length > DECISION_URL_MAX_LENGTH);
  assert.deepEqual(where(withField("decisionUrl", tooLong)), INVALID("decisionUrl"));
  assert.equal(checkThreshold(withField("decisionUrl", `https://github.com/${"a".repeat(39)}/${"b".repeat(100)}/pull/${"9".repeat(12)}#issuecomment-${"9".repeat(12)}`)).ok, true);
});

test("rationale: one line of 1 to 300 characters is accepted, counting code points, and is kept exactly as written", () => {
  for (const rationale of ["x", "あ".repeat(300), "😀".repeat(300), "a".repeat(299), "100% of the rest; see issue #12 (not a table)", "%0 and %0B and %20 are not forbidden", "colon : single is fine"]) {
    const r = checkThreshold(withField("rationale", rationale));
    assert.deepEqual([r.ok, r.threshold?.rationale], [true, rationale], rationale.slice(0, 20));
  }
  assert.equal(checkThreshold(withField("rationale", "a".repeat(RATIONALE_MAX_LENGTH))).ok, true);
});

test("rationale: too long, empty, blank, multi-line, control characters, command and table sequences are refused", () => {
  const bad = [
    "a".repeat(301), "あ".repeat(301), "😀".repeat(301), "", " ", "   ", "　", "\t", "a\nb", "a\rb", "a\r\nb", "a\tb", "a\u0000b", "a\u001fb", "a\u007fb",
    "x::warning::y", "::", "a%0Ab", "a%0ab", "a%0Db", "a%0db", "a%0A", "a`code`b", "`", "a | b", "|",
    123, null, true, ["x"], {}, undefined,
  ];
  for (const rationale of bad) assert.deepEqual(where(withField("rationale", rationale)), INVALID("rationale"), JSON.stringify(rationale));
});

test("a failure names the field in a plain one-line sentence that does not echo the offending text", () => {
  const secretLike = "leak::marker::abc";
  const f = fails(withField("rationale", secretLike));
  assert.ok(f.detail.length > 0 && !/[\r\n]/.test(f.detail));
  assert.ok(!f.detail.includes(secretLike) && !f.detail.includes("leak"));
  const u = fails(withField("decisionUrl", "https://example.invalid/leak-marker"));
  assert.ok(!u.detail.includes("leak-marker"));
  for (const value of [null, {}, withField("percent", "x"), withField("decisionUrl", "x"), withField("rationale", ""), { ...GOOD, extra: 1 }]) {
    const detail = fails(value).detail;
    assert.ok(typeof detail === "string" && detail.length > 0 && !/[\r\n]/.test(detail));
  }
});

test("the first failure is the only one reported: percent, then decisionUrl, then rationale", () => {
  assert.deepEqual(where({ percent: 100, decisionUrl: "x", rationale: "" }), INVALID("percent"));
  assert.deepEqual(where({ percent: 95, decisionUrl: "x", rationale: "" }), INVALID("decisionUrl"));
  assert.deepEqual(where({ percent: 95, decisionUrl: URL_OK, rationale: "" }), INVALID("rationale"));
});

test("very long values are refused in linear time, without a pattern search over them", () => {
  const started = Date.now();
  for (const value of [withField("decisionUrl", `https://github.com/${"a/".repeat(2_000_000)}`), withField("decisionUrl", "a".repeat(5_000_000)), withField("rationale", "a".repeat(5_000_000)), withField("rationale", "😀".repeat(2_000_000)), withField("rationale", " ".repeat(5_000_000))]) {
    assert.equal(checkThreshold(value).ok, false);
  }
  assert.ok(Date.now() - started < 3000, "five 5 MB values took far longer than a linear pass");
});

test("the check is pure: same input, same output; the input is not changed; the result does not share the input", () => {
  const input = { ...GOOD };
  const before = JSON.stringify(input);
  const first = checkThreshold(input);
  assert.deepEqual(checkThreshold(input), first);
  assert.equal(JSON.stringify(input), before);
  first.threshold.rationale = "changed afterwards";
  assert.equal(input.rationale, GOOD.rationale);
});
