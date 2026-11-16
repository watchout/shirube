# Code Generation Plan Approval

AI-DLC built this plan without asking because plan approval is off for this
piece of work. This file is the record and asks nothing; to look at a plan
before it is built, ask in chat.

## Plan Approval

Built without asking: plan approval is off for this piece of work (set by you).

- Builds: 共有の網羅率の門に「除外」（`exclusions: [{path, reason}]`）を足す。path は解決した分母の file と文字列で完全一致しなければ失敗（TARGET_UNRESOLVED）、全部除外は失敗（TARGET_EMPTY）、理由は U4 の根拠と同じ 1 行の規則、同じ path の重複は失敗。除外は分母のソースだけを外し、必須の試験・NOT_RU...
- Touches: 新しい `scripts/coverage-gate/exclusions.mjs`・`report-exclusions.mjs`（2 file）と、既存の `threshold.mjs`（理由の規則を field の名前を受ける形で export）・`input.mjs`・`resolve.mjs`・`report.mjs`（必要なら `cli.mjs` の配線だけ）。...
- Tests: 部品ごとに 5〜12 件（標準の方針）、合計およそ 55 件。`node:test` と `node:assert/strict`、依存の追加なし。純粋な核は単体、入口は一時の小さな git repo を使う結合。行の網羅率の床は 100%（足す・触る file すべて。門自身を門で測った観測値を機械が読める形で残す）。

Full plan: aidlc/spaces/default/intents/261110-shared-coverage-gate/construction/u5-exclusions/code-generation/code-generation-plan.md
Test instructions: aidlc/spaces/default/intents/261110-shared-coverage-gate/construction/u5-exclusions/code-generation/unit-test-instructions.md

[Approval Fingerprint]: sha256:v3:30b0b41867ef34aa01fb2393c1efd908073b79b4b63940d10234b80867d8a102
[Planned Source]: 9e7d28d982a1e4dc1d7aa34449c38d97ae32d6bee2442cd70e037dd114f64bc4


[Answer]: Plan approval off
