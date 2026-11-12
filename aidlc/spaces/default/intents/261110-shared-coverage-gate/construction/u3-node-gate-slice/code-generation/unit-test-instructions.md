# U3 u3-node-gate-slice — 単位の試験の手順

## Summary

この単位の試験を、この単位の試験 file だけを指定して走らせる手順。全体の `npm test` は Step 10 の全体の確かめで 1 回流し、観測値を記録する（単位の確かめの代わりにしない）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 計画: [code-generation-plan.md](./code-generation-plan.md)（Testing Contract、手順 Step 1〜11）。
- 設計: rules.md（BR1.1〜BR5.5）、nfr-design の各設計（PF、SC、RL、OB）、functional-design の追跡表（AC → BR）。

## 試験の枠組み

- 道具: Node 組込みの `node:test` と `node:assert/strict`。依存の追加なし（NFR6.1・NFR6.2）。
- 方法: TDD。部品ごとに Red（実装が無い状態で失敗を確かめ、出力を記録）→ Green → Refactor。Red と Green は別の commit。
- 試験を置く場所: `tests/coverage-gate-<部品>.test.mjs`。補助の `tests/coverage-gate-fixtures.mjs` は試験として走らない名前。skip・todo は置かない。
- 実行環境: Node 22（保証）。作業木は clone の worktree。全体の `npm test` に要る `node_modules` は clone からの symlink で用意し、終わったら取り除く（commit しない）。

## 単位の試験の command（単位の file だけを指定）

| 範囲 | command |
|---|---|
| 葉の核 | `node --test tests/coverage-gate-order.test.mjs tests/coverage-gate-sanitize.test.mjs tests/coverage-gate-lcov.test.mjs tests/coverage-gate-events.test.mjs` |
| 判定 | `node --test tests/coverage-gate-judge.test.mjs` |
| 入力 | `node --test tests/coverage-gate-input.test.mjs tests/coverage-gate-resolve.test.mjs` |
| 測定 | `node --test tests/coverage-gate-events-reporter.test.mjs tests/coverage-gate-runner.test.mjs tests/coverage-gate-measure-node.test.mjs` |
| 出力 | `node --test tests/coverage-gate-report.test.mjs` |
| 入口 | `node --test tests/coverage-gate-emit.test.mjs tests/coverage-gate-cli.test.mjs` |
| 構造 | `node --test tests/coverage-gate-structure.test.mjs` |
| この単位の全部 | 上の 7 行の file を 1 つの `node --test` に並べる（`tests/coverage-gate-*.test.mjs` を明示した列） |

Step 8 で `emit.mjs` と `cli.mjs` を 1 file にまとめた場合は、対応する試験 file 名を計画と合わせて直す。

## 網羅率の対象と床

- 対象: `scripts/coverage-gate/**`（13 file、まとめた場合はその数）。行の網羅率の床は 100%。通すために弱めない。
- 観測値の記録（OB5）: 門自身で `scripts/coverage-gate/**` を測った入力 JSON と結果の JSON を単位の記録（`self-coverage-input.json`、`self-coverage-result.json`）に置き、Node 組込みの lcov を別に計算して値を突き合わせる。次を成功に数えない: 対象 0 件、記録なし、2 つの値の不一致、申告だけの値。
- 除外が要る行があれば、PR に理由を書き、独立の監査で確認する。

## 部品ごとの試験（正例・負例）と対応

| 試験 file | 主な正例 | 主な負例・境界 | 結ぶ規則・要件 |
|---|---|---|---|
| order | code-point 順の並べ替え | UTF-16 順と違う文字、同じ文字列、空 | BR1.7、NFR2.5 |
| sanitize | 通常の file 名 | `%`・CR・LF、バッククォート、長い名前 | BR4.7、NFR5.4 |
| lcov | 正しい DA の変換 | 先頭 `./`、cwd の外、重複 (path, line)、LF/LH と DA の不一致、DA 0 件、上限超え | BR2.5、BR2.6、AC6.1.2、AC6.1.4 |
| events | passed / failed の数え上げ | skip・todo、読み込みの失敗、suite の除外、`ran` の定義、出来事が無い | BR2.4、AC1.1.3 |
| judge | 100% で一致 | 99.99%、未計測の file、NOT_RUN、行 0 件、測定の原因 → 理由コード、同じ入力で同じ出力 | BR3.1〜BR3.8、AC2.1.x、AC4.1.x、AC10.2.x |
| input | 最小の正しい入力 | 読めない、版違い、未知のキー（threshold・mode・exclusions・measurement）、shape 欠落・未対応、targets 不正、期限・総予算の不正 | BR1.1〜BR1.5、BR1.8、AC10.1.1、AC1.4.x |
| resolve | 宣言の解決、重複の除去、順 | 解決できない宣言、空の集合、試験 file の名前の型、追跡されない file | BR1.6、BR1.7、AC1.1.1、AC2.1.5 |
| events-reporter | 出来事を JSON の行で書く | 書き込み失敗、想定外の出来事 | BR2.4 |
| runner | 試験の実行と環境の除去 | 期限超過、総予算超過、孫の process の停止（Linux）、起動失敗、signal 終了、一時 directory の削除 | BR2.3、BR2.7、BR2.8、AC2.1.3、AC2.2.1、AC2.2.2、AC10.1.2 |
| measure-node | 保証の版で測定 | 保証の版未満、記録なし、一部の file だけ測れた | BR2.1、BR2.2、AC1.1.2、AC1.3.2 |
| report | 結果の文書、summary、notice、出力値 | 観測できない値は null、入力の失敗の文書、一覧の上限、同じ 1 つの文書からの作成 | BR4.1〜BR4.6、AC2.2.3、AC2.3.x、AC2.4.x、AC6.3.x |
| emit | 原子的な書き込み | 古い結果の削除、書き込み失敗、output file の失敗 | BR5.2、BR5.3、AC2.4.1、AC2.4.4 |
| cli（結合） | 一致・不一致・観測できず・入力の失敗の各経路を入口から | `--result` が `--input` と同じ、追跡された file、引数の重複・欠落、環境の不正、予期しない例外、終了コード 0/1/2 | BR5.1〜BR5.5、AC10.1.1、AC6.3.3 |
| structure | 値の literal が持ち主の file だけ、核に禁止の API が無い、300 行以内 | 禁止の API の混入、import の逸脱 | NFR2.1、NFR3.1、NFR3.2、NFR9.1、S4 |

## 試験データと mock の指針

- データは架空の名前と値だけ。12 文字の英数字を `token` に入れた形を使わない（gitleaks）。
- 結合の試験は、一時 directory に小さな git repo を作る（`git init` と追跡する file の追加）。`after` で必ず消す。利用先の実物・非公開の物を写さない。
- mock は使わない。純粋な核は入力と出力で確かめる。時刻・乱数・識別子は呼ぶ側が渡す（S4）。子プロセスは実際に `node --test` を走らせる。
- 保証の版（22）でない Node で走る時、その事実は観測として扱い、保証の確かめを成功に数えない。
- 20 万件の合成記録の処理は 10 秒以内（網）。二乗の時間を見つける目的で、性能の保証ではない。

## 合格の判断

- 失敗 0、skip 0、todo 0、実行数が期待どおり（実行されない・時間切れは成功に数えない）。
- 網羅率は上の記録の突き合わせで 100%。
- 観測値は Build and Test の記録に機械が読める形で残す。申告された値は写さない（S5）。
