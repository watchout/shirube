import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_DEADLINE_SECONDS, DEFAULT_TOTAL_BUDGET_SECONDS } from "../scripts/coverage-gate/input.mjs";
import { DEFAULT_THRESHOLD_HUNDREDTHS, REASON_CODES } from "../scripts/coverage-gate/judge.mjs";
import { GUARANTEED_NODE_MAJOR } from "../scripts/coverage-gate/measure-node.mjs";
import { GATE_DIR } from "./coverage-gate-fixtures.mjs";

const FILES = readdirSync(GATE_DIR).filter((name) => name.endsWith(".mjs")).sort();
const source = (name) => readFileSync(join(GATE_DIR, name), "utf8");
// The files that decide or format: they may not read a clock, a random source, the environment or a file.
const CORE = ["judge.mjs", "report.mjs", "input.mjs", "order.mjs", "sanitize.mjs", "lcov.mjs", "events.mjs"];
const importsOf = (text) => [...text.matchAll(/^(?:import|export)\s[^;]*?from\s+"([^"]+)"/gmu)].map((m) => m[1]);

test("the gate is made of the expected files", () => {
  assert.deepEqual(FILES, ["cli.mjs", "emit.mjs", "events-reporter.mjs", "events.mjs", "input.mjs", "judge.mjs", "lcov.mjs", "measure-node.mjs", "order.mjs", "report.mjs", "resolve.mjs", "runner.mjs", "sanitize.mjs"]);
});

test("the core files take no clock, no random source, no environment and no file", () => {
  const forbidden = [/\bDate\b/u, /Math\.random/u, /randomUUID/u, /randomBytes/u, /process\.env/u, /process\.(?:hrtime|cwd|argv)/u, /performance\.now/u, /node:fs/u, /node:child_process/u];
  for (const name of CORE) {
    const text = source(name);
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${name} ${pattern}`);
  }
});

test("every import is a Node built-in, a file of this gate, or the repository's hygiene library", () => {
  for (const name of FILES) {
    for (const target of importsOf(source(name))) {
      const allowed = target.startsWith("node:") || target.startsWith("./") || target === "../hygiene/lib.mjs";
      assert.ok(allowed, `${name} imports ${target}`);
    }
  }
});

test("nothing in the gate can reach the network", () => {
  for (const name of FILES) {
    const text = source(name);
    assert.doesNotMatch(text, /node:(?:net|http|https|http2|dns|tls|dgram)/u, name);
    assert.doesNotMatch(text, /\bfetch\s*\(/u, name);
    assert.doesNotMatch(text, /\bshell\s*:\s*true/u, name);
  }
});

test("only the runner starts a process, with spawn and no shell", () => {
  const starters = FILES.filter((name) => source(name).includes("node:child_process"));
  assert.deepEqual(starters, ["runner.mjs"]);
  assert.match(source("runner.mjs"), /import \{ spawn \} from "node:child_process";/u);
  assert.doesNotMatch(source("runner.mjs"), /\b(?:exec|execSync|execFile|spawnSync|fork)\b/u);
});

test("no file is longer than 300 lines", () => {
  for (const name of FILES) assert.ok(source(name).split("\n").length <= 301, name);
});

test("a rule's value lives in one file: the threshold, the time limits, the Node version and the code set", () => {
  assert.equal(DEFAULT_THRESHOLD_HUNDREDTHS, 10000);
  assert.deepEqual([DEFAULT_DEADLINE_SECONDS, DEFAULT_TOTAL_BUDGET_SECONDS, GUARANTEED_NODE_MAJOR], [600, 900, 22]);
  const owners = { "10000": "judge.mjs", "600": "input.mjs", "900": "input.mjs" };
  for (const [literal, owner] of Object.entries(owners)) {
    const holders = FILES.filter((name) => new RegExp(`\\b${literal}\\b`, "u").test(source(name))).sort();
    assert.deepEqual(holders, [owner], `literal ${literal}`);
  }
  const definers = FILES.filter((name) => /\bREASON_CODES\s*=/u.test(source(name)));
  assert.deepEqual(definers, ["judge.mjs"]);
  assert.equal(Object.keys(REASON_CODES).length, 21);
});

test("tests of the gate contain no skipped or placeholder test", () => {
  const tests = readdirSync(join(GATE_DIR, "../../tests")).filter((name) => name.startsWith("coverage-gate-") && name.endsWith(".test.mjs"));
  assert.ok(tests.length >= 13);
  for (const name of tests) {
    const text = readFileSync(join(GATE_DIR, "../../tests", name), "utf8");
    assert.doesNotMatch(text, /\b(?:test|it|describe|suite)\.(?:skip|todo)\s*\(|assert\.ok\(true\)|assert\.equal\(true, true\)/u, name);
    assert.match(text, /assert\./u, `${name} asserts nothing`);
  }
});
