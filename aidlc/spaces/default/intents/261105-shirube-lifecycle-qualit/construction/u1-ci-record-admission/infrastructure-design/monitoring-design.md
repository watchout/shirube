# U1 — Monitoring Design

## Sources

[確認済み要約](infrastructure-design-questions.md)、[observability-design](../nfr-design/observability-design.md)のSOL7、[reliability-design](../nfr-design/reliability-design.md)のSOL5/6、[performance-design](../nfr-design/performance-design.md)のSOL1に基づく。入力の公開境界は[security-design](../nfr-design/security-design.md)、形状/意味は[FD entity](../functional-design/entities.md)・[FD規則](../functional-design/rules.md)・[共通契約](../../../inception/contract-design/contract-summary.md)を参照する。配置は[infrastructure-specification](infrastructure-specification.md)、CI停止と監査受付は[cicd-pipeline](cicd-pipeline.md)。

一回の実PR評価を、既存entryのJSON/exitと既存CI表示で観測する。新dashboard/分散trace/集約監視/外部通知/保存期間/稼働率SLOは追加しない。以下は未実装の観測設計であり、製品試験や実CIの結果ではない。

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| 四条件のoutcomeと理由 | 単一核→既存entryのassessment | 4条件の既存集約規則に従う。FAIL/UNKNOWNは閉門 | 既存判定1〜3やU4結果を混ぜず、原因を対象へ対応させる |
| 必要集合/実取得の完全性 | evidence周辺のpage終端/必要path/tree/blob/公開原文の実観測 | 全必要取得が揃うこと。欠page/未取得を0件へ変換しない | 宣言flag/部分集合を完全観測と誤認しない |
| 取得予算の消費 | I/O側の明示時計/取得数/受信bytes | FD rules `policy.budget`。参照値は1取得20,000ms/総120,000ms/100取得/1応答8,000,000bytes/retry0 | 有限停止の検証。CLI遅延や全体メモリの保証ではない |
| 読取前後の対象一致 | 実PR repo/番号/head/baseとTarget/attempt | 同じ評価のscopeが一致。途中変更なら古いPASSを出さない | 別head/評価の応答混在を拒否 |
| 元結果と輸送viewの一致 | envelope共通検査 | 必須field/非保証/残件/scopeが元評価と一致 | 形式変換で権限や保証を増やさない |
| observationRefsの解決 | 同梱observationsの公開metadata | 各refが同scopeのobservationIdへ一意に解決 | dangling/重複/別scope/参照だけの省略を拒否 |
| legacy READY残件の保持 | 実評価のknownRemaining | 元結果のstage/unit/attempt/承認参照/日付/revisitOnReopenを保持 | nonblockingを解消済みや残件0へ読み替えない |
| 非公開/秘密/対象外I/O | 公開projection・診断と後段synthetic境界試験 | 秘密等の転記0、境界外読書き0 | 公開repoへ内部原本や実データを持ち出さない |
| JSON/outcomeとprocess終了 | 既存entry/CI stepの実結果 | 完全PASSはexit0。必須FAIL/UNKNOWN/前処理失敗はexit1 | test runner成功と負例門の拒否を区別 |
| 適用実行コードの行網羅率 | 後段のNode組込み試験と対象一覧/計測結果 | scriptsと適用srcを含む実分母100%。除外はPR理由と独立確認 | 部分集合/分母0/未測定/skipを成功にしない |

予算の正本は既存契約/FD規則であり、監視用の別設定源を作らない。取得数はPR数/artifact数の処理能力ではない。実性能・CPU/memory・入力増加時の成立範囲は後段で対象版/方法と共に実測する。

## Alerts

この表のSeverityは当該評価の扱いを説明するもので、新しい通知階級や当番制度ではない。CIログと不合格表示を使い、外部通知/自動issue作成/status投稿をU1へ追加しない。

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| 四条件不成立 | 必須FAILまたはUNKNOWN | 当該評価停止 | 当該PRの既存CI表示/公開診断を読む作る席 |
| 取得不能/予算到達 | 欠page/拒否/中断/応答上限/最終照合不能 | 当該評価停止 | 同じCI表示。診断は対象/取得段階/理由を示す |
| 結果破損/対象変更 | envelope欠落/改変/参照不能、前後head/base不一致 | 結果消費停止 | 同じCI表示と下流の既存停止経路 |
| legacy READY不足 | 閾値前不足と確認でき、他条件を満たす | nonblocking残件 | 完全結果のknownRemaining。自動再通知しない |
| 人の判断が必要 | 正当な次操作が人入力/公開判断待ち | 一回通知後停止 | 既存の人待ち表示。待機中の再評価/成果物/後継記録なし |

設計監査未取得のdesign-only headをPASSへ変えない。監査受付の既存CIを動かせることと、U1評価が閉門していることは両立し、通知色だけで統合を許可しない。

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| 完全な一回評価/停止の整合 | 新しい稼働率/遅延SLOは非適用。必要観測・条件・終了契約で合否を判定 | 一回の対象PR評価 |
| 非保証/残件/scope/参照の保持 | 元評価と完全一致という既存受入条件。新しい率の目標は作らない | 一回のserialize/decode/消費境界 |
| 外部読取の有限性 | SOL1の停止予算。計測済み性能SLAではない | 一回の評価に属する全外部読取 |
| 秘密転記/対象外I/O | 既存受入条件の0件。常時監視済みとはしない | 後段の各synthetic正負試験/対象CI評価 |

新しいp95・稼働率・復旧時間・測定窓を補って記載しない。未観測/未測定は未確認とし、0件成功へ読み替えない。

## Logs & Tracing

| 項目 | 出力先/内容 | 公開/保持境界 |
|---|---|---|
| 完全評価JSON | 既存entry stdout→当該CIログ。E03のhead/outcome/reasons/authorizationと完全assessment/evaluationScope/observations | 公開可能metadataだけ。同梱観測へ一意に解決。生body/私的pathを含めない |
| テキスト診断 | 既存entry/CIで対象・確認済み/不足/不一致/不能・原因・正当な次操作・保証範囲を示す | 色/生stacktraceだけに依存せず、人返信/秘密/生review bodyをechoしない |
| 相関 | repo/PR/head/base、Target、規則版、checkpoint、観測参照 | now/IDは呼出側の明示入力。新UUID生成を核へ入れず、新trace serviceなし |
| 実行版/入力対応 | 固定tools/規則/runner/lockfile/実入力集合と実結果の対応 | 宣言pinや過去cacheを実適用/実測へ写さない |
| 集約/保存/dashboard | 既存CI/PRとGit記録を利用 | 新保存先/保持期間/常駐集約/dashboard/分散traceなし。現在の実保持設定は未観測 |

### Complete Result and Diagnostic Boundary

**対応:** NFR2.3、NFR4.1、NFR5.2、NFR9.1、NFR9.2。

| 状況 | 出力/消費規則 |
|---|---|
| 必須fieldを実観測で安全に構成できる | 共有形状の完全assessmentをinline出力。`assurance=record-and-current-content-consistency-only`、`engineAuthenticity/ownerIdentity/reviewerExecution=not-verified-by-gate`、`authorization=NONE` をPASSでも保持 |
| 元評価から輸送する | 同じ境界検査で対象/条件/理由/非保証/knownRemaining/scope/同梱参照を比較。削除/固定値変更/残件空化/別対象を拒否 |
| head/base/実blob不足でdigestが作れない、公開viewが不正 | 既存失敗診断とexit1。有効ConformanceAssessment/AdmissionEnvelopeを出さず、配布・下流消費へ渡さない |
| 必須fieldは揃い、一部条件だけ観測不能 | 全形状を安全に構成できる場合だけ、当該条件UNKNOWNを持つ完全assessment/exit1 |
| 残件未評価 | 未評価と明示。既知残件を保持し、`knownRemaining: []` を合成して残件なし確認済みにしない |

空hash/宣言hash/架空hashを実digestの代用にしない。必須head/base/Sha256のnullable化や下流のdefault補完で診断を完全結果へ変えない。正当な残件0件は元評価に根拠がある場合だけ保持する。

### Approval and Remaining Work Visibility

READYの日付とkindの意味はBR2/BR3を参照する。固定Asia/Tokyo/2026-11-06含むstage-completion承認日を用い、plan/summary/掲載日を代用しない。閾値前不足だけはnonblockingでも残件に残し、日付不明/矛盾や閾値後不足をlegacyへ移さない。原承認と再承認/再開は分け、古い日付へ畳み込まない。

必要READYが根拠付き0件でも、全承認日の確認と非空の必要stage/artifact集合は残る。過去5不足を現在集合に固定せず、新たに完了承認した段を次の評価へ加える。現在checkpointより未来のCode Generation/Build and Test/CI完了承認は要求しない。

## Cross-Unit Result Propagation

| 境界 | 保持する内容 | 後続に残す実証 |
|---|---|---|
| C01 U1→U3 | 同Targetの完全assessment/必要contextと非保証 | U3の正式操作/他の権限条件 |
| C03 U1→U4 | 同対象manifest/context/完全assessment、観測scope | U4の実対象再取得と信頼版2センサー実CI |
| C05 U4→U5 | U4結果と元のU1完全結果・残件・scope | U5の導入/初回実完成 |
| C07 U5→U7 | 配布結果/戻し方と元評価の保証範囲 | AUN実適用/実PR正負/drift、同じ日付policy |

Shirubeのsource評価をAUN targetへ書き換えず、配布先を別参照で対応付ける。AUN実PRはその実対象で別評価する。CIはengine発行元/Owner本人/実review実施を証明しない。既存独立監査の記録読取による補完、作者受領、別担当統合、必要公開Owner判断は別条件のまま。

## Verification and Status

FD-T01/06–08/12–15/17/20を後段の元結果/輸送比較・負例assertへ対応させる。取得予算/拒否/中断/未知schema/秘密混入はsyntheticで再現し、実PR取得→核→CI停止の統合は別に確認する。Node組込みTDD/実分母100%/SEC-T/依存追加前脆弱性確認を保持する。U1のfixtureだけでU5/U7実受渡しを済ませない。

本段の文書センサーは文書の構造と追跡を扱う。製品実装/性能/coverage/SEC-T/実CI/実配布/実保持設定は未検証。FD上流Minor R-01のE05誤記は未解消で、正しいE05はU2/U6→LLMテキスト対話。独立監査/公開判断はE01等と既存権限条件へ対応する。

## Assumptions & Open Questions

None.
