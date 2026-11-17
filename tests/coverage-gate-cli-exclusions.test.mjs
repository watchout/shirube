// The entry point with exclusions (BR9 to BR11, ADR-001). Every value here is fictional.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runCli } from "../scripts/coverage-gate/cli.mjs";
import { CLI, PASS_TEST, SOURCE_A, makeRepo, removeDir } from "./coverage-gate-fixtures.mjs";
import { goldenMeasurement } from "./coverage-gate-golden.mjs";

const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const REASON = `Generated file, see ${URL_OK} for the decision.`;
const BASE = { schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["src"] }, testTargets: ["tests"] };
const ex = (path) => ({ path, reason: REASON });
const repo = makeRepo({ "src/a.mjs": SOURCE_A, "src/b.mjs": "export const unused = 1;\n", "tests/a.test.mjs": PASS_TEST, "tests/b.test.mjs": PASS_TEST });
test.after(() => removeDir(repo));

const readText = (name) => readFileSync(join(repo, name), "utf8");
const readJson = (name) => JSON.parse(readText(name));
// The measurement saw both sources: the excluded one has an uncovered line, so counting it would be below the threshold.
const bothSources = () => goldenMeasurement({ records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 1 }, { path: "src/b.mjs", lineNumber: 1, hitCount: 0 }], measuredPaths: ["src/a.mjs", "src/b.mjs"], testFilesRun: ["tests/a.test.mjs"] });

let counter = 0;
async function go(body, { measure = async () => bothSources(), env = {} } = {}) {
  counter += 1;
  const names = { input: `in-${counter}.json`, result: `out-${counter}.json`, summary: `sum-${counter}.md`, output: `gh-${counter}.txt` };
  writeFileSync(join(repo, names.input), JSON.stringify(body));
  const seen = { stdout: "", stderr: "", measured: null };
  const fullEnv = { GITHUB_STEP_SUMMARY: join(repo, names.summary), GITHUB_OUTPUT: join(repo, names.output), ...env };
  const code = await runCli({ argv: ["--input", names.input, "--result", names.result], env: fullEnv, cwd: repo, stdout: { write: (t) => { seen.stdout += t; } }, stderr: { write: (t) => { seen.stderr += t; } }, measure: async (args) => { seen.measured = args; return measure(args); } });
  const has = (name) => existsSync(join(repo, name));
  return { code, ...seen, names, doc: has(names.result) ? readJson(names.result) : null, summary: has(names.summary) ? readText(names.summary) : null, outputs: has(names.output) ? readText(names.output) : null };
}

test("excluding a source and a test: the measurement is told only the tests that stay, the counted lines and the denominator leave the source out, and the run matches", async () => {
  const r = await go({ ...BASE, exclusions: [ex("tests/b.test.mjs"), ex("src/b.mjs")] });
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.measured.requiredTestPaths, ["tests/a.test.mjs"]);
  assert.deepEqual(r.measured.input.exclusions.map((e) => e.path), ["src/b.mjs", "tests/b.test.mjs"]);
  assert.deepEqual([r.doc.outcome, r.doc.reasonCodes, r.doc.coveredLines, r.doc.totalLines, r.doc.denominator.resolvedFileCount, r.doc.denominator.measuredFileCount], ["match", [], 1, 1, 1, 1]);
  assert.deepEqual(r.doc.exclusions, [{ path: "src/b.mjs", reason: REASON, kind: "source" }, { path: "tests/b.test.mjs", reason: REASON, kind: "test" }]);
  assert.equal(r.doc.exclusionCount, 2);
  assert.deepEqual(r.doc.perFile.map((f) => f.path), ["src/a.mjs"]);
});

test("the same run without the exclusions is not a match: the source below the line is counted and the other test is required", async () => {
  const r = await go({ ...BASE });
  assert.deepEqual([r.code, r.doc.outcome, r.doc.reasonCodes, r.doc.notRunPaths, r.doc.exclusions, r.doc.exclusionCount], [1, "mismatch", ["TESTS_NOT_RUN", "BELOW_THRESHOLD"], ["tests/b.test.mjs"], [], 0]);
});

test("all four surfaces show the exclusions: the summary head and list, the notice sentence, the output count and the result file", async () => {
  const r = await go({ ...BASE, exclusions: [ex("tests/b.test.mjs"), ex("src/b.mjs")] });
  assert.equal(r.summary.split("\n")[0], "Excluded from the gate: 2 (source 1, test 1, both 0)");
  assert.ok(r.summary.includes("| Exclusions | 2 |") && r.summary.includes("Excluded files (2):") && r.summary.includes(`- \`src/b.mjs\` (source): \`${REASON}\``));
  assert.equal(r.stdout, "::notice::Coverage gate: match, 100.00%25 of 100.00%25 required. Exclusions: 2.");
  assert.ok(r.outputs.includes("exclusion-count=2\n"));
  assert.ok(!r.stdout.includes("src/b.mjs") && !r.stdout.includes("github.com"));
});

test("the order of the exclusions in the input does not change a single output byte", async () => {
  const a = await go({ ...BASE, exclusions: [ex("src/b.mjs"), ex("tests/b.test.mjs")] });
  const b = await go({ ...BASE, exclusions: [ex("tests/b.test.mjs"), ex("src/b.mjs")] });
  assert.equal(readText(a.names.result), readText(b.names.result));
  assert.deepEqual([a.summary, a.stdout, a.outputs], [b.summary, b.stdout, b.outputs]);
});

test("an empty exclusions list and an omitted one give the same bytes on every surface, for a match, a mismatch and an unobservable run", async () => {
  const unobservable = async () => goldenMeasurement({ kind: "unobservable", cause: "failed", records: undefined, measuredPaths: undefined });
  const mismatch = async () => goldenMeasurement({ records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 0 }], testFilesRun: ["tests/a.test.mjs", "tests/b.test.mjs"], measuredPaths: ["src/a.mjs", "src/b.mjs"] });
  const match = async () => goldenMeasurement({ records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 1 }, { path: "src/b.mjs", lineNumber: 1, hitCount: 1 }], measuredPaths: ["src/a.mjs", "src/b.mjs"], testFilesRun: ["tests/a.test.mjs", "tests/b.test.mjs"] });
  for (const measure of [match, mismatch, unobservable]) {
    const omitted = await go({ ...BASE }, { measure });
    const empty = await go({ ...BASE, exclusions: [] }, { measure });
    assert.equal(readText(omitted.names.result), readText(empty.names.result));
    assert.deepEqual([omitted.summary, omitted.stdout, omitted.outputs, omitted.code], [empty.summary, empty.stdout, empty.outputs, empty.code]);
    assert.ok(!omitted.summary.includes("Excluded") && !omitted.stdout.includes("Exclusions:"));
  }
});

test("an exclusion that fails the input check is an input failure with no measurement and exit 2, and the details carry no path or reason", async () => {
  const bad = [
    [[{ path: "src/b.mjs", reason: "no address here" }], "INPUT_FIELD_INVALID", "exclusions[0].reason"],
    [[{ path: "src/b.mjs" }], "INPUT_FIELD_MISSING", "exclusions[0].reason"],
    [[{ path: "src/b.mjs", reason: REASON, kind: "source" }], "INPUT_FIELD_UNKNOWN", "exclusions[0].kind"],
    [[ex("src/b.mjs"), ex("src/b.mjs")], "INPUT_FIELD_INVALID", "exclusions[1].path"],
    [{ path: "src/b.mjs" }, "INPUT_FIELD_INVALID", "exclusions"],
  ];
  for (const [exclusions, reasonCode, field] of bad) {
    const r = await go({ ...BASE, exclusions });
    assert.deepEqual([r.code, r.measured, r.doc.inputFailure.reasonCode, r.doc.inputFailure.field, r.doc.exclusions, r.doc.exclusionCount], [2, null, reasonCode, field, [], 0], field);
    assert.ok(!r.doc.inputFailure.detail.includes(URL_OK), field);
  }
});

test("an exclusion that matches no file of either list, or leaves nothing, is an input failure with no measurement", async () => {
  const unmatched = await go({ ...BASE, exclusions: [ex("src/missing-marker.mjs")] });
  assert.deepEqual([unmatched.code, unmatched.measured, unmatched.doc.inputFailure.reasonCode, unmatched.doc.inputFailure.field], [2, null, "TARGET_UNRESOLVED", "exclusions[0].path"]);
  assert.ok(!unmatched.doc.inputFailure.detail.includes("missing-marker") && !unmatched.summary.includes("missing-marker") && !unmatched.stdout.includes("missing-marker"));
  const allTests = await go({ ...BASE, testTargets: ["tests/a.test.mjs"], exclusions: [ex("tests/a.test.mjs")] });
  assert.deepEqual([allTests.code, allTests.measured, allTests.doc.inputFailure.reasonCode, allTests.doc.inputFailure.field], [2, null, "TARGET_EMPTY", "exclusions"]);
});

// The measurement runs only the test files it is handed (measure-node.mjs buildNodeArgs), so a test file that is excluded
// but still inside testTargets is never run: its failure cannot turn the run into TEST_FAILED. Checked with the real command.
const BAD_TEST = 'throw new Error("fixture load failure");\n';
function realRepoRun(files, body) {
  const dir = makeRepo({ ...files, "input.json": JSON.stringify(body) });
  try {
    const r = spawnSync(process.execPath, [CLI, "--input", "input.json", "--result", "result.json"], { cwd: dir, env: process.env, encoding: "utf8" });
    return { status: r.status, stderr: r.stderr, doc: JSON.parse(readFileSync(join(dir, "result.json"), "utf8")) };
  } finally {
    removeDir(dir);
  }
}
const REAL_FILES = { "src/a.mjs": SOURCE_A, "tests/a.test.mjs": PASS_TEST, "tests/bad.test.mjs": BAD_TEST };

test("real run: a failing test file left in testTargets fails the run, and the same file excluded is not run and does not", () => {
  const without = realRepoRun(REAL_FILES, { ...BASE });
  assert.deepEqual([without.status, without.doc.outcome, without.doc.reasonCodes, without.doc.testFailurePaths], [1, "unobservable", ["TEST_FAILED"], ["tests/bad.test.mjs"]]);
  const withIt = realRepoRun(REAL_FILES, { ...BASE, exclusions: [ex("tests/bad.test.mjs")] });
  assert.equal(withIt.status, 0, withIt.stderr);
  assert.deepEqual([withIt.doc.outcome, withIt.doc.reasonCodes, withIt.doc.testFailurePaths, withIt.doc.notRunPaths], ["match", [], [], []]);
  assert.deepEqual(withIt.doc.exclusions, [{ path: "tests/bad.test.mjs", reason: REASON, kind: "test" }]);
});

test("real run: an excluded source that no test reaches leaves the denominator, and without the exclusion it is unmeasured", () => {
  const files = { ...REAL_FILES, "tests/bad.test.mjs": PASS_TEST, "src/dark.mjs": "export const dark = 1;\n" };
  const without = realRepoRun(files, { ...BASE });
  assert.deepEqual([without.status, without.doc.outcome, without.doc.unmeasuredPaths], [1, "mismatch", ["src/dark.mjs"]]);
  const withIt = realRepoRun(files, { ...BASE, exclusions: [ex("src/dark.mjs")] });
  assert.equal(withIt.status, 0, withIt.stderr);
  assert.deepEqual([withIt.doc.outcome, withIt.doc.unmeasuredPaths, withIt.doc.denominator.resolvedFileCount, withIt.doc.exclusionCount], ["match", [], 1, 1]);
});
