# U1 — Logical Components

## Sources and Scope

[確認済み計画](nfr-design-questions.md)、[tech-stack-decisions](../nfr-requirements/tech-stack-decisions.md)、[functional-spec](../functional-design/functional-spec.md)、[FD規則](../functional-design/rules.md)、[entityモデル](../functional-design/entities.md)、[共通契約](../../../inception/contract-design/contract-summary.md)、[components](../../../inception/domain-design/components.md)を使用する。本書はSOL3/SOL8/SOL9の定義と、6設計文書をInfrastructure Designへ渡す論理的な配置制約を担う。新しい製品部品/単位/物理サービスを追加しない。

## SOL3 — 固定規則と純粋核

**対応:** NFR2.3、NFR5.1、NFR10.1。**責任:** ConformanceGate。周辺I/OはEvidenceCollection等の既存責務。

1. 信頼する呼出側で検査版/規則版、固定stage graph/出力一覧、有効計画、対象単位、評価checkpointを解決する。PRのchecker/必須集合/exclude/severityを実行や適用条件の正本にしない。具体pinの置き場/CI結線は後段で決める。
2. 必要slot/承認kind/stage subsetを、掲載projectionとは別の入力として核へ渡す。初回Inceptionを含む必要stage/artifactは非空。現在実施済みのcheckpointを求め、未来CodeGen/Build and Test/CI完了承認を先取り要求しない。
3. now/ID/PR観測/公開記録/予算結果を明示入力し、核はI/O/時計/乱数/UUIDを取得しない。対象・承認・READY・digest・監査・集約・理由の意味はFD規則の一つだけを使う。
4. adapterはnative掲載前変換と公開wire/表示の形式を運ぶ。肯定値の自由文推測や、別LLM用の独立判定は作らない。CIは公開viewと実PR観測を検査し、private原本の取得を必須にしない。
5. 完全結果に非保証とauthorization NONEを保持し、進行/merge/保護対象変更の許可へ昇格しない。既存独立PR監査/作者受領/別担当統合/公開Owner判断は別条件のまま。

同じ明示入力は同じ意味/理由/結果となり、同義adapterでも一致する。raw bytes変更時は実観測のhashが変わり不一致となる。globalとstage subset、自己参照除外、native fingerprintとの違いはBR4を参照する。

## SOL8 — 版と互換の受入境界

**対応:** NFR8.1、NFR8.2、NFR10.1。**責任:** 既存entry/読取周辺の版解決と、共通境界の型検査。

呼出側の検査版/規則版/schemaと入力Target/head/内容集合を評価へ結ぶ。schema IDの既存majorと必須型/enumを確認し、未知major/criticalは閉門。optional説明は既存extensionsへ限定し、判定や権限を上書きさせない。意味変更は契約の新旧同居/試験した逆向き/該当Owner判断を通し、必須fieldの削除やnullable化を黙って行わない。

既存ESM/Node >=22宣言/Node組込み試験/実行時npm依存なし/JSON-exit契約を維持する。古いCodeKBのroot Node22とmain Node26/coverage80%、開発依存のpatch下限はbaseline観測であり現環境の実測保証ではない。対象lockfile/runner/道具/検査版を後段で確認し、clean checkoutで再現できるよう版と結果を結ぶ。Claude/Bun前提のmain部品をCodex対応済みとしない。新runtime依存/自動update/新CLIは追加しない。

## SOL9 — 検証できる境界

**対応:** NFR1.1、NFR1.2。**責任:** 既存論理境界に沿う後段の検証設計。

| 検証境界 | 注入/観測するもの | 必要な確認 |
|---|---|---|
| 純粋核 | 明示now/ID/固定規則/架空観測 | 同入力/同義入力の一致、実bytes変更時不一致、四条件と理由 |
| 取得adapter | 架空応答/page終端/時計/中断/拒否 | 有限停止/完全性/資格情報の受渡し/境界外読書き0 |
| 掲載変換 | 許可されたnative形式を模す架空単体入力 | canonical kind/choice対応、一般質問/自動/skippedから人承認を作らない |
| 公開出力 | 元結果とserialize/decode view | 非保証/残件/scope/参照保持、部分結果非消費 |
| 既存entry/実PR接続 | JSON/exitと実取得からCI不合格まで | 負例門exit1、runner成功との区別、mockだけの完成拒否 |

Node組込みTDDで失敗→実装→合格を残し、核/変換/adapter/entryを含むscriptsと適用srcの実行コード集合/分母/コマンド/結果を明示して行網羅率100%を実測する。除外はPR理由と独立確認を要し、分母0/未測定/skip/80%へ緩めない。FD-T01〜20を既存BRと対応させる。private実データをfixture化せず公開は架空だけ。SEC-T/依存追加前脆弱性確認/最小権限を維持する。

## Component Inventory, Ownership and Isolation

| 既存component | 所有entity | U1に適用する設計/故障境界 | 他単位へ残す責務 |
|---|---|---|---|
| EvidenceCollection | ObservedSnapshot、PublishedRecordProjection | SOL1/2/4/5/8/9。実取得・公開変換・評価分離。不完全取得で当該評価を閉門 | 外部原本の正式所有を取り込まない |
| ConformanceGate | ConformanceAssessment | SOL3/5/7/9。明示入力の核/集約/完全結果。不明や欠落を許可へ変換しない | 正式stage state/権限を発行しない |
| DialogueExperience | ConfigurationDraft、GuidanceSelection | U1結果の意味を変更しない消費境界 | U2/U6の設定/案内/LLM対話 |
| NativeAIDLCConnection | NativeOperation | C01で受けた判定だけで他条件を省略しない | U3の正規開始/停止/照会 |
| SensorVerification | SensorResult | C03でU1対象/観測/結果を受け、別結果として扱う | U4の信頼版2センサー実CI再実行 |
| KitDistribution | DistributionRevision、DistributionAssessment | C05/C07で非保証/残件/source scopeを保持 | U5の実導入/初回、U7の実配布/実PR正負/drift |
| SafeOperationControl | OperationAttempt | 既存停止の意味を維持し、U1へ新効果を追加しない | U3/U5の同一要求/照会/冪等性 |

U1で具体化するentityは前2行の3つ。shape/refsはFD entitiesを参照し、新DB/table/migrationやentityを増やさない。上記solutionは既存部品内の制御であり、独立deploy/新serviceを示さない。共有資源は固定した規則/契約と明示的に渡す観測/結果で、共有mutableな評価状態は持たない。失敗の影響は当該評価の閉門へ限定する。

## Infrastructure Design Handoff

| 後段で具体化する事項 | 必須制約 |
|---|---|
| 既存entry/ソースの配置 | U1はU2/U3なしで実PR読取→核→CI停止まで接続。新CLI/第二のengineを作らない |
| 検査版とPRデータの分離 | 呼出側が信頼版を解決し、対象PRから制御核を実行しない。必須集合/理由/閾値の意味を別実装しない |
| metadataとtest/build | read-only読取資格情報の受渡し先を絞り、test/汎用buildへwrite資格情報を渡さない |
| 設計監査受付とU1門 | 既存受付mandatoryを未取得U1 PASSへ依存させない。既存必須検査/保護設定を勝手に変更しない |
| 実装/試験/受渡し | SOLとFD-Tを実コードへ対応し、実PR/実CIを後段で検証。U4/U5/U7の実結果をU1で済ませたとしない |

7単位/7依存辺/U1先行とOwner指定順を維持する。U1→U4を含むruntime反映の正式経路は未成立の既存残件であり、U1終了時に席が確認し、無理ならU4前にOwnerへ相談する。偽辺/改名/state/cache/jump/engine変更で回避しない。

## Provenance, Alternatives and Verification Status

旧componentsの発行元真正性要求は、後の承認済み契約による非保証+既存独立監査補完を適用する。FDのE05誤記は未解消の上流Minor R-01。正しいE05はU2/U6のテキスト対話であり、独立監査/公開判断はE01等の公開原文読取とBR6.1/BR9.1へ対応する。凍結上流を更新しない。

新host/供給者/認証証明、共有cache/常駐watcher、PR側の制御核、別の判定実装は採らない。既存規則/所有を維持する具体方法を選び、実装・性能/coverage・SEC-T・実CI・後続配布は未実施として残す。S1〜S9の既定/例外/report-only、1単位1PR、実装前設計監査/独立実装監査/作者受領/必要公開判断/別担当統合を維持する。

## Assumptions & Open Questions

None.

新しいOwner仕様判断はない。配置と実装計画、実環境の適合、実試験と受渡しは後続工程で具体化・検証する。
