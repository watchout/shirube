# U4 u4-thresholds-and-modes 実装の要約

実装は clone の worktree（`~/Developer/.worktrees/shirube-coverage-gate-u4-20261116`、branch `adf-lead/coverage-gate-u4-thresholds-modes-20261116`、基準は `origin/main` `43819a56222b68c2e4c4c028d0f6644b288c33c7`）で行った。Owner の作業場では git を実行していない。実装の実物と commit は PR の branch にある。追跡表の検査が作業場の木の中の file を探すので、新しい・変えた試験 11 file だけを PR の branch と同じ内容（`cmp` で一致を確認）で作業場の `tests/` にも置いた（未追跡。作業場の木が main に合わせて更新される時に取り除くか、統合済みの同じ内容で置き換わる）。作業場の木の `scripts/coverage-gate/` は古い U3 の版（`runner.mjs` は main より古い版）で、単位のチェックポイントの確認コマンドは作業場の木で走るため、チェックポイントの確認の前に、PR の branch と同じ内容を作業場の木へ写した（未追跡の写し）: `scripts/coverage-gate/` の 7 file（`cli`・`input`・`judge`・`report`・`runner`・`report-exception`・`threshold`）と `tests/coverage-gate-runner.test.mjs`。写した後に `diff -rq` で `scripts/coverage-gate/` が PR の branch と差分 0 件であることを確かめた。この写しでの確認コマンドの結果は、終了コード 0・673 件合格・失敗 0・skip 0・`scripts/coverage-gate/` の 15 file すべて行の網羅率 100%（作業場の木に対する観測であり、PR の branch の CI の結果ではない）。この単位の変更の証拠は PR の branch 側の実行にもある。

## Sources

- 計画: [code-generation-plan.md](./code-generation-plan.md)（Step 1〜11、Testing Contract）。試験の手順: [unit-test-instructions.md](./unit-test-instructions.md)。
- 設計: functional-design の rules.md（BR6.1〜BR8.6）、nfr-design の各設計（SC・RL・OB・LC・PF・SL）、追跡表。
- 作業の観測は、この要約の「試験の観測」の各行に、実行した command と結果を書いた。

## 作った・変えた file

- `scripts/coverage-gate/`（新規 2 file、変更 4 file。合計 15 file・1,286 行、いずれも 300 行以内）。
  - 新規: `threshold.mjs`（84 行。例外の検査。定数と形の持ち主）、`report-exception.mjs`（64 行。例外・動作の表示の文型と注釈の種類の持ち主）。
  - 変更: `judge.mjs`（138 → 158。動作の名前と、落とすかどうかの決定をここ 1 か所に。`mode` と `threshold` を明示の入力に）、`input.mjs`（94 → 117。`mode`・`threshold` を既知のキーにして検査）、`report.mjs`（168 → 177。文書の例外の項目と、summary・notice への文型のつなぎ）、`cli.mjs`（113 → 114。検査済みの `mode` と `threshold` を `judge` へ渡す 1 行）。
  - 変えていない: `emit.mjs`、`order.mjs`、`sanitize.mjs`、`events.mjs`、`events-reporter.mjs`、`lcov.mjs`、`resolve.mjs`、`runner.mjs`、`measure-node.mjs`。
- 試験（新規 6 file、変更 5 file。門の試験は 193 → 261 件、68 件増）。
  - 新規: `coverage-gate-golden.mjs`・`coverage-gate-golden-text.mjs`（補助。後ろ向きの互換の golden）、`coverage-gate-golden.test.mjs`（3 件）、`coverage-gate-threshold.test.mjs`（16 件）、`coverage-gate-report-exception.test.mjs`（9 件）、`coverage-gate-cli-modes.test.mjs`（8 件）。
  - 変更: `coverage-gate-judge.test.mjs`（19 → 28）、`coverage-gate-input.test.mjs`（14 → 24）、`coverage-gate-report.test.mjs`（18 → 28）、`coverage-gate-structure.test.mjs`（8 → 11）、`coverage-gate-cli.test.mjs`（件数は 25 のまま。1 件の入力を置き換え）。
- 変えていない物: `package.json`、`.github/`（workflow）、`kit`、`scripts/hygiene`、`scripts/sds`、`knip.jsonc`、各種の設定、`emit.mjs`。基準との差分を取り、これらに差分が 0 件であることを確かめた。
- 単位の記録: `self-coverage-input.json`、`self-coverage-result.json`（OB5）、`source-manifest.json`、`traceability.json`、この要約。設計の記録は変えていない。

## 主な実装の判断

- 落とすかどうかは `judge.mjs` の `failsJob`（区分が `match` でなく、かつ動作が `enforce`）の 1 か所だけが決める。入口は `Number(document.shouldFail)` を終了コードに写すだけで、動作で分岐しない。入力の失敗だけは 2 のまま。
- 実際の閾値は、例外があればその値（整数の hundredths）、無ければ `DEFAULT_THRESHOLD_HUNDREDTHS`。比較は整数どうし。例外は観測できずの早期の経路にも載るので、3 つの区分すべてで「例外を使った」事実が残る。
- 例外の検査（`threshold.mjs`）は、object でない → キーの欠落（`percent`、`decisionUrl`、`rationale` の順）→ 未知のキー → 値の順に、最初の 1 件だけを返す。決定の URL は形（`github.com` の issue か pull のコメント）だけを見る。ネットワーク・時計・環境・file を持たず、import は `judge.mjs` と `order.mjs` だけ。失敗の文は入力の文字列を写さない（未知のキー名を除く）。
- `mode` は完全一致（`enforce` / `record-only`）、省略は `enforce`。入力の `threshold` と `mode` は入力の JSON だけから来る。引数にも環境の名前にも口を足していない（試験で、環境の名前を置いても変わらないことと、引数を足すと入口の失敗になることを確かめた）。
- 出力は 1 つの文書から 4 つの面を作る。文書の `thresholdException` は `{decisionUrl, claimedPercent, rationale}`。項目の名前と出力値の名前（7 つ）は増やしていない。例外ありは summary の最初の行（見出しより前）に旗、表の閾値の欄に「lowered from 100.00%」、`Threshold exception` の節。notice は、例外ありの一致が warning、一致でなく `enforce` が error、一致でなく `record-only` が warning。notice に根拠は載せず、決定の URL を載せる。`record-only` で観測できない時の見出しは `Not observable (計測不能)`。成功とは書かない。
- URL と根拠は出口でも U3 の無害化（`summaryPath`・`sanitizeNotice`）を通す。入口で拒む形が通り抜けた場合の二重の防御を試験で 1 件確かめた。

## 試験の観測（Red → Green）

- 全部の部品で Red の commit と Green の commit を分けた。Red はそれぞれの commit の木で実行して観測した。
  - 判定: Red は新しい名前の読み込みで失敗（tests 1・pass 0・fail 1）、Green で 28 件合格。
  - 例外の検査: Red は `threshold.mjs` が無く読み込みで失敗（tests 1・pass 0・fail 1）、Green で 16 件合格。
  - 入力: Red は tests 24・pass 15・fail 9、Green で合格。
  - 出力: Red は tests 29・pass 21・fail 8（新しい 1 file は読み込みで失敗）、Green で 40 件（出力 2 file と golden）合格。
  - 入口: Red は tests 8・pass 3・fail 5、Green で 8 件合格。
  - golden（Step 3）は、U3 の code を 1 行も変える前に作り、U3 の code から 4 経路 × 4 面（JSON・summary・notice・出力値）の文字列を固定した。以後の全部の commit で 3 件とも合格のまま（バイト一致）。
- Red の試験の例のうち 1 つ（入口の「計測されない file」）は、実際には `NO_RECORDS`（計測できない）になる入力だったので、Green の commit で名前と期待を `NO_RECORDS` に直した（`UNMEASURED_FILES` は実物の command の試験が受け持つ）。
- 版: Node 22.23.5（保証の版）で門の試験 261 件合格（失敗・skip・todo 0）。Node 24.22.3・26.13.1 でも同じ 261 件合格（観測。保証ではない）。
- 全体: 作業木で `npm test`（Node 22.23.5）は実行 1109・合格 1109・失敗 0・skip 0・cancelled 0・todo 0。
- 逆向き（NFR8.3）: 基準の `43819a5` の U3 の試験 file（`tests/coverage-gate-*`）を、この単位の code の木へ置いて実行した。193 件中 189 件合格・4 件失敗で、失敗は意図して置き換えた物だけ: 入力の既定値の検査（`mode`・`threshold` を足した形）、未知のキーの検査（`threshold`・`mode` は既知になった）、入口の入力の失敗の例（`threshold: 50` は例外の値の誤りになる。`exclusions` へ置き換え）、構造の file 一覧（15 file）。計画は置き換えを 1 件と書いたが実際は 4 件（下の「計画からの差異」）。golden を含む U3 の他の検査は全部合格。
- 自己の網羅率（OB5）: 門で `scripts/coverage-gate/`（directory の宣言）を測り、結果は `match`、coveredLines 1286 / totalLines 1286（100.00%）、対象 15 file すべて測定、未計測 0・試験の未実行 0・試験の失敗 0。独立に Node 組込みの lcov（Node 22・24・26 のそれぞれ）で数えた結果とも 15 file・1286 / 1286 で一致した。入力は、`tests/coverage-gate-*.test.mjs` の 18 file を名前で並べた（`resolveTargets` はワイルドカードを解決しない）。runId は `local`、toolVersion は 22.23.5。この結果は作業場の手元の実行で、workflow 上の実行ではない。
- 構造の検査（Node 22）: `lint:structural`・`lint:guard` は指摘なし。`hygiene:lines`・`hygiene:ratchet`・`hygiene:jscpd`（重複 0）・`hygiene:budget`（OWN-01。合計 4,961 / 上限 20,000）・`hygiene:coverage` は PASS。dependency-cruiser は違反なし。knip は、`threshold.mjs` の試験からだけ使う 5 つの export に `/** @public */` を付けた後に指摘なし（付ける前は未使用の export 5 件を指摘した。設定は変えていない）。

## 門が保証しないこと（PR に書く、BR6.6）

門は決定の URL の形だけを見る。その URL が実在すること、書き手が正当であること、その本文が下げた値を許していることは、門は確かめない。これらは独立の監査が確かめる（rules.md の「門が保証しないこと」。iyasaka-arc#49 のコメント 6762288830 は Owner の委任の下での arc の答えで、Owner の言葉ではない）。`record-only` は「失敗させない」だけで、結果は文書・summary・notice に残る。計測の結果が悪くても job は失敗しないので、記録を読む人（監査・U8 の集計）が拾う前提になる。

## 実行していない・観測していないもの

- 配線された workflow での実行（AC10.1.3）は U7 の範囲で、この単位では観測していない。入口はどの workflow からも呼ばれない（NFR8.5）。
- CI の `test` job（Node 26）と hygiene（Node 22）の結果は、この head を push して確かめるまで観測していない。Node 22 以外での CI は観測していない。Node 24・26 は手元の実行で、CI の保証ではない。
- Linux の runner での実行は未観測（手元は macOS）。
- 見直し役は、この作業場の区分が `none` のため呼んでいない。見直し済みとは書かない。サブエージェントも呼んでいない。
- この head の独立の実装監査・作者の受領・Owner の exact-head・作者以外の suite-lead による統合は、未実施。

## 計画からの差異

- 置き換えた U3 の試験は、計画の 1 件より多い 4 件（上の「逆向き」）。入力の既定値の検査は `mode: "enforce"`・`threshold: null` を足した形に、未知のキーの検査は既知になった 2 つを外して残りを確かめる形に、入口の例は `threshold: 50` から `exclusions: 50` に置き換えた。いずれも試験を弱めていない（置き換え後も同じ性質を別の不正な入力で確かめる）。
- `judge` は知らない `mode` を受けたら `TypeError` を投げる（呼び出しの誤りを成功に読み替えない）。設計は入力の検査の側の失敗だけを書いていて、核の防御は設計に書かれていなかった。入力の検査を通った値は 2 つのどちらかなので、通常の経路では起きない。
- `MODE`（U3 の定数）は、同じ値を 2 か所に書かない形で `MODES[0]` から作り、`DEFAULT_MODE` と同じ持ち主にした（knip の二重の export の指摘を避けるため、`ENFORCE` は export しない）。
- 判定と例外の検査の Red は、新しい名前・新しい file が無いための読み込みの失敗（tests 1・fail 1）で、個々の件の失敗ではない。
- 計画は `cli.mjs` を 106 行と書いたが、基準の実物は 113 行（U3 の round 2 の是正後）。この単位で 1 行足して 114 行。
- Step 2 の確かめ: worktree の merge-base は記録した `origin/main` と一致。`input`・`judge`・`report`・`cli` の基準の SHA-256 は記録できた（先頭 16 文字: input `aba3d57dd9454864`、judge `92ebcdb24fcc70de`、report `a1d4c336cf72ab28`、cli `6a6274a6fd8c1fa8`）。`package.json` は基準と同じ（`ed2e11f383a1714e`）、`ci.yml`・`scripts/hygiene/lib.mjs` は基準との差分が 0 件。
