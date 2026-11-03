// engine-judge: the input half (I1a) and the judgment (I1b). Design: docs/design/u1-engine-judge.md v13 §3-1 to §3-7 (Owner decision iyasaka-arc#49 6588894545; work orders iyasaka-arc#24 6598649490, 6599529855, 6600325342).
// The engine reads one thing: a whole copy of the workspace's .claude/ and aidlc/. This module makes that copy (a symbolic link stops it), fingerprints it, checks the clone id,
// copies once more if a conversation appended to the workspace meanwhile, and asks a child process for the engine's version, the (space, intent) the engine selects and its judgment of every stage.
// The child gets PATH, an empty HOME and the project dir, and chooses no session: the engine falls back to its cursor (iyasaka-arc#24 6598779080). Every "approved" in the judgment is the engine's own answer.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const REASONS = ["ENGINE_VERSION_MISMATCH", "CLONE_ID_INCOMPLETE", "COPY_FAILED", "ENGINE_LOAD_FAILED", "ENGINE_CALL_FAILED", "UNSUPPORTED_SHAPE", "SELECTION_MISMATCH", "WORKSPACE_CHANGED", "EVIDENCE_MISSING", "FILE_CONFLICT"];
// A failure is a code and nothing else: no sentence, no absolute path, no secret (3-7). Details belong in a log outside the repository.
export class JudgeError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = (code) => { throw new JudgeError(code); };
const ENGINE_VERSION = "2.11.1", DIRS = [".claude", "aidlc"], SELF = fileURLToPath(import.meta.url);
const SHIM = "\nexport { unitStageStop, unitExempt, unitLedgerFor, engineRelativeRecordDir, codekbCtxFor, engineSelection };\n"; // the one line added to the copy (3-6)
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readText = (file) => { try { return readFileSync(file, "utf8"); } catch { return ""; } };

// Regular files under the given top-level directories, as relative paths in the byte order of their UTF-8 form. A symbolic link, a missing directory or
// anything else that is not a plain file or directory is COPY_FAILED: the engine must never read outside the copy.
export function listFiles(root, dirs = DIRS) {
  const out = [];
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const path = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) out.push(path);
      else fail("COPY_FAILED");
    }
  };
  try {
    for (const dir of dirs) { if (!lstatSync(join(root, dir)).isDirectory()) fail("COPY_FAILED"); walk(dir); }
  } catch (error) { if (error instanceof JudgeError) throw error; fail("COPY_FAILED"); }
  return out.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

// SHA-256 over one line per file in listFiles order: the path as a JSON string, a tab, the file's SHA-256, a newline. The JSON string ends at its own closing quote, so a tab or a
// newline inside a file name cannot pass for a separator and two different sets of files cannot read the same. inputDigest covers .claude/ and aidlc/, engineTreeDigest .claude/ alone (3-5).
export const treeDigest = (root, dirs = DIRS) => sha(listFiles(root, dirs).map((p) => `${JSON.stringify(p)}\t${sha(readFileSync(join(root, p)))}\n`).join(""));

// The whole copy, file choice left out on purpose (nothing the engine can see is missed). A symbolic link is found before anything is copied.
export function copyHarness(workspace, dest) {
  listFiles(workspace);
  try { for (const dir of DIRS) cpSync(join(workspace, dir), join(dest, dir), { recursive: true }); } catch { fail("COPY_FAILED"); }
}

// Token and host as the engine reads aidlc/.aidlc-clone-id (line 1 and line 2). Missing either one is CLONE_ID_INCOMPLETE: the engine must not fall back to the machine's name.
export function cloneIdentity(text) {
  const [token = "", host = ""] = text.split(/\r?\n/).map((line) => line.trim());
  return /^[a-z0-9]{1,32}$/.test(token) && /^[a-z0-9][a-z0-9-]{0,47}$/.test(host) ? { token, host } : fail("CLONE_ID_INCOMPLETE");
}

// The files a running conversation appends to: audit shards, aidlc-state.md and the clone id. Transcripts and the like are not compared (3-5).
const WATCHED = /^aidlc\/(\.aidlc-clone-id|spaces\/.*\/(audit\/[^/]+\.md|aidlc-state\.md))$/;
// What the watched files hold on one side, as path and hash lines; null when one of them vanishes while it is read. Both sides are listed, so a file that is gone or has another name is a change too.
const watched = (root) => {
  try { return listFiles(root, ["aidlc"]).filter((p) => WATCHED.test(p)).map((p) => `${JSON.stringify(p)}\t${sha(readFileSync(join(root, p)))}`).join("\n"); } catch (error) { if (error instanceof JudgeError) throw error; return null; }
};
const moved = (workspace, copy) => { const now = watched(workspace); return now === null || now !== watched(copy); };

// Copy, read the watched files again, and copy once more if any moved; a second move is WORKSPACE_CHANGED (3-5).
export function stableCopy(workspace, dest, copy = copyHarness) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    copy(workspace, dest);
    if (!moved(workspace, dest)) return;
  }
  fail("WORKSPACE_CHANGED");
}

// The child sees PATH, an empty HOME and the project dir: no machine config, no AIDLC_/CLAUDE_/KIRO_/CODEX_ variable and no variable that chooses a session.
export const childEnv = (parentEnv, root, home) => ({ PATH: parentEnv.PATH ?? "", HOME: home, CLAUDE_PROJECT_DIR: root });

// The child's side, run by bun inside the copy: the engine's own version and the selection the engine makes. Load and call failures are two fixed codes.
const loader = (root, importModule) => (file) => importModule(join(root, ".claude/tools", file)).catch(() => fail("ENGINE_LOAD_FAILED"));
export async function childMain(root, importModule = (path) => import(path)) {
  const load = loader(root, importModule);
  const { AIDLC_VERSION: engineVersion } = await load("aidlc-version.ts"), orchestrate = await load("aidlc-orchestrate.ts");
  try {
    const { space, intent } = orchestrate.engineSelection(root);
    return { engineVersion, selection: { space, intent } };
  } catch { return fail("ENGINE_CALL_FAILED"); }
}

// The judgment (3-1 to 3-4, 3-6). A row per (stage, Unit) of the stages the intent chose, in stage graph order: initialization stages have no human approval; a Unit stage is the
// engine's own unitStageStop / unitExempt answer for each Unit; any other stage is approved by its GATE_APPROVED. started says the stage was begun in the current attempt (3-4).
const STARTED = new Set(["completed", "in-progress", "awaiting-approval", "revising"]);
const row = (entry, unit, kind, status, started, evidence) => ({ stage: entry.slug, unit, kind, status, started, evidence });
// The audit in time order; equal times keep the order the engine listed them (shard, then position).
const byTime = ([a, i], [b, j]) => (a.timestamp > b.timestamp) - (a.timestamp < b.timestamp) || i - j;

// 3-3: a block runs from its "## " heading line to its last non-blank line, LF and UTF-8.
function blockBytes(block) {
  const lines = block.replace(/\r\n/g, "\n").split("\n"), from = lines.findIndex((line) => line.startsWith("## "));
  if (from < 0) fail("EVIDENCE_MISSING");
  while (lines.at(-1).trim() === "") lines.pop();
  return lines.slice(from).join("\n");
}

// What the judgment covers is solo, unit-major, not swarm, Units kept per Unit, with a Unit DAG; anything else cannot be confirmed (3-1).
function readContext(root, lib, orch) {
  const record = orch.engineRelativeRecordDir(root), dag = lib.resolveBoltDag(root);
  if (!record || dag.state !== "ok") return fail("UNSUPPORTED_SHAPE");
  const state = readFileSync(join(root, record, "aidlc-state.md"), "utf8"), scope = lib.getField(state, "Scope")?.trim() ?? "";
  const solo = !lib.isTeamUnitOwnership(state) && !lib.isConstructionSwarmEnabled(state) && !lib.usesStageLevelPerUnitArtifacts(scope, state);
  if (!solo || lib.getField(state, "Construction Iteration")?.trim() !== "unit-major") fail("UNSUPPORTED_SHAPE");
  const events = lib.readAuditShardEvents(root).map((event, i) => [event, i]).sort(byTime).map(([event]) => event);
  return { root, lib, orch, record, state, scope, dag, events, codekb: orch.codekbCtxFor(root), marks: new Map(lib.parseCheckboxes(state).map((c) => [c.slug, c.state])) };
}

// 3-2 and 3-3: the newest UNIT_COMPLETED of the stage and Unit, its Run floor numbered in order of first appearance, and the engine's own summary confirmation.
function unitEvidence(ctx, entry, unit) {
  const field = (event, name) => ctx.lib.auditBlockField(event.block, name);
  const done = ctx.events.filter((e) => e.event === "UNIT_COMPLETED" && field(e, "Stage") === entry.slug && field(e, "Unit") === unit), newest = done.at(-1);
  const floor = newest && field(newest, "Run floor");
  if (!floor) return fail("EVIDENCE_MISSING");
  return {
    completedBlock: blockBytes(newest.block), completedAt: newest.timestamp, runFloorOrdinal: [...new Set(done.map((e) => field(e, "Run floor")))].indexOf(floor) + 1,
    summary: ctx.lib.checkSummaryConfirmationEvidence(ctx.root, entry, { stateContent: ctx.state, unit }), sourceAuditRef: relative(ctx.root, newest.shard),
  };
}

function unitStatus(stop, exempt) {
  if (stop !== null) return "not_approved";
  return exempt ? "exempt" : "approved";
}

// A stage marked [S] is not walked by the engine, so all its Units are exempt; a stage the engine's walk does not list cannot be confirmed (3-1).
function unitRows(ctx, entry, mark) {
  const { orch, root, dag } = ctx;
  if (mark === "skipped") return dag.units.map((unit) => row(entry, unit, "per-unit", "exempt", false, null));
  if (!ctx.lib.unitMajorConstructionStageSlugs(ctx.scope, ctx.state, true).includes(entry.slug)) fail("UNSUPPORTED_SHAPE");
  const ledger = orch.unitLedgerFor(root, entry.slug);
  return dag.units.map((unit) => {
    const kind = dag.unitKinds?.get(unit) ?? null, stop = orch.unitStageStop(root, ctx.state, entry, unit, kind, ctx.record, ctx.codekb, ledger);
    const status = unitStatus(stop, stop === null && orch.unitExempt(entry, unit, kind, ledger));
    return row(entry, unit, "per-unit", status, status === "approved" || ledger.open.some((cp) => cp.unit === unit), status === "approved" ? unitEvidence(ctx, entry, unit) : null);
  });
}

// A stage with one human approval: [x] needs its GATE_APPROVED (the newest one is the evidence, counted in audit order), [S] is exempt, anything else is not approved.
function gateRow(ctx, entry, mark) {
  if (mark === "skipped") return row(entry, null, "stage-gate", "exempt", false, null);
  if (mark !== "completed") return row(entry, null, "stage-gate", "not_approved", STARTED.has(mark), null);
  const gates = ctx.events.filter((e) => e.event === "GATE_APPROVED" && ctx.lib.auditBlockField(e.block, "Stage") === entry.slug), newest = gates.at(-1);
  if (!newest) return fail("EVIDENCE_MISSING");
  return row(entry, null, "stage-gate", "approved", true, { gateBlock: blockBytes(newest.block), gateAt: newest.timestamp, gateOrdinal: gates.length, sourceAuditRef: relative(ctx.root, newest.shard) });
}

function stageRows(ctx, entry) {
  const mark = ctx.marks.get(entry.slug);
  if (entry.phase === "initialization") return [row(entry, null, "initialization", mark === "completed" ? "exempt" : "not_approved", null, null)];
  return ctx.lib.isPerUnitStage(entry) ? unitRows(ctx, entry, mark) : [gateRow(ctx, entry, mark)];
}

// The child's judgment, sds-engine-judgment/1 without the parent's fingerprints: the rows and the digest of the audit shards in name order (BR5.6).
export async function childJudgment(root, importModule = (path) => import(path)) {
  const load = loader(root, importModule), lib = await load("aidlc-lib.ts"), orch = await load("aidlc-orchestrate.ts");
  try {
    const ctx = readContext(root, lib, orch);
    return { sourceDigest: sha(Buffer.concat(lib.auditShards(root).map((file) => readFileSync(file)))), rows: lib.loadStageGraph().filter((entry) => ctx.marks.has(entry.slug)).flatMap((entry) => stageRows(ctx, entry)) };
  } catch (error) { if (error instanceof JudgeError) throw error; return fail("ENGINE_CALL_FAILED"); }
}

// Version and selection first; the judgment only for the pinned engine version and for the intent the parent asked about (so a mismatch is reported as itself).
export async function childReport(root, importModule, target) {
  const head = await childMain(root, importModule), asked = !target || (head.selection.space === target.space && head.selection.intent === target.intent);
  return head.engineVersion === ENGINE_VERSION && asked ? { ...head, ...(await childJudgment(root, importModule)) } : head;
}

// Default child: bun runs this file in child mode inside the copy (bun reads no .env file); anything but a clean exit is an empty answer.
export function spawnChild(root, home, target) {
  const run = spawnSync("bun", ["--no-env-file", "run", SELF, "child", root, target.space, target.intent], { cwd: root, env: childEnv(process.env, root, home), encoding: "utf8" });
  return run.status === 0 ? run.stdout : "";
}

function parseReport(out) {
  let report;
  try { report = JSON.parse(out); } catch { return fail("ENGINE_CALL_FAILED"); }
  if (report?.reason) return fail(REASONS.includes(report.reason) ? report.reason : "ENGINE_CALL_FAILED");
  return report ?? fail("ENGINE_CALL_FAILED");
}

function addShim(root) {
  const file = join(root, ".claude/tools/aidlc-orchestrate.ts");
  try { writeFileSync(file, readFileSync(file, "utf8") + SHIM); } catch { fail("ENGINE_LOAD_FAILED"); }
}

const askChild = (runChild, root, home, target) => { try { return runChild(root, home, target); } catch { return fail("ENGINE_CALL_FAILED"); } };

// sds-engine-judgment/1: the parent's fingerprints and version with the child's rows and shard digest. The parent checks the version and the selection before it reads the judgment.
function judge({ workspace, target, runChild, root, home }) {
  mkdirSync(home);
  stableCopy(workspace, root);
  cloneIdentity(readText(join(root, "aidlc/.aidlc-clone-id")));
  const inputDigest = treeDigest(root), engineTreeDigest = treeDigest(root, [".claude"]);
  addShim(root);
  const report = parseReport(askChild(runChild, root, home, target));
  if (report.engineVersion !== ENGINE_VERSION) fail("ENGINE_VERSION_MISMATCH");
  if (report.selection?.space !== target.space || report.selection?.intent !== target.intent) fail("SELECTION_MISMATCH");
  if (typeof report.sourceDigest !== "string" || !Array.isArray(report.rows)) fail("ENGINE_CALL_FAILED");
  return { inputDigest, engineTreeDigest, engineVersion: report.engineVersion, sourceDigest: report.sourceDigest, rows: report.rows };
}

// The one public entry. Whatever goes wrong leaves as a code of the closed set (3-7) and nothing else: an error that is not one of ours means the temp place or the copy could not be used,
// which is COPY_FAILED, without its sentence or its path. The workspace is only read; the copy and the empty HOME are removed whatever happens, and a copy that cannot be removed is a failure.
export function prepare({ workspace, target, runChild = spawnChild, tmp = tmpdir(), remove = rmSync }) {
  let base;
  try { base = mkdtempSync(join(tmp, "sds-engine-")); } catch { return fail("COPY_FAILED"); }
  let result, failure;
  try { result = judge({ workspace, target, runChild, root: join(base, "harness"), home: join(base, "home") }); } catch (error) { failure = error instanceof JudgeError ? error : new JudgeError("COPY_FAILED"); }
  try { remove(base, { recursive: true, force: true }); } catch { failure ??= new JudgeError("COPY_FAILED"); }
  if (failure) throw failure;
  return result;
}

if (process.argv[1] === SELF && process.argv[2] === "child") {
  childReport(process.argv[3], undefined, { space: process.argv[4], intent: process.argv[5] }).catch((error) => ({ reason: error?.code ?? "ENGINE_CALL_FAILED" })).then((report) => process.stdout.write(`${JSON.stringify(report)}\n`));
}
