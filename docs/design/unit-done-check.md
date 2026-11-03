# Shirube 作る単位の完成検査（unit-done）の芯 — 設計の記録

版 3（2026-11-03）。設計の作者 = arc。版 1 = iyasaka-arc#57 6597113797（aun だけに置く形）。版 2 = iyasaka-arc#57 6598922223（判定の芯と aun の分に分けた。事前の設計監査 1 回目 = shirube#90 6599617868 で BLOCK、指摘 6 件）。版 3 は、その 6 件と同じ種類の所と、aun の分の記録の事前の設計監査 1 回目（aun#89 6599987095）の BF-UDA-01 のうち芯にもあった同じ種類の所を直した版（直した所は §10）。

適用 ID:
- OD-SUITE-UNIT-DONE-CHECK-IN-SHIRUBE-GATE-KIT-20261103-001（[iyasaka-arc#49 6597452196](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6597452196)。以下 [KIT]。最初から Shirube に作り、配布キットで aun・onza・shirube に同じ版で配る。各 repo は CI の job で判定の芯を呼び、対応表だけを持つ）
- OI-SUITE-UNIT-DONE-ALL-CHECKS-PASS-BEFORE-OWNER-CHECKLIST-TESTS-20261103-001（[#49 6596779824](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6596779824)。以下 [ALL]。受入の基準・設計の記録の振る舞い・届ける計画の「できた」の全部を、機械が確かめてから Owner に回す）
- OI-SUITE-UNIT-DONE-CHECK-AS-CI-GATE-20261103-001（[#49 6596966301](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6596966301)。以下 [CI]）
- OD-SDS-GOAL-TREE-20260930-001（#49 5906767632）、OI-LLM-CONTROL-BY-SCRIPT-MECHANISM-HOOK-MUST-20261024-001（#49 6380845765）、OD-SUITE-AIDLC-COVERAGE-FLOOR-80-20261022-001（#49 6336689921）、OD-SUITE-UNIT-TIME-TARGET-MIDPOINT-20261102-001（#49 6566617526。以下 [UT]）
- 設計・実装の標準 S2・S3・S4・S5・S8・S9

事実は shirube main `dd48581d`（以下 [SH]）の `scripts/sds/kit.mjs`・`scripts/sds/plan-binding.mjs`・`scripts/sds/gate.mjs`・`scripts/sds/design-gate.mjs`・`scripts/hygiene/audit-admission.mjs`・`.github/workflows/sds-gate.yml`・`kit/sds-gate-caller.yml`・`.shirube/hygiene-profile.md` と、aun の統合済みの u2 の PR（#71〜#85）と、Owner の作業場の AI-DLC の記録（aun・onza）を、arc が 2026-11-03 に読んだ物。

## 1. 目的と対象外

**目的**（[ALL]・[CI] のまま）: 作る単位を「済み」にできるのは、完成検査の項目が全部「満たした」の時だけにする。完成検査は CI の後に走る status で、1 つでも満たさなければ、その単位を閉じる PR を統合できない（必須の検査にするのは Owner の設定、§5）。Owner に回すのは、それが通った PR だけ。

**持つこと**: 判定は LLM を使わない script が決める。判定の核は時計・乱数・file・ネットワークを読まない（S4）。確かめられない項目は「観測できず」で、満たしたに数えない（S5）。照らす相手の集まり（受入の基準・設計の場合・届ける計画の「できた」・見せるもの）は、対応表を書く人とは別の記録から決め、対応表の側の集まりだけで照らさない（S5。§3.5）。判定の決まりは shirube の 1 か所に置き、各 repo は同じ版を呼ぶ（S3）。

**対象外**（PR ごとの独立の監査が見る）: 試験が受入の基準・条件の中身を本当に確かめているかの意味の判断、設計と実装の意味のずれ、誤りの文や log に秘密・本文が入っていないか。完成検査は「その条件を独立の監査が見ることになっているか」と「監査が PASS したか」だけを見る。門（sds-gate）の判定 1〜6 の決まりは変えない。各 repo の対応表の中身（aun の分の記録が持つ）。OmotenasuAI（arc-omo の受け持ち）への当てはめ。

## 2. 部品と置き場

| 部品 | 置き場 | 持ち主 |
|---|---|---|
| 判定の核 | `scripts/unit-done/judge.mjs`（事実の JSON → 答えの JSON。§3.6 の決まりだけ） | shirube |
| 取り出し | `scripts/unit-done/extract.mjs`（写し・設計の記録・handoff から、照らす相手の集まりを取る。§3.5） | shirube |
| CI の集め手 | `scripts/unit-done/collect-ci.mjs`（CI の run の選び方と結び付け、job の log の事実の行。§3.3 の 1〜3） | shirube |
| PR の集め手 | `scripts/unit-done/collect-pr.mjs`（単位の PR の集まり・commit・監査の記録。§3.3 の 4〜6） | shirube |
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
- 再利用の workflow は、shirube を `job.workflow_sha` で checkout し（sds-gate と同じ形。commit を確かめる）、**PR の code を checkout も実行もしない**。読むのは GitHub の API だけ。
- 再利用の workflow は、sds-gate.yml と同じ gh の包み（`gh api` の path が `/logs` で終わる時だけ `--allow-escape-sequences` を足す。[SH] sds-gate.yml の 2026-10-26 の直し）を置く。集め手が job の log を gh で読むため。包みの文は 2 つの workflow で同じで、同じことを試験 W が確かめる（同じ知識を 2 か所に置く所を試験で縛る）。
- 権限（呼出し側が渡し、再利用の workflow が使う物。新しい資格情報は足さない。S9）:

| 読む物・書く物 | API | 権限 |
|---|---|---|
| PR・PR の commit と変更 file・review・統合済みの PR の一覧 | `pulls`・`pulls/<n>/commits`・`pulls/<n>/files`・`pulls/<n>/reviews` | `pull-requests: read` |
| 監査の依頼と返却の comment・handoff の comment | `issues/comments/<id>`・`issues/<n>/comments` | `issues: read` |
| PR の head の file（対応表・写し・設計の記録）・commit（親） | `contents/<path>?ref=`・`commits/<sha>` | `contents: read` |
| CI の run・job・job の log | `actions/runs`・`actions/runs/<id>/jobs`・`actions/jobs/<id>/logs` | `actions: read` |
| check run（job の結論の照らし） | `commits/<sha>/check-runs` | `checks: read` |
| comment の編集の履歴 | GraphQL の `userContentEdits`（読むだけの query） | `issues: read`・`pull-requests: read` |
| PR の head への status `unit-done` | `statuses/<sha>` | `statuses: write` |

  sds-gate の呼出し側（[SH] `kit/sds-gate-caller.yml`）と同じ組み合わせで、足す権限は無い。どの API がどの権限かの照らしを試験 W に入れる（呼出し側の permissions に、表の権限が全部あり、ほかが無いこと）。
- 出すのは PR の head への commit の status `unit-done` 1 つ（state と短い説明）と、job の summary の表、log の 1 行の JSON（`sds-unit-done-result/1`）。
- 同じ PR の古い run は新しい run が止める（`concurrency`、`cancel-in-progress: true`。sds-gate と同じ）。

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

handoff が読めない（marker が無い・YAML が壊れている・2 つある）時は、(b) を「なし」とせず `unobserved` にして FAIL にする。

### 3.3 事実の集め方

1. **CI の run の選び方**: profile の `ci_workflow` の run のうち、次の全部がそろう物の、一番新しい run の一番新しい attempt。そろう run が無ければ `pending`（説明 `waiting for ci`）で終わる。
   - `event` が `pull_request`、`repository` と `head_repository` が対象の repo（fork の PR は `unobserved`）。
   - `pull_requests` に対象の PR の番号がある（同じ head の別の PR の run を選ばない）。
   - `head_sha` が PR の今の head。
   - `status` が `completed`（completed でなければ `pending`）。
2. **試した版への結び付け**: 出し手は事実の行に、その job が試した commit（`GITHUB_SHA`。pull_request の run では head を base に重ねた merge の commit）を書く。集め手はその commit を API で読み、親が [PR の今の base、PR の今の head] の 2 つと同じことを確かめる。違う（CI の後に base が動いた・古い run）→ 事実は全部 `unobserved`（説明 `ci ran on an older base; re-run ci`）。1 つの run の中で、事実の行の試した commit が全部同じであること。
3. **試験の結果（事実の行）**: 配布先の CI の job が、試験の後に `.shirube/unit-done-emit.sh <name> <file>` を動かす。出し手は file を gzip にして base64 にし、`UNIT-DONE-FACT v2 <name> <試した commit> <file の SHA-256> <i>/<n> <base64 の 4,000 文字ずつ>` の行を log に出す（`::` で始めない。GitHub の workflow の command にならないため）。集め手は profile の `facts` が名指す job の log を API で読み、名前ごとに行を集めて元の file に戻し、SHA-256 を照らす。
   - 1 つの名前の行が 2 組以上ある・欠けた番号がある・戻した指紋が違う → その事実は `unobserved`（試験の出力が同じ形の行を出して偽ろうとしても、本物の行と 2 組になって通らない）。
   - 名指した job の結論（job の API の `conclusion` と、同じ名前の check run の `conclusion`）が `success` でない → その事実を使う項目は `unmet`。
   - 網羅率の事実 `coverage` は `{"schema":"sds-unit-done-coverage/1","exit_code":<整数>,"lines_threshold":<整数>}`。
4. **単位の PR の集まり**: default branch に統合された PR を全部（`state=closed`、100 件ずつ）読み、`sds-pr` の block の `delivery_plan_binding` が対応表の `plan_id`・`node_id` の物を選ぶ。
5. **PR ごとの事実**: PR（`merged_at`・`base.ref`・`head.sha`・本文）、commit の一覧（古い順、250 件まで。超えれば `unobserved`）、1 つ目の commit の変更 file、review、PR 本文の `sds-pr` の `audit`（`request`・`request_sha256`・`review`）と、その 2 つの comment の本文と編集の履歴。
6. **handoff と写しと設計の記録**: 単位を閉じる PR の handoff（§3.5 の 4 の `unit_done`）、PR の head の `acceptance/_source/` と対応表と設計の記録。
- 読めない（404 以外の失敗・時間切れ・上限）→ その事実は `unobserved`。例外を投げて job を緑にしない（S8）。
- 集め手は事実を 1 つの JSON（`sds-unit-done-facts/1`）にして核に渡す。核はこの JSON だけを読む。

### 3.4 完成検査の項目

| ID | 何を | どう照らすか |
|---|---|---|
| K1 | 試験が全部通る | profile の `facts` の junit の事実が全部あり（§3.3 の 2 の結び付けが通る）、名指した job が `success`。試験は 1 件以上、落ちた・誤り・skip（todo を含む）が 0 |
| K2 | 行の網羅率 80% 以上 | 事実 `coverage` の `exit_code` が 0 で `lines_threshold` が 80 以上、名指した job が `success` |
| K3 | 単位の受入の基準が全部、試験で通る | 写しから単位の受入の基準の集まりを取る（§3.5 の 1・2）。対応表の `acceptance` がその全部に 1 つ以上の試験の名前を挙げ、その試験が K1 の junit に在って pass。対応表に無い AC・junit に無い名前・落ちた試験 → `unmet`（その ID を出す）。対応表に、集まりに無い AC の ID がある → `unmet` |
| K4 | 単位の設計の記録の試験の場合が全部、試験で通る | 設計の記録の集まりは handoff の `unit_done.design_records`（§3.5 の 4）で、空なら `unobserved`。対応表の `design_records` がそれと同じ集まり（足りない・余計 → `unmet`）。各 file の節から場合の ID を取り（§3.5 の 3）、1 つも取れない file があれば `unobserved`。対応表は ID の 1 つずつに、試験の名前（`design_cases`）か、場合でない参照と理由（`design_refs`）のどちらかを挙げる。どちらにも無い ID・理由が空・試験が junit に無い・落ちた → `unmet` |
| K5 | 先に落ちる試験を書いてから作った（TDD） | 対応表の `prs` の PR のうち profile の `code_paths` の file を変えた PR ごとに、1 つ目の commit が (i) profile の `test_paths` の file を 1 つ以上足すか変え、(ii) `test_paths` と `docs/**` 以外の file を変えていない。空の commit・docs だけの commit・試験と code を一緒に変えた commit → `unmet`（番号を出す）。落ちた試験の中身が実装の振る舞いを先に確かめているかは、各 PR の独立の監査が見る（PR 本文に貼る落ちる出力） |
| K6 | 独立の監査が PASS し、統合された | 対応表の `prs` の PR ごとに、(a) `merged_at` があり `base.ref` が default branch。(b) PR 本文の `sds-pr` の `audit` の `request` が同じ PR の comment で、作者が `watchout`（依頼を出す account。門の 5.3u の `RECEIVER` と同じ値）、本文の SHA-256 が `request_sha256` と同じ、本文の 1 つ目の JSON が `sds-audit-request/1`、`reviewer.github` が profile の `auditor_login`、`targets` にこの repo・この PR・統合した head の物がちょうど 1 つ。(c) `audit` の `review` が同じ PR の comment で、作者が `auditor_login`、本文の 1 つ目の JSON が `sds-audit-review/1`、`request_digest` が依頼の SHA-256、`targets` がちょうど 1 つで (b) の target の id と統合した head、`blocking_findings` が空、`items` が 1 つ以上で全部 PASS。(d) 返却の comment の編集の履歴が、無いか、全部 `auditor_login` によるもので、消された版が無く、全部 (e) の Approve より前。(e) `auditor_login` の Approve の review が統合した head に `merged_at` 以前に付いていて、その review は編集されておらず、その後・統合の前に同じ席の changes requested が無い。Approve の本文は読まない（u2 の実装の PR の Approve は文で書かれていて JSON を持たない。例: aun#78）。(c) は門の 5.3u の (f) の `passed`、(d)・(e) の編集の履歴は 5.3u の (j) の `quiet`・`mine` と同じ判断なので、同じ関数を呼ぶ（§5 の PR-1e。S3）。(b) は 5.3u の (e) の `asked`（設計の段だけを認め、checker の版を Approve の JSON と照らす）と照らす物が違うので、K6 の決まりとして持つ。固定 checker（`audit-admission.mjs`）は開いている PR だけを受け付ける（[SH] の 72 行目 `p.state === "open"`）ので、統合済みの PR には当て直さない |
| K7 | 単位の PR が全部対応表にある | §3.3 の 4 で選んだ PR（道筋の node を名指して統合された PR）が全部、対応表の `prs` にある（足りない → `unmet`、番号を出す）。単位を閉じる PR 自身は `prs` に入れない（統合の前なので K6 の (a) を満たせない。その PR の監査は門の判定 1〜3 が見る。入っていれば `unmet`）。`prs` にあって node を名指していない PR は、対応表の `unbound_prs` に理由つきで挙げる（挙げていない・理由が空 → `unmet`）。理由が正しいかは単位を閉じる PR の監査が見る |
| K8 | 見せるもの | 写しの届ける計画の単位の節に「見せるもの」がある時（§3.5 の 5）、対応表の `demo` が 1 つ以上の試験を挙げ、その試験が K1 の junit で pass。`demo` が空・無い試験・落ちた試験 → `unmet`。節に「見せるもの」が無い時は、対応表の `demo` が空でよい（`not_applicable` の印を出す） |
| K9 | 届ける計画の「できた」が全部、照らされる | 写しの届ける計画から、共通の「できた」と単位の条件の項目を全部取り（§3.5 の 5）、§3.5 の 2 のストーリーの条件（`story:<USx.y>`）を足す。単位の条件が 0 なら `unobserved`。対応表の `conditions` は、項目の 1 つずつに、(i) 試験の名前（K1 の junit で pass）、(ii) この表の K の ID（その K が `met`）、(iii) `audit` と理由（機械で照らせない項目。単位を閉じる PR の監査の項目集合がその項目を名指す）のどれかを挙げる。挙げていない項目・理由が空・試験が無い・K が `met` でない → `unmet` |

### 3.5 写しと取り出し

1. **写し**: 配布先の `acceptance/_source/` に、承認済みの AI-DLC の記録 3 つ（stories・story map・届ける計画）を bytes のまま写し、`acceptance/_source/manifest.json`（`sds-unit-done-sources/1`、各 file の `role`・`path`・元の作業場での path・SHA-256）を置く。核は写しの SHA-256 が manifest と同じことを確かめる（違えば K3・K8・K9 は `unobserved`）。写しが Owner の作業場の今の file と同じかは CI から見えないので、写しを足す・変える PR の監査で確かめる（§7）。
2. **単位のストーリーと受入の基準**（AI-DLC 2.11.1 の記録の形。版 2 は aun の書き方 1 つに決め打ちしていた）:
   - story map: 1 行目の欄の名前に `Unit ID` がある表の、1 つ目の欄が `USx.y` の行。`Unit ID` の欄を `;` で区切り、前後の空白を除いた物のどれかが対応表の `unit` と同じ行が、単位のストーリー（AI-DLC 2.11.1 の `units-generation` は 1 つの欄に複数の Unit を `;` で書く形を認める）。
   - stories: `### USx.y` の見出しから、次の `###` 以上の見出しの前までをそのストーリーの節とし、節の中の `ACx.y.z`（そのストーリーと同じ `x.y` で始まる物だけ。前後が英数字でない所で区切る）を全部取る。箇条書きでも表でも同じに取る（aun = 字下げした箇条書き、onza = Given/When/Then の表）。ほかのストーリーの AC を指す文は数えない。
   - **単位が受け持つ AC**: profile の `sources.story_map_ac_column` が欄の名前を名指す時（onza = `その Unit が受け持つ受入の基準`）は、その欄から取る。行の `Unit ID` が 2 つ以上なら、欄の中の `<unit>:` で始まる区切り（区切りは `。` の後の `U<数字>:`）、1 つなら欄の全部。`ACx.y.z` と `ACx.y.a〜ACx.y.b`（同じ `x.y` の番号の範囲。間を全部数える）を取り、どれもそのストーリーの節にあること（無い ID があれば `unobserved`）。区切りに AC の ID が 1 つも無い時は、その区切りの文（前後の空白を除く）を、そのストーリーの**条件**（ID `story:<USx.y>`）として K9 の照らす相手に足す。名指さない時（aun）は、そのストーリーの節の AC が全部その単位の物。
   - 完全さ: 単位のストーリーの 1 つずつに、AC が 1 つ以上あるか、条件が 1 つあること。どちらも無いストーリーがあれば K3 は `unobserved`（そのストーリーの ID を出す）。同じ AC の ID が 2 つのストーリーに出れば `unobserved`。
   - 2026-11-03 に Owner の作業場の今の file で、この決まりのとおり数えた値（arc が手元の script で数えた）: aun U2 = ストーリー 8・AC 36（4 列目の欄は無い。箇条書き）。onza U1 = ストーリー 6・AC 19（US1.1 = 3・US2.1 = 4・US3.1 = 4・US3.2 = 4・US5.1 = 4）と、AC の ID の無い条件 1 つ（US3.3 の「GATE の見分け（U1 では GATE の件は見るだけで答える欄を出さない）」）。監査の席の数え（shirube#90 6599617868）の「AC 27」は 6 ストーリーの AC を全部数えた値（6 + 5 + 5 + 4 + 3 + 4）で、story map の 4 列目が U2・U3・U4・U6 に回した 8 つを含む。4 列目を読まない形（版 2）では、onza U1 はほかの単位の AC の試験を求められて誤って FAIL になる。
3. **設計の場合の ID**: 設計の記録の、profile の `design_cases.section` で始まる見出しの行から、次の同じ深さの見出しの前まで。ID は `design_cases.id_pattern` で、前後が英数字でない所で区切り、同じ ID は 1 つに数える。位置で場合と参照を見分けない（版 1 で u7 の記録で試し、位置の決まりでは場合を 1 つも取れなかった）。取った一覧は出力に必ず出す。
4. **handoff の `unit_done`**: 単位を閉じる PR の handoff（arc が書く。対応表を書く実装の席とは別の作者）に、`unit_done: { design_records: [<path>, ...] }` を置く。K4 の設計の記録の集まりはこれで決まり、対応表の側から増やしも減らしもできない。handoff に `unit_done` が無い・空 → K4 は `unobserved`。
5. **届ける計画の「できた」**: 写しの届ける計画（`bolt-plan.md`）から取る。AI-DLC 2.11.1 はこの file の見出しと欄の名前を決めておらず、aun と onza で違う（aun = `## Bolt u2 u2-exchange-records`・`- **できたと言える条件**:`・`- **見せるもの**:`・共通の「できた」の行あり。onza = `## B1 細い一本（U1）〔walking skeleton〕`・`- **済みの条件**:`・`- **見せる物**:`・共通の行なし）。そこで、読む所の名前は profile の `sources.delivery_plan`（§3.7）に置き、読み方は 1 つにする。
   - 単位の節: `## ` で始まる見出しのうち、`unit_heading`（`{unit}`・`{unit_dir}` を対応表の値に置き換えた文字列）を含む物がちょうど 1 つ。その見出しから次の `## ` の前まで。
   - 欄の項目: 行頭の `- **<名前>`（名前は `dod_labels` か `common_label`）で始まり `**:` を含む行の、`**:` の後の文（空でなければ 1 項目）と、続く字下げした `- ` の行（字下げの無い行の前まで）の 1 行ずつ。
   - 単位の条件: 単位の節の `dod_labels` の欄の項目。ID は `dod-1`〜の順の番号。
   - 共通の「できた」: `common_label` が null でない時、file の中に `common_label` の欄がちょうど 1 つあり、その項目。ID は `common-1`〜の順の番号。null の時は無い。
   - 見せるもの: 単位の節に `demo_labels` の欄があるか（K8）。
   - 項目の文の SHA-256 も取り、対応表の `conditions` の各項目が書く `text_sha256` と同じことを確かめる（違えば、計画が改まったか対応表が古い = `unmet`）。§3.5 の 2 で足したストーリーの条件（`story:<USx.y>`）も同じに扱う。
   - 取り出しの形に合わない（単位の節が無い・2 つある、`common_label` の欄が無い・2 つある、単位の条件が 0）→ K8・K9 は `unobserved`。
   - 2026-11-03 の今の file で数えた値: aun U2 = 共通 5・単位の条件 5・見せるものあり。onza U1 = 共通なし・単位の条件 5・見せる物あり。

### 3.6 判定の決まり

- 各項目は `met`・`unmet`・`unobserved`・`excepted`・`not_applicable`（K8 で計画に見せるものが無い時だけ）のどれか。`unobserved` を `met` に数えない。
- 外れ: 対応表の `exceptions` に、項目の ID・対象（PR の番号か AC・条件の ID）・Owner の決定の ID と URL（`https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-<数字>`）と本文の SHA-256 を書いた物だけ、その対象を `excepted` にする。欄が欠けた外れは無効で、元の答えのまま。Owner の決定が本当にあるかは CI から見えない（iyasaka-arc は非公開）ので、単位を閉じる PR の監査と Owner の exact-head で確かめる。
- 総合: 全部 `met`（K8 は `not_applicable` も可）→ `PASS`。`met` と `excepted` だけ → `PASS_WITH_EXCEPTIONS`。それ以外 → `FAIL`。
- status: `PASS` → `success`（説明 `PASS`）、`PASS_WITH_EXCEPTIONS` → `success`（説明 `PASS_WITH_EXCEPTIONS <件数>`、summary の先頭に外れの一覧）、`FAIL` → `failure`（説明に最初の `unmet`・`unobserved` の項目）、対象外 → `success`、CI 待ち → `pending`。
- 同じ事実の JSON からは同じ答えの bytes（S4）。

### 3.7 profile・対応表・handoff の形

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
  "auditor_login": "iyasaka-ai",
  "sources": {
    "story_map_ac_column": null,
    "delivery_plan": {
      "unit_heading": "{unit_dir}",
      "dod_labels": ["できたと言える条件"],
      "common_label": "どの Bolt にも共通の「できた」",
      "demo_labels": ["見せるもの"]
    }
  }
}
```

- `sources` は承認済みの記録の書き方に合わせて読む所の名前（§3.5 の 2・5）。上は aun の値。onza の値は `story_map_ac_column` = `その Unit が受け持つ受入の基準`、`unit_heading` = `（{unit}）`、`dod_labels` = `["済みの条件"]`、`common_label` = null、`demo_labels` = `["見せる物"]`（各 repo の分の記録が持つ）。名前を変えて照らす相手を小さくすることは、取り出しの完全さ（ストーリーごとに 1 つ以上・単位の条件が 1 つ以上）で止まる所までで、残りは profile を変える PR（保護面 `.shirube/**`、Owner の exact-head）の監査で、監査の席が写しと照らす。

```json
{
  "schema": "sds-unit-done-checklist/2",
  "unit": "U2",
  "unit_dir": "u2-exchange-records",
  "plan_id": "DP-AUN-ROUTE-001",
  "node_id": "<道筋の node の ID>",
  "design_records": ["docs/design/u2-exchange-records.md"],
  "prs": [71, 72],
  "unbound_prs": {"71": "設計の記録の PR（R1）で、道筋の node を名指す前の形"},
  "acceptance": {"AC1.1.1": ["tests/exchange.test.mjs::送った席が記録される"]},
  "design_cases": {"E-1": ["tests/…::…"]},
  "design_refs": {"R-01": "§3 の決まりを指す参照で、場合ではない"},
  "demo": ["tests/integration/…::…"],
  "conditions": {
    "common-1": {"text_sha256": "<64 桁>", "k": "K5"},
    "common-3": {"text_sha256": "<64 桁>", "audit": "設計と実装の食い違いは、各 PR の実装監査の I7 と単位を閉じる PR の監査で見る"},
    "dod-4": {"text_sha256": "<64 桁>", "tests": ["tests/integration/…::旧の code が新しい schema で動く"]}
  },
  "exceptions": [{"item": "K5", "target": "#73", "owner_decision": "OD-…", "url": "https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-…", "sha256": "<64 桁>"}]
}
```

handoff（単位を閉じる PR の control_handoff。今の形に 1 つの欄を足す）:

```yaml
completes_unit: true
plan_binding: {plan_id: DP-AUN-ROUTE-001, node_id: <道筋の node の ID>}
unit_done:
  design_records: [docs/design/u2-exchange-records.md]
```

- 試験の名前は「試験の file の path `::` junit の suite の名前を `::` でつないだ物 `::` 試験の名前」。junit の読み手は Node の組込みの機能だけで書く（新しい外部の依存を足さない）。
- profile の欄が欠けた・形が違う → 対象の PR は全部 `FAIL`（説明 `profile`）。profile が無い配布先で対象の PR が出たら `FAIL`。対応表の `schema` が `sds-unit-done-checklist/2` でない → `FAIL`。

## 4. 試験（作る PR ごとに、ここに書いた場合を全部置く）

どの PR も、1 つ目の commit を試験だけにし、その commit で落ちる出力を PR 本文に貼る。

- 核（T）: T-1 全部 met → `PASS`。T-2 junit に落ちた試験 1 つ → K1 unmet。T-3 skip・todo 1 つ → K1 unmet。T-4 試験 0 件 → K1 unmet。T-5 名指した job が `failure` → K1 unmet。T-6 網羅率の `exit_code` 1・`lines_threshold` 79 → K2 unmet（それぞれ）。T-7 対応表に無い AC → K3 unmet（ID を出す）。T-7b 対応表に、集まりに無い AC → K3 unmet。T-8 対応表の試験の名前が junit に無い → K3 unmet。T-9 設計の場合の ID が対応表に無い・`design_refs` の理由が空 → K4 unmet。T-9b handoff の `design_records` が空・無い → K4 unobserved。T-9c 対応表の `design_records` が handoff より 1 つ少ない・1 つ多い → K4 unmet。T-9d 設計の記録の節から ID が 0 → K4 unobserved。T-10 `code_paths` を変えた PR の 1 つ目の commit が `code_paths` を含む → K5 unmet（番号を出す）。T-10b 1 つ目の commit が docs だけ・空 → K5 unmet。T-10c 1 つ目の commit が試験 1 つだけ → K5 met。T-11 docs だけの PR → K5 の対象外。T-12 K6 の (a)〜(e) の 1 つずつが欠ける → K6 unmet（どれかを出す）。T-12b 返却が監査の席以外の account に編集されている → K6 unmet。T-12c Approve が統合の head と別の head・統合の後 → K6 unmet。T-13 node を名指した PR が `prs` に無い → K7 unmet。`prs` にあって名指していない PR が `unbound_prs` に無い・理由が空 → K7 unmet。T-14 事実が `unobserved` → 総合 `FAIL`。T-15 写しの指紋が manifest と違う → K3・K8・K9 unobserved。T-16 外れ → `excepted`、総合 `PASS_WITH_EXCEPTIONS`。T-17 外れの欄が欠ける → 無効で元の答え。T-18 同じ事実で 2 回 → 答えの bytes が同じ。T-19 計画に見せるものがあり `demo` が空 → K8 unmet。計画に見せるものが無く `demo` が空 → K8 not_applicable で総合 PASS。T-20 計画の条件が対応表の `conditions` に無い → K9 unmet。T-20b `text_sha256` が違う → K9 unmet。T-20c `audit` の理由が空 → K9 unmet。T-20d `k` が指す K が unmet → K9 unmet。核の file に `Date.now`・引数なしの `new Date()`・`Math.random`・`randomUUID`・`node:fs`・`fetch`・`child_process` が無い。
- 見分け（V）: V-1〜V-4 §3.2 の表の 4 つの行。V-5 対応表の `node_id` が PR の `delivery_plan_binding` と違う → FAIL。V-6 handoff が読めない（marker が無い・YAML が壊れている）→ (b) は「なし」でなく `unobserved` で FAIL。
- 取り出し（X）: X-1 aun の写しの形（字下げの箇条書き）で、U2 のストーリー 8・AC 36。X-2 onza の写しの形（Given/When/Then の表、`;` で区切った Unit の欄、4 列目の受け持つ AC の欄）で、U1 のストーリー 6・AC 19 と条件 1 つ（`story:US3.3`）。4 列目で U2・U3・U4・U6 に回した AC（AC1.1.2 ほか 8 つ）を U1 に数えない。X-2b 4 列目の範囲 `AC3.2.1〜AC3.2.4` を 4 つに数える。範囲の端がストーリーの節に無い・`x.y` が違う範囲 → unobserved。X-2c 4 列目の区切りに AC の ID が無い → 条件になり、対応表の `conditions` に無ければ K9 unmet。X-3 story map の欄 `U1; U3` の行が U1 にも U3 にも入る。X-4 1 つのストーリーだけ AC が 0（ほかは取れる）→ K3 unobserved でそのストーリーの ID を出す。X-5 ほかのストーリーの AC を指す文（例: US1.1 の節に `AC2.1.3 を参照`）を US1.1 の AC に数えない。X-6 同じ AC の ID が 2 つのストーリーの節に出る → unobserved。X-7 story map に無いストーリーの AC を取らない。X-8 設計の節の中の ID を全部取り、節の外の ID を取らない。X-9 aun の届ける計画の写しと aun の profile の値から、共通の「できた」5 つと U2 の単位の条件 5 つと「見せるもの」ありを取る。X-9b onza の届ける計画の写しと onza の profile の値から、共通なし・U1 の単位の条件 5 つ・「見せる物」ありを取り、`（U1）` が `（U10）` の見出しに当たらない。X-9c 欄の名前の行に `**:` の後の文がある形（aun の 10/27 の版の書き方）で、その文を 1 項目に数える。X-10 単位の節が無い・2 つ、`common_label` の欄が無い・2 つ、単位の条件が 0 → K8・K9 unobserved。
- CI の集め手（G）: G-1 事実の行を戻して指紋が合う。G-2 同じ名前の行が 2 組・番号の欠け・指紋の違い → unobserved。G-3 偽の API で、run が completed でない → `pending`。G-4 偽の API が 403・500・時間切れ → unobserved（例外で終わらない）。G-5 junit の入れ子の suite の名前を `::` でつなぐ。G-6 同じ head の別の PR の run（`pull_requests` に対象が無い）を選ばない。G-7 試した commit の親が今の base と違う（base が動いた）→ 全部 unobserved。G-8 事実の行の試した commit が job の間で違う → unobserved。G-9 fork の PR → unobserved。G-10 job の結論が success でも check run が failure → unmet。
- PR の集め手（P）: P-1 偽の API で、統合済みの PR の一覧から node を名指した物を選ぶ（100 件を超える頁を含む）。P-2 commit が 250 件を超える → K5 の対象の PR は unobserved。P-3 依頼の本文の指紋が違う・依頼の作者が `watchout` でない・依頼の `reviewer.github` が違う・返却の作者が違う・返却の対象の head が統合の head と違う・返却の target が 2 つ → K6 unmet。P-3b Approve の本文が文だけ（JSON 無し）でも、(a)〜(e) がそろえば K6 met。P-3c 単位を閉じる PR 自身が `prs` にある → K7 unmet。P-4 引数で受ける形にした `passed`・`quiet`・`mine` を 5.3u から今と同じ値で呼び、門の今の試験が全部そのまま通る。
- 出し手（E）: E-1 4,000 文字を超える file が複数行に分かれ、集め手で元に戻る。E-2 空の file・無い file → 出し手が 0 以外で終わる（job が赤になる）。E-3 行に `GITHUB_SHA` の値が入る。
- workflow（W）: 呼出し側が PR の code を checkout しない（試験が workflow の file の文を読む）。再利用の workflow の checkout が `job.workflow_sha`。gh の包みの文が sds-gate.yml の物と同じ。呼出し側の permissions が §3.1 の表のとおり（足りない・余分が無い）。`kit render` が profile の無い配布先に 2 つの file を書かない、ある配布先には書く。
- 実物の workflow で 1 回: 呼出し側は配布先の default branch に入って初めて動く（`pull_request_target` も `workflow_run` も default branch の定義を使う）。shirube には profile が無いので呼出し側も置かれない。そのため PR-2 の統合の前に実物の run は作れず、PR-2 は試験 E・W（workflow と kit の file の文を読む試験）だけで確かめる。実物の run の確かめは、最初の配布先（aun）の導入の PR を統合した後に、その default branch の呼出し側で、試しの draft の PR を使って行う（対象外 → `success`、偽の対応表 → `failure` と最初の unmet、事実の行が名前ごとに 1 組）。必須の検査に足すのは、その確かめが全部通った後（aun の分の記録 §4・§5）。それまで `unit-done` は必須でないので、誤って動いても統合は止まらない。
- 実物の統合済みの PR で 1 回（PR の集め手の PR = PR-1e）: aun#78・#79 に K6 の読み手を当て、(a)〜(e) が全部通ることを PR 本文に示す（版 2 の固定 checker の当て直しは `BLOCKED` = 開いている PR だけ、を shirube#90 6599617868 で監査の席が実測した）。
- 変異: 一覧の実数を PR 本文に書き、等価でない物は全部試験で落とす。等価として分けた物は理由を書く。網羅率は今の CI のまま（`scripts/**` の行 80%）。

## 5. 作る順と PR、Owner の手

PR ごとの見込みの行数（`scripts/**`・`configs/**`・`.github/workflows/**`・`tests/**` の足した行。`tests/fixtures/**` は数えない。上限 400）を下の端〜上の端で書き、上の端が上限を超えないように割った（版 2 は照らしていなかった）。

| PR | 中身 | 見込みの行数（code + 試験） | 区分 | 依存 |
|---|---|---|---|---|
| PR-D | この記録と監査の項目集合を shirube に置く | 0（docs だけ） | R1 | ― |
| PR-1a | `judge.mjs` と試験 T | 150〜170 + 190〜210 = 340〜380 | R2 | PR-D |
| PR-1b | `extract.mjs` のストーリー・story map・単位が受け持つ AC・ストーリーの条件（§3.5 の 2）と試験 X-1〜X-7 | 100〜120 + 130〜150 = 230〜270 | R2 | PR-D |
| PR-1c | `extract.mjs` の届ける計画・設計の場合・写しの指紋（§3.5 の 1・3・5）と試験 X-8〜X-10 | 70〜90 + 90〜110 = 160〜200 | R2 | PR-1b |
| PR-1d | `collect-ci.mjs` と試験 G | 120〜140 + 190〜220 = 310〜360 | R2 | PR-1a |
| PR-1e | `collect-pr.mjs`、`plan-binding.mjs` の handoff の読み手の export、`design-gate.mjs` の `passed`・`quiet`・`mine` を今 Approve の JSON から読んでいる値（依頼の SHA-256・target の id・監査の席の login・Approve の時刻）を引数で受ける形にして export する直し（5.3u は今と同じ値を渡す）と試験 V・P | 120〜150 + 160〜190 = 280〜340 | R2 | PR-1a |
| PR-2 | `main.mjs`、`.github/workflows/unit-done.yml`・`kit/unit-done-caller.yml`・`kit/unit-done-emit.sh`・`kit.mjs` の render の条件・`docs/sds/distribution.md` に完成検査の節、試験 E・W | 100〜130 + 150〜180 = 250〜310 | R4（workflow・kit） | PR-1c・PR-1d・PR-1e |

- file は各 PR で 20 以内、新しい file は 300 行以内（[SH] の hygiene profile）。上の端を超えそうな時は、作る席が作らずに止めて arc に返す。
- own code: 今 2,178 行（shirube#87 6597771127）。次の目標の見込み約 710 行と合わせ、この記録の分は 660〜800 行で、合計の見込みは 3,550〜3,690 行 / 4,000 行。予算は変えない。
- PR-1e が門の file（`plan-binding.mjs`・`design-gate.mjs`）を触るのは、export と、上の 3 つの関数が値を引数で受ける形への直しだけで、門の判定と試験の期待は変えない（門の試験が全部そのまま通ることを PR 本文に書く）。PR-1e の本文には、作る席の手元で読むだけの API を使い、aun#78・#79 に K6 の (a)〜(e) を当てた結果を示す（workflow は要らない）。
- **Owner の手**: PR-2 の exact-head 1 回（workflow を足す保護面。[KIT] の決定 4）。配布先への版上げと必須の検査は aun の分の記録が持つ。shirube 自身が自分の単位にこれを当てる時期は [KIT] の「含まないもの」のとおり別に伺う。

## 6. 採らなかった案

- **aun だけに置いて 3 例目で移す**（版 1）: [KIT] で Owner が最初から Shirube にすると決めた。S2 から外れる所は §9 の deviation_ledger。
- **統合済みの PR に固定 checker（`audit-admission.mjs --review`）を当て直す**（版 2）: 固定 checker は開いている PR だけを受け付ける（[SH] `audit-admission.mjs` の 72 行目、`state === "open"`）。aun#78・#79 に当て直すと `BLOCKED`（shirube#90 6599617868 の実測）。固定 checker は変えない決まりなので、統合の時の監査の記録（依頼・返却・編集の履歴・Approve）を読み直す 5.3u の読み手を使う。
- **監査席の Approve の本文の JSON を読む（5.3u の (d) をそのまま使う）**: 設計の PR の Approve は JSON の block を持つが、u2 の実装の PR の Approve（例: aun#78）は文で書かれていて、依頼の URL を持たない。Approve は「統合した head に付いているか」だけを見て、依頼と返却は PR 本文の `sds-pr` の `audit` から読む。
- **照らす相手の集まりを対応表から取る**（版 2）: 対応表を書く人が集まりを小さくすれば通ってしまう。受入の基準・できた・見せるものは承認済みの記録の写しから、設計の記録は arc が書く handoff から取る。
- **ストーリーの AC を全部その単位に数える**（版 3 の最初の案）: onza の story map は 4 列目で 1 つのストーリーの AC を Unit ごとに分けていて、U1 にほかの単位の AC の試験を求めることになる（§3.5 の 2）。
- **届ける計画の見出しと欄の名前を決め打ちにする**: aun と onza で書き方が違い、AI-DLC 2.11.1 も決めていない。名前は profile に置き、読み方を 1 つにした。
- **再利用の workflow が PR の code を checkout して試験を自分で流す**: 試験の command・PostgreSQL などの service が repo ごとに違い、判定の側に repo の知識が入る（S3）。PR の code を判定の job で動かす形にもなる。
- **試験の結果を actions の artifact で渡す**: `actions/upload-artifact` は今どの配布先の CI も使っておらず、新しい外部の依存（Owner の決定）になる。job の log は門が既に API で読んでいる（[SH] `sds-gate.yml` の log の読み直し）ので、log の事実の行にした。
- **完成検査を門（sds-gate）の判定 7 にする**: 門は PR ごとに CI を待たずに走り、試験の結果を持たない。CI の後に走る別の status にした。門の判定の決まりの文も変えずに済む。
- **LLM に判定させる**: OI-LLM-CONTROL-BY-SCRIPT-MECHANISM-HOOK-MUST に反する。
- **AC の ID を試験の名前に入れる決まりにして対応表を無くす**: 今ある試験の名前を全部変えることになる。対応表なら今の試験のままで、抜けは K3 が見つける。

## 7. 秘密・権限・既知の弱み

- 判定の job は §3.1 の表の権限だけを持ち、同じ repo だけを読む。新しい資格情報は足さない。PR の code は動かさない。
- 事実の行は、配布先の CI の job（PR の code の試験）の log から読む。PR が CI の workflow を書き換えれば事実を偽れるが、その PR は `.github/workflows/**` を変えるので門で effective R4 になり、統合の前に Owner の exact-head が要る。試験の出力が事実の行をまねても、本物の行と 2 組になって `unobserved` になる。
- CI の後に base が動くと、事実は `unobserved` になり、CI を流し直すまで単位を閉じる PR は通らない（追従待ちで止めない保護の設定のままでも、完成検査は古い base の試験の結果を使わない）。
- 統合した席が作者と別かは CI から見えない（席はどれも同じ GitHub の account で統合する）。K6 は監査の席の返却と Approve で見て、統合の席の別は branch protection と統合の決まり（T129）に任せる。
- 写しが Owner の作業場の今の file と同じかは CI から見えない。写しを足す・変える PR の監査で、監査の席が作業場の file の SHA-256 と照らす。
- 設計の記録の集まりは arc が handoff に書く。arc が書き漏らした設計の記録は K4 では見つからず、単位を閉じる PR の監査（設計の記録の一覧と handoff を照らす項目）で見る。
- 対応表が挙げた試験・`audit` の理由が条件の中身を本当に確かめているかは見ない（PR ごとの監査と、単位を閉じる PR の監査で見る）。

## 8. 予算と目安の時間

[UT] の決まり: 実績の表 版 2（iyasaka-arc#53 6591144308）は 1 本あたり約 1.4 時間。PR 7 本 = 9.8 時間。arc の見積もり 10 時間（取り出しの PR を 2 本に分けた分、監査の往復が 1 回増える）。目安は中間値の **9.9 時間**（作る時間。Owner を待つ時間は別に数える）。

## 9. deviation_ledger

| 規格 | 採った判断 | 採らなかった代替 |
|---|---|---|
| S2（抽象は 3 例目） | Owner の決定 [KIT] で、2 例目の前から Shirube の共通の部品として作る | aun に置き、3 例目（onza か shirube の単位）で移す（版 1） |

## 10. 版 3 で直した所（事前の設計監査 1 回目 = shirube#90 6599617868 の指摘）

| 指摘 | 直した所 |
|---|---|
| BF-UDC-01 K6 が統合済みの PR に固定 checker を当て直す形で、checker は開いている PR だけを受け付けるので必ず通らない | K6 を、PR 本文の `audit` の依頼と返却の comment を読み直して照らし、編集の履歴と、統合した head への Approve を見る形にした（門の 5.3u の (e)・(f)・(j) の読み手を、依頼の段を引数にして使う）。固定 checker は当て直さない（§3.4・§6）。実物の aun#78・#79 で通ることを PR の集め手の PR に示す（§4） |
| BF-UDC-02 権限の一覧に `checks: read` が無い | §3.1 に API ごとの権限の表を置き、sds-gate の呼出し側と同じ組み合わせ（`checks: read` を含む）にした。試験 W が呼出し側の permissions と表を照らす |
| BF-UDC-03 CI の run の選び方が PR・base・試した commit に結び付いていない | §3.3 の 1・2: run は `pull_requests` に対象の PR があり、同じ repo の物だけ。事実の行に試した commit を書き、その親が今の base と head と同じことを確かめる（違えば unobserved）。試験 G-6〜G-10 |
| BF-UDC-04 AC の取り出しが aun の書き方 1 つに決め打ちで、`;` で区切った Unit の欄と表の AC を読めない | §3.5 の 2: Unit の欄を `;` で区切り、ストーリーの節の中のそのストーリーの AC の ID を、箇条書きでも表でも取る。story map が Unit ごとの受け持つ AC の欄を持つ時は、その欄の単位の区切りから取る（範囲を展開し、ID の無い区切りはストーリーの条件として K9 で照らす）。ストーリーごとに AC 1 つ以上か条件 1 つを求める（どちらも無ければ unobserved）。onza U1 = ストーリー 6・AC 19・条件 1 を試験 X-2 に（監査の席の 27 は 4 列目を読まない数で、ほかの単位の AC 8 つを含む） |
| BF-UDC-05 K5 が docs だけの 1 つ目の commit を通す | K5 の (i): 1 つ目の commit が `test_paths` の file を 1 つ以上足すか変えることを求める。試験 T-10b・T-10c |
| BF-UDC-06 照らす相手の集まりが対応表の側だけで、空の配列・取り出し 0・届ける計画の「できた」を見ない | 設計の記録の集まりを arc が書く handoff の `unit_done` から取る（§3.5 の 4）。空・ID 0 は unobserved。届ける計画の共通の「できた」と単位の「できたと言える条件」を全部取り、K9 で対応表の `conditions` と照らす（§3.5 の 5）。見せるものは計画にある時に `demo` を必須にした（K8）。対応表の形を `sds-unit-done-checklist/2` にした |
| aun の分の BF-UDA-01（同じ種類が芯にもあった）新しい workflow を default branch に入れる前に、その実物の run を求めていた | §4 の「実物の workflow で 1 回」を、最初の配布先の導入の PR を統合した後に、その default branch の呼出し側で確かめる形にした。PR-2 は試験 E・W だけで確かめる。必須の検査に足すのはその確かめの後（aun の分の記録） |
| 同じ種類の所（arc が見直した） | (0) 実物の写しで取り出しを試し、onza の story map の 4 列目（Unit ごとの受け持つ AC）と、届ける計画の書き方の違い（見出し・欄の名前・共通の行の有無）を見つけて §3.5 の 2・5 と profile の `sources` に入れた（onza U1 = AC 19 と条件 1。監査の席の 27 は 4 列目を読まない数）。(1) K3 も、対応表に集まりに無い AC がある時に unmet にした（T-7b）。(2) PR の割り方を、PR ごとの見込みの行数（下の端〜上の端）と上限 400 で照らし、版 2 の PR-1a・PR-1b の 2 本を、取り出しの 2 本を含む 5 本に分けた（§5）。(3) 写しの指紋の違いは K8・K9 にも効くようにした。(4) 対応表の `text_sha256` で、計画が改まった後の古い対応表を止める |
