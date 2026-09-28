// Structural limits (function length, cyclomatic complexity: configs/structural-only.config.mjs, SRC-W1-04) with the
// introduction baseline of anti-bloat v5 §4.1 "既存超過の扱い" extended to functions (owner decision D0): a file not in
// the baseline must have 0 violations; a baseline file must not exceed its count; counts only go down (--ratchet);
// --init records today's counts at introduction. The rule lives in baseline.mjs; ESLint is the measurement (AB-20).
// ESLint exit 0 / 1 are results; a crash or a parse error is UNOBSERVABLE, never PASS.
// Usage: node structural-baseline.mjs --profile <md> --targets "src bin" [--baseline .hygiene/structural-baseline.json] [--ratchet | --init] [--cwd .]
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { main, readProfile, report } from "./lib.mjs";
import { judgeBaseline } from "./baseline.mjs";

const CHECK = "structural";
const CONFIG = resolve(import.meta.dirname, "../../configs/structural-only.config.mjs");

function lint(cwd, profilePath, targets) {
  const r = spawnSync("npx", ["--no-install", "eslint", "--config", CONFIG, "-f", "json", ...targets],
    { cwd, encoding: "utf8", maxBuffer: 1 << 28, env: { ...process.env, SHIRUBE_PROFILE: profilePath } });
  if (r.status === null || r.status > 1 || !r.stdout.trim().startsWith("[")) throw new Error(`eslint could not run (exit ${r.status}): ${(r.stderr || r.stdout).trim().slice(0, 500)}`);
  return JSON.parse(r.stdout);
}

// One count per file (all structural rules together); a fatal message (parse error) is not a count, it is unobservable.
function countsPerFile(results, cwd) {
  const current = new Map();
  for (const file of results) {
    const fatal = file.messages.find((m) => m.fatal);
    if (fatal) throw new Error(`parse error in ${file.filePath}: ${fatal.message}`);
    const rel = file.filePath.startsWith(cwd) ? file.filePath.slice(cwd.length + 1) : file.filePath;
    current.set(rel, file.messages.filter((m) => m.ruleId).length);
  }
  return current;
}

function run(args) {
  const cwd = realpathSync(resolve(args.cwd || process.cwd())); // eslint reports real paths; keys are relative to them
  const profilePath = args.profile || ".shirube/hygiene-profile.md";
  const profile = readProfile(join(cwd, profilePath), { today: args.today });
  const targets = String(args.targets || "src").split(/\s+/).filter(Boolean);
  const current = countsPerFile(lint(cwd, profilePath, targets), cwd);
  if (current.size === 0) return report(CHECK, "FAIL", { targets, why: "eslint linted no file under targets (misconfigured scan)" });
  const violations = [...current.values()].reduce((n, v) => n + v, 0);
  const r = judgeBaseline({
    current, baselinePath: join(cwd, args.baseline || ".hygiene/structural-baseline.json"), newKeyLimit: 0,
    maxEntries: profile.limits.structural_baseline_max_entries, limitName: "structural_baseline_max_entries", noun: "file", ratchet: Boolean(args.ratchet), init: Boolean(args.init),
  });
  return report(CHECK, r.failures.length ? "FAIL" : "PASS", { files: current.size, violations, baseline_entries: r.entries, initialized: r.initialized, ratcheted: r.ratcheted, failures: r.failures });
}

main(CHECK, run);
