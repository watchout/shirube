// AB-01 / AB-06 (anti-bloat v5 §7) and the baseline-entry ceiling, against real git repositories.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repo, write, lines, commit, run } from "./helpers.mjs";

const S = "lines-baseline.mjs";

test("AB-01: a new 320-line file fails, a 300-line file passes", () => {
  const dir = repo();
  write(dir, "src/a.mjs", lines(320)); commit(dir, "a");
  let r = run(S, dir);
  assert.equal(r.status, 1);
  assert.equal(r.summary.failures[0].why, "new file over limit");
  write(dir, "src/a.mjs", lines(300)); commit(dir, "a300");
  r = run(S, dir);
  assert.equal(r.status, 0, JSON.stringify(r.summary));
});

test("AB-06: baseline file — unchanged length passes, +3 fails, shrink without ratchet fails, ratchet lowers", () => {
  const dir = repo();
  write(dir, "src/big.mjs", lines(4194));
  write(dir, ".hygiene/lines-baseline.json", JSON.stringify({ "src/big.mjs": 4194 }));
  commit(dir, "big");
  assert.equal(run(S, dir).status, 0);                       // 4,194 with baseline 4,194 passes
  write(dir, "src/big.mjs", lines(4197)); commit(dir, "grow");
  let r = run(S, dir);
  assert.equal(r.status, 1); assert.equal(r.summary.failures[0].why, "grew past baseline");
  write(dir, "src/big.mjs", lines(4191)); commit(dir, "shrink");
  r = run(S, dir);
  assert.equal(r.status, 1); assert.match(r.summary.failures[0].why, /baseline was not lowered/);
  r = run(S, dir, ["--ratchet"]);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(readFileSync(join(dir, ".hygiene/lines-baseline.json"), "utf8"))["src/big.mjs"], 4191);
  write(dir, "src/big.mjs", lines(4192)); commit(dir, "regrow");
  assert.equal(run(S, dir).status, 1);                       // 4,192 > ratcheted 4,191 is rejected
});

test("baseline cannot gain entries beyond baseline_max_entries, and stale entries fail", () => {
  const dir = repo();
  write(dir, "src/x.mjs", lines(10)); write(dir, "src/y.mjs", lines(10));
  write(dir, ".hygiene/lines-baseline.json", JSON.stringify({ "src/x.mjs": 10, "src/y.mjs": 10 }));
  commit(dir, "two entries");
  let r = run(S, dir);
  assert.equal(r.status, 1); assert.match(r.summary.failures.at(-1).why, /baseline_max_entries/);
  write(dir, ".hygiene/lines-baseline.json", JSON.stringify({ "src/gone.mjs": 10 })); commit(dir, "stale");
  r = run(S, dir);
  assert.equal(r.status, 1); assert.match(r.summary.failures[0].why, /no longer exists/);
});

test("missing profile is UNOBSERVABLE (exit 2), never a silent pass", () => {
  const dir = repo();
  const r = run(S, dir, ["--profile", "nope.md"]);
  assert.equal(r.status, 2); assert.equal(r.summary.verdict, "UNOBSERVABLE");
});
