# 役割と担い手の表（Skill Matrix）: 開発の高効率化・自動化による高速開発化

出典の書き方: `[SD-Qn]` は Scope Definition、`[TF-Qn]` は `ideation/team-formation/team-formation-questions.md` の答え、`[FE-Qn]` は Feasibility、`[IC-Qn]` は Intent Capture。

## 参照した入力

- `ideation/scope-definition/scope-document.md`（範囲に入るもの）
- `ideation/scope-definition/intent-backlog.md`（項目 IB-1〜IB-7）
- `ideation/feasibility/feasibility-assessment.md`（技術面の不確かさ）

## 必要な役割と担い手

| 必要な役割 | 対象の項目 | 担い手 | 充足 | 出典 |
|------------|------------|--------|------|------|
| 要件の決定（この会話での答えと承認） | 全体 | Owner | 足りている | [TF-Q6][IC-Q12] |
| 設計（門・計測・配布の設計） | IB-1〜IB-7 | ARC | 足りている | [TF-Q3] |
| 設計の確認と承認（この会話で） | IB-1〜IB-7 | Owner | 足りている（Owner の手 6 回の内訳に入るかは要件定義で確認） | [TF-Q6][SD-Q6] |
| Shirube の実装（門・計測・配布の仕組み） | IB-1〜IB-7 | shirube の席 | 足りている | [TF-Q3][IC-Q13] |
| AUN への導入（門を AUN で効かせる） | IB-2〜IB-4、IB-6 | aun の席 | 足りている | [TF-Q3][SD-Q8] |
| Onza への導入（Shirube の版の配布） | IB-6 | 答えで未確認 | 不足（担い手が未定） | [SD-Q1] |
| 独立した監査 | 全 PR | devauditor | 足りている | [TF-Q3] |
| 統合 | 全 PR | suite-lead | 足りている | [TF-Q3][TF-Q4] |
| 保護面の決定（必須検査にする切り替え） | IB-2〜IB-4 | Owner | 足りている（回数の上限あり） | [FE-Q8][SD-Q2][SD-Q6] |
| 誤って止めた件の判定 | IB-5 | 答えで未確認 | 不足（判定する人が未定） | [SD-Q1] |
| 席ごとの LLM の違いを確かめる | 全体 | 答えで未確認 | 不足（不確かさとして残っている） | [FE-Q4] |

## 不足の手当て（案）

| 不足 | 手当ての案 | 決める人 | 出典 |
|------|------------|----------|------|
| Onza への導入の担い手 | 次の段階（要件定義）で、Onza の担当の席を確かめて決める | Owner（大枠）、ARC（細部） | [IC-Q12][SD-Q1] |
| 誤って止めた件を判定する人 | 次の段階（要件定義）で、判定の手順と判定する人を要件として決める | Owner（大枠）、ARC（細部） | [IC-Q12][SD-Q1] |
| 席ごとの LLM の違い | 設計の段で、確かめ方を ARC が決める | ARC | [TF-Q3][FE-Q4] |

## Assumptions & Open Questions

- [assumption] 上の「手当ての案」は、次の段階で決めるための案で、まだ決まっていない。
