// I1c (design docs/design/u1-engine-judge.md v13 §3-3, §3-4, §3-6, §3-7, §4 tests 4, 5, 7b and 8): the approval records (C2) and the stage sequence (C9) made from sds-engine-judgment/1.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { JudgeError } from "../scripts/sds/engine-judge.mjs";
import { buildRecords, canonical, main, place } from "../scripts/sds/approval-record.mjs";

const SHARD2 = "aidlc/spaces/default/intents/i1/audit/b.md", SEQ = "approvals/i1/_sequence.json", ATT = "approvals/i1/functional-design/u1/attempt-2.json", GATE_ATT = "approvals/i1/requirements/_intent/attempt-1.json";
const BLOCK = "## UNIT_COMPLETED\n**Timestamp**: 2026-11-01T00:00:00Z\n**Stage**: functional-design\n**Unit**: u1", GATE = "## GATE_APPROVED\n**Stage**: requirements";
const row = (stage, unit, kind, status, started, evidence = null) => ({ stage, unit, kind, status, started, evidence });
const unitEv = (n, summary = { ok: true, summaryCoverage: "covered", unit: "u1" }) => ({ completedBlock: BLOCK, completedAt: "2026-11-01T00:00:00Z", runFloorOrdinal: n, summary, sourceAuditRef: SHARD2 });
const gateEv = { gateBlock: GATE, gateAt: "2026-11-02T00:00:00Z", gateOrdinal: 1, sourceAuditRef: SHARD2 };
const JUDGED = { inputDigest: "a".repeat(64), engineTreeDigest: "b".repeat(64), engineVersion: "2.11.1", sourceDigest: "c".repeat(64), rows: [
  row("state-init", null, "initialization", "exempt", null), row("requirements", null, "stage-gate", "approved", true, gateEv),
  row("functional-design", "u1", "per-unit", "approved", true, unitEv(2)), row("functional-design", "u2", "per-unit", "not_approved", false),
  row("code-generation", "u1", "per-unit", "not_approved", true), row("code-generation", "u2", "per-unit", "exempt", false), row("build-and-test", null, "stage-gate", "not_approved", false)] };
const tmp = () => mkdtempSync(join(tmpdir(), "ar-")), RAW = Buffer.from([0x7b, 0x80, 0x7d]);
const files = (root, rel = "") => readdirSync(join(root, rel)).flatMap((n) => (statSync(join(root, rel, n)).isDirectory() ? files(root, join(rel, n)) : [join(rel, n)])).sort();
const codeOf = (fn) => { try { fn(); } catch (e) { assert.ok(e instanceof JudgeError && e.message === e.code, String(e)); return e.code; } return "none"; };

test("C2: a record per approved row at the path its stage, Unit and attempt give; the digest covers the block and the canonical answer, whatever the key order (4)", () => {
  const made = buildRecords("i1", JUDGED);
  assert.deepEqual([...made.keys()].sort(), [SEQ, ATT, GATE_ATT].sort());
  const common = { schema: "sds-approval-record/1", intent: "i1", approverRole: "owner", identityCheck: "none", sourceAuditRef: SHARD2 };
  assert.deepEqual(JSON.parse(made.get(ATT)), { ...common, stage: "functional-design", unit: "u1", attempt: 2, approvedAt: "2026-11-01T00:00:00Z", sourceEventDigest: "264c583116e24d79ce4d919873c3cb3e9cf62c49866483f715f6598be4a0b189" });
  assert.deepEqual(JSON.parse(made.get(GATE_ATT)), { ...common, stage: "requirements", attempt: 1, approvedAt: "2026-11-02T00:00:00Z", sourceEventDigest: "8111803239e4f17d2764cdbd567799ad63e4503e4051516f58bab18251e11b0b" });
  const swapped = buildRecords("i1", { ...JUDGED, rows: [row("functional-design", "u1", "per-unit", "approved", true, unitEv(2, { unit: "u1", summaryCoverage: "covered", ok: true }))] });
  assert.equal(swapped.get(ATT), made.get(ATT));
  assert.equal(canonical({ b: [2, { d: 1, c: null }], a: "x" }), '{"a":"x","b":[2,{"c":null,"d":1}]}');
});

test("C9: sds-stage-sequence/2 in unit-major order with status, started and approvalRef; the same judgment gives the same bytes; a finished intent keeps every approved row (5)", () => {
  const made = buildRecords("i1", JUDGED), seq = JSON.parse(made.get(SEQ));
  assert.equal(made.get(SEQ), buildRecords("i1", structuredClone(JUDGED)).get(SEQ));
  assert.deepEqual({ ...seq, rows: 0 }, { schema: "sds-stage-sequence/2", intent: "i1", sourceDigest: "c".repeat(64), inputDigest: "a".repeat(64), engineTreeDigest: "b".repeat(64), engineVersion: "2.11.1", rows: 0 });
  assert.deepEqual(seq.rows.map((r) => [r.order, r.stage, r.unit, r.status, r.started, r.approvalRef]), [
    [1, "state-init", undefined, "exempt", null, undefined], [2, "requirements", undefined, "approved", true, GATE_ATT], [3, "functional-design", "u1", "approved", true, ATT],
    [4, "code-generation", "u1", "not_approved", true, undefined], [5, "functional-design", "u2", "not_approved", false, undefined], [6, "code-generation", "u2", "exempt", false, undefined],
    [7, "build-and-test", undefined, "not_approved", false, undefined]]);
  const done = buildRecords("i1", { ...JUDGED, rows: [row("functional-design", "u1", "per-unit", "approved", true, unitEv(1)), row("code-generation", "u1", "per-unit", "approved", true, unitEv(1))] });
  assert.deepEqual([...done.keys()].sort(), [SEQ, "approvals/i1/code-generation/u1/attempt-1.json", "approvals/i1/functional-design/u1/attempt-1.json"]);
});

test("7b: the evidence's shard path is the record's sourceAuditRef; an approved row without evidence, a malformed judgment or an unsafe name is one fixed code", () => {
  assert.equal(JSON.parse(buildRecords("i1", JUDGED).get(ATT)).sourceAuditRef, SHARD2);
  assert.equal(codeOf(() => buildRecords("i1", { ...JUDGED, rows: [row("requirements", null, "stage-gate", "approved", true)] })), "EVIDENCE_MISSING");
  assert.equal(codeOf(() => buildRecords("i1", { ...JUDGED, rows: [row("requirements", null, "stage-gate", "approved", true, { ...gateEv, gateOrdinal: 0 })] })), "EVIDENCE_MISSING");
  assert.equal(codeOf(() => buildRecords("../x", JUDGED)), "UNSUPPORTED_SHAPE");
  assert.equal(codeOf(() => buildRecords("i1", { ...JUDGED, rows: [row("../x", null, "stage-gate", "approved", true, gateEv)] })), "UNSUPPORTED_SHAPE");
  assert.equal(codeOf(() => buildRecords("i1", { rows: "no" })), "UNSUPPORTED_SHAPE");
  for (const bad of [row("code-generation", "u1", "per-unit", "weird", false), row("code-generation", "u1", "other", "exempt", false), row("code-generation", "../u", "per-unit", "exempt", false)]) assert.equal(codeOf(() => buildRecords("i1", { ...JUDGED, rows: [bad] })), "UNSUPPORTED_SHAPE");
  const twice = row("functional-design", "u1", "per-unit", "approved", true, unitEv(2));
  assert.equal(codeOf(() => buildRecords("i1", { ...JUDGED, rows: [twice, twice] })), "UNSUPPORTED_SHAPE");
  for (const ev of [{ ...gateEv, gateOrdinal: 1.5 }, { ...gateEv, sourceAuditRef: undefined }, { ...unitEv(1), summary: undefined }, { ...unitEv(1), completedBlock: undefined }]) {
    assert.equal(codeOf(() => buildRecords("i1", { ...JUDGED, rows: [row("requirements", null, "stage-gate", "approved", true, ev)] })), "EVIDENCE_MISSING");
  }
});

test("8: all or nothing; a different attempt file already there places nothing, the same one is left alone, _sequence.json is replaced, a failing write leaves nothing and restores", () => {
  const made = buildRecords("i1", JUDGED), out = tmp(), put = (root, rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
  assert.deepEqual(place(made, out).sort(), [...made.keys()].sort());
  assert.deepEqual(place(made, out), []);
  put(out, SEQ, "old");
  assert.deepEqual(place(made, out), [SEQ]);
  const clash = tmp();
  put(clash, ATT, "other");
  assert.equal(codeOf(() => place(made, clash)), "FILE_CONFLICT");
  assert.deepEqual(files(clash), [ATT]);
  const broken = tmp();
  put(broken, SEQ, RAW);
  let n = 0;
  assert.equal(codeOf(() => place(made, broken, (f, t) => { writeFileSync(f, t); if (++n === made.size) throw new Error("/abs/secret"); })), "COPY_FAILED");
  assert.deepEqual(files(broken), [SEQ]);
  assert.ok(readFileSync(join(broken, SEQ)).equals(RAW));
});

test("the entry: arguments to prepare and place; a failure is one line with a fixed code and exit code 1; wrong arguments exit 2; the workspace is not the place written", () => {
  const out = tmp(), seen = [], args = (o) => ["--workspace", "/w", "--space", "default", "--intent", "i1", "--out", o];
  const ok = main(args(out), { prepare: (a) => { seen.push(a); return JUDGED; } });
  assert.deepEqual([ok.code, seen], [0, [{ workspace: "/w", target: { space: "default", intent: "i1" } }]]);
  assert.deepEqual(JSON.parse(ok.line).files.sort(), [...buildRecords("i1", JUDGED).keys()].sort());
  const fresh = tmp(), shape = main(args(fresh), { prepare: () => { throw new JudgeError("UNSUPPORTED_SHAPE"); } });
  assert.deepEqual([shape.code, JSON.parse(shape.line).reason, readdirSync(fresh)], [1, "UNSUPPORTED_SHAPE", []]);
  assert.equal(JSON.parse(main(args(fresh), { prepare: () => { throw new Error("/abs/secret"); } }).line).reason, "ENGINE_CALL_FAILED");
  assert.equal(main(["--workspace", "/w"], { prepare: () => JUDGED }).code, 2);
});

test("BF-I1C-02: an attempt file is compared as raw bytes; bytes that only decode alike are a conflict", () => {
  const odd = { ...JUDGED, rows: [row("functional-design", "u1", "per-unit", "approved", true, { ...unitEv(2), sourceAuditRef: "shard-\uFFFD" })] }, made = buildRecords("i1", odd), out = tmp(), file = join(out, ATT);
  place(made, out);
  const text = readFileSync(file), at = text.indexOf(Buffer.from("\uFFFD")), changed = Buffer.concat([text.subarray(0, at), Buffer.from([0x80]), text.subarray(at + 3)]);
  writeFileSync(file, changed);
  assert.equal(codeOf(() => place(made, out)), "FILE_CONFLICT");
  assert.ok(at > 0 && readFileSync(file).equals(changed));
});

test("BF-I1C-03: the judgment contract is checked whole; one wrong value is one fixed code and nothing is placed", () => {
  const only = (r) => ({ ...JUDGED, rows: [r] }), gate = (over) => row("requirements", null, "stage-gate", "approved", true, { ...gateEv, ...over });
  const shape = [{ ...JUDGED, sourceDigest: undefined }, { ...JUDGED, inputDigest: "xyz" }, { ...JUDGED, engineTreeDigest: "" }, { ...JUDGED, engineVersion: "" }, only({ ...gate({}), started: "bad" }), only({ ...gate({}), started: null }),
    only(row("state-init", null, "initialization", "exempt", false)), only(row("state-init", null, "initialization", "approved", null, gateEv)), only(row("code-generation", null, "per-unit", "exempt", false)),
    only(row("requirements", "u1", "stage-gate", "exempt", false)), only(row("requirements", null, "stage-gate", "not_approved", false, gateEv))];
  for (const bad of shape) assert.equal(codeOf(() => buildRecords("i1", bad)), "UNSUPPORTED_SHAPE");
  const evidence = [gate({ gateBlock: "" }), gate({ gateAt: "" }), gate({ sourceAuditRef: "" }), gate({ gateOrdinal: "1" }), row("functional-design", "u1", "per-unit", "approved", true, gateEv),
    row("requirements", null, "stage-gate", "approved", true, unitEv(1)), row("functional-design", "u1", "per-unit", "approved", true, { ...unitEv(1), completedAt: "" }), row("requirements", null, "stage-gate", "approved", true, "text")];
  for (const bad of evidence) assert.equal(codeOf(() => buildRecords("i1", only(bad))), "EVIDENCE_MISSING");
  const out = tmp(), done = main(["--workspace", "/w", "--space", "default", "--intent", "i1", "--out", out], { prepare: () => only({ ...gate({ gateBlock: "", gateAt: "" }), started: "bad" }) });
  assert.deepEqual([done.code, readdirSync(out)], [1, []]);
});
