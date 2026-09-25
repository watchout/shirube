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
  by machine yet); whether this repository becomes public (removes the read token)

## Pre-accept proofs

- Step 1 問題定義: [検証済] anti-bloat v5 §1–§3 (iyasaka-arc, PASS 5827971404)
- Step 2 Investigation: [検証済] ADR-001 Step 2
- Step 5 Prototype smoke: [検証済] `npm test` 21/21, lints, knip and depcruise on this repository; consumer AB-14 NOT_RUN
- Evidence labels: 採用 / 候補 は baseline ADR の出典確認列に従う

## Requirements (EARS — SRC-M-02; patterns chosen per requirement)

| ID | requirement | pattern |
|---|---|---|
| R1 | The workflow shall run every check listed in the profile against the PR head and fail the job on the first failing check. | ubiquitous |
| R2 | When a check cannot observe its input (missing profile, git failure, tool not startable), the workflow shall fail with `UNOBSERVABLE`, never pass. | unwanted |
| R3 | When a tracked file not in the baseline exceeds `new_file_lines`, or a baseline file exceeds its value, the check shall fail. | event |
| R4 | When a baseline file shrank and the baseline was not lowered, the check shall fail unless run with `--ratchet`, which only lowers values. | event |
| R5 | When the PR adds more than `pr_added_lines` lines or changes more than `pr_changed_files` files (lockfiles, generated and deletion-only files excluded), the check shall fail. | event |
| R6 | While the scan targets contain no tracked files, the duplication check shall fail; while all files are shorter than 10 lines, it shall pass and print the inventory. | state |
| R6b | When a source file under the targets is not covered by the profile language (or the python input), the coverage check shall fail and name it. | event |
| R6c | When a profile limit is not an integer in range, or the include set matches no tracked file, the check shall fail (`UNOBSERVABLE` / `FAIL`), never pass. | unwanted |
| R7 | The guard-only ESLint run shall run with `--no-inline-config --max-warnings 0` and shall treat an expired `TODO [date]` as an error on pull requests. | ubiquitous |
| R8 | The gitleaks binary shall be verified against a pinned sha256 before use; a mismatch shall fail the job. | ubiquitous |
| R9 | If a change adds `gitleaks:allow` to a code or config file, or edits a gitleaks config / ignore / baseline file, without a path-bound, unexpired `profile.exceptions` entry of the right kind, the guard shall fail; mentions in documentation shall not count. | unwanted |
| R11 | The scripts shall be fetched from the callee's own repository and commit (`job.workflow_repository` / `job.workflow_sha`) and verified before use. | ubiquitous |
| R10 | This repository's own code (scripts, workflows, configs) shall stay within `own_code_lines` (1,500). | ubiquitous |

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
| AB-18 b/c | `gitleaks:allow` added without / with a profile exception | large-files | FAIL / PASS | yes |
| OWN-01 | own code 1,600 lines / 1,500 lines | own-code-budget | FAIL / PASS | yes |
| S8 | workflows contain `continue-on-error`, `\|\| true`, `--if-present` | contract test | FAIL | yes |

## Protected surfaces and failure handling

- protected: repository Actions access, read token, required-check registration in consumers (owner)
- failures: see `docs/threats.md` T1–T9
