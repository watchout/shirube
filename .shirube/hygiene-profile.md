# hygiene profile — watchout/shirube (self-application)

This page is the one place where this repository declares what the hygiene checks apply to
(anti-bloat v5 §4.2, handover v5 §1 C1 / SR). People read the page; the checks read the first ```json block.

- language: JavaScript (ESM, Node >= 22). No TypeScript, no Python. `targets-coverage` fails if a .ts or .py file appears under the scanned targets.
- entries (knip): the check scripts and the ESLint configs are the production entries; templates and docs are not code.
- core boundary: `scripts/hygiene/*.mjs` may import only `./lib.mjs` and Node built-ins (no runtime dependencies).
- exceptions (path-bound, expire on `review_by`, reviewed by whoever reviews the change to that path): none. The literal
  `gitleaks:allow` in the guard's code, tests and docs hides no finding (gitleaks reports none under
  `--ignore-gitleaks-allow`), so no exception is needed; an exception is required only when a real finding is suppressed.
- large files: only `package-lock.json` (lockfile, built-in exemption). Nothing else is allowed over 100KB.
- mode: blocking from the first PR (this repository has no report-only period).
- limits that are internal budgets, not upstream recommendations: new file 300 lines, function 50 lines, complexity 10, PR +400 / 20 files, own code 4,000 lines.
- own-code budget: raised once, from 2,300 to 4,000 lines, for the whole of the first complete version (S1). Basis, the S1-wide estimate (PR #66 comment 6378598176): 1,938 in use + 1,200–1,900 added by U1–U5 (U1 570–760, U2–U5 630–1,140; U6 and U7 live in other repositories, 0 here) = 3,138–3,838 at the end, about 160 lines of margin. The Owner set the value (iyasaka-arc#49 6379138360, under 6357471211 item 2); work that would pass a Unit's upper estimate stops and goes back to arc. No other limit is loosened in the same change. Size counts leave out AI-DLC records (`aidlc/` Markdown, JSON and text) and Markdown under `docs/` (iyasaka-arc#49 6354019047): records, not code.

```json
{
  "language": "js",
  "lines": { "include": ["scripts/**", "configs/**", ".github/workflows/**", "tests/**"], "exclude": ["tests/fixtures/**"] },
  "exclude_generated": ["tests/fixtures/**", ".hygiene/jscpd/**", "aidlc/**/*.md", "aidlc/**/*.json", "aidlc/**/*.txt", "docs/**/*.md"],
  "own_code": { "include": ["scripts/**", "configs/**", ".github/workflows/**"], "exclude": [] },
  "large_file_allow": [],
  "exceptions": [],
  "limits": {
    "new_file_lines": 300,
    "pr_added_lines": 400,
    "pr_changed_files": 20,
    "large_file_bytes": 102400,
    "baseline_max_entries": 0,
    "own_code_lines": 4000
  },
  "mode": "blocking",
  "enforce_by": "2026-09-26"
}
```
