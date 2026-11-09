# Shirube — 実装単位

## Sources and Scope

- [確認済みの改訂分割計画](units-generation-questions.md): Approve PlanとLooks correct。初案のRevise PlanとOwner原文は同ファイルの履歴に保持する。
- [components.md](../domain-design/components.md)、[decisions.md](../domain-design/decisions.md): 承認済み7論理部品・10データ・6ADRの責任境界。
- [requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md): 全13Must・47下位FR・10NFR・17US・88AC、初回/実追加/AUN、範囲外W-01〜W-03。

この文書は実装/試験可能な単位の定義であり、実装済みや方式実証済みを意味しない。経済的な推奨実装順とcritical pathはDelivery Planningに委ねる。Owner指定の「最初はCI門」と本当の成果依存を分けて[依存DAG](unit-of-work-dependency.md)に記録する。

## Unit Definitions

directoryはrecord配下の `construction/<Directory>/` で用いる安定した名前である。Unit IDとDirectoryは[story-map](unit-of-work-story-map.md)および[traceability.json](traceability.json)と一致させる。規模は接続境界/失敗条件に基づく相対的な複雑さであり、工数や期限ではない。

| Unit ID | Directory | Name / Description | Kind | Deployment Model | Complexity |
|---|---|---|---|---|---|
| U1 | u1-ci-record-admission | 実PRの3条件を照合して停止する最小CI門 | service | shared | L |
| U2 | u2-working-state-dialogue | 実物に基づく導入状態/設定/規格の対話 | service | embedded | M |
| U3 | u3-native-operation-control | 明示開始/正規接続/停止/結果照会 | service | shared | L |
| U4 | u4-trusted-ci-verification | 信頼版2センサーの実CI再検査 | service | shared | L |
| U5 | u5-safe-versioned-distribution | 安全な固定版導入/再導入と実設定drift/復旧 | service | shared | L |
| U6 | u6-guided-recheck-increment | 初回後の新要求による選択/再照合/案内切替の実追加 | service | embedded | M |
| U7 | u7-aun-rollout-verification | AUN受け手向け配布と実PR/実設定での受入 | packaging | shared | L |

## Unit Responsibilities and Deliverables

### U1 — u1-ci-record-admission

**境界:** 対話や開始機能がなくても、実PR読取→正式原本/実発行元/現対象の照合→次の3条件の判定→不成立ならCI門停止までをこの単位で動かす。

1. 人が承認する段の実際の正式READYがworkspace/intent/unit/stage/attemptと現在の成果物内容へ対応する。
2. DB構造・権限・契約・セキュリティの該当性を設計/実差分へ根拠付け、該当単位は同じPRの設計だけのheadで独立設計監査が実装前に成立している。設計変更の失効と順序不明も扱う。
3. 必要な単位の設計/計画/試験/追跡/承認記録が原本由来でPRに揃う。最初の単位はInceptionも含み、audit/と.aidlc-engine/、秘密/他repo非公開記録の掲載を拒否する。

**具体的な成果:** 正式原本と実PR/headを読む実接続、原本由来の掲載用記録/PR実内容の照合、3条件の純粋な判定核とCI周辺、対象と理由を持つ実結果、不成立を門へ反映する実経路と正負の検証。3条件という数は今回の要求の項目を指し、旧門の判定番号とは同一視しない。

**再利用:** sds-gateの判定1〜3、audit-admission、mainの抽出/比較候補をそれぞれ有効な範囲で使う。原本の取得と判定を分け、既存の核を別コピーにしない。PRデータで検査正本や必須条件を弱められないようにする。

**除外:** 対話、明示開始、配布機能、U4の2センサー実再検査はU1の成功条件に必要な後続コードとしない。JSON構文だけのvalidator、設計文書、成功stub、原本不明な再生成一致ではU1完了にしない。3条件が通っても4項目目や既存必須条件を免除しない。

**必須前提:** 原本/実発行元を内部log公開なしでCIから独立確認する方式は未検証。後述のContract Design実物試験を方式採択前に通す。成立不能なら依存操作を停止し、具体差と必要判断へ戻す。U1の最小門だけをUS3.2の初回実ゴールや全13Must完了としない。

### U2 — u2-working-state-dialogue

**境界:** LLMとの対話から、実checkout/版/設定/適用規格を読み、不足/矛盾/観測不能と安全な次操作を説明する。読取専用の案内はU1の門の成功やU3の開始接続を実行前提にしない。設定案と実適用を分ける。

**具体的な成果:** 実物の観測から確認表示を構成する新コード、出典と不足に基づく質問、有効な回答の保持、設定A不足/B観測不能等の原因と安全な確認操作の説明。既存statusの読取表示だけにはしない。道具の欠落/非対応/起動不能、404と未導入、設定出典の競合、入力/パス境界を区別する。

**除外:** 読めない値やOwner回答を作らず、秘密の値を貼らせない。設定回答や案内選択から開始/適用の許可を作らない。初回に必要な安全案内は含むが、U6の選択→再照合→切替という実追加を先取りして完成扱いしない。

### U3 — u3-native-operation-control

**境界:** U1の必要条件とU2の現在の対象/明示開始の入口を、正式AI-DLCの正規操作へ接続する。段/単位/承認の正本は正式AI-DLCのまま、Shirubeは別の段状態機械を持たない。

**具体的な成果:** 現在のworkspace/space/intent/unit/stageと版/正式選択肢の照合、明示開始前の開発効果0、操作直前の対象再確認、正規入口の実接続と実結果、停止/同一要求/結果照会/競合/正当な再開を通す実adapter。核へ時刻/識別子/観測を明示入力する。

**再利用と制約:** progression-coreの有効な停止/照会の核を使うが、実接続/保存耐久性は別に検証する。main-engine-judgeのClaude/Bun/特定版前提をCodex適合済みとしない。人待ちは一度通知して停止し、停止後に効果/成果物/後継記録を生産せず、非進捗/外部I/Oは正式な有限上限/予算を持つ。結果不明なら同じ要求を照会し、新しいキーで盲目的再送をしない。

### U4 — u4-trusted-ci-verification

**境界:** U1の原本由来単位PR記録と同じ門へ、4項目目として信頼版traceability/upstream-coverageの実CI再検査を結ぶ。U1の3項目と混ぜず、センサーの検査意味を再実装しない。

**具体的な成果:** 信頼する固定版のchecker/必須集合/severity/対象pathの解決、実PR/headの入力へ両検査を実行する経路、実行元/版/対象/入力/実結果を持つSensorResultと門への接続。片方未実行、失敗/skip/timeout/不能、旧head、PRによる自己免除は停止する。手元の成功を代用しない。

**規格の実証:** TDD、適用される実コード集合の行網羅率100%、SEC-T、依存導入前の脆弱性確認、用途別の資格情報と最小権限、既存の必須検査と失敗隠し0の実結果を対象へ対応付ける。metadata取得へ読取だけの資格情報を用い、test/buildへ書ける資格情報を渡さない。workflow/必須検査の具体変更には従来の保護条件を保持する。

### U5 — u5-safe-versioned-distribution

**境界:** U3の正規接続/停止/結果照会とU4の信頼版検査/設定を、許可された固定版の安全な導入/再導入へ結ぶ。受け手の実設定driftと復旧を扱い、初回の実ゴールを統合して確認する。

**具体的な成果:** 固定版実内容/対象/許可差分/戻し方、必要判断を満たした実適用、既存設定/履歴/対象外資産の保持、適用後の実物再読、欠落/advisory化/別版/対象範囲変更のdrift検出、途中失敗/競合/再導入/復旧の実検証。kitのrender/apply/check/statusの有効部分を再利用する。

**制約:** Shirube自身のworkflow_call保護を外して導入成功にしない。pin/registryの宣言だけで適用済みとせず、404だけで未導入と確定しない。.codex/.claudeの対応配置のblockingと対象を再確認し、未検証配置へ成功を拡張しない。ずれを無許可の自動修正許可にしない。形式変更は旧新同居と試験した逆向きを持ち、半分の有効状態を残さない。

**初回受入:** U1〜U5を用いて、導入相談→設定→明示開始→実コード変更→必要な試験/CI/監査/承認/別担当統合→実結果まで確認する。最初の実機能は導入状態/設定不足/適用規格と安全な次操作の確認表示。小さな門や対話sliceだけで初回達成や全体完了を主張しない。

### U6 — u6-guided-recheck-increment

**境界と前提:** U1〜U5による初回の実ゴール完了と、その後の新要求受付が前提。現在の分割承認を将来の開始/実装許可へ流用しない。同じrepo/設定/履歴/規格/体制を維持する。

**具体的な成果:** 根拠のある不足解消案内または正式AI-DLC選択肢から項目を選ぶと、現在の対象/前提/必要判断を実際に再照合し、現状態の案内へ切り替える新コードと実動作。未選択の回答と初回の安全案内を保持する。同じ架空入力と観測の変化の前後結果で増分を証明し、新差分の試験/CI/独立監査/受領/必要承認/別担当統合を通す。

**負例:** 候補不明/不正選択、選択後の対象変更、取得不能は成功にしない。選択だけで開発/適用/再開を実行しない。既存動作の再実装、文言だけ、必須案内を削って作った差では受入不可。実差が成立しなければ題材の判断をOwnerへ戻す。初回の承認/試験/監査を流用しない。

### U7 — u7-aun-rollout-verification

**境界:** U5の固定版と受け手向け設定/受入素材をAUNの既存担当へ渡し、受け手側の実適用と実PR/実設定での受入を確かめる。独自の判定核を作らず、U1〜U5の同じ実行機能を使う。

**具体的な成果:** 配布版/差分/確認方法/戻し方、現在の担当受領/対象/権限/保留/必要な公開決定とhead条件の対応、実配布と実ファイル再読、AUNの実PR/headで4項目それぞれの正例/欠落/不一致/旧対象等の負例、必須CI不能/自己弱体化での停止、実設定driftと必要な復旧/再検証の実結果。

**公開境界:** AUN内部原本は権限のある元で照合し、公開Shirubeへ非公開記録・実データ・秘密を転記しない。公開側は架空入力と公開可能な結果のみ。配布元準備/registry/ローカルfixture/別PRの成功を受け手受入へ流用しない。既存担当/取り組み/保留を解除せず、既存kit版上げ例外を新センサー/初回導入/保護設定変更へ拡張しない。

## Deployment Model and Kind Rationale

serviceは実対象を読む/照合する/正規操作を運ぶ/適用する実行機能を届ける意味。U1/U4のCI実行もYAML配布だけではなく実行プログラムを含む。sharedは同じ核/固定版の実行機能を既存CLI・CI・利用先で共有する意味であり、HTTPサーバーや独立daemonの新設ではない。U2/U6のembeddedは既存の対話/CLI入口への組込みである。

U7のpackagingは既存の実行機能を利用する受け手向け配布物/設定/受入素材を届け、別の業務判定を新設しないため。kindはConstructionの設計成果物の適用を定めるが、安全設計・NFR・試験・CI・監査・実適用の受入を免除しない。library/spec/uiだけの先行単位や、standaloneの新しい常駐サービスへ分散しない。技術stack・詳細API/コマンド・DB製品/schemaはここで選ばない。

**代案:** 初案の対話slice先行と門/正規操作の統合は、OwnerのRevise Planを受けて採用しない。部品ごとの7独立deployは、信頼境界を保つために必要なわけではなく接続と運用を増やすため採用しない。現在案は門の独立した実証を最初に行い、同じ7論理部品の内部責任を機能単位で増分実装する。未着手候補の旧→新ID対応は質問ファイルに残す。

## Component and Entity Responsibilities

単位は作業の分割であって新しいentity所有者ではない。全10データの所有は承認済みcomponents.mdの部品に固定する。異なる単位で同じ部品を拡張してもmutableデータの共同所有や判定の複製を作らない。

| Component / Entities Owned | 単位の実装寄与 |
|---|---|
| DialogueExperience / ConfigurationDraft, GuidanceSelection | U2で観測からの質問/確認表示/安全案内。U3/U5で正規操作/適用結果の案内を接続。U6で選択/再照合/切替を実追加 |
| EvidenceCollection / ObservedSnapshot, PublishedRecordProjection | U1で正式原本/実PR/掲載用記録。U2で実状態/設定/規格の異なる読取。U3/U4/U5で操作/CI/配布の観測を接続。U7で受け手へ適用 |
| NativeAIDLCConnection / NativeOperation | U3で明示開始/正規入口/現対象/版と実結果の照会。U1はこの機能が無くても実行する |
| ConformanceGate / ConformanceAssessment | U1で3条件の照合。U2で観測状態の説明に必要な部分、U3で正規操作の必要条件、U4で第4項目の実CI結果を接続。後続も同じ核を使う |
| SensorVerification / SensorResult | U4で信頼版2センサーの実行と実結果。U5で対応設定を配り、U7で受け手の実CIを検証 |
| KitDistribution / DistributionRevision, DistributionAssessment | U5で固定版適用/再導入/drift/復旧。U7で受け手向け配布と実適用/受入 |
| SafeOperationControl / OperationAttempt | U1/U2も有限I/O予算と停止を守る。U3で効果の同一要求/照会/競合/再開を実接続しU5へ共有。副作用の無い読取へ不要な冪等キーを要求しない |

ObservedSnapshotやPublishedRecordProjectionは権限原本ではない。正式AI-DLCのstate/承認/実レビュー、GitHubのOwner決定/PR/監査/CI原本、受け手設定は外部所有のまま。時刻・識別子・乱数・観測は純粋核への明示入力とし、I/Oは周辺へ置く。

## Contract Design: 実物試験を方式採択の前に行う

U1に必要な、内部logを公開せずCIが正式承認/レビューの実発行元と現原本を独立確認する接続は未検証である。Owner指示に従い、次のContract Designでは**実物で試して観測証拠を得てから方式を採択する**。これは実装後の補足試験へ先送りしない。

- 実際の正式AI-DLC生成の承認/見直し原本、認可された取得経路と実行元、現workspace/intent/unit/stage/attempt/成果物内容、実PR/head、実CIの版と結果を対応付ける。
- 内部audit/と.aidlc-engine/のlog、秘密、非公開記録を公開せず、CIが独立して真正性と対象の対応を確認できる正例を実観測する。公開側の業務内容は架空のものだけにし、正式な実生成記録と合成した宣言を区別する。
- 作者偽造、改変、旧対象/旧内容/旧試行、設計変更等による失効、発行元不明、取得不能の負例を実物で拒否し、該当条件で停止する証拠を得る。実CI環境で認可/版/公開除外が成立することも確認する。
- 任意JSONの再生成一致、READY文字列、identityCheck:none、ローカルmockのみでは方式採択しない。新しい署名者/台帳/サービス/DB/権限制度を暗黙に足さない。
- 成立しなければ方式採択と依存操作を停止し、影響する要件・具体的な試験案と必要なOwner判断へ戻す。追加の信頼元/資格情報/保護workflow/本番等の変更が必要なら、必要範囲を後続で具体化して判断を得る。

この段は試験や方式選定、資格情報/保護設定変更を実行しない。分割計画と要約の確認をGitHub投稿やあらゆる保護対象変更の一括許可にしない。

## Requirements Coverage

| Must | 下位FR | 対応Unit |
|---|---|---|
| M-01 | FR1.1〜FR1.4 | U2; U5 |
| M-02 | FR2.1〜FR2.4 | U2; U5 |
| M-03 | FR3.1〜FR3.3 | U3 |
| M-04 | FR4.1〜FR4.3 | U1; U3; U4 |
| M-05 | FR5.1〜FR5.4 | U1; U2; U4 |
| M-06 | FR6.1〜FR6.3 | U4; U5 |
| M-07 | FR7.1〜FR7.4 | U3; U5 |
| M-08 | FR8.1〜FR8.3 | U1; U2; U3; U4; U5; U6 |
| M-09 | FR9.1〜FR9.3 | U1 |
| M-10 | FR10.1〜FR10.4 | U1 |
| M-11 | FR11.1〜FR11.4 | U1 |
| M-12 | FR12.1〜FR12.4 | U4; U5 |
| M-13 | FR13.1〜FR13.4 | U7 |

## Implementation Notes and Constraints

- **NFR1:** 各実差分にTDDと正負試験を適用する。Node組込みnode:test/assertを用い、scriptsと適用src等を含む実コード集合/実分母/コマンドで行網羅率100%を測る。除外は理由と独立確認を要し、分母0/未測定/部分集合/80%で代替しない。
- **NFR2:** 適用SEC-T、依存導入前の脆弱性確認、job用途別最小権限、読取経路は読取だけ、test/buildへの書ける資格情報0と秘密漏えい0を負例でも確認する。
- **NFR3:** 原本/設定をデータとして扱い、破損/途中/矛盾/未知必須形式/過大入力、命令混入、path/symlink/循環/境界外参照を安全に拒否する。404や権限拒否を未導入/成功にしない。
- **NFR4:** 正常値/履歴/有効回答を保持し、部分適用/同時更新/競合を検出する。形式変更は旧新同居と試験した逆向きを持つ。
- **NFR5:** 観測実物から再計算する。判定/理由/証拠意味を一つにし、核は時計/識別子/乱数/外部状態を取得しない。同義adapter入力は同じ意味、実物改変は不一致となる。
- **NFR6:** 外部照会/subprocessは有限予算/中断条件、人待ちは一度通知後停止、正式非進捗上限で停止。停止中の効果/記録生産0、状態変化なし再試行0、常駐watcher追加なし。
- **NFR7:** 効果前の同一要求、結果不明時の照会、同一キー別内容/競合の拒否を同じ意味で実装する。副作用の無い読取には無意味なキーを要求しない。
- **NFR8:** 観測/取得/検査/配布/実行の版と対象を特定し、clean checkoutの再検証と必要な互換/復旧を持つ。旧結果を新対象/版へ流用せず、未検証CLI/配置へ保証を広げない。
- **NFR9:** 対象・確認済み/不足/不一致/不能・必要判断・正当な次操作・完成範囲/残件をテキストで明示し、色やmd閲覧だけに頼らない。
- **NFR10:** 既存ESM/実行時npm依存なし/CLI JSONとexit契約/構造・秘密・依存検査を保持する。必須stepの失敗/skip/未実行/不明を成功にしない。退役PR/own-code予算と現行の構造規約を混同しない。

S1〜S9の既定/例外・deviation_ledger・report-onlyを保持し、新規格を採択しない。公開repoの試験/fixture/例/出力は架空データのみで、実データ・秘密・非公開記録を入れない。DB固有の `261105-db-design-security` と既存の範囲/担当/承認/保留を維持し、PG表/migration/schemaをこの単位分割で新設しない。

1単位=1PR。4分類該当なら同じPRの設計だけのheadで独立設計監査→実装→新headのCI/独立実装監査/作者受領/必要な公開Owner判断/作者以外の統合を守る。前単位の統合確認後に次単位のCode Generationへ進む。独立unitでも実装を並列化しない。親は進捗/品質/設計管理を担い、成果物は承認された正規役の範囲で作成する。人数/役割の設定を権限に読み替えない。

既存CodeKBのroot `62ff73db52ce8f29f3b982507b5d2e36578ae60f` と別観測main `7e775afd5b755e51e55e269d8dc35b09d180c33e`を一つの完成実装に合算しない。旧archive済み取り組み/道筋受付/判定4・5/旧承認/80%を復活させない。W-01〜W-03、AUN以外の実展開除外、他CLIの保証除外、新社内規格採択除外、設計先行制御の相談の別扱いを保持する。

## Completion Boundaries

U1は最初の実動作するCI門であり、初回実ゴールにはU1〜U5と実開発/検証/監査/統合の証拠が必要。U6の新要求と新差分の受入、U7のAUN実配布/実PR正負/実driftはさらに別の必須結果である。全13Must/47FR/10NFRの適用する合否と必要な権限/受領/統合が揃うまで全体完了としない。非適用は根拠と理由付き、必須の観測不能は未達のままとする。
