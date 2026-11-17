# U5 u5-exclusions — 単位の試験の手順

## Summary

この単位の試験を、この単位の試験 file だけを指定して走らせる手順。全体の `npm test` は Step 11 の全体の確かめで 1 回流し、観測値を記録する（単位の確かめの代わりにしない）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 計画: [code-generation-plan.md](./code-generation-plan.md)（Testing Contract、手順 Step 1〜12）。
- 設計: rules.md（BR9.1〜BR11.6）、nfr-design の各設計（PF、SC、SL、RL、OB、LC）、functional-design の追跡表。土台: U4 の [unit-test-instructions.md](../../u4-thresholds-and-modes/code-generation/unit-test-instructions.md)。

## 試験の枠組み

- 道具: Node 組込みの `node:test` と `node:assert/strict`。依存の追加なし（NFR6.1・NFR6.2）。
- 方法: TDD。部品ごとに Red（実装が無い状態で失敗を確かめ、出力を記録）→ Green → Refactor。Red と Green は別の commit。
- 試験を置く場所: `tests/coverage-gate-<部品>.test.mjs`。補助（後ろ向きの互換の golden を含む）は既存の `tests/coverage-gate-fixtures.mjs`・`tests/coverage-gate-golden*.mjs` で、試験として走らない名前のまま。skip・todo は置かない。
- 実行環境: Node 22（保証）。作業木は clone の worktree。全体の `npm test` に要る `node_modules` は clone からの symlink で用意し、終わったら取り除く（commit しない）。

## 単位の試験の command（単位の file だけを指定）

| 範囲 | command |
|---|---|
| 除外の検査と集合の差（新規） | `node --test tests/coverage-gate-exclusions.test.mjs` |
| 理由の規則 | `node --test tests/coverage-gate-threshold.test.mjs` |
| 入力 | `node --test tests/coverage-gate-input.test.mjs` |
| 分母の解決 | `node --test tests/coverage-gate-resolve.test.mjs` |
| 出力（新規 + 既存） | `node --test tests/coverage-gate-report-exclusions.test.mjs tests/coverage-gate-report.test.mjs` |
| 入口 | `node --test tests/coverage-gate-cli.test.mjs tests/coverage-gate-cli-modes.test.mjs` |
| 後ろ向きの互換（golden） | `node --test tests/coverage-gate-golden.test.mjs` |
| 構造 | `node --test tests/coverage-gate-structure.test.mjs` |
| この単位の全部 | `node --test tests/coverage-gate-exclusions.test.mjs tests/coverage-gate-threshold.test.mjs tests/coverage-gate-input.test.mjs tests/coverage-gate-resolve.test.mjs tests/coverage-gate-report-exclusions.test.mjs tests/coverage-gate-report.test.mjs tests/coverage-gate-cli.test.mjs tests/coverage-gate-cli-modes.test.mjs tests/coverage-gate-golden.test.mjs tests/coverage-gate-structure.test.mjs` |
| 変わっていない部品の確かめ | `node --test tests/coverage-gate-judge.test.mjs tests/coverage-gate-order.test.mjs tests/coverage-gate-sanitize.test.mjs tests/coverage-gate-lcov.test.mjs tests/coverage-gate-events.test.mjs tests/coverage-gate-events-reporter.test.mjs tests/coverage-gate-runner.test.mjs tests/coverage-gate-measure-node.test.mjs tests/coverage-gate-emit.test.mjs` |

## 網羅率の対象と床

- 対象: `scripts/coverage-gate/**`（基準で 15 file、この単位で 2 file を足して 17 file）。行の網羅率の床は 100%。通すために弱めない。
- 観測値の記録（OB5）: 門自身で `scripts/coverage-gate/`（directory の宣言。入力の `denominator.targets` に `**` を書かない）を測った入力 JSON と結果の JSON を単位の記録（`self-coverage-input.json`、`self-coverage-result.json`）に置き、Node 組込みの lcov を別に計算して値を突き合わせる。次を成功に数えない: 対象 0 件、記録なし、2 つの値の不一致、申告だけの値。
- 除外が要る行があれば、PR に理由を書き、独立の監査で確認する。

## 部品ごとの試験（正例・負例）と対応

| 試験 file | 主な正例 | 主な負例・境界 | 結ぶ規則・要件 |
|---|---|---|---|
| exclusions | 1 件・複数件の宣言が検査を通り path の符号点順に並ぶ。分母から外れ、残りと除外の一覧が返る。0 件は分母そのまま | 配列でない（null・文字列・object）、要素が object でない、未知のキー（符号点順で最初の 1 件）、path 無し・理由無し・両方無し（path が先）、path が数・空文字、理由の 301 文字・改行・`::`・`%0A`・`\|`・バッククォート・空白だけ、決定の URL が無い理由、同じ path の重複、大文字小文字違い・`./`・`..`・directory 名・wildcard・絶対 path・追跡されていない file は TARGET_UNRESOLVED、全部除外は TARGET_EMPTY、入力の並びを入れ替えても同じ結果、失敗の文に path の文字列が無い、長い・繰り返しの入力が線形の時間 | BR9.1〜BR9.4、BR10.1、BR10.2、NFR1.2、NFR1.3、NFR2.3、NFR4.1、NFR4.2、NFR5.4、NFR5.6、NFR5.7 |
| threshold | 理由の規則と決定の URL の形の規則を field の名前を変えて呼んでも U4 と同じ判定 | 300 / 301 文字・改行・`%0a`・`::`・`\|`・バッククォート・空白だけ、URL 無し・形違い。`threshold.rationale` の失敗の理由コード・field・順が U4 のまま | BR9.3、BR9.5、NFR3.1、RL9 |
| input | 除外の省略・空の配列が通り `exclusions: []` が載る。1 件・複数件が通り並べ替えて載る | 各失敗の理由コード・field・順、`denominator.exclusions`・`exclusion`・`excludes`・`exclusions[i].extra` は INPUT_FIELD_UNKNOWN、`measurement` は引き続き未知、置き換えた 1 件 | BR9.1、BR10.4(3)、NFR4.1、NFR5.2、NFR5.7、NFR8.4 |
| resolve | source・test・both の除外が種別に応じて分母・必須の試験から外れる。除外 0 件は U4 と同じ戻り値 | 名指さない必須の試験は減らない、source の除外だけでは同名の型の試験が必須のまま（重なりの反例）、testTargets を狭めただけは除外にならない、どちらの集合にも無い path で TARGET_UNRESOLVED、分母または必須の試験の全部除外で TARGET_EMPTY | BR10.1〜BR10.3、BR10.6、NFR4.2、NFR4.3 |
| report-exclusions | 頭の 1 行（「Excluded from the gate: N (…)」）、節・notice の文型（「Excluded files (N):」、「Exclusions: N.」）、引数で受けた上限までと残りの 1 行 | 0 件では何も出ない（頭の 1 行も）、区分・動作・閾値の例外の組み合わせで頭の 1 行が毎回出て位置が正しい、21 件の境界、path・理由の無害化（`%`・CR・LF・バッククォート・`\|`）、path・理由を notice に載せない | BR11.2、BR11.3、BR11.6、NFR4.7、NFR4.8、NFR4.12、NFR5.5 |
| report | 除外あり・なしの結果の JSON（`exclusions`・`exclusionCount`・`resolvedFileCount`）、4 面が同じ文書から | 除外なしの 4 経路が golden とバイトまで一致、入力の失敗の文書は exclusions が空、出力値は 7 名のまま、kind に応じて除外した path が unmeasuredPaths・perFile（source・both）と notRunPaths（test・both）に現れず exclusions に kind つきで残る、入力の並びを入れ替えても同じ出力 | BR11.1、BR11.4、BR11.5、BR11.6、NFR2.2、NFR4.6、NFR4.9〜NFR4.11、NFR8.1、NFR8.2 |
| cli（結合） | 除外なし 4 経路が golden と一致、除外ありで割合が上がって一致（0） | 除外ありで名指さない必須の試験が流れず NOT_RUN（1）、試験 file の除外が理由・種別つきで残り notRunPaths に出ない（0）、分母に残る file が未計測（1）、分母に無い path と全部除外（2）、除外らしい環境変数を置いても出力がバイトまで一致、別の引数は ENTRY_ARGUMENTS_INVALID（2）、書き込みの失敗は 2 | BR10.4、BR11.3、BR11.4、NFR4.3〜NFR4.5、NFR5.2、NFR8.5、NFR8.6 |
| structure | 新しい値の literal が持ち主の file だけ、分母から引く code が 1 か所、判定の核に除外の語が無い、除外を決める code に環境変数の読みが 0 件、純粋な核に禁止の API・ネットワーク・資格情報が無い、300 行以内、import が組込みと既存の `lib.mjs` だけ | 禁止の API の混入、import の逸脱 | NFR2.1、NFR3.1〜NFR3.3、NFR5.1、NFR5.2、NFR7.3、NFR9.1 |

## 試験データと mock の指針

- データは架空の path と理由だけ。12 文字の英数字を `token` に入れた形を使わない（gitleaks）。
- 結合の試験は、一時 directory に小さな git repo を作る（`git init` と追跡する file の追加）。`after` で必ず消す。利用先の実物・非公開の物を写さない。
- mock の道具は使わない。純粋な核は入力と出力で確かめる。時刻・乱数・識別子は呼ぶ側が渡す（S4）。子プロセスは実際に `node --test` を走らせる（U3・U4 の方針のまま）。
- 後ろ向きの互換の golden は U3・U4 で固定した物。以後の変更でこの文字列が 1 バイトでも変わったら失敗にする（変えるのは入力の失敗の例の未知のキーだけ）。
- 保証の版（22）でない Node で走る時、その事実は観測として扱い、保証の確かめを成功に数えない。

## 合格の判断

- 失敗 0、skip 0、todo 0、実行数が期待どおり（実行されない・時間切れは成功に数えない）。
- 網羅率は上の記録の突き合わせで 100%。
- 観測値は Build and Test の記録に機械が読める形で残す。申告された値は写さない（S5）。
