# U2 — Scalability Requirements

## Sources and Scope

U2 の規模に関する要件。入力: [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)。[questions](nfr-requirements-questions.md) の要約確認 Looks correct。

U2 は 1 つの対話が 1 つの対象を読む、有限の一回ずつの処理で、常駐サービス・並列の自動実行・保存を持たない。要件に利用規模の根拠が無いため、負荷の予測・scaling の契機・容量計画の数値は置かない。

## Requirements

| ID | 要件 | 合否 | 後続分担 |
|---|---|---|---|
| NFR6.1b | 入力の大きさに有限の上限を置く（1 応答の大きさは共通の予算 profile、回答の長さ・項目数は BR5.1 の検査）。超えた入力は無言で切り捨てず、観測不能または rejected として理由を返す | 過大な file・過大な回答の負例で、切捨て成功 0・全体の停止 0 | 数値は共通の profile と置き場の設計（回答の長さの上限値は実装設計で確定） |
| NFR4.3 | 対話どうしで共有する可変の判定状態を持たない（根拠: Q2 = A で何も永続化せず、draft・回答は対話ごとの値。BR9.1 の明示入力）。各対話は target・draft・観測を分離し、別の対話の回答・draft を読まない | 2 つの対話を同じ process で回しても結果が混ざらない | 並列数・大規模負荷の SLO は追加しない |
| NFR6.1c | 項目数が増えても、同じ規則（BR3.1）で 1 項目 1 状態に決まり、予算内で観測できない分は成功範囲を縮めずに観測不能にする。項目の追加は、項目一覧に valueType と出典ごとの targetBinding・requiredForConfirmed を書く形で行い、書かれていない targetBinding は named（失敗側）として扱う | 項目の追加で既存の項目の状態が変わらない。targetBinding の無い出典が confirmed にならない | 項目一覧の拡張は FD の改訂と同じ手順 |

## Not Set (No Evidence)

利用者数・対話数・対象数の上限、スループット、scaling の契機、データ増加の見込み。U2 は何も永続化しないためデータ増加も無い（Q2 = A）。開いた形の固定の分類（F02）を観測の事実に足しても、保持するのは項目あたり 1 つの固定の値だけで、規模の要件は変わらない。

## Assumptions & Open Questions

None。規模の根拠が得られた時は要件の改訂として追加する。
