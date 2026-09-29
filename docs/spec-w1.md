# W1 hygiene — one-page specification

## Who and what improves

- user: implementation seats, reviewers and the owner of IYASAKA repositories
- the change they notice: a defective PR (bloat, duplication, unused code, wrong dependency direction, hidden
  exception, committed secret, oversized diff) is stopped by a required check; a correct PR passes without an extra
  approval; reviewers spend their time on meaning (Q1–Q4), not on counting lines
- success measure: AB-14 in each consumer (defective PR rejected, correct PR allowed); burden measure: number of
  owner decisions per routine PR (target 0), review round-trips caused by mechanical findings
- out of scope: execution, delivery, recovery, memory; acceptance matrix (W2), owner gate (W3), declaration
  consistency (W4), scope check (W5), seat readback (W6)
- open questions kept: how baseline growth is authorized before W3 exists (owner line in the PR body, not verified
  by machine yet); whether this repository becomes public (0.1.2: a public consumer cannot call a private Shirube at
  all, so the first consumer needs it — owner decision D1 in iyasaka-arc `2026-09-28-shirube-first-consumer-switch.md`)

## Pre-accept proofs

- Step 1 問題定義: [検証済] anti-bloat v5 §1–§3 (iyasaka-arc, PASS 5827971404)
- Step 2 Investigation: [検証済] ADR-001 Step 2
- Step 5 Prototype smoke: [検証済] `npm test` 25/25, lints, knip and depcruise on this repository; consumer AB-14 NOT_RUN
- Evidence labels: 採用 / 候補 は baseline ADR の出典確認列に従う

## Requirements (EARS — SRC-M-02; patterns chosen per requirement)

| ID | requirement | pattern |
|---|---|---|
| R1 | The workflow shall run every check listed in the profile against the PR head and fail the job on the first failing check. | ubiquitous |
| R2 | When a check cannot observe its input (missing profile, git failure, tool not startable), the workflow shall fail with `UNOBSERVABLE`, never pass. | unwanted |
| R3 | When a tracked file not in the baseline exceeds `new_file_lines`, or a baseline file exceeds its value, the check shall fail. | event |
| R4 | When a baseline file shrank and the baseline was not lowered, the check shall fail unless run with `--ratchet`, which only lowers values. | event |
| R5 | When the PR adds more than `pr_added_lines` lines or changes more than `pr_changed_files` files (lockfiles, generated and deletion-only files excluded), the check shall fail. | event; pull_request only — on a push the step reports NOT_APPLICABLE and does not fail (the PR was already judged) |
| R6 | While the scan targets contain no tracked files, the duplication check shall fail; while all files are shorter than 10 lines, it shall pass and print the inventory. | state |
| R6b | When a source file under the targets is not covered by the profile language (or the python input), the coverage check shall fail and name it. | event |
| R6c | When a profile limit is not an integer in range, or the include set matches no tracked file, the check shall fail (`UNOBSERVABLE` / `FAIL`), never pass. | unwanted |
| R7 | The guard-only ESLint run shall run with `--no-inline-config --max-warnings 0` and shall treat an expired `TODO [date]` as an error on pull requests. | ubiquitous |
| R8 | The gitleaks binary shall be verified against a pinned sha256 before use; a mismatch shall fail the job. | ubiquitous |
| R9 | If gitleaks, scanning with `--ignore-gitleaks-allow`, reports a finding that the normal scan did not (i.e. one hidden by a marker), and no unexpired path-bound `gitleaks-allow` exception covers its file, the guard shall fail; a gitleaks config / ignore / baseline change without a `gitleaks-config` exception shall fail. A mention of the marker that hides no finding shall pass. | unwanted |
| R11 | The scripts shall be fetched from the callee's own repository and commit (`job.workflow_repository` / `job.workflow_sha`) and verified before use. | ubiquitous |
| R10 | This repository's own code (scripts, workflows, configs) shall stay within `own_code_lines` (1,500). | ubiquitous |
| R12 | The workflow shall install the consumer's dependencies from the consumer's lockfile with the package manager named by `package-manager` (`npm ci` or `bun install --frozen-lockfile`); any other value shall fail with `UNOBSERVABLE`. | ubiquitous (0.1.2) |
| R13 | Each `targets` entry, normalized to the repo-relative form git uses (`./x`, `x/`, `a//b` → `x`, `a/b`; absolute or `..` paths rejected), shall be a tracked file (scanned as itself) or a directory holding at least one tracked file; otherwise both the duplication and the coverage check shall fail naming the entry, even when other entries are valid. | event (0.1.2) |
| R17 | When a check fails, every later check shall still run (a report-only consumer needs every result) and the job shall still fail; only a failed setup (checkout, install, refs) skips the checks. The last step shall list every check's outcome and fail on any failed, cancelled or unexpectedly skipped check. `continue-on-error` shall not be used. | event (0.1.4) |
| R6d | The duplication scan shall analyze exactly the inventory's files (tracked, covered by the profile language plus Python when requested, not excluded): they are passed to jscpd as explicit paths, with `--format` naming their formats. A file outside the inventory shall not be scanned whatever its extension, and the summary shall report jscpd's `sources` beside the inventory's `files`. | ubiquitous (0.1.3) |

## Acceptance examples (Given / When / Then — SRC-M-03; executable ones are in `tests/`)

| ID | Given | When | Then | executable |
|---|---|---|---|---|
| AB-01 | a new 320-line file | lines-baseline | FAIL "new file over limit"; 300 lines PASS | yes (tests/lines-baseline) |
| AB-05 | +450 lines / −5,000 +0 | pr-size | first FAIL, second PASS (size only) | yes |
| AB-06 | 4,194-line baseline file: same / +3 / −3 without ratchet / ratchet | lines-baseline | PASS / FAIL / FAIL / PASS and 4,191 written; 4,192 then FAIL | yes |
| AB-07 | expired `TODO [2026-01-01]` on a PR | guard-only run | FAIL (checkDatesOnPullRequests) | manual until consumer CI (recorded NOT_RUN) |
| AB-08 | no files under targets / all files < 10 lines / no knip config | jscpd-guard, knip | FAIL / PASS with inventory / exit 2 | yes (jscpd part) |
| AB-10 | 150KB `.log` / `.md` / `.txt` added | large-files | FAIL for every one; lockfile and allow-listed paths pass | yes |
| B02–B07 | review counterexamples (path-bound exceptions, invalid limits, empty include, 0-line ratchet, unicode generated path, rename into generated, binary deletions, coverage, ESLint profile) | scripts / configs | as recorded in `tests/audit-counterexamples.test.mjs` | yes |
| AB-12 | `/* eslint unicorn/expiring-todo-comments: "off" */` | guard-only run | still FAIL (inline config ignored) | manual until consumer CI |
| AB-14 | defective PR / correct PR in a consumer | real required check | rejected / allowed | NOT_RUN (first consumer switch) |
| AB-18 b/c | marker explanation only / mock value only / value + marker unregistered / value + marker registered | gitleaks 8.30.1 two-pass + secret-suppressions | PASS / FAIL (normal scan) / FAIL (guard) / PASS — confirmed end-to-end with the real binary on 2026-09-26; unit tests feed the report shape | yes (report) + e2e once |
| R02 | rename 100,000 → 105,000 bytes / rename within the limit | large-files | FAIL on the new path / PASS | yes |
| R03 | normal JSX / long JSX function + expired TODO | both ESLint runs | PASS / FAIL | yes |
| OWN-01 | own code 1,600 lines / 1,500 lines | own-code-budget | FAIL / PASS | yes |
| S8 | workflows contain `continue-on-error`, `\|\| true`, `--if-present` | contract test | FAIL | yes |
| AB-23 | `targets: src server.mjs` / `src ./server.mjs` / `./src/ server.mjs` / `server.mjs` / `missing.mjs`, `src missing.mjs`, `src ../server.mjs`, `src /server.mjs` / a root `.ts` file with a JS profile as `server.ts` and as `./server.ts` / `src missing.ts` | jscpd-guard inventory, targets-coverage | 2 files / 2 files / 2 files / 1 file / FAIL naming the entry (all four) / FAIL naming `server.ts` (both spellings) / FAIL naming the entry | yes (tests/guards) |
| AB-24 | `package-manager: npm` / `bun` / other | install step | `npm ci` / `bun install --frozen-lockfile` / exit 2 `UNOBSERVABLE`; npm cache only for npm; `npm install` never | yes (contract test); real bun consumer run = first consumer switch |
| AB-25 | JS profile: a 14-line duplicate in two `.sql` files under the targets / the same in two `.mjs` files / TS profile with `.tsx` and `.mts` duplicates | jscpd-guard | PASS, clones 0 (sql is outside the inventory and the scan) / FAIL, clones 1 / FAIL, clones 3 (mjs + tsx + mts; sql still not counted) | yes (tests/guards) |
| AB-27 | hygiene.yml: each of the 12 check steps carries `if: !cancelled() && steps.refs.outcome == 'success'` (plus its own condition) and the final `always()` step lists all 12 outcomes / a consumer run where lines-baseline fails | contract test / first consumer run (agent-comms-mcp#980: 0.1.2 left eight checks SKIPPED, run 36524256657) | PASS / large-files, jscpd, knip, depcruise, structural, guard, secrets, PR size all executed, job FAIL, outcome list printed | yes (contract) + consumer run (not observable in this repository's own CI, which passes) |
| AB-26 | JS profile narrowed to `mjs` with a 14-line duplicate in two `.js` files / TS profile narrowed to `ts` with it in two `.mts` files / JS profile with it in two `.es6` files (jscpd's own format would scan all three; devauditor AUD-SHIRUBE7-EXTSET-001); then the same duplicate in two inventory files | jscpd-guard | PASS, files 1, sources 1, clones 0 in all three / FAIL, files 3, sources 3, clones 1 | yes (tests/guards) |

## Protected surfaces and failure handling

- protected: repository Actions access, read token, required-check registration in consumers (owner)
- failures: see `docs/threats.md` T1–T9
