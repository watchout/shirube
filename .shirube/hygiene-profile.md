# hygiene profile — watchout/shirube (self-application)

This page is the one place where this repository declares what the hygiene checks apply to
(anti-bloat v5 §4.2, handover v5 §1 C1 / SR). People read the page; the checks read the first ```json block.

- language: JavaScript (ESM, Node >= 22). No TypeScript, no Python.
- entries (knip): the check scripts and the two ESLint configs are the production entries; templates and docs are not code.
- core boundary: `scripts/hygiene/*.mjs` may import only `./lib.mjs` and Node built-ins (no runtime dependencies).
- exceptions: none registered. A permanent exception needs reason + issue + review date here; a migration exception needs `// TODO [YYYY-MM-DD]: <issue> <reason>` in code.
- mode: blocking from the first PR (this repository has no report-only period).
- limits that are internal budgets, not upstream recommendations: new file 300 lines, function 50 lines, complexity 10, PR +400 / 20 files, own code 1,500 lines.

```json
{
  "language": "js",
  "lines": { "include": ["scripts/**", "configs/**", ".github/workflows/**", "tests/**"], "exclude": ["tests/fixtures/**"] },
  "exclude_generated": ["tests/fixtures/**", ".hygiene/jscpd/**"],
  "jscpd": { "extensions": ["mjs", "cjs", "js"] },
  "own_code": { "include": ["scripts/**", "configs/**", ".github/workflows/**"], "exclude": [] },
  "exceptions": [],
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
