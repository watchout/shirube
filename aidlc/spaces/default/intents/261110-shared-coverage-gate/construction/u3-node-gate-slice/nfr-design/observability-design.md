# U3 u3-node-gate-slice — 観測の設計（observability-design）

門は 1 回の command なので、常時の監視・警報・分散追跡・メトリクスの送信・ダッシュボード・SLI/SLO は持たない。観測の面は 5 つ（結果の JSON、job summary、注釈 notice、出力値、標準エラー）。ここでは、その面の作り方と、自社で集計できる形、門自身の網羅率の記録を書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 入力: [observability-requirements.md](../nfr-requirements/observability-requirements.md)（NFR4.9〜NFR4.11、NFR10.1〜NFR10.3）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR7.3・NFR7.4）、[security-design.md](./security-design.md)（SC5・SC7）、[logical-components.md](./logical-components.md)、機能の設計 [rules.md](../functional-design/rules.md)（BR4.1〜BR4.7）、契約 [contract-summary.md](../../../inception/contract-design/contract-summary.md)（契約 2・3）。

## 設計

### OB1 失敗が必ず見える（NFR4.9）

- 成功でない結果は、区分・理由コード・名前つきの一覧で見える。`report.mjs` が固定の文型を 1 か所に持ち、一覧は `summaryListLimit` 件まで名前を出して、残りを件数で書く（完全な一覧は結果の JSON）。
- 観測できずの時、割合の欄は文字列 `not measured` とし、数字を出さない。一致でない結果に成功と読める語（`passed`・`OK` など）を使わない。試験で、区分ごとの文面に禁止語が現れないことを確かめる。

### OB2 入口の失敗（NFR4.10）

- 入口の失敗は標準エラーに 1 行の JSON（`{"code": "<理由コード>", "message": "<固定の短い説明>"}`）。複数行や環境変数の値は書かない。終了コードは 2。説明の文は固定の文型の表から選び、例外の message を載せない（security-design.md の SC7）。

### OB3 1 つの文書から 1 つの整形（NFR4.11）

- 流れ: 判定 → 文書（`ResultDocument`、1 つの値）→ そこから「結果の JSON」「summary」「notice」「出力値」を作る。文書を作った後に、判定を別の経路で読み直さない（区分・割合・閾値・動作・件数は文書の値だけを読む）。
- `report.mjs` は 4 つの面の関数を持つが、すべて文書の値だけを引数に取る。判定の関数（`judge`）を呼ばない。試験で、4 つの面が同じ文書から作られ、区分・割合・閾値・動作・件数が一致すること、`report.mjs` が `judge` の判定の関数を import していない（定数だけ）ことを確かめる。

### OB4 自社で集計できる数（NFR10.1〜NFR10.3）

- 結果の JSON が持つ数（区分、`coveredLines`、`totalLines`、`unmeasuredPaths` と `notRunPaths` の件数、`exclusionCount`、`measuredFileCount`）を、CI の成果物から集計できる。集計の仕方（どの job のどの欄を数えるか）は U8 の運用の手引きで決める。この単位は集計できる形で出すところまで。
- 観測の値は観測した記録だけから作り、観測できない時は `null`。指標に使うときは `outcome` が観測できずの実行を「値あり」に数えない。
- 結果の JSON は `schemaVersion` と `runId` を必ず持つ。

### OB5 門自身の網羅率の記録（NFR7.3・NFR7.4）

- 目的: 「行の網羅率 100%」を、CI の成否でなく観測した値で残す。
- 方法: 門を `scripts/coverage-gate/**` 自身に向けた入力（架空の小さな repo ではなく、この repo の実物を分母にする 1 回の実行）の結果の JSON を、門自身で測る。同じ範囲を Node の組込みの網羅率（`--experimental-test-coverage --test-coverage-include=scripts/coverage-gate/**` の lcov）で別に計算し、2 つの値（対象の file 数、行数、被覆の行数、割合）を突き合わせて記録する。突き合わせが食い違う、または対象が 0 件、記録が無い、実行されていないは成功に数えない。
- 再帰の回避: 門の試験は、一時 directory に作る架空の小さな repo を使い、実物の `scripts/coverage-gate/**` を入口の分母にした実行は、コード生成の検証の 1 回（試験の中ではなく、記録のための実行）だけにする。試験が門を走らせる門を走らせることを避ける。
- 記録の置き場: 単位の PR に含める追跡表（construction の記録）の中の証拠として書く案を第一とする。置き場の確定は、コード生成の計画で行う（Open Question 1）。

### OB6 持たない物

- 常時監視、警報、ダッシュボード、分散追跡、メトリクス送信、ログの集約、構造化ログの収集、相関 ID の伝播: 持たない。runId が文書に載ることで、1 実行を特定できる。

## 検証の仕方

| 設計 | 試験 |
|---|---|
| OB1 | 全ての区分・理由コードで、文面が固定の文型で、一覧が上限で切れ、観測できずで `not measured`。禁止語が無い |
| OB2 | 入口の失敗ごとに、標準エラーが 1 行の JSON で、環境変数の値が無い |
| OB3 | 4 つの面の値が文書と一致、`report` が判定の関数を import していない |
| OB4 | 結果の JSON に `schemaVersion`・`runId` と集計用の数が載る、観測できずで値が `null` |
| OB5 | 記録のための 1 回の実行で、2 つの計算が一致する。対象 0 件・記録なし・不一致を成功にしない負例 |

## Assumptions & Open Questions

### Assumptions

- [assumption] notice は 1 実行につき 1 つで、GitHub の注釈の表示の上限に収まる。
- [assumption] 実物の `scripts/coverage-gate/**` を分母にした 1 回の実行は、Node 22 で、Node の組込みの網羅率と一致する。一致しない場合は、一致しない事実を記録し、原因を調べるまで成功と数えない。

### Open Questions

1. OB5 の記録の置き場（追跡表の中か、別の機械が読める file か）。コード生成の計画で決める。
2. 指標の集計の数え方は、使い始めてから U8 で決める。
