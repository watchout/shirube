# Shirube 作る単位の完成検査（unit-done）の芯 — 設計の記録

版 2（2026-11-03）。設計の作者 = arc。版 1 = iyasaka-arc#57 6597113797（aun だけに置く形）。版 2 は、Owner の決定 OD-SUITE-UNIT-DONE-CHECK-IN-SHIRUBE-GATE-KIT-20261103-001 のとおり、判定の芯（この記録、shirube に置く）と aun の分（aun の `docs/design/unit-done-aun.md`）に分けた。

適用 ID:
- OD-SUITE-UNIT-DONE-CHECK-IN-SHIRUBE-GATE-KIT-20261103-001（[iyasaka-arc#49 6597452196](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6597452196)。以下 [KIT]。最初から Shirube に作り、配布キットで aun・onza・shirube に同じ版で配る。各 repo は CI の job で判定の芯を呼び、対応表だけを持つ）
- OI-SUITE-UNIT-DONE-ALL-CHECKS-PASS-BEFORE-OWNER-CHECKLIST-TESTS-20261103-001（[#49 6596779824](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6596779824)。以下 [ALL]）
- OI-SUITE-UNIT-DONE-CHECK-AS-CI-GATE-20261103-001（[#49 6596966301](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6596966301)。以下 [CI]）
- OD-SDS-GOAL-TREE-20260930-001（#49 5906767632）、OI-LLM-CONTROL-BY-SCRIPT-MECHANISM-HOOK-MUST-20261024-001（#49 6380845765）、OD-SUITE-AIDLC-COVERAGE-FLOOR-80-20261022-001（#49 6336689921）、OD-SUITE-UNIT-TIME-TARGET-MIDPOINT-20261102-001（#49 6566617526。以下 [UT]）
- 設計・実装の標準 S2・S3・S4・S5・S8・S9

事実は shirube main `e183f4f0`（以下 [SH]）の `scripts/sds/kit.mjs`・`scripts/sds/plan-binding.mjs`・`.github/workflows/sds-gate.yml`・`kit/sds-gate-caller.yml`・`.shirube/hygiene-profile.md`・`docs/sds/distribution.md` を arc が 2026-11-03 に読んだ物。

## 1. 目的と対象外

**目的**（[ALL]・[CI] のまま）: 作る単位を「済み」にできるのは、完成検査の項目が全部「満たした」の時だけにする。完成検査は CI で流し、1 つでも満たさなければ、その単位を閉じる PR を統合できない（必須の検査にするのは Owner の設定、§6）。Owner に回すのは、それが通った PR だけ。

**持つこと**: 判定は LLM を使わない script が決める。判定の核は時計・乱数・file・ネットワークを読まない（S4）。確かめられない項目は「観測できず」で、満たしたに数えない（S5）。判定の決まりは shirube の 1 か所に置き、各 repo は同じ版を呼ぶ（S3）。

**対象外**（PR ごとの独立の監査が見る）: 試験が受入の基準の中身を本当に確かめているかの意味の判断、設計と実装の意味のずれ、誤りの文や log に秘密・本文が入っていないか。完成検査は「監査が PASS したか」だけを見る。門（sds-gate）の判定 1〜6 は変えない。各 repo の対応表の中身（aun の分の記録が持つ）。OmotenasuAI（arc-omo の受け持ち）への当てはめ。

## 2. 部品と置き場

| 部品 | 置き場 | 持ち主 |
|---|---|---|
| 判定の核 | `scripts/unit-done/judge.mjs`（事実の JSON → 答えの JSON。§3.6 の決まりだけ） | shirube |
| 取り出し | `scripts/unit-done/extract.mjs`（写しと設計の記録から、単位のストーリー・受入の基準・設計の場合の ID を取る） | shirube |
| 集め手 | `scripts/unit-done/collect.mjs`（GitHub の API で事実を集める。§3.3） | shirube |
| 入口 | `scripts/unit-done/main.mjs`（集め手 → 核 → commit の status） | shirube |
| 再利用の workflow | `.github/workflows/unit-done.yml`（`on: workflow_call`。shirube を自分の commit で checkout し、上の script を動かす） | shirube |
| キットの呼出し側 | `kit/unit-done-caller.yml` → 配布先の `.github/workflows/unit-done.yml`（`<SHIRUBE_COMMIT>` を pin の commit に置き換える） | shirube（配布先では kit の file） |
| 事実の出し手 | `kit/unit-done-emit.sh` → 配布先の `.shirube/unit-done-emit.sh`（CI の job が試験の結果を log に出す。§3.3） | shirube（配布先では kit の file） |
| profile | 配布先の `.shirube/unit-done.json`（repo ごとの値。§3.7） | 配布先（保護面 `.shirube/**`） |
| 対応表と写し | 配布先の `acceptance/<unit>/checklist.json`、`acceptance/_source/`（§3.5・§3.7） | 配布先 |
| 事実を出す CI の step | 配布先の CI の workflow（aun は `.github/workflows/ci.yml`） | 配布先（保護面） |

- キットの `render` は、`.shirube/unit-done.json` がある配布先にだけ、呼出し側と出し手の 2 つの file を書く（kodama など profile の無い配布先の版上げに、新しい workflow が入らないため）。pin の `files` にその 2 つの指紋が入り、`kit check` が digest を照らす（今の仕組みのまま）。
- 再利用の workflow を配布先が呼ぶ `uses: watchout/shirube/.github/workflows/unit-done.yml@<commit>` は、今の `kit status` の `hygiene_pin_match`（配布先の workflow が呼ぶ shirube の再利用の workflow が全部 pin の commit か）が見る（[SH] `kit.mjs` の `usesMatch`）。

## 3. 振る舞い

### 3.1 いつ走り、何を読み、何を出すか

- 呼出し側（配布先の `.github/workflows/unit-done.yml`）は 2 つの出来事で走る: `pull_request_target`（opened・synchronize・reopened・edited・ready_for_review）と、`workflow_run`（配布先の CI の workflow `ci` が completed）。`workflow_run` は、`event` が `pull_request` で、`pull_requests` がちょうど 1 つの時だけ、その PR で動く。どちらも定義は default branch の物が使われるので、PR は自分を判定する呼出し側を書き換えられない（sds-gate と同じ。[SH] `kit/sds-gate-caller.yml`）。
- 再利用の workflow は、shirube を `job.workflow_sha` で checkout し（sds-gate と同じ形。commit を確かめる）、**PR の code を checkout も実行もしない**。読むのは GitHub の API だけ（contents・pulls・commits・comments・reviews・actions の run と job の log）。権限は `contents: read`・`pull-requests: read`・`issues: read`・`actions: read`・`statuses: write`（呼出し側が渡す）。新しい資格情報は足さない（S9）。
- 出すのは PR の head への commit の status `unit-done` 1 つ（state と短い説明）と、job の summary の表、log の 1 行の JSON（`sds-unit-done-result/1`）。
- 同じ PR の古い run は新しい run が止める（`concurrency`、`cancel-in-progress: true`。sds-gate と同じ）。
- 再利用の workflow は、sds-gate.yml と同じ gh の包み（`gh api` の path が `/logs` で終わる時だけ `--allow-escape-sequences` を足す。[SH] sds-gate.yml の 2026-10-26 の直し）を置く。K6 の固定 checker と集め手が job の log を gh で読むため。包みの文は 2 つの workflow で同じで、同じことを試験 W が確かめる（同じ知識を 2 か所に置く所を試験で縛る）。

### 3.2 対象の PR の見分け

PR の head で次を見る。
- (a) PR が `acceptance/*/checklist.json` を足す・変える。
- (b) PR の `sds-pr` の block の `control_handoff` が指す handoff が `completes_unit: true`（読み手は門の判定 4 が使う物と同じ。[SH] `plan-binding.mjs` の handoff の読み手を export して使い、2 つ目の読み手を作らない。S3）。

| (a) | (b) | 扱い |
|---|---|---|
| なし | なし | 対象外。status `success`（説明 `not a unit-closing PR`）。ほかを読まない |
| あり | あり | 対象。§3.4 を全部見る。加えて、対応表の `plan_id`・`node_id` が PR の `delivery_plan_binding` と handoff の `plan_binding` と同じ（違えば FAIL） |
| あり | なし | FAIL（対応表を変えるのは単位を閉じる PR だけ） |
| なし | あり | FAIL（単位を閉じる PR は必ず完成検査を通る） |

### 3.3 事実の集め方

- **CI の run**: profile の `ci_workflow`（例 `.github/workflows/ci.yml`）の run のうち、`event` が `pull_request` で `head_sha` が PR の head の物の、一番新しい run attempt。まだ completed でなければ status `pending`（説明 `waiting for ci`）で終わる（`workflow_run` でまた走る）。
- **試験の結果（事実の行）**: 配布先の CI の job が、試験の後に `.shirube/unit-done-emit.sh <name> <file>` を動かす。出し手は file を gzip にして base64 にし、`UNIT-DONE-FACT v1 <name> <file の SHA-256> <i>/<n> <base64 の 4,000 文字ずつ>` の行を log に出す（`::` で始めない。GitHub の workflow の command にならないため）。集め手は profile の `facts` が名指す job の log を API で読み、名前ごとに行を集めて元の file に戻し、SHA-256 を照らす。
  - 1 つの名前の行が 2 組以上ある・欠けた番号がある・戻した指紋が違う → その事実は `unobserved`（試験の出力が同じ形の行を出して偽ろうとしても、本物の行と 2 組になって通らない）。
  - 名指した job の `conclusion` が `success` でない → その事実を使う項目は `unmet`。
- **網羅率**: 事実 `coverage` は `{"schema":"sds-unit-done-coverage/1","exit_code":<整数>,"lines_threshold":<整数>}`。
- **PR と commit**: 単位の PR ごとに、PR（`merged_at`・`base.ref`・`head.sha`・本文）、commit の一覧（古い順、250 件まで。超えれば `unobserved`）、1 つ目の commit の変更 file、comment、review。
- **単位の PR の集まり**: default branch に統合された PR を全部（`state=closed`、100 件ずつ）読み、`sds-pr` の block の `delivery_plan_binding` が対応表の `plan_id`・`node_id` の物を選ぶ。
- 読めない（404 以外の失敗・時間切れ・上限）→ その事実は `unobserved`。例外を投げて job を緑にしない（S8）。
- 集め手は事実を 1 つの JSON（`sds-unit-done-facts/1`）にして核に渡す。核はこの JSON だけを読む。

### 3.4 完成検査の項目

| ID | 何を | どう照らすか |
|---|---|---|
| K1 | 試験が全部通る | profile の `facts` の junit の事実が全部あり、名指した job が `success`。試験は 1 件以上、落ちた・誤り・skip（todo を含む）が 0 |
| K2 | 行の網羅率 80% 以上 | 事実 `coverage` の `exit_code` が 0 で `lines_threshold` が 80 以上、名指した job が `success` |
| K3 | 単位の受入の基準が全部、試験で通る | 写し（§3.5）から単位の受入の基準 `ACx.y.z` を全部取る。対応表の `acceptance` がその全部に 1 つ以上の試験の名前を挙げ、その試験が K1 の junit に在って pass。対応表に無い AC・junit に無い名前・落ちた試験 → `unmet`（その ID を出す） |
| K4 | 単位の設計の記録の試験の場合が全部、試験で通る | 対応表の `design_records` の各 file（PR の head にある物）の、profile の `design_cases.section` の節から、`design_cases.id_pattern` の ID を全部取る。対応表は ID の 1 つずつに、試験の名前（`design_cases`）か、場合でない参照と理由（`design_refs`）のどちらかを挙げる。どちらにも無い ID・理由が空・試験が junit に無い・落ちた → `unmet` |
| K5 | 先に落ちる試験を書いてから作った（TDD） | 単位の PR のうち profile の `code_paths` の file を変えた PR ごとに、1 つ目の commit が profile の `test_paths` と `docs/**` の file だけを変えている |
| K6 | 独立の監査が PASS し、統合された | 単位の PR ごとに、(a) `merged_at` があり `base.ref` が default branch、(b) PR の `sds-pr` の `audit`（依頼の URL・本文の SHA-256・返却の URL）を、門の判定 3 と同じ固定 checker（`scripts/hygiene/audit-admission.mjs`、指紋を変えない）の `--review` に渡して `RECEIPT_ACCEPTED`、(c) 返却の `targets[].head` が PR の統合した head、(d) profile の `auditor_login` の Approve の review がその head にある |
| K7 | 単位の PR が全部対応表にある | §3.3 で選んだ PR（道筋の node を名指して統合された PR）が全部、対応表の `prs` にある（足りない → `unmet`、番号を出す）。`prs` にあって node を名指していない PR は、対応表の `unbound_prs` に理由つきで挙げる（挙げていない・理由が空 → `unmet`）。理由が正しいかは単位を閉じる PR の監査が見る |
| K8 | 見せるもの | 対応表の `demo` が挙げる試験が K1 の junit で pass |

### 3.5 写しと取り出し

- 配布先の `acceptance/_source/` に、承認済みの AI-DLC の記録 3 つ（stories・story map・届ける計画）を bytes のまま写し、`acceptance/_source/manifest.json`（`sds-unit-done-sources/1`、各 file の `role`・`path`・元の作業場での path・SHA-256）を置く。核は写しの SHA-256 が manifest と同じことを確かめる（違えば K3・K4 は `unobserved`）。写しが Owner の作業場の今の file と同じかは CI から見えないので、写しを足す・変える PR の監査で確かめる（§7）。
- 単位のストーリー: story map の表で `Unit ID` の列が対応表の `unit` の行。受入の基準: stories の `### USx.y` の見出しの下で、行頭の空白の後が `- ACx.y.z —` の行（AI-DLC 2.11.1 の雛形の形。aun の記録では AC の行は 2 つの空白で字下げされている）。story map に無いストーリーの AC は取らない。取れた AC が 0 なら K3 は `unobserved`（形が違う記録を「基準なし = 満たした」にしない）。
- 設計の場合の ID: 節の見出しが `design_cases.section` で始まる行から、次の同じ深さの見出しの前まで。ID は前後が英数字でない所で区切り、同じ ID は 1 つに数える。位置で場合と参照を見分けない（版 1 で u7 の記録で試し、位置の決まりでは場合を 1 つも取れなかった）。取った一覧は出力に必ず出す。

### 3.6 判定の決まり

- 各項目は `met`・`unmet`・`unobserved`・`excepted` のどれか。`unobserved` を `met` に数えない。
- 外れ: 対応表の `exceptions` に、項目の ID・対象（PR の番号か AC の ID）・Owner の決定の ID と URL（`https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-<数字>`）と本文の SHA-256 を書いた物だけ、その対象を `excepted` にする。欄が欠けた外れは無効で、元の答えのまま。Owner の決定が本当にあるかは CI から見えない（iyasaka-arc は非公開）ので、単位を閉じる PR の監査と Owner の exact-head で確かめる。
- 総合: 全部 `met` → `PASS`。`met` と `excepted` だけ → `PASS_WITH_EXCEPTIONS`。それ以外 → `FAIL`。
- status: `PASS` → `success`（説明 `PASS`）、`PASS_WITH_EXCEPTIONS` → `success`（説明 `PASS_WITH_EXCEPTIONS <件数>`、summary の先頭に外れの一覧）、`FAIL` → `failure`（説明に最初の `unmet`・`unobserved` の項目）、対象外 → `success`、CI 待ち → `pending`。
- 同じ事実の JSON からは同じ答えの bytes（S4）。

### 3.7 profile と対応表の形

```json
{
  "schema": "sds-unit-done-profile/1",
  "ci_workflow": ".github/workflows/ci.yml",
  "facts": [
    {"name": "junit-unit", "job": "test (24)", "kind": "junit"},
    {"name": "junit-integration", "job": "integration", "kind": "junit"},
    {"name": "coverage", "job": "coverage", "kind": "coverage"}
  ],
  "code_paths": ["src/**", "bin/**", "db/**"],
  "test_paths": ["tests/**"],
  "design_cases": {"section": "## 5.", "id_pattern": "[A-Z]{1,2}-\\d{1,2}[a-z]?"},
  "auditor_login": "iyasaka-ai"
}
```

```json
{
  "schema": "sds-unit-done-checklist/1",
  "unit": "U2",
  "plan_id": "DP-AUN-ROUTE-001",
  "node_id": "<道筋の node の ID>",
  "design_records": ["docs/design/u2-exchange-records.md"],
  "prs": [71, 72],
  "unbound_prs": {"71": "設計の記録の PR（R1）で、道筋の node を名指す前の形"},
  "acceptance": {"AC1.1.1": ["tests/exchange.test.mjs::送った席が記録される"]},
  "design_cases": {"E-1": ["tests/…::…"]},
  "design_refs": {"R-01": "§3 の決まりを指す参照で、場合ではない"},
  "demo": ["tests/integration/…::…"],
  "exceptions": [{"item": "K5", "target": "#73", "owner_decision": "OD-…", "url": "https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-…", "sha256": "<64 桁>"}]
}
```

- 試験の名前は「試験の file の path `::` junit の suite の名前を `::` でつないだ物 `::` 試験の名前」。junit の読み手は Node の組込みの機能だけで書く（新しい外部の依存を足さない）。
- profile の欄が欠けた・形が違う → 対象の PR は全部 `FAIL`（説明 `profile`）。profile が無い配布先で対象の PR が出たら `FAIL`。

## 4. 試験（作る PR ごとに、ここに書いた場合を全部置く）

どの PR も、1 つ目の commit を試験だけにし、その commit で落ちる出力を PR 本文に貼る。

- 核（T）: T-1 全部 met → `PASS`。T-2 junit に落ちた試験 1 つ → K1 unmet。T-3 skip・todo 1 つ → K1 unmet。T-4 試験 0 件 → K1 unmet。T-5 名指した job が `failure` → K1 unmet。T-6 網羅率の `exit_code` 1・`lines_threshold` 79 → K2 unmet（それぞれ）。T-7 対応表に無い AC → K3 unmet（ID を出す）。T-8 対応表の試験の名前が junit に無い → K3 unmet。T-9 設計の場合の ID が対応表に無い・`design_refs` の理由が空 → K4 unmet。T-10 `code_paths` を変えた PR の 1 つ目の commit が `code_paths` を含む → K5 unmet（番号を出す）。T-11 docs だけの PR → K5 の対象外。T-12 監査の checker が `RECEIPT_ACCEPTED` でない・返却の head が統合の head と違う・Approve が無い・統合されていない → K6 unmet（どれかを出す）。T-13 node を名指した PR が `prs` に無い → K7 unmet。`prs` にあって名指していない PR が `unbound_prs` に無い・理由が空 → K7 unmet。T-14 事実が `unobserved` → 総合 `FAIL`。T-15 写しの指紋が manifest と違う → K3・K4 unobserved。T-16 外れ → `excepted`、総合 `PASS_WITH_EXCEPTIONS`。T-17 外れの欄が欠ける → 無効で元の答え。T-18 同じ事実で 2 回 → 答えの bytes が同じ。核の file に `Date.now`・引数なしの `new Date()`・`Math.random`・`randomUUID`・`node:fs`・`fetch`・`child_process` が無い。
- 見分け（V）: V-1〜V-4 §3.2 の表の 4 つの行。V-5 対応表の `node_id` が PR の `delivery_plan_binding` と違う → FAIL。V-6 handoff が読めない（marker が無い・YAML が壊れている）→ (b) は「なし」でなく `unobserved` で FAIL。
- 取り出し（X）: X-1 試しの stories と story map から、単位の AC が手で数えた数と同じ。X-2 story map に無いストーリーの AC を取らない。X-3 節の中の ID を全部取り、節の外の ID を取らない。X-4 AC が 0 → K3 unobserved。
- 集め手（G）: G-1 事実の行を戻して指紋が合う。G-2 同じ名前の行が 2 組・番号の欠け・指紋の違い → unobserved。G-3 偽の API で、run が completed でない → `pending`。G-4 偽の API が 403・500・時間切れ → unobserved（例外で終わらない）。G-5 junit の入れ子の suite の名前を `::` でつなぐ。G-6 commit が 250 件を超える → K5 の対象の PR は unobserved。
- 出し手（E）: E-1 4,000 文字を超える file が複数行に分かれ、集め手で元に戻る。E-2 空の file・無い file → 出し手が 0 以外で終わる（job が赤になる）。
- workflow（W）: 呼出し側が PR の code を checkout しない（試験が workflow の file の文を読む）。再利用の workflow の checkout が `job.workflow_sha`。gh の包みの文が sds-gate.yml の物と同じ。`kit render` が profile の無い配布先に 2 つの file を書かない、ある配布先には書く。
- 実物で 1 回（再利用の workflow の PR、§5 の PR-2）: shirube の試しの PR で、対象外の PR → `success`、偽の対応表の PR → `failure` と最初の unmet、の 2 つを run の URL で示す。
- 変異: 一覧の実数を PR 本文に書き、等価でない物は全部試験で落とす。等価として分けた物は理由を書く。網羅率は今の CI のまま（`scripts/**` の行 80%）。

## 5. 作る順と PR、Owner の手

| PR | 中身 | 区分 | 依存 |
|---|---|---|---|
| PR-D | この記録と監査の項目集合を shirube に置く | R1 | ― |
| PR-1a | `judge.mjs`・`extract.mjs` と試験 T・X | R2 | PR-D |
| PR-1b | `collect.mjs`・`main.mjs`・`plan-binding.mjs` の handoff の読み手の export と試験 V・G | R2 | PR-1a |
| PR-2 | `.github/workflows/unit-done.yml`・`kit/unit-done-caller.yml`・`kit/unit-done-emit.sh`・`kit.mjs` の render の条件・`docs/sds/distribution.md` に完成検査の節、試験 E・W | R4（workflow・kit） | PR-1b |

- 大きさ: 各 PR で `scripts/**`・`configs/**`・`.github/workflows/**`・`tests/**` に足した行の合計 400 以内（`tests/fixtures/**` は数えない）、file は全部で 20 以内、新しい file は 300 行以内（[SH] の hygiene profile）。見込みは PR-1a 約 220 行の code + 試験、PR-1b 約 240 行 + 試験、PR-2 約 80 行 + 試験。超えそうな時は作る席が止めて arc に返す。
- own code: 今 2,178 行（shirube#87 6597771127）。次の目標の見込み約 710 行と合わせ、この記録の分は約 540 行で、合計の見込み約 3,430 行 / 4,000 行。予算は変えない。
- PR-1b が門の file（`plan-binding.mjs`）を触るのは export の 1 語だけで、門の判定と試験は変えない（門の試験が全部そのまま通ることを PR 本文に書く）。
- **Owner の手**: PR-2 の exact-head 1 回（workflow を足す保護面。[KIT] の決定 4）。配布先への版上げと必須の検査は aun の分の記録が持つ。shirube 自身が自分の単位にこれを当てる時期は [KIT] の「含まないもの」のとおり別に伺う。

## 6. 採らなかった案

- **aun だけに置いて 3 例目で移す**（版 1）: [KIT] で Owner が最初から Shirube にすると決めた。S2 から外れる所は §9 の deviation_ledger。
- **再利用の workflow が PR の code を checkout して試験を自分で流す**: 試験の command・PostgreSQL などの service が repo ごとに違い、判定の側に repo の知識が入る（S3）。PR の code を判定の job で動かす形にもなる。
- **試験の結果を actions の artifact で渡す**: `actions/upload-artifact` は今どの配布先の CI も使っておらず、新しい外部の依存（Owner の決定）になる。job の log は門が既に API で読んでいる（[SH] `sds-gate.yml` の log の読み直し）ので、log の事実の行にした。
- **完成検査を門（sds-gate）の判定 7 にする**: 門は PR ごとに CI を待たずに走り、試験の結果を持たない。CI の後に走る別の status にした。門の判定の決まりの文も変えずに済む。
- **LLM に判定させる**: OI-LLM-CONTROL-BY-SCRIPT-MECHANISM-HOOK-MUST に反する。
- **AC の ID を試験の名前に入れる決まりにして対応表を無くす**: 今ある試験の名前を全部変えることになる。対応表なら今の試験のままで、抜けは K3 が見つける。

## 7. 秘密・権限・既知の弱み

- 判定の job は `GITHUB_TOKEN` の読む権限と、status を書く権限だけを持ち、同じ repo だけを読む。新しい資格情報は足さない。PR の code は動かさない。
- 事実の行は、配布先の CI の job（PR の code の試験）の log から読む。PR が CI の workflow を書き換えれば事実を偽れるが、その PR は `.github/workflows/**` を変えるので門で effective R4 になり、統合の前に Owner の exact-head が要る。試験の出力が事実の行をまねても、本物の行と 2 組になって `unobserved` になる。
- 統合した席が作者と別かは CI から見えない（席はどれも同じ GitHub の account で統合する）。K6 は監査の席の返却と Approve で見て、統合の席の別は branch protection と統合の決まり（T129）に任せる。
- 写しが Owner の作業場の今の file と同じかは CI から見えない。写しを足す・変える PR の監査で、監査の席が作業場の file の SHA-256 と照らす。
- 対応表が挙げた試験が基準の中身を本当に確かめているかは見ない（PR ごとの監査と、単位を閉じる PR の監査で見る）。
- K6 の固定 checker を、統合済みの古い PR の受領に当て直して `RECEIPT_ACCEPTED` が返るかは、PR-1b で aun の統合済みの PR 2 本（aun#78・#79）に当てて PR 本文に示す。返らない時は作る席が止めて arc に返す（arc が K6 の照らし方を直す）。

## 8. 予算と目安の時間

[UT] の決まり: 実績の表 版 2（iyasaka-arc#53 6591144308）は 1 本あたり約 1.4 時間。PR 4 本 = 5.6 時間。arc の見積もり 6 時間。目安は中間値の **5.8 時間**（作る時間。Owner を待つ時間は別に数える）。

## 9. deviation_ledger

| 規格 | 採った判断 | 採らなかった代替 |
|---|---|---|
| S2（抽象は 3 例目） | Owner の決定 [KIT] で、2 例目の前から Shirube の共通の部品として作る | aun に置き、3 例目（onza か shirube の単位）で移す（版 1） |
