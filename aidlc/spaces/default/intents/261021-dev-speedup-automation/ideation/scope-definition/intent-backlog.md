# 意図のバックログ（Intent Backlog）: 開発の高効率化・自動化による高速開発化

出典の書き方: `[IC-Qn]` は `ideation/intent-capture/intent-capture-questions.md`、`[FE-Qn]` は `ideation/feasibility/feasibility-questions.md`、`[SD-Qn]` は `ideation/scope-definition/scope-definition-questions.md` の答え。

## 参照した入力

- `ideation/intent-capture/intent-statement.md`（成功の指標、最初に解くもの）
- `ideation/feasibility/feasibility-assessment.md`（結論の条件 C1〜C4）
- `ideation/feasibility/constraint-register.md`（制約）
- `ideation/scope-definition/scope-document.md`（範囲に入るもの IN-1〜IN-10、完了の条件）

## 並べ方

- 優先度は MoSCoW で付け、Must の中は「価値の大きいものから」並べる。 [SD-Q3]
- 価値の大きさは、完了の条件（S1-SH-01〜07）にどれだけ直接効くかで見立てた（仮説。Owner が順番を変えてよい）。 [SD-Q6]
- 例外として、計測は門で止め始める前に置く（実現性の評価の条件 C3）。 [FE-Q3]

## バックログ（最初の版）

| 順 | ID | 項目 | MoSCoW | 価値の見立て | 依存 | 範囲・完了の条件との対応 | 出典 |
|----|----|------|--------|--------------|------|--------------------------|------|
| 1 | IB-1 | 今の値の計測（4 指標） | Must | 高（「半分」の判定と S1-SH-07 の確かめに要る） | なし | IN-1、S1-SH-04・07 | [SD-Q1][IC-Q4][FE-Q3] |
| 2 | IB-2 | 監査なしの PR は統合できない | Must | 高（完了の条件に直接） | IB-1 | IN-3、S1-SH-01 | [SD-Q1][SD-Q6] |
| 3 | IB-3 | 工程の飛ばしを止める門と、Inception が先 | Must | 高（最初に解く手戻りに直接） | IB-1 | IN-2、IN-5、S1-SH-03 | [SD-Q1][IC-Q11] |
| 4 | IB-4 | 道筋に無い作業は統合できない | Must | 高（完了の条件に直接） | IB-3 | IN-4、S1-SH-02 | [SD-Q1][SD-Q6] |
| 5 | IB-5 | 誤って止めた件を判定して記録する手順 | Must | 高（「誤って止めた PR 0」を確かめるのに要る） | IB-2〜IB-4 | IN-7、S1-SH-04 | [SD-Q1][SD-Q6] |
| 6 | IB-6 | 対象の repo（Shirube・AUN・Onza）への Shirube の版の配布 | Must | 中（AUN で門を効かせるのに要る） | IB-2〜IB-4 | IN-10、S1-SH-04 | [SD-Q1][SD-Q8] |
| 7 | IB-7 | 設計と実装のずれを見つける検査 | Must | 中（手戻りの原因に直接だが、完了の条件には直接は入らない） | IB-3 | IN-6 | [SD-Q1][IC-Q2] |

次の 2 つは、作り方そのものに掛かる条件として、上の全項目に付く。

| ID | 条件 | MoSCoW | 範囲・完了の条件との対応 | 出典 |
|----|------|--------|--------------------------|------|
| IB-C1 | 作者の手間は増えない（作者が書くのは PR の数行と label だけ） | Must | IN-8、S1-SH-05 | [SD-Q1][SD-Q6] |
| IB-C2 | Shirube 自身がこの門を通って作られる | Must | IN-9、S1-SH-06 | [SD-Q1][SD-Q6] |

## 最初の版では作らないもの（Won't have this time）

| ID | 項目 | いつ扱うか | 出典 |
|----|------|------------|------|
| IB-W1 | Suite 全体と OmotenasuAI への配布 | 次の段階 | [SD-Q1] |
| IB-W2 | Kusabi と Tsumama への適用 | 制御系が 1 周回って再開してから | [SD-Q7] |
| IB-W3 | Owner 待ち・席どうしの引継ぎ・監査の往復の改善（計測はする） | 次の版以降 | [SD-Q4] |
| IB-W4 | AUN を席どうしの受け渡しに使うこと | 次の版以降 | [FE-Q9] |
| IB-W5 | 本番・保護面の自動化、新しい席や AI-DLC 以外の外部ツール、承認そのものを無くすこと | 対象外 | [IC-Q6] |

## Owner の決定が要る点（最初の版）

| # | 決定 | 関係する項目 | 出典 |
|---|------|--------------|------|
| 1 | Shirube で門を必須検査にする | IB-2〜IB-4 | [SD-Q2][FE-Q8] |
| 2 | AUN で門を必須検査にする | IB-2〜IB-4、IB-6 | [SD-Q2][FE-Q8] |
| 3 | 範囲と優先順位の大枠（この一覧の順番を含む） | 全体 | [IC-Q12] |

- Owner の手は 1 周で 6 回まで（S1-SH-07）。上の決定はこの回数に入る。 [SD-Q6]

## Assumptions & Open Questions

- [assumption] 価値の見立て（高・中）は、完了の条件への効き方からの推測で、計測の結果で見直す。
- [assumption] IB-3 の「工程の飛ばしを止める門」と「Inception が先」は、次の段階で 1 つにまとめるか分けるかを決める。
