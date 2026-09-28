# Changelog

All notable changes to this repository are recorded here (one entry per version; the format follows a plain
"added / changed / removed" list — Keep a Changelog is a candidate in the baseline ADR, not an adopted rule).

## 0.2.0 — unreleased (part a: baseline rule + structural; part b adds clones and unused code)

### Added
- `scripts/hygiene/baseline.mjs`: the one introduction-baseline rule (frozen at introduction, only goes down, `--init` once, `--ratchet` lowers or removes, entry ceiling). Owner decision D0 extends anti-bloat v5 §4.1 "既存超過の扱い" beyond file length.
- `scripts/hygiene/structural-baseline.mjs` (AB-20, R14): runs the structural ESLint config and judges per-file violation counts against `.hygiene/structural-baseline.json`; a parse error or an empty target is UNOBSERVABLE. Profile limit `structural_baseline_max_entries`.
- `lines-baseline.mjs --init` (AB-06b).

### Changed
- the workflow's structural step calls `structural-baseline.mjs` instead of ESLint directly (same config, same thresholds).
- `lines-baseline.mjs` uses the shared rule; `--ratchet` now also removes the entry of a deleted file (before: hand edit).

## 0.1.2 — unreleased

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
