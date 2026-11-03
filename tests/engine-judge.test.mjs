// I1a (design docs/design/u1-engine-judge.md v13 §3-5, §3-7, §4 tests 7 and 8): the input half of the engine judge.
// Real temp directories; the child process is a fake, because CI never loads the real engine (§3-6).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { JudgeError, REASONS, childEnv, childMain, cloneIdentity, copyHarness, listFiles, prepare, stableCopy, treeDigest } from "../scripts/sds/engine-judge.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const TARGET = { space: "default", intent: "i1" };
const SHARD = "aidlc/spaces/default/intents/i1/audit/h.md";
const FILES = {
  ".claude/tools/aidlc-version.ts": 'export const AIDLC_VERSION = "2.11.1";\n',
  ".claude/tools/aidlc-orchestrate.ts": "function engineSelection() {}\n",
  "aidlc/.aidlc-clone-id": "abc123def456\nhost-1\n",
  "aidlc/spaces/default/intents/i1/aidlc-state.md": "state\n",
  [SHARD]: "## a\n---\n",
  "aidlc/spaces/default/intents/intents.json": "{}\n",
  "aidlc/active-memory/team.md": "rules\n",
};
function put(root, files) {
  for (const [p, s] of Object.entries(files)) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), s); }
  return root;
}
const tmp = () => mkdtempSync(join(tmpdir(), "ej-"));
const workspace = (extra = {}) => put(tmp(), { ...FILES, ...extra });
const GOOD = JSON.stringify({ engineVersion: "2.11.1", selection: TARGET });
const shimLine = "export { unitStageStop, unitExempt, unitLedgerFor, engineRelativeRecordDir, codekbCtxFor, engineSelection };\n";
// A fake child: records what it was given (the copy's root, the HOME, the orchestrate file with its shim) and answers with `reply`.
const fakeChild = (reply, seen = []) => (root, home) => {
  seen.push({ root, home, orchestrate: readFileSync(join(root, ".claude/tools/aidlc-orchestrate.ts"), "utf8") });
  return typeof reply === "function" ? reply(root) : reply;
};

test("reasons: the closed set of 3-7, and an error says its code and nothing else", () => {
  assert.deepEqual(REASONS, ["ENGINE_VERSION_MISMATCH", "CLONE_ID_INCOMPLETE", "COPY_FAILED", "ENGINE_LOAD_FAILED", "ENGINE_CALL_FAILED", "UNSUPPORTED_SHAPE", "SELECTION_MISMATCH", "WORKSPACE_CHANGED", "EVIDENCE_MISSING", "FILE_CONFLICT"]);
  const e = new JudgeError("COPY_FAILED");
  assert.equal(e.message, "COPY_FAILED");
  assert.equal(e.code, "COPY_FAILED");
});

test("copy: only .claude/ and aidlc/, whole, byte for byte; a symbolic link stops it before anything is copied (COPY_FAILED)", () => {
  const ws = workspace({ "stray.txt": "x" }), dest = tmp();
  copyHarness(ws, dest);
  assert.deepEqual(readdirSync(dest).sort(), [".claude", "aidlc"]);
  assert.deepEqual(listFiles(dest), listFiles(ws));
  assert.equal(treeDigest(dest), treeDigest(ws));
  const linked = workspace(), empty = tmp();
  symlinkSync("/etc/hosts", join(linked, "aidlc/link"));
  assert.throws(() => copyHarness(linked, empty), { code: "COPY_FAILED" });
  assert.deepEqual(readdirSync(empty), []);
  const top = workspace();
  rmSync(join(top, ".claude"), { recursive: true });
  symlinkSync(tmp(), join(top, ".claude"));
  assert.throws(() => copyHarness(top, tmp()), { code: "COPY_FAILED" });
});

test("fingerprints: path and hash pairs in UTF-8 byte order of the path; anything the engine can see moves inputDigest, only .claude/ moves engineTreeDigest", () => {
  const ws = put(tmp(), { ".claude/b": "2", ".claude/a": "1", "aidlc/\u{10000}": "4", "aidlc/￿": "3" });
  const pair = (p, s) => `${p}\t${sha(s)}\n`;
  assert.equal(treeDigest(ws), sha(pair(".claude/a", "1") + pair(".claude/b", "2") + pair("aidlc/￿", "3") + pair("aidlc/\u{10000}", "4")));
  assert.equal(treeDigest(ws, [".claude"]), sha(pair(".claude/a", "1") + pair(".claude/b", "2")));
  const base = workspace();
  for (const p of ["aidlc/active-memory/team.md", "aidlc/spaces/default/intents/intents.json", "aidlc/spaces/default/scopes/x.md", "aidlc/spaces/default/codekb/y.md", "aidlc/.aidlc-clone-id"]) {
    const changed = put(workspace(), { [p]: "changed\n" });
    assert.notEqual(treeDigest(changed), treeDigest(base), p);
    assert.equal(treeDigest(changed, [".claude"]), treeDigest(base, [".claude"]), p);
  }
  assert.notEqual(treeDigest(workspace({ ".claude/tools/aidlc-version.ts": "other\n" }), [".claude"]), treeDigest(base, [".claude"]));
});

test("clone id: a token and a host, both, as the engine reads them (CLONE_ID_INCOMPLETE otherwise)", () => {
  assert.deepEqual(cloneIdentity("abc123def456\nhost-1\n"), { token: "abc123def456", host: "host-1" });
  for (const bad of ["", "abc123def456\n", "abc123def456\n-bad\n", "ABC\nhost\n", "\nhost\n"]) assert.throws(() => cloneIdentity(bad), { code: "CLONE_ID_INCOMPLETE" }, JSON.stringify(bad));
});

test("a workspace that moves while it is copied: one new copy, then WORKSPACE_CHANGED; files no conversation appends to are not compared", () => {
  const grow = (ws, times) => { let n = 0; return (w, d) => { copyHarness(w, d); if (n++ < times) writeFileSync(join(ws, SHARD), `more ${n}\n`, { flag: "a" }); }; };
  let ws = workspace(), dest = tmp();
  stableCopy(ws, dest, grow(ws, 1));
  assert.match(readFileSync(join(dest, SHARD), "utf8"), /more 1/);
  ws = workspace();
  assert.throws(() => stableCopy(ws, tmp(), grow(ws, 2)), { code: "WORKSPACE_CHANGED" });
  ws = workspace();
  dest = tmp();
  stableCopy(ws, dest, (w, d) => { copyHarness(w, d); put(ws, { "aidlc/transcripts/t.jsonl": "later\n", "aidlc/spaces/default/intents/i1/note.txt": "x" }); });
  assert.ok(existsSync(join(dest, SHARD)));
});

test("child environment: PATH, an empty HOME and the project dir only; the maker's source never names a session-choosing variable", () => {
  const parent = { PATH: "/usr/bin", HOME: "/home/real", AIDLC_STAGE_GRAPH: "x", CLAUDE_CODE_SESSION_ID: "c", KIRO_X: "k", CODEX_THREAD_ID: "t", NODE_OPTIONS: "--x" };
  assert.deepEqual(childEnv(parent, "/r", "/h"), { PATH: "/usr/bin", HOME: "/h", CLAUDE_PROJECT_DIR: "/r" });
  const source = readFileSync(new URL("../scripts/sds/engine-judge.mjs", import.meta.url), "utf8");
  assert.ok(!source.includes("AIDLC_SESSION_OVERRIDE"));
});

test("prepare: a whole copy, fingerprints from the copy before the shim, one shim line, the child's version and selection; the workspace is not touched and the copy is gone", () => {
  const ws = workspace(), before = treeDigest(ws), seen = [], base = tmp();
  const run = () => prepare({ workspace: ws, target: TARGET, tmp: base, runChild: fakeChild((root) => { put(root, { "aidlc/.aidlc-sessions/s.binding.json": "{}" }); return GOOD; }, seen) });
  const out = run();
  assert.deepEqual(out, { inputDigest: before, engineTreeDigest: treeDigest(ws, [".claude"]), engineVersion: "2.11.1" });
  assert.deepEqual(run(), out);
  assert.equal(treeDigest(ws), before);
  assert.equal(seen[0].orchestrate, FILES[".claude/tools/aidlc-orchestrate.ts"] + "\n" + shimLine);
  assert.deepEqual(readdirSync(base), []);
  assert.equal(seen[0].home.includes(seen[0].root), false);
});

test("prepare: every failure is one fixed code with no sentence or path, and the temp place is empty afterwards", () => {
  const base = tmp(), codes = [];
  const run = (reply, ws = workspace()) => {
    try { prepare({ workspace: ws, target: TARGET, tmp: base, runChild: fakeChild(reply) }); } catch (e) { assert.ok(e instanceof JudgeError && e.message === e.code, String(e)); codes.push(e.code); return; }
    assert.fail("no failure");
  };
  run(JSON.stringify({ engineVersion: "2.11.0", selection: TARGET }));
  run(JSON.stringify({ engineVersion: "2.11.1", selection: { space: "default", intent: "other" } }));
  run(JSON.stringify({ engineVersion: "2.11.1", selection: { space: "other", intent: "i1" } }));
  run(JSON.stringify({ reason: "ENGINE_LOAD_FAILED" }));
  run(JSON.stringify({ reason: "NOT_A_CODE" }));
  run("not json");
  run("");
  const noClone = workspace();
  rmSync(join(noClone, "aidlc/.aidlc-clone-id"));
  run(GOOD, noClone);
  const linked = workspace();
  symlinkSync("/etc/hosts", join(linked, ".claude/link"));
  run(GOOD, linked);
  assert.deepEqual(codes, ["ENGINE_VERSION_MISMATCH", "SELECTION_MISMATCH", "SELECTION_MISMATCH", "ENGINE_LOAD_FAILED", "ENGINE_CALL_FAILED", "ENGINE_CALL_FAILED", "ENGINE_CALL_FAILED", "CLONE_ID_INCOMPLETE", "COPY_FAILED"]);
  assert.deepEqual(readdirSync(base), []);
});

test("child side: the version and the selection as the engine answers; a load failure and a call failure are two fixed codes", async () => {
  const mods = { "aidlc-version.ts": { AIDLC_VERSION: "2.11.1" }, "aidlc-orchestrate.ts": { engineSelection: (root) => (root === "/r" ? { space: "default", intent: "i1", sessionId: null, binding: null } : assert.fail(root)) } };
  const load = (m) => async (p) => { const f = p.split("/").pop(); if (!(f in m)) throw new Error("boom"); return m[f]; };
  assert.deepEqual(await childMain("/r", load(mods)), { engineVersion: "2.11.1", selection: { space: "default", intent: "i1" } });
  await assert.rejects(childMain("/r", load({})), { code: "ENGINE_LOAD_FAILED" });
  await assert.rejects(childMain("/r", load({ ...mods, "aidlc-orchestrate.ts": { engineSelection() { throw new Error("x"); } } })), { code: "ENGINE_CALL_FAILED" });
});
