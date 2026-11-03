// I1c (design docs/design/u1-engine-judge.md v13 §7.3 rules 1 to 6 and §4 test 20): the audit seat's comparison of a PR's records with the records made again from the workspace.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareRecords, main } from "../scripts/sds/record-compare.mjs";

const REF = "approvals/i1/functional-design/u1/attempt-1.json", REF2 = "approvals/i1/infrastructure-design/u1/attempt-1.json";
const R = (stage, unit, status, started, approvalRef) => ({ stage, ...(unit ? { unit } : {}), status, started, ...(approvalRef ? { approvalRef } : {}) });
const seq = (rows) => rows.map((r, i) => ({ order: i + 1, ...r }));
const FD = R("functional-design", "u1", "approved", true, REF), INFRA = R("infrastructure-design", "u1", "not_approved", false), CG = R("code-generation", "u1", "not_approved", true);
const REGEN = { rows: seq([FD, INFRA, CG]), attempts: new Map([[REF, Buffer.from("{A}")]]) };
const verdict = (pr, regen = REGEN) => { const out = compareRecords(pr, regen); return [out.result, [...new Set(out.findings.map((f) => f.code))].sort().join(",")]; };
const pr = (rows, attempts = REGEN.attempts) => ({ rows: seq(rows), attempts });
// What the bridge (R6.3, v7 3-4) can see inside one sequence: the order, the pairs, approvalRef only on approved rows, approved rows started. A PR that passes this alone is not yet compared with the workspace.
const consistent = (rows) => rows.every((r, i) => r.order === i + 1 && (r.status === "approved") === ("approvalRef" in r) && (r.status !== "approved" || r.started === true)) && new Set(rows.map((r) => `${r.stage}/${r.unit}`)).size === rows.length;

test("positive: the same records, a correct exemption, and a workspace that went on since the PR all pass", () => {
  assert.deepEqual(verdict(REGEN), ["PASS", ""]);
  const u6 = R("functional-design", "u6", "exempt", false);
  assert.deepEqual(verdict(pr([FD, INFRA, CG, u6]), { ...REGEN, rows: seq([FD, INFRA, CG, u6]) }), ["PASS", ""]);
  const ahead = { ...REGEN, rows: seq([FD, R("infrastructure-design", "u1", "approved", true, REF2), CG]) };
  assert.deepEqual(verdict(REGEN, ahead), ["PASS", ""]);
  assert.deepEqual(verdict(pr([FD, R("infrastructure-design", "u1", "not_approved", true), CG]), { ...REGEN, rows: seq([FD, R("infrastructure-design", "u1", "approved", false, REF2), CG]) }), ["PASS", ""]);
});

test("negative, the three that pass the bridge alone (BF-U8D-01): a middle row made exempt, removed, or moved first", () => {
  const exempt = [FD, R("infrastructure-design", "u1", "exempt", false), CG], removed = [FD, CG], moved = [INFRA, FD, CG];
  for (const rows of [exempt, removed, moved]) assert.ok(consistent(seq(rows)), "the bridge alone would pass it");
  assert.deepEqual(verdict(pr(exempt)), ["FAIL", "EXEMPT_MISMATCH"]);
  assert.deepEqual(verdict(pr(removed)), ["FAIL", "ROW_MISSING"]);
  assert.deepEqual(verdict(pr(moved)), ["FAIL", "ROW_ORDER_MISMATCH"]);
});

test("negative: an approval, a reference, a start or an attempt file the workspace does not give again; an exemption the PR does not keep; a row too many; an order that jumps", () => {
  const reopened = { ...REGEN, rows: seq([R("functional-design", "u1", "not_approved", true), INFRA, CG]) };
  assert.deepEqual(verdict(REGEN, reopened), ["FAIL", "APPROVAL_NOT_REPRODUCED"]);
  assert.deepEqual(verdict(pr([R("functional-design", "u1", "approved", true, REF2), INFRA, CG])), ["FAIL", "APPROVAL_REF_MISMATCH"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG]), { ...REGEN, rows: seq([FD, INFRA, R("code-generation", "u1", "not_approved", false)]) }), ["FAIL", "START_NOT_REPRODUCED"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG], new Map([[REF, Buffer.from("{B}")]]))), ["FAIL", "ATTEMPT_BYTES_MISMATCH"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG], new Map([[REF, Buffer.from("{A}")], ["approvals/i1/x/_intent/attempt-1.json", Buffer.from("{}")]]))), ["FAIL", "ATTEMPT_BYTES_MISMATCH"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG]), { ...REGEN, rows: seq([FD, R("infrastructure-design", "u1", "exempt", false), CG]) }), ["FAIL", "EXEMPT_MISMATCH"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG, R("build-and-test", null, "not_approved", false)])), ["FAIL", "ROW_EXTRA"]);
  assert.deepEqual(verdict({ ...REGEN, rows: REGEN.rows.map((r, i) => ({ ...r, order: i ? i + 2 : 1 })) }), ["FAIL", "ORDER_NOT_SEQUENTIAL"]);
  assert.deepEqual(compareRecords(pr([FD, INFRA, CG]), { ...REGEN, rows: seq([FD, R("infrastructure-design", "u1", "exempt", false), CG]) }).findings, [{ code: "EXEMPT_MISMATCH", stage: "infrastructure-design", unit: "u1" }]);
});

const CLI = fileURLToPath(new URL("../scripts/sds/record-compare.mjs", import.meta.url)), SEQ_OF = (rows) => JSON.stringify({ rows }), SEQ = SEQ_OF(REGEN.rows), A1 = "functional-design/u1/attempt-1.json", A2 = "functional-design/u1/attempt-2.json";
const dirOf = (files) => { const d = mkdtempSync(join(tmpdir(), "rc-")); for (const [rel, body] of Object.entries(files)) { mkdirSync(dirname(join(d, rel)), { recursive: true }); writeFileSync(join(d, rel), body); } return d; };
const cli = (...args) => { const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" }); return { code: r.status, lines: r.stdout.split("\n").filter(Boolean), stderr: r.stderr }; };
const seen = (r) => [r.code, r.lines.length, r.stderr, ...r.lines.map((l) => JSON.parse(l)).flatMap((o) => [o.result, o.findings.map((f) => f.code).join(",")])];
const raw = (byte) => Buffer.concat([Buffer.from('{"x":"'), Buffer.from([byte]), Buffer.from('"}')]);

test("BF-I1C-01 (real CLI): only the attempts the PR added over --base are compared; kept history is not; a first record has no base directory", () => {
  const base = dirOf({ "_sequence.json": SEQ, [A1]: "{A}" }), regen = dirOf({ "_sequence.json": SEQ, [A2]: "{N}" });
  const kept = dirOf({ "_sequence.json": SEQ, [A1]: "{A}", [A2]: "{N}" }), changed = dirOf({ "_sequence.json": SEQ, [A1]: "{A}", [A2]: "{X}" });
  assert.deepEqual(seen(cli("--pr", kept, "--base", base, "--regen", regen)), [0, 1, "", "PASS", ""]);
  assert.deepEqual(seen(cli("--pr", changed, "--base", base, "--regen", regen)), [1, 1, "", "FAIL", "ATTEMPT_BYTES_MISMATCH"]);
  assert.deepEqual(seen(cli("--pr", dirOf({ "_sequence.json": SEQ, [A1]: "{A}" }), "--base", join(tmpdir(), "no-such-base-dir"), "--regen", dirOf({ "_sequence.json": SEQ, [A1]: "{A}" }))), [0, 1, "", "PASS", ""]);
  assert.deepEqual(seen(cli("--pr", kept, "--base", dirOf({ "_sequence.json": SEQ }), "--regen", regen)), [1, 1, "", "FAIL", "ATTEMPT_BYTES_MISMATCH"]);
  for (const args of [["--pr", kept, "--regen", regen], ["--pr", kept, "--base", join(dirOf({ x: "1" }), "x"), "--regen", regen]]) assert.deepEqual(seen(cli(...args)), [1, 1, "", "FAIL", "INPUT_UNREADABLE"]);
  for (const args of [["--pr", kept, "--base", base], ["--regen", regen]]) assert.equal(cli(...args).code, 2);
});

test("BF-I1C-02 and 04 (real CLI): attempt files are compared as raw bytes; a sequence that is not UTF-8 or is broken on either side is one FAIL line and exit 1, never an uncaught error", () => {
  const side = (byte) => dirOf({ "_sequence.json": SEQ, [A1]: raw(byte) }), empty = dirOf({});
  assert.deepEqual(seen(cli("--pr", side(0x80), "--base", empty, "--regen", side(0x81))), [1, 1, "", "FAIL", "ATTEMPT_BYTES_MISMATCH"]);
  assert.deepEqual(seen(cli("--pr", side(0x80), "--base", empty, "--regen", side(0x80))), [0, 1, "", "PASS", ""]);
  const good = dirOf({ "_sequence.json": SEQ }), twice = [R("requirements", null, "not_approved", false), R("requirements", null, "not_approved", false)];
  const odd = (rows) => dirOf({ "_sequence.json": SEQ_OF(rows) }), link = dirOf({ "_sequence.json": SEQ });
  symlinkSync(join(good, "_sequence.json"), join(link, "attempt-9.json"));
  const notUtf8 = dirOf({ "_sequence.json": Buffer.concat([Buffer.from('{"rows":[],"x":"'), Buffer.from([0x80]), Buffer.from('"}')]) });
  const broken = [notUtf8, odd(seq(twice)), odd(seq([{ ...FD, unit: 7 }])), odd([{ order: 1 }]), dirOf({ "_sequence.json": '{"rows":"no"}' }), dirOf({ "_sequence.json": "{broken" }), link, dirOf({})];
  for (const bad of broken) {
    assert.deepEqual(seen(cli("--pr", bad, "--base", empty, "--regen", good)), [1, 1, "", "FAIL", "INPUT_UNREADABLE"]);
    assert.deepEqual(seen(cli("--pr", good, "--base", empty, "--regen", bad)), [1, 1, "", "FAIL", "INPUT_UNREADABLE"]);
  }
});

test("OBS-I1C-01: started through a symlink both scripts still run and speak (they used to exit 0 with no output)", () => {
  for (const [script, arg] of [["record-compare", "--pr"], ["approval-record", "--workspace"]]) {
    const alias = join(mkdtempSync(join(tmpdir(), "rc-")), "alias.mjs");
    symlinkSync(fileURLToPath(new URL(`../scripts/sds/${script}.mjs`, import.meta.url)), alias);
    const r = spawnSync(process.execPath, [alias, arg, "x"], { encoding: "utf8" });
    assert.deepEqual([r.status, r.stdout.split("\n").filter(Boolean).length], [2, 1]);
  }
});
