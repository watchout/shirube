# U1 — Observability Design

## Sources and Scope

[確認済み計画](nfr-design-questions.md)、[observability-requirements](../nfr-requirements/observability-requirements.md)、[functional-spec](../functional-design/functional-spec.md)、[entities](../functional-design/entities.md)、[共通契約](../../../inception/contract-design/contract-summary.md)に従う。本書がSOL7を定義する。新しい分散trace/dashboard/常駐監視/外部通知先は作らない。

## SOL7 — 完全inline出力と診断

**対応:** NFR5.2、NFR9.1、NFR9.2。**責任:** EvidenceCollectionの同梱観測供給、ConformanceGateの結果/境界検査、形式だけの表示adapter。

1. 完全評価を作れるときだけ、元結果のTarget/rulesetVersion/入力digest/4条件/理由/必要参照/knownRemaining/非保証を完全ConformanceAssessmentとして供給する。形状/固定値はFD entitiesの正本を参照する。
2. E03はhead/outcome/reasons/authorizationにassessment/evaluationScope/observationsを必須で添える。観測のmetadataだけをallowlistで同梱し、private原本/bodyをコピーしない。
3. serialize/decodeの境界で同じ共有検査を使い、元評価と渡された四条件/非保証/残件/scopeの一致を比較する。固定fieldの欠落/別値、元残件の空化、別target/head、参照だけの省略は拒否する。元結果が不能ならdefault復元しない。
4. assessment.observationRefsを同梱observationIdへ一意に解決し、各観測の対象/版/評価scopeを照合する。dangling/重複/別scope/取得不能を成功にせず、新しい参照供給サービスへ迂回しない。
5. 非保証のengineAuthenticity/ownerIdentity/reviewerExecution、assurance、authorization NONEをPASSでも保持する。輸送hash一致や公開fieldの存在を発行元認証にしない。
6. knownRemainingは常に判定に対応するarray。正当な0件はその根拠がある場合だけ保持する。legacy不足はstage/unit/attempt/承認参照/承認日/revisitOnReopenを落とさない。未評価は前処理診断として未評価と示し、空配列にしない。

## Structured Diagnostics and Correlation

対象のrepo/PR/head/base、Target、規則版、checkpoint、観測参照で同じ評価へ追える形を用いる。識別子/時刻は呼出側の明示入力であり、新たな追跡serviceやUUID生成を核へ持ち込まない。

既存の理由codeに公開可能な対象/失敗段階/不足/正当な次操作を対応させ、JSONとテキストで同じ意味を示す。色だけ/生stacktraceだけに頼らず、秘密/人返信/私的path/生review bodyを原因文へechoしない。早期head/digest不能はSOL5の既存診断/exit1であり、配布可能な完全結果と呼ばない。

READYの日付/再開/再承認/current checkpointはBR1/BR3を参照する。固定Asia/Tokyo/2026-11-06含む閾値を変更せず、閾値前不足はnonblockingでも残す。後の再承認/実施済み見直しへ古い日付を継承せず、不明日/矛盾をlegacyへ移さない。必要READY0件でも非空必須記録と全承認日の判断を要する。過去5不足へ現在集合を固定しない。

## Cross-Unit Propagation

| 境界 | 供給/消費の設計 | U1で完了としないもの |
|---|---|---|
| C01 U1→U3 | 元の完全結果と必要なAdmissionContextを同じ対象で渡す | 正式開始/段操作/別の権限条件の充足 |
| C03 U1→U4 | 同対象のmanifest/観測/完全assessmentを供給し、U4が独立に対象再取得/2センサー実行 | U4の実CI再検査 |
| C05 U4→U5 | U4のSensorResultと元U1結果を欠落なく受け渡す制約を引き継ぐ | U5実導入/初回完成 |
| C07 U5→U7 | 配布結果/戻し方と元の非保証/残件/scopeを保持 | AUN実適用/実PR正負/drift |

source評価のShirube対象はAUN targetへ書き換えない。配布先は別参照で対応付け、AUN実PRはその実対象で別評価する。同じ固定READY policyを使う。U1の境界fixtureだけでU5/U7の実受渡しや全体完了を宣言しない。

## Metrics, Alerting and Verification

確認対象は一回の評価の完全性、理由/exitの一致、必要field/非保証/残件/scopeの保持、参照解決、秘密出力0、有限停止である。既存CIの不合格と診断を停止の表示とし、新しい遅延/稼働率SLOや通知基盤は追加しない。

FD-T01/06〜08/12〜15/17/20で元結果と輸送viewを比較し、削除/改変/別対象/未知参照を拒否する。後段U5/U7では実配布先で同じ境界を確認する。本段で製品試験/実CI/適用は実施していない。

## Assumptions & Open Questions

None.

既存履歴の保持期間/保存先や公開境界を変えない。E05誤記は上流未解消Minorで、正しいLLM対話の責務はU2/U6に残す。
