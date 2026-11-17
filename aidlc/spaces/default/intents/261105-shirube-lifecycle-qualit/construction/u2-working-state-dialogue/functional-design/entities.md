# U2 — Entities

## Sources and Scope

[確認済みの問いと答え](functional-design-questions.md)に基づく U2（実物に基づく導入状態・設定・規格の対話）の論理モデル。YAML がデータの形・所有・参照の正本であり、保存先の DB や表の設計ではない（U2 は何も永続化しない。Q2 = A）。動作の順は [functional-spec.md](functional-spec.md)、判定は [rules.md](rules.md) を正本とする。

正式入力: [unit-of-work](../../../inception/units-generation/unit-of-work.md)、[story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[stories](../../../inception/user-stories/stories.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/domain-design/components.md)（DialogueExperience）、[contract-summary](../../../inception/contract-design/contract-summary.md)（C02・E05・shirube-contracts/1）、[interaction-spec](../../../inception/refined-mockups/interaction-spec.md)。

**新しい語（権限・工程ではない、表示のための分類）:** 「項目状態」「観測不能の原因」「回答の状態」は U2 が対話の表示のために使う分類である。承認・権限・工程・ConformanceGate の理由コードではない。理由コードの集合は ConformanceGate（U1）だけが持ち、U2 は読むだけで増やさない。

U2 は新しい component を作らない。DialogueExperience の中の論理モデルであり、観測の型 Observation・Target は `shirube-contracts/1` のものをそのまま使う。

## Entity Model — Source of Truth

```yaml
model: shirube-u2-entities/1
wire_contracts: [shirube-contracts/1, shirube-c02/1, shirube-e05/1]
scope: u2-working-state-dialogue
persistence: none   # Q2 = A: すべて対話（dialogue session）の間だけ。U2 は保存先を持たない。
types:
  Ref: {logical_type: string, constraints: [nonempty, public-logical-reference, no-secret-value]}
  Sha256: {logical_type: string, constraints: [lowercase-hex-64]}
  Instant: {logical_type: string, constraints: [offset-included, supplied-by-caller]}   # 核は時計を読まない（S4）
  TargetRef: {logical_type: Ref, owner: shirube-contracts/1.Target}
  ObservationRef: {logical_type: Ref, owner: shirube-contracts/1.Observation}
enums:
  ItemState: [confirmed, missing, conflict, unobservable, wrong_target, invalid]
  UnobservableCause:
    - permission_denied        # 権限不足。未導入とは別
    - not_found_unconfirmed    # 404 だけ。未導入の確定ではない
    - fetch_failed
    - tool_missing
    - tool_unsupported_version
    - tool_cannot_start
    - timed_out
    - budget_exceeded
    - changed_during_read      # 読取り中に変わった・書込み途中
    - out_of_boundary          # 許可範囲の外（symlink・..・循環）
    - malformed                # 破損・形式不備。出典が対象を名指す必要がある（targetBinding = named）のに名指さない（unspecified）時もこの原因で表す（新しい原因を足さない。足すなら契約の改訂で、作る段で止めて伺う、R-11）
  AnswerState: [answered, invalidated, rejected]
  ToolProbeResult: [present, missing, unsupported_version, cannot_start, timed_out]
entities:
  DialogueSession:
    owner: DialogueExperience
    lifetime: until-dialogue-closes
    fields:
      sessionId: {type: Ref, supplied_by: caller}
      targetRef: TargetRef
      startedAt: Instant
      draftRef: Ref
    invariants:
      - 閉じると全部消える。次の対話は観測から不足だけを再び聞く（BR6.1）
  SourceRef:
    owner: DialogueExperience
    fields:
      sourceKind: {enum: [sds_pin, aidlc_version, aidlc_settings, claude_settings, workflow_caller, tool_probe, remote_metadata]}
      locator: {type: Ref, note: 対象の根からの相対参照。根の外は表せない}
      targetRef: {type: TargetRef, note: 呼出側が渡した対象（観測を結ぶ対象）。出典自身が名指した対象はここに入れず ObservedItem.namedTarget に持つ}
  ObservedItem:
    owner: EvidenceCollection   # ObservedSnapshot の所有は変えない。U2 は読んで項目に束ねる
    fields:
      itemKey: {type: Ref, note: itemCatalog の key}
      sourceRef: SourceRef
      observation: {type: shirube-contracts/1.Observation, note: availability = observed | unavailable}
      namedTarget: {type: TargetRef, presence: only-when-source-names-a-target, note: 出典自身が名指した対象。名指さない出典には持たない。呼出側が渡した対象（SourceRef.targetRef）との一致を ObservationFact.targetMatch に写す（BR1.1）}
      value: {type: any, presence: only-when-closed-form-and-observed-and-value-retained, note: 閉じた形（valueForm = closed）で、形式に合い秘密らしくない値だけ保持する（BR3.4・BR5.2、Owner の決定 116）。開いた形（valueForm = open。string・list）の観測値は持たない（Owner の決定 120）}
      valueDigest: {type: Sha256, presence: only-when-closed-form-and-observed-and-value-retained}
      lengthBucket: {enum: [empty, short, medium, long], presence: only-when-open-form-and-presence-value, note: 値の長さの区分（値そのものでも digest でもない）。測る量は valueType ごとに 1 つ: string = normalization 後の文字数（code point）、list = 要素の数。空の値（空の文字列・空の list）は presence = value・lengthBucket = empty とし、項目の許される形式が空を許す時だけ有効な値（BR3.1 の value）、許さない項目では invalid_format（BR3.4）。区分の境界の数値だけを NFR で決める。開いた形の観測値を示す代わりに持つ（Owner の決定 120）}
      matchGroup: {type: int, presence: only-when-open-form-and-presence-value, note: 同じ項目の出典どうしで値が一致するかを、値を持たずに表す番号。比較は核がメモリ上で normalization の規則で行い、同じ値の出典に同じ番号、違う値に違う番号を、出典の辞書順の最初に現れた順で 1 から振る。値・digest は残さない}
      withheld: {type: string, presence: only-when-closed-form-and-observed-and-value-not-retained, enum: [invalid_format, secret_like], constraints: [fixed-classification-not-derived-from-input, no-input-copy]}
      unobservableCause: {type: UnobservableCause, presence: only-when-unavailable}
      observedAt: Instant
      budgetUsed: {requests: int, bytes: int, elapsedMs: int}
    invariants:
      - 値は実際の読取りの結果だけ。宣言・cache・既定値を写さない（BR1.2）
      - 観測の単位は (targetRef, itemKey, sourceRef)。「最新」の選択はこの単位ごとで、項目だけでは行わない。同じ項目の別の出典の観測は互いに捨てない（BR9.1）
      - 開いた形（string・list）の項目の観測値は、値・digest・表示・案内文のどれにも持たない。持つのは presence・lengthBucket・matchGroup だけ（Owner の決定 120、BR3.4）
      - namedTarget は出典の実際の読取りの結果だけから作る。項目一覧の宣言や呼出側の対象を写さない（S5）
  ObservationFact:
    owner: DialogueExperience
    note: 古さの判定（BR8.3）と回答の結び（BR6.2）に使う、観測の単位ごとの実際に読んだ結果の再計算。参照名（ObservationRef・locator）の代わりにしない
    fields:
      unit: {targetRef: TargetRef, itemKey: Ref, sourceRef: SourceRef, note: 単位の識別として含める}
      targetMatch: {enum: [matches, differs, unspecified], presence: only-when-observed, note: "出典が名指した対象（ObservedItem.namedTarget）と draft の対象（SourceRef.targetRef = 呼出側が渡した対象）の一致。namedTarget あり・同じ = matches、あり・違う = differs（wrong_target、BR1.1）、なし = 項目一覧がその出典に書いた targetBinding で決める（by-location = 対象の根の下の位置で対象に結ばれているので matches、named = 出典が対象を名指す必要があるので unspecified）。unspecified は確認済みの根拠にならず、その単位は unavailable（原因 malformed）の事実にする（BR1.1・BR3.1）。differs・unspecified の出典は値・digest・分類・presence を持たない"}
      availability: {enum: [observed, unavailable]}
      presence: {enum: [value, absent], presence: only-when-observed-and-targetMatch-is-matches}
      valueDigest: {type: Sha256, presence: only-when-closed-form-and-value-retained, note: 閉じた形で値を保持した時だけ。値を保持しない分類の時と、開いた形の項目では持たない（Owner の決定 120）}
      lengthBucket: {enum: [empty, short, medium, long], presence: only-when-open-form-and-presence-value}
      matchGroup: {type: int, presence: only-when-open-form-and-presence-value, note: 出典どうしの一致を値なしで表す番号（ObservedItem.matchGroup と同じ）。単一の出典の項目は常に 1}
      withheld: {enum: [invalid_format, secret_like], presence: only-when-closed-form-and-value-not-retained, note: 値を保持しない時の固定の分類（Owner の決定 116）。入力から作らない。同じ分類の別の値の違いは事実に入らない（値を使わない項目なので draft の意味は変わらない）}
      unobservableCause: {type: UnobservableCause, presence: only-when-unavailable}
  ItemCatalogEntry:
    owner: DialogueExperience
    fields:
      itemKey: Ref
      label: string
      sources: {list: {kind: SourceKind, requiredForConfirmed: boolean, targetBinding: {enum: [by-location, named]}}, note: 各出典に requiredForConfirmed と targetBinding を必ず書く。書かれていない requiredForConfirmed は必須（true）、書かれていない targetBinding は named（出典が対象を名指す必要がある）として扱う（どちらも失敗側。必須の出典が absent の項目は confirmed にしない、BR3.1。名指さない named の出典は unspecified、BR1.1）。by-location = 対象の根の下の位置で読む出典（対象は読む位置で結ばれる。出典が別の対象を名指せば differs）、named = 出典自身が対象を名指す物（remote_metadata など）}
      valueForm: {enum: [closed, open], derived-from: valueType, note: "closed = version・commit-oid・boolean（形式が閉じていて、秘密らしい値と区別できる）、open = string・list（許される形式が広く、秘密らしさを形式では判定できない）。決定 120 により、open の観測値は保持・digest・表示をしない（BR3.4）。判定は valueType から導く 1 か所の関数が持つ"}
      valueType: {enum: [string, version, commit-oid, list, boolean]}
      normalization: {enum: [exact, lowercase-hex, version-compare], default: exact}
      userAnswerable: boolean
    note: valueType ごとの許される形式（答えを受け入れる境界）は、commit-oid = 40 桁の 16 進、version = 数字を . でつないだ版（接尾辞は任意）、boolean = true / false、string = 空白を含まない有限長、list = 要素の列（要素ごとに string の境界）。userAnswerable が真の項目（今は aidlc_settings = list）の要素の細かい形は設定の実物を読む必要があり、Code Generation で確定する（A-08）。確定までは正当な値の範囲を狭く取り、迷えば rejected（失敗側）。確定した時は同じ PR で entities・rules にも足す（Owner の追加の条件）。初期の項目集合は下の initialCatalog。追加は rules に従い、規格の「適用中」は観測できた物だけ（BR3.5）
  DraftItem:
    owner: DialogueExperience
    fields:
      itemKey: Ref
      state: ItemState
      confirmedValue: {type: any, presence: only-when-state-confirmed-and-closed-form, note: 開いた形（string・list）の項目は confirmed でも値を持たない（Owner の決定 120）。confirmed の事実は state と出典・有無だけ}
      candidates:
        list:
          candidateRef: {type: Ref, note: "itemKey と sourceRef から決まる識別。GuidanceSelection.candidateRef はこの値を指す。順位は持たない"}
          sourceRef: SourceRef
          presence: {enum: [value, absent], note: "absent = この出典は読めて、項目が無い（「この出典には無い」）。unavailable の出典は候補に入れず causes に載せる"}
          valueDigest: {type: Sha256, presence: only-when-presence-value-and-closed-form}
          displayValue: {type: string, presence: only-when-presence-value-and-closed-form}
          lengthBucket: {enum: [empty, short, medium, long], presence: only-when-presence-value-and-open-form}
          matchGroup: {type: int, presence: only-when-presence-value-and-open-form, note: 「どの出典と同じか・違うか」を値なしで示す}
        presence: only-when-state-conflict
        note: 開いた形の項目の conflict は値を並べず、出典・有無・matchGroup・lengthBucket だけを並べる。nextAction は fix-source（出典の持ち主へ直しを頼む。BR3.2）
      invalidSources: {list: {sourceRef: SourceRef, withheld: "invalid_format | secret_like"}, presence: only-when-state-invalid, note: 値・digest・候補を持たない。項目・出典・固定の分類だけ（BR3.4、Owner の決定 116）}
      unobservableCauses: {list: UnobservableCause, presence: when-any-source-unavailable}
      observationRefs: {list: ObservationRef}
      answerRef: {type: Ref, presence: only-when-valid-answer-bound}
  ConfigurationDraft:
    owner: DialogueExperience
    wire: shirube-c02/1
    fields:
      draftId: {type: Ref, supplied_by: caller}
      targetRef: TargetRef
      items: {list: DraftItem}
      answers: {list: Answer}
      missingItems: {list: Ref, derived: items.state == missing}
      conflicts: {list: Ref, derived: items.state == conflict}
      observationRefs: {list: ObservationRef}
      observationFacts: {list: ObservationFact, note: 実際に読んだ結果から再計算した事実。参照名から作らない}
      observationDigest: {type: Sha256, derived-from: [observationFacts], note: 全事実を観測の単位の辞書順に並べた正規の JSON の SHA-256。古さの判定に使うのはこれだけ（BR8.3）。answers・参照名は入力に入れない}
      draftDigest: {type: Sha256, derived-from: [items, answers, observationRefs], note: draft の同一性の識別。古さの判定には使わない}
    invariants:
      - 再観測で observationDigest が変わったら、この draft は古いとして新しい draft を作る（BR8.3）。回答を足すだけでは古くならない
  Answer:
    owner: DialogueExperience
    fields:
      answerId: {type: Ref, supplied_by: caller}
      itemKey: Ref
      kind: {enum: [value, keep-absent], note: "value = 利用者が値を答えた、または choose-source で値のある候補を選んだ。keep-absent = choose-source で absent の候補（「無いまま」）を選んだ。choose-source の選択は GuidanceSelection とともに Answer としても保持し、BR4.3 の再質問の判定は Answer で行う"}
      selectedCandidateRef: {type: Ref, presence: only-when-from-choose-source, note: DraftItem.candidates の 1 つを指す}
      value: {type: any, presence: only-when-kind-value-and-not-rejected, constraints: [validated-type, bounded-length, no-secret-value]}
      valueDigest: {type: Sha256, presence: only-when-kind-value-and-not-rejected}
      boundObservationDigest: {type: Sha256, note: 回答は 1 つの項目に結ぶので 1 件。回答した時点の項目の観測 digest（その項目の全出典の ObservationFact の正規の JSON の SHA-256。参照名からは作らない）と結ぶ（BR6.2）}
      state: AnswerState
      rejectionReason: {type: string, presence: only-when-rejected, constraints: [fixed-classification-not-derived-from-input, no-input-copy], enum: [secret_like, invalid_type, too_long, invalid_character, invalid_format, out_of_boundary, stale_answer, duplicate_conflict]}
      answeredAt: {type: Instant, note: 呼出側が渡す。「最新」の判定に使う（BR5.4）}
    invariants:
      - 同じ (itemKey, valueDigest) の再送は 1 件のまま（BR5.4。kind = keep-absent は (itemKey, selectedCandidateRef) で同じかを見る）
      - 秘密らしい値は state = rejected となり value も valueDigest も持たず、理由・案内・ログに入力を写さない（BR5.2）
  GuidanceSelection:
    owner: DialogueExperience
    wire: shirube-c02/1
    fields:
      selectionId: {type: Ref, supplied_by: caller}
      draftRef: Ref
      candidateRef: {type: Ref, note: 利用者が選んだ候補。DraftItem.candidates の 1 つ（presence が value か absent。absent を選ぶ = 「無いまま」）を指す。利用者が答えられる項目（userAnswerable）の食い違い（choose-source、Q1 = A）に限る。nextAction は GuidanceMessage だけが持ち、選択は nextAction を作り直さない。「次の操作」の候補の選択と、それを契機にした再照合・案内の切替は U6 の持ち物（BR9.2）}
      targetRef: TargetRef
      guidance: GuidanceMessage
      observationRef: ObservationRef
    invariants:
      - 開始・適用の許可でも公開の Owner 決定でもない（BR8.1）
  GuidanceMessage:
    owner: DialogueExperience
    wire: shirube-e05/1
    fields:
      targetRef: TargetRef
      conclusion: string
      nextAction: {kind: {enum: [confirm-permission, install-or-upgrade-tool, answer-question, choose-source, review-target, fix-source, wait-for-person, none]}, text: string}
      causes: {list: {itemKey: Ref, state: ItemState, unobservableCause: UnobservableCause}}
      unconfirmed: {list: Ref}
      reasons: {list: Ref, note: ConformanceGate の理由コードを読んだだけ。U2 は作らない（BR7.6）}
      observationRefs: {list: ObservationRef}
      blocking: {type: boolean, note: 人待ちなら true。1 回示して止まる（BR7.4）}
      text: {type: string, note: 色・配置に頼らない平文}
    invariants:
      - 同じ入力は同じ内容になる（BR7.3）。LLM の種類で意味は変わらない
  ToolProbe:
    owner: DialogueExperience
    fields:
      toolName: Ref
      result: ToolProbeResult
      observedVersion: {type: string, presence: only-when-present-or-unsupported}
      requiredVersion: {type: string, source: observed-from-pin-or-contract-not-copied}
      exitCode: {type: int, presence: when-process-ran}
    invariants:
      - 判断に使うのは機械可読な出力と終了コードだけ。manifest の宣言だけで対応済みとしない（BR2.2）
initialCatalog:   # 初期の項目一覧では、利用者が答えられる項目（aidlc_settings）の出典は 1 つで conflict にならず、conflict になりうる sds_commit は答えられない項目なので、choose-source は起きない。規則と型は将来の項目のために残し、試験は架空の試験用の項目一覧で確かめる。A-01: 対象から実際に読める物だけ。出典の割当は設計時点の想定（A-07）で、実物の位置との突き合わせは NFR 要件・置き場の設計で行い確定する。各項目は valueType を持つ（ItemCatalogEntry の必須の欄）
  - {itemKey: sds_commit, valueType: commit-oid, sources: [{kind: sds_pin, requiredForConfirmed: true, targetBinding: by-location}, {kind: workflow_caller, requiredForConfirmed: true, targetBinding: by-location}], normalization: lowercase-hex, userAnswerable: false}
  - {itemKey: kit_version, valueType: version, sources: [{kind: sds_pin, requiredForConfirmed: true, targetBinding: by-location}], normalization: version-compare, userAnswerable: false}
  - {itemKey: aidlc_version, valueType: version, sources: [{kind: aidlc_version, requiredForConfirmed: true, targetBinding: by-location}], normalization: version-compare, userAnswerable: false}
  - {itemKey: aidlc_settings, valueType: list, sources: [{kind: aidlc_settings, requiredForConfirmed: true, targetBinding: by-location}], userAnswerable: true}
  - {itemKey: protected_paths, valueType: list, sources: [{kind: sds_pin, requiredForConfirmed: true, targetBinding: by-location}], userAnswerable: false}
  - {itemKey: tool_node, valueType: version, sources: [{kind: tool_probe, requiredForConfirmed: true, targetBinding: by-location}], normalization: version-compare, userAnswerable: false}
  - {itemKey: tool_aidlc, valueType: version, sources: [{kind: tool_probe, requiredForConfirmed: true, targetBinding: by-location}], normalization: version-compare, userAnswerable: false}
notHandledByU2:   # 置き場の設計の Q5 = A（arc が Owner の決定 95 により入力）。項目一覧に入れず、確認済みとも示さない
  - {itemKey: required_checks, reason: 出典の割当（workflow_caller と sds_pin）が実物の位置・形式と突き合わせられていない。扱う単位と出典は、別に決める}
wireMapping:   # F04: 内部の構造体は保ち、C02 の既存の受渡し形（contract-summary「既存entityの受渡し形と所有」）へ LC5 の toC02Wire（純粋な関数）だけで渡す。契約の型は変えない（BR8.5）
  ConfigurationDraft:
    c02_fields: {draftId: string, targetRef: Ref, answers: object, missingItems: "string[]", conflicts: "string[]", observationRefs: "Ref[]"}
    mapping:
      - {wire: draftId, from: ConfigurationDraft.draftId}
      - {wire: targetRef, from: ConfigurationDraft.targetRef}
      - {wire: answers, from: "Answer のうち state = answered だけを itemKey をキーにした object。値 = {answerId, kind, value（kind = value）, selectedCandidateRef（choose-source）}。rejected・invalidated は渡さない"}
      - {wire: missingItems, from: ConfigurationDraft.missingItems}
      - {wire: conflicts, from: ConfigurationDraft.conflicts}
      - {wire: observationRefs, from: ConfigurationDraft.observationRefs}
    not_on_wire: [items, draftDigest, observationFacts, observationDigest]   # 内部の持ち物。古さの判定は U2 の内側（BR8.3）。必要なら契約の改訂を Owner へ戻す
  GuidanceSelection:
    c02_fields: {selectionId: string, draftRef: Ref, candidateRef: Ref, targetRef: Ref, guidance: string, observationRef: Ref}
    mapping:
      - {wire: guidance, from: GuidanceMessage.text, note: 色・配置に頼らない平文（結論・次の操作・原因・未確認を含む）。構造体の全体は E05 の GuidanceMessage として別に渡す}
      - {wire: "selectionId, draftRef, candidateRef, targetRef, observationRef", from: GuidanceSelection の同名の欄}
relationships:
  - DialogueSession 1..1 ConfigurationDraft（その対話の間）
  - ConfigurationDraft 1..* DraftItem; 0..* Answer
  - DraftItem *..* ObservedItem（itemCatalog の出典ごと）
  - GuidanceSelection 1..1 GuidanceMessage; 0..1 ConfigurationDraft（draftRef）
  - GuidanceMessage 0..* reasons（U1 の理由コードを参照するだけ）
```

## Ownership Notes

- ObservedSnapshot と Observation の型は EvidenceCollection / `shirube-contracts/1` の持ち物。U2 は同じ形で観測を出し、`issuerObservation` に認証済みを示す印を足さない。
- 項目状態は U2 の表示の分類である。ConformanceGate の合否や理由コードに写して使わない。ゲートへ渡す場合の観測不能は、ゲート側の `INPUT_UNOBSERVABLE` として扱われる（U1 の判定）。U2 の原因の一覧はその代わりにならない。
- 秘密の値はどの entity にも入らない（有無と参照名だけ）。fixture・例は架空の対象（sample-work）だけを使う。
- C02 の `explicitStart` は U3 の持ち物で、U2 は作らない（BR8.1・BR9.2）。

## Assumptions & Open Questions

None。設計上の未決の問いはない。[questions](functional-design-questions.md) の仮定 A-01〜A-06 と Q1・Q2 の答えを採った。仮定 A-07（レビュー 1 回目の指摘 R-08 による）: initialCatalog の出典の割当（例: protected_paths = sds_pin）は設計時点の想定で、対象の実物の位置・形式と突き合わせて確定するのは NFR 要件・置き場の設計。突き合わせるまでは「確認できず」として扱い、確認済みと示さない。保存の置き場・形式は Q2 = A により U2 の範囲に無い（後の単位への持ち越しは [traceability.json](traceability.json) と [functional-spec](functional-spec.md#carry-over-to-later-units) に記録）。
