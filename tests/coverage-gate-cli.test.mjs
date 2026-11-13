import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, linkSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCli } from "../scripts/coverage-gate/cli.mjs";
import { REASON_CODES } from "../scripts/coverage-gate/judge.mjs";
import { CLI, PASS_TEST, SOURCE_A, makeRepo, removeDir } from "./coverage-gate-fixtures.mjs";

const GOOD_INPUT = JSON.stringify({ schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["src"] }, testTargets: ["tests"] });
const repo = makeRepo({ "src/a.mjs": SOURCE_A, "tests/a.test.mjs": PASS_TEST, "input.json": GOOD_INPUT, "notes.txt": "tracked file\n" });
test.after(() => removeDir(repo));

const readJson = (name) => JSON.parse(readFileSync(join(repo, name), "utf8"));
const fresh = (name) => join(repo, name);

function collect() {
  const out = { stdout: "", stderr: "" };
  return { out, stdout: { write: (t) => { out.stdout += t; } }, stderr: { write: (t) => { out.stderr += t; } } };
}

const fakeMeasurement = (over = {}) => ({
  kind: "records",
  records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 1 }],
  measuredPaths: ["src/a.mjs"],
  testObservations: [],
  testFilesRun: ["tests/a.test.mjs"],
  testFailurePaths: [],
  measurementDefinition: { name: "node-builtin", measuredTarget: "declared tracked sources", toolName: "node --test coverage", toolVersion: "22.0.0" },
  childProcessLinesCounted: true,
  cleanupFailed: false,
  attempt: { toolName: "node", deadlineSeconds: 600, totalBudgetSeconds: 900, spentSeconds: 1, endState: "completed" },
  ...over,
});

async function inProcess(args, { env = {}, measure = async () => fakeMeasurement(), io } = {}) {
  const { out, stdout, stderr } = collect();
  const code = await runCli({ argv: args, env, cwd: repo, stdout, stderr, measure, io });
  return { code, ...out };
}

const std = (result) => ["--input", "input.json", "--result", result];
const stderrJson = (text) => JSON.parse(text.trim());

test("a match writes the result and the notice and exits 0", async () => {
  const r = await inProcess(std("r-match.json"));
  assert.equal(r.code, 0);
  assert.match(r.stdout, /^::notice::/u);
  const doc = readJson("r-match.json");
  assert.deepEqual([doc.outcome, doc.runId, doc.inputFailure], ["match", "local", null]);
  assert.equal(r.stderr, "");
});

test("only a match exits 0: a mismatch and an unobservable result exit 1", async () => {
  const low = await inProcess(std("r-low.json"), { measure: async () => fakeMeasurement({ records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 0 }] }) });
  assert.equal(low.code, 1);
  assert.equal(readJson("r-low.json").outcome, "mismatch");
  const dark = await inProcess(std("r-dark.json"), { measure: async () => ({ kind: "unobservable", cause: "failed", testObservations: [], testFilesRun: [], testFailurePaths: [], measurementDefinition: fakeMeasurement().measurementDefinition, childProcessLinesCounted: true, cleanupFailed: false, attempt: fakeMeasurement().attempt }) });
  assert.equal(dark.code, 1);
  assert.equal(readJson("r-dark.json").outcome, "unobservable");
  assert.match(dark.stdout, /^::error::/u);
});

test("the measurement is told the validated input, the resolved tests and the run id", async () => {
  let seen;
  await inProcess(std("r-seen.json"), { env: { GITHUB_RUN_ID: "77", GITHUB_RUN_ATTEMPT: "2" }, measure: async (args) => { seen = args; return fakeMeasurement(); } });
  assert.deepEqual([seen.cwd, seen.runId, seen.requiredTestPaths], [repo, "77-2", ["tests/a.test.mjs"]]);
  assert.deepEqual([seen.input.deadlineSeconds, seen.input.totalBudgetSeconds], [600, 900]);
  assert.equal(readJson("r-seen.json").runId, "77-2");
});

test("the run id is read once from the environment: both set, both absent, or an error", async () => {
  for (const env of [{ GITHUB_RUN_ID: "5" }, { GITHUB_RUN_ATTEMPT: "1" }, { GITHUB_RUN_ID: "x1", GITHUB_RUN_ATTEMPT: "1" }, { GITHUB_RUN_ID: "1", GITHUB_RUN_ATTEMPT: "" }, { GITHUB_RUN_ID: "9".repeat(70), GITHUB_RUN_ATTEMPT: "1" }]) {
    const r = await inProcess(std("r-env.json"), { env });
    assert.equal(r.code, 2, JSON.stringify(env));
    assert.equal(stderrJson(r.stderr).code, "ENTRY_ENVIRONMENT_INVALID");
    assert.equal(existsSync(fresh("r-env.json")), false);
  }
});

test("an input that does not pass is a result document with the failure, no measurement, and exit 2", async () => {
  writeFileSync(fresh("bad-input.json"), JSON.stringify({ schemaVersion: 1, threshold: 50 }));
  let measured = false;
  const r = await inProcess(["--input", "bad-input.json", "--result", "r-bad.json"], { measure: async () => { measured = true; return fakeMeasurement(); } });
  assert.deepEqual([r.code, measured], [2, false]);
  const doc = readJson("r-bad.json");
  assert.deepEqual([doc.outcome, doc.shouldFail, doc.mode, doc.inputFailure.reasonCode, doc.inputFailure.field], ["unobservable", true, null, "INPUT_FIELD_UNKNOWN", "threshold"]);
  assert.match(r.stdout, /^::error::/u);
});

test("a missing input file and unresolved targets both give an input failure with exit 2", async () => {
  const gone = await inProcess(["--input", "no-such-input.json", "--result", "r-gone.json"]);
  assert.deepEqual([gone.code, readJson("r-gone.json").inputFailure.reasonCode], [2, "INPUT_UNREADABLE"]);
  writeFileSync(fresh("missing-target.json"), JSON.stringify({ schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["nowhere"] }, testTargets: ["tests"] }));
  const lost = await inProcess(["--input", "missing-target.json", "--result", "r-lost.json"]);
  assert.deepEqual([lost.code, readJson("r-lost.json").inputFailure.reasonCode], [2, "TARGET_UNRESOLVED"]);
});

test("the arguments must be --input and --result once each, with values", async () => {
  const bad = [[], ["--input", "input.json"], ["--result", "r.json"], ["--input", "input.json", "--result"], ["--input", "input.json", "--input", "input.json", "--result", "r.json"], ["--input", "input.json", "--result", "r.json", "--extra", "x"], ["input.json", "r.json"], ["--input", "input.json", "--result", "r.json", "stray"], ["--input", "", "--result", "r.json"], ["--input", "--result", "r.json"]];
  for (const args of bad) {
    const r = await inProcess(args);
    assert.equal(r.code, 2, args.join(" "));
    assert.equal(stderrJson(r.stderr).code, "ENTRY_ARGUMENTS_INVALID", args.join(" "));
    assert.equal(r.stdout, "");
  }
});

test("the result may not be the input, nor a tracked file, and its folder must exist; nothing is deleted", async () => {
  const same = await inProcess(["--input", "input.json", "--result", "./input.json"]);
  const tracked = await inProcess(["--input", "input.json", "--result", "notes.txt"]);
  const orphan = await inProcess(["--input", "input.json", "--result", "no-folder/r.json"]);
  for (const r of [same, tracked, orphan]) {
    assert.equal(r.code, 2);
    assert.equal(stderrJson(r.stderr).code, "ENTRY_ARGUMENTS_INVALID");
  }
  assert.equal(readFileSync(fresh("input.json"), "utf8"), GOOD_INPUT);
  assert.equal(readFileSync(fresh("notes.txt"), "utf8"), "tracked file\n");
});

// Audit round 1 F01, on the real filesystem: a link must never carry the write to another file.
test("a link at the old temporary name cannot carry the result into a tracked file", async () => {
  symlinkSync(fresh("notes.txt"), fresh("r-tmp-link.json.tmp"));
  const r = await inProcess(std("r-tmp-link.json"));
  assert.equal(r.code, 0);
  assert.equal(readFileSync(fresh("notes.txt"), "utf8"), "tracked file\n");
  assert.equal(readJson("r-tmp-link.json").outcome, "match");
});

test("a folder link that points back at the repository cannot make the input the result", async () => {
  symlinkSync(".", fresh("alias"));
  const r = await inProcess(["--input", "input.json", "--result", "alias/input.json"]);
  assert.deepEqual([r.code, stderrJson(r.stderr).code], [2, "ENTRY_ARGUMENTS_INVALID"]);
  assert.equal(readFileSync(fresh("input.json"), "utf8"), GOOD_INPUT);
});

test("a result path that is itself a link, or a hard link of the input, or reaches a tracked file by a link, is refused and nothing changes", async () => {
  symlinkSync(fresh("notes.txt"), fresh("link-to-notes.json"));
  linkSync(fresh("input.json"), fresh("hard-input.json"));
  symlinkSync(fresh("src"), fresh("src-alias"));
  for (const result of ["link-to-notes.json", "hard-input.json", "src-alias/a.mjs"]) {
    const r = await inProcess(["--input", "input.json", "--result", result]);
    assert.deepEqual([r.code, stderrJson(r.stderr).code], [2, "ENTRY_ARGUMENTS_INVALID"], result);
  }
  assert.equal(readFileSync(fresh("notes.txt"), "utf8"), "tracked file\n");
  assert.equal(readFileSync(fresh("input.json"), "utf8"), GOOD_INPUT);
  assert.equal(readFileSync(fresh("src/a.mjs"), "utf8"), SOURCE_A);
  assert.equal(lstatSync(fresh("link-to-notes.json")).isSymbolicLink(), true);
});

// Audit round 1 O01: a path the caller wrote outside the repository is not echoed back.
test("an absolute or escaping path in a rejected input is not shown in the result or the summary", async () => {
  writeFileSync(fresh("far.json"), JSON.stringify({ schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["/fixture-private/home/project/source.mjs", "../fixture-escape/x.mjs"] }, testTargets: ["tests"] }));
  const r = await inProcess(["--input", "far.json", "--result", "r-far.json"], { env: { GITHUB_STEP_SUMMARY: fresh("far-summary.md") } });
  assert.deepEqual([r.code, readJson("r-far.json").inputFailure.reasonCode], [2, "TARGET_UNRESOLVED"]);
  for (const surface of [readFileSync(fresh("r-far.json"), "utf8"), readFileSync(fresh("far-summary.md"), "utf8"), r.stdout, r.stderr]) {
    assert.ok(!surface.includes("fixture-private") && !surface.includes("fixture-escape"));
  }
  assert.ok(readFileSync(fresh("r-far.json"), "utf8").includes("<outside the repository>"));
});

test("a result path outside the repository is allowed when its folder exists", async () => {
  const outside = join(tmpdir(), `cg-outside-${process.pid}.json`);
  const r = await inProcess(["--input", "input.json", "--result", outside]);
  assert.equal(r.code, 0);
  assert.equal(existsSync(outside), true);
  removeDir(outside);
});

test("an earlier result is removed before anything else, so a stale value never survives", async () => {
  writeFileSync(fresh("r-stale.json"), JSON.stringify({ outcome: "match", stale: true }));
  await inProcess(["--input", "no-such-input.json", "--result", "r-stale.json"]);
  const doc = readJson("r-stale.json");
  assert.equal(doc.stale, undefined);
  assert.equal(doc.outcome, "unobservable");
});

test("an earlier result that cannot be removed stops the run before any measurement", async () => {
  let measured = false;
  const io = { remove() {}, exists: () => true };
  writeFileSync(fresh("r-stuck.json"), "stale");
  const r = await inProcess(std("r-stuck.json"), { io, measure: async () => { measured = true; return fakeMeasurement(); } });
  assert.deepEqual([r.code, measured, stderrJson(r.stderr).code], [2, false, "ENTRY_OUTPUT_FAILED"]);
});

test("an output that cannot be written is exit 2 even when the verdict is a match, and the others are still written", async () => {
  mkdirSync(fresh("outs"));
  const env = { GITHUB_STEP_SUMMARY: fresh("no-such-dir/summary.md"), GITHUB_OUTPUT: fresh("outs/github-output") };
  const r = await inProcess(std("r-out.json"), { env });
  assert.equal(r.code, 2);
  assert.equal(stderrJson(r.stderr).code, "ENTRY_OUTPUT_FAILED");
  assert.equal(readJson("r-out.json").outcome, "match");
  assert.match(readFileSync(fresh("outs/github-output"), "utf8"), /^outcome=match\n/u);
});

test("summary and output values are written when their destinations are set, and not otherwise", async () => {
  const env = { GITHUB_STEP_SUMMARY: fresh("sum.md"), GITHUB_OUTPUT: fresh("go.txt") };
  await inProcess(std("r-sum.json"), { env });
  assert.match(readFileSync(fresh("sum.md"), "utf8"), /^## Coverage gate: Match$/mu);
  assert.match(readFileSync(fresh("go.txt"), "utf8"), /^schema-version=1$/mu);
  await inProcess(std("r-sum2.json"), { env: { GITHUB_STEP_SUMMARY: "", GITHUB_OUTPUT: "" } });
});

test("an unexpected exception is exit 2, named by its class only, with no message and no path", async () => {
  const r = await inProcess(std("r-boom.json"), { measure: async () => { throw new RangeError(`private ${repo} FIXTURE_SECRET_MARK`); } });
  assert.equal(r.code, 2);
  const line = stderrJson(r.stderr);
  assert.equal(line.code, "ENTRY_ENVIRONMENT_INVALID");
  assert.ok(line.message.includes("RangeError"));
  assert.ok(!r.stderr.includes(repo) && !r.stderr.includes("FIXTURE_SECRET_MARK"));
});

test("every entry failure writes one JSON line of a known entry code to the error output", async () => {
  const r = await inProcess([]);
  const line = stderrJson(r.stderr);
  assert.equal(REASON_CODES[line.code], "entry");
  assert.deepEqual(Object.keys(line), ["code", "message"]);
  assert.equal(r.stderr.trim().split("\n").length, 1);
});

function realRun(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  return spawnSync(process.execPath, [CLI, ...args], { cwd: repo, env, encoding: "utf8" });
}

test("the real command, run as a program, measures a small repository and matches", () => {
  const r = realRun(std("r-real.json"), { FIXTURE_SECRET_MARK: "fixture-mark-value" });
  assert.equal(r.status, 0, r.stderr);
  const doc = readJson("r-real.json");
  assert.deepEqual([doc.outcome, doc.coveredLines === doc.totalLines, doc.unmeasuredPaths, doc.notRunPaths], ["match", true, [], []]);
  for (const surface of [readFileSync(fresh("r-real.json"), "utf8"), r.stdout, r.stderr]) {
    assert.ok(!surface.includes("fixture-mark-value") && !surface.includes(tmpdir()));
  }
});

test("the real command exits 1 for a repository whose source is not fully run, and names the gap", () => {
  const partial = makeRepo({ "src/a.mjs": SOURCE_A, "src/b.mjs": "export const unused = 1;\n", "tests/a.test.mjs": PASS_TEST, "input.json": GOOD_INPUT });
  try {
    const r = spawnSync(process.execPath, [CLI, "--input", "input.json", "--result", "result.json"], { cwd: partial, env: process.env, encoding: "utf8" });
    assert.equal(r.status, 1, r.stderr);
    const doc = JSON.parse(readFileSync(join(partial, "result.json"), "utf8"));
    assert.deepEqual([doc.outcome, doc.unmeasuredPaths], ["mismatch", ["src/b.mjs"]]);
  } finally {
    removeDir(partial);
  }
});

test("the real command reports a bad invocation with exit 2 and a one-line error", () => {
  const r = realRun([]);
  assert.equal(r.status, 2);
  assert.equal(stderrJson(r.stderr).code, "ENTRY_ARGUMENTS_INVALID");
});
