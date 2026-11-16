# U1 — Scalability Requirements

## Sources and Scope

[確認済み要約](nfr-requirements-questions.md)、[機能仕様](../functional-design/functional-spec.md)、[規則](../functional-design/rules.md)、[契約](../../../inception/contract-design/contract-summary.md)に従う。対象は一回のCLI/CI評価。新しい常駐サービス/DB/queue/多tenant基盤を前提にしない。本書はNFR4.2の主担当文書。

## Capacity, Concurrency and Growth

| ID | 要件と合格条件 | 負例/検証 |
|---|---|---|
| NFR4.2 | 各評価をtarget/head/base/attemptで分離し、読取前後のhead/baseを照合する。旧attempt/明示取消/競合/途中変更では古いPASSを再利用しない。正当な再評価は実対象を再取得する | FD-T07/08/11/15/17。別評価の観測を混ぜて完全結果にせず、旧応答/対象変更で停止する。共有mutableな判定状態を持たない |

PR/files/stage集合が増えても、必須集合を縮めたり部分取得を全取得と扱ったりしない。有限取得予算の正本は[performance-requirementsのNFR6.1](performance-requirements.md)。完全性を確認できない規模では観測不能として閉門する。最大取得回数をartifact上限やPR処理能力へ読み替えない。

## Load Projections and Scaling Triggers

採択済みの同時PR数/RPS/利用者数/大規模利用予測はない。新しい数値目標や自動並列化・増員・別runner・常駐処理は採択しない。評価単位の分離と有限な失敗が合否の対象である。

後段の実測で予算内完全取得が成立しなければ、その対象集合/件数/bytes/版と原因を残し、必要な変更を検査版・計画の差として扱う。根拠なしにメモリ/応答予算を無限化しない。応答bytes上限はプロセス全体のメモリ使用量保証ではない。

## Data Growth and Cross-Unit Boundaries

U1は正式AI-DLC stateや外部原本を所有せず、新DBの保全/バックアップ機構は非適用。既存履歴を改変せず現対象を再評価する。部分結果の無効化は[reliability-requirementsのNFR4.1](reliability-requirements.md)、schema同居/逆向きは[tech-stack-decisionsのNFR8.2](tech-stack-decisions.md)を参照する。

U4の信頼版センサー実CI、U5導入/初回完成、U7実配布/実PR正負/drift、U6実追加はそれぞれの単位が担う。U1の小さな評価を通しただけで、後続の容量やAUN受入も確認済みとしない。7依存辺/U1先行を変更せず、U2/U3をU1の前提にしない。

## Verification and Status

架空の複数target/旧応答/途中head変更を交差させ、各結果が元のscopeへだけ対応し、部分取得で成功しないことを後段でassertする。実対象の規模/性能測定と負荷試験は未実施である。

## Assumptions & Open Questions

None.

現在の採択範囲に新しい負荷目標はない。実測で確認できない範囲を対応済みへ拡張しない。
