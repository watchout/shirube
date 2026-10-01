<!-- Shirube requirement sheet = the `spec` seat's output (company-dev-os/PLACEMENT.md). Reuse information in the Issue/PR; risk/protected scope determines review depth. Candidate revision: AI-DLC P1/P2 dialogue; EARS/BDD retained, Working Backwards optional. Activate only after independent audit and adoption. -->
# <unit> — requirement sheet (spec)

Lifecycle candidate: [AI-DLC procedure §§1–4,9](https://github.com/watchout/shirube/blob/7fa597393d32738a548d9d882b6b930689b96a60/docs/process/ai-dlc.md). Record the adopted lifecycle/baseline commit and claims (AI-00/12, SRC-M-02/03 as applicable), with adoption / independent check refs.
Seat: spec = <seat id>. <!-- a stand-in author says so here and removes the note when spec endorses -->
Risk / applicable profile: <!-- R0-R4; protected scope overrides risk; no separate sheet required for an existing-design R0/R1 change -->
Change entry: <!-- new / addition / fix; reason, target/version, priority, affected units/contracts; reuse unchanged requirements -->
Dialogue evidence: <!-- owner words, observed facts, assumptions/open questions, who confirmed which version; silence is not agreement -->

## Feature Goal
<!-- one sentence: who gets what improvement -->
## Target User
<!-- the people or seats who notice the change -->
## Business / Operational Reason
<!-- the observed problem with its evidence (run URL, measurement, owner words), not a wish -->
## Main Flow
1.
Unit / iteration mapping: <!-- requirement IDs → responsible units, dependencies, first integrated slice and observable completion; a PR is not automatically a Unit/Bolt -->
## Acceptance Criteria (EARS; each row is an acceptance ID; many-to-many links to the necessary tests/evidence; all adopted IDs remain covered)
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
Evidence identity: <!-- target SHA, producer/executor, check/policy version, settings/environment, observed_at, validity/invalidation; UNKNOWN is not acceptance -->
Parent acceptance: <!-- the parent's real-environment/outcome evidence; child PASS alone is insufficient -->
## Request to arc (technical design, when a new decision is needed)
<!-- what arc must decide; open questions to carry; constraints that are not negotiable -->
