// Shared helpers for the hygiene checks. No dependencies. Node >= 22.
// Every check reads one profile (.shirube/hygiene-profile.md: the first ```json block), validates it (fail closed),
// and prints one JSON summary line. Exit 0 = PASS, 1 = FAIL, 2 = cannot observe (bad input, git failure).
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const EXIT = { PASS: 0, FAIL: 1, UNOBSERVABLE: 2 };
export const LANGUAGE_EXTENSIONS = { js: ["js", "mjs", "cjs", "jsx"], ts: ["js", "mjs", "cjs", "jsx", "ts", "tsx", "mts", "cts"], python: ["py"] };
export const LOCKFILES = ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "uv.lock", "Cargo.lock", "Gemfile.lock"];

const INTEGER_LIMITS = ["new_file_lines", "pr_added_lines", "pr_changed_files", "large_file_bytes", "baseline_max_entries", "structural_baseline_max_entries"];
const DEFAULT_LIMITS = { new_file_lines: 300, pr_added_lines: 400, pr_changed_files: 20, large_file_bytes: 102400, baseline_max_entries: 0, structural_baseline_max_entries: 0, own_code_lines: null };
const EXCEPTION_KINDS = ["gitleaks-allow", "gitleaks-config"];

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

function integerLimit(name, v, min) {
  if (!Number.isInteger(v) || v < min) throw new Error(`profile.limits.${name} must be an integer >= ${min}, got ${JSON.stringify(v)}`);
}

function validateLimits(limits) {
  const l = { ...DEFAULT_LIMITS, ...(limits || {}) };
  for (const k of INTEGER_LIMITS) integerLimit(k, l[k], k.endsWith("_max_entries") ? 0 : 1);
  if (l.own_code_lines !== null) integerLimit("own_code_lines", l.own_code_lines, 1);
  return l;
}

function isGlobList(v) {
  return Array.isArray(v) && v.every((g) => typeof g === "string" && g.length > 0);
}

// Exceptions are bound to paths and expire; a bare marker string is not an exception (audit B02).
// A date must round-trip through the calendar (2026-99-99 looks like a date but is not one; review R01).
function isRealDate(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const EXCEPTION_FIELDS = [
  ["path", (v) => typeof v === "string" && v.length > 0, "path (glob) is required"],
  ["kind", (v) => EXCEPTION_KINDS.includes(v), `kind must be one of ${EXCEPTION_KINDS.join(", ")}`],
  ["reason", (v) => typeof v === "string" && v.length >= 10, "reason is required (>= 10 chars)"],
  ["issue", (v) => /^https:\/\/github\.com\//.test(v || ""), "issue must be a GitHub URL"],
  ["review_by", isRealDate, "review_by must be a real calendar date, YYYY-MM-DD"],
];

function validateException(e, i, today) {
  for (const [field, ok, msg] of EXCEPTION_FIELDS) {
    if (!e || !ok(e[field])) throw new Error(`profile.exceptions[${i}].${msg}`);
  }
  return { ...e, expired: e.review_by < today };
}

// The profile is a Markdown page for people; the machine reads its first ```json block.
export function readProfile(path, { today = utcToday() } = {}) {
  if (!existsSync(path)) throw new Error(`profile not found: ${path}`);
  const m = readFileSync(path, "utf8").match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`profile has no \`\`\`json block: ${path}`);
  return validateProfile(JSON.parse(m[1]), today);
}

function globListOr(v, fallback) {
  return isGlobList(v) ? v : fallback;
}

function validateProfile(p, today) {
  if (!(p.language in LANGUAGE_EXTENSIONS)) throw new Error(`profile.language must be one of ${Object.keys(LANGUAGE_EXTENSIONS).join(", ")}`);
  if (!p.lines || !isGlobList(p.lines.include) || p.lines.include.length === 0) throw new Error("profile.lines.include must be a non-empty glob list");
  p.lines.exclude = globListOr(p.lines.exclude, []);
  p.exclude_generated = globListOr(p.exclude_generated, []);
  p.large_file_allow = globListOr(p.large_file_allow, []);
  p.limits = validateLimits(p.limits);
  p.exceptions = (p.exceptions || []).map((e, i) => validateException(e, i, today));
  return p;
}

// The clock is an input (engineering-standards S4): --today or SHIRUBE_TODAY; the adapter reads the OS clock only as a last resort.
export function utcToday() {
  return process.env.SHIRUBE_TODAY || new Date().toISOString().slice(0, 10);
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

// The workflow's `targets` are directories or tracked files (a repository whose entry point sits at the root, such
// as `server.ts`, has no directory to name). Each entry is normalized to the repo-relative form git uses (`./x`, `x/`,
// `a//b` -> `x`, `a/b`; devauditor AUD-SHIRUBE3-TARGET-PATH-001), then must be a tracked file (its own glob) or a
// directory holding at least one tracked file (`dir/**`); "." is the whole repository. Anything else is a misconfigured
// scan and is returned in `missing` so the caller fails instead of silently scanning less (AUD-SHIRUBE3-TARGET-ENTRY-002).
// The same set feeds the jscpd inventory and targets-coverage, so what is counted is what is scanned (AB-23, R13).
export function resolveTargets(cwd, targets) {
  const tracked = git(cwd, ["ls-files", "-z"]).split("\0").filter(Boolean);
  const set = new Set(tracked);
  const include = [];
  const missing = [];
  for (const raw of targets) {
    const t = normalizeTarget(raw);
    if (t === ".") { include.push("**"); continue; }
    if (t === null) { missing.push(raw); continue; }
    if (set.has(t)) include.push(t);
    else if (tracked.some((f) => f.startsWith(`${t}/`))) include.push(`${t}/**`);
    else missing.push(raw);
  }
  return { include, missing };
}

// "./a/b/", "a//b" -> "a/b"; "." -> "."; absolute paths and ".." segments are not repo-relative -> null.
function normalizeTarget(raw) {
  const parts = String(raw).split("/").filter((p) => p !== "" && p !== ".");
  if (parts.includes("..") || String(raw).startsWith("/")) return null;
  return parts.length === 0 ? "." : parts.join("/");
}

export function extensionOf(path) {
  const base = path.split("/").pop();
  return base.includes(".") ? base.split(".").pop() : "";
}

export function isLockfile(path) {
  return LOCKFILES.includes(path.split("/").pop());
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

// Unexpected errors (missing or invalid profile, git failure) are "cannot observe", never a silent PASS.
export function main(check, fn) {
  try {
    process.exit(fn(parseArgs(process.argv.slice(2))));
  } catch (e) {
    process.exit(report(check, "UNOBSERVABLE", { reason: e.message }));
  }
}

// Numeric baseline shared by the checks that freeze existing excess at introduction (anti-bloat v5 §4.1
// "既存超過の扱い": what is over the limit today must not grow, and only goes down; extended from file length to
// function violations / clones / unused code by owner decision D0, third example -> one helper, S2; it lives here because a check may import only lib.mjs and Node built-ins).
// Rules, for a table { key: value }:
//   a key not in the baseline must be <= newKeyLimit (new_file_lines for files, 0 for violation counts);
//   a key in the baseline must be <= its value (0 is valid); a value above today's measurement is stale -> FAIL
//   unless --ratchet writes the lower value; a key that no longer exists is stale the same way (--ratchet removes it);
//   the number of entries must not exceed maxEntries (set at introduction);
//   --init writes today's over-limit measurements when no baseline exists yet (introduction PR only, reviewed).
// Raising a value or adding an entry by hand is an owner line (verified by W3 later). The helper never raises.
export function loadBaseline(path) {
  if (!existsSync(path)) return {};
  const b = readJson(path);
  for (const [k, v] of Object.entries(b)) {
    if (!Number.isInteger(v) || v < 0) throw new Error(`baseline ${k}: value must be a non-negative integer`);
  }
  return b;
}

function write(path, table) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(table, null, 2)}\n`);
}

function initialize(current, baselinePath, newKeyLimit) {
  const table = Object.fromEntries([...current].filter(([, v]) => v > newKeyLimit).sort());
  write(baselinePath, table);
  return { failures: [], entries: Object.keys(table).length, ratcheted: [], initialized: true };
}

function compare(current, baseline, newKeyLimit, noun) {
  const failures = [];
  const lowered = {};
  for (const [k, v] of current) {
    if (!(k in baseline)) { if (v > newKeyLimit) failures.push({ [noun]: k, value: v, max: newKeyLimit, why: `new ${noun} over limit` }); }
    else if (v > baseline[k]) failures.push({ [noun]: k, value: v, max: baseline[k], why: "grew past baseline" });
    else if (v < baseline[k]) lowered[k] = v;
  }
  return { failures, lowered };
}

// Stale entries (value above today's measurement, or key gone): --ratchet lowers / removes them, otherwise they fail.
function settleStale({ baselinePath, baseline, lowered, gone, noun, ratchet, failures }) {
  const stale = [...Object.keys(lowered), ...gone];
  if (!stale.length) return stale;
  if (!ratchet) {
    failures.push({ keys: stale, why: `${noun} measurement went down or the ${noun} no longer exists, but the baseline was not lowered (run with --ratchet)` });
    return stale;
  }
  const next = { ...baseline, ...lowered };
  for (const k of gone) delete next[k];
  write(baselinePath, next);
  return stale;
}

// current: Map<key, integer> measured now. Returns { failures, entries, ratcheted, initialized }.
export function judgeBaseline({ current, baselinePath, newKeyLimit, maxEntries, limitName, noun, ratchet = false, init = false }) {
  if (init && !existsSync(baselinePath)) return initialize(current, baselinePath, newKeyLimit);
  const baseline = loadBaseline(baselinePath);
  const { failures, lowered } = compare(current, baseline, newKeyLimit, noun);
  const gone = Object.keys(baseline).filter((k) => !current.has(k));
  const entries = Object.keys(baseline).length;
  if (entries > maxEntries) failures.push({ why: `baseline has ${entries} entries, more than ${limitName}=${maxEntries}` });
  const stale = settleStale({ baselinePath, baseline, lowered, gone, noun, ratchet, failures });
  return { failures, entries, ratcheted: ratchet ? stale : [], initialized: false };
}
