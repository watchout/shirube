# U1 — Performance Requirements

## Sources and Scope

[確認済み要約](nfr-requirements-questions.md)、[機能仕様](../functional-design/functional-spec.md)、[機能規則](../functional-design/rules.md)、[共通契約](../../../inception/contract-design/contract-summary.md)に基づく。対象は実PRを読む一回のCLI/CI評価であり、常駐サービスの性能要件ではない。本書はNFR6.1の主担当文書。他の詳細要件は各主担当文書を参照する。

## Response Time Targets and Latency Budgets

| ID | 要件と合格条件 | 不合格条件 | 後段の検証 |
|---|---|---|---|
| NFR6.1 | 共通契約AdmissionContextとFD rulesのpolicy.budgetに従い、全必要page/path/blob/commentを有限予算で取得する。I/O側で経過・取得数・応答bytes・完全性を観測する | 予算超過/欠ページ/拒否/timeout/cancel/途中head変更を部分成功にしない。UNKNOWNまたは前処理診断で閉門 | FD-T17に結ぶ明示時計/adapter境界試験で各予算の到達/超過を再現し、停止とexit1を確認する |

既存profileの参照値は、1取得20,000ms、総外部照会120,000ms、最大100取得、1応答8,000,000bytes、自動再試行0。値の正本は上記契約/規則であり、本書に別の設定源を作らない。PR/配布先の値による拡大や無限化は認めない。

この予算は**外部照会を停止させる上限**であり、CLI全処理の遅延/SLA、CPU/memory使用量、p95の実測保証ではない。外部応答を待つ時間と、parse/hash/出力を含む実測時間を混同しない。未計測の遅延目標を追加しない。

## Throughput and Resource Constraints

- RPS/並列数/大量PR処理のSLOは採択しない。最大取得数はAPI page/blob等の読取回数であり、PR数やartifact数の保証ではない。
- 応答bytes上限を全体メモリ上限と称さない。必要集合が増えた際の扱いは[容量要件](scalability-requirements.md)を参照する。大きい入力を黙って切り捨て、分母や必須集合を縮めて成功させない。
- 同じ観測入力の決定性は[技術選択 NFR5.1](tech-stack-decisions.md)、停止後の再試行0は[信頼性 NFR6.2](reliability-requirements.md)が正本。

## Benchmarks and Acceptance Evidence

後段では、対象repo/PR/head、必要集合、検査版、実行環境、入力bytes、取得数、完全性、計測方法と結果を紐付ける。正例は予算内に全取得して既存四条件を評価できること、負例は必要取得が終わる前に上限へ達したとき閉門することを確認する。FD-T17の架空観測/遅延試験と、U1の実PR取得からCI停止までの統合確認を分ける。架空時計による停止規則の試験を実環境の性能測定と呼ばない。

実性能/容量の測定は未実施。予算不足が判明すれば対象と影響を示し、検査版の変更として扱う。閾値を黙って緩めない。未観測digest/headの診断境界は[信頼性 NFR4.1](reliability-requirements.md)を参照する。

## Assumptions & Open Questions

None.

外部照会予算以外の新しい性能SLOを必要とする採択要求はない。実測結果が必要となる後段は未完了である。
