# U4 u4-thresholds-and-modes — 単位の試験の手順

## Summary

この単位の試験を、この単位の試験 file だけを指定して走らせる手順。全体の `npm test` は Step 10 の全体の確かめで 1 回流し、観測値を記録する（単位の確かめの代わりにしない）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 計画: [code-generation-plan.md](./code-generation-plan.md)（Testing Contract、手順 Step 1〜11）。
- 設計: rules.md（BR6.1〜BR8.6）、nfr-design の各設計（SC、RL、OB）、functional-design の追跡表（AC → BR）。土台: U3 の [unit-test-instructions.md](../../u3-node-gate-slice/code-generation/unit-test-instructions.md)。

## 試験の枠組み

- 道具: Node 組込みの `node:test` と `node:assert/strict`。依存の追加なし（NFR6.1・NFR6.2）。
- 方法: TDD。部品ごとに Red（実装が無い状態で失敗を確かめ、出力を記録）→ Green → Refactor。Red と Green は別の commit。
- 試験を置く場所: `tests/coverage-gate-<部品>.test.mjs`。補助（後ろ向きの互換の golden を含む）は `tests/coverage-gate-fixtures.mjs` か別の補助 file で、試験として走らない名前にする。skip・todo は置かない。
- 実行環境: Node 22（保証）。作業木は clone の worktree。全体の `npm test` に要る `node_modules` は clone からの symlink で用意し、終わったら取り除く（commit しない）。

## 単位の試験の command（単位の file だけを指定）

| 範囲 | command |
|---|---|
| 例外の検査（新規） | `node --test tests/coverage-gate-threshold.test.mjs` |
| 判定 | `node --test tests/coverage-gate-judge.test.mjs` |
| 入力 | `node --test tests/coverage-gate-input.test.mjs` |
| 出力（新規 + 既存） | `node --test tests/coverage-gate-report-exception.test.mjs tests/coverage-gate-report.test.mjs` |
| 入口 | `node --test tests/coverage-gate-cli.test.mjs` |
| 構造 | `node --test tests/coverage-gate-structure.test.mjs` |
| この単位の全部 | `node --test tests/coverage-gate-threshold.test.mjs tests/coverage-gate-judge.test.mjs tests/coverage-gate-input.test.mjs tests/coverage-gate-report-exception.test.mjs tests/coverage-gate-report.test.mjs tests/coverage-gate-cli.test.mjs tests/coverage-gate-structure.test.mjs` |
| U3 の部品が変わっていないことの確かめ | `node --test tests/coverage-gate-order.test.mjs tests/coverage-gate-sanitize.test.mjs tests/coverage-gate-lcov.test.mjs tests/coverage-gate-events.test.mjs tests/coverage-gate-events-reporter.test.mjs tests/coverage-gate-resolve.test.mjs tests/coverage-gate-runner.test.mjs tests/coverage-gate-measure-node.test.mjs tests/coverage-gate-emit.test.mjs` |

## 網羅率の対象と床

- 対象: `scripts/coverage-gate/**`（この単位で 15 file）。行の網羅率の床は 100%。通すために弱めない。
- 観測値の記録（OB5）: 門自身で `scripts/coverage-gate/`（directory の宣言。入力の `denominator.targets` に `**` を書かない）を測った入力 JSON と結果の JSON を単位の記録（`self-coverage-input.json`、`self-coverage-result.json`）に置き、Node 組込みの lcov を別に計算して値を突き合わせる。次を成功に数えない: 対象 0 件、記録なし、2 つの値の不一致、申告だけの値。
- 除外が要る行があれば、PR に理由を書き、独立の監査で確認する。

## 部品ごとの試験（正例・負例）と対応

| 試験 file | 主な正例 | 主な負例・境界 | 結ぶ規則・要件 |
|---|---|---|---|
| threshold | 3 つそろいの例外（percent 95、0、99.99、URL は issues と pull の両方、根拠 1 行）が正規化される（95 → 9500、-0 → 0） | キーの欠落（percent、decisionUrl、rationale の順で最初の 1 件）、未知のキー、object でない（null・配列・文字列）、percent が 100・100.01・負・3 桁の小数・文字列 "95"・数でない、URL の別 host・http・query・別の fragment・user@host・前後の空白・0 始まりの番号・13 桁の番号・owner/repo の長さ・`.`/`..`、長さの超過（先に失敗にする）、根拠の 301 文字・空白だけ・制御文字・`::`・`%0A`・`%0a`・`%0D`・バッククォート・`\|`、長い入力でも時間が線形、ネットワークの module と資格情報を読まない | BR6.1〜BR6.6、NFR1.3、NFR4.5、NFR5.1〜NFR5.4 |
| judge | 例外なし enforce は U3 と同じ verdict。例外 95% で 95% 以上は一致、未満は BELOW_THRESHOLD | 6 通りの（区分 × mode）で shouldFail、record-only でも outcome・reasonCodes は enforce と同じ、観測できずでも例外と effectiveThresholdHundredths が載る、100% でも例外の事実が残る、例外は既定より厳しくならない、同じ入力で同じ出力、核に `Date`・乱数・環境・file が無い | BR7.2、BR7.4〜BR7.6、NFR2.1、NFR2.2、NFR4.1、NFR4.6、NFR4.7 |
| input | 例外・動作なしの最小の入力が mode `enforce`・threshold null で通る。mode の 2 値。例外あり | mode の `fail`・`Enforce`・`record`・空白つき・null・数・真偽、threshold の各失敗の理由コード・field・順、未知のキー（`exclusions`・`measurement` は引き続き未知）、U3 の「未知のキー」の試験を置き換えた 1 件 | BR6.1、BR6.2、BR7.1、NFR4.2、NFR5.6、NFR8.4 |
| report-exception | 例外の行・節・record-only の行・見出し・notice の文型 | 条件が無ければ追加が出ない、根拠の無害化（二重の防御）、URL をコードの印で囲む、成功と書かない | BR8.2〜BR8.4、NFR4.8〜NFR4.10、NFR5.4 |
| report | 例外あり・record-only の結果の JSON（項目の順 decisionUrl、claimedPercent、rationale）、4 面が同じ文書から | 例外なし enforce の 4 経路が golden とバイトまで一致、入力の失敗の文書は 3 項目が null、出力値は 7 名のまま | BR8.1、BR8.5、BR8.6、NFR2.3、NFR4.11、NFR4.12、NFR8.1 |
| cli（結合） | 例外なし 4 経路が golden と一致、record-only で閾値未満・未計測・NOT_RUN・観測できずが終了コード 0、例外ありの一致が 0・例外の値未満が 1 | record-only でも入力の失敗は 2 で mode が null、書き込みの失敗は 2（先に書けた結果は書き直さない）、引数・環境変数で例外を指定できない | BR7.3、BR7.4、BR8.5、NFR4.3、NFR4.4、NFR5.3、NFR8.5 |
| structure | 新しい値の literal が持ち主の file だけ、shouldFail を決める code が judge だけ、新しい核に禁止の API・ネットワーク・資格情報が無い、300 行以内、import が組込みと既存の `lib.mjs` だけ | 禁止の API の混入、import の逸脱 | NFR2.1、NFR3.1〜NFR3.3、NFR5.1、NFR9.1、BR6.6 |

## 試験データと mock の指針

- データは架空の名前と値だけ。決定の URL の owner・repo・番号も架空。12 文字の英数字を `token` に入れた形を使わない（gitleaks）。
- 結合の試験は、一時 directory に小さな git repo を作る（`git init` と追跡する file の追加）。`after` で必ず消す。利用先の実物・非公開の物を写さない。
- mock の道具は使わない。純粋な核は入力と出力で確かめる。時刻・乱数・識別子は呼ぶ側が渡す（S4）。子プロセスは実際に `node --test` を走らせる（U3 の方針のまま）。
- 後ろ向きの互換の golden（Step 3）は、U3 のコードを変える前に取る。以後の変更でこの文字列が 1 バイトでも変わったら失敗にする。
- 保証の版（22）でない Node で走る時、その事実は観測として扱い、保証の確かめを成功に数えない。

## 合格の判断

- 失敗 0、skip 0、todo 0、実行数が期待どおり（実行されない・時間切れは成功に数えない）。
- 網羅率は上の記録の突き合わせで 100%。
- 観測値は Build and Test の記録に機械が読める形で残す。申告された値は写さない（S5）。
