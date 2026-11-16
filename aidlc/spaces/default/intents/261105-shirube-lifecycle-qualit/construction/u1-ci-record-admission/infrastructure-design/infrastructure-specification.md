# U1 — Infrastructure Specification

## Sources

[確認済み要約](infrastructure-design-questions.md)に基づき、既存Node CLIとGitHub Actionsへの配置を設計する。以下は実装先の設計であり、コード・workflow・設定の適用結果ではない。

| 正式入力 | 配置への対応 |
|---|---|
| [performance-design](../nfr-design/performance-design.md) | SOL1の有限取得と停止予算 |
| [security-design](../nfr-design/security-design.md) | SOL2の公開view/資格情報/path境界 |
| [scalability-design](../nfr-design/scalability-design.md) | SOL4の評価分離 |
| [reliability-design](../nfr-design/reliability-design.md) | SOL5/6の前処理失敗・一回停止・監査受付 |
| [observability-design](../nfr-design/observability-design.md) | SOL7の完全結果と非保証 |
| [logical-components](../nfr-design/logical-components.md) | SOL3/8/9の単一核・版・検証、7部品の所有 |
| [components](../../../inception/domain-design/components.md) | 既存部品/外部所有とroot/mainの分離 |
| [functional-spec](../functional-design/functional-spec.md) | W01–07、四条件、現在checkpoint、FD-T01–20 |
| [contract-summary](../../../inception/contract-design/contract-summary.md) | C01/C03/E01–03、共有schema、保証分担 |

判定/理由/閾値の正本は[FD規則](../functional-design/rules.md)、形状は[FD entity](../functional-design/entities.md)。19詳細NFRとの対応は[traceability.json](traceability.json)。数値や判定を別の設定源へ複製しない。

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | 既存Node CLIの一回実行。CIは既存GitHub Actions runner | 新server/container/VM/常駐処理の要求は無い |
| Networking topology | 許可範囲のGitHub読取APIを利用。新ingress/VPC/subnet/LBなし | 固定headのPR/files/tree/blob/commit/公開commentをデータとして読む |
| Storage strategy | 評価ごとのメモリ/一時作業領域、既存Git記録 | shared mutable latest/cacheなし。正式state/外部原本を所有しない |
| Environments | 現在のCodex/Macで準備・試験、GitHub ActionsでCI、監査・統合済み固定版を後続配布 | 一般既定のstaging/production自動展開を足さない。未検証CLIを保証しない |
| IaC approach | Git管理の既存workflow/kitを設計対象にする。新CDK/CloudFormation/Terraformは非適用 | 本段で実workflowや完全IaCを生成しない |
| Resource sizing | 既存runnerで一回の評価を分離し、SOL1の有限予算を適用 | CPU/memory/台数/並列数/RPS/SLAは未採択。応答上限は全体メモリ保証ではない |
| Deployment unit | 既存ESM内の責任分割。論理componentを独立serviceへ増やさない | U1の実PR取得→核→CI停止をU2/U3なしで実現する |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| 既存GitHub API | PR/実内容/公開監査原文の読取 | 固定対象・全page・実bytes・読取前後のhead/base照合 | 新SaaS/新課金契約なし。取得拒否や部分取得は成功にしない |
| 既存GitHub Actions | CI実行と不合格表示 | 信頼版toolsとPRデータ、read-only読取jobとPR test/buildを分離 | 実権限/check名/branch protectionは未観測 |
| 新database/cache/queue/search/CDN/DNS/load-balancer | 非適用 | None. | 新DB/schema/migrationや保存基盤を設計しない |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| 固定規則/共有schema、公開manifest、完全assessment | U1 / EvidenceCollection・ConformanceGate | C01でU3、C03でU4。C05/C07で後続へ元結果保持 | 明示入力/結果。正式AI-DLC state、承認、外部原本、権限の正本を移管しない |
| 固定版workflow/kit | 既存所有を維持し、U5が配布責任を担う | U7、既存consumer | U1の配置設計を実配布/初回完成/AUN受入へ拡張しない |

新AWS資源・新課金契約の追加は0。既存Actionsの利用時間/保存量とアカウント条件は未観測で金額未算定。費用0/無料を保証せず、外部読取予算を料金上限と呼ばない。費用を算定するための新サービスや通知も設けない。

## File Placement

表の「案」は未実装pathを表す。既存component内のコード責任であり、新CLI名/公開API/engine/単位/entityは追加しない。正確なargv・関数分割・公開掲載file名はCode Generation計画で決める。

| 配置 | 責任 | 所有/境界 |
|---|---|---|
| 既存 `scripts/sds/gate.mjs` | U1呼出しを既存entryのJSON/exitへ接続。既存consumerのdefaultを黙って変更しない | 呼出用途/checkpointを信頼するcaller profileで固定。U1評価と既存判定1〜3の結果は別field/役割 |
| 案 `scripts/sds/ci-record-admission.mjs` | 四条件・集約・理由・承認/READY/内容照合の単一純粋核 | ConformanceGate / ConformanceAssessment。now/ID/固定規則/必要集合/観測は明示入力 |
| 案 `scripts/sds/ci-record-evidence.mjs` | PR/files/tree/blob/commit/公開comment取得、実hash、予算・完全性・対象照合 | EvidenceCollection / ObservedSnapshot。I/O/時計/資格情報は外側 |
| 案 `scripts/sds/ci-record-projection.mjs` | 掲載前allowlist変換、公開viewの形式検査 | EvidenceCollection / PublishedRecordProjection。native変換元と公開wireを区別 |
| 案 `scripts/sds/ci-record-envelope.mjs` | 完全結果のserialize/decode、元評価との一致・同梱参照の共通検査 | 形式境界。判定/理由/閾値を再定義しない |
| 案 `tests/ci-record-admission.test.mjs` と必要な同系列test | FD-T01–20と核/変換/adapter/entry/輸送のNode組込みTDD | 公開syntheticのみ。分割時も既存test glob/実分母を確認 |
| 単位記録内の公開掲載用JSON（file名は後段で確定） | `shirube-pr-records/1` と監査/承認等の公開参照 | 信頼版が固定する分類。掲載記録自身の自己参照除外を任意excludeへ開放しない |
| 案 `.github/workflows/ci-record-admission.yml` | U1の読取/評価/CI停止を既存受付CIから分離 | 実workflow新設は別途必要なOwner条件を満たして行う |

## Trusted Execution and Credentials

**対応:** NFR2.1、NFR8.1、NFR10.1。固定callee版方式と `.shirube-tools` を基準とし、実repo/commitを照合する。PRがchecker/必須集合/checkpoint/exclude/severityを選ぶ形にしない。

| 境界 | 信頼するもの/データ | 資格情報/実行条件 |
|---|---|---|
| U1 reader/evaluator | 信頼する固定版tools・stage/出力規則・caller profile。対象PRの記録/bytesはデータ | metadata取得周辺だけに必要なread-onlyを渡す。純粋核にtokenなし。PR script/test/buildを同居実行しない |
| PR test/build | PR候補コードを試験する既存ci用途 | write資格情報・追加read tokenを渡さない。checkout後の残留資格情報も後段で確認 |
| 既存status報告 | 既存 `.github/workflows/sds-gate.yml` の効果 | 同stepのwrite tokenをU1 read-only資格情報の代わりにしない。U1はjob不合格で停止でき、新status投稿を要求しない |

PRのaccepted-plan viewは適用計画の整合を検査する証拠であり、必要集合を自由に縮める命令ではない。信頼版stage/出力規則・有効計画の対応・現在checkpointから初回Inceptionを含む非空必要集合を別入力にする。未来のCode Generation/Build and Test/CI完了承認を先取り要求しない。

rootには `.shirube/sds-pin.json` が無く、base固定版にはU1がまだ無い。PR候補コードを自動的に信頼核へ昇格させない。導入前の候補コード試験は資格情報なしのtest境界で行い、必要なら別read-only取得境界の実PRデータを注入する。候補試験で実PR→核→CI停止を実証しても、監査・統合済み固定版の稼働/実配布とは別の証拠とする。mockだけのU1完成を認めない。固定版の適用は[cicd-pipeline](cicd-pipeline.md)を参照する。

## Finite Collection and Evaluation Isolation

**対応:** NFR6.1、NFR4.2。evidence周辺にSOL1/4を配置する。

| 制御 | 具体配置/設定 | 不完全/競合時 |
|---|---|---|
| 取得予算 | FD rules `policy.budget` / AdmissionContextの信頼版profileを使用。参照値は1取得20,000ms、総120,000ms、100取得、1応答8,000,000bytes、retry0 | 経過/取得数/受信bytesをI/O側で観測し、上限で中断。数値は停止予算で性能保証ではない |
| 完全性 | files全page/終端、必要tree/path/blob/公開原文、最終head/base取得を同じ予算へ含める | 欠page/拒否/parse失敗/打切りを部分成功にしない。必要集合を縮めない |
| 対象分離 | 呼出しごとrepo/PR/head/base/Target/attempt/必要slot/観測を保持 | 別評価/旧応答を混ぜず、途中head/base変更は停止。新headへ自動追随しない |
| 内容取得 | 固定headの通常file raw bytesからbyte数/hash。globalとstage固定subsetはBR4を参照 | 宣言hash/cache/native fingerprintを観測hashへ写さない。正当な再評価は実対象を再取得 |

新queue/cache/pool/自動並列化を設けない。応答上限は全processのメモリ保証でもartifact数/PR数の処理能力保証でもない。

## Public Input and Compatibility

**対応:** NFR2.2、NFR3.1、NFR3.2、NFR8.2。

| 検査点 | 配置/方法 | 拒否/保持 |
|---|---|---|
| 公開形状 | projection/envelopeの共有schema /1、必須型/enum/target/refの検査 | 未知major/critical、過大/部分/不正記録を停止。optional説明は既存extensionsだけ |
| JSON重複key | escape解釈後のobject keyを上書き前に検査 | parse後の値比較だけで重複を見逃さない。新parser依存は足さない |
| 公開allowlist | 既存権限内のnative変換とCI公開viewを分ける | `audit/` / `.aidlc-engine/` の本文、私的path、人返信、生review body、秘密/他repo非公開データを出さない |
| Git path/文字列 | 実treeと同じpath bytes、固定headの通常file。文字列は命令でなくデータ | traversal/絶対path/別表記重複/境界外symlink/submoduleを拒否し対象外I/O0。Unicode/改行をhash前に正規化しない |
| 形式互換 | 既存ESM/JSON/exit、共有majorを保持 | 意味変更時は新旧同居・試験済み逆向き・必要Owner判断。黙った削除/nullable化なし |

## Runtime and Standards

root HEAD `62ff73db52ce8f29f3b982507b5d2e36578ae60f` のmanifestはNode `>=22`、CIは22。現在ローカルNode `v26.12.1` / npm `11.20.0` のversion表示だけを観測した。別main `7e775afd…` のNode26/coverage80%やClaude/Bun部品をrootの完成へ合算しない。

lockfileのESLint10.11.0は22系で22.13.0以降、knip6.38.0は22系で22.12.0以降を要求する。dependency-cruiser18.4.0も対応majorを制限する。実runner/lockfile/道具/検査版のclean checkout適合は後段で確認し、major指定だけで保証しない。既存のaction pin観測は[確認済み要約](infrastructure-design-questions.md)に保持し、新版を採択しない。

TDD、Node組込み試験、scriptsと適用srcを含む実行コードの実分母100%、SEC-T、依存追加前の脆弱性確認、実行時npm依存なし、既存構造・依存・秘密検査を維持する。S1〜S9は既定/例外の `deviation_ledger` / 未enforce時report-onlyを保つ。新規の例外は採択していない。NFR7の効果冪等性はU3/U5のままでU1に追加しない。

## Assumptions & Open Questions

None.

本段の配置設計と文書検査は、製品実装/性能/coverage/SEC-T/実CI/実配布の合格ではない。正確なargv/profile解決/公開掲載file名、実jobの資格情報、check名/branch protection、pin/caller適用は未検証。workflow/必須検査/保護設定等の変更は対象差分の必要Owner権限を別途満たす。

FD上流Minor R-01のE05説明誤記は未解消。正しいE05はU2/U6→LLMテキスト対話で、共有契約に従う。指定順のruntime反映未成立はU1終了時に席が正式経路を確かめる既存残件のまま。7単位/7辺/既存所有を変えず、偽辺/rename/state/cache/jump/engine変更で回避しない。
