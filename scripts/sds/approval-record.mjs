// approval-record (I1c): from the sds-engine-judgment/1 that engine-judge's prepare returns, the approval records (C2) and the stage sequence (C9, sds-stage-sequence/2), placed together under
// <out>/approvals/<intent>/ (design docs/design/u1-engine-judge.md v13 §3-3, §3-4, §3-6, §3-7; work order iyasaka-arc#24 6602931564). Nothing here decides whether a stage is approved: the engine's answer is copied (S2).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JudgeError, prepare } from "./engine-judge.mjs";

const fail = (code) => { throw new JudgeError(code); };
const sha = (body) => createHash("sha256").update(body).digest("hex");
const safe = (name) => typeof name === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name);
const text = (x) => typeof x === "string" && x.length > 0;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const STATUS = new Set(["approved", "exempt", "not_approved"]), KINDS = new Set(["initialization", "per-unit", "stage-gate"]), SELF = fileURLToPath(import.meta.url);

// 3-3: keys in dictionary order, no spaces.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}

// What an approved row was made from (3-3): the attempt number, the time and the text the digest covers. Anything missing or malformed is EVIDENCE_MISSING, never a guess.
function evidenceOf(row) {
  const e = row.evidence, gate = row.kind === "stage-gate";
  if (!e || typeof e !== "object") fail("EVIDENCE_MISSING");
  const unitText = text(e.completedBlock) && e.summary !== null && typeof e.summary === "object" ? `${e.completedBlock}\n${canonical(e.summary)}` : null;
  const got = gate ? { n: e.gateOrdinal, at: e.gateAt, source: e.gateBlock } : { n: e.runFloorOrdinal, at: e.completedAt, source: unitText };
  if (!Number.isInteger(got.n) || got.n < 1 || ![got.at, got.source, e.sourceAuditRef].every(text)) fail("EVIDENCE_MISSING");
  return { ...got, ref: e.sourceAuditRef };
}

// C2 for one approved row, at approvals/<intent>/<stage>/<unit or _intent>/attempt-<n>.json.
function record(intent, row) {
  const got = evidenceOf(row);
  return [`approvals/${intent}/${row.stage}/${row.unit ?? "_intent"}/attempt-${got.n}.json`, { schema: "sds-approval-record/1", intent, stage: row.stage, ...(row.unit ? { unit: row.unit } : {}),
    attempt: got.n, approvedAt: got.at, approverRole: "owner", identityCheck: "none", sourceEventDigest: sha(got.source), sourceAuditRef: got.ref }];
}

// C9 (3-4): the rows in stage graph order, and unit-major inside a run of Unit stages (the rows of one Unit follow each other). status and started are the engine's.
function sequence(intent, judgment, refs) {
  const rows = [], run = [];
  const flush = () => { for (const unit of new Set(run.map((r) => r.unit))) rows.push(...run.filter((r) => r.unit === unit)); run.length = 0; };
  for (const row of judgment.rows) { if (row.kind === "per-unit") run.push(row); else { flush(); rows.push(row); } }
  flush();
  const { sourceDigest, inputDigest, engineTreeDigest, engineVersion } = judgment;
  return { schema: "sds-stage-sequence/2", intent, sourceDigest, inputDigest, engineTreeDigest, engineVersion, rows: rows.map((r, i) => ({ order: i + 1, stage: r.stage,
    ...(r.kind === "per-unit" ? { unit: r.unit } : {}), status: r.status, started: r.started, ...(refs.has(r) ? { approvalRef: refs.get(r) } : {}) })) };
}

const DIGESTS = ["sourceDigest", "inputDigest", "engineTreeDigest"];
// The row contract of sds-engine-judgment/1: a Unit stage names its Unit and the others none, an initialization stage has no start and is never approved, and only an approved row carries evidence.
const started = (r) => (r.kind === "initialization" ? r.started === null && r.status !== "approved" : typeof r.started === "boolean");
const sound = (r) => STATUS.has(r?.status) && KINDS.has(r.kind) && safe(r.stage) && (r.kind === "per-unit" ? safe(r.unit) : r.unit === null) && started(r) && (r.status === "approved" || !r.evidence);

// path -> file text for the whole intent. A judgment that is not the closed shape, or a name that could leave approvals/<intent>/, is UNSUPPORTED_SHAPE.
export function buildRecords(intent, judgment) {
  const rows = judgment?.rows;
  if (!safe(intent) || !Array.isArray(rows) || !DIGESTS.every((k) => /^[0-9a-f]{64}$/.test(judgment[k])) || !text(judgment.engineVersion) || !rows.every(sound)) return fail("UNSUPPORTED_SHAPE");
  const made = new Map(), refs = new Map();
  for (const row of rows.filter((r) => r.status === "approved")) {
    const [path, body] = record(intent, row);
    if (made.has(path)) fail("UNSUPPORTED_SHAPE");
    made.set(path, json(body));
    refs.set(row, path);
  }
  made.set(`approvals/${intent}/_sequence.json`, json(sequence(intent, judgment, refs)));
  return made;
}

// 3-7: every check first, then the writes. An attempt file that is there with other bytes places nothing (FILE_CONFLICT); the same bytes are left alone; _sequence.json is made again every time, so it is replaced.
// A write that fails removes what this call made and puts back what it replaced (COPY_FAILED). Returns the paths written.
export function place(made, out, write = writeFileSync) {
  const plan = [...made].map(([path, body]) => ({ path, body: Buffer.from(body), abs: join(out, path), had: existsSync(join(out, path)) ? readFileSync(join(out, path)) : null }));
  if (plan.some((p) => p.had && !p.had.equals(p.body) && !p.path.endsWith("/_sequence.json"))) fail("FILE_CONFLICT");
  const todo = plan.filter((p) => !p.had?.equals(p.body)), done = [];
  try {
    for (const p of todo) { done.push(p); mkdirSync(dirname(p.abs), { recursive: true }); write(p.abs, p.body); }
  } catch {
    for (const p of done) { if (p.had === null) rmSync(p.abs, { force: true }); else writeFileSync(p.abs, p.had); }
    fail("COPY_FAILED");
  }
  return todo.map((p) => p.path);
}

const line = (fields) => JSON.stringify({ check: "approval-record", ...fields });

// The maker's entry: --workspace <workspace> --space <space> --intent <intent> --out <root to write under>. prepare reads the workspace and writes nothing there. One line out; exit 0, 1 (a fixed reason) or 2 (arguments).
export function main(argv, deps = {}) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) if (/^--(workspace|space|intent|out)$/.test(argv[i]) && argv[i + 1] !== undefined) args[argv[i].slice(2)] = argv[i + 1];
  if (!["workspace", "space", "intent", "out"].every((k) => args[k])) return { code: 2, line: line({ verdict: "USAGE", reason: "ARGUMENTS" }) };
  try {
    const judgment = (deps.prepare ?? prepare)({ workspace: args.workspace, target: { space: args.space, intent: args.intent } });
    return { code: 0, line: line({ verdict: "PASS", intent: args.intent, files: place(buildRecords(args.intent, judgment), args.out) }) };
  } catch (error) { return { code: 1, line: line({ verdict: "FAIL", reason: error instanceof JudgeError ? error.code : "ENGINE_CALL_FAILED" }) }; }
}

if (process.argv[1] && realpathSync(process.argv[1]) === SELF) {
  const result = main(process.argv.slice(2));
  process.stdout.write(`${result.line}\n`);
  process.exitCode = result.code;
}
