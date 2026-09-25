// Counterexamples from the independent review of PR #1 (B02–B07) and the guard for B03, kept as permanent tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { repo, write, lines, commit, run, PROFILE, git } from "./helpers.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const exception = (path, kind = "gitleaks-allow", review_by = "2027-01-01") =>
  ({ path, kind, reason: "documented test exception for this path", issue: "https://github.com/watchout/shirube/pull/1", review_by });

test("B02: a marker exception is bound to a path, expires, and documentation mentions need none", () => {
  const dir = repo();
  const base = commit(dir, "base");
  write(dir, "docs/notes.md", "gitleaks:allow is a marker\n"); const headDoc = commit(dir, "doc");
  assert.equal(run("large-files.mjs", dir, ["--base", base, "--head", headDoc, "--today", "2026-09-26"]).status, 0);
  write(dir, "src/payments.mjs", "const k = 'x'; // gitleaks:allow\n"); const headCode = commit(dir, "code");
  assert.equal(run("large-files.mjs", dir, ["--base", base, "--head", headCode, "--today", "2026-09-26"]).status, 1);
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [exception("src/guard.mjs")] })); const headOther = commit(dir, "other path");
  assert.equal(run("large-files.mjs", dir, ["--base", base, "--head", headOther, "--today", "2026-09-26"]).status, 1); // wrong path
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [exception("src/payments.mjs", "gitleaks-allow", "2020-01-01")] })); const headExpired = commit(dir, "expired");
  assert.equal(run("large-files.mjs", dir, ["--base", base, "--head", headExpired, "--today", "2026-09-26"]).status, 1); // expired
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [exception("src/payments.mjs")] })); const headOk = commit(dir, "bound");
  assert.equal(run("large-files.mjs", dir, ["--base", base, "--head", headOk, "--today", "2026-09-26"]).status, 0);
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [{ file: "gitleaks:allow" }] })); const headBare = commit(dir, "bare");
  assert.equal(run("large-files.mjs", dir, ["--base", base, "--head", headBare]).status, 2); // invalid exception = cannot observe
});

test("B04: a non-integer limit is UNOBSERVABLE, an include set that matches nothing is FAIL", () => {
  const dir = repo();
  write(dir, "src/a.mjs", lines(450));
  write(dir, ".shirube/hygiene-profile.md", PROFILE({ new_file_lines: "invalid" })); commit(dir, "bad limit");
  assert.equal(run("lines-baseline.mjs", dir).status, 2);
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { lines: { include: ["missing/**"], exclude: [] } })); commit(dir, "bad include");
  const r = run("lines-baseline.mjs", dir);
  assert.equal(r.status, 1); assert.match(r.summary.why, /matched no tracked file/);
});

test("B05: a 180KB .txt log fails, the lockfile and an allow-listed path pass", () => {
  const dir = repo();
  const base = commit(dir, "base");
  write(dir, "evidence/run.txt", "x".repeat(180001)); write(dir, "package-lock.json", "{}".padEnd(180000, " ")); write(dir, "assets/logo.png", "p".repeat(150000));
  const head = commit(dir, "big");
  let r = run("large-files.mjs", dir, ["--base", base, "--head", head]);
  assert.deepEqual(r.summary.failures.map((f) => f.file).sort(), ["assets/logo.png", "evidence/run.txt"]);
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { large_file_allow: ["assets/**"] })); const head2 = commit(dir, "allow assets");
  r = run("large-files.mjs", dir, ["--base", base, "--head", head2]);
  assert.deepEqual(r.summary.failures.map((f) => f.file), ["evidence/run.txt"]);
});

test("B06: shrinking a baseline file to 0 lines ratchets to 0, re-runs PASS, and any growth then fails", () => {
  const dir = repo();
  write(dir, "src/big.mjs", lines(4194)); write(dir, ".hygiene/lines-baseline.json", JSON.stringify({ "src/big.mjs": 4194 })); commit(dir, "big");
  write(dir, "src/big.mjs", ""); commit(dir, "empty");
  assert.equal(run("lines-baseline.mjs", dir, ["--ratchet"]).status, 0);
  assert.equal(JSON.parse(readFileSync(join(dir, ".hygiene/lines-baseline.json"), "utf8"))["src/big.mjs"], 0);
  commit(dir, "ratchet");
  assert.equal(run("lines-baseline.mjs", dir).status, 0);
  write(dir, "src/big.mjs", lines(1)); commit(dir, "regrow");
  assert.equal(run("lines-baseline.mjs", dir).status, 1);
});

test("B07: excluded generated paths (unicode), renames into generated, and binary-only deletions are not counted", () => {
  const dir = repo();
  write(dir, "src/old.mjs", lines(450));
  for (let i = 0; i < 21; i += 1) writeFileSync(join(dir, `src/b${i}.bin`), Buffer.from([0, 1, 2, i]));
  const base = commit(dir, "base");
  write(dir, "src/generated/日本語.mjs", lines(900));
  git(dir, ["mv", "src/old.mjs", "src/generated/new.mjs"]);
  for (let i = 0; i < 21; i += 1) git(dir, ["rm", "-q", `src/b${i}.bin`]);
  const head = commit(dir, "generated + rename + delete binaries");
  const r = run("pr-size.mjs", dir, ["--base", base, "--head", head]);
  assert.equal(r.status, 0, JSON.stringify(r.summary));
  assert.equal(r.summary.files, 0); assert.equal(r.summary.added, 0);
  writeFileSync(join(dir, "src/new.bin"), Buffer.from([0, 9, 9])); const head2 = commit(dir, "binary add");
  assert.equal(run("pr-size.mjs", dir, ["--base", head, "--head", head2]).summary.files, 1); // binary additions count as a file
});

test("B03: targets-coverage fails on a .ts file under a JS-only profile and on .py without the python input", () => {
  const dir = repo();
  write(dir, "src/ok.mjs", lines(3)); write(dir, "src/gap.ts", lines(3)); write(dir, "src/tool.py", lines(3)); commit(dir, "mixed");
  let r = run("targets-coverage.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 1); assert.deepEqual(r.summary.uncovered.sort(), ["src/gap.ts", "src/tool.py"]);
  r = run("targets-coverage.mjs", dir, ["--targets", "src", "--python", "true"]);
  assert.deepEqual(r.summary.uncovered, ["src/gap.ts"]);
});

test("B03: the ESLint configs read the profile — ts without parser fails closed, excluded generated code is ignored", () => {
  const dir = repo();
  write(dir, "package.json", JSON.stringify({ name: "fixture", type: "module" }));
  spawnSync("ln", ["-s", join(ROOT, "node_modules"), join(dir, "node_modules")]);
  write(dir, "src/generated/long.mjs", `export function f(){\n  let a = 0;\n${"  a += 1;\n".repeat(60)}  return a;\n}\n// TODO [2020-01-01]: expired\n`);
  write(dir, "src/ok.mjs", "export const a = 1;\n");
  const eslint = (config, extra = []) => spawnSync(process.execPath, [join(ROOT, "node_modules/eslint/bin/eslint.js"), ...extra, "--config", join(ROOT, "configs", config), "src"], { cwd: dir, encoding: "utf8", env: { ...process.env, GITHUB_EVENT_NAME: "pull_request" } });
  assert.equal(eslint("structural-only.config.mjs").status, 0);
  assert.equal(eslint("guard-only.config.mjs", ["--no-inline-config", "--max-warnings", "0"]).status, 0);
  write(dir, "src/long.mjs", readFileSync(join(dir, "src/generated/long.mjs"), "utf8"));
  assert.equal(eslint("structural-only.config.mjs").status, 1);
  assert.equal(eslint("guard-only.config.mjs", ["--no-inline-config", "--max-warnings", "0"]).status, 1);
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { language: "ts" }));
  assert.equal(eslint("structural-only.config.mjs").status, 2); // language ts but no parser installed: fail closed
});
