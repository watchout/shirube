# U4 u4-thresholds-and-modes — 論理部品（logical-components）

この単位が `scripts/coverage-gate/` に足す・触る file、規則の持ち主、依存の向き、失敗の範囲、試験の置き方をここで決める。名前は設計の案で、コード生成の計画で確定する（変えるときは、この文書と追跡表を先に直す）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)、[entities.md](../functional-design/entities.md)。NFR の要件: [tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR3・NFR6・NFR7・NFR9）。部品の判断: [decisions.md](../../../inception/domain-design/decisions.md)（ADR-001〜006）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 土台: U3 の [logical-components.md](../../u3-node-gate-slice/nfr-design/logical-components.md)（13 file、LC1〜LC5）。U3 の実装（PR #104 の head `48024643e63c70fa5df62714a129972457181406`）の行数: `cli.mjs` 106、`input.mjs` 94、`judge.mjs` 138、`report.mjs` 168、ほかは 14〜116 行。コード生成は U3 の統合後の `main` を土台にし、その時点で実物と突き合わせ直す。

## LC1 file の分け方と依存の向き

| file（`scripts/coverage-gate/`） | 種類 | この単位での変更 | 受け持つ規則 |
|---|---|---|---|
| `threshold.mjs` | 核（純粋）、**新規** | 例外の検査と、定数（rationaleMaxLength、decisionUrlMaxLength、decisionUrlShape、例外の許すキー）の持ち主 | BR6.1〜BR6.6 |
| `input.mjs` | 核（純粋） | 既知のキーの集合に `threshold` と `mode` を足す。`mode` の検査（完全一致）と、`threshold.mjs` の呼び出し。検査済みの入力に `mode` と例外を載せる | BR6.1、BR7.1 の入力の側 |
| `judge.mjs` | 核（純粋） | 定数 `MODES`・`DEFAULT_MODE` を足す。実際の閾値の選択、比較、shouldFail の決定（2 段目）。例外を verdict に早く載せる | BR7.1〜BR7.6 |
| `report-exception.mjs` | 核（純粋）、**新規** | 例外の行・節、record-only の行、注釈の種類の表、動作・例外の固定の文型の持ち主 | BR8.2〜BR8.4 |
| `report.mjs` | 核（純粋） | 文書の組み立てで `mode`・`thresholdException`・`effectiveThresholdPercent` に値を持たせる。summary と notice の組み立てで `report-exception.mjs` を呼ぶ | BR8.1、BR8.5、BR8.6 |
| `sanitize.mjs`、`order.mjs`、`lcov.mjs`、`events.mjs` | 核 | 変更しない | — |
| `cli.mjs`、`emit.mjs`、`resolve.mjs`、`runner.mjs`、`measure-node.mjs`、`events-reporter.mjs` | adapter | 原則変更しない（終了コードは shouldFail の写しのまま。入口は mode で分岐しない）。`cli.mjs` が検査済みの `mode` を判定へ渡す配線で触る場合だけ最小の変更 | BR7.4（入口は写すだけ） |

- 依存の向き（追加分）: `input → threshold`、`threshold` は他の file に依存しない（`judge` の定数 `DEFAULT_THRESHOLD` だけ import して、例外の値の上限を導く。100 を再度書かない）、`report → report-exception → {judge の定数, sanitize}`。核は adapter を import しない。循環しない。
- 分けた理由: U3 の `input.mjs`（94 行）・`report.mjs`（168 行）に例外の検査と表示を足すと、複雑さと行数の予算（NFR9.1・NFR9.3）に近づく。持ち主の分担（BR6 = 入力、BR7 = 判定、BR8 = 出力）を崩さずに、検査と表示を別の file に置く。
- 新しい file は 2 つ（`threshold.mjs`、`report-exception.mjs`）。どちらも 300 行以内の見込み。触る既存 file は `input.mjs`・`judge.mjs`・`report.mjs`（と、必要なら `cli.mjs`）で、足した後も 300 行を超えそうなら、行を詰めずに部品を分ける。
- 純粋な核（`threshold`・`report-exception` を含む）に `Date`・`Math.random`・`randomUUID`・`process.env`・`node:fs`・`node:child_process` と、ネットワークの module を置かない。
- 依存は Node の組込みと既存の `scripts/hygiene/lib.mjs` だけ（NFR6.1）。`package.json` を変えず、新しい action・service を足さず、workflow を変えない（NFR6.2）。構造の検査（dependency-cruiser、knip、jscpd、ESLint）は既存の設定のまま通す。試験専用の export には U3 と同じ印を付ける（NFR9.2）。

## LC2 処理の流れ（追加分）

1. `input`: U3 の検査の後で `mode` と `threshold` を検査する（SC2 の順。最初の失敗で止める）。失敗は入力の失敗の文書（`mode` は null）→ 終了コード 2。
2. 測定（U3 のまま。動作・例外に依らない。SL3）。
3. `judge`: 1 段目（区分と理由、動作を見ない）→ 実際の閾値を選んで比較 → 2 段目（shouldFail）。例外は早期の観測できずの経路より前に verdict へ載せる（RL4）。
4. `report`: 1 つの文書を作り、`report-exception` が例外・record-only の行を足す。条件が無ければ追加は出ない（OB3）。
5. `emit` → 終了コードは shouldFail の写し。

## LC3 失敗の範囲（failure domain）

| 失敗の領域 | 起きうること | 範囲を止める物 |
|---|---|---|
| 例外・動作の入力 | 形の不正、値の不正、未知のキー | 測定に進まない。終了コード 2、`mode` は null（RL3） |
| 判定の 2 段目 | mode の取り違え（record-only を enforce と読むなど） | shouldFail の決定を判定の核の 1 か所に置く。6 通りの試験（RL1） |
| 整形 | 例外が出ない、面ごとに食い違う | 1 つの文書から 4 つの面（OB4）。例外ありの 3 つの区分で残る試験（RL4） |
| U3 の出力の後ろ向きの互換 | 例外も動作も無い入力の出力が変わる | golden の比較（RL6） |

- 被害の範囲: 門の 1 回の実行の中に閉じる。共有の状態は無い（SL2）。

## LC4 共有の資源（規則の持ち主）

| 資源 | 持ち主 | 使う側 |
|---|---|---|
| 動作の集合・既定（`MODES`、`DEFAULT_MODE`）、閾値の既定（行 100%） | `judge.mjs` | `input`・`threshold`（既定から導く）、`report-exception`、試験 |
| 例外の根拠・URL の上限と URL の形、例外の許すキー | `threshold.mjs` | `input`、試験 |
| 例外・動作・record-only の表示の文型、注釈の種類の表 | `report-exception.mjs` | `report`、試験 |
| 既存の無害化・並べ順 | `sanitize.mjs`・`order.mjs`（変更しない） | `report-exception`、`report` |

- 同じ値を 2 か所に書かない（NFR3.1）。例外の値の上限（100 未満）は `DEFAULT_THRESHOLD` から導き、100 を別に書かない。試験は、新しい値（`enforce`、`record-only`、`300`、URL の形）の literal が持ち主の file にだけ現れることを検査する（NFR3.2）。shouldFail を書き換える code が判定の核以外に無いことを、file の中身を調べる試験で確かめる（NFR3.3）。

## LC5 試験の置き場と方法

- 方法（NFR7.1〜NFR7.4）: 規則（BR6.1〜BR8.6）ごとに、失敗する試験（Red）を先に書いて失敗を確かめ、実装（Green）で通す。Red と Green は PR の履歴に残る別々の commit にする。試験は `node:test` と `node:assert/strict` だけ。skip・todo を置かない。fixture は架空の owner・repo・番号の決定の URL と架空の根拠だけ（12 文字の英数字を `token` に入れた形を使わない）。
- 置き場: 既存の `npm test` の対象（`tests/*.test.mjs`）に入る位置。新しい file ごとに `tests/coverage-gate-threshold.test.mjs`、`tests/coverage-gate-report-exception.test.mjs`。既存の `coverage-gate-input.test.mjs`・`coverage-gate-judge.test.mjs`・`coverage-gate-report.test.mjs`・`coverage-gate-cli.test.mjs` には、mode と例外の組み合わせを足す。U3 の「`threshold`・`mode` は未知のキー」の試験は意図して置き換える（RL6、NFR7.3）。golden の元の例は `tests/` の fixture（`tests/coverage-gate-fixtures.mjs` か、別の補助 file）に置く。
- 行の網羅率: 足す・触る `scripts/coverage-gate/` の file すべてに 100%（NFR7.2）。確認コマンドは U3 のまま。観測した値を機械が読める形で記録する。

## Assumptions & Open Questions

### Assumptions

- [assumption] file の分け方（新規 2 file）は設計の案で、コード生成の計画で行数の見込みを見て統合・分割を決める（NFR9.1 を守る方向だけに動かす）。`cli.mjs` を触るかは、U3 の統合後の実物を読んで決める。
- [assumption] dependency-cruiser の既存の設定は、`input → threshold` と `report → report-exception` の import の向きを許す。許さない場合は、設定を変えず（検査を緩める変更は同じ PR に混ぜない）、file の置き方を直す。

### Open Questions

なし。
