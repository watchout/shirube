# Changelog

All notable changes to this repository are recorded here (one entry per version; the format follows a plain
"added / changed / removed" list — Keep a Changelog is a candidate in the baseline ADR, not an adopted rule).

## Unreleased — templates only (no workflow, script or config change)

### Added
- `templates/requirement-sheet.md` (the `spec` seat's eight items), `templates/technical-design.md` (the `arc` seat's eight items with qa / check rows in the test strategy) and `templates/RFC.md` (one question, default proposal, decider), aligned with `company-dev-os/PLACEMENT.md` and baseline ADR v7 P1–P3 / P9 (rebuild table v1.6 row DS (a)–(c); suite-lead iyasaka-arc#48 5885758501 / 5885895032).

### Changed
- `templates/PULL_REQUEST_TEMPLATE.md`: `requirements_ref` / `design_ref` / `adr_ref` lines (an implementation PR without a requirement sheet and a design is not merged) and an eight-item review checklist in the range of the Google Code Review Guidelines (SRC-M-06); tool-checked items are named, not re-read by hand.

### Removed
- `templates/spec-1page.md`: it mixed the requirement sheet and the design on one page; replaced by the two templates above (one place per artifact).

## 0.1.3 — unreleased

### Changed
- `jscpd-guard.mjs` passes the inventory's files to jscpd as explicit paths (plus `--format` naming their formats) so the real scan is exactly the inventory (AB-25, AB-26, R6d). Before, jscpd received the target directories and also scanned bash / sql / markdown / text: on the first consumer the inventory said 91 clones (TS / JS) while the scan reported 109 (aun, agent-comms-mcp#977 5883707313). The first 0.1.3 head passed `--format` only; that maps extensions many-to-one, so a narrowed inventory (`mjs` only) let `.js` / `.mts` / `.es6` duplicates back into the scan (devauditor AUD-SHIRUBE7-EXTSET-001). The summary now reports jscpd's `sources` beside `files`. No threshold changed.

## 0.1.2 — released as tag v0.1.2 (`fda19c21`)

### Added
- `package-manager` input (`npm` | `bun`): dependencies are installed from the consumer's lockfile with `npm ci` or `bun install --frozen-lockfile`; any other value exits 2. `bun-version` input for setup-bun. The npm cache of setup-node is used only for npm (AB-24, R12). Reason: the first consumer (agent-comms-mcp) has only `bun.lock`.
- `targets` entries are normalized (`./x`, `x/`, `a//b`) and each must be a tracked file or a directory with tracked files; a missing or non-relative entry fails even beside valid ones (`resolveTargets` in `lib.mjs`; devauditor AUD-SHIRUBE3-TARGET-PATH-001 / -ENTRY-002)
- `targets` may name tracked files, not only directories (`targetGlobs` in `lib.mjs`, used by the jscpd inventory and targets-coverage), so a root entry point such as `server.ts` is counted and scanned as the same set (AB-23, R13).

### Changed
- README / ADR-001 / threats T7 corrected: while this repository is private, GitHub allows its reusable workflows to be called only from private repositories of the same account; a public consumer needs this repository to be public, a token does not help. The 0.1.0 text said "org repositories".

## 0.1.1 — included in tag v0.1.0 (`ab15006a`, no separate tag)

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
