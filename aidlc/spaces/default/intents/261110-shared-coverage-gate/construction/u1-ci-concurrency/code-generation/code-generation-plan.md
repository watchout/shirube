# U1 u1-ci-concurrency — コード生成の計画

## Summary

- Builds: Shirube 自身の CI に「同じ PR の古い実行を取り消す」規則を足す（`concurrency:` の 2 行）と、その規則を文字列として確かめる定義の試験
- Touches: `.github/workflows/ci.yml`（最上位に `concurrency:` を追加）、新しい試験 file `tests/ci-concurrency.test.mjs`
- Tests: 8 件（正例 1、負例 5、逆向き 1、読めない入力 1 を含む）。`node:test` と `assert`、依存の追加なし

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)（設計 1〜6、SD1〜SD5、試験の表）、[infrastructure-specification.md](../infrastructure-design/infrastructure-specification.md)、[monitoring-design.md](../infrastructure-design/monitoring-design.md)、[cicd-pipeline.md](../infrastructure-design/cicd-pipeline.md)。要件: [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR10.3、FR10.4、FR10.5）、単位: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 試験の置き場: 既存の `tests/workflow-contract.test.mjs` は 135 行で、足すと別の関心が混ざる。`npm test` は `tests/*.test.mjs` を拾うので、新しい file `tests/ci-concurrency.test.mjs`（300 行以内）に分ける（security-design.md の Open Question 1 を、ここで決めた）。

## 進め方の順序（守る物の決まり）

この単位は workflow（保護対象）に触れる。team.md のとおり、次の順に進める。

1. 設計記録だけの PR を出す（`audit/`、`.aidlc-engine/`、`.github/workflows/`、`tests/` は含めない）。独立の設計監査（devauditor）を 1 回出し、PASS を待つ。待つ間も、この計画と試験の手順は書いてよい。
2. 設計監査の PASS の後にだけ、下の手順 3 以降（code）を書く。PASS の前は `ci.yml` も試験 file も作らない。
3. 実装は同じ PR に足し、head の CI が終わってから実装の監査を出す。統合の前に、対象 head への Owner の承認を確認する。

## 手順

- [ ] Step 1: 構成の骨組み。新しい構成・設定・依存は足さない（`package.json` の `test` は `tests/*.test.mjs` を拾うので変更なし）。記録: 足すのは 2 file だけ（`.github/workflows/ci.yml` の変更と、新しい試験 file）。（FR10.3、NFR6.1、NFR9.1）
- [ ] Step 2: 試験の実行環境の確かめ。既存の試験が変更前に通ることを、単位に絞った次の command で確かめ、観測値（実行数・合格数・失敗数）を記録する: `node --test tests/workflow-contract.test.mjs`（詳細は unit-test-instructions.md）。（NFR7.1、NFR8.1）
- [ ] Step 3: 取り消しの規則 — Red。`tests/ci-concurrency.test.mjs` に次の 8 件を書き、変更前の `ci.yml` に対して実行して失敗することを確かめる。失敗の出力を記録する（失敗しなければ試験が働いていないので書き直す）。（FR10.3、FR10.5、NFR4.1〜4.4、NFR5.2、NFR5.3、NFR7.1、NFR8.2）
  - T1 正例: 最上位（`on:` と `jobs:` の間）に `concurrency:` がちょうど 1 つあり、`group` が `ci-` で始まり PR の番号（`github.event.pull_request.number`）から作られ、`cancel-in-progress` が `pull_request` の実行のときだけ真になる式である
  - T2 負例 N1: `cancel-in-progress` の式が `github.event_name == 'pull_request'` と一致し、`push` では偽になる形である（`true` の固定値ではない）
  - T3 負例 N2: group に `github.head_ref`、`github.ref_name`、`github.ref`、`github.actor`、`pull_request.title`、`pull_request.head` を含まない。PR 以外の鍵は `github.run_id` だけ
  - T4 負例 N3: group の接頭語が `ci-` で、`sds-gate.yml` の group（`sds-gate-` で始まる）と重ならない。`hygiene.yml` に `concurrency` が無い
  - T5 負例 N4: `ci.yml` に `continue-on-error`、`|| true`、`--if-present` が無く、`on:` の項目（`pull_request`、`push` の `main`）、job の名前と数（`test`、`hygiene`）、`permissions:` が無いこと、が変更前と同じである
  - T6 負例 N5: 読めない・解釈できない `ci.yml`（`concurrency:` が無い、2 つある、job の中にある、group の行が無い、空の文字列）を与えると、読む部品（試験 file の中の補助関数）が失敗を返す。成功に読み替えない
  - T7 逆向き: 実際の `ci.yml` から `concurrency:` のブロックを取り除いた文字列に、既存の構造の検査（T5 の変更前と同じ項目）が通る
  - T8 同居: 取り除いた `concurrency:` を除き、`ci.yml` の中身（jobs の本文）が変更前の記録（試験 file に固定した主要な行）と一致する
- [ ] Step 4: 取り消しの規則 — Green。`.github/workflows/ci.yml` の最上位（`on:` と `jobs:` の間）に、設計 1 の `concurrency:`（`group` と `cancel-in-progress` の 2 行）だけを足す。ほかの行は変えない。8 件が通ることと、既存の試験が変更前のまま通ることを確かめ、観測値を記録する。式の字句が意図どおりに評価されるかは、この PR 自身の CI の実行の記録で確かめる（Step 7）。評価されない場合は、設計を先に直してから実装する。（FR10.3、NFR3.1、NFR4.2、NFR4.3）
- [ ] Step 5: 取り消しの規則 — Refactor。試験の補助関数の重複を整理し、各 file を 300 行以内に保つ。通る状態を保つ。判定の値（接頭語、禁止する値の一覧）を試験 file の中で 2 か所に書かない（S3）。（NFR9.1）
- [ ] Step 6: 環境・ビルドの設定。変更なし。次を実行して、他の検査が壊れていないことを確かめる: `npm test`（全体。観測値を記録）。hygiene と own-code budget は CI で確かめる。確認コマンド（取り組み全体の網羅率）は、この単位では対象 0 件のため U1 の合否の根拠にしない。（NFR7.2、NFR8.1）
- [ ] Step 7: 文書と追跡。`code-summary.md`、`traceability.json`、`source-manifest.json` を書く。PR を出した後、この PR 自身の Actions の実行の一覧から、古い head の実行が取り消され、最新の head の実行が最後まで流れたこと、`main` の push の実行に取り消しが無いこと（統合の後）を読み、観測として Build and Test の記録に書く。観測できなかった場合は「観測できなかった」と書き、成功とは書かない。（NFR4.4、NFR7.3、NFR10.1）

## 試験の方針（標準の方針に対する適用）

- 部品は 1 つ（既存の ShirubeCi の変更）。標準の方針（部品あたり 5〜8 件）に対し 8 件。
- 統合の試験: 実際の `ci.yml` を読む試験（T1〜T5、T7、T8）が、境界（ファイル → 規則）の統合にあたる。T6 は読めない入力の境界。
- 行の網羅率の床 100%: この単位は新しい実行用の code を足さない（workflow の宣言と、試験 file の補助関数のみ）。確認コマンドの網羅率の対象 `scripts/coverage-gate/**` は 0 件なので、空のまま 100% と出て通る。これを U1 の合否の根拠にしない。保証するのは、既存の 14 本の試験と、この単位の試験が通ることだけ（施行する側は U3）。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。",
  "scope": "feature",
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
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
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
  "input_sha256": "sha256:6cba1c86da366533d3b62b88bdde582813aa3a9e2d5f928977390f00a5fb33d7",
  "contract_sha256": "sha256:58999c825ae25c8a2753c7d2d89bd127f82fe3e2bc5abdffa9801ed0918b42e4"
}
```

## 適用しない層（plan_profile に対する調整）

データモデル / DB、リポジトリ、API / endpoint、フロントエンドの各層は、この単位に無い（workflow の宣言だけを変える）。方法（TDD）は変えず、「ビジネスロジック」の層を「取り消しの規則」に読み替えて Red → Green → Refactor を行う。

## Assumptions & Open Questions

### Assumptions

- [assumption] 式の字句（`format`、`&&`、`||` の組み合わせ）が GitHub Actions で意図どおりに評価されることは、定義の試験（文字列）では証明できない。この PR 自身の CI の実行の記録で確かめる（Step 7）。
- [assumption] 試験 file は 300 行以内に収まる。超えそうなら分ける（NFR9.1）。

### Open Questions

1. 設計監査の PASS の前に code を書かない決まりのため、Step 3 以降は設計監査の返却の後に始める。返却が BLOCK なら、設計を先に直してから計画を直す。
