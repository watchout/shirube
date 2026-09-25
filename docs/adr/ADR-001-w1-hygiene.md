# ADR-001 — W1 hygiene: a reusable workflow plus five small scripts, not a framework

- Status: proposed（独立レビュー待ち）
- Approver(s): pending
- Target: handover v5 §1 W1 / C1 / T1 / SR; anti-bloat v5 §4.1, §7 AB-01..17 (+ AB-18 proposed in v6)
- Effective: merge commit of the first PR; consumers adopt by pinning a commit

## Pre-accept proofs

- Step 1 問題定義: [検証済] iyasaka-arc#48 — anti-bloat v5 PASS (5827971404), handover v5 (4e7c215d) §10-1 "W1 first"
- Step 2 Investigation: [検証済] tool semantics from the pinned originals (SRC-W1-01..10: jscpd exit codes and
  `--fail-on-empty`, knip exit 0/1/2 and `--production`, depcruise exit = error count, ESLint `--no-inline-config`,
  eslint-comments rule ids and `/configs` export, unicorn `checkDatesOnPullRequests` default false, gitleaks
  `--exit-code` default 1); gitleaks 8.30.1 checksums fetched from the release
- Step 5 Prototype smoke: [検証済] 21 unit tests against real git repositories (AB-01, 05, 06, 08, 10, 18 b/c, OWN-01,
  workflow contract, S8, and the review counterexamples B02–B07 / B03 coverage and ESLint-profile) pass locally; both
  ESLint runs, knip and depcruise pass on this repository. Real required-check behaviour in a consumer (AB-14) is NOT_RUN
  until the first consumer switch
- Evidence labels: 外部手法の採用は baseline ADR の出典確認列に従う（採用 = カードあり、候補 = 未確認）

## Context

Shirube's previous home (`ai-dev-framework`) grew to 77 scripts / 50 CLI commands / 28 schemas while its own
line-length rules stayed commented out. The owner decided to rebuild by selective migration into this repository
with an own-code budget of 1,500 lines and to start with the hygiene checks (W1), then migrate one consumer at a time.

## Decision

1. **Off-the-shelf first.** Duplication, unused code, dependency direction, function size, exception comments and
   secrets are checked by existing tools (jscpd, knip, dependency-cruiser, ESLint + two plugins, gitleaks). We write
   only what they do not do: numeric file-length baseline with a one-way ratchet, PR size with exclusions, the
   inventory guard around jscpd, the large-file / suppression guard, the own-code budget.
2. **One reusable workflow, called by commit SHA.** Consumers call `hygiene.yml@<sha>`; the workflow checks out this
   repository at the callee's own identity (`job.workflow_repository` / `job.workflow_sha` — the `github` context belongs
   to the caller, so `github.workflow_sha` would fetch the caller's commit; review B01) and verifies both before use (T6).
3. **Two ESLint runs.** A structural run (limits; described disables allowed) and a guard-only run with
   `--no-inline-config --max-warnings 0` (exception rules; inline overrides ineffective). The same rule is never in both.
4. **The profile is one Markdown page with one JSON block.** People read the page; scripts and both ESLint runs read the
   block (files, ignores, parser, limits, exceptions). Limits are validated (integers), exceptions are path-bound with a
   kind, reason, issue and expiry, and the clock is an input (`--today`). No second declaration file (S3).
5. **Fail closed everywhere.** Exit 2 / `UNOBSERVABLE` for anything that cannot be observed; no `continue-on-error`.
6. **Self-application.** This repository runs its own tests, its own hygiene workflow and its own budget (SR / K7).

## Consequences (including what gets worse)

- Consumers must keep the tools in their own lockfile and add three files (profile, knip.jsonc, .dependency-cruiser.cjs).
- Python coverage is thinner: ruff (C901, PLR0915) and vulture only; no dependency-direction check (limit recorded).
- Cross-repository checkout needs a read token while this repository is private (owner decision), and Actions access
  must be opened to the organization (owner decision). Until then the workflow cannot be called from consumers.
- Baseline growth (new entries, raised values) is a hand edit that W1 only bounds (`baseline_max_entries`); the owner
  line that authorizes it is verified by W3, not yet built.

## Deviations from the anti-bloat design (recorded, not hidden)

| item | design v5 | here | why |
|---|---|---|---|
| `no-restricted-disable` list | `comments/*` (plugin alias) | `@eslint-community/eslint-comments/*` | disable comments name the full plugin id; the alias would never match |
| gitleaks version | "≥ 8" | 8.30.1 pinned with the linux_x64 sha256 | reproducibility; upgrade is a normal PR with a new checksum |
| knip / depcruise steps | always run | `test -f <config> && …` | a missing config is exit 1 (fails), never skipped; keeps AB-08 |
| secret suppression guard | AB-18 (v6 proposal) | implemented in `large-files.mjs`; exceptions are path-bound and expire; documentation mentions are not suppressions | small, same diff input; removed if AB-18 is rejected |
| large files | "100KB 超の非ソース" | every file over the limit fails unless it is a lockfile or allow-listed in the profile with a reason | an extension list exempted `.txt` / `.json` logs (review B05) |
| coverage | — | `targets-coverage` fails on `.ts` / `.py` files the profile / python input do not cover | a missing parser silently shrank the lint to JS (review B03) |
