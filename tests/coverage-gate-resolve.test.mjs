import assert from "node:assert/strict";
import test from "node:test";
import { judge } from "../scripts/coverage-gate/judge.mjs";
import { resolveInput } from "../scripts/coverage-gate/resolve.mjs";
import { git, write } from "./helpers.mjs";
import { makeDir, makeRepo, removeDir } from "./coverage-gate-fixtures.mjs";

const repo = makeRepo({
  "src/a.mjs": "export const a = 1;\n",
  "src/sub/b.mjs": "export const b = 2;\n",
  "root.mjs": "export const r = 0;\n",
  "tests/a.test.mjs": "",
  "tests/sub/b.test.js": "",
  "tests/helper.mjs": "",
  "tests/notes.test.ts": "",
});
test.after(() => removeDir(repo));

const input = (declaredTargets, testTargets, exclusions = []) => ({ schemaVersion: 1, shape: "node-builtin", declaredTargets, testTargets, deadlineSeconds: 600, totalBudgetSeconds: 900, exclusions });

test("directories and tracked files resolve to tracked files in code-point order, with no repeats", () => {
  const r = resolveInput(repo, input(["src", "root.mjs", "src/a.mjs"], ["tests"]));
  assert.equal(r.ok, true);
  assert.deepEqual(r.denominatorPaths, ["root.mjs", "src/a.mjs", "src/sub/b.mjs"]);
});

test("only files whose name has a test-file pattern are required tests, and none is dropped silently", () => {
  const r = resolveInput(repo, input(["src"], ["tests"]));
  assert.deepEqual(r.requiredTestPaths, ["tests/a.test.mjs", "tests/sub/b.test.js"]);
});

test("a test target may be a single tracked file", () => {
  assert.deepEqual(resolveInput(repo, input(["src"], ["tests/a.test.mjs"])).requiredTestPaths, ["tests/a.test.mjs"]);
});

test("./ and doubled slashes in a declaration are the same as the plain form", () => {
  assert.deepEqual(resolveInput(repo, input(["./src/", "src//sub"], ["./tests"])).denominatorPaths, ["src/a.mjs", "src/sub/b.mjs"]);
});

test("a declaration that is not a tracked file or directory is named, never skipped", () => {
  const f = resolveInput(repo, input(["src", "nope", "also-missing/"], ["tests"])).failure;
  assert.deepEqual([f.reasonCode, f.field], ["TARGET_UNRESOLVED", "denominator.targets"]);
  assert.ok(f.detail.includes("nope") && f.detail.includes("also-missing/"));
  const t = resolveInput(repo, input(["src"], ["tests", "gone"])).failure;
  assert.deepEqual([t.reasonCode, t.field], ["TARGET_UNRESOLVED", "testTargets"]);
});

test("paths outside the repository are unresolved", () => {
  assert.equal(resolveInput(repo, input(["../x"], ["tests"])).failure.reasonCode, "TARGET_UNRESOLVED");
  assert.equal(resolveInput(repo, input(["/etc"], ["tests"])).failure.reasonCode, "TARGET_UNRESOLVED");
});

test("a declaration outside the repository is named without its path", () => {
  const f = resolveInput(repo, input(["src", "/fixture-private/home/x.mjs", "../fixture-escape/y.mjs", "nope"], ["tests"])).failure;
  assert.ok(!f.detail.includes("fixture-private") && !f.detail.includes("fixture-escape"));
  assert.ok(f.detail.includes("<outside the repository>") && f.detail.includes("nope"));
});

test("test targets with no test file in them are empty, not a pass", () => {
  const f = resolveInput(repo, input(["src"], ["src"])).failure;
  assert.deepEqual([f.reasonCode, f.field], ["TARGET_EMPTY", "testTargets"]);
});

test("a declared directory that holds no tracked file is unresolved, and an empty repository has nothing to count", () => {
  const empty = makeRepo({ "readme.txt": "x\n" });
  try {
    const f = resolveInput(empty, input(["lib"], ["tests"])).failure;
    assert.equal(f.reasonCode, "TARGET_UNRESOLVED");
  } finally {
    removeDir(empty);
  }
});

test("the denominator reports TARGET_EMPTY when the declaration resolves to zero files", () => {
  const dir = makeDir();
  git(dir, ["init", "-q"]);
  try {
    // "." means every tracked file, and this repository tracks none.
    const f = resolveInput(dir, input(["."], ["."])).failure;
    assert.deepEqual([f.reasonCode, f.field], ["TARGET_EMPTY", "denominator.targets"]);
  } finally {
    removeDir(dir);
  }
});

test("a directory that is not a git repository is an error, not a pass", () => {
  const dir = makeDir({ "a.mjs": "" });
  try {
    assert.throws(() => resolveInput(dir, input(["a.mjs"], ["a.mjs"])));
  } finally {
    removeDir(dir);
  }
});

test("a long list of missing names is cut at twenty with a count of the rest", () => {
  const names = Array.from({ length: 25 }, (_, i) => `missing-${String(i).padStart(2, "0")}`);
  const f = resolveInput(repo, input(names, ["tests"])).failure;
  assert.ok(f.detail.includes("missing-19") && !f.detail.includes("missing-20"));
  assert.ok(f.detail.includes("5 more"));
});

// U5: the exclusions are taken out of the denominator and the required tests in this one place (BR10.1 to BR10.3, BR10.6).
const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const REASON = `Generated file, see ${URL_OK} for the decision.`;
const entry = (path) => ({ path, reason: REASON });
const SOURCES = ["root.mjs", "src/a.mjs", "src/sub/b.mjs"];
const TESTS = ["tests/a.test.mjs", "tests/sub/b.test.js"];

test("with no exclusions the result is the old result plus an empty excluded list", () => {
  const r = resolveInput(repo, input(["src", "root.mjs"], ["tests"]));
  assert.deepEqual(r, { ok: true, denominatorPaths: SOURCES, requiredTestPaths: TESTS, excluded: [] });
});

test("an excluded source leaves the denominator and not the required tests, and is kept with its reason and the kind source", () => {
  const r = resolveInput(repo, input(["src", "root.mjs"], ["tests"], [entry("src/a.mjs")]));
  assert.equal(r.ok, true);
  assert.deepEqual(r.denominatorPaths, ["root.mjs", "src/sub/b.mjs"]);
  assert.deepEqual(r.requiredTestPaths, TESTS);
  assert.deepEqual(r.excluded, [{ path: "src/a.mjs", reason: REASON, kind: "source" }]);
});

test("an excluded test leaves the required tests and not the denominator, kind test; the tests not named stay required", () => {
  const r = resolveInput(repo, input(["src", "root.mjs"], ["tests"], [entry("tests/a.test.mjs")]));
  assert.deepEqual([r.ok, r.denominatorPaths, r.requiredTestPaths], [true, SOURCES, ["tests/sub/b.test.js"]]);
  assert.deepEqual(r.excluded, [{ path: "tests/a.test.mjs", reason: REASON, kind: "test" }]);
});

test("a file that is both in the denominator and a required test leaves both, kind both", () => {
  const r = resolveInput(repo, input(["src", "tests"], ["tests"], [entry("tests/a.test.mjs")]));
  assert.equal(r.ok, true);
  assert.equal(r.denominatorPaths.includes("tests/a.test.mjs"), false);
  assert.deepEqual(r.requiredTestPaths, ["tests/sub/b.test.js"]);
  assert.deepEqual(r.excluded, [{ path: "tests/a.test.mjs", reason: REASON, kind: "both" }]);
});

test("narrowing the test targets is not an exclusion: no record is kept, and the narrowed list is just the required tests", () => {
  const r = resolveInput(repo, input(["src"], ["tests/sub"]));
  assert.deepEqual([r.ok, r.requiredTestPaths, r.excluded], [true, ["tests/sub/b.test.js"], []]);
});

test("a path that is a tracked file but in neither list is refused at its position, with a fixed sentence that does not carry the path", () => {
  for (const path of ["root.mjs", "tests/sub/b.test.js", "tests/helper.mjs", "src", "tests", "src/*.mjs", "./src/a.mjs", "SRC/A.MJS", "src/missing.mjs", "../x.mjs", "/abs/leak-marker.mjs"]) {
    const r = resolveInput(repo, input(["src"], ["tests/a.test.mjs"], [entry(path)]));
    assert.equal(r.ok, false, path);
    assert.deepEqual([r.failure.reasonCode, r.failure.field], ["TARGET_UNRESOLVED", "exclusions[0].path"], path);
    assert.ok(!r.failure.detail.includes(path) && !/[\r\n]/.test(r.failure.detail), path);
  }
});

test("an untracked file is not a file of either list, so it is refused", () => {
  const dir = makeRepo({ "src/a.mjs": "export const a = 1;\n", "tests/a.test.mjs": "" });
  try {
    write(dir, "src/untracked.mjs", "export const u = 1;\n");
    const r = resolveInput(dir, input(["src"], ["tests"], [entry("src/untracked.mjs")]));
    assert.deepEqual([r.ok, r.failure.reasonCode, r.failure.field], [false, "TARGET_UNRESOLVED", "exclusions[0].path"]);
  } finally {
    removeDir(dir);
  }
});

test("the first unmatched position is named", () => {
  const r = resolveInput(repo, input(["src"], ["tests"], [entry("src/a.mjs"), entry("zzz-missing"), entry("zzz-other")]));
  assert.deepEqual([r.failure.reasonCode, r.failure.field], ["TARGET_UNRESOLVED", "exclusions[1].path"]);
});

test("taking out every denominator file, or every required test, is refused with its own sentence", () => {
  const noSource = resolveInput(repo, input(["src/a.mjs"], ["tests"], [entry("src/a.mjs")]));
  assert.deepEqual([noSource.ok, noSource.failure.reasonCode, noSource.failure.field], [false, "TARGET_EMPTY", "exclusions"]);
  const noTest = resolveInput(repo, input(["src"], ["tests/a.test.mjs"], [entry("tests/a.test.mjs")]));
  assert.deepEqual([noTest.ok, noTest.failure.reasonCode, noTest.failure.field], [false, "TARGET_EMPTY", "exclusions"]);
  assert.notEqual(noSource.failure.detail, noTest.failure.detail);
});

test("an earlier resolution failure comes before the exclusions are looked at", () => {
  const r = resolveInput(repo, input(["nope"], ["tests"], [entry("not-a-file")]));
  assert.deepEqual([r.failure.reasonCode, r.failure.field], ["TARGET_UNRESOLVED", "denominator.targets"]);
  const t = resolveInput(repo, input(["src"], ["gone"], [entry("not-a-file")]));
  assert.deepEqual([t.failure.reasonCode, t.failure.field], ["TARGET_UNRESOLVED", "testTargets"]);
});

test("the checked input is not changed and the result does not share its exclusions", () => {
  const given = input(["src"], ["tests"], [entry("src/a.mjs")]);
  const before = JSON.stringify(given);
  const r = resolveInput(repo, given);
  assert.equal(JSON.stringify(given), before);
  r.excluded[0].reason = "changed afterwards";
  assert.equal(given.exclusions[0].reason, REASON);
});

const records = (paths) => paths.map((path) => ({ path, lineNumber: 1, hitCount: 1 }));
const observed = (paths, testFilesRun) => ({
  kind: "records", records: records(paths), measuredPaths: paths, testObservations: [], testFilesRun, testFailurePaths: [],
  measurementDefinition: { name: "node-builtin", measuredTarget: "declared tracked sources", toolName: "node --test coverage", toolVersion: "22.0.0" },
  childProcessLinesCounted: true, cleanupFailed: false, attempt: { toolName: "node", deadlineSeconds: 600, totalBudgetSeconds: 900, spentSeconds: 1, endState: "completed" },
});

test("excluding a source does not hide a required test that did not run: the judge still lists it as not run", () => {
  const r = resolveInput(repo, input(["src", "root.mjs"], ["tests"], [entry("src/sub/b.mjs")]));
  const verdict = judge({ denominatorPaths: r.denominatorPaths, requiredTestPaths: r.requiredTestPaths, measurement: observed(["root.mjs", "src/a.mjs"], ["tests/a.test.mjs"]) });
  assert.deepEqual([verdict.outcome, verdict.reasonCodes, verdict.notRunPaths], ["mismatch", ["TESTS_NOT_RUN"], ["tests/sub/b.test.js"]]);
});

test("an excluded test is not listed as not run, an unnamed one still is, and an excluded source with records is not counted", () => {
  const r = resolveInput(repo, input(["src", "root.mjs"], ["tests"], [entry("tests/a.test.mjs"), entry("src/sub/b.mjs")]));
  const verdict = judge({ denominatorPaths: r.denominatorPaths, requiredTestPaths: r.requiredTestPaths, measurement: observed(["root.mjs", "src/a.mjs", "src/sub/b.mjs"], []) });
  assert.deepEqual([verdict.reasonCodes, verdict.notRunPaths, verdict.unmeasuredPaths], [["TESTS_NOT_RUN"], ["tests/sub/b.test.js"], []]);
  assert.deepEqual(verdict.perFile.map((f) => f.path), ["root.mjs", "src/a.mjs"]);
});

test("a file left in the denominator that was not measured still fails, with or without exclusions", () => {
  const r = resolveInput(repo, input(["src", "root.mjs"], ["tests"], [entry("src/sub/b.mjs")]));
  const verdict = judge({ denominatorPaths: r.denominatorPaths, requiredTestPaths: r.requiredTestPaths, measurement: observed(["root.mjs"], TESTS) });
  assert.deepEqual([verdict.outcome, verdict.reasonCodes, verdict.unmeasuredPaths], ["mismatch", ["UNMEASURED_FILES"], ["src/a.mjs"]]);
});
