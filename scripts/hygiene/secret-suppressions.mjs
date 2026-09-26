// Secret-suppression guard (AB-18 b/c, v6 proposal; review R01). The workflow runs gitleaks twice:
//   1. the normal scan — any unsuppressed finding fails the job (AB-18 a);
//   2. `--ignore-gitleaks-allow --report-format json` — every finding in that report is one that only a
//      `gitleaks:allow` marker hides. Each must be covered by an unexpired, path-bound profile exception of kind
//      `gitleaks-allow`; otherwise the marker is an unregistered suppression and the job fails.
// The judgment of "what is a finding" stays with gitleaks (no home-made document heuristics). Secrets are never printed.
// Usage: node secret-suppressions.mjs --profile <md> --report <gitleaks json> [--today YYYY-MM-DD] [--cwd .]
import { existsSync } from "node:fs";
import { join } from "node:path";
import { main, readProfile, readJson, matchesAny, report } from "./lib.mjs";

const CHECK = "secret-suppressions";

function covered(file, exceptions) {
  return exceptions.some((e) => e.kind === "gitleaks-allow" && !e.expired && matchesAny(file, [e.path]));
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  if (!args.report) throw new Error("--report <gitleaks json report produced with --ignore-gitleaks-allow> is required");
  const path = join(cwd, args.report);
  if (!existsSync(path)) throw new Error(`report not found: ${args.report}`);
  const findings = readJson(path);
  if (!Array.isArray(findings)) throw new Error("report is not a JSON array of findings");
  const suppressed = findings.map((f) => ({ file: f.File, line: f.StartLine, rule: f.RuleID, commit: String(f.Commit || "").slice(0, 8) }));
  const failures = suppressed.filter((f) => !covered(f.file, profile.exceptions)).map((f) => ({ ...f, why: "finding hidden by gitleaks:allow without a valid path-bound exception (AB-18 b)" }));
  return report(CHECK, failures.length ? "FAIL" : "PASS", { suppressed: suppressed.length, covered: suppressed.length - failures.length, failures });
}

main(CHECK, run);
