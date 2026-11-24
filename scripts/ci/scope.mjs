// CI scope (CI-COST-REDUCE 1): is this pull request documents only? Only then may a repository's own job skip its heavy tests.
// Fail closed: "docs" needs proof for EVERY changed path, and the proof is a document KIND (an allowed extension), a plain regular file on both
// sides of the diff (mode 100644: no executable, no symlink, no submodule, no type change), and an allow glob. Anything else (no path, an odd path,
// a hidden path, a kind that is not a document, a path no glob names, an unreadable diff, an event that is not a pull request) answers "code".
// The answer never skips a required check: the caller keeps its job and its name, and only decides which steps inside run.
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const DEFAULT_ALLOW = ["docs/**", "aidlc/**", "*.md"];

// A document is a text or image kind a reader opens, never something that runs, is parsed as configuration, or is data a test reads as a contract.
// Everything else (source, scripts, manifests, lockfiles, json, yaml, svg, a file with no extension) is code.
const DOCUMENT_KIND = /\.(?:md|mdx|txt|rst|adoc|png|jpe?g|gif|webp|pdf)$/i;
const REGULAR = "100644"; // git's mode for a plain non-executable file
const ABSENT = "000000"; // the side of the diff where the file does not exist (added or deleted)

export function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    if (glob.startsWith("**", i)) { source += ".*"; i++; }
    else if (glob[i] === "*") source += "[^/]*";
    else source += glob[i].replace(/[\\^$.|?+()[\]{}]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

// A path is usable only in the plain relative form git prints: no parent or current segment, no empty segment, no backslash, no control character.
const plainPath = (path) => typeof path === "string" && path !== "" && !/[\\\u0000-\u001f\u007f]/.test(path) && !path.startsWith("/") && path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
const plainGlob = (glob) => typeof glob === "string" && glob !== "" && !/[\\\u0000-\u001f\u007f]/.test(glob) && !glob.startsWith("/") && glob.split("/").every((part) => part !== ".." && part !== ".");
const hidden = (path) => path.split("/").some((part) => part.startsWith("."));
const plainMode = (mode) => mode === REGULAR || mode === ABSENT;

const code = (reason) => ({ scope: "code", reason });

// The first reason an entry { path, old, new } (the path and its git mode before and after) is not a proven document, or null when it is one.
function notDocument(entry, patterns) {
  const { path } = entry ?? {};
  if (!plainPath(path)) return `an odd path: ${JSON.stringify(path)}`;
  if (hidden(path)) return `${path} is a hidden path (a tool or configuration file)`;
  if (!DOCUMENT_KIND.test(path)) return `${path} is not a document kind`;
  if (!plainMode(entry.old) || !plainMode(entry.new) || (entry.old === ABSENT && entry.new === ABSENT)) return `${path} is not a plain regular file (mode ${entry.old} -> ${entry.new})`;
  return patterns.some((pattern) => pattern.test(path)) ? null : `${path} is named by no allow glob`;
}

export function classify(entries, allow) {
  if (!Array.isArray(entries) || entries.length === 0) return code("no changed path was read");
  if (!Array.isArray(allow) || allow.length === 0 || !allow.every(plainGlob)) return code("the allow globs are missing or not plain relative globs");
  const patterns = allow.map(globToRegExp);
  for (const entry of entries) {
    const reason = notDocument(entry, patterns);
    if (reason) return code(reason);
  }
  return { scope: "docs", reason: `${entries.length} document path${entries.length === 1 ? "" : "s"}, all allowed` };
}

const FLAGS = new Set(["--event", "--base", "--head", "--allow"]);
function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    const value = argv[i + 1];
    if (!FLAGS.has(argv[i]) || value === undefined || value.startsWith("--")) throw new Error(`unusable argument ${JSON.stringify(argv[i])}`);
    options[argv[i].slice(2)] = value;
  }
  return options;
}

// `git diff --raw -z` prints ":<old mode> <new mode> <old sha> <new sha> <status>" NUL "<path>" NUL for every changed path; the modes are what
// tell a plain file from an executable, a symlink or a submodule. A record the reader cannot place THROWS, and the answer becomes "code".
export function parseRaw(output) {
  const tokens = output.split("\0");
  if (tokens.pop() !== "" || tokens.length % 2 !== 0) throw new Error("git diff --raw output was not whole records");
  const entries = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const m = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([ADMT])$/.exec(tokens[i]);
    if (!m) throw new Error(`git diff --raw gave a record the reader does not know: ${JSON.stringify(tokens[i])}`);
    entries.push({ path: tokens[i + 1], old: m[1], new: m[2] });
  }
  return entries;
}

function changedEntries(base, head) {
  const sha = /^[0-9a-f]{40}$/;
  if (!sha.test(base ?? "") || !sha.test(head ?? "")) throw new Error("--base and --head must be 40-hex commits");
  const run = spawnSync("git", ["diff", "--raw", "-z", "--no-abbrev", "--no-renames", `${base}...${head}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`git diff failed: ${(run.stderr ?? "").trim().split("\n")[0]}`);
  return parseRaw(run.stdout);
}

export function decide(argv) {
  try {
    const options = parseArgs(argv);
    if (options.event !== "pull_request") return code(`the event ${JSON.stringify(options.event)} runs the full tests`);
    const allow = options.allow ? options.allow.split("\n").map((line) => line.trim()).filter(Boolean) : DEFAULT_ALLOW;
    return classify(changedEntries(options.base, options.head), allow);
  } catch (error) {
    return code(error.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = decide(process.argv.slice(2));
  const reason = result.reason.replace(/[\r\n]+/g, " ");
  process.stdout.write(`${JSON.stringify({ check: "ci-scope", scope: result.scope, reason })}\n`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `scope=${result.scope}\nreason=${reason}\n`);
}
