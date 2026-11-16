# U3 u3-node-gate-slice — 観測の要件

この単位の門は、常駐の service ではなく、1 回の実行で結果を出す command。観測の面は、結果の JSON、job summary、注釈（notice）、出力値、標準エラーの 5 つだけで、監視の仕組み・分散追跡・警報は持たない。ここでは、その面が守る要件を NFR4・NFR10 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR4・NFR10、FR7.3、FR8.1〜FR8.5。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（契約 3 = 結果の JSON、契約 2 = 入口の出力先）。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR4.1〜BR4.7、BR5.3）。

## 要件

### NFR4 失敗を見える形にする（続き）

- **NFR4.9** 成功でない結果は、必ず理由コードと名前つきの一覧で見える。job summary と notice には、区分（一致・不一致・観測できず）、理由コード、未計測の file、流れていない必須の試験、失敗した試験の file の名前を書く（一覧は summaryListLimit 件まで名前を出し、残りは件数。完全な一覧は結果の JSON にある）。観測できずの割合の欄は「not measured」と書き、数字を出さない。成功と読める文言を、一致でない結果に使わない。[NFR4、FR4.2、FR7.3、BR4.4]
- **NFR4.10** 入口の失敗（引数の誤り、環境の誤り、書き込みの失敗、予期しない例外）は、標準エラーに 1 行の JSON（理由コードと、名前つきの短い説明）で書く。複数行の自由な文章や、環境変数の値を書かない。終了コードは 2。[NFR4、BR5.1、BR5.3]
- **NFR4.11** 結果の JSON、job summary、notice、出力値は、同じ 1 つの文書から 1 つの整形で作る。区分・割合・閾値・動作・件数が食い違わない。食い違いが起きない構造（文書を作った後に判定を別の経路で読み直さない）を試験で確かめる。[NFR4、FR8.2、BR4.5]

### NFR10 評価の指標

- **NFR10.1** この単位の効果は、自社で観測できる数で測る。結果の JSON が持つ数（区分、`coveredLines`、`totalLines`、`unmeasuredPaths` と `notRunPaths` の件数、`exclusionCount`）を CI の成果物から集計できる。口コミの点数や他社の動きは使わない。集計そのもの（どの job のどの欄を数えるか）は U8 で運用の手引きに書く。[NFR10]
- **NFR10.2** 観測の値は、観測した記録だけから作る。観測できない時は null で、申告された値や前回の値を入れない。指標に使う前に、`outcome` が観測できずの実行を「値あり」に数えない。[NFR10、S5、FR8.3]
- **NFR10.3** 結果の JSON は、版（`schemaVersion`）と実行の識別子（`runId`）を必ず持つ。後で集計する時に、どの実行のどの版の文書かが分かる。[NFR10、FR8.1]

## 持たない物（この単位の範囲外）

- 常時の監視、警報、ダッシュボード、分散追跡、メトリクスの送信、ログの集約。門は CI の 1 回の実行の command で、これらを持たない。
- 結果の JSON を sds-gate や監査の入力に組み込むこと（読める形で出すところまで）。

## Assumptions & Open Questions

### Assumptions

- [assumption] CI の成果物として結果の JSON を残す配線（artifact の upload）は U7 が行う。この単位は、`--result` の path に書くところまで。
- [assumption] notice の注釈の数（1 実行につき 1 つ）は、GitHub の注釈の表示の上限に収まる。

### Open Questions

1. 指標の集計の数え方（どの欄をどの単位で数えるか）は、使い始めてから U8 で決める。今は、集計できる形で出すところまで。
