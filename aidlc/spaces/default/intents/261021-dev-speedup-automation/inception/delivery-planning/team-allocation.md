# 席の割り当て（Team Allocation）

出典: 体制の記録（`ideation/team-formation/mob-composition.md`）、Unit（`inception/units-generation/unit-of-work.md`）、この段の答え（`delivery-planning-questions.md`）、Approval & Handoff の答え（Onza の席が Onza を担う）。

Bolt は、作る 1 回分の単位です（1 つの Bolt = 1 つの Unit）。ここでいう「席」は、GitHub とこの Mac の上で動く既存の AI の担当（Claude Code・Codex）です。新しい席は足しません。

## Bolt ごとの担当

| Bolt | Unit | 作る（実装） | 設計の下書き | 監査 | 統合 | Owner の手 |
|------|------|--------------|--------------|------|------|------------|
| B1 | U1 u1-skeleton | shirube の実装の席（記録の PR・承認の記録の PR・kit の版上げの PR も作る） | arc（この会話で Owner が確認） | devauditor（記録の PR・承認の記録の PR は bytes の一致も監査） | suite-lead | shirube の保護面の 1 本の PR（own-code の予算の改めを含む）の exact-head 1 回 |
| B2 | U2 u2-metrics | shirube の実装の席 | arc | devauditor | suite-lead | — |
| B3 | U3 u3-approval-records | shirube の実装の席 | arc | devauditor | suite-lead | — |
| B4 | U4 u4-gate-judgements | shirube の実装の席 | arc | devauditor | suite-lead | — |
| B5 | U5 u5-plan-admission | shirube の実装の席 | arc | devauditor | suite-lead | — |
| B6 | U6 u6-dist-aun | aun の実装の席 | arc | devauditor | suite-lead | aun の保護面の exact-head 1 回 |
| B7 | U7 u7-dist-onza | Onza の席 | arc | devauditor | suite-lead | onza の保護面の exact-head 1 回 |

- 作る席・監査の席・統合の席は、すべて別の席。作る人が自分の作業を監査・承認・統合しない（`team-practices.md`）。
- 設計の段（Functional Design など）は、arc が問いの file に下書きし、この会話で Owner が確認・承認する（iyasaka-arc#49 6329978835）。
- 同じ席に 2 つの Bolt を同時に渡さない。shirube の実装の席は B1〜B5 を順に作る。B6 と B7 は別の席なので、並べて進められる。

## 席の重さ

| 席 | 受け持つ Bolt | 見立て |
|----|---------------|--------|
| shirube の実装の席 | B1〜B5（5 つ） | 一番重い。順に進めるので、Owner の決定や監査を待つ間に B5 を入れる |
| aun の実装の席 | B6 | 軽い（配布だけ）。AUN 自身の作業と重ならない時に受け持つ |
| Onza の席 | B7 | 軽い（配布だけ）。Onza の Inception と重ならない時に受け持つ |
| devauditor | 全 Bolt の監査、門の FAIL の分類 | B1 の後、分類の書き込みが増える |
| suite-lead | 全 Bolt の統合 | 毎回、作者と別の席として統合する |
| arc | 設計の下書き、切り替えの伺い、#49 の記録 | 設計の段ごとに下書きが要る |
| Owner | 4 回の決定（予算の改めは B1 の 1 回に入れた = Q10）、この会話の承認 | 上限 6 回 |

## 席どうしの関わり方

- arc → 実装の席: 承認された設計の記録と作業指示を GitHub で渡す。
- 実装の席 → devauditor: 監査の依頼（`sds-audit-request/1`）。
- devauditor → suite-lead: 監査の返却（`sds-audit-review/1`）の PASS で統合へ。
- arc → Owner: 切り替えや予算の決定を、まとめて 1 回で伺う。
- 記録の正本は GitHub の Issue と PR。chat には要点だけを書く。
