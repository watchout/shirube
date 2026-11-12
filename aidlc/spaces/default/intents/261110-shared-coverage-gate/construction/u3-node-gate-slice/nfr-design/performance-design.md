# U3 u3-node-gate-slice — 性能・動作環境の設計（performance-design）

NFR1.1〜NFR1.5 を満たす設計。試験の実行時間は利用先で決まるので、門が持つのは「版の確認」「自分の処理の形」「想定の大きさ」の 3 つ。キャッシュ・接続の使い回し・非同期の処理・CDN は持たない（常駐しない 1 回の command のため）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)（NFR1.1〜NFR1.5）、[scalability-requirements.md](../nfr-requirements/scalability-requirements.md)（NFR1.6）、[logical-components.md](./logical-components.md)、機能の設計 [rules.md](../functional-design/rules.md)（BR2.2、BR2.3、BR3.8）。

## 設計

### PF1 Node の版の確認（NFR1.1・NFR1.2・NFR1.3）

- 確認は `measure-node.mjs` が、測定を始める前に 1 回だけ行う。版の文字列は `process.versions.node` を入口で読み、純粋な関数 `isGuaranteedNode(versionString)` へ渡す（関数は `process` を読まない。試験は版の文字列を差し替えて呼ぶ）。
- 主版が 22 未満（読めない文字列を含む）なら、子プロセスを起こさずに MeasurementResult を `unobservable`、cause `child_process_not_countable`（理由コード CHILD_PROCESS_NOT_COUNTABLE。名前は entities.md の MeasurementResult の cause と同じ。設計監査 round 1 の観測 O03）で返す。23 以上は実行し、読んだ版の文字列を `measurementDefinition.toolVersion` に観測の事実として残す。
- 使う Node の機能は 22 の組込みだけ。ローカル（macOS）の差は保証しない。

### PF2 自分の処理の形（NFR1.4）

- 記録（lcov）は全文を 1 回だけ読み、1 回の走査で `Map<path, Map<lineNumber, hits>>` に変換する（重複の検査を兼ねる）。判定は分母の file の一覧を 1 回走査する。整形も 1 回の走査。どの段も入れ子の走査を持たない。
- 整列は path の code-point 順の 1 か所だけ（`order.mjs`）。JavaScript の既定の文字列比較は UTF-16 の順で、BMP 外の文字を含む名前で code-point 順とずれるため使わない。比較は「UTF-8 の byte 列の比較」（UTF-8 の byte 順は code-point 順と一致する）で行い、整列の前に各 path の byte 列を 1 回だけ作る（比較のたびに作らない）。ロケール依存の `localeCompare` は使わない（NFR2.5）。
- 追加の process は測定の子プロセス 1 つだけ。file ごとの process は起こさない。
- 網（NFR1.4 の 10 秒）: 合成の 20 万件の行の記録と 2,000 file の分母で、変換・判定・整形の 3 段を通した時間が 10 秒に収まる試験を置く。時間は試験側の `performance.now` で測り、核は時計を読まない。実行機の揺れで偽の失敗が出る場合は、走査の回数を数える試験（件数に比例する上限を超えない）に置き換え、理由を記録する。

### PF3 想定の大きさ（NFR1.5）

- 分母 2,000 file、行 20 万件、必須の試験 2,000 本は設計の見込みで、上限ではない。結果の文書の `denominator`・`perFile` が実際の大きさを出す。
- 記録の file の大きさに上限を置く（64 MiB）。超えた場合は読み込まずに壊れた記録として扱う（MEASUREMENT_FAILED）。無限に大きな入力でメモリを使い切るのを防ぐ。この値の持ち主は `lcov.mjs` の定数 1 か所。

### PF4 持たない物

- キャッシュ層、接続の使い回し、非同期の処理の分割、遅延読み込み、ページング: 1 回の command なので持たない。測定の結果は再利用せず、毎回測り直す（前回の値を根拠にしない。NFR4.8）。

## 検証の仕方

| 設計 | 試験 |
|---|---|
| PF1 | 版の文字列 `"21.9.0"`・`"22.0.0"`・`"26.1.0"`・`"abc"` を渡し、22 未満と読めないものは子を起こさず観測できず、22 以上は進む |
| PF2 | 合成の 20 万件の記録で 10 秒以内。BMP 外の文字を含む架空の path の並びが code-point 順になる。核の file に `localeCompare` が現れない |
| PF3 | 64 MiB を超える記録の file を作って（架空の内容の疎な file）、MEASUREMENT_FAILED になる |

## Assumptions & Open Questions

### Assumptions

- [assumption] UTF-8 の byte 列の比較で code-point 順になる性質は、Node の `Buffer.compare` で成り立つ。試験で BMP 外の文字を含む名前を使って確かめる。
- [assumption] 64 MiB は想定の大きさ（行 20 万件）の数十倍の余裕で、利用先の通常の記録を拒まない。実測は、コード生成の合成の記録で 1 度観測する。

### Open Questions

1. 64 MiB を入力の項目にするか（利用先が上げたい場合）。この単位は固定の定数で、要望が出たら別の単位で扱う（入力の項目を足す変更なので）。
