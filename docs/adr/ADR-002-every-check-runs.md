<!-- Shirube ADR template (SRC-M-05: context / decision / status / consequences; numbers are never reused). -->
# ADR-002 — Every check runs after an earlier failure; the last step re-reads every outcome

- Status: proposed（独立レビュー待ち）
- Approver(s): pending（devauditor の独立レビュー、merge = suite-lead。採択コメントの URL + sha256 をここに記録する）
- Target: spec R17 / AB-27 (0.1.4); handover v5 §1 W1; requirement sheet `docs/requirements/0.1.4-every-check-runs.md` (spec seat), technical design `docs/design/0.1.4-every-check-runs.md` (arc)
- Effective: tag v0.1.4; consumers adopt by pinning (agent-comms-mcp#980 moves its pin to 0.1.4 before it merges)

## Context

On the first consumer, lines-baseline failed with 103 files and the eight later checks were SKIPPED, so a
`mode: report_only` consumer got no result at all for depcruise, knip or structure [検証済: agent-comms-mcp#980 run
36524256657; aun agent-comms-mcp#977 5884009062; suite-lead iyasaka-arc#48 5884040170]. W1 does not read the profile
mode [文献確認: switch plan v2.6 §1]; what it must do is run every check to the end and still fail the job. ADR-001
decision 5 ("fail closed everywhere, no `continue-on-error`") stays [文献確認: docs/adr/ADR-001-w1-hygiene.md].

## Decision

1. Every check step carries `if: ${{ !cancelled() && steps.refs.outcome == 'success' }}`, plus its own condition
   where it has one (PR size, Python). A failed setup still skips the checks.
2. A last `always()` step lists every check's outcome and exits 1 on any failed, cancelled or unexpectedly skipped
   check: the nine unconditional checks must be `success`, one of the two PR-size steps must be `success`, Python must
   be `success` or `skipped`.
3. `continue-on-error` stays forbidden (contract test S8). The job result is unchanged: failure whenever any check
   fails, and now also when a check has no outcome.
4. Alternative not taken: `continue-on-error: true` on each check plus an aggregate step. Rejected because GitHub then
   reports a failed step as success in the job result and the S8 test forbids the keyword [文献確認:
   tests/workflow-contract.test.mjs].

## Consequences (including what gets worse)

- A consumer sees every outcome in one run (switch plan v2.6 2-S2, "all steps recorded").
- The workflow grows by about 45 lines (own code 904 / 1,500 [検証済: own-code-budget at `f8f16f60`]). The check names
  now exist in two places (step ids and the outcome list); AB-27 pins the two lists to each other, so a check added
  without an outcome line fails the test.
- The failure path is not observable in this repository's own CI (its checks pass [検証済: run 36527824537]); the
  first negative observation is the consumer run after the pin bump (acceptance A3, NOT_RUN).

## Retired requirements (only when acceptance IDs are removed; AM-03)

| ID | reason | replaced by |
|---|---|---|
| — | none | — |
