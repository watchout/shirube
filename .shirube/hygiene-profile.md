# hygiene profile — watchout/shirube (self-application)

This page is the one place where this repository declares what the hygiene checks apply to
(anti-bloat v5 §4.2, handover v5 §1 C1 / SR). People read the page; the checks read the first ```json block.

- language: JavaScript (ESM, Node >= 22). No TypeScript, no Python. `targets-coverage` fails if a .ts or .py file appears under the scanned targets.
- entries (knip): the check scripts and the ESLint configs are the production entries; templates and docs are not code.
- core boundary: `scripts/hygiene/*.mjs` may import only `./lib.mjs` and Node built-ins (no runtime dependencies).
- exceptions (path-bound, expire on `review_by`, reviewed by whoever reviews the change to that path):
  `scripts/hygiene/large-files.mjs` and `tests/*.test.mjs` contain the literal `gitleaks:allow` in string form because
  they implement and test the suppression guard. They are not suppressions of a finding. Documentation mentions need no exception.
- large files: only `package-lock.json` (lockfile, built-in exemption). Nothing else is allowed over 100KB.
- mode: blocking from the first PR (this repository has no report-only period).
- limits that are internal budgets, not upstream recommendations: new file 300 lines, function 50 lines, complexity 10, PR +400 / 20 files, own code 1,500 lines.

```json
{
  "language": "js",
  "lines": { "include": ["scripts/**", "configs/**", ".github/workflows/**", "tests/**"], "exclude": ["tests/fixtures/**"] },
  "exclude_generated": ["tests/fixtures/**", ".hygiene/jscpd/**"],
  "jscpd": { "extensions": ["mjs", "cjs", "js"] },
  "own_code": { "include": ["scripts/**", "configs/**", ".github/workflows/**"], "exclude": [] },
  "large_file_allow": [],
  "exceptions": [
    { "path": "scripts/hygiene/large-files.mjs", "kind": "gitleaks-allow", "reason": "implements the suppression guard; the marker is a string literal, not a suppression", "issue": "https://github.com/watchout/shirube/pull/1", "review_by": "2026-12-31" },
    { "path": "tests/*.test.mjs", "kind": "gitleaks-allow", "reason": "tests of the suppression guard use the marker as fixture content", "issue": "https://github.com/watchout/shirube/pull/1", "review_by": "2026-12-31" }
  ],
  "limits": {
    "new_file_lines": 300,
    "pr_added_lines": 400,
    "pr_changed_files": 20,
    "large_file_bytes": 102400,
    "baseline_max_entries": 0,
    "own_code_lines": 1500
  },
  "mode": "blocking",
  "enforce_by": "2026-09-26"
}
```
