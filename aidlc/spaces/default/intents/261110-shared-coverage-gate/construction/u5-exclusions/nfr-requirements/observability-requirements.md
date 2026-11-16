# U5 u5-exclusions — 観測の要件

この単位は、除外した file と理由と件数を、人が読む面（job summary、注釈）と機械が読む面（結果の JSON、出力値）に出す。観測の面は U3・U4 のまま 5 つで、監視の仕組みは持たない。ここでは、その面が守る要件を NFR4・NFR10 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR4・NFR10、FR5.3、FR8.4。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（契約 3 = 結果の JSON）。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR11.1〜BR11.5）。土台: U3 の [observability-requirements.md](../../u3-node-gate-slice/nfr-requirements/observability-requirements.md)、U4 の [observability-requirements.md](../../u4-thresholds-and-modes/nfr-requirements/observability-requirements.md)。

## 要件

### NFR4 失敗を見える形にする（続き。NFR4.1〜NFR4.5 は reliability-requirements.md）

- **NFR4.6** 除外した file と理由は、結果の区分（一致・不一致・観測できず）に関わらず、結果の JSON の `exclusions` に path の符号点順で全件が残り、`exclusionCount` が件数になる。除外が 0 件の時は、空の配列と 0。判定: 一致・不一致・観測できずの 3 つの結果で、exclusions と exclusionCount が入力の宣言と過不足なく一致する。[NFR4、BR11.1]
- **NFR4.7** job summary は、除外が 1 件以上あるとき「Excluded files (N):」の節を出し、1 件ずつ「path: reason」を書く。先頭の SUMMARY_LIST_LIMIT（20 件）までを出し、残りは件数と「全体は結果の file にある」旨の 1 行にする。path と理由は U3 の無害化を通す。除外が 0 件のときは節を出さない。判定: 0・1・20・21 件の境界で、節の有無と一覧の件数と残りの行を確かめる。[NFR4、BR11.2]
- **NFR4.8** notice は、除外が 1 件以上あるとき、本文の最後に固定の文「Exclusions: N.」を添える。注釈の種類（notice・warning・error）は U3・U4 の表のまま変えない。path も理由も notice に載せない。判定: 注釈の種類を、結果と動作と閾値の例外と除外の有無の組み合わせの表のすべての行で確かめる。除外 0 件の行は U4 と同じ。[NFR4、BR11.3]
- **NFR4.9** 結果の JSON は、除外の一覧、件数、除外を引いた後の分母の件数（`denominator.resolvedFileCount`）、計測できた件数（`measuredFileCount`）を、同じ文書から 1 つの整形で出す。JSON・summary・notice・出力値で除外の件数・分母の件数が食い違わない構造（文書を作った後に別の経路で読み直さない）を、U3 の NFR4.11・U4 の NFR4.11 の試験の対象に広げる。[NFR4、BR11.1、BR11.5]
- **NFR4.10** 出力値（GITHUB_OUTPUT）は名前を増やさない（outcome、should-fail、mode、line-ratio-percent、effective-threshold-percent、exclusion-count、schema-version の 7 つ）。除外の件数は既存の `exclusion-count` に載る。出力値に自由な文字列を書かない。判定: 出力値の名前の集合が U4 と等しい。[NFR4、NFR5、BR11.3]
- **NFR4.11** 除外した file は、unmeasuredPaths・notRunPaths・perFile のどれにも現れない（分母にない file は判定の対象外）。除外が必須の試験や分母に残る file の状態を隠していないことが、結果の JSON の同じ文書から読める。判定: 除外した path がこれら 3 つに現れない試験と、必須の試験が流れていない時に notRunPaths に残る試験。[NFR4、BR10.3]

### NFR10 評価の指標

- **NFR10.1** 除外の利用は、自社で観測できる数で測る。結果の JSON の `exclusionCount`、`exclusions`、`denominator.resolvedFileCount` を CI の成果物から集計できる（除外を使った実行の数、除外の件数の分布、除外の理由の傾向）。口コミの点数や他社の動きは使わない。集計の仕方は U8 の手引きに書く。[NFR10]
- **NFR10.2** 観測の値は、観測した記録と入力から作る。除外の一覧は宣言そのもので、観測した値として扱わない。観測できない時は null で、申告された値や前回の値を入れない。除外が割合を上げたかどうかを門は書かず、監査が `resolvedFileCount` と `exclusionCount` と `exclusions` から読む（rules.md「門が保証しないこと」）。[NFR10、S5、BR11.5]

## 持たない物（この単位の範囲外）

- 常時の監視、警報、ダッシュボード、メトリクスの送信。
- 結果の JSON を sds-gate や監査の入力に組み込むこと（読める形で出すところまで）。
- 出力値の名前の追加（契約の公開の面の変更になる）。
- 除外が割合を不当に上げたかどうかの機械の判定（監査が読む）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 注釈の種類の画面での見え方は、GitHub Actions の実行画面で確かめる。この単位は文面と種類の行を確かめ、画面の見え方は U7 の配線の後の観測とする。

### Open Questions

なし。
