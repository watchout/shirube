# Shirube — Contract Summary

この取り組みの既存7単位を結ぶ契約を定める。U1は対話入口/開始接続を待たず、PRの必要記録・適用日のREADY・現在成果物digest・該当する先行独立設計監査の機械整合を検査する。engine発行元・本人性・実review実施の自動認証は保証しない。

本書はContract Designの成果物であり、製品コード/fixture/test/実CIの実行結果ではない。別取り組み、新しいhost/client/producer、外部投稿、既存AI-DLC本体の変更は含めない。正式な進行元は既存AI-DLCで、1単位1PR・前単位統合後の次Code Generation・独立監査/作者受領/別担当統合を保持する。

## Sources and Traceability

正式consumesは次の順で読んだ。上流承認済みファイルは変更せず、現在の保証分担/READY適用日は本書の変更対応表と適用規則で明示する。

| Source | この契約との対応 |
|---|---|
| [unit-of-work.md](../units-generation/unit-of-work.md) | U1–U7の責任/配置、初回・実追加・AUN、U1先行、1単位1PR |
| [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md) | C01–C07の7辺。新しい逆向き依存/並列実行/独立サービスを追加しない |
| [components.md](../domain-design/components.md) | 7部品/10entityの所有、純粋判定とI/O、外部正式原本の所有境界 |
| [requirements.md](../requirements-analysis/requirements.md) | 13Must/47FR/10NFR。下記変更以外の要件/規格を維持 |
| [確認済みの契約計画](contract-design-questions.md) | 現在の契約計画と指定1点修正を反映した生成確認。旧案/旧RFC/私的原本は本書へ転記しない |

| Upstream target | 契約への対応 |
|---|---|
| U1 u1-ci-record-admission | C01/C03、E01/E02/E03、4条件と非保証、必要集合・digest・設計監査 |
| U2 u2-working-state-dialogue | C02/E05。ConfigurationDraft/GuidanceSelection/明示開始参照 |
| U3 u3-native-operation-control | C01/C02/C04/E04。正式native接続とNativeOperation/OperationAttempt |
| U4 u4-trusted-ci-verification | C03/C05/E01/E03。信頼版traceability/upstream-coverageの別責務 |
| U5 u5-safe-versioned-distribution | C04–C07/E06。固定配布版/実適用観測/戻し方/非保証の伝達 |
| U6 u6-guided-recheck-increment | C06/E05。初回実ゴール後の新要求、再照合、新動作、安全案内維持 |
| U7 u7-aun-rollout-verification | C07/E01/E06。AUN実適用/実PR正負/実drift、同じREADY日付条件 |
| FR1–FR8、全17US/88AC | 導入/設定/明示開始/正式接続/観測/停止再開/初回と実追加をC01/C02/C04/C06/E01/E04–E06で維持 |
| FR9、FR10、FR11 | 四条件、READY日付適用、同PRの設計監査、掲載記録/現在digest、非保証 |
| FR12、FR13 | C03/C05/C07/E03/E06。2センサー実CI、配布drift、AUN実証を削減しない |
| NFR1–NFR10、採択技術/セキュリティ規格 | Node組込み/TDD/実分母100%/SEC-T/依存脆弱性確認/最小権限、決定性/有限予算/互換/冪等/失敗伝播 |

## Owner回答による旧条件との変更対応

| 既存の記録・箇所 | 今回採る意味と変更範囲 | 維持する条件 |
|---|---|---|
| requirements FR5.3、FR9.1 | CIが実engine発行元/実review実施/本人性を認証するとの解釈を採らない。必要な承認と正式見直し役名/READYが記録にあり、対象・試行・内容が整合することを機械検査する | 宣言を観測digestへ写さない。READY文字列だけでなく構造、対象、必要集合を検査。未知・欠落は停止 |
| FR9.2–3 | 対象workspace/intent/unit/stage/attempt/contentを照合し、reviewerなしを自動免除しない。READYの必要集合は下記のOwner指定承認日条件で決める | 2026-11-06以後の承認/再承認でREADY欠落は失敗。以前の不足はnonblocking既知残件。別段・別試行・別単位で代用しない |
| FR11.3–4 | 原本からの掲載は従来作業とPR独立監査で扱う。CIは掲載記録の充足/相互整合/実PR内容との対応を検査し、自己生成された完全整合記録を発行元認証したとは言わない | 公開する必要記録、現在内容照合、矛盾/古い対象の検出、内部ログ非掲載、必要な公開Owner原文URL+本文SHAを保持 |
| componentsのObservedSnapshot.issuerObservation、EvidenceCollection、ConformanceGate | issuerObservationは観測できた投稿者/版/取得経路等と未確認の区別を保持する属性であり、native発行認証の成功flagではない。ConformanceGateの意味の核は下記4条件 | 7部品/10entityの所有は維持。外部の正式状態・人承認・監査原本をShirube所有へ移さない |
| Units GenerationのU1とDAGの旧「3条件/方式採択より先の真正性実CI実証」 | U1は下記4条件を単位内で実装する。真正性証明の実CI正例をこの段の完了やU1着手の前提から外す | U1が対話/開始なしで実PR読取→照合→判定→不成立でCI停止する最小単位であることを維持 |
| U4/FR12、U7/FR13の旧「4つの確かめ」 | 旧表現はREADY/設計監査/PR記録/U4センサーという横断要求。現在のU1内4条件（digestを明示）とは数え方を区別する | U4の信頼版2センサー実CI再実行、配布drift、U7のAUN実適用/実PR正負は削除しない |

13Must/47FR/10NFR/17US/88ACのうち上表の保証分担と今回のREADY承認日条件以外は維持する。旧6段のREADY不足は解消済み/承認取消とせず、日付条件を同じく適用する。既存Domain/Unitsのhash整合も発行元認証へ拡張しない。技術的限界の根拠は[devauditor回答](https://github.com/watchout/shirube/issues/6#issuecomment-6727605780)、本文SHA-256 `77979ab48643b2868e929d61a54d65b3b93f69c4ca59f4dc80fcd0d26fd3eadd`。これは技術観測であり、新しい権限原本ではない。

## 門が保証すること・保証しないこと

U1がPASSにできるのは、取得した対象PRと掲載記録について、次の全条件が成立した場合だけである。

1. 適用されるAI-DLC成果物と承認記録がPRの現在のtreeに揃う。
2. PR評価時点ですでに人が段の完了承認をした段のうち、承認日がAsia/Tokyoの2026-11-06以後である対象について、同じ段・試行の正式見直し役名とVerdict READYの記録が揃う。それ以前の不足はnonblocking既知残件として保持し、再開時には通常の見直しを受ける。
3. その記録の対象成果物集合とdigestが、現在PRから取得した実bytesに対応する。
4. DB構造・権限・契約・securityに触れる単位では、同じPRに先行する設計だけのheadへの独立設計監査PASSがあり、監査対象の設計が後続変更で失効していない。

**門が保証しないこと:** engineが本当にその記録を発行したこと、実reviewerが実際にその見直しを行ったこと、Owner本人がその人入力をしたこと、履歴が作者に改変されていないこと。内容が整合する作者作成JSONを、CIだけで発見できるとは主張しない。devauditorが通常のPR独立監査でAI-DLC記録と承認記録を読む現行運用で補うが、その監査も暗号的な本人性/真正性の証明と呼ばない。

U1のPASSは正式AI-DLC進行/mergeの許可ではない。独立実装監査、作者受領、必須CI、別担当の統合、該当する保護対象の公開Owner決定とR3/R4の統合前exact-headは別条件として残る。下流へ渡す結果には必ずこの非保証を付け、下流でPASSを真正性/統合権限へ読み替えることを禁止する。URLやactorの存在だけで権限を作らない。

## Contracts — 7辺と外部契約

HTTP/queue/新サービスは増設しない。以下のshared-schemaは同じ製品内のESM呼出し/JSONによる受渡しの規約であり、独立serverや新CLIを意味しない。同期読取は結果を返し、効果のある既存native/配布操作だけは開始と照会を分ける。Owner欄は仕様の保守責任であり、新しい権限役ではない。

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C01 | U1 u1-ci-record-admission | U3 u3-native-operation-control | shared-schema AdmissionContext/ConformanceAssessment。PR判定を消費して効果へ進む操作は4条件不成立なら開始しない。対象照会/案内をPR門PASSと呼ばず、「設計モード合格」等で核の条件を減らさない | U1 / ConformanceGate |
| C02 | U2 u2-working-state-dialogue | U3 u3-native-operation-control | shared-schema ConfigurationDraft/GuidanceSelectionと、選択に結び付く明示開始入力。単なる会話/選択では効果を出さない | U2 / DialogueExperience |
| C03 | U1 u1-ci-record-admission | U4 u4-trusted-ci-verification | shared-schema AdmissionContext、成果物manifest、ConformanceAssessment。U4は同じ実対象を再取得し2センサーを実行。U1 PASSでセンサーを省略しない | U1 / EvidenceCollection・ConformanceGate |
| C04 | U3 u3-native-operation-control | U5 u5-safe-versioned-distribution | shared-schema NativeOperation/OperationAttempt。現在対象、正規操作結果、停止/照会の観測を渡す。成功宣言だけで適用許可にしない | U3 / NativeAIDLCConnection・SafeOperationControl |
| C05 | U4 u4-trusted-ci-verification | U5 u5-safe-versioned-distribution | shared-schema SensorResultとU1判定参照。検査版/入力digest/実行結果/実対象が異なれば配布準備の合格として再利用しない | U4 / SensorVerification |
| C06 | U5 u5-safe-versioned-distribution | U6 u6-guided-recheck-increment | shared-schema DistributionRevision/DistributionAssessment。完了した初回実ゴールの参照と新要求を受け、現対象再照合後の案内へ渡す | U5 / KitDistribution |
| C07 | U5 u5-safe-versioned-distribution | U7 u7-aun-rollout-verification | 同じ配布shared-schema、判定の非保証、戻し方と公開可能な観測参照。AUNの実適用/実PR/実driftはU7で別途確認 | U5 / KitDistribution |
| E01 | External: GitHubのPR/tree/blob/commit/公開監査comment | U1、U4、U7の対象読取adapter | 既存GitHub読取API→ObservedSnapshot。PR/head/base、完全な変更集合と実bytes、監査原文を固定対象で取得。書込tokenを判定/試験processへ渡さない | U1の読取契約、各consumerは対象の観測を所有 |
| E02 | External: AI-DLCの既存段/単位/計画・掲載可能な承認/見直し記録 | U1のEvidenceCollection | versioned shared-schema PublishedRecordProjectionへのallowlist変換。内部audit/.aidlc-engineは元で保持。新exporter/host証明は前提にしない | U1 / EvidenceCollection。正式記録の所有はAI-DLC |
| E03 | U1 / U4 | External: 既存PRのCI門 | 判定JSON/既存entryのexit契約。U1四条件とU4二センサーを別結果として集約し、必須の不合格/不明で停止 | U1は整合判定、U4はセンサー |
| E04 | U3 | External: 正規AI-DLC入口 | 既存harnessの正式CLI/receipt。正式directiveの操作だけを実行し、nativeが唯一の進行元。正式CLIを模した独自進行engineを作らない | U3 / NativeAIDLCConnection |
| E05 | U2 / U6 | External: LLMとのテキスト対話 | 対象/観測済み/不足/不一致/不能/次の正当操作を同じ意味で表示。LLM adapterは輸送表示のみ。初回実証CodexをLLM共通の意味へ限定しない | U2 / DialogueExperience、U6は追加案内 |
| E06 | U5 / U7 | External: 導入先作業場・AUN既存担当 | 固定配布版manifestと許可差分、実ファイル再読取、戻し方。AUN非公開根拠は元で保持し、公開側は架空例/公開可能な結果のみ | U5 / KitDistribution、U7は実証記録 |

C01/C03はU1実装を消費する依存であり、U1がU2/U3を呼ぶ逆向き依存ではない。U1はPRと固定検査規則だけで4条件を評価できる。U2の独立root、7辺、U1先行を保ち、実行順の経済判断はDelivery Planningへ委ねる。

## shared-schema /1 — 共通形式と意味

以下は実装予定の境界規約であり、既存nativeや既存sds形式に実在するfieldだとは言わない。新entity/状態の所有は追加せず、既存entityの掲載用/境界用viewとして扱う。JSON wireで表せるデータだけを用い、関数・実行可能markupを渡さない。

```yaml
shared-schema: shirube-contracts/1
encoding: UTF-8 JSON
types:
  Sha256: "64桁の小文字hex string"
  GitOid: "対象repoのGit object formatに適合する完全なobject ID string"
  Ref: "空でない論理参照string（実在・同一対象は別途観測）"
  Target:
    required:
      repo: string
      workspace: string # 公開可能な論理識別子。private絶対pathは載せない
      space: string
      intent: string
      unit: "string | null（intent段だけnull）"
      stage: string
      attempt: string # opaque。native識別子を勝手に整数へ変換しない
  Observation:
    required:
      observationId: Ref
      sourceRef: Ref
      target: Target
      versionRef: Ref
      availability: "observed | unavailable"
      observedAt: string # 呼出側が与えるISO8601時刻
      observedContentRef: "Ref | null"
      observedDigest: "Sha256 | null"
      issuerObservation: object # 観測した事実と未確認を区別。認証済flagは作らない
  ArtifactEntry:
    required:
      path: string # repo相対の正規path
      bytes: integer # 0以上のbyte数
      sha256: Sha256 # 実blob bytesから計算
  ConformanceAssessment:
    required:
      assessmentId: Ref
      target: Target
      rulesetVersion: Ref
      observationRefs: array
      artifactSetDigest: Sha256
      conditions: object # records, ready, digests, designAuditの4keyが必須
      outcome: "PASS | FAIL | UNKNOWN"
      reasons: array
      knownRemaining: array # READYの日付条件によるnonblocking既知残件。失敗をここへ移さない
      assurance: "record-and-current-content-consistency-only"
      engineAuthenticity: "not-verified-by-gate"
      ownerIdentity: "not-verified-by-gate"
      reviewerExecution: "not-verified-by-gate"
      authorization: "NONE"
```

各conditionは`{outcome: PASS|FAIL|UNKNOWN|NOT_APPLICABLE, reasonCodes: string[]}`。NOT_APPLICABLEはdesignAuditの4分類すべてが非該当と観測できた場合だけ使う。records/ready/digestsを空集合だから非該当としない。readyは承認日条件で決めた必要集合の充足を検査し、旧承認の不足だけならknownRemainingへ保持してPASSにできる。必要集合が0件でも、対象の全承認日の判定が完了し、0件の根拠と既知残件を示すことを必要とする。全条件PASS（designAuditのみ根拠付き非該当可）なら全体PASS、1件でもFAILならFAIL、FAILなしでUNKNOWNがあればUNKNOWN。FAILとUNKNOWNはいずれも門を止める。非保証/authorizationは必須の固定値であり、consumerの省略や別値への変更を拒否する。

Targetは必須集合の各slotが求めるrepo/論理workspace/space/intent/unit/stage/attemptと厳密照合する。初回U1に必要なInceptionのintent段はそのslotでunit=nullとなり、現在CodeGenのunit付きslotと区別する。全段を現在CodeGenのstage/unitへ書き換えず、別repo、別slot、旧attemptを代用しない。ObservedSnapshotとTargetを結ぶ際は取得先PR/現成果物から確認した事実と記録側の宣言を別入力に保つ。観測できない項目を宣言から埋めない。正式nativeのfingerprintと本規約のartifactSetDigestは別形式であり、同じhash名として比較しない。

## 既存entityの受渡し形と所有

| entity / 所有component | 必須の境界field（共通Target/Ref型を使用） | 消費時の条件 |
|---|---|---|
| ConfigurationDraft / DialogueExperience | draftId:string、targetRef:Ref、answers:object、missingItems:string[]、conflicts:string[]、observationRefs:Ref[] | draft版と観測対象を照合。不足/矛盾を埋めた扱いにせず、再読取で変化したら開始入力を失効 |
| GuidanceSelection / DialogueExperience | selectionId:string、draftRef:Ref、candidateRef:Ref、targetRef:Ref、guidance:string、observationRef:Ref | 選択は開始承認/公開Owner決定でない。LLMの文章を実行commandとして評価しない |
| NativeOperation / NativeAIDLCConnection | operationId:string、targetRef:Ref、nativeOperationRef:Ref、startRequestRef:Ref、attemptRef:Ref、observedOutcomeRef:Ref | 正規nativeの実行/照会から得た観測と対応。正式stage/stateをShirubeが先に書き換えない |
| ObservedSnapshot / EvidenceCollection | Observation型と取得した対象PR/head/baseの参照、取得完全性 | ローカルcache/desired値を観測へ写さない。取得不能、部分取得、途中head変更はUNKNOWN |
| PublishedRecordProjection / EvidenceCollection | projectionId:string、targetRef:Ref、sourceObservationRefs:Ref[]、includedArtifactRefs:Ref[]、excludedArtifactRefs:Ref[]、projectedContentRef:Ref | 公開allowlistだけ。excludedには内部ログの本文/pathを写さず除外種別を示す。存在するだけで発行元認証しない |
| ConformanceAssessment / ConformanceGate | 上記規約、sensorResultRefs:Ref[]、applicableConditions:object | I/O/時計/ID取得は外側。純粋核へ全観測/時刻/識別子を明示入力。同じ入力は同じ理由/結果 |
| SensorResult / SensorVerification | sensorResultId:string、targetRef:Ref、trustedVersionRef:Ref、inputObservationRefs:Ref[]、executionRef:Ref、sensor:string、outcome:PASS/FAIL/UNKNOWN、reasons:string[] | sensorはtraceabilityまたはupstream-coverage。各実行版/実入力/PR headの完全一致が必要。片方未実行はUNKNOWN |
| DistributionRevision / KitDistribution | revisionId:string、sourceCommitRef:Ref、manifestRef:Ref、observedContentsRef:Ref、applicableTargets:Ref[] | 宣言pinだけでなく配布実bytesを照合。対象外を適用先へ追加しない |
| DistributionAssessment / KitDistribution | distributionAssessmentId:string、revisionRef:Ref、targetObservationRefs:Ref[]、observedDifference:object、applyAttemptRef:Ref、restoreReference:Ref、conformanceRefs:Ref[]、sensorResultRefs:Ref[] | 適用前後/drift/戻し方を区別。初回実ゴールやAUN完了を配布元の成功だけで宣言しない。判定の非保証を保持 |
| OperationAttempt / SafeOperationControl | attemptId:string、requestRef:Ref、targetRef:Ref、effectIdentity:object、observationRefs:Ref[]、outcome:string、requiredActor:string/null、stopReason:string/null、nonProgressObservation:object | 外部効果は送信前の同一キー/同一内容。別内容は衝突、応答喪失は照会。人待ち/不明/予算超過は停止 |

C02/C04の効果ある入力は`{requestId, targetRef, operation, payloadDigest, idempotencyKey, observationRefs}`を持つ。`operation`はそのときの正式directiveが許した既存操作だけ。再送キーは同じTarget+操作+payloadDigestへ一意に結び、同じキー別内容を`IDEMPOTENCY_CONFLICT`として拒否する。純粋読取にキーを要求しない。C06は追加で`initialGoalEvidenceRef`と新しい要求の`requestRef`を必須にし、初回未完/既存選択の再表示を「追加機能完成」にしない。これは新しい完了判定engineではなく、既存の完了/統合/試験記録の観測参照である。

## PRに載せる記録と必須集合

PublishedRecordProjectionの掲載viewは`schema: shirube-pr-records/1`、`target`、`rulesetVersion`、`artifacts: ArtifactEntry[]`、`artifactSetDigest`、`stages: StageRecord[]`を必須とする。StageRecordは`stage, unit, attempt, artifactPaths, approvals, review`。`approvals`はarrayで、各要素が`kind`（plan/summary/stage-completionを区別）、`choice, recordRef`を持つ。人の返信本文や私的audit pathは持たない。`review`は、まだ必要な見直しを実施する段ではない場合だけnullを許し、必要な場合は`reviewer, verdict, requestRef, recordRef, artifactPaths, artifactSetDigest`を持つ。該当段の正式見直し役名/READYと対象を照合する。**reviewのartifactPaths/集合digestは当該stageの固定成果物subsetであり、掲載view直下のartifactSetDigestは必要artifact全体の集合**である。両者は同じ集合hash規則で計算するが、別scopeとして比較する。subsetを記録側だけで縮小できない。既存native request/fingerprintを公開できる範囲で参照しても、native形式をこのwire形式へ書き換えない。recordRef/requestRefは公開可能な論理参照とし、元のaudit/.aidlc-engineのpathやbodyを転記しない。生成元へ戻る必要がある独立監査は元の権限内で行う。

**必須集合と証拠集合を別入力にする。** 必須集合はCIが信頼する固定版のstage定義/出力一覧、承認済み有効計画、単位種別/対象単位から決める。PR内の記録は「何があるか」の証拠入力であり、必須集合を定義できない。stage適用の承認済み計画は掲載される版と基準の参照を比較し、過去の基準がある場合は承認済み段を削る変更を検出する。初回U1でも固定stage定義に基づく適用Inception段の非空集合を持ち、作者の`stages: []`/任意stage名/空manifestを採用しない。計画が欠落・矛盾する場合はUNKNOWNで止めるが、私的原本の独立取得や新しい道具を集合決定の前提にしない。この計画自身の真正性も上の非保証と独立監査の対象になる。

PR評価の境界は、すでに実施/人承認済みの段と、進行中段で提出すべき成果物である。単位Code Generationの成果PRでは、先行して完了承認したInception/設計等の段と、現在段の成果物・実施済みplan/summaryの記録を要求する。**現在Code Generationの最終段承認や未来のBuild and Test/CI等の承認を先に要求しない。** それらは正式工程で後に発生する記録であり、完了後の評価では適用集合へ加える。plan承認/summary確認をstage-completionへ代用しない。CIが評価するcheckpointは固定した呼出側規則から選び、PR記録自身に縮小させない。未開始段にREADYを捏造せず、下記の日付条件で必要となる完了済み段にREADYが無い場合は`READY_MISSING`で失敗する。

最初のU1には必要なInception全記録を含める。READYだけは次の日付条件を適用し、以前の承認でもAI-DLC成果物/承認記録/現在digest/該当設計監査の条件を外さない。欠落を記録の自作や過去承認の撤回で補わず、旧6段の全てを一律legacyとして免除しない。この既存データの不合格は、門の契約/負例設計やU1実装そのものを新取り組み待ちにする理由ではない。

## READYの承認日境界・再開・再承認

閾値は今回Ownerが指定した**暦日2026-11-06（含む）、timezone Asia/Tokyo**で、信頼する検査版の必要集合規則に固定する。timestampでの境界は`2026-11-06T00:00:00+09:00`=`2026-11-05T15:00:00Z`。参照[6672241656](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656)のcreatedAtは`2026-11-05T23:30:06Z`=`2026-11-06T08:30:06+09:00`、本文SHA-256は`6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462`。閾値はこの投稿の時刻そのものではなく、今回指定された暦日である。

StageRecord.approvalsのstage-completion要素に`approvedAt:string`、`approvedAtFormat:date|timestamp`、`approvalRecordRef:Ref`を必要とする。使用するのはそのstage-completion承認の記録日であり、plan/summaryの時刻や掲載record生成時刻ではない。dateは厳密な`YYYY-MM-DD`をAsia/Tokyoの暦日として比較する。timestampはoffsetまたはZを持つRFC3339で、Asia/Tokyoへ変換した暦日で比較する。dateだけの入力をUTC midnightへ暗黙変換しない。日付なし/invalid/offsetなしtimestamp/形式矛盾/参照した承認記録との食違いは`APPROVAL_DATE_UNKNOWN`または`APPROVAL_DATE_CONFLICT`のUNKNOWNで止め、自動legacyにしない。reviewのnullは、まだ見直しが必要な段ではない場合に加え、この日付条件で旧承認の不足がnonblockingとなる場合に許す。後者はknownRemainingへの記載を必須とする。

原承認と再承認はそれぞれの承認参照/対象attemptで区別し、最初の承認日へ後の再承認を畳み込まない。再開対象は`reopenedFromApprovalRef:Ref`で元の承認を参照し、新しい通常段の見直しを受ける。再開中に未来の完了承認を先取りして要求することはないが、再開後の実施済み必須見直し/再承認の適用時に旧承認のlegacy扱いを継承しない。再承認が2026-11-06以後なら、その再承認対象のREADYを要求する。以前の不足は`knownRemaining:[{code:LEGACY_READY_MISSING,stage,unit,attempt,approvalRecordRef,approvedAt,revisitOnReopen:true}]`でnonblockingとして残す。解消/承認取消とは記録しない。

日付の観測は掲載された承認記録と参照先/既存基準の対応を比較する。作者がPRのapprovedAtだけを昔へ変えた、元参照/再承認を落とした、日付が参照内容と矛盾した場合はUNKNOWNであり免除しない。機械がアクセスできない本人の実入力時刻や、完全整合する偽の過去承認を認証することは保証しない。native receipt timestampは記録に観測された値であり、Owner本人の入力時刻を認証したものとは呼ばない。新しい私的履歴取得機構は前提にしない。

以下は親が正規read-only `aidlc engine audit history --event GATE_APPROVED`で観測した既存6段の承認/再承認を用いた既知残件表である。raw audit/diaryはこの更新で読まず、補足見直しや段の再実行も行っていない。

| 段 | 原承認timestamp（UTC → JST） | 再承認timestamp（UTC → JST） | READY不足の現在の分類 |
|---|---|---|---|
| feasibility | 2026-11-05T07:46:40Z → 11/05 16:46:40 JST | 観測対象に再承認なし | 原承認は閾値前。nonblocking既知残件として保持し、開き直した時に通常見直し |
| scope-definition | 2026-11-05T07:59:56Z → 11/05 16:59:56 JST | 2026-11-06T01:12:15Z → 11/06 10:12:15 JST | 原承認の不足はnonblockingで保持。再承認対象は閾値後なのでREADY必須、欠落ならFAIL |
| team-formation | 2026-11-06T02:15:43Z → 11/06 11:15:43 JST | 観測対象に再承認なし | 原承認が閾値後。READY必須、欠落ならFAIL |
| approval-handoff | 2026-11-06T00:18:35Z → 11/06 09:18:35 JST | 2026-11-06T05:13:00Z → 11/06 14:13:00 JST | 原承認・再承認とも閾値後。各対象でREADY必須、欠落ならFAIL |
| reverse-engineering | 2026-11-06T05:48:52Z → 11/06 14:48:52 JST | 観測対象に再承認なし | 原承認が閾値後。READY必須、欠落ならFAIL |
| practices-discovery | 2026-11-06T06:25:32Z → 11/06 15:25:32 JST | 観測対象に再承認なし | 原承認が閾値後。READY必須、欠落ならFAIL |

この観測範囲では、段単位でlegacyのみなのはfeasibility、scope-definitionは原承認と後日の再承認を分ける必要がある。他の4段も閾値後である。ShirubeとAUNに同じ日付/再開/再承認規則を配布し、AUNだけ別閾値や一括免除にしない。新しい承認/見直し記録を捏造せず、必要READY不足は適用対象の既知残件として残す。

## digestの具体規則と循環の排除

CIのI/O側がGitHubからPR番号/現在head/baseを読み、**その固定headのtree/blob実bytes**を取得する。PR説明のhead/digestや手元worktreeを観測値にしない。全必要pathとPR変更集合を取得し切れない場合、ページ抜け/上限超過/不正blob/途中head変更をUNKNOWNとして止める。対象読取の前後にhead/baseを再取得し、変更されたら同じ評価結果を流用しない。

ArtifactEntry.pathはrepo相対UTF-8 path、区切り`/`、先頭`/`・`.`/`..` segment・空segment・backslash・NULを拒否する。Unicodeや改行を勝手に正規化しない。実Git treeと同じbytesのpathを用い、衝突/重複を拒否する。symlink/submoduleから対象外をたどらず、成果物として非対応なら停止する。通常fileの内容は改行/空白/BOMを含む**raw bytes**でSHA-256を取り、正規化したnative summary hashとは別に保持する。

集合digestは、必要なArtifactEntryをpathのUTF-8 byte順でsortし、各行を`JSON.stringify([path,bytes,sha256]) + LF`とするUTF-8連結のSHA-256。配列/整数/hexという限定した表現なのでobjectのkey順に依存しない。最小1件、重複なし。記録側のartifactPaths/集合digestと、必須集合から再構成した集合を比較する。必要path欠落、期待しない差替え、追加/renameによる設計入力の変更も検出する。追加の実行/設計fileがPR差分にあれば、固定規則の分類に従って対象集合へ含め、未分類を黙って除外しない。

循環を避けるため、stage成果物/設計/実装/試験等の**承認対象内容**と、そのhashを載せる**掲載記録**を分ける。掲載記録自身のbyte列、監査comment本文、CI結果は、それ自身が保持するartifactSetDigestの対象外。除外path/種類は信頼する検査版が固定し、PR側の任意excludeリストでは変えられない。除外記録にもschema/充足/対象/重複/相互bindingの検査を行うため、除外が無検査を意味しない。AI-DLCの通常成果物を記録用として除外することはできない。

PR current headは**評価結果の観測値**として返す。PRに含まれる記録へその記録commit自身のSHAを事前に埋めることは要求しない。記録は対象の論理identityと内容集合digestで結び、記録追加だけで同じ対象内容を再承認し続ける循環を作らない。過去のhead参照がある場合も現在headとの同一性を強制せず、対象内容が現在と一致するかを再計算する。ただし独立設計監査のheadは、実在する過去の設計だけのcommitとして別途厳密照合する。

## 同PRの独立設計監査

DB構造/権限/契約/securityの4分類は、単位設計と実際のPR差分から求める。authorの`notApplicable:true`だけを信じない。各分類の根拠path/変更種別を記録し、すべて非該当と確認できたときだけNOT_APPLICABLE。不明な分類、未分類の変更、観測不能はUNKNOWN。4分類の設計監査条件と、別途Ownerが決める保護対象/公開決定/exact-headの条件は混同しない。

該当する場合の掲載参照は`{repo, pr, designHead, designArtifactSetDigest, requestUrl, requestBodySha256, reviewUrl, reviewBodySha256, expectedPublisher, verifierVersion}`。これは既存監査request/reviewの正規化viewであり、新しい監査受付schemaではない。通常受付の`sds-audit-request/1`/`sds-audit-review/1`、request_digest、対象head、全必須項目PASS、blocking_findingsなし、実投稿者=指定devauditor（GitHub iyasaka-ai）という整合を維持する。summaryのPASSやREADY_FOR_REVIEWは監査PASSの代わりにならない。

CIは同じPRの公開原文を読み、本文hash/投稿者/対象/head/依頼と返却のbindingを照合する。designHeadが実在し現在headの祖先であり、監査requestが指定するbaseからの変更が設計記録と必要な掲載記録だけだったことを確認する。実装が入ったheadを設計だけのheadと呼ばない。現在のbaseが動いた場合は既存監査契約のbase_movedの整合を維持する。CIが検証する工程順は、このsnapshot/ancestor/依頼返却対応と、掲載記録にある設計監査受領→実装の参照順の**整合**である。実CodeGen開始時刻やengineイベントの真実まで証明しない。commit日時だけで実時刻を証明せず、存在未確認の公開push履歴API/過去host記録を新しい必須取得源にしない。CodeGen前に設計監査PASSを得る運用条件は維持し、その実施状況は通常PR独立監査で記録を読んで補う。必要な現在commit/ancestor/監査原文自体が得られない場合はUNKNOWN。

designHead以後に監査対象の設計/契約入力が変われば`DESIGN_AUDIT_STALE`。現在の設計集合だけでなく間の変更も確認し、変更を戻しただけで自動再有効化しない。新設計の正規の監査が必要となり、古いPASSで進めない。監査commentが削除/変更され本文hashが異なる、対象外PR、別head、期限切れ/取消し等の既存監査契約違反も失敗または観測不能とする。既存受領器の現在head検査を過去designHeadへそのまま実行すれば拒否されるため、U1で歴史headの設計監査を扱うadapter/検査を実装する必要がある。既存器がそのまま設計先行監査まで完成済みとはしない。

**設計監査受付とU1四条件を循環させない。** 未監査の設計だけのheadには設計監査PASSがまだ無いので、U1の実装/統合向け門は閉じたままになる。一方、設計監査を受けるための既存必須テスト/検査のCIは、その未取得PASSに依存させない。既存受付で要求されたmandatoryを削る/`targets[].checks: []`にする回避はしない。`audit-admission.mjs`のtargetCheck/workflowCheckは指定checkとそのworkflowの成功を確認するため、未成立U1をその受付workflowに混ぜて受付全体を失敗させる配置は採らない。具体workflowの分離/結線は後続の正規の設計・計画で扱い、この契約で新workflowや監査手順の変更を実施しない。U1の純粋核に条件を減らした成功経路は足さない。

## AdmissionContextと外部取得契約

```yaml
shared-schema: shirube-admission-context/1
required:
  target: Target
  prObservation:
    repo: string
    number: integer
    head: GitOid
    base: GitOid
    changedPaths: array # 旧pathを含む実差分、完全取得
    complete: boolean
  policyObservation:
    rulesetVersion: Ref
    stageGraphRef: Ref
    acceptedPlanRef: Ref
    unitRef: Ref
    checkpoint: string # 信頼版の呼出側profile。記録側で選択しない
    requiredArtifacts: array # 非空、pathと役割/段の対応
    completedStages: array # 人がすでに完了承認した適用段
    requiredApprovals: array # 段/種類/対象/試行の組
    readyPolicy: # 信頼版に固定。PR/配布先の設定やtimezoneで変更できない
      cutoffDate: "2026-11-06"
      timezone: "Asia/Tokyo"
      approvalKind: "stage-completion"
    requiredReadyStages: array # 上のpolicyと承認/再開対象から算出。根拠付き0件は可
  records: PublishedRecordProjection
  protectedCategories: object # DB構造/権限/契約/securityそれぞれ該当・非該当・不明と根拠
  designAuditObservation: "object | null"
  observations: array # 実blob/PR/監査の観測
  now: string # 外側から明示入力
  budget:
    timeoutMs: integer
    totalTimeoutMs: integer
    maxRequests: integer
    maxBytesPerResponse: integer
```

`complete`はPRから来た宣言flagではなく、I/O側がページ/件数/実treeの取得を完了したときに作る観測である。complete=falseならUNKNOWN。公開Owner決定が必要な場合は、掲載viewに`control_source_ref:{url,sha256}`を保持し、GitHub公開原文から本文hash/対象を確認する。この整合検査をOwner本人認証と呼ばず、必要な権限条件を解除しない。

E01の既存読取はPR APIのrepo/PR/head/base、PR filesの全ページ、固定headのGit tree/blob、commit/compare、同PRのissuecommentを使う。mutableなdefault branchのcontentsやPRのshellを実行して観測しない。APIの打切り/内容サイズ/権限で全集合を得られないときはUNKNOWN。private AUN記録をShirubeの公開fixtureへコピーしない。

外部照会は既存audit-admissionの1取得`timeout=20000ms`/`maxBuffer=8000000`を参考に、初期の信頼版profileを`timeoutMs=20000, totalTimeoutMs=120000, maxRequests=100, maxBytesPerResponse=8000000`とする。これは計測済み性能の保証ではなく有限な停止予算である。純粋核は時計を読まず、外側の予算超過/取得不能を入力として受ける。自動再試行は0、予算不足を成功へ変更しない。別の予算が必要なら検査版の変更として明示し、PR側の値で無制限に増やさない。効果ある既存native操作も有限予算と照会を持ち、応答喪失を再実行成功へ読み替えない。

## Contract Ownership and Versioning — 版・互換性・重複・失敗

- 上のschema ID `/1`を必須とし、未知major/必須型欠落/不正enum/重複JSON key/部分書込み/予算超過は停止する。schemaだけに合っても4条件の意味検査を省略しない。既存`sds-*`のschemaを勝手にrename/上書きしない。
- optionalな説明fieldの追加は既存consumerが無視できる。意味を変える未知field/未知critical機能は拒否し、任意拡張は専用`extensions`objectへ限定する。失敗や権限の意味をoptional fieldで上書きできない。破壊的変更は新旧同居/移行/試験済み逆向きと該当Owner判断を必要とする。
- StageRecordは`intent+unit+stage+attempt`、承認はさらに`kind`、reviewは`requestRef`で一意。重複記録は同内容でも`DUPLICATE_RECORD`、同じキー別内容は`RECORD_CONFLICT`。複数attemptの履歴は保存できるが、現在必要なattemptを曖昧なlatest時刻だけで選ばない。正式計画/対象との対応が未確定ならUNKNOWN。
- 旧attempt/明示取消/後続の対象変更は再利用しない。公開原文の現在版と記録が食い違えば停止する。ただし公開されていない取消しや作者による完全整合偽装の存在まで機械が検知したとは主張しない。通常PR独立監査と正式工程の停止を残す。
- 境界結果は必ず`outcome/reasons/target/observationRefs`を返す。空の理由による不合格、UNKNOWNをPASSへ変換、skip/cancel/timeoutの成功換算をしない。必須判定FAIL/UNKNOWNは既存門entryでJSON失敗出力かつexit1、成功はexit0。既存entryの引数エラー等の契約は保持し、純粋関数はexitせず結果だけを返す。新CLI名/新進行commandは足さない。
- 理由codeの集合と4条件判定はConformanceGateに1つだけ置く。adapter/LLM/センサー/配布が別の意味を再定義しない。`REQUIRED_RECORD_MISSING`, `READY_MISSING`, `TARGET_MISMATCH`, `ATTEMPT_MISMATCH`, `ARTIFACT_SET_MISMATCH`, `ARTIFACT_DIGEST_MISMATCH`, `DESIGN_AUDIT_MISSING`, `DESIGN_AUDIT_STALE`, `DESIGN_AUDIT_BINDING_MISMATCH`, `INPUT_UNOBSERVABLE`, `UNSUPPORTED_SCHEMA`, `DUPLICATE_RECORD`, `RECORD_CONFLICT`を今回の追加判定の理由候補として一元化する。既存codeは同じ意味なら再利用し、既存codeの意味を別物へ変えない。
- 日付条件には`APPROVAL_DATE_UNKNOWN`/`APPROVAL_DATE_CONFLICT`をUNKNOWNの理由として加える。`LEGACY_READY_MISSING`はknownRemainingのnonblocking残件codeであり、日付不明や閾値以後の欠落をここへ移さない。各consumerは同じreadyPolicyとknownRemainingを引き継ぎ、独自にcutoffや再開の意味を変えない。

## 既存実装の再利用範囲と未実装部分

rootとmain相当worktreeは合算して完成扱いにしない。今回読んだ追加部品は`.worktrees/base-lifecycle/scripts/sds/{engine-judge,approval-record,record-compare}.mjs`で、rootに同名fileは無い。公開main調査の固定版は冒頭記載の`7e775afd…`である。

| 部品・根拠 | 有効な再利用 | そのまま使えない/保証しない部分 |
|---|---|---|
| approval-record.mjs canonical/buildRecords、34–47行付近 | canonical表現、段/単位/承認種類を取り違えない変換の既存処理 | identityCheck:none。sourceEventDigestは内容hashで認証ではない。sourceAuditRefは内部pathなので公開viewから除く。現在の4条件対応済みではない |
| record-compare.mjs compareRecords | 対応する配列/bytesの内容比較 | READY、PR実成果物digest、先行設計監査を検査しない。比較一致を全体合格へ流用しない |
| engine-judge.mjs | 固定版/対象/source変化を扱う既存処理を適合確認して利用できる範囲 | Claude/Bun/特定版前提。Codex対応済みとしない。CIから私的原本の真正性を独立証明する部品ではない |
| root scripts/hygiene/audit-admission.mjs、docs/sds/audit-method.md | 同PR/投稿者/request_digest/head/必須項目/本文hashの機械整合、READY_FOR_REVIEWとRECEIPT_ACCEPTEDの区別、authorization:NONE | 通常の現head受付を過去designHeadへそのまま流用できない。semantic correctness/merge権限/engine真正性を保証しない |
| 既存kit/gate1–3/hygiene | 固定版配布、既存PRの最低条件、安全境界の維持 | 旧道筋受付/判定4・5は採用しない。rootに旧codeが存在しても有効化/復活の根拠にしない |

U1の作る段で、既存の正規化/読取adapterとConformanceGateの4条件判定、歴史head設計監査の照合を実装・試験する必要がある。これは未実装の範囲であり、「既存scriptを呼べば完了」とは報告しない。公開掲載はallowlist投影で、raw audit/.aidlc-engine、生review body/人返信/秘密を含めない。掲載禁止の検査も正負試験に含める。

## 手元の正例・負例の試験方法（未実行）

U1のCode Generation以後に、Node組込み`node:test`/`assert`でTDDの失敗→実装→合格を残す。予定する`tests/ci-record-admission.test.mjs`内の架空fixtureはメモリ内のrepo/PR/tree/blob/監査comment取得応答であり、実Owner原本や私的記録をコピーしない。架空データを使うことで発行元認証を実証したとは言わない。正例は**記録と機械整合の正例**である。

| case | 正例からの入力変形 | 核の期待結果・理由 | assertする対象 |
|---|---|---|---|
| P1 四条件正例 | 適用段/承認/正式役名READY/非空artifact集合と実bytes、同PR設計だけheadの先行独立監査PASSを全て整える | PASS、失敗理由なし、非保証3fieldとauthorization:NONE | 4conditionがPASS、再計算digestが独立した既知値に一致、同入力2回の出力一致 |
| N1 記録の欠け | 必須集合を固定したまま1つの成果物または承認記録を削除 | FAIL / REQUIRED_RECORD_MISSING | 欠けた段/種類/pathを示し、残る他段で代用しない。空stages/空artifactsも失敗 |
| N2 READYの欠け | cutoff以後のstage-completion承認段1つのreviewを欠落、またはREADY以外へ変更 | FAIL / READY_MISSING | 別段/別attempt/未設定reviewerで免除しない。既存6段のうち閾値後/再承認対象と同じ条件を架空例で再現 |
| N3 digest不一致 | 記録は変えず、対象blobの1byteだけを変更 | FAIL / ARTIFACT_DIGEST_MISMATCH | 観測digestをblobから再計算し、宣言digestをechoしない。byte数同一の変更でも失敗 |
| N4 設計監査の欠け | 4分類の該当を維持して監査参照/PASS返却を欠落 | FAIL / DESIGN_AUDIT_MISSING | 非該当へ変換せず、未取得の監査でU1 PASSにしない |
| N5 対象・試行 | repo/PR/unit/stage/attemptを1項目だけ別対象へ変更 | FAIL / TARGET_MISMATCHまたはATTEMPT_MISMATCH | 指定した対象欄と失敗理由。別attemptのREADYを代用しない |
| N6 必須集合/設計失効 | 1path欠落/rename/未分類追加、同PRで設計だけhead以後の設計変更、別PR/別head監査 | FAIL / ARTIFACT_SET_MISMATCH、DESIGN_AUDIT_STALE、DESIGN_AUDIT_BINDING_MISMATCH | 順序が違うだけなら同集合digest、重複/変化は拒否、過去PASSの流用拒否 |
| N7 観測不能 | 全ページが揃わない、headが読取中に変化、API拒否/予算超過 | UNKNOWN / INPUT_UNOBSERVABLE | PASS0件、有限回で終了。private原本取得へ迂回せず、停止理由を表示 |
| N8 入力境界 | 重複key/record、未知major/critical、traversal/symlink、過大入力、内部ログ混入 | FAILまたは構造検査の拒否 | 規定reason、対象外読書き0、秘密/生body出力0 |
| P2 非該当 | 実差分/設計で4分類すべて非該当の根拠を揃える | designAuditだけNOT_APPLICABLE、他3条件PASSなら全体PASS | 不明を非該当へ落とさない。4分類該当を1つに変えればN4になる |
| P3 承認循環の回避 | 現在CodeGenの成果物/実施済みplan等と完了済み先行段を揃え、未来段承認は置かない | 必須の現在/先行記録があればPASS | 未来BuildTest/CI承認を要求しない。必須記録削除はN1、閾値後の必要READY削除はN2となる |
| P4 閾値前の不足/READY必要集合0件 | 必要成果物/承認/digest等を残し、全stage-completionが閾値前と確認できる例でREADYを欠落させる | readyはPASS、knownRemainingにLEGACY_READY_MISSING、他条件も成立すれば全体PASS | C2のNOT_APPLICABLEや空stagesを使わない。旧承認の不足だけではexit1にしない |
| N9 UTC境界 | 同じ承認のtimestampを2026-11-05T14:59:59Zと2026-11-05T15:00:00Zに分けた架空2例（READYなし） | 前者は旧承認のnonblocking残件、後者はFAIL / READY_MISSING | JSTの11/05 23:59:59と11/06 00:00:00の違い。投稿時刻やUTCの日付そのままで判定しない |
| N10 原承認/再承認/再開 | 原承認は2026-11-05、再承認は2026-11-06、再承認対象のREADYなし。別例では旧承認を開き直す | 再承認対象はFAIL / READY_MISSING。旧不足は残件として保持、再開後は通常見直しの適用を要求 | 元の古い承認だけで新attemptを免除しない。再開中の未来完了承認を先取り要求しない |
| N11 日付不明/矛盾/改変 | approvedAt欠落/offsetなし/参照先と不一致、作者がapprovedAtだけを旧日へ変更 | UNKNOWN / APPROVAL_DATE_UNKNOWNまたはAPPROVAL_DATE_CONFLICT | 自動legacy化0件、門はexit1。完全整合する偽の過去記録まで認証したとは主張しない |
| P5 日付形式/配布先同一規則 | date形式2026-11-06と同日JSTを表すtimestamp、Shirube/AUN、配布先の別TZを比較 | 固定Asia/Tokyo/同じcutoffで同じ必要集合と結果 | dateをUTCで解釈しない。PR/配布先がcutoffやTZを書き換えた例は受理しない。plan/summaryやrecord生成日は使わない |

境界試験ではU1の純粋核を呼ぶ既存門entryのCLI処理へ同じ架空観測を注入し、P1はJSON PASS/exit0、N1–N4およびFAIL/UNKNOWNはJSON不合格/exit1を確認する。必要なI/O注入は既存entry内のadapter境界で行い、新しい製品CLIや独自engineを作らない。`node --test tests/ci-record-admission.test.mjs`自体のexit0は、負例が期待どおり拒否されたassertの合格を意味する。**負例の門processがexit0だったという意味ではない。** entry接続後は、実PR読取→核→CI不合格の統合経路もU1の単位内で確認し、mockだけの完成にしない。

採択済みのTDD/適用実行コード分母100%（scriptsと適用srcを含む）/SEC-T/依存追加前の脆弱性確認/最小権限/S1–S9を維持する。npm runtime依存は追加しない。正規化、核、I/O失敗、CLIへの失敗伝播を含む実分母を明示し、分母0・skip・80%・実装をなぞるだけのassertで置き換えない。U4はtrusted版traceability/upstream-coverageを実CIで対象PR記録へ再実行する別試験、U7はAUN実配布/実PR正負/driftの別受入であり、このローカルfixtureだけで完了としない。

## 境界ごとのspecへの具体化

次の13blockは、共通型/失敗規則を参照する境界固有のspecである。requiredInputはproviderが供給を組み立てるための入力、requiredOutputはproviderからconsumerへ供給する内容を示し、consumerが生成する結果を応答として混ぜない。外部APIの既存形式はadapterで読み替え、下記の正規化名を外部APIへ追加するものではない。関数名/新APIの実在を主張するものではなく、実装時の既存呼出しへ適用する入力出力の契約である。全blockで未知major/不明/対象違いは共通規則に従い停止し、意味の核をadapterで複製しない。

```yaml
shared-schema: shirube-c01/1
provider: U1
consumer: U3
owner: ConformanceGate
mechanism: ESM-shared-model
requiredInput:
  context: AdmissionContext
requiredOutput:
  assessment: ConformanceAssessment
constraints:
  - "対象/規則版/対象成果物集合が同じ評価だけ消費する"
  - "4条件FAIL/UNKNOWNでは、その判定を前提とする開始を行わない"
  - "PASSもnative進行/人承認/merge権限ではない"
  - "READYは固定readyPolicyによる必要集合とknownRemainingをそのまま消費する"
onFailure: "停止理由を返す。既存nativeのguardへ迂回しない"
```

```yaml
shared-schema: shirube-c02/1
provider: U2
consumer: U3
owner: DialogueExperience
mechanism: ESM-shared-model
requiredInput:
  draft: ConfigurationDraft
  selection: GuidanceSelection
  explicitStart: "既存人入力に対応するrequestRefとTarget参照"
requiredOutput:
  draft: ConfigurationDraft
  selection: GuidanceSelection
  explicitStart: "既存人入力に対応するrequestRefとTarget参照"
constraints:
  - "draft/selection/開始の対象・観測版が一致し不足/矛盾がない"
  - "明示開始をLLMの推測/選択/案内表示で代用しない"
  - "開始前に正規nativeの現対象/段/必要公開権限を再照合する"
  - "NativeOperation/OperationAttemptは受信後にU3がE04/C04で生成・供給する"
onFailure: "停止して不足/対象変更を示す。同一キー別内容の再送拒否"
```

```yaml
shared-schema: shirube-c03/1
provider: U1
consumer: U4
owner: EvidenceCollection-and-ConformanceGate
mechanism: ESM-or-JSON-shared-model
requiredInput:
  context: AdmissionContext
  assessment: ConformanceAssessment
requiredOutput:
  context: AdmissionContext
  manifest: "ArtifactEntry[]とartifactSetDigest"
  assessment: ConformanceAssessment
constraints:
  - "manifestは同じPR/headの実bytesから作った非空集合"
  - "U4は信頼版と実入力を確認し、U1 PASSだけで2実行を省略しない"
  - "U1非保証とauthorization NONEを保持"
  - "SensorResultは受信後にU4が生成し、C05/E03で供給する"
  - "READY日付条件/既知残件を再解釈せず引き継ぐ"
onFailure: "不足/別head/センサー未実行は停止"
```

```yaml
shared-schema: shirube-c04/1
provider: U3
consumer: U5
owner: NativeAIDLCConnection-and-SafeOperationControl
mechanism: ESM-shared-model
requiredInput:
  operation: NativeOperation
  attempt: OperationAttempt
  observationRefs: "Ref[]"
requiredOutput:
  operation: NativeOperation
  attempt: OperationAttempt
  observedOutcomeRef: Ref
constraints:
  - "配布対象とnative操作対象を混同しない"
  - "結果不明/人待ちでは適用へ進まず、応答喪失は照会する"
  - "成功結果は別途必要な配布権限/保護対象決定を代用しない"
onFailure: "既存正常版/保留を維持して停止"
```

```yaml
shared-schema: shirube-c05/1
provider: U4
consumer: U5
owner: SensorVerification
mechanism: ESM-or-JSON-shared-model
requiredInput:
  sensors: "SensorResult[traceability,upstream-coverage]"
  assessment: ConformanceAssessment
requiredOutput:
  sensors: "SensorResult[traceability,upstream-coverage]"
  assessment: ConformanceAssessment # U1の判定を非保証付きで引き継ぐ
constraints:
  - "2種とも信頼固定版・対象head・入力集合digest・実行参照が対応する"
  - "FAIL/UNKNOWN/途中失敗を合格へ集約しない"
  - "PRがchecker/必須集合を自己弱体化できない"
onFailure: "配布合格に流用せず停止し再観測の必要を示す"
```

```yaml
shared-schema: shirube-c06/1
provider: U5
consumer: U6
owner: KitDistribution
mechanism: ESM-shared-model
requiredInput:
  revision: DistributionRevision
  distribution: DistributionAssessment
requiredOutput:
  revision: DistributionRevision
  distribution: DistributionAssessment
  restoreReference: Ref
constraints:
  - "U6は受信後、別入力の初回実ゴール根拠と新要求参照を確認する"
  - "項目選択後に現対象を再照合し、案内と実動作を更新する"
  - "同じ入力の変更前後で新動作を検証し、既存安全案内/履歴を削らない"
  - "U5の適用観測と、U6が追加する再照合/新動作の観測を区別する"
onFailure: "追加実装/更新を止め、従来の正常案内を保持"
```

```yaml
shared-schema: shirube-c07/1
provider: U5
consumer: U7
owner: KitDistribution
mechanism: versioned-JSON-manifest-and-observed-files
requiredInput:
  revision: DistributionRevision
  distribution: DistributionAssessment
  restoreReference: Ref
requiredOutput:
  revision: DistributionRevision
  distribution: DistributionAssessment
  restoreReference: Ref
  assurance: "record-and-current-content-consistency-only"
  authorization: "NONE"
constraints:
  - "受け手の現在担当/保留/権限を尊重する"
  - "実適用/実PRの正負/実driftを配布元だけの成功で代用しない"
  - "U1非保証を保持し、AUN非公開原本は公開Shirubeへ写さない"
  - "AUN実適用/実PR正負/driftの受入観測は、受信後にU7が生成する"
  - "AUNも同じ固定readyPolicyを使い、旧不足は残件、新承認/再開対象は通常見直し"
onFailure: "適用完了とせず、部分失敗/戻し方を明示"
```

```yaml
shared-schema: shirube-e01/1
provider: External-GitHub
consumer: U1-U4-U7-read-adapters
owner: EvidenceCollection
mechanism: existing-read-only-GitHub-API
requiredInput:
  repo: string
  pr: integer
  budget: "AdmissionContext.budget"
requiredOutput:
  prMetadata: "GitHubで取得したrepo/PR/head/baseと変更一覧"
  treeBlobs: "固定headのtree/blob実bytes"
  auditComments: "必要な公開監査commentのmetadata/原文"
constraints:
  - "取得したheadでtree/blob/変更集合/監査原文を固定読取する"
  - "ページ/対象/途中head変更/サイズ超過を検出する"
  - "read-only資格情報はmetadata取得側だけへ渡す"
  - "ObservedSnapshot/AdmissionContextの観測は受信後に各読取adapterが生成する"
onFailure: "UNKNOWN/INPUT_UNOBSERVABLE、門は非成功"
```

```yaml
shared-schema: shirube-e02/1
provider: External-AI-DLC-records
consumer: U1-EvidenceCollection
owner: EvidenceCollection
mechanism: allowlisted-versioned-record-projection
requiredInput:
  planRef: Ref
  stageRecords: "掲載可能な段/承認/見直しの入力"
  artifacts: "ArtifactEntry[]"
requiredOutput:
  planRef: Ref
  stageRecords: "既存形式の掲載可能な段/承認/見直しの記録"
  artifacts: "ArtifactEntry[]に対応する対象成果物"
constraints:
  - "元の形式/版と公開viewを区別し、勝手にnative receiptを生成しない"
  - "内部audit/engine/body/人返信/秘密は出力から除外する"
  - "構造/相互bindingは検査するがengine発行元認証は保証しない"
  - "PublishedRecordProjectionの正規化viewは受信後にU1が生成する"
onFailure: "不完全記録/未知形式は停止。公開禁止情報で穴埋めしない"
```

```yaml
shared-schema: shirube-e03/1
provider: U1-and-U4
consumer: External-existing-CI-gate
owner: ConformanceGate-and-SensorVerification
mechanism: existing-entry-JSON-and-exit-code
requiredInput:
  assessment: ConformanceAssessment
  sensors: "U4適用時のSensorResult[2]"
requiredOutput:
  head: GitOid
  outcome: "PASS | FAIL | UNKNOWN"
  reasons: "string[]"
  authorization: "NONE"
constraints:
  - "U1四条件とU4二センサーの結果を区別する"
  - "FAIL/UNKNOWNはexit1、PASSはexit0。必須失敗を隠さない"
  - "設計監査受付の既存必須CIとU1門を循環依存させない"
onFailure: "CI不合格を返す。merge/進行を命令しない"
```

```yaml
shared-schema: shirube-e04/1
provider: U3
consumer: External-native-AI-DLC
owner: NativeAIDLCConnection
mechanism: existing-harness-CLI-and-receipt
requiredInput:
  targetRef: Ref
  directiveRef: Ref
  requestRef: Ref
  idempotencyKey: "効果のある操作だけstring"
requiredOutput:
  command: "正式directiveが指定した既存CLIのargv"
  targetRef: Ref
  requestRef: Ref
constraints:
  - "正規directiveで示された実在操作のみ。Shirubeがstage/stateを変更しない"
  - "harness/版適合は実証した範囲に限定し、Claude実装をCodex適合済としない"
  - "U1判定を消費する効果は4条件不成立なら開始しない"
  - "参照はU3側の対応付けであり、nativeへ新しい引数/APIを追加しない"
  - "nativeの戻り/receiptを観測し、NativeOperation/OperationAttemptはU3が生成する"
onFailure: "有限予算で停止し結果不明を照会。guard bypass/架空receipt禁止"
```

```yaml
shared-schema: shirube-e05/1
provider: U2-and-U6
consumer: External-LLM-dialogue
owner: DialogueExperience
mechanism: text-view-and-existing-adapter
requiredInput:
  targetRef: Ref
  observationRefs: "Ref[]"
  missingItems: "string[]"
  reasons: "string[]"
  nextAction: "正規の操作または人待ちを示すtext"
requiredOutput:
  guidance: string
constraints:
  - "同じ意味/理由を表示し、LLM固有adapterで判定を変えない"
  - "人待ちは1回表示し停止。未確認を合格に変えない"
  - "初回Codex実証を製品のCodex限定へ変えない"
onFailure: "対象/不足/不能を読めるtextで示し自動効果を出さない"
```

```yaml
shared-schema: shirube-e06/1
provider: U5-and-U7
consumer: External-target-workspace-and-AUN
owner: KitDistribution
mechanism: versioned-kit-manifest-existing-apply-and-readback
requiredInput:
  revision: DistributionRevision
  targetRef: Ref
  authorizedDifferenceRef: Ref
  restoreReference: Ref
requiredOutput:
  assessment: DistributionAssessment
constraints:
  - "固定source/manifest/実内容と受け手の実ファイルを比較する"
  - "保護対象の必要な公開Owner決定/現在担当/保留を保持する"
  - "同一キー再送/途中失敗/戻し方を検証し、無許可drift修正をしない"
  - "配布先TZ/PR設定でREADY日付条件を変更せず、同じ既知残件の扱いを配る"
onFailure: "適用済みとせず停止。AUN原本を元の権限下へ残す"
```

## Open Questions

| Contract | Question | Blocks |
|---|---|---|
| 全13境界 | 契約内容に新たなOwner質問はない。指定のREADY適用日修正を反映済み | なし。通常の見直し/段承認へ提出できる |
| U1 READY受入 | 既知不足のうちfeasibilityの原承認とscopeの原承認は閾値前のnonblocking残件。scope再承認を含む閾値後の5段は、必要READYが不足した実PRでFAILとなる | 該当する実PRの受入。現在Contract Designの完了やU1 Code Generation着手を新道具/別scope待ちにしない |
| U1実装接続 | 4条件核、掲載adapter、過去design-only head監査照合、既存entryへの失敗伝播はU1で実装/試験する。既存codeのCodex適合や実CI合格は未達 | U1の実装完了/実PR受入。契約設計の追加質問ではない |
| U4/U7実証 | 信頼版2センサーの実CIとAUN実配布/実PR正負/driftは各単位の実証事項 | 各単位の実受入。手元fixtureで代用しない |

## Verification Status and Handoff

本書には既存DAG7辺と外部6境界の13固有spec、共通形式と10entity所有、版/失敗/有限予算、非保証、正負試験方法を含めた。試験方法は設計であり、製品test/fixture作成、CLI接続試験、実CI、実配布は未実行である。構造確認は成果物のYAML/参照/escapingを扱い、製品試験の成功とは区別する。

READYの既知不足は上表と承認日別表のまま保持する。閾値前の不足は門を止めず再開時の通常見直しへ、閾値以後の不足は実PRの機械判定で停止する。既存6段の承認取消/一括免除/架空READY補記はしない。

後続はAI-DLCの通常の見直しと段承認、Delivery Planning、U1の正規の作る段である。本書のPASS/仕様自体に進行/merge権限を持たせない。保護対象の公開Owner決定/必要exact-headと、PR独立監査/作者受領/別担当統合はそれぞれ保持する。

