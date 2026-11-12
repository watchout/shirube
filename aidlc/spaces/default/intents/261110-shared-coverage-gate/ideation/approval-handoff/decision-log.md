# 共有の網羅率の門 — Ideation の決定の記録

## Sources

- 各段の回答: [intent-capture-questions.md](../intent-capture/intent-capture-questions.md)、[feasibility-questions.md](../feasibility/feasibility-questions.md)、[scope-definition-questions.md](../scope-definition/scope-definition-questions.md)、[team-formation-questions.md](../team-formation/team-formation-questions.md)、[approval-handoff-questions.md](./approval-handoff-questions.md)。
- 上流の成果物: [intent-statement.md](../intent-capture/intent-statement.md)、[stakeholder-map.md](../intent-capture/stakeholder-map.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)、[team-assessment.md](../team-formation/team-assessment.md)。
- Scope Definition・Team Formation・Approval & Handoff の回答は arc の答えで、Owner の言葉ではない（Owner の委任 [iyasaka-arc#49 6762288830](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830)、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609`）。

## 決定の一覧

| ID | 段 | 決定 | 根拠の回答 |
|---|---|---|---|
| D1 | Intent Capture | 指定9項目を満たす共有の門を目的とする。数え方や判定の重複を減らし、測れていないものを成功にしない | intent-capture の Q1 |
| D2 | Intent Capture | まず Shirube 内の架空の利用例で確かめる。実 repo への適用は別の判断 | intent-capture の Q2 |
| D3 | Intent Capture | 完成は、指定9項目の正例・負例が通り、不正な閾値や除外の拡大などを検出し、利用手順から commit 固定で呼べること | intent-capture の Q3 |
| D4 | Intent Capture | 全 repo 一括導入、社内基準と既存80%の変更、独自の計測器、既存 U1 への取り込みは対象外 | intent-capture の Q4 |
| D5 | Intent Capture | 利用者は社内製品の開発・CI担当。既存の分担（Owner・arc・Shirube 席・arc-sec・devauditor・suite-lead）を使う | intent-capture の Q5 |
| D6 | Intent Capture | 判断はこの会話で聞き、取り組みの記録と単位 PR で追える形にする。定例報告は置かない | intent-capture の Q6 |
| D7 | Feasibility | 保証する環境は既存の GitHub Actions の Linux のみ | feasibility の Q1 |
| D8 | Feasibility | 新たな有料サービス・常設クラウド資源は導入せず、既存 CI で実証する | feasibility の Q2 |
| D9 | Feasibility | 今回固有の追加条件はなく、採択済みの社内基準に従う | feasibility の Q3 |
| D10 | Scope Definition | 指定9項目すべてを Must とする | scope-definition の Q1 |
| D11 | Scope Definition | CI の実行の絞り（S10）を別の単位として Must に入れる。根拠は [iyasaka-arc#49 6787499810](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6787499810)、[iyasaka-arc#24 6791240627](https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6791240627) | scope-definition の Q2 |
| D12 | Scope Definition | `labeled`・`unlabeled` は範囲では決めず、設計の段で `gate.mjs` の実読と負例で確かめる。判定に効くなら外さない | scope-definition の Q3 |
| D13 | Scope Definition | S10 を最初に置き、その後はリスクの高いものを先に確かめる | scope-definition の Q4 |
| D14 | Scope Definition | 外から決まった完了の条件は3つ（新依存、保護対象の別承認、kit の版上げの別判断）だけ | scope-definition の Q5 |
| D15 | Scope Definition | 目的の対象外と追加の依頼の「含まないもの」を Won't にする | scope-definition の Q6 |
| D16 | Team Formation | 競合する取り組み（U1、Tsumama の版上げ、aun・onza の後続の版上げ）を踏まえ、kit の版を出したら arc に知らせる | team-formation の Q1 |
| D17 | Team Formation | 作る席1席が全単位を順に作る。サブエージェントは承認済みの範囲の AI-DLC の役だけ | team-formation の Q2 |
| D18 | Team Formation | 決める人の表。各 repo の workflow の変更は、その repo の作業場の席が作り、CTO と arc-sec は差分を読む | team-formation の Q3 |
| D19 | Team Formation | 足りない部分は、新依存は arc-sec と Owner、workflow は Owner の承認で補う | team-formation の Q4 |
| D20 | Team Formation | 監査・統合の席の負荷は通常の流れのまま | team-formation の Q5 |
| D21 | Approval & Handoff | 最初の単位の PR に Ideation の記録も含める（`audit/` と `.aidlc-engine/` は除く）。issue #6 には要約1件。入れる前に非公開の識別子・code・席の model 名が無いことを grep で確かめる | approval-handoff の Q1 |
| D22 | Approval & Handoff | 重大リスク4つを承知して進める | approval-handoff の Q2 |
| D23 | Approval & Handoff | 追加の予算・資源なしで進める | approval-handoff の Q3 |
| D24 | Approval & Handoff | 市場調査と Rough Mockups は適用外のまま Inception に進む | approval-handoff の Q4 |
| D25 | Approval & Handoff | go。Inception に進む | approval-handoff の Q5 |

## 飛ばした段

| 段 | 理由 |
|---|---|
| 市場調査（market-research） | 社内の開発基盤の改善で、外部の市場は関わらない。D24 で確認済み |
| Rough Mockups（rough-mockups） | 画面も API もない取り組み。人が見る出力は CI の通知と job summary の文面だけで、機能の設計で決める。D24 で確認済み |

## Assumptions & Open Questions

- [assumption] D1〜D6、D7〜D9 の回答者は、各段の questions ファイルに記録されたとおり。この一覧は回答の写しであり、新しい決定を加えない。
- Open: 新依存が承認されない場合の S1・B6 の扱い（Owner の判断）。
