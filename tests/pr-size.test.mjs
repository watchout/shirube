// AB-05 (anti-bloat v5 §7): +450 fails; deleting 5,000 / adding 0 passes the size check; lockfiles and generated files are excluded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { repo, write, lines, commit, run } from "./helpers.mjs";

const S = "pr-size.mjs";

test("AB-05: 450 added lines fail, deletion-only passes", () => {
  const dir = repo();
  write(dir, "src/old.mjs", lines(5000)); const base = commit(dir, "base");
  write(dir, "src/new.mjs", lines(450)); const head = commit(dir, "add 450");
  let r = run(S, dir, ["--base", base, "--head", head]);
  assert.equal(r.status, 1); assert.match(r.summary.failures[0].why, /added 450 lines > 400/);
  write(dir, "src/old.mjs", ""); write(dir, "src/new.mjs", lines(10)); const head2 = commit(dir, "delete 5000");
  r = run(S, dir, ["--base", head, "--head", head2]);
  assert.equal(r.status, 0, JSON.stringify(r.summary)); assert.equal(r.summary.deleted, 5440);
});

test("lockfiles, generated files and 21 changed files", () => {
  const dir = repo();
  const base = commit(dir, "base");
  write(dir, "package-lock.json", lines(2000)); write(dir, "src/generated/x.mjs", lines(900));
  for (let i = 0; i < 21; i += 1) write(dir, `src/f${i}.mjs`, lines(1));
  const head = commit(dir, "many");
  const r = run(S, dir, ["--base", base, "--head", head]);
  assert.equal(r.status, 1);
  assert.equal(r.summary.added, 21);        // lockfile and generated lines excluded
  assert.equal(r.summary.files, 21);
  assert.match(r.summary.failures[0].why, /changed 21 files > 20/);
});
