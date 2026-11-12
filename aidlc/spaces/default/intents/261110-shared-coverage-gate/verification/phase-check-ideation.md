# Ideation → Inception の境界の確認

## Sources

- [intent-statement.md](../ideation/intent-capture/intent-statement.md)、[scope-document.md](../ideation/scope-definition/scope-document.md)、[intent-backlog.md](../ideation/scope-definition/intent-backlog.md)、[feasibility-assessment.md](../ideation/feasibility/feasibility-assessment.md)、[constraint-register.md](../ideation/feasibility/constraint-register.md)、[team-assessment.md](../ideation/team-formation/team-assessment.md)、[initiative-brief.md](../ideation/approval-handoff/initiative-brief.md)、[decision-log.md](../ideation/approval-handoff/decision-log.md)。

## 一貫性の確認（目的 → 範囲 → バックログ）

| 目的の項目 | 範囲 | バックログ | 結果 |
|---|---|---|---|
| 二つの試験方式 | S1 | B3・B4・B6 | OK |
| 子プロセス | S2 | B4 | OK |
| TypeScript の測定対象 | S3 | B6 | OK |
| DB の試験 | S4 | B7 | OK |
| 閾値 | S5 | B5 | OK |
| 未計測・NOT_RUN・計測不能 | S6 | B5 | OK |
| 段階的な導入 | S7 | B5 | OK |
| 呼出しと結果 | S8 | B8 | OK |
| 非公開の土台と公開安全 | S9 | B9 | OK |
| （目的に無く、Owner の追加の依頼で足した）CI の実行の絞り | S10 | B1・B2 | 注意: 根拠は追加の依頼 [iyasaka-arc#49 6787499810](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6787499810)。scope-definition の Q2 で承認済み |

9項目はすべて、範囲とバックログに対応があり、対応のない項目はない。S10 は目的の外から入った項目として明示し、止めない。

## 実現性の裏づけの確認

| 範囲 | 実現性の判定 | 結果 |
|---|---|---|
| S5・S6・S7・S9 | 高 | OK |
| S1・S2・S4・S8 | 条件付き（新依存または対象の版での実測が前提） | 注意: 実測と承認を後の段で確かめる |
| S3 | 設計判断（条件付き） | 注意: 設計の段で決める |
| S10 | 実現性の評価の対象外（目的の外から追加） | 注意: 設計の段で `gate.mjs` を実読して確かめる |

裏づけのない項目はない。「条件付き」と「注意」の項目は、外すべきものではなく、後の段で確かめる。

## 警告

- 新依存が承認されない場合の S1・B6 の扱いは、Owner の判断が残っている。
- `labeled`・`unlabeled` の扱いは、設計の段で確かめる。
- 市場調査と Rough Mockups は適用外として飛ばし、確認済み。

## 引き継ぎの承認

- [ ] 引き継ぎは、Approval & Handoff の段の承認で行う。
