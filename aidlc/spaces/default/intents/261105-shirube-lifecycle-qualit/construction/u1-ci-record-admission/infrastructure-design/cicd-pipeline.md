# U1 — CI/CD Pipeline

## Sources

[確認済み要約](infrastructure-design-questions.md)に基づく。正式入力は[performance-design](../nfr-design/performance-design.md)、[security-design](../nfr-design/security-design.md)、[scalability-design](../nfr-design/scalability-design.md)、[reliability-design](../nfr-design/reliability-design.md)、[observability-design](../nfr-design/observability-design.md)、[logical-components](../nfr-design/logical-components.md)、[components](../../../inception/domain-design/components.md)、[functional-spec](../functional-design/functional-spec.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)。形状/意味は[FD entity](../functional-design/entities.md)と[FD規則](../functional-design/rules.md)を参照する。

配置は[infrastructure-specification](infrastructure-specification.md)、完全結果/診断は[monitoring-design](monitoring-design.md)、対応は[traceability.json](traceability.json)。本書は既存Node CLI/GitHub Actionsのdelivery設計であり、実workflow・設定・製品コード・製品試験・CI・配布の実施結果ではない。

## Pipeline and Gate Mapping

| 順序/場面 | 置き場と処理 | 必要条件/結果 | 別に残る条件 |
|---|---|---|---|
| 設計段の記録 | 同単位のAI-DLC設計・計画・追跡表。初回U1はInceptionも同じPRへ | 適用traceability/upstream-coverageをblockingで確認 | 内部 `audit/` / `.aidlc-engine/`、他repo非公開記録は掲載しない |
| 設計だけのPR | 既存 `.github/workflows/ci.yml` のtest/hygiene等、受付が要求する非空mandatory集合 | 指定checkとその `t.workflow` 全体successを維持してdevauditor設計監査へ | U1が評価される場合は先行設計監査未取得で閉門。設計mode PASSなし |
| 設計監査PASS/受領 | 同PRの実在design-only headと公開依頼/返却/受領を対応付ける | 4分類該当単位はCode Generation前に独立設計監査PASS | 段の承認だけでCode Generation/保護対象変更を許可しない |
| Code Generation内のTDD | 候補コードの核/変換/adapter/entryをNode組込みで失敗→実装→合格 | FD-T01–20、実分母100%/SEC-T等へ対応。単位の同PRに記録 | PR候補コードを信頼版の門へ自動昇格しない |
| 既存必須CI | `ci.yml` / `hygiene.yml` の対象と既存技術検査を維持 | 必須失敗/skip/不明を成功にしない。実check名/対象headを観測 | 旧PR/own-code予算の整理を現行source構造/依存/秘密検査の削除に広げない |
| U1の評価CI | 案 `.github/workflows/ci-record-admission.yml` →既存 `scripts/sds/gate.mjs` のU1呼出経路 | 実PR取得→四条件核→完全結果または診断→不成立exit1。受付workflowとは分離 | 新workflow/必要検査化/権限配布の実変更は別途必要Owner条件 |
| 実装headのPR監査 | 新headで既存必須CI、devauditor独立実装監査、作者受領 | 必要な公開Owner判断とR3/R4の対象head承認も別途確認 | U1 PASSは本人性/実review/正式進行/merge権限ではない |
| 統合 | 作者以外のsuite-leadが同単位PRを統合 | 1単位1PR、前単位PR統合後に次単位Code Generation | 作者による自己監査/承認/統合はしない |
| 固定版の適用/配布 | 監査・統合済み版を固定commitで参照し、許可されたpin/caller差分をPRで扱う | 受け手の実ファイル/CI/版を後続で検証 | U5導入/初回完成、U7 AUN実証、U4実センサーは各担当 |

これはAI-DLCの段/単位の順やstateを再実装する計画ではない。正式進行は既存AI-DLC。前後の運用条件と、U1が機械検査できる記録整合の範囲を区別する。

## Entry Integration and Result Separation

**対応:** NFR5.1、NFR10.1、NFR10.2。

| 入口/結果 | 接続設計 | 制約 |
|---|---|---|
| 既存 `scripts/sds/gate.mjs` | 既存CLI名/引数/失敗契約との互換を保ちU1核を呼ぶ | U1用途/checkpointは信頼caller profileで固定。正確なargvはCode Generation計画で確定し、未対応を既存対応済みにしない |
| U1四条件 | 案 `ci-record-admission.mjs` の単一核。`conditions.records/ready/digests/designAudit` と完全assessment/scope/観測を保持 | 現headの実装監査やU4センサーを第5条件にしない。核にI/O/時計/乱数/token/process終了なし |
| 既存判定1〜3 | 既存risk/変更path/現head監査受領等の結果を、それぞれ既存field/役割で維持 | U1 assessmentと別結果。U1 PASSで監査/受領/統合条件を省略せず、これらをU1開始の先取り条件にもしない |
| 旧判定4/5 | 実workspaceのentryは `planBinding` / `judgment5` を呼ぶが、U1用経路では呼ばない | 全consumerの設定/旧fileを今回一括削除しない。既存consumerのdefault挙動を黙って切り替えない |
| entry終了 | 完全PASSはexit0、FAIL/UNKNOWNまたは前処理失敗は既存診断付きexit1 | 必須工程に `continue-on-error` / 無条件PASS / 失敗隠しなし。引数エラー等の既存契約も維持 |

entry分離・互換・旧接続の扱いは実装計画に実差分と影響を示す。配置案だけで新しい公開mode/schemaや全consumerへの挙動変更を許可しない。外部からの任意flag/PR内profileで必要集合や四条件を縮める経路は設けない。

## Trusted Workflow and Credential Boundaries

| Job/操作 | 実行元とデータ | 受け取る資格情報 | 運ぶ結果 |
|---|---|---|---|
| 既存PR test/build | 候補コードの試験。既存 `npm ci` / Node test等 | write資格情報なし。U1 reader用tokenを継承しない。checkout残留も確認 | assert/coverage/SEC-T/既存検査の実行結果 |
| U1 read/evaluate | 信頼するcallee固定commitのtools/規則とcaller profile。PR tree/blob/公開記録はデータ | metadata周辺だけに必要最小のread-only。核にtokenを渡さない | 一回評価の完全envelopeまたは前処理診断/exit |
| 既存status効果 | 既存SDS workflowの別責任 | 既存write tokenをreader/試験へ流用しない | 既存status。U1はjob不合格で停止でき、新投稿を要求しない |

固定calleeのrepo/commitを実Gitで照合し、tools checkoutの `.shirube-tools` とPRデータを分離する。U1 readerでPR script/依存install/test/buildを実行しない。PRのchecker/required-set/severity/exclude/checkpointを信頼版として読まない。掲載accepted-plan viewは固定stage/出力規則と対応付ける証拠であり、任意に適用段を削る命令ではない。

既存SDS workflowはstatus投稿と読取が同stepであり、すでに資格情報分離済みとは言わない。既存hygieneはcaller依存を導入するjobなので、read-only U1評価をそこへ混ぜない。これらの実変更は本段では行わず、対象差分の必要なOwner条件を確認する。

## Design Audit Intake Without Circular Dependency

既存 `scripts/hygiene/audit-admission.mjs:68–118` の `targetCheck` は依頼の各 `targets[].checks` を列挙する。対象headのcheck-run成功に加え、`workflowCheck` はそのcheckに対応する `t.workflow` 全体success、trigger/PR/head/base、merge checkoutを確認する。repo全workflowを無差別に成功要求する実装ではない。

| 制御点 | 採る配置/扱い | 失敗時/禁止 |
|---|---|---|
| 受付checkとworkflow | 既存の明示された非空mandatory集合と `t.workflow` を維持。実PRでcheck名/対象headを読む | checks空/mandatory削除で受付を通さない |
| U1 workflow | 案 `.github/workflows/ci-record-admission.yml` を `ci.yml` / `hygiene.yml` の受付workflowから分け、相互 `needs` を作らない | U1失敗を同じworkflow全体へ混ぜて監査受付を塞がない |
| 未監査design-only head | U1四条件は閉門のまま。既存受付CIが成立すれば先行監査へ渡す | 条件を減らす「設計モード合格」、架空の監査PASS/READYなし |
| 過去design-only監査 | 公開依頼/返却/本文hash/指定投稿者/同PR/unit/head/ancestor/設計集合と途中変更を照合 | 現head受領器の呼出しだけで歴史head対応済みとしない。設計変更後の旧PASSは差戻しても自動復活しない |
| 実装後 | 新headの独立実装監査と作者受領等を別に揃える | U1は実Code Generation開始時刻や完全な非公開履歴を証明しない |
| branch protection/ruleset | 監査受付のcheck指定とは別条件。現live設定は未観測 | 別workflowにしただけでrequired充足や保護設定緩和を主張しない |

実branch protectionが未成立U1をrequiredにしている等で受付/統合を妨げる場合は、対象差分と必要な公開Owner判断を扱う既存経路で止める。既存必須を削る/判定を弱める自動回避はしない。workflow分離は設計案であり、実CIが成立した証拠ではない。

## Test Automation and Coverage

**対応:** NFR1.1、NFR1.2、NFR2.2。

| 検証境界 | 後段の試験配置/内容 | 合否と証拠 |
|---|---|---|
| 純粋核 | 案 `tests/ci-record-admission.test.mjs` 等。FD-T01–05/12–18、明示now/ID/固定規則/架空観測 | 四条件/理由/非保証/現在集合、同入力決定性、同byte数の実bytes変更で不一致 |
| 読取adapter | 架空応答/page/時計/中断/拒否/境界path | 全5予算と取得完全性、head/base変更、後続取得停止、秘密/対象外I/O0 |
| 掲載変換 | 許可されたnative形式を模す架空単体入力。公開view試験とは別 | plan/summary/stage-completionのkind別canonical対応、一般質問/自動/skippedから承認を作らない |
| envelope | FD-T06–08/20の元結果とserialize/decode比較 | 非保証/残件/scope/同梱参照を欠かさず保持。削除/改変/別scope/不明ref拒否 |
| 既存entry | 同じ観測を既存entryへ注入しJSON/exitを確認 | 正例門exit0、負例/不能/前処理失敗は門exit1。runnerのexit0を負例門の成功と呼ばない |
| 実PR/CI統合 | 有界に取得した実PRデータ→核→実entry/CI停止 | 対象repo/PR/head/base、実取得完全性、tools/規則/環境版、入力集合、理由/exitを対応。mockだけの完成なし |
| coverage | Node組込み試験、核/変換/adapter/entryを含むscriptsと適用srcの対象一覧・分母・コマンド/実結果 | 実行コードの行網羅率100%。除外はPR理由と独立確認。分母0/未測定/部分集合/skip/80%へ緩めない |
| SEC-T/既存技術検査 | 適用項目IDと対象/入力/実結果、依存追加前脆弱性確認、構造/依存/秘密等 | 実行時npm依存なし。失敗を隠さず公開syntheticのみ |

各単位内でTDDの失敗→実装→合格を残す。rootの既存test globは `tests/*.test.mjs tests/u2/*.test.mjs` で、分割時も到達範囲と実対象分母を確認する。新test runner/依存を採択せず、coverageの正確な対象/コマンドはCode Generation/Build and Testで確定・実測する。本書の方法を実行結果として報告しない。

## Candidate Verification and Fixed Revision Rollout

| 段階 | 信頼/検証する対象 | 成立条件/限界 |
|---|---|---|
| 導入前候補 | PRの新U1コードを資格情報のないtest境界で検証。必要なら別read-only取得境界から実PRデータを注入 | rootのpin欠落/baseにU1未搭載を保持。PRコードを自身を裁く信頼版へ自動昇格しない |
| U1の統合確認 | 実PR読取の完全性と四条件核/既存entry/CI停止を単位内で確認 | mockだけで完成にせず、候補検証の版/対象を明示。配布済み門の稼働とは別 |
| 監査・統合済み固定版 | U1の監査・作者受領・必須CI等を揃え、別suite-leadが統合したcommit | 信頼tools/規則版として参照できてから、許可されたpin/caller差分をPRで扱う |
| 受け手での適用/検証 | 固定版と実ファイル・実CIの対応を観測 | U5の導入/初回、U7のAUN実適用/実PR正負/driftが別の実証。宣言pin/registryだけでは成功にしない |

`job.workflow_repository/job.workflow_sha` の既存方式とcommit固定のcallerを基準にするが、実profile解決/正確なargv/check名/設定は未実装・未観測である。新pin形式や署名鍵・認証供給者を追加して不足を埋めない。U4は同対象を再取得し、信頼版2センサーを実CIで実行する別単位であり、U1 PASSで省略しない。

## Deployment, Promotion and Rollback

新staging/production、blue-green/canary/rollingのサービス展開は非適用。候補コード検証→監査・別担当統合済みcommit固定→許可されたpin/caller差分→受け手の実確認を区別する。tag/配布宣言だけをpromotion成功にしない。

| 場面 | 戻し方/停止設計 | 保持する条件 |
|---|---|---|
| 評価途中の取得/出力失敗 | 当該評価を停止し既存診断/exit1。完全assessmentを作れなければ下流へ渡さない | 正常原本/正式state/過去履歴を更新しない。前のPASS/cacheを現評価にしない |
| 候補コード不適合 | 対象版の原因/差分を示し同PRで修正する。正当な新入力で再試験 | workflow/mandatory/閾値を弱めて通さない |
| 固定版適用前 | 取得版・差分・許可条件・戻す先をPRで具体化し、成立しなければ適用しない | 実workflow/必須検査/branch protection/資格情報等は別の公開Owner条件 |
| 適用後drift/不適合 | 受け手の実ファイル/CI/版と照合し、必要な判断を得た対象差分で復旧/再検証する | 無許可のpin戻し/保護緩和/自動修正なし。復旧の効果/同一要求はU5責任 |
| schema意味変更が必要 | 新旧同居、移行、試験済み逆向き、必要Owner判断を先に扱う | 共有/掲載majorや必須型を黙って変更/nullable化しない |

既存teamのkit版上げ例外はその限定file/生成差分/check OK/監査・統合版/監査受領/別担当統合等の全条件に一致する場合だけ用いる。新workflow、初回導入、mode/必須検査/保護設定の変更や対象外センサーを自動的に例外へ含めない。設計要約確認/段承認/実装計画承認は保護対象変更許可と別である。

## Failure, Stop and Output Contract

**対応:** NFR4.1、NFR6.2、NFR10.2。完全結果は[monitoring-designの境界](monitoring-design.md#complete-result-and-diagnostic-boundary)に従う。

| 状況 | 動作 |
|---|---|
| 実head/base/blob未取得でdigest不明、構造不正 | 既存診断/exit1。有効assessment/envelopeなし。空/架空/宣言hashやnullable化で補わない |
| 必須fieldが揃い、一部条件の観測が不能 | 安全に完全結果を構成できる場合だけUNKNOWN/exit1 |
| 完全四条件PASS | 元結果/非保証/残件/scope/同梱観測を保持してexit0。権限はNONE |
| 残件未評価 | 未評価と示し、既知残件を保持。空array合成で「残件なし確認済み」としない |
| 人待ち/中断/timeout/skip/cancel/予算超過 | 成功へ変換しない。人待ちは一回通知し停止。自動retry0、watcher/後継記録/待機中成果物なし |
| 正当な再評価 | 現PR/head/base/計画/対象/公開証拠を実取得。旧snapshotを現在へ昇格しない |

U1の判定は副作用のない読取/出力であり、NFR7の効果冪等性は非適用。U3正規操作/U5配布の同一要求・結果不明時照会を移管しない。

## Approval, Standards and Remaining Work

承認kind/肯定値とREADY日付はFD規則BR2/BR3を参照する。plan=`Approve Plan`、summary=`Looks correct`、stage-completion=`Approve` または正式に適用される `Accept as-is` の意味を混同しない。否定/空/未知/他kind/自動/skippedから人承認を作らない。READYは固定Asia/Tokyo/2026-11-06含むstage-completion承認日で適用し、legacy不足を残す。日付不明をlegacy化せず、再開/再承認へ旧日付を継承しない。

現在checkpointの必要集合は非空とし、完了承認済みの先行段と現在成果物/実施済みplan/summaryを要求する。未来Code Generation/Build and Test/CI完了承認を先取りしない。門はengine真正性/Owner本人/実review実施を証明せず、既存独立監査による補完・作者受領・必要公開Owner判断・別担当統合を残す。

S1〜S9の既定/例外 `deviation_ledger` / 未enforce時report-onlyを維持する。Node ESM/既存JSON-exit/実行時npm依存なしと既存技術検査を保持し、旧PR予算等の退役を理由にsource構造/依存/秘密検査まで削除しない。新例外/新規格は採択していない。

FD上流Minor R-01のE05説明誤記は未解消。正しいE05はU2/U6→LLMテキスト対話で、独立監査/公開判断はE01等と既存権限条件。指定順U1→U4→U2→U3→U5→U7→U6のruntime反映も未成立の既存残件で、U1終了時に席が正式経路を確認し、無理ならU4前にOwnerへ相談する。偽辺/rename/state/cache/jump/engine変更で回避しない。U4/U5/U7/U6/U3の実証責任は各担当のまま。

## Assumptions & Open Questions

None.

実装/正確なargv/profile、公開掲載file名、CI22/lockfile/道具の適合、coverage/SEC-T/性能、実PR統合/実CI、live保護設定/check名、固定版適用/後続受渡しは未検証。本書の生成や文書センサーの合格を製品/配布の実合格へ読み替えない。
