// File-length check with a numeric baseline table (anti-bloat v5 §4.1 "ファイルの肥大", AB-01 / AB-06).
// A file not in the baseline must be <= limits.new_file_lines (300); a baseline file must be <= its value; the rest of
// the rules (stale -> FAIL unless --ratchet, --init at introduction, entry ceiling) live in baseline.mjs.
// An include set that matches no tracked file is a misconfiguration -> FAIL (never "0 files, PASS").
// Usage: node lines-baseline.mjs --profile <md> [--baseline .hygiene/lines-baseline.json] [--ratchet | --init] [--cwd .]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { main, readProfile, trackedFiles, countLines, report } from "./lib.mjs";
import { judgeBaseline } from "./baseline.mjs";

const CHECK = "lines-baseline";

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  const files = trackedFiles(cwd, profile.lines);
  if (files.length === 0) return report(CHECK, "FAIL", { files: 0, why: "profile.lines.include matched no tracked file (misconfigured scan)" });
  const current = new Map(files.map((f) => [f, countLines(readFileSync(join(cwd, f), "utf8"))]));
  const r = judgeBaseline({
    current, baselinePath: join(cwd, args.baseline || ".hygiene/lines-baseline.json"), newKeyLimit: profile.limits.new_file_lines,
    maxEntries: profile.limits.baseline_max_entries, limitName: "baseline_max_entries", noun: "file", ratchet: Boolean(args.ratchet), init: Boolean(args.init),
  });
  return report(CHECK, r.failures.length ? "FAIL" : "PASS", { files: files.length, baseline_entries: r.entries, initialized: r.initialized, ratcheted: r.ratcheted, failures: r.failures });
}

main(CHECK, run);
