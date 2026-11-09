## Summary

- Builds: U1 の実PR読取から四条件の照合・完全結果・CI停止までを、既存 entry に接続する。
- Touches: 製品7新規moduleと既存2file、試験11fileと架空helper1file、公開掲載JSON1file。別workflow1fileは必要なOwner権限成立後に扱う。
- Tests: 単体64・境界統合8・安全性8・実PR/CI統合2の計82シナリオ以上。TDD、FD-T01〜20、適用実行コードの行網羅率100%を確認する。

# U1 — Code Generation Plan

## Scope and Preconditions

対象は `261105-shirube-lifecycle-qualit / u1-ci-record-admission`。Code Generation Steps 1/2 の計画であり、製品実装・試験・CI・配布の実施記録ではない。以下の実装Stepはすべて未実施。

製品コード・試験fileを書く前に、(1) native Plan Approval、(2) **同じ単位PRの設計だけのheadに対するdevauditor独立設計監査PASS**とその対応、(3) 対象差分に必要な公開Owner権限を確認する。現時点では(1)(2)は未成立。設計のnative READYや本計画の生成で代用しない。実workflow・必須検査・branch protection・資格情報等の変更は、対象差分の必要条件が成立するまで実施しない。計画だけでU1完了にはしない。

根拠は凍結済みの [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[entities](../functional-design/entities.md) と各traceability、NFR Requirementsの6文書/traceability、NFR Designの6文書/traceability、Infrastructure Designの3文書/traceability。上流は [requirements](../../../inception/requirements-analysis/requirements.md)、[stories](../../../inception/user-stories/stories.md)、[components](../../../inception/domain-design/components.md)、[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)、[bolt-plan](../../../inception/delivery-planning/bolt-plan.md)。旧3条件/真正性必須の表現は後の契約変更表を適用する。

4条件は `records / ready / digests / designAudit`。U4の2センサー結果、既存判定1〜3、現headの独立実装監査・作者受領・統合条件を第5条件として混ぜない。CIだけではengine発行元・Owner本人・実review実施・実CodeGen開始時刻・完全な私的履歴を証明しない。既存の独立監査による記録読取、必要公開判断、作者受領、別suite-lead統合を保持する。

適用ルールは active-space のorg/team/project/construction。TDD、Node組込み、ESM、実行時npm依存なし、SEC-T、最小権限、公開synthetic、S1〜S9を保持する。DB/table/migration、HTTP endpoint、UI、native操作、配布効果は非適用で、新しい層を作らない。公開決定の権限参照は [team.md](../../../../../memory/team.md) のP1/P3/P4/P5等の完全な `control_source_ref.url/sha256` を用い、計画を個別変更許可にしない。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: 既存 `memory/team.md` で Q3 の採択として記録された TDD を維持する。`pr34-u2-red.json` / `pr34-u2-green.json` は当時の方法を示す根拠であり、新しい変更の試験合格を示す証拠にはしない（P7 の規格維持、既存 team）。\n- **Ordering**: 各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。\n- 試験の道具は Node 組込みの `node:test` と `assert`。判定には正例・負例を用意し、対象違い、古い記録、欠落、改変、実行不能、再実行、人待ちの停止などを、適用される要件に対応付ける。\n- 行の網羅率の床は100%。統合前の CI と Build and Test で確認し、通すために弱めない。計測から除外する行が必要なら PR に理由を書き独立監査で確認する。対象集合・分母と実行コマンドは各取り組みで特定し、部分集合だけで製品全体を測れたとしない（P4）。\n- 適用される SEC-T、依存導入前の脆弱性確認、秘密情報保護、最小権限を維持する（P1・P2・P7）。公開 repo の fixture・ログ・出力は架空データだけにする。\n- 必須工程や適用条件を満たす検証について、skip、timeout、観測不能や単なる exit0 を合格に数えない。任意工程と正式に適用外となった工程はその理由と適用条件を明示し、必須工程の未実行と混同しない。設定値や試験ファイルの存在を実測結果の代わりにしない。"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:2126651ac2ee6f2053acb5e1af6ad765a46703a59c53ac46ff3f22b97cb2dcce",
  "contract_sha256": "sha256:62c789ef343028f519fab91d9b5f12e16036301fd061fbaa7bb6ad62d0fc6d06"
}
```

## Contract Application

上のTesting Contractは `aidlc engine testing-posture render` の完全な出力を未変更で貼付した。scope floorの80%を編集せず、同契約のteam notesと採択済みNFR1.1が加算する**実分母100%**を満たす。閾値・分母・除外を緩めない。正確な未実行コマンド、runner準備、シナリオは [unit-test-instructions.md](unit-test-instructions.md) に定める。

適用testable layerは、JSON/value model、GitHub読取data access、四条件business logic、既存CLI adapter。各層でRed→Green→Refactorを完結して次へ進む。repositoryはDBを意味せずE01読取境界。HTTP server/API route・frontend・DB behaviorは非適用。test-runner readinessを最初のRedより前に置く。新runtime/dev依存や新runner/configを導入しない。NodeのCLI引数が試験設定となる。

## Change Surface and Compatibility

基準はroot HEAD `62ff73db52ce8f29f3b982507b5d2e36578ae60f`。別観測main `7e775afd5b755e51e55e269d8dc35b09d180c33e` のengine-judge等を合算・コピーして完成扱いにしない。rootの既存modified .gitignore、framework/AGENTS/他unit、lockfileは本実装の編集対象にしない。

| 予定file | 変更/責任と主な依存・影響 |
|---|---|
| `scripts/sds/ci-record-policy.mjs` | 新規。FD規則に対応する固定policy・理由code・承認値・READY/予算・stage出力定義・caller profileの単一実行正本。核/adapterはここを参照 |
| `scripts/sds/ci-record-input.mjs` | 新規。重複keyを上書き前に検出する限定JSON読取、既存/1のshapeとpath/ref境界。projection/envelope/evidenceで共有。新汎用parser frameworkは作らない |
| `scripts/sds/ci-record-projection.mjs` | 新規。許可されたnative形式の掲載前allowlist変換と公開view検査。private原本のCI供給なし |
| `scripts/sds/ci-record-evidence.mjs` | 新規。Node組込みfetch/cryptoを用いるE01読取、全page/tree/blob/履歴/公開comment、raw hash/予算/完全性/前後head照合。transport/時計は注入可能 |
| `scripts/sds/ci-record-design-audit.mjs` | 新規。historical design-only snapshot/ancestor/設計変更履歴を結ぶ。公開監査payloadの意味検査は既存audit-admissionの共有関数を使う |
| `scripts/sds/ci-record-admission.mjs` | 新規。ConformanceGateの単一純粋核。now/ID/固定policy/required set/観測を受け四条件・理由・残件を返す |
| `scripts/sds/ci-record-envelope.mjs` | 新規。完全inline結果のencode/decode、元評価との一致、同梱観測参照を共有検査。新たな判定規則なし |
| `scripts/sds/gate.mjs` | 限定変更。既存CLIへの明示U1用途分岐と外側orchestration。既存 `gate(args, api, now, verify, parse)` と `failure(error,args)` のdefault callback/JSON/exit互換を保持 |
| `scripts/hygiene/audit-admission.mjs` | 限定変更。既存request/review/item検査を小さな共有exportへ整理し、現head受付は同じ検査を呼ぶ。現行targetCheck/workflowCheck/verifyAudit/CLI契約の意味を維持 |
| `tests/ci-record-{policy,input,projection,evidence,design-audit,admission,envelope,entry}.test.mjs` | 新規8file。各8単体シナリオ。8module責任境界を検証し、parameter表で境界値を追加 |
| `tests/ci-record-integration.test.mjs`、`tests/ci-record-security.test.mjs`、`tests/ci-record-real-pr.test.mjs` | 新規3file。統合8、安全性8、実PR/CI2。real用の前提欠落は明示失敗で、skip成功にしない |
| `tests/ci-record-fixtures.mjs` | 新規helper1file。schema適合済み架空builder/応答/明示時計。試験ごと独立。製品の判断を複製しない |
| `<unit>/code-generation/pr-records.json` | 後の公開掲載用1file。既存 `shirube-pr-records/1`。private原本/人返信なし。今は作らない |
| `.github/workflows/ci-record-admission.yml` | 後の別workflow案1file。Ownerの対象差分権限成立後に限る。既存ci/hygiene/sds-gateを弱めない |

共有変更はgate→既存consumer/判定1〜3とaudit-admission→既存監査受付へ影響するため、blast radiusはこの2箇所で高い。新module自体はU1内に閉じる。既存回帰試験の具体pathを試験手順で列挙し、共有部品の実分母も落とさない。300行source/関数50行/複雑さ10・依存方向・秘密検査を維持する。新規moduleの責務分割は凍結済み契約に基づき、汎用抽象を先行しない。

schemaは `shirube-contracts/1`、`shirube-admission-context/1`、`shirube-pr-records/1` の既存majorと必須fieldを維持する。Targetのintent段unit=null、StageRecord、Approval、Review、ArtifactEntry、KnownRemaining、ObservedSnapshot、ConformanceAssessment、AdmissionEnvelopeをFD entitiesから実装する。診断のためにhead/base/Sha256をnullableへ変えない。既存sds-* schemaは変更しない。意味変更が必要なら計画に無断で加えず、新旧同居・試験した逆向き・必要判断を先に扱う。

## Caller Profile and Exact Entry

以下の識別子は**新規CLI識別子**であり、AI-DLCの段/承認/進行状態を追加しない。

- `--purpose ci-record-admission`: 既存gate entryでU1の四条件だけを評価する呼出用途。
- `--checkpoint code-generation-submission`: 既存Code Generationの成果PR提出時点に対応するAdmissionContext.policyObservation.checkpoint。現在提出物・実施済みplan/summary・先行完了承認を対象にし、未来の段承認を要求しない。

固定callerからの予定argvは次のとおり。変数は対象PR作成後に実観測/正式対象から設定し、番号/head/attemptの架空値を実証へ使わない。このargvは現entryでは未対応であり、今は実行しない。

```sh
node .shirube-tools/scripts/sds/gate.mjs --repo watchout/shirube --pr "$U1_PR" --head "$U1_HEAD" --purpose ci-record-admission --checkpoint code-generation-submission --workspace shirube --space default --intent 261105-shirube-lifecycle-qualit --unit u1-ci-record-admission --attempt "$U1_ATTEMPT" --now "$U1_NOW" --assessment-id "$U1_ASSESSMENT_ID"
```

callerはcallee repo/commitと `.shirube-tools` の実Gitを照合し、用途/checkpointをliteralで固定する。profileはtoolsに同梱するci-record-policyの閉じたenum表からだけ解決し、任意 `--profile` path・PR JSON内のpolicy/checkpoint/required/exclude/severityを制御入力として受理しない。new purpose/checkpointは双方セット必須。未知値/重複引数/不正targetは外部取得前に診断/exit1で拒否し、defaultや条件免除へfallthroughしない。purpose省略の従来argvは既存defaultのまま。

required setは、固定版に束縛したstage/出力一覧と単位種別の定義、公開される有効計画（aidlc-stateのScope Configuration、unit-of-work、bolt-plan）の参照/版、callerの現在checkpointを照合して別入力で作る。stateの古い全体Stage Progressを現在単位の進行の代用にしない。計画の適用段/明示適用外は固定契約へ照合し、過去baseline/同PRの監査済みdesignHeadにある計画との無断削減を検出する。初回でbaseに計画がない場合も非空の固定契約から導出し、同PR設計監査とのbindingを確認する。未知/矛盾はUNKNOWN、確定集合の欠落はFAIL。private runtime-graph/engine/raw auditをCI取得源にしない。

信頼版stage出力定義は実装時に読んだ版と実bytesのdigestを記録して同梱する。CIがPRの `.codex` からcheckerを実行したり、新しいcompiler/exporterを起動したりしない。適用Inceptionと現在単位設計/計画/試験/traceabilityを含む非空集合、stage固定subset、required kind/attempt、公開記録自身等の固定自己参照除外を導出する。過去6段/5不足へhardcodeしない。後に完了承認した段は次の評価checkpointで加算する。新しいcheckpointを未来段のskip用途で自由選択させない。

U1用途は旧 `planBinding` / `judgment5` を呼ばず、現headの実装監査を開始条件として先取りもしない。既存判定1〜3は従来の結果/役割で別に確認する。U1用途のJSONはE03/完全envelope、default用途は従来sds-gate結果を維持し、片方のPASSを他方のPASSへ変換しない。

## Sequential Implementation Steps

### Step 1 — 前提・配置・runner readiness

- [ ] native Plan Approval、同PR設計だけheadの独立設計監査PASS、必要Owner権限を確認し、未成立なら製品fileを作らず停止する。
- [ ] root基準と実作業branch/head、対象差分、既存consumer/監査受付の影響、source/import集合を確認する。他者変更を戻さない。
- [ ] Node実版/lockfile/既存開発道具の適合を観測し、試験手順の既存file＋完全名filterによるrunner確認を実行する。最初のRedより前にNode組込みtest/assertとunit-scoped commandが動くことを確認する。
- [ ] 既存CIのbaselineを正規段/既存必須検査として確認し、新しい失敗と区別する。今の計画作成ではbaseline製品試験を実行しない。

対応: 全6US、NFR1.1/8.1/10.1。runnerの準備失敗はTDDのRed実証に数えない。

### Step 2 — value model / 固定policy / 入力境界のRed→Green→Refactor

- [ ] Red: policy/inputの各8シナリオを先に作り、未実装の契約をassertする失敗出力を残す。
- [ ] Green: policy/inputを最小実装する。escape解釈後のobject内重複keyを上書き前に拒否。部分/過大JSON、未知major/critical、型/enum、危険path/refを検査する。
- [ ] Refactor: shape検査と定数の重複を集約し、同義入力/決定性と既存回帰をgreenに保つ。

対応: BR1.1〜1.4/6.1〜6.2、FD-T02/07/08/11/15/17/18、US2.2/4.1/4.3、NFR3.1/3.2/5.1/8.2。pathのUTF-8 bytes/Unicode/改行を正規化しない。absolute/空segment/dot/dotdot/backslash/NUL/symlink/submoduleは拒否する。

### Step 3 — 掲載前変換 / 公開viewのRed→Green→Refactor

- [ ] Red: projection8シナリオ。nativeを模す架空入力と公開view入力を分離する。
- [ ] Green: FD W03対応表を実装し、plan=Approve Plan、summary=Looks correct、stage-completion=Approveまたは正式提示が確認できるAccept as-isだけをkind別に採用する。
- [ ] Refactor: allowlist/参照対応を整理し、否定・空/空白・未知・他kind・一般QUESTION_ANSWERED・plan off/skipped・自動GATE_APPROVED・Autonomous:true・STAGE_COMPLETED単独が人承認へ化けないことを維持する。

対応: BR2.1〜2.3/6.1〜6.2、FD-T09〜11/17、US4.3/4.1、NFR2.2/3.1/8.2。私的原本の公開/CI取得、新しい記録producerは作らない。公開refは論理参照のみ。

### Step 4 — E01 data access / digestのRed→Green→Refactor

- [ ] Red: evidence8シナリオを、注入transport/明示時計/受信chunkで作る。
- [ ] Green: 固定headの全filesページ/tree/blob/必要公開原文/commit履歴と、取得前後head/baseを同一予算で取得する。1取得20000ms・総120000ms・100取得・1応答8000000bytes・自動retry0はpolicy参照のみ。
- [ ] Refactor: ページ終端・PR changed_files等・tree完全性・必要path照合を集約し、欠ページ/拒否/404だけ/timeout/cancel/応答上限/最終照合不能で後続取得0を保つ。

対応: BR4.1〜4.2/8.1〜8.2、FD-T04/17/18、US2.2/4.3、NFR2.1/3.2/4.1/4.2/6.1/6.2。maxRequestsはartifact上限ではない。必要集合を縮めない。raw blob bytesのbyte数/SHA-256を計算し、UTF-8 byte順pathの `JSON.stringify([path,bytes,sha256])+LF` 連結hashを全集合/固定stage subsetへ別に作る。宣言hash/cache/native fingerprintを写さない。

### Step 5 — historical design auditのRed→Green→Refactor

- [ ] Red: design-audit8シナリオと既存audit-admission回帰を先に実行する。
- [ ] Green: 4分類の根拠path/実差分、同repo/PR/unit、実在designHeadとbase/祖先、設計だけsnapshotを検査する。公開request/review本文bytesのhash/request_digest/指定投稿者watchout・devauditor(iyasaka-ai)/必須全PASS/blockingなし/参照順を共有検査へ接続する。
- [ ] Refactor: audit-admission内のpayload/request/review/item意味検査を再利用exportへ整理する。現headのtargetCheckを歴史headへ見せかけて呼ばず、歴史照合は明示scopeで行う。従来受付CLIと全workflow success/merge checkout証明の回帰を維持する。

対応: BR5.1〜5.3/9.1、FD-T05/16/19、US4.2/2.1、NFR4.1/8.1/10.2。designHead以後の設計/契約変更は、差戻し後も失効。取得不完全はUNKNOWN。READY_FOR_REVIEW/URL存在/名前/commit日時だけで先行監査PASSにしない。4分類すべて根拠付き非該当の時だけdesignAuditをNOT_APPLICABLEとする。

### Step 6 — 四条件business logicのRed→Green→Refactor

- [ ] Red: admission8シナリオにFD正例/四負例/日付/集合/集約のparameter表を置く。
- [ ] Green: records/ready/digests/designAuditを一つの核で評価する。FAIL優先、FAILなしUNKNOWNありはUNKNOWN、それ以外PASS。records/ready/digestsのNOT_APPLICABLEを認めない。
- [ ] Refactor: 理由/対象/適用規則を一元化し、same input・同義adapterで同じ結果、実bytesのみの変更で不一致となることを保つ。

対応: BR1.1〜1.4/3.1〜3.4/4.1〜4.2/7.1/8.2/9.1〜9.2、FD-T01〜05/12〜15/18、US2.1/2.2/3.2/4.1/4.3、NFR1.2/2.3/5.1/9.2。

READYはAsia/Tokyoの2026-11-06（含む）、UTC 2026-11-05T15:00:00Zから。stage-completionの厳密date/offset timestampとapprovalRecordRefを照合する。plan/summary/掲載日を代用しない。不明/矛盾はUNKNOWN。legacy不足は全field/revisitOnReopenをknownRemainingへ残す。READY必要集合0件でも全承認日確認と非空stage/artifactは必要。原承認・再承認・再開attemptを分け、新しい必要READYへ古い日を継承しない。gate:false summaryを完了承認にしない。

### Step 7 — 完全envelopeのRed→Green→Refactor

- [ ] Red: envelope8シナリオで元評価との比較、参照の削除/改変/重複/別scopeを試す。
- [ ] Green: head/outcome/reasons/authorizationと完全assessment/evaluationScope/observationsをinlineで出す。全observationRefsは同梱observationIdへ同対象/版/scopeで一意に解決する。
- [ ] Refactor: encode/decode共通検査を整理し、非保証固定値・knownRemaining・元scopeの欠落/空化を拒否する。

対応: BR7.2〜7.3/9.1〜9.2、FD-T01/06〜08/20、US2.2/3.2、NFR2.3/5.2/9.1/9.2。source Shirube評価をAUN targetへ書き換えない。C01/C03供給とC05/C07の同じ形の境界試験までで、後続実配布/受入は行わない。

### Step 8 — 既存CLI adapterのRed→Green→Refactor

- [ ] Red: entry8シナリオと現defaultの回帰を先に作る/実行する。用途なし互換、未知用途/checkpoint/任意profile拒否、旧4/5の非呼出し、JSON/exitをassertする。
- [ ] Green: 上記argvを既存gate mainへ接続し、外側で時計/ID/transportを解決する。核はI/O・時計・乱数・UUID・process exit・tokenを取得しない。
- [ ] Refactor: U1結果/既存判定1〜3/現head監査等の意味を分離したまま、default callbackと失敗契約を保つ。

対応: BR7.1/8.1〜8.2/9.1〜9.2、FD-T01〜05/17/19/20、US2.1/2.2/3.2、NFR4.1/6.2/9.1/10.1/10.2。head/base/blob不足、構造不正では既存failureの診断/exit1だけを返し、有効assessment/envelopeを作らない。非保証と確認済み残件を保持し、残件未判定は未評価と説明する。架空/空集合/宣言hash・nullable化・knownRemaining空配列合成は禁止。必須実fieldが揃い一部条件のみ不能の完全UNKNOWNとは区別する。

### Step 9 — 境界統合 / 安全性のRed→Green→Refactor

- [ ] Red: integration8/security8のシナリオを先に作り、核単体では見えない輸送・reader・entry伝播を拒否できる失敗を記録する。
- [ ] Green: 同じschema適合架空入力を実module間/entryへ通し、四負例の門exit1とrunner exit0を別々にassertする。悪意文字列/secret marker/path/URL/権限拒否/部分出力を検査する。
- [ ] Refactor: transportと形式変換だけの重複を整理する。秘密echo/対象外I/O/自動retry/人待ち後の効果・成果物・後継記録は0。

対応: FD-T01〜20、全25BR、NFR1.2/2.1〜2.3/3.1〜3.2/4.1〜4.2/5.1〜5.2/6.1〜6.2/9.1〜9.2/10.2、全6USの自単位部分。適用SEC-Tの正本版/項目IDを実行前に同定して試験へ対応付け、未同定を合格にしない。U1独自の社内規格IDを発明しない。

### Step 10 — coverage / 実環境 / 既存回帰

- [ ] unit-test-instructionsの適用source一覧と実import closureを再確認し、Node組込みcoverageで未load file/分母0/欠落がないことと行網羅率100%を実測する。
- [ ] 既存gate/audit/library依存の回帰を必要な正確なpathで実行する。既存構造・依存・秘密検査を通す。閾値/分母/ignoreで通さない。新依存が必要となれば導入前脆弱性確認と計画変更を先に扱う。
- [ ] Node実patch・npm・Git・必要transport・lockfile/toolの版とclean checkoutでの再現性を記録する。新しい環境全域の保証へ拡張しない。

対応: NFR1.1/1.2/8.1/8.2/10.1、AC3.2.3のU1寄与。除外提案が必要なら項目/理由/独立確認と実providerでの作用確認を要する。本計画にはcoverage除外pragmaを予定しない。

### Step 11 — 実PR取得→核→実CI停止の統合

- [ ] real-pr試験2シナリオ（実取得した現在PRの評価と、同じ取得対象に結ぶ負例/不能停止）を作り、前提不足はskip/PASSへ変えない。実対象番号/head/base/版/完全性/実digest/理由/exit/CI runを対応付ける。
- [ ] 候補コードは資格情報なしの試験jobで評価し、read-only readerが別境界で取得した公開実PRデータだけを注入する。導入前は固定caller側の既存gh apiを許可したREST route/固定argvで使ってraw応答を採取し、新しい候補evidence moduleへは資格情報なしで応答/受信metadataを渡す。候補のreader moduleを資格情報付きで実行して自身を信頼版と呼ばない。reader jobで候補script/test/buildを実行せず、候補をtrusted toolsへ自動昇格しない。
- [ ] 必要Owner権限成立後、U1 workflowを既存受付workflowから分離して結線し、job不合格が実際に停止へ伝わることを確認する。ci.yml/hygiene.ymlとの相互needs、設計モードPASS、mandatory削除/checks空は作らない。

対応: FD-T01〜05/17/19/20、US2.1/2.2/3.2/4.2/4.3、NFR1.2/2.1/8.1/10.2。現時点でroot pinなし/base固定版にU1なし、live check名/branch protection未観測。既存受付は指定checkと対応t.workflow全体successを必要とし、repo全workflow成功へ拡大しない。保護設定が未成立U1をrequiredにしている等なら既存権限経路で停止し、条件を弱めない。

現PRに必要READYが不足すれば実評価は正しくFAILとなる。四条件PASSの実PR正例は、実際に条件が揃う承認済み対象でのみ示す。架空READY・過去承認日改変で作らず、成立しない場合はU1受入の未達として残す。候補の実PR/CI確認と監査統合済み固定版の適用成功は別であり、pin/caller配布はU5等の担当境界を維持する。

### Step 12 — 文書・追跡・同PRの完了条件

- [ ] 実装後にだけcode-summary/traceability/source-manifestを正規Step 5で生成し、実source/試験/FD-T/BR/NFR/AC/コマンド/実結果を結ぶ。planのcheckboxは実施したStepだけチェックする。engine専用questions/diary/stateを直接編集しない。
- [ ] 公開pr-records.jsonを既存権限下のallowlist変換で作り、初回Inceptionと自単位必要記録を同PRへ含める。private audit/.aidlc-engine/他repo記録/人返信を含めない。掲載file自身/監査comment/CI結果は固定自己参照除外だけを使い、別の構造/対象/充足検査は残す。
- [ ] 実装headの新CI/独立実装監査/作者受領/必要公開Owner判断・R3/R4 exact-head/別suite-lead統合をそれぞれ確認する。U1 PASSや設計監査で代用しない。適用Build and Test/CI Pipeline/Operationは正式案内どおり続く。
- [ ] U1が済む境目で指定順U1→U4→U2→U3→U5→U7→U6の正式runtime反映を親が確認し、不成立ならU4前にOwnerへ差を返す。7依存辺・名前・state/cache/jump/new toolで回避しない。

対応: BR9.1〜9.2、全6US、NFR8.1/9.1/10.2。U2対話/U3操作/U4実センサー/U5初回・導入/U7AUN実受入/U6新要求の実追加は本単位で完了にしない。

## Rule and Test Traceability

| 全25BR | 実装Step | 主な試験file（tests/ci-record-接頭辞）/ FD-T |
|---|---|---|
| BR1.1〜BR1.4 | 2/6/8 | policy,input,admission,entry / 02,07,08,11,15,17,20 |
| BR2.1〜BR2.3 | 3/6 | projection,admission / 09,10,11,15 |
| BR3.1〜BR3.4 | 6/7 | admission,envelope / 03,09,10,11,12,13,14,15,20 |
| BR4.1〜BR4.2 | 4/6 | evidence,admission / 02,04,15,16,17,18 |
| BR5.1〜BR5.3 | 5/8/11 | design-audit,entry,integration,real-pr / 05,16,19 |
| BR6.1〜BR6.2 | 2/3/9 | input,projection,security / 09,11,17 |
| BR7.1〜BR7.3 | 6/7/8 | admission,envelope,entry / 01〜08,19,20 |
| BR8.1〜BR8.2 | 4/6/8/9 | evidence,admission,entry,security / 17,18,19 |
| BR9.1〜BR9.2 | 6/7/8/11/12 | admission,envelope,entry,integration,real-pr / 01,15,19,20 |

## Detailed NFR Traceability

| 全19詳細NFR | Stepと試験 |
|---|---|
| NFR1.1 | 1/10、全unit-scoped試験とcoverage実分母 |
| NFR1.2 | 2〜11、FD-T01〜20/実PR→CI |
| NFR2.1 | 4/9/11、evidence/security/real-pr・job資格情報確認 |
| NFR2.2 | 3/9、projection/security・SEC-T/秘密転記0 |
| NFR2.3 | 6/7/8、admission/envelope/entry・権限NONE |
| NFR3.1 | 2/3/9、input/projection/security |
| NFR3.2 | 2/4/9、input/evidence/security |
| NFR4.1 | 4/7/8、evidence/envelope/entry・偽hashなし |
| NFR4.2 | 4/9、evidence/integration・前後head/評価分離 |
| NFR5.1 | 2/4/6、policy/evidence/admission・明示入力 |
| NFR5.2 | 7/9、envelope/integration・完全inline/参照 |
| NFR6.1 | 4/9、evidence/security・5予算と完全性 |
| NFR6.2 | 4/8/9、evidence/entry/integration・一回停止 |
| NFR8.1 | 1/10/11、policy/entry/real-pr・実版/再現性 |
| NFR8.2 | 2/3/7/10、input/projection/envelope・major保持 |
| NFR9.1 | 7/8、envelope/entry・不足/不能/次操作 |
| NFR9.2 | 6/7、admission/envelope・legacy全field |
| NFR10.1 | 1/8/10、entry/既存回帰・ESM/依存/構造 |
| NFR10.2 | 5/8/9/11、design-audit/entry/integration/real-pr・失敗伝播/受付非循環 |

NFR7はU1の副作用なし読取/出力に非適用。native効果はU3、配布効果はU5のまま。

## Story-to-Step Traceability and Remaining Acceptance

FDの割当30AC（25 OK、4 N/A、1 Deferred）をそのまま引き継ぐ。OKは設計対応であり試験合格ではない。旧真正性表現は契約の非保証/独立監査補完へ対応させる。

| AC | U1の計画Step/試験と受入境界 |
|---|---|
| AC2.1.1 | 2/6/8/11、policy/admission/entry/real-pr |
| AC2.1.2 | N/A継続。前単位統合後の実進行はU3。12で制約保持 |
| AC2.1.3 | 5/8/12、design-audit/entry。実独立監査・受領・別担当統合は別担当 |
| AC2.1.4 | 7/8/12、envelope/entry。機械PASSを公開権限へ変換しない |
| AC2.1.5 | 8/9、entry/integration。U1で旧4/5非呼出し/失敗隠し拒否 |
| AC2.2.1 | 2/4/7/12、policy/evidence/envelope、逆追跡 |
| AC2.2.2 | 2/6、input/admission、対象/attempt/重複/READY |
| AC2.2.3 | 2/4/9、input/evidence/security、構造/不能停止 |
| AC2.2.4 | 4/6、evidence/admission、実bytes/明示入力 |
| AC2.2.5 | 7/8/11、envelope/entry/real-pr、確認範囲 |
| AC3.2.1 | N/A継続。U1〜U5統合の初回実ゴールに残す |
| AC3.2.2 | N/A継続。A不足/B不能と安全案内はU2 |
| AC3.2.3 | Deferred継続。1/9/10/11でU1のTDD/100%/SEC-Tを実測予定。U4等の実証を代行しない |
| AC3.2.4 | 8/11、entry/real-pr、mock/exit0だけの完成を拒否 |
| AC3.2.5 | N/A継続。U5/U6/U7の設定保持/追加/AUNに残す |
| AC4.1.1 | 3/6、projection/admission、canonical/正式役/READYと非保証 |
| AC4.1.2 | 4/6、evidence/admission、subset/attempt/再開 |
| AC4.1.3 | 2/6、input/admission、不完全READY/誤kind拒否 |
| AC4.1.4 | 2/6、policy/admission、非空必要集合/legacy |
| AC4.1.5 | 8/12、entry、未知役委任/権限発行なし |
| AC4.2.1 | 5、design-audit、4分類根拠 |
| AC4.2.2 | 5、design-audit、同PR/design-only歴史head |
| AC4.2.3 | 4/5、evidence/design-audit、別対象/不能 |
| AC4.2.4 | 5/8/12、design-audit/entry、実装head監査を別条件で保持 |
| AC4.2.5 | 5/9、design-audit/integration、設計変更失効/差戻し |
| AC4.3.1 | 2/6、policy/admission、Inception/必要kind/非空 |
| AC4.3.2 | 3/9、projection/security、private除外 |
| AC4.3.3 | 3/4/6、projection/evidence/admission、変換と公開CI分離 |
| AC4.3.4 | 2/4/6、input/evidence/admission、対象/試行/実内容 |
| AC4.3.5 | 2/4/9、input/evidence/security、破損/競合/不能 |

## Standards, Issues and Completion Limits

S1は既存履歴/identityを保全、S2/S3は凍結契約の境界と一つの意味、S4は明示now/ID、S5は実bytes再計算とUNKNOWN、S6は既存major/逆向き、S7は読取に非適用、S8はFAIL/UNKNOWN/未実行停止、S9はjob別資格情報へ対応する。既定/例外のdeviation_ledgerと未enforce時report-onlyを保持し、新しい全社規格は採択しない。新規逸脱は計画していない。

既知の未解消事項:

- FD Minor R-01のW06/E05誤記は凍結上流に残す。正しいE05=U2/U6→LLMテキスト対話で実装する。
- 過去のREADY不足はactual PRの現在集合で評価する。閾値前不足は残件、閾値後/再承認対象の必要READY欠落はFAIL。記録の補作/承認取消で回避しない。
- 正式Construction Verification Commandは未設定。本計画の試験コマンドをその人承認へ代用しない。
- live branch protection/check名/権限、realPR/CI、coverage/SEC-T、候補→監査統合済み固定版/pin/caller適用は未検証。
- U1→U4指定順のruntime反映は未成立。U1完了境目で正式経路を確認する既存残件。

## Assumptions & Open Questions

None.

新たなOwner-only仕様差を仮定してスコープを変更していない。実装前条件と後段の実証は未成立のまま明示し、親が正式Plan Approvalを提示する。現時点の成果は本計画と試験手順の2文書のみ。

