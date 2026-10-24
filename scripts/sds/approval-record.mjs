// ApprovalRecordWriter (U1 I1; iyasaka-arc#49 6377584568, 6375005810; rules BR5.1-BR5.8 and contracts C2/C9 of the U1 design records).
// Builds the approval records (sds-approval-record/1) and the stage sequence (sds-stage-sequence/1) from one intent's AI-DLC audit shards.
// It only writes files in the working tree: no network, no git, no clock. The same audit gives the same bytes (NFR2.1, NFR10.4).
// Usage: node approval-record.mjs --intent <name> [--root <checkout>] [--out <dir>] [--audit <dir under root>] [--require stage[:unit],...]
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, report } from "../hygiene/lib.mjs";

const UNIT_DESIGN = new Set(["functional-design", "nfr-requirements", "nfr-design", "infrastructure-design"]);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const key = (stage, unit) => `${stage}\u0000${unit ?? ""}`;
const stamp = (value) => `${JSON.stringify(value, null, 2)}\n`;
const withUnit = (row) => (row.unit ? { unit: row.unit } : {});
function need(ok, why) { if (!ok) throw new Error(why); }
// Fail closed (S8): an event or a name that cannot make a valid C2/C9 record is refused before anything is written (first audit BF-01, BF-04).
const NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/, ISO_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/;
const name = (what, v) => need(typeof v === "string" && NAME.test(v), `${what} is not a plain name: ${JSON.stringify(v)}`);
const daysIn = (y, m) => (m === 2 ? (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31);
function validTime(ts) { // a real UTC calendar time (C2); Date.parse would roll 2026-02-30 over to March
  const m = ISO_UTC.exec(ts ?? ""); if (!m) return false;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysIn(y, mo) && h <= 23 && mi <= 59 && s <= 59;
}
const timeKey = (ts) => `${ts.slice(0, 19)}.${(ISO_UTC.exec(ts)[7] ?? "").padEnd(9, "0")}`; // fixed width: a string compare is a compare of instants
function checkRecord({ path, record }) { // no field of a C2 record is missing (it would vanish from the JSON); the attempt counts from 1; the time is real
  const hole = Object.entries(record).find(([, v]) => v === undefined || v === "");
  need(!hole && Number.isInteger(record.attempt) && record.attempt >= 1 && validTime(record.approved_at), `approval record ${path} is incomplete or wrong${hole ? ` (${hole[0]})` : ""}`);
}
const inside = (base, p) => { const r = relative(resolve(base), resolve(p)); return r !== "" && r !== ".." && !r.startsWith(`..${sep}`) && !isAbsolute(r); };

export function parseAudit(text, ref) {
  return text.split("\n---\n").map((b) => b.trim().replace(/^# .*\n+/, "")).filter((b) => b.includes("**Event**:")).map((raw) => { // the file's title line is not part of an event
    const f = Object.fromEntries([...raw.matchAll(/^\*\*([^*\n]+)\*\*: (.*)$/gm)].map((m) => [m[1], m[2].trim()]));
    return { event: f.Event, ts: f.Timestamp, f, raw, ref };
  });
}

// A row is one attempt of one stage (and unit). Stages run once per STAGE_STARTED (units: UNIT_STARTED); a skipped stage has no row.
const addRow = (c, stage, unit) => {
  name("stage", stage); if (unit) name("unit", unit);
  const k = key(stage, unit), row = { stage, unit, attempt: (c.count.get(k) ?? 0) + 1, src: [], approved: false, superseded: false };
  c.count.set(k, row.attempt); c.open.set(k, row); c.rows.push(row);
  return row;
};
const approve = (row, ...events) => { row.src.push(...events); row.approved = true; };
const supersede = (c, stage, unit) => { // a reopened stage invalidates the rows downstream of it (all units, or only the reopened unit)
  const from = c.rank.get(stage);
  if (from !== undefined) for (const row of c.rows) if (c.rank.get(row.stage) > from && (!unit || row.unit === unit)) row.superseded = true;
};

const HANDLERS = {
  STAGE_STARTED: (c, e) => { if (!c.unitStages.has(e.f.Stage)) addRow(c, e.f.Stage, null); },
  STAGE_SKIPPED: (c, e) => {
    const k = key(e.f.Stage, null), row = c.open.get(k);
    if (!row || c.rows.at(-1) !== row || row.approved) return;
    c.rows.pop(); c.count.set(k, row.attempt - 1);
    const earlier = c.rows.findLast((r) => key(r.stage, r.unit) === k);
    if (earlier) c.open.set(k, earlier); else c.open.delete(k);
  },
  UNIT_STARTED: (c, e) => {
    name("unit", e.f.Unit);
    const row = addRow(c, e.f.Stage, e.f.Unit), k = key(e.f.Stage, e.f.Unit);
    if (UNIT_DESIGN.has(e.f.Stage)) row.confirm = c.confirm.get(k);
    c.confirm.delete(k);
  },
  SUMMARY_CONFIRMATION_RECORDED: (c, e) => {
    if (!e.f.Unit) return;
    const k = key(e.f.Stage, e.f.Unit), row = c.open.get(k), live = row && !row.completed && !row.superseded && UNIT_DESIGN.has(e.f.Stage); // the newest attempt, still running (one given up by a jump back is not)
    if (/^looks correct$/i.test(e.f.Details ?? "")) { if (live) row.confirm = e; else c.confirm.set(k, e); return; } // the latest answer of the running attempt, or the next one's
    c.confirm.delete(k);
    if (live) delete row.confirm; // the confirmation this attempt already used is taken back too
  },
  UNIT_COMPLETED: (c, e) => { // a unit design stage has no approval of its own: confirmation and completion, both on this attempt (Q11)
    const row = c.open.get(key(e.f.Stage, e.f.Unit));
    if (!row || row.completed) return;
    row.completed = true;
    if (row.confirm && UNIT_DESIGN.has(e.f.Stage)) approve(row, row.confirm, e);
  },
  GATE_APPROVED: (c, e) => {
    const unit = e.f.Unit, stages = unit ? (e.f["Gate Stages"] ?? e.f.Stage).split(/,\s*/) : [e.f.Stage];
    for (const stage of stages) {
      const row = c.open.get(key(stage, unit));
      if (row && !row.approved && !(unit && UNIT_DESIGN.has(stage))) approve(row, e);
    }
  },
  STAGE_JUMPED: (c, e) => { if (e.f.Direction === "BACKWARD") supersede(c, e.f.Target, e.f.Unit); },
  GATE_REJECTED: (c, e) => { if (e.f.Reopen === "jump") supersede(c, e.f.Stage, e.f.Unit); },
};

function approvalOf(intent, row) {
  const src = [...new Set(row.src)].sort((a, b) => a.i - b.i), last = src.at(-1);
  const record = { schema: "sds-approval-record/1", intent, stage: row.stage, ...withUnit(row), attempt: row.attempt, approved_at: src.map((e) => e.ts).reduce((a, b) => (timeKey(b) > timeKey(a) ? b : a)),
    approver_role: "owner", identity_check: "none", source_event_digest: sha(src.map((e) => e.raw).join("\n---\n")), source_audit_ref: last.ref };
  return { path: `approvals/${intent}/${row.stage}/${row.unit ?? "_intent"}/attempt-${row.attempt}.json`, record };
}

export function plan({ intent, shards }) {
  need(intent && shards?.length, "an intent and its audit shards are required");
  name("intent", intent);
  need(!shards.some((s) => s.text.includes("\r")), "the audit has CR line ends; refusing to guess where its events begin"); // fail closed
  const events = shards.flatMap((s) => parseAudit(s.text, s.ref));
  need(events.length > 0, "no AI-DLC events were found in the audit");
  events.forEach((e, i) => { e.i = i; });
  for (const e of events) if (Object.hasOwn(HANDLERS, e.event)) need(validTime(e.ts), `${e.event} has no valid Timestamp (${e.ref})`);
  const c = { rows: [], count: new Map(), open: new Map(), confirm: new Map(), rank: new Map(),
    unitStages: new Set(events.filter((e) => e.f.Unit && ["UNIT_STARTED", "UNIT_COMPLETED", "SUMMARY_CONFIRMATION_RECORDED"].includes(e.event)).map((e) => e.f.Stage)) };
  for (const e of events) if (["STAGE_STARTED", "UNIT_STARTED"].includes(e.event) && !c.rank.has(e.f.Stage)) c.rank.set(e.f.Stage, c.rank.size);
  for (const e of events) if (Object.hasOwn(HANDLERS, e.event)) HANDLERS[e.event](c, e);
  const approvals = c.rows.filter((r) => r.approved).map((r) => approvalOf(intent, r));
  approvals.forEach(checkRecord);
  const entries = c.rows.map((row, i) => ({ order: i + 1, stage: row.stage, ...withUnit(row), attempt: row.attempt, approved: row.approved,
    ...(row.approved ? { approval_ref: approvalOf(intent, row).path } : {}), ...(row.superseded ? { superseded: true } : {}) }));
  return { sequence: { schema: "sds-stage-sequence/1", intent, source_digest: sha(Buffer.concat(shards.map((s) => Buffer.from(s.text)))), entries }, approvals };
}

function readShards(root, intent, dir) {
  const base = join(root, dir ?? `aidlc/spaces/default/intents/${intent}/audit`);
  need(existsSync(base), `audit directory not found: ${relative(root, base)}`);
  return readdirSync(base).filter((n) => n.endsWith(".md")).sort()
    .map((n) => ({ ref: relative(root, join(base, n)).split("\\").join("/"), text: readFileSync(join(base, n), "utf8") }));
}

function checkRequired(spec, p) {
  for (const item of spec.split(",").filter(Boolean)) {
    const [stage, unit] = item.split(":");
    const newest = p.sequence.entries.filter((e) => e.stage === stage && e.unit === (unit || undefined)).at(-1); // an older approval never counts
    need(newest?.approved && !newest.superseded, `the newest attempt of ${item} is not approved, or it is superseded`);
  }
}

// On the way from <out> to a file: a symbolic link carries the write elsewhere; a file where a folder is needed (or a folder where the file goes) fails it half-way.
const blocked = (out, rel) => rel.split("/").some((_, i, p) => { const st = lstatSync(join(out, ...p.slice(0, i + 1)), { throwIfNoEntry: false }); return st && (st.isSymbolicLink() || (i < p.length - 1 ? !st.isDirectory() : !st.isFile())); });

export function writeAll(out, approvals, sequence) { // an approval file that exists with other bytes is never overwritten; nothing is written then (BR5.8)
  const files = [...approvals.map((a) => ({ path: a.path, text: stamp(a.record), keep: true })), { path: sequence.path, text: stamp(sequence.value) }];
  const outside = files.filter((f) => !inside(join(out, "approvals"), join(out, f.path))).map((f) => f.path);
  need(outside.length === 0, `a path leaves the output folder: ${outside.join(", ")}`);
  const stuck = files.filter((f) => blocked(out, f.path)).map((f) => f.path);
  need(stuck.length === 0, `a symbolic link, a file where a folder is needed, or a folder where the file goes is on the way to: ${stuck.join(", ")}`);
  const differs = (f) => existsSync(join(out, f.path)) && readFileSync(join(out, f.path), "utf8") !== f.text;
  const clash = files.filter((f) => f.keep && differs(f)).map((f) => f.path);
  need(clash.length === 0, `an approval record already exists with other bytes: ${clash.join(", ")}`);
  const done = { written: [], unchanged: [] };
  for (const f of files) {
    if (existsSync(join(out, f.path)) && !differs(f)) { done.unchanged.push(f.path); continue; }
    mkdirSync(dirname(join(out, f.path)), { recursive: true });
    writeFileSync(join(out, f.path), f.text);
    done.written.push(f.path);
  }
  return done;
}

export function cli(args) {
  try {
    need(typeof args.intent === "string", "--intent is required");
    need(args.require === undefined || (typeof args.require === "string" && args.require !== ""), "--require needs a stage name (stage or stage:unit)");
    const root = args.root ?? process.cwd(), p = plan({ intent: args.intent, shards: readShards(root, args.intent, args.audit) });
    if (typeof args.require === "string") checkRequired(args.require, p);
    const done = writeAll(args.out ?? root, p.approvals, { path: `approvals/${args.intent}/_sequence.json`, value: p.sequence });
    return report("approval-record", "PASS", { intent: args.intent, rows: p.sequence.entries.length, approved: p.approvals.length, ...done });
  } catch (error) { return report("approval-record", "FAIL", { reason: error.message }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(cli(parseArgs(process.argv.slice(2))));
