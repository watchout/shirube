import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { DEFAULT_MODE, DEFAULT_THRESHOLD_HUNDREDTHS, MODE, MODES, OUTCOMES, REASON_CODES, SCHEMA_VERSION, judge } from "../scripts/coverage-gate/judge.mjs";

const rec = (path, lineNumber, hitCount) => ({ path, lineNumber, hitCount });
const measurement = (over = {}) => ({
  kind: "records",
  records: [rec("src/a.mjs", 1, 2), rec("src/a.mjs", 2, 1), rec("src/b.mjs", 1, 1)],
  measuredPaths: ["src/a.mjs", "src/b.mjs"],
  testFilesRun: ["t/a.test.mjs"],
  testFailurePaths: [],
  testObservations: [],
  cleanupFailed: false,
  ...over,
});
const run = (m = measurement(), over = {}) => judge({ denominatorPaths: ["src/a.mjs", "src/b.mjs"], requiredTestPaths: ["t/a.test.mjs"], measurement: m, ...over });
const classOf = (cls) => Object.entries(REASON_CODES).filter(([, c]) => c === cls).map(([code]) => code);
const NULLED = ["coveredLines", "totalLines", "lineRatioHundredths", "unmeasuredPaths", "notRunPaths", "perFile", "recordsSha256"];

test("constants: schema 1, enforce, three outcomes, 100.00% as hundredths, 21 reason codes in four classes", () => {
  assert.equal(SCHEMA_VERSION, 1);
  assert.equal(MODE, "enforce");
  assert.deepEqual([...OUTCOMES], ["match", "mismatch", "unobservable"]);
  assert.equal(DEFAULT_THRESHOLD_HUNDREDTHS, 10000);
  assert.equal(Object.keys(REASON_CODES).length, 21);
  assert.deepEqual([classOf("input").length, classOf("mismatch").length, classOf("unobservable").length, classOf("entry").length], [8, 3, 7, 3]);
  assert.deepEqual(classOf("mismatch"), ["UNMEASURED_FILES", "TESTS_NOT_RUN", "BELOW_THRESHOLD"]);
});

test("everything covered and every required test run is a match", () => {
  const v = run();
  assert.deepEqual([v.outcome, v.shouldFail, v.mode, v.reasonCodes], ["match", false, "enforce", []]);
  assert.deepEqual([v.coveredLines, v.totalLines, v.lineRatioHundredths, v.effectiveThresholdHundredths, v.thresholdException], [3, 3, 10000, 10000, null]);
  assert.deepEqual([v.unmeasuredPaths, v.notRunPaths], [[], []]);
  assert.deepEqual(v.perFile, [{ path: "src/a.mjs", coveredLines: 2, totalLines: 2 }, { path: "src/b.mjs", coveredLines: 1, totalLines: 1 }]);
});

test("recordsSha256 is the digest of path TAB line TAB hits LF, in path then line order, however the input was ordered", () => {
  const expected = createHash("sha256").update("src/a.mjs\t1\t2\nsrc/a.mjs\t2\t1\nsrc/b.mjs\t1\t1\n").digest("hex");
  assert.equal(run().recordsSha256, expected);
  const shuffled = measurement({ records: [rec("src/b.mjs", 1, 1), rec("src/a.mjs", 2, 1), rec("src/a.mjs", 1, 2)] });
  assert.equal(run(shuffled).recordsSha256, expected);
  assert.notEqual(run(measurement({ records: [rec("src/a.mjs", 1, 2), rec("src/a.mjs", 2, 0), rec("src/b.mjs", 1, 1)] })).recordsSha256, expected);
});

test("an uncovered line is below the threshold and the ratio is rounded down", () => {
  const v = run(measurement({ records: [rec("src/a.mjs", 1, 1), rec("src/a.mjs", 2, 0), rec("src/b.mjs", 1, 1)] }));
  assert.deepEqual([v.outcome, v.shouldFail, v.reasonCodes], ["mismatch", true, ["BELOW_THRESHOLD"]]);
  assert.deepEqual([v.coveredLines, v.totalLines, v.lineRatioHundredths], [2, 3, 6666]);
});

test("9,999 of 10,000 lines is 99.99%, never rounded up to 100", () => {
  const records = Array.from({ length: 10000 }, (_, i) => rec("src/a.mjs", i + 1, i === 0 ? 0 : 1));
  const v = run(measurement({ records, measuredPaths: ["src/a.mjs"] }), { denominatorPaths: ["src/a.mjs"] });
  assert.deepEqual([v.lineRatioHundredths, v.outcome, v.reasonCodes], [9999, "mismatch", ["BELOW_THRESHOLD"]]);
  const almost = Array.from({ length: 100000 }, (_, i) => rec("src/a.mjs", i + 1, i === 0 ? 0 : 1));
  assert.equal(run(measurement({ records: almost, measuredPaths: ["src/a.mjs"] }), { denominatorPaths: ["src/a.mjs"] }).lineRatioHundredths, 9999);
});

test("hit counts of zero are uncovered; any positive count is covered", () => {
  const v = run(measurement({ records: [rec("src/a.mjs", 1, 0), rec("src/a.mjs", 2, 7), rec("src/b.mjs", 1, 1)] }));
  assert.equal(v.coveredLines, 2);
});

test("a declared file with no record is unmeasured and named, even if the rest is fully covered", () => {
  const v = run(measurement({ records: [rec("src/a.mjs", 1, 1)], measuredPaths: ["src/a.mjs"] }));
  assert.deepEqual([v.outcome, v.reasonCodes, v.unmeasuredPaths], ["mismatch", ["UNMEASURED_FILES"], ["src/b.mjs"]]);
  assert.deepEqual([v.coveredLines, v.totalLines, v.lineRatioHundredths], [1, 1, 10000]);
});

test("a measured file that has zero lines is measured, not unmeasured", () => {
  const v = run(measurement({ measuredPaths: ["src/a.mjs", "src/b.mjs", "src/c.mjs"] }), { denominatorPaths: ["src/a.mjs", "src/b.mjs", "src/c.mjs"] });
  assert.deepEqual([v.outcome, v.unmeasuredPaths], ["match", []]);
});

test("records of files outside the declared set are not counted", () => {
  const v = run(measurement({ records: [rec("src/a.mjs", 1, 1), rec("src/b.mjs", 1, 1), rec("lib/other.mjs", 1, 0)], measuredPaths: ["lib/other.mjs", "src/a.mjs", "src/b.mjs"] }));
  assert.deepEqual([v.outcome, v.totalLines, v.coveredLines], ["match", 2, 2]);
  assert.deepEqual(v.perFile.map((f) => f.path), ["src/a.mjs", "src/b.mjs"]);
});

test("a required test that did not run is named and is a mismatch", () => {
  const v = run(measurement({ testFilesRun: [] }), { requiredTestPaths: ["t/b.test.mjs", "t/a.test.mjs"] });
  assert.deepEqual([v.outcome, v.reasonCodes, v.notRunPaths], ["mismatch", ["TESTS_NOT_RUN"], ["t/a.test.mjs", "t/b.test.mjs"]]);
});

test("reasons come in the fixed order: unmeasured, not run, below threshold", () => {
  const v = run(measurement({ records: [rec("src/a.mjs", 1, 0)], measuredPaths: ["src/a.mjs"], testFilesRun: [] }));
  assert.deepEqual(v.reasonCodes, ["UNMEASURED_FILES", "TESTS_NOT_RUN", "BELOW_THRESHOLD"]);
});

test("no counted line is unobservable, never a pass", () => {
  const v = run(measurement({ records: [rec("lib/other.mjs", 1, 1)], measuredPaths: ["lib/other.mjs"] }));
  assert.deepEqual([v.outcome, v.shouldFail, v.reasonCodes], ["unobservable", true, ["NO_RECORDS"]]);
  for (const name of NULLED) assert.equal(v[name], null, name);
  assert.equal(run(measurement({ records: [], measuredPaths: ["src/a.mjs", "src/b.mjs"] })).reasonCodes[0], "NO_RECORDS");
});

test("each measurement cause maps to one reason code and nothing is reported as measured", () => {
  const expected = { failed: "MEASUREMENT_FAILED", test_failed: "TEST_FAILED", timed_out: "MEASUREMENT_TIMED_OUT", budget_exceeded: "MEASUREMENT_BUDGET_EXCEEDED", no_records: "NO_RECORDS", child_process_not_countable: "CHILD_PROCESS_NOT_COUNTABLE" };
  for (const [cause, code] of Object.entries(expected)) {
    const v = run({ kind: "unobservable", cause, testFilesRun: [], testFailurePaths: [], testObservations: [], cleanupFailed: false });
    assert.deepEqual([v.outcome, v.shouldFail, v.reasonCodes], ["unobservable", true, [code]], cause);
    for (const name of NULLED) assert.equal(v[name], null, `${cause} ${name}`);
  }
});

test("an unknown cause is a measurement failure, not a pass", () => {
  const v = run({ kind: "unobservable", cause: "something_new", cleanupFailed: false });
  assert.deepEqual(v.reasonCodes, ["MEASUREMENT_FAILED"]);
});

test("a temp directory that could not be removed makes a good measurement unobservable", () => {
  const v = run(measurement({ cleanupFailed: true }));
  assert.deepEqual([v.outcome, v.shouldFail, v.reasonCodes], ["unobservable", true, ["TEMP_CLEANUP_FAILED"]]);
  for (const name of NULLED) assert.equal(v[name], null, name);
});

test("cleanup failure is added after the measurement cause", () => {
  const v = run({ kind: "unobservable", cause: "test_failed", cleanupFailed: true });
  assert.deepEqual(v.reasonCodes, ["TEST_FAILED", "TEMP_CLEANUP_FAILED"]);
});

test("only a match does not fail", () => {
  const cases = [run(), run(measurement({ testFilesRun: [] })), run(measurement({ cleanupFailed: true })), run({ kind: "unobservable", cause: "failed", cleanupFailed: false })];
  assert.deepEqual(cases.map((v) => v.shouldFail), [false, true, true, true]);
});

test("the same input gives the same output and the input is not changed", () => {
  const m = measurement();
  const before = JSON.stringify(m);
  const denominator = ["src/a.mjs", "src/b.mjs"];
  assert.deepEqual(judge({ denominatorPaths: denominator, requiredTestPaths: ["t/a.test.mjs"], measurement: m }), judge({ denominatorPaths: denominator, requiredTestPaths: ["t/a.test.mjs"], measurement: m }));
  assert.equal(JSON.stringify(m), before);
  assert.deepEqual(denominator, ["src/a.mjs", "src/b.mjs"]);
});

test("the per-file totals add up to the verdict totals", () => {
  const v = run(measurement({ records: [rec("src/a.mjs", 1, 0), rec("src/a.mjs", 2, 1), rec("src/b.mjs", 5, 3), rec("src/b.mjs", 9, 0)] }));
  assert.equal(v.perFile.reduce((n, f) => n + f.coveredLines, 0), v.coveredLines);
  assert.equal(v.perFile.reduce((n, f) => n + f.totalLines, 0), v.totalLines);
});

// U4: the threshold exception and the mode (BR7.2, BR7.4 to BR7.6). Every value here is fictional.
const EXCEPTION = { percentHundredths: 9500, decisionUrl: "https://github.com/example-org/example-repo/issues/12#issuecomment-345", rationale: "Example rationale for a lowered line." };
const PARTLY = measurement({ records: [rec("src/a.mjs", 1, 1), rec("src/a.mjs", 2, 0), rec("src/b.mjs", 1, 1)] });
const UNREAD = { kind: "unobservable", cause: "failed", cleanupFailed: false };
const SAMPLES = { match: () => measurement(), mismatch: () => PARTLY, unobservable: () => UNREAD };

test("the modes are enforce and record-only, the default is enforce, and the old MODE is the default", () => {
  assert.deepEqual([...MODES], ["enforce", "record-only"]);
  assert.equal(DEFAULT_MODE, "enforce");
  assert.equal(MODE, DEFAULT_MODE);
  assert.throws(() => MODES.push("other"), TypeError);
});

test("shouldFail is true only for a non-match in enforce mode: six cases of class and mode", () => {
  const expected = { match: [false, false], mismatch: [true, false], unobservable: [true, false] };
  for (const [name, [enforce, recordOnly]] of Object.entries(expected)) {
    assert.equal(run(SAMPLES[name](), { mode: "enforce" }).shouldFail, enforce, `${name} enforce`);
    assert.equal(run(SAMPLES[name](), { mode: "record-only" }).shouldFail, recordOnly, `${name} record-only`);
    assert.equal(run(SAMPLES[name]()).shouldFail, enforce, `${name} with no mode given`);
  }
});

test("record-only changes nothing but shouldFail and mode: outcome, reasons and numbers are the same as in enforce", () => {
  for (const name of Object.keys(SAMPLES)) {
    const strict = run(SAMPLES[name](), { mode: "enforce" });
    const recorded = run(SAMPLES[name](), { mode: "record-only" });
    assert.equal(recorded.mode, "record-only", name);
    assert.deepEqual({ ...recorded, shouldFail: strict.shouldFail, mode: strict.mode }, strict, name);
  }
});

test("an exception sets the line the comparison uses, and the verdict keeps the claimed and the compared values apart", () => {
  const v = run(PARTLY, { threshold: { ...EXCEPTION, percentHundredths: 6666 } });
  assert.deepEqual([v.outcome, v.reasonCodes, v.effectiveThresholdHundredths], ["match", [], 6666]);
  assert.deepEqual(v.thresholdException, { decisionUrl: EXCEPTION.decisionUrl, claimedHundredths: 6666, rationale: EXCEPTION.rationale });
  const below = run(PARTLY, { threshold: { ...EXCEPTION, percentHundredths: 6667 } });
  assert.deepEqual([below.outcome, below.reasonCodes, below.effectiveThresholdHundredths], ["mismatch", ["BELOW_THRESHOLD"], 6667]);
});

test("a run that meets the default line still records that an exception was used", () => {
  const v = run(measurement(), { threshold: EXCEPTION });
  assert.deepEqual([v.outcome, v.shouldFail, v.lineRatioHundredths, v.effectiveThresholdHundredths], ["match", false, 10000, 9500]);
  assert.deepEqual(v.thresholdException, { decisionUrl: EXCEPTION.decisionUrl, claimedHundredths: 9500, rationale: EXCEPTION.rationale });
});

test("an unobservable run carries the exception, the effective value and the mode as well", () => {
  for (const mode of MODES) {
    const v = run(UNREAD, { mode, threshold: EXCEPTION });
    assert.deepEqual([v.outcome, v.mode, v.effectiveThresholdHundredths], ["unobservable", mode, 9500], mode);
    assert.deepEqual(v.thresholdException, { decisionUrl: EXCEPTION.decisionUrl, claimedHundredths: 9500, rationale: EXCEPTION.rationale }, mode);
    assert.equal(v.shouldFail, mode === "enforce", mode);
  }
  const noRecords = run(measurement({ records: [rec("lib/other.mjs", 1, 1)] }), { threshold: EXCEPTION });
  assert.deepEqual([noRecords.reasonCodes, noRecords.effectiveThresholdHundredths, noRecords.thresholdException.claimedHundredths], [["NO_RECORDS"], 9500, 9500]);
});

test("an exception never makes the line stricter: what passes by default also passes with the exception", () => {
  for (const m of [measurement(), measurement({ testFilesRun: [] })]) {
    const plain = run(m);
    const lowered = run(m, { threshold: EXCEPTION });
    assert.ok(lowered.effectiveThresholdHundredths <= DEFAULT_THRESHOLD_HUNDREDTHS);
    assert.ok(plain.outcome !== "match" || lowered.outcome === "match");
  }
  assert.equal(run(measurement(), { threshold: null }).effectiveThresholdHundredths, DEFAULT_THRESHOLD_HUNDREDTHS);
});

test("a mode that is not in the set is refused, never read as a pass", () => {
  for (const mode of ["Enforce", "record", "", null, 1, false]) assert.throws(() => run(measurement(), { mode }), /mode/, String(mode));
});

test("the same input gives the same output with an exception and a mode, and neither input object is changed", () => {
  const threshold = { ...EXCEPTION };
  const before = JSON.stringify(threshold);
  const first = run(PARTLY, { mode: "record-only", threshold });
  assert.deepEqual(run(PARTLY, { mode: "record-only", threshold }), first);
  assert.equal(JSON.stringify(threshold), before);
  first.thresholdException.rationale = "changed afterwards";
  assert.equal(threshold.rationale, EXCEPTION.rationale);
});
