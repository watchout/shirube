# U1 — Observability Requirements

## Sources and Scope

[確認済み要約](nfr-requirements-questions.md)、[functional-spec](../functional-design/functional-spec.md)、[entities](../functional-design/entities.md)、[rules](../functional-design/rules.md)、[共通契約](../../../inception/contract-design/contract-summary.md)に従う。本書はNFR5.2/NFR9.1/NFR9.2の主担当文書。既存JSON/exit/公開可能な診断と対象参照を使い、新しいdashboard/分散trace基盤/外部通知/常駐監視は追加しない。

## Result Traceability and Monitoring Requirements

| ID | 要件と合格条件 | 不合格/後段の検証 |
|---|---|---|
| NFR5.2 | E03/C01/C03および後続C05/C07へ完全assessmentをinlineで渡し、非保証・knownRemaining・evaluationScope・同梱observationsへの一意参照を保持。元評価と相違すれば拒否 | FD-T06〜08/20で必須field欠落/固定値改変/残件の空化/別target/不明参照/参照だけの省略を拒否。source scopeをAUNへ書き換えない |
| NFR9.1 | JSONとテキスト診断で対象、確認済み/不足/不一致/不能、原因、正当な次操作、保証範囲を区別できる | FD-T01/17で色のみ/生エラーのみの説明を避け、未確認を確認済みとしない。前処理診断を配布可能な完全assessmentと呼ばない |
| NFR9.2 | legacy READY不足のstage/unit/attempt/承認参照/日付/revisitOnReopenをPASSでも保持し、未評価の残件は未評価と示す | FD-T06/12〜15/20。過去5不足に必須集合を固定せず新完了承認を反映し、初回/追加/AUN全体完了へ拡大しない。対話表示の実装はU2/U6 |

形状/固定値はentitiesと共通契約を参照する。完全envelopeはhead/outcome/reasons/authorizationとassessment/evaluationScope/observationsを持つ。非保証のfieldを省略せず、authorization NONEを別値へ変えない。ObservedSnapshotには供給者が得た公開可能metadataだけを載せ、生bodyを出さない。observationRefが同梱値へ解決できなければ、既存規則に従い構造拒否またはUNKNOWNで閉門する。新しい参照取得サービスは作らない。

## Logging and Diagnostic Standards

判定核は既存規則の対象/理由codeを返し、adapterはそれを同じ意味でJSON/テキストへ輸送する。記録の発行元真正性/Owner本人/実review実施を保証した表現を出さない。公開記録/実bytes整合と、既存独立監査が記録を読む補完を区別する。

診断には取得失敗の段階と、対象不明/権限拒否/部分取得/予算超過/入力不正等の原因を識別できる情報を残す。私的path、秘密、生review body、人返信は書かない。head/base/digest未観測では完全assessmentを作らず既存診断/exit1。未観測値を宣言値や空集合hashで埋めない。既存原本/履歴の保存先や保持期間を変更しない。

残件表示の固定READY日付/再開/再承認判定はBR3.1〜3.4が正本。閾値前の不足はnonblockingでも保持し、閾値後不足や日付不明を残件へ移して通さない。現在checkpointの非空必要集合から判断し、未来CodeGen/Build and Test/CI完了承認を先取り要求しない。過去観測の不足数を現在の不足数と断定しない。

## SLIs, Alerting and Dashboards

今回確認する指標は、一回の実評価の完全性、理由/exitの一致、必須fieldの保持、非保証/残件/scopeの一致、秘密/対象外読書き0、有限停止である。新しい稼働率/遅延SLOや集約監視を作らない。失敗時は既存CIの不合格と診断で停止を示す。人待ちを一回通知した後の再通知/自動効果/後継記録は追加しない。

## Cross-Unit Contracts and Verification

U1はE03/C01/C03の供給と同じenvelopeの境界検査を実装する。U4は同対象の信頼版2センサーを実CIで実行し、C05で結果と元評価をU5へ渡す。U5→U7のC07も同じ非保証/残件/元scopeを保持する。U5/U7の実受渡し・実適用・AUN実PRの別評価は後続単位が実証する。U1境界fixtureだけで実適用済みとしない。

E05は**U2/U6→LLMテキスト対話**が正しい共有契約。FD W06の別の説明は凍結済み上流の未解消Minor R-01として保持し、本書で解決済み/新境界追加としない。独立監査/公開判断はE01等とBR6.1/BR9.1の別条件であり、対話adapterに権限の判断を移さない。

FD-T01/06〜08/12〜15/17/20へ結ぶ後段のassertを必要とする。結果の保持/診断/実CIの確認はまだ実施していない。

## Assumptions & Open Questions

None.

保証範囲と追跡先は確認済み。実対象の観測結果が無い項目を確認済みへ変換しない。
