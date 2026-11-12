import assert from "node:assert/strict";
import test from "node:test";
import { REASON_CODES, judge } from "../scripts/coverage-gate/judge.mjs";
import { MESSAGES, SUMMARY_LIST_LIMIT, buildDocument, buildInputFailureDocument, formatPercent, renderJson, renderNotice, renderOutputs, renderSummary } from "../scripts/coverage-gate/report.mjs";

const DOCUMENT_KEYS = ["schemaVersion", "runId", "outcome", "shouldFail", "mode", "reasonCodes", "coveredLines", "totalLines", "lineRatioPercent", "effectiveThresholdPercent", "thresholdException", "measurementDefinition", "denominator", "exclusions", "exclusionCount", "unmeasuredPaths", "notRunPaths", "testFailurePaths", "perFile", "recordsSha256", "measurementAttempt", "inputFailure"];
const NULLED = ["coveredLines", "totalLines", "lineRatioPercent", "unmeasuredPaths", "notRunPaths", "perFile", "recordsSha256"];
const SUCCESS_WORDS = /\b(?:pass(?:ed|es)?|ok|success(?:ful(?:ly)?)?)\b/iu;
const rec = (path, lineNumber, hitCount) => ({ path, lineNumber, hitCount });
const definition = { name: "node-builtin", measuredTarget: "declared tracked sources", toolName: "node --test coverage", toolVersion: "22.0.0" };
const attempt = { toolName: "node", deadlineSeconds: 600, totalBudgetSeconds: 900, spentSeconds: 3, endState: "completed" };
const measurement = (over = {}) => ({
  kind: "records",
  records: [rec("src/a.mjs", 1, 1), rec("src/a.mjs", 2, 0), rec("src/b.mjs", 1, 1)],
  measuredPaths: ["src/a.mjs", "src/b.mjs"],
  testObservations: [],
  testFilesRun: ["t/a.test.mjs"],
  testFailurePaths: [],
  measurementDefinition: definition,
  childProcessLinesCounted: true,
  cleanupFailed: false,
  attempt,
  ...over,
});
const make = (m = measurement(), over = {}) => {
  const denominatorPaths = over.denominatorPaths ?? ["src/a.mjs", "src/b.mjs"];
  const verdict = judge({ denominatorPaths, requiredTestPaths: over.requiredTestPaths ?? ["t/a.test.mjs"], measurement: m });
  return buildDocument({ runId: "run-1", declaredTargets: ["src"], denominatorPaths, measurement: m, verdict });
};
const full = measurement({ records: [rec("src/a.mjs", 1, 1), rec("src/b.mjs", 1, 1)] });
const failedTests = measurement({ kind: "unobservable", cause: "test_failed", testFailurePaths: ["t/broken.test.mjs"], records: undefined, measuredPaths: undefined });
const inputFailure = { reasonCode: "INPUT_FIELD_UNKNOWN", field: "bad`key", detail: "The input has a field this version does not accept: bad`key." };

test("a match document has every field in the fixed order and values taken from the verdict and the observation", () => {
  const d = make(full);
  assert.deepEqual(Object.keys(d), DOCUMENT_KEYS);
  assert.deepEqual([d.schemaVersion, d.runId, d.outcome, d.shouldFail, d.mode, d.reasonCodes], [1, "run-1", "match", false, "enforce", []]);
  assert.deepEqual([d.coveredLines, d.totalLines, d.lineRatioPercent, d.effectiveThresholdPercent, d.thresholdException], [2, 2, "100.00", "100.00", null]);
  assert.deepEqual([d.exclusions, d.exclusionCount, d.unmeasuredPaths, d.notRunPaths, d.testFailurePaths, d.inputFailure], [[], 0, [], [], [], null]);
  assert.deepEqual(d.measurementDefinition, definition);
  assert.deepEqual(d.measurementAttempt, attempt);
  assert.deepEqual(d.denominator, { declaredTargets: ["src"], resolvedFileCount: 2, measuredFileCount: 2 });
  assert.equal(d.recordsSha256.length, 64);
});

test("a mismatch keeps the numbers and names the files", () => {
  const d = make(measurement({ measuredPaths: ["src/a.mjs"], records: [rec("src/a.mjs", 1, 1), rec("src/a.mjs", 2, 0)], testFilesRun: [] }));
  assert.deepEqual([d.outcome, d.shouldFail, d.reasonCodes], ["mismatch", true, ["UNMEASURED_FILES", "TESTS_NOT_RUN", "BELOW_THRESHOLD"]]);
  assert.deepEqual([d.lineRatioPercent, d.unmeasuredPaths, d.notRunPaths], ["50.00", ["src/b.mjs"], ["t/a.test.mjs"]]);
  assert.deepEqual(d.denominator, { declaredTargets: ["src"], resolvedFileCount: 2, measuredFileCount: 1 });
  assert.equal(d.denominator.resolvedFileCount, d.denominator.measuredFileCount + d.unmeasuredPaths.length);
});

test("an unobservable document has null values but keeps what was seen: failed test files and the attempt", () => {
  const d = make(failedTests);
  assert.deepEqual([d.outcome, d.shouldFail, d.reasonCodes, d.testFailurePaths], ["unobservable", true, ["TEST_FAILED"], ["t/broken.test.mjs"]]);
  for (const name of NULLED) assert.equal(d[name], null, name);
  assert.deepEqual([d.denominator.resolvedFileCount, d.denominator.measuredFileCount], [2, null]);
  assert.deepEqual(d.measurementAttempt, attempt);
  assert.equal(d.effectiveThresholdPercent, "100.00");
});

test("an input failure document has no judgment fields and carries the failure", () => {
  const d = buildInputFailureDocument({ runId: "local", failure: inputFailure });
  assert.deepEqual(Object.keys(d), DOCUMENT_KEYS);
  assert.deepEqual([d.outcome, d.shouldFail, d.mode, d.reasonCodes], ["unobservable", true, null, ["INPUT_FIELD_UNKNOWN"]]);
  for (const name of [...NULLED, "effectiveThresholdPercent", "measurementDefinition", "denominator", "measurementAttempt", "testFailurePaths"]) assert.equal(d[name], null, name);
  assert.deepEqual([d.exclusions, d.exclusionCount, d.thresholdException], [[], 0, null]);
  assert.deepEqual(d.inputFailure, inputFailure);
});

test("percent text is hundredths with two digits, never rounded up", () => {
  const cases = [[0, "0.00"], [5, "0.05"], [100, "1.00"], [6666, "66.66"], [9999, "99.99"], [10000, "100.00"]];
  for (const [hundredths, text] of cases) assert.equal(formatPercent(hundredths), text);
});

test("the JSON text is two-space indented, LF only, with one final newline, and reads back to the same document", () => {
  const d = make();
  const text = renderJson(d);
  assert.ok(text.endsWith("}\n") && !text.endsWith("\n\n") && !text.includes("\r"));
  assert.ok(text.startsWith('{\n  "schemaVersion": 1,\n'));
  assert.deepEqual(JSON.parse(text), d);
  assert.equal(renderJson(d), text);
});

test("the summary has one heading per outcome and shows the numbers from the document", () => {
  assert.match(renderSummary(make(full)), /^## Coverage gate: Match$/mu);
  const mismatch = renderSummary(make());
  assert.match(mismatch, /^## Coverage gate: Mismatch$/mu);
  assert.ok(mismatch.includes("66.66%") && mismatch.includes("100.00%") && mismatch.includes("enforce"));
  assert.match(renderSummary(make(failedTests)), /^## Coverage gate: Not observable$/mu);
});

test("a result that is not a match never reads as a success in the summary, the notice or the reasons", () => {
  const docs = [make(), make(failedTests), make(measurement({ cleanupFailed: true })), buildInputFailureDocument({ runId: "local", failure: inputFailure })];
  for (const d of docs) {
    assert.doesNotMatch(renderSummary(d), SUCCESS_WORDS, d.outcome);
    assert.doesNotMatch(renderNotice(d), SUCCESS_WORDS, d.outcome);
  }
});

test("an unobservable summary says the ratio was not measured", () => {
  const text = renderSummary(make(failedTests));
  assert.ok(text.includes("not measured"));
  assert.ok(text.includes("TEST_FAILED") && text.includes("`t/broken.test.mjs`"));
});

test("long file lists stop at the limit and say how many more there are", () => {
  const names = Array.from({ length: SUMMARY_LIST_LIMIT + 5 }, (_, i) => `src/m${String(i).padStart(2, "0")}.mjs`);
  const text = renderSummary(make(measurement({ measuredPaths: [], records: [rec("lib/x.mjs", 1, 1)] }), { denominatorPaths: names }));
  assert.equal(SUMMARY_LIST_LIMIT, 20);
  assert.ok(text.includes("`src/m19.mjs`") && !text.includes("src/m20.mjs"));
  assert.ok(text.includes("and 5 more"));
});

test("file names are shown inside a code span with control characters and backticks made harmless", () => {
  const evil = "src/a`b\nc\u0001d.mjs";
  const text = renderSummary(make(measurement({ kind: "unobservable", cause: "test_failed", testFailurePaths: [evil] })));
  assert.ok(text.includes("`src/a'b?c?d.mjs`"));
  assert.doesNotMatch(text, /[\u0000-\u0009\u000b-\u001f]/u);
});

test("an input failure summary shows the field and the sentence with control characters removed", () => {
  const text = renderSummary(buildInputFailureDocument({ runId: "local", failure: { ...inputFailure, detail: "line one\nline two" } }));
  assert.ok(text.includes("INPUT_FIELD_UNKNOWN") && text.includes("line one?line two"));
});

test("the notice is one line: a notice for a match and an error for everything else, with no file names", () => {
  assert.match(renderNotice(make(full)), /^::notice::.+$/u);
  const mismatch = renderNotice(make());
  assert.match(mismatch, /^::error::.+$/u);
  assert.ok(mismatch.includes("BELOW_THRESHOLD") && mismatch.includes("66.66%"));
  for (const d of [make(), make(failedTests), buildInputFailureDocument({ runId: "local", failure: inputFailure })]) {
    const line = renderNotice(d);
    assert.doesNotMatch(line, /[\r\n]/u);
    assert.ok(!line.includes("src/b.mjs") && !line.includes("broken.test") && !line.includes("bad`key"));
    assert.match(line, /^::error::/u);
  }
});

test("the outputs are exactly the named fields, one per line, with plain values", () => {
  assert.equal(renderOutputs(make(full)), "outcome=match\nshould-fail=false\nmode=enforce\nline-ratio-percent=100.00\neffective-threshold-percent=100.00\nexclusion-count=0\nschema-version=1\n");
  assert.equal(renderOutputs(make(failedTests)), "outcome=unobservable\nshould-fail=true\nmode=enforce\nline-ratio-percent=\neffective-threshold-percent=100.00\nexclusion-count=0\nschema-version=1\n");
});

test("an input failure fills only the outcome, should-fail and schema-version outputs", () => {
  const text = renderOutputs(buildInputFailureDocument({ runId: "local", failure: inputFailure }));
  assert.equal(text, "outcome=unobservable\nshould-fail=true\nmode=\nline-ratio-percent=\neffective-threshold-percent=\nexclusion-count=\nschema-version=1\n");
});

test("every reason code has one plain sentence and the table has no other keys", () => {
  assert.deepEqual(Object.keys(MESSAGES).sort(), Object.keys(REASON_CODES).sort());
  for (const [code, sentence] of Object.entries(MESSAGES)) {
    assert.ok(sentence.length > 10 && !/[\r\n]/u.test(sentence), code);
    assert.doesNotMatch(sentence, SUCCESS_WORDS, code);
  }
});

test("all four surfaces agree with the one document", () => {
  const d = make();
  const summary = renderSummary(d);
  assert.ok(summary.includes(d.lineRatioPercent) && summary.includes(d.reasonCodes[0]));
  assert.ok(renderOutputs(d).includes(`line-ratio-percent=${d.lineRatioPercent}\n`));
  assert.ok(renderNotice(d).includes(d.lineRatioPercent));
  assert.equal(JSON.parse(renderJson(d)).lineRatioPercent, d.lineRatioPercent);
});

test("building and rendering leave their inputs alone and give the same text twice", () => {
  const m = measurement();
  const before = JSON.stringify(m);
  const a = make(m);
  const b = make(m);
  assert.equal(JSON.stringify(m), before);
  assert.equal(renderSummary(a), renderSummary(b));
  assert.equal(renderJson(a), renderJson(b));
});
