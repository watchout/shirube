# 共有の網羅率の門 — 体制の評価

## Sources

- 範囲: [scope-document.md](../scope-definition/scope-document.md)（S1〜S10）。バックログ: [intent-backlog.md](../scope-definition/intent-backlog.md)（B1〜B9）。実現性: [feasibility-assessment.md](../feasibility/feasibility-assessment.md)。
- 回答: [team-formation-questions.md](./team-formation-questions.md)の[Q1]〜[Q5]。すべて arc の答えで、Owner の言葉ではない（Owner の委任 [iyasaka-arc#49 6762288830](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830)、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609`）。
- 記録済みの体制: 作る席の変更 [iyasaka-arc#49 6789492550](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6789492550)（本文 SHA-256 `8cc94810760e189c6f52c8218fa1a4e44b146456572c33624dab6804602fdd07`）、AI-DLC の役の承認 [iyasaka-arc#49 6680884184](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6680884184)（本文 SHA-256 `e3ff34d64b6bcb193ebcaf3e84c44c906a8dfc4f7bce70f84b702a5c3115e305`）、作業場の `team.md`。[desc]
- 接続の記録: [iyasaka-arc#24 6791240627](https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6791240627)。[Q1]

## 体制の前提

席はこの Mac と GitHub 上にあるため、時差・拠点・外部の協力会社は評価の対象にしない。[Q1] 新しい役は作らず、記録済みの席だけで体制を組む。[Q3]

## 席の可用性と役割

| 席 | この取り組みでの役割 | 容量と制約 | Source |
|---|---|---|---|
| `adf-lead`（作る席） | 全単位を順に作る。1単位を1つの PR にする。監査の依頼は作者として出す | 1席。前の単位の PR が統合されてから次の単位の作る段に入る | [Q2] |
| AI-DLC が段ごとに呼ぶ役 | 作る役・試験の役・見直し役など、段の手順が呼ぶ役だけ | 同時に1つ、呼ぶ席と同じモデル、この作業場の中だけ。GitHub への書き込み・統合・孫への委任はしない。この取り組みで範囲を広げない | [Q2] |
| `devauditor`（独立監査） | 各 PR の独立監査。設計に関わる単位は設計だけの PR の監査を先に出す | 通常の流れのまま。特別の枠は置かない | [Q5] |
| `suite-lead`（統合） | 作者以外として各 PR を統合する | 通常の流れのまま | [Q5] |
| arc | 段の承認と、守る物に触れない問いの答え。kit の版を出したときの知らせの受け手 | arc の答えは Owner の言葉ではないと明記して写す | [Q3] [Q1] |
| arc-sec | 新依存の安全確認と、workflow の差分の読み | 新依存はOwner の決定と合わせて進む | [Q3] [Q4] |
| CTO | 差分の観点の入力と、workflow の差分の読み | 各 repo の workflow を作る席ではない | [Q3] |
| Owner | 守る物（DB の構造・資格情報・本番・料金・workflow と必須の検査・branch protection・契約 .v2）、R3・R4 の統合前の対象 head の承認、新依存の決定 | 席の起動の設定とサブエージェントの範囲の変更も Owner | [Q3] [Q4] |

## 競合する取り組みと関係

同じ file や同じ監査・統合の席を使う、すでに進んでいる取り組みは次のとおり。[Q1]

- 既存の U1。止めず、この取り組みの開始を理由に変えない。[desc]
- Tsumama の取り組み 261110-gate-pin-bump（kodama。kit の門の pin の版上げと kodama の ci の concurrency、kodama#90）。[Q1]
- AUN と Onza。この取り組みの kit の版が出た後に、pin の版上げと ci の concurrency を1 PR ずつ各作業場で行う。[Q1]

この取り組みは、kit の `sds-gate-caller.yml` の版を先に固める側にある。kit の版を出したら arc に知らせる。この知らせを待つ後続の取り組みがあるため、B1・B2（S10）を最初に置いた順序（[intent-backlog.md](../scope-definition/intent-backlog.md)）は変えない。[Q1]

各 repo の workflow の変更は、その repo の AI-DLC の作業場の席が作る。この取り組みは kit の型と Shirube 自身の ci だけを直し、各 repo の workflow と pin の版上げは範囲の外にある。[Q3] [Q1]

## チームの形

利用先の製品とは、利用手順と commit 固定の呼出しだけでつながる関係（X-as-a-Service）にする。この取り組みの中は、作る席1席の順次の流れ（単位ごとに設計・計画・作る・監査・統合）とする。[Q2]

## 容量の扱い

少なくとも10個の PR を、1単位1PR で順に統合する。分け方は Units Generation の段で決める。[Q5] 監査・統合の返却を待つ間は、承認済みの範囲の他の作業（その単位の作る計画と試験の手順など）を進める。ただし、1単位1PR と、設計監査の PASS の前に code を書かない決まりは変えない。[Q5]

## リスクと対策

| リスク | 対策 | Source |
|---|---|---|
| 新依存（TypeScript・vitest、網羅率の提供部品）の承認が得られない | B3 で早く依頼を出す。承認が得られない場合の S1・B6 の扱いは Owner の判断として残す | [Q4] |
| 共有 workflow の追加と変更が保護対象 | 統合前に Owner の対象 head の承認を取る。承認が得られるまで B8 に着手しない | [Q4] |
| kit の版を待つ後続の取り組みが止まる | B1・B2 を最初に置き、版を出したら arc に知らせる | [Q1] |

## Assumptions & Open Questions

- [assumption] 監査・統合の席が通常の流れで対応できる件数である。件数を事前に知らせる運用は置かない。[Q5]
- [assumption] arc の答え（Q1〜Q5）は、Owner の委任の範囲（守る物に触れない問い）にある。守る物に触れる判断は、それぞれの単位で Owner に伺う。[Q3]
- Open: B3 の承認が得られない場合の S1・B6 の扱い（Owner の判断）。
