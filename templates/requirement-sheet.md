<!-- Shirube requirement sheet = the `spec` seat's output (company-dev-os/PLACEMENT.md). One unit = one sheet, posted as the unit's Issue in the implementing repository. P1 = Working Backwards (SRC-M-01), P2 = EARS (SRC-M-02) + Given / When / Then (SRC-M-03). -->
# <unit> — requirement sheet (spec)

Adopted claims declared (baseline ADR v7 @ <commit>): <SRC-M-01 / SRC-M-02 / SRC-M-03 …>; confirmation refs: <source cards / independent check>.
Seat: spec = <seat id>. <!-- a stand-in author says so here and removes the note when spec endorses -->
## Feature Goal
<!-- one sentence: who gets what improvement -->
P1 PR/FAQ reference (location + version): <!-- retain both FAQs and unresolved questions -->
See [the P1 procedure](../docs/process/p1-working-backwards.md).
## Target User
<!-- the people or seats who notice the change -->
## Business / Operational Reason
<!-- the observed problem with its evidence (run URL, measurement, owner words), not a wish -->
## Main Flow
1.
## Acceptance Criteria (EARS; each row is an acceptance ID; executable rows get a test, the rest name their evidence)
| ID | criterion | pattern (ubiquitous / state / event / optional / unwanted) | evidence type |
|---|---|---|---|
| R1 | The system shall … | ubiquitous | test |
| R2 | When <trigger>, the system shall … | event | test |
| R3 | If <unwanted condition>, then the system shall … | unwanted | test / run URL |

Success measure / burden measure (manual work, waiting): <!-- what is measured, where, and the value that counts as success -->
## Non-goals
-
## Human Approval Points
<!-- protected surfaces touched (workflows, branch protection, secrets, schema, deploy, runtime) and the owner decision each needs; "none" is valid -->
## Request to arc (technical design)
<!-- what arc must decide; open questions to carry; constraints that are not negotiable -->
