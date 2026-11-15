# 共有の網羅率の門 — 作業の組み方と決める人の表

## Sources

- 範囲: [scope-document.md](../scope-definition/scope-document.md)。バックログ: [intent-backlog.md](../scope-definition/intent-backlog.md)。実現性: [feasibility-assessment.md](../feasibility/feasibility-assessment.md)。
- 体制とスキル: [team-assessment.md](./team-assessment.md)、[skill-matrix.md](./skill-matrix.md)。回答: [team-formation-questions.md](./team-formation-questions.md)の[Q2]〜[Q5]（arc の答えで Owner の言葉ではない）。
- 記録済みの決まり: 作業場の `team.md`、AI-DLC の役の承認（[iyasaka-arc#49 6680884184](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6680884184)）。[desc]

## 作業の組み方

- 作る席1席（`adf-lead`）が全単位を順に作る。[Q2] 人が集まる mob の形は取らない。
- 1単位を1つの PR とし、CI と独立監査と作者の受領を経て、作者以外の `suite-lead` が統合する。その後に次の単位の作る段に入る。[Q2] [Q5]
- DB の構造・権限・契約・セキュリティに触れる単位は、設計の段を終えたら設計の記録だけの PR を先に出し、設計監査の PASS の後に code を書く。[Q5]
- AI-DLC の役のサブエージェントは、承認済みの範囲（同時に1つ、同じモデル、この作業場の中だけ、GitHub への書き込み・統合・孫への委任なし）だけで使う。この取り組みで範囲を広げない。取り組みごとの利用の承認は、最初に役を呼ぶ前に目的・人数・範囲を示して取る。[Q2]

## 決める人の表

| 決める物 | 決める人 | Source |
|---|---|---|
| 段の承認、守る物に触れない問い | arc（Owner の委任の下。Owner の言葉ではない） | [Q3] |
| 守る物（DB の構造・資格情報・本番・料金・workflow と必須の検査・branch protection・契約 .v2）、R3・R4 の統合前の対象 head の承認 | Owner | [Q3] |
| 新しい依存の導入 | arc-sec の安全確認と Owner の決定 | [Q3] [Q4] |
| 各 PR の独立監査 | `devauditor` | [Q3] |
| 各 PR の統合 | 作者以外の `suite-lead` | [Q3] |
| 各 repo の workflow の変更 | その repo の AI-DLC の作業場の席が作る。CTO は差分の観点の入力と workflow の差分の読み、arc-sec も workflow の差分を読む | [Q3] |

## RACI（単位ごと）

R = 実行、A = 最終の責任、C = 相談、I = 知らせる。

| 活動 | `adf-lead` | `devauditor` | `suite-lead` | arc | arc-sec | CTO | Owner |
|---|---|---|---|---|---|---|---|
| 設計・計画・試験・作る | R, A | I | I | I | I | I | I |
| 設計だけの PR の設計監査 | R（依頼） | R, A | I | I | I | I | I |
| 実装の独立監査 | R（依頼・受領） | R, A | I | I | I | I | I |
| 統合 | I | I | R, A | I | I | I | I |
| 段の承認（守る物に触れない） | R | I | I | A | I | I | I |
| 新依存の導入 | R（依頼） | I | I | C | R（安全確認） | I | A |
| workflow の変更（B1・B2・B8） | R（作る） | R（監査） | R（統合） | C | C（差分を読む） | C（差分を読む） | A（対象 head） |
| kit の版を出したときの知らせ | R | I | I | A（受け手） | I | I | I |

## 導入のチェックリスト

- [ ] 取り組みで最初に AI-DLC の役を呼ぶ前に、目的・人数・範囲を示して承認を取る（呼ばない間は不要）。[Q2]
- [ ] B3 で新依存の候補を整理し、arc-sec の確認と Owner の決定の依頼を出す。[Q4]
- [ ] B1・B2 の PR は、統合前に Owner の対象 head の承認を確認する。[Q3] [Q4]
- [ ] kit の版を出したら arc に知らせる。[Q1]
- [ ] 公開 repo に載る記録に、席の model 名・他 repo の非公開記録を書かない。[desc]

## Assumptions & Open Questions

- [assumption] 設計に関わる単位の判定（どの単位が守る物に触れるか）は、各単位の設計の段で行う。
- Open: B3 の承認が得られない場合の S1・B6 の扱い（Owner の判断）。
