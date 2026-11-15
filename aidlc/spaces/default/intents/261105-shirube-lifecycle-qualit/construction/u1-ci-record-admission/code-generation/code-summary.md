# U1 — Code Generation Summary

## Status and Scope

**実装途中・単位未完了。** AI-DLC の単位の作る段の出力（PR #101 に実装を足した版）。承認済み計画38 task中29 taskを確認済みにした。残る9 task、予定82シナリオ中の実PR/CI 2件、実環境の必要条件を完了扱いにしない。Retryでは複雑さ超過6件と既存7FAILを解消したが、実PR取得予算・READY・配置計画・SEC-Tの不足は残る。本書は実施範囲と残件の記録であり、段承認・統合許可・完了報告ではない。

対象は `261105-shirube-lifecycle-qualit / u1-ci-record-admission`。新規実装7 module、既存限定変更2 file、新試験10 file、synthetic helper1 fileを作成した。変更source集合20 fileは [source-manifest.json](source-manifest.json) に列挙した。実PR試験file、公開 `pr-records.json`、新workflowは未生成。DB・migration・HTTP server・UI・browser・配布効果の層は非適用。

Testing Contractはnative実stdoutと承認済み [plan](code-generation-plan.md) / [instructions](unit-test-instructions.md) の同版を完全一致確認した。契約は `sha256:62c789ef343028f519fab91d9b5f12e16036301fd061fbaa7bb6ad62d0fc6d06`。scope floor 80%を変更せず、team/NFRの行100%を加算した。計画本文・試験手順本文は変更せず、planの完了checkboxだけ更新した。既存質問・state・diary・凍結設計は手編集していない。

## Preconditions and Source Basis

native Plan Approvalの承認記録を親から受領した。同PR #101の設計だけhead `6795535a9173c467a93f3e82141a2fe3385ce9fe` に対するdevauditorの独立設計監査は18/18 PASS。第2回 [request](https://github.com/watchout/shirube/pull/101#issuecomment-6735909420) の本文SHA-256は `d9ee7e20ea32c754ff042d8b89ccae90b254263b69928251677b1caf5cf2badf`、[review](https://github.com/watchout/shirube/pull/101#issuecomment-6736186362) は `87897b64f470a9106c7cb964c985fac83619473cca790626a4fd984734808040`。親は2026-11-09T22:31:23.403Zに同版checkerでRECEIPT_ACCEPTEDを再確認し、[作者受領](https://github.com/watchout/shirube/pull/101#issuecomment-6753266066) を公開した。これらは設計監査の成立であり、新実装headのCI・独立実装監査・作者受領・統合ではない。

保証分担とREADY/legacyの既存決定の公開転記は control_source_ref.url = https://github.com/watchout/shirube/pull/101#issuecomment-6735846376 、control_source_ref.sha256 = `ceb519192546a640887a233a38b5f0f66ea778e887b0f366530de6ed59ada700`。この参照をworkflow・必須検査・branch protection・資格情報変更の個別許可にしない。今回これらを変更していない。

実装はPR #101 branch（設計監査PASSのhead `6795535a` に公開main `e1c2aea0` を取り込んだ merge `e9d2867` の上）に足した。既存gate/audit-admissionはmain上の実物へU1用hunkだけを当て、既存の既定呼出・JSON・exitを保った。root未commit差分の実測を公開main上の実測へ読み替えず、下の試験・網羅率は同branchで再実行した値を別に記す。

## Implemented Behavior

- `ci-record-policy`: 閾値・理由・肯定値・stage出力定義・固定caller profileの単一実行正本。実装前に読んだinstalled AI-DLC 2.11.1 stage bytesのdigestを保持し、private engineは配布しない。初回の非空必須集合と現在Code Generation plan、先行完了段、未来段の承認非要求を検査する。PR指定exclude・未知purpose/checkpoint・任意profileを許可へfallthroughさせない。
- `ci-record-input/projection`: UTF-8/raw bytesとUnicode pathを保持し、上書き前のJSON重複key、危険path、symlink/submodule、未知critical/major、部分入力を拒否する。plan/summary/stage-completionをkind分離し、一般質問・自動完了・skippedを承認にしない。公開成果物の内部audit/.aidlc-engine除外と、既存公開 `docs/audit/*.json` item_set取得を分離した。
- `ci-record-evidence`: read-only GETの注入可能transport/clock。20,000ms/request・120,000ms総期限・100request・8,000,000byte/response・retry0を固定し、全page/必要tree/blob/raw bytes/Git object IDと取得前後head/baseを実観測する。同一reader内の既取得immutable Git blobの再利用時もOID/sizeを照合し、過去runのcacheを根拠にしない。historical auditのrequest/review/固定verifier/履歴/全workflow成功/checkout proofを取得する。
- `ci-record-design-audit`: 同PRの設計だけ祖先head、設計digest、祖先/変更履歴、対象範囲、期限、必須全itemのPASSを検査する。4分類全てに非該当根拠がある時だけNA。設計変更後は監査を失効させる。現head受付のtargetCheckへ偽の現在PR観測を渡さない。
- `ci-record-admission`: now/assessment ID/観測を明示入力とする純粋核。records/ready/digests/designAuditの四条件だけを集約し、FAILをUNKNOWNより優先する。READYは段完了承認日で2026-11-06 Asia/Tokyo inclusive。旧日不足は残件、閾値後不足・再開/再承認は免除しない。不明日や競合を成功へ変えない。
- `ci-record-envelope`: 完全inline結果と元評価の厳密一致、同梱observation参照、target/head/base/scope/非保証/残件を検査する。参照だけ・部分結果・任意metadata body・残件の空化を拒否する。
- 既存 `gate`: 明示U1用途だけcollector→核→envelopeへ接続し、旧4/5を呼ばない。default callback引数/JSON/exitを保持する。U1 FAIL/UNKNOWNはexit1、早期失敗は診断だけで偽hashや未評価残件空配列を作らない。
- 既存 `audit-admission`: request/review/item/base/workflowの既存純粋検査を共有exportへ整理した。現head受付のmandatory集合・全workflow成功・checkout proof・前後再取得は維持する。

新runtime依存は0、ESMとNode組込みのみ。候補試験processに資格情報を渡さず、readerデータと候補実行を分離したsynthetic試験を実施した。実CI jobの資格情報/checkout分離は未検証。

## Public Observation Inputs Still Missing

collectorは既存公開code-generation-planのTesting Contract、unit-of-work、bolt-plan、設計監査済み版/hashを照合する。stage別のattempt、完了/summary/plan/review観測、原承認日・再承認日については、実際の既存native記録から必要最小限をallowlist投影する必要がある。

本書には実観測で確定していないstage table・attempt・承認日時を記入していない。予定 `shirube-pr-records/1` の完全viewも未作成であり、実PR #101の公開readbackを完全な投影へ読み替えない。不足時はUNKNOWN/診断で閉じる。新schema・認証producer・発行元真正性証明を追加して穴埋めしない。

## Test Execution and TDD

Node `v26.12.1`、npm `11.20.0`、Git `2.50.1` で実行した。最初のRed前に次の既存完全名filterを実行し、選択1件/PASS1件を確認した。

```sh
node --test --test-name-pattern='^R1 with one matching label and exact changed paths passes without an audit$' tests/sds-gate.test.mjs
```

value model→data access→business logic→envelope/entry→integration/securityの順にRed→Green→Refactorを実行した。入力最初の同一commandは8FAIL→8PASS。初期envelopeは6FAIL/2PASS、entryは7FAIL/1PASSであり、負例assertが未実装例外を捕えた初期PASSや既存互換PASSをRed件数へ加えていない。後続では同byte数改変、raw BOM、未完了先行段/planの自己弱体化、legacy再開、未来承認、qualified plan context等の実assert失敗を観測し、同commandのGreenを確認した。単なるrunner起動失敗を仕様Redに数えていない。

予定82件のうち単体64・境界統合8・安全性8の80件を実行し、80PASS。parameter内assertは80件へ重複加算しない。実PR/CIのU1-REAL01/02はfile未生成・未実行であり、skip合格にしていない。

| 実test file（tests/以下） | top-level ID / 件数 | 主な層 | FD対応 |
|---|---|---|---|
| ci-record-policy.test.mjs | U1-POL01〜08 / 8PASS | value model | T02/11/14/15/17 |
| ci-record-input.test.mjs | U1-IN01〜08 / 8PASS | value model | T07/08/11/17/18 |
| ci-record-projection.test.mjs | U1-PRO01〜08 / 8PASS | 掲載変換 | T09/10/11/17 |
| ci-record-evidence.test.mjs | U1-EV01〜08 / 8PASS | data access | T04/16/17/18 |
| ci-record-design-audit.test.mjs | U1-DA01〜08 / 8PASS | historical binding | T05/16/19 |
| ci-record-admission.test.mjs | U1-ADM01〜08 / 8PASS | business logic | T01/02/03/04/05/12/13/14/15/18 |
| ci-record-envelope.test.mjs | U1-ENV01〜08 / 8PASS | 完全結果境界 | T01/06/07/08/20 |
| ci-record-entry.test.mjs | U1-ENT01〜08 / 8PASS | CLI adapter | T01〜05/17/19/20 |
| ci-record-integration.test.mjs | U1-INT01〜08 / 8PASS | module/実CLI連鎖 | T01〜08/17/19/20 |
| ci-record-security.test.mjs | U1-SEC01〜08 / 8PASS | 安全性境界 | T09〜11/17/18/19/20 |

統合は架空REST Responseを実collector/核/envelopeへ通し、架空fetchをNode preloadで注入した実gate CLI子processのexit0/exit1を確認した。実ネットワーク/実PR/実CIの実証ではない。read-only qualification/credential-free childを検査したが、正式SEC-T正本の版/項目IDへの照合は未成立で、U1-SEC識別子を社内SEC-Tへ代用しない。

既存default/監査受付互換は次の4fileで217/217PASS。既存期待値を変更していない。

```sh
node --test tests/sds-gate.test.mjs tests/sds-gate-binding.test.mjs tests/design-gate.test.mjs tests/audit-admission.test.mjs
```

初期の既存5suite baselineは226件中223PASS/3FAIL。環境準備前のcoverage runは323件中316PASS/7FAILだった。以下の既存ツール不足7件は、親による許可済み環境準備後に解消し、今回の修正後exact coverageは**323/323PASS、skip/cancel/todo0、exit0**となった。過去の失敗を削除せず、現在の成功と区別する。

- audit-counterexamples: B03、AUD-SHIRUBE1-JSCPD-COVERAGE-001、AUD-SHIRUBE1-JSCPD-SCANSET-002。
- guards: AB-23、AB-25、AB-26。
- secret-suppressions: R03（JSX ESLint）。

親は許可された `npm ci --cache aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/.aidlc-engine/npm-cache` を実行した。package/lockのGit blobはそれぞれ `4b23a0a0e8feb4f666f0a7eb3109d68f1430b907` / `252ec5f1bc8cf264f319a058f610a8bf4b9497c1` のまま不変と親が確認した。新依存追加・audit fix/force/downgradeは行っていない。既存devlockの6件（High2/Moderate4）の脆弱性は未解消で、新moduleの追加依存とは分ける。

## Retry — Structural and Existing Checks

今回のRetryでは既存上限complexity10に対する6違反を実再現し、閾値/disable/期待値の変更なしで内部関数へ責務分割した。`comparisonComplete` の終端判定、`auditPayloads` の対象束縛、`collectAdmissionInput` の公開計画読取、`extendChangedArtifacts` のpath割当、`receiptMatches/checkpointChoice` のkind別処理を分けた。判断規則・理由・肯定値・予算は従来の単一正本を保持する。

- `npm run lint:structural`: 修正前6 error/exit1 → 修正後0 error/exit0。
- 対象4fileの32試験: Refactor前後とも32/32PASS。新しい挙動は追加せず、既存正負のassertを維持した。
- `npm run lint:guard`: exit0。
- `npx --no-install depcruise --config .dependency-cruiser.cjs scripts configs`: 35 module/74 dependency、違反0/exit0。
- `npx --no-install knip --production --config knip.jsonc`: 指摘0/exit0。
- `npx --no-install jscpd` にsource-manifestの実source9fileを明示し、既存のmin-lines10/min-tokens50/threshold0/exit-code1/fail-on-empty、console reporterで実行: 9fileを走査、clone0/exit0。未追跡の新sourceを既存Git inventoryから落とさず照合した。この9fileのscanを製品全treeのscanへ読み替えない。
- 承認済み5suiteのexact互換command: 226/226PASS、skip0、exit0。既存4suiteの217PASSにaudit-counterexamplesを含めた現在の実結果。
- `command -v gitleaks`: exit1でローカル実scannerなし。秘密関連回帰試験はPASS、生成source/記録の静的秘密pattern確認も実施するが、gitleaks scan/抑止reportは未実施。空reportを作って合格にはしない。

## Real PR Integration — Specific Remaining Decisions

### 1. Fixed request budget versus actual required blobs

公開予定の実集合をread-onlyで再計算した。設計掲載manifest101file、source-manifest20file、現在のsummary/traceability/source-manifest、および固定stage定義が要求する75pathの和集合は**133path**。原本bytesからGit blob OIDを再計算すると**133件全て異なるblob**で、欠損pathは0。同一reader内のimmutable blob再利用で減らせる重複はなかった。この見積はroot現在bytesによる公開候補の見積であり、未発行headの実取得成功ではない。

現E01はblobごと1 GETのため、blobだけで133requestを要し、固定100requestを超える。未作成の`pr-records.json`自身の取得、metadata/tree/pages、先行監査payload/履歴/CIの取得はさらに必要。現在の100request制限のままでは完全取得の実PR正例を構成できない。独立した評価へ分割して予算をresetする、先行cacheを観測へ昇格する、必須集合を縮める、先読み分を数えない等で回避しない。新budget・取得方式・transport・producerは実装していない。単なるworkflow変更許可ではこの不整合は解消しない。

匿名取得で充分とも主張しない。GitHubの[公式REST rate-limit仕様](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)は匿名取得をIP単位60request/hourとし、親も匿名応答headerのlimit60を観測した。資格情報を候補testへ渡して補わない。承認済みのread-only取得境界（固定caller側の既存gh api/許可REST route）→資格情報なし候補testへのraw応答/受信metadata供給は保持するが、それだけで製品readerの100request制約が満たされたことにはしない。必要な設計/計画の問いとして親へ返す。

### 2. Post-cutoff READY shortage

親が既存native履歴と公開readbackを照合したところ、`scope-definition`、`team-formation`、`approval-handoff`、`reverse-engineering`、`practices-discovery`、`delivery-planning`の6段はcutoff後の段承認で、native reviewer未指定かつ可読READYを確認できていない。これらを初期6段として一括legacy免除へ変換しない。READY/正式役の適用照合が成立するまでは実PR正例の不足として保持し、架空READY・承認日の改変・段の無断再開で埋めない。元の内部履歴本文は公開しない。

READY記録の不足と、正式なreviewer宣言/接続の不足を分ける。親がcompiled stage graphを直接読み、6段全てのreviewer=null・review_artifact=nullを確認した。標準見直し接続自体がない。親の既存engineコード読取では、stageにreviewer宣言がない場合はreview記録受付が拒否する。現在のU1核もslot.reviewerなしをREADY充足にしない。これはコード読取による条件確認であり、実際の拒否commandは未実行。したがって既存方法で見直しを後から呼ぶだけで解消すると断定しない。新役・設定・道具を無断追加せず、必要な設計/計画の修正要否として親へ返す。

### 3. Dedicated real-test placement and workflow delta

基準は公開main `7e775afd5b755e51e55e269d8dc35b09d180c33e`。親が実読取したci.ymlはpull_request/push main/workflow_dispatch、test job Node26/contents:read/checkout fetch-depth0/npm ci、`scripts/**` include-all・行80%のNode coverageとroot/u2 test globを実行する。hygiene Node22とpush/dispatch用measure jobも既存。root旧Node22版ci.yml全文を公開へ上書きしない。単位の行100%は別に満たし、既存CIの検査/分母を弱めない。

計画の`tests/ci-record-real-pr.test.mjs`をそのまま追加すると、既存ci.ymlとpackage.testのroot globへ入り、実PR入力がない通常実行をFAILにする。新workflowの追加だけでは解消しない。具体的な配置案は、同じU1-REAL01/02の2ケースを`tests/u1-real/ci-record-real-pr.test.mjs`へ置き、専用workflowからexact path/filterで実行すること。**これは現在計画/試験手順のpathと実commandを修正する未承認案**であり、現plan/UTinstructionsと新testfileはまだ変更していない。新runner/CLI/schemaを作る案ではない。

| file/設定 | 必要な具体差分案 | 現在 |
|---|---|---|
| code-generation-plan / unit-test-instructions | REAL試験の配置pathとexact commandを専用subdirへ対応。82件の分母/2ケースの要求は維持 | 承認済み原文を維持。正式な計画変更条件を親が扱う |
| tests/u1-real/ci-record-real-pr.test.mjs | REAL01は実現在PRの完全取得→核→実entry/CI結果、REAL02は同単位PRの実headにあるsynthetic不足/改変→実CI exit1。前提不足はFAIL | 未生成 |
| .github/workflows/ci-record-admission.yml | 既存受付ci/hygieneから別workflow。read-only取得jobとcredential-free候補実行jobだけを内部needsで接続し、実gate非PASSのjobを失敗させる。非空固定caller profile/actual target・head・run・byte参照を供給 | 未生成。workflow/資格情報分離に必要な公開Owner条件を先に扱う |
| 既存ci.yml/hygiene.yml/package.test | 上の配置なら通常glob・既存全試験・coverage設定を維持でき、変更不要 | 無変更 |
| branch protection / 必須status / pin | 現required test/hygiene / hygiene/sds-gate、strict=false、enforce_admins=trueを保持。新workflowのrequired化や固定版適用は別の具体権限条件 | 無変更 |

候補testへtokenを渡さず、checkout残留資格情報も避ける。PRのscript/test/buildはread-only取得jobで実行しない。取得jobは公開の許可routeを固定argvで読み、raw API応答/受信metadataのうち公開可能なデータだけを別jobへ渡す。候補側は現在の注入可能reader/既存gateを使い、データ不足/target違い/不完全取得をFAILとする。読取の実request数/受信量/時間を隠さず、前項の100対133不整合が解決されるまでこの供給案を実行可能と宣言しない。

REAL02では実gate/CIのexit1自体を証拠にし、検証test runnerのassert成功と区別する。予定2件は実対象を用意して各exact commandを実行する。skip/空登録/成功へ変えるshell処理は使わない。先行設計だけheadの監査は同PR祖先として保持し、設計差分失効も検査する。新headの実装監査・作者受領・別担当統合は別条件。候補検証を、監査統合済み固定版tools/pin/callerの適用成功へ昇格しない。

### 4. SEC-T applicability still unresolved

Shirube U1自身の安全性8試験はPASS。Shirubeへの適用が確定したSEC-T正本版/項目IDとの対応は未成立。未採択の統一案を採択済み規格にせず、別製品の試験カタログや私的本文を転載しない。他所の過去案の状態だけから以後の採択不存在も断定しない。必要な適用根拠を親が確認し、対応と実結果が揃うまで正式SEC-Tの成功とはしない。

## Actual Coverage Denominator

Node組込みV8 provider、承認済みexact commandで、実import閉包14fileと出力14fileを照合した。新規7fileと変更2fileだけに分母を縮めず、到達する既存5fileも含めた。未load source、除外pragma、閾値低下、代替providerは使っていない。Shirube製品全体の100%とは主張しない。

```sh
node --test --experimental-test-coverage --test-coverage-lines=100 --test-coverage-include='scripts/sds/ci-record-*.mjs' --test-coverage-include='scripts/sds/gate.mjs' --test-coverage-include='scripts/hygiene/audit-admission.mjs' --test-coverage-include='scripts/hygiene/lib.mjs' --test-coverage-include='scripts/sds/yaml.mjs' --test-coverage-include='scripts/sds/plan-binding.mjs' --test-coverage-include='scripts/sds/design-gate.mjs' --test-coverage-include='scripts/sds/stage.mjs' tests/ci-record-policy.test.mjs tests/ci-record-input.test.mjs tests/ci-record-projection.test.mjs tests/ci-record-evidence.test.mjs tests/ci-record-design-audit.test.mjs tests/ci-record-admission.test.mjs tests/ci-record-envelope.test.mjs tests/ci-record-entry.test.mjs tests/ci-record-integration.test.mjs tests/ci-record-security.test.mjs tests/sds-gate.test.mjs tests/sds-gate-binding.test.mjs tests/design-gate.test.mjs tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs tests/guards.test.mjs tests/lines-baseline.test.mjs tests/pr-size.test.mjs tests/secret-suppressions.test.mjs
```

修正後の最終実測: **1,625/1,625行 = 100.00%**、未実行行0。branch 1,113/1,168 = 95.29%、function 422/424 = 99.53%。追加のinline machine reporterでも同一対象/閾値/Node providerの行数と323PASS/0FAILを確認した。coverage床は行に適用し、branch/functionを100%と偽らない。command全体のexitは0。

| 実source | covered/total lines | line coverage |
|---|---:|---:|
| `scripts/hygiene/audit-admission.mjs` | 183/183 | 100.00% |
| `scripts/hygiene/lib.mjs` | 185/185 | 100.00% |
| `scripts/sds/ci-record-admission.mjs` | 123/123 | 100.00% |
| `scripts/sds/ci-record-design-audit.mjs` | 105/105 | 100.00% |
| `scripts/sds/ci-record-envelope.mjs` | 72/72 | 100.00% |
| `scripts/sds/ci-record-evidence.mjs` | 228/228 | 100.00% |
| `scripts/sds/ci-record-input.mjs` | 133/133 | 100.00% |
| `scripts/sds/ci-record-policy.mjs` | 105/105 | 100.00% |
| `scripts/sds/ci-record-projection.mjs` | 58/58 | 100.00% |
| `scripts/sds/design-gate.mjs` | 63/63 | 100.00% |
| `scripts/sds/gate.mjs` | 183/183 | 100.00% |
| `scripts/sds/plan-binding.mjs` | 152/152 | 100.00% |
| `scripts/sds/stage.mjs` | 27/27 | 100.00% |
| `scripts/sds/yaml.mjs` | 8/8 | 100.00% |

## Traceability and Pending Work

[traceability.json](traceability.json) は割当AC30、詳細NFR19、BR25の74 IDを一度ずつ列挙し、60 OK・4 N/A・10 GAPを区別した。OKは現在存在する実装/試験pathを指し、単位全体の完了を意味しない。元の4 N/Aと後続担当境界は保持した。Ownerが省略を指示していない未完項目をDeferredへ変えていない。

- 実PR/CI 2シナリオは実fixture/公開投影/信頼caller/結果対応が必要。前提欠落は明示FAILとする既存root test globとの結線を、非循環の別workflowと合わせて確定する必要がある。空登録/skip/架空READYで通さない。
- 実workflow/mandatory/protection/資格情報変更の必要Owner条件は未成立。既存必須検査を削除せず、監査受付のci.yml成功と新U1評価を分離する。
- 既存開発道具の準備と7FAIL解消は確認済み。構造/guard/依存方向/未使用コード検査は今回exit0。gitleaks実scannerはローカル未導入で実行しておらず、秘密関連回帰・静的pattern確認だけで全scanner成功とはしない。clean公開候補の再現性も未検証。
- 採択済みSEC-T正本の版と適用項目IDが、現在確認した許可済み入力から同定できていない。正式照合の不足を安全性8PASSで消さない。
- 新実装headの公開、CI/行100%、独立実装監査、作者受領、R3の必要exact-head判断、別suite-lead統合は未実施。
- U1→U4指定順のruntime反映未成立は既存残件。偽辺/rename/state/cache/jump/newtoolで回避しない。U4 sensor、U2対話、U3正規操作、U5導入、U6追加、U7 AUN全体受入を代行しない。
- 既存READY不足は残件として維持する。FD Minor R-01のE05説明誤記は未解消で、正規契約E05=U2/U6→LLM対話を用いる。

## Re-run on the PR Branch

PR #101 branch（merge `e9d2867` + 実装 `ae2b357`）で、依存を `npm ci --ignore-scripts` で入れた作業木から実行した。Node v24 のローカル実行で、CI（Node 22/26）の結果ではない。

- `npm test`: 841 PASS / 0 FAIL。
- `npm run hygiene:lines` / jscpd / budget / coverage、`npm run lint:structural` / `lint:guard`: いずれも exit 0。
- CI と同じ coverage command（`--test-coverage-include-all` は local Node が未対応のため除く）: exit 0、全体 99.78% 行。新 module の行は 100%。
- entry 試験は実 CLI が壁時計を読むため、合成 request の `expires_at` を遠い将来に固定した（S4。試験が日付に依存しない）。
- 実 PR/CI の観測（CI 結果・独立実装監査・作者受領・Owner の exact-head・別担当の統合）は、この push の後に別に記録する。ここに書いた local 実行を CI 結果と読み替えない。

## Source Bytes at This Observation

以下は公開main `e1c2aea0` を取り込んだPR #101 branchの実装/試験20 fileのbytes（実装commit `ae2b357`）。root未commit版とは gate.mjs と entry試験の2 fileが異なる。凍結設計/承認plan/UTinstructionsをこの一覧で上書きしない。

| workspace-relative file | bytes | SHA-256 |
|---|---:|---|
| `scripts/sds/ci-record-policy.mjs` | 11851 | `ed7181132d27de37fe4eac6b931729582c8d5c2742d29de0fec26e6edb00f1fa` |
| `scripts/sds/ci-record-input.mjs` | 7051 | `ce51e98024386a19c569b9637d78f63e2631fd2853b9a089bfacc1ba2d6f57c2` |
| `scripts/sds/ci-record-projection.mjs` | 3668 | `7cf00ccd88b242d810a4c45cedc94166491f48add7bf636585cf01caba570264` |
| `scripts/sds/ci-record-evidence.mjs` | 19747 | `a0e9e2a7dd6f3caf3d22358a86d1a452b6088bc62b2a6243370f029d6b2dd673` |
| `scripts/sds/ci-record-design-audit.mjs` | 7373 | `c4ff684fb7dced8435d8eb898db509c9405558b6e7dcd05e4257bc93fdf5f7c9` |
| `scripts/sds/ci-record-admission.mjs` | 9715 | `ef47910856d77f9670e41fa6db7873dcb66808b2f6e9c614396a0fcd7464160b` |
| `scripts/sds/ci-record-envelope.mjs` | 6124 | `6723f45b167f16a3eeb51887e511fce1737950b92cabf3854bb8116437177f11` |
| `scripts/sds/gate.mjs` | 17481 | `d089b09378c9ad8fe2797356e366e065c0a84a91010dcdea2945850054449390` |
| `scripts/hygiene/audit-admission.mjs` | 12385 | `b348db71aa849cbdbc63864b033a12cc2f8acc4ebf5a62d56d0be2b398065931` |
| `tests/ci-record-policy.test.mjs` | 4990 | `11eeeb9baf9a5b0a84a3b622d2f9246d6d092f13c57427d8f2ae1a3fcdbca49f` |
| `tests/ci-record-input.test.mjs` | 4399 | `600f8d03cfa8f8ffc6ea685a3c51d9dcde54686ffa3609a884ea4eaf00f00c8b` |
| `tests/ci-record-projection.test.mjs` | 4114 | `ca0ae3f8fd8309687db3cba941f19b315aadeccff4a9b571d82bf83fe07bfbb0` |
| `tests/ci-record-evidence.test.mjs` | 7014 | `63707c95ac5ba6479a56e81a398972ac5cc7e595f099d9a92431f351482bf6f4` |
| `tests/ci-record-design-audit.test.mjs` | 8452 | `1a1f5e46f08f2bed2c00fe5e5ee4750959a53db5af2f4d174bd23e64d2ffb744` |
| `tests/ci-record-admission.test.mjs` | 6256 | `9dee707fdf056860f2846cbb64e19a9dc237856201cba1bcc7c3734e6666111a` |
| `tests/ci-record-envelope.test.mjs` | 4424 | `327607f2ecb942e8bc4af850c13ef9ceb82373a2761d32941712e2bae2f51274` |
| `tests/ci-record-entry.test.mjs` | 8916 | `ae3fb589fc0daa35ffac73b814002d7cd7c76d846169406fed34971c7038e907` |
| `tests/ci-record-integration.test.mjs` | 7519 | `609ab5d49d03bd2fb94bc47308e34b699dd16f4b4e02cd8129fa30c03b252da5` |
| `tests/ci-record-security.test.mjs` | 4469 | `c1a2605ddcd11b2d057e942f4d92962fefc3f071829921d6777c4924b827b011` |
| `tests/ci-record-fixtures.mjs` | 16134 | `5c04ae3b07200b855293d85cca14f5c184989e3a138495075e7254dba8c5a84b` |

