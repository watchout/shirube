# U3 u3-node-gate-slice — 論理部品（logical-components）

機能の設計の 6 つの部品を、`scripts/coverage-gate/` の file にどう分けるか、依存の向き、失敗の範囲、共有の資源をここで決める。名前は設計の案で、コード生成の計画で確定する（変えるときは、この文書と追跡表を先に直す）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)（部品と責務）、[rules.md](../functional-design/rules.md)、[entities.md](../functional-design/entities.md)。NFR の要件: [../nfr-requirements/](../nfr-requirements/)（特に tech-stack-decisions.md の NFR3・NFR9）。部品の判断: [decisions.md](../../../inception/domain-design/decisions.md)（ADR-001〜006）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 既存部品の現状（`origin/main` = `0f9ea89175ece32604e0dcfde9db28462f0d2f35` の実物。`scripts/hygiene/lib.mjs` は blob `90195d5ec2510c32ba726c9c831a0c84a3849fa9`、SHA-256 `294ca623c2a002aafe1940544ec178b27f07085528e6192b14c1edf2a51117c4`）: `resolveTargets`・`trackedFiles` を公開する。この単位は変更しない。

## LC1 file の分け方と依存の向き

| file（`scripts/coverage-gate/`） | 部品 | 種類 | 受け持つ規則 | 触れる外の物 |
|---|---|---|---|---|
| `order.mjs` | 並べ順（共有） | 核（純粋） | NFR2.5 の code-point 順の比較を 1 か所だけ持つ（PF2） | なし |
| `judge.mjs` | CoverageJudge | 核（純粋） | BR3.1〜BR3.7、定数（区分、理由コード、閾値の既定） | なし |
| `input.mjs` | CoverageInputContract（検査） | 核（純粋） | BR1.1〜BR1.4、BR1.5 と BR1.8 の形の検査、定数（入力の既定、試験 file の名前の型、既知のキーの集合） | なし |
| `resolve.mjs` | CoverageInputContract（解決） | adapter | BR1.6、BR1.7 | 既存の HygieneLib（`resolveTargets`、`trackedFiles`） |
| `lcov.mjs` | NodeBuiltinMeasurer（記録の変換） | 核（純粋） | BR2.5、BR2.6 の SF | なし |
| `events.mjs` | NodeBuiltinMeasurer（試験の数え上げ） | 核（純粋） | BR2.4 | なし |
| `events-reporter.mjs` | NodeBuiltinMeasurer（報告係） | adapter | 出来事を JSON の行で書くだけ（BR2.1） | Node の報告係の仕組み |
| `runner.mjs` | MeasurementRunner | adapter | BR2.3、BR2.7 の観測、BR2.8 | `node:child_process`、時計、`node:fs`（一時 directory） |
| `measure-node.mjs` | NodeBuiltinMeasurer（組み立て） | adapter | BR2.1、BR2.2、BR2.7 の分類、MeasurementResult の組み立て | runner、lcov、events |
| `report.mjs` | ResultReporter（文書と文面） | 核（純粋） | BR4.1〜BR4.6 | なし |
| `sanitize.mjs` | ResultReporter（無害化） | 核（純粋） | BR4.7 | なし |
| `emit.mjs` | CoverageGateCli（書き込み） | adapter | BR5.2 の消去、BR5.3 の書き込み、BR4.6 の出力値の書き込み | `node:fs`、標準出力、標準エラー |
| `cli.mjs` | CoverageGateCli（入口） | adapter | BR5.1〜BR5.5 | 引数、環境変数、時計は runner 経由 |

- 依存の向き: `cli → {input, resolve, measure-node, judge, report, emit}`、`measure-node → {runner, lcov, events}`、`report → {judge, sanitize, order}`、`input`・`lcov`・`judge → order`、`events`・`sanitize`・`order` は他の file に依存しない（定数を持つ物だけが被参照）。核は adapter を import しない。循環しない。dependency-cruiser の既存の検査で確かめる。
- 純粋な核（`order`・`judge`・`input`・`lcov`・`events`・`report`・`sanitize`）に `Date`・`Math.random`・`randomUUID`・`process.env`・`node:fs`・`node:child_process` を置かない（NFR2.1）。
- 構造の検査（NFR9.2・NFR9.3）: dependency-cruiser の import 方向と循環、knip の未使用、jscpd の重複を、既存の設定のまま通す。新しい例外コメントを足す時は理由を書き、無制限の disable を使わない。既存の own-code budget（OWN-01）が新しい file の行数で上限に当たる場合は、budget の設定を変えず（保護対象）、PR に「AI-DLC の単位の作る段の出力」と 1 行書く。当たるかはコード生成で実測して記録する。
- 依存は Node の組込みと既存の `scripts/hygiene/lib.mjs` だけ（NFR6.1・NFR6.2）。`package.json` の `dependencies`・`devDependencies` を変えず、新しい action・service を足さず、workflow を変えない（NFR6.3）。
- 13 file はいずれも 300 行以内の見込み（NFR9.1）。超えそうなら部品を分ける（行を詰めない）。

## LC2 処理の流れ（正常と失敗）

1. `cli`: 引数の検査 → `emit` が古い結果を消す → 環境から runId を読む。
2. `input`（検査）→ `resolve`（分母と必須の試験）。失敗は 6 へ。
3. `measure-node` → `runner`（子プロセス、上限）→ `events`・`lcov`（観測の file を変換）。
4. `judge`（区分と理由コード）。
5. `report`（文書と文面）。
6. `emit`（結果の file、summary、出力値、notice）→ 終了コード。入力の失敗は `report` が入力の失敗の文書を作って 6。

## LC3 失敗の範囲（failure domain）と被害の範囲（blast radius）

| 失敗の領域 | 起きうること | 範囲を止める物 |
|---|---|---|
| 測定の子プロセス | 遅い・止まらない・孫を残す・大量の出力 | process group ごとの停止（RL2）、標準入出力は捨てる、一時 directory は終わりで消す |
| 観測の file | 無い・壊れている・矛盾する | 壊れた記録は観測できず（NFR4.8）。判定に進まない |
| 入力の JSON | 読めない・未知のキー・解決できない宣言 | 測定に進まない（NFR4.1）。入力の失敗の文書を残す |
| 出力の面 | 結果の file、summary、出力値の書き込みの失敗 | 終了コード 2。成功と記録しない（RL4） |
| 既存の hygiene の lib | 解決の失敗（例外） | 入口の最上位で捕まえて終了コード 2 |

- 被害の範囲: 門の 1 回の実行の中に閉じる。共有の状態は無い。失敗しても他の実行・他の repo に影響しない（SL1）。

## LC4 共有の資源

| 資源 | 持ち主 | 使う側 |
|---|---|---|
| 区分・理由コード・閾値の既定 | `judge.mjs` | `report`、`cli`（終了コードの写像）、試験 |
| 入力の既定（期限、総予算、試験 file の名前の型）・既知のキー | `input.mjs` | `resolve`、`measure-node`（上限の既定は入力の検査が埋めて渡す）、試験 |
| Node の保証する版 | `measure-node.mjs` | 試験 |
| 子に渡す環境変数の名前の一覧（childEnvAllowlist） | `runner.mjs` | 試験 |
| summary の一覧の上限、固定の文型 | `report.mjs` | 試験 |
| 既存の分母の解決 | `scripts/hygiene/lib.mjs`（変更しない） | `resolve` |
| 一時 directory | 実行ごとに `runner` が作り、終わりで消す | `measure-node` |

- 同じ値を 2 か所に書かない（NFR3.1・NFR3.2）。試験は、値の literal が持ち主の file にだけ現れることを検査する。

## LC5 試験の置き場と方法

- 方法（NFR7.1・NFR7.2・NFR7.5・NFR7.6）: 部品ごとに、失敗する試験（Red）を先に書いて失敗を確かめ、実装（Green）で通す。Red と Green は PR の履歴に残る別々の commit にする。試験は `node:test` と `node:assert/strict` だけ。skip・todo の試験を置かない。fixture は架空の名前と値だけ（12 文字の英数字を `token` に入れた形を使わない）。一時の repo は `after` で必ず消す。

- 試験は既存の `npm test` の対象（`tests/*.test.mjs`）に入る位置に、部品ごとの file を置く（`tests/coverage-gate-<部品>.test.mjs`）。fixture を作る補助は `tests/coverage-gate-fixtures.mjs`（`.test.mjs` で終わらないので試験として走らず、門自身の「試験 file の名前の型」にも合わない）。
- 入口までの結合の試験は、実行ごとに一時 directory に架空の小さな git repo を作って走らせる（実行後に消す）。作った repo の中身は架空の名前と値だけ。
- 子プロセスの停止の試験は、孫を起こして眠る架空の試験 file を使い、停止後に孫の process が存在しないことを確かめる（RL2）。

## Assumptions & Open Questions

### Assumptions

- [assumption] file の分け方（13 file）は設計の案。機能の設計の 7 つの部品の分け方（judge、input、runner、measure-node、events-reporter、report、cli）を保ち、純粋な核と adapter を分けるために細かくしただけで、規則を足してはいない。コード生成の計画で、行数の見込みを見て統合・分割を決める（NFR9.1 を守る方向だけに動かす）。
- [assumption] dependency-cruiser の既存の設定は、`scripts/coverage-gate/` の新しい import の向きを許す。許さない場合は、設定を変えず（保護対象でないが、検査を緩める変更は同じ PR に混ぜない）、file の置き方を直す。

### Open Questions

1. `emit.mjs` と `cli.mjs` を 1 file にまとめるか（行数の見込み次第）。コード生成の計画で決める。
