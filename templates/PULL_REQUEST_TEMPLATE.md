<!-- Shirube PR template (handover v5 §1 T1). Copy to the consumer repository's .github/pull_request_template.md. -->
## What this PR does

- cell_id / Issue: <!-- e.g. AUN-V2-TRIM-001, link to the Issue whose completion conditions this PR serves -->
- requirements_ref: <!-- the unit's requirement sheet (spec seat; Issue URL + sha256). An implementation PR without one is not merged -->
- design_ref: <!-- the unit's technical design (arc seat; docs/design/… at a commit) -->
- adr_ref: <!-- docs/adr/ADR-NNN, or "none" -->
- risk_class: <!-- R0 / R1 / R2 / R3 / R4 (docs/10 of the consumer's Control, or the profile's risk table) -->
- owner decision (only R3/R4, protected surfaces, E1–E5): <!-- URL + sha256, or "not required" -->
- 開始記録（編集前に投稿した開始記録コメントの URL）: <!-- seat id, repo/branch/head, node -v, allowed paths, time -->
- 採用版: <!-- policy commit + declaration reference the repository adopts -->

## The four questions (anti-bloat v5 §9)

- Q1 追加・変更・削除する各動作は受入条件（Issue）のどれを満たすか。既存で足りないか。繰り返しはないか。削減なら維持する受入 ID と影響する既存試験（正常・異常・回復）はどれか:
- Q2 同じ責任・同じ正本を持つ既存の場所は？ 第二の書き手・第二の判断経路を作っていないか:
- Q3 置き換えなら: 置換元・今の利用者・廃止条件・期限は？ 恒常の契約・復旧経路なら再評価日は？:
- Q4 新しい抽象・層・wrapper は現契約・保護境界・試験分離に必要か（理由つきなら 1 例目でも可）。将来推測だけではないか:

## Evidence

- commands run and results (exact head):
- design_judgments[] (each with a basis ref; write `[]` explicitly when none):
- deviation_ledger (the judgment taken, the alternative not taken, why):
- next_action:

## Review points (reviewer; P6 = Google Code Review Guidelines, SRC-M-06; the tool-checked items are not re-read by hand)

- [ ] Design: the change matches design_ref and belongs where it is put; no second writer or second decision path (Q2)
- [ ] Functionality: each acceptance ID in requirements_ref has its test or evidence; negative cases included
- [ ] Complexity: no abstraction, layer or option beyond what the contract needs (Q4); nothing built for a guessed future
- [ ] Tests: unit → contract → acceptance; a test that cannot fail is not a test; flaky ones are isolated, not retried
- [ ] Naming and comments: names say what, comments say why; exceptions (eslint-disable, gitleaks allow) carry a reason and an expiry (AB-07)
- [ ] Documentation: README / profile / ADR updated where behaviour or a decision changed; changelog entry present
- [ ] Deviations: deviation_ledger lists the judgment taken and the alternative not taken
- [ ] Style, consistency, line counts, duplication, dependency direction: checked by the tools (hygiene run URL), not re-read here

## Post-merge (fill after merge; "merged" is not "done" without this)

- merge commit / merged_at:
- re-check on main (same commands, main SHA) or N/A with reason:
- next step:
