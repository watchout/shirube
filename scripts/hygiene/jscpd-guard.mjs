// Cross-file duplication with jscpd (anti-bloat v5 §4.1 "横断複製", cards SRC-W1-01), with the introduction baseline
// of clone fingerprints (AB-21, owner decision D0): a clone whose fingerprint is in .hygiene/clones-baseline.json is
// frozen (moving it keeps the fingerprint), a new clone fails, a removed clone is stale until --ratchet drops it.
// Distinguishes three outcomes that plain jscpd conflates:
//   1. targets contain no tracked files at all            -> FAIL (misconfigured scan, AB-08)
//   2. every tracked file is shorter than min-lines        -> PASS with the inventory printed
//   3. otherwise run jscpd (--threshold 0 --fail-on-empty), read its JSON report and judge the fingerprints
// Usage: node jscpd-guard.mjs --profile <md> --targets "src bin" [--python true] [--ratchet | --init] [--cwd .] [--report-dir .hygiene/jscpd]
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { main, readProfile, trackedFiles, resolveTargets, countLines, readJson, LANGUAGE_EXTENSIONS, report, judgeBaseline } from "./lib.mjs";

const CHECK = "jscpd";
const MIN_LINES = 10;
const MIN_TOKENS = 50;

// The inventory is the same covered set as targets-coverage / ESLint (profile language, plus Python when
// requested); a narrower profile.jscpd.extensions may only remove extensions from it (devauditor AUD-SHIRUBE1-JSCPD-COVERAGE-001).
function coveredExtensions(profile, python) {
  const covered = new Set(LANGUAGE_EXTENSIONS[profile.language]);
  if (python) for (const e of LANGUAGE_EXTENSIONS.python) covered.add(e);
  const narrowed = profile.jscpd?.extensions;
  return narrowed ? [...covered].filter((e) => narrowed.includes(e)) : [...covered];
}

// One exclusion set for BOTH the inventory (which decides whether the scan runs) and the real jscpd scan: the
// profile's lines.exclude plus exclude_generated (devauditor AUD-SHIRUBE1-JSCPD-SCANSET-002 — before this, only
// exclude_generated reached jscpd, so a duplicate inside lines.exclude was ignored or reported depending on the
// length of unrelated files). jscpd 5.3.2 applies every repeated --ignore (verified with two patterns).
function excludedGlobs(profile) {
  return [...profile.lines.exclude, ...profile.exclude_generated];
}

function inventory(cwd, targets, profile, python) {
  const { include, missing } = resolveTargets(cwd, targets);
  const exts = coveredExtensions(profile, python);
  const files = trackedFiles(cwd, { include, exclude: excludedGlobs(profile) })
    .filter((f) => exts.includes(f.split(".").pop()));
  const eligible = files.filter((f) => countLines(readFileSync(join(cwd, f), "utf8")) >= MIN_LINES);
  return { files, eligible, missing };
}

function runJscpd(cwd, targets, profile, reportDir) {
  const args = [...targets, "--min-lines", String(MIN_LINES), "--min-tokens", String(MIN_TOKENS), "--threshold", "0",
    "--exit-code", "1", "--fail-on-empty", "--reporters", "console,json", "--output", reportDir];
  for (const ig of excludedGlobs(profile)) args.push("--ignore", ig);
  const r = spawnSync("npx", ["--no-install", "jscpd", ...args], { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// A clone is identified by its content, not its position: sha256 of the whitespace-normalized fragment (16 hex).
// Moving a duplicated block keeps the fingerprint; changing its text or adding another block makes a new one.
function fingerprints(reportPath) {
  const current = new Map();
  const dups = readJson(reportPath).duplicates || [];
  for (const d of dups) {
    const fp = createHash("sha256").update(String(d.fragment || "").replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
    current.set(fp, Math.max(current.get(fp) || 0, Number(d.lines) || 0));
  }
  return { current, clones: dups.length };
}

// Scan, then judge the clone fingerprints against the baseline (the jscpd exit code is a measurement, not the verdict).
function scanAndJudge(cwd, args, profile, targets, inv) {
  const reportDir = args["report-dir"] || ".hygiene/jscpd";
  const r = runJscpd(cwd, targets, profile, reportDir);
  const reportPath = join(cwd, reportDir, "jscpd-report.json");
  if (r.status === null || !existsSync(reportPath)) return report(CHECK, "UNOBSERVABLE", { targets, why: "jscpd could not be started or wrote no report", jscpd_exit: r.status, stderr: (r.stderr || r.stdout).trim().slice(0, 500) });
  const { current, clones } = fingerprints(reportPath);
  const j = judgeBaseline({
    current, baselinePath: join(cwd, args.baseline || ".hygiene/clones-baseline.json"), newKeyLimit: 0,
    maxEntries: profile.limits.clone_baseline_max_entries, limitName: "clone_baseline_max_entries", noun: "clone", ratchet: Boolean(args.ratchet), init: Boolean(args.init),
  });
  return report(CHECK, j.failures.length ? "FAIL" : "PASS", { targets, ...inv, jscpd_exit: r.status, clones, baseline_entries: j.entries, initialized: j.initialized, ratcheted: j.ratcheted, failures: j.failures });
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  const targets = String(args.targets || "src").split(/\s+/).filter(Boolean);
  const { files, eligible, missing } = inventory(cwd, targets, profile, String(args.python) === "true");
  if (missing.length > 0) return report(CHECK, "FAIL", { targets, missing, why: "target is neither a tracked file nor a directory with tracked files (misconfigured scan)" });
  if (files.length === 0) return report(CHECK, "FAIL", { targets, why: "no tracked files under targets (misconfigured scan)" });
  if (eligible.length === 0) return report(CHECK, "PASS", { targets, files: files.length, eligible: 0, why: `all files shorter than ${MIN_LINES} lines; scan skipped with inventory` });
  return scanAndJudge(cwd, args, profile, targets, { files: files.length, eligible: eligible.length });
}

main(CHECK, run);
