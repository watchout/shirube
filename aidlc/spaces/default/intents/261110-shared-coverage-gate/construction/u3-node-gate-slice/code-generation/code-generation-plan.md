# U3 u3-node-gate-slice — コード生成の計画

## Summary

- Builds: 共有の網羅率の門の最初の本体。Node 組込みの試験と組込みの網羅率だけで、分母の宣言 → 測定 → 判定（一致 / 不一致 / 観測できず）→ 出力（結果の JSON、job summary、notice、出力値、終了コード）が、1 つの command として端から端まで動く最小の版（`node scripts/coverage-gate/cli.mjs --input <path> --result <path>`）
- Touches: 新しい `scripts/coverage-gate/` の 13 file（order, judge, input, resolve, lcov, events, events-reporter, runner, measure-node, report, sanitize, emit, cli）と、新しい試験 `tests/coverage-gate-*.test.mjs`・補助 `tests/coverage-gate-fixtures.mjs`。追加のみ。既存の `scripts/hygiene`・`scripts/sds`・`.github/workflows`・`kit`・`package.json`・各種の設定は変えない
- Tests: 部品ごとに 5〜8 件（標準の方針）、合計およそ 90 件。`node:test` と `node:assert/strict`、依存の追加なし。純粋な核は単体、adapter と入口は一時の小さな git repo を使う結合の試験。行の網羅率の床は 100%（門自身を門で測った観測値を機械が読める形で残す）
- 基準: 実装は、公開 Shirube の clone の `origin/main`（記録した時点で `0f9ea89175ece32604e0dcfde9db28462f0d2f35`）の実物から作る。作業場の木は古いので現状の根拠に使わない（U1 の設計監査 F01 の教訓）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR1.1〜BR5.5）、[entities.md](../functional-design/entities.md)（理由コード 20 個、結果の文書の項目の順）。
- 非機能の設計: [logical-components.md](../nfr-design/logical-components.md)（13 file、依存の向き、LC5 の試験の置き場）、[performance-design.md](../nfr-design/performance-design.md)（PF1〜PF4）、[security-design.md](../nfr-design/security-design.md)（SC1〜SC8）、[scalability-design.md](../nfr-design/scalability-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)（RL1〜RL8）、[observability-design.md](../nfr-design/observability-design.md)（OB1〜OB6）。
- 基盤: [infrastructure-specification.md](../infrastructure-design/infrastructure-specification.md)、[monitoring-design.md](../infrastructure-design/monitoring-design.md)、[cicd-pipeline.md](../infrastructure-design/cicd-pipeline.md)。
- 要件・単位・契約: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)（U3）、[contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 基準の実物（記録済みの事実）: `package.json` blob `4b23a0a0e8feb4f666f0a7eb3109d68f1430b907`（SHA-256 `ed2e11f383a1714ebdd973b009f5516836b75832ed4bae6c12c69daf545205ee`）、`.github/workflows/ci.yml` blob `6ee7b6c3f078285bfd1c65812c1a42b4aabd6310`（SHA-256 `d116d938fdc01ea546dc9276929eefb06757135aa279269022a7333351b8789f`）、`scripts/hygiene/lib.mjs` blob `90195d5ec2510c32ba726c9c831a0c84a3849fa9`（SHA-256 `294ca623c2a002aafe1940544ec178b27f07085528e6192b14c1edf2a51117c4`）。`npm test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs`（新しい file を自動で拾う）。

## 進め方の順序（守る物の決まり）

この単位は、入力・結果の JSON の版 1（契約）と、子の環境の除去・出力の無害化・書く場所の限定（セキュリティの設計 SC1〜SC8）を持つ。team.md の「DB の構造・権限・契約・セキュリティに触れる単位」に当たる見込みなので、次の順に進める。**扱いの確定（設計の PR を先に出すか、リスクの区分）は arc に確かめる**（Open Question 1）。確定するまで `aidlc engine orchestrate next` を流さない（計画の承認が off なので、流すと build に進むため）。

1. 設計記録だけの PR を出す（`construction/u3-node-gate-slice/` の設計・計画・試験・追跡表と、最初の単位ではないので `inception/` は含めない。`audit/`・`.aidlc-engine/`・code は含めない）。独立の設計監査を 1 回出し、PASS を待つ。待つ間も、この計画と試験の手順は書いてよい。
2. 設計監査の PASS の後にだけ、下の Step 2 以降（code）を書く。PASS の前は `scripts/coverage-gate/` も `tests/` も作らない。
3. 実装は同じ PR に足し、head の CI が終わってから実装の監査を出す。リスクの区分に R3 以上が決まれば、統合の前に対象 head への Owner の承認を確認する。

## 手順

作業木は clone の worktree（`~/Developer/.worktrees/` の下。作業場の木ではない）に、PR の branch から作る。部品は依存の向きの下（葉）から上へ作る。各部品は Red（失敗する試験を書いて失敗を確かめる）→ Green（通す最小の実装）→ Refactor の順で、Red と Green は別々の commit にする。

- [ ] Step 1: 構成の骨組み。`scripts/coverage-gate/` と `tests/coverage-gate-fixtures.mjs`（試験として走らない名前）を作る。新しい依存・設定は足さない。（NFR6.1、NFR6.2、NFR9.1、NFR3.3）
- [ ] Step 2: 試験の実行環境と基準の確かめ。次の 4 つを観測して記録する: (a) worktree の `package.json`・`ci.yml`・`scripts/hygiene/lib.mjs` の SHA-256 が上の値と一致する、(b) `lib.mjs` の `resolveTargets`・`trackedFiles` の署名と、宣言の書き方（ファイル名・ディレクトリ・ワイルドカードを解決するか）を実物で読み、入力の `denominator.targets`・`testTargets` の宣言の例を決める、(c) 既存の dependency-cruiser・knip・jscpd・ESLint・OWN-01 の設定を読み、新しい file に当たる条件を記録する、(d) 既存の試験が変更前に通ることを単位に絞った command で確かめる（`node --test tests/hygiene-lib.test.mjs` など。詳細は unit-test-instructions.md）。一致しない・成り立たない時は、書かずに設計の記録を直す（authority-and-waiting R3）。（NFR3.3、NFR7.1、NFR8.1）
- [ ] Step 3: 葉の核 — `order.mjs`、`sanitize.mjs`、`lcov.mjs`、`events.mjs`。Red: `tests/coverage-gate-order.test.mjs`、`-sanitize`、`-lcov`、`-events` を書き、実装が無い状態で失敗する出力を記録する。Green: 4 file を実装して通す。Refactor: 重複を整理し、各 file を 300 行以内に保つ。内容: code-point 順（UTF-16 順との違いを確かめる）、行を壊す文字の無害化（notice の `%`・CR・LF、summary のバッククォート）、lcov の変換（先頭 `./` の除去、cwd の外の無視、重複 `(path, line)` と LF/LH の不一致は壊れた記録、DA が 0 件は no_records）、試験の数え上げ（skip・todo・passed・failed、file の読み込みの失敗、suite の除外、`ran` の定義）。（BR2.4、BR2.5、BR2.6、BR4.7、NFR2.5、NFR4.8、NFR5.4、PF2）
- [ ] Step 4: 判定の核 — `judge.mjs`。Red → Green → Refactor。内容: 記録からの再計算（切り捨て 2 桁の割合、整数の比較）、未計測・NOT_RUN・閾値未満の理由コードと順、行 0 件は観測できず、測定の原因から理由コードへの写像、`shouldFail`、同じ入力で同じ出力、核に `Date`・乱数・UUID・`process.env`・`fs` が現れないこと。（BR3.1〜BR3.8、NFR2.1、NFR2.2、NFR4.2、NFR4.7、S4、S5）
- [ ] Step 5: 入力 — `input.mjs`（検査）と `resolve.mjs`（解決）。Red → Green → Refactor。内容: 読めない・版が違う・未知のキー（threshold・mode・exclusions・measurement を含む）・`shape` の欠落と未対応・`denominator.targets` の欠落と不正・期限と総予算の既定と不正を、理由コードと field つきで失敗にする。解決は既存の HygieneLib を呼ぶだけで、解決できない宣言と空の集合は失敗にし、重複を 1 件にして code-point 順にする。必須の試験は `testTargets` の下の追跡された file のうち試験 file の名前の型に合う物すべて。（BR1.1〜BR1.8、NFR3.3、NFR4.1、AC1.4.1〜AC1.4.3、AC2.1.5）
- [ ] Step 6: 測定 — `events-reporter.mjs`、`runner.mjs`、`measure-node.mjs`。Red → Green → Refactor。内容: Node の major が保証の版（22）未満なら試験を走らせず観測できず（CHILD_PROCESS_NOT_COUNTABLE）、子の環境から 4 つの名前を除く、`./` で始まる引数、shell を使わない起動、期限と総予算の小さい方で process group ごと止める（孫を残さない）、5 秒の猶予、一時 directory を成功でも失敗でも消す、子の終わり方の分類（起動失敗・signal・終了コードと出来事・記録の有無）、観測だけで `measuredPaths`・`testFilesRun` を作ること、再試行しないこと。孫を起こして眠る架空の試験 file で停止を確かめる（Linux。確かめられなければ設計に戻す）。（BR2.1〜BR2.3、BR2.7、BR2.8、NFR1.7、NFR4.3、NFR5.1、NFR5.3、NFR5.6、RL2、SC1、SC3、SC6）
- [ ] Step 7: 出力 — `report.mjs`。Red → Green → Refactor。内容: 結果の文書（版 1、項目の順・書式・改行）、観測できない値は null、入力の失敗の文書、`lineRatioPercent` の書式、job summary の見出しと名前つきの一覧の上限、notice と出力値が同じ 1 つの文書から作られること、自由な文字列を載せない出力値。（BR4.1〜BR4.6、NFR2.2、NFR10.2、NFR10.3、OB1〜OB4）
- [ ] Step 8: 入口 — `emit.mjs`、`cli.mjs`（行数の見込みで 1 file にまとめるかをここで決める。Open Question 2）。Red → Green → Refactor。内容: 引数は `--input` と `--result` を 1 回ずつ、`--result` が `--input` と同じか追跡された file なら失敗（SC4）、始めに古い結果を消す、結果は一時の file に書いて名前を替える、`GITHUB_RUN_ID`・`GITHUB_RUN_ATTEMPT` の検査、`GITHUB_STEP_SUMMARY`・`GITHUB_OUTPUT` は設定されていれば書く、終了コード 0 / 1 / 2、予期しない例外は 2。一時の小さな git repo（架空の名前と値）を作る結合の試験で、入力の失敗・測定の失敗・試験の失敗・未計測・NOT_RUN・閾値未満・一致の各経路を入口から確かめる。（BR5.1〜BR5.5、BR4.6、NFR4.4、NFR4.5、NFR4.6、NFR5.2、NFR5.5、NFR5.7、RL1、RL3〜RL5、SC2、SC4、SC7）
- [ ] Step 9: 構造と自己の網羅率。`tests/coverage-gate-structure.test.mjs` に、(a) 値の literal（区分、理由コード、閾値の既定、入力の既定、除く名前）が持ち主の file にだけ現れること、(b) 純粋な核に時計・乱数・環境・file・子プロセスが現れないこと、(c) 13 file が 300 行以内、(d) 追加した import が Node の組込みと `scripts/hygiene/lib.mjs` だけ、を書く。自己の網羅率（OB5）: 門で `scripts/coverage-gate/**` を測った入力 JSON と結果の JSON を単位の記録に置き（`self-coverage-input.json`、`self-coverage-result.json`）、Node の組込みの lcov を別に計算して値を突き合わせる。100%、2 つの値が一致、対象が 0 件でないことを確かめる。未計測・不一致は成功に数えない。（NFR2.1、NFR3.1、NFR3.2、NFR7.3、NFR7.4、NFR9.1、OB5）
- [ ] Step 10: 全体の確かめ。`npm test`（全体、観測値を記録）、既存の構造の検査（ESLint、dependency-cruiser、knip、jscpd）と OWN-01 を流す。当たった場合は設定を変えず、理由を PR に書く（NFR9.2、NFR9.3）。足した file を除いた木で既存の `npm test` が通り、base の実物と SHA-256 が一致することを 1 回観測する（RL8、NFR8.2）。Node 22・24・26 で lcov の変換が一致することを作った側の実測として記録する（Node 22 以外は保証ではなく観測。NFR1.1、NFR1.2）。
- [ ] Step 11: 文書と追跡。`code-summary.md`、`traceability.json`、`source-manifest.json` を書く。配線された workflow での実行、Node 22 以外での CI は「観測できなかった」と書き、成功とは書かない（NFR10.1、monitoring-design）。workflow の定義の中身の確かめ（AC10.1.3）は U7 に回す（Deferred）。作業場の木が古いので、追跡表の検査が探す試験 file だけを同じ内容で作業場の木に置き、記録に書く（learned Correction）。

## 試験の方針（標準の方針に対する適用）

- 部品ごとの件数: 純粋な核（order, sanitize, lcov, events, judge, input, report）は各 5〜8 件の単体。adapter（resolve, events-reporter, runner, measure-node, emit）は各 5〜8 件で、runner と measure-node と emit は一時 directory・子プロセスを使う結合。入口 cli は結合の試験を 6〜8 件。構造の試験は 4 件。合計およそ 90 件。
- 正例と負例: 設計の各規則（BR）に正例 1 つ以上、負例（対象違い、古い記録、欠落、改変、実行不能、再実行、人待ち不要の停止）を適用される要件に結ぶ。unit-test-instructions.md の表で規則・要件との対応を追う。
- 評価の写しではなく実物を走らせる: runner と入口の試験は、実際に `node --test` を子プロセスで走らせ、架空の小さな git repo の中で組込みの網羅率を得る。Node の版が保証の外の時は、その事実を試験の中で観測として扱い、成功に数えない。
- 置き方: 試験は `tests/coverage-gate-<部品>.test.mjs`（既存の `npm test` が拾う）、補助は `tests/coverage-gate-fixtures.mjs`。skip・todo を置かない。fixture は架空の名前と値だけで、12 文字の英数字を `token` に入れた形を使わない（gitleaks）。
- 行の網羅率の床 100%: 対象は `scripts/coverage-gate/**`（13 file）。Step 9 の自己の網羅率で観測値を残し、対象 0 件・記録なし・不一致を成功に数えない。除外が要る行があれば、PR に理由を書いて独立の監査で確認する。

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

データモデル / DB、リポジトリ（DB への access）、フロントエンドの各層は、この単位に無い（DB の構造は変えない。DB 基準は適用外）。方法（TDD）は変えず、次のように読み替えて Red → Green → Refactor を行う: 「ビジネスロジック」= 判定・入力の検査・変換・整形の純粋な核（Step 3〜5、7）、「リポジトリ / data access」= file・git・子プロセスに触れる adapter（Step 5 の解決、Step 6、Step 8 の書き込み）、「API / endpoint」= command の入口（Step 8）。

## Assumptions & Open Questions

### Assumptions

- [assumption] file の分け方（13 file）は設計の案で、Step 3〜8 の中で行数の見込みを見て統合・分割を決める（300 行以内を守る方向だけに動かす。変える時は logical-components と追跡表を先に直す）。
- [assumption] 子プロセスの停止が孫まで届くこと、lcov の `LF`/`LH` と `DA` の整合、コメントだけの file が未計測に見えること、20 万件の記録を 10 秒以内で処理できることは、Step 3〜9 の実測で確かめる。成り立たなければ、設計の記録を先に直す。
- [assumption] 既存の dependency-cruiser・knip・jscpd・OWN-01 が新しい file に当たるかは Step 2・10 で実測する。当たっても設定は変えない。
- [assumption] 設計の PR を先に出す場合、clone の `origin/main` が進んでいたら、進んだ後の bytes で Step 2 の突き合わせをやり直す。

### Open Questions

1. 設計の PR を先に出すか、リスクの区分を何にするか（R2 か R3 以上か）。この単位は workflow・必須検査・DB・資格情報・本番・料金・契約 `.v2` には触れないが、結果の JSON の版 1（契約）とセキュリティの設計を持つ。arc（arc-73 経由）に、扱いの確認として伺う。保護対象の許可ではない。
2. `emit.mjs` と `cli.mjs` を 1 file にまとめるか。Step 8 で行数を見て決める。
3. 自己の網羅率の置き場（OB5）: 単位の記録に `self-coverage-input.json` と `self-coverage-result.json` を置く案で進める（機械が読める形。突き合わせの結果は Build and Test の記録に書く）。異論があれば arc に伺う。
