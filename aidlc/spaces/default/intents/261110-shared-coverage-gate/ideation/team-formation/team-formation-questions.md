# 共有の網羅率の門 — 体制の確認

## Prior Context

承認済みの[範囲](../scope-definition/scope-document.md)（指定9項目と、CIの実行の絞り S10 がすべてMust）、[バックログ](../scope-definition/intent-backlog.md)（B1〜B9）、[実現性の評価](../feasibility/feasibility-assessment.md)を引き継ぐ。

席はこの Mac と GitHub 上にあるので、時差・拠点・外部の協力会社・AWS の支援の質問は置かない。すでに記録されている体制は再質問しない:

- 作る席は1席（`adf-lead`）。作る席の変更は Owner の決定 [iyasaka-arc#49 6789492550](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6789492550)（本文 SHA-256 `8cc94810760e189c6f52c8218fa1a4e44b146456572c33624dab6804602fdd07`）で決まっている。
- 独立監査は `devauditor`、統合は作者以外の `suite-lead`（team.md の記録）。
- AI-DLC が段ごとに呼ぶ役のサブエージェントは、Owner の決定 [OD-SUITE-AIDLC-STAGE-ROLE-SUBAGENTS-APPROVED-20261106-001](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6680884184)（本文 SHA-256 `e3ff34d64b6bcb193ebcaf3e84c44c906a8dfc4f7bce70f84b702a5c3115e305`）の範囲（同時に1つ、呼ぶ席と同じモデル、この作業場の中だけ、GitHub への書き込み・統合・孫への委任なし）で使える。この取り組みでその範囲を広げない。
- 守る物に触れない問いと段の承認は arc が答えてよい（[OD-SUITE-AIDLC-NON-PROTECTED-ANSWERS-DELEGATED-TO-ARC-20261110-001](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830)、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609`）。arc の答えは Owner の言葉ではないと明記して写す。

## Q1. [Owner] この取り組みと同じ席・同じ file を使う、すでに進んでいる取り組みはありますか？

二重の作業や食い違いを避けるための質問です。いま分かっているのは次の3つです。

- 既存の U1（止めず、この取り組みの開始を理由に変えない）。
- CTO が受け持つ、Suite の各 repo の workflow 側の直し（Owner の決定 6787499810 の 2 の受け持ち）。この取り組みは kit の型（`kit/sds-gate-caller.yml`）と Shirube 自身の ci だけを直し、各 repo の workflow と pin の版上げは範囲の外です。
- 利用先での kit の版上げ（別の判断。Tsumama の pin の取り組みなど）。

A. 上の3つだけ。ほかに、同じ file（`kit/sds-gate-caller.yml`・`.github/workflows/ci.yml`・`scripts/sds/gate.mjs`）や同じ監査・統合の席を使う取り組みはない。
B. ほかにもある。内容を添える。
C. まだ分からない。
X. Other (please specify)

[Answer]: B. ほかにもある。Tsumama の取り組み 261110-gate-pin-bump（kodama。kit の門の pin の版上げと kodama の ci の concurrency、kodama#90）。aun・onza も、この取り組みの kit の版が出た後に、pin の版上げと ci の concurrency を1PRずつ各作業場で行う（接続の記録 [iyasaka-arc#24 6791240627](https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6791240627)）。kit の `sds-gate-caller.yml` の版を先に固めるのはこの取り組みなので、kit の版を出したら arc に知らせる。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q2. [Owner] 作る体制は、どの形にしますか？

準備している形は、作る席の1席が単位を順に作り、1単位を1つの PR にして、他の席が監査・統合する形です（利用先の製品とは、利用手順と commit 固定の呼出しだけでつながる X-as-a-Service の関係）。

A. 作る席の1席（`adf-lead`）が全単位を順に作る。サブエージェントは、上の承認の範囲で AI-DLC が呼ぶ役だけを使う。
B. 単位によって別の作る席を割り当てる。席の登録と起動の設定が要るため、Owner の判断になる。割り当てる単位を添える。
C. まだ決めない。
X. Other (please specify)

[Answer]: A. 作る席の1席（`adf-lead`）が全単位を順に作る。サブエージェントは、上の承認の範囲で AI-DLC が呼ぶ役だけを使う。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q3. [Owner] 誰が何を決めますか？（決める人の表）

記録済みの決まりを、この取り組みの段と単位の決定に当てはめた表です（新しい役は作りません）。

| 決める物 | 決める人 |
|---|---|
| 段の承認、守る物に触れない問い | arc（Owner の委任の下。Owner の言葉ではない） |
| 守る物（DB の構造・資格情報・本番・料金・workflow と必須の検査・branch protection・契約 .v2）、R3・R4 の統合前の対象 head の承認 | Owner |
| 新しい依存の導入 | arc-sec の安全確認と Owner の決定 |
| 各 PR の独立監査 | `devauditor` |
| 各 PR の統合 | 作者以外の `suite-lead` |
| 各 repo の workflow 側の直し | CTO |

A. この表のとおり。
B. 直す点がある。内容を添える。
C. まだ決めない。
X. Other (please specify)

[Answer]: B. 直す点が1つある。「各 repo の workflow 側の直し = CTO」の行を、「各 repo の workflow の変更は、その repo の AI-DLC の作業場の席が作る。CTO は差分の観点の入力と workflow の差分の読み、arc-sec も workflow の差分を読む」に直す。ほかは表のとおり。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q4. [Owner] 必要な技術のうち、作る席だけでは足りない部分は、誰が補いますか？

必要な技術は、Node 組込みの試験と網羅率、TypeScript・vitest、子プロセスの網羅率の測定、GitHub Actions の再利用 workflow、DB の試験の扱い、公開 repo での安全の確認です。足りない可能性が高いのは次の2つです。

- TypeScript・vitest と、その網羅率の部品は、Shirube に新しい依存になる。導入前に arc-sec の確認と Owner の決定が要る。
- 共有 workflow の追加と変更は保護対象で、Owner の承認が要る。

A. 足りない部分は、新しい依存は arc-sec と Owner、workflow は Owner の承認で補う。ほかに補う人は置かない。
B. ほかにも補う人が要る。内容を添える。
C. まだ分からない。
X. Other (please specify)

[Answer]: A. 足りない部分は、新しい依存は arc-sec と Owner、workflow は Owner の承認で補う。ほかに補う人は置かない。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q5. [Owner] 監査と統合の席の負荷は、どう扱いますか？

この取り組みは、少なくとも10個の PR（B1〜B9。分け方は後の段で決める）を、1単位1PR で、監査と統合を経て順に統合します。設計に関わる単位では、設計だけの PR の監査を先に出します。

A. 通常の流れのまま。特別の枠は置かない。監査・統合の返却を待つ間は、承認済みの範囲の他の作業（その単位の計画と試験の手順など）を進める。
B. 監査・統合の席に、事前に件数を知らせる。
C. まだ決めない。
X. Other (please specify)

[Answer]: A. 通常の流れのまま。特別の枠は置かない。監査・統合の返却を待つ間は、承認済みの範囲の他の作業（その単位の計画と試験の手順など）を進める。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）
