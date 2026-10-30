// U4 2a, kit (docs/design/u4-gate-judgements.md §3.6, §4 T19, T20): a version bump keeps the pin's two stage modes, and the kit never writes into shirube itself.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
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
  const dir = dirWith({ "AGENTS.md": "# A\n", ".shirube/sds-pin.json": JSON.stringify({ schema: "sds-pin/1", sds_commit: A, plan_binding_mode: "report-only", design_binding_mode: "report-only" }) });
  const out = JSON.parse(execFileSync(process.execPath, [join(ROOT, "scripts/sds/kit.mjs"), "upgrade", "--target", dir, "--commit", HEAD, "--protected", "none"], { encoding: "utf8" }));
  assert.equal(out.sds_commit, HEAD);
  assert.deepEqual([pinOf(dir).plan_binding_mode, pinOf(dir).design_binding_mode], ["report-only", "report-only"]);
});
// T20 (BF-U4A-01): "shirube itself" is decided by the workflow's trigger structure (on: ... workflow_call), read by the one YAML reader, not by the text.
const reusable = readFileSync(join(ROOT, ".github/workflows/sds-gate.yml"), "utf8"); // the real one: the check must read what shirube really has
const SHIRUBE = { "the real reusable workflow": reusable, "a double-quoted key": reusable.replace("\n  workflow_call:", '\n  "workflow_call":'), "a single-quoted key": reusable.replace("\n  workflow_call:", "\n  'workflow_call':"),
  "a flow mapping": "on: { workflow_call: { inputs: {} } }\njobs: {}\n", "a list": "on: [push, workflow_call]\n", "a lone string": "on: workflow_call\n", "a quoted on key": '"on":\n  workflow_call:\n', "a key without a value": "on:\n  push:\n  workflow_call:\n" };
const CONSUMER = { "a block scalar holding the line": "name: c\non:\n  pull_request_target:\nenv:\n  DOC: |\n    workflow_call:\njobs:\n  j:\n    runs-on: x\n    steps:\n      - run: echo ok\n",
  "a comment": "# a caller of a workflow_call workflow\non:\n  pull_request_target:\n", "a string value": 'name: "workflow_call:"\non:\n  pull_request_target:\n', "a list without it": "on: [issue_comment, pull_request_target]\n",
  "a lone string without it": "on: pull_request_target\n", "a similar word": "on:\n  pull_request_target:\n    types: [workflow_call_done]\n", "other workflow_ triggers": "on:\n  workflow_dispatch:\n  workflow_run:\n    workflows: [ci]\n", "a list of them": "on: [workflow_dispatch, workflow_run]\n", "an empty file": "" };
const snapshot = (dir) => tree(dir).map((f) => [f, statSync(join(dir, f)).isFile() ? readFileSync(join(dir, f), "utf8") : null]);
const bare = () => { const bin = mkdtempSync(join(tmpdir(), "sds-bin-")); symlinkSync(execFileSync("which", ["git"], { encoding: "utf8" }).trim(), join(bin, "git")); return { PATH: bin }; }; // git only: no ruby
const HEAD = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const withWorkflow = (text) => dirWith({ "AGENTS.md": "# A\n", ".github/workflows/sds-gate.yml": text });
test("T20 a shirube checkout is refused with a reason and nothing is written, in every spelling of the same trigger", () => {
  assert.match(reusable, /^\s*workflow_call\s*:/m);
  for (const [name, text] of Object.entries(SHIRUBE)) {
    const dir = withWorkflow(text), before = snapshot(dir);
    assert.throws(() => apply({ target: dir, commit: B, protected: "none" }), /shirube checkout.*workflow_call/, name);
    assert.deepEqual(snapshot(dir), before, name);
  }
});
test("T20 a consumer is not mistaken for shirube: apply and then upgrade succeed whatever words its workflow holds", () => {
  for (const [name, text] of Object.entries(CONSUMER)) {
    const dir = withWorkflow(text);
    assert.equal(apply({ target: dir, commit: A, protected: "none" }).command, "apply", name);
    assert.equal(apply({ target: dir, commit: B, protected: "none" }).command, "apply", name); // the second finds the kit's own caller
    assert.equal(pinOf(dir).sds_commit, B, name);
  }
});
test("T20 a workflow that cannot be read as YAML is not guessed at: refused, nothing written", () => {
  const dir = withWorkflow("on: [unclosed\n"), before = snapshot(dir);
  assert.throws(() => apply({ target: dir, commit: B, protected: "none" }), /sds-gate\.yml cannot be read as YAML/);
  assert.deepEqual(snapshot(dir), before);
});
test("T20 without the YAML reader (no ruby on PATH) a present sds-gate.yml is refused on the command line, nothing is written", () => {
  const dir = withWorkflow(CONSUMER["a comment"]), before = snapshot(dir);
  const run = spawnSync(process.execPath, [join(ROOT, "scripts/sds/kit.mjs"), "apply", "--target", dir, "--commit", A, "--protected", "none"], { encoding: "utf8", env: bare() });
  assert.equal(run.status, 2);
  assert.match(JSON.parse(run.stdout).reason, /sds-gate\.yml cannot be read as YAML.*yaml reader unavailable/);
  assert.deepEqual(snapshot(dir), before);
});
test("T20 a target with no sds-gate.yml needs no YAML reader", () => {
  const dir = dirWith({ "AGENTS.md": "# A\n" });
  const run = spawnSync(process.execPath, [join(ROOT, "scripts/sds/kit.mjs"), "apply", "--target", dir, "--commit", HEAD, "--protected", "none"], { encoding: "utf8", env: bare() });
  assert.equal(run.status, 0, run.stdout);
});
