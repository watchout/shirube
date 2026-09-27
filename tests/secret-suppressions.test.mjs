// Review R01 / R02 / R03 and the gitleaks-based suppression guard. The gitleaks binary is not run here (the workflow
// runs the pinned binary); the guard is fed the JSON report shape gitleaks 8.30.1 writes under --ignore-gitleaks-allow
// (fields RuleID / File / StartLine / Commit / Fingerprint), which was confirmed end-to-end once with the real binary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { repo, write, commit, run, git, PROFILE } from "./helpers.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const finding = (file) => ({ RuleID: "github-pat", File: file, StartLine: 1, Commit: "28450894af3f7d9dc30d16013e4d13e072acbd68", Fingerprint: `28450894af3f7d9dc30d16013e4d13e072acbd68:${file}:github-pat:1` });
const exception = (path, review_by = "2027-01-01") => ({ path, kind: "gitleaks-allow", reason: "documented mock value for this path", issue: "https://github.com/watchout/shirube/pull/1", review_by });

test("R01: a finding hidden by a marker needs a path-bound exception; a doc mention with no finding needs none", () => {
  const dir = repo();
  write(dir, "report.json", JSON.stringify([]));
  assert.equal(run("secret-suppressions.mjs", dir, ["--report", "report.json"]).status, 0);          // ① marker explanation only: no finding
  write(dir, "report.json", JSON.stringify([finding("docs/example.md")]));
  let r = run("secret-suppressions.mjs", dir, ["--report", "report.json", "--today", "2026-09-26"]);
  assert.equal(r.status, 1); assert.equal(r.summary.failures[0].file, "docs/example.md");                // ③ value + marker, unregistered
  assert.ok(!JSON.stringify(r.summary).includes("ghp_"));                                                // never prints the secret
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [exception("docs/example.md")] })); commit(dir, "register");
  r = run("secret-suppressions.mjs", dir, ["--report", "report.json", "--today", "2026-09-26"]);
  assert.equal(r.status, 0); assert.equal(r.summary.covered, 1);                                          // ④ registered exception
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [exception("docs/other.md")] })); commit(dir, "wrong path");
  assert.equal(run("secret-suppressions.mjs", dir, ["--report", "report.json", "--today", "2026-09-26"]).status, 1);
  assert.equal(run("secret-suppressions.mjs", dir, ["--report", "missing.json"]).status, 2);
});

test("R01: review_by must be a real calendar date (2026-99-99 is UNOBSERVABLE, not accepted)", () => {
  const dir = repo();
  write(dir, "report.json", JSON.stringify([]));
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { exceptions: [exception("docs/x.md", "2026-99-99")] })); commit(dir, "bad date");
  const r = run("secret-suppressions.mjs", dir, ["--report", "report.json", "--today", "2026-09-26"]);
  assert.equal(r.status, 2); assert.match(r.summary.reason, /real calendar date/);
});

test("R02: a rename that grows a file over the limit is caught on the new path; a rename within the limit passes", () => {
  const dir = repo();
  write(dir, "evidence/before.txt", "x".repeat(100000)); const base = commit(dir, "base");
  git(dir, ["mv", "evidence/before.txt", "evidence/after.txt"]);
  write(dir, "evidence/after.txt", "x".repeat(105000)); // 100,000 → 105,000 bytes (limit 102,400), still a rename for Git
  const head = commit(dir, "rename+grow");
  let r = run("large-files.mjs", dir, ["--base", base, "--head", head]);
  assert.equal(r.status, 1); assert.equal(r.summary.failures[0].file, "evidence/after.txt");
  git(dir, ["mv", "evidence/after.txt", "evidence/final.txt"]); write(dir, "evidence/final.txt", "x".repeat(50000)); const head2 = commit(dir, "rename+shrink");
  r = run("large-files.mjs", dir, ["--base", head, "--head", head2]);
  assert.equal(r.status, 0); assert.equal(r.summary.changed, 1);
});

test("R03: normal JSX passes both ESLint runs; a long JSX function and an expired TODO in JSX fail", () => {
  const dir = repo();
  write(dir, "package.json", JSON.stringify({ name: "fixture", type: "module" }));
  spawnSync("ln", ["-s", join(ROOT, "node_modules"), join(dir, "node_modules")]);
  write(dir, "src/normal.jsx", "export const view = <div>Hello</div>;\n");
  const eslint = (config, extra = []) => spawnSync(process.execPath, [join(ROOT, "node_modules/eslint/bin/eslint.js"), ...extra, "--config", join(ROOT, "configs", config), "src"], { cwd: dir, encoding: "utf8", env: { ...process.env, GITHUB_EVENT_NAME: "pull_request" } });
  assert.equal(eslint("structural-only.config.mjs").status, 0);
  assert.equal(eslint("guard-only.config.mjs", ["--no-inline-config", "--max-warnings", "0"]).status, 0);
  writeFileSync(join(dir, "src/long.jsx"), `export function View(){\n  let a = 0;\n${"  a += 1;\n".repeat(60)}  return <div>{a}</div>;\n}\n// TODO [2020-01-01]: expired\n`);
  assert.equal(eslint("structural-only.config.mjs").status, 1);
  assert.equal(eslint("guard-only.config.mjs", ["--no-inline-config", "--max-warnings", "0"]).status, 1);
});
