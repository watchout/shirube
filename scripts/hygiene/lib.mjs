// Shared helpers for the hygiene checks. No dependencies. Node >= 22.
// Every check reads one profile (.shirube/hygiene-profile.md: the first ```json block)
// and prints one JSON summary line. Exit 0 = PASS, 1 = FAIL, 2 = cannot observe.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

export const EXIT = { PASS: 0, FAIL: 1, UNOBSERVABLE: 2 };

const REQUIRED_KEYS = ["language", "lines", "limits"];
const DEFAULT_LIMITS = {
  new_file_lines: 300,
  pr_added_lines: 400,
  pr_changed_files: 20,
  large_file_bytes: 102400,
  baseline_max_entries: 0,
  own_code_lines: null,
};

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[a.slice(2)] = true;
    else { args[a.slice(2)] = next; i += 1; }
  }
  return args;
}

// The profile is a Markdown page for people; the machine reads its first ```json block.
export function readProfile(path) {
  if (!existsSync(path)) throw new Error(`profile not found: ${path}`);
  const text = readFileSync(path, "utf8");
  const m = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`profile has no \`\`\`json block: ${path}`);
  const profile = JSON.parse(m[1]);
  for (const k of REQUIRED_KEYS) if (!(k in profile)) throw new Error(`profile missing key: ${k}`);
  profile.limits = { ...DEFAULT_LIMITS, ...profile.limits };
  return profile;
}

// Minimal glob: ** (any path), * (within a segment), ? (one char). Anchored to the whole path.
export function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      re += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${re}$`);
}

export function matchesAny(path, globs = []) {
  return globs.some((g) => globToRegExp(g).test(path));
}

export function git(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

export function trackedFiles(cwd, { include = ["**"], exclude = [] } = {}) {
  const all = git(cwd, ["ls-files", "-z"]).split("\0").filter(Boolean);
  return all.filter((f) => matchesAny(f, include) && !matchesAny(f, exclude));
}

export function countLines(text) {
  if (text.length === 0) return 0;
  const n = text.split("\n").length;
  return text.endsWith("\n") ? n - 1 : n;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// One summary line per check. `verdict` is PASS / FAIL / UNOBSERVABLE; details stay short.
export function report(check, verdict, details) {
  process.stdout.write(`${JSON.stringify({ check, verdict, ...details })}\n`);
  return EXIT[verdict];
}

// Unexpected errors (missing profile, git failure) are "cannot observe", never a silent PASS.
export function main(check, fn) {
  try {
    process.exit(fn(parseArgs(process.argv.slice(2))));
  } catch (e) {
    process.exit(report(check, "UNOBSERVABLE", { reason: e.message }));
  }
}
