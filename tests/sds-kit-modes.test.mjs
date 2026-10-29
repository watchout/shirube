// U4 2a, kit (docs/design/u4-gate-judgements.md §3.6, §4 T19, T20): a version bump keeps the pin's two stage modes, and the kit never writes into shirube itself.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { apply as applyKit } from "../scripts/sds/kit.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const apply = (args) => applyKit(args, (commit, p) => readFileSync(join(ROOT, p), "utf8")); // kit parts from this tree under a fake commit, as sds-kit.test.mjs does
const A = "a".repeat(40), B = "b".repeat(40);
const dirWith = (files) => { const dir = mkdtempSync(join(tmpdir(), "sds-modes-")); for (const [p, s] of Object.entries(files)) { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), s); } return dir; };
const pinOf = (dir) => JSON.parse(readFileSync(join(dir, ".shirube/sds-pin.json"), "utf8"));
const tree = (dir) => readdirSync(dir, { recursive: true }).sort();

test("T19 apply keeps plan_binding_mode and design_binding_mode of the old pin, value for value; a pin without them gets no new field", () => {
  for (const modes of [{ plan_binding_mode: "blocking", design_binding_mode: "report-only" }, { plan_binding_mode: "off" }, { design_binding_mode: "blocking" }, {}]) {
    const dir = dirWith({ "AGENTS.md": "# A\n", ".shirube/sds-pin.json": JSON.stringify({ schema: "sds-pin/1", sds_commit: A, protected_paths: [], adoption: null, ...modes }) });
    apply({ target: dir, commit: B, protected: "none" });
    const pin = pinOf(dir);
    assert.equal(pin.sds_commit, B);
    for (const k of ["plan_binding_mode", "design_binding_mode"]) assert.equal(k in pin, k in modes, k), assert.equal(pin[k], modes[k], k);
  }
  const bare = dirWith({ "AGENTS.md": "# A\n" }); apply({ target: bare, commit: A, protected: "none" }); // a first apply has no old pin: no mode is invented
  assert.deepEqual(["plan_binding_mode", "design_binding_mode"].filter((k) => k in pinOf(bare)), []);
});
test("T19 upgrade on the command line is the same function: the modes survive it", () => {
  const head = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const dir = dirWith({ "AGENTS.md": "# A\n", ".shirube/sds-pin.json": JSON.stringify({ schema: "sds-pin/1", sds_commit: A, plan_binding_mode: "report-only", design_binding_mode: "report-only" }) });
  const out = JSON.parse(execFileSync(process.execPath, [join(ROOT, "scripts/sds/kit.mjs"), "upgrade", "--target", dir, "--commit", head, "--protected", "none"], { encoding: "utf8" }));
  assert.equal(out.sds_commit, head);
  assert.deepEqual([pinOf(dir).plan_binding_mode, pinOf(dir).design_binding_mode], ["report-only", "report-only"]);
});
test("T20 a target that is shirube itself (its sds-gate.yml is the reusable workflow, on: workflow_call) is refused with a reason and nothing is written", () => {
  const reusable = readFileSync(join(ROOT, ".github/workflows/sds-gate.yml"), "utf8"); // the real one: the check must read what shirube really has
  assert.match(reusable, /^\s*workflow_call\s*:/m);
  const dir = dirWith({ "AGENTS.md": "# A\n", ".github/workflows/sds-gate.yml": reusable, ".shirube/sds-pin.json": JSON.stringify({ sds_commit: A }) });
  const before = [tree(dir), readFileSync(join(dir, ".github/workflows/sds-gate.yml"), "utf8"), readFileSync(join(dir, ".shirube/sds-pin.json"), "utf8")];
  assert.throws(() => apply({ target: dir, commit: B, protected: "none" }), /shirube checkout.*workflow_call/);
  assert.deepEqual([tree(dir), readFileSync(join(dir, ".github/workflows/sds-gate.yml"), "utf8"), readFileSync(join(dir, ".shirube/sds-pin.json"), "utf8")], before);
});
test("T20 a consumer is not mistaken for shirube: the kit's own caller (applied before), or a comment naming workflow_call, is not a trigger", () => {
  const dir = dirWith({ "AGENTS.md": "# A\n" });
  apply({ target: dir, commit: A, protected: "none" }); apply({ target: dir, commit: B, protected: "none" }); // the second apply finds the caller the first one wrote
  assert.equal(pinOf(dir).sds_commit, B);
  const note = dirWith({ "AGENTS.md": "# A\n", ".github/workflows/sds-gate.yml": "# a caller of a workflow_call workflow\non:\n  pull_request_target:\n" });
  assert.equal(apply({ target: note, commit: A, protected: "none" }).command, "apply");
  assert.equal(existsSync(join(note, ".shirube/sds-pin.json")), true);
});
