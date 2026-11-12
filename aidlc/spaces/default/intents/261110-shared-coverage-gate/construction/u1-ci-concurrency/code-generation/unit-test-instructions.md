# U1 u1-ci-concurrency — 試験の手順

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 計画: [code-generation-plan.md](./code-generation-plan.md)。設計: [security-design.md](../nfr-design/security-design.md) の試験の表。

## 試験の道具と設定

- 道具: Node 組込みの `node:test` と `assert/strict`（実行時の npm 依存を足さない。NFR6.1）。
- 設定: 追加なし。`package.json` の `test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs` で、新しい試験 file を自動で拾う。`ci.yml` の `test` job も同じ試験を `scripts/**` 全体の行の網羅率 80% の床つきで流す（この単位は `scripts/` に code を足さない）。
- 前提: Node 22 以上（`package.json` の `engines`）。CI の `test` job は Node 26、`hygiene` は 22 を渡す。手作業の準備は要らない。実装の作業木は clone の worktree で、`ci.yml` の SHA-256 が base の `1e3f42c8…` と一致することを最初に観測する。

## この単位の試験の実行 command（単位に絞った形）

- 新しい試験: `node --test tests/ci-concurrency.test.mjs`
- 関連する既存の試験（変更前のまま通ること）: `node --test tests/workflow-contract.test.mjs`
- 全体の確かめ（Step 6 で 1 回）: `npm test`

最初の Red の前に、作業木の `ci.yml` の SHA-256 が base の `1e3f42c8…` と一致することを観測し、続けて `node --test tests/workflow-contract.test.mjs`（BR7.2 を含む）を流して通ることを確かめ、実行数・合格数・失敗数を記録する。

## 試験の一覧（8 件、標準の方針の 5〜8 件の範囲）

| ID | 種類 | 確かめること | 対応する要件 |
|---|---|---|---|
| T1 | 正例 | 最上位の `permissions: {}` の直後・`jobs:` の直前に `concurrency:` が 1 つ。group は `ci-` で始まり PR の番号から作られる。PR の実行で取り消しが真 | FR10.3、NFR3.1、NFR4.2 |
| T2 | 負例 N1 | `push` と `workflow_dispatch` の実行は取り消されない（式が `pull_request` のときだけ真。固定の `true` ではない） | FR10.3、NFR4.3 |
| T3 | 負例 N2 | group に作者が選べる値（ブランチ名、タイトル、作者名など）が入っていない | NFR5.2 |
| T4 | 負例 N3 | 接頭語 `ci-` が `sds-gate-` と重ならない。`hygiene.yml` に `concurrency` が無い | NFR5.3 |
| T5 | 負例 N4 | 足した行（`concurrency:` のブロックだけ）に、失敗を隠す記述、`permissions`、`uses:`、`secrets.`、`pull_request_target`、`on:` の項目が入っていない（`ci.yml` 全体の失敗を隠す記述の検査は既存の試験が持つので複製しない） | NFR4.1、NFR5.1、FR10.4 |
| T6 | 負例 N5 | 読めない・解釈できない `ci.yml`（`concurrency:` が無い・2 つ・job の中・group の行が無い・空）は失敗になる | NFR4.4 |
| T7 | 逆向き | `concurrency:` ブロックを取り除いた文字列を読み手が「`concurrency` なし」と判定し、元の行から取り除いた行を引いた結果と一致する | NFR8.2 |
| T8 | 同居（差分） | 変更後の `ci.yml` を最上位のキーごとの節に分け、`concurrency` の節を除いた残り（`on:`・`permissions:`・`jobs:`）が、取り除いた後の節と一致する。構造の知識を試験に書き写さない（既存の BR7.2 が持つ） | NFR8.1、NFR8.3 |

## Red の記録

- Step 3 で 8 件を書いたら、変更前の `ci.yml` に対して `node --test tests/ci-concurrency.test.mjs` を流す。T1〜T4 と T6 の一部（実際の `ci.yml` を読むもの）が失敗することを確かめ、失敗の出力を記録する。T5・T7・T8 は、変更前の `ci.yml` では足したブロックが無いので、読み手が「`concurrency` なし」で失敗するか空の比較で通るかを、書いた時に実測して記録する。T6 の補助関数への入力の試験は、変更前でも通りうる。通る試験があっても、それは Red の失敗には数えず、記録に「変更前から通る」と書く。
- すべて通ってしまった場合は、試験が規則を確かめていないので、書き直す。

## Green・Refactor の記録

- Step 4 の後、`node --test tests/ci-concurrency.test.mjs` と `node --test tests/workflow-contract.test.mjs` が通ることを確かめる。実行数・合格数・失敗数を記録する（実行されなかった・時間切れは成功に数えない）。あわせて、足したブロックを取り除いた結果の SHA-256 が base の `1e3f42c8…` と一致することを 1 回観測して記録する。
- Step 5 の後も同じ command を流して、通る状態が保たれていることを確かめる。

## 網羅率の目標

- この単位は新しい実行用の code を足さない。確認コマンドの網羅率の対象（`scripts/coverage-gate/**`）は 0 件で、空のまま 100% と出て通る。U1 の合否の根拠にしない。保証するのは、既存の試験と、この単位の試験が通ることだけ。
- 観測した値（実行数・合格数・失敗数）は、Build and Test の記録に書く。申告された値は写さない（S5）。

## 模擬と試験データ

- 外の service は使わない。模擬は要らない。
- 試験データは、実際の `ci.yml` と、試験 file の中に書く架空の短い文字列（壊れた workflow の例）だけ。実在の識別子・秘密は使わない。
- 実際の GitHub Actions での評価（式が意図どおりに働くか）は、この PR 自身の CI の実行の記録で確かめる。定義の試験では証明できない。

## 実行しない試験

- 式の評価と取り消しの動作そのものは、この段階では実行できない（PR を出して CI が走るまで観測できない）。Code Generation では「未実行」と記録し、成功とは書かない。PR の CI の記録で Build and Test が確かめる。
