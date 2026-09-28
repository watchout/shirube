// AB-20: function-length / complexity violations are frozen at introduction and only go down (owner decision D0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { repo, write, commit, run, PROFILE } from "./helpers.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const S = "structural-baseline.mjs";
const BASELINE = ".hygiene/structural-baseline.json";

// n functions, each 60 statements long (over the 50-line limit); complexity stays 1.
const longFunctions = (n, prefix) => Array.from({ length: n }, (_, i) =>
  `export function ${prefix}${i}() {\n${Array.from({ length: 60 }, (_, j) => `  const v${j} = ${j};`).join("\n")}\n  return v59;\n}`).join("\n\n") + "\n";

function fixture() {
  const dir = repo();
  write(dir, "package.json", JSON.stringify({ name: "fixture", type: "module" }));
  spawnSync("ln", ["-s", join(ROOT, "node_modules"), join(dir, "node_modules")]);
  write(dir, ".shirube/hygiene-profile.md", PROFILE({ structural_baseline_max_entries: 1 }));
  return dir;
}

test("AB-20: without a baseline a violation fails; --init freezes it; same count passes, +1 fails, a fix without ratchet fails, ratchet lowers; a new file must be clean", () => {
  const dir = fixture();
  write(dir, "src/legacy.mjs", longFunctions(1, "legacy")); commit(dir, "legacy");
  let r = run(S, dir, ["--targets", "src"]);
  assert.equal(r.status, 1, JSON.stringify(r.summary)); assert.equal(r.summary.violations, 1); assert.equal(r.summary.failures[0].why, "new file over limit");
  r = run(S, dir, ["--targets", "src", "--init"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.initialized, true);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, BASELINE), "utf8")), { "src/legacy.mjs": 1 });
  commit(dir, "baseline");
  assert.equal(run(S, dir, ["--targets", "src"]).status, 0);                          // frozen: same count passes
  write(dir, "src/legacy.mjs", longFunctions(2, "legacy")); commit(dir, "worse");
  r = run(S, dir, ["--targets", "src"]);
  assert.equal(r.status, 1); assert.equal(r.summary.failures[0].why, "grew past baseline");
  write(dir, "src/legacy.mjs", "export const fixed = 1;\n"); commit(dir, "fixed");
  r = run(S, dir, ["--targets", "src"]);
  assert.equal(r.status, 1); assert.match(r.summary.failures[0].why, /baseline was not lowered/);
  r = run(S, dir, ["--targets", "src", "--ratchet"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.deepEqual(JSON.parse(readFileSync(join(dir, BASELINE), "utf8")), { "src/legacy.mjs": 0 });
  write(dir, "src/fresh.mjs", longFunctions(1, "fresh")); commit(dir, "new file with a long function");
  r = run(S, dir, ["--targets", "src"]);
  assert.equal(r.status, 1); assert.equal(r.summary.failures[0].file, "src/fresh.mjs"); assert.equal(r.summary.failures[0].why, "new file over limit");
});

test("AB-20: a parse error or an empty target is never a PASS; the entry ceiling applies", () => {
  const dir = fixture();
  write(dir, "src/broken.mjs", "export const = ;\n"); commit(dir, "broken");
  let r = run(S, dir, ["--targets", "src"]);
  assert.equal(r.status, 2); assert.match(r.summary.reason, /parse error/);
  write(dir, "src/broken.mjs", "export const ok = 1;\n"); commit(dir, "ok");
  r = run(S, dir, ["--targets", "lib"]);
  assert.equal(r.status, 2, JSON.stringify(r.summary));                                    // eslint finds nothing to lint under lib -> cannot observe
  write(dir, BASELINE, JSON.stringify({ "src/a.mjs": 1, "src/b.mjs": 1 }));
  write(dir, "src/a.mjs", longFunctions(1, "a")); write(dir, "src/b.mjs", longFunctions(1, "b")); commit(dir, "two");
  r = run(S, dir, ["--targets", "src"]);
  assert.equal(r.status, 1); assert.match(r.summary.failures.at(-1).why, /structural_baseline_max_entries=1/);
});
