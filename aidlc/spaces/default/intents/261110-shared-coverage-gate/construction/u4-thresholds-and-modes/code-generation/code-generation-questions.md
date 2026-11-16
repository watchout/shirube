# Code Generation Plan Approval

AI-DLC built this plan without asking because plan approval is off for this
piece of work. This file is the record and asks nothing; to look at a plan
before it is built, ask in chat.

## Plan Approval

Built without asking: plan approval is off for this piece of work (set by you).

- Builds: 共有の網羅率の門に「閾値の例外」（決定の URL・下げる値・根拠の 3 つそろいの入力と、その検査）と「動作」（`enforce` / `record-only`）を足す。判定の核が落とすかどうかを 1 か所で決め、結果の JSON・job summary・notice・出力値に例外と動作を同じ 1 つの文書から出す。例外も動作も指定しない入力の出力は U3 とバイトまで一致する。
- Touches: 新しい `scripts/coverage-gate/threshold.mjs`・`report-exception.mjs`（2 file）と、既存の `input.mjs`・`judge.mjs`・`report.mjs`・`cli.mjs`（配線だけ）。新しい試験 2 file（`tests/coverage-gate-threshold.test.mjs`、`te...
- Tests: 部品ごとに 5〜12 件（標準の方針）、合計およそ 60 件。`node:test` と `node:assert/strict`、依存の追加なし。純粋な核は単体、入口は一時の小さな git repo を使う結合。行の網羅率の床は 100%（足す・触る file すべて。門自身を門で測った観測値を機械が読める形で残す）。

Full plan: aidlc/spaces/default/intents/261110-shared-coverage-gate/construction/u4-thresholds-and-modes/code-generation/code-generation-plan.md
Test instructions: aidlc/spaces/default/intents/261110-shared-coverage-gate/construction/u4-thresholds-and-modes/code-generation/unit-test-instructions.md

[Approval Fingerprint]: sha256:v3:82c5c68630b08d6bb2e3af402b868cc75a8ee46c6632c46399218a83850a3044
[Planned Source]: 91cad566411838b7da92bca9ac70d8626e93070a6c92074c552e920ade2d22c7


[Answer]: Plan approval off
