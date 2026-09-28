// AB-21 (clone fingerprints) and AB-22 (unused code per file): frozen at introduction, only going down (owner decision D0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { repo, write, commit, run, PROFILE } from "./helpers.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const js = (p, n = 12) => Array.from({ length: n }, (_, i) => `export const ${p}${i} = ${i} * ${i} + ${i};`).join("\n") + "\n";
const block = js("shared", 14); // 14 identical lines in two files = one clone (>= 10 lines, >= 50 tokens)

function fixture(limits) {
  const dir = repo();
  write(dir, "package.json", JSON.stringify({ name: "fixture", type: "module" }));
  spawnSync("ln", ["-s", join(ROOT, "node_modules"), join(dir, "node_modules")]);
  write(dir, ".shirube/hygiene-profile.md", PROFILE(limits));
  return dir;
}

test("AB-21: an existing clone fails without a baseline, --init freezes its fingerprint, moving it passes, a new clone fails, removing it needs --ratchet, the ceiling applies", () => {
  const dir = fixture({ clone_baseline_max_entries: 1 });
  write(dir, "src/a.mjs", block); write(dir, "src/b.mjs", block); commit(dir, "clone");
  let r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 1, JSON.stringify(r.summary)); assert.equal(r.summary.clones, 1); assert.equal(r.summary.failures[0].why, "new clone over limit");
  r = run("jscpd-guard.mjs", dir, ["--targets", "src", "--init"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.initialized, true);
  const baseline = JSON.parse(readFileSync(join(dir, ".hygiene/clones-baseline.json"), "utf8"));
  assert.equal(Object.keys(baseline).length, 1); assert.equal(Object.values(baseline)[0], 14);
  commit(dir, "baseline");
  assert.equal(run("jscpd-guard.mjs", dir, ["--targets", "src"]).status, 0);
  rmSync(join(dir, "src/b.mjs")); write(dir, "src/c.mjs", block); commit(dir, "moved");             // same content elsewhere: same fingerprint
  assert.equal(run("jscpd-guard.mjs", dir, ["--targets", "src"]).status, 0);
  write(dir, "src/d.mjs", js("other", 14)); write(dir, "src/e.mjs", js("other", 14)); commit(dir, "second clone");
  r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 1); assert.equal(r.summary.clones, 2); assert.equal(r.summary.failures[0].why, "new clone over limit");
  rmSync(join(dir, "src/d.mjs")); rmSync(join(dir, "src/e.mjs")); rmSync(join(dir, "src/c.mjs")); write(dir, "src/c.mjs", js("c")); commit(dir, "clones removed");
  r = run("jscpd-guard.mjs", dir, ["--targets", "src"]);
  assert.equal(r.status, 1); assert.equal(r.summary.clones, 0); assert.match(r.summary.failures[0].why, /baseline was not lowered/);
  r = run("jscpd-guard.mjs", dir, ["--targets", "src", "--ratchet"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.deepEqual(JSON.parse(readFileSync(join(dir, ".hygiene/clones-baseline.json"), "utf8")), {});
  write(dir, ".hygiene/clones-baseline.json", JSON.stringify({ "0000000000000000": 14, "1111111111111111": 14 })); commit(dir, "two entries");
  r = run("jscpd-guard.mjs", dir, ["--targets", "src", "--ratchet"]);
  assert.equal(r.status, 1); assert.match(r.summary.failures[0].why, /clone_baseline_max_entries=1/);
});

test("AB-22: unused files and exports are frozen per file with --init, growth fails, removal needs --ratchet, a new file must be clean, no knip config is UNOBSERVABLE", () => {
  const dir = fixture({ knip_baseline_max_entries: 2 });
  write(dir, "knip.jsonc", JSON.stringify({ entry: ["src/index.mjs!"], project: ["src/**/*.mjs!"] }));
  const index = "import { used } from \"./lib.mjs\";\nexport const main = () => used();\n";
  write(dir, "src/index.mjs", index); // exports of an entry file are the public surface, knip does not count them
  write(dir, "src/lib.mjs", "export const used = () => 1;\nexport const spareLib = 1;\n"); write(dir, "src/orphan.mjs", "export const nobody = 2;\n"); commit(dir, "legacy");
  let r = run("knip-baseline.mjs", dir);
  assert.equal(r.status, 1, JSON.stringify(r.summary)); assert.equal(r.summary.findings, 2, JSON.stringify(r.summary)); // unused file + unused export
  r = run("knip-baseline.mjs", dir, ["--init"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.initialized, true);
  const baseline = JSON.parse(readFileSync(join(dir, ".hygiene/knip-baseline.json"), "utf8"));
  assert.deepEqual(baseline, { "src/lib.mjs": 1, "src/orphan.mjs": 1 });
  commit(dir, "baseline");
  assert.equal(run("knip-baseline.mjs", dir).status, 0);
  write(dir, "src/lib.mjs", "export const used = () => 1;\nexport const spareLib = 1;\nexport const spareLib2 = 2;\n"); commit(dir, "one more unused export");
  r = run("knip-baseline.mjs", dir);
  assert.equal(r.status, 1); assert.equal(r.summary.failures[0].why, "grew past baseline");
  write(dir, "src/lib.mjs", "export const used = () => 1;\n"); rmSync(join(dir, "src/orphan.mjs")); commit(dir, "cleaned");
  r = run("knip-baseline.mjs", dir);
  assert.equal(r.status, 1); assert.match(r.summary.failures[0].why, /baseline was not lowered/);
  r = run("knip-baseline.mjs", dir, ["--ratchet"]);
  assert.equal(r.status, 0, JSON.stringify(r.summary));
  write(dir, "src/fresh.mjs", "export const unusedFresh = 3;\n"); commit(dir, "new unused file");
  r = run("knip-baseline.mjs", dir);
  assert.equal(r.status, 1); assert.equal(r.summary.failures[0].file, "src/fresh.mjs");
  rmSync(join(dir, "knip.jsonc")); commit(dir, "no config");
  r = run("knip-baseline.mjs", dir);
  assert.equal(r.status, 2); assert.match(r.summary.reason, /knip config not found/);
});
