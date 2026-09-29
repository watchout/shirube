// AB-08 (empty scan vs misconfiguration), AB-10 (100KB), AB-18 b/c (secret suppression), OWN-01 (own-code budget).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { repo, write, lines, commit, run, PROFILE } from "./helpers.mjs";

const ROOT = resolve(import.meta.dirname, "..");

test("AB-08: no tracked files under targets fails; all files shorter than 10 lines passes with inventory", () => {
  const dir = repo();
  write(dir, "src/short.mjs", lines(3)); commit(dir, "short");
  let r = run("jscpd-guard.mjs", dir, ["--targets", "lib"]);
  assert.equal(r.status, 1); assert.match(r.summary.why, /neither a tracked file nor a directory/); assert.deepEqual(r.summary.missing, ["lib"]);
  r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 0); assert.equal(r.summary.eligible, 0); assert.equal(r.summary.files, 1);
});

test("AB-23: a target that is a tracked file is scanned as itself (root entry point); a directory target is unchanged; the same set feeds targets-coverage", () => {
  const dir = repo();
  write(dir, "package.json", JSON.stringify({ name: "fixture", type: "module" }));
  spawnSync("ln", ["-s", join(ROOT, "node_modules"), join(dir, "node_modules")]); // jscpd resolves from the consumer
  const js = (p) => Array.from({ length: 12 }, (_, i) => `export const ${p}${i} = ${i};`).join("\n") + "\n"; // valid JS: jscpd tokenizes nothing from invalid input and then reports an empty scan
  write(dir, "server.mjs", js("s")); write(dir, "src/a.mjs", js("a")); commit(dir, "root entry");
  let r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.files, 1);
  r = run("jscpd-guard.mjs", dir, ["--targets", "src server.mjs"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.files, 2); assert.equal(r.summary.eligible, 2);
  r = run("jscpd-guard.mjs", dir, ["--targets", "server.mjs"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.files, 1); assert.equal(r.summary.eligible, 1);
  r = run("jscpd-guard.mjs", dir, ["--targets", "src ./server.mjs"]);                // same file spelled with ./ (AUD-SHIRUBE3-TARGET-PATH-001)
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.files, 2); assert.equal(r.summary.eligible, 2);
  r = run("jscpd-guard.mjs", dir, ["--targets", "./src/ server.mjs"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.files, 2);
  for (const bad of ["missing.mjs", "src missing.mjs", "src ../server.mjs", "src /server.mjs"]) {  // a missing or non-relative entry fails even beside valid ones (AUD-SHIRUBE3-TARGET-ENTRY-002)
    r = run("jscpd-guard.mjs", dir, ["--targets", bad]);
    assert.equal(r.status, 1, bad + " " + JSON.stringify(r.summary)); assert.match(r.summary.why, /neither a tracked file nor a directory/); assert.ok(r.summary.missing.length >= 1);
  }
  write(dir, "server.ts", lines(3)); commit(dir, "ts at root");
  r = run("targets-coverage.mjs", dir, ["--targets", "src server.ts"]);
  assert.equal(r.status, 1); assert.deepEqual(r.summary.uncovered, ["server.ts"]);
  r = run("targets-coverage.mjs", dir, ["--targets", "src ./server.ts"]);                // ./ spelling must not hide the uncovered file
  assert.equal(r.status, 1); assert.deepEqual(r.summary.uncovered, ["server.ts"]);
  r = run("targets-coverage.mjs", dir, ["--targets", "src missing.ts"]);
  assert.equal(r.status, 1); assert.match(r.summary.why, /neither a tracked file nor a directory/);
});

test("AB-25: jscpd scans exactly the inventory's extensions — a duplicate in .sql under a JS profile is not counted, .mjs / .tsx / .mts duplicates are", () => {
  const dir = repo();
  write(dir, "package.json", JSON.stringify({ name: "fixture", type: "module" }));
  spawnSync("ln", ["-s", join(ROOT, "node_modules"), join(dir, "node_modules")]);
  const block = (mk) => Array.from({ length: 14 }, (_, i) => mk(i)).join("\n") + "\n";
  const sql = block((i) => `INSERT INTO t (a, b) VALUES (${i}, ${i});`);
  write(dir, "src/a.sql", sql); write(dir, "src/b.sql", sql); write(dir, "src/only.mjs", block((i) => `export const only${i} = ${i};`)); commit(dir, "sql dup only");
  let r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.files, 1); assert.equal(r.summary.clones, 0); // .sql is outside the JS inventory and outside the scan
  const mjs = block((i) => `export const shared${i} = ${i} * ${i} + ${i};`);
  write(dir, "src/a.mjs", mjs); write(dir, "src/b.mjs", mjs); commit(dir, "mjs dup");
  r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 1, JSON.stringify(r.summary)); assert.equal(r.summary.files, 3); assert.equal(r.summary.clones, 1); // exactly the .mjs clone, not the .sql one
  write(dir, ".shirube/hygiene-profile.md", PROFILE({}, { language: "ts" }));
  const tsx = block((i) => `export const V${i} = () => <div id="x${i}">{${i}}</div>;`);
  const mts = block((i) => `export const M${i}: number = ${i} * 2;`);
  write(dir, "src/a.tsx", tsx); write(dir, "src/b.tsx", tsx); write(dir, "src/a.mts", mts); write(dir, "src/b.mts", mts); commit(dir, "tsx + mts dup");
  r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 1, JSON.stringify(r.summary)); assert.equal(r.summary.files, 7); assert.equal(r.summary.clones, 3); // mjs + tsx + mts, still not sql
});

test("AB-26: the scan set is the inventory's files themselves — a duplicate outside a narrowed inventory is not scanned even though jscpd's format for it is on (mjs-only vs .js, ts-only vs .mts, default JS vs .es6); the same duplicate inside the inventory still fails", () => {
  const block = (mk) => Array.from({ length: 14 }, (_, i) => mk(i)).join("\n") + "\n";
  const control = block((i) => `export const unique${i} = ${i};`);
  const dup = block((i) => `export const repeated${i} = ${i} * ${i} + ${i};`);
  const cases = [  // devauditor AUD-SHIRUBE7-EXTSET-001: all three passed the inventory count (1) while the --format-only scan analyzed 3 sources / 1 clone
    { profile: { jscpd: { extensions: ["mjs"] } }, control: "src/control.mjs", outside: ["src/duplicate_a.js", "src/duplicate_b.js"], inside: ["src/in_a.mjs", "src/in_b.mjs"] },
    { profile: { language: "ts", jscpd: { extensions: ["ts"] } }, control: "src/control.ts", outside: ["src/duplicate_a.mts", "src/duplicate_b.mts"], inside: ["src/in_a.ts", "src/in_b.ts"] },
    { profile: {}, control: "src/control.mjs", outside: ["src/duplicate_a.es6", "src/duplicate_b.es6"], inside: ["src/in_a.mjs", "src/in_b.mjs"] },
  ];
  for (const c of cases) {
    const dir = repo();
    write(dir, "package.json", JSON.stringify({ name: "fixture", type: "module" }));
    spawnSync("ln", ["-s", join(ROOT, "node_modules"), join(dir, "node_modules")]);
    write(dir, ".shirube/hygiene-profile.md", PROFILE({}, c.profile));
    write(dir, c.control, control); for (const f of c.outside) write(dir, f, dup); commit(dir, "duplicate outside the inventory");
    let r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
    let why = JSON.stringify({ profile: c.profile, summary: r.summary });
    assert.equal(r.status, 0, why); assert.equal(r.summary.files, 1, why); assert.equal(r.summary.sources, 1, why); assert.equal(r.summary.clones, 0, why);
    for (const f of c.inside) write(dir, f, dup); commit(dir, "duplicate inside the inventory");
    r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
    why = JSON.stringify({ profile: c.profile, summary: r.summary });
    assert.equal(r.status, 1, why); assert.equal(r.summary.files, 3, why); assert.equal(r.summary.sources, 3, why); assert.equal(r.summary.clones, 1, why);
  }
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
