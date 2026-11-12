# 共有の網羅率の門 — 取り組みのバックログ

## Sources

- 範囲の文書: [scope-document.md](./scope-document.md)。回答: [scope-definition-questions.md](./scope-definition-questions.md)の[Q1]〜[Q6]（arcの答え。Ownerの言葉ではない）。
- 承認済みの目的: [intent-statement.md](../intent-capture/intent-statement.md)。実現性: [feasibility-assessment.md](../feasibility/feasibility-assessment.md)。制約: [constraint-register.md](../feasibility/constraint-register.md)。
- 追加の根拠: [iyasaka-arc#49 6787499810](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6787499810)、[iyasaka-arc#24 6791240627](https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6791240627)。[Q2]

## 優先の方法

全項目がMustである（目的が9項目すべてを対象にし、追加の1単位も完了の条件に入れたため）。[Q1] [Q2] 全部がMustなので、優先はMoSCoWの区分ではなく、**順序**で付ける。順序は次の観点で決める: 小さく効果がすぐ出るもの、リスクの高いもの、依存の順。[Q4] 見積りは相対の大きさ（小・中・大）で置き、時間は置かない。

以下は、後のUnits Generationの段で単位に分ける前の「proto-Unit」である。分け方と最終の順は、その段で決める。

## バックログ

| 順 | ID | proto-Unit | 区分 | 大きさ | リスク | 依存・前提 | 保護対象 | 根拠 |
|---|---|---|---|---|---|---|---|---|
| 1 | B1 | CIの実行の絞り（kitの門の起動を監査に関わるcommentの時だけにする）。`labeled`・`unlabeled`は、ラベルが判定に効かないと確かめられた時だけ外す | Must | 小 | 中（ラベルの判定との食い違い） | 設計の段での`gate.mjs`の実読と負例 | workflow（統合前にOwnerの対象head） | [Q2] [Q3] [Q4] [Q5] |
| 1 | B2 | Shirube自身のciのconcurrency（同じPRの前の実行を取り消す。既定のbranchへのpushは取り消さない） | Must | 小 | 低 | なし | workflow（統合前にOwnerの対象head） | [Q2] [Q4] [Q5] |
| 2 | B3 | 新依存の候補の整理と、arc-sec確認・Owner決定の依頼（TypeScript・vitest、網羅率の提供部品） | Must | 小 | 高（承認が得られない場合にS1が欠ける） | 設計の段での候補の特定 | 新依存（arc-sec確認とOwner決定） | [Q1] [Q4] |
| 2 | B4 | 子プロセスを含む測定の実測（既製の道具）と、正例・負例 | Must | 中 | 高（現行の版での挙動が未確認） | 道具の決定（B3の結果に依存する場合がある） | 新依存の場合は上に同じ | [Q1] [Q4] |
| 3 | B5 | 判定の中心（閾値の既定と例外の入力、未計測・NOT_RUN・計測不能を成功にしない、段階的な導入）と、その負例 | Must | 大 | 中 | B4の測定の形 | なし | [Q1] |
| 4 | B6 | TypeScriptの測定対象の定義と変更の記録、TypeScript・vitestの測定と判定 | Must | 中 | 高（値の意味が変わる） | B3の承認、B5 | 新依存 | [Q1] |
| 4 | B7 | DBの試験の扱い（DB別jobの呼び方、名指し・理由出力・拡大不能な除外） | Must | 中 | 中 | B5 | なし（実DBでの確認は範囲の外） | [Q1] |
| 5 | B8 | 呼出しと結果（commit固定の共有workflow、noticeとjob summary） | Must | 中 | 中（共有workflowの追加は保護対象） | B5〜B7 | workflow（追加・変更の別承認） | [Q1] [Q5] |
| 6 | B9 | 利用手順、非公開の土台の一般化した書き直しの確認、公開の試験データが架空だけであることの確認 | Must | 小 | 中（転載の混入） | B5〜B8 | なし | [Q1] |

順が同じ項目（B1とB2、B3とB4、B6とB7）は、互いに独立している場合は並べ替えてよい。ただし、**1単位は1つのPR**で、前の単位のPRが統合されてから次の単位のコード生成に入る。[Q4]

## 順序の根拠

- B1・B2を最初に置くのは、小さく、CIの費用をすぐ減らせるため。[Q4]
- その後にB3・B4を置くのは、リスクの高いもの（新依存の承認の依頼、子プロセスの実測）を早く確かめ、承認の待ちを先に作るため。確かめた結果で順を変えてよい。[Q4]
- B5を中心に置くのは、B6〜B8が同じ判定の規則を参照するため。判断の規則は1か所に置く（社内標準S3）。
- B8の共有workflowの追加は保護対象のため、他の単位とは別に、承認が得られるまで着手しない。

## 範囲の外（Won't）

範囲の文書と同じ。全repo一括導入、実製品への適用、社内基準と既存80%の変更、独自の計測器、既存U1への取り込み、必須の検査の名前・数・branch protectionの変更、試験の中身を減らすこと、repoの公開・非公開の変更。[Q6]

## Assumptions & Open Questions

- [assumption] 大きさ（小・中・大）は相対の見積りで、実測や設計の後に変わりうる。時間の見積りは置かない。
- [assumption] B1とB2は独立した単位にできる。1つのPRにまとめる方が適切な場合は、Units Generationの段で決める。
- Open: B1のラベルの扱い（設計の段で確かめ、結果はarcに知らせ、arcがOwnerに伝える）。[Q3]
- Open: B3の承認が得られない場合のB6の扱い（Owner判断）。
