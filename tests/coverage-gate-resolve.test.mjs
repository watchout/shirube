import assert from "node:assert/strict";
import test from "node:test";
import { resolveInput } from "../scripts/coverage-gate/resolve.mjs";
import { git } from "./helpers.mjs";
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

const input = (declaredTargets, testTargets) => ({ schemaVersion: 1, shape: "node-builtin", declaredTargets, testTargets, deadlineSeconds: 600, totalBudgetSeconds: 900 });

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
