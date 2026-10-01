<!-- Shirube technical design = the `arc` seat's output (company-dev-os/PLACEMENT.md). Reuse the existing design and explain the change in the Issue/PR for low-risk changes. P3: new decisions go to an ADR (SRC-M-05); one-page design and Walking Skeleton = candidates applied as 社内条件. -->
# <unit> — technical design (arc)

- requirements_ref: <Issue URL + sha256 of the requirement sheet>
- adr_ref: <docs/adr/ADR-NNN-….md, or "none" when no decision is recorded>
- adopted claims declared (baseline ADR v7 @ <commit>): <SRC-M-05 / SRC-M-07 …>
- status: <before the code / after the code (which head; the code follows the design from here)>
Review depth: <!-- reference the adopted policy risk table; R0/R1 no automatic LLM audit, R2 post-implementation, R3/R4 add pre-review; protected scope and explicit audit requests still apply -->

## Technical Design
<!-- one paragraph: the mechanism, the alternative not taken and why (details in the ADR) -->
## Target Modules / Files
-
## Data / API / Contract Impact
<!-- inputs / outputs, schemas, profile keys, workflow contract: what changes and what stays -->
## PR Breakdown and Implementation Order
1. <!-- one PR per concern; additions within the profile's PR budget (default 400 lines / 20 files) -->
## Test Strategy (unit → contract → acceptance; qa and check rows per PLACEMENT)
| ID | Given | When | Then | who / evidence |
|---|---|---|---|---|
| <test ID> → <acceptance IDs, many-to-many> |  |  |  | unit / contract [検証済 or NOT_RUN] |
| qa |  |  |  | technical practical check on the real environment (run URL) |
| check |  |  |  | human practical acceptance (who, what they read) |
Important invariants: <!-- normal, boundary, failure evidence for each; expected values independent of implementation; N/A with reason -->
AI feature (if applicable): <!-- model/prompt/tool/corpus versions; representative/boundary/adversarial cases; trials, pre-adopted thresholds, critical failures, variance, abstention/handoff, reevaluation triggers -->
## Risk Level
<!-- R0–R4; protected surfaces; failure → detection → containment → recovery -->
## Instruction to the repo's implementer
<!-- implementer seat id; what to build in which order; what not to change; stop and return to arc when a decision outside this page is needed -->
