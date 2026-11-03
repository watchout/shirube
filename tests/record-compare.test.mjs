// I1c (design docs/design/u1-engine-judge.md v13 §7.3 rules 1 to 6 and §4 test 20): the audit seat's comparison of a PR's records with the records made again from the workspace.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { compareRecords, main } from "../scripts/sds/record-compare.mjs";

const REF = "approvals/i1/functional-design/u1/attempt-1.json", REF2 = "approvals/i1/infrastructure-design/u1/attempt-1.json";
const R = (stage, unit, status, started, approvalRef) => ({ stage, ...(unit ? { unit } : {}), status, started, ...(approvalRef ? { approvalRef } : {}) });
const seq = (rows) => rows.map((r, i) => ({ order: i + 1, ...r }));
const FD = R("functional-design", "u1", "approved", true, REF), INFRA = R("infrastructure-design", "u1", "not_approved", false), CG = R("code-generation", "u1", "not_approved", true);
const REGEN = { rows: seq([FD, INFRA, CG]), attempts: new Map([[REF, "{A}"]]) };
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
  assert.deepEqual(verdict(pr([FD, INFRA, CG], new Map([[REF, "{B}"]]))), ["FAIL", "ATTEMPT_BYTES_MISMATCH"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG], new Map([[REF, "{A}"], ["approvals/i1/x/_intent/attempt-1.json", "{}"]]))), ["FAIL", "ATTEMPT_BYTES_MISMATCH"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG]), { ...REGEN, rows: seq([FD, R("infrastructure-design", "u1", "exempt", false), CG]) }), ["FAIL", "EXEMPT_MISMATCH"]);
  assert.deepEqual(verdict(pr([FD, INFRA, CG, R("build-and-test", null, "not_approved", false)])), ["FAIL", "ROW_EXTRA"]);
  assert.deepEqual(verdict({ ...REGEN, rows: REGEN.rows.map((r, i) => ({ ...r, order: i ? i + 2 : 1 })) }), ["FAIL", "ORDER_NOT_SEQUENTIAL"]);
  assert.deepEqual(compareRecords(pr([FD, INFRA, CG]), { ...REGEN, rows: seq([FD, R("infrastructure-design", "u1", "exempt", false), CG]) }).findings, [{ code: "EXEMPT_MISMATCH", stage: "infrastructure-design", unit: "u1" }]);
});

test("the entry: two directories in, one line of sds-record-compare/1 out; an unreadable sequence is a FAIL, never a PASS; wrong arguments exit 2", () => {
  const put = (dir, rel, text) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), text); };
  const [a, b, c, d, e] = [0, 1, 2, 3, 4].map(() => mkdtempSync(join(tmpdir(), "rc-")));
  for (const d of [a, b]) { put(d, "_sequence.json", JSON.stringify({ rows: REGEN.rows })); put(d, "functional-design/u1/attempt-1.json", "{A}"); }
  put(b, "functional-design/u1/attempt-1.json", "{B}");
  put(c, "_sequence.json", "{broken");
  put(d, "_sequence.json", JSON.stringify({ rows: [{ order: 1 }] }));
  put(e, "_sequence.json", JSON.stringify({ rows: REGEN.rows }));
  symlinkSync(join(a, "functional-design/u1/attempt-1.json"), join(e, "attempt-9.json"));
  const run = (...args) => { const out = main(args); return [out.code, JSON.parse(out.line)]; };
  assert.deepEqual(run("--pr", a, "--regen", a), [0, { schema: "sds-record-compare/1", result: "PASS", findings: [] }]);
  assert.deepEqual(run("--pr", a, "--regen", b), [1, { schema: "sds-record-compare/1", result: "FAIL", findings: [{ code: "ATTEMPT_BYTES_MISMATCH", stage: "functional-design", unit: "u1" }] }]);
  for (const unreadable of [c, d, e]) assert.deepEqual([run("--pr", unreadable, "--regen", a)[0], run("--pr", unreadable, "--regen", a)[1].result, run("--pr", a, "--regen", unreadable)[1].findings.map((f) => f.code)], [1, "FAIL", ["INPUT_UNREADABLE"]]);
  assert.equal(run("--pr", a)[0], 2);
});
