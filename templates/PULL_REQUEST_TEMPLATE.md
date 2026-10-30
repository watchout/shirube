<!-- Shirube PR template (handover v5 §1 T1). Copy to the consumer repository's .github/pull_request_template.md. -->
## What this PR does

- cell_id / Issue: <!-- e.g. AUN-V2-TRIM-001, link to the Issue whose completion conditions this PR serves -->
- requirements_ref: <!-- adopted requirements or the same Issue/PR's scope/acceptance; URL + sha256; preserve required information without duplicating sheets -->
- design_ref: <!-- existing design plus the change, or a new design where risk/new decisions require it -->
- adr_ref: <!-- docs/adr/ADR-NNN, or "none" -->
- risk_class: <!-- R0 / R1 / R2 / R3 / R4 (docs/10 of the consumer's Control, or the profile's risk table) -->
- owner decision (only R3/R4, protected surfaces, E1–E5): <!-- URL + sha256, or "not required" -->
- execution context: <!-- reuse the existing Issue/PR: actor, target head, allowed scope, required evidence; no duplicate start form for a routine change -->
- 採用版: <!-- policy commit + declaration reference the repository adopts -->
- lifecycle_ref: <!-- adopted procedure commit + applicable sections/reused evidence; candidate: https://github.com/watchout/shirube/blob/7fa597393d32738a548d9d882b6b930689b96a60/docs/process/ai-dlc.md (requires audit/adoption) -->
- aidlc_record: <!-- path of the AI-DLC record this PR follows (under aidlc/); "none" if there is none -->

## Machine-readable facts (sds-gate reads exactly one block like this; docs/sds/distribution.md §4)

```json sds-pr
{
  "schema": "sds-pr/1",
  "risk_class": "R1",
  "changed_paths": ["<every path in the diff; for a rename, both the old and the new path>"],
  "fixes_pr": "<URL of the PR this one fixes>",
  "audit": { "request": "<R2+: request comment URL>", "request_sha256": "<request body sha256>", "review": "<review comment URL>" },
  "design_binding": { "design_ref": "<https://github.com/watchout/REPO/blob/40-HEX-COMMIT/PATH.md>", "design_sha256": "<sha256 of that file's bytes>", "design_id": "<design_id>", "version": 1 }
}
```

Also set exactly one label `risk:R0`..`risk:R4` equal to `risk_class`. Delete `audit` below R2. Delete `fixes_pr` unless this PR fixes an earlier PR (the gate does not read it). Delete `design_binding` unless this R2+ PR depends on a design version (judgment 5; its stage is the base pin's `design_binding_mode`). A design may list `placements` (globs, written like `protected_paths`); judgment 5.9 checks that every changed path is inside them. A design whose `approval.kind` is `unit_design` (a unit design record, approved by an independent design audit, not by an Owner decision) is named by the PR that merged it in `design_binding.design_pr`; the gate records 5.3u NOT_CHECKED for it and the merging seat checks the audit (docs/sds/distribution.md §4.1). The PR that merges such a design record writes its own `audit` in its block, after the audit request and before it is merged. A change to a protected path (`.shirube/sds-pin.json` on the base branch) counts as R4. sds-gate does not check Owner approval: for R3/R4 the merging seat confirms the owner decision for the exact head before merging.

## The four questions (anti-bloat v5 §9)

- Q1 追加・変更・削除する各動作は受入条件（Issue）のどれを満たすか。既存で足りないか。繰り返しはないか。削減なら維持する受入 ID と影響する既存試験（正常・異常・回復）はどれか:
- Q2 同じ責任・同じ正本を持つ既存の場所は？ 第二の書き手・第二の判断経路を作っていないか:
- Q3 置き換えなら: 置換元・今の利用者・廃止条件・期限は？ 恒常の契約・復旧経路なら再評価日は？:
- Q4 新しい抽象・層・wrapper は現契約・保護境界・試験分離に必要か（理由つきなら 1 例目でも可）。将来推測だけではないか:

## Evidence

- commands run and results (exact head):
- scope result vs the handoff (control_source_ref URL + sha256): paths inside / outside the allowed scope, forbidden paths touched (none or list). The merging seat confirms this before merging (docs/sds/distribution.md §4.1):
- design_judgments[] (each with a basis ref; write `[]` explicitly when none):
- deviation_ledger (reason, alternative, valid authority/expiry/compensating protection where an exception is allowed; recording alone is not permission):
- next_action:

## Review result (when required by risk/protected scope or explicit request)

- audit_ref: <!-- adopted method/item-set version; candidate: https://github.com/watchout/shirube/blob/7fa597393d32738a548d9d882b6b930689b96a60/docs/sds/audit-method.md -->
- independent checker / exact target head:
- applicable item IDs → evidence / PASS, FAIL, UNKNOWN, or justified N/A:
- blocking findings / optional improvements / unreviewed scope:
- evidence identity: producer, executor, target/check/policy versions, settings, environment, observed_at, expiry/invalidation
- invariant coverage: many-to-many acceptance/test links; meaningful normal/boundary/failure evidence; parent acceptance retained
- verdict / correction and next actor: <!-- reference the structured review and machine receipt when used; do not transcribe a second verdict -->

Reference the adopted checklist once. Do not repeat its text or rejudge valid machine results. Any mandatory acceptance, authority, safety, integrity, serious regression or required evidence failure blocks, regardless of the review axis. WARNING covers optional improvements only. Missing observations are UNKNOWN. Protected authority and independent review are not waived by a deviation note.

## Post-merge (fill after merge; "merged" is not "done" without this)

- merge commit / merged_at:
- re-check on main (same commands, main SHA) or N/A with reason:
- integration: <!-- actual shared-main SHA/build/test evidence; branch checks alone are not CI completion; material code changes require main verification, not unexplained N/A -->
- next step:
