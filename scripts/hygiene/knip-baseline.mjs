// Unused code from the production entries (anti-bloat v5 §4.1 "未使用", SRC-W1-02: knip --production) with the
// introduction baseline (AB-22, owner decision D0): per-file counts of what knip reports (unused files, exports, types,
// members, duplicates, dependency issues) are frozen at introduction and only go down. Missing knip.jsonc is
// UNOBSERVABLE (AB-08), never PASS; knip's own exit code is the measurement, the baseline is the verdict.
// Usage: node knip-baseline.mjs --profile <md> [--config knip.jsonc] [--baseline .hygiene/knip-baseline.json] [--ratchet | --init] [--cwd .]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { main, readProfile, report, judgeBaseline } from "./lib.mjs";

const CHECK = "knip";

function runKnip(cwd, config) {
  if (!existsSync(join(cwd, config))) throw new Error(`knip config not found: ${config} (AB-08)`);
  const r = spawnSync("npx", ["--no-install", "knip", "--production", "--config", config, "--reporter", "json"], { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status === null || r.status > 1 || !r.stdout.trim().startsWith("{")) throw new Error(`knip could not run (exit ${r.status}): ${(r.stderr || r.stdout).trim().slice(0, 500)}`);
  return { exit: r.status, out: JSON.parse(r.stdout) };
}

// One count per file: every array-valued finding of a knip issue counts per item (knip 6.38 json reporter:
// `issues[].{files, exports, types, enumMembers, namespaceMembers, duplicates, dependencies, unlisted, binaries, unresolved, ...}`;
// an unused file appears as `files: [{name}]` on its own issue). Unknown future kinds count too, never silently zero.
function countsPerFile(out) {
  const current = new Map();
  for (const issue of out.issues || []) {
    const n = Object.entries(issue).reduce((sum, [k, v]) => sum + (k !== "file" && Array.isArray(v) ? v.length : 0), 0);
    if (n > 0) current.set(issue.file, (current.get(issue.file) || 0) + n);
  }
  return current;
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  const { exit, out } = runKnip(cwd, args.config || "knip.jsonc");
  const current = countsPerFile(out);
  const findings = [...current.values()].reduce((n, v) => n + v, 0);
  const j = judgeBaseline({
    current, baselinePath: join(cwd, args.baseline || ".hygiene/knip-baseline.json"), newKeyLimit: 0,
    maxEntries: profile.limits.knip_baseline_max_entries, limitName: "knip_baseline_max_entries", noun: "file", ratchet: Boolean(args.ratchet), init: Boolean(args.init),
  });
  return report(CHECK, j.failures.length ? "FAIL" : "PASS", { knip_exit: exit, findings, files: current.size, baseline_entries: j.entries, initialized: j.initialized, ratcheted: j.ratcheted, failures: j.failures });
}

main(CHECK, run);
