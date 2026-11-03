// engine-judge, the input half (I1a). Design: docs/design/u1-engine-judge.md v13 §3-5 and §3-7 (Owner decision iyasaka-arc#49 6588894545; work order iyasaka-arc#24 6598649490, amendment 6599529855).
// The engine reads one thing: a whole copy of the workspace's .claude/ and aidlc/. This module makes that copy (a symbolic link stops it), fingerprints it, checks the clone id,
// copies once more if a conversation appended to the workspace meanwhile, and asks a child process for the engine's version and the (space, intent) the engine selects.
// The child gets PATH, an empty HOME and the project dir, and chooses no session: the engine falls back to its cursor (iyasaka-arc#24 6598779080). The judgment itself is I1b.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
export async function childMain(root, importModule = (path) => import(path)) {
  const load = (file) => importModule(join(root, ".claude/tools", file)).catch(() => fail("ENGINE_LOAD_FAILED"));
  const { AIDLC_VERSION: engineVersion } = await load("aidlc-version.ts"), orchestrate = await load("aidlc-orchestrate.ts");
  try {
    const { space, intent } = orchestrate.engineSelection(root);
    return { engineVersion, selection: { space, intent } };
  } catch { return fail("ENGINE_CALL_FAILED"); }
}

// Default child: bun runs this file in child mode inside the copy (bun reads no .env file); anything but a clean exit is an empty answer.
export function spawnChild(root, home) {
  const run = spawnSync("bun", ["--no-env-file", "run", SELF, "child", root], { cwd: root, env: childEnv(process.env, root, home), encoding: "utf8" });
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

const askChild = (runChild, root, home) => { try { return runChild(root, home); } catch { return fail("ENGINE_CALL_FAILED"); } };

// What the judgment needs from the input side, inside the temp place: a stable whole copy, its fingerprints (taken before the shim), the engine's version and its selection as the child reports them.
function judge({ workspace, target, runChild, root, home }) {
  mkdirSync(home);
  stableCopy(workspace, root);
  cloneIdentity(readText(join(root, "aidlc/.aidlc-clone-id")));
  const inputDigest = treeDigest(root), engineTreeDigest = treeDigest(root, [".claude"]);
  addShim(root);
  const report = parseReport(askChild(runChild, root, home));
  if (report.engineVersion !== ENGINE_VERSION) fail("ENGINE_VERSION_MISMATCH");
  if (report.selection?.space !== target.space || report.selection?.intent !== target.intent) fail("SELECTION_MISMATCH");
  return { inputDigest, engineTreeDigest, engineVersion: report.engineVersion };
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
  childMain(process.argv[3]).catch((error) => ({ reason: error?.code ?? "ENGINE_CALL_FAILED" })).then((report) => process.stdout.write(`${JSON.stringify(report)}\n`));
}
