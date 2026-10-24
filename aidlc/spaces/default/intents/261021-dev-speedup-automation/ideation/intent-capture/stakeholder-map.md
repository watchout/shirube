# 関係者の図（Stakeholder Map）: 開発の高効率化・自動化による高速開発化

## 関係者と関心事（Key Stakeholders and Interests）

| 関係者 | この取り組みとの関わり | 関心事 | Source |
|--------|------------------------|--------|--------|
| Owner | 一番得をする人。判断・承認・手渡しの待ちが遅れの原因の 1 つ | 人が追いかけずに済み、判断と承認だけに集中できること | [Q7][Q3][Q2] |
| ARC（設計） | 範囲と優先順位の大枠の中で、細かい順番を決める | Unknown (open question) [assumption] | [Q7][Q12] |
| 実行リード（suite-lead・hotel-lead） | 関係者として挙げられている | Unknown (open question) [assumption] | [Q7] |
| 実装・監査の席（spe-dev・devauditor など） | 関係者として挙げられている。席どうしの引継ぎと監査の往復が遅れの原因に含まれる | Unknown (open question) [assumption] | [Q7][Q2] |

## 決める人と影響する人（Decision-makers vs. Influencers）

| 関係者 | 役割 | 決める範囲 | Source |
|--------|------|------------|--------|
| Owner | 決める人 | 範囲と優先順位の大枠を、対話で決める | [Q12] |
| ARC（設計） | 決める人 | Owner が決めた大枠の中の、細かい順番を決める | [Q12] |
| 実行リード（suite-lead・hotel-lead） | Unknown (open question) [assumption] | Unknown (open question) [assumption] | [Q7] |
| 実装・監査の席（spe-dev・devauditor など） | Unknown (open question) [assumption] | Unknown (open question) [assumption] | [Q7] |

## 報告・連絡の決まり（Communication Requirements）

| 決まり | 内容 | Source |
|--------|------|--------|
| 記録の正本 | GitHub の Issue・PR に記録する | [Q9] |
| chat の使い方 | chat には要点だけを書く | [Q9] |

## Assumptions & Open Questions

- [assumption] ARC、実行リード、実装・監査の席それぞれの関心事は、答えではまだ確認されていない。
- [assumption] 実行リードと実装・監査の席が「決める人」か「影響する人」かは、答えではまだ確認されていない。
