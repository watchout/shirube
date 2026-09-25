# Changelog

All notable changes to this repository are recorded here (one entry per version; the format follows a plain
"added / changed / removed" list — Keep a Changelog is a candidate in the baseline ADR, not an adopted rule).

## 0.1.0 — unreleased (first PR)

### Added
- W1 hygiene: reusable workflow `hygiene.yml` (file length vs baseline, PR size, large files + secret-suppression
  guard, jscpd inventory guard, knip, dependency-cruiser, ESLint structural run, ESLint guard-only run, gitleaks 8.30.1
  pinned by sha256, optional ruff / vulture)
- scripts: `lines-baseline`, `pr-size`, `large-files`, `jscpd-guard`, `own-code-budget`, shared `lib`
- configs: `structural-only.config.mjs`, `guard-only.config.mjs`, `knip.template.jsonc`, `dependency-cruiser.template.cjs`
- templates: PR, Issue, ADR, hygiene profile, runbook, owner decision, one-page spec, AGENTS overlay
- docs: README, boundary, threats, ADR-001, spec-w1
- self-application: `ci.yml` runs tests, the own hygiene workflow and the 1,500-line own-code budget
