// ApprovalRecordWriter (U1 I1; U1 rules BR5.1-BR5.8, contracts C2/C9). Synthetic audits in the shape of the AI-DLC audit shards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { plan } from "../scripts/sds/approval-record.mjs";

const SCRIPT = resolve(import.meta.dirname, "../scripts/sds/approval-record.mjs");
const REF = "aidlc/spaces/default/intents/i1/audit/a.md";
const T = (n) => new Date(Date.UTC(2026, 9, 22, 0, n)).toISOString().replace(".000Z", "Z");
const blk = (event, n, f = {}) => `## ${event}\n**Timestamp**: ${T(n)}\n**Event**: ${event}\n${Object.entries(f).map(([k, v]) => `**${k}**: ${v}`).join("\n")}`;
const audit = (...b) => `# AI-DLC Audit Log\n\n${b.join("\n\n---\n\n")}\n\n---\n`;
const sha = (...b) => createHash("sha256").update(b.join("\n---\n")).digest("hex");
const start = (s, n) => blk("STAGE_STARTED", n, { Stage: s }), ok = (s, n) => blk("GATE_APPROVED", n, { Stage: s, "User Input": "Approve" });
const confirm = (s, u, n, d = "Looks correct") => blk("SUMMARY_CONFIRMATION_RECORDED", n, { Stage: s, Unit: u, Details: d });
const ustart = (s, u, n) => blk("UNIT_STARTED", n, { Stage: s, Unit: u }), udone = (s, u, n) => blk("UNIT_COMPLETED", n, { Stage: s, Unit: u });
const jump = (to, n) => blk("STAGE_JUMPED", n, { Direction: "BACKWARD", Source: "x", Target: to });
const rows = (...b) => plan({ intent: "i1", shards: [{ ref: REF, text: audit(...b) }] });
const ids = (p) => p.sequence.entries.map((e) => `${e.stage}${e.unit ? ":" + e.unit : ""}#${e.attempt}${e.approved ? "+" : "-"}${e.superseded ? "x" : ""}`);

test("BR5.1 BR5.4: an Inception stage's approval event makes attempt-1 under _intent, with the event's own time and body digest", () => {
  const p = rows(start("intent-capture", 1), ok("intent-capture", 2));
  assert.deepEqual(p.sequence.entries, [{ order: 1, stage: "intent-capture", attempt: 1, approved: true, approval_ref: "approvals/i1/intent-capture/_intent/attempt-1.json" }]);
  assert.equal(p.approvals[0].path, "approvals/i1/intent-capture/_intent/attempt-1.json");
  assert.deepEqual(p.approvals[0].record, { schema: "sds-approval-record/1", intent: "i1", stage: "intent-capture", attempt: 1, approved_at: T(2), approver_role: "owner", identity_check: "none", source_event_digest: sha(ok("intent-capture", 2)), source_audit_ref: REF });
});

test("BR5.5: a skipped stage has no row; a stage not yet approved is a row without an approval", () => {
  assert.deepEqual(ids(rows(start("market-research", 1), blk("STAGE_SKIPPED", 2, { Stage: "market-research" }), start("feasibility", 3))), ["feasibility#1-"]);
  assert.equal(rows(start("feasibility", 3)).approvals.length, 0);
});

test("BR5.2: a unit design stage is approved only when the summary confirmation and the unit completion are both on its newest attempt", () => {
  const full = rows(confirm("functional-design", "u1", 1), ustart("functional-design", "u1", 2), udone("functional-design", "u1", 3));
  assert.deepEqual(ids(full), ["functional-design:u1#1+"]);
  assert.equal(full.approvals[0].path, "approvals/i1/functional-design/u1/attempt-1.json");
  assert.equal(full.approvals[0].record.approved_at, T(3));
  assert.equal(full.approvals[0].record.source_event_digest, sha(confirm("functional-design", "u1", 1), udone("functional-design", "u1", 3)));
  assert.deepEqual(ids(rows(ustart("functional-design", "u1", 2), udone("functional-design", "u1", 3))), ["functional-design:u1#1-"], "no confirmation");
  assert.deepEqual(ids(rows(confirm("functional-design", "u1", 1, "Request changes"), ustart("functional-design", "u1", 2), udone("functional-design", "u1", 3))), ["functional-design:u1#1-"], "changes were requested");
  assert.deepEqual(ids(rows(confirm("functional-design", "u1", 1), ustart("functional-design", "u1", 2))), ["functional-design:u1#1-"], "not completed");
});

test("BR5.5 BR5.8: reopening a stage adds a new attempt; the downstream row becomes superseded; the old approval stays; the new attempt gets its own file", () => {
  const p = rows(start("a", 1), ok("a", 2), start("b", 3), ok("b", 4), jump("a", 5), start("a", 6), ok("a", 7));
  assert.deepEqual(ids(p), ["a#1+", "b#1+x", "a#2+"]);
  assert.deepEqual(p.approvals.map((x) => x.path), ["approvals/i1/a/_intent/attempt-1.json", "approvals/i1/b/_intent/attempt-1.json", "approvals/i1/a/_intent/attempt-2.json"]);
  assert.equal(p.sequence.entries[2].approval_ref, "approvals/i1/a/_intent/attempt-2.json");
});

const FD = "functional-design", NR = "nfr-requirements";
test("BR5.5: reopening a unit stage supersedes only that unit's downstream rows; reopening an Inception stage supersedes every unit's", () => {
  const units = [start("inc", 1), ok("inc", 2), confirm(FD, "u1", 3), ustart(FD, "u1", 4), udone(FD, "u1", 5), confirm(NR, "u1", 6), ustart(NR, "u1", 7), udone(NR, "u1", 8), confirm(FD, "u2", 9), ustart(FD, "u2", 10), udone(FD, "u2", 11), confirm(NR, "u2", 12), ustart(NR, "u2", 13), udone(NR, "u2", 14)];
  const reject = blk("GATE_REJECTED", 15, { Stage: FD, Unit: "u1", Reopen: "jump", "Gate Scope": "unit-end", "Gate Stages": `${FD}, ${NR}` });
  assert.deepEqual(ids(rows(...units, reject, ustart(FD, "u1", 16))), ["inc#1+", `${FD}:u1#1+`, `${NR}:u1#1+x`, `${FD}:u2#1+`, `${NR}:u2#1+`, `${FD}:u1#2-`]);
  assert.deepEqual(ids(rows(...units, jump("inc", 15))), ["inc#1+", `${FD}:u1#1+x`, `${NR}:u1#1+x`, `${FD}:u2#1+x`, `${NR}:u2#1+x`]);
});

test("NFR2.1 NFR10.4: the same audit gives the same bytes, and the module reads no clock, network, git or GitHub", () => {
  const b = [start("a", 1), ok("a", 2)];
  assert.equal(JSON.stringify(rows(...b)), JSON.stringify(rows(...b)));
  assert.doesNotMatch(readFileSync(SCRIPT, "utf8"), /child_process|node:https?|\bfetch\(|Date\.now|new Date\(|Math\.random|randomUUID|hrtime/);
});

const fixture = (text) => { const d = mkdtempSync(join(tmpdir(), "ar-")); mkdirSync(join(d, "aidlc/spaces/default/intents/i1/audit"), { recursive: true }); writeFileSync(join(d, REF), text); return d; };
const cli = (d, ...extra) => { const r = spawnSync("node", [SCRIPT, "--intent", "i1", "--root", d, "--out", d, ...extra], { encoding: "utf8" }); return { code: r.status, out: r.stdout.trim() ? JSON.parse(r.stdout) : null }; };
const listing = (d) => (existsSync(join(d, "approvals")) ? readdirSync(join(d, "approvals"), { recursive: true }).sort() : []);

test("BR5.5 BR5.7: the CLI writes the approvals and the sequence into the tree, and a second run changes nothing", () => {
  const d = fixture(audit(start("a", 1), ok("a", 2)));
  try {
    const first = cli(d), seq = readFileSync(join(d, "approvals/i1/_sequence.json"), "utf8");
    assert.deepEqual([first.code, first.out.verdict, first.out.written.length], [0, "PASS", 2]);
    assert.equal(JSON.parse(seq).source_digest, createHash("sha256").update(readFileSync(join(d, REF))).digest("hex"));
    assert.equal(seq, `${JSON.stringify(plan({ intent: "i1", shards: [{ ref: REF, text: readFileSync(join(d, REF), "utf8") }] }).sequence, null, 2)}\n`);
    const again = cli(d);
    assert.deepEqual([again.code, again.out.written.length, again.out.unchanged.length], [0, 0, 2]);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("BR5.8: an existing approval with different bytes fails the run and nothing is overwritten or added", () => {
  const d = fixture(audit(start("a", 1), ok("a", 2), start("b", 3), ok("b", 4)));
  try {
    mkdirSync(join(d, "approvals/i1/b/_intent"), { recursive: true });
    writeFileSync(join(d, "approvals/i1/b/_intent/attempt-1.json"), "{}\n");
    const r = cli(d);
    assert.deepEqual([r.code, r.out.verdict], [1, "FAIL"]);
    assert.match(r.out.reason, /approvals\/i1\/b\/_intent\/attempt-1\.json/);
    assert.equal(readFileSync(join(d, "approvals/i1/b/_intent/attempt-1.json"), "utf8"), "{}\n");
    assert.deepEqual(listing(d).filter((x) => x.endsWith(".json")), ["i1/b/_intent/attempt-1.json"]);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("BR5.3 BR5.5: an unreadable audit, or a required stage without an approved attempt, fails and writes nothing", () => {
  const d = fixture("not an audit");
  const e = fixture(audit(start("a", 1)));
  try {
    assert.deepEqual([cli(d).code, listing(d)], [1, []]);
    const r = cli(e, "--require", "a");
    assert.deepEqual([r.code, r.out.verdict, listing(e)], [1, "FAIL", []]);
    assert.match(r.out.reason, /a/);
  } finally { rmSync(d, { recursive: true, force: true }); rmSync(e, { recursive: true, force: true }); }
});
