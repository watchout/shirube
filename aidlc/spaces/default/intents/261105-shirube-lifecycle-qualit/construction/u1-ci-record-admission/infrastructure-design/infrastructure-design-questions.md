# U1 — 置き場の設計の生成前確認

## Sources

対象は `261105-shirube-lifecycle-qualit / u1-ci-record-admission / infrastructure-design`。本ファイルはStep1–3の読取・配置案・曖昧さ確認と生成前要約だけを保持する。通常の新規質問は0件。要約確認の人入力と正式receiptが揃うまで、正式4成果物を生成しない。段の進行・承認の記録は親の正式操作に委ねる。

| 正式入力 | 配置案への使用 |
|---|---|
| [performance-design](../nfr-design/performance-design.md) | SOL1の有限読取をI/O周辺へ置く |
| [security-design](../nfr-design/security-design.md) | SOL2の公開境界・資格情報分離 |
| [scalability-design](../nfr-design/scalability-design.md) | SOL4の評価ごとのtarget/head/base/attempt分離 |
| [reliability-design](../nfr-design/reliability-design.md) | SOL5/6の診断・停止・監査受付の非循環 |
| [observability-design](../nfr-design/observability-design.md) | SOL7の完全inline結果・残件・同梱観測 |
| [logical-components](../nfr-design/logical-components.md) | SOL3/8/9の核・版・試験境界、既存所有 |
| [components](../../../inception/domain-design/components.md) | 7部品/10entityと既存コード責任。旧真正性要求は後の契約に従う |
| [functional-spec](../functional-design/functional-spec.md) | W01–07、現在checkpoint、四条件、FD-T01–20 |
| [contract-summary](../../../inception/contract-design/contract-summary.md) | C01/C03/E01–03、四条件の保証分担・schema・予算 |

補完として同単位のNFR Requirementsの6文書、[NFR設計追跡](../nfr-design/traceability.json)、[FD規則](../functional-design/rules.md)、[FD entity](../functional-design/entities.md)を参照した。`.codex/aidlc-common/stages/construction/infrastructure-design.md` と質問・summary protocol、active-spaceの `memory/{org,team,project}.md` と `memory/phases/construction.md` を実読した。shared knowledge4件→AWS platform knowledge4件の順に読んだ。spaceの `knowledge/aidlc-shared/` と `knowledge/aidlc-aws-platform-agent/` は存在しない。

構造の補完は [CodeKB technology-stack](../../../../../codekb/shirube/technology-stack.md) と [code-structure](../../../../../codekb/shirube/code-structure.md)。そのroot観測と別main観測を合算せず、以下は実workspaceの関連ファイルを有界に読んで確認した。非公開ログ・鍵・他repoの実データ・外部サービスは読んでいない。

## Observed Baseline

| 対象 | 実観測 | 限界 |
|---|---|---|
| root Git HEAD | `62ff73db52ce8f29f3b982507b5d2e36578ae60f` | 別main `7e775afd5b755e51e55e269d8dc35b09d180c33e` の追加部品をroot実装へ合算しない |
| `package.json` / `package-lock.json` | ESM、Node `>=22`、lockfile固定の開発依存。`npm test` は `tests/*.test.mjs tests/u2/*.test.mjs` | root CIはcoverage床を指定していない。宣言だけで実分母100%済みとしない |
| `.github/workflows/ci.yml` | `pull_request` とmain push、`test` と再利用 `hygiene`。Node22、`npm ci`、`npm test`、既存budget検査 | この段で実行/編集していない。退役する予算と現行技術検査は別に扱う |
| `.github/workflows/hygiene.yml` | calleeの `job.workflow_repository` / `job.workflow_sha` を照合し、`.shirube-tools` から検査。失敗/予期しないskipを最終照合 | caller依存を導入するjobであり、U1の資格情報付き評価を混在させない |
| `.github/workflows/sds-gate.yml` | callee固定commitのtoolsを実行。checkout `11d5960a326750d5838078e36cf38b85af677262`、setup-node `49933ea5288caeca8642d1e84afbd3f7d6820020`、Node22 | 実行stepは `GH_TOKEN=github.token` を受け、同stepからstatusを書いている。U1のread-only分離が既存で完成しているとはしない |
| `kit/sds-gate-caller.yml` | default branchの `pull_request_target` / PR commentイベント、commit固定の再利用workflow。`statuses: write` を含む | テンプレートの観測であり、実branch protection・consumer設定・現在の公開状態は未観測 |
| `scripts/sds/gate.mjs` | 既存CLI entry。判定1〜3の後に旧 `planBinding` / `judgment5` を呼ぶ。baseの `.shirube/sds-pin.json` を読む処理あり | 今回のU1経路へ旧判定4/5を採用しない。root自身の `.shirube/sds-pin.json` は存在しない |
| `scripts/hygiene/audit-admission.mjs` | `targetCheck` は依頼の `targets[].checks` を列挙し、`workflowCheck` は指定 `t.workflow` の全体success、PR/head/base/merge checkoutを照合 | 関数がchecks空を受けても、今回の運用でchecks空や既存mandatory削除を認める根拠にはしない |
| 現在のローカル道具 | `node --version` は `v26.12.1`、`npm --version` は `11.20.0` | このローカル版をCI22の実測へ写さない。インストール/製品試験は未実施 |
| lockfileのengine | ESLint10.11.0は `^20.19.0 \|\| ^22.13.0 \|\| >=24`、knip6.38.0は `^20.19.0 \|\| >=22.12.0`、dependency-cruiser18.4.0は `^22\|\|^24\|\|>=26` | Node22というmajor指定全域の動作保証にしない。新runtime/patchの採択はしない |

## Proposed Deployment and File Placement

以下の新規pathは配置案で、まだ存在や実装成功を主張しない。既存論理component内のESMファイル分割であり、新サービス・単位・CLI・engine・entityを追加するものではない。正確な関数分割/argvはCode Generationの計画で具体化する。

| 配置先 | 置く責任 | 信頼/入力境界と理由 |
|---|---|---|
| 既存 `scripts/sds/gate.mjs` | 既存entryからU1評価を呼び、JSON/exitへ接続する。既存引数・診断契約との互換を確認する | 呼出し用途とcheckpointは信頼するcaller profileが固定する。PR内のmode/任意flagによる免除経路は作らない |
| 案 `scripts/sds/ci-record-admission.mjs` | ConformanceGateの四条件・集約・理由code・承認/READY適用・内容照合の意味を持つ単一純粋核 | now/ID/固定policy/必要集合/実観測を明示入力。I/O・環境時計・乱数・資格情報・process終了は持たない |
| 案 `scripts/sds/ci-record-evidence.mjs` | EvidenceCollectionのPR/files全page/固定tree/blob/commit/公開comment取得、raw bytes/hash、前後head/base照合 | 既存GitHub読取方式を利用しつつSOL1の総予算/中断/bytes/完全性を接続する。既存gh呼出しだけで全予算対応済みとしない |
| 案 `scripts/sds/ci-record-projection.mjs` | 既存権限内の掲載前allowlist変換と、公開viewの形式検査 | CIは公開viewだけを消費。native型対応と公開kind/choice照合を分け、私的receipt/authorization原本を取得する新ツールは作らない |
| 案 `scripts/sds/ci-record-envelope.mjs` | 完全assessment/評価scope/同梱観測のserialize/decodeと共通境界検査 | E03/C01/C03で同じ形状検査を使う。理由/閾値を再定義しない。C05/C07の実接続は後続担当 |
| 案 `tests/ci-record-admission.test.mjs` と必要な同系列test | FD-T01–20の核/変換/取得/entry/輸送境界をNode組込みTDDで試験 | 公開syntheticだけ。負例の門exit1をassertし、test runner exit0と区別する。必要な分割は既存test globと一緒に確認 |
| 単位記録内の公開掲載用JSON | `shirube-pr-records/1` のview、必要成果物/承認/READY/監査参照 | path分類は信頼版で固定し、自己参照除外を任意excludeへ開放しない。掲載file名は実装計画で確定。`audit/` / `.aidlc-engine/` と私的本文は載せない |
| 案 `.github/workflows/ci-record-admission.yml` | 既存監査受付用CIとは別workflowで、U1評価の成功/不合格をCI結果へ接続 | 実workflowはまだ作らない。信頼版解決、read-only job、既存entryを結線する設計対象。既存 `.github/workflows/ci.yml` のworkflow全体successへ依存を混ぜない |

U1用の呼出経路は現headの実装監査を先取り要求せず、`conditions` は `records/ready/digests/designAudit` だけとする。既存判定1〜3のrisk/差分/実装監査結果と、U1の `assessment/evaluationScope/observations` は別フィールド・役割で保持し、一方を他方のPASSで代用しない。既存consumerのdefault呼出しを黙ってU1へ切り替えない。

旧判定4/5のfileが存在していても今回のU1経路では呼ばない。全consumerの旧設定の削除・一括退役・base pinの書換えまで本単位の配置案から許可しない。既存entryの分離や互換に必要な実差分をCode Generation計画で示し、workflow/必須検査/保護設定へ及ぶ差分には既存のOwner条件を適用する。PRサイズ等の退役と、source構造・依存・秘密検査を混同しない。

### Deployment Facets

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | 既存Node CLIの一回実行、既存GitHub Actions runner | 常駐service/container/VMの増設要件は無い |
| Networking | 許可されたGitHub APIへの読取。新ingress/VPC/subnet/LBなし | PRコードをshell/命令として実行せず、固定headの内容をデータとして取得 |
| Storage | 呼出しごとのメモリ/一時作業領域と既存Git記録 | shared mutable latest/cacheなし。新DB/backup/保存期間なし |
| Environments | 現在のCodex/Macで準備・試験、GitHub ActionsでCI、統合済み固定版を後続配布 | 新staging/production topologyを足さず、候補試験と実配布結果を区別 |
| IaC | 新CDK/CloudFormation/Terraformは非適用。配置定義は既存Git管理workflow/kit | design段に完全IaCや実workflowを先行生成しない |
| Resource sizing | 既存runnerを前提とし、呼出しごとの有限予算を適用 | 台数/CPU/memory/並列数/SLAを新規採択しない |

### Infrastructure Services and Shared Resources

| Service | Role | Configuration | Notes |
|---|---|---|---|
| 既存GitHub API | PRと公開原文の読取 | SOL1/契約の有限予算、固定head/tree/blob | 新SaaS・新課金契約の採択なし |
| 既存GitHub Actions | CI実行と不合格表示 | 検査toolsとPRデータを分離 | 実権限/必須設定/実CIは後段で確認 |
| 新database/cache/queue/search/CDN/DNS/LB | 非適用 | None. | 既存7部品を物理serviceへ増やさない |

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| 四条件核/共有schema/公開manifest/完全assessment | U1 / 既存EvidenceCollection・ConformanceGate | U3、U4。後続でU5/U7へ元評価を保持 | 明示入力/結果。正式state/権限の正本を移管しない |
| 固定版workflow/kit | 既存所有を維持。U5が配布を実装 | U7、既存consumer | U1で配布/初回受入/AUN実証を完了扱いにしない |

新AWS資源と新課金契約の追加は0。既存Actionsの利用時間/保存量による費用はアカウント条件・実利用未観測で金額未算定。無料/費用0を保証せず、取得予算を料金上限とも呼ばない。新しい費用/SLO/monitoring serviceは採択しない。

## Trusted Code, PR Data and Credentials

| 実行/操作 | 信頼するコードと入力 | 資格情報の範囲 | 出力 |
|---|---|---|---|
| PRコードの通常test/build | 対象PRのコードを試験する既存ci用途 | write資格情報を渡さない。追加read tokenも不要。checkout資格情報の残留を含め実装計画で確認 | synthetic境界のassert、coverage/SEC-T等の対象版付き結果 |
| U1 metadata/read/evaluate job | 信頼する固定版のtools・stage/出力規則・caller profile。PRの公開記録と実bytesはデータ | 必要なcontents/pull-requests/issues等のread-onlyだけ。純粋核へtokenを渡さず、test/buildやPR scriptを同居実行しない | 完全U1 envelopeまたは前処理診断、対応exit |
| 既存status報告 | 既存 `.github/workflows/sds-gate.yml` のstatus効果は別の既存責任 | 既存write tokenをU1 readerの代用にしない。U1はCI jobの不合格表示で停止できるため新status投稿は要求しない | 既存SDS結果とU1四条件結果を区別 |

信頼するtoolsは既存callee固定commitの方式を基準とし、checkout先 `.shirube-tools` とPRデータの入力を分ける。repo/commitを実Gitから照合し、固定stage/出力一覧・policyの版も同評価へ結び付ける。PRのchecker、必須集合、checkpoint、exclude、severityを制御の正本にしない。PRのaccepted-plan viewは適用計画の整合を調べる証拠であり、任意の空集合を指定する権限ではない。

現在rootのpin欠落や、baseの固定版がU1コードをまだ持たないことを隠さない。対象PRの新コードをそのPRを裁く信頼版へ自動昇格させない。導入前の候補コード検証は資格情報を持たないtest境界として扱い、必要なら別のread-only取得境界が収集した実PRデータを注入する。そこで実PR→核→負例exit1まで確認しても、統合済み固定版の門が配布先で稼働した証拠とは呼ばない。実読取の完全性とCI停止の統合確認はU1内に必要で、mockだけでは完成にしない。

統合・監査済みのU1を固定commitとして参照できてから、別途許可されたpin/caller差分を適用する。信頼版とPRデータの配置/資格情報分離は後続U4のセンサー実CIと共通の境界になるが、U4の2センサー実行をU1で実施済みにしない。新pin形式・鍵・認証サービスはここで追加しない。

## Design Audit Intake and Delivery Sequence

`audit-admission.mjs:68–118` の実装では、依頼の各指定checkについて、対象headのGitHub Actions check-run成功、`t.workflow` に一致するrun全体success、PR/head/baseとmerge checkoutの対応を検査する。repo全workflowを無差別に成功要求する実装ではない。一方、`ci.yml` にU1をjobとして混ぜれば既存test checkが成功してもworkflow全体が失敗し、受付できなくなる。

| 場面 | CI/門と監査の扱い | 禁じる近道 |
|---|---|---|
| 同単位の設計だけPR | 既存の非空mandatory check一覧と対応する既存CI workflowを維持して設計監査へ提出。U1が評価される場合は設計監査未取得のため閉門 | checks空、既存mandatory削除、設計mode PASS、READY/PASSの捏造 |
| U1の配置 | U1用workflowを既存受付の `t.workflow` と分け、相互の `needs` も作らない。依頼の既存check名・workflow pathは実PRで親が確認 | 別workflowという名前だけで受付成功済み/branch protection充足済みにすること |
| 設計監査PASS後 | 同じPRでCode Generationへ進む。U1はその過去design-only headの監査を照合。現head実装監査を四条件の第5条件にしない | 通常の現head受領器を過去headへそのまま呼んで対応済みとすること |
| 実装head | 新headの既存必須CI・独立実装監査・作者受領・必要公開Owner判断/対象head承認・別suite-lead統合を揃える | 設計監査/段承認/U1 PASSでこれらを代用すること |
| 固定版の配布 | 統合・監査済み版の取得と許可されたpin/caller差分をPRで扱う。後続U5/U7が導入/実受入を検証 | 宣言pin/registry/作業場fixtureだけで実適用済みにすること |

branch protection/rulesetが何をrequiredにするかは監査受付の指定checkとは別条件であり、現設定は未観測。別workflow配置だけでは未成立U1をrequiredから外せず、既存保護設定を緩める許可にもならない。実設定が受付/統合を妨げるなら、必要な対象差分と公開Owner判断を扱う既存経路で止める。自動回避しない。

workflowの新設/変更、必須検査化、branch protection、資格情報の新配布、保護対象の変更は、本ファイルの確認やInfrastructure Designの承認だけでは実施しない。U1の単位PRに必要な設計・計画・試験・追跡表と初回Inceptionを含め、内部 `audit/` と `.aidlc-engine/` は載せない。次単位Code Generationは前単位PR統合後。配布例外も既存teamの限定条件を超えて適用しない。

## Monitoring and Result Placement

| 観測/表示 | 置き場/方法 | 失敗/閾値 | 追加しないもの |
|---|---|---|---|
| 四条件/対象/理由 | 既存entryのJSONとCIログ。完全時はassessmentとscope/同梱観測をinline出力 | FAIL/UNKNOWNはexit1、PASSはexit0 | U1結果を進行/merge許可にする表示 |
| 完全性/取得予算 | evidence周辺が経過・取得数・応答bytes・完全性を観測し公開可能metadataへ対応 | 1取得20,000ms、総120,000ms、100取得、1応答8,000,000bytes、retry0は既存契約参照 | 無限retry、部分取得成功、予算を測定済み性能とする説明 |
| 非保証/残件/scope | envelope共通検査で元評価との一致と参照一意解決を確認 | 欠落/改変/別scope/元残件空化を拒否 | 私的原本供給service/独自dashboard |
| 早期失敗 | 既存entry診断に対象・失敗段階・理由・既知非保証を示す | head/base/digest未観測なら有効assessmentなしでexit1。未評価残件は未評価 | 架空/空hash、nullable化、`knownRemaining: []`による未評価隠し |
| 人待ち | 既存停止表示を一回出して終了 | 状態変化なし自動再評価0 | watcher/繰返し通知/待機中の成果物生成 |
| テキスト案内 | JSONの意味を保持した公開診断。対話UXはU2/U6 | 色/生stacktraceだけに依存せず、秘密/人返信/私的pathをechoしない | 外部通知先、分散trace、新SLO |

完全結果は `assurance: record-and-current-content-consistency-only`、`engineAuthenticity/ownerIdentity/reviewerExecution: not-verified-by-gate`、`authorization: NONE` を必ず保持する。CIは発行元/本人性/実review実施を証明しない。既存独立監査が記録を読む補完は別条件として残す。

READYは固定Asia/Tokyo/2026-11-06含むstage-completion承認日の規則を参照する。plan=`Approve Plan`、summary=`Looks correct`、stage-completion=`Approve` または正式に適用される `Accept as-is` を混同せず、否定/未知/空/他kind/自動/skippedを肯定にしない。legacyの不足はnonblockingでも残し、再開・再承認へ古い日付を継承しない。現在checkpointの非空必要集合を用い、未来Code Generation/Build and Test/CIの完了承認を先取り要求しない。

## NFR Placement Coverage Plan

正式traceabilityではNFR Designの全19詳細IDをそのまま `upstream_ids` とcoverageへ列挙する。以下は生成予定の対応で、まだ正式traceability成果物や実装の成功ではない。

| NFR | 設計solution | 具体配置/後段検証の予定 |
|---|---|---|
| NFR1.1 | SOL9 | Node test job、核/変換/adapter/entryを含むscriptsと適用srcの実行コード集合・実分母100%。除外理由/独立確認 |
| NFR1.2 | SOL9 | `tests/ci-record-admission.test.mjs` 等でFD-T01–20、実PR→核→CI停止を別途確認 |
| NFR2.1 | SOL2 | read-only metadata job、PR test/buildから資格情報分離。拒否/対象外I/O0 |
| NFR2.2 | SOL2 | projection/envelopeの公開allowlistとsynthetic fixture、SEC-T、秘密転記0 |
| NFR2.3 | SOL3/7 | 単一核とenvelopeで非保証/authorization NONEを保持 |
| NFR3.1 | SOL2 | 公開view入力で重複key/未知major・critical/過大/部分記録を拒否 |
| NFR3.2 | SOL2 | 固定head Git tree/raw bytes境界、危険path/symlink/submoduleを停止 |
| NFR4.1 | SOL5 | evidence→entryの前処理失敗境界。完全envelopeなしの診断とexit1 |
| NFR4.2 | SOL4 | 呼出しごとtarget/head/base/attempt分離、前後照合、shared mutable latestなし |
| NFR5.1 | SOL3 | `ci-record-admission.mjs` の純粋核、now/ID/観測入力。raw bytes変更負例 |
| NFR5.2 | SOL7 | `ci-record-envelope.mjs` の元結果一致/同梱参照検査。C01/C03と後続受渡し |
| NFR6.1 | SOL1 | `ci-record-evidence.mjs` の5予算と完全性/中断管理 |
| NFR6.2 | SOL6 | 既存entryの一回実行・一回通知停止・retry0 |
| NFR8.1 | SOL8 | 固定tools/規則/lockfile/runner/実入力版を記録しclean checkoutで確認 |
| NFR8.2 | SOL8 | 共有schema /1の境界検査。意味変更時は新旧同居・試験済み逆向き・必要判断 |
| NFR9.1 | SOL7 | entry JSON/公開テキスト診断、対象/不能/原因/次操作と保証範囲を明示 |
| NFR9.2 | SOL7 | legacyのstage/unit/attempt/承認参照/日付/revisitOnReopenを保持 |
| NFR10.1 | SOL3/8 | ESM/既存entry/実行時npm依存なし、既存構造・依存・秘密検査、旧4/5を復活させない |
| NFR10.2 | SOL5/6 | entryのFAIL/UNKNOWN→exit1と別workflow、監査受付のmandatory/全体successを維持 |

NFR7は副作用のないU1読取/判定へ非適用。効果の冪等性はU3/U5に残す。S1〜S9の既定・例外の `deviation_ledger`・既存検査が無いrepoでのreport-onlyを維持し、四条件のblockingを弱めない。依存追加前の脆弱性確認/SEC-T/TDDは後段の対象と結果に結び付ける。

## Alternatives and Rationale

| 採る案 | 採らない代替 | 理由/限界 |
|---|---|---|
| 既存entryとESM内で核/I/O/形式を分離 | 新CLI/engine/host/認証供給者 | 既存所有と進行元を保つ。file名/分割は実装計画で検査 |
| U1四条件を別結果として維持 | 既存gate3の現head実装監査やU4センサーをU1の追加条件にする | 先取り循環と単位責務の混同を避ける |
| 監査受付CIとU1を別workflowへ配置 | 同じ `ci.yml` にU1 jobを追加 | 受付は指定checkだけでなくworkflow全体successを見るため。既存必須を削らない |
| 信頼する固定版とPRデータを分ける | PR側checker/任意profile/古いcacheを制御正本にする | 自己免除を拒否。導入前候補試験を稼働済み門と呼ばない |
| 既存Node22設定とlockfileを確認して使用 | 別mainのNode26/80%や現在ローカル版を無検証に採用 | 版の観測を合算しない。実分母100%は既採択要件であり未実測 |
| CIログ/JSON/一回停止の既存観測 | 新CloudWatch/SaaS/dashboard/SLO/常駐watcher | 当該評価を説明できる範囲に置き、未要求の運用資源/費用を増やさない |

## Planned Artifact Structure

| 生成予定file | 必要な構造 |
|---|---|
| `infrastructure-specification.md` | Deployment=`Facet/Choice/Rationale`、Infrastructure Services=`Service/Role/Configuration/Notes`、共有がある箇所はShared Infrastructure=`Shared Resource/Owner Unit/Consumer Units/Access Boundary`。版/資格情報/費用の限界も明示 |
| `monitoring-design.md` | Metrics & KPIs=`Metric/Source/Threshold/Why it matters`、Alerts=`Alert/Condition/Severity/Routes to`、SLIs / SLOs=`SLI/SLO target/Measurement window`、Logs & Tracing。新SLO非適用を明記し、架空の稼働率/通知先を埋めない |
| `cicd-pipeline.md` | 準備/Node TDD・coverage/既存CI/別workflowのU1/設計監査/実装head新監査・受領/固定版配布を順序と役割で記述。資格情報、信頼版、非循環、戻し方、保護対象の別許可を含む |
| `traceability.json` | `stage=infrastructure-design`、`unit=u1-ci-record-admission`、全19詳細NFRのupstream_ids/coverage。具体resource/configurationをtargetにし、新規上流なしの出力があればreverseで理由を示す |

## Ambiguity Check

通常質問は0件。新cloud/runtime/version/SaaS/DB/料金/監視方式のOwner選択を追加する必要はない。上流の方式と現物から具体案を作れる。新回答を作る側で代筆せず、既決条件を再質問しない。

曖昧な「標準監視」「自動scale」は使用せず、I/O停止予算と実測性能、候補コード試験と信頼版の門、U1結果と統合条件、監査受付とbranch protectionを分けた。必要なOwner許可が後の実差分に要ることは、この設計内容に新しい仕様回答が欠けていることとは別である。

未検証は、実装/正確なargv/固定版profileの実解決、公開掲載file名と分類、lockfile/CI22/道具の実適合、coverageの実対象分母、SEC-T/性能、実PR統合、実CI/check名/workflow/保護設定、pin/caller適用、U5/U7実受渡しである。未検証を成功・配布済み・許可済みにしない。

FD W06のE05説明誤記は未解消の上流Minor R-01として保持する。正しいE05はU2/U6→LLMテキスト対話で、独立監査/公開判断はE01等とBR6.1/BR9.1の別条件。凍結FD/NFR設計を書き換えない。

Owner指定順U1→U4→U2→U3→U5→U7→U6のruntime反映未成立も既存残件のまま。U1終了時に席が正式経路を確認し、無理ならU4前にOwnerへ相談する。新tool/偽辺/rename/state/cache/jump/engine変更では解かない。

## Assumptions & Open Questions

None.

既知残件と後段の検証を上に保持した。本段は質問ファイルだけを作成し、正式4成果物、製品コード、workflow、設定、試験/CI、外部投稿、他repo、state/diaryを変更しない。

## Consolidated Summary Confirmation

- U1は既存Node CLIのentryに、四条件を判断する純粋核、有限なPR読取、公開記録の変換、完全結果の受渡しを配置します。新しいサービス・DB・CLI・engine・課金/監視基盤は追加しません。
- 信頼する固定版のtoolsとPRデータを分け、読取資格情報はmetadata用jobだけへ渡します。PRのtest/buildへwrite資格情報を渡さず、PR側が検査版や必要集合を弱められないようにします。
- U1の結果は既存判定1〜3や統合条件と別に保持します。現head実装監査や未来段の承認をU1四条件へ先取り要求せず、旧判定4/5もU1の経路では呼びません。既存consumerの動作を黙って切り替えません。
- U1用workflowは、既存の監査受付CIと分ける案にします。既存mandatoryと受付workflowの成功条件を維持し、未監査の設計PRのU1は閉門したままです。実workflow/必須検査/保護設定の変更は、対象差分に必要な公開Owner判断を別に満たしてから行います。
- 完全結果には非保証・authorization NONE・残件・評価scope・同梱観測を保持します。head/digest未取得なら完全結果を捏造せず既存診断とexit1で止めます。READYの日付/再承認/legacyと承認kindの既決規則を維持します。
- 19詳細NFRを具体配置へ追跡し、TDD/実分母100%/SEC-T/既存技術検査と実PR→核→CI停止を後段で確認します。候補コード試験、統合済み固定版の稼働、後続U4/U5/U7の実検証を分け、版の未適合と既知残件を残します。
- この確認後に、表形式のinfrastructure-specification/monitoring-design、cicd-pipeline、traceabilityの4成果物を生成します。生成の確認は段の承認・実装計画の承認・保護対象変更の許可とは別です。

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
