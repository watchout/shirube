**Collaborator:** aidlc-developer-agent

# コード生成の計画（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file（`scripts/hygiene/audit-admission.mjs`）。
> 守る物（R3）。コードは **設計監査の PASS の後**にだけ書く（社内の決まり版 5）。それまでは、設計記録だけの PR を出して設計監査を受け、その間にこの計画と試験の手順の承認を受ける。

## Summary

- Builds: 受付の `checkoutProof` が「宣言された追加の checkout」（対象ごとの任意の欄 `extra_checkouts`）を受け入れる判定と、その文書（audit-method §2・sds-audit SKILL §2）、負例の試験、行の網羅率の実測の記録を作る
- Touches: `scripts/hygiene/audit-admission.mjs`（足す・変える）、`docs/sds/audit-method.md`、`kit/skills/sds-audit/SKILL.md`、新しい `tests/audit-intake-extra*.test.mjs` と補助 file（新しい `scripts/` の file・workflow・package・profile は触らない）
- Tests: 新しい試験 4 file（宣言の検査・job の分類・実在の確認・受理の出力・総予算・決定性・文書の揃い・網羅率の記録）。既存の試験 2 本は変えず緑のまま

## 上流と範囲

- 上流: `inception/requirements-analysis/requirements.md`（FR1.1〜FR4.4、NFR1〜NFR9）、`construction/functional-design/{functional-spec,rules,entities}.md`（D1〜D7、BR1.1〜BR4.2）、`construction/nfr-requirements/*`（NFR 詳細 44 項目、TD-1〜TD-7）。
- 単位の一覧は無い（refactor の scope）。単位は取り組みの全体 1 つ、components は今ある 1 file。
- 守る物: 受付の判定は監査の入口の決定（R3）。統合の前に、対象 head への Owner の exact-head が要る（arc 経由）。workflow・必須検査・package・profile は変えない（NFR9）。
- 判定の全部は `audit-admission.mjs` の 1 file に収める（依頼の `verifier_sha256` がこの 1 file の bytes に結ばれるため。TD-2）。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。",
  "scope": "refactor",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: 既存 `memory/team.md` で Q3 の採択として記録された TDD を維持する。`pr34-u2-red.json` / `pr34-u2-green.json` は当時の方法を示す根拠であり、新しい変更の試験合格を示す証拠にはしない（P7 の規格維持、既存 team）。\n- **Ordering**: 各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。\n- 試験の道具は Node 組込みの `node:test` と `assert`。判定には正例・負例を用意し、対象違い、古い記録、欠落、改変、実行不能、再実行、人待ちの停止などを、適用される要件に対応付ける。\n- 行の網羅率の床は100%。統合前の CI と Build and Test で確認し、通すために弱めない。計測から除外する行が必要なら PR に理由を書き独立監査で確認する。対象集合・分母と実行コマンドは各取り組みで特定し、部分集合だけで製品全体を測れたとしない（P4）。\n- 行の網羅率の結果は、CI の成否だけで済ませず、観測した値を機械が読める形で記録し、門・監査がそれを根拠にする。未計測・実行されていない・計測不能は成功に数えない。申告された値は証拠にしない（社内標準 S5・S8。arc の答え、Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 による。Owner の言葉ではない）。記録の形・置き場・門や監査への結び付けは、この取り組みの要件と設計で定める。\n- 適用される SEC-T、依存導入前の脆弱性確認、秘密情報保護、最小権限を維持する（P1・P2・P7）。公開 repo の fixture・ログ・出力は架空データだけにする。\n- 必須工程や適用条件を満たす検証について、skip、timeout、観測不能や単なる exit0 を合格に数えない。任意工程と正式に適用外となった工程はその理由と適用条件を明示し、必須工程の未実行と混同しない。設定値や試験ファイルの存在を実測結果の代わりにしない。"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:580cd3128a8be03bebe8ef1d8bcb327c530d48983bc82261e964f1de4628376b",
  "contract_sha256": "sha256:807eb3fa324ac5968591539f1029a4591511a0e6d5a569cad073a647b55a4d47"
}
```

適用外の層（理由つき）: データの構造・DB（表・migration を持たない。db-standard の対象外）、repository・データ取得の層（受付は GitHub を読む `api` の差し込みだけで、保存を持たない）、画面（無い）。この 3 層の Red・Green・Refactor は置かない。

## 守る順序（コードを書く前の関門）

- 手順 1・2 は **コードを含まない**。設計記録だけの PR を出し、設計監査の PASS を受領するまで、手順 3 以降（`scripts/`・`tests/`・`docs/`・`kit/` の変更）に入らない。
- 設計監査の返却を待つ間も、この計画と試験の手順は書いて承認を受けてよい（承認を受けても、コードは書かない）。

## 手順

- [x] **Step 1: 設計記録だけの PR（コード無し）** — `adf-lead/audit-intake-extra-design-20261115` の branch（base = 公開 main `1dd43e457361d9650153578baa71120788285e98`）に、`aidlc/spaces/default/intents/261113-audit-intake-extra/` の inception と construction（functional-design・nfr-requirements）の成果物と質問の記録だけを入れる（`audit/`・`.aidlc-engine/`・作業の日記 `memory.md`・state は入れない）。PR 本文に `json sds-pr` を 1 つ、label `risk:R3` を 1 つ。事前の確かめとして `aidlc-devsecops-agent`（KY の先回り。読むだけ）と `aidlc-architecture-reviewer-agent`（監査項目の文と設計の行の突き合わせ。読むだけ）を呼び、指摘を直し、PR 本文に 1 行（役の名前・指摘の件数・直した事）を書く（段の見直しとは言わない）。対象 head の CI（`ci.yml` 全部）の成功を待ち、`docs/audit/*.json` の項目の集合を含め、`sds-audit-request/1` を作者が投稿する（reviewer = `devauditor`、設計監査は固定）。前検査 `--preflight` で `READY_FOR_REVIEW` を確かめて arc へ URL を 1 行で渡す。
  - 対応: 社内の決まり（設計がずれていないかの確かめ）、NFR9.1〜9.3、NFR8.1。
- [x] **Step 2: 設計監査の PASS を受領する** — 返却の URL と本文 SHA-256 を記録し、`--review` で `RECEIPT_ACCEPTED` を確かめる。BLOCK なら、KY の表で直す指摘を直して、同じ手順で出し直す（監査の返却の前に push しない）。PASS までコードに入らない。
- [x] **Step 3: 試験の道具の確認（runner readiness）** — 実装の作業用の branch を、設計の PR の branch から（PASS の head の上に）切る。`npm ci` の後、既存の試験が緑であることを確かめる: `node --test tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs`。実行した出力（件数・失敗 0）を `code-summary.md` に書く。依存が無い環境の成功は数えない（NFR3.7、学び c2）。
  - 対応: FR4.1、NFR3.7。
- [x] **Step 4: 試験の補助（path ごとの応答）** — `tests/audit-intake-extra-fixtures.mjs` に、repo と commit の path ごとに別の応答を返す `api` の差し込みと、宣言付きの依頼・job の記録を作る小さな補助を置く（`.test.mjs` ではない補助 file。既存の fixture は変更しない）。
  - 対応: FR4.3、FR4.4、TD-6。
- [x] **Step 5: 業務の判定 — Red（宣言の読み取り）** — `tests/audit-intake-extra.test.mjs` に、BR1.1〜BR1.8 の試験を先に書く: 欄なし・空の配列 = 今と同じ、配列でない・要素が組でない・キーの過不足、commit の書式（短縮・大文字・40 桁以外）、repo の書式（`..`・`.`・余りの区切り・空）、重複（repo が違っても）、5 件目、PR 自身の repo（大文字小文字違い）、必須の検査が空、**不正のとき GitHub への問い合わせが 0 回**、ある対象の宣言が別の対象に効かないこと。実行して **失敗する**ことを確かめ、失敗の出力を記録する。
  - 対応: FR1.1〜FR1.6、NFR1、BR1.1〜BR1.8。
- [x] **Step 6: 業務の判定 — Green（宣言の読み取り）** — `audit-admission.mjs` の先頭に定数（欄の名前・上限・拒否の理由の文）の 1 か所を置き、宣言の形の検査・対象ごとの検査の小さな関数（入力だけの関数）を足し、`requestChecks` から問い合わせより前に呼ぶ。Step 5 の試験を通す最小の変更だけ。
  - 対応: BR1.1〜BR1.8、BR3.6、NFR7.1、TD-2〜TD-4。
- [x] **Step 7: 業務の判定 — Red（job の分類・宣言の確認・実在）** — 同じ試験 file（300 行を超えるなら `tests/audit-intake-extra-proof.test.mjs` に分ける）に BR2.1〜BR3.6 の試験を先に書く: 宣言なしは今と同じ理由、宣言あり — 候補 0 件／2 件以上／1 件、両親が base と head でない、全桁一致のみ（短縮・前方一致・大文字を一致にしない）、job の名前・step の順序を読まない、宣言が job の記録に出ない（全 job に出ない）、一部の job だけに出れば通る（Q1 = B）、実在の確認（1 件 1 回・sha 全桁一致・404・期限切れ・形が違う・別 repo の commit は拒否・再試行しない）、受理の出力のキーが宣言なしと同じ、宣言の値が出力に出ない、拒否の理由が固定の文、総予算（受付 4 × 対象の数、返却の確認 8 × 対象の数）。実行して失敗を記録する。
  - 対応: FR2.1〜FR2.11、NFR1・NFR5・NFR6・NFR8、BR2.1〜BR3.6。
- [x] **Step 8: 業務の判定 — Green（job の分類・宣言の確認・実在）** — 候補の分類・対象ごとの確認の小さな関数を足し、`checkoutProof` に宣言を持つ対象の経路を足す（宣言なしの経路は今のまま）。関数 50 行以下・複雑さ 10 以下・file 300 行以下を守る。`api` は引数で受け、時刻・乱数・識別子を取らない。
  - 対応: BR2.1〜BR3.6、NFR4.1、NFR6.1・NFR6.2、TD-3・TD-7。
- [x] **Step 9: 業務の判定 — Refactor** — 試験が緑のまま、重複と長い関数を整える。`npm run lint:structural`・`npm run lint:guard`・`wc -l` を実行して記録する。
  - 対応: NFR4.1〜NFR4.3。
- [x] **Step 10: 入口（endpoint）— Red/Green（統合の経路）** — `verifyAudit` 全体を通す試験を先に書いて失敗を確かめ、通す: 受付の経路（宣言付きの依頼で `READY_FOR_REVIEW` 相当の受理）、返却の確認の経路（対象を再観測する 2 回、受理と、宣言を壊した返却の拒否）、既存の fixture の試験が変わらず通ること（後方互換）。命令行の入口の 3 行は既存の通らない範囲 R2 として計測から除く（学び c3）。
  - 対応: FR1.3、FR4.2、FR4.4、NFR2.1〜NFR2.3、NFR5.1〜NFR5.8（受理の出力が不変であることを含む）。
- [x] **Step 11: 文書 — Red/Green（3 か所の揃い）** — `tests/audit-intake-extra-docs.test.mjs` に、実装の定数を読み、`docs/sds/audit-method.md` と `kit/skills/sds-audit/SKILL.md` §2 に同じ欄の名前・同じ上限・規則の要点・「保証しないこと」・「schema の版は /1 のまま」が書かれていることを確かめる試験を先に書き、失敗を確かめる。そのあと 2 つの文書に段落と依頼の形の文を足して通す。食い違えた文書の fixture で試験が失敗する負例を置く。
  - 対応: FR3.1〜FR3.3、NFR7.1〜NFR7.3、BR4.1・BR4.2。
- [x] **Step 12: 行の網羅率の記録 — Red/Green** — まず `node --test --experimental-test-coverage --test-coverage-include='scripts/hygiene/audit-admission.mjs' --test-reporter=lcov`（Node 24 と CI の Node の両方）の出力の形を確かめ、記録する。`tests/audit-intake-extra-coverage.test.mjs` に、(a) 判定の関数（子の process の出力の文字列を入力に、通らない行の集合 ⊆ R1 ∪ R2、R1・R2 の SHA-256 の照合、未計測・対象 0 行・子の失敗・形が取れない版は失敗）の負例を文字列の fixture で先に書き失敗を確かめ、(b) 実際に子の process を流す試験を足して通す。子の process は既存の 2 本と、この取り組みの新しい試験（この試験自身は含めない）だけを対象に流す。
  - 対応: NFR3.1〜NFR3.8、NFR8.2、TD-5。
- [x] **Step 13: 環境・構成の確認** — `package.json`・lockfile・`.github/`・`.shirube/`・`configs/`・既存の試験 2 本が差分に無いこと、新しい `scripts/` の file が無いこと、`audit-admission.mjs` の `import` が Node 組込みと `./lib.mjs` だけであることを、差分で確かめて記録する。既存の技術検査（`hygiene:lines`・`hygiene:ratchet`・`hygiene:jscpd`・`hygiene:coverage`）を流して結果を記録する。閾値・上限は変えない。
  - 対応: NFR4.2・NFR4.3、NFR9.1〜NFR9.3、FR4.2。
- [x] **Step 14: 記録（documentation and traceability）** — `code-summary.md`（作った file・実行した命令と出力・実測の網羅率・通らない行・未実行の試験と理由）と `traceability.json`（FR・NFR・BR を、実装か試験の file に結ぶ）を作る。
- [ ] **Step 15: 実装の PR（同じ PR に足す）** — 実装を同じ PR の branch に足す。事前の確かめとして `aidlc-devsecops-agent`・`aidlc-architecture-reviewer-agent`・`aidlc-quality-agent`（足りない負例の点検。読むだけ）を呼び、指摘を直し、PR 本文に 1 行（役の名前・件数・直した事）。対象 head の CI の成功を待ち、監査依頼（reviewer は依頼の時に空いている席。事前の点検表 5 点を本文に 1 行ずつ）を投稿して前検査を通し、返却と作者の受領を記録する。R3 の統合の前に、対象 head への Owner の exact-head を arc 経由で確かめ、作者以外の席（suite-lead）が統合する。

## 追跡（要件・規則と手順）

| 上流の ID | 手順 |
|---|---|
| FR1.1〜FR1.6、BR1.1〜BR1.8 | Step 5・6 |
| FR2.1〜FR2.11、BR2.1〜BR3.6 | Step 7・8 |
| FR3.1〜FR3.3、BR4.1・BR4.2 | Step 11 |
| FR4.1〜FR4.4 | Step 3・4・10・13 |
| NFR1・NFR5・NFR6・NFR8 | Step 5〜8・10 |
| NFR2（後方互換・revert） | Step 10・13 |
| NFR3（行の網羅率） | Step 12・14 |
| NFR4・NFR7・NFR9 | Step 9・11・13・15 |

詳しい対応は `traceability.json`（Step 14 で作る）に書く。

## 戻し方と同居（S6）

- schema の版は `/1` のまま。宣言の欄を知らない古い受付は、欄を無視して統合の版が 2 つ以上と見て拒否する（失敗側）。revert は、この PR の revert 1 回で今の判定に戻る。
- 戻したあとの確かめ: 既存の試験 2 本が変わらず通ること。
