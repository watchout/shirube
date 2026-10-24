// ApprovalRecordWriter (U1 I1; U1 rules BR5.1-BR5.8, contracts C2/C9). Synthetic audits in the shape of the AI-DLC audit shards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { plan, writeAll } from "../scripts/sds/approval-record.mjs";

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
  assert.deepEqual(p.approvals[0].record, { schema: "sds-approval-record/1", intent: "i1", stage: "intent-capture", attempt: 1, approved_at: T(2), approver_role: "owner", identity_check: "none", source_event_digest: sha(ok("intent-capture", 2)), source_audit_ref: REF });
});

test("BR5.5: a skipped stage has no row; a stage not yet approved is a row without an approval", () => {
  assert.deepEqual(ids(rows(start("market-research", 1), blk("STAGE_SKIPPED", 2, { Stage: "market-research" }), start("feasibility", 3))), ["feasibility#1-"]);
});

test("BR5.2: a unit design stage is approved only when the summary confirmation and the unit completion are both on its newest attempt", () => {
  const full = rows(confirm("functional-design", "u1", 1), ustart("functional-design", "u1", 2), udone("functional-design", "u1", 3));
  assert.deepEqual(ids(full), ["functional-design:u1#1+"]);
  assert.deepEqual([full.approvals[0].path, full.approvals[0].record.approved_at, full.approvals[0].record.source_event_digest],
    ["approvals/i1/functional-design/u1/attempt-1.json", T(3), sha(confirm("functional-design", "u1", 1), udone("functional-design", "u1", 3))]);
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

test("BR5.1: a unit-scope gate approval approves the named stages of that unit, but never a unit design stage (event shape assumed to mirror the rejection's)", () => {
  const CG = "code-generation", gate = blk("GATE_APPROVED", 4, { Stage: CG, Unit: "u1", "Gate Scope": "unit-end", "Gate Stages": `${FD}, ${CG}` });
  assert.deepEqual([ids(rows(ustart(FD, "u1", 1), ustart(CG, "u1", 2), udone(CG, "u1", 3), gate)), ids(rows(ustart(CG, "u2", 1), gate))], [[`${FD}:u1#1-`, `${CG}:u1#1+`], [`${CG}:u2#1-`]]); // the second: an approval for another unit does not count
});

test("NFR2.1 NFR10.4: the same audit gives the same bytes, and the module reads no clock, network, git or GitHub", () => {
  assert.equal(JSON.stringify(rows(start("a", 1), ok("a", 2))), JSON.stringify(rows(start("a", 1), ok("a", 2))));
  assert.doesNotMatch(readFileSync(SCRIPT, "utf8"), /child_process|node:https?|\bfetch\(|Date\.now|new Date\(|Math\.random|randomUUID|hrtime/);
});

const fixture = (text) => { const d = mkdtempSync(join(tmpdir(), "ar-")); mkdirSync(join(d, "aidlc/spaces/default/intents/i1/audit"), { recursive: true }); writeFileSync(join(d, REF), text); return d; };
const cli = (d, ...extra) => { const r = spawnSync("node", [SCRIPT, "--intent", "i1", "--root", d, "--out", d, ...extra], { encoding: "utf8", cwd: d }); return { code: r.status, out: r.stdout.trim() ? JSON.parse(r.stdout) : null }; };
const fails = (d, ...extra) => { const r = cli(d, ...extra); return [r.code, r.out?.verdict, listing(d)]; };
const gone = (...dirs) => dirs.forEach((d) => rmSync(d, { recursive: true, force: true }));
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
    assert.deepEqual([r.code, r.out.verdict, /approvals\/i1\/b\/_intent\/attempt-1\.json/.test(r.out.reason)], [1, "FAIL", true]);
    assert.equal(readFileSync(join(d, "approvals/i1/b/_intent/attempt-1.json"), "utf8"), "{}\n");
    assert.deepEqual(listing(d).filter((x) => x.endsWith(".json")), ["i1/b/_intent/attempt-1.json"]);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("BR5.3 BR5.5: an unreadable audit, or a required stage without an approved attempt, fails and writes nothing", () => {
  const d = fixture("not an audit"), e = fixture(audit(start("a", 1)));
  try { assert.deepEqual([fails(d), fails(e, "--require", "a")], [[1, "FAIL", []], [1, "FAIL", []]]); } finally { gone(d, e); }
});

const at = (block, iso) => block.replace(/\*\*Timestamp\*\*: .*/, `**Timestamp**: ${iso}`);
const LC = (n) => confirm(FD, "u1", n), RC = (n) => confirm(FD, "u1", n, "Request changes"), US = (n) => ustart(FD, "u1", n), UC = (n) => udone(FD, "u1", n);
const GA = "## GATE_APPROVED\n**Event**: GATE_APPROVED\n**Stage**: a\n**User Input**: Approve"; // no Timestamp line at all
const D = "2026-10-24T00:00:02"; // a fixed UTC second for the time cases

test("BR5.3 C2: every handled event needs a real UTC calendar time (approved_at is required); the CLI writes nothing", () => {
  for (const bad of ["yesterday", "2026-13-45T99:99:99Z", "2026-02-30T00:00:02Z", "2026-02-29T00:00:02Z", "2100-02-29T00:00:02Z", "2026-04-31T00:00:02Z", "2026-10-24T24:00:00Z",
    "2026-10-24T00:60:00Z", "2026-10-24T00:00:60Z", `${D}.1234567890Z`, `${D}+09:00`]) assert.throws(() => rows(start("a", 1), at(ok("a", 2), bad)), /no valid Timestamp/, bad);
  assert.throws(() => rows(start("a", 1), GA), /no valid Timestamp/);
  for (const good of ["2024-02-29T00:00:02Z", "2000-02-29T00:00:02Z", "2026-12-31T23:59:59Z", `${D}.5Z`, `${D}.123456789Z`]) assert.equal(rows(start("a", 1), at(ok("a", 2), good)).approvals[0].record.approved_at, good);
  const d = fixture(audit(start("a", 1), GA));
  try { assert.deepEqual(fails(d), [1, "FAIL", []]); } finally { gone(d); }
});

test("BR5.2 C2: of the two events a unit design approval rests on, the later instant is approved_at, whatever the fractional digits", () => {
  const run = (c, s, d) => rows(at(LC(1), c), at(US(2), s), at(UC(3), d)).approvals[0].record.approved_at;
  assert.equal(run(`${D}Z`, `${D}.100Z`, `${D}.500Z`), `${D}.500Z`);
  assert.equal(run(`${D}.500Z`, `${D}.100Z`, `${D}Z`), `${D}.500Z`, "the confirmation can be the later one");
  assert.equal(run(`${D}Z`, `${D}Z`, `${D}.000000001Z`), `${D}.000000001Z`);
});

test("BR2.1 BR5.5: --require needs the newest attempt of the stage to be approved and not superseded", () => {
  const a = fixture(audit(start("intent-capture", 1), ok("intent-capture", 2), jump("intent-capture", 3), start("intent-capture", 4)));
  const b = fixture(audit(start("intent-capture", 1), ok("intent-capture", 2), start("requirements-analysis", 3), ok("requirements-analysis", 4), jump("intent-capture", 5)));
  const c = fixture(audit(start("intent-capture", 1), ok("intent-capture", 2), jump("intent-capture", 3), start("intent-capture", 4), ok("intent-capture", 5)));
  try {
    assert.deepEqual(fails(a, "--require", "intent-capture"), [1, "FAIL", []], "an older approval does not satisfy a reopened stage");
    assert.deepEqual(fails(b, "--require", "requirements-analysis"), [1, "FAIL", []], "a superseded row does not satisfy it");
    for (const v of [["--require"], ["--require", ""], ["--requre", "x"], ["--out", ""], ["--root", ""]]) assert.deepEqual(fails(c, ...v), [1, "FAIL", []], `${v.join(" ")} is an error, not a pass`);
    assert.equal(cli(c, "--require", "intent-capture").code, 0, "the newest attempt approved is enough");
  } finally { gone(a, b, c); }
});

test("BR5.2: a confirmation belongs to the attempt it was given in; a change request takes it back; nothing is carried across attempts", () => {
  const R = (...b) => ids(rows(...b));
  assert.deepEqual(R(LC(1), US(2), RC(3), UC(4)), [`${FD}:u1#1-`], "taken back after the start");
  assert.deepEqual(R(LC(1), RC(3), US(4), UC(5)), [`${FD}:u1#1-`], "taken back before the start");
  assert.deepEqual(R(LC(1), US(2), UC(3), RC(4)), [`${FD}:u1#1+`], "an approval already given stands");
  assert.deepEqual(R(LC(1), US(2), RC(3), LC(4), UC(5)), [`${FD}:u1#1+`], "re-confirmed after the change request");
  assert.deepEqual(R(LC(1), US(2), LC(3), UC(4), US(5), UC(6)), [`${FD}:u1#1+`, `${FD}:u1#2-`], "the next attempt has none of its own");
  assert.deepEqual(R(LC(1), US(2), LC(3), UC(4), LC(5), US(6), UC(7)), [`${FD}:u1#1+`, `${FD}:u1#2+`], "after the reopening a new one counts");
  assert.deepEqual(R(LC(1), US(2), UC(3), UC(4)), [`${FD}:u1#1+`], "a second completion changes nothing");
  assert.deepEqual(R(start("inc", 1), ok("inc", 2), LC(3), US(4), jump("inc", 5), LC(6), US(7), UC(8)), ["inc#1+", `${FD}:u1#1-x`, `${FD}:u1#2+`], "an attempt given up by a jump back takes no later confirmation");
  const NU = (f, n, ...x) => f(NR, "u1", n, ...x), jb = (o) => blk("STAGE_JUMPED", 8, { Target: FD, Direction: "BACKWARD", ...o });
  const tail = [US(9), LC(10), UC(11), NU(ustart, 12), NU(udone, 13)], head = [US(1), LC(2), UC(3), NU(ustart, 4), NU(confirm, 5), NU(udone, 6)];
  assert.deepEqual(R(...head, NU(confirm, 7), jb({ Unit: "u1" }), ...tail), [`${FD}:u1#1+`, `${NR}:u1#1+x`, `${FD}:u1#2+`, `${NR}:u1#2-`], "a confirmation that waited for the next attempt does not outlive a reopening of its unit");
  assert.deepEqual(R(start("inc", 0), ok("inc", 1), ...head, NU(confirm, 7), blk("STAGE_JUMPED", 8, { Target: "inc", Direction: "BACKWARD" }), US(9), NU(ustart, 12), NU(udone, 13)).slice(-1), [`${NR}:u1#2-`], "...nor a reopening of an Inception stage");
  assert.deepEqual(R(...head, jb({ Unit: "u1" }), US(9), LC(10), UC(11), NU(confirm, 12), NU(ustart, 13), NU(udone, 14)).slice(-1), [`${NR}:u1#2+`], "a confirmation given after the reopening counts");
  const same = [LC(1), US(2), UC(3), LC(4)], rej = blk("GATE_REJECTED", 5, { Stage: FD, Unit: "u1", "Gate Stages": FD, Reopen: "redo" });
  assert.deepEqual(R(...same, jb({ Unit: "u1" }), US(6), UC(7)), [`${FD}:u1#1+`, `${FD}:u1#2-`], "...nor a reopening of its own stage");
  assert.deepEqual(R(...same, rej, US(6), UC(7)), [`${FD}:u1#1+`, `${FD}:u1#2-`], "...nor a rejection of its own stage, however it reopens");
  assert.deepEqual(R(...head, confirm(NR, "u2", 7), jb({ Unit: "u1" }), ustart(NR, "u2", 9), udone(NR, "u2", 10)).slice(-1), [`${NR}:u2#1+`], "a reopening of one unit leaves another unit's waiting confirmation");
  assert.deepEqual(R(...head, LC(7), jb({ Target: NR, Unit: "u1" }), US(9), UC(10)).slice(-1), [`${FD}:u1#2+`], "...and the confirmation of a stage upstream of the reopened one");
  const a = rows(LC(1), US(2), LC(3), UC(4)).approvals[0].record;
  assert.deepEqual([a.source_event_digest, a.approved_at], [sha(LC(3), UC(4)), T(4)], "the approval rests on the latest confirmation of its attempt");
});

test("BR5.3: odd structure fails closed: a repeated field cannot replace the framework's, a jump back to a stage that never started is refused", () => {
  assert.deepEqual(ids(rows(start("a", 1), start("b", 2), blk("GATE_APPROVED", 3, { Stage: "a", "User Input": "Approve\n**Stage**: b\n**Event**: STAGE_JUMPED" }))), ["a#1+", "b#1-"]);
  assert.throws(() => rows(start("a", 1), ok("a", 2), jump("zzz", 3)), /never started/);
  assert.throws(() => rows(start("a", 1), ok("a", 2), blk("GATE_REJECTED", 3, { Stage: "zzz", Reopen: "jump" })), /never started/);
});

test("BR5.7: names and links that could carry a write out of the approvals folder are refused before anything is written", () => {
  for (const bad of ["../../../escape-record", "a/b", "/abs", ".", "..", "", "a b"]) assert.throws(() => rows(start(bad, 1), ok(bad, 2)), /stage is not a plain name/, bad);
  assert.throws(() => rows(ustart(FD, "../u", 1), udone(FD, "../u", 2)), /unit is not a plain name/);
  assert.throws(() => plan({ intent: "../x", shards: [{ ref: REF, text: audit(start("a", 1), ok("a", 2)) }] }), /intent is not a plain name/);
  assert.throws(() => plan({ intent: "i1", shards: [{ ref: REF, text: audit(start("a", 1), ok("a", 2)).replace(/\n/g, "\r\n") }] }), /CR line ends/);
  const d = fixture(audit(start("../../../escape-record", 1), ok("../../../escape-record", 2))), o = mkdtempSync(join(tmpdir(), "ar-out-"));
  try {
    assert.deepEqual(fails(d), [1, "FAIL", []]); assert.equal(existsSync(join(d, "..", "escape-record")), false);
    assert.throws(() => writeAll(o, [{ path: "approvals/i1/../../x.json", record: {} }], { path: "approvals/i1/_sequence.json", value: {} }), /leaves the output folder/);
    assert.deepEqual(listing(o), []);
  } finally { gone(d, o, join(d, "..", "escape-record")); }
  const regular = (e) => (existsSync(join(e, "approvals")) ? readdirSync(join(e, "approvals"), { recursive: true, withFileTypes: true }).filter((x) => x.isFile()).map((x) => join(x.parentPath, x.name)) : []);
  const w = (e, p) => { mkdirSync(join(e, p), { recursive: true }); return join(e, p); }, X = (o) => join(o, "x.json");
  const links = [(e, o) => { mkdirSync(join(e, "approvals")); symlinkSync(o, join(e, "approvals/i1")); }, (e, o) => symlinkSync(o, join(e, "approvals")), // a parent folder, the folder itself
    (e, o) => symlinkSync(X(o), join(w(e, "approvals/i1/a/_intent"), "attempt-1.json")), (e, o) => symlinkSync(X(o), join(w(e, "approvals/i1"), "_sequence.json")), // a dangling file, the sequence
    (e) => writeFileSync(join(w(e, "approvals/i1"), "b"), "x"), (e) => w(e, "approvals/i1/_sequence.json")]; // a file where the second stage needs a folder, a folder in place of the sequence: nothing may be written
  for (const [n, set] of links.entries()) {
    const e = fixture(audit(start("a", 1), ok("a", 2), start("b", 3), ok("b", 4))), away = mkdtempSync(join(tmpdir(), "ar-away-"));
    try { set(e, away); const before = regular(e), r = cli(e); assert.deepEqual([r.code, r.out.verdict, readdirSync(away), regular(e)], [1, "FAIL", [], before], `link ${n}`); } finally { gone(e, away); }
  }
});
