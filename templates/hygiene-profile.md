# hygiene profile — <repository>

<!-- Copy to .shirube/hygiene-profile.md. People read the page; the checks read the first ```json block (anti-bloat v5 §4.2). -->

- language: <!-- js / ts / python (the workflow input `python: true` adds ruff C901, PLR0915 and vulture) -->
- entries (knip.jsonc): production entry points and the adopted public contract, each with a reason
- excluded: generated code and fixtures
- core boundary (.dependency-cruiser.cjs): which layer may not import which
- exceptions: permanent ones here (reason + issue + review date); migration ones as `// TODO [YYYY-MM-DD]: <issue> <reason>` in code
- mode / enforce_by: report_only until enforce_by, blocking after (W4 checks the declaration against the real required checks)
- internal budgets (not upstream recommendations): new file 300 lines, function 50 lines, complexity 10, PR +400 / 20 files

```json
{
  "language": "ts",
  "lines": { "include": ["src/**", "bin/**"], "exclude": ["src/generated/**"] },
  "exclude_generated": ["src/generated/**", "tests/fixtures/**"],
  "jscpd": { "extensions": ["ts", "tsx", "js", "mjs"] },
  "exceptions": [],
  "limits": {
    "new_file_lines": 300,
    "pr_added_lines": 400,
    "pr_changed_files": 20,
    "large_file_bytes": 102400,
    "baseline_max_entries": 0,
    "structural_baseline_max_entries": 0
  },
  "mode": "report_only",
  "enforce_by": "YYYY-MM-DD"
}
```

## Acceptance connections (which AB rows apply here, and where each row's positive/negative case lives)

| AB | applies | positive case | negative case |
|---|---|---|---|
| AB-01 | yes |  |  |
