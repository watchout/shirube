# Node 22 の reporter の観測（暗黙の file 合格の見分け）

設計監査 round 1 の指摘 F01（高 × 重大）への対応の根拠。BR2.4 の「試験が 0 件の file は ran でない」を守るために、Node 22.23.4 の実際の reporter に 6 例を流して出来事の形を観測した。観測の道具は架空の小さな reporter（出来事を 1 行の JSON にするだけ）と架空の fixture で、製品の code ではない。

## 観測の条件

- Node: 22.23.4（保証の版 22。既定の `node` は別の版だったので、22 を明示して流した）。
- 実行: `node --test --test-reporter=<観測用の reporter> <相対 path の file>`。環境は PATH・HOME・LANG・LC_ALL・TZ の 5 つだけ。
- 渡した file の名前は、引数に書いた相対 path がそのまま出来事の `name` に出る（入れ子の directory でも相対 path）。`file` は絶対 path。

## 6 例の結果（出来事の抜粋）

| 例 | file の中身 | 出来事 | 終了コード |
|---|---|---|---|
| empty | 何も無い | `test:pass` が 1 件。name は file の相対 path、nesting 0、line 1、column 1、details.type `test`、skip・todo なし。`test:plan` count 1 | 0 |
| import-only | import 文だけ | empty と同じ形（`test:pass` 1 件、line 1・column 1、name は file の相対 path、plan count 1） | 0 |
| pass | 試験 1 件（5 行目） | file 全体の `test:pass` は **出ない**。試験 `value is one` の `test:pass` が 5 行目・column 1。plan count 1 | 0 |
| all-skip | skip の試験 2 件 | 2 件とも `test:pass` で skip が真か理由の文字列。file 全体の `test:pass` なし。plan count 2 | 0 |
| all-todo | todo の試験 2 件 | 2 件とも `test:pass` で todo が真か文字列。file 全体の `test:pass` なし。plan count 2 | 0 |
| load-fail | 先頭で例外を投げる | file 全体の `test:fail`（error あり）、line 1・column 1、name は file の相対 path | 1 |

追加の 2 例:

- 入れ子の path（`sub/nested-empty.test.mjs`、空の file）: empty と同じ形。name は `sub/nested-empty.test.mjs`。
- file 名と同じ名前の試験（`sub/same-name.test.mjs` の 3 行目に `test("sub/same-name.test.mjs")`）: 試験の `test:pass` は line 3 で、暗黙の合格（line 1）とは line で区別できる。

## 選んだ規則

暗黙の file 合格 = `test:pass` で、details.type が `test`、nesting が 0、line が 1、column が 1、name が門が走らせた file の引数の path と等しい物。これは passed に数えず、implicitFilePassCount に分けて残す。

- empty・import-only・入れ子の空の file は、暗黙の合格だけになり passed が 0 になる → `ran` でない（TESTS_NOT_RUN）。
- pass・all-skip・all-todo は暗黙の合格を持たず、従来どおり数える（all-skip・all-todo は passed が 0 で ran でない）。
- load-fail は file 全体の `test:fail` で failed に数える（TEST_FAILED）。

## 捨てた案

- `test:plan` の count: empty も pass も 1 で区別できない。
- `test:enqueue` の有無: file 全体の enqueue は常に出る。
- line・column だけ: 実際の試験が 1 行目にあり得る。

## 外れる向き

file 名と同じ名前の試験を line 1・column 1 に置く file は、暗黙の合格と読まれ、passed に数えられない。その file は ran でなくなり TESTS_NOT_RUN になる（成功には倒れない）。

## 保証の範囲

この観測は Node 22.23.4 だけ。他の版は同じ出来事の形になるかを保証しない（Q4）。コード生成で、同じ 6 例（+ 入れ子の path と同名の試験）を、実際の reporter に流す試験として加える（unit-test-instructions の events と measure-node の行）。
