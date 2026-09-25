# Threats, failures and the non-functional questions (W1)

Internal requirement from handover v5 §12 (structure / non-functional): a table of what can go wrong and how it is
detected and contained. STRIDE and the Well-Architected questions are candidates in the baseline ADR (source
confirmation pending); the rows below are our own, tied to acceptance rows.

| # | cause | protected invariant | detection | containment / recovery | residual risk | AB |
|---|---|---|---|---|---|---|
| T1 | a PR loosens a threshold and passes with the loosened value | the adopted baseline decides, not the PR | SR-01: review compares with the previous adopted config; `--no-inline-config` guard run | reject; re-run with the adopted config | a reviewer approving the loosened value knowingly (independent review, SR-02) | AB-12 |
| T2 | an exception comment hides an expired TODO | expiry is enforced on PRs | guard-only run with `checkDatesOnPullRequests: true` and `no-restricted-disable` | reject | Python / non-lint files rely on the profile's review date (Q3) | AB-07 |
| T3 | the scan silently analyzes nothing (wrong targets, all files ignored) | an empty scan is not a pass | `jscpd-guard` inventory; knip exit 2 without config; depcruise error without config | FAIL / UNOBSERVABLE | inventory counts files, not semantic coverage | AB-08 |
| T4 | a file shrinks, the baseline is not lowered, later growth is accepted | baselines only go down | `lines-baseline`: stale baseline fails; `--ratchet` writes the lower value | reject until ratcheted | hand-raised baseline needs an owner line (W3 later) | AB-06 |
| T5 | a secret is committed, or its detection is suppressed | no secret in history; suppressions are registered | gitleaks pinned by sha256; `large-files` guard for `gitleaks:allow` / `.gitleaks*` changes | reject; registered exceptions pass | detection 0 is not proof of absence; rotate on any real leak | AB-18 |
| T6 | the reusable workflow runs a different version than the caller pinned | tools come from the calling workflow's own commit | checkout at `github.workflow_sha`; the tools commit is printed in the job log | — | a consumer pinning a branch instead of a SHA (README forbids; W4 checks later) | AB-14 |
| T7 | the consumer cannot check out this private repository | fail closed, not open | checkout step fails the job | owner sets Actions access / read token | none | — |
| T8 | a large generated file or log is committed | repository stays source-only | `large-files` (100KB non-source) | reject | source-typed extensions are not size-checked | AB-10 |
| T9 | a check crashes (git error, missing profile) | never a silent PASS | exit 2 + `UNOBSERVABLE` line | job fails | — | AM-06 |

## Non-functional questions answered for W1

- Availability: the job depends on GitHub Actions and the pinned tools; no service of our own runs.
- Cost: one Ubuntu job per PR; gitleaks binary download ~10MB per run (cache later if it matters; not now — YAGNI is a
  candidate, the decision is ours).
- Data: no secrets held, no data stored; reports are written to `.hygiene/jscpd/` in the job workspace only.
- Recovery: re-run the job; roll back by pinning the previous commit of this repository (runbook template).
