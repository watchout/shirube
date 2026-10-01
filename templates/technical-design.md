<!-- Shirube technical design = the `arc` seat's output (company-dev-os/PLACEMENT.md). Reuse existing design; record only changed decisions in an ADR. AI-DLC lifecycle revision is a candidate until audit/adoption; existing protections remain. -->
# <unit> — technical design (arc)

- requirements_ref: <Issue URL + sha256 of the requirement sheet>
- adr_ref: <docs/adr/ADR-NNN-….md, or "none" when no decision is recorded>
- lifecycle candidate: [AI-DLC procedure §§3–9](https://github.com/watchout/shirube/blob/7fa597393d32738a548d9d882b6b930689b96a60/docs/process/ai-dlc.md); adopted lifecycle/baseline commit + claims + independent confirmation: <refs>
- status: <before the code / after the code (which head; the code follows the design from here)>
Review depth: <!-- reference the adopted policy risk table; R0/R1 no automatic LLM audit, R2 post-implementation, R3/R4 add pre-review; protected scope and explicit audit requests still apply -->

## Technical Design
<!-- one paragraph: the mechanism, the alternative not taken and why (details in the ADR) -->
<!-- responsibilities, data ownership, dependencies and starting structure; apply Ports & Adapters where external coupling needs isolation, not to every class -->
## Target Modules / Files
-
## Data / API / Contract Impact
<!-- provider/consumer/owner, inputs/outputs and meanings, normal/failure/timeout/retry/duplicate behavior, trust/tenant/data boundaries, version/compatibility/migration/retirement/recovery, provider+consumer verification -->
## PR Breakdown and Implementation Order
1. <!-- one PR per concern; additions within the profile's PR budget (default 400 lines / 20 files) -->
<!-- units/requirements/dependencies → short iterations and first integrated slice; learned design changes update this reference before code; small refactorings preserve behavior with automated regression -->
## Test Strategy (unit → contract → acceptance; qa and check rows per PLACEMENT)
| ID | Given | When | Then | who / evidence |
|---|---|---|---|---|
| <test ID> → <acceptance IDs, many-to-many> |  |  |  | unit / contract [検証済 or NOT_RUN] |
| qa |  |  |  | technical practical check on the real environment (run URL) |
| check |  |  |  | human practical acceptance (who, what they read) |
Important invariants: <!-- normal, boundary, failure evidence for each; expected values independent of implementation; N/A with reason -->
Integration: <!-- updated shared-main SHA and build/tests; branches alone are insufficient; mock and real-adapter/integration evidence are distinct; broken build recovery and unmet cadence are visible -->
AI feature (if applicable): <!-- model/prompt/tool/corpus versions; representative/boundary/adversarial cases; trials, pre-adopted thresholds, critical failures, variance, abstention/handoff, reevaluation triggers -->
## Risk Level
<!-- R0–R4; protected surfaces; failure → detection → containment → recovery -->
## Instruction to the repo's implementer
<!-- implementer seat id; what to build in which order; what not to change; stop and return to arc when a decision outside this page is needed -->
