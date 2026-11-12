# U1 u1-ci-concurrency — 配布の流れ（CI/CD）

この単位の成果物は `.github/workflows/ci.yml` の変更で、配布先に広がる物ではない（Shirube 自身の CI）。変更が統合されるまでの流れと、戻し方、守る物の扱いを書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)。要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（FR10.5 の守る物の条件）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)。
- 進め方の決まり: team.md の Way of Working（1 単位 1 PR、設計記録だけの PR → 設計監査 → 実装を同じ PR に追加、独立監査、作者の受領、作者以外の suite-lead による統合、PR 本文の `json sds-pr` と `risk:` ラベル、merge commit）と Deployment。

## 流れ（ステージと門）

| Stage | 内容 | 門（通らないと次へ進めない） |
|---|---|---|
| 1 設計記録だけの PR | U1 の設計・計画・試験の記録を、`audit/` と `.aidlc-engine/` を除いて PR にする | PR の CI。守る物（workflow）に触れる単位なので、独立の設計監査（devauditor）を 1 回出し、PASS を待つ |
| 2 実装（TDD） | 設計監査の PASS の後、先に変更前の `ci.yml` で失敗する試験を書いて失敗を確かめ、次に `concurrency:` を足して通す | 定義の試験（`npm test`）の合格。既存の試験は変更前のまま通る |
| 3 実装の監査 | 同じ PR に実装を足し、対象の head の CI が完了してから、`sds-audit-request/1` を作者が出す。devauditor の返却、作者の受領 | 返却が PASS、受領が記録される（BLOCK への受領は機械の受領と書かない） |
| 4 Owner の承認 | workflow の変更は保護対象。統合の前に、対象の head への Owner の承認を確認する | Owner の公開決定（URL と本文 SHA-256）。段の承認を実行の許可と読まない |
| 5 統合 | 作者以外の suite-lead が merge commit で `main` に統合する（squash しない） | 必須の検査（`test`、`hygiene`、`sds-gate`）が成功し、PR の記録がそろっている |

## 戻し方と段階

| 場面 | 手順 |
|---|---|
| 実装の PR を統合する前 | head を変えたら、古い依頼や結果を流用せず、CI・独立監査・受領を改めてそろえる |
| 統合した後に問題が出た | 追加した `concurrency:` の記述を取り除く PR を出す（変更前の定義に戻る。変更前の試験が通ることを確かめる）。これも workflow の変更なので、同じ承認の流れを通る |
| 段階的な展開・feature flag | 使わない。単一の repo の単一の file の変更で、配布先への展開は無い |

## 秘密情報と権限

- 新しい secret・資格情報・権限を足さない（NFR5.1）。`permissions:` の明示は、この単位では行わない（範囲外。セキュリティの設計の変更にあたる）。
- 監査の依頼文の投稿は作者（watchout の名義）、統合は作者以外の席で行う。この分担は変えない。

## 確かめの記録

- 定義の試験の観測値（実行数・合格数・失敗数）と、PR の実行の一覧から読んだ事実を Build and Test の記録に残す。確認コマンドの網羅率は、この単位では対象 0 件で空のまま 100% と出て通るため、U1 の合否の根拠にしない（保証するのは、既存の試験とこの単位の試験が通ることだけ）。

## Assumptions & Open Questions

### Assumptions

- [assumption] gh のトークンに workflow 権限が無い場合は、`.github/workflows/` を含む push が API では通らない。その場合は SSH の clone で PR を作る（既知の取扱い）。push の前に、arc へ 1 行知らせる。
- [assumption] 設計記録だけの PR の段階では `.github/workflows/` を含めない（workflow の変更は実装の段階で足す）。

### Open Questions

1. なし（この段で新しく生じた未決は無い）。
