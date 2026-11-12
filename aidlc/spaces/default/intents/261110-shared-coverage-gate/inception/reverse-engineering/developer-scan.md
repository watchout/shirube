## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `.github/workflows/ci.yml`
  - `.github/workflows/hygiene.yml`
  - `.github/workflows/sds-gate.yml`
  - `kit/sds-gate-caller.yml`
  - `package.json`
  - `.shirube/hygiene-profile.md`
  - `knip.jsonc`
  - `scripts/hygiene/targets-coverage.mjs`
  - `scripts/sds/gate.mjs`（作業場の手元の版と、作業場 HEAD の版の差分）
  - `tests/plan-admission-equivalence.mjs`（V8 の網羅率を使う唯一の箇所）
  - 公開 main の `ci.yml`・`package.json`・`.shirube/hygiene-profile.md`・`.shirube/sds-pin.json`・`sds-gate-self.yml`（GitHub の読み取りだけで観測。`scripts/unit-done/judge.mjs` は coverage に関わる行だけ）
- **Skimmed only**:
  - `scripts/hygiene/*.mjs`（lib・lines-baseline・jscpd-guard・large-files・pr-size・own-code-budget・secret-suppressions・audit-admission。名前・大きさ・用途のみ）
  - `scripts/sds/*.mjs`（kit・plan-binding・plan-admission・design-gate ほか。名前・大きさのみ）
  - `tests/*.test.mjs`（名前と本数のみ。作業場で約 2,566 行）、`tests/u2/`、`tests/fixtures/`
  - `kit/instructions-block.md`、`kit/skills/sds-audit/`、`src/progression/`
  - 作業場の手元だけにある `scripts/sds/ci-record-*.mjs` と `tests/ci-record-*`（名前・大きさと、coverage の語の検索のみ）
- **Left out**: `node_modules/`、`.claude/` `.codex/` `.agents/` `.framework/` `aidlc/` `.worktrees/`（AI-DLC の導入物と作業場の記録）、`docs/`（走査範囲外。coverage の語の検索のみ）

### 版の区別（読んだ物がどの版か）
- **作業場（root）**: 作業場の起点 commit は `62ff73db52ce8f29f3b982507b5d2e36578ae60f`（PR #64 の統合）。この HEAD は公開 main より古い。以下で「root」と書く物はこの作業場の file。
- **公開 main**: `7e775afd5b755e51e55e269d8dc35b09d180c33e`（PR #100 の統合。2026-11-05 の commit）。GitHub の読み取りだけで観測した。以下で「公開 main」と書く。root と公開 main は同じ版ではないので混ぜない。
- **作業場の手元だけの変更**（root の HEAD にも公開 main にも無い。出所と状態は**不明**。別の作業の流れの途中の物とみられるが断定しない）:
  - 変更あり: `scripts/sds/gate.mjs`（record 用の入口 `recordGate` を足し、旧い `gate` を `legacyGate` に改名して振り分ける）、`scripts/hygiene/audit-admission.mjs`（関数を `export` に変え、`reviewChecks` を切り出す）、`.gitignore`（AI-DLC の無視 block）
  - 追加（未追跡）: `scripts/sds/ci-record-{admission,design-audit,envelope,evidence,input,policy,projection}.mjs`、`tests/ci-record-*.test.mjs`、`tests/ci-record-fixtures.mjs`、`docs/audit/`

### Packages Found
- `@watchout/shirube` — 単一 package（private、`type: module`、Node >= 22）— JavaScript(ESM) — hygiene の検査 script・SDS の門・kit の配布物。workspace 構成ではない。

### Build System
- **Type**: build は無い（.mjs をそのまま実行）。npm の scripts と GitHub Actions だけ。
- **Config Files**: `package.json`、`package-lock.json`、`knip.jsonc`、`.dependency-cruiser.cjs`、`configs/*.config.mjs`（ESLint）、`.shirube/hygiene-profile.md`、公開 main には `.shirube/sds-pin.json`
- **Build Dependencies**: 実行時の npm 依存は無し。devDependencies のみ（eslint、dependency-cruiser、jscpd、knip、eslint の plugin 2 つ）。

### APIs Discovered
- 公開 API は無い。入口は CLI の script（`scripts/hygiene/*.mjs`、`scripts/sds/gate.mjs`、`kit.mjs`）と、reusable workflow 2 本（`hygiene.yml`、`sds-gate.yml`）。
- 契約: hygiene の検査は 1 行 JSON と exit code 0/1/2。sds-gate は commit status `sds-gate` を PR の head に付ける。

### Frameworks & Libraries
- Node 組込みの `node:test`・`assert`（試験）— `npm test` = `node --test tests/*.test.mjs tests/u2/*.test.mjs`（root・公開 main とも同じ）
- ESLint 10.11.0、eslint-plugin-unicorn 76.0.0、eslint-comments 4.8.1、jscpd 5.3.2、knip 6.38.0、dependency-cruiser 18.4.0（すべて検査用の devDependency）

### Test Coverage
- **Test Directories**: `tests/`、`tests/u2/`、`tests/fixtures/`
- **Test Frameworks**: `node:test`
- **Coverage Config**:
  - **root**: **absent**。`ci.yml` の test job は `npm ci` → `npm test` → own-code budget だけで、行の網羅率を測る指定も下限も無い。`package.json` にも `--experimental-test-coverage`・c8・nyc・lcov は無い。
  - **公開 main**: **present（下限 80%）**。`ci.yml` の test job が Node 26 で
    `node --test --experimental-test-coverage --test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs` を実行する。コメントに「scripts/** 全体の行網羅率の下限 80%（iyasaka-arc#49 6336689921）、`--test-coverage-include-all` は Node 26.7+ が要るので Node 26 で動かし、engines は >= 22 のまま」とある。
    - 分母: `scripts/**` に一致する全 file（`include-all` で、試験が読み込まなかった file も 0% として数える）。`src/`（`src/progression/continuation.mjs`）、`configs/`、`tests/` は分母に入らない。
    - 判定: node の exit code。下限を下回れば test job が落ちる。機械が読む網羅率の JSON や artifact は作らない。
    - 下限は **80%**。社内の基準（行の網羅率 100%）とは違い、100% を判定する物は無い。
  - 名前が紛らわしい物: `npm run hygiene:coverage` と hygiene の `coverage` step は `targets-coverage.mjs`。「走査の対象の file が profile の言語で覆われているか」（.ts・.py の混入）を見る検査で、試験の行の網羅率ではない（`scripts/hygiene/targets-coverage.mjs:1-4`）。
  - `tests/plan-admission-equivalence.mjs` は V8 の網羅率で ADF（別 repo）の呼出し位置への到達を数える比較の道具。この repo の試験の網羅率を測る物ではなく、npm scripts にも CI にもつながっていない。
  - 公開 main の `scripts/unit-done/judge.mjs` は、渡された facts の `kind: "coverage"` の項目を読み、`lines_threshold` が整数で `MIN_LINES = 80` 以上かと exit_code 0 を判定する（`:5`、`:53-57`）。facts を CI から集める collector は無く、判定は渡された値の検査にとどまる。
  - 手元だけの `ci-record-*` の試験と script にも、網羅率を測る記述は見つからなかった（語の検索のみ）。
- 100% の下限（team の決まり）が書かれている場所は、AI-DLC の記録（team.md・project.md）で、repo の検査の設定には無い。

### Code Quality Indicators
- **Linting**: ESLint の 2 本立て（`structural-only`＝関数 50 行・複雑さ 10、`guard-only`＝例外の説明・無制限 disable の禁止・期限）。対象は `scripts configs`（`tests/` は対象外）。
- **CI/CD**:
  - root: `ci.yml`（Node 22。test job ＋ hygiene の呼出し）、`hygiene.yml`、`sds-gate.yml`
  - 公開 main: 上に加えて `ci.yml` が Node 26 の網羅率付き、`permissions: {}` を既定にして job ごとに `contents: read` などを宣言、`measure` job（`scripts/sds/metrics/cli.mjs` があるときだけ。今は無い）、`sds-gate-self.yml`（pin した commit の門を report-only で自分に当てる）
  - `hygiene.yml`（reusable）は root と公開 main で同じ大きさ。最後の step が全 outcome を読み直して、1 つでも失敗なら落とす。網羅率の step は無い。
- **Documentation**: README、`docs/spec-w1.md`、`docs/sds/*`、`docs/adr/*`、`docs/threats.md` あり。

### 結果の行き先（門・必須検査・監査の入力）
- hygiene: 各 step の JSON と、job 全体の成否。`Outcome of every check` の step が一覧を `GITHUB_STEP_SUMMARY` に書く。
- sds-gate: commit status `sds-gate`（PR の head）と run の JSON 出力。R2 以上は audit-admission の受領を要求する。判定は risk ラベル・変更 path・監査の受領（と、pin に応じて旧い計画・設計の結び付け）。**網羅率は判定に入っていない**。
- 公開 main の網羅率: CI の test job の成否としてだけ出る。必須検査かどうか（branch protection の設定）は、この走査では観測していない。
- 監査の入力: 網羅率の数値を監査の依頼や受領に渡す仕組みは見つからなかった。

### 「すでにあるもの」と「まだ無いもの」（共有の網羅率の門に向けて）
- すでにある:
  - 試験の実行（`npm test`、`node:test`）。
  - 公開 main のみ: Node の組込み機能による行の網羅率の測定と下限の判定（`scripts/**`、80%、`include-all`）。この repo 自身の CI に直書きされている。
  - reusable workflow の仕組みと、callee の commit を固定して検査 script を取る方法（`job.workflow_sha`）。共有の門を足す時に同じ形が使える。
  - 各 step の outcome を読み直して失敗を隠さない集約の型。
  - 走査対象の集合を決める部品（profile の `lines.include/exclude`、`resolveTargets`、`trackedFiles`）。
  - 利用側へ配る kit（`kit/sds-gate-caller.yml`、`kit.mjs`）。
  - 公開 main のみ: 網羅率の facts を判定する核（`unit-done/judge.mjs`、下限 80）。collector は無い。
- まだ無い:
  - 100% を判定する検査（下限は 80% のまま。root には測定自体が無い）。
  - 網羅率の分母の宣言（対象 file の集合を repo が宣言する場所）。`scripts/**` は CI の引数に直書きで、profile にも無い。`src/` が分母に入らない。
  - 網羅率の結果を機械が読める形で出すこと（JSON / artifact）。
  - 網羅率を利用側の repo にも当てる reusable workflow、required check への結び付け、監査の入力への結び付け。
  - 利用側の repo へ網羅率の門を配る手順（kit は hygiene と sds-gate のみ）。

### Technical Debt Signals
- `hygiene:coverage` / `coverage` step の名前が「試験の網羅率」を連想させるが中身は言語の被覆の検査。共有の網羅率の門を足す時に名前が衝突する（`scripts/hygiene/targets-coverage.mjs`）。
- 公開 main の網羅率は Node 26.7+ 前提で、engines は `>=22`、hygiene と root の CI は Node 22。利用側で同じ機能を使えるとは限らない。
- 公開 main の分母 `scripts/**` が CI の引数に直書き。`src/progression` は分母の外。分母を宣言する場所が決まっていない。
- 80% の根拠は `iyasaka-arc#49` のコメントにあり、team の決まり（100%）との差が repo の中に記録されていない。

## Handoff Summary
- **Intent-relevant finding**: 公開 main `7e775af` には、行の網羅率を測って下限で落とす仕組みが既にある。ただし CI の test job に直書きで、分母は `scripts/**`、下限は 80%、結果は job の成否だけ。100% の判定・分母の宣言・結果の機械可読な出力・利用側への配布・門や監査への結び付けは無い（`.github/workflows/ci.yml` の test job、公開 main）。root（作業場 HEAD `62ff73d`）には測定自体が無い（`.github/workflows/ci.yml:21`）。名前が近い `hygiene:coverage` は言語の被覆の検査で別物（`scripts/hygiene/targets-coverage.mjs:1-4`）。
- **Risks / follow-up**:
  1. 作業場の HEAD は公開 main より古い。成果物は root と公開 main を分けて書く（既存の store の書き方に合わせる）。
  2. 手元だけの変更（`gate.mjs` の record 入口と `ci-record-*`）の出所・状態は**不明**。統合されるまで「すでにある」に数えない。
  3. 100% の分母（どの file を数えるか）と、`src/` を含めるかは未決。
  4. 「coverage」の語が既に別の意味で使われている。成果物では「試験の行の網羅率」と書き分ける。
  5. この走査は選んだ範囲の読みで、試験や build は走らせていない。網羅率の実測値は未測定。公開 main の branch protection で網羅率の job が必須かは未観測。
