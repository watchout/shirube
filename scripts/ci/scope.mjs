// CI scope (CI-COST-REDUCE 1): is this pull request documents only? Only then may a repository's own job skip its heavy tests.
// Fail closed: "docs" needs proof for EVERY changed path; anything else (no path, an odd path, a path no allow glob names,
// a code or tool path, an unreadable diff, an event that is not a pull request) answers "code" and the full tests run.
// The answer never skips a required check: the caller keeps its job and its name, and only decides which steps inside run.
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const DEFAULT_ALLOW = ["docs/**", "aidlc/**", "*.md"];

const CODE_DIRS = [".github/", ".shirube/", ".claude/", ".codex/", ".husky/"];
const CODE_NAMES = new Set(["package.json", "package-lock.json", "bun.lock", "bun.lockb", "yarn.lock", "pnpm-lock.yaml", "CODEOWNERS", "Makefile"]);
const CODE_EXT = /\.(?:mjs|cjs|js|jsx|ts|tsx|py|sh|bash|zsh|yml|yaml|toml|sql|rb|go|rs|java)$/i;

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
const isCode = (path) => CODE_DIRS.some((dir) => path.startsWith(dir)) || path.startsWith(".") || CODE_NAMES.has(path.split("/").at(-1)) || CODE_EXT.test(path) || /^dockerfile/i.test(path.split("/").at(-1));

const code = (reason) => ({ scope: "code", reason });

// The first reason a path is not a proven document, or null when it is one.
function notDocument(path, patterns) {
  if (!plainPath(path)) return `an odd path: ${JSON.stringify(path)}`;
  if (isCode(path)) return `${path} is code or a tool file`;
  return patterns.some((pattern) => pattern.test(path)) ? null : `${path} is named by no allow glob`;
}

export function classify(paths, allow) {
  if (!Array.isArray(paths) || paths.length === 0) return code("no changed path was read");
  if (!Array.isArray(allow) || allow.length === 0 || !allow.every(plainGlob)) return code("the allow globs are missing or not plain relative globs");
  const patterns = allow.map(globToRegExp);
  for (const path of paths) {
    const reason = notDocument(path, patterns);
    if (reason) return code(reason);
  }
  return { scope: "docs", reason: `${paths.length} document path${paths.length === 1 ? "" : "s"}, all allowed` };
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

function changedPaths(base, head) {
  const sha = /^[0-9a-f]{40}$/;
  if (!sha.test(base ?? "") || !sha.test(head ?? "")) throw new Error("--base and --head must be 40-hex commits");
  const run = spawnSync("git", ["diff", "--name-only", "-z", "--no-renames", `${base}...${head}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`git diff failed: ${(run.stderr ?? "").trim().split("\n")[0]}`);
  return run.stdout.split("\0").filter((path, i, all) => path !== "" || i < all.length - 1);
}

export function decide(argv) {
  try {
    const options = parseArgs(argv);
    if (options.event !== "pull_request") return code(`the event ${JSON.stringify(options.event)} runs the full tests`);
    const allow = options.allow ? options.allow.split("\n").map((line) => line.trim()).filter(Boolean) : DEFAULT_ALLOW;
    return classify(changedPaths(options.base, options.head), allow);
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
