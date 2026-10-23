# 業務の概要（Business Overview）: shirube

## 目的

shirube は、IYASAKA の各 repo の変更が決まりの中に収まっているかを確かめる、小さな制御の層である（README）。変更の範囲・大きさ・重複・使われないコード・依存の向き・例外・秘密を検査し、受入が採択された ID と実際の証拠から数えられているか、保護面の操作が Owner を通っているかを確かめる。自分では実行・配達・復旧・記憶をしない（それは AUN・Kusabi・各製品の repo の役割）。

## 主な機能

| 機能 | 中身 | 主な置き場 |
|------|------|------------|
| 衛生の検査（W1 hygiene） | file の長さと基準値、PR の大きさ、大きな file と gitleaks の設定、重複（jscpd）、使われないコード（knip）、依存の向き（dependency-cruiser）、関数の長さと複雑さ、例外の見張り、秘密（gitleaks）、任意で Python | `.github/workflows/hygiene.yml`、`scripts/hygiene/` |
| 必須検査 1 本の門（sds-gate） | 判定 1 risk の label、判定 2 変更 path、判定 3 R2 以上の監査の受領、判定 4 道筋（delivery plan）への結び、判定 5 設計の版への結び。構造の事実だけを見て、意味は独立監査に残す | `.github/workflows/sds-gate.yml`、`scripts/sds/gate.mjs` ほか |
| 監査の受領の検査 | 監査依頼（`sds-audit-request/1`）と返却（`sds-audit-review/1`）を、今の head・CI の結果・証拠の行と照合する。意味の正しさや統合の許可は示さない | `scripts/hygiene/audit-admission.mjs` |
| 計画の受付（PLAN_ADMISSION） | 道筋の記録（`shirube-delivery-plan/v1`）の形と意味を検査する。ai-dev-framework の固定 commit と同じ判定を書き直したもの | `scripts/sds/plan-admission.mjs`、`plan-admission-shape.mjs` |
| 配布キット v0 | 各 repo に、門の呼出し・PR の雛形・監査の skill・指示の共通ブロック・版の固定 file（`.shirube/sds-pin.json`）を入れる。今の状態を GitHub から読む | `scripts/sds/kit.mjs`、`kit/` |
| 雛形と規格の文書 | PR・Issue・ADR・要求・設計の雛形、SDS-V2 の規格と手順 | `templates/`、`docs/` |
| 継続の核（U2） | 仕事の着手の可否・依頼の送信・照会・停止を記録する核。今はどこからも呼ばれていない | `src/progression/continuation.mjs` |

## 使う人と席

- Owner: 保護面（必須検査・workflow・pin・ruleset など）の決定、R3/R4 の exact-head の承認。
- 実装の席: PR に機械向けのブロック（`json sds-pr`）を書き、R2 以上は監査を依頼する。
- 監査の席（devauditor など）: 監査の返却を書く。作者と別の席。
- 統合の席（suite-lead など）: 門の結果と Owner の決定を確かめて統合する。作者・監査と別の席。
- 配布先の repo: kodama は採択済み、OmotenasuAI の 6 repo は予定（`docs/sds/consumers.json`）。

## 業務上の決まり（コードに表れているもの）

- どの検査も失敗を隠さない（fail closed）。観測できない時は PASS にせず UNOBSERVABLE / FAIL にする。
- 門は PR の head のコードを使わず、固定した shirube の commit から動く。PR が自分を判定する検査を書き換えられない。
- 門は Owner の承認を見ない（`owner_approval: NOT_CHECKED_BY_MACHINE`）。全席が同じ GitHub アカウントで投稿しているため、本人の確認は人が行う。
- 判定 4・5 は段階を持つ（無し・off → report-only → Owner が repo ごとに blocking）。
