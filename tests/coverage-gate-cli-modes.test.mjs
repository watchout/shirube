// The entry point with a threshold exception and a mode (BR7.2 to BR7.4, BR8.5, BR8.6). Every value here is fictional.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runCli } from "../scripts/coverage-gate/cli.mjs";
import { CLI, PASS_TEST, SOURCE_A, makeRepo, removeDir } from "./coverage-gate-fixtures.mjs";
import { goldenMeasurement } from "./coverage-gate-golden.mjs";

const BASE = { schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["src"] }, testTargets: ["tests"] };
const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const EXCEPTION = { percent: 50, decisionUrl: URL_OK, rationale: "Example rationale for a lowered line." };
const repo = makeRepo({ "src/a.mjs": SOURCE_A, "tests/a.test.mjs": PASS_TEST });
test.after(() => removeDir(repo));

const readJson = (name) => JSON.parse(readFileSync(join(repo, name), "utf8"));
const half = () => goldenMeasurement({ records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 1 }, { path: "src/a.mjs", lineNumber: 2, hitCount: 0 }] });
const dark = () => goldenMeasurement({ kind: "unobservable", cause: "failed", records: undefined, measuredPaths: undefined });
const MEASUREMENTS = {
  match: () => goldenMeasurement(),
  belowThreshold: () => goldenMeasurement({ records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 0 }] }),
  noRecords: () => goldenMeasurement({ measuredPaths: [], records: [{ path: "src/other.mjs", lineNumber: 1, hitCount: 1 }] }),
  notRun: () => goldenMeasurement({ testFilesRun: [] }),
  unobservable: dark,
  half,
};

let counter = 0;
async function go(extra, measurement = "match", { env = {}, io } = {}) {
  counter += 1;
  const [input, result] = [`in-${counter}.json`, `out-${counter}.json`];
  writeFileSync(join(repo, input), JSON.stringify({ ...BASE, ...extra }));
  const seen = { stdout: "", stderr: "" };
  const code = await runCli({ argv: ["--input", input, "--result", result], env, cwd: repo, stdout: { write: (t) => { seen.stdout += t; } }, stderr: { write: (t) => { seen.stderr += t; } }, measure: async () => MEASUREMENTS[measurement](), io });
  return { code, ...seen, result };
}

test("record-only exits 0 for every result that enforce would fail on, and the result file keeps the mode and the true outcome", async () => {
  const expected = { belowThreshold: ["mismatch", "BELOW_THRESHOLD"], noRecords: ["unobservable", "NO_RECORDS"], notRun: ["mismatch", "TESTS_NOT_RUN"], unobservable: ["unobservable", "MEASUREMENT_FAILED"] };
  for (const [name, [outcome, reason]] of Object.entries(expected)) {
    const strict = await go({ mode: "enforce" }, name);
    const recorded = await go({ mode: "record-only" }, name);
    assert.deepEqual([strict.code, recorded.code], [1, 0], name);
    const [a, b] = [readJson(strict.result), readJson(recorded.result)];
    assert.deepEqual([b.mode, b.outcome, b.shouldFail, b.reasonCodes.includes(reason)], ["record-only", outcome, false, true], name);
    assert.deepEqual({ ...b, mode: a.mode, shouldFail: a.shouldFail }, a, name);
    assert.match(recorded.stdout, /^::warning::/u, name);
  }
});

test("an input that cannot be read is exit 2 in record-only too, and the result has no mode", async () => {
  for (const extra of [{ mode: "record-only", exclusions: [] }, { mode: "record-only", testTargets: [] }, { mode: "record-only", threshold: { percent: 50 } }, { mode: "recordonly" }]) {
    const r = await go(extra);
    assert.equal(r.code, 2, JSON.stringify(extra));
    const doc = readJson(r.result);
    assert.deepEqual([doc.mode, doc.shouldFail, doc.outcome, doc.thresholdException, doc.effectiveThresholdPercent], [null, true, "unobservable", null, null], JSON.stringify(extra));
  }
});

test("an exception lowers the line the exit code follows: met is 0 with the exception on record, below it is 1", async () => {
  const met = await go({ threshold: EXCEPTION }, "match");
  assert.equal(met.code, 0);
  const doc = readJson(met.result);
  assert.deepEqual([doc.outcome, doc.mode, doc.effectiveThresholdPercent, doc.thresholdException], ["match", "enforce", "50.00", { decisionUrl: URL_OK, claimedPercent: "50.00", rationale: EXCEPTION.rationale }]);
  assert.match(met.stdout, /^::warning::.*threshold lowered by exception/u);
  assert.equal((await go({ threshold: EXCEPTION }, "half")).code, 0);
  const under = await go({ threshold: { ...EXCEPTION, percent: 60 } }, "half");
  assert.equal(under.code, 1);
  assert.deepEqual([readJson(under.result).outcome, readJson(under.result).reasonCodes], ["mismatch", ["BELOW_THRESHOLD"]]);
  assert.match(under.stdout, /^::error::/u);
});

test("an exception with record-only still records the exception and does not fail the job", async () => {
  const r = await go({ mode: "record-only", threshold: { ...EXCEPTION, percent: 90 } }, "half");
  assert.equal(r.code, 0);
  const doc = readJson(r.result);
  assert.deepEqual([doc.outcome, doc.shouldFail, doc.mode, doc.thresholdException.claimedPercent], ["mismatch", false, "record-only", "90.00"]);
});

test("a result, summary or output that cannot be written is exit 2 in record-only too, and the result written before it keeps the judged mode", async () => {
  for (const env of [{ GITHUB_STEP_SUMMARY: join(repo, "no-such-dir", "summary.md") }, { GITHUB_OUTPUT: join(repo, "no-such-dir", "output.txt") }]) {
    const r = await go({ mode: "record-only" }, "belowThreshold", { env });
    assert.equal(r.code, 2, JSON.stringify(env));
    assert.equal(JSON.parse(r.stderr.trim()).code, "ENTRY_OUTPUT_FAILED");
    assert.deepEqual([readJson(r.result).mode, readJson(r.result).outcome], ["record-only", "mismatch"]);
  }
  const lost = await go({ mode: "record-only" }, "belowThreshold", { io: { write() { throw new Error("disk full"); } } });
  assert.equal(lost.code, 2);
  assert.equal(JSON.parse(lost.stderr.trim()).code, "ENTRY_OUTPUT_FAILED");
});

test("the exception and the mode come from the input file only: no argument, no environment name can set or change them", async () => {
  const names = ["COVERAGE_THRESHOLD", "COVERAGE_MODE", "MODE", "THRESHOLD", "GATE_MODE", "GITHUB_COVERAGE_MODE", "INPUT_MODE", "INPUT_THRESHOLD"];
  const env = Object.fromEntries(names.map((name, index) => [name, index % 2 === 0 ? "0" : "record-only"]));
  const r = await go({}, "belowThreshold", { env });
  assert.equal(r.code, 1);
  assert.deepEqual([readJson(r.result).mode, readJson(r.result).effectiveThresholdPercent, readJson(r.result).thresholdException], ["enforce", "100.00", null]);
  for (const extra of [["--mode", "record-only"], ["--threshold", "50"], ["--mode=record-only"]]) {
    writeFileSync(join(repo, "plain.json"), JSON.stringify(BASE));
    const seen = { stderr: "" };
    const code = await runCli({ argv: ["--input", "plain.json", "--result", "plain-out.json", ...extra], env: {}, cwd: repo, stdout: { write() {} }, stderr: { write: (t) => { seen.stderr += t; } }, measure: async () => MEASUREMENTS.match() });
    assert.equal(code, 2, extra.join(" "));
    assert.equal(JSON.parse(seen.stderr.trim()).code, "ENTRY_ARGUMENTS_INVALID");
  }
});

test("the measurement is told the validated mode and exception, and the output reaches only the known destinations", async () => {
  let seen;
  counter += 1;
  writeFileSync(join(repo, `in-${counter}.json`), JSON.stringify({ ...BASE, mode: "record-only", threshold: EXCEPTION }));
  const out = { stdout: "", stderr: "" };
  const code = await runCli({ argv: ["--input", `in-${counter}.json`, "--result", `out-${counter}.json`], env: {}, cwd: repo, stdout: { write: (t) => { out.stdout += t; } }, stderr: { write: (t) => { out.stderr += t; } }, measure: async (args) => { seen = args; return MEASUREMENTS.match(); } });
  assert.equal(code, 0);
  assert.deepEqual([seen.input.mode, seen.input.threshold], ["record-only", { percentHundredths: 5000, decisionUrl: URL_OK, rationale: EXCEPTION.rationale }]);
  assert.equal(out.stderr, "");
});

test("the real command, run as a program, in record-only: a source that is not fully run is recorded and the job is not failed", () => {
  const partial = makeRepo({ "src/a.mjs": SOURCE_A, "src/b.mjs": "export const unused = 1;\n", "tests/a.test.mjs": PASS_TEST, "input.json": JSON.stringify({ ...BASE, mode: "record-only" }), "strict.json": JSON.stringify({ ...BASE, mode: "enforce" }) });
  try {
    const recorded = spawnSync(process.execPath, [CLI, "--input", "input.json", "--result", "result.json"], { cwd: partial, env: process.env, encoding: "utf8" });
    assert.equal(recorded.status, 0, recorded.stderr);
    const doc = JSON.parse(readFileSync(join(partial, "result.json"), "utf8"));
    assert.deepEqual([doc.outcome, doc.mode, doc.shouldFail, doc.unmeasuredPaths], ["mismatch", "record-only", false, ["src/b.mjs"]]);
    assert.match(recorded.stdout, /^::warning::/u);
    const strict = spawnSync(process.execPath, [CLI, "--input", "strict.json", "--result", "strict-result.json"], { cwd: partial, env: process.env, encoding: "utf8" });
    assert.equal(strict.status, 1, strict.stderr);
  } finally {
    removeDir(partial);
  }
});
