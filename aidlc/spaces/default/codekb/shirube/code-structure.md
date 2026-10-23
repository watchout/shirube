# コードの構成（Code Structure）: shirube

## 置き場の構成

| 置き場 | 中身 | 分類 |
|--------|------|------|
| `scripts/hygiene/` | 衛生の検査 8 本（targets-coverage、lines-baseline、large-files、jscpd-guard、pr-size、secret-suppressions、own-code-budget）、監査の受領の検査（audit-admission）、共通の helper（lib） | Service・Utility |
| `scripts/sds/` | 門（gate）、判定 4（plan-binding）、判定 5 の純粋関数（design-gate）、計画の受付（plan-admission、plan-admission-shape）、段の算出（stage）、YAML の読取り（yaml）、配布キット（kit） | Service・Utility |
| `src/progression/` | 継続の核（continuation）。store・executor・clock の port だけを持つ | Service（未接続） |
| `configs/` | ESLint の 2 つの設定、profile の共通部（profile-eslint）、knip と dependency-cruiser の雛形 | Configuration |
| `kit/` | 配布先に写す部品: sds-gate の呼出し、指示の共通ブロック、監査の skill | Static/Asset |
| `.github/workflows/` | ci（自己適用）、hygiene（再利用）、sds-gate（再利用） | Configuration |
| `templates/` | PR・Issue・ADR・要求・設計・runbook・owner decision などの雛形 | Static/Asset |
| `docs/` | SDS-V2 の規格・手順・監査方法・配布の文書、設計と要求の記録、監査の項目集合（JSON） | ドキュメント |
| `tests/` | `node:test` の試験 14 本、U2 の試験、計画の受付の fixture | Test |
| `.shirube/` | この repo 自身の hygiene profile | Configuration |
| `.hygiene/` | file の長さの基準値（`lines-baseline.json`） | Configuration |

## file の分類（主なもの）

| file | 行数 | 分類 | 役割 |
|------|------|------|------|
| `scripts/sds/gate.mjs` | 143 | Controller/Service | 判定 1〜5 をまとめる門の本体と CLI |
| `scripts/sds/plan-binding.mjs` | 152 | Service | 判定 4（道筋・作業指示・依存の完了・許可 path・今の段） |
| `scripts/sds/design-gate.mjs` | 63 | Service（純粋） | 判定 5 の構造の判定 |
| `scripts/sds/plan-admission.mjs` | 108 | Service（純粋） | 計画の受付の意味の判定 |
| `scripts/sds/plan-admission-shape.mjs` | 102 | Service（純粋） | 計画の受付の形の判定（データで書いた形） |
| `scripts/sds/stage.mjs` | 27 | Service（純粋） | 道筋の今の段 S1〜S4 の算出 |
| `scripts/sds/yaml.mjs` | 8 | Utility | ruby で YAML を読む |
| `scripts/sds/kit.mjs` | 176 | Controller/Service | 配布キットの CLI（apply・upgrade・check・status） |
| `scripts/hygiene/audit-admission.mjs` | 180 | Service | 監査の受領の検査 |
| `scripts/hygiene/lib.mjs` | 185 | Utility | profile の読取りと検証、glob、git、出力の形 |
| `src/progression/continuation.mjs` | 190 | Service | 継続の核（U2） |
| `.github/workflows/hygiene.yml` | 223 | Configuration | 衛生の検査の再利用 workflow |

## コードの型（パターン）

- **1 行の JSON と exit code**: どの検査も `{check, verdict, ...}` を 1 行で出し、0 = PASS、1 = FAIL、2 = 観測できず（`lib.mjs` の `report`・`main`）。
- **fail closed**: 読めない・壊れている・形が違うは失敗にする（`need(ok, why)` で例外にする書き方が共通）。
- **差し替えられる外部**: `gate(args, api, now, verify, parse)`、`verifyAudit(args, api, now)`、`status(api, consumers, latest, source)` のように、外部への問い合わせと時刻を引数にする。
- **形の契約は fenced block**: PR は ` ```json sds-pr `、設計は ` ```json sds-design `、道筋と作業指示は ` ```yaml ` の block を 1 個だけ読む。
- **固定 commit からの読取り**: kit は `git show <commit>:<path>` で部品を読み、配った file の SHA-256 を pin に書く。
- **詰めた書き方**: 関数 50 行・複雑さ 10 の上限の中で、1 行に複数の処理を書く所が多い。
