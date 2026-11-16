# U1 — 非機能設計の生成前確認

## Sources and Scope

対象は `261105-shirube-lifecycle-qualit / u1-ci-record-admission / nfr-design`。Step1–3として具体的な方法と生成範囲を確認する。正式6文書とtraceabilityは要約確認の正式記録後に生成し、製品コード/fixture/試験/CIや配置変更は行わない。

正式8入力:

- [performance-requirements](../nfr-requirements/performance-requirements.md)
- [security-requirements](../nfr-requirements/security-requirements.md)
- [scalability-requirements](../nfr-requirements/scalability-requirements.md)
- [reliability-requirements](../nfr-requirements/reliability-requirements.md)
- [observability-requirements](../nfr-requirements/observability-requirements.md)
- [tech-stack-decisions](../nfr-requirements/tech-stack-decisions.md)
- [functional-spec](../functional-design/functional-spec.md)
- [contract-summary](../../../inception/contract-design/contract-summary.md)

補完は[components](../../../inception/domain-design/components.md)、同単位の[FD規則](../functional-design/rules.md)/[entity](../functional-design/entities.md)/[FD追跡](../functional-design/traceability.json)と[NFR要件追跡](../nfr-requirements/traceability.json)。本段定義を実読し、既読shared/architect knowledge10件と適用protocolを保持する。6要件文書を再読し、既読FD/契約の現在の決定を用いる。diaryは読取・編集しない。

旧componentsのCIによる原本真正性要求は、後の承認済み契約に従い機械整合+既存PR独立監査の補完へ置換して扱う。FD W06のE05説明誤記は上流の未解消Minor R-01のまま。正しいE05はU2/U6→LLMテキスト対話であり、独立監査/公開判断はE01等の公開原文読取とBR6.1/BR9.1の別条件として扱う。凍結した上流は変更しない。

## 既決・曖昧さの確認

通常の新規質問は **0件**。確認済みの19詳細NFRに対し、以下の9つの設計solutionを提案する。`SOL1`等は本段の追跡用設計IDであり、新しい部品・権限・工程名ではない。

四条件/非保証、READY適用日、固定必須集合、canonical承認値、有限予算、技術選択、7単位/7依存辺を再質問しない。数値不足を埋めるための新SLO/利用規模/保存期間/常駐監視は要求しない。具体配置/CI workflow結線/実装順・作る計画は後続Infrastructure Design/Code Generationの範囲と分ける。

## 具体的な設計案と代替

| Solution | 提案する制御方法と理由 | 採らない代替 |
|---|---|---|
| SOL1 有限な取得 | 読取周辺が開始時の取得予算と実経過/取得数/応答bytesを管理し、各取得前に残予算を確認する。1取得の待ち上限は残り総予算でも制限する。応答上限/期限/中断で取得を打ち切り、全page/tree/blobの完全性を確認するまで観測完了にしない。blobをraw bytesでhashし、宣言値を写さない | 成功までretry/無制限page取得/上限超過の切捨てPASS。別cache/CDN/queue/接続pool基盤を新設しない |
| SOL2 公開viewの境界検査 | 取得資格情報はmetadata読取周辺だけへ渡し、核とtest/buildへwrite資格情報を渡さない。重複keyを失わない構造検査を通常の意味検査の前に置き、版/型/enum/必須/unknown critical/pathを検査する。既存allowlistで公開viewを作り、外部文字列を実行せず表示escapingと内容bytesを分ける | JSON parse後に重複を見逃す、PR shell実行、生private receiptのCI供給、同UID fileやactor文字列を本人認証にする方法 |
| SOL3 固定規則と純粋核 | 信頼する呼出側が固定検査版/stage定義/有効計画/単位/current checkpointを与え、必要集合とPR記録を別入力で照合する。核はI/O/時計/乱数を持たず、now/ID/観測を明示入力する。4条件と理由の意味は既存ConformanceGateに一つだけ保つ。adapterは公開形式への変換だけ | PR側のchecker/必須集合/excludeを正本にする、LLMの自由文で承認を推測する、別adapterへ判定をコピーする方法 |
| SOL4 評価の分離 | 一回の評価のtarget/head/base/attemptと観測集合を呼出しごとに分け、共有mutableな判定状態を置かない。固定headのblobを読み、出力前にもhead/baseを再取得する。別評価の観測や古い応答を混ぜず、変更時は現評価を破棄して止める | 共有latest結果/cacheを現在値として流用、途中変更を自動追随して同じ評価として継続、負荷に応じた無許可並列化 |
| SOL5 完全結果と前処理診断の分離 | 構造/観測の検査を終えて全必須fieldが実物で構成できる時だけ完全assessmentを作る。head/base/実digest未取得は既存失敗診断/exit1で止め、配布可能結果にはしない。必須fieldが揃い監査原文だけ不能などの場合は完全assessmentでUNKNOWNを返せる。部分出力を下流でdefault補完しない | 架空/宣言/空集合hashによる穴埋め、Sha256のnullable化、未評価knownRemainingを空配列へ変更、条件を減らす設計モードPASS |
| SOL6 一回実行と停止 | 外部取得の自動retryは行わず、一回の結果/失敗を既存entryのJSON/exitへ伝播する。人待ちは一度通知後停止。正当な再評価時は新しく実物を読む。失敗/中断/skipを成功にせず、既存履歴/状態を変更しない | backoff loop/circuit-breaker常駐管理/health-check daemon/自動再開。U1はeffect再送をしないので冪等機構を追加しない |
| SOL7 完全inline出力と診断 | 元の完全assessmentとevaluationScope/同梱observationsを供給し、serialize/decode境界で同じ共有検査を使う。固定非保証/残件/四条件/対象が元結果と一致し、observationRefが一意に解決する場合だけ消費する。診断は対象/段階/理由/未評価を示し生bodyを出さない | PASS一語/参照だけの省略形式、新たな参照供給サービス、輸送hash一致を発行元認証と呼ぶ、source評価をAUN targetへ書き換える方法 |
| SOL8 版と互換の受入境界 | 呼出側の検査版/規則版/schema/対象と実行環境を評価へ結ぶ。既存major/optional extensionsだけを許し、未知major/criticalを閉門する。意味変更が生じる場合は既存契約の新旧同居/試験した逆向き/必要公開判断を通す。現在のNode/ESM宣言を維持し実環境対応は後段で確認 | manifest/古いCodeKBだけで全環境対応を保証、自動update/新runtime依存追加/新wire形式の先行採択 |
| SOL9 検証できる境界 | 純粋核への明示入力、読取adapterへの架空応答/時計入力、許可された掲載変換の架空単体入力、既存entryのJSON/exitを分けて試せる境界を保つ。FD-T01〜20と実PR統合を計画へ対応させ、scriptsと適用srcを含む実行コード集合を列挙する | private実データのfixture化、同じ実装だけをなぞるassert、runner成功を負例の門PASSとする、mock/文書だけの完成 |

SOL2の重複key検出や入力制限の具体実装は後段で既存処理を適合確認して作る。新しいparser依存/汎用schema frameworkをこの案で導入しない。SOL1の期限は外側の取得処理で適用し、核が自分で時計を読む形に戻さない。

## 性能・安全・循環の制御点

取得予算の数値正本は共通契約AdmissionContext/FD rulesのpolicy.budgetを参照し、1取得20,000ms/総外部照会120,000ms/最大100取得/1応答8,000,000bytes/自動retry0を維持する。これは外部照会を有限に止める設計であり、parse/hash/出力を含む全CLI性能、メモリ上限、throughput、稼働率の実測保証ではない。単一応答の制限を全プロセスの容量保証と呼ばない。

- 必須集合は信頼版と有効計画/current checkpointから求め、掲載stage/artifactは非空。過去5不足を固定集合にせず新たな完了承認を反映する。現在CodeGenの未来完了承認/未来Build and Test・CI承認を先取り要求せず、gate:falseのsummaryを人完了承認にしない。
- canonical承認値は既存BR2のkind別固定値だけを使う。否定/空/未知/誤kind/plan off/skipped/自動完了を人承認へ数えない。掲載前native変換は既存権限下、CIは公開viewと実PR観測の整合だけを検査する。
- READYはBR3の固定Asia/Tokyo/2026-11-06含む日付条件で照合する。stage-completion日を用い、旧不足のnonblocking残件/revisitOnReopenを保持。再承認attemptを元の古い日へ畳まず、不明/矛盾を自動免除しない。
- digestは固定headの実bytes、UTF-8 byte順manifest、global全集合とstage固定subsetの各scopeへ照合する。自己参照除外は固定規則だけ。掲載commit自身のSHAを事前要求する循環を作らない。
- 同PRのdesign-only head/ancestor/独立監査request-review/公開本文hash/現在設計の整合を照合する。設計変更で旧監査失効。既存監査受付CIを未取得U1 PASSへ依存させず、mandatory削除/条件を減らすPASSを作らない。具体workflow結線は後段で扱う。
- assessmentのengine真正性/Owner本人性/実review実施は非保証、authorizationはNONE。既存devauditorのPR独立監査・作者受領・別担当統合・必要公開Owner exact-headは別条件のまま。新認証証明/host/供給者は作らない。

## 19詳細要件との対応予定

| NFR ID | 具体設計solution | 代表的な確認方法 |
|---|---|---|
| NFR1.1 | SOL9 | 実行コード集合/分母/除外根拠とNode組込みTDD/実分母100%を後段で実測 |
| NFR1.2 | SOL9 | FD-T01〜20、核/adapter/既存entry/実PR統合を分けたassert |
| NFR2.1 | SOL2 | metadata資格情報の受渡し先確認、拒否時外部効果0/対象外読書き0 |
| NFR2.2 | SOL2 | 架空機密入力の公開転記0、適用SEC-T、依存追加前の脆弱性確認 |
| NFR2.3 | SOL3、SOL7 | PASS後も非保証/authorizationと別の権限条件を保持 |
| NFR3.1 | SOL2 | 重複key/未知major・critical/不正型/部分・過大入力/命令混入を拒否 |
| NFR3.2 | SOL2 | raw path保持、traversal/境界外参照/重複拒否、表示とhashの分離 |
| NFR4.1 | SOL5 | 早期取得不能で診断/exit1のみ、偽hash・nullable化・未評価残件空化0 |
| NFR4.2 | SOL4 | 別評価/旧応答/途中head変更で観測混入・旧PASS流用を拒否 |
| NFR5.1 | SOL3 | 明示入力の同一/同義結果と実bytes変更時不一致を確認 |
| NFR5.2 | SOL7 | 必須field/非保証/残件/scope/同梱参照を輸送前後で比較、sourceとAUNを分離 |
| NFR6.1 | SOL1 | 各取得上限/期限/欠ページ/途中中断で有限な閉門を確認 |
| NFR6.2 | SOL6 | retry0/人待ち通知1回/停止後効果・成果物0を確認 |
| NFR8.1 | SOL8 | 実対象と検査版/実行環境を結びclean checkout再検証 |
| NFR8.2 | SOL8 | 未知major・critical拒否、既存契約の互換境界維持 |
| NFR9.1 | SOL7 | JSON/診断の対象・状態・理由・次操作、完全resultとの区別 |
| NFR9.2 | SOL7 | legacy残件/未評価を保持、現在checkpoint/再開/再承認/配布先でも同じ意味 |
| NFR10.1 | SOL3、SOL8 | ESM/Node宣言/既存JSON-exit/単一核/実行時npm依存なしの維持 |
| NFR10.2 | SOL5、SOL6 | 必須FAIL/UNKNOWN伝播と設計監査受付の非循環を確認 |

NFR7は承認済みNFR要件で非適用のため、新しい詳細IDを作らない。U1の読取へ冪等キーを要求せず、効果ある操作はU3/U5の責任とする。

## 論理部品と後段への受渡し

7component/10entityの所有は変更しない。上のsolutionは既存部品内の設計であり、新しいservice/daemon/独立deployを意味しない。

| 部品 | U1の具体化と故障の影響 | 残す境界 |
|---|---|---|
| EvidenceCollection | SOL1/2/4/5/8の読取・公開変換・観測完全性。ObservedSnapshot/PublishedRecordProjectionを所有。取得不能/破損は当該評価を閉門し、正式state/他評価を変更しない | metadata資格情報はI/O側、公開viewのみ境界へ。private原本供給の新機構なし |
| ConformanceGate | SOL3/5/7/9の単一核・集約・完全結果検査。ConformanceAssessmentを所有。入力不備/不能をPASSにしない | 時計/ID/予算結果は明示入力、進行/mergeの権限を発行しない |
| DialogueExperience | U2/U6が公開結果をテキスト対話へ表示する | U1は待たない。E05はここ。設定/案内entityは移管しない |
| NativeAIDLCConnection | U3がC01の結果を他の正式条件と合わせて消費する | 唯一の進行元は正式AI-DLC、U1が開始/段操作を実行しない |
| SensorVerification | U4がC03の同対象を再取得し信頼版2センサーを実CIで実行する | U1 PASSをセンサー実施済みとしない |
| KitDistribution | U5がC05、U7がC07経由で元assessment/配布結果/戻し方を保持する | 実受渡し/配布/実PR正負/driftは後続単位。source scopeを配布先へ書き換えない |
| SafeOperationControl | U3/U5の停止・同一要求・照会の既存責務を保持する | U1は一回の読取/判定に止め、新しい操作entity/再送機構を足さない |

共有するものは固定規則/契約と明示的に受け渡す観測/結果で、共有mutableな評価状態は置かない。失敗の影響は当該評価の閉門と既存CI不合格へ限定し、監査受付の未取得PASS循環や他単位への誤った許可へ広げない。

Infrastructure Designへは、既存entryの実配置、信頼版の解決とPRデータの分離、read-only metadataとtest/buildの受渡し、設計監査受付とU1実装/統合向け判定の非循環という要件を渡す。本段では具体file配置/新workflow/保護設定変更を採択しない。Code Generation以後にSOLの制御とFD-Tを実装・実測する。

## Ambiguity Check and Assumptions

曖昧な性能表現や方式の混在はない。外部取得上限は停止予算、非保証は認証しない範囲、NFR7非適用は効果を行わない範囲として区別する。まだ観測していない実性能/実CI/実配布や古いCodeKBの互換性を成功にしない。新しいOwner仕様選択が必要な差はない。

## Assumptions & Open Questions

None.

未検証は、具体制御の実装、実環境/lockfile/runnerの適合、性能/coverage/SEC-T/実PRの統合、U5/U7の実受渡しである。S1〜S9/例外/report-only、TDD/実分母100%/架空publicデータ、1単位1PR/実装前設計監査/独立実装監査/作者受領/別担当統合を保持する。

Owner指定順U1→U4→U2→U3→U5→U7→U6のruntime反映未成立は既存残件のまま。U1終了時に席が正式経路を確認し、無理ならU4前にOwnerへ相談する。本段で新tool/偽辺/改名/state/cache/jump/engine変更で解決しない。

## Consolidated Summary Confirmation

- U1は既存の観測部品と一つの純粋核で構成し、I/Oの取得予算と判定を分離します。新しいサービス・DB・cache・watcher・認証機構は追加しません。
- 読取は既存予算で有限に止め、公開viewを構造/対象/pathから検査します。必須集合や検査の正本をPR側の設定へ渡さず、PRのコードを制御核として実行しません。
- head/digestを取得できない早期失敗では完全assessmentを捏造せず、既存診断とexit1で止めます。完全結果を出せる場合は、非保証・knownRemaining・対象/観測scope・同梱参照を欠かさず保持します。
- 承認kind/READY日付/legacy/再承認/現在checkpoint/設計監査と受付循環の既決条件を維持し、PASSを本人性・実review・進行/mergeの許可にしません。既存PR独立監査等を別に残します。
- 19詳細NFRを9つの設計solutionへ結び、同義入力の決定性、正負例、失敗伝播、実分母100%/SEC-Tを後段で検証できる境界にします。NFR7と他単位の実操作/実配布は移管しません。
- 7部品/既存entity所有とU1先行を維持します。配置/CI結線はInfrastructure Design、実装/試験は後段で行います。FDのE05誤記と指定順のruntime残件は未解消として保持します。

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
