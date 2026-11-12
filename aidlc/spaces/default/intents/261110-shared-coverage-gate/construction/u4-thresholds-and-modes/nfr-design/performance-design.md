# U4 u4-thresholds-and-modes — 性能の設計

この単位が足す処理は、入力の小さな検査と、判定の最後の分岐と、出力の追加の行だけ。ここでは、それが U3 の処理の大きさを変えない設計と、自由な文字列の検査を線形に保つ設計を決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [performance-requirements.md](../nfr-requirements/performance-requirements.md)（NFR1.1〜NFR1.4）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)。機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR6.3〜BR6.5、BR7.4）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 土台: U3 の [performance-design.md](../../u3-node-gate-slice/nfr-design/performance-design.md)（PF1〜PF3）。この単位は U3 の設計を変えない。

## PF1 動作環境を変えない（NFR1.1）

- 足す code は Node 22 の組込みの言語機能と文字列・数の操作だけを使う。新しい module の import を足さない（`node:` の module を新たに読み込むのは、判定・検査・整形のどれにも無い）。保証する環境は U3 のまま（Linux の runner と Node 22）。
- 数は割合を 100 倍した整数で持つ（U3 の BR3.6 と同じ）。浮動小数の比較に頼らない。入力の値 95.07 を 9507 にする時の丸め（100 倍して最も近い整数にし、100 で割って元の値と等しいか確かめる）は、整数への変換と等値の確かめだけで、環境に依らない。

## PF2 足す処理は一定の量（NFR1.2、NFR1.4）

| 足す処理 | 持ち主 | 量 |
|---|---|---|
| 入力の `mode` の確かめ（集合の所属） | CoverageInputContract | 定数 |
| 入力の `threshold` の確かめ（3 項目、各 1 回の走査） | CoverageInputContract | 文字列の長さに線形（上限つき。PF3） |
| 実際の閾値の選択と比較（整数 2 回の掛け算と比較） | CoverageJudge | 定数 |
| shouldFail の決定（2 つの真偽の積） | CoverageJudge | 定数 |
| 出力の追加の行・節（固定の文型と例外の 3 項目） | ResultReporter | 定数 |

- 利用先の大きさ（分母の file 数、行の記録の件数）に比例して増える処理は無い。U3 の 1 回の走査と整列（order.mjs の 1 か所）は変えない。追加の process も起こさない。
- 確かめ: 同じ大きさの合成の入力（20 万件）で、例外あり・record-only の判定と整形が、例外なし・enforce と同じゆるい上限（10 秒）の内側に収まる試験を 1 つ置く（網であり性能の保証ではない）。

## PF3 自由な文字列の検査を線形に保つ（NFR1.3）

1. 長さの確かめを先に行う。URL は decisionUrlMaxLength（300）、根拠は rationaleMaxLength（300）を超えたら、中身を調べずに失敗にする。
2. URL の形の確かめは、固定の接頭辞（`https://github.com/`）の確認 → 区切りの `/` と `#issuecomment-` で部品に分ける → 部品ごとに文字の集合と長さを確かめる、の順に行う。入れ子の繰り返しや後戻りを起こす正規表現を使わない。正規表現を使う場合も、文字の集合を限った単純な形（各部品を `[A-Za-z0-9._-]{1,100}` のような上限つきの繰り返し 1 回）に限り、検査対象は上限 300 文字に先に切ってある。
3. 根拠の制御文字の確かめは、文字を 1 回ずつ見る走査（または単純な文字の集合の探索）で行う。
4. 確かめ: 上限ちょうどの長さの繰り返しの文字列（`aaaa…`、`/////…`、`-----…`）と、上限より 1 文字長い文字列を渡す試験が、ゆるい上限（1 秒）の内側で失敗を返す。

## 気づいたこと

- 例外の検査の速度は問題にならない。上限を置く本当の理由は、検査の時間でなく、自由な文字列が結果の表示に出る前の大きさの制限（security-design.md の SC4）である。

## Assumptions & Open Questions

### Assumptions

- [assumption] 100 倍して丸める方法（`Math.round(p * 100)` と、100 で割って元と等しいか）が、小数第 2 位までの値（95.07 など）で期待どおりに働く。浮動小数の表現の誤差で 95.07 × 100 が 9507.000000000001 になっても、丸めて割り直した値が元の値と等しいかで確かめる。境界の値（0.07、95.07、99.99、0.29 など誤差が出やすい値）を試験に置く。
- [assumption] 1 秒・10 秒の網は、CI の実行機の揺れを見込んだゆるい上限。揺れる場合は、処理の回数を数える試験に置き換え、理由を記録する（U3 と同じ考え方）。

### Open Questions

なし。
