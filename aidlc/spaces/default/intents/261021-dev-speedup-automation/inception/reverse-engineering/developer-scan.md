# 開発担当の読み解きの記録（Developer Code Scan）: shirube

対象: watchout/shirube の作業場（commit `62ff73db52ce8f29f3b982507b5d2e36578ae60f`）。読み解きの幅: 全体（full rescan、初回）。読むだけで、試験・build・プログラムは動かしていない。

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - scripts/
  - src/
  - configs/
  - kit/
  - .github/workflows/
  - .shirube/hygiene-profile.md
  - .dependency-cruiser.cjs
  - knip.jsonc
  - package.json
  - templates/PULL_REQUEST_TEMPLATE.md
  - docs/sds/distribution.md
  - docs/sds/consumers.json
  - docs/design/aidlc-include.md
  - docs/boundary.md
  - README.md
  - CHANGELOG.md
- **Skimmed only**:
  - tests/（file 名と行数、試験の数え方だけ）
  - docs/（上記以外。見出しだけ）
  - templates/（PULL_REQUEST_TEMPLATE.md 以外）
  - .hygiene/lines-baseline.json
- **Left out**:
  - node_modules/（依存の install。.gitignore で除外）
  - .hygiene/jscpd/（生成物。.gitignore で除外）
  - .claude/、aidlc/、.aidlc-version（AI-DLC の install と作業場。project のコードではない）

### Packages Found
- @watchout/shirube — 1 つの npm package（private、version 0.1.4）— JavaScript（ESM、`.mjs`）— SDS-V2 の門（sds-gate）・配布キット・衛生の検査（hygiene）・雛形

### Build System
- **Type**: npm（build の段は無い。Node ≥ 22 で script を直接動かす）
- **Config Files**: package.json、package-lock.json、knip.jsonc、.dependency-cruiser.cjs、configs/*.config.mjs
- **Build Dependencies**: 実行時の依存は無し（Node の組込みだけ）。開発時の依存は ESLint・jscpd・knip・dependency-cruiser のみ

### APIs Discovered
- CLI — scripts/hygiene/*.mjs（9 本）、scripts/sds/gate.mjs、scripts/sds/kit.mjs（apply / upgrade / check / status）— 各 1 行の JSON を出し、exit code 0/1/2 で結果を返す
- 再利用 workflow（workflow_call）— .github/workflows/hygiene.yml（入力 6）、.github/workflows/sds-gate.yml（入力 pr）
- GitHub REST API の読取り — `gh api` の GET（PR・file 一覧・comments・contents・check-runs・actions の runs/jobs/logs・compare）。書込みは sds-gate の workflow が commit status を 1 つ付けるだけ
- JSON / YAML の形の契約 — `sds-pr/1`、`sds-pin/1`、`sds-audit-request/1`、`sds-audit-review/1`、`sds-audit-items/1`、`sds-design/1`、`shirube-delivery-plan/v1`、`shirube-v3/control_handoff/v1`
- export された関数 — `gate`、`verifyAudit`、`planBinding`、`designGate`、`planAdmission`、`checkPlanShape`、`currentStage`、`render`・`apply`・`check`・`status`（kit）、`createProgression`

### Frameworks & Libraries
- Node.js — ≥ 22 — 実行環境（`node:test` で試験）
- eslint — 10.11.0 — 構造の上限（関数 50 行・複雑さ 10）と例外の見張り
- eslint-plugin-unicorn — 76.0.0 — 期限つき TODO の検査
- @eslint-community/eslint-plugin-eslint-comments — 4.8.1 — disable コメントの見張り
- jscpd — 5.3.2 — 重複の検査
- knip — 6.38.0 — 使われないコードの検査
- dependency-cruiser — 18.4.0 — 依存の向きと循環の検査
- 外部の道具 — gh CLI、git、ruby（`YAML.safe_load`）、gitleaks 8.30.1（sha256 で固定）、ruff 0.16.9・vulture 2.16（任意）

### Test Coverage
- **Test Directories**: tests/（14 本の `*.test.mjs` と補助）、tests/u2/、tests/fixtures/plan-admission/
- **Test Frameworks**: Node 組込みの `node:test`（`npm test` = `node --test tests/*.test.mjs tests/u2/*.test.mjs`）
- **Coverage Config**: absent（行の網羅率の測定は無い）

### Code Quality Indicators
- **Linting**: ESLint の 2 回の実行（configs/structural-only.config.mjs、configs/guard-only.config.mjs）。設定は profile から読む
- **CI/CD**: .github/workflows/ci.yml（npm test、own-code の予算、自分自身への hygiene）、hygiene.yml、sds-gate.yml
- **Documentation**: README、ADR 2 本、設計と要求の文書が多数（docs/ 約 4,000 行）。コードの先頭のコメントに根拠（Issue の comment の URL）が書かれている

### Technical Debt Signals
- own-code の量: scripts 1,502 行 + configs 108 行 + workflows 328 行 = 1,938 行（profile の own_code の数え方に合わせた wc の値）。予算 2,300 行に対し残り約 362 行
- 1 行が長く詰めて書かれた関数が多い（例: scripts/sds/gate.mjs、scripts/sds/plan-binding.mjs）。関数の行数の上限は守るが、読みにくい
- YAML の読取りを ruby の子プロセスに頼る（scripts/sds/yaml.mjs）。ruby が無い環境では判定 4 が fail-closed で止まる
- src/progression/continuation.mjs（U2 の継続の核）は、どこからも呼ばれていない（CLI も workflow も無い）。未決の契約のため、一部の事実の種類を受け付けない（`unsupported fact type`）
- docs/sds/consumers.json の配布先は kodama と OmotenasuAI の 6 repo で、shirube・aun・onza は載っていない
- 時刻の読取り: gate の既定引数 `now = Date.now()`、kit の `apply` の既定 `new Date()`、hygiene の `utcToday()`。どれも引数か環境変数で渡せる形（S4 の adapter 側）

## Handoff Summary
- **Intent-relevant finding**: この取り組みの範囲の多くは、すでに門（sds-gate）の判定として実装されている。監査なしの PR を止める判定 3（scripts/sds/gate.mjs L61〜72、L131）、道筋に結ぶ判定 4（scripts/sds/plan-binding.mjs L142〜152、段階は pin の `plan_binding_mode`、既定 report-only）、今の段の外を変えさせない 4.18（plan-binding.mjs L116〜122、scripts/sds/stage.mjs）、設計の版に結ぶ判定 5（scripts/sds/design-gate.mjs、pin の `design_binding_mode`）。配布は kit の apply / upgrade / check / status（scripts/sds/kit.mjs）。一方、成功の指標の計測（統合までの時間・手戻りの回数・Owner の手の回数・誤って止めた回数）、誤って止めた件の判定と記録、設計と実装のずれの検査、AI-DLC の記録を門が読む橋（docs/design/aidlc-include.md §5）は、コードに無い。
- **Risks / follow-up**: own-code の残りは約 362 行で、内訳は Owner の決定（distribution.md §2 の予算）で割り当て済みの枠がある。新しい計測のコードは枠の中に収めるか、Owner の決定が要る。門を「止める」形にするのは各 repo の pin の mode と必須検査の設定で、どちらも保護面（Owner の決定）。配布先の一覧（consumers.json）に shirube・aun・onza が無い。
