# 共有の網羅率の門 — 外の待ちの地図

外の待ちとは、この作業場の席だけでは解けない物（他の席の確認、Owner の決定、承認、他の取り組みの受け渡し）。Bolt とは、作る作業の 1 まとまりのこと（1 つの単位を通して動く物を 1 つ作って終わる）。時間の見積りは置かず、解けた基準と遅れたときの扱いを書く。

## Sources

- 体制と RAID: [team-assessment.md](../../ideation/team-formation/team-assessment.md)、[mob-composition.md](../../ideation/team-formation/mob-composition.md)、[raid-log.md](../../ideation/feasibility/raid-log.md)、[constraint-register.md](../../ideation/feasibility/constraint-register.md)。
- 範囲: [scope-document.md](../../ideation/scope-definition/scope-document.md)。単位: [unit-of-work.md](../units-generation/unit-of-work.md)。Bolt: [bolt-plan.md](./bolt-plan.md)。
- 答え: [delivery-planning-questions.md](./delivery-planning-questions.md) の [Q2]・[Q3]（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。

## 地図

| # | 待ち | 持ち主 | 止める Bolt | 解けた基準 | 遅れたときの扱い |
|---|---|---|---|---|---|
| E1 | 新しい依存（測定の道具）の安全確認と採用の決定 | arc-sec（安全確認）、Owner（採用の決定） | Bolt 6（U6） | 公開コメントの URL と本文 SHA-256 を伴う承認の記録 | Bolt 6 を脇へ置く印をつけて Bolt 7 へ進む。承認が来たら戻す。来なければ初版の範囲を Owner に諮る（RAID の R2） |
| E2 | 保護対象 PR の統合前の対象 head の承認 | Owner | Bolt 1・2・7（と、保護対象になる場合の Bolt 6） | 対象 head への承認の公開決定 | その PR は統合されない。次の Bolt の作る工程には入らない（1 単位 = 1 PR）。待つ間、承認済みの範囲のほかの作業（次の単位の計画と試験の手順など）は進める |
| E3 | 設計だけの PR の独立設計監査 | `devauditor` | Bolt 1・2・7（と、保護対象になる場合の Bolt 6。守る物に触れると分かった他の単位） | 設計監査の PASS と作者の受領 | code は設計監査の PASS の後に書く。返却を待つ間も、計画と試験の手順は書いて承認を受けてよい |
| E4 | 各 PR の独立監査と作者の受領 | `devauditor` | 全 Bolt（8 本の PR） | 監査の返却と、作者の受領の記録 | 監査の依頼後、結果を受けるまでは対象 PR に push しない |
| E5 | 各 PR の統合 | 作者以外の `suite-lead` | 全 Bolt | 統合された PR | 前の PR が統合されるまで、次の単位の作る工程に入らない |
| E6 | kit の版を出したことの知らせ | `adf-lead` から arc へ | なし（後続の取り組みが待つ） | arc が受け取った記録 | Bolt 2 の統合の後に知らせる。後続の取り組み（Tsumama の gate-pin-bump、AUN、Onza の pin の版上げ）が待つ |
| E7 | `labeled`・`unlabeled` の扱いの結果を伝える | `adf-lead` から arc へ、arc から Owner へ | なし | arc が受け取った記録 | Bolt 2 の設計で、ラベルが判定に効くと確かめたら、記録した事実の誤りとして伝える |

## 待ち時間の使い方

- 計画の承認の後、Bolt 1・2 の監査・統合の返却を待つ間に、新しい依存の候補の整理と、arc-sec と Owner への依頼の準備を進める（E1、[Q3] の A）。準備ができたら arc に渡す。
- 整理に使うのは、読み取りだけの調べ（逆解析の記録と、公開の資料）。依存の追加も、設定の変更も、ここでは行わない。依頼は arc-sec の確認と Owner の決定を伴う手順に載せる（保護対象）。
- 他の待ちについても、承認済みの範囲のほかの作業は進める。1 単位 = 1 PR と、設計監査の PASS の前に code を書かない決まりは変えない。

## 外の依存先

| 依存先 | 内容 | 状態 |
|---|---|---|
| 既存の GitHub Actions（Linux） | 実証を動かす場所。新しい有料サービス・常設資源は導入しない | 変更なし（RAID の D6） |
| 公開の資料（Node の網羅率、GitHub の再利用 workflow） | 設計の段で一次資料を確かめる | 未確認（RAID の I2）。各単位の設計の段で扱う |
| 利用先の repo | pin の版上げは別の判断。この取り組みでは行わない | 範囲の外 |

## Assumptions & Open Questions

### Assumptions

- [assumption] E1 の依頼の準備は、待ち時間の中で進められる軽い作業で、別の PR を始めるものではない（作業場の外で新しい PR を始めない決まり）。
- [assumption] E6 の知らせは、kit の版が確定した時点で行う。利用先への導入は別の決定で扱う。

### Open Questions

1. E1 の依頼の様式（arc-sec と Owner への渡し方）は、arc に渡す時に arc の指示に従う。
2. E3 の対象になる単位（U3・U4・U5・U8 が守る物に触れるか）は、各単位の設計の段で再判定する。
