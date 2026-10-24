# 決定の記録（Decision Log）: Ideation

出典の書き方: `[IC-Qn]` Intent Capture、`[FE-Qn]` Feasibility、`[SD-Qn]` Scope Definition、`[TF-Qn]` Team Formation、`[AH-Qn]` Approval & Handoff の質問ファイルの答え。「arc の下書き」は、別の席が書いた答えを Owner が要約の確認で確定したもの。

## 参照した入力

- `ideation/intent-capture/intent-statement.md`、`ideation/intent-capture/stakeholder-map.md`
- `ideation/feasibility/feasibility-assessment.md`、`ideation/feasibility/constraint-register.md`
- `ideation/scope-definition/scope-document.md`、`ideation/scope-definition/intent-backlog.md`
- `ideation/team-formation/team-assessment.md`
- 各段の質問ファイル（`*-questions.md`）

## 意図（Intent Capture）

| ID | 決定 | 出典 |
|----|------|------|
| D-IC-1 | 対象は社内のすべての製品の開発 | [IC-Q1] |
| D-IC-2 | 遅れの原因は 4 つすべて（Owner 待ち・席どうしの引継ぎ・監査の往復・手戻り） | [IC-Q2] |
| D-IC-3 | 一番得をするのは Owner | [IC-Q3] |
| D-IC-4 | 主な指標は統合までの時間と手戻りの回数（今の値の半分）。見張りは Owner の手（1 周 6 回まで）と誤って止めた回数（0） | [IC-Q4][IC-Q10] |
| D-IC-5 | きっかけは製品の完成の遅れ | [IC-Q5] |
| D-IC-6 | 最初の版でやらないこと: 保護面の自動化、新しい席や AI-DLC 以外の新しい外部ツール、承認そのものを無くすこと | [IC-Q6] |
| D-IC-7 | 関係者は Owner・ARC・実行リード・実装と監査の席 | [IC-Q7] |
| D-IC-8 | 決め方は、大枠を Owner が対話で、細かい順番を ARC が決める（Q8 の答えと 10/21 の運用の食い違いを Q12 で確認） | [IC-Q8][IC-Q12] |
| D-IC-9 | 記録の正本は GitHub、chat には要点だけ | [IC-Q9] |
| D-IC-10 | 最初に解くのは手戻り | [IC-Q11] |
| D-IC-11 | 前提: AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る | [IC-Q13] |

## 市場調査（Market Research）

| ID | 決定 | 出典 |
|----|------|------|
| D-MR-1 | 飛ばした。内部向けで、外部ツールの選び方も決まっているため | [IC-Q13][IC-Q6] |

## 実現性（Feasibility）

| ID | 決定 | 出典 |
|----|------|------|
| D-FE-1 | 必ずつなぐのは GitHub と各 AI の席。動かす場所は GitHub とこの Mac | [FE-Q1][FE-Q2] |
| D-FE-2 | 手戻りの回数は GitHub の PR の記録から数える | [FE-Q3] |
| D-FE-3 | 最初の版は AUN に頼らない | [FE-Q9] |
| D-FE-4 | 個人情報を含む製品のデータには触れない | [FE-Q5] |
| D-FE-5 | AI の利用料の増加は許容（上限は後で） | [FE-Q6] |
| D-FE-6 | 時期は決めず、完了の条件で区切る | [FE-Q7] |
| D-FE-7 | 最初に試すのは、いま動いている Suite の製品 | [FE-Q10] |

## 範囲（Scope Definition）

| ID | 決定 | 出典 |
|----|------|------|
| D-SD-1 | 範囲に入るもの 10 項目（計測、門 4 つ、ずれの検査、誤って止めた件の記録、守ること 2 つ、Shirube・AUN・Onza への配布） | [SD-Q1] |
| D-SD-2 | 最小の範囲は、計測と門で実際に止めるところまで | [SD-Q2] |
| D-SD-3 | 順番は価値の大きいものから（計測は先頭） | [SD-Q3] |
| D-SD-4 | 手戻り以外の原因は測るだけ | [SD-Q4] |
| D-SD-5 | 対象の repo は Shirube・AUN・Onza。Kusabi・Tsumama は再開後 | [SD-Q5][SD-Q7] |
| D-SD-6 | 完了の条件は Shirube の S1 の条件 S1-SH-01〜07 | [SD-Q6][SD-Q8] |

## 画面のたたき台（Rough Mockups）

| ID | 決定 | 出典 |
|----|------|------|
| D-RM-1 | 飛ばした。画面がなく、仕組みどうしのやり取りの図は設計の段で扱うため | [TF-Q6] |

## 体制（Team Formation）

| ID | 決定 | 出典 |
|----|------|------|
| D-TF-1 | Shirube の S1 を含む、より大きな取り組み。この記録が S1 の Inception の記録も兼ねる（arc の下書き） | [TF-Q1] |
| D-TF-2 | 今ある分担のまま（設計 ARC、実装 各製品の席、監査 devauditor、統合 suite-lead） | [TF-Q3] |
| D-TF-3 | 統合は suite-lead（arc の下書き） | [TF-Q4] |
| D-TF-4 | この会話は Inception の最後まで。設計の段は ARC が書いた設計をこの会話で確認・承認する（B から C に変更。Team Formation を開き直して直した） | [TF-Q6] |

## 取り組みの承認（Approval & Handoff）

| ID | 決定 | 出典 |
|----|------|------|
| D-AH-1 | この記録を shirube の repo に PR で入れる（秘密・個人の情報・機械の名前の確認が先） | [AH-Q1] |
| D-AH-2 | PR は shirube の席が作り、devauditor → suite-lead（時期は arc の下書き） | [AH-Q5] |
| D-AH-3 | 影響の大きいリスク R1・R2・R7 の手当てを受け入れる（arc の下書き） | [AH-Q2] |
| D-AH-4 | AI の利用料の上限は、設計の段で ARC が見込みを出してから Owner が決める | [AH-Q3] |
| D-AH-5 | Onza への導入は Onza の今ある席（arc の下書き） | [AH-Q4] |

## 変更の記録

| 変更 | いつ | 出典 |
|------|------|------|
| 意図の要約の確認で、やらないことの文言・前提・見張りの指標 2 つを直した | Intent Capture | [IC-Q4][IC-Q6][IC-Q13] |
| 範囲の要約の確認で、完了の条件を S1-SH-01〜07 に揃え、必ず入れるものを足した | Scope Definition | [SD-Q1][SD-Q6][SD-Q8] |
| 体制の Q6 を B（要件まで）から C（Inception の最後まで）に変えた | Approval & Handoff の要約の確認の後、Team Formation を開き直して | [TF-Q6] |

## Assumptions & Open Questions

- None.
