# 共有の網羅率の門 — 取り組みの要約（initiative brief）

## Sources

- 目的と関係者: [intent-statement.md](../intent-capture/intent-statement.md)、[stakeholder-map.md](../intent-capture/stakeholder-map.md)。
- 実現性と制約: [feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)。
- 範囲と順序: [scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)。
- 体制: [team-assessment.md](../team-formation/team-assessment.md)、[skill-matrix.md](../team-formation/skill-matrix.md)、[mob-composition.md](../team-formation/mob-composition.md)。
- この段の回答: [approval-handoff-questions.md](./approval-handoff-questions.md)の[Q1]〜[Q5]。arc の答えで、Owner の言葉ではない（Owner の委任 [iyasaka-arc#49 6762288830](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830)）。
- 決定の一覧: [decision-log.md](./decision-log.md)。境界の確認: [phase-check-ideation.md](../../verification/phase-check-ideation.md)。

## 目的と課題

社内の各製品で試験の網羅率を測る仕組みと判定を重複して作らず、共有の門を使えるようにする。測られていないソース、必須試験の未実施、計測不能を成功として扱わず、測定の対象と結果を利用者が確認できる状態を目指す。完成の条件は、指定9項目の正例・負例と、利用手順に沿った commit 固定の呼出しを、Shirube 内の架空の利用例で検証できること。[desc] [Q5]

## 市場の確認

適用外。社内の開発基盤の改善で、外部の市場は関わらないため、市場調査の段は飛ばした。[Q4]

## 実現性とリスク

結論は「条件付きで実現できる」。判定・出力・運用に関わる項目は既存の GitHub Actions の Linux 環境で実現できる見込みが高い。子プロセスの測定、TypeScript・vitest の測定、DB 別 job の構成は、対象の版での実動作を確かめていない（見込みであり、実現済みではない）。[Q2]

承知したリスクは次の4つ。[Q2]

- 子プロセスを含む測定は、現行の版での挙動が未確認。数えられないと分かれば、設計の段で Owner に諮る（独自の計測器は作らない）。
- 新依存（TypeScript・vitest、網羅率の提供部品）が承認されないと、S1 の一部が検証できず、初版の完成条件を満たさない。
- 共有 workflow の追加・変更は保護対象。PR ごとに統合前の Owner の対象 head の承認が要る。
- 起動の種類から `labeled`・`unlabeled` を外す件は、リスクのラベルが判定に効くため外せない可能性が高い。設計の段で確かめ、結果は arc に知らせる。

## 範囲の境界

| 区分 | 内容 |
|---|---|
| 範囲の中（すべて Must） | S1〜S9（指定9項目）と S10（CI の実行の絞り。起動を監査に関わる comment の時だけにする、Shirube 自身の ci の concurrency）。S10 を最初に置く |
| 範囲の外 | 全 repo 一括導入、実製品への適用、社内基準と既存80%の変更、独自の計測器、既存 U1 への取り込み、必須の検査の名前・数・branch protection の変更、試験の中身を減らすこと、repo の公開・非公開の変更、予算の額の変更 |
| 外から決まった完了の条件 | 新依存の arc-sec 確認と Owner 決定／共有 workflow などの保護対象の別承認／kit の版上げの利用先での別判断 |

順序（B1〜B9）は[intent-backlog.md](../scope-definition/intent-backlog.md)。[desc]

## 概念図

適用外。画面も API もない取り組みで、人が見る出力は CI の通知と job summary の文面だけ。その文面は Inception の機能の設計で決める。[Q4]

## 体制の計画

作る席1席が全単位を順に作り、1単位を1つの PR にする。独立監査は `devauditor`、統合は作者以外の `suite-lead`、守る物と R3・R4 の対象 head は Owner、新依存は arc-sec の確認と Owner の決定。各 repo の workflow の変更は、その repo の作業場の席が作り、CTO と arc-sec は差分を読む。予算と資源は追加なし（有料サービス・常設クラウド資源なし、既存 CI）。[Q3]

## go / no-go

**go**（arc の答え。Owner の言葉ではない）。Owner が目的を決めた取り組みで、止める理由がない。[Q5]

引き継ぎの条件は2つ。[Q1]

- 最初の単位の PR に、Ideation の記録も含める（`audit/` と `.aidlc-engine/` は含めない）。Shirube の issue #6 には、承認と引き継ぎの要約を1件だけ書く。
- 公開の repo なので、PR に入れる前に、記録に非公開の repo の識別子・code・席の model 名が無いことを grep で確かめる。この段で席の model 名の確認は済んだ（Ideation の記録に該当なし）。非公開の識別子と code の確認は、PR に入れる前に改めて行う。

## Inception への引き継ぎ

- 設計の段で確かめる: `labeled`・`unlabeled` の扱い（結果は arc に知らせる）、TypeScript の測定対象の定義、子プロセスの実測の方法、通知と job summary の文面、DB 別 job の構成。
- 新依存の候補の整理と arc-sec・Owner への依頼は B3 で早く出す。
- kit の `sds-gate-caller.yml` の版を出したら arc に知らせる。aun・onza・Tsumama の版上げの取り組みがこの版を待つ。[Q1]

## Assumptions & Open Questions

- [assumption] 大きさ（小・中・大）は相対の見積りで、設計や実測の後に変わりうる。
- Open: 新依存が承認されない場合の S1・B6 の扱い（Owner の判断）。
- Open: 現行の版で、Node 組込みの網羅率が子プロセスを含められるか（設計・試験で確かめる）。
