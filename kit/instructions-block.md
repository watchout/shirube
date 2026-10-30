<!-- sds-v2:start -->
## Development standard: SDS-V2 (pinned)

This repository follows SDS-V2 at watchout/shirube@<SHIRUBE_COMMIT>. Procedure: `docs/process/ai-dlc.md`; audit method and item sets: `docs/sds/audit-method.md`; distribution and the single required check: `docs/sds/distribution.md` (all at that commit).

- Risk R0–R4 decides depth: R0/R1 machine checks only; R2 one independent audit after implementation; R3/R4 audits plus the Owner's decision bound to the exact head. Protected surfaces (workflows, required checks, secrets, deploy, DB migration, pricing, publication, authority) always need the Owner.
- The maker never audits, approves or merges its own work. Audit requests use `sds-audit-request/1` (skill `sds-audit`).
- Every PR body carries one `json sds-pr` block (see `.github/pull_request_template.md`); the `sds-gate` status checks only the structural facts that `docs/sds/distribution.md` §4 lists at the pinned commit: risk label, changed paths and the R2+ audit receipt, plus plan binding (the PR names an ADMITTED delivery-plan node and the control_handoff that allows its paths) once the pinned gate carries judgment 4, report-only until the Owner raises it per repository; until then the merge seat checks the handoff digest and allowed paths by hand (§4.1); and design binding (an R2+ PR that rests on a design version names it, and that version has no blank open decision, no missing or mismatched approval record and no main connection out of order; if the design lists `placements`, every changed path is inside them (5.9); a unit design record, `approval.kind: unit_design`, is not approved by the gate: it is recorded NOT_CHECKED, never PASS (5.3u), and the merge seat checks the audit of its design PR by hand (§4.1)) once the pinned gate carries judgment 5, staged by `design_binding_mode` in the base pin, with the merge seat checking it by hand until it blocks (§4.1); set exactly one `risk:R0`..`risk:R4` label.
- Record work state in Issues and PRs, not in files in this repository. Every handoff states `next_action`.
- The version in use is `.shirube/sds-pin.json`. Change it only through a kit PR.
<!-- sds-v2:end -->
