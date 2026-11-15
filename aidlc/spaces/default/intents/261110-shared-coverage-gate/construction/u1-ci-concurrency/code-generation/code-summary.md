# U1 u1-ci-concurrency 実装の要約

実装は clone の worktree（PR #102 の branch `adf-lead/u1-ci-concurrency-20261112`）で行った。作業場の木は古く（origin/main より 158 commit 遅れ）、Owner の作業場では git を実行しないため、実装の実物と commit は PR の branch にある。作業場の木には `ci.yml` の変更はまだ入っていない。追跡表の検査が作業場の木の中の file を探すため、試験 file だけを PR の branch の実物と同じ内容（SHA-256 `d1b9c60d7d5b92ec7645e42d89df6474621c52ed47756c1ede0adbced4818b13`）で作業場の木にも置いた（git は使っていない。未追跡の file。作業場の木が main に合わせて更新される時に、この file は取り除くか、統合済みの同じ内容で置き換わる）。

## 作った・変えた file

- `.github/workflows/ci.yml`（変更）: 最上位の既存の `permissions: {}` の直後・`jobs:` の直前に `concurrency:` を 1 つ足した（コメント 1 行・`group`・`cancel-in-progress`・空行。追加は 5 行）。
  - `group`: `ci-` + `pull_request` のときは PR の番号、それ以外は実行ごとの番号（`github.run_id`）。作者が選べる値（branch 名・題名など）は使わない。
  - `cancel-in-progress`: `github.event_name == 'pull_request'` のときだけ真。main への push と手動の実行は取り消さない。
  - `on:`・`permissions`・job（`test`・`hygiene`・`measure`）・必須の検査は変えていない。
- `tests/ci-concurrency.test.mjs`（新規、123 行、8 件）: T1〜T8（正例 1、負例 5、逆向き 1、同居 1）。YAML の依存は足さず、`ci.yml` を文字列として読む。ブロックの外の形は既存の BR7.2 に任せ、ここでは写さず比べる（S3）。

## 主な実装の判断

- group の式は `&&`／`||` の短絡で PR の実行と PR 以外を分ける。`workflow_dispatch` と `push` は実行ごとの group になるので、互いにも PR の実行にも取り消されない。
- ブロックを `on:` の中や `push:` と `workflow_dispatch:` の間に入れない。既存の BR7.2 がその並びを固定している。
- 試験の読み手は「最上位にちょうど 1 つ」を要求し、job の中・2 つ・group や取り消しの行が無い入力を失敗にする（成功に読み替えない）。

## 試験の観測（Red → Green）

- 基準: 木の `ci.yml` の SHA-256 は `1e3f42c895dccd23b4b00017da6171488729d092af435cdc11cb85018b861c8a`（base `7e775afd…` と一致）。変更前の `node --test tests/workflow-contract.test.mjs` は 79 件すべて合格。
- Red（試験だけの commit `308bca7`）: 変更前の `ci.yml` に対して 8 件中 6 件が失敗（T1・T2・T4・T5・T7・T8）。T3・T6 は `ci.yml` を読まない入力の試験なので変更前から通る。この PR の Actions でも同じ head の `ci` / `test` が失敗した（実行 43162998247、753 件中 747 合格・6 失敗）。
- Green（`ci.yml` の commit `683b14f`）: 8 件すべて合格。`workflow-contract`（BR7.2 を含む）79 件すべて合格。`npm test` 全体 753 件すべて合格（`npm ci` 済みの木で）。この PR の Actions でも同じ head の `ci` が成功した（実行 43163213808）。
- 戻し方の観測（1 回、恒久の試験にしない）: 足したブロックを取り除いた結果の SHA-256 は `1e3f42c8…b861c8a` で base と一致した。
- 行の網羅率: この単位は `scripts/` に code を足さない。確認コマンドの対象（`scripts/coverage-gate/**`）は 0 件で、空のまま 100% と出て通るため、U1 の合否の根拠にしない。保証するのは、既存の試験とこの単位の試験が通ることだけ。

## 実行していない・観測していないもの

- GitHub Actions 上で式（`format`、`&&`、`||`）が意図どおりに評価され、古い head の実行が取り消されることの観測は、この PR の続く push で確かめる。観測できるまで成功とは書かない。観測の結果は Build and Test の記録に書く。
- 設計監査の観察 O01（concurrency は commit の新旧順を保証しない。再実行や遅延到着が最新 head と重なると最新側が取り消され得る）は、この単位の記録に持ち越す。「最新の head は取り消されない」は通常の更新順の前提に限って読む。
- `main` への push の実行が取り消されないこと、hygiene の reusable workflow が影響を受けないことは、統合後の実行で確かめる。統合前には観測できない。
- 見直し役は、この作業場の区分が `none`（Owner 決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125）のため呼んでいない。見直し済みとは書かない。

## 計画からの差異

- Step 5（整理）では、試験の補助関数が重複しておらず、判定の値（接頭語・許可する値・禁止する記述）も各 1 か所なので、変更は無かった。
- 計画の Step 2 は「単位に絞った command」を `node --test tests/workflow-contract.test.mjs` とした。実行にあたっては、これに加えて `node --test tests/ci-concurrency.test.mjs` を単位の command として用いた。
- それ以外の差異は無い。
