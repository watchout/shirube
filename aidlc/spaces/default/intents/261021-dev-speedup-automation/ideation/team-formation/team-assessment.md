# 体制の評価（Team Assessment）: 開発の高効率化・自動化による高速開発化

出典の書き方: `[IC-Qn]` は Intent Capture、`[FE-Qn]` は Feasibility、`[SD-Qn]` は Scope Definition、`[TF-Qn]` は `ideation/team-formation/team-formation-questions.md` の答え。TF-Q1・Q2・Q4・Q5 は arc の下書きを Owner が要約の確認で確定したもの。

## 参照した入力

- `ideation/scope-definition/scope-document.md`（範囲 IN-1〜IN-10、完了の条件 S1-SH-01〜07）
- `ideation/scope-definition/intent-backlog.md`（項目 IB-1〜IB-7、条件 IB-C1・C2、Owner の決定が要る点）
- `ideation/feasibility/feasibility-assessment.md`（結論の条件 C1〜C4、リスク）

## この取り組みの位置づけ

- Shirube の S1 を含む、より大きな取り組み。S1 の条件 S1-SH-01〜07 に、計測・設計と実装のずれの検査・誤って止めた件の記録・Onza への配布を足したもの。 [TF-Q1][SD-Q1][SD-Q6]
- この AI-DLC の記録は、Shirube の S1 の Inception の記録も兼ねる（答えに書かれた出典: iyasaka-arc#49 6308461447）。 [TF-Q1]
- この会話（Owner が手で回している AI-DLC）は、Inception の最後まで進める。設計の段は、ARC が書いた設計をこの会話で確認・承認する（Approval & Handoff での Owner の依頼により B から C に変更）。 [TF-Q6][TF-Q3]

## 使える席と空き具合

| 席 | 役割 | 空き具合 | 出典 |
|----|------|----------|------|
| Owner | 範囲と優先順位の大枠を対話で決める。保護面（必須検査など）を決める。この会話の答えと承認 | 時間は AUN・Onza・Kusabi・OmotenasuAI の AI-DLC の会話と取り合う | [IC-Q12][FE-Q8][TF-Q2] |
| ARC | 設計（この会話の記録を入力にする）、細かい順番 | 答えでは確認していない | [TF-Q3][IC-Q12] |
| shirube の席 | Shirube の実装 | 待機中（配布キットの作業指示 v5 を止めて待っている） | [TF-Q3][TF-Q5][TF-Q2] |
| aun の席 | AUN の実装 | 待機中 | [TF-Q3][TF-Q5] |
| spe-dev | 実装席の 1 つ | 待機中 | [TF-Q5] |
| devauditor | 監査（作者と独立） | 答えでは確認していない | [TF-Q3] |
| suite-lead | 統合（作者と別の席として。監査 PASS・head の一致・必須の検査がそろえば毎回聞かない） | 待機中 | [TF-Q3][TF-Q4][TF-Q5] |

## 容量の割り当て

| 対象 | 割り当ての考え方 | 出典 |
|------|------------------|------|
| 席 | 待機中の席で最初の版の作業を受けられる | [TF-Q5] |
| Owner の時間 | 1 周で 6 回まで（S1-SH-07）。ほかの AI-DLC の会話とも取り合うため、決定は前もってまとめて 1 回で済む形にする | [SD-Q6][TF-Q2][FE-Q8] |
| 取り合う取り組み | OmotenasuAI の規格の整備。shirube PR #64 は統合済みで取り合わない | [TF-Q2] |

## リスク

| リスク | 影響 | 出典 |
|--------|------|------|
| Owner の時間がほかの AI-DLC の会話に取られ、この取り組みの承認や決定が待ちになる | Owner の手 6 回の上限と、統合までの時間に響く | [TF-Q2][SD-Q6] |
| shirube の席が止めている配布キットの作業指示 v5 と、この取り組みの配布（IN-10）がぶつかる | 同じ所に二重に手が入る | [TF-Q2][SD-Q1] |

## Assumptions & Open Questions

- [assumption] ARC と devauditor の空き具合は、答えでは確認していない。
- [assumption] Onza に Shirube の版を入れる作業をどの席が担うかは、答えでは確認していない。
