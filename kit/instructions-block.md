<!-- sds-v2:start -->
## Development standard: SDS-V2 (pinned)

This repository follows SDS-V2 at watchout/shirube@<SHIRUBE_COMMIT>. Procedure: `docs/process/ai-dlc.md`; audit method and item sets: `docs/sds/audit-method.md`; distribution and the single required check: `docs/sds/distribution.md` (all at that commit).

- Risk R0–R4 decides depth: R0/R1 machine checks only; R2 one independent audit after implementation; R3/R4 audits plus the Owner's decision bound to the exact head. Protected surfaces (workflows, required checks, secrets, deploy, DB migration, pricing, publication, authority) always need the Owner.
- The maker never audits, approves or merges its own work. Audit requests use `sds-audit-request/1` (skill `sds-audit`).
- Every PR body carries one `json sds-pr` block (see `.github/pull_request_template.md`); the `sds-preflight` status checks its structural facts only.
- Record work state in Issues and PRs, not in files in this repository. Every handoff states `next_action`.
- The version in use is `.shirube/sds-pin.json`. Change it only through a kit PR.
<!-- sds-v2:end -->
