// Own-code budget for this repository (handover v5 §10-1: 自前コード上限 1,500 行, owner-adopted budget).
// Counts tracked lines of profile.own_code (scripts, workflows, configs). Docs, templates and tests are not
// "own code". The budget is a ceiling, not a goal: shrinking requirements to fit is forbidden (SR-01, AM-03).
// Usage: node own-code-budget.mjs --profile <md> [--cwd .]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { main, readProfile, trackedFiles, countLines, report } from "./lib.mjs";

const CHECK = "own-code-budget";

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"));
  const limit = profile.limits.own_code_lines;
  if (!Number.isInteger(limit)) throw new Error("profile.limits.own_code_lines is not set");
  if (!profile.own_code) throw new Error("profile.own_code (include/exclude globs) is not set");
  const files = trackedFiles(cwd, profile.own_code);
  const perFile = files.map((f) => ({ file: f, lines: countLines(readFileSync(join(cwd, f), "utf8")) }));
  const total = perFile.reduce((n, x) => n + x.lines, 0);
  return report(CHECK, total <= limit ? "PASS" : "FAIL", { total, limit, files: perFile.length, largest: perFile.sort((a, b) => b.lines - a.lines).slice(0, 5) });
}

main(CHECK, run);
