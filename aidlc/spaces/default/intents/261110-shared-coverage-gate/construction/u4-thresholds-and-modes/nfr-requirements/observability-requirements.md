# U4 u4-thresholds-and-modes — 観測の要件

この単位は、閾値を下げた事実と動作を、人が読む面（job summary、注釈）と機械が読む面（結果の JSON、出力値）に出す。観測の面は U3 のまま 5 つで、監視の仕組みは持たない。ここでは、その面が守る要件を NFR4・NFR10 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR4・NFR10、FR3.4・FR3.5、FR6.3・FR6.4、FR8.4。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（契約 3 = 結果の JSON）。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR8.1〜BR8.6）。土台: U3 の [observability-requirements.md](../../u3-node-gate-slice/nfr-requirements/observability-requirements.md)（NFR4.9〜NFR4.11、NFR10.1〜NFR10.3）。

## 要件

### NFR4 失敗を見える形にする（続き。NFR4.1〜NFR4.7 は reliability-requirements.md）

- **NFR4.8** 閾値を下げた事実は、結果の区分（一致・不一致・観測できず）に関わらず、job summary の最初の行（結果の見出しより前）、表の閾値の欄、例外の節の 3 か所に出る。判定: 一致・不一致・観測できずの 3 つの結果で、最初の行が例外の行であること。[NFR4、FR3.5、BR8.2]
- **NFR4.9** 例外を使った結果の notice は、成功でも通常の notice にせず、実際の閾値と「閾値を下げている」旨を書く。動作が record-only で一致でない結果の notice は、成功とは書かず、落とさない旨を書く。観測できなかった結果は「計測不能」と書く。判定: 注釈の種類と文面を、結果と動作と例外の組み合わせの表（rules.md BR8.3）のすべての行で確かめる。[NFR4、FR3.5、FR6.3、BR8.3、BR8.4]
- **NFR4.10** 閾値を下げていない結果と、動作が enforce の結果は、summary・notice に例外や record-only の記述を出さない（U3 と同じ）。判定: 例外なし・enforce の入力で、追加の行・節が出ない。[NFR4、AC4.3.3、BR8.5]
- **NFR4.11** 結果の JSON は、動作（`mode`）、主張された閾値の値、実際の閾値、決定の URL、根拠を、同じ文書から 1 つの整形で出す。JSON・summary・notice・出力値で閾値・動作が食い違わない構造（文書を作った後に判定を別の経路で読み直さない）を、U3 の NFR4.11 の試験の対象に広げる。[NFR4、BR8.1、BR8.6]
- **NFR4.12** 出力値（GITHUB_OUTPUT）は名前を増やさない（outcome、should-fail、mode、line-ratio-percent、effective-threshold-percent、exclusion-count、schema-version の 7 つ）。動作と実際の閾値は既存の `mode` と `effective-threshold-percent` に載る。出力値に自由な文字列を書かない。判定: 出力値の名前の集合が U3 と等しい。[NFR4、NFR5、BR8.5]

### NFR10 評価の指標

- **NFR10.1** 閾値の例外と動作の利用は、自社で観測できる数で測る。結果の JSON の `mode`、`thresholdException` の有無、`effectiveThresholdPercent` を CI の成果物から集計できる（例外を使った実行の数、record-only の実行の数）。口コミの点数や他社の動きは使わない。集計の仕方は U8 の手引きに書く。[NFR10]
- **NFR10.2** 観測の値は、観測した記録と入力から作る。観測できない時は null で、申告された値や前回の値を入れない。主張された値と実際の閾値は別の項目で、実際の閾値は判定が比べた値である。[NFR10、S5]

## 持たない物（この単位の範囲外）

- 常時の監視、警報、ダッシュボード、メトリクスの送信。
- 結果の JSON を sds-gate や監査の入力に組み込むこと（読める形で出すところまで）。
- 出力値の名前の追加（契約の公開の面の変更になる）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 注釈の種類（warning）の画面での見え方は、GitHub Actions の実行画面で確かめる。この単位は文面と種類の行を確かめ、画面の見え方は U7 の配線の後の観測とする。

### Open Questions

なし。
