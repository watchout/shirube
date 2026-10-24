# 制約の一覧（Constraint Register）: 開発の高効率化・自動化による高速開発化

出典の書き方: `[IC-Qn]` は `ideation/intent-capture/intent-capture-questions.md` の答え、`[FE-Qn]` は `ideation/feasibility/feasibility-questions.md` の答え。

## 参照した入力

- `ideation/intent-capture/intent-statement.md`（前提、範囲の目安、やらないこと）
- `ideation/feasibility/feasibility-questions.md`（この段階の答え）

## 技術上の制約

| ID | 制約 | 出典 |
|----|------|------|
| CT-1 | AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る | [IC-Q13] |
| CT-2 | 仕組みを動かす場所は、GitHub（Actions）とこの Mac 上の席だけ | [FE-Q2] |
| CT-3 | 必ずつなぐのは GitHub と各 AI の席（Claude Code・Codex） | [FE-Q1] |
| CT-4 | 最初の版は AUN に頼らない | [FE-Q9] |
| CT-5 | 最初の版では、新しい AI の席の追加や、AI-DLC 以外の新しい外部ツールの導入はしない | [IC-Q6] |
| CT-6 | 手戻りの回数は、GitHub の PR の記録から数える | [FE-Q3] |

## 組織上の制約

| ID | 制約 | 出典 |
|----|------|------|
| CO-1 | 必須検査・branch 保護・ruleset などの変更には Owner の決定が要る | [FE-Q8] |
| CO-2 | 最初の版では、本番・保護面（デプロイ、必須検査や branch 保護、DB スキーマ、資格情報）の自動化はしない | [IC-Q6] |
| CO-3 | 人の承認そのものは無くさない（承認の手間だけを減らす） | [IC-Q6] |
| CO-4 | OmotenasuAI の通常の開発は、規格の整備が終わるまで止まっている | [FE-Q8] |
| CO-5 | AUN と Shirube は、Owner が手で作り直している途中 | [FE-Q8] |
| CO-6 | 範囲と優先順位の大枠は Owner が対話で決め、その中の細かい順番は ARC が決める | [IC-Q12] |
| CO-7 | 記録の正本は GitHub の Issue・PR、chat には要点だけ | [IC-Q9] |
| CO-8 | 最初の版は、いま動いている Suite の製品で始め、OmotenasuAI は再開してから加える | [FE-Q10] |

## 規制上の制約

| ID | 制約 | 出典 |
|----|------|------|
| CR-1 | 個人情報を含む製品（宿泊者の情報など）のデータには触れない | [FE-Q5] |

## 費用と時期の制約

| ID | 制約 | 出典 |
|----|------|------|
| CB-1 | AI の利用料が増えるのは許容する。上限は後で決める | [FE-Q6] |
| CB-2 | 時期は決めず、完了の条件で区切る | [FE-Q7] |

## 見張りの上限（守る値）

| ID | 上限 | 出典 |
|----|------|------|
| CG-1 | 1 周あたりの Owner の手の回数は 6 回まで | [IC-Q4] |
| CG-2 | 正しい作業を誤って止めた回数は 0 | [IC-Q4] |
