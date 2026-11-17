# U2 — Performance Design

## Sources and Scope

U2 の性能の設計。入力: [performance-requirements](../nfr-requirements/performance-requirements.md)（NFR6.1・NFR6.1a・NFR1.1a）、[rules](../functional-design/rules.md)（BR1.4・BR1.6）、[logical-components](logical-components.md)。要約確認は [questions](nfr-design-questions.md) の Looks correct（決定 116・120 と対象の結びを足した後に取り直し済み）。本書は設計であり、処理時間・CPU・memory の測定結果ではない。

U2 は常駐せず、対話の中で実対象を 1 回ずつ読む。根拠のある p95・RPS・同時利用数・稼働率が要件に無いので、設計も数値を作らない。ここで決めるのは「止まる条件」であり、速さの保証ではない。

## PF1 予算は共通の profile を読むだけ（NFR6.1）

- LC1 は予算（1 取得の時間・総時間・最大回数・1 応答の大きさ・自動再試行 0）を、信頼版の profile（U1 の規則 policy.budget）から読み、読取りの枠として適用する。数値は U2 のどこにも書かない（S3）。
- 呼出側・PR 側・配布先は予算の値を渡せない。渡された値は使わず、profile の値を使う（拡大も無限化もできない）。
- ローカル file の読取りと子 process の起動にも同じ枠（1 取得の時間・応答の大きさ）を当てる。
- 要件（NFR6.1）どおり、LC1 が profile を読み、適用した予算の識別（profile の版と値）を、測った値（所要時間・読んだ大きさ・回数）と一緒に明示入力として LC2 へ渡す（Observation の添え情報として案内に示せる）。LC1 は枠で止めて測った値だけを返し、分類しない。核は予算の数値を定数として持たない。LC2 が渡された予算の値と測った値を比べて超過を分類し、観測不能（budget_exceeded または timed_out）の Observation にする（BR1.4）。判定の持ち主は LC2 の 1 つだけ。
- 子 process は自分の process group で起動し、枠を超えたら group ごと止める。止められなかった・止めたか確かめられなかった時は成功にせず観測不能（security-design SC1a）。

## PF2 超過は超えた単位だけを観測不能にする（NFR6.1a）

| 超過 | 観測不能にするもの | 使い続けるもの |
|---|---|---|
| 1 取得の時間・大きさ | その出典の項目 | すでに読めた別の出典の値 |
| 総時間・総回数 | まだ読んでいない出典 | 読めた出典の値 |

- 読めなかった出典を空の値や既定値で埋めない。成功に読み替えない。
- 破損 file（malformed。LC2 が判定）と値の不正（invalid。LC3 が判定）は別の規則（BR3.4）。予算超過と混同しない。理由は固定の分類で、案内に「予算の超過」と「破損」が別に出る。
- 自動再試行は 0。状態が変わらない再試行はしない。

## PF3 未計測の値を適合と示さない（NFR1.1a）

- 処理時間・CPU・memory・要求数は計測するまで「未計測」と書く。計測する場合は対象版と測定方法を添える。
- 予算が実対象に足りるかは Build and Test で確かめる。それまでは「足りる」と示さない。

## PF4 開いた形の一致比較は追加の読取りを作らない（NFR6.1。Owner の決定 120）

- 開いた形（string・list）の項目の出典間の一致比較（matchGroup）は、LC2 が 1 回の観測の中で、すでに読んだ値をメモリ上で normalization の規則に従って比べるだけで行う。比較のための追加の取得・再読取り・子 process の起動を作らず、予算（PF1）に新しい消費を足さない。比べ終えた値は捨てる（security-design SC2）。
- 合否: 開いた形の一致比較で、取得の回数・読んだ大きさ・子 process の起動が増えない（比較の有無で同じ入力の測った値が変わらない）。負例: 比較のために再読取りする実装は不合格。これは NFR6.1 の「新しい消費を足さない」の設計の合否で、新しい NFR の ID は作らない（要件側の記録は Minor として持ち越し、見直し NFR Requirements 回 1）。

## Not Set (No Evidence)

p95 応答時間、スループット、同時利用数、CPU・memory の上限、稼働率。根拠が無いので置かない。

## Assumptions & Open Questions

None。仮定: profile の現在値は U1 の規則が持つ。実対象に対する予算の十分性は未確認。
