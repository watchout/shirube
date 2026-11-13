// Helpers for the coverage-gate tests (not a test file: the name does not end in .test.mjs).
// Everything built here is fictional: small throwaway directories and git repositories under the OS temp directory.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { commit, git, write } from "./helpers.mjs";

export const GATE_DIR = resolve(import.meta.dirname, "../scripts/coverage-gate");
export const EVENTS_REPORTER = join(GATE_DIR, "events-reporter.mjs");
export const CLI = join(GATE_DIR, "cli.mjs");

export function makeDir(files = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "cg-fixture-")));
  for (const [name, content] of Object.entries(files)) write(dir, name, content);
  return dir;
}

export function makeRepo(files = {}) {
  const dir = makeDir();
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "t@example.com"]);
  git(dir, ["config", "user.name", "t"]);
  for (const [name, content] of Object.entries(files)) write(dir, name, content);
  commit(dir, "init");
  return dir;
}

export function removeDir(dir) {
  rmSync(dir, { recursive: true, force: true });
}

// The six file shapes whose reporter events were observed (functional-design/node22-reporter-observations.md).
export const SOURCE_A = "export function add(a, b) {\n  return a + b;\n}\n";
export const PASS_TEST = 'import test from "node:test";\nimport assert from "node:assert/strict";\nimport { add } from "../src/a.mjs";\n\ntest("adds", () => {\n  assert.equal(add(1, 2), 3);\n});\n';
export const REPORTER_CASES = {
  "cases/empty.test.mjs": "",
  "cases/import-only.test.mjs": 'import "node:path";\n',
  "cases/pass.test.mjs": 'import test from "node:test";\nimport assert from "node:assert/strict";\n\ntest("value is one", () => {\n  assert.equal(1, 1);\n});\n',
  "cases/all-skip.test.mjs": 'import test from "node:test";\n\ntest("first", { skip: true }, () => {});\ntest("second", { skip: true }, () => {});\n',
  "cases/all-todo.test.mjs": 'import test from "node:test";\n\ntest("first", { todo: true }, () => {});\ntest("second", { todo: true }, () => {});\n',
  "cases/load-fail.test.mjs": 'throw new Error("fixture load failure");\n',
  "cases/sub/nested-empty.test.mjs": "",
  "cases/sub/same-name.test.mjs": 'import test from "node:test";\n\ntest("cases/sub/same-name.test.mjs", () => {});\n',
};

// Runs the real Node test runner with the gate's events reporter over the given relative paths and returns the events text.
export function runEventsReporter(dir, relPaths) {
  const out = makeDir();
  const dest = join(out, "events.jsonl");
  const env = { PATH: `${resolve(process.execPath, "..")}:/usr/bin:/bin`, HOME: out, LANG: "C.UTF-8", LC_ALL: "C.UTF-8", TZ: "UTC" };
  const args = ["--test", `--test-reporter=${EVENTS_REPORTER}`, `--test-reporter-destination=${dest}`, ...relPaths];
  const r = spawnSync(process.execPath, args, { cwd: dir, env, encoding: "utf8" });
  const text = readFileSync(dest, "utf8");
  removeDir(out);
  return { status: r.status, text };
}

// Fictional secrets for the credential tests. Names: a known one, an unknown one, a lower-case one.
export const FAKE_SECRETS = {
  GITHUB_TOKEN: "fixture-known-secret-marker",
  FIXTURE_UNKNOWN_SECRET: "fixture-unknown-secret-marker",
  fixture_lowercase_secret: "fixture-lowercase-secret-marker",
};

// Sets variables on this process for the duration of fn and restores the previous state afterwards.
export async function withEnv(vars, fn) {
  const before = {};
  for (const name of Object.keys(vars)) before[name] = Object.hasOwn(process.env, name) ? process.env[name] : undefined;
  Object.assign(process.env, vars);
  try {
    return await fn();
  } finally {
    for (const [name, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}
