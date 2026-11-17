// The exclusions in the result document and the four surfaces (BR11.1 to BR11.6). Every value here is fictional.
// Kept apart from coverage-gate-report.test.mjs so that no test file passes the 300-line limit.
import assert from "node:assert/strict";
import test from "node:test";
import { judge } from "../scripts/coverage-gate/judge.mjs";
import { SUMMARY_LIST_LIMIT, buildDocument, buildInputFailureDocument, renderJson, renderNotice, renderOutputs, renderSummary } from "../scripts/coverage-gate/report.mjs";

const DOCUMENT_KEYS = ["schemaVersion", "runId", "outcome", "shouldFail", "mode", "reasonCodes", "coveredLines", "totalLines", "lineRatioPercent", "effectiveThresholdPercent", "thresholdException", "measurementDefinition", "denominator", "exclusions", "exclusionCount", "unmeasuredPaths", "notRunPaths", "testFailurePaths", "perFile", "recordsSha256", "measurementAttempt", "inputFailure"];
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
  const verdict = judge({ denominatorPaths, requiredTestPaths: ["t/a.test.mjs"], measurement: m, mode: over.mode, threshold: over.threshold });
  return buildDocument({ runId: "run-1", declaredTargets: ["src"], denominatorPaths, measurement: m, verdict, excluded: over.excluded ?? [] });
};
const full = measurement({ records: [rec("src/a.mjs", 1, 1), rec("src/b.mjs", 1, 1)] });
const inputFailure = { reasonCode: "INPUT_FIELD_UNKNOWN", field: "bad`key", detail: "The input has a field this version does not accept: bad`key." };
const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const EXCEPTION = { percentHundredths: 6000, decisionUrl: URL_OK, rationale: "Example rationale for a lowered line." };
const unread = measurement({ kind: "unobservable", cause: "failed", records: undefined, measuredPaths: undefined });
const CASES = { match: full, mismatch: measurement(), unobservable: unread };

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
