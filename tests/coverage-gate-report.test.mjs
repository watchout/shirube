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
  const verdict = judge({ denominatorPaths, requiredTestPaths: over.requiredTestPaths ?? ["t/a.test.mjs"], measurement: m, mode: over.mode, threshold: over.threshold });
  return buildDocument({ runId: "run-1", declaredTargets: ["src"], denominatorPaths, measurement: m, verdict, excluded: over.excluded ?? [] });
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
  const text = renderSummary(make(measurement({ measuredPaths: ["src/real.mjs"], records: [rec("src/real.mjs", 1, 1)] }), { denominatorPaths: [...names, "src/real.mjs"] }));
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

// U4: the exception and the mode in the document and the four surfaces (BR8.1 to BR8.6). Every value here is fictional.
const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const EXCEPTION = { percentHundredths: 6000, decisionUrl: URL_OK, rationale: "Example rationale for a lowered line." };
const unread = measurement({ kind: "unobservable", cause: "failed", records: undefined, measuredPaths: undefined });
const CASES = { match: full, mismatch: measurement(), unobservable: unread };

test("the document carries the mode, the compared threshold and the exception as decision, claimed value and rationale, with no new field", () => {
  const d = make(measurement(), { mode: "record-only", threshold: EXCEPTION });
  assert.deepEqual(Object.keys(d), DOCUMENT_KEYS);
  assert.deepEqual([d.mode, d.shouldFail, d.outcome, d.effectiveThresholdPercent], ["record-only", false, "match", "60.00"]);
  assert.deepEqual(d.thresholdException, { decisionUrl: URL_OK, claimedPercent: "60.00", rationale: EXCEPTION.rationale });
  assert.deepEqual(Object.keys(d.thresholdException), ["decisionUrl", "claimedPercent", "rationale"]);
  assert.equal(make(measurement()).thresholdException, null);
});

test("an unobservable document keeps the exception and the compared threshold, and the mode", () => {
  const d = make(unread, { mode: "record-only", threshold: EXCEPTION });
  assert.deepEqual([d.outcome, d.shouldFail, d.mode, d.effectiveThresholdPercent, d.thresholdException.claimedPercent], ["unobservable", false, "record-only", "60.00", "60.00"]);
});

test("an exception is announced on the first line, before the heading, for every outcome, and is shown in the table and in its own section", () => {
  for (const [name, m] of Object.entries(CASES)) {
    const lines = renderSummary(make(m, { threshold: EXCEPTION })).split("\n");
    assert.equal(lines[0], "Threshold lowered to 60.00% (default 100.00%) by decision exception.", name);
    assert.match(lines[2], /^## Coverage gate: /u, name);
    const text = lines.join("\n");
    assert.ok(text.includes("| Threshold | 60.00% (lowered from 100.00%) |"), name);
    assert.ok(text.includes(`- Decision: \`${URL_OK}\``) && text.includes("- Claimed value: 60.00%") && text.includes("- Rationale: `Example rationale for a lowered line.`"), name);
  }
});

test("without an exception the summary has no flag line, no lowered note and no exception section", () => {
  for (const mode of ["enforce", "record-only"]) {
    const text = renderSummary(make(measurement(), { mode }));
    assert.ok(!/lowered|Threshold exception|Decision:/u.test(text), mode);
    assert.ok(text.startsWith("## Coverage gate: "), mode);
  }
});

test("record-only says in the summary that the result is recorded and does not fail the job, and never writes a success heading", () => {
  const expected = { match: "Match", mismatch: "Mismatch", unobservable: "Not observable (計測不能)" };
  for (const [name, m] of Object.entries(CASES)) {
    const text = renderSummary(make(m, { mode: "record-only" }));
    assert.ok(text.includes(`## Coverage gate: ${expected[name]}\n`), name);
    assert.ok(text.includes("| Mode | record-only |\n| Exclusions | 0 |\n\nRecord-only mode: this result is recorded and does not fail the job.\n"), name);
    assert.doesNotMatch(text, SUCCESS_WORDS, name);
  }
  assert.ok(renderSummary(make(measurement(), { mode: "record-only" })).includes("BELOW_THRESHOLD: Line coverage is below the required threshold."));
  assert.ok(!renderSummary(make(measurement(), { mode: "enforce" })).includes("Record-only"));
});

test("the notice kind and text follow the table, always from the document, always one line", () => {
  const warning = (text) => assert.match(text, /^::warning::[^\r\n]+$/u);
  const lowered = renderNotice(make(full, { threshold: EXCEPTION }));
  warning(lowered);
  assert.ok(lowered.includes("100.00%25 of 60.00%25 required") && lowered.includes(`threshold lowered by exception: ${URL_OK}`));
  const stricter = { ...EXCEPTION, percentHundredths: 9000 };
  assert.match(renderNotice(make(measurement(), { threshold: stricter })), /^::error::Coverage gate: mismatch \(BELOW_THRESHOLD\)\. Line coverage 66\.66%25 of 90\.00%25 required\. \(threshold lowered by exception: /u);
  const recorded = renderNotice(make(measurement(), { mode: "record-only" }));
  warning(recorded);
  assert.ok(recorded.includes("Recorded only, the job is not failed.") && recorded.includes("66.66%25 of 100.00%25 required"));
  const unobserved = renderNotice(make(unread, { mode: "record-only", threshold: EXCEPTION }));
  warning(unobserved);
  assert.ok(unobserved.includes("not observable (計測不能)") && unobserved.includes("Threshold 60.00%25.") && unobserved.includes("MEASUREMENT_FAILED"));
  for (const text of [lowered, recorded, unobserved]) assert.ok(!text.includes(EXCEPTION.rationale) && !SUCCESS_WORDS.test(text.replace(/^::\w+::/u, "")));
});

test("a run with no exception and enforce keeps the U3 notice words for every outcome", () => {
  assert.equal(renderNotice(make(full)), "::notice::Coverage gate: match, 100.00%25 of 100.00%25 required.");
  assert.equal(renderNotice(make(unread)), "::error::Coverage gate: unobservable (MEASUREMENT_FAILED).");
  assert.equal(renderNotice(make(measurement({ cleanupFailed: true }), { mode: "enforce", threshold: null })), "::error::Coverage gate: unobservable (TEMP_CLEANUP_FAILED).");
});

test("an exception or a mode changes the output values and adds no name", () => {
  const names = (text) => text.trim().split("\n").map((line) => line.split("=")[0]);
  const plain = names(renderOutputs(make(full)));
  assert.equal(renderOutputs(make(measurement(), { mode: "record-only", threshold: EXCEPTION })), "outcome=match\nshould-fail=false\nmode=record-only\nline-ratio-percent=66.66\neffective-threshold-percent=60.00\nexclusion-count=0\nschema-version=1\n");
  for (const d of [make(full, { threshold: EXCEPTION }), make(unread, { mode: "record-only" })]) assert.deepEqual(names(renderOutputs(d)), plain);
});

test("an exception text that got past the input check is still made harmless in the summary and the notice", () => {
  const d = make(full, { threshold: { ...EXCEPTION, rationale: "ok\n::error::fake`x`|%0A" } });
  const summary = renderSummary(d);
  assert.ok(!summary.split("\n").some((line) => line.startsWith("::")));
  assert.ok(summary.includes("- Rationale: `ok?::error::fake'x'|%0A`"));
  const hostile = { ...d, thresholdException: { ...d.thresholdException, decisionUrl: "https://github.com/a/b/issues/1#issuecomment-2%0A::error::x\n" } };
  const notice = renderNotice(hostile);
  assert.doesNotMatch(notice, /[\r\n]/u);
  assert.ok(notice.includes("%250A::error::x%0A"));
});

test("all four surfaces and the JSON agree on the exception and the mode, from the one document", () => {
  const d = make(measurement(), { mode: "record-only", threshold: EXCEPTION });
  const json = JSON.parse(renderJson(d));
  assert.deepEqual([json.mode, json.effectiveThresholdPercent, json.thresholdException.decisionUrl], ["record-only", "60.00", URL_OK]);
  assert.ok(renderSummary(d).includes(json.thresholdException.decisionUrl) && renderNotice(d).includes(json.thresholdException.decisionUrl));
  assert.ok(renderOutputs(d).includes("mode=record-only\n") && renderOutputs(d).includes("effective-threshold-percent=60.00\n"));
  assert.equal(renderSummary(d), renderSummary(make(measurement(), { mode: "record-only", threshold: EXCEPTION })));
});

// U5: the exclusions in the document and the four surfaces (BR11.1 to BR11.6). Every value here is fictional.
const REASON = `Generated file, see ${URL_OK} for the decision.`;
const ex = (path, kind) => ({ path, reason: REASON, kind });
const EXCLUDED = [ex("src/z.mjs", "source"), ex("t/b.test.mjs", "test"), ex("src/c.mjs", "both")];
const withEx = (m = full, over = {}) => make(m, { excluded: EXCLUDED, ...over });
const EX_HEAD = "Excluded from the gate: 3 (source 1, test 1, both 1)";

test("the document lists the exclusions with kind in code-point order of the path, the count is their number, and the key list does not grow", () => {
  const d = withEx();
  assert.deepEqual(Object.keys(d), DOCUMENT_KEYS);
  assert.deepEqual(d.exclusions, [ex("src/c.mjs", "both"), ex("src/z.mjs", "source"), ex("t/b.test.mjs", "test")]);
  assert.deepEqual(Object.keys(d.exclusions[0]), ["path", "reason", "kind"]);
  assert.equal(d.exclusionCount, 3);
  assert.deepEqual(withEx(full, { excluded: [...EXCLUDED].reverse() }).exclusions, d.exclusions);
});

test("the denominator count is the count after the exclusions, and the document does not share the exclusion objects", () => {
  const d = withEx(full, { denominatorPaths: ["src/a.mjs", "src/b.mjs"] });
  assert.equal(d.denominator.resolvedFileCount, 2);
  const given = [ex("src/c.mjs", "both")];
  const made = make(full, { excluded: given });
  made.exclusions[0].reason = "changed";
  assert.equal(given[0].reason, REASON);
});

test("an input failure document has no exclusions", () => {
  const d = buildInputFailureDocument({ runId: "run-1", failure: inputFailure });
  assert.deepEqual([d.exclusions, d.exclusionCount], [[], 0]);
});

test("with exclusions the first line says how many and of which kind, for every outcome and mode, and the heading follows after a blank line", () => {
  for (const [name, m] of Object.entries(CASES)) {
    for (const mode of ["enforce", "record-only"]) {
      const lines = renderSummary(withEx(m, { mode })).split("\n");
      assert.deepEqual([lines[0], lines[1]], [EX_HEAD, ""], `${name} ${mode}`);
      assert.match(lines[2], /^## Coverage gate: /u, `${name} ${mode}`);
    }
  }
});

test("with an exception too, the exception line is first and the exclusion line is right after it", () => {
  const lines = renderSummary(withEx(full, { threshold: EXCEPTION })).split("\n");
  assert.deepEqual(lines.slice(0, 3), ["Threshold lowered to 60.00% (default 100.00%) by decision exception.", EX_HEAD, ""]);
  assert.match(lines[3], /^## Coverage gate: /u);
});

test("the named list comes after the exception section and before the reasons, and the table row shows the count", () => {
  const text = renderSummary(withEx(measurement(), { threshold: EXCEPTION }));
  assert.ok(text.includes("| Exclusions | 3 |"));
  const at = (needle) => text.indexOf(needle);
  assert.ok(at("Threshold exception:") < at("Excluded files (3):") && at("Excluded files (3):") < at("\nReasons:"));
  assert.ok(text.includes(`- \`src/c.mjs\` (both): \`${REASON}\``));
  assert.ok(at("src/c.mjs") < at("src/z.mjs") && at("src/z.mjs") < at("t/b.test.mjs"));
});

test("the list is cut at the summary limit, and the full list stays in the JSON", () => {
  const many = Array.from({ length: SUMMARY_LIST_LIMIT + 5 }, (_, i) => ex(`src/m${String(i).padStart(2, "0")}.mjs`, "source"));
  const d = make(full, { excluded: many });
  const text = renderSummary(d);
  assert.ok(text.includes(`Excluded files (${many.length}):`) && text.includes("- and 5 more (the full list is in the result file)"));
  assert.ok(!text.includes("m24.mjs") && JSON.parse(renderJson(d)).exclusions.length === many.length);
});

test("the notice gets one fixed sentence with the count at its end, the kind of annotation is unchanged, and no path or reason is in it", () => {
  assert.equal(renderNotice(withEx(full)), "::notice::Coverage gate: match, 100.00%25 of 100.00%25 required. Exclusions: 3.");
  assert.equal(renderNotice(withEx(unread)), "::error::Coverage gate: unobservable (MEASUREMENT_FAILED). Exclusions: 3.");
  assert.equal(renderNotice(withEx(measurement(), { mode: "record-only" })), "::warning::Coverage gate: mismatch (BELOW_THRESHOLD). Line coverage 66.66%25 of 100.00%25 required. Recorded only, the job is not failed. Exclusions: 3.");
  for (const [name, m] of Object.entries(CASES)) {
    assert.equal(renderNotice(withEx(m)).split("::")[1], renderNotice(make(m)).split("::")[1], name);
    assert.ok(!renderNotice(withEx(m)).includes("src/") && !renderNotice(withEx(m)).includes("github.com"), name);
  }
});

test("the output values keep their seven names and exclusion-count carries the count", () => {
  const names = (text) => text.trim().split("\n").map((line) => line.split("=")[0]);
  assert.deepEqual(names(renderOutputs(withEx())), names(renderOutputs(make(full))));
  assert.ok(renderOutputs(withEx()).includes("exclusion-count=3\n"));
  assert.ok(renderOutputs(make(full)).includes("exclusion-count=0\n"));
});

test("with no exclusion the summary and the notice are exactly what they were, and one more exclusion changes them", () => {
  for (const [name, m] of Object.entries(CASES)) {
    const none = make(m, { excluded: [] });
    assert.ok(!renderSummary(none).includes("Excluded"), name);
    assert.ok(!renderNotice(none).includes("Exclusions:"), name);
    assert.notEqual(renderSummary(withEx(m)), renderSummary(none), name);
    assert.notEqual(renderJson(withEx(m)), renderJson(none), name);
  }
});

test("a hostile path or reason in the document cannot add a line, a table cell or a workflow command to any surface", () => {
  const d = make(full, { excluded: [{ path: "src/a`b|c\r\n::error::x.mjs", reason: "why `x` | y\r\n::error::z", kind: "source" }] });
  const summary = renderSummary(d);
  assert.ok(!summary.split("\n").some((line) => line.startsWith("::")));
  assert.ok(!summary.includes("\r"));
  assert.doesNotMatch(renderNotice(d), /[\r\n]/u);
  assert.ok(!renderNotice(d).includes("::error::x"));
});

test("the JSON, the summary, the notice and the outputs agree on the count, from the one document, and the same input gives the same bytes", () => {
  const d = withEx(measurement(), { mode: "record-only", threshold: EXCEPTION });
  assert.equal(JSON.parse(renderJson(d)).exclusionCount, 3);
  assert.ok(renderSummary(d).includes("| Exclusions | 3 |") && renderSummary(d).includes(EX_HEAD) && renderNotice(d).endsWith(" Exclusions: 3.") && renderOutputs(d).includes("exclusion-count=3\n"));
  const again = withEx(measurement(), { mode: "record-only", threshold: EXCEPTION });
  assert.deepEqual([renderJson(d), renderSummary(d), renderNotice(d), renderOutputs(d)], [renderJson(again), renderSummary(again), renderNotice(again), renderOutputs(again)]);
});
