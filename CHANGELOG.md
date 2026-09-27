# Changelog

All notable changes to this repository are recorded here (one entry per version; the format follows a plain
"added / changed / removed" list — Keep a Changelog is a candidate in the baseline ADR, not an adopted rule).

## 0.1.1 — unreleased

### Changed
- AB-05 (PR size) is declared pull_request-only: on a push to main the step prints `NOT_APPLICABLE` instead of failing the merge of an already-reviewed PR (suite-lead #48 5854299519). No threshold changed; every other check still runs on push.

## 0.1.0 — unreleased (first PR)

### Changed after the second independent review (R01–R03)
- marker suppressions are judged by gitleaks itself (second pass with `--ignore-gitleaks-allow`) and checked by `secret-suppressions.mjs` against path-bound, expiring exceptions; `review_by` must be a real calendar date; renamed files are checked on their new path by the large-file and config guards; JSX parses in both ESLint runs

### Changed after the first independent review (B01–B07)
- tools are checked out at the callee's identity (`job.workflow_repository` / `job.workflow_sha`) and verified; `targets-coverage` added; ESLint configs read files / ignores / parser from the profile (global ignores, TS parser required when adopted); limits validated; exceptions path-bound with kind / reason / issue / expiry, documentation mentions excluded; large-file guard covers every extension (lockfiles and allow-list exempt); baseline accepts 0 after a ratchet; PR size reads NUL-separated numstat / name-status (renames, unicode, binary deletions); ruff / vulture pinned

### Added
- W1 hygiene: reusable workflow `hygiene.yml` (file length vs baseline, PR size, large files + secret-suppression
  guard, jscpd inventory guard, knip, dependency-cruiser, ESLint structural run, ESLint guard-only run, gitleaks 8.30.1
  pinned by sha256, optional ruff / vulture)
- scripts: `lines-baseline`, `pr-size`, `large-files`, `jscpd-guard`, `own-code-budget`, shared `lib`
- configs: `structural-only.config.mjs`, `guard-only.config.mjs`, `knip.template.jsonc`, `dependency-cruiser.template.cjs`
- templates: PR, Issue, ADR, hygiene profile, runbook, owner decision, one-page spec, AGENTS overlay
- docs: README, boundary, threats, ADR-001, spec-w1
- self-application: `ci.yml` runs tests, the own hygiene workflow (with `.dependency-cruiser.cjs`, `knip.jsonc` and the profile of this repository) and the 1,500-line own-code budget
