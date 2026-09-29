<!-- Shirube technical design = the `arc` seat's output (company-dev-os/PLACEMENT.md). One page per unit, in the implementing repository's docs/design/. P3: decisions go to an ADR (SRC-M-05); one-page design and Walking Skeleton are candidates applied as 社内条件. -->
# <unit> — technical design (arc)

- requirements_ref: <Issue URL + sha256 of the requirement sheet>
- adr_ref: <docs/adr/ADR-NNN-….md, or "none" when no decision is recorded>
- adopted claims declared (baseline ADR v7 @ <commit>): <SRC-M-05 / SRC-M-07 …>
- status: <before the code / after the code (say which head, and that the code follows the design from here)>

## Technical Design

<!-- one paragraph: the mechanism, the alternative not taken and why (details in the ADR) -->

## Target Modules / Files

-

## Data / API / Contract Impact

<!-- inputs / outputs, schemas, profile keys, workflow contract: what changes and what stays the same -->

## PR Breakdown and Implementation Order

1. <!-- one PR per concern; additions within the profile's PR budget (default 400 lines / 20 files) -->

## Test Strategy (unit → contract → acceptance; qa and check rows per PLACEMENT)

| ID | Given | When | Then | who / evidence |
|---|---|---|---|---|
| A1 = <acceptance ID> |  |  |  | unit / contract [検証済 or NOT_RUN] |
| qa |  |  |  | technical practical check on the real environment (run URL) |
| check |  |  |  | human practical acceptance (who, what they read) |

## Risk Level

<!-- R0–R4; protected surfaces; failure → detection → containment → recovery -->

## Instruction to the repo's implementer

<!-- implementer seat id; what to build in which order; what not to change; stop and return to arc when a decision outside this page is needed -->
