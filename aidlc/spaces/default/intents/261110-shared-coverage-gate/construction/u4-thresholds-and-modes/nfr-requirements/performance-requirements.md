# U4 u4-thresholds-and-modes — 性能・動作環境の要件

この単位は、U3 の門に「閾値の例外」と「動作の切り替え」を足す。足す処理は入力の小さな検査と、判定の最後の分岐、出力の追加の行だけで、測定は変えない。ここでは、動作環境が変わらないことと、足した処理の大きさの要件を、元の NFR の番号に枝番を付けて書く。枝番はこの単位の中の番号で、U3 の同じ番号とは別の物。他の単位の番号を引く時は単位名を付ける。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR6 = 例外の入力の検査、BR7 = 動作と判定、BR8 = 出力）。
- 土台: U3 の同名の要件 [performance-requirements.md](../../u3-node-gate-slice/nfr-requirements/performance-requirements.md)（動作を保証する環境は Linux の runner と Node 22、想定する大きさ）。この単位はそれを変えない。
- 技術の現状: [technology-stack.md](../../../../../codekb/shirube/technology-stack.md)。

## 要件

### NFR1 動作環境

- **NFR1.1** 動作を保証する環境と Node の版の扱いは U3 のまま（Linux の runner と Node 22、23 以上は実行するが保証しない）。この単位は環境の要件を足さず、Node の新しい機能も使わない。判定: この単位が足す code が Node 22 の組込みだけを使う（NFR6.1）。[NFR1]
- **NFR1.2** この単位が足す処理は、入力の大きさ（分母の file 数、行の記録の件数）に依らない一定の量に収まる。足すのは、入力の `threshold` と `mode` の検査（値 4 つ）、実際の閾値の選択、出力の追加の行だけ。U3 の NFR1.4 の上限（n log n）を超える処理を足さず、追加の process を起こさない。目安の確かめ: 例外つきの判定と整形が、同じ大きさの例外なしの入力に比べて、ゆるい上限（U3 の網と同じ 10 秒の内側）で終わる。[NFR1]
- **NFR1.3** 決定の URL と根拠の検査は、文字列の長さで上限を置いて行い、検査の時間は長さに対して線形に収まる（破滅的な後戻りを起こす書き方を使わない）。上限は URL が GateConstants.decisionUrlMaxLength（300 文字）、根拠が GateConstants.rationaleMaxLength（300 文字）。上限を超えた文字列は、中身を調べる前に失敗にする。判定: 上限の長さの悪意のある文字列（繰り返しの文字列）を渡した試験が、ゆるい上限の内側で失敗を返す。[NFR1、脅威 T7]
- **NFR1.4** 例外も動作も指定しない入力では、処理の量も出力の大きさも U3 と同じ（追加の行・節が出ない）。[NFR1、NFR8]

## 気づいたこと

- 例外の検査は人の書く短い入力の検査なので、速度は問題にならない。上限を置く理由は速度でなく、入力の自由な文字列が結果の表示に出る前の大きさの制限である。

## Assumptions & Open Questions

### Assumptions

- [assumption] 決定の URL の長さの上限 300 文字は、GitHub の owner 名（39 文字以内）・repo 名（100 文字以内）・番号（12 桁以内）を最大にしても約 205 文字に収まるので足りる見込み。足りなければ GateConstants の 1 か所を変える。
- [assumption] 10 秒の網は U3 の NFR1.4 と同じ考え方（二乗の時間や無限の待ちを見つける網で、性能の保証ではない）。

### Open Questions

なし。
