import assert from "node:assert/strict";
import { truncateSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { GUARANTEED_NODE_MAJOR, OBSERVATION_FILES, isGuaranteedNode, measureNode, observeDir } from "../scripts/coverage-gate/measure-node.mjs";
import { LCOV_MAX_BYTES } from "../scripts/coverage-gate/lcov.mjs";
import { PASS_TEST, REPORTER_CASES, SOURCE_A, makeDir, makeRepo, removeDir } from "./coverage-gate-fixtures.mjs";

const CWD = "/repo";
const TESTS = ["t/a.test.mjs"];
const GOOD_RUN = { spawnFailed: false, exitCode: 0, signal: null, stoppedBy: null, spentSeconds: 0 };
const passLine = { type: "test:pass", file: "/repo/t/a.test.mjs", name: "adds", nesting: 0, line: 5, column: 1, detailsType: "test", skip: false, todo: false };
const failLine = { ...passLine, type: "test:fail", name: "bad" };
const jsonl = (events) => events.map((e) => `${JSON.stringify(e)}\n`).join("");
const GOOD_LCOV = "TN:\nSF:/repo/src/a.mjs\nDA:1,1\nDA:2,1\nLF:2\nLH:2\nend_of_record\n";

function obsDir({ events, lcov }) {
  const dir = makeDir();
  if (events !== undefined) writeFileSync(join(dir, OBSERVATION_FILES.events), events);
  if (lcov !== undefined) writeFileSync(join(dir, OBSERVATION_FILES.lcov), lcov);
  return dir;
}

function observe({ events, lcov, run = {}, tests = TESTS }) {
  const dir = obsDir({ events, lcov });
  try {
    return observeDir({ dir, run: { ...GOOD_RUN, ...run }, cwd: CWD, requiredTestPaths: tests });
  } finally {
    removeDir(dir);
  }
}

test("only Node 22 and later are accepted; unreadable versions are not", () => {
  assert.equal(GUARANTEED_NODE_MAJOR, 22);
  for (const [version, expected] of [["21.9.0", false], ["22.0.0", true], ["22.23.4", true], ["26.1.0", true], ["abc", false], ["", false], ["v22.1.0", false]]) assert.equal(isGuaranteedNode(version), expected, version);
});

test("an old Node does not run a child and reports it cannot count child-process lines", async () => {
  const dir = makeRepo({ "t/a.test.mjs": PASS_TEST, "src/a.mjs": SOURCE_A });
  try {
    const r = await measureNode({ cwd: dir, runId: "r1", input: { deadlineSeconds: 30, totalBudgetSeconds: 60 }, requiredTestPaths: TESTS, nodeVersion: "21.9.0" });
    assert.deepEqual([r.kind, r.cause, r.childProcessLinesCounted, r.cleanupFailed], ["unobservable", "child_process_not_countable", false, false]);
    assert.equal(r.measurementDefinition.toolVersion, "21.9.0");
    assert.equal(r.attempt.spentSeconds, 0);
    assert.deepEqual(r.testObservations, []);
  } finally {
    removeDir(dir);
  }
});

test("observeDir: a good run becomes records", () => {
  const r = observe({ events: jsonl([passLine]), lcov: GOOD_LCOV });
  assert.equal(r.kind, "records");
  assert.deepEqual(r.measuredPaths, ["src/a.mjs"]);
  assert.deepEqual(r.records.map((x) => x.lineNumber), [1, 2]);
  assert.deepEqual(r.testFilesRun, TESTS);
  assert.deepEqual(r.testFailurePaths, []);
  assert.equal(r.testObservations[0].passed, 1);
});

test("observeDir: how the child ended decides the cause (BR2.7)", () => {
  const ok = { events: jsonl([passLine]), lcov: GOOD_LCOV };
  assert.equal(observe({ ...ok, run: { stoppedBy: "timed_out" } }).cause, "timed_out");
  assert.equal(observe({ ...ok, run: { stoppedBy: "budget_exceeded" } }).cause, "budget_exceeded");
  assert.equal(observe({ ...ok, run: { spawnFailed: true } }).cause, "failed");
  assert.equal(observe({ ...ok, run: { signal: "SIGKILL" } }).cause, "failed");
  assert.equal(observe({ ...ok, run: { exitCode: 3 } }).cause, "failed");
});

test("observeDir: a failed test is test_failed whatever the exit code, and the file is named", () => {
  for (const exitCode of [0, 1]) {
    const r = observe({ events: jsonl([passLine, failLine]), lcov: GOOD_LCOV, run: { exitCode } });
    assert.equal(r.kind, "unobservable");
    assert.equal(r.cause, "test_failed");
    assert.deepEqual(r.testFailurePaths, TESTS);
  }
});

test("observeDir: a failure that belongs to no required file is still test_failed", () => {
  const r = observe({ events: jsonl([{ ...failLine, file: undefined }]), lcov: GOOD_LCOV, run: { exitCode: 1 } });
  assert.equal(r.cause, "test_failed");
  assert.deepEqual(r.testFailurePaths, []);
});

test("observeDir: missing, empty or broken events are failed", () => {
  assert.equal(observe({ lcov: GOOD_LCOV }).cause, "failed");
  assert.equal(observe({ events: "", lcov: GOOD_LCOV }).cause, "failed");
  assert.equal(observe({ events: "not json\n", lcov: GOOD_LCOV }).cause, "failed");
  assert.equal(observe({ events: '{"type":"malformed"}\n', lcov: GOOD_LCOV }).cause, "failed");
});

test("observeDir: a missing, empty or record-less lcov is no_records; a broken one is failed", () => {
  const events = jsonl([passLine]);
  assert.equal(observe({ events }).cause, "no_records");
  assert.equal(observe({ events, lcov: "" }).cause, "no_records");
  assert.equal(observe({ events, lcov: "TN:\nSF:/repo/src/a.mjs\nend_of_record\n" }).cause, "no_records");
  assert.equal(observe({ events, lcov: "TN:\nSF:/repo/src/a.mjs\nDA:1,1\nDA:1,1\nend_of_record\n" }).cause, "failed");
});

test("observeDir: an lcov file over 64 MiB is refused without being read", () => {
  const dir = obsDir({ events: jsonl([passLine]), lcov: "" });
  try {
    truncateSync(join(dir, OBSERVATION_FILES.lcov), LCOV_MAX_BYTES + 1);
    const r = observeDir({ dir, run: GOOD_RUN, cwd: CWD, requiredTestPaths: TESTS });
    assert.equal(r.cause, "failed");
  } finally {
    removeDir(dir);
  }
});

test("observeDir: a required test with only skipped tests did not run", () => {
  const r = observe({ events: jsonl([{ ...passLine, skip: true }]), lcov: GOOD_LCOV });
  assert.equal(r.kind, "records");
  assert.deepEqual(r.testFilesRun, []);
});

// Real child processes (Node's own test runner and coverage).
const baseInput = { deadlineSeconds: 60, totalBudgetSeconds: 120 };
const measure = (dir, tests, over = {}) => measureNode({ cwd: dir, runId: "r1", input: baseInput, requiredTestPaths: tests, nodeVersion: process.versions.node, ...over });

test("real run: lines of loaded files are recorded, files never loaded are not, and the Node version is recorded", async () => {
  const dir = makeRepo({ "src/a.mjs": SOURCE_A, "src/unused.mjs": "export const unused = 1;\n", "t/a.test.mjs": PASS_TEST });
  try {
    const r = await measure(dir, TESTS);
    assert.equal(r.kind, "records");
    assert.deepEqual(r.measuredPaths, ["src/a.mjs"]);
    assert.ok(r.records.length >= 1 && r.records.every((x) => x.path === "src/a.mjs" && x.hitCount >= 1));
    assert.deepEqual(r.testFilesRun, TESTS);
    assert.equal(r.childProcessLinesCounted, true);
    assert.equal(r.cleanupFailed, false);
    assert.equal(r.attempt.endState, "completed");
    assert.equal(r.measurementDefinition.toolVersion, process.versions.node);
    assert.equal(r.measurementDefinition.name, "node-builtin");
  } finally {
    removeDir(dir);
  }
});

test("real run: the six reporter shapes, a nested empty file and a same-name test", async () => {
  const dir = makeRepo({ ...REPORTER_CASES, "src/a.mjs": SOURCE_A, "t/a.test.mjs": PASS_TEST });
  try {
    const tests = [...Object.keys(REPORTER_CASES).filter((p) => !p.includes("load-fail")), ...TESTS];
    const r = await measure(dir, tests);
    assert.equal(r.kind, "records");
    assert.deepEqual(r.testFilesRun, ["cases/pass.test.mjs", "cases/sub/same-name.test.mjs", "t/a.test.mjs"]);
    const byPath = Object.fromEntries(r.testObservations.map((o) => [o.path, o]));
    for (const empty of ["cases/empty.test.mjs", "cases/import-only.test.mjs", "cases/sub/nested-empty.test.mjs"]) assert.deepEqual([byPath[empty].passed, byPath[empty].implicitFilePassCount], [0, 1], empty);
    assert.deepEqual([byPath["cases/all-skip.test.mjs"].passed, byPath["cases/all-skip.test.mjs"].skipped], [0, 2]);
    assert.deepEqual([byPath["cases/all-todo.test.mjs"].passed, byPath["cases/all-todo.test.mjs"].todo], [0, 2]);
  } finally {
    removeDir(dir);
  }
});

test("real run: a file that fails to load is test_failed and named", async () => {
  const dir = makeRepo({ ...REPORTER_CASES, "src/a.mjs": SOURCE_A, "t/a.test.mjs": PASS_TEST });
  try {
    const r = await measure(dir, ["cases/load-fail.test.mjs", ...TESTS]);
    assert.equal(r.kind, "unobservable");
    assert.equal(r.cause, "test_failed");
    assert.deepEqual(r.testFailurePaths, ["cases/load-fail.test.mjs"]);
  } finally {
    removeDir(dir);
  }
});

test("real run: tests that load no source give no records", async () => {
  const dir = makeRepo({ "cases/pass.test.mjs": REPORTER_CASES["cases/pass.test.mjs"] });
  try {
    const r = await measure(dir, ["cases/pass.test.mjs"]);
    assert.deepEqual([r.kind, r.cause], ["unobservable", "no_records"]);
  } finally {
    removeDir(dir);
  }
});

test("real run: a file name that starts with a dash is passed as a path, not an option", async () => {
  const dir = makeRepo({ "src/a.mjs": SOURCE_A, "-x.test.mjs": PASS_TEST.replace("../src/a.mjs", "./src/a.mjs") });
  try {
    const r = await measure(dir, ["-x.test.mjs"]);
    assert.equal(r.kind, "records");
    assert.deepEqual(r.testFilesRun, ["-x.test.mjs"]);
  } finally {
    removeDir(dir);
  }
});

test("real run: a slow test is stopped at the deadline and at the total budget", async () => {
  const slow = 'import test from "node:test";\ntest("slow", async () => { await new Promise((r) => setTimeout(r, 60000)); });\n';
  const dir = makeRepo({ "t/slow.test.mjs": slow });
  try {
    const timed = await measure(dir, ["t/slow.test.mjs"], { input: { deadlineSeconds: 1, totalBudgetSeconds: 60 } });
    assert.deepEqual([timed.kind, timed.cause, timed.attempt.endState], ["unobservable", "timed_out", "timed_out"]);
    const budget = await measure(dir, ["t/slow.test.mjs"], { input: { deadlineSeconds: 60, totalBudgetSeconds: 1 } });
    assert.deepEqual([budget.cause, budget.attempt.endState], ["budget_exceeded", "budget_exceeded"]);
  } finally {
    removeDir(dir);
  }
});

test("real run: when the temp directory cannot be removed the result says so, even though measuring worked", async () => {
  const dir = makeRepo({ "src/a.mjs": SOURCE_A, "t/a.test.mjs": PASS_TEST });
  let leftover;
  try {
    const removeFn = async (path) => { leftover = path; throw new Error("EACCES"); };
    const r = await measure(dir, TESTS, { removeFn });
    assert.equal(r.cleanupFailed, true);
    assert.equal(r.kind, "records");
  } finally {
    removeDir(dir);
    if (leftover) removeDir(leftover);
  }
});
