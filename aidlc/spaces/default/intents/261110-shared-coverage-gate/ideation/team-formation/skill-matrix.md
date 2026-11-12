# 共有の網羅率の門 — スキル表

## Sources

- 範囲: [scope-document.md](../scope-definition/scope-document.md)。バックログ: [intent-backlog.md](../scope-definition/intent-backlog.md)（B1〜B9）。実現性: [feasibility-assessment.md](../feasibility/feasibility-assessment.md)。
- 体制: [team-assessment.md](./team-assessment.md)。回答: [team-formation-questions.md](./team-formation-questions.md)の[Q4]（arc の答えで Owner の言葉ではない）。

## 必要なスキルと保有の状況

評価は、記録済みの事実と、Shirube 内で確かめた範囲だけに基づく。未確認のものは「未確認」とし、できると書かない。[assumption]

| スキル | 必要な単位 | 保有の状況 | 補い方 | Source |
|---|---|---|---|---|
| Node 組込みの試験と網羅率 | B4・B5 | 保有（既存の試験は `node:test`、行網羅率100%の床がある） | 補いは要らない | [desc] |
| TypeScript・vitest の網羅率 | B6 | 未保有（Shirube に未導入の新依存） | 新依存の導入前に arc-sec の確認と Owner の決定 | [Q4] |
| 子プロセスを含む測定（既製の道具） | B4 | 未確認（現行の版での挙動が未確認） | B4 で実測し、独自の計測器は作らない | [Q4] |
| 判定の規則の設計（閾値・未計測・NOT_RUN・計測不能） | B5 | 保有（fail closed の既存規約） | 補いは要らない | [desc] |
| 再利用 workflow と GitHub Actions の起動条件 | B1・B2・B8 | 保有（既存の kit の型と ci を読める）。変更は保護対象 | Owner の承認（統合前に対象 head） | [Q4] |
| DB の試験の扱い | B7 | 一部（DB 別 job の呼び方の整理まで。実 DB での確認は範囲の外） | 補いは要らない | [desc] |
| 公開 repo での安全の確認 | B9 | 保有（架空データ・転載しない規則がある） | 補いは要らない | [desc] |

## ギャップと対策

- **TypeScript・vitest**: 導入が承認されなければ B6 が欠ける。B3 で早く依頼を出す。承認の結果で S1 と B6 の扱いを決める。[Q4]
- **子プロセス**: 既製の道具で測れるかが未確認。B4 の実測の結果で、道具と B3 の依頼を見直す。[Q4]
- **workflow**: 追加・変更のたびに Owner の対象 head の承認が要る。B1・B2・B8 の PR に承認の待ちが入る。[Q4]

ほかに補う人は置かない。[Q4]

## Assumptions & Open Questions

- [assumption] 「子プロセスを含む測定を既製の道具でできる」は、B4 の実測まで確認されていない。
- Open: B3 の承認が得られない場合の S1・B6 の扱い（Owner の判断）。
