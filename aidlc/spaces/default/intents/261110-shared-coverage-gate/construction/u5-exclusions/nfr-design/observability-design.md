# U5 u5-exclusions — 観測の設計

この単位は、除外した file と理由と件数を、人が読む面（job summary、注釈）と機械が読む面（結果の JSON、出力値）に出す。観測の面は U3・U4 のまま 5 つで、監視の仕組みは持たない。ここでは、各面に何をどう出すかを決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [observability-requirements.md](../nfr-requirements/observability-requirements.md)（NFR4.6〜NFR4.12、NFR10.1・NFR10.2）。機能の設計: [rules.md](../functional-design/rules.md)（BR11.1〜BR11.6）。
- 土台: U3 の [observability-design.md](../../u3-node-gate-slice/nfr-design/observability-design.md)、U4 の [observability-design.md](../../u4-thresholds-and-modes/nfr-design/observability-design.md)。

## 面ごとの出し方

| 面 | 除外が 0 件 | 除外が 1 件以上 |
|---|---|---|
| 結果の JSON | `exclusions: []`、`exclusionCount: 0`（U4 と同じ） | 全件を `{path, reason, kind}` で path の符号点順に残す。`exclusionCount` は件数 |
| job summary | 追加なし（U4 と同じ） | 表の Exclusions の行は件数（U3 のまま）。「Excluded files (N):」の節に「path (kind): reason」を先頭 20 件、残りは件数と「全体は結果の file にある」旨の 1 行。path と理由は無害化 |
| notice | 追加なし | 本文の最後に固定の文「Exclusions: N.」。注釈の種類は変えない。path・理由は載せない |
| 出力値 | `exclusion-count` = 0 | `exclusion-count` = 件数。名前は 7 つのまま |
| 標準エラー | 入口の失敗だけ（U3 のまま） | 同じ |

## OB1 結果の JSON（NFR4.6、NFR4.9）

- 除外の一覧と件数は、検査済みの入力の宣言の `{path, reason}` に、解決が決めた kind（source・test・both）を足して作る（宣言を観測した値として作らない。kind は分母・必須の試験との照合で決まる）。`denominator.resolvedFileCount` は除外を引いた後の件数、`measuredFileCount` は計測できた件数。同じ文書を 1 回作り、JSON・summary・notice・出力値がこの文書だけから作られる（文書を作った後に別の経路で読み直さない）。

## OB2 job summary（NFR4.7）

- 最初の行（頭の 1 行）は除外が 1 件以上のとき毎回出す（NFR4.12、BR11.6）。閾値の例外の行があればその次。件数は文書の exclusions から数え直す。節は除外が 1 件以上のときだけ。一覧は「path (kind): reason」。上限は引数で受ける。0・1・20・21 件の境界の試験で、節の有無・一覧の件数・残りの行を確かめる。

## OB3 notice（NFR4.8）

- 固定の文「Exclusions: N.」を添えるだけで、注釈の種類は変えない（除外は呼び出し側の宣言された正当な選択）。結果と動作と閾値の例外と除外の有無の組み合わせの表のすべての行で、種類と文面を確かめる。

## OB4 出力値の名前（NFR4.10）

- 7 つの名前（outcome、should-fail、mode、line-ratio-percent、effective-threshold-percent、exclusion-count、schema-version）のまま。自由な文字列を書かない。名前の集合が U4 と等しい試験。

## OB5 除外した file は種別に応じて判定の一覧に現れない（NFR4.11）

- kind が source または both の path は unmeasuredPaths・perFile に現れず、kind が test または both の path は notRunPaths に現れない。名指さない必須の試験が流れていない時は notRunPaths に残る。除外した名前は exclusions に理由と種別つきで残り、同じ文書から読める。重なりの反例（分母のソースだけを除外し、同名の型の試験を除外せず流さない = notRunPaths に出る）を 1 つの結合試験で確かめる。

## OB6 集計（NFR10.1）

- 除外の利用は、結果の JSON の `exclusionCount`・`exclusions`・`denominator.resolvedFileCount` を CI の成果物から集計できる（除外を使った実行の数、件数の分布、理由の傾向）。集計の仕方は U8 の手引きに書く。口コミの点数や他社の動きは使わない。

## OB7 観測の値の出どころ（NFR10.2）

- 観測の値は記録と入力から作り、観測できない時は null。除外の一覧は宣言そのもので観測した値として扱わない。除外が割合を上げたかどうかを門は書かず、監査が分母の件数と exclusions から読む（rules.md「門が保証しないこと」）。

## 持たない物（この単位の範囲外）

- 常時の監視、警報、ダッシュボード、メトリクスの送信。結果の JSON を sds-gate や監査の入力に組み込むこと。出力値の名前の追加。除外が割合を不当に上げたかどうかの機械の判定。

## Assumptions & Open Questions

### Assumptions

- [assumption] 注釈の種類の画面での見え方は、GitHub Actions の実行画面で確かめる。この単位は文面と種類の行を確かめ、画面の見え方は U7 の配線の後の観測とする。

### Open Questions

なし。
