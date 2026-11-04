// record-compare (I1c): the audit seat's script. It compares the approvals/<intent>/ directory of a PR with the same directory made again from the workspace by the same maker (design
// docs/design/u1-engine-judge.md v13 §7.3 rules 1 to 6) and prints sds-record-compare/1. No clock, no random source (S4); a finding is a fixed code, never a body or a file's content.
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url), SCHEMA = "sds-record-compare/1", key = (r) => `${r.stage}\t${r.unit ?? ""}`, UTF8 = new TextDecoder("utf-8", { fatal: true });

// Rules 2 to 4 for one row both sides have: an exemption must match both ways; a PR's approval must be made again with the same reference; a PR's start must be seen again (or be approved).
function rowFindings(p, r, add) {
  if ((p.status === "exempt") !== (r.status === "exempt")) add("EXEMPT_MISMATCH", p);
  if (p.status === "approved" && r.status !== "approved") add("APPROVAL_NOT_REPRODUCED", p);
  else if (p.status === "approved" && p.approvalRef !== r.approvalRef) add("APPROVAL_REF_MISMATCH", p);
  if (p.started === true && r.started !== true && r.status !== "approved") add("START_NOT_REPRODUCED", p);
}

// pr and regen are { rows, attempts }: the _sequence.json rows, and the attempt-<n>.json texts by path. What is left after rules 1 to 5 (rows the workspace moved on since the PR) passes (rule 6).
export function compareRecords(pr, regen) {
  const findings = [], add = (code, r) => findings.push({ code, stage: r.stage, unit: r.unit === "_intent" ? null : r.unit ?? null }); // "_intent" is the place of a stage with no Unit
  const mine = new Map(pr.rows.map((r) => [key(r), r])), again = new Map(regen.rows.map((r) => [key(r), r]));
  pr.rows.forEach((r, i) => { if (r.order !== i + 1) add("ORDER_NOT_SEQUENTIAL", r); });
  for (const r of regen.rows) if (!mine.has(key(r))) add("ROW_MISSING", r);
  for (const r of pr.rows) if (!again.has(key(r))) add("ROW_EXTRA", r);
  const here = pr.rows.filter((r) => again.has(key(r))), there = regen.rows.filter((r) => mine.has(key(r)));
  here.forEach((r, i) => { if (key(r) !== key(there[i])) add("ROW_ORDER_MISMATCH", r); });
  for (const p of here) rowFindings(p, again.get(key(p)), add);
  for (const [path, body] of pr.attempts) { // rule 5: an attempt file the PR added must be in the records made again with the same bytes
    const [stage, unit] = path.split("/").slice(-3);
    if (!regen.attempts.get(path)?.equals(body)) add("ATTEMPT_BYTES_MISMATCH", { stage, unit });
  }
  return { schema: SCHEMA, result: findings.length ? "FAIL" : "PASS", findings };
}

// The attempt files under a directory, as raw bytes. Anything that is not a plain file or directory (a symlink, say) makes it unreadable (it throws).
function readAttempts(dir) {
  const attempts = new Map();
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    const path = join(entry.parentPath, entry.name);
    if (!entry.isDirectory() && !entry.isFile()) throw new Error("not a plain file");
    if (entry.isFile() && /^attempt-\d+\.json$/.test(entry.name)) attempts.set(relative(dir, path), readFileSync(path));
  }
  return attempts;
}

// A directory as compareRecords reads it. A sequence that is not UTF-8 or JSON, a row without a stage, a unit that is not a string, or two rows for one (stage, unit) make it unreadable (null).
const sound = (rows) => Array.isArray(rows) && rows.every((r) => typeof r?.stage === "string" && (r.unit ?? "") === (typeof r.unit === "string" ? r.unit : "")) && new Set(rows.map(key)).size === rows.length;

export function loadDir(dir) {
  try {
    const rows = JSON.parse(UTF8.decode(readFileSync(join(dir, "_sequence.json")))).rows;
    return sound(rows) ? { rows, attempts: readAttempts(dir) } : null;
  } catch { return null; }
}

// --base: the PR's base commit's directory. No directory there = a first record (nothing kept); no argument, or one that cannot be read, is unreadable (null).
export function loadBase(dir) {
  try { return dir === undefined ? null : existsSync(dir) ? readAttempts(dir) : new Map(); } catch { return null; }
}

// --pr <dir> --base <dir> --regen <dir>: one line of sds-record-compare/1, exit 0 (PASS), 1 (FAIL; unreadable is a FAIL) or 2 (arguments). Only attempts the PR added over the base are compared; kept history is R6.2's.
export function main(argv) {
  const arg = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined), prDir = arg("--pr"), regenDir = arg("--regen");
  if (!prDir || !regenDir) return { code: 2, line: JSON.stringify({ schema: SCHEMA, result: "USAGE", findings: [] }) };
  const pr = loadDir(prDir), regen = loadDir(regenDir), base = loadBase(arg("--base"));
  const unreadable = { schema: SCHEMA, result: "FAIL", findings: [{ code: "INPUT_UNREADABLE", stage: null, unit: null }] };
  const out = pr && regen && base ? compareRecords({ ...pr, attempts: new Map([...pr.attempts].filter(([path]) => !base.has(path))) }, regen) : unreadable; // loadDir's checks leave nothing for compareRecords to throw on
  return { code: out.result === "PASS" ? 0 : 1, line: JSON.stringify(out) };
}

if (process.argv[1] && realpathSync(process.argv[1]) === SELF) {
  const result = main(process.argv.slice(2));
  process.stdout.write(`${result.line}\n`);
  process.exitCode = result.code;
}
