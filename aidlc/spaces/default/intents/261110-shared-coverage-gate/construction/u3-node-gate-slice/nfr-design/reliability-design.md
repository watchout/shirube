# U3 u3-node-gate-slice — 信頼性の設計（reliability-design）

NFR2・NFR4・NFR8 の設計。門の信頼性は「可用性」でなく「成功と数えてはならない物を数えない」こと。サーキットブレーカー、再試行、フェイルオーバー、複製、バックアップ、健全性検査は、1 回の command なので持たない（再試行は意図して持たない。NFR4.3）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 入力: [reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[security-design.md](./security-design.md)、[logical-components.md](./logical-components.md)、機能の設計 [rules.md](../functional-design/rules.md)（BR1.x、BR2.3〜BR2.7、BR3.4〜BR3.8、BR5.2・BR5.3）、答え [Q1]・[Q3]（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。社内の標準 S4・S5・S6・S8。

## 設計

### RL1 3 値の分類と終了コード（NFR4.2・NFR4.5・NFR4.7）

- 区分の決定は `judge.mjs` の 1 つの表だけ（機能の設計の判定表）。観測できずになる条件: 測定の失敗、失敗した試験、期限・総予算の超過、記録なし、壊れた記録、古い Node。不一致になる条件: 未計測の file、流れていない必須の試験、閾値未満。理由コードは決まった順で並べる。
- 終了コードの写像は入口の 1 か所: 一致 → 0、一致でない判定 → 1、判定に至らなかった（入力の失敗、入口の失敗、予期しない例外、書き込みの失敗）→ 2。判定の結果を文書にした後に、別の経路で再判定しない。
- 流れた試験の定義: skip でも todo でもない合格した試験が 1 つ以上ある file（Q1）。読み込みで失敗した file（構文の誤りなど）は、合格が 0 本なので流れていない扱いで、TESTS_NOT_RUN か TEST_FAILED のどちらかに必ず落ちる。

### RL2 上限と子プロセスの全停止（NFR4.3・T6）

- 上限は `min(deadlineSeconds, totalBudgetSeconds - 既に使った秒)`。この単位の測定は 1 回なので、使った秒は 0。時計は `runner.mjs` だけが読む（単調な時計 `performance.now` を使い、壁時計の巻き戻りで上限が壊れない）。
- 子は自分の process group を持つ形で起こす（`detached: true`）。上限に達したら、まず process group 全体に終了の signal を送り、猶予（固定の 5 秒）の後に残っていれば強制終了の signal を送る。その後、終了を待ってから返す（待たずに返さない）。返す時点で、孫の process が残っていないことを確認する試験を置く。
- 期限が先に来たら endState は `timed_out`（MEASUREMENT_TIMED_OUT）、総予算が先に来たら `budget_exceeded`（MEASUREMENT_BUDGET_EXCEEDED）。両方が同時なら総予算を先に判定する（決まった順）。
- 起動の失敗（実行ファイルが無い等）は failed。signal で終わった（上限で止めた場合を除く）も failed。終了コードが 0 でない、または出来事の file が無いか壊れている場合も failed。cancel・timeout・不明を成功に数えない。
- process group の全停止が Linux で孫まで届くことは仮定。コード生成の試験（孫を起こして眠る架空の試験）で確かめ、確かめられなければ設計に戻して直す。

### RL3 失敗を握りつぶさない（NFR4.4・NFR4.10）

- 空の `catch`、`.catch(() => {})`、失敗を成功の値に変える既定値を置かない。許される `catch` は、エラーを名前つきの結果の値（理由コードつき）に変えて返す場合と、後始末の後に再び投げる場合だけ。
- 入口の最上位で予期しない例外を 1 つ捕まえ、標準エラーに 1 行の JSON（理由コード ENTRY_ENVIRONMENT_INVALID か ENTRY_OUTPUT_FAILED のうち当てはまる物、なければ固定の分類）を書いて終了コード 2 にする。結果の file を書けるなら書く。書けなければ標準エラーだけで 2。
- 検査: `scripts/coverage-gate/` に空の catch が無いことを試験（正規表現ではなく、構文を持つ小さな走査。最小限の形）で確かめ、既存の ESLint の規則と合わせて二重にする。

### RL4 書き込みと古い結果（NFR4.5・NFR4.6）

- 入口は始めに `--result` の既存の file を消す（消せないなら 2）。実行が途中で止まっても前の結果が今の結果に見えない。
- 書く面は、結果の file → job summary → 出力値 → notice の順。どれかの書き込みが失敗したら、残りは試み、最後に終了コード 2 にする（成功と記録しない）。失敗の理由は標準エラーに ENTRY_OUTPUT_FAILED として 1 行書く。
- 結果の file は一時の名前で書いて rename（security-design.md の SC6）。

### RL5 入力の失敗（NFR4.1）

- 入力が読めない・JSON でない・版が違う・未知のキー・必須の欠落・分母が解決できない・分母が 0 件は、測定に進まず、`inputFailure`（理由コード・項目・説明）を持つ結果の文書を残して終了コード 2。分母 0 件を「100%」として通さない（空の分母は成功の根拠にしない）。

### RL6 観測の再計算と壊れた記録（NFR4.8・NFR4.7）

- 値は記録の `DA` の行から数え直す。道具が出した `LH`/`LF` は値に使わず、同じ file の `DA` から数えた件数と食い違えば壊れた記録（MEASUREMENT_FAILED）。観測できない値は `null` にし、申告された値や前回の値を入れない。
- 実測は、Node 22・24・26 で lcov がバイトまで一致した事実がある（架空の小さな例が 1 つ）。`LH`/`LF` を値に使わない設計は、その一致に依存していない。突き合わせの検査（整合性の確認）は、Node が正当に食い違う記録を出す場合に外す余地を残すが、外すときは理由を記録する（機能の設計の仮定に従う）。

### RL7 決定性（NFR2.1〜NFR2.5）

- 核（`order`・`judge`・`input`・`lcov`・`events`・`report`・`sanitize`）は、時刻・乱数・識別子・環境変数・file を取得しない。runId は入口が環境から 1 回だけ読む（`GITHUB_RUN_ID` と `GITHUB_RUN_ATTEMPT` がともに数字だけなら `<ID>-<ATTEMPT>`、ともに無ければ `local`、それ以外は ENTRY_ENVIRONMENT_INVALID）。
- 並べ順は code-point 順（performance-design.md の PF2）と、行は path・行番号の順、理由コードは決まった順、文書の項目は決まった順。
- 「バイト一致」は、固定した検査済みの入力・固定した MeasurementResult（経過秒を含む）・固定した runId に対する主張で、実際の 2 回の実行の経過秒の一致は主張しない（NFR2.4）。
- 検査: 核の file に `Date`・`Math.random`・`randomUUID`・`process.env`・`node:fs`・`node:child_process` の import や参照が無い。入力の 1 要素（記録の 1 件、runId、path 1 つ）を変えると出力が変わる。

### RL8 新旧の同居と逆向き（NFR8.1〜NFR8.4・S6）

- 追加だけの変更: 新しい `scripts/coverage-gate/` とその試験を足す。既存の `scripts/hygiene`・`scripts/sds`・workflow・kit は変えない。`trackedFiles`・`resolveTargets` は変更せずに呼ぶ。
- 逆向き: 足した file を取り除くと元に戻り、既存の試験が通る。コード生成で、取り除いた状態（足した file を除いた木）で既存の `npm test` を流して確かめ、base の実物との一致を SHA-256 で 1 回観測する。
- 入力・結果の JSON は版 1。U3 が受け付けない項目（threshold、mode、exclusions、measurement）は未知のキーとして失敗にする。後の単位が足すときは追加の順（既存の意味と型を変えない）。
- 入口はまだどの workflow にも呼ばれない（U7 が配線）ので、この単位の統合で CI の挙動は変わらない。

## 検証の仕方

| 設計 | 試験（正例と負例） |
|---|---|
| RL1 | 全ての理由コードに対応する入力を作り、区分と終了コードが表と一致する。観測できずが一致に読み替えられない。流れた試験の定義の境界（skip のみ、todo のみ、合格 0）|
| RL2 | 架空の遅い試験で期限超過・総予算超過を起こし、endState が正しく、孫が残らない。起動の失敗・signal・終了コード非 0 が failed |
| RL3 | 空の catch が無い。予期しない例外が 2 で、標準エラーが 1 行の JSON |
| RL4 | 前の実行の結果が残っていても、途中で失敗した実行の後に前の結果が見えない。書き込みの失敗の注入で 2 |
| RL5 | 入力の各種の不正（未知のキー、版違い、分母 0 件）で inputFailure と 2 |
| RL6 | `LH`/`LF` と `DA` の食い違いが壊れた記録になる。観測できない値が null |
| RL7 | 同じ入力で 2 回バイト一致、1 要素の変更で出力が変わる、runId の 3 つの形 |
| RL8 | 既存の `npm test` が通る、足した file を除いた状態で base と一致 |

## Assumptions & Open Questions

### Assumptions

- [assumption] `process group` の停止（`process.kill(-pid)`）は GitHub Actions の Linux で孫まで届く。届かない場合は設計に戻す。
- [assumption] 猶予の 5 秒は、試験の後始末に十分で、期限の上限（600 秒）に比べて小さい。固定の定数として `runner.mjs` が 1 か所持つ。
- [assumption] 結果の file の `rename` は同じ directory 内で原子的。

### Open Questions

1. 総予算を使い切る測定が複数回に増える後の単位（U4 以降）で、`timed_out` と `budget_exceeded` の見分けの意味を保てるか。この単位は測定 1 回のみなので決めない。
