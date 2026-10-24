# 取り組みのまとめ（Initiative Brief）: 開発の高効率化・自動化による高速開発化

出典の書き方: `[IC-Qn]` Intent Capture、`[FE-Qn]` Feasibility、`[SD-Qn]` Scope Definition、`[TF-Qn]` Team Formation、`[AH-Qn]` `ideation/approval-handoff/approval-handoff-questions.md` の答え。

## 参照した入力

- `ideation/intent-capture/intent-statement.md`、`ideation/intent-capture/stakeholder-map.md`
- `ideation/feasibility/feasibility-assessment.md`、`ideation/feasibility/constraint-register.md`
- `ideation/scope-definition/scope-document.md`、`ideation/scope-definition/intent-backlog.md`
- `ideation/team-formation/team-assessment.md`
- 市場調査（Market Research）と画面のたたき台（Rough Mockups）は、当てはまらないため飛ばした（内部向け・画面なし）。

## 意図と問題

- 社内のすべての製品の開発を速くする。最初の版は Suite のうち Shirube・AUN・Onza で始める。 [IC-Q1][SD-Q5][SD-Q7]
- 遅れの原因は、Owner 待ち・席どうしの引継ぎが人を介すこと・監査の往復・設計と実装のずれや工程の飛ばしによる手戻りの 4 つで、最初の版では手戻りを先に解く。 [IC-Q2][IC-Q11]
- 前提: AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る（10/21 の決定）。 [IC-Q13]
- この取り組みは Shirube の S1 を含む、より大きな取り組みで、この記録が S1 の Inception の記録も兼ねる。 [TF-Q1]

## 成功の指標

| 種類 | 指標 | 目標 | 出典 |
|------|------|------|------|
| 主な指標 | 依頼から統合までの時間 | 今の値を測り、その半分 | [IC-Q4][IC-Q10] |
| 主な指標 | 差し戻し・手戻りの回数 | 今の値を測り、その半分 | [IC-Q4][IC-Q10] |
| 見張り | 1 周あたりの Owner の手の回数 | 6 回まで | [IC-Q4][SD-Q6] |
| 見張り | 正しい作業を誤って止めた回数 | 0 | [IC-Q4][SD-Q6] |

- 4 つの指標はどれも社内の開発の記録から数えられ、自社が管理できる範囲の指標になっている（チームの決まり: 評価の指標は自社が管理できる範囲にする）。 [FE-Q3][IC-Q4]

## 実現性とリスク

- 結論は「条件付きで実現できる」。条件は、Suite の動いている製品から始める、AUN に頼らない、改善より先に今の値を測る、保護面の切り替えはそのつど Owner が決める、の 4 つ。 [FE-Q10][FE-Q9][FE-Q3][FE-Q8]
- 影響の大きいリスク R1（測る前に改善を始める）・R2（正しい作業まで止める）・R7（個人情報に触れる）は、手当ての方向とともに受け入れた。 [AH-Q2]
- AI の利用料は増えてよいが、上限は設計の段で ARC が見込みを出してから Owner が決める。 [FE-Q6][AH-Q3]

## 範囲の境目

- 範囲に入るもの: 計測（4 指標）、工程の飛ばしを止める門、監査なしの PR は統合できない（S1-SH-01）、道筋に無い作業は統合できない（S1-SH-02）、Inception が先（S1-SH-03）、設計と実装のずれの検査、誤って止めた件の記録、作者の手間は増えない（S1-SH-05）、Shirube 自身が門を通る（S1-SH-06）、Shirube・AUN・Onza への配布。 [SD-Q1]
- 範囲に入らないもの: Suite 全体と OmotenasuAI への配布（次の段階）、Kusabi・Tsumama（再開後）、手戻り以外の原因の改善（測るだけ）、保護面の自動化、AI-DLC 以外の新しい外部ツール、承認そのものを無くすこと、AUN を受け渡しに使うこと。 [SD-Q1][SD-Q7][SD-Q4][IC-Q6][FE-Q9]
- 完了の条件: Shirube の S1 の条件 S1-SH-01〜07（門が Shirube と AUN で効き、AUN の実際の PR が 1 件以上門を通って統合。誤って止めた PR は 0。Owner の手は 1 周 6 回まで）。 [SD-Q6][SD-Q8]

## 体制

- 今ある分担のまま: 設計 = ARC、実装 = 各製品の実装席（Onza は Onza の今ある席）、監査 = devauditor、統合 = suite-lead。保護面は Owner。 [TF-Q3][TF-Q4][AH-Q4]
- この会話は Inception の最後まで進める。設計の段は、ARC が書いた設計をこの会話で確認・承認する。 [TF-Q6]
- この記録は shirube の席が Owner の clone から写して PR にし、devauditor の監査と suite-lead の統合を通して GitHub に載せる。公開の repo のため、載せる前に秘密・個人の情報・機械の名前がないことを確かめる。 [AH-Q1][AH-Q5]

## 進める・止めるの勧め

**進める（条件付き）。** 上の実現性の 4 条件を守り、Inception（次は Reverse Engineering）に進む。 [FE-Q3][FE-Q8][FE-Q9][FE-Q10]

## Assumptions & Open Questions

- [assumption] 主な指標の今の値を測る期間と、「半分」を判定する時点は、まだ決まっていない（意図の記録から引き継ぎ）。
- [assumption] 誤って止めた件を判定する人は、まだ決まっていない（体制の段から引き継ぎ）。
- [assumption] 記録を載せる PR の時期は、設計（aidlc-include.md）の順に従う、という arc の下書きを Owner が要約の確認で確定したもので、具体的な日にちはない。
