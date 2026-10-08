---
name: sds-audit
description: Prepare an SDS-V2 independent audit request (sds-audit-request/1) for a PR, run the admission preflight, and check a PR before integration. Use when a PR at R2 or above needs an audit, when filling the PR's `json sds-pr` block, or before merging.
---

# sds-audit

Pinned standard: the commit in `.shirube/sds-pin.json` (`sds_commit`). Read `docs/sds/audit-method.md` at that commit.

## 1. Fill the PR block
Put exactly one fenced block with info string `json sds-pr` in the PR body: `schema: "sds-pr/1"`, `risk_class`, `changed_paths` (every path in the diff), and at R2 and above `audit {request, request_sha256, review}`. Add exactly one label `risk:R0`..`risk:R4` equal to `risk_class`. A protected path (listed in `.shirube/sds-pin.json` on the base branch) makes the change R4.

## 1.1 Kit and pin changes
Every change under `.shirube/` (the pin, `hygiene-profile.md`) and every workflow change is a protected path, so `sds-gate` treats it as R4: independent audit and the Owner's decision for the exact head. This includes wording-only edits to `hygiene-profile.md`. When applying the kit, pass the repo's own protected paths (`--protected`, e.g. `migrations/**`) — secrets, DB migrations, authority and deploy paths differ per repo and are not in the defaults.

## 2. Request the audit (R2 and above)
1. Wait for the PR's CI to finish on the exact head.
2. Post one comment on the PR with a single canonical JSON block (`JSON.stringify(value, null, 2)`):
   `schema: "sds-audit-request/1"`, `expires_at`, `author`, `reviewer {actor, github}` (never the author), `verifier_sha256` (sha256 of `scripts/hygiene/audit-admission.mjs` at the pinned commit), `targets[{id, repo, pr, head, base, checks, workflow}]` with full 40-hex SHAs, `item_set {target, path, sha256}` — an item set file inside the target head.
3. Compute the sha256 of the posted comment body and run
   `node scripts/hygiene/audit-admission.mjs --request <url> --sha256 <digest> --preflight` from the pinned shirube checkout. Only READY_FOR_REVIEW may go to the auditor. If job logs are unreadable in your environment, say so and let a seat that can read them run it.
4. Do not push to the PR until the review returns; a new head invalidates the request.

## 3. After the review
Run the same command with `--review <review url>` instead of `--preflight`. RECEIPT_ACCEPTED is admission only (`authorization: NONE`). Record it as the author's receipt, then fill `audit` in the PR block.

## 4. Before integration
- `sds-gate` status is success on the exact head, and the PR has exactly one `risk:R*` label equal to the block.
- R3/R4 or protected paths: an APPROVED owner decision names this repository and the exact head. sds-gate does not check it, and a machine cannot tell who posted it (all seats share one account); the merging seat confirms it is the Owner's decision before merging.
- The merging seat is neither the maker nor the auditor.
