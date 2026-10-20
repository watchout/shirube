# SDS-V2 の配布 — 旧 Shirube（V3/V4.1）部品の撤去範囲と、配布キット v0 の要求

状態: **段階 1（残す・撤去する範囲）の確定案。ARC の確定（iyasaka-arc#57 6049863576）を取り込み済み。独立監査と Owner の head 単位の承認の前。** キットの実装・各 repo への適用・必須検査の設定変更はまだ行っていない。作者 codex-adf、2026-10-08。

## 0. 根拠

| 入力 | 参照 |
|---|---|
| Owner 判断（配布の層を先に作る、範囲は ARC と codex-adf、キットは codex-adf） | https://github.com/watchout/iyasaka-arc/issues/52#issuecomment-6049770830 |
| 作業指示（段階 1〜3） | https://github.com/watchout/shirube/issues/6#issuecomment-6049775092 |
| ARC の確定（範囲・必須検査の 3 判定・配布先管理・Owner 承認の扱い） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049863576 |
| ARC の推奨（確定の前の比較材料） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049838786 |
| codex-adf の案（観測と 5 項目） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049793570 |
| 規格 | SDS-V2 shirube@`d34b31e98df522c463d5cafb7c17e0beece33fb2`（`docs/sds/README.md`、`docs/process/ai-dlc.md`、`docs/sds/audit-method.md`） |

観測した旧部品（読取りのみ）: kodama main `40afc723`、agent-memory main `9bd874ce`（ARC）/ `c199e31`（codex-adf の clone 時点）。両者の内訳は ARC の推奨 §0 の表のとおり。

本書は ARC の確定（6049863576）を取り込んだもの。確定と推奨・codex-adf の案の違いは §6 に記録する。

## 1. 原則

- SDS-V2 の 3 つの形（PR の記載、監査方法と機械受付 checker、hygiene）で同じ証拠が取れるものは、旧部品を撤去する。取れないものだけを必須検査 1 本へ移す。
- 必須検査は、人が読めない**構造の事実**（risk の label・変更 path・今の head での受領の有無）だけを見る。意味の判断は独立監査（LC-01〜07、設計 D1〜D6 など）に残す。
- 案件ごとの状態ファイルを repo に置かない。工程の現在地は Issue と PR に書く。
- 過去の記録は消さず、履歴として残す。

## 2. 残す・撤去する範囲（kodama・agent-memory・onza。aun は旧部品なし）

| 部品 | 処置 | 代わり |
|---|---|---|
| `.shirube/runtime/rapid-lite/**`、`.github/workflows/shirube-rapid-lite-gates-report.yml` | 撤去。ただし、計画の受付（PLAN_ADMISSION）の判定は Shirube が持つ | §4 の必須検査（判定 4 を含む）、監査方法、hygiene。計画の受付に要る判定だけを Shirube の中で小さく書き直す（下記 E 方針）。Shirube の固定 commit の checkout から使い、各 repo には配らない |
| `.shirube/runtime/merge-authority/**`、`.github/workflows/merge-authority.yml` | 撤去 | §4 の必須検査 1 本と、統合担当による確認（§7） |
| V3 の状態ファイル（execution-context、lifecycle-state、control-state-completeness、enforcement-policy、route-policy、repo-spec、profile.json の `shirube_v3` 節、framework-lock、adoption-intake、existing-state-scan、v3-normalization、open-pr-inventory、pr-body-refs、`profiles/`） | 撤去 | Issue と PR の記録。項目集合は Shirube の固定版を引用 |
| `.framework/**` と、それを呼ぶ hooks（pre-code-gate、framework-runner、framework-mode-check、gate-*、skill-tracker） | 撤去 | ai-dlc §1 の開始記録と §6 の試験先行。hook では止めない |
| 上の hooks の**呼出し元**: `.claude/settings.json` の hook 登録、`.framework` や旧 3 ゲート・Pre-Code Gate を読む skill（kodama の `implement` の該当手順、`gate-design`・`gate-quality`・`gate-release`）、`framework-runner.sh` を呼ぶ `post-task.sh` | 撤去した部品を呼ぶ箇所を、同じ導入 PR で削除または置換する。skill は、旧ゲートを読む手順だけを SDS-V2 の手順（ai-dlc と監査依頼）への参照に置き換えるか、skill ごと削除するかを、その repo の担当が決める。旧工程と無関係な処理は残す | 導入 PR の条件（§2.1） |
| CLAUDE.md・AGENTS.md の `shirube-v3-runtime` managed block、kodama CLAUDE.md の Pre-Code Gate 節 | 置換 | §3 の指示の共通ブロック。ローカルの絶対パスを使わない |
| `.shirube/control-handoffs`、`cells`、`evidence`、`review-plans`、`audit-checklists`、`source-mirrors`（あるもの） | 残す（履歴）。**どの検査も読まない**。新規には作らない | 新しい引渡しは Issue のコメント＋本文 SHA-256 |
| agent-memory の `.shirube/cells/kusabi-sds-u1*` | PR332・PR333 の統合まで残し、その後は履歴 | 同上 |
| `.shirube/` ディレクトリ | 残す。中身は `hygiene-profile.md`（使う repo だけ）と版の固定ファイル（§3）と履歴 | — |
| 現行製品の action inventory とリスク分類（kodama の `.shirube/action-surfaces.json`、`.shirube/action-risk-classifications.json`）と、それを読む製品の試験（`tests/governed-action-profiles.test.ts`） | **撤去しない**。V3 の状態ではなく、製品の MCP ツール登録・権限・秘密・監査・復旧の受入と試験の入力。所有は製品の担当（kodama 席）。置き場を `.shirube/` の外へ移すかは、その repo の製品 PR で決める（キットでは動かさない） | 製品の受入のまま。試験も残す |
| V3 と無関係のもの（`ssot-audit.yml`、`channel-routing.sh` など） | 対象外。その repo の担当が判断する | — |

旧検査が見ていた中身の移し先（ARC の確定 §2）:
- design-rules（LLM を最終判断にしない、保護面での停止）→ 作る人／確かめる人の分離と R3/R4 の Owner 承認。重複コードは hygiene、設定値・定数・hard delete は実装監査の項目で見る。
- 状態系（execution-context、adoption、gate-contract、lifecycle、control-state）→ Issue と PR の公開記録。ファイルは持たない。
- flow-safety、review-plan、audit-checklist → 監査依頼（`sds-audit-request/1`）と項目集合。
- merge-authority → §4 の必須検査 1 本と、統合担当による確認（§7）。
- gate-contract が機械で拒否していたもの（宣言 head の不一致 RL-PR-004、許可外・禁止 path RL-PR-002/003、引渡しの digest）→ §4.1 の適用差分のとおり。判定 2 が引き継ぐのは、変更 path の集合が実際の diff と一致することだけ。
- 道筋の記録の検査（`delivery_plan_ref:` を持つ PR への validator、Rapid/Lite report の中で report-only）→ 計画の受付だけを `scripts/sds/plan-admission.mjs` に書き直し、必要なら形の検査を `scripts/sds/plan-admission-shape.mjs` に分ける。判定 4（§4）は構造の照合だけを自前で行い、この関数にはまだ接続しない。
- technical_owner_review は必須にしない。

計画の受付は [Owner 判断 E（6229043506）](https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6229043506)（本文 SHA-256 `05236574dc3ee489f76ab8ef180880344218c040bd329b72062938c78d0f51ba`）と [KIT-ADF 順番 2 の E 版指示書](https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6230190519)（本文 SHA-256 `9d1f358bb63cc869dc68c81f415ce53cc823d88ba426aac47635e2cb2884e5fe`）に従う。#48 の「7 file を `kit/adf/` に写す」方針を、次の E に置き換える。

- 範囲: PLAN_ADMISSION の形と判定だけを書き直す。ADF の validator は部分的にも写さない。TERMINAL_ADMISSION、TEST_ADMISSION、REPLAN、加速、ordinary binding、`resolve-*-ref.mjs` は入れない。公開関数は `planAdmission(document, { actualSelfPin })` とし、`decision`（PLAN_ADMISSION）、`verdict`（PASS または BLOCK）、`reason`、`findings`（reason・path・message）を返す。import は Node の組込み機能、`scripts/hygiene/lib.mjs`、`scripts/sds/` の中に限り、npm の依存は足さない。
- 等価の定義: 同じ `document` と `actualSelfPin` に対し、ADF 1.3.0 の固定 commit `561baebe980f0ae0c275b730bb5dc09cfb66b781` の `buildDeliveryPlanValidationReport(document, { actualSelfPin }).decisions.PLAN_ADMISSION` と、verdict・reason が完全一致し、findings の `(reason, path)` の組の集合が一致すること。message の文言は自由。
- 等価の確認: 後続 PR の `tests/plan-admission-equivalence.mjs` が引数で ADF checkout を受け取り、HEAD が上の固定 commit と違えば fail-closed で止まる。E 版指示書 §2 の入力集合で、ADF の PLAN_ADMISSION を出す `block()` の全呼出し位置を網羅し、漏れ 0 を門にする。監査席が固定 ADF で実行して出力を返す。ADF が無い CI は明示的に skip し、CI に token を置かない。ADF の場所は環境変数で選ばない。
- 正本と凍結: 道筋の検査の正本は Shirube に移り、以後の変更は Shirube で行う。ADF の同じ道具は凍結し、以後は直さない。`actualSelfPin` は呼出側から渡し、pin の正本の選択は g3 の後に ARC が別途裁定する。今回の E への改版で pin の値は決めない。
- 予算: `own_code_lines` は 2,300 行。[Owner の決定 OD-SHIRUBE-OWN-CODE-BUDGET-2300-20261020-001](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6285364300)（本文 SHA-256 `6698fb37f9b4c5f5fe3b2eab1d27600b09312afb36e70809493501bc47992154`）による。内訳は固定で、既存 1,500、KIT-ADF 450（PR-2 と PR-3 の `scripts/**` 合計、E 版のまま）、判定 5 は 150 以下、席側の hook は 150 以下、未割当 50（使用には ARC の裁定が要る）の合計 2,300 行。各枠を超える実装は実装席が停止して ARC に返し、枠の中での調整も ARC の裁定とする。E 版指示書の「1 回だけ上げる」「上限を再び上げない」は、この決定で置き換えた。各 file 300 行、各 PR 追加 400 行、関数 50 行、複雑さ 10 の上限を守り、exceptions は追加しない。

この改版は E の文書と予算の変更であり、PLAN_ADMISSION の実装・等価試験の完了を示さない。

### 2.1 導入 PR の条件（各 repo）

- 撤去した部品（`.shirube/runtime`、`.framework`、撤去した hooks・workflow）への参照が、稼働する入口（`.claude/settings.json`、`.claude/skills/**`、`.claude/hooks/**`、`.claude/agents/shirube-v3-*`、`.agents/skills/shirube-v3-runtime`、`.codex/*`（kodama の `.codex/instructions.md` の `shirube-v3-codex-runtime` block など）、`.github/workflows/**`、CLAUDE.md、AGENTS.md）に残っていないことを、導入 PR の中で検索して示す。キットの `check` は、この参照の有無も一覧にする（PR38 で実装）。
- `.shirube/` に残すファイルのうち、製品の試験やコードが読むもの（kodama の action inventory など）は、撤去せずに一覧にして所有者を書く。
- 旧ランタイム専用の試験は、ランタイムと一緒に廃止する。製品の安全条件を確かめる試験は残し、導入 PR の CI で通ることを示す。

## 3. 配布キット v0 の部品（段階 2 の要求）

| 部品 | 要求 |
|---|---|
| 指示の共通ブロック | CLAUDE.md と AGENTS.md に入れる短い段落。印で囲み、repo 固有の記述と分けて置換できる。内容は SDS-V2 の固定 commit、PR の記載、監査方法、R0〜R4 と承認の参照（§7）。ローカルの絶対パスを持たない |
| PR の記載（機械で読める部分） | 今の `templates/PULL_REQUEST_TEMPLATE.md` は文章の箇条書きで、機械では解析できない。§4 のために、risk_class・changed_paths・監査依頼と返却の参照を持つ機械向けブロックを 1 個加える。検査は Node の組込み機能だけで動かすため、形式は JSON とする（YAML の解析器を npm で持ち込まない）。判定 4 が読む道筋の記録と作業指示は ADF の形（YAML の fenced block）なので、その 2 つだけは runner に入っている ruby の `YAML.safe_load` で読む（ai-dev-framework の `resolve-control-handoff-ref.mjs` と同じ 1 行。ruby が無ければ fail-closed）。PR の機械向けブロックは JSON のまま |
| risk label | `risk:R0`〜`risk:R4` の label を、各 repo に用意する |
| 必須検査 1 本 `sds-gate` | §4 |
| skill | 監査依頼（`sds-audit-request/1`）の JSON の生成と前検査、統合前の確認手順 |
| 版の固定ファイル | 各 repo の `.shirube/sds-pin.json`。`sds_commit`、`kit_version`、配った各ファイルの SHA-256、保護面の path の一覧、採択の記録（Owner decision の URL＋本文 SHA-256）、採択日時。置き場は `.shirube/` の 1 か所にまとめる（ARC の確定では例として `.sds/lock.json` も挙がったが、置き場の選択は codex-adf に任されている） |
| CLI | `apply`（固定ファイルと部品を入れる PR を作る）、`upgrade`（版を上げる PR を作る）、`check`（固定ファイルと実ファイルの一致を見る）。どれも各 repo へ直接 push しない |
| 配布先の一覧と `status` | §5 |
| 計画の受付の部品（KIT-ADF、E） | §2 の PLAN_ADMISSION を Shirube 本体の `scripts/sds/` に書き直す。schema と SKILL.md は後続の PR-4 で `docs/sds/delivery-plan/` に置き、ADF の固定 commit `561baebe980f0ae0c275b730bb5dc09cfb66b781` と同じ bytes とし、出所の commit と SHA-256 を README に 1 行書く（E 版指示書 §4）。docs は own code の計数外だが、102,400 bytes の上限を守る。skill と監査の項目は Shirube checkout を参照し、各 repo の `.shirube/runtime` は使わない。既存 kit v0 の `render()` と配布先への書込み集合は変えない |

配るものはこれだけにする。案件ごとの状態ファイル、席ごとの設定、常駐する実行部品は配らない。

## 4. 必須検査 1 本 `sds-gate`

読取り専用。最初は report-only で入れ、required にするのは Owner が各 repo で行う。判定は次の 5 つ。**判定 4（plan binding）は 2026-10-14 の追加**で、ARC の確定 §3「3 つだけで、増やさない」の撤回を明示する（根拠: Owner #205 = a「1 本の流れ・suite 全体の地図 1 枚・必須の検査の 4 つ目」、iyasaka-arc#52 6159281995。設計: iyasaka-arc#57 の流れの案 v1.5 §4・§7）。原則は変えない: 5 つの判定はどれも構造の事実（digest・id・status・path の照合）だけを見て、意味は監査に残す。判定 4 は、まず結果の JSON に `plan_binding: NOT_CHECKED` の欄を足し、次に report-only（判定の結果と理由を JSON に書くが verdict は変えない）、最後に Owner が repo ごとに blocking へ上げる（Cell Admission Preconditions と同じ enforcement graduation）。**blocking になるまで（NOT_CHECKED と report-only の間）は、§4.1 の人の確認（引渡しの digest・許可 path）が merge の条件のまま残る**。判定 4 の照合の全部は流れの案 v1.5 §4 の 4（F05）と同じで、下の行に書く。

**判定 5（design binding）は 2026-10-20 の追加**で、判定 4 と同じく「3 つだけ」の原則の例外を明示する。根拠は 3 件: Owner の決定 OD-SHIRUBE-CONTROL-FIRST-THIN-SLICE-20261020-001（T102 = A「制御系を先に、薄片で作る」、iyasaka-arc#49 6284653618）、OD-SHIRUBE-CONTROL-SLICE1-DESIGN-V1-APPROVED-20261020-001（T103 = A 設計 v1 の承認、iyasaka-arc#49 6284872857）、設計 v1 §3（iyasaka-arc#57 6284740098。判定 5 の設計）。設計の版に結ぶ PR が名指す版について、未決の答えの空欄・承認の記録の欠けや不一致・主要な接続の順の乱れを、構造の事実（digest・id・状態・型）だけで確かめる。意味は監査に残す。段階は、base の pin（`.shirube/sds-pin.json`）の `design_binding_mode` で決まる。無し・`off` は NOT_CHECKED（JSON に `design_binding` の欄だけを出す）、`report-only` は判定の結果と理由を JSON に書くが verdict は変えない、`blocking` は FAIL で止める、それ以外の値は FAIL（fail-closed）。blocking に上げるのは Owner が repo ごとに行い、その前に §4.1 の未決 2 点を決める。**blocking になるまで（NOT_CHECKED と report-only の間）は、§4.1 の人の確認が merge の条件のまま残る**。判定 5 の照合の全部は、`scripts/sds/gate.mjs` と `scripts/sds/design-gate.mjs`（main `4362ee1e`、shirube #51・#54）の挙動と同じで、下の行に書く。

| 判定 | 見ること |
|---|---|
| 1 risk_class | PR の label `risk:R0`〜`risk:R4` を正とする。label がない、複数ある、または PR の機械向けブロックの `risk_class` と違えば FAIL。保護面の path（固定ファイルの一覧）に触れていれば、label に関わらず R4 として扱う |
| 2 変更 path | 実際の diff のファイル一覧が、ブロックの `changed_paths` と一致する。違えば FAIL |
| 3 監査の受領 | R2 以上: その PR の監査依頼と返却について、固定した checker（`scripts/hygiene/audit-admission.mjs`）の `--review` が、今の head で RECEIPT_ACCEPTED になる。R0・R1 は監査不要 |
| 4 plan binding | 全 risk: PR の機械向けブロックの `delivery_plan_binding`（`comment_ref`・`comment_sha256`・`plan_id`・`generation`・`node_id`）と `control_handoff`（`ref`・`sha256`）を読む。(a) `comment_ref` の comment の本文 SHA-256 が `comment_sha256` と一致し、その本文の `shirube-delivery-plan/v1` の `plan_id`・`generation` が一致して `status: ADMITTED`。(b) `node_id` が `delivery_graph.nodes[].id` にあり、その `repository` が PR の repo と一致し、`depends_on` の全 node が `lifecycle_status: COMPLETE`。(c) `control_handoff.sha256` が作業指示の comment の本文 SHA-256 と一致し、本文の `shirube-v3/control_handoff/v1` の block（marker つき）の `plan_binding.{plan_id, generation, node_id}` が (a)(b) と一致し、`plan_binding.plan_comment_ref` = `comment_ref` かつ `plan_binding.plan_comment_sha256` = `comment_sha256`（引用符つきの string。数に読まれたら型違いで FAIL）、`plan_binding.changes_predicates` が空でなく全部が node の `changes_predicates` にあり、かつ全部が `owner_outcome.terminal_predicates[].id` にあり、`allowed_paths` が判定 2 の変更 path（rename の両側）を覆う。(d) R2 以上: 判定 3 が digest を照合した監査依頼（`sds-audit-request/1`）の `plan_binding.{plan_id, generation, node_id}` が (a)(b)(c) と一致し、その `plan_binding.changes_predicates` が空でなく (c) の handoff の集合に含まれる（依頼に `plan_binding` が無い → FAIL）。参照の形は `^https://github.com/(watchout/[\w.-]+)/(issues\|pull)/(\d+)#issuecomment-(\d+)$` だけ。1 つでも欠ければ FAIL（docs だけ・R0/R1 の PR は、その製品の運用の node と、取りまとめ席が 1 回出す運用の control_handoff を名指しする） |
| 5 design binding | **読むもの**: PR の機械向けブロックの任意の `design_binding`（`design_ref`・`design_sha256`・`design_id`・`version`）。`design_ref` は commit 固定の設計 file（`https://github.com/watchout/<repo>/blob/<40 桁の commit>/<path>.md`）で、GitHub の contents（その commit）から取り、file の中の ` ```json sds-design ` の block 1 個を設計の版として読む。その block の `approval.ref` の承認の comment の本文。判定 4 が PASS の時だけ、PR の `delivery_plan_binding` の plan の comment も読み直す。読むのは GitHub の contents と comments の GET だけで、PR の code は checkout も実行もしない。**見ること**: 5.0 `design_binding` が型どおりにある。5.0a 読めない時は FAIL（NOT_CHECKED にしない）。5.0b file の bytes の SHA-256 が `design_sha256` と一致する（宣言値を信じず、取得した bytes から計算する）。5.0c block が 1 個。5.1 block の型（`schema` が `sds-design/1`、`design_id`、整数の `version`、`open_decisions`、`approval`、`main_connection.first_node`）。5.2 未決の各項目に、空でない `answer` と、決定の記録の `decided_ref`（`https://github.com/watchout/<repo>/issues/<n>#issuecomment-<id>`）がある。5.3 承認の comment の本文の SHA-256 が `approval.sha256` と一致する。5.4 その本文に marker `shirube-owner-decision/v1` と、前後が英数字・`_`・`.`・`-` でない 1 語の `design_id@version` がある。5.5 plan があれば、主要な接続の最初の node（`main_connection.first_node`）が plan にあり、COMPLETE でなく、`depends_on` の全 node が COMPLETE（今すぐ着手できる）。5.6 R2 以上で plan があれば、PR の `node_id` が最初の node か、その `depends_on` の推移の先に最初の node がある（主要な接続より前に、他の実装が進まない。R2 未満は N/A）。5.7 plan が無い時（判定 4 が PASS でない）、5.5・5.6 は NOT_CHECKED で、verdict は 5.0〜5.4 で決まる。5.8 PR が名指す `design_id`・`version` が block と一致する。reason の 5.9 は使わない。1 つでも欠ければ FAIL（結果は JSON の `design_binding` に、段階に応じて書く） |

見ないもの: 設計規則の意味、lifecycle、禁止 path（判定 4 は `allowed_paths` の包含だけを見る）、predicate の意味（段の条件が満たされたか）、設計の中身の良し悪し（判定 5 は版の構造だけを見る。問いが妥当か、答えが設計に反映されたかは監査が見る）、Owner の承認（§7。採択 `ADMITTED` の本人確認も機械で見ない）、固定ファイルとのずれ（§5 の `status` で見る）。引渡しの digest と許可 path の包含は、判定 4 が引き継いだ。機械から外したものの扱いと、判定 5 が blocking になるまでの人の確認は §4.1。

実装上の要求:
- checker と判定の本体は、PR の head からではなく、固定した Shirube の commit から取得する。PR が検査を書き換えて自分を通す経路を作らない。
- 保護面の path の一覧は、PR ではなく base ブランチの固定ファイルから読む。
- 監査の返却はコメントで届くため、`pull_request_target` に加えて `issue_comment` でも動かし、結果は head SHA への commit status として付ける。head が変わると古い受領は使えない（判定 3 が今の head を要求するため）。
- 差し替えの経路を 2 つの手段で止める（ARC の判断 1、iyasaka-arc#57 6051365638、PR37 への転記 6051376399）。(a) 配布先の呼出し側は `pull_request_target` で起動する。定義は default branch から読まれるので、PR がその PR を判定する検査を書き換えても効かない。gate は PR のコードを checkout も実行もしない。(b) workflow を足す・変える PR は保護面 `.github/workflows/**` に触れるので effective R4 とし、merge 担当は status の色ではなく gate の run の JSON を読む。残る穴は 2 つ。同じ context に後から success を付けられることは、必須化（段階 3 以降）の時に Owner が各 repo で ruleset の required workflow（SHA 固定）が使えるかを確かめ、使えれば閉じる（Owner 回答 Q-SDS-RULESET-20261008、iyasaka-arc#52 6052355440）。同じアカウントの席が API で直接 status を付けられることは、Owner 専用アカウント（§7 の案 b）の課題として残す。
- job log は Actions の中で読む（Actions 外の席では読めない環境がある。PR34・PR35 で観測）。

### 4.1 機械から外したものの扱い（適用差分）

旧 gate-contract は、宣言 head の不一致、許可外・禁止 path、引渡しの digest を機械で拒否していた。SDS-V2 のキットでは、判定を構造の事実の照合に限る（ARC の確定では 3 つ。2026-10-14 に判定 4、2026-10-20 に判定 5 を足した = §4）。外したものは、移したのではなく**次のとおり人の確認に置き換える**判断であり、ここに明示する（判定 4 が引き継ぐ 2 行は、判定 4 が blocking になるまで人の確認を続ける）。

| 旧の機械判定 | キットでの扱い | 誰が・いつ | 残す証拠 | 合わない時 |
|---|---|---|---|---|
| 宣言 head の不一致（RL-PR-004） | `sds-gate` の結果は head SHA ごとの commit status なので、別の head の結果は使えない（構造で保たれる）。R2 以上は、監査依頼が head と base を固定し、checker が照合する | 機械（status）＋ checker | commit status、監査依頼の JSON | head が変われば status は付け直し、R2 以上は依頼を出し直す |
| 許可外・禁止 path（RL-PR-002/003） | 許可 path の包含は判定 4 が機械で見る（作業指示の `allowed_paths` が PR の変更 path を覆う）。**判定 4 が blocking になるまで**（NOT_CHECKED・report-only）は、merge 担当が merge の直前に許可の範囲と変更 path を照合する（従来どおり。gate の JSON に判定 4 の結果があれば読み合わせる）。禁止 path と範囲の意味は、段階に関わらず人が照合する | R2 以上は独立監査担当（監査の中で）。全 risk で、merge 担当が merge の直前に | PR 本文の Evidence 節に「範囲の照合結果（範囲内／範囲外の path）」を作者が書き、merge 担当が確認したことを merge の記録に書く（policy Evidence Rules の allowed/forbidden scope result） | merge しない。作者に戻し、範囲を直すか、範囲の変更を引渡しの側で決める |
| 設計の版の承認・未決の答え・主要な接続の順（判定 5。旧の機械判定に無く、2026-10-20 に足した） | 判定 5 が機械で見る（§4 の表）。**判定 5 が blocking になるまで**（NOT_CHECKED・report-only）は、`design_binding` を持つ R2 以上の PR について、merge 担当が merge の直前に次の 2 つを確かめる。(1) 名指す設計の版（`design_ref` の file、`design_id`、`version`）の承認の記録を読み、comment の本文の SHA-256 が file の `approval.sha256` と一致すること。(2) その版の `open_decisions` に、答えの空欄が無いこと。gate の JSON に判定 5 の結果があれば読み合わせる。承認が Owner 本人のものかは §7 のとおり機械では見ない | merge 担当が merge の直前に | PR 本文の Evidence 節に、作者が設計の版（`design_ref` と SHA-256）と承認の記録の URL を書き、merge 担当が確認したことを merge の記録に書く | merge しない。作者に戻し、設計の版か承認の記録を直す。gate の JSON の結果と合わない時も同じ |
| 引渡しの digest | 判定 4 が機械で見る（`control_handoff.sha256` と作業指示の comment の本文 SHA-256 の一致）。**判定 4 が blocking になるまで**（NOT_CHECKED・report-only）は、merge 担当が merge の直前に本文の SHA-256 を照合する（従来どおり）。blocking の後は gate の JSON の `plan_binding` を読む | R2 以上は監査依頼に固定。全 risk で、merge 担当が merge の直前に gate の JSON で確かめる | 同上 | 本文が変わっていれば merge しない。作者が新しい版で照合し直す |

R0・R1 は独立監査がないため、上の確認は merge 担当だけが行う。merge 担当は作者・監査担当と別の席（SDS-V2 の分離）。

**判定 5 を blocking にする前に決める 2 点**（2026-10-20。shirube #54 の本文の未決と未確認）。決め方は、ARC が案を出し、Owner が決める。決まるまで、どの repo の pin にも `design_binding_mode` の `blocking` を置かない（§8 の 7）。

- (a) `design_binding` を持たない PR の扱い。R0・R1 と、設計の版に依らない R2 以上が当たる。main `4362ee1e` の code は、`blocking` では `design_binding` が無い PR を全て 5.0 で FAIL にする（`report-only` では verdict を変えない）。
- (b) private の repo の comment を、sds-gate の workflow の `github.token` で読めるか。**未確認**。読めない時は FAIL 5.0a になる。作者の環境で測ったのは認証なしの GET（private の comment は 404、public の comment は 200）だけで、workflow の token では測っていない。読取り用の token を足すのは workflow と secret の変更（R4）で、Owner が決める。

## 5. 配布先の管理

ARC の推奨（案 A と 4 点の補強）を採る。
- 各 repo の `.shirube/sds-pin.json` が「その repo が動かしている版」の正。
- Shirube 側の配布先一覧（1 ファイル。repo・採択者・採択の記録・hygiene profile の種類）が「配布先」の正。追加・削除は Owner 承認の PR。
- `status` は読取り専用の観測。配布先ごとに、固定版・最新の採択版・digest の一致・旧部品の残り・hygiene workflow の `uses: …@<sha>` と固定版の commit の一致・必須検査の実態を出す。自動では更新しない。
- 更新 PR は Shirube 側の席が出し、各 repo の担当がその repo の gate で統合する。workflow と必須検査を含む更新は保護面なので、repo ごとに Owner の head 単位の承認が要る。文書だけの更新（共通ブロック、skill）は R0〜R1。
- ただし `.shirube/**`（版の固定ファイルと `hygiene-profile.md`）は保護面なので、文言だけの変更でも R4 として扱う（ARC の指摘 B）。

## 6. 確定に至った違いの記録

| 点 | 確定 | 出所 |
|---|---|---|
| 必須検査の判定 | 5 つ（§4）。2026-10-14 に判定 4（plan binding）を足し、ARC の確定 §3「3 つだけ、増やさない」を撤回した。2026-10-20 に判定 5（design binding）を足した。設計の版の未決の答え・承認の記録・主要な接続の順を構造の事実で見て、設計の中身の良し悪しは機械の判定に入れない。引渡しの digest と許可 path の包含は判定 4 が見る。禁止 path・Owner の承認・固定ファイルのずれ・predicate の意味は機械の判定に入れない | ARC の確定 §3 → 判定 4 の撤回: iyasaka-arc#57 流れの案 v1.5 §4・§7、Owner #205 = a。判定 5: Owner T102 = A（iyasaka-arc#49 6284653618）、T103 = A（同 6284872857）、設計 v1 §3（iyasaka-arc#57 6284740098） |
| risk_class の取り方 | label を正とし、機械向けブロックと照合する | ARC の確定 §3（codex-adf 案の label と推奨の雛形を両方使う） |
| 履歴の扱い | review-plans・audit-checklists・source-mirrors も撤去せず履歴として残す | ARC の確定 §1（codex-adf 案） |
| 版の固定ファイル | `.shirube/sds-pin.json` | codex-adf（置き場の選択は任されている） |
| 機械向けブロックの形式 | JSON | codex-adf（組込み機能だけで動かすため） |
| runtime policy | v0 は commit・SHA-256・節名で参照し、取り込みは別の PR | ARC の確定 §6 |

## 7. Owner 承認の本人確認について（ARC の確定 §4 で案 a を採択）

- 今は Owner と AI の各席が、同じ GitHub アカウント `watchout` で投稿している。そのため、owner decision の記録が Owner 本人の判断か、AI 席の転記かを、機械では区別できない。`templates/owner-decision.md` の `posted_by` の照合も、同じ理由で本人の証明にならない。
- 必須検査は Owner の承認を見ない。R3 以上の Owner の head 単位の承認は、統合担当が merge の直前に人の記録（owner decision の exact head と本文 digest）で確かめる。今の運用と同じ。
- Owner 専用の GitHub アカウントを用意する案（b）は、Owner が後で選べる案として残す。キット v0 の条件にはしない。
- GitHub の必須 review（1 承認）が残っている repo では、監査席の正式な APPROVE で満たす。

## 8. 順序と範囲外

1. 本書の確定（独立監査と Owner の承認）。
2. キット v0 の作成（codex-adf、R3）。§3・§4・§5 の部品。runtime policy は、v0 では必要な節（Risk-Tiered Gate Depth、Human Approval Gates、Evidence Rules、Function Boundaries の作る人≠確かめる人≠統合する人、Next Action Contract）を commit・SHA-256・節名で参照する。
3. runtime policy の取り込み（別の PR、R2）: 上の節を値を変えずに Shirube の `docs/sds/` の 1 文書へ移す（codex-adf）。組織の権限（Owner、保護面の一覧、収益判断、管理を AI に任せない決定など）は iyasaka-org の短い 1 文書に残し、commit と SHA-256 で引用する（ARC）。V3 policy 本体は、全 repo から旧部品が撤去されるまで履歴として残す。
4. kodama で試験導入: 追加と撤去を 1 PR で行う（R4）。必須検査の付け替えは Owner。PR84 の head は動かさず、キットの統合後に main に合わせて、`sds-gate` が R2 として受領を読めるかを確かめる。受入には次の負例 2 件を加える（ARC の判断 1）。① PR が呼出し側の `uses: …@<sha>` を別の commit に書き換えても、その PR の `sds-gate` の status は default branch の定義での結果になる（書き換えが効かない）。② PR が `statuses: write` を持つ workflow を足して `sds-gate` の success を付けても、base の定義で動く gate は `protected_touched: true`・effective R4 を出し、merge 担当の手順で止まる。
5. agent-memory（PR332・PR333 の統合後）、onza・aun（共通ブロックの置換だけ）の順に配る。
6. 判定 4（plan binding、2026-10-14 追加）: 本書 §4 の改版（R3、Owner の版の確認）→ `scripts/sds/gate.mjs` と試験（R2、5-section の指示書で）→ `kit/instructions-block.md` の文（4 つの構造の事実）→ 各 repo の `.shirube/sds-pin.json` の `sds_commit` 更新（R4、repo ごとに Owner の exact-head）。段階は §4（NOT_CHECKED → report-only → Owner が repo ごとに blocking）。計画の受付の道具は §2・§3 の E 方針に従う。KIT-ADF 順番 2 は #48 の統合後の main を base とし、PR-1（R3）で profile の own-code 予算と本書を改める。後続を PR-2（形の検査と単体試験、R2）、PR-3（意味の検査・公開関数・等価比較の道具と fixtures、R2）、PR-4（schema と SKILL.md、docs のみ、R2）に分ける。PR ごとに ARC が監査項目の集合を出し、独立監査を行う。R3 の PR-1 は Owner の exact-head 確認を統合前に要する。統合は作者・監査者と別の席が行う。E 版指示書 §6 により g3 の採択はこの作業と並べて進めてよく、pin の正本は g3 の後に ARC が裁定する。これが旧 handoff の g3 ADMITTED 前提を置き換える。各 repo の Rapid/Lite の写しを撤去する導入 PR の条件は §2.1 のまま。
7. 判定 5（design binding、2026-10-20 追加）: 本書 §4 の改版（R3、Owner の版の確認。shirube PR-B）→ code と試験（R2、shirube #51・#54、統合済み、main `4362ee1e`）→ `kit/instructions-block.md` の文（shirube PR-B）→ 各 repo の `.shirube/sds-pin.json` に `design_binding_mode` を置く（R4、repo ごとに Owner の exact-head）。blocking の前に §4.1 の未決 2 点を決める。段階は §4 の判定 5 の文のとおり。

範囲外: agent-comms-mcp・ai-dev-framework・misell に残る旧検査（後続で同じ手順）、製品の機能開発（キットを待って止めない）、Shirube 製品の本体（PR34・PR35 は今の計画のまま）。
