# U1 — Unit Test Instructions

## Status and Scope

対象は `u1-ci-record-admission` のみ。[code-generation-plan.md](code-generation-plan.md) の未実行手順である。現在の成果は計画2文書だけ。以下の新試験file・製品module・公開JSON・workflowは未生成、製品試験・coverage・SEC-T・実CIは未実行。コマンド例を実行済みの証拠として扱わない。

製品fileの作成前に native Plan Approval、同PR設計だけheadのdevauditor独立設計監査PASS、対象差分に必要な公開Owner権限を確認する。未成立では実装/試験file生成へ進まない。設計監査後も同じPRに実装を追加し、新headのCI/独立実装監査/作者受領/必要判断/別suite-lead統合を別々に揃える。

## Framework Setup and Runner Readiness

既存 `package.json` はESM、Node >=22、`node --test tests/*.test.mjs tests/u2/*.test.mjs`。新試験は既存root tests globに一致する名前とし、runner/dependency/package scriptの追加は不要。Node組込み `node:test` と `node:assert/strict` を使う。実行時npm依存を足さず、新規installを行わない。Nodeのcoverage CLI引数がこの単位の試験設定となる。

Code Generation Step 1で実Node版・組込みcoverageの利用可能性とlockfile/tool適合を観測する。現在のローカルv26.12.1/CI22という設計時の観測を、新しい実測へコピーしない。coverageオプションが使えない場合は100%を緩めず適合する既存環境を確認する。依存を追加して穴埋めしない。

最初のRed**前**のrunner確認コマンドは、現に存在する試験の完全名1件だけを選ぶ。このケースは既存gateを架空APIで呼び、ネットワーク・資格情報・外部書込みを要しない。filterで選ばなかった試験は今回の実行数/成功数へ数えない。

```sh
node --test --test-name-pattern='^R1 with one matching label and exact changed paths passes without an audit$' tests/sds-gate.test.mjs
```

既存 `tests/sds-gate.test.mjs` を読み、上記のcase名/import/fixtureが存在することを確認済み。**実行は未実施**であり、この計画でrunner readyを宣言しない。実行した出力でselected=1/pass=1を確認してから最初のRedへ入る。runner起動失敗・syntax error・誤ったfilterによる0件を、製品仕様のRedへ数えない。

## TDD Ordering by Layer

| 層 | 適用と順序 | 対象file |
|---|---|---|
| JSON/value model | 適用。Red→Green→Refactor | policy/input、次にprojection |
| Repository/data access | DBなし。E01のPR/tree/blob/公開comment読取として適用。Red→Green→Refactor | evidence、historical design-audit |
| Business logic | 適用。Red→Green→Refactor | admission |
| CLI adapter/出力 | HTTP endpointは非適用。既存entry/inline境界をRed→Green→Refactor | envelope、entry |
| 境界統合・security | 適用。拒否するassertを先に作り、Green、Refactor | integration/security |
| 実PR/CI | 必要な統合実証。既存前提と実対象を用意して実行 | real-pr |
| Database、UI、browser、HTTP server、効果冪等性 | 非適用。不要な層/fixture/サービスを作らない | DBは別intent、native効果U3/配布効果U5 |

各Redで対象case・要求ID・コマンド・実失敗理由を残し、同コマンドをGreen/Refactorでも確認する。最初は該当test fileだけを作り、既存runnerで仕様のassertが失敗することを確認する。Greenは必要最小実装、Refactor中も適用試験をgreenに保つ。同じPR内の証拠を使い、別PRの過去red/greenを流用しない。

各単体fileの実行は対応する1行を使用する（すべて新規file作成後の予定コマンド）。

```sh
node --test tests/ci-record-policy.test.mjs
node --test tests/ci-record-input.test.mjs
node --test tests/ci-record-projection.test.mjs
node --test tests/ci-record-evidence.test.mjs
node --test tests/ci-record-design-audit.test.mjs
node --test tests/ci-record-admission.test.mjs
node --test tests/ci-record-envelope.test.mjs
node --test tests/ci-record-entry.test.mjs
```

境界/安全性の予定コマンド:

```sh
node --test tests/ci-record-integration.test.mjs tests/ci-record-security.test.mjs
```

## Scenario Register — 82 Planned Scenarios

以下のIDは**U1の試験識別子**であり、新たな規格/権限/工程IDではない。各IDは1つのtop-level testにだけ割り当てる。FD-Tが複数fileへ現れるのは異なる層のassertであり、同じ試験を二重計上しない。表中のparameter casesは追加の実行assertとして報告し、82件に再加算しない。coverage/要件で追加が必要なら増やすが、82件の存在だけで充分としない。

| file（tests/以下） | 層/8件の固有IDと内容 | FD対応 |
|---|---|---|
| ci-record-policy.test.mjs | value model。U1-POL01 非空固定集合/Inception、U1-POL02 成果物1件欠落、U1-POL03 stage/任意excludeによる縮小拒否、U1-POL04 現checkpointと未来承認非要求、U1-POL05 新完了承認段追加、U1-POL06 不明/競合計画UNKNOWN、U1-POL07 固定profile/版とtarget slot、U1-POL08 固定自己参照除外の構造検査 | FD-T02/11/14/15/17 |
| ci-record-input.test.mjs | value model。U1-IN01 /1正例/required型、U1-IN02 未知major/critical、U1-IN03 同object重複key・escape同名、U1-IN04 部分/破損/過大JSON、U1-IN05 path絶対/空/dot/dotdot/backslash/NUL、U1-IN06 symlink/submodule/境界外拒否、U1-IN07 Unicode/改行/引用符raw保持、U1-IN08 logical ref/重複record/target型 | FD-T07/08/11/17/18 |
| ci-record-projection.test.mjs | 掲載変換。U1-PRO01 plan native対応、U1-PRO02 summary native対応、U1-PRO03 stage-completion/適用Accept as-is、U1-PRO04 各kindの否定/空/未知/他kind拒否、U1-PRO05 一般質問/off/skipped拒否、U1-PRO06 自動/Autonomous/STAGE_COMPLETED拒否、U1-PRO07 private原本/人返信/body除外、U1-PRO08 公開viewと変換元のtarget/attempt/ref対応 | FD-T09/10/11/17 |
| ci-record-evidence.test.mjs | data access。U1-EV01 全page/tree/blob完全取得、U1-EV02 raw bytes/既知独立hash、U1-EV03 欠page/truncated/必要path不足、U1-EV04 5予算の境界/超過/中断、U1-EV05 403/404/取得拒否/parse失敗、U1-EV06 前後head/base変化/旧応答、U1-EV07 変更集合/rename/未分類追加、U1-EV08 同義/順序変更/再取得と独立評価 | FD-T04/16/17/18 |
| ci-record-design-audit.test.mjs | historical data+binding。U1-DA01 4分類全非該当/一分類該当、U1-DA02 同PR設計だけ祖先headの正例、U1-DA03 別repo/PR/unit/head拒否、U1-DA04 request/review本文hash/投稿者/request_digest、U1-DA05 必須item/PASS/blocking/期限/取消、U1-DA06 設計変更後差戻し失効、U1-DA07 ancestor/base_moved/履歴不能、U1-DA08 受付READYと監査PASS/工程参照順を区別 | FD-T05/16/19 |
| ci-record-admission.test.mjs | business logic。U1-ADM01 四条件正例/集約、U1-ADM02 必須記録/承認欠落、U1-ADM03 READY欠落/NOT-READY/正式役なし、U1-ADM04 現digest不一致、U1-ADM05 設計監査不足/不明/非該当、U1-ADM06 JST inclusive日付境界/形式、U1-ADM07 原承認/再承認/再開/不明日/旧日改変、U1-ADM08 legacy READY0件/非空集合/決定性/非保証と残件 | FD-T01/02/03/04/05/12/13/14/15/18 |
| ci-record-envelope.test.mjs | 結果境界。U1-ENV01 完全encode/decode一致、U1-ENV02 非保証固定field欠落/改変、U1-ENV03 knownRemaining空化/field欠落、U1-ENV04 target/head/base/scope差替え、U1-ENV05 dangling/重複observationId、U1-ENV06 別scope/版/不能observation、U1-ENV07 元結果なし/参照だけ/部分結果拒否、U1-ENV08 C01/C03/C05/C07 viewでsourceと配布先分離 | FD-T01/06/07/08/20 |
| ci-record-entry.test.mjs | CLI adapter。U1-ENT01 固定argv正例/JSON exit0、U1-ENT02 四負例のJSON exit1、U1-ENT03 完全UNKNOWN exit1、U1-ENT04 早期診断のみ/未評価残件/偽hashなし、U1-ENT05 未知用途/checkpoint/任意profile/重複argv拒否、U1-ENT06 U1経路の旧4/5呼出し0、U1-ENT07 従来callback/default結果互換と判定1〜3分離、U1-ENT08 人待ち一回停止/正当な再評価のみ新観測 | FD-T01〜05/17/19/20 |

上表は8file×8=64件。残りは次の18件。

| file | 固有IDとassert | FD対応 |
|---|---|---|
| ci-record-integration.test.mjs | U1-INT01 実module連鎖四条件正例、U1-INT02 records欠落→entry exit1、U1-INT03 READY欠落→exit1、U1-INT04 同byte数1byte変更→exit1、U1-INT05 設計監査欠落→exit1、U1-INT06 取得中断/最終head変更→診断非消費、U1-INT07 設計監査受付mandatory/対応workflow全体successとU1別workflowの非循環、U1-INT08 C01/C03/C05/C07輸送の非保証/残件/source保持 | FD-T01〜08/17/19/20 |
| ci-record-security.test.mjs | U1-SEC01 JSON escape重複key/critical injection、U1-SEC02 traversal/symlink/submodule/対象外I/O0、U1-SEC03 secret marker/人返信/body公開0、U1-SEC04 command/markup/URLを命令実行0、U1-SEC05 読取資格情報だけ/拒否効果0、U1-SEC06 candidate testへtoken/checkout残留資格情報0、U1-SEC07 budget超過後取得/自動retry0、U1-SEC08 PASS権限昇格/未知caller/PR自己弱体化拒否 | FD-T09〜11/17/18/19/20 |
| ci-record-real-pr.test.mjs | U1-REAL01 許可済み実PRの実bytes/公開記録→核→entry→CI結果、U1-REAL02 同単位PRの実headにある架空公開記録の不足/改変/取得不能→実CI停止。前後scope/tools/規則版/実完全性/理由/exitを記録 | FD-T01〜05/17/19/20 |

SEC-Tの正本版/項目IDは実行前に既存の採択済み資料から同定し、上のU1-SECケースへ対応付ける。これら独自試験IDを社内SEC-TのIDとして提示しない。現入力の凍結設計は適用SEC-Tを要求しているが項目表自体は含まず、項目照合は未実施。未同定を合格/非適用にしない。

## Expectations, Fixtures and Mocking

`tests/ci-record-fixtures.mjs` は公開synthetic builderだけを持ち、FD entities/shared-schemaを使って正例のshapeを検証してから、負例で1つの条件を変更する。期待値はFD/契約から決め、製品関数の返値をそのまま期待値へコピーしない。hash正例は独立の既知byte列/期待digestを用い、同byte数変更の負例で観測再計算を確認する。

- 外部transport・明示clock・abort・response chunksを注入し、実関数で予算/完全性を検証する。核/理由/集約をmockしない。
- now/assessmentId/observationId/Target/attemptは明示入力。核のDate.now/new Date()引数なし/Math.random/randomUUID/環境読取/IOは0。
- canonical肯定値だけを認める。日付は2026-11-05T14:59:59Zと15:00:00Z、厳密date、offsetなし、invalid、原承認/再承認/再開をparameter化する。Shirube/AUNで同じ固定Asia/Tokyoを適用する。
- complete=trueはpage/tree/必要path等の取得事実からadapterが作る。PRの宣言値をechoしない。self-reference除外は固定kindのみで、除外記録のschema/対象/充足も検査する。
- head/base/実blob/digestが未観測なら診断だけ、exit1。有効assessmentなし。架空hash、空集合hash、宣言digest、nullable化、未評価knownRemaining=[]で補完しない。実必須fieldが揃った一部不能の完全UNKNOWNと区別する。
- assessmentの `assurance=record-and-current-content-consistency-only`、`engineAuthenticity/ownerIdentity/reviewerExecution=not-verified-by-gate`、`authorization=NONE` を全経路で保持する。
- public fixture/診断に実人返信・実データ・私的audit/.aidlc-engine/他repoデータを使わない。架空secret markerも出力に残らないことをassertする。scratchが必要な新試験はproject内の評価ごとの領域を作ってfinallyで除去し、共有可変fixtureを持たない。
- 新schema/暗号署名/host/producer/DB/loginを導入しない。GitHub URL/actorや内容hash一致は本人性の証明にしない。

## Coverage Targets and Actual Denominator

Testing Contractのfeature80% scope floorにteam/NFRの100%を加算し、実際の行網羅率を100%にする。providerはNode組込みV8 coverage。除外pragmaは予定しない。新source7file・gate・audit-admissionに加え、U1/既存互換経路から到達する既存依存のlib/yaml/plan-binding/design-gate/stageを含める。旧4/5をU1経路で呼ばなくても、変更したentryのdefault互換部分を分母から隠さない。

予定の実行source集合（14file、実装時にimport closureとsource-manifestへ照合）:

1. scripts/sds/ci-record-policy.mjs
2. scripts/sds/ci-record-input.mjs
3. scripts/sds/ci-record-projection.mjs
4. scripts/sds/ci-record-evidence.mjs
5. scripts/sds/ci-record-design-audit.mjs
6. scripts/sds/ci-record-admission.mjs
7. scripts/sds/ci-record-envelope.mjs
8. scripts/sds/gate.mjs
9. scripts/hygiene/audit-admission.mjs
10. scripts/hygiene/lib.mjs
11. scripts/sds/yaml.mjs
12. scripts/sds/plan-binding.mjs
13. scripts/sds/design-gate.mjs
14. scripts/sds/stage.mjs

予定では適用srcは0fileで、新しいsrc層を作らない。実import/差分でsrcその他が適用されれば集合/コマンドへ加える。上の集合だけでShirube製品全体の100%を測れたとは言わない。未load source、追加source漏れ、分母0、未測定、skipを成功にしない。報告はfile別の実行行/未実行行/計測分母と総計、provider/実Node版/コマンド/結果/対象headを持つ。

coverageの予定コマンドは、unit試験と共有sourceの既存回帰fileだけを明示する。広いproject globや裸npm testは使わない。既存regressionは82新規シナリオへ計上しない。

```sh
node --test --experimental-test-coverage --test-coverage-lines=100 --test-coverage-include='scripts/sds/ci-record-*.mjs' --test-coverage-include='scripts/sds/gate.mjs' --test-coverage-include='scripts/hygiene/audit-admission.mjs' --test-coverage-include='scripts/hygiene/lib.mjs' --test-coverage-include='scripts/sds/yaml.mjs' --test-coverage-include='scripts/sds/plan-binding.mjs' --test-coverage-include='scripts/sds/design-gate.mjs' --test-coverage-include='scripts/sds/stage.mjs' tests/ci-record-policy.test.mjs tests/ci-record-input.test.mjs tests/ci-record-projection.test.mjs tests/ci-record-evidence.test.mjs tests/ci-record-design-audit.test.mjs tests/ci-record-admission.test.mjs tests/ci-record-envelope.test.mjs tests/ci-record-entry.test.mjs tests/ci-record-integration.test.mjs tests/ci-record-security.test.mjs tests/sds-gate.test.mjs tests/sds-gate-binding.test.mjs tests/design-gate.test.mjs tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs tests/guards.test.mjs tests/lines-baseline.test.mjs tests/pr-size.test.mjs tests/secret-suppressions.test.mjs
```

出力はツール結果/CI logから読む。新しいreport/helperをshellで作らない。Nodeのinclude指定だけでは未load fileを強制的に分母へ入れた証明にはならないため、実reportの全13fileと実import集合を照合する。追加分母/未到達行があれば要求に沿う試験を追加し、100%に達しない結果は未達として返す。既存regression内の旧閾値や規格を新U1の受入値へ流用しない。

## Compatibility and Mandatory Checks

限定編集の前後に以下の正確なfileでgate/audit受付の互換を検証する。既存fileは基準のまま用い、期待値を新挙動へ都合よく変えない。

```sh
node --test tests/sds-gate.test.mjs tests/sds-gate-binding.test.mjs tests/design-gate.test.mjs tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs
```

互換の観測点はdefault argv/callback、risk label/実changed paths/判定1〜3、既存JSON field/exit、現head監査受付のrequest/review本文hash・必須全item・投稿者/独立性・期限・前後再取得、指定checkと対応workflow**全体success**・merge checkout証明・base_moved。historical監査は別の明示scopeで検証し、現head器へ偽の現在PR観測を渡さない。新U1経路は旧planBinding/judgment5非呼出し、用途/checkpoint不正は外部取得前に失敗する。

構造/依存/秘密等の既存mandatory CIは対象headで維持する。全体baseline/通常CIは既存の正規手順として別に確認し、この単位のrun commandへ裸project-wideコマンドを混ぜない。hygiene境界は共通libとNode組込みだけ、依存の追加前確認を維持する。現planで依存追加・閾値変更・必須検査変更は行わない。

## Real PR and CI Integration — Not Yet Executed

実PR/CIの前提を親が揃えてから、同じ単位PR/actual headの値をreaderへ渡す。read-only readerは信頼toolsで全必要page/tree/blob/公開原文を取得し、PRのscript/install/test/buildを実行しない。候補コード試験はreader資格情報を受けない別jobへデータだけを渡す。核はtokenを受けない。PR自身を自身のtrusted toolsに昇格させず、候補検証と監査統合済み固定版稼働を区別する。

予定コマンドは2つの実PRシナリオだけを選ぶ。既存entryのexact argvは計画のCaller Profile節に従い、試験はその実entry/結果を検証する。引数対象と実観測headが一致しなければ失敗。前提env/公開実PRデータ/CI run対応が欠ければテストを明示失敗させ、skipや合成PASSにしない。

```sh
node --test --test-name-pattern='^U1-REAL01 ' tests/ci-record-real-pr.test.mjs
node --test --test-name-pattern='^U1-REAL02 ' tests/ci-record-real-pr.test.mjs
```

U1-REAL01は現在PRの評価を観測し、四条件PASSの正例は**実際に条件が揃った対象**でだけ受け入れる。閾値後の必要READYが欠けるactual PRは正しくFAILとし、実PR正例の受入は未達として残す。架空READY/承認日改変/未監査headで通さない。

U1-REAL02は、親が必要権限下で用意する同単位PRの実headに、架空内容の公開記録1件不足/内容不一致等を置いた実CIでexit1を確認する。生産データや他repoを使わず、設計を変更して先行監査を失効させる負例作成はしない。ローカルで取得値を改変しただけの反例はINT/SECで扱い、実PR負例の代わりとしない。head変更後は新headとして再取得/CI/必要監査を行う。試験自身はPR投稿・push・設定変更を行わない。

U1 workflowは既存ci.yml/hygiene.ymlの監査受付workflowと分け、相互needsを作らない。設計だけ未監査headはU1閉門のまま、既存受付は非空mandatory/check対応workflow successを保つ。checks=[]、mandatory削除、条件の少ない設計mode PASSを作らない。新workflow/必須化/資格情報/branch protectionは必要Owner権限成立後だけ実施する。live設定は未観測で、別workflow案の存在だけでrequired充足を主張しない。

## Results and Remaining Work

実行後は以下を既存Code Generation/Build and Test記録へ対応付ける: 試験ID/層/FR・BR・FD-T・NFR・AC、対象head/tools/規則版/環境、実コマンド、Red/Green/Refactorの実結果、対象集合とcoverage分母、正負の門exit、SEC-T適用項目/結果、実PR/CI参照、非保証/残件。実施していない項目を成功と書かない。

U1の合格範囲は実PR→四条件→完全結果/診断→CI停止。U4実2センサー、U2対話、U3正規操作、U5導入/初回完成、U7AUN実適用/実PR正負/drift、U6新要求の実追加は別受入。AC3.2.3はU1寄与を実測しても、U4等まで一括完了しない。N/A4件はFDの理由を保持する。既存READY不足・FD Minor R-01(E05正しくはU2/U6対話)・U1→U4正式runtime順未成立を残す。Construction Verification Commandの人による正式選択も本書で代行しない。

