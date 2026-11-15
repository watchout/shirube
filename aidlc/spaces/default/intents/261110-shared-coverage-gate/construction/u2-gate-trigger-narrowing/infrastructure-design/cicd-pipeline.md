# U2 u2-gate-trigger-narrowing — 配布の流れ（CI/CD）

この単位の成果物は `kit/sds-gate-caller.yml` の変更と、その定義の試験で、利用先へは配布しない（kit の版上げと導入は範囲外）。変更が統合されるまでの流れと、戻し方、守る物の扱いを書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)。要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（守る物の条件）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)。
- 進め方の決まり: team.md の Way of Working（1 単位 1 PR、設計記録だけの PR → 設計監査 → 実装を同じ PR に追加、独立監査、作者の受領、作者以外の suite-lead による統合、PR 本文の `json sds-pr` と `risk:` ラベル、merge commit）と Deployment。

## 流れ（ステージと門）

| Stage | 内容 | 門（通らないと次へ進めない） |
|---|---|---|
| 1 設計記録だけの PR | U2 の設計・計画・試験の記録を、`audit/` と `.aidlc-engine/` を除いて PR にする。`kit/` の変更は含めない | PR の CI。workflow の定義に触れる単位なので risk:R3。独立の設計監査（devauditor）を 1 回出し、PASS を待つ |
| 2 実装（TDD） | 設計監査の PASS の後、先に変更前の caller で失敗する試験を書いて失敗を確かめ、次に `if:` の節と注記を足して通す | 定義の試験（`npm test`）の合格。既存の試験（`tests/sds-gate.test.mjs` の「PR のコメント削除で再実行」を含む）は変更前のまま通る。取り除いた結果の SHA-256 が base の `e6eaa2eb…` と一致することを 1 回観測して記録する |
| 3 実装の監査 | 同じ PR に実装を足し、対象の head の CI が完了してから、`sds-audit-request/1` を作者が出す。devauditor の返却、作者の受領 | 返却が PASS、受領が記録される（BLOCK への受領は機械の受領と書かない） |
| 4 Owner の承認 | R3。統合の前に、対象の head への Owner の承認を確認する | Owner の公開決定（URL と本文 SHA-256）。段の承認や arc の答えを実行の許可と読まない |
| 5 統合 | 作者以外の suite-lead が merge commit で `main` に統合する（squash しない） | 必須の検査（`test`、`hygiene`、`sds-gate`）が成功し、PR の記録がそろっている |

## 戻し方と段階

| 場面 | 手順 |
|---|---|
| 実装の PR を統合する前 | head を変えたら、古い依頼や結果を流用せず、CI・独立監査・受領を改めてそろえる |
| 統合した後に問題が出た | 追加した `if:` の節と注記を取り除く PR を出す（変更前の caller に戻る。変更前の試験が通ることを確かめる）。これも workflow の定義の変更なので同じ承認の流れを通る |
| 利用先 | 利用先の caller は kit の版上げまで古いまま動く。新旧どちらの caller と再利用 workflow の組み合わせでも入力 `pr` と出力 status は変わらない（NFR8.1）。段階的な展開・feature flag は使わない |

## 秘密情報と権限

- 新しい secret・資格情報・権限を足さない（NFR5.1）。caller の権限 6 つと `pull_request_target` の使用は変えない（変えるのはセキュリティの設計の変更にあたる）。コメントの本文は `if:` の式の中だけで使い、`run:`・`with:` に渡さない（NFR5.2）。
- 監査の依頼文の投稿は作者（watchout の名義）、統合は作者以外の席で行う。この分担は変えない。

## 確かめの記録

- 定義の試験の観測値（実行数・合格数・失敗数）、Red の失敗、base との SHA-256 の突き合わせを Build and Test の記録に残す。確認コマンドの網羅率は、この単位では対象 0 件で空のまま 100% と出て通るため、U2 の合否の根拠にしない（保証するのは、既存の試験とこの単位の試験が通ることだけ）。
- この PR の Actions では kit の caller の `if:` の評価を観測できない。観測できなかったものは成功と書かず、導入の決定への条件として渡す（設計 6）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 変更する file は `kit/` 配下で `.github/workflows/` ではない。gh のトークンの権限で push が通るかは、push の前に確かめ、通らなければ SSH の clone を使う。いずれの場合も push の前に arc へ 1 行知らせる。
- [assumption] 設計記録だけの PR の段階では `kit/` を含めない（caller の変更は実装の段階で足す）。

### Open Questions

1. `docs/sds/distribution.md` の `issue_comment` の説明（107 行）を直すと unit の境界が 1 file 広がる。Code Generation の計画で arc に確かめる（security-design.md の Open Question 2）。
