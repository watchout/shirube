# U1 — 非機能要件の生成前確認

## Sources and Scope

対象は `261105-shirube-lifecycle-qualit / u1-ci-record-admission / nfr-requirements`。本段Step1–4の準備であり、正式6文書とtraceabilityは要約確認の正式記録後に生成する。製品コード・fixture・試験・CI・外部操作は実施しない。

正式入力は、既読の[functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)、今回実読した[technology-stack](../../../../../codekb/shirube/technology-stack.md)。形状/追跡の補完は同単位の[entities](../functional-design/entities.md)と[traceability](../functional-design/traceability.json)。新しいnfr-requirements段定義を読み、前段と同じshared/architect knowledge10件と適用protocolの読了を保持する。private diaryは読取・編集しない。

**上流の既知参照ずれ:** FDのW06末尾にあるE05の説明は、共有契約のE05と一致しない。共有契約の正しいE05は **U2/U6→LLMとのテキスト対話** である。独立監査/公開Owner判断はE01等の公開原文読取とBR6.1/BR9.1の別条件として扱う。FDは正式レビューREADY後の凍結成果物なので変更しない。この参照ずれは上流レビューの未解消Minor R-01であり、本段の新findingや解決済み記録にしない。Contract DesignのR-01/R-02引継ぎとは区別する。

## 既決と未決の確認

通常の新規質問は **0件**。性能・利用規模・稼働率の未指定を理由に、根拠のないp95/RPS/99.9%や新サービスを要求しない。既存の有限な一回のCLI/CI評価を対象に、停止・漏えい・決定性・出力完全性を合否で確認できる要件へ具体化する。技術上の安全な失敗処理や既決の保証範囲をOwnerへ再質問しない。

- 4機械条件、READY適用日とlegacy残件、現在checkpointに応じる非空必須集合、未来承認を要求しない条件は変更しない。
- engine真正性/Owner本人/実review実施は非保証。既存PR独立監査・作者受領・別担当統合・必要公開Owner判断を保持する。CIの入力は公開projectionと実PR観測であり、元私的receipt供給を前提にしない。
- R-01の完全assessment inline/非保証/knownRemaining/観測scope保持と、R-02のkind別固定肯定値・掲載前変換/CI検査分離は既決として引き継ぐ。
- 新DB/常駐watcher/管理host/producer/別取り組み/外部提案/新しい進行機構を追加しない。既存7単位・7依存辺の担当は保持する。

## 非機能要件の具体化案と合否

以下のNFRx.yは、生成後も元のInception NFR IDを引き継ぐ予定の詳細IDである。合否の正本は現在の機能規則・共通契約とし、adapterや配布先で閾値/理由/証拠の意味を再定義しない。表は試験要求であって、測定/試験済みの結果ではない。

| 親ID / 詳細ID案 | 対象と合格条件 | 不合格・後続分担 |
|---|---|---|
| NFR1 / NFR1.1 | 核・掲載変換・読取adapter・既存entryの適用実行コードを列挙し、scriptsと適用srcを含む実分母で行網羅率100%を測る。Node組込みTDDの失敗→実装→合格を残す | 分母0/未測定/80%/部分集合/skipは不適合。除外はPR理由と独立確認。実測はCode Generation/Build and Test、実CI接続は後続段/U4 |
| NFR1 / NFR1.2 | FD-T01〜20に結ぶ正例/四負例/日付/出力破損/不能/循環防止をassertし、負例の門exit1と試験runner成功を区別する | assertなし/実装をなぞるだけ/fixtureのみの完成は不可。U1実PR読取→核→CI停止の統合も必要 |
| NFR2 / NFR2.1 | PR/tree/blob/commentのmetadata経路はread-only権限。拒否入力で外部変更0、許可外読書き0、test/汎用buildへのwrite資格情報配布0 | jobごとの用途と資格情報の受渡しを後段で確認。権限拒否を未導入/成功へ変換しない |
| NFR2 / NFR2.2 | 公開出力/診断/fixtureへの秘密・実データ・他repo非公開記録・人返信・audit/.aidlc-engine本文の混入0。適用SEC-Tを項目/入力/合否付きで示す | 架空の機密らしき文字列を含む負例でも転記0。依存追加が生じる前に脆弱性を確認し、新依存導入をこの段で許可しない |
| NFR2 / NFR2.3 | 4条件PASSにも非保証とauthorization NONEを必ず残す。保護対象の公開原本URL/本文SHA/対象等の別条件は維持する | PASSを本人性/実review証明/merge許可にしない。完全整合の自己生成記録を機械だけで見破る保証は追加しない |
| NFR3 / NFR3.1 | JSONの必須型/版/enum/重複/部分書込み/unknown critical/過大入力を検出し停止。文字列中の命令やmarkupはデータとして扱う | 壊れた必須1件のskip、切捨て成功、shell実行への変換0。公開viewと許可された掲載変換の単体入力を分離 |
| NFR3 / NFR3.2 | Git treeと一致するpath bytesを保持し、traversal/別表記重複/境界外symlink/submodule経由参照を拒否する | 対象外読書き0。Unicode/空白/改行をhashの都合で正規化せず、表示escapingと内容hashを分ける |
| NFR4 / NFR4.1 | 取得/出力中断や構造不正時に部分結果を有効なassessmentとして渡さない。既存正常値・過去記録を変更しない | head/base/実digest未観測なら既存失敗診断/exit1。架空hash/宣言値代用/nullable化をせず、残件未評価を空配列へ合成しない |
| NFR4 / NFR4.2 | 読取前後のhead/baseを照合し、旧attempt/取消し/競合/途中変更で古いPASSを再利用しない。再評価時は現対象を再取得する | 並行した評価を合成して完全結果にしない。DB更新/バックアップ機構はU1の対象外。形式変更時の新旧同居/逆向きはNFR8と共同 |
| NFR5 / NFR5.1 | 同じ明示now/ID/規則/観測入力を一つの純粋核へ渡すと同じ意味/理由/結果。同義adapter入力でも同じ結論、実bytes変更なら不一致 | 核のI/O/時計/乱数/UUID取得0、desired→observed転記0。UTF-8 byte順manifest、globalとstage subsetの区別は既存規則を参照 |
| NFR5 / NFR5.2 | E03/C01/C03と後続C05/C07で完全assessment、非保証、knownRemaining、evaluationScope、同梱観測参照を保持。元結果との相違/参照不能は拒否 | source対象をAUNへ書き換えない。U1で形式/拒否条件を確認し、U5/U7の実受渡し/実対象受入は後続が実証する |
| NFR6 / NFR6.1 | 外部取得は下記の既存budget profileで有限に停止。ページ/件数/bytes/予算消費をI/O側で観測し完全性を判定する | 上限/欠ページ/拒否/timeout/cancelはUNKNOWNまたは前処理失敗で閉門。部分取得を成功にしない |
| NFR6 / NFR6.2 | 自動再試行0。人待ちは一回通知して停止し、停止後の効果/成果物/後継記録0。再評価は正当な変化/入力後だけ | U1は一回処理で独自非進捗loopを持たない。既存の有限非進捗上限を弱めず、watcherを追加しない |
| NFR7 / 非適用案 | U1の対象は副作用のない読取と判定出力であり、native操作/配布/外部投稿の再送を行わない。読取に冪等キーを要求しない | 効果ある開始/停止/照会はU3、配布/復旧はU5が同一キー・照会・競合拒否を担う。U1出力で効果の権限を発行しない |
| NFR8 / NFR8.1 | 検査版/規則版/schema/入力対象/実行環境を識別し、実測した固定版/clean checkoutで再現確認できる | manifest宣言や古いREだけで全Node/CLI/配置の対応を保証しない。checkerをPR入力から弱められない接続はU4と連携 |
| NFR8 / NFR8.2 | 共通/掲載schemaの既存majorを使い、未知major/criticalは拒否。optional説明は既存extensions契約に限る | 意味の変更は新旧同居/試験した逆向き/該当Owner判断を要し、黙った破壊的変更をしない。新形式を今追加しない |
| NFR9 / NFR9.1 | JSONとテキスト診断から対象、確認済み/不足/不一致/不能、理由、正当な次操作、保証範囲が区別できる | 色だけ/生エラーだけ/未確認を確認済みとする案内は不可。前処理診断を配布可能な完全assessmentと呼ばない |
| NFR9 / NFR9.2 | legacy READY不足のstage/attempt/承認参照/日付/revisitOnReopenをPASSでも保持。未評価の残件は未評価と示す | 旧5段不足に集合を固定せず、新たな完了承認も現在checkpointへ反映。初回/追加/AUN全体完了への拡大0。対話表示はU2/U6 |
| NFR10 / NFR10.1 | 既存ESM/Node宣言/Node組込み試験/実行時npm依存なし/構造・依存・秘密検査を維持し、既存JSON/exit契約へ接続する | CLI/DB/HTTP frameworkを新設せず、既存source構造等の採択規約を退役したPR予算と混同しない |
| NFR10 / NFR10.2 | 必須FAIL/UNKNOWNは門の失敗へ伝播し、無条件PASS/continue-on-error/skip成功換算0。前処理失敗と有効assessmentを区別する | 設計監査受付CIを未取得U1 PASSへ依存させず、mandatory削除/設計モード合格を作らない。実workflow配置は正規の後続設計で決める |

## 性能・容量・停止の既存予算

数値の正本はcontract-summaryのAdmissionContextとFD rulesのpolicy.budgetを参照する。現在の値は **1取得20,000ms、総外部照会120,000ms、最大100取得、1応答8,000,000bytes、自動再試行0**。PR側や配布先の設定で拡大・無限化しない。これは外部照会の停止予算であり、未計測のCLI全処理遅延/SLA、CPU/memory使用量、p95、throughputの保証ではない。

- 予算内で全必要path/page/blobを取得できる正例と、各上限/遅延/途中中断の負例をFD-T17と結ぶ。停止の判定が規定の予算に従うことを、明示入力した時計とadapter境界で確認する。
- PRや成果物が増えれば同じ規則で集合を処理し、有限予算内で完全取得できない場合は成功範囲を縮めず停止する。100件を100PRや100artifactと読み替えない。取得回数はページやblob等の実読取を含む。
- 同時評価で共有mutableな判定状態を持たず、各評価のtarget/head/attemptを分離する。自動並列数/大規模負荷/常駐サービスのSLOは追加しない。1応答上限を全体メモリ上限と称さない。
- 実際の処理時間/要求数/入力量は後段で対象版と測定方法を添えて確認する。未計測の性能を適合済みとしない。予算不足が実証で判明すれば影響と差を示し、黙って閾値を緩めない。

## 技術選択と境界の維持

既存のESM、Node `>=22`というmanifest、Node組込み試験、実行時npm依存なしを維持する。新言語/DB/driver/Web/queue/外部SaaSを採択しない。初回は現在の社内Codex/Mac/GitHub/GitHub Actionsで確認し、核と契約の意味をCodex専用へ限定しない。

technology-stackのroot HEAD `62ff73db…`でNode22 CI、公開main `7e775afd…`でNode26/coverage80%、開発依存のNode22 patch下限などは、RE時点の**異なる版のbaseline観測**である。現実行環境の再測定や新版採択ではない。後段で実際の対象/lockfile/runner/道具の適合を確認し、`>=22`全域で動作済み/80%で適合としない。mainのClaude/Bun前提engine-judgeもCodex対応済みとしない。

7単位と7辺、3主entity/既存10entity所有を維持する。U1はU2/U3なしで動き、U4の信頼版センサー再実行、U5の導入/初回、U7のAUN実適用/PR正負/drift、U6の実追加を代行しない。E01は公開実PR観測、E02は既存権限内の掲載変換、E03は既存CI門、E05はU2/U6のテキスト対話という正しい共有契約を使う。

## 安全・信頼性・観測の受入例

| 代表ケース | 合格として観測すること | 出典/対応 |
|---|---|---|
| 正当な四条件とlegacy残件 | 完全assessmentに非保証/対象/残件が保持され、必要READY0件の根拠も追える | FD-T01/06/14、NFR5.2/NFR9.2 |
| 四負例と承認値 | 記録欠け/READY欠け/実bytes不一致/設計監査欠けと、否定/空/未知/別kind肯定で依存操作が停止 | FD-T02〜05/09〜11、NFR1.2/NFR10.2 |
| 最初のblob/head取得に失敗 | 診断/exit1、有効assessmentなし、架空hash/nullable化/残件なし合成0 | FD-T17、NFR4.1/NFR9.1 |
| 途中変更/別対象/輸送改変 | 古いPASSを出さず、必須field/残件/観測scopeを失ったviewを拒否する | FD-T07/08/15/17/20、NFR4.2/NFR5.2 |
| 遅延/欠ページ/過大入力/悪意path | 有限に停止し、部分結果成功/境界外読書き/秘密転記0 | FD-T17、NFR2.1/NFR2.2/NFR3.1/NFR3.2/NFR6.1 |
| 同じ観測/異なる実物 | 同一・同義入力は同じ意味/理由/集合digest、raw bytesだけを変えれば不一致 | FD-T04/18、NFR5.1 |
| 閾値/再開/別TZ | 固定Asia/Tokyoの境界、再承認対象、legacy残件の扱いがShirube/AUNで同じ。不明日を旧日免除しない | FD-T12〜15/20、NFR5.1/NFR9.2 |
| 設計監査受付 | 未監査headはU1閉門、既存受付の必須CIを未取得PASSへ循環させない | FD-T16/19、NFR10.2 |

可観測性は既存JSON/exit/公開可能な診断/対象参照で満たす。新しいdashboard/分散trace基盤/常駐監視/外部通知先を追加しない。診断には取得失敗段階と予算超過等の原因を出し、生本文/秘密/私的pathを出さない。記録の保持期間や新しい保存先を独自に作らず、元の履歴/公開境界を保持する。

## 生成と追跡の予定

要約確認後、performance/security/scalability/reliability/observability/tech-stackの6文書とtraceabilityを生成する。詳細IDは各主担当文書に一度だけ定義し、他文書は参照する。NFR1〜NFR10をすべてupstreamに宣言し、NFR7は上記の非適用理由、他9項目は実在する詳細IDへ対応させる。FDの四条件や理由codeをNFR文書で再定義しない。

NFR Designでは配置/制御方法を具体化し、後段で実装・試験・実CIを行う。ここでは計測や実行を済ませたと扱わない。S1〜S9の既定/例外/report-only、採択済みSEC-T/TDD/実分母100%、1単位1PR、同PR設計監査前置、実装headの独立PR監査/作者受領/別担当統合、保護対象の公開判断を保持する。

Owner指定順U1→U4→U2→U3→U5→U7→U6のruntime反映未成立は既存残件のままとする。U1が済む頃に席が正式経路を確認し、無理ならU4前にOwnerへ順番を相談する。今回の要件で解決/再質問/偽辺/改名/state/cache/jump/engine変更はしない。

## Assumptions & Open Questions

None.

通常の新規判断はない。性能実測、実行環境の適合、実CIとU5/U7の受渡し、既知READY不足のactual PR受入、FD上流Minor R-01は未確認/未解消のまま引き継ぐ。

## Consolidated Summary Confirmation

- U1の非機能要件は、一回のCI門の有限停止・安全な読取・実bytes照合・同じ入力で同じ結果・完全な公開結果の保持として定めます。四条件や非保証を変更しません。
- 性能は既存契約の取得予算を維持し、根拠のない遅延/処理件数/稼働率目標や新サービスを追加しません。上限超過や部分取得は成功にせず停止します。
- 最小のread-only権限、秘密/内部記録の公開0、入力/path境界、SEC-T、Node組込みTDD、実分母100%、既存ESM/実行時npm依存なしを維持します。古いREの版は現環境の対応実証と区別します。
- 非保証・knownRemaining・対象/観測scopeを完全assessmentで保持し、取得不能で実digest/headが無い場合は完全結果を捏造せず既存診断/exit1とします。残件未評価を空配列にしません。
- 全NFR1〜10を追跡し、効果のないU1読取へNFR7の冪等キーは要求しません。U3/U5の効果処理、U4の実センサー、U5/U7の実配布/受入は担当単位へ残します。
- FDのE05参照誤記は上流の未解消Minorとして保持し、今回から正しい共有契約を用います。通常の追加質問はなく、正式6文書と追跡表はこの確認後に作成します。試験/計測/実CIはまだ行っていません。

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
