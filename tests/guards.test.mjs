// AB-08 (empty scan vs misconfiguration), AB-10 (100KB), AB-18 b/c (secret suppression), OWN-01 (own-code budget).
import { test } from "node:test";
import assert from "node:assert/strict";
import { repo, write, lines, commit, run, PROFILE } from "./helpers.mjs";

test("AB-08: no tracked files under targets fails; all files shorter than 10 lines passes with inventory", () => {
  const dir = repo();
  write(dir, "src/short.mjs", lines(3)); commit(dir, "short");
  let r = run("jscpd-guard.mjs", dir, ["--targets", "lib"]);
  assert.equal(r.status, 1); assert.match(r.summary.why, /no tracked files/);
  r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 0); assert.equal(r.summary.eligible, 0); assert.equal(r.summary.files, 1);
});

test("AB-10: any 150KB file fails whatever its extension; only lockfiles and allow-listed paths pass (B05)", () => {
  const dir = repo();
  const base = commit(dir, "base");
  write(dir, "src/dump.log", "x".repeat(150 * 1024)); write(dir, "docs/big.md", "y".repeat(150 * 1024)); write(dir, "src/small.mjs", lines(5));
  const head = commit(dir, "dump");
  const r = run("large-files.mjs", dir, ["--base", base, "--head", head]);
  assert.equal(r.status, 1);
  assert.deepEqual(r.summary.failures.map((f) => f.file).sort(), ["docs/big.md", "src/dump.log"]);
});

test("AB-18 b/c: a gitleaks config change needs a path-bound gitleaks-config exception; marker lines are judged by gitleaks (see secret-suppressions)", () => {
  const dir = repo();
  const base = commit(dir, "base");
  write(dir, "src/k.mjs", "const k = 'x'; // gitleaks:allow\n"); write(dir, ".gitleaks.toml", "[allowlist]\n");
  const head = commit(dir, "suppress");
  let r = run("large-files.mjs", dir, ["--base", base, "--head", head]);
  assert.equal(r.status, 1); assert.deepEqual(r.summary.failures.map((f) => f.file), [".gitleaks.toml"]);
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [
    { path: ".gitleaks.toml", kind: "gitleaks-config", reason: "test fixture allowlist for this repository", issue: "https://github.com/watchout/shirube/issues/1", review_by: "2027-01-01" },
  ] }));
  const head2 = commit(dir, "register");
  r = run("large-files.mjs", dir, ["--base", base, "--head", head2, "--today", "2026-09-26"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary));
});

test("OWN-01: own-code budget counts only own_code globs and fails when over", () => {
  const dir = repo();
  write(dir, "src/a.mjs", lines(1000)); write(dir, "src/b.mjs", lines(600)); write(dir, "docs/x.md", lines(5000));
  commit(dir, "code");
  let r = run("own-code-budget.mjs", dir);
  assert.equal(r.status, 1); assert.equal(r.summary.total, 1600);
  write(dir, "src/b.mjs", lines(500)); commit(dir, "trim");
  r = run("own-code-budget.mjs", dir);
  assert.equal(r.status, 0); assert.equal(r.summary.total, 1500);
});
