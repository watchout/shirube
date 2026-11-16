# U1 — CIの記録照合の機能設計計画

## Sources and Scope

対象は `261105-shirube-lifecycle-qualit / u1-ci-record-admission / functional-design`。今回は機能設計のStep1–3として、動作・データ・判定と受入試験の案を整理する。正式なentities/rules/functional-spec/traceabilityは要約確認の正式記録後に生成する。製品コード・試験・fixture・CI・外部投稿・他単位は着手しない。

正式入力は次の順で実読した。

- [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)
- [unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)
- [stories.md](../../../inception/user-stories/stories.md)
- [requirements.md](../../../inception/requirements-analysis/requirements.md)
- [components.md](../../../inception/domain-design/components.md)
- [contract-summary.md](../../../inception/contract-design/contract-summary.md)

追加入力はDelivery Planningの[bolt-plan.md](../../../inception/delivery-planning/bolt-plan.md)、[team-allocation.md](../../../inception/delivery-planning/team-allocation.md)、[external-dependency-map.md](../../../inception/delivery-planning/external-dependency-map.md)、[risk-and-sequencing-rationale.md](../../../inception/delivery-planning/risk-and-sequencing-rationale.md)、[確認済み回答](../../../inception/delivery-planning/delivery-planning-questions.md)。旧上流の「CIが原本真正性を証明する」「U1は3条件」という記載は、承認済みContract Designの変更対応表とREADY適用日を併読し、現在の前提へ戻さない。R-01/R-02はこの単位の設計・試験へ具体化すべき上流の引継ぎであり、以前の見直しや計画の存在で解消済みとはしない。

共有knowledge4件、architect knowledge6件、active-spaceのorg/team/project/construction規則、functional-design段定義、指定されたstage/summary/construction/reviewer/reviewer-unit/reviewer-repair/sensorsのprotocolを読んだ。spaceのshared/architect knowledgeディレクトリは存在しなかった。Standardのcorner-checklistを適用する。diaryは読取・編集していない。

## 既決事項と今回の未決

追加の通常質問は **0件**。四条件、非保証、READY適用日、規格、責任分担、実装順を再質問しない。R-01/R-02は既決要求の具体化で、人にnative形式や技術的な解決策を考えてもらう問いにはしない。残る人の確認は末尾の通常要約確認だけである。

- U1は対話U2/正規開始U3を待たず、実PR読取→四条件の照合→結果→不成立時のCI停止まで動く最初の最小統合版。
- 四条件は必要AI-DLC成果物/承認記録、適用されるREADY、現在成果物digest、該当する同PR設計だけheadの先行独立監査PASS。
- engine発行元・Owner本人性・実review実施は門の非保証。既存devauditorのPR独立監査が記録を読む運用で補い、PASSは進行/統合/保護対象の変更権限ではない。
- READYは固定Asia/Tokyoの2026-11-06以後のstage-completion承認/再承認に必須。旧不足はnonblocking残件として保持し、開き直した対象は通常見直し。日付不明/矛盾はUNKNOWN。
- U4の信頼版traceability/upstream-coverage実CI再検査、U5導入/初回完成、U7 AUN実受入、U6実追加は別の単位の責任。
- 指定順U1→U4→U2→U3→U5→U7→U6は維持する。runtime反映の残件はU1が済む頃に親が正式経路を確認し、無理ならU4前にOwnerへ順番を相談する。ここで偽辺・改名・state/cache編集・jump・新道具で解決しない。

## 提案する機能の流れ

1. 固定検査版のstage集合/適用計画/対象単位と現在評価checkpointを受け付ける。PR側の設定を必須集合の正本にせず、必要集合と掲載記録を別入力にする。
2. 読取adapterが対象PR/head/baseを実取得し、固定headの全必要tree/blobと差分、必要な公開監査原文を有限予算内で読む。途中変更/ページ抜け/権限拒否/予算超過は観測不能。
3. 掲載データの版・型・対象・重複・公開除外を検査し、種類別の承認値を下記の固定対応で正規化する。文字列の自然言語解釈や自動承認はしない。
4. 実bytesから全集合とstageごとのsubsetのdigestを再計算する。期待値を観測へ写さず、記録自身/CI結果の自己参照除外を固定規則に限定する。
5. ConformanceGateの一つの純粋核で四条件を評価する。時計/ID/観測/I/O結果は明示入力。必須FAILかUNKNOWNなら閉門し、designAuditだけ根拠付き非該当を許す。
6. 非保証・knownRemaining・対象/観測scopeを含む完全な結果を出し、同じ意味のJSONと既存entryのexitへ接続する。出力から欠落/改変された結果も合格として渡さない。
7. 評価中のhead/base変更を再確認し、結果の流用を拒否する。繰返し読取の常駐処理や状態変化なし再試行は追加しない。

判定は「受付→対象固定/観測→構造検査→再計算→四条件評価→出力」、失敗時は「原因と対象を返して停止」という一回の処理とする。正式AI-DLCのstage/stateを所有・変更する第二の進行機構にはしない。

## データと責任の具体化案

正式entitiesでは既存10entityの所有を維持し、U1の主な対象を次の3つに絞る。新しいDB・表・migration・常駐サービスは作らない。StageRecord/承認/manifest/日付/出力envelopeはこの3entityの入出力viewまたは値であり、正式承認や外部原本の所有entityを新設しない。

| 既存entity / 所有部品 | U1で具体化する内容 | 残す境界 |
|---|---|---|
| ObservedSnapshot / EvidenceCollection | 実PR/head/base、source/版/対象、完全取得/不能、実bytes由来digest、観測参照の対応 | native発行/本人認証ではない。GitHub/AI-DLCの原本は外部所有 |
| PublishedRecordProjection / EvidenceCollection | 必要成果物集合、段/単位/attempt、複数種別の承認、READY、公開allowlistと除外 | audit/.aidlc-engine/人返信/body/秘密を公開viewへ含めず、receiptを合成しない |
| ConformanceAssessment / ConformanceGate | 四条件結果/理由、対象/入力集合/観測、非保証固定値、knownRemaining | PASSで権限を発行しない。SensorResultや配布結果をU1が生成しない |

entities.mdはこの形と参照/多重度/論理制約、rules.mdは判定規則BR、functional-spec.mdは順序と状態の正本、traceability.jsonは割当全ACから実在BRへの対応を担う。今はその4正式成果物を生成しない。

## 必須集合・READY・digest・設計監査の具体化案

**必須集合:** 信頼版stage定義/有効計画/単位種別/評価checkpointを先に照合し、必要成果物/承認種類/対象attemptを求める。必要成果物/掲載stage集合は非空で、記録側の空配列やskip宣言で縮小させない。PR評価時点で人が完了承認した段と実施済みのplan/summary、現在提出する成果物を区別する。現在CodeGenの最終完了承認や未来Build and Test/CI段承認は先取り要求しない。gate:falseの単位summaryをstage-completionへ変換しない。

**現在性:** 過去6段/5段不足の固定リストを必須集合の計算に使わない。Delivery Planningなど、その後に完了承認された適用段も現在checkpointの必要集合へ含む。既存5段の閾値後不足という観測はその観測範囲の既知残件として残し、現在の全段の不足数や解消を未観測で断定しない。必要承認の有無/適用が曖昧ならUNKNOWN、完了済み必須記録が欠ければFAILとする。

**READY:** stage-completionのapprovedAt/参照先/対象attemptを照合し、timestampはoffsetからAsia/Tokyoの日付へ、dateだけは同zoneの暦日として比較する。境界は2026-11-05T15:00:00Zを含む。plan/summary/record作成日を代用しない。旧承認の不足はknownRemainingへ保持してready=PASSにできるが、再承認/再開対象の不足を旧日で免除しない。日付不明/矛盾/参照を残した日付だけの変更はUNKNOWN。必要READYが0件でも全承認日の判定と残件保持の根拠を必要とする。

**digest:** 固定headのraw bytesで各pathのbyte数/SHA-256を計算。pathをUTF-8 byte順にsortし、契約の`JSON.stringify([path,bytes,sha256])+LF`連結から集合hashを計算する。global集合と各stageの固定subsetを別scopeにし、native fingerprintと同じhashと呼ばない。重複・欠落・rename・未分類追加を検出し、PR由来excludeで弱めない。記録自身を自分のdigestへ含めたり、その記録commit自身のSHAを事前に要求したりしない。

**設計監査:** 四分類の設計/実差分による根拠、同PR/design-only snapshot/ancestor、request-review/本文hash/指定投稿者/必須PASS、現在design内容と掲載工程順の整合を検査する。実CodeGenの開始時刻やengineイベントの真実まで証明しない。監査後の設計変更は旧PASSを失効させる。既存監査受付の必須CIを未取得U1 PASSへ依存させず、U1に条件を減らす設計モード合格も作らない。設計監査と実装監査/作者受領/別担当統合/公開Owner判断は別条件のままにする。

## R-01 — 非保証と既知残件を欠かさない受渡し

初回形式は**完全なConformanceAssessmentをinlineで渡す**。単独の参照やPASS一語に省略する別形式は追加しない。CI/E03は既存のhead/outcome/reasons/authorizationに`assessment`と、その評価対象を示す`evaluationScope`・参照先の`observations`を持つ必須viewとして具体化する。U4/C03→U5/C05→U7/C07も同じassessmentを欠落なく渡す。これは新しい単位依存/外部APIではなく、既存契約の必須情報の具体化である。

| 必須情報 | 具体規則 |
|---|---|
| assessment本体 | assessmentId、Target、rulesetVersion、artifactSetDigest、四条件とoutcome/reasons、observationRefs、knownRemaining、既存必要参照をすべて持つ |
| 非保証 | assurance=`record-and-current-content-consistency-only`、engineAuthenticity/ownerIdentity/reviewerExecution=`not-verified-by-gate`、authorization=`NONE`を必須固定値とする。省略/別値を拒否 |
| evaluationScope | sourceのrepo/PR/head/base、Target、評価checkpoint、規則版、入力artifactSetDigestと対応する。外側から観測した対象と照合し、出力自身の自己申告だけで決めない |
| knownRemaining | array必須。旧READY不足のstage/unit/attempt/approvalRecordRef/approvedAt/revisitOnReopenを元の判定結果から保持。PASSでも削除/0件化しない。正当に残件0なら空配列を保持 |
| 内部参照 | assessment.observationRefsは、同じviewに供給したObservedSnapshotのobservationIdへ一意に解決する。供給責任はEvidenceCollection、判定結果との照合責任はConformanceGate。dangling/重複/別scope/取得不能はUNKNOWNまたは構造拒否で停止 |
| 外部source参照 | 実PR/tree/blob/公開監査原文の既存読取範囲に限定。元私的logの解決や新しい供給者を要求しない。公開できないものを本文で穴埋めしない |

シリアライズ/デコード境界では、供給元の評価結果と渡された値の四条件/非保証/knownRemaining/scopeが一致することを同じ共有検査で確かめる。transport用hashだけを作者が再計算しても発行元認証にはならない。元の結果/観測が得られず照合できない場合は、欠けた情報を既定値で補って受理しない。参照だけの省略入力はこの初回形式では受理しないため、新たな参照取得サービスを用意する必要はない。

U5/U7が受け取るsource assessmentの対象をAUNの対象へ書き換えない。配布元評価scopeと配布先/AUN targetは別参照として対応を保持する。AUN実PRの受入では、その実対象に対する新しい評価と同じ非保証/固定READY日付規則を確認する。U1の境界試験でU5/U7の実受渡し/実適用が済んだとは言わず、後続へ同じ拒否条件を引き継ぐ。

## R-02 — 種類ごとの肯定値とnative形式の対応

読取対象はinstalled native 2.11.1の既存producer/reader実装である。型や文字列の存在を発行元認証へ変換しない。製品が受け取るwire値は下表の正規化された固定labelだけとし、大小文字/番号/任意日本語の肯定推測を行わない。親が今回の人の会話を読んで選択を記録する行為とは分ける。

**掲載前の変換とCI検査を分ける。** 下表のnative event/receipt/authorizationのfieldは、既存権限内の掲載処理が使う変換元仕様と肯定値の出典であり、CIが元のaudit/.aidlc-engineのraw log/receipt本体を取得・照合する必須前提ではない。CI入力は契約の公開PublishedRecordProjectionと実PR観測に限り、公開kind/choice/target/unit/attempt/recordRef/現在digest等の整合を検査する。表に挙げたprivate fieldすべてを公開viewへ要求しない。public recordRefは既存契約の論理参照だけとし、私的path/bodyを含めない。掲載処理が元参照との対応を保持し、既存devauditorが記録を読む運用で補う。元receiptの存在/発行/本人/完全履歴の真正性をCIが証明したとはせず、新host/producer/原本供給/追加認証は増やさない。

| approvals.kind / 入力の種類 | 肯定として正規化する値と必要な形式 | 根拠 |
|---|---|---|
| plan / Code Generation Plan Approval | `Approve Plan`だけ。掲載前の変換はPLAN_APPROVAL_RECORDED.Detailsと当該対象に結ぶversion1 receipt.choiceを変換元として扱う。CIは公開kind=plan/choice=Approve Planと対象/attempt/recordRef/digestの整合を検査する | `.codex/tools/aidlc-log.ts:2066–2075,2470–2505`、`aidlc-lib.ts:5049–5158`、`aidlc-testing-posture.ts:4085–4202` |
| plan / 段内の分割計画等 | 固定stage契約が指定する計画質問の`Approve Plan`だけ。掲載前の変換が質問/選択肢/現計画との対応を保持し、一般のQUESTION_ANSWEREDをplanにしない。CIは公開plan記録と必要な計画対象/参照の整合を検査する | 正規read-only `aidlc engine log answers --stage units-generation`で、計画質問のoptions=Approve Plan/Revise Plan、旧答Revise Plan・改訂答Approve Planを観測。`aidlc-log.ts:1383–1460`は質問回答を同scopeで対にする |
| summary | `Looks correct`だけ。掲載前の変換はCheckpoint=summary-confirmationのSUMMARY_CONFIRMATION_RECORDED.Detailsとauthorization.choiceを変換元とする。CIは公開kind=summary/choice=Looks correctと対象/attempt/recordRef/現在成果物の対応を検査する | `aidlc-reply-reader.ts:164`、`aidlc-log.ts:2051–2065,2308–2357`、`aidlc-lib.ts:14027–14053,14131–14174` |
| stage-completion | `Approve`、または正式に提示された`Accept as-is`。掲載前の変換はGATE_APPROVED.User Inputのlabelを用い、STAGE_COMPLETED単独で代用しない。CIは公開stage-completion記録の肯定値/段/対象/承認日/attemptの整合を検査する | `aidlc-lib.ts:12789–12800`、`aidlc-state.ts:7230–7325,7632–7660`、stage-protocolの段承認とrevision escape条件 |

否定はplan/stage-completionの`Request Changes`、summaryの`Request changes`、段内計画の`Revise Plan`であり、承認の充足へ数えない。空/空白/unknown/種類違い（例: planへLooks correct、summaryへApprove、stage-completionへApprove Plan）も数えず、必要な承認ならFAIL。source kind/checkpointや対象が不明なときはUNKNOWNで止める。

Code Generationのplan receiptにある`skipped`（plan-approval off）や、nativeが許す質問表示のletter/引用符/Plan approval offという旧表記は、人の肯定承認と同一にしない。今回plan onの必要承認を省略できない。native側のbatch表示Approve PlansはproducerでApprove Planへ正規化されるが、製品はその表示文から勝手に承認を推測しない。

GATE_APPROVEDでも人のUser Inputが無い自動完了記録やAutonomous:trueを、人のstage-completion承認へ変換しない。gate:falseの単位完了/summaryだけから人の段承認を作らない。正式な適用外/自動完了という区別は固定stage契約と現在checkpointから判断し、必須の人承認を未知値や自作flagで免除しない。nativeのstageGateApprovalは会話の解釈後にcanonical labelを記録するための処理であり、そのfreeformの扱いをU1の判定核へコピーしない。

## 受入試験への引継ぎ案

以下は今後のNode組込みTDD/境界・統合試験へ渡す設計IDであり、試験コード/fixture/実行結果ではない。意味の核は1つ、観測/時計/IDを明示入力する。失敗/UNKNOWNは門のexit1、四条件成立はexit0を保持し、試験runnerの成功と負例門processの失敗を混同しない。

| 試験参照 | 入力/変形 | 期待結果 |
|---|---|---|
| FD-T01 | 正当な四条件と現在PR実bytes | PASS、完全assessment/非保証/対象を出力、authorization NONE |
| FD-T02–05 | 必要記録欠落、適用READY欠落、実blob1byte改変、該当設計監査欠落を1条件ずつ変形 | 対応する既存契約理由でFAIL、exit1 |
| FD-T06 | legacy不足を持つ正当PASSをE03/C03/C05/C07へ輸送/復元 | 非保証全field・knownRemaining・対象/観測scopeを完全保持 |
| FD-T07 | 上の出力から必須fieldを1つ削除、固定非保証値を改変、元の残件arrayを空に置換、別target/headに差替 | 欠落/変更/対象不一致として拒否。元の結果が不能ならUNKNOWN、成功にしない |
| FD-T08 | observationRef不明/重複/別scope、参照だけの省略結果 | 解決・照合できず拒否。新たな発行元や私的log読取へ迂回しない |
| FD-T09 | 架空の公開viewの各正しいlabel/kindと、許可された掲載変換の単体入力を別に用意する | 公開viewは該当種類の承認としてだけ充足。変換は定めたnative形式へ対応。CI用にraw log/receiptを用意せず、fieldを知るだけで真正性を証明しない |
| FD-T10 | 種類ごとに否定/空/unknown/他kindの肯定値へ置換 | 必須承認を充足せず停止。LLMの肯定推測を呼ばない |
| FD-T11 | 掲載変換の架空単体入力に一般質問/plan off/skipped/自動GATE_APPROVEDを与え、公開viewには旧attempt/取消し/不明なkind参照を与える | 変換で人承認を作らず、CIは公開viewの不整合/不明を拒否。元私的logのCI取得を前提にしない |
| FD-T12 | UTC 2026-11-05T14:59:59Zと15:00:00Z、dateだけ/同日timestamp、配布先TZ変更 | 前者legacy残件/後者READY必須。固定Asia/Tokyoで同じ結論 |
| FD-T13 | 旧原承認/閾値後再承認/再開、日付不明/参照矛盾/日付だけ改変 | 旧不足は残件保持、新対象は通常見直し。unknownをlegacyにしない |
| FD-T14 | 全承認が閾値前と確認できREADY集合0件、ただし必要記録は非空 | ready PASS+knownRemaining。空stagesによる免除は不可 |
| FD-T15 | Delivery Planning等の新たな完了承認を加えた集合、未来段/進行中単位summary | 現在checkpointの必要集合を更新。過去5件へhardcodeせず未来承認循環も作らない |
| FD-T16 | 別PR/head/design変更/監査body変更/順序参照の矛盾 | 設計監査の不整合/失効で停止。実開始時刻まで保証しない |
| FD-T17 | 欠ページ/権限拒否/予算超過/途中head変更/壊れたJSON/未知major/重複/境界外path | 有限に停止、UNKNOWNまたは構造拒否、対象外読書き/秘密出力0 |
| FD-T18 | 同義adapter入力と同じ純粋核入力の繰返し、並び順だけ変更したmanifest | 意味/理由/集合digestが同じ。観測実物を変えれば不一致 |
| FD-T19 | design-only headに監査PASS未取得、監査受付は既存必須CIが揃う | U1閉門をPASSと称さず、受付を未取得U1 PASSへ循環依存させない |
| FD-T20 | U5/U7へ引き継いだsource評価とAUN実PRの別評価 | source対象の書換え不可。AUN実受入/実CIは後続で同条件を確認し、U1だけで完了にしない |

## 割当ストーリーと全ACの設計準備

story-mapでU1に割り当てられた6USの全30ACを後のtraceabilityへ含める。共有storyの他単位分をU1だけで完了とはしない。FR9/FR11等の真正性表現とREADY適用は、承認済みcontract-summaryの変更対応を適用する。

| Story / AC | U1の設計寄与と後続との境界 |
|---|---|
| US2.1 / AC2.1.1–5 | 現対象/記録/四条件と既存監査・統合条件の分離、旧工程退役。実進行/前単位統合との接続はU3、追加CI検査はU4と共同。FD-T01–05/11/15/19 |
| US2.2 / AC2.2.1–5 | 対象/版/内容・欠落/矛盾/不能・再計算・非保証/残件。対話表示はU2、実センサー結果はU4。FD-T06–08/15/17–18 |
| US3.2 / AC3.2.1–5 | 最小CI門の実接続と範囲限定。導入/設定/開始/初回完成はU2–U5、U1のfixtureだけで初回完了にしない。FD-T01–05/19–20 |
| US4.1 / AC4.1.1–5 | READYの必要集合/現対象/内容/試行/日付、非保証と既存監査の補完、未知役への自動委任なし。FD-T02–03/09–15 |
| US4.2 / AC4.2.1–5 | 四分類の根拠、同PR/design-only headと監査対応、変更失効。実CodeGen前監査/実装監査等の運用は別に保持。FD-T04/16/19 |
| US4.3 / AC4.3.1–5 | 必要記録/Inception/種類別承認/公開除外/実bytes照合/破損と競合拒否。発行元認証を保証しない。FD-T02–03/06–11/15/17 |

正式rulesはBRの検査グループとして、対象/必須集合、承認値、READY日付、digest、設計監査、公開境界、判定集約/出力保持、I/O不能のまとまりを準備する。ACごとに実在BRへOK、共同部分は後続の担当/段を示すN/AまたはDeferredで区別し、未設計をOKとしない。逆追跡も同じ正本から派生する。

## Corner checklistと維持する規格

| 適用する境界 | 処理方針 |
|---|---|
| PR/blob/公開監査の読取 | 欠落/拒否/404/部分一覧/途中変更/サイズ上限を成功にせず、契約の有限予算で止める。読み取り専用資格情報のみ |
| path/形式/text | 特殊文字をデータとして保持し、raw byte hashと表示escapingを分離。重複/別表記/不正JSON/未知必須形式/traversal/symlink/命令混入を拒否。必須の壊れた1件をskipして全体PASSにしない |
| identity/集合/時刻 | opaque IDと対象tuple、非空必要記録、重複/矛盾、inclusive JST境界、再承認/再開を同じ核で処理。未知と0件と非該当を分離 |
| concurrency/中断/出力 | head/base再読、古い応答拒否、部分出力を有効にしない。I/O外側に有限予算/停止、核に明示入力。人待ちは一度通知後停止 |
| security/公開 | 原本は外部所有。最小権限、公開allowlist、秘密/人返信/私的log除外。本人性/真正性をschemaから作らず既存独立監査で補う |
| 今回適用しない表面 | 専用Web/多tenant/課金/新DB/新provider/常駐watcherの要件は追加しない。新UI/導入/配布の実装は後続単位 |

S1–S9の既定/例外、TDD、Node組込みnode:test/assert、適用する実行コード全体（scriptsと適用src）の行網羅率100%、SEC-T、依存追加前の脆弱性確認、実行時npm依存なし、既存ESM/CLI契約を維持する。現在は機能の設計であり、具体的な実装・配置・検証コマンドの採択を先行しない。DB固有の別intent/既存担当/保留を保持する。設計記録だけの同PR独立監査PASS後にCode Generationへ進み、実装headの新CI/実装監査/作者受領/必要公開判断/別担当統合を保つ。

## Consolidated Summary Confirmation

- U1は、必要記録と承認、適用READY、現在PR実bytesのdigest、同PR設計だけheadの先行独立監査の4条件を一つの核で照合する最小CI門として設計します。対話や開始機能は待ちません。
- CI出力とAUNへの受渡しは完全なassessmentをinlineで渡し、非保証の全field・authorization NONE・knownRemaining・対象と観測scopeを保ちます。欠落/改変/別対象/解決不能な参照は受理しません。U5/U7の実配布・実受入は別に確認します。
- 承認は種類ごとに固定し、planはApprove Plan、summaryはLooks correct、stage-completionはApproveまたは正式提示されたAccept as-isを掲載前に既存native形式から変換します。CIは公開用記録と実PR観測の整合を検査し、元私的log/receiptの取得・真正性証明を必須にしません。否定/空/未知/別種類の肯定を承認にせず、製品による自由文の肯定推測を増やしません。
- READYは固定Asia/Tokyoの2026-11-06以後の段完了承認/再承認に要求し、以前の不足はnonblocking残件として保持します。再開対象を旧日で免除せず、日付不明/矛盾は停止します。必要集合は最新の適用段と現在checkpointから決め、過去5段へ固定せず未来段承認も先取り要求しません。
- 門はengine発行元・Owner本人・見直しの実実施を保証しません。既存devauditorのPR独立監査が記録を読む運用と、別の権限/受領/統合条件を保持し、新しい真正性機構や別取り組みへ広げません。
- 既存3entityを中心に、既存7部品/10entityの所有と13契約/7辺を保ちます。全30ACの自単位/共同部分を追跡し、正例と四負例、承認値、出力保持、日付/再開/不能/循環防止の試験へ結びます。ここではコードも試験も未実行です。
- S1–S9、TDD、Node組込み/実分母100%、SEC-T、最小権限、架空公開データ、1単位1PRと独立設計監査を維持します。U1後のU4選択という実行順の残件をここで迂回せず、正式な機能設計成果物を確認後に作ります。

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
