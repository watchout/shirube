<!-- Shirube Issue template (handover v5 §1 T1). The Issue is the contract of a piece of work; no separate pack. -->
## Goal (who gets what improvement; Working Backwards, SRC-M-01)

<!-- one paragraph: the user, the change they notice, the success measure and the burden measure (manual work / waiting) -->

## Completion conditions (<= 10 acceptance leaves; each leaf names its test or evidence ID — #619 goal → leaf → work → evidence)

| # | leaf (observable) | test / evidence ID | environment |
|---|---|---|---|
| 1 |  |  |  |

## Scope

- allowed_paths (adopted by a comment from an allowed approver; the PR cannot widen this):
- forbidden_paths:
- protected surfaces touched (workflows, branch protection, secrets, schema, deploy, runtime): <!-- none / list → owner decision required -->
- risk_class:

## ADR line (only when a requirement is retired or a design decision is recorded)

<!-- ADR id, approver, target IDs, version, effective condition -->

## Stop conditions

- protected surface needed
- allowed_paths insufficient (return an amendment request instead of widening)
- a decision the contract does not settle

## Non-goals

<!-- what this Issue deliberately does not do -->
