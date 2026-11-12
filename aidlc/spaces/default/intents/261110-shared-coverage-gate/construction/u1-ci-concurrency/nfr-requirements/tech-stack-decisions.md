# U1 u1-ci-concurrency — 技術の選び方と、環境・試験・費用の要件

この単位で使う技術と、それに結び付く要件（動作環境、規則の置き場、試験の方法、構造の予算、指標、費用）を書く。新しい技術は 1 つも足さない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 単位: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md) の U1。要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1・NFR3・NFR7・NFR9〜NFR11、FR10.3、FR10.4。
- 技術の観測: 基準は公開 Shirube の base コミット `7e775afd5b755e51e55e269d8dc35b09d180c33e` の `.github/workflows/ci.yml` の実物（SHA-256 `1e3f42c895dccd23b4b00017da6171488729d092af435cdc11cb85018b861c8a`）。詳細は [security-requirements.md](./security-requirements.md) の「基準の観測」。要点: job は `test`（Node 26、`scripts/**` 全体の行の網羅率 80% の床）・`hygiene`（Node 22 を呼び出し先に渡す）・`measure` の 3 本で、起動は `pull_request`・`push` の `main`・`workflow_dispatch`、最上位に `permissions: {}`、`concurrency` の記載なし。`npm test` = `node --test tests/*.test.mjs tests/u2/*.test.mjs`。実行時の npm 依存は無い。
- 注意: 共有の [technology-stack.md](../../../../../codekb/shirube/technology-stack.md)（CodeKB）の「CI は Node 22」は作業場の古い木の観測で、base の実物と合わない。この単位の基準には使わない（CodeKB は PR の差分に入れず、更新は別の扱い）。
- 実践: team.md の Testing Posture（TDD、`node:test` と `assert`、行の網羅率 100%、観測した値を機械が読める形で記録）と Code Style（`.mjs`、Node 22 以上、実行時 npm 依存なし）。確認コマンドの記録: `verification-command.txt`（Owner 承認済み。対象は `scripts/coverage-gate/` 配下で、この単位は足さない）。
- 既存の試験の読み方: `tests/workflow-contract.test.mjs` は `ci.yml` と `hygiene.yml` を文字列として読んで確かめる。YAML を解釈する依存は使っていない。

## 技術の選び方

| ID | 決めたこと | 理由 | 採らなかった代替 |
|---|---|---|---|
| D1 | GitHub Actions の workflow 最上位の `concurrency:` を使う | 追加の action も依存も要らない。実行を取り消す標準の仕組みで、費用も増えない（NFR6.1、NFR11.1） | 取り消し用の第三者の action（新しい依存になる）、API を呼ぶ自作の step（資格情報と権限が増える） |
| D2 | 取り消しの規則は workflow の最上位に 1 か所だけ置く | 規則を 1 か所にする（NFR3.1、S3）。job ごとに書くと食い違う。`hygiene` を呼ぶ job も同じ規則に入る | job ごとの `concurrency:`（写しが増える） |
| D3 | group の鍵は、PR の実行は PR の番号から、そのほかの実行は実行ごとに別の値から作る | 作者が選べない値だけにし（NFR5.2）、`main` への push の実行が取り消されることも保留で置き換わることもないようにする（NFR4.3） | ブランチ名（`github.head_ref`）を鍵にする（別の fork の同名ブランチが他の PR の実行を取り消せる）、全部の実行を 1 つの group にする（`main` の保留中の実行が置き換わる） |
| D4 | 取り消す条件は、PR の実行のときだけ真になる式で決める | 既定の branch への push は取り消さない（FR10.3） | 無条件の取り消し（`main` の実行が消える） |
| D5 | 試験は、workflow を文字列として読む定義の試験（`node:test` と `assert`）で書く | 既存の試験と同じ読み方で、新しい依存を足さない（NFR6.1、NFR7.1）。文字列の読みは粗いので、負例を厚くして補う | YAML を解釈する npm の依存を足す（新しい依存の承認が要る）、実際の GitHub の実行だけで確かめる（再現できず、統合前の確かめにならない） |

D3・D4 の書き方の細部（式の書き方、group 名の接頭語）は、この後の設計の段と Code Generation の計画で決め、設計監査で確かめる。

## 要件

### NFR1 動作環境

- **NFR1.1** 実行場所（`ubuntu-latest`）と Node の指定（`test` と `measure` は 26、`hygiene` は呼び出し先へ渡す 22）を変えない。`package.json` の `engines`（`>=22`）も変えない。`concurrency:` は GitHub Actions の構文で、runner や Node の版に依存しない。[NFR1、FR10.4]

### NFR3 規則は 1 か所

- **NFR3.1** 取り消しの規則（group の作り方と取り消す条件）は、`ci.yml` の最上位に 1 か所だけ書く。job や試験の中に同じ規則の写しを持たない。試験は規則を再定義せず、定義を読んで確かめるだけにする。[NFR3、S3]

### NFR7 試験の方法

- **NFR7.1** TDD。先に、変更前の `ci.yml` で失敗する試験を書いて失敗を確かめ、次にそれを通す変更を書く。試験は `node:test` と `assert`。正例（PR の実行は同じ PR で取り消される）と負例（`main` への push は取り消されない、別の PR を巻き込まない、鍵に作者が選べる値を使わない、失敗を隠す記述が無い）をそろえる。[NFR7、US7.3、US7.4]
- **NFR7.2** この単位は測る対象のソースを足さない（足すのは試験だけ）。確認コマンドの行の網羅率の対象は `scripts/coverage-gate/` 配下で、この単位の間は 0 件になり、網羅率が空のまま 100% と出て通る。これは U1 の合否の根拠にしない。この単位の確かめが保証するのは、既存の試験と、この単位で足す試験が通ることだけ。[NFR7、プロジェクトの学び（対象 0 件を成功と読まない）]
- **NFR7.3** 試験の結果は、実行した試験の数・合格数・失敗数の観測として Build and Test の記録に残す。実行されない、計測できない、時間切れを成功に数えない。申告された数を写さない。[NFR7、S5、S8]

### NFR9 構造の予算

- **NFR9.1** 新しい試験 file は 300 行以内、ESLint の関数は 50 行・複雑さ 10 を保つ。既存の試験 file に足す場合も、その file の予算を超えない。[NFR9]

### NFR10 評価の指標

- **NFR10.1** この単位の成功は、自社で観測できるものだけで判断する: workflow の定義の試験の結果と、この PR 自身の CI の実行の記録（取り消しが起きた実行、最新の head の実行が最後まで流れたこと）。外から決まる値は使わない。[NFR10、FR10.3]

### NFR11 費用

- **NFR11.1** 新しい有料サービスや常設の資源を足さない。実行時間や費用が減るという主張は、実際の実行の記録で観測するまで書かない。[NFR11、S5]

### NFR2 判定の核の決定性（この単位では当てはまらない）

- 判定の核（時刻・乱数・識別子を入力で受ける部品）をこの単位は持たない。traceability では N/A とし、理由を書く。

## Assumptions & Open Questions

### Assumptions

- [assumption] 既存の `tests/workflow-contract.test.mjs` の読み方（文字列として読む）に合わせ、新しい試験もその形で書く。YAML を解釈する依存は足さない。具体の置き場（既存 file への追加か新しい file か）は Code Generation の計画で決める。
- [assumption] D3 の鍵の書き方で、PR の実行は PR の番号ごとに分かれ、`main` への push は実行ごとに分かれる。式が意図どおりに評価されるかは、設計の段で公式の構文の文面で確かめ、試験の負例でも確かめる。
- [assumption] 確認コマンドの変更はこの単位では起きない。置き場（`scripts/coverage-gate/`）が変わる場合は、U3 の設計で再び承認を伺う（Owner の承認済みの確認コマンドの条件）。

### Open Questions

1. 試験を既存の `tests/workflow-contract.test.mjs` に足すか、新しい file に分けるか（file の大きさの予算に依る）。Code Generation の計画で、現在の行数を見て決める。
2. 文字列として読む定義の試験で、式（`${{ ... }}`）の意味まで確かめられる範囲。足りない部分は、設計監査と、この PR 自身の CI の実行の記録で補う。
