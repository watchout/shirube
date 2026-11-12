# 共有の網羅率の門 — Bolt と担当の割り当て

Bolt とは、作る作業の 1 まとまりのこと（1 回の作る工程で 1 つ以上の単位を通し、動く物を 1 つ作って終わる）。この取り組みでは 1 つの Bolt = 1 つの単位 = 1 つの PR。mob とは、複数の人が 1 つの作業に集まる形のことで、この取り組みでは取らない。Program Board とは、複数の組が同時に進める作業の割り当て表のことで、組は 1 つなので下の表が相当する。

## Sources

- 体制: [mob-composition.md](../../ideation/team-formation/mob-composition.md)、[team-assessment.md](../../ideation/team-formation/team-assessment.md)（回答はすべて arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
- Bolt: [bolt-plan.md](./bolt-plan.md)。単位: [unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)。
- 作業場の決まり: [team-practices.md](../practices-discovery/team-practices.md)。契約の持ち主: [contract-summary.md](../contract-design/contract-summary.md)。

## 割り当て

人が集まる mob の形は取らない。作る席は 1 席で、全 Bolt を順に作る。人の mob は無いので、役割は席ごとに分ける。

| Bolt | 単位 | 作る | 独立監査 | 統合 | 守る物の承認 |
|---|---|---|---|---|---|
| 1 | U1 | `adf-lead` | `devauditor`（設計だけの PR で 1 回、実装で 1 回） | 作者以外の `suite-lead` | Owner（対象 head） |
| 2 | U2 | `adf-lead` | `devauditor`（設計だけの PR で 1 回、実装で 1 回） | 作者以外の `suite-lead` | Owner（対象 head） |
| 3 | U3 | `adf-lead` | `devauditor`（実装で 1 回。設計の段で守る物に触れると分かれば設計だけの PR で先に 1 回） | 作者以外の `suite-lead` | 設計の段で再判定 |
| 4 | U4 | `adf-lead` | `devauditor`（同上） | 作者以外の `suite-lead` | 設計の段で再判定 |
| 5 | U5 | `adf-lead` | `devauditor`（同上） | 作者以外の `suite-lead` | 設計の段で再判定 |
| 6 | U6 | `adf-lead` | `devauditor`（新しい依存を採る場合は設計だけの PR で 1 回、実装で 1 回） | 作者以外の `suite-lead` | arc-sec の安全確認と Owner の決定（新しい依存）。Owner（対象 head）は保護対象の場合 |
| 7 | U7 | `adf-lead` | `devauditor`（設計だけの PR で 1 回、実装で 1 回） | 作者以外の `suite-lead` | Owner（対象 head） |
| 8 | U8 | `adf-lead` | `devauditor`（実装で 1 回） | 作者以外の `suite-lead` | なし |

- `adf-lead` が作る単位は 8 つ、PR は 8 本（1 単位 = 1 PR）。前の PR が統合されてから次の単位の作る工程に入る。
- AI-DLC が段ごとに呼ぶ役（作る役・試験の役・見直し役など）は、承認された範囲の中だけで使う。同時に 1 つ、呼ぶ席と同じモデル、この作業場の中だけ。GitHub への書き込み・統合・孫への委任はしない。この取り組みで範囲を広げない。最初に役を呼ぶ前に、目的・人数・範囲を示して取り組みごとに 1 回の承認を取る。この作業場の見直しの区分は `none` なので、見直し役は呼ばない。
- 席の割り当てに人の時間の見積りは置かない。完了は各 Bolt の完了の条件で測る。

## 席ごとの責任（要点）

| 席 | この取り組みでの責任 |
|---|---|
| `adf-lead` | 設計・計画・試験・作る。各 PR の監査の依頼（作者として）と受領。kit の版を出したときの arc への知らせ。新しい依存の候補の整理と依頼の準備 |
| `devauditor` | 各 PR の独立監査。設計だけの PR の設計監査を含む |
| `suite-lead` | 作者以外としての統合 |
| arc | 段の承認と、守る物に触れない問いの答え（Owner の言葉ではない）。kit の版を出したときの知らせの受け手 |
| arc-sec | 新しい依存の安全確認。workflow の差分を読む |
| CTO | 差分の観点の入力。workflow の差分を読む |
| Owner | 守る物（workflow と必須の検査、新しい依存の決定、DB の構造、資格情報、本番、料金、branch protection、契約 .v2）。保護対象の PR の統合前の対象 head の承認 |

## 競合する取り組み

同じ file や同じ監査・統合の席を使う、すでに進んでいる取り組み: 既存の U1（止めず、変えない）、Tsumama の 261110-gate-pin-bump、AUN と Onza の pin の版上げ。この取り組みの kit の版が出た後に、後続の取り組みが各作業場で pin の版上げと ci の concurrency を行う。この取り組みは kit の版を先に固める側にあり、U1・U2 を最初に置く（[Q1] の A と範囲の順序）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 監査・統合の席が通常の流れで対応できる件数（8 本の PR）である。件数を事前に知らせる運用は置かない。
- [assumption] arc の答えは、Owner の委任の範囲（守る物に触れない問い）にある。守る物に触れる判断は、各単位で Owner に伺う。

### Open Questions

1. U3・U4・U5・U8 が守る物に触れるか（各単位の設計の段で再判定し、触れる場合は設計だけの PR を先に出す）。
2. 新しい依存の承認が来なかった場合の U6 と U8 の扱い（Owner の判断）。
