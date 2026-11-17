# U5 u5-exclusions — 論理部品（logical-components）

この単位が `scripts/coverage-gate/` に足す・触る file、規則の持ち主、依存の向き、失敗の範囲、試験の置き方をここで決める。名前は設計の案で、コード生成の計画で確定する（変えるときは、この文書と追跡表を先に直す）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)、[entities.md](../functional-design/entities.md)。NFR の要件: [tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR3・NFR6・NFR7・NFR9）。部品の判断: [decisions.md](../../../inception/domain-design/decisions.md)（ADR-001）。
- 土台: U3 の [logical-components.md](../../u3-node-gate-slice/nfr-design/logical-components.md) と U4 の [logical-components.md](../../u4-thresholds-and-modes/nfr-design/logical-components.md)。現状: 統合済みの `origin/main` `7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e` の行数（`input.mjs` 117、`resolve.mjs` 42、`judge.mjs` 158、`report.mjs` 177、`report-exception.mjs` 64、`cli.mjs` 114、`threshold.mjs` 84）。コード生成はその時点の `main` と SHA-256 で突き合わせ直す。

## LC1 file の分け方と依存の向き

| file（`scripts/coverage-gate/`） | 種類 | この単位での変更 | 受け持つ規則 |
|---|---|---|---|
| `exclusions.mjs` | 核（純粋）、**新規** | 除外の宣言の検査（形・必須・理由・重複・決定の URL）と並べ替え、解決した分母のソースと必須の試験の集合に対する種別（source・test・both）の決定と集合の差（完全一致、全部除外の確かめ）。除外の項目の持てるキー（入力は path、reason。結果は path、reason、kind）の持ち主 | BR9.1〜BR9.5、BR10.1、BR10.2 |
| `threshold.mjs` | 核（純粋） | 根拠の 1 行の文の規則と決定の URL の形の規則（decisionUrlShape・decisionUrlMaxLength）を、field の名前を受ける関数として export し、除外の理由も同じ関数で確かめる。U4 の呼び出しの結果は変えない | BR9.3、BR9.5（規則の持ち主は変えない） |
| `input.mjs` | 核（純粋） | 既知のキーの集合に `exclusions` を足し、`exclusions.mjs` の検査を呼ぶ。検査済みの入力に並べ替えた `exclusions` を載せる | BR9.1 の入力の側 |
| `resolve.mjs` | adapter | 既存の解決のあとに `exclusions.mjs` の種別の決定と集合の差を 1 回呼び、除外を引いた分母と除外を引いた必須の試験、除外した path と種別を返す。分母を決める唯一の場所 | BR10.1〜BR10.3、BR10.6 |
| `report-exclusions.mjs` | 核（純粋）、**新規** | summary の最初の行（「Excluded from the gate: N (source S, test T, both B)」）、「Excluded files (N):」の節、notice の固定の文「Exclusions: N.」の持ち主。一覧の上限は引数で受け、値を持たず import もしない | BR11.2、BR11.3、BR11.6 |
| `report.mjs` | 核（純粋） | 文書の `exclusions`（path・reason・kind）・`exclusionCount`・`denominator.resolvedFileCount` に値を持たせる。summary と notice で `report-exclusions.mjs` を呼び、一覧の上限（`report.mjs` が持つ SUMMARY_LIST_LIMIT。U3 から続く持ち主）を引数として渡す | BR11.1、BR11.4〜BR11.6 |
| `judge.mjs` | 核（純粋） | **変更しない**（除外を知らない。BR10.6） | — |
| `sanitize.mjs`、`order.mjs`、`lcov.mjs`、`events.mjs`、`report-exception.mjs` | 核 | 変更しない | — |
| `cli.mjs`、`emit.mjs`、`runner.mjs`、`measure-node.mjs`、`events-reporter.mjs` | adapter | 原則変更しない。`cli.mjs` が解決の戻り値（除外した path）を出力の組み立てへ渡す配線で触る場合だけ最小の変更 | BR10.4（入口は引数 2 つだけ） |

- 依存の向き（追加分）: `input → exclusions → threshold`（理由の規則だけ）、`resolve → exclusions`、`report → report-exclusions → sanitize`（SUMMARY_LIST_LIMIT は `report.mjs` が持ち、`report-exclusions` へ引数として渡す。`report-exclusions` は上限の持ち主を import しないので、値の複製も循環も生じない。`.dependency-cruiser.cjs` の no-circular は error のまま）。核は adapter を import しない。循環しない。`threshold` は他の file に依存しない（U4 のまま）。
- 分けた理由: 除外の検査と集合の差を 1 つの file に置けば、除外の規則の持ち主が 1 か所になる（NFR3.1・NFR3.3）。表示は U3・U4 の `report.mjs`（177 行）に足すと予算（NFR9.1）に近づくので、別の file にする。
- 新しい file は 2 つ（`exclusions.mjs`、`report-exclusions.mjs`）。どちらも 300 行以内の見込み。触る既存 file は `threshold.mjs`・`input.mjs`・`resolve.mjs`・`report.mjs`（と、必要なら `cli.mjs`）で、足した後も 300 行を超えそうなら、行を詰めずに部品を分ける。
- 純粋な核（`exclusions`・`report-exclusions` を含む）に `Date`・`Math.random`・`randomUUID`・`process.env`・`node:fs`・`node:child_process` と、ネットワークの module を置かない。
- 依存は Node の組込みと既存の `scripts/hygiene/lib.mjs` だけ（NFR6.1）。`package.json` を変えず、新しい action・service を足さず、workflow を変えない（NFR6.2）。構造の検査（dependency-cruiser、knip、jscpd、ESLint）は既存の設定のまま通す。試験専用の export には U3・U4 と同じ印を付ける（NFR9.2）。

## LC2 処理の流れ（追加分）

1. `input`: U3・U4 の検査のあとで `exclusions` を検査する（形 → 必須 → 理由 → 重複 → 決定の URL。最初の失敗で止める）。成功なら path の符号点順に並べ替えて持つ。失敗は入力の失敗の文書 → 終了コード 2。
2. `resolve`: 既存の解決で分母と必須の試験を決め、`exclusions.mjs` の集合の差を 1 回呼ぶ。分母のソースにも必須の試験にも無い path は TARGET_UNRESOLVED、分母または必須の試験が空になる除外は TARGET_EMPTY（どちらも終了コード 2）。成功なら、除外を引いた分母と除外した path を返す。
3. 測定（U3 のまま。除外に依らない）。
4. `judge`: 引いた後の分母と引いた後の必須の試験、測定の結果、動作、閾値の例外を受ける（入力の形は変わらない）。
5. `report`: 1 つの文書を作り、`report-exclusions` が summary の節と notice の文を足す。除外が 0 件なら追加は出ない。
6. `emit` → 終了コードは shouldFail の写し。

## LC3 失敗の範囲（failure domain）

| 失敗の領域 | 起きうること | 範囲を止める物 |
|---|---|---|
| 除外の宣言の入力 | 形の不正、必須の不足、理由の不正、重複、未知のキー | 測定に進まない。終了コード 2、exclusions は空（RL4） |
| 分母・必須の試験との一致 | どちらにも無い path、全部除外（分母または必須の試験が空） | 測定に進まない。終了コード 2（RL5） |
| 除外が試験の未実行・未計測を隠す形 | 名指さない必須の試験を外す、分母に残る file の未計測を隠す、source の除外で同名の型の試験が外れる | 試験を外せるのは理由つきで名指した test の除外だけ。名指さない試験と source の除外は必須のまま。判定の核は変えない。負例の試験（RL6、重なりの反例） |
| 整形 | 面ごとに食い違う、path が命令として解釈される | 1 つの文書から 4 つの面（OB1）。無害化（SC5） |
| U3・U4 の出力の後ろ向きの互換 | 除外なしの入力の出力が変わる | golden の比較（RL9） |

- 被害の範囲: 門の 1 回の実行の中に閉じる。共有の状態は無い（SL3）。

## LC4 共有の資源（規則の持ち主）

| 資源 | 持ち主 | 使う側 |
|---|---|---|
| 理由の 1 行の文の規則（上限、含めない並び、制御文字） | `threshold.mjs` | `exclusions`、`threshold` 自身（U4）、試験 |
| 除外の項目の持てるキー（入力は path、reason。結果は kind を足す）、除外の検査、種別の決定、集合の差 | `exclusions.mjs` | `input`、`resolve`、試験 |
| 除外の表示の文型（頭の 1 行「Excluded from the gate: N (…)」、「Excluded files (N):」、「Exclusions: N.」） | `report-exclusions.mjs` | `report`、試験 |
| 一覧の上限（SUMMARY_LIST_LIMIT） | `report.mjs`（U3 から続く持ち主。値は変えない） | `report` が引数として `report-exclusions` へ渡す。`report-exclusions` は値を持たない |
| 決定の URL の形の規則（decisionUrlShape・decisionUrlMaxLength） | `threshold.mjs`（U4 の持ち主） | `exclusions`（共有の関数を呼ぶ）、`threshold` 自身 |
| 既存の無害化・並べ順 | `sanitize.mjs`・`order.mjs`（変更しない） | `report-exclusions`、`report` |

- 同じ値を 2 か所に書かない（NFR3.1）。理由の規則を除外の側に写さない。試験は、新しい値（除外の項目のキー名、`Excluded files`、`Exclusions:`）の literal が持ち主の file にだけ現れることを検査する（NFR3.2）。分母から file を引く code が `exclusions.mjs` と `resolve.mjs` の呼び出し 1 か所にしか無く、判定の核に除外の語が無いことを、file の中身を調べる試験で確かめる（NFR3.3）。

## LC5 試験の置き場と方法

- 方法（NFR7.1〜NFR7.5）: 規則（BR9.1〜BR11.6）ごとに、失敗する試験（Red）を先に書いて失敗を確かめ、実装（Green）で通す。Red と Green は PR の履歴に残る別々の commit にする。試験は `node:test` と `node:assert/strict` だけ。skip・todo を置かない。fixture は架空の path と理由だけ（12 文字の英数字を `token` に入れた形を使わない）。
- 置き場: 既存の `npm test` の対象（`tests/*.test.mjs`）に入る位置。新しい file ごとに `tests/coverage-gate-exclusions.test.mjs`、`tests/coverage-gate-report-exclusions.test.mjs`。既存の `coverage-gate-input.test.mjs`・`coverage-gate-resolve.test.mjs`・`coverage-gate-report.test.mjs`・`coverage-gate-cli.test.mjs` に、除外の組み合わせを足す。構造の試験（環境変数の読みが 0 件、ネットワークの module と file の読み書きが無い、判定の核に除外の語が無い）は新しい file の試験に置く。U3・U4 の「`exclusions` は未知のキー」の試験 4 件は、別の未知のキーで性質を保って置き換える（RL12）。
- 行の網羅率: 足す・触る `scripts/coverage-gate/` の file すべてに 100%（NFR7.2）。確認コマンドは U3 のまま。観測した値を機械が読める形で記録する。

## Assumptions & Open Questions

### Assumptions

- [assumption] file の分け方（新規 2 file）は設計の案で、コード生成の計画で行数の見込みを見て統合・分割を決める（NFR9.1 を守る方向だけに動かす）。`threshold.mjs` の根拠の検査の関数の形（field の名前を受けるか）は、U4 の統合後の実物を読んで決める。`cli.mjs` を触るかも実物を読んで決める。
- [assumption] dependency-cruiser の既存の設定は、`input → exclusions → threshold` と `report → report-exclusions` の import の向きを許す。許さない場合は、設定を変えず（検査を緩める変更は同じ PR に混ぜない）、file の置き方を直す。

### Open Questions

なし。
