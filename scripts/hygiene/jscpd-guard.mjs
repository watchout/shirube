// Cross-file duplication with jscpd (anti-bloat v5 §4.1 "横断複製", cards SRC-W1-01).
// Distinguishes three outcomes that plain jscpd conflates:
//   1. targets contain no tracked files at all            -> FAIL (misconfigured scan, AB-08)
//   2. every tracked file is shorter than min-lines        -> PASS with the inventory printed
//   3. otherwise run jscpd with --threshold 0 --exit-code 1 --fail-on-empty and pass its exit code through
// Usage: node jscpd-guard.mjs --profile <md> --targets "src bin" [--python true] [--cwd .] [--report-dir .hygiene/jscpd]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { main, readProfile, trackedFiles, countLines, LANGUAGE_EXTENSIONS, report } from "./lib.mjs";

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

function inventory(cwd, targets, profile, python) {
  const include = targets.map((t) => (t === "." ? "**" : `${t.replace(/\/$/, "")}/**`));
  const exts = coveredExtensions(profile, python);
  const files = trackedFiles(cwd, { include, exclude: [...profile.lines.exclude, ...profile.exclude_generated] })
    .filter((f) => exts.includes(f.split(".").pop()));
  const eligible = files.filter((f) => countLines(readFileSync(join(cwd, f), "utf8")) >= MIN_LINES);
  return { files, eligible };
}

function runJscpd(cwd, targets, profile, reportDir) {
  const args = [...targets, "--min-lines", String(MIN_LINES), "--min-tokens", String(MIN_TOKENS), "--threshold", "0",
    "--exit-code", "1", "--fail-on-empty", "--reporters", "console,json", "--output", reportDir];
  for (const ig of profile.exclude_generated || []) args.push("--ignore", ig);
  const r = spawnSync("npx", ["--no-install", "jscpd", ...args], { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"));
  const targets = String(args.targets || "src").split(/\s+/).filter(Boolean);
  const { files, eligible } = inventory(cwd, targets, profile, String(args.python) === "true");
  if (files.length === 0) return report(CHECK, "FAIL", { targets, why: "no tracked files under targets (misconfigured scan)" });
  if (eligible.length === 0) return report(CHECK, "PASS", { targets, files: files.length, eligible: 0, why: `all files shorter than ${MIN_LINES} lines; scan skipped with inventory` });
  const r = runJscpd(cwd, targets, profile, args["report-dir"] || ".hygiene/jscpd");
  return reportJscpd(r, { targets, files: files.length, eligible: eligible.length });
}

function reportJscpd(r, base) {
  if (r.status === null) return report(CHECK, "UNOBSERVABLE", { ...base, why: "jscpd could not be started", stderr: r.stderr });
  const found = r.stdout.match(/Found (\d+) clones?/);
  return report(CHECK, r.status === 0 ? "PASS" : "FAIL", { ...base, jscpd_exit: r.status, clones: found ? Number(found[1]) : null });
}

main(CHECK, run);
