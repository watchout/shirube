# U1 — Business Rules

## Sources and Scope

[確認済み計画](functional-design-questions.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[stories](../../../inception/user-stories/stories.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)から具体化する。形状は[entities.md](entities.md)、処理順は[functional-spec.md](functional-spec.md)を正本とする。旧上流の真正性条件は承認済み契約の変更対応を適用し、CIの原本認証へ戻さない。

## Rules — Source of Truth

```yaml
ruleset: shirube-u1-functional-rules/1
owner: ConformanceGate
principle: adapters-transport-observations-they-do-not-redefine-decisions
policy:
  readyCutoff: {date: '2026-11-06', timezone: Asia/Tokyo, inclusive: true, approvalKind: stage-completion}
  positiveChoices:
    plan: [Approve Plan]
    summary: [Looks correct]
    stage-completion: [Approve, Accept as-is]
  budget: {timeoutMs: 20000, totalTimeoutMs: 120000, maxRequests: 100, maxBytesPerResponse: 8000000, automaticRetries: 0}
rules:
  - id: BR1.1
    statement: 記録と実観測を必要slotの対象と試行へ結び付ける。
    category: validation
    applies_to: [ObservedSnapshot, PublishedRecordProjection, ConformanceAssessment]
    trigger: evaluation-input-received
    logic: >
      IF repo/workspace/space/intent/unit/stage/attemptまたはPR/head/baseが必要slotや実観測と異なる
      THEN 不一致を返す。intent段のunit=nullと現在unit段を区別し、旧attemptや別slotで代用しない。
      対象を観測できない場合は宣言から補わずUNKNOWN。
    violation: 'FAIL: TARGET_MISMATCH or ATTEMPT_MISMATCH; unavailable: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR4.1, FR5.1, FR9.2, FR11.4, NFR5]
    tests: [FD-T07, FD-T08, FD-T11, FD-T15, FD-T20]
  - id: BR1.2
    statement: 必須集合は信頼版定義と有効計画と評価checkpointから独立に求める。
    category: constraint
    applies_to: [PublishedRecordProjection]
    trigger: required-set-derived
    logic: >
      IF 固定stage graph/出力一覧/有効計画/単位種別/current checkpointが確認できる
      THEN 必要artifacts、stage slots、checkpoint別承認、見直しsubsetを確定する。
      初回U1には適用Inceptionを含む非空集合が必要。PRのstages/exclude/skipで縮小しない。
      計画不明はUNKNOWN、確定した必要記録の欠落はFAIL。過去5不足の固定数を集合にしない。
    violation: 'FAIL: REQUIRED_RECORD_MISSING; indeterminate policy: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR5.1, FR11.1, FR9.3]
    tests: [FD-T02, FD-T14, FD-T15]
  - id: BR1.3
    statement: 既実施checkpointと現在提出内容を要求し、未来完了承認を先取りしない。
    category: policy
    applies_to: [PublishedRecordProjection]
    trigger: checkpoint-selected-by-trusted-caller
    logic: >
      IF 単位Code Generation成果PRを評価する THEN 先行の人完了承認段、実施済みplan/summary、現在成果物を含める。
      現CodeGenの未来完了承認や未開始Build and Test/CIの承認を要求しない。
      gate:falseのsummary/単位完了を人のstage-completionに変換しない。後の評価では新たに実施済みとなった段を加える。
    violation: 'UNKNOWN / INPUT_UNOBSERVABLE when checkpoint or applicability conflicts; missing current requirement: FAIL / REQUIRED_RECORD_MISSING'
    source: [FR4.1, FR11.1, FR9.3]
    tests: [FD-T11, FD-T15, FD-T19]
  - id: BR1.4
    statement: 重複・競合・取消し・旧対象を有効記録へ集約しない。
    category: validation
    applies_to: [PublishedRecordProjection]
    trigger: records-indexed
    logic: >
      IF 同intent/unit/stage/attemptが重複、または同slot/kindの承認が重複 THEN 同内容でも拒否する。
      別内容の同keyは競合。reviewはrequestRefでも結ぶ。複数attemptの履歴は保持できるが時刻のlatestだけで選ばない。
      明示取消/後続変更で無効となった記録は使わず、不明な現対象はUNKNOWN。
    violation: 'FAIL: DUPLICATE_RECORD or RECORD_CONFLICT or ATTEMPT_MISMATCH; unknown currentness: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR5.3, FR11.4, NFR4]
    tests: [FD-T11, FD-T17]
  - id: BR2.1
    statement: 必要承認はkindごとに固定した肯定値だけで充足する。
    category: validation
    applies_to: [PublishedRecordProjection]
    trigger: public-approval-checked
    logic: >
      IF 公開approvalのkind/choiceがpolicy.positiveChoicesと必要slotに一致 THEN そのkindだけを充足する。
      stage-completionのAccept as-isは正式な選択肢として提示された対象だけに使う。
      否定/空/空白/未知/別kindの肯定は充足せず、番号/大小文字/任意日本語から推測しない。
    violation: 'FAIL / REQUIRED_RECORD_MISSING for unfulfilled required approval; unknown kind or target context: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR11.1, FR11.3, FR9.1]
    tests: [FD-T09, FD-T10]
  - id: BR2.2
    statement: 掲載前変換は既存native形式に対応し、CI検査とは分離する。
    category: calculation
    applies_to: [PublishedRecordProjection]
    trigger: authorized-prepublication-transformation
    logic: >
      IF 既存権限内でplan/summary/stage-completionの記録を掲載へ変換する THEN specのnative対応表に従い元参照との対応を保持する。
      CIは公開viewと実PR観測のkind/choice/target/attempt/recordRef/digest整合を調べる。
      元のaudit/.aidlc-engine raw log/receipt/authorization本体の取得や公開をCIの必須前提にしない。
    violation: 'unmappable input: do not create positive approval; malformed public view: FAIL / UNSUPPORTED_SCHEMA'
    source: [FR11.2, FR11.3, FR11.4, NFR3]
    tests: [FD-T09, FD-T11]
  - id: BR2.3
    statement: plan無効化・一般質問・自動完了から人承認を作らない。
    category: constraint
    applies_to: [PublishedRecordProjection]
    trigger: approval-transformation-or-validation
    logic: >
      IF 一般QUESTION_ANSWERED、plan off/skipped、自動GATE_APPROVED、Autonomous:true、STAGE_COMPLETED単独
      THEN それだけで必要な人承認を充足しない。batch表示もproducerのcanonical値を使い表示文から推測しない。
      正式適用外は固定stage契約/current checkpointの根拠で区別し、PRの免除flagを採用しない。
    violation: 'required human approval absent: FAIL / REQUIRED_RECORD_MISSING; applicability unknown: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR9.3, FR11.3, FR4.1]
    tests: [FD-T10, FD-T11, FD-T15]
  - id: BR3.1
    statement: READY適用日はstage-completion承認日を固定timezoneで判定する。
    category: calculation
    applies_to: [PublishedRecordProjection]
    trigger: ready-required-set-derived
    logic: >
      IF stage-completionのapprovedAtが厳密date THEN policy.readyCutoff.timezoneの暦日で比較する。
      offset付きtimestampは同zoneへ変換しinclusive cutoffで比較する。
      plan/summary/掲載recordの生成日を代用しない。欠落/invalid/offsetなし/参照矛盾/日付だけの旧日変更はUNKNOWN。
    violation: 'UNKNOWN: APPROVAL_DATE_UNKNOWN or APPROVAL_DATE_CONFLICT'
    source: [FR9.1, FR9.3, FR11.3, NFR5]
    tests: [FD-T12, FD-T13, FD-T14]
  - id: BR3.2
    statement: 適用する正式見直し役のREADYを対象・試行・現在stage内容へ結ぶ。
    category: validation
    applies_to: [PublishedRecordProjection, ConformanceAssessment]
    trigger: ready-condition-evaluated
    logic: >
      IF cutoff以後の人完了承認段または現在の再開対象で実施済み必須見直しが適用される
      THEN 正式役名/verdict READY/requestRef/recordRef/slot/stage固定subset digestの整合を要求する。
      review文字列だけ、NOT-READY、未設定、別対象/旧attempt/修正前内容で充足しない。
      未開始段に見直し実施を捏造しない。検査は公開記録の整合であり実実施認証ではない。
    violation: 'FAIL: READY_MISSING or TARGET_MISMATCH or ATTEMPT_MISMATCH or ARTIFACT_DIGEST_MISMATCH'
    source: [FR9.1, FR9.2, FR9.3]
    tests: [FD-T03, FD-T09, FD-T10, FD-T13, FD-T15]
  - id: BR3.3
    statement: 閾値前の不足は非保証とともにnonblocking残件として保持する。
    category: policy
    applies_to: [ConformanceAssessment]
    trigger: confirmed-pre-cutoff-ready-missing
    logic: >
      IF 承認日の照合が完了しcutoff前のREADYだけが不足 THEN ready条件はPASSにできるが
      KnownRemainingの全fieldとrevisitOnReopenを保持する。全承認が旧日で必要READY0件でも同じ扱い。
      stages/artifactsの空集合、未知日、閾値後不足をlegacyへ移さない。AUNも同じpolicyを使う。
    violation: 'missing required evidence: FAIL / REQUIRED_RECORD_MISSING; unknown date follows BR3.1'
    source: [FR9.3, FR5.4, FR13.3]
    tests: [FD-T06, FD-T12, FD-T14, FD-T20]
  - id: BR3.4
    statement: 原承認と再承認・再開を分離し古い日付を新対象へ継承しない。
    category: validation
    applies_to: [PublishedRecordProjection]
    trigger: reopened-or-reapproved-slot-evaluated
    logic: >
      IF 再承認または再開 THEN 元approvalRefと現attemptを区別し通常の見直し適用へ戻す。
      再承認はその承認日で判定する。旧不足の残件は保持し、再開中の未来完了承認は要求しない。
      元参照/再承認を落として旧日だけを残した場合は整合不足として止める。
    violation: 'UNKNOWN / APPROVAL_DATE_CONFLICT or INPUT_UNOBSERVABLE; applicable READY absent: FAIL / READY_MISSING'
    source: [FR9.2, FR9.3, FR11.4]
    tests: [FD-T11, FD-T13, FD-T15]
  - id: BR4.1
    statement: 内容digestは固定PR headの実blob bytesから再計算する。
    category: calculation
    applies_to: [ObservedSnapshot, PublishedRecordProjection]
    trigger: artifact-set-observed
    logic: >
      IF 必要pathの実blobを取得できる THEN raw bytesのbyte数/SHA-256を計算し、UTF-8 byte順pathでsortした
      JSON.stringify([path,bytes,sha256])+LFのUTF-8連結をhashする。global全集合と各stage固定subsetを別scopeで比較する。
      desired/記録の宣言値を観測へ写さず、native fingerprintと同じhashと呼ばない。
    violation: 'FAIL / ARTIFACT_DIGEST_MISMATCH; bytes unavailable: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR5.2, FR9.2, FR11.4, NFR5]
    tests: [FD-T04, FD-T16, FD-T18]
  - id: BR4.2
    statement: 必要path集合と自己参照除外は信頼版規則で固定する。
    category: constraint
    applies_to: [PublishedRecordProjection]
    trigger: manifest-built
    logic: >
      IF path欠落/重複/rename/未分類追加がある THEN 対応を検査し未分類を除外しない。
      記録自身/監査comment/CI結果は固定した除外種別に限って内容hash集合から外し別の構造検査を行う。
      AI-DLC通常成果物を記録扱いで除外せず、掲載commit自身のSHA事前埋込みを要求しない。
    violation: 'FAIL / ARTIFACT_SET_MISMATCH or DUPLICATE_RECORD; classification unknown: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR11.1, FR11.4, FR5.2]
    tests: [FD-T02, FD-T15, FD-T17, FD-T18]
  - id: BR5.1
    statement: 設計監査4分類は設計と実差分の根拠で判別する。
    category: validation
    applies_to: [ConformanceAssessment]
    trigger: design-audit-applicability-checked
    logic: >
      IF DB構造/権限/契約/securityのいずれか該当 THEN 設計監査を必須にする。
      全分類の非該当根拠が揃う場合のみdesignAuditをNOT_APPLICABLEにできる。
      PR自己申告や不明を非該当へ変換しない。別途のOwner保護条件とは分ける。
    violation: 'UNKNOWN / INPUT_UNOBSERVABLE for unknown applicability; required audit absent: FAIL / DESIGN_AUDIT_MISSING'
    source: [FR10.1, FR10.2]
    tests: [FD-T05, FD-T16]
  - id: BR5.2
    statement: 同PR設計だけheadと独立監査のrequest-review対応を照合する。
    category: validation
    applies_to: [ObservedSnapshot, ConformanceAssessment]
    trigger: design-audit-required
    logic: >
      IF 監査が必要 THEN 実在designHead/現在head祖先/base/設計だけのsnapshot/同repo-PR-unitを確認し、
      公開request-review本文hash/request_digest/指定投稿者/必須全PASS/blockingなし/工程参照順を照合する。
      名前やURL存在だけで合格にせず、READY_FOR_REVIEWを監査PASSへ変換しない。
      commit日時だけでCodeGen実開始やengineイベントの真実を証明せず既存PR独立監査で補う。
    violation: 'FAIL / DESIGN_AUDIT_MISSING or DESIGN_AUDIT_BINDING_MISMATCH; unavailable: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR10.2, FR10.3, FR4.3]
    tests: [FD-T05, FD-T16, FD-T19]
  - id: BR5.3
    statement: 設計変更は旧監査を失効させ、受付CIとU1の成立を循環させない。
    category: constraint
    applies_to: [ConformanceAssessment]
    trigger: design-history-or-intake-checked
    logic: >
      IF designHead以後に対象設計/契約入力が変わった THEN 変更を戻しても旧PASSを再有効化しない。
      未監査design-only headではU1は閉門するが、既存設計監査受付CIを未取得U1 PASSへ依存させない。
      mandatory削除/checks空/条件を減らす設計モードPASSを作らない。実装head監査等は別に必要。
    violation: 'FAIL / DESIGN_AUDIT_STALE or DESIGN_AUDIT_MISSING; incomplete history: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR10.2, FR10.3, FR10.4, NFR10]
    tests: [FD-T16, FD-T19]
  - id: BR6.1
    statement: 公開allowlistから私的原本・秘密・人返信を除外する。
    category: constraint
    applies_to: [ObservedSnapshot, PublishedRecordProjection, ConformanceAssessment]
    trigger: input-projected-or-output-encoded
    logic: >
      IF 掲載/出力する THEN audit/.aidlc-engine/生review body/人返信/秘密/他repo非公開記録を含めない。
      recordRefは公開論理参照だけ。既存権限内の変換元private fieldを全公開必須にしない。
      必要な公開Owner決定は具体URL/本文SHA/対象を照合するが本人認証や別権限の代用にしない。
    violation: 'FAIL / UNSUPPORTED_SCHEMA for prohibited published content; required public decision unavailable: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR11.2, FR11.3, FR4.3, NFR2, NFR3]
    tests: [FD-T09, FD-T11, FD-T17]
  - id: BR6.2
    statement: 版・型・path・unknown criticalの不備を黙って受理しない。
    category: validation
    applies_to: [PublishedRecordProjection, ObservedSnapshot]
    trigger: public-view-parsed
    logic: >
      IF schema major/必須型/enum/重複JSON key/部分記録/過大入力が不正 THEN 停止する。
      pathはGit treeのUTF-8 bytesを保持し、絶対path/空segment/dot/dotdot/backslash/NUL/境界外symlinkや循環を拒否する。
      任意説明はextensionsだけに限定し未知criticalで意味を上書きしない。外部文字列を命令として実行しない。
    violation: 'FAIL / UNSUPPORTED_SCHEMA or DUPLICATE_RECORD; incomplete read: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR5.3, FR11.4, NFR3, NFR8]
    tests: [FD-T11, FD-T17]
  - id: BR7.1
    statement: 四条件を三値で集約し合格と権限を区別する。
    category: calculation
    applies_to: [ConformanceAssessment]
    trigger: conditions-evaluated
    logic: >
      IF FAILが1件以上 THEN 全体FAIL、FAILなしUNKNOWNありならUNKNOWN、それ以外はPASS。
      records/ready/digestsはNOT_APPLICABLE不可、designAuditだけ根拠付き非該当を許す。
      FAIL/UNKNOWNは理由を持ち既存entryでexit1、PASSはexit0。核はexitせず結果を返す。
      合格はengine真正性/Owner本人/実review実施を保証せず進行/merge/保護対象の許可にもならない。
    violation: 'malformed result: FAIL / UNSUPPORTED_SCHEMA; required failure or uncertainty must stop'
    source: [FR5.4, FR4.3, FR11.4, NFR10]
    tests: [FD-T01, FD-T02, FD-T03, FD-T04, FD-T05, FD-T19]
  - id: BR7.2
    statement: 完全assessmentと非保証・残件・scopeをinlineで渡す。
    category: validation
    applies_to: [ConformanceAssessment]
    trigger: E03-C03-C05-C07-boundary
    logic: >
      IF 結果を渡す THEN entitiesの完全AdmissionEnvelopeを用い、元結果/観測と四条件/固定非保証値/knownRemaining/scopeを照合する。
      assessment省略、固定値改変、元残件の空化、別対象、参照だけの入力を拒否する。
      元結果が取得不能ならdefaultで復元せずUNKNOWN。正当残件0件でもarrayを保持する。
    violation: 'FAIL / UNSUPPORTED_SCHEMA or TARGET_MISMATCH or RECORD_CONFLICT; source result unavailable: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR5.4, FR11.4, FR13.3, NFR5]
    tests: [FD-T01, FD-T06, FD-T07, FD-T20]
  - id: BR7.3
    statement: 観測参照を同じenvelope内で一意に解決し対象を照合する。
    category: validation
    applies_to: [ConformanceAssessment, ObservedSnapshot]
    trigger: envelope-decoded
    logic: >
      IF observationRefsが同梱observationsのobservationIdへ一意に解決し同scope THEN 消費できる。
      dangling/重複/別scope/不能を受理せず、EvidenceCollectionが供給しConformanceGateが照合する。
      source assessmentをAUN targetへ書き換えず配布先は別参照。AUN実PRは後続で別評価する。
    violation: 'FAIL / DUPLICATE_RECORD or TARGET_MISMATCH; unresolved: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR5.1, FR5.3, FR13.3, NFR5]
    tests: [FD-T06, FD-T07, FD-T08, FD-T20]
  - id: BR8.1
    statement: 実取得を有限予算で行い部分取得・対象変更をUNKNOWNにする。
    category: constraint
    applies_to: [ObservedSnapshot]
    trigger: read-adapter-executed
    logic: >
      IF 全PR files/tree/blob/必要公開commentがpolicy.budget内で取得でき前後head/baseも同じ THEN 完全な観測を渡す。
      欠ページ/制限/404だけ/権限拒否/timeout/cancel/途中変更は不能とし、同じ状態で自動再試行しない。
      metadataはread-only資格情報、test/buildへwrite資格情報を渡さず境界外読書き0を保つ。
    violation: 'UNKNOWN / INPUT_UNOBSERVABLE; no dependent effect or passing partial output'
    source: [FR5.2, FR7.1, NFR2, NFR6]
    tests: [FD-T17, FD-T19]
  - id: BR8.2
    statement: 核に時刻・ID・観測を明示入力し意味を一元化する。
    category: constraint
    applies_to: [ConformanceAssessment]
    trigger: pure-evaluation-called
    logic: >
      IF 核を評価 THEN now/識別子/観測/予算結果/固定規則を呼出側から渡す。
      核は時計/乱数/UUID/I/Oを取得せずadapterは形式だけを変える。同一入力と同義入力は同じ意味/理由。
      停止後にwatcher/後継記録を生成せず、変更があれば正当な再評価で新たに観測する。
    violation: 'indeterminate inputs: UNKNOWN / INPUT_UNOBSERVABLE; non-deterministic implementation fails later verification'
    source: [FR5.2, NFR5, NFR6]
    tests: [FD-T17, FD-T18]
  - id: BR9.1
    statement: U1は照合だけを担い他の権限・監査・役の実行を代行しない。
    category: authorization
    applies_to: [ConformanceAssessment]
    trigger: result-consumed-or-action-requested
    logic: >
      IF U1 PASSを消費 THEN 既存devauditor PR独立監査/作者受領/別担当統合/必要公開Owner exact-headを別条件として保持する。
      U1は未知役へ委任せず、正式見直しの既存同時1体/親同モデル/段見直しだけの範囲を拡張しない。
      U3が正式進行を担い、次単位CodeGenは前単位統合後。旧道筋/判定4・5/失敗隠しを復活させない。
    violation: 'no authorization emitted; inconsistent evidence or unmet separate conditions must not be represented as granted'
    source: [FR4.1, FR4.2, FR4.3, FR9.3, FR10.3]
    tests: [FD-T01, FD-T15, FD-T19, FD-T20]
  - id: BR9.2
    statement: U1最小sliceの結果を初回・追加・AUN全体完了へ拡張しない。
    category: policy
    applies_to: [ConformanceAssessment]
    trigger: completion-scope-reported
    logic: >
      IF U1を確認 THEN 実PR読取からCI停止までの自単位範囲だけを述べる。
      初回実ゴールはU1-U5、AUN実適用/実PR正負/driftはU7、初回後新要求の実追加はU6の実証が別途必要。
      U4の信頼版2センサー実CI再実行をU1で済ませず、文書/fixture/exit0だけで全体完了としない。
    violation: 'reject unsupported completion claim; unavailable real evidence: UNKNOWN / INPUT_UNOBSERVABLE'
    source: [FR5.4, FR8.1, FR8.3, FR12.1, FR13.3]
    tests: [FD-T01, FD-T20]
```

## Rules Summary — Derived View

| Group | Rule IDs | 要点 |
|---|---|---|
| 対象と必要集合 | BR1.1–BR1.4 | 対象/attempt、独立した必須集合、現在checkpoint、重複/競合 |
| 承認形式 | BR2.1–BR2.3 | kind別の肯定値、掲載前変換と公開CIの分離、自動/skipの排除 |
| READY | BR3.1–BR3.4 | 固定日付、正式役/現在subset、legacy残件、再開/再承認 |
| 内容 | BR4.1–BR4.2 | raw bytesと全集合/subset、固定した自己参照除外 |
| 設計監査 | BR5.1–BR5.3 | 4分類、同PR設計head/監査対応、失効と受付循環防止 |
| 公開/形式 | BR6.1–BR6.2 | 私的記録除外、版/型/path/unknown critical |
| 結果 | BR7.1–BR7.3 | 4条件集約、完全inline、非保証/残件/参照/対象保持 |
| 読取/決定性 | BR8.1–BR8.2 | 有限予算、最小権限、外側I/Oと純粋核 |
| 責任範囲 | BR9.1–BR9.2 | 独立監査/権限を代行しない、小sliceを全体完了にしない |

理由codeは契約の既存候補を同じ意味で使用する。追加の意味をadapterごとに定義しない。`LEGACY_READY_MISSING`だけはnonblocking既知残件であり、FAIL/UNKNOWNの格納先ではない。現行契約に存在しない「完全整合した作者偽造JSONをCIだけで見破る」規則は追加しない。

## Assumptions & Open Questions

None.

規則は設計上の決定であり、実装/試験の合格ではない。標準S1–S9の既定/例外/report-onlyと、明示された4条件のblockingを混同しない。
