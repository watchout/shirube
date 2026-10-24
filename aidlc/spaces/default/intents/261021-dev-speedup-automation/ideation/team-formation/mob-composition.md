# 作業の組み方（Mob Composition）: 開発の高効率化・自動化による高速開発化

出典の書き方: `[SD-Qn]` は Scope Definition、`[TF-Qn]` は `ideation/team-formation/team-formation-questions.md` の答え、`[FE-Qn]` は Feasibility、`[IC-Qn]` は Intent Capture。

## 参照した入力

- `ideation/scope-definition/scope-document.md`（完了の条件、順番の方針）
- `ideation/scope-definition/intent-backlog.md`（項目の順番、Owner の決定が要る点）
- `ideation/feasibility/feasibility-assessment.md`（結論の条件）

## 工程の受け渡し

この会話から今ある席へは、次の順に受け渡す。 [TF-Q3][TF-Q6]

| # | 工程 | 担い手 | 渡すもの | 出典 |
|---|------|--------|----------|------|
| 1 | Ideation と Inception の各段（要件定義・User Stories など） | この会話（Owner が答えと承認） | 意図・実現性・範囲・体制・要件・User Stories の記録 | [TF-Q6] |
| 2 | 設計（Inception の設計の段） | ARC が書き、この会話で Owner が確認・承認する | 承認された設計の記録と、実装席への作業指示 | [TF-Q3][TF-Q6] |
| 3 | 実装 | shirube の席、aun の席（Onza は未定） | PR | [TF-Q3] |
| 4 | 監査 | devauditor | 監査の結果 | [TF-Q3] |
| 5 | 統合 | suite-lead（作者と別の席） | 統合された PR | [TF-Q3][TF-Q4] |
| 6 | 保護面の切り替え（必須検査にする） | Owner | 決定 | [FE-Q8][SD-Q2] |

## 責任の分担（RACI）

R = 行う、A = 最終責任、C = 相談される、I = 知らされる。

| 作業 | Owner | ARC | 実装席 | devauditor | suite-lead | 出典 |
|------|-------|-----|--------|------------|------------|------|
| 範囲と優先順位の大枠 | A・R | C | I | I | I | [IC-Q12] |
| 細かい順番 | I | A・R | C | I | I | [IC-Q12] |
| Inception の各段（この会話） | A | C | I | I | I | [TF-Q6] |
| 設計 | A（この会話で確認・承認） | R | C | I | I | [TF-Q3][TF-Q6] |
| 実装 | I | C | A・R | I | I | [TF-Q3] |
| 監査 | I | I | C | A・R | I | [TF-Q3] |
| 統合 | I | I | I | C | A・R | [TF-Q3][TF-Q4] |
| 保護面の切り替え | A・R | C | I | I | I | [FE-Q8] |

- RACI のうち、R と A の置き方は答えから決まる。C と I の置き方は、答えから推した案（仮説）。 [TF-Q3][IC-Q12]

## 連絡の決まり

- 記録の正本は GitHub の Issue・PR、chat には要点だけ。 [IC-Q9]
- Owner の決定は、1 周で 6 回までに収まるよう、前もってまとめて 1 回で済む形で頼む。 [SD-Q6][TF-Q2]

## 受け入れの確認項目（席が作業を始める前に）

| # | 確認すること | 出典 |
|---|--------------|------|
| 1 | この記録（Ideation と Inception）を読んでいる | [TF-Q3][TF-Q6] |
| 2 | 完了の条件 S1-SH-01〜07 と、Owner の手 6 回の上限を知っている | [SD-Q6] |
| 3 | 範囲に入らないもの（保護面の自動化、AI-DLC 以外の新しい外部ツール、AUN を受け渡しに使うこと など）を知っている | [IC-Q6][FE-Q9][SD-Q1] |
| 4 | 個人情報を含む製品のデータに触れない | [FE-Q5] |

## Assumptions & Open Questions

- [assumption] RACI の C と I の置き方は、答えから推した案で、設計の段で ARC が見直してよい。
- [assumption] Onza の実装を担う席は、まだ決まっていない。
