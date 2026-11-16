# Shirube — 論理部品の分担と接続の設計計画

## Sources

- [requirements.md](../requirements-analysis/requirements.md): 全13Must、47下位FR、10NFRと範囲外W-01〜W-03。
- [stories.md](../user-stories/stories.md): 全17ストーリー、88受入条件。初回・実追加変更・AUNの実証を区別する。
- [architecture.md](../../../../codekb/shirube/architecture.md)、[component-inventory.md](../../../../codekb/shirube/component-inventory.md): Full再分析のroot `62ff73db52ce8f29f3b982507b5d2e36578ae60f`、別観測main `7e775afd5b755e51e55e269d8dc35b09d180c33e`。構造の記録であり実行合格ではない。
- [team-practices.md](../practices-discovery/team-practices.md)、作業場のorg/team/project/inception規則。
- [mockups.md](../refined-mockups/mockups.md)、[interaction-spec.md](../refined-mockups/interaction-spec.md)、[design-system-mapping.md](../refined-mockups/design-system-mapping.md)、[accessibility-checklist.md](../refined-mockups/accessibility-checklist.md): 確認済みのLLM共通テキスト対話と状態表示。
- 意図・実現性・範囲・体制・粗い対話案・引継ぎ・再分析・実践・要件・ストーリー・詳細対話案の既存11質問ファイルを照合。回答済みの選択を今回の未決へ戻さない。

このファイルはDomain Designの計画と要約確認用である。部品一覧の正本、ADR、追跡表は要約確認後に生成する。設計の承認は、具体的な保護対象の変更・実装・配布の許可を兼ねない。

## 回答済み事項の引継ぎ

- LLMとの対話を入口とし、初回の実証環境はCodex CLI・Mac・GitHub・GitHub Actions。既存の状態から不足・矛盾だけを聞き、秘密の値を対話へ要求しない。他CLIの実動作保証は今回へ追加しない。
- 導入・設定から明示的な開始、正式AI-DLCの開発、最初の実ゴール、その後の本当の追加変更までを通す。初回は導入状態・不足・適用規格と安全な次操作の説明。追加後は項目選択を受け、現対象と前提を再観測して案内を切り替える。初回にも必要な説明を削って増分を作らない。
- 正式AI-DLCが段・単位・順序を決める。Shirubeに別の工程状態機械や独自の単位順を作らない。今回の相談とは別に残した設計先行制御を、無断で実装範囲へ加えない。
- READY、4分類の設計先行監査、単位PRの記録、信頼版CIの2センサーを機械で確かめる。設計だけのheadで独立監査を通し、その後に同じ単位PRへ実装を追加する。新headのCI・実装監査・作者受領・別担当統合を別途確認する。1単位=1PRを保ち、前の単位が統合される前に次の単位の作る段へ進まない。
- AUNへの実配布と実PRの正例・負例・設定driftは受入範囲。既存担当・保留・取り組みと必要な公開Owner判断を保持する。他repoへの拡大、新社内規格の採択は範囲外。
- 旧取り組みは有効な残りを移管済みの範囲で扱う。道筋受付・判定4/5・旧承認・80%基準を復活させない。DB固有の設計は別intentを保ち、ここでDB製品やschemaを追加しない。

## 設計する論理部品の案

部品名はこの設計内のコード責任の名前であり、新しい権限・工程・役職ではない。7部品を候補とする。既存ファイルをすべて改名・分割する計画ではなく、既存の意味の核をどこへ所属させるかを明確にする。

| 部品候補 | 所有する責任・利用者に見える結果 | 主な呼出先 |
|---|---|---|
| DialogueExperience | 観測済み情報から質問を絞り、設定案・原因・停止理由・必要判断を説明する。選択した項目を再照合して案内を更新する。LLM別adapterは輸送・表示だけを変える | EvidenceCollection、ConformanceGate、NativeAIDLCConnection、KitDistribution |
| NativeAIDLCConnection | 現在の正式AI-DLC対象・版・利用可能な正規操作を読み、明示開始等を正規入口へ接続する。変更前の対象再確認と結果照会を行い、進行順・承認を独自に生成しない | EvidenceCollection、ConformanceGate、SafeOperationControl |
| EvidenceCollection | 対象repo・設定・原本・PR/head・版・発行元の観測を区別して採取する。原本から公開可能な単位記録を取り出し、PR上の記録も別に読む。値の正規化と掲載対象の除外を担うが、原本の権限を発行しない | なし。既存の正式記録、Git/GitHub等を外部依存として読む |
| ConformanceGate | 同じ観測入力に同じ意味の判定を返す核。対象と内容の対応、READY、4分類の設計監査と順序、記録集合、承認、独立監査・受領・統合条件、規格と完成条件を照合する。欠落・矛盾・観測不能を通さない | EvidenceCollection、SensorVerification |
| SensorVerification | 信頼する固定版でPR記録へのtraceability/upstream-coverageを実行し、対象・版・実行結果を持つ結果を返す。必須集合・severity・対象pathのPR自身による弱体化を許さない | EvidenceCollection |
| KitDistribution | 固定版の配布内容、許可された適用差分、戻し方、実設定とのdriftを扱う。手元のpinやregistryだけで適用済みにせず、実内容を読み直す。Shirubeの自己適用保護とAUN側の条件を保持する | EvidenceCollection、SafeOperationControl |
| SafeOperationControl | 必要判断待ち・観測不能・非進捗での停止、再開時の再確認、外部効果の同一要求と結果不明時の照会を一つの核で扱う。正規AI-DLCの段や承認を所有しない | なし。時刻・識別子・観測結果は呼出側の明示入力 |

呼出依存は上表の方向だけとし、循環を作らない。下位部品から対話へ呼び返して別の判断を作らず、観測値・理由・結果を戻す。外部効果を実行するadapterは、核の決定と同一要求を守って結果を再入力する。核へ渡すstore/executor等の差込口を、新しいサービスの導入と同一視しない。

### 責任を混ぜない境界

- EvidenceCollectionは「何をどこから読めたか」を所有する。ConformanceGateは「現在の条件を満たすか」を所有する。観測側へdesired値・古いmap・LLMの宣言を写さない。
- ConformanceGateのI/Oを行う周辺処理と純粋な判定核を分け、核は渡された観測値から判定する。結果は必要条件の照合であり、Owner権限の付与や正式AI-DLCの進行決定を代替しない。4分類（DB構造・権限・契約・セキュリティ）の該当性は設計と実差分の根拠に対応付け、自己申告だけの対象外化や不明の合格を許さない。
- SensorVerificationは2センサーの検査意味を再実装せず、信頼する正本を使う。ConformanceGateは対応する実結果が揃うかを判定し、独自の緩いセンサーを持たない。
- KitDistributionのdriftは実配布内容の比較、SensorVerificationの結果はその版でのPR記録の実検査。配れたことと通ったことを分ける。配布版はCI側の観測された実行版とも照合する。
- DialogueExperienceが設定案を持っても、それは適用済み設定や承認ではない。開始・再開・保護対象変更は別々の必要条件を再確認する。
- 初回・実追加・AUNの完成照合はConformanceGateの責任に置く。試験fixtureや実証用の手順を、新しい製品サービスや独立した工程管理部品にはしない。

## 所有するデータの形の候補

以下は識別子・属性名・参照の案である。型・制約・列・保存先・関係の多重度を決めるDB設計ではない。各データは一つの部品だけが更新し、他部品はその結果を参照する。

| 所有部品 | entity候補（識別子） | 属性名の例と他部品への参照 |
|---|---|---|
| DialogueExperience | ConfigurationDraft（draftId） | targetRef、answers、missingItems、conflicts。targetRefはObservedSnapshotを参照 |
| DialogueExperience | GuidanceSelection（selectionId） | draftRef、candidateRef、targetRef、guidance、observationRef。draftRefはConfigurationDraft、観測参照はObservedSnapshot |
| NativeAIDLCConnection | NativeOperation（operationId） | targetRef、nativeOperationRef、startRequestRef、attemptRef、observedOutcomeRef。OperationAttemptとObservedSnapshotを参照 |
| EvidenceCollection | ObservedSnapshot（observationId） | sourceRef、issuerObservation、targetRef、versionRef、observedContentRef、observedDigest、availability、observedAt |
| EvidenceCollection | PublishedRecordProjection（projectionId） | sourceObservationRefs、targetRef、includedArtifactRefs、excludedArtifactRefs、projectedContentRef。ObservedSnapshotを参照 |
| ConformanceGate | ConformanceAssessment（assessmentId） | targetRef、observationRefs、sensorResultRefs、applicableConditions、outcomes、reasons。ObservedSnapshotとSensorResultを参照 |
| SensorVerification | SensorResult（sensorResultId） | targetRef、trustedVersionRef、inputObservationRefs、executionRef、outcome、reasons。ObservedSnapshotを参照 |
| KitDistribution | DistributionRevision（revisionId） | sourceCommitRef、manifestRef、observedContentsRef、applicableTargets。ObservedSnapshotを参照 |
| KitDistribution | DistributionAssessment（distributionAssessmentId） | revisionRef、targetObservationRefs、observedDifference、applyAttemptRef、restoreReference。DistributionRevision、ObservedSnapshot、OperationAttemptを参照 |
| SafeOperationControl | OperationAttempt（attemptId） | requestRef、targetRef、effectIdentity、observationRefs、outcome、requiredActor、stopReason、nonProgressObservation。ObservedSnapshotを参照 |

AI-DLCのstate・段の承認・正式レビューの原本、GitHubのOwner決定・PR・監査原本は外部が所有する。上表にそれらを新たなShirube所有entityとして取り込まない。targetRef等は原本の対象を指す参照であり、独自のActive Unitや承認状態の正本ではない。

## 既存部品の再利用と不足

| 既存部品 | この案での位置付け | 未完成として扱う点 |
|---|---|---|
| kit.mjs、kit-parts、consumers-registry | KitDistributionの固定版配布・比較を再利用候補とする | AI-DLC設定対話とセンサー配布は不足。自己適用でworkflow_callを壊さず、404だけで未導入と判定しない。registryにAUNが無いことも未導入の証明ではない |
| audit-admission、sds-gateの判定1〜3 | EvidenceCollectionの公開原本読取とConformanceGateの既存判定を再利用する | 設計先行監査と新しい4項目は既存判定だけでは証明できない。旧plan-binding/design-gate/stageの道筋や判定4/5は再利用しない |
| hygiene-lib・既存の衛生検査 | 適用集合・実差分・例外・安全検査の既存核を参照する | 旧予算やreport-onlyの規則を新しいblocking条件へ変えない。100%の実対象分母とsrcの対象漏れを別途解消する |
| mainのengine-judge、approval-record、record-compare | NativeAIDLCConnection、EvidenceCollection、ConformanceGateへの限定的な再利用候補 | Claude/Bun/特定engine版前提、Codex接続未実証、identityCheck:none。承認の真正性や現在READYを保証する完成部品としない |
| mainのunit-done/judge | ConformanceGateの完成条件を評価する核の候補 | collector・入口・実統合が無く、旧80%定数を採択基準へ流用しない。渡されたfactsが実観測かを別途確認する |
| progression-core | SafeOperationControlの同一要求・結果照会・非進捗停止を再利用候補とする | 実adapter・耐久性・正規AI-DLCとの接続は未実装。独自の開発工程として起動しない |

rootとmainの差分を存在する一つの完成実装として合算しない。再利用時は対象版・契約・実差分を確認する。既存コードの移動、具体的な依存追加、workflow変更、実行手段はこの計画では採択しない。

## 原本と信頼境界の設計課題

| 境界 | 今回の設計方針 | 成立を証明できない場合 |
|---|---|---|
| LLM・設定案→実対象 | 外部の現在のrepo/space/intent/unit/stage、設定、権限、版を観測する。入力の対象指定と観測した対象を分ける | 不足・不一致・観測不能を示して停止する |
| 正式レビュー・承認原本→Shirubeの観測 | 発行元の実観測、対象、段/単位/試行、内容、正式原本の対応を確認する。ローカルに置かれたJSONやREADY文字列だけでは採用しない | 未認証の原本を真正とせず、必要なREADY/承認を満たさない |
| 正式原本→公開用記録→PRの実内容 | 原本から必要部分を再生成しPR実内容と照合する。audit/・.aidlc-engine/・秘密・他repo非公開記録は公開しない。公開済みOwner判断が必要なら具体URLと本文SHA-256も別に確認する | 除外対象を公開することで穴埋めせず、原本を安全に確認できない場合は停止する |
| PR由来データ→CI検査 | checker・必須集合・severity・対象pathを信頼する固定版から取得する。PRのファイルは検査入力とし、検査正本や命令として実行しない | 必須実行を観測できず、未実行/skip/timeout/不明を成功としない |
| 配布宣言→受け手の実物 | 許可された対象の実内容からdigestと差を計算し、固定版と照合する。必要な権限・受領・保留を適用前に確認する | 自動で保留解除・自己修復せず、必要な相手へ一度示して停止する |

特に未解決なのは、内部ログをPRへ載せずに、CIが「現在の正式レビュー/承認の実際の発行元と原本」を独立に確認できる接続である。既存のapproval-recordのidentityCheck:noneやrecord-compareの一致だけでは解決しない。既存の正式AI-DLCと認可された原本取得経路から何を観測できるかを、後続Contract Designで具体的な入力・原本・発行元・対象・失敗時の契約へ落とす必要がある。単なる任意JSONの再生成一致は受入にしない。

この不足を新しい署名者・台帳・外部サービス・DB・独自権限制度の追加で暗黙に埋めない。既存経路で要件を満たせないことが判明したら、実装可能と断定せず、可能な接続案と必要なOwner判断を具体化して戻す。今回の要約確認は信頼元の未検証を合格とする判断ではない。

## 部品境界の選択肢

### 推薦案A — 7部品で対話・観測・正規接続・判定・検査実行・配布・停止制御を分ける

- 利点: LLM別の表示変更、原本取得方式、判定規則、配布版の変更が互いの意味を複製せずに済む。権限原本とShirube所有の観測結果を分離できる。既存の核とI/O分離を保つ。
- 負担: 観測結果の受渡しと対応参照が必要になる。空のproxy部品を作らず、表に挙げた実責任がある部分だけを実装する。
- 可逆性: コードを必ず別packageや別processへ分ける選択ではない。後続の単位生成でまとめられ、将来同じ変更理由しか無い境界は再評価できる。

### 代案B — 対話・正規接続・観測を一つ、判定・検査を一つにまとめる

- 利点: 部品間の受渡しは減る。最初の小さな対話だけなら接続の記述量を抑えやすい。
- 負担: LLM入力、外部原本、判定根拠が一つの所有境界に集まり、LLMの宣言を事実へ写す欠陥を見分けにくい。配布先CIと手元で同じ判断を共有する際も、I/Oと判定の分離が再び必要になる。
- 可逆性: 後から分けられるが、真正性・同一対象・公開除外の契約を分離し直す必要がある。

推薦はA。異なる信頼境界と変更理由に沿うためであり、部品数の多さを目標にしない。部品間の呼出しはまず明示的な入力と結果の受渡しとして整理し、ネットワーク呼出し・queue・DBの採用は決めない。

## 最終成果物に具体化する計画

- components.md: 上記7候補を、機械可読YAML、循環の無い呼出図と文章、責任表、単一所有のentity表、外部依存、推薦/代案の理由へ具体化する。外部依存は正式AI-DLC・Git/GitHub・CI実行環境・許可された原本/設定ファイル等として部品と分ける。
- decisions.md: 重要な判断は6件程度を見込む。部品境界、AI-DLCの正本境界、原本/観測/公開用記録の区別、一つの判定核と信頼版検査、版付き配布と実物drift、停止/再開と同一要求の責任。Context/Decision/Consequences/Alternatives Rejectedを持つ。詳細化で同じ判断が重複すれば統合する。
- traceability.json: stories.mdの全17USを、定義した部品またはentityへ対応付ける。要件はそのストーリーの対応を保持し、初回・実追加・AUN、88受入条件、全13Must/47FR/10NFRの取りこぼしを照合する。
- この段ではdeployment topology、技術stack、保存DB、詳細entity制約、新API/コマンド、正式Unit/DAG、実装順を先行決定しない。PGの表・migration・DB設計は作らない。
- 後続の設計・試験で、架空データのみ、TDD、適用srcを含む実対象分母の100%、SEC-T、依存の脆弱性確認、最小権限、S1〜S9とdeviationの既定を保持する。文書だけで実装・実行・監査・AUN受入の完了としない。

## 未決事項の扱い

今回新たにOwnerだけが選べる製品範囲・役割・実証題材の未決は見つからなかった。既存の選択を再質問しない。要約で部品境界の推薦案Aを確認する。原本の真正な接続、版の適合、実行/復旧の具体契約は未検証であり、解消済みとは記録しない。後続で追加の権限・新しい信頼元の採択・範囲変更が必要なら、その具体差だけをOwnerへ確認する。

## Consolidated Summary Confirmation

- 対話、正規AI-DLC接続、実物/原本の観測、条件の判定、CIセンサー、版付き配布、停止/再開の7責任に分ける推薦案Aで具体化する。部品は配置方式や実装順を意味しない。
- 利用者は、導入状態と不足・規格・安全な次操作を確認し、明示して正式AI-DLCを始める。完成後の追加機能では選んだ項目の現在状態を読み直して案内が変わる。Codex以外を排除する製品設計にはしない。
- 正式AI-DLCのstate・承認、公開Owner決定の所有権は移さず、Shirubeは実観測と照合結果を持つ。READY文字列・任意JSON・古いmapで成功にしない。
- 設計先行監査→同じ単位PRの実装→新headの確認、単位記録、信頼版CIの再検査、配布drift、正当な停止を、既存の門/監査受付/配布/停止核の有効部分を使って結ぶ。旧道筋と判定4/5は復活させない。
- 内部ログを公開せず正式な原本と発行元をCIが確認する接続には未検証部分が残る。契約で具体化し、成立しなければ停止して必要な判断を戻す。新しい署名者・サービス・DBで暗黙に解決しない。
- 初回・実追加・AUN実配布/実PRの正負/driftまでを対象とし、技術・セキュリティ規格と既存担当・保留・必要な公開判断を保持する。
- 確認後に部品一覧・ADR・全17USの追跡表を作成する。製品コード・試験・workflow・保護設定の変更はこの確認では開始しない。

この要約と部品境界の推薦案Aで、Domain Designの成果物へ具体化してよいですか。

- Looks correct
- Request changes

[Answer]: Looks correct
