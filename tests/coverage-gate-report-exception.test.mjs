// The wording of the threshold exception and the mode in the outputs (BR8.2 to BR8.4). Every value here is fictional.
import assert from "node:assert/strict";
import test from "node:test";
import { exceptionSection, headLines, modeLines, noticeExtras, noticeLevel, outcomeLabel, refineHeading, thresholdCell } from "../scripts/coverage-gate/report-exception.mjs";

const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const SUCCESS_WORDS = /\b(?:pass(?:ed|es)?|ok|success(?:ful(?:ly)?)?)\b/iu;
const EXCEPTION = { decisionUrl: URL_OK, claimedPercent: "95.00", rationale: "Example rationale for a lowered line." };
const doc = (over = {}) => ({ outcome: "mismatch", mode: "enforce", inputFailure: null, thresholdException: null, effectiveThresholdPercent: "100.00", ...over });
const lowered = (over = {}) => doc({ thresholdException: EXCEPTION, effectiveThresholdPercent: "95.00", ...over });

test("a lowered threshold is announced in the first lines, before any heading; no exception gives no lines", () => {
  assert.deepEqual(headLines(doc(), "100.00"), []);
  assert.deepEqual(headLines(lowered(), "100.00"), ["Threshold lowered to 95.00% (default 100.00%) by decision exception.", ""]);
  assert.deepEqual(headLines(lowered({ outcome: "unobservable" }), "100.00"), headLines(lowered(), "100.00"));
});

test("the threshold cell shows the applied value, says when it was lowered from the default, and says not applied for an input failure", () => {
  assert.equal(thresholdCell(doc(), "100.00"), "100.00%");
  assert.equal(thresholdCell(lowered(), "100.00"), "95.00% (lowered from 100.00%)");
  assert.equal(thresholdCell(doc({ effectiveThresholdPercent: null }), "100.00"), "not applied");
});

test("the heading changes only for record-only and unobservable: it adds the Japanese note and stays a non-success heading", () => {
  assert.equal(refineHeading(doc({ outcome: "unobservable", mode: "record-only" }), "Not observable"), "Not observable (計測不能)");
  for (const [outcome, mode] of [["unobservable", "enforce"], ["mismatch", "record-only"], ["mismatch", "enforce"], ["match", "record-only"], ["match", "enforce"], ["unobservable", null]]) {
    assert.equal(refineHeading(doc({ outcome, mode }), "Heading"), "Heading", `${outcome} ${mode}`);
  }
});

test("record-only adds one line after the table that says the result is recorded and does not fail the job", () => {
  assert.deepEqual(modeLines(doc({ mode: "record-only" })), ["", "Record-only mode: this result is recorded and does not fail the job."]);
  for (const mode of ["enforce", null]) assert.deepEqual(modeLines(doc({ mode })), [], String(mode));
  assert.doesNotMatch(modeLines(doc({ mode: "record-only" })).join("\n"), SUCCESS_WORDS);
});

test("the exception section lists the decision, the claimed value and the rationale, and is absent without an exception", () => {
  assert.deepEqual(exceptionSection(doc()), []);
  assert.deepEqual(exceptionSection(lowered()), ["", "Threshold exception:", `- Decision: \`${URL_OK}\``, "- Claimed value: 95.00%", "- Rationale: `Example rationale for a lowered line.`"]);
  for (const outcome of ["match", "mismatch", "unobservable"]) assert.equal(exceptionSection(lowered({ outcome })).length, 5, outcome);
});

test("the section makes free text harmless even if it got past the input check: control characters, backticks and line breaks", () => {
  const evil = lowered({ thresholdException: { ...EXCEPTION, decisionUrl: "https://github.com/a/b/issues/1#issuecomment-2\u0001`x", rationale: "line one\nline two\r`tick`|pipe\u0085" } });
  const lines = exceptionSection(evil);
  assert.equal(lines.length, 5);
  assert.ok(lines.every((line) => !/[\r\n\u0000-\u001f\u0085]/u.test(line)));
  assert.ok(lines[2].startsWith("- Decision: `") && lines[2].endsWith("`") && !lines[2].slice(13, -1).includes("`"));
  assert.ok(lines[4].startsWith("- Rationale: `") && lines[4].endsWith("`") && !lines[4].slice(14, -1).includes("`"));
});

test("the notice kind follows the table: input failure error, match without exception notice, match with exception warning, not a match: enforce error and record-only warning", () => {
  const cases = [
    [doc({ outcome: "unobservable", mode: null, inputFailure: { reasonCode: "INPUT_FIELD_INVALID" } }), "error"],
    [doc({ outcome: "match" }), "notice"], [doc({ outcome: "match", mode: "record-only" }), "notice"],
    [lowered({ outcome: "match" }), "warning"], [lowered({ outcome: "match", mode: "record-only" }), "warning"],
    [doc({ outcome: "mismatch" }), "error"], [doc({ outcome: "unobservable" }), "error"], [lowered({ outcome: "mismatch" }), "error"],
    [doc({ outcome: "mismatch", mode: "record-only" }), "warning"], [doc({ outcome: "unobservable", mode: "record-only" }), "warning"], [lowered({ outcome: "unobservable", mode: "record-only" }), "warning"],
  ];
  for (const [document, kind] of cases) assert.equal(noticeLevel(document), kind, JSON.stringify([document.outcome, document.mode, document.thresholdException !== null]));
});

test("the notice sentences: the plain U3 run adds nothing; the exception adds its words and the URL, never the rationale; record-only says recorded only", () => {
  assert.equal(noticeExtras(doc()), "");
  assert.equal(noticeExtras(doc({ outcome: "match" })), "");
  assert.equal(noticeExtras(lowered({ outcome: "match" })), ` (threshold lowered by exception: ${URL_OK})`);
  assert.equal(noticeExtras(lowered({ outcome: "mismatch" })), ` (threshold lowered by exception: ${URL_OK})`);
  assert.equal(noticeExtras(doc({ outcome: "mismatch", mode: "record-only" })), " Recorded only, the job is not failed.");
  assert.equal(noticeExtras(doc({ outcome: "match", mode: "record-only" })), "");
  assert.equal(noticeExtras(doc({ outcome: "unobservable", mode: "record-only" })), " Threshold 100.00%. Recorded only, the job is not failed.");
  assert.equal(noticeExtras(lowered({ outcome: "unobservable" })), ` Threshold 95.00%. (threshold lowered by exception: ${URL_OK})`);
  for (const document of [lowered(), lowered({ mode: "record-only" })]) assert.ok(!noticeExtras(document).includes(EXCEPTION.rationale));
  assert.doesNotMatch(noticeExtras(doc({ outcome: "mismatch", mode: "record-only" })), SUCCESS_WORDS);
});

test("the outcome word in the notice changes only for record-only and unobservable", () => {
  assert.equal(outcomeLabel(doc({ outcome: "unobservable", mode: "record-only" })), "not observable (計測不能)");
  for (const [outcome, mode] of [["unobservable", "enforce"], ["mismatch", "record-only"], ["match", "record-only"], ["unobservable", null]]) assert.equal(outcomeLabel(doc({ outcome, mode })), outcome, `${outcome} ${mode}`);
});
