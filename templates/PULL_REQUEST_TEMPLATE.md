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

## Machine-readable facts (sds-preflight reads exactly one block like this; docs/sds/distribution.md §4)

```json sds-pr
{
  "schema": "sds-pr/1",
  "risk_class": "R1",
  "control_source_ref": { "url": "https://github.com/watchout/<repo>/issues/<n>#issuecomment-<id>", "sha256": "<sha256 of that comment body>" },
  "changed_paths": ["<every path in the diff>"],
  "forbidden_paths": ["<globs this change must not touch>"],
  "audit": { "request": "<R2+: request comment URL>", "request_sha256": "<request body sha256>", "review": "<review comment URL>" },
  "owner_decision": "<R3/R4 or protected path: owner decision comment URL with exact_head>"
}
```

Delete `audit` below R2 and `owner_decision` when not required. Protected paths come from `.shirube/sds-pin.json` on the base branch, not from this block.

## The four questions (anti-bloat v5 §9)

- Q1 追加・変更・削除する各動作は受入条件（Issue）のどれを満たすか。既存で足りないか。繰り返しはないか。削減なら維持する受入 ID と影響する既存試験（正常・異常・回復）はどれか:
- Q2 同じ責任・同じ正本を持つ既存の場所は？ 第二の書き手・第二の判断経路を作っていないか:
- Q3 置き換えなら: 置換元・今の利用者・廃止条件・期限は？ 恒常の契約・復旧経路なら再評価日は？:
- Q4 新しい抽象・層・wrapper は現契約・保護境界・試験分離に必要か（理由つきなら 1 例目でも可）。将来推測だけではないか:

## Evidence

- commands run and results (exact head):
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
