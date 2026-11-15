**Collaborator:** aidlc-architect-agent

# 技術の選択（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file。この取り組みは新しい技術を入れない。ここは「何を使い、何を使わないか」「どの形に収めるか」を、理由と採らなかった代替つきで固定する。名前の細部（関数名）は code-generation で決める。

## 上流

- requirements: `aidlc/spaces/default/intents/261113-audit-intake-extra/inception/requirements-analysis/requirements.md`（NFR3・NFR4・NFR7・NFR9）。
- functional-design: `aidlc/spaces/default/intents/261113-audit-intake-extra/construction/functional-design/functional-spec.md` D2・D3、§7。
- 走査: `aidlc/spaces/default/codekb/shirube/technology-stack.md`（基準 = 公開 main `1dd43e457361d9650153578baa71120788285e98`）。

## 決めたこと

| # | 判断 | 理由 | 採らなかった代替 |
|---|---|---|---|
| TD-1 | 言語は JavaScript の ESM（`.mjs`）、Node `>=22`、試験は Node 組込みの `node:test` と `assert`。新しい npm 依存を足さない。核の import は Node の組込みと `./lib.mjs` だけ（NFR4.2） | 既存の製品規約と、`scripts/hygiene` の依存の方向の検査に揃える。依存を足さないので、依存を入れる前の脆弱性の確かめは適用外（理由は新しい依存が無いこと） | 検査用の外部の library（JSON schema の検証など）。依存を足し、固定した 1 file の bytes の外に判定が出る |
| TD-2 | 判定の全部を `scripts/hygiene/audit-admission.mjs` の 1 file に足す。新しい `scripts/` の file を作らない（NFR9.2）。足す関数は、基準の版の 180 行に **見込み 60〜90 行**で、全体 300 行以下 | 依頼の `verifier_sha256` はこの 1 file の bytes に結ばれる。別の file に出すと、結ばれた bytes の外で判定が動く（照らされていない code が判定する） | 宣言の検査を別の module に出す（file の構造は整うが、固定した digest が判定の全部を覆わない） |
| TD-3 | 複雑さ 10 以下・関数 50 行以下を守る形に、足す部分を小さい関数に分ける。分け方（見込み）: (a) 宣言 1 件の形の検査、(b) 対象の宣言の件数・重複・自 repo・必須の検査の検査、(c) job の commit の分類（宣言を差し引いた候補を決める）、(d) 対象ごとの宣言の確認（seen と実在）。どれも入力だけの関数で、`api` は引数で受ける（S4。NFR6.2） | 既存の技術検査（ESLint の複雑さと関数の行数の上限）に収めるため。判定と I/O を分ける既存の境界に揃える | 既存の `checkoutProof` に条件を足し続ける（複雑さの上限を超えやすく、監査席が読みにくい） |
| TD-4 | 欄の名前 `extra_checkouts` と件数の上限 4、拒否の理由の文の集合は、実装の先頭の定数 1 か所が持ち主。docs と試験はそれを書き写す・照らすだけ（NFR7.1・NFR7.3）。試験が実装の定数を読み、`docs/sds/audit-method.md` と `kit/skills/sds-audit/SKILL.md` §2 に同じ名前と同じ上限が書かれていることを確かめる（NFR7.2） | S3。規則の値は 1 か所 | 文書に書いた値を実装が読む（判定が文書の編集に左右される） |
| TD-5 | 行の網羅率の測り方: Node の組込みの網羅率（`--experimental-test-coverage`）の lcov の reporter を、試験の中で子の process として流し、出力を解析して判定する（NFR3.4）。新しい `scripts/` の file を作らない。判定は `tests/` の新しい試験の中に置き、CI の `test`（`tests/*.test.mjs`）が機械的に検査する | 新しい `scripts/` の file を作らず（NFR9.2 と同じ理由で、検査の変更を守る物の外に収める）、workflow を変えず（NFR9.1）、CI の中で 100% の床を実測で守れる。子の process の出力の解析が判定の関数への入力なので、負例は文字列の fixture で作れる | (a) 手で実行して値を記録に書き写す（申告された値を証拠にする。S5 違反）、(b) 共有の網羅率の門（261110 の取り組みの `scripts/coverage-gate/`、PR 104）に依存する（統合が済んでおらず、取り組みの順序の依存を作る）、(c) workflow に網羅率の step を足す（workflow は守る物） |
| TD-6 | 試験の差し込み `api` は、path（repo と commit）ごとに別の応答を返す小さな補助を、**新しい試験の file の中**に持つ。既存の試験の fixture は変更しない（FR4.3・FR4.4） | 既存の fixture はどの commit の問い合わせにも 1 つの応答を返し、負例（宣言の repo に無い commit）が意味を持たないため。既存の試験を変更しない決まり | 既存の fixture を広げる（既存の試験の変更になり、FR4.4 に反する） |
| TD-7 | 宣言の実在の確認は、既存の `api` の差し込みで `repos/<宣言の repo>/git/commits/<commit>`（今の統合の版の確認と同じ形の path）を読む。新しい endpoint・新しい権限を足さない（NFR8.3） | 資格情報を増やさない（S9）。読めなければ拒否 | GraphQL・検索 API・clone（権限・時間・bytes が増える） |

## 社内の標準（S1〜S9）への照らし

| 標準 | この単位での扱い | 対応する要件 |
|---|---|---|
| S1 参照されている行は消さない | 適用外（DB・削除を持たない） | — |
| S2 抽象は 3 例目で作る | 宣言の検査は 1 つの用途のための具体の関数。汎用の「追加の入力の枠組み」を作らない | TD-3 |
| S3 知識の重複は禁止 | 欄の名前・上限・理由の文の持ち主は実装の 1 か所 | NFR7.1〜NFR7.3、TD-4 |
| S4 時刻・乱数・識別子は明示入力 | 足す関数は時刻・乱数を取らず、`api` を引数で受ける | NFR6.1・NFR6.2 |
| S5 宣言された値は証拠でない | 宣言を根拠にせず、job の記録と問い合わせの観測を根拠にする。網羅率も実測から | NFR1.4・NFR3.4 |
| S6 schema 変更は可逆で新旧が同居 | schema の版は `/1` のまま。revert で戻る。古い checker は新しい欄を無視して拒否 | NFR2.3 と reliability の「戻し方・同居」 |
| S7 外部への効果は冪等 | 外への効果が無い（読み取りだけ）ので適用外。問い合わせは冪等 | NFR6.3 |
| S8 失敗を隠さない | 観測できないを成功にしない。`|| true` 相当を足さない | NFR1.1・NFR1.2・NFR3.5 |
| S9 資格情報は用途ごとに最小 | 新しい資格を足さない。読み取りだけ | NFR8.3 |

## 技術検査（既存）

| ID | 要件 | 測り方 |
|---|---|---|
| NFR4.1 | 構造の上限: `audit-admission.mjs` は 300 行以下、関数は 50 行以下、複雑さは 10 以下。新しい試験 file も 300 行以下を目標にし、hygiene profile の対象外ならその旨を確かめて記録する | `npm run lint:structural`・`npm run lint:guard`・`wc -l` の実測の記録 |
| NFR4.2 | 核の import は Node 組込みと `./lib.mjs` だけ。`package.json` の依存を変えない | 差分で `package.json`・lockfile が変わらないこと。dependency-cruiser の検査が通ること |
| NFR4.3 | 既存の技術検査（`hygiene:lines`・`hygiene:ratchet`・`hygiene:jscpd`・`hygiene:coverage`、CI の `own-code-budget`）が通る。通すために閾値・上限を緩めない（同じ PR で緩めることを禁じる決まり） | build-and-test で各 script を実行した結果（終了コードと出力）を記録に書く。profile の変更が差分に無いこと。CI の `own-code-budget` を超える場合は、PR に「AI-DLC の単位の作る段の出力」と 1 行書く（チームの決まり） |
| NFR7.1 | 欄の名前・件数の上限の「規則の値」を判定に使うのは、実装の 1 か所の定数だけ | 実装の `grep` で、`extra_checkouts` と上限の値が定数の定義以外に literal で現れないこと |
| NFR7.2 | `docs/sds/audit-method.md` と `kit/skills/sds-audit/SKILL.md` §2 の 2 か所は、実装の定数と同じ名前・同じ上限を書く。食い違いは試験が検出する | 食い違えた文書の fixture で、試験が失敗すること（負例） |
| NFR7.3 | 拒否の理由の固定の文の集合は、実装の 1 か所が持ち主。試験は期待値の文を実装から読むのではなく、`rules.md` の一覧に対応する literal を持つ（実装の誤字が試験で気づけるように） | 実装の理由の集合と試験の期待の集合が一致すること |

## DB の基準

適用外。この取り組みは表・migration・DB の設計の記録を持たない（`db-standard.md` の対象に当たらない）。
