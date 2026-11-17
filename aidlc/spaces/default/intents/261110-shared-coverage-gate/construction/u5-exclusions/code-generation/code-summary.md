# U5 u5-exclusions 実装の要約

実装は clone の worktree（`~/Developer/.worktrees/shirube-u5-exclusions-design-20261117`、branch `adf-lead/u5-exclusions-design-20261117`、基準は `origin/main` `7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e`）で行った。Owner の作業場では git を実行していない。実装の実物と commit は PR の branch にある。この要約は PR の branch の実行の観測を書く（作業場の木ではない）。

追跡表の検査が作業場の木の中の file を探すので、新しい試験 4 file（`tests/coverage-gate-{exclusions,report-exclusions,report-document-exclusions,cli-exclusions}.test.mjs`）だけを PR の branch と同じ内容（`cmp` で一致を確認）で作業場の `tests/` にも置いた（未追跡。作業場の木が main に合わせて更新される時に取り除くか、統合済みの同じ内容で置き換わる）。変えた既存の試験 file と `scripts/` は作業場の木へ写していない（追跡表の対象 file は、既存の file は古い版でも存在する）。

## Sources

- 計画: [code-generation-plan.md](./code-generation-plan.md)（Step 1〜12、Testing Contract）。試験の手順: [unit-test-instructions.md](./unit-test-instructions.md)。
- 設計: functional-design の rules.md（BR9.1〜BR11.6）、nfr-design の各設計（PF・SL・RL・OB・SC・LC）、functional-design と nfr-design の追跡表。
- 作業の観測は、この要約の「試験の観測」の各行に、実行した command と結果を書いた。

## 作った・変えた file

- `scripts/coverage-gate/`（新規 2 file、変更 5 file。合計 17 file・1,436 行、いずれも 300 行以内）。
  - 新規: `exclusions.mjs`（89 行。除外の項目のキー・種別の持ち主、項目の検査 `checkExclusions`、分母と必須の試験から引く `subtractExclusions`）、`report-exclusions.mjs`（29 行。summary の最初の行・節と notice の文の持ち主。純粋）。
  - 変更: `threshold.mjs`（理由の 1 行の文の規則と決定 URL の規則を field 名つきの関数にし、この file が持ち主のまま `exclusions.mjs` が使う）、`input.mjs`（`exclusions` を既知のキーに。検査は `checkExclusions` に任せる）、`resolve.mjs`（42 → 44。除外を引く呼び出しを 1 か所だけ）、`report.mjs`（177 → 184。文書の `exclusions`・`exclusionCount` と、4 つの面へのつなぎ）、`cli.mjs`（114 のまま。解決の除外を文書へ渡す）。
  - 変えていない: `judge.mjs`、`emit.mjs`、`order.mjs`、`sanitize.mjs`、`events.mjs`、`events-reporter.mjs`、`lcov.mjs`、`runner.mjs`、`measure-node.mjs`。
- 試験（新規 4 file、変更 10 file。変更の件数は列挙と `git diff --name-status` から数え直した。開発役の報告の 9 は数え間違い）。
  - 新規: `coverage-gate-exclusions.test.mjs`（28 件）、`coverage-gate-report-exclusions.test.mjs`（10 件）、`coverage-gate-report-document-exclusions.test.mjs`（12 件）、`coverage-gate-cli-exclusions.test.mjs`（9 件。実物の command を子の process で走らせる 2 件を含む）。
  - 変更: `coverage-gate-threshold.test.mjs`・`-input.test.mjs`・`-resolve.test.mjs`・`-structure.test.mjs`（構造の試験を 6 件足した）・`-report.test.mjs`（1 行）・`-golden.test.mjs`・`-golden.mjs`・`-golden-text.mjs`・`-cli.test.mjs`・`-cli-modes.test.mjs`（いずれも少数の行）。
- 変えていない物: `scripts/hygiene`、`scripts/sds`、`.github/`（workflow）、`kit`、`.shirube`、`package.json`、lockfile、各種の設定。基準との差分を取り、これらに差分が 0 件であることを確かめた。
- 単位の記録: `self-coverage-input.json`、`self-coverage-result.json`（NFR7.2）、`source-manifest.json`、`traceability.json`、この要約。設計の記録は変えていない。

## 主な実装の判断

- 意味の持ち主は 1 つ（ADR-001）。判定（`judge.mjs`）は除外を知らず、分母から引く呼び出しは `resolve.mjs` の `subtractExclusions` の 1 回だけ。構造の試験が、この 1 回であることと、`judge.mjs` に除外の語が無いことを確かめる。
- 除外は `exclusions: [{path, reason}]`。種別（source・test・both）は入力に書かせず、分母のソースと必須の試験のどちらに完全一致したかで決める。展開も正規化もしない。分母のソースにも必須の試験にも無い path は `TARGET_UNRESOLVED`、全部を除外して何も残らない時は `TARGET_EMPTY`（いずれも入力の失敗、終了コード 2、測定しない）。重複した path と、除外を引いた後の失敗の文は path・理由を写さない。
- 理由は U4 と同じ 2 つの規則（1 行の文の規則、決定 URL の形）を `threshold.mjs` の関数で共有する（S3）。`exclusions.mjs` の import は `order.mjs` と `threshold.mjs` だけ。
- 除外なしの実行は U4 とバイトまで一致する。`exclusions` を省いた時と空の配列の時は、4 つの面すべてで同じバイト列（試験で、一致・不一致・観測できずの 3 区分について確かめた）。U3・U4 の golden は、`buildDocument` に `excluded: []` を渡す 1 行を除き、期待する文字列を変えずに通る。
- 出力は 1 つの文書から 4 つの面を作る。除外が 1 件以上ある時だけ、summary の最初の行（閾値の例外の旗があればその次）に「Excluded from the gate: N (source S, test T, both B)」、末尾側に「Excluded files (N):」の節（20 件まで、超えたら「and R more」）、notice の最後に「 Exclusions: N.」（path・理由は載せない）、出力値に件数。結果の JSON に `exclusions`（path の符号点順）と `exclusionCount`。出力値の名前は 7 つのまま。
- `buildDocument` の `excluded` は必須の引数にした（既定値を持たない）。渡し忘れが黙って「除外 0 件」の文書にならないようにするため（S5）。

## 試験の観測（Red → Green）

- 部品ごとに Red の commit と Green の commit を分けた。Red はそれぞれの commit の木で実行して観測した。
  - 理由の規則（`threshold.mjs`）: Red は新しい export が無く失敗、Green で合格。
  - 除外の検査と集合の差（`exclusions.mjs`）: Red は `exclusions.mjs` が無く読み込みで失敗（`ERR_MODULE_NOT_FOUND`）、Green で 28 件合格。構造の試験の file 一覧に `exclusions.mjs` を足す commit（`fa423c4`）を挟んだ。
  - 入力（`input.mjs`）: Red は `exclusions` が未知のキーのままで失敗、Green で合格。未知のキーの例は `exclusions` から `excludes` に置き換えた。
  - 解決（`resolve.mjs`）: Red は 26 件中 13 件が失敗（解決の戻り値に `excluded` が無い等）、Green で 26 件合格。
  - 出力: Red は `report-exclusions.mjs` が無く読み込みで失敗、`report` の試験 40 件中 10 件が失敗。Green で合格。
  - 入口: Red は 9 件中 4 件が失敗（文書の `exclusions` が空の配列のまま）、Green で 9 件合格。
  - 構造の試験（Step 10）: 実装が先に入っていたので、初回から合格（観測できる Red は無い）。壊した版（環境の読み・`judge.mjs` への除外の語・数の literal の写し）で落ちることを手元で確かめた（commit には残していない）。
- `npm test` の合計（Node 22 の保証の版ではなく、既定の Node 24.22.3 で実行。下の版の行を参照）: Step 5 の Green 後 1197、Step 6 後 1204、Step 7 後 1218、Step 8 後 1240、Step 9 後 1249、最後 1255（実行 1255・合格 1255・失敗 0・skip 0・cancelled 0・todo 0）。基準（U4）は 1109 件。作者（adf-lead）も同じ worktree で `npm test` を流し直し、1255・合格 1255・失敗 0・skip 0・todo 0 を確かめた。
- 版: 門の試験を Node 22.23.5・24.22.3・26.13.1 のそれぞれで実行し、自己の網羅率は 3 つの版で同じ値（下記）。保証の版は 22。24・26 は手元の実行で、CI の保証ではない。
- 実物の command の確かめ（`cli-exclusions` の 2 件）: 流すと失敗する追跡試験 `tests/bad.test.mjs` が `testTargets` に残っている時、除外なしは終了コード 1・`unobservable`・`TEST_FAILED`。同じ file を除外すると終了コード 0・`match`・除外は種別 `test` で記録される。どこからも届かないソースは、除外なしは `mismatch`・`unmeasuredPaths` に出て、除外すると分母から外れて `match`。
- 逆向き（NFR8.3）: 基準 `7fa98d1` の worktree を一時に作り、基準の試験 18 file（261 件）が基準の code に対して全部合格することを確かめた。さらに、この単位の code を写して基準の試験を流すと 36 件が失敗した。内訳は、`resolveInput` の戻り値と `buildDocument` に必須の引数が増えた形による 28 件と、意図して置き換えた 8 件。置き換えた物の根拠は下の「計画からの差異」。一時の worktree は片付けた。
- 自己の網羅率（NFR7.2）: 門で `scripts/coverage-gate/`（directory の宣言）を測り、結果は `match`、coveredLines 1436 / totalLines 1436（100.00%）、対象 17 file すべて測定、未計測 0・試験の未実行 0・試験の失敗 0（[self-coverage-result.json](./self-coverage-result.json)）。独立に Node 組込みの lcov を Node 22・24・26 のそれぞれで数えた結果とも 17 file・1436 / 1436 で一致した（門の値と独立の値が一致）。入力は `tests/coverage-gate-*.test.mjs` の 22 file を名前で並べた。runId は `local`、toolVersion は 22.23.5。この結果は手元の実行で、workflow 上の実行ではない。
- 構造の検査（Node 22）: `lint:structural`・`lint:guard`・`hygiene:lines`・`hygiene:ratchet`・`hygiene:jscpd`・`hygiene:budget`（OWN-01）・`hygiene:coverage` は PASS。dependency-cruiser は違反なし（58 module）。knip `--production` は終了コード 0（設定は変えていない。`subtractExclusions` の `@public` の印は、本番の code から使われるので外した）。
- 試験の値はすべて架空。gitleaks に拾われる形（`token: "12 文字の英数字"`）は書いていない。ただし `secrets`（gitleaks）の検査そのものは手元で流していない。

## 門が保証しないこと（PR に書く）

- 門は、除外の理由が決定の URL の形を含むこと（1 行の文・上限・禁じる並び）だけを見る。その URL が実在すること、書き手が正当であること、その決定が当該の除外を許していることは確かめない。
- 除外した file が実際に流す・測る必要が無い物か、除外が割合を不当に上げていないかは、門は確かめない。独立の監査が、入力の差分と結果の JSON（`exclusions`・`exclusionCount`）を読んで確かめる。件数に上限は無い（採らなかった代替は設計に記録済み）。
- 除外は分母のソースと必須の試験からだけ引く。除外した試験 file が `testTargets` に残っていても測定は流さない（実物の command で確かめた）が、その記録が結果に残ることが、除外とみなす条件になる。`testTargets` を狭めただけの呼び出しは除外とみなされず記録も残らない。

- 決定の URL の形の検査は、形だけである。リポジトリ名は任意で、同じ URL を複数の除外で使い回せ、URL を 1 つ含めば残りの文は自由になる（KY の先回りの点検 F3、重大 × 低、記録だけ。除外の増減は入力の差分に 1 件ずつ見え、4 面に件数が残る）。
- 除外の要素の未知のキー名は、失敗の文の detail に入り、job summary にそのまま出る（U3・U4 の最上位の未知のキーと同じ型の面。F1、軽 × 低、記録だけ）。理由は書く向きを変える制御文字（bidi）・U+2028 を入力の検査で拒まない（`threshold.mjs` の根拠の規則を U4 と共有している。F2、重大 × 極低、記録だけ。決定の URL の断片は ASCII の形で検査される）。監査は入力の差分の生の file を読んで補う。

## KY の先回りの点検（監査の依頼の前、devsecops 役 1 体、読むだけ）

- 結論: 差し戻す組み合わせ（致命 × 全部、重大 × 低以上、中 × 中以上、軽 × 高）に当たる指摘は無い。記録だけの指摘が 3 件（上の F1〜F3）。
- 実走で確かめた物: 0 件に見せる path（`./`・wildcard・絶対 path・大文字小文字・見かけが同じ Unicode・`..`・directory 名・`null`・`__proto__`・重複・別名のキー）は全部入力の失敗（終了コード 2）、`::`・`%0A`・バッククォート・縦線を含む実在の file 名でも summary の構造が壊れず notice は件数だけ、除外した試験は測定の引数に渡されない、除外を決める code に環境・時刻・乱数・file・通信が無い。
- 点検は読むだけで、監査の代わりでも見直しでもない。

## 実行していない・観測していないもの

- 配線された workflow での実行は、U7（`u7-gate-workflow-entry`）の範囲で、この単位では観測していない。入口はどの workflow からも呼ばれない（NFR8.6）。CI の挙動はこの単位では変わらない。
- AC3.1.2（版も指紋も固定されていない DB の job を不合格にする確かめ）は、U7・U8 の範囲で、この単位は観測していない（追跡表は Deferred）。NFR11.3（DB の job の費用）は範囲外（N/A）。
- CI の `test` job と hygiene の結果は、この head を push して確かめるまで観測していない。Node 22 以外での CI は観測していない。
- Linux の runner での実行は未観測（手元は macOS）。
- `secrets`（gitleaks）の検査は手元で流していない。
- 見直し役は、この作業場の区分が `none` のため呼んでいない。見直し済みとは書かない。
- この head の独立の実装監査・作者の受領・Owner の exact-head・作者以外の suite-lead による統合は、未実施。この要約を書いた時点では PR に push していない。

## 計画からの差異

- RL12 が数えた置き換え 4 件（`input`・`cli`・`golden` と `golden.test`・`cli-modes`）は、未知のキーの例を `exclusions` から `excludes` に置き換えた。ほかに、計画が数えていない既存の試験の編集がある: `coverage-gate-resolve.test.mjs` の `input` の補助に `exclusions = []`（`resolveInput` の入力の形が増えたため）、`coverage-gate-report.test.mjs`（1 行。`buildDocument` へ `excluded` を渡す）と `coverage-gate-golden.test.mjs`（1 行。`excluded: []`）、`coverage-gate-structure.test.mjs`（file 一覧に `exclusions.mjs`・`report-exclusions.mjs` を足し、6 件を足した）。いずれも試験を弱めていない（置き換え後も同じ性質を同じ入力で確かめる）。`buildDocument` の `excluded` を必須の引数にしたことの帰結で、設計のずれではない。
- 計画（Step 9）は「除外した試験が `testTargets` に残って流れる」と読める書き方をしていたが、実物の測定は `requiredTestPaths`（除外を引いた後の集合）だけを流す（`measure-node.mjs` の `buildNodeArgs`）。除外した試験 file は流れない。実物の command で確かめ、試験にした。実物の挙動は設計の意図（除外した試験の失敗が結果を落とさない。functional-spec の「除外は名指した file だけを外す」）と一致しているが、計画の文の書き方は実物と食い違う。承認済みの計画は書き換えず、この差異として記録し、設計の文の扱い（直すか、差異の記録のままにするか）は adf-lead が arc に伺う。
- `buildDocument` の `excluded` と、入力の `exclusions` の既定値: 最初は `excluded = []` の既定値を置いたが、渡し忘れが黙って「除外 0 件」になるので外し、必須の引数にした。設計はどちらとも書いていない。実装監査で確かめてもらう点として PR に書く（既定値を戻すなら 1 行）。
- 結果の文書の除外の試験を、新しい file の 300 行の上限（`hygiene:lines`）のため `coverage-gate-report-document-exclusions.test.mjs` に分けた（`coverage-gate-report.test.mjs` が 383 行になったため）。設定は変えず、配置を変えた。試験の中身は変えていない。元の file は基準と同じ 276 行。
- 構造の試験（Step 10）は、実装が先に入っていたため観測できる Red が無い。壊した版での失敗を手元で確かめた。
- `cli.mjs` は変更が要った（解決の除外を文書へ渡すため。行数は 114 のまま）。
