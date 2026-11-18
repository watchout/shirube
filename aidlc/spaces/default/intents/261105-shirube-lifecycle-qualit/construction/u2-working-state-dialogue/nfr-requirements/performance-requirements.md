# U2 — Performance Requirements

## Sources and Scope

U2（実物に基づく導入状態・設定・規格の対話）の性能の要件。入力: [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)。確認済みの問いは [questions](nfr-requirements-questions.md)（新規の問い 0 件、要約確認 Looks correct）。本書は要求であり、測定・試験済みの結果ではない。

U2 は常駐サービスではなく、対話の中で実対象を 1 回ずつ読む。要件に根拠のある応答時間・スループット・稼働率の目標が無いため、根拠のない p95・RPS・同時利用数は置かない。

## Requirements

| ID | 要件 | 合否 | 後続分担 |
|---|---|---|---|
| NFR6.1 | BR1.4 が NFR に委ねた「具体の数値」は、共通の予算の profile（contract-summary、信頼版の tools が持つ。現在値の正本は U1 の規則 policy.budget）の値そのものとする（1 取得の時間・総時間・最大回数・1 応答の大きさ・自動再試行 0）。U2 は数値を持たず複製しない（S3）。決めるのは信頼版の profile で、U2 の adapter がそれを読み、核へ明示入力として渡す。対話の呼出側・PR 側・配布先は値を渡せず、拡大も無限化もできない。ローカル file の読取りと子 process の起動にも同じ 1 取得の時間と応答の大きさを当てる（BR1.4・A-03） | 予算を使い切った入力が「観測できず（budget_exceeded または timed_out）」になり、成功にならない。呼出側が別の予算を渡した負例で、profile の値が使われる | profile の数値の変更は検査版の変更として明示（契約）。GitHub 取得向けの profile がローカル読取り・子 process に足りるかの証拠は無い。足りるかは Build and Test で実測し、足りなければ差を示して検査版の変更を求める（黙って緩めない） |
| NFR6.1a | 予算の超過は、超えた単位だけを観測不能にする（BR1.4）。1 取得の超過は、その出典の項目を budget_exceeded または timed_out の観測不能にし、すでに読めた別の出典の値は使い続ける。総時間・総回数を使い切った時は、まだ読んでいない出典を観測不能にし、読めた出典の値は保つ。いずれも成功に読み替えず、読めなかった出典を空の値や既定値で埋めない。破損 file の扱い（malformed）は別の規則で、予算超過と混同しない（BR3.4） | 1 取得の超過と総量の超過の 2 負例で、読めた出典の項目の状態が保たれ、読めなかった出典の項目が観測不能になる | 同上 |
| NFR1.1a | 性能に関する未計測の値（処理時間・CPU・memory・要求数）は適合済みと示さない。測る場合は対象版と測定方法を添える。行の網羅率の主の要件は [tech-stack-decisions](tech-stack-decisions.md) の NFR1.1 | 未計測を適合と記す文書・出力は不合格 | Build and Test |

開いた形（string・list）の項目の出典間の一致比較（matchGroup）は、核がメモリ上で 1 回の観測の中だけで行い、値を保持しない（Owner の決定 120）。比較の追加の読取り・回数・時間は作らず、予算（NFR6.1）に新しい消費を足さない。開いた形の固定の分類の判定（F02）も、すでに読んだ値に共有の判定の関数を 1 回当てるだけで、追加の読取り・予算の消費は無い。分類で withheld になった出典は一致の比較に入らない。

## Not Set (No Evidence)

p95 応答時間、スループット、同時利用数、CPU・memory の上限、稼働率。根拠となる測定・要件が無いため目標を置かない。測定が得られたら要件の改訂として追加する。

## Assumptions & Open Questions

None。数値は共通の profile を参照する仮定。実対象に対する予算の十分性は未確認で、Build and Test で確かめる。
