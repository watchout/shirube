# Code Generation Plan Approval

AI-DLC built this plan without asking because plan approval is off for this
piece of work. This file is the record and asks nothing; to look at a plan
before it is built, ask in chat.

## Plan Approval

Built without asking: plan approval is off for this piece of work (set by you).

- Builds: 共有の網羅率の門に「除外」（`exclusions: [{path, reason}]`）を足す。path は解決した分母のソースまたは必須の試験の file と文字列で完全一致しなければ失敗（TARGET_UNRESOLVED）、分母または必須の試験が空になる除外は失敗（TARGET_EMPTY）、理由は U4 の根拠と同じ 1 行の規則に加えて決定の URL を 1 つ以上含む（形だけ。U4 と共有の関数）、同じ path の重複は失敗。除外は名指した file だけを種別（source・test・both）に応じて分母または必須の試験の集合から外し、名指さない必須の試験の NOT_RUN・未計測の扱いは変えない。結果の JSON の exclusions の要素に kind を足す（.v1 の内側）。結果の JSON・job summary（最初の行に件数と種別ごとの件数を毎回）・notice・出力値に除外を同じ 1 つの文書から出す。除外を宣言しない入力の出力は U4 とバイトまで一致する。
- Touches: 新しい `scripts/coverage-gate/exclusions.mjs`・`report-exclusions.mjs`（2 file）と、既存の `threshold.mjs`（理由の規則と決定の URL の形の規則を field の名前を受ける形で export）・`input.mjs`・`resolve.mjs`・`report.mjs`（必要なら `cli.mjs` の配線だけ）。`judge.mjs` は変更しない。新しい試験 2 file と既存の試験への足し、置き換えは既存の試験 4 件。`scripts/hygiene`・`scripts/sds`・`.github/workflows`・`kit`・`package.json`・各種の設定は変えない。
- Tests: 部品ごとに 5〜12 件（標準の方針）、合計およそ 58 件。`node:test` と `node:assert/strict`、依存の追加なし。純粋な核は単体、入口は一時の小さな git repo を使う結合。行の網羅率の床は 100%（足す・触る file すべて。門自身を門で測った観測値を機械が読める形で残す）。

Full plan: aidlc/spaces/default/intents/261110-shared-coverage-gate/construction/u5-exclusions/code-generation/code-generation-plan.md
Test instructions: aidlc/spaces/default/intents/261110-shared-coverage-gate/construction/u5-exclusions/code-generation/unit-test-instructions.md

[Approval Fingerprint]: sha256:v3:db793dd902f4e15e8a108d88d389299045cadf0cc1bbb7c8c388c7ca59d771ef
[Planned Source]: 50c36856a16e87eb4806b122edc7ce2b2eb9ecb41994dfb193cc8aa666f35e2f


[Answer]: Plan approval off
