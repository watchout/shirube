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
| T5 | a secret is committed, or its detection is suppressed by a marker or a config change | no secret in history; every suppression is a registered, path-bound, unexpired exception | gitleaks (pinned) normal scan; a second scan with `--ignore-gitleaks-allow` lists marker-hidden findings and `secret-suppressions` checks each against the profile; `large-files` guards `.gitleaks*` changes | reject; registered exceptions pass; documentation that merely mentions the marker hides nothing and passes | detection 0 is not proof of absence; rotate on any real leak | AB-18 |
| T6 | the reusable workflow runs a different version than the one pinned, or fetches the caller's commit by mistake | tools come from the callee's own commit | checkout at `job.workflow_repository@job.workflow_sha` and a verify step (repository = watchout/shirube, tools HEAD = job.workflow_sha); contract test forbids `github.workflow_sha` | job fails | a consumer pinning a branch instead of a SHA (README forbids; W4 checks later) | AB-14 |
| T10 | source files outside the profile language are silently skipped by the lints (e.g. `.ts` in a JS profile, `.py` without the python input) | every source file under the targets is covered or the job fails | `targets-coverage` | reject; declare the language or exclude the path with a reason | unknown extensions are not source and are not checked | B03 |
| T7 | the consumer cannot call or check out this repository (private Shirube: public consumers are refused by GitHub, private consumers need the access setting and a read token) | fail closed, not open | the call is refused / the checkout step fails the job | owner makes this repository public, or (private consumers only) sets Actions access and places the read token | none | — |
| T11 | the consumer's dependencies are not installed from its lockfile (wrong package manager, or a lockfile-less install) so the tool versions differ from the ones reviewed | tools run at the consumer's locked versions | `package-manager` input: `npm ci` / `bun install --frozen-lockfile`, any other value exits 2; `npm install` is forbidden by the contract test | job fails | the lockfile itself is the consumer's responsibility (T10) | AB-24 |
| T13 | existing excess frozen in a baseline is raised by hand to let a change through | baselines only go down | `--ratchet` never raises and `--init` writes only when no baseline exists; entry ceilings in the profile; a raised value is visible as a `.hygiene/*.json` diff in the PR | the reviewer rejects; a justified raise is an owner line (W3 verifies it later) | until W3, a hand-raised value passes the machine (same as T4) | AB-20, AB-06 |
| T12 | a root-level entry point is silently outside the scan (a `targets` entry that is a file matched nothing in the inventory while jscpd scanned it) | what is counted is what is scanned | `targetGlobs`: a tracked file is its own glob, a missing path fails the inventory | reject | — | AB-23 |
| T8 | a large generated file or log is committed | repository stays source-only | `large-files` (every file over 100KB, whatever the extension; lockfiles and allow-listed paths exempt) | reject | an allow-listed path can still grow | AB-10 |
| T9 | a check crashes (git error, missing profile) | never a silent PASS | exit 2 + `UNOBSERVABLE` line | job fails | — | AM-06 |

## Non-functional questions answered for W1

- Availability: the job depends on GitHub Actions and the pinned tools; no service of our own runs.
- Cost: one Ubuntu job per PR; gitleaks binary download ~10MB per run (cache later if it matters; not now — YAGNI is a
  candidate, the decision is ours).
- Data: no secrets held, no data stored; reports are written to `.hygiene/jscpd/` in the job workspace only.
- Recovery: re-run the job; roll back by pinning the previous commit of this repository (runbook template).
