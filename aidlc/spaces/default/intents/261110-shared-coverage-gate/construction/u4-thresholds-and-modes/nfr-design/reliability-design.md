# U4 u4-thresholds-and-modes — 信頼性・失敗の扱いの設計

「記録だけ」は落とさない動作なので、失敗を成功に読み替える入口になりやすい。ここでは、動作が何であっても区分と理由を書き換えない設計、入力の失敗を隠さない設計、決定性、新旧の同居の設計を決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [reliability-requirements.md](../nfr-requirements/reliability-requirements.md)（NFR2.1〜NFR2.3、NFR4.1〜NFR4.7、NFR8.1〜NFR8.5）。機能の設計: [rules.md](../functional-design/rules.md)（BR7.1〜BR7.6、BR8.5）、[functional-spec.md](../functional-design/functional-spec.md)（動作と結果の表）。
- 土台: U3 の [reliability-design.md](../../u3-node-gate-slice/nfr-design/reliability-design.md)（RL1〜RL8）。この単位は U3 の設計を変えず、判定の最後の分岐と入力の検査を足す。

## RL1 落とすかどうかは 1 か所で決める（NFR4.1、NFR4.4）

- 判定の核が、`shouldFail = (outcome !== "match") && (mode === "enforce")` を 1 か所で決める。区分と理由コードは、動作を見ずに U3 の表で決める。つまり判定は 2 段で、1 段目（区分と理由）は動作に依らず、2 段目（落とすか）だけが動作を見る。

```text
verdict = decideOutcome(measurement, effectiveThreshold)   // 動作を見ない
verdict.shouldFail = verdict.outcome !== "match" && mode === "enforce"
```

- 入口は shouldFail を終了コードに写すだけ（0 か 1）。整形は shouldFail を読み直さず、verdict の値を表示する。workflow は動作に応じた分岐を持たない。
- 試験: 同じ入力の mode だけを変えた 2 回の判定で、`outcome`・`reasonCodes`・`perFile`・`coveredLines`・`totalLines` が等しく、`shouldFail` だけが違う。区分 3 つ（一致、不一致、観測できず）× 動作 2 つの 6 通りを確かめる。

## RL2 動作の値の検査と既定（NFR4.2）

- 省略は enforce（落とす）。値は集合の完全一致だけ。それ以外は `INPUT_FIELD_INVALID`（field `mode`）で終了コード 2。どちらの動作にも倒れない。
- 判定の核は mode を引数で受け、既定の補完は入力の検査だけが行う（判定の核は mode が集合に無ければ例外を投げず、そもそも呼ばれない: 検査を通らない入力は判定に届かない）。判定の核を直接呼ぶ試験で、集合に無い mode を渡した時は、成功を返さずに失敗する（例外または観測できず）ことを確かめる。

## RL3 入力の失敗と入口の失敗は動作に依らず 2（NFR4.3、NFR4.4）

| 状況 | 終了コード | 結果の文書 |
|---|---|---|
| 判定に至り、shouldFail が偽 | 0 | `mode` は入力の値 |
| 判定に至り、shouldFail が真（enforce で一致でない） | 1 | `mode` は enforce |
| 入力の失敗（mode や threshold の不正を含む） | 2 | `mode` は null、`inputFailure` あり |
| 入口の失敗（書き込みの失敗、予期しない例外） | 2 | 書けた場合は U3 のまま |

- 入力の失敗の文書は mode を null にする。入力が読めない・信じられない以上、動作を信じない。record-only の入力でも、入力の失敗の終了コードは 2。
- 書き込みの失敗（結果の file、summary、出力値）は、動作が record-only でも 2。記録が残らないことを隠さない。
- 試験: record-only の入力で、入力の失敗、結果の file の書き込みの失敗、予期しない例外が、すべて 2。

## RL4 例外は結果の区分で消えない（NFR4.6、NFR4.7）

- 判定の核は、例外を verdict に入れる処理を、区分を決める前に行う（観測できずの経路でも例外を載せる）。つまり、例外の記録は「早期の観測できずの return」より前に組み立てる。
- verdict は、主張された値（`claimedHundredths`）と実際に比べた値（`effectiveThresholdHundredths`）を別の項目として持つ。両方とも同じ入力から作るので門の中では一致するが、記録は両方を持つので、照らす側が食い違いを見つけられる。
- 試験: 一致・不一致・観測できずの 3 つの結果で、例外が verdict と文書に残る。割合が 100% でも残る。

## RL5 決定性（NFR2.1〜NFR2.3）

- 判定の核と整形は、mode と threshold を引数で受け、時計・乱数・識別子・環境変数・file を取得しない。U3 の核の確かめ（ソース文字列に `Date`、`Math.random`、`randomUUID`、`process.env`、`node:fs` が現れない）を、この単位が足す file（`threshold.mjs`、`report-exception.mjs`）にも当てる。
- 例外の表示の順と書式は固定（decisionUrl、claimedPercent、rationale の順。割合は小数第 2 位までの固定の書式）。
- 試験: 同じ入力で 2 回判定と整形を行い、文字列がバイトまで一致する。mode、percent、decisionUrl、rationale のそれぞれ 1 要素を変えると出力が変わる（読み捨てる入力が無い）。

## RL6 新旧の同居（NFR8.1、NFR8.2、NFR8.4、NFR8.5）

- 後ろ向きの互換: 例外も mode も無い入力の出力は、U3 の出力とバイトまで一致する。U3 の統合後の `main` の出力から固定した例（golden: 結果の JSON、job summary、notice、出力値の 4 つ）を作り、この単位の code の出力と比べる。追加の行・節は、例外または record-only のときにだけ出る条件分岐の中に置き、無条件の出力を変えない。
- 追加の順: 結果の JSON の版は 1 のまま。項目の名前は増やさず、U3 が null や固定値で出していた `mode`・`thresholdException`・`effectiveThresholdPercent` に値を持たせる。出力値の名前は 7 つのまま。
- U3 の試験の置き換え（NFR8.4）: U3 には、`threshold` と `mode` を未知のキーとして失敗にする試験がある。この単位は、その 2 つのキーを受け付ける変更なので、試験を置き換える。置き換えでは、同じ試験が確かめていた「未知のキーはどの階層でも失敗」を、別の未知のキー（`threshold` の中の余分なキー、最上位の別の名前）で保ち、`exclusions` と `measurement` が引き続き未知のキーであることを確かめる試験を残す。弱めた試験を PR に書く（監査の項目に入れる）。
- 入口はまだどの workflow にも呼ばれない（U7 が配線する）。この単位の統合で CI の挙動は変わらない。

## RL7 逆向き（NFR8.3）

- この単位の変更は、追加（新しい file、既存の file への項目の追加）と、U3 の試験の置き換えだけ。取り消すと U3 の状態に戻り、U3 の試験が全部通る。コード生成で、base（U3 の統合後の `main`）の実物の SHA-256 と突き合わせ、取り消した状態で既存の試験を流して 1 回観測する（S6）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 判定の核を直接呼ぶ時に集合に無い mode を渡す入力は、本来は検査で弾かれて届かない。届いた場合は、成功を返さずに失敗することだけを確かめ、返し方（例外か観測できずか）はコード生成の計画で決める。
- [assumption] golden の元になる U3 の出力は、U3 の統合後に再確認する。U3 の PR が統合される前は、PR の head の出力で土台を作る。

### Open Questions

なし。
