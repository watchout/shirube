# U2 u2-gate-trigger-narrowing — 設計PRの承認の読み戻し

## Scope and Limits

対象は `261110-shared-coverage-gate / u2-gate-trigger-narrowing` の設計記録だけのPR。本書は、AI-DLCの正式な履歴から種類・対象・固定の選択値だけを整理した写しであり、新しい承認の発行者・署名・証明ではない。人の返信本文、席の間の通知、個別環境の情報は写していない。

次の点を混同しない。

- 取り組み全体の段の完了の承認（Ideation・Inception の各段）は、U1 の PR #102 の `construction/u1-ci-concurrency/design-approval-records.md` に読み戻してある。U2 はそれを引き継ぎ、新しい段の完了の承認は発行していない。
- U2 の NFR Requirements・NFR Design・Infrastructure Design・Code Generation（計画まで）は、単位の段として gate を持たない。段の完了の承認を人から得たものとして扱わない。
- 取り組みの設定を決めた承認は、**arc の答え**（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609`）で記録されたもので、Owner 本人の言葉ではない。委任は保護対象（workflow・必須検査・DB構造・資格情報・本番・料金・契約 .v2）と R3・R4 の対象 head への Owner の承認を含まない。U2 の変更は workflow の定義（kit の呼び出し側）で保護対象にあたるため、統合の前に対象 head への Owner の承認が別に要る。
- この取り組みでは見直し役（AI-DLC の reviewer）を使っていない。Owner の決定（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125 、本文 SHA-256 `f538f6a98c0284d0be5d177cc651d3a1cf87aec7b8ac1493ac72eba28e0c7f76`）で、この作業場の見直しの区分は `none`。見直し済みと読まない。
- 計画の承認（Approve Plan）と要約の確認はこの作業で `off` の設定のため、記録は無い。計画は `code-generation/code-generation-plan.md`、試験の手順は `code-generation/unit-test-instructions.md` にある。計画の承認が無いことを、製品の変更を始める許可にしない。

## この単位で arc の答えを受けた点（Owner の言葉ではない）

- 範囲の拡大: `docs/sds/distribution.md` の `issue_comment` の説明（107 行目）を caller の変更に合わせて直すため、単位の境界を 1 file 広げてよい。設計と実装を黙って食い違わせないため（`authority-and-waiting.md` R3）。実際の編集は設計監査の PASS の後に同じ PR へ足す。設計の記録では SD10。
- `labeled`・`unlabeled` を残す判断で良い。Owner の決定（FR10.2）の括弧書きは、実物（`scripts/sds/gate.mjs` の判定 1 が PR の label を実行のたびに読む）と合わない。起動を減らさない側（緩める側でなく締める側）なので Owner には回さない。設計の記録では SD4 に「決定の括弧書きからの逸脱」として、採らなかった代替（外す。label の付け替えで判定が変わる穴が出る）とともに記す。
- 絞りが FR10.1 より弱い点（編集・削除は常に流す。計画のコメントの印を足す。作者の受領は印を持たず絞りの対象にできない）、設計の承認コメント（印なし）の扱い、skip された job の check run が成功に見えること（利用先の必須の検査は commit status `sds-gate`）の扱いも了解された。skip の件は、この PR の Actions で観測できなかったものとして「観測できなかった」と書き、導入の決定（範囲外）への条件として渡す。

## 文書の検査

U2 の NFR Requirements・NFR Design・Infrastructure Design の各 `traceability.json` は、上流の要件・NFR の全項目に OK を対応付けている。これは文書の対応表であって、製品の試験・実際の CI での動作・統合の合格ではない。未実施: 試験の実行（Red・Green）、`kit/sds-gate-caller.yml` の変更、利用先での `if:` の評価の観測、実装の独立監査、Owner の対象 head の承認、統合。

## 基準の実物との突き合わせ（設計 9）

設計・計画が「現在の file」として書いた事実を、公開 Shirube の clone の `origin/main`（`0f9ea89175ece32604e0dcfde9db28462f0d2f35`）の bytes と機械で突き合わせた。作業場の木と共有の CodeKB は基準に使っていない。

| 事実 | 結果 |
|---|---|
| `kit/sds-gate-caller.yml` の SHA-256 `e6eaa2eb0745f63a64e11b7497bc772a0e842c93deaca34a06765a4bd7a6ff5f`、24 行 | 成り立つ |
| `.github/workflows/sds-gate.yml` の SHA-256 `ac38c62e7f04ca55b8532877c66fa0dcc85452241fd011a192eef9d3f57e812c`、group `sds-gate-<repo>-<pr>` と `cancel-in-progress: true` | 成り立つ |
| `scripts/sds/gate.mjs` の SHA-256 `b4f529aeb40270382b44a5a2754d2651b47c1e5414a683016bd34c3a5b1f5aa1`、156 行、判定 1 が 54 行目で `p.labels` から `risk:R0〜R4` を取る | 成り立つ |
| `scripts/hygiene/audit-admission.mjs` が 40 行目と 165 行目で `sds-audit-request/1`・`sds-audit-review/1` を検査、SHA-256 `0fdf596fb024b335c1cc6eb5b0d68ebbe1e16da410c94fc74f79a5985e83c38d` | 成り立つ |
| `scripts/sds/plan-binding.mjs` の 104 行目が `shirube-v3:control-handoff` の印を要求 | 成り立つ |
| `tests/sds-gate.test.mjs` が 300 行ちょうど、caller を読む既存の試験が 130〜133 行目の 1 件 | 成り立つ |
| `docs/sds/distribution.md` の 107 行目が `issue_comment` の動きを説明 | 成り立つ |
| 計画の Sources が「`kit/sds-gate-caller.yml` は 22 行」と書いていた | **成り立たなかった**（実物は 24 行）。計画を 24 行に直した |

## 公開の範囲

- 含めた記録: U2 の NFR・配置の設計、コード生成の計画と試験の手順、設計監査の項目集合（`docs/audit/u2-gate-trigger-narrowing-design.json`）、この読み戻し。あわせて U1 の読み戻しの 1 か所を訂正した（下）。
- 除外した記録: AI-DLC の `audit/` と `.aidlc-engine/`、段ごとの日記（`memory.md`）、state・cursor・runtime graph。code（`kit/` と `tests/`）は含めない。設計監査の PASS の後に同じ PR へ足す。
- 共有の memory・CodeKB は、この PR の差分に入れない。

## U1 の記録の転記の誤りの訂正

U1 の `design-approval-records.md` は、設計監査 round 2 の非差戻しの観察 O01 の「困る大きさ」を「軽」と転記していた。返却（https://github.com/watchout/shirube/pull/102#issuecomment-6815245330 、本文 SHA-256 `ca56693c46a185b4c25f7fa3aa459d6acca76176fe86a46cf6edcda02c917edb`）の `nonblocking_observations` O01 の `ky` は、起きやすさ「低」、困る大きさ「中」。低 × 中は差し戻す組み合わせでなく、持ち越しの結論は変わらない。U1 の記録の該当の行を直した。
