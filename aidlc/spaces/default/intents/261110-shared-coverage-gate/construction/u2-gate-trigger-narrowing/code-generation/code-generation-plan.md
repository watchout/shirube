# U2 u2-gate-trigger-narrowing — コード生成の計画

## Summary

- Builds: kit の門の呼び出し側が `issue_comment` で動く条件を、コメントの作成のうち監査・計画の印を含むものだけに絞る（job `sds-gate` の `if:` に節を足し、冒頭に skip の意味の注記を 2 行足す）と、その規則を文字列で確かめる定義の試験
- Touches: `kit/sds-gate-caller.yml`（`if:` と注記の追加だけ。`on:`・権限・`uses:`・`with:` は変えない）、新しい試験 file `tests/sds-gate-caller-trigger.test.mjs`、`docs/sds/distribution.md` の 107 行目の説明（手順 7。arc の答えで境界を 1 file 広げた）
- Tests: 8 件（T1〜T8。設計の P1・P2・N1〜N7・逆向き・同居を、関心ごとにまとめた）。`node:test` と `assert`、依存の追加なし
- 基準: 実装は、公開 Shirube の clone の `origin/main`（記録した時点で `0f9ea89175ece32604e0dcfde9db28462f0d2f35`）の実物から作る。`kit/sds-gate-caller.yml` の SHA-256 `e6eaa2eb0745f63a64e11b7497bc772a0e842c93deaca34a06765a4bd7a6ff5f`。作業場の木は古いので使わない（U1 の設計監査 F01 の教訓）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)（設計 1〜9、SD1〜SD9、試験の表 P1・P2・N1〜N7）、[infrastructure-specification.md](../infrastructure-design/infrastructure-specification.md)、[monitoring-design.md](../infrastructure-design/monitoring-design.md)、[cicd-pipeline.md](../infrastructure-design/cicd-pipeline.md)。要件: [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR10.1、FR10.2、FR10.4）、単位: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 基準の実物の読み取り（clone の `origin/main` の bytes。この計画を書く時に確かめた事実）:
  - `kit/sds-gate-caller.yml` は 24 行で、`scripts/sds/kit.mjs` の `render` が**固定した commit の bytes**（`git show <commit>:kit/sds-gate-caller.yml`）から利用先の `.github/workflows/sds-gate.yml` を作る。したがって、この単位の変更は、kit の pin を上げる別の決定まで、どの利用先にも届かない（設計 8、NFR8.1 の裏づけ）。
  - `tests/sds-gate.test.mjs` は 300 行ちょうど（NFR9.1 の上限）。caller を読む既存の試験はその 130〜133 行目の 1 件だけ。足すと上限を超えるので、新しい file に分ける（security-design.md の Open Question 1 を、ここで決めた）。
  - `package.json` の `test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs` で、新しい file を自動で拾う。
  - Shirube 自身の門は `.github/workflows/sds-gate-self.yml`（`.shirube/sds-pin.json` が SHA-256 `2a745b08…` で固定）で、この単位は変えない。この PR の Actions では kit の caller は動かない（設計 6）。
  - `scripts/sds/yaml.mjs` の `parseYaml` は Ruby を呼ぶので、試験の読み手には使わない（環境の前提が増える）。caller は既存の試験と同じく文字列として読む（SD6）。

## 進め方の順序（守る物の決まり）

この単位は workflow の定義（保護対象、risk:R3）に触れる。team.md のとおり、次の順に進める。

1. 設計記録だけの PR を出す（`audit/`、`.aidlc-engine/`、`kit/`、`tests/`、`docs/sds/` は含めない）。独立の設計監査（devauditor）を 1 回出し、PASS を待つ。待つ間も、この計画と試験の手順は書いてよい。
2. 設計監査の PASS の後にだけ、下の手順 3 以降（code）を書く。PASS の前は `kit/sds-gate-caller.yml` も試験 file も変えない。
3. 実装は同じ PR に足し、head の CI が終わってから実装の監査を出す。統合の前に、対象 head への Owner の承認（R3）を確認する。

## 手順

- [ ] Step 1: 構成の骨組み。新しい構成・設定・依存は足さない（`package.json` は変更なし）。足すのは 2 file（`kit/sds-gate-caller.yml` の変更と、新しい試験 file）と、手順 7 で arc の答えを受けた時の `docs/sds/distribution.md`。（FR10.1、NFR6.1、NFR9.1）
- [ ] Step 2: 試験の実行環境の確かめ。実装の作業木は clone の worktree（`~/Developer/.worktrees/` の下。作業場の木ではない）に、PR の branch から作る。最初に次の 3 つを観測して記録する: (a) その木の `kit/sds-gate-caller.yml` の SHA-256 が `e6eaa2eb…` と一致する、(b) 設計が「現在の file」として書いた事実（`on:` の types、`if:` の形、権限 6 つ、`with.pr`、再利用 workflow の group と `cancel-in-progress`、`gate.mjs` の判定 1 が `p.labels` から `risk:` を取る行、`audit-admission.mjs` と `design-gate.mjs` と `plan-binding.mjs` の印の行）を、`origin/main` の bytes と機械で突き合わせて全件が成り立つ、(c) `origin/main` が進んでいれば、進んだ後の bytes で (a)(b) をやり直す。一致しない・成り立たない時は、書かずに設計の記録を直す（設計 9）。続けて、既存の試験が変更前に通ることを単位に絞った command で確かめ、実行数・合格数・失敗数を記録する: `node --test tests/sds-gate.test.mjs`（詳細は unit-test-instructions.md）。（NFR7.1、NFR8.2）
- [ ] Step 3: 絞りの規則 — Red。`tests/sds-gate-caller-trigger.test.mjs` に次の 8 件を書き、変更前の caller に対して実行して失敗することを確かめる。失敗の出力を記録する（失敗しなければ試験が働いていないので書き直す）。（FR10.1、FR10.2、NFR3.1、NFR4.1〜4.6、NFR5.1〜5.3、NFR7.1、NFR8.2）
  - T1 正例（設計 P1）: `if:` の `contains()` の印の集合が、`audit-admission.mjs` の依頼の schema 名 `sds-audit-request/1`、返却の schema 名 `sds-audit-review/1`、`plan-binding.mjs` の計画の印 `shirube-v3:control-handoff` と、過不足なく一致する。印の文字列は試験 file にも書き写さず、`scripts/` の該当 file から取り出した値と caller の値を比べる（S3）
  - T2 前提（設計 P2）: `gate.mjs` の判定 1 が `p.labels` から `risk:` を取っている間、caller の `pull_request_target` の types に `labeled`・`unlabeled` が残っている。門が label を読まなくなったとき、この試験が落ちて見直しを促す
  - T3 負例（N1・N6）: 起動と権限が変わっていない。`on.issue_comment.types` が `created, edited, deleted` のまま、`pull_request_target` の types が 7 つのまま、権限 6 つ（`contents`・`pull-requests`・`issues`・`actions`・`checks` は read、`statuses` は write）、`uses: watchout/shirube/.github/workflows/sds-gate.yml@<SHIRUBE_COMMIT>` の形、`with.pr` の式。起動の種類が増えていない。ここで固定する値は「広げない」ための上限（起動の種類、types、権限の一覧）だけで、絞りの規則は持たない。既存の `tests/sds-gate.test.mjs` の 130〜133 行目の確かめ（`issue_comment` の types）は複製せず、それ以外を確かめる（S3）
  - T4 負例（N2）: `if:` を小さな評価器（試験 file の中。`contains`・`==`・`!=`・`&&`・`||`・括弧だけを解釈し、足りない構文は例外にする）で評価する。印を含まない `created`（PR のコメント）は偽。PR でない issue のコメント（`github.event.issue.pull_request` が無い）は偽。`pull_request_target` の各 action は真
  - T5 負例（N4）: 印を含む `created` は、3 つの印のそれぞれで真（大文字小文字の違いでも真）。本文が空文字・欠落・null の `created` は真（式の `!github.event.comment.body` の節。設計 SD11）。評価器は欠落と null を空文字として扱い、`!` は空文字・null・欠落を真、それ以外の文字列（空白だけを含む）を偽にする。この値の扱いは評価器の中に 1 か所だけ置く。式から `!` の節を除くと、空・欠落・null の入力が偽になり、この試験が落ちる（`!` の節を除いた式での反例の確認を Red の記録に残す）
  - T6 負例（N3）: `edited` と `deleted` は、本文が印を含まなくても真（本文に頼らない）。`github.event.changes` を式が参照していない
  - T7 負例（N5・N7）: 足した行に `continue-on-error`、`|| true`、`--if-present` が無く、`run:`・`with:` に `github.event.comment` が渡っていない。読めない・解釈できない `if:`（空、閉じていない括弧、未知の関数、印の節が無い、2 つある）を評価器に与えると例外になり、真・偽に読み替えない
  - T8 逆向きと同居（設計の逆向き・同居）: 変更後の caller から、足した `if:` の節と注記の 2 行を取り除く。取り除いた文字列を読み手が「絞りなし」（元の `if:` の形）と判定し、取り除いた後の `on:`・権限・`uses:`・`with:` の節が、変更後の同じ節と一致する（構造の知識を書き写さず、前と後を比べる）。基準の bytes の SHA-256 `e6eaa2eb…` との一致は、後の単位が caller を正当に変えうるので恒久の試験にせず、Step 4 で 1 回観測して記録する
- [ ] Step 4: 絞りの規則 — Green。`kit/sds-gate-caller.yml` に、設計 1 の `if:` の節と、冒頭の注記 2 行（skip された job は `sds-gate` の status を変えない、必須の検査はその commit status であって job の check run ではない）だけを足す。ほかの行は変えない。8 件が通ることと、既存の試験（`tests/sds-gate.test.mjs` の「PR のコメント削除で再実行」を含む）が変更前のまま通ることを確かめ、観測値を記録する。あわせて、足した節と注記を取り除いた結果の SHA-256 が base の `e6eaa2eb…` と一致することを 1 回観測して記録する（恒久の試験にはしない。T8 は基準の bytes を固定で持たない）。（FR10.1、NFR3.1、NFR4.2〜4.4、NFR8.2〜8.4）
- [ ] Step 5: 絞りの規則 — Refactor。試験の補助関数（評価器、取り出し関数）の重複を整理し、新しい file を 300 行以内に保つ。通る状態を保つ。印の集合、禁止する記述の一覧を試験 file の中で 2 か所に書かない（S3）。（NFR9.1）
- [ ] Step 6: 環境・ビルドの設定。変更なし。次を実行して、他の検査が壊れていないことを確かめる: `npm test`（全体。観測値を記録）。hygiene と構造の予算は CI で確かめる。確認コマンド（取り組み全体の網羅率）は、この単位では対象 0 件のため U2 の合否の根拠にしない。（NFR7.2、NFR8.1）
- [ ] Step 7: 文書の更新。`docs/sds/distribution.md` の 107 行目が `issue_comment` の説明を持つ。caller の変更に合わせて直さないと、設計と実装が黙って食い違う（`authority-and-waiting.md` R3）。unit-of-work.md の境界（`kit/sds-gate-caller.yml` と試験）を 1 file 広げることは、arc の答え（Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）で認められた（SD10）。編集は設計監査の PASS の後、実装と同じ PR に足す。直す内容は、`issue_comment` は監査・計画の印を含むコメントの作成と、編集・削除で動く、という caller の動きに合わせた説明だけ（107 行目の周りを `origin/main` の bytes で読み直してから書く）。（R3、設計 7・SD10）
- [ ] Step 8: 文書と追跡。`code-summary.md`、`traceability.json`、`source-manifest.json` を書く。観測できないもの（`if:` の GitHub 上の評価、skip 時の status の不変、流れる回数）は「観測できなかった」と書き、導入の決定（範囲外）への条件として渡す。成功とは書かない。（NFR4.4、NFR7.3、NFR10.1）

## 試験の方針（標準の方針に対する適用）

- 部品は 1 つ（既存の kit の caller の変更）。標準の方針（部品あたり 5〜8 件）に対し 8 件。設計の表の 11 行（P1・P2・N1〜N7・逆向き・同居）は、T1〜T8 の中の確かめ（subtest や assert）として全部入れる。対応は unit-test-instructions.md の表で追う。
- 統合の試験: 実際の `kit/sds-gate-caller.yml` と `scripts/` の実物を読む試験（T1〜T3、T8）が、境界（caller ↔ 門の入口）の統合にあたる。T4〜T7 は評価器で式を読む定義の試験で、読めない入力の境界を T7 が持つ。
- 評価器は**式の写し**で、GitHub の評価そのものではない。式の意味（`contains` の大文字小文字、null の扱い）を GitHub が試験の想定どおりに評価するかは、文字列の試験では証明できない。これは「未実行」でなく「観測できない」として扱い、利用先への導入の後の観測に持ち越す（設計 6）。
- 行の網羅率の床 100%: この単位は新しい実行用の code を `scripts/` に足さない（YAML の変更と、試験 file の評価器だけ）。確認コマンドの網羅率の対象 `scripts/coverage-gate/**` は 0 件なので、空のまま 100% と出て通る。これを U2 の合否の根拠にしない。保証するのは、既存の試験と、この単位の試験が通ることだけ（施行する側は U3）。

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

データモデル / DB、リポジトリ、API / endpoint、フロントエンドの各層は、この単位に無い（workflow の定義だけを変える）。方法（TDD）は変えず、「ビジネスロジック」の層を「絞りの規則」に読み替えて Red → Green → Refactor を行う。

## Assumptions & Open Questions

### Assumptions

- [assumption] 式の字句（`contains`、`&&`、`||` の組み合わせ）が GitHub Actions で意図どおりに評価されることは、定義の試験（文字列と評価器）では証明できず、この PR の Actions でも観測できない（kit の caller は利用先に写されるひな形）。利用先への導入の後に観測する（設計 6）。それまで「観測できなかった」と書く。
- [assumption] 新しい試験 file は 300 行以内に収まる。超えそうなら評価器を別の補助 file に分ける（NFR9.1）。
- [assumption] 設計監査の PASS の前に clone の `origin/main` が進んでいた場合は、進んだ後の bytes で Step 2 の突き合わせをやり直す。

### Open Questions

1. 設計監査の PASS の前に code を書かない決まりのため、Step 3 以降は設計監査の返却の後に始める。返却が BLOCK なら、設計を先に直してから計画を直す。
2. （解決済み）Step 7（`docs/sds/distribution.md` の更新）で境界を 1 file 広げる。arc の答えで認められた（SD10）。
3. （解決済み）T8 は基準の bytes を固定で持たない。SHA-256 の一致は Step 4 の 1 回の観測で記録する。
