# 範囲の定義（Scope Document）: 開発の高効率化・自動化による高速開発化

出典の書き方: `[IC-Qn]` は `ideation/intent-capture/intent-capture-questions.md`、`[FE-Qn]` は `ideation/feasibility/feasibility-questions.md`、`[SD-Qn]` は `ideation/scope-definition/scope-definition-questions.md` の答え。見立てや推測は「仮説」と明記する。

## 参照した入力

- `ideation/intent-capture/intent-statement.md`（対象、前提、成功の指標、やらないこと）
- `ideation/feasibility/feasibility-assessment.md`（結論の条件 C1〜C4、リスク）
- `ideation/feasibility/constraint-register.md`（制約 CT・CO・CR・CB・CG）
- 根拠の決定（Owner が完了の条件の根拠として示したもの）: Shirube の S1 の済みの条件 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673 、S1-SH-07 を 6 回に改めた決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6306226221 [SD-Q6]

## 前提

- AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る（10/21 の決定）。 [IC-Q13]
- 最初の版は AUN に頼らない（AUN は門をかける対象の repo ではあるが、席どうしの受け渡しの道具としては使わない）。 [FE-Q9][SD-Q5]

## 範囲に入るもの（In scope）

| ID | 内容 | 出典 |
|----|------|------|
| IN-1 | 今の値の計測: 依頼から統合までの時間、差し戻し・手戻りの回数、1 周あたりの Owner の手の回数、正しい作業を誤って止めた回数 | [SD-Q1][IC-Q4] |
| IN-2 | 工程の飛ばしを止める門（前の段階の記録がないと次の段階に進めない） | [SD-Q1] |
| IN-3 | 監査なしの PR は統合できない（S1-SH-01） | [SD-Q1] |
| IN-4 | 道筋に無い作業は統合できない（S1-SH-02） | [SD-Q1] |
| IN-5 | Inception が先（S1-SH-03） | [SD-Q1] |
| IN-6 | 設計と実装のずれを見つける検査 | [SD-Q1] |
| IN-7 | 誤って止めた件を判定して記録する手順 | [SD-Q1] |
| IN-8 | 作者の手間は増えない（S1-SH-05） | [SD-Q1] |
| IN-9 | Shirube 自身がこの門を通って作られる（S1-SH-06） | [SD-Q1] |
| IN-10 | 対象の repo（Shirube・AUN・Onza）への Shirube の版の配布 | [SD-Q1] |

対象の repo は Shirube・AUN・Onza の 3 つ。 [SD-Q5][SD-Q7]

## 範囲に入らないもの（Out of scope）

| ID | 内容 | いつ扱うか | 出典 |
|----|------|------------|------|
| OUT-1 | Suite 全体と OmotenasuAI への Shirube の版の配布 | 次の段階 | [SD-Q1] |
| OUT-2 | Kusabi と Tsumama | 制御系が 1 周回って再開してから | [SD-Q7] |
| OUT-3 | OmotenasuAI | 通常の開発が再開してから | [FE-Q10][FE-Q8] |
| OUT-4 | 手戻り以外の遅れの原因（Owner 待ち・席どうしの引継ぎ・監査の往復）の改善 | 次の版以降（最初の版では測るだけ） | [SD-Q4] |
| OUT-5 | 本番・保護面（デプロイ、必須検査や branch 保護、DB スキーマ、資格情報）の自動化 | 対象外 | [IC-Q6] |
| OUT-6 | 新しい AI の席の追加や、AI-DLC 以外の新しい外部ツールの導入 | 対象外 | [IC-Q6] |
| OUT-7 | 人の承認そのものを無くすこと | 対象外 | [IC-Q6] |
| OUT-8 | AUN を席どうしの受け渡しに使うこと | 次の版以降 | [FE-Q9] |
| OUT-9 | 個人情報を含む製品のデータに触れること | 対象外 | [FE-Q5] |
| OUT-10 | R3 以上の事前監査の抜けを機械で止めること、席の中で止めること | S2・S3（根拠の決定の「S1 に入れないもの」） | [SD-Q6] |

## 価値が出る最小の範囲（MVP）

- 計測と、門で実際に止めるところまで。門を必須検査にする切り替えには、repo ごとに Owner の決定が要る。 [SD-Q2][FE-Q8]
- 実現性の評価の条件 C3 のとおり、門で止め始める前に今の値を測っておく。 [FE-Q3][IC-Q10]

## 完了の条件（Shirube の S1 の済みの条件に揃える）

| ID | 条件 | 確かめ方（根拠の決定のとおり） | 出典 |
|----|------|------------------------------|------|
| S1-SH-01 | 監査なしの PR は統合できない（Shirube と AUN） | 負例 PR の門の FAIL と、統合できなかった記録 | [SD-Q6] |
| S1-SH-02 | 道筋に無い作業は統合できない | 負例 PR の判定の FAIL の記録 | [SD-Q6] |
| S1-SH-03 | Inception が先 | 採択の参照の無い道筋が受け付けられない記録（負例） | [SD-Q6] |
| S1-SH-04 | 正しい PR は止まらない。実際の AUN の PR が 1 件以上、門を通って統合された。誤って止まった PR は 0 | 統合された実 PR の門の PASS と、記録だけの期間の FAIL の分類 | [SD-Q6][SD-Q8] |
| S1-SH-05 | 作者の手間は増えない。作者が書くのは PR の数行と label だけ | 実 PR の diff と作者の席の記録 | [SD-Q6] |
| S1-SH-06 | Shirube 自身がこの門を通って作られている | Shirube の PR の門の状態 | [SD-Q6] |
| S1-SH-07 | Owner の手は 1 周で 6 回まで | 1 周の間の Owner の決定の数 | [SD-Q6] |

- 門は Shirube と AUN で効いていること。Onza は配布の対象だが、完了の条件の確かめ方には入らない。 [SD-Q6][SD-Q8][SD-Q1]

## 順番の方針

- 価値の大きいものから進める。 [SD-Q3]
- ただし、計測は門で止め始める前に置く（実現性の評価の条件 C3）。 [FE-Q3]
- 具体的な順番は `intent-backlog.md` に書く。

## 価値の流れ（どこで手戻りと待ちが起きるか）

| # | 流れの段階 | 起きている遅れ | この版で扱うもの | 出典 |
|---|------------|----------------|------------------|------|
| 1 | 依頼（意図の記録） | — | 計測の起点（IN-1） | [IC-Q4] |
| 2 | Inception の各段階 | 工程の飛ばし | IN-2、IN-5 | [IC-Q2][SD-Q1] |
| 3 | 道筋と作業指示 | 道筋に無い作業 | IN-4 | [SD-Q1] |
| 4 | 実装と PR | 設計と実装のずれによる手戻り | IN-6 | [IC-Q2][SD-Q1] |
| 5 | 監査 | 監査の往復、監査なしの統合 | IN-3（往復の改善は OUT-4） | [IC-Q2][SD-Q1][SD-Q4] |
| 6 | Owner の判断・承認 | Owner 待ち | 計測だけ（OUT-4） | [IC-Q2][SD-Q4] |
| 7 | 統合 | — | 計測の終点（IN-1）、誤って止めた件の記録（IN-7） | [IC-Q4][SD-Q1] |

## Assumptions & Open Questions

- [assumption] 「工程の飛ばしを止める門」（IN-2）と「Inception が先」（IN-5）は重なる部分があり、次の段階で 1 つにまとめるか分けるかを決める。
- [assumption] 門を必須検査にする Owner の決定は、Shirube と AUN でそれぞれ 1 回ずつ要る（Owner の手 6 回の内訳に入る）。
- 主な指標の「今の値」を測る期間と、「半分」を判定する時点は、まだ決まっていない（意図の記録から引き継ぎ）。
