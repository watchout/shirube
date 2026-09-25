// File-length check with a numeric baseline table (anti-bloat v5 §4.1 "ファイルの肥大").
// Rules: a file not in the baseline must be <= limits.new_file_lines (300).
//        a file in the baseline must be <= its baseline value (shrinking is fine, growing fails).
//        a baseline value larger than the file's current length is stale -> FAIL unless --ratchet,
//        which lowers it (never raises). Raising or adding entries is a hand edit + owner line.
//        the number of entries must not exceed limits.baseline_max_entries (set at introduction).
// Usage: node lines-baseline.mjs --profile <md> [--baseline .hygiene/lines-baseline.json] [--ratchet] [--cwd .]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { main, readProfile, trackedFiles, countLines, readJson, report } from "./lib.mjs";

const CHECK = "lines-baseline";

function loadBaseline(path) {
  if (!existsSync(path)) return {};
  const b = readJson(path);
  for (const [f, v] of Object.entries(b)) {
    if (!Number.isInteger(v) || v <= 0) throw new Error(`baseline ${f}: value must be a positive integer`);
  }
  return b;
}

function evaluate(files, baseline, limits, cwd) {
  const failures = [];
  const ratchet = {};
  for (const f of files) {
    const lines = countLines(readFileSync(join(cwd, f), "utf8"));
    if (f in baseline) {
      if (lines > baseline[f]) failures.push({ file: f, lines, max: baseline[f], why: "grew past baseline" });
      else if (lines < baseline[f]) ratchet[f] = lines; // stale unless --ratchet writes it down
    } else if (lines > limits.new_file_lines) {
      failures.push({ file: f, lines, max: limits.new_file_lines, why: "new file over limit" });
    }
  }
  for (const f of Object.keys(baseline)) {
    if (!files.includes(f)) failures.push({ file: f, why: "baseline entry for a file that no longer exists" });
  }
  return { failures, ratchet };
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"));
  const baselinePath = join(cwd, args.baseline || ".hygiene/lines-baseline.json");
  const baseline = loadBaseline(baselinePath);
  const files = trackedFiles(cwd, profile.lines);
  const { failures, ratchet } = evaluate(files, baseline, profile.limits, cwd);
  const entries = Object.keys(baseline).length;
  if (entries > profile.limits.baseline_max_entries) {
    failures.push({ why: `baseline has ${entries} entries, more than baseline_max_entries=${profile.limits.baseline_max_entries}` });
  }
  const stale = Object.keys(ratchet);
  if (stale.length && args.ratchet) {
    writeFileSync(baselinePath, `${JSON.stringify({ ...baseline, ...ratchet }, null, 2)}\n`);
  } else if (stale.length) {
    failures.push({ files: stale, why: "file shrank but baseline was not lowered (run npm run hygiene:ratchet)" });
  }
  return report(CHECK, failures.length ? "FAIL" : "PASS", { files: files.length, baseline_entries: entries, ratcheted: args.ratchet ? stale : [], failures });
}

main(CHECK, run);
