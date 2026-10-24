# 部品の一覧（Component Inventory）: shirube

各部品の見出しの名前は、読み解きの範囲の記録（reverse-engineering-timestamp.md）の components と同じ。

## 門と判定

### sds-gate
- 置き場: `scripts/sds/gate.mjs`
- 責任: 判定 1（risk の label）・2（変更 path）・3（R2 以上の監査の受領）をまとめ、判定 4・5 を呼ぶ。保護面の path に触れれば R4 として扱う。
- 依存: audit-admission、plan-binding、design-gate、yaml-reader、hygiene-lib、GitHub API
- 状態: 健全。Owner の承認は見ない

### plan-binding
- 置き場: `scripts/sds/plan-binding.mjs`
- 責任: 判定 4。道筋の記録（ADMITTED）、node・依存の完了、作業指示の digest と marker、許可 path、今の段の外を変えないこと（4.18）を照合する。
- 依存: stage、hygiene-lib、GitHub API
- 状態: 健全。段階は pin の `plan_binding_mode`（既定 report-only）

### design-gate
- 置き場: `scripts/sds/design-gate.mjs`
- 責任: 判定 5 の純粋関数。設計の版の型、未決の答え、承認の digest と marker、主要な接続の順を見る。
- 依存: Node の crypto だけ
- 状態: 健全。段階は pin の `design_binding_mode`（無しなら NOT_CHECKED）

### stage
- 置き場: `scripts/sds/stage.mjs`
- 責任: 道筋の今の段（S1〜S4）を、Owner が受け入れていない最も低い段として出す。
- 依存: なし（純粋）
- 状態: 健全

### yaml-reader
- 置き場: `scripts/sds/yaml.mjs`
- 責任: ruby の `YAML.safe_load` で YAML を読む。ruby が無ければ「読取り不可」で止める。
- 依存: ruby（外部）
- 状態: 要注意（外部の道具に依存）

## 受付と受領

### audit-admission
- 置き場: `scripts/hygiene/audit-admission.mjs`
- 責任: 監査依頼と返却の受領を検査する。依頼の digest、作る人と確かめる人の分離、PR の head と base、CI の run と checkout の commit、証拠の行の一致、項目の全部 PASS を見る。
- 依存: hygiene-lib、GitHub API
- 状態: 健全。`authorization: NONE`（統合の許可ではない）

### plan-admission
- 置き場: `scripts/sds/plan-admission.mjs`、`scripts/sds/plan-admission-shape.mjs`
- 責任: 道筋の記録の形と意味を検査し、PASS / BLOCK と理由を返す。ai-dev-framework の固定 commit の判定と同じになるように書き直したもの。
- 依存: なし（純粋）
- 状態: 健全。判定 4 にはまだつながっていない

## 配布

### kit-cli
- 置き場: `scripts/sds/kit.mjs`
- 責任: apply / upgrade（部品・指示の共通ブロック・pin を書く）、check（pin とのずれ・旧部品・旧参照）、status（配布先ごとの状態を GitHub から読む）。push・merge はしない。
- 依存: sds-gate（保護面の既定）、hygiene-lib、git、GitHub API
- 状態: 健全

### kit-parts
- 置き場: `kit/sds-gate-caller.yml`、`kit/instructions-block.md`、`kit/skills/sds-audit/SKILL.md`
- 責任: 配布先に写す部品。
- 依存: なし
- 状態: 健全

### consumers-registry
- 置き場: `docs/sds/consumers.json`
- 責任: 配布先の一覧（repo・採択者・採択の記録・hygiene profile の種類・状態）。
- 依存: なし
- 状態: 要注意（shirube・aun・onza が載っていない）

## 衛生の検査

### hygiene-lib
- 置き場: `scripts/hygiene/lib.mjs`
- 責任: profile の読取りと検証、glob、git、対象の解決、1 行の JSON の出力、例外の期限。
- 依存: Node の組込み、git
- 状態: 健全

### hygiene-checks
- 置き場: `scripts/hygiene/` の targets-coverage・lines-baseline・large-files・jscpd-guard・pr-size・secret-suppressions・own-code-budget
- 責任: 各衛生の検査。
- 依存: hygiene-lib、jscpd・gitleaks（外部）
- 状態: 健全

### eslint-configs
- 置き場: `configs/`
- 責任: 構造の上限（関数 50 行・複雑さ 10）と例外の見張りの 2 つの ESLint の設定、knip と dependency-cruiser の雛形。
- 依存: eslint と plugin（配布先の node_modules から読む）
- 状態: 健全

## workflow

### hygiene-workflow
- 置き場: `.github/workflows/hygiene.yml`
- 責任: 衛生の検査を全部動かし、全部の結果を並べ、1 つでも失敗なら job を失敗にする。
- 依存: hygiene-checks、eslint-configs、gitleaks、ruff・vulture（任意）
- 状態: 健全

### sds-gate-workflow
- 置き場: `.github/workflows/sds-gate.yml`
- 責任: 固定 commit の shirube で sds-gate を動かし、commit status を付ける。
- 依存: sds-gate
- 状態: 健全

### ci-workflow
- 置き場: `.github/workflows/ci.yml`
- 責任: この repo 自身の試験・own-code の予算・hygiene を動かす（自己適用）。
- 依存: hygiene-workflow
- 状態: 健全

## その他

### progression-core
- 置き場: `src/progression/continuation.mjs`
- 責任: 仕事の着手の可否・依頼の送信・照会・連続の非進捗での停止を記録する継続の核（U2）。
- 依存: store・executor・clock の port（呼出し側が渡す）
- 状態: 未接続（呼び出し元が無い）

### templates
- 置き場: `templates/`
- 責任: PR・Issue・ADR・要求・設計・runbook・owner decision などの雛形。PR の雛形は `json sds-pr` の block を持つ。
- 依存: なし
- 状態: 健全
