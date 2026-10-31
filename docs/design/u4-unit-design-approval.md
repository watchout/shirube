# Shirube U4 の続き — 作る単位の設計の承認を、門が機械で確かめる（設計の記録）

版 1（2026-10-31）。設計の作者 = arc。作る席 = shirube の席、監査 = devauditor、統合 = suite-lead。

適用 ID:
- OD-SHIRUBE-U4-CONTINUATION-DESIGN-APPROVAL-CHECK-START-20261031-001（[iyasaka-arc#49 6540758548](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6540758548)、本文 SHA-256 `d3fc3353e1beda01ad93a453cfd81fb6b49216070b7f9cc981e09a9ec6634a8b`。U4 の続きを今から作る。以下 [U4C]）
- OD-SHIRUBE-U4-PATH-CHECK-FIRST-UNIT-DESIGN-APPROVAL-NEXT-UNIT-20261029-001（[iyasaka-arc#49 6481509642](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6481509642)、本文 SHA-256 `3167a28237b09da288390c4fb7fe0cc47fde3a598c1dbeed430a4a13545c2d34`。作る単位の設計の承認の機械の確かめを次の作業の単位に回した。以下 [U4A]）
- OD-SHIRUBE-NEXT-VERSION-START-U4-20261028-001（[iyasaka-arc#49 6463776044](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6463776044)、本文 SHA-256 `b0cd543f8198be0da69ebc00e378df94578b4c7056f7deb5cc84e104d64d3d14`。以下 [NV]）
- OD-KIT-UPGRADE-STANDING-AND-INCEPTION-WHILE-WAITING-20261021-001（[iyasaka-arc#49 6308341298](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308341298)、本文 SHA-256 `d2d1a8e4da93411d6baa1cca8ef2338d6b9822db15eb43489b9d3dabeb43bf94`。kit の版上げの PR の決まり。以下 [KIT]）
- OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（#49 6336035707。止める判定に LLM を使わない、門の FAIL は devauditor が分類する）

入力: shirube main `5bccc25d37411488735012cc0a243b08604d22b4` の `scripts/sds/gate.mjs`・`scripts/sds/design-gate.mjs`・`scripts/hygiene/audit-admission.mjs`・`.github/workflows/sds-gate.yml`・`.github/workflows/sds-gate-self.yml`・`kit/sds-gate-caller.yml`・`docs/sds/distribution.md`・`docs/design/sds-gate-judgment-5.md`・`docs/design/u4-gate-judgements.md`（U4 の設計の記録 版 4。以下 [U4]）。以下 [M]。GitHub の実物の観測（§2 の [OBS]）。要件: aidlc-shirube の取り組み `261021-dev-speedup-automation` の要件 FR6.1・FR6.2・FR7.3。以下 [REQ]。

## 1. 目的と対象外

**目的**（[REQ] の FR6.1 のうち、[U4A] で次の作業の単位に回した部分。[U4C] の 1）: PR の `design_binding` が `approval.kind: "unit_design"` の設計（作る単位の設計の記録）を名指す時、門の判定 5 が、その設計の版が独立の設計監査を通って統合されたことを機械で確かめる。当たらない時、または確かめられない時は FAIL（最初は記録だけ。pin の `design_binding_mode` は `report-only` のまま）。全部通れば `design_binding.result` は PASS になる（U4 の `NOT_CHECKED` をやめる）。

門は形だけを見る。設計が良いか（意味）は、今までどおり独立の監査と受入の試験で見る（[REQ] の FR6.2）。止める判定に LLM を使わない。

**対象外**: 判定 5 を止める形にすること（repo ごとに Owner が決める、[REQ] の FR7.3）、判定 1〜4 の決まり、固定の checker（`audit-admission.mjs`）、Owner の決定で承認する設計（`kind` 無し・`owner_decision`）の 5.3・5.4、required checks・branch protection、計測の部品（U2）・U3・U7・承認の記録の作り手（I1〜I4・K）・S2 のセキュリティの制御（[U4C] の含まないもの）。

### 1.1 要件との関係

- [U4] §1.1 の表で「次の作業の単位（U4 の続き）に移す」とした FR6.1（承認）の作る単位の設計の部分と、受入の正例（作る単位の設計が承認済みかつ置き場の中なら PASS）を、この作業の単位で満たす。
- 要件の記録（aidlc-shirube の `requirements.md` の FR6.1 と受入の例）を合わせる段取りは [U4] §5 の 0b と同じで、次の版の範囲・要件の段を aidlc-shirube で開き直す時に、[U4] §1.1 の表と、この記録で満たした行を一緒に書き換える（[NV] の 3）。書き換えるまでの正本は [U4A] と [U4C]（control source）。

## 2. 今の形（[M] と [OBS]）

- 判定 5 は、`approval.kind` が `unit_design` の時、承認を確かめず `5.3u NOT_CHECKED: the approval of a unit design is checked by the merging seat, not by the gate` を出し、`design_binding.result` を FAIL か `NOT_CHECKED` にする（PASS にしない）。`design_pr` は読まずに JSON に写すだけ（`gate.mjs` の `approvalOf`・`outcome`、`design-gate.mjs` の `designGate`）。
- 承認の確かめは、統合する席が統合の直前に手で行う（`distribution.md` 117 行の (1a)〜(1d): `design_pr` の統合・`design_pr` の block の `audit` の返却が PASS で作者の受領がある・依頼が `design_pr` と統合した head を名指す・その head の設計の file の SHA-256 が今の PR の `design_sha256` と同じ）。作る単位の設計の記録の PR は R1 で、`audit` を block に書いてから統合する（同 122 行）。
- 判定 3（監査の受領）は R2 以上だけを見る（`gate.mjs` の `audited`）。R1 の設計の記録の PR の監査は、門は確かめない。
- 門は、呼出し側の job（kit の caller も shirube の自己用の caller も job 名は `sds-gate`）が呼ぶ再利用の workflow `watchout/shirube/.github/workflows/sds-gate.yml@<commit>` の job `sds-gate` として動く。GitHub Actions の check run の名前は `sds-gate / sds-gate`、app は `github-actions`。結果の JSON を job の log に 1 行で出し（`echo "$result"`）、`GITHUB_TOKEN` で commit status `sds-gate` を付ける（`sds-gate.yml`）。
- 呼出し側は `pull_request_target` と `issue_comment` で動き、どちらも定義を default branch から読む。PR が workflow を書き換えても、その PR の門には効かない（`sds-gate.yml` の冒頭の (a)）。呼出し側は `actions: read`・`checks: read` を持つ（`kit/sds-gate-caller.yml`・`sds-gate-self.yml`）。
- commit status は、`statuses: write` を持つどの token・workflow でも付けられる（`sds-gate.yml` の冒頭の (b)）。GitHub Actions の job の check run は、Actions だけが作る。
- **[OBS] 統合の後の再実行**: 統合した PR に comment が付くと、呼出し側が `issue_comment` で門を動かし直し、固定の checker が閉じた PR を拒むので必ず FAIL になる。aun#68（head `3bb8384d94626a03a3b8130b0ffe69347e72b0f4`、統合 2026-10-30T04:55:44Z）では、統合の前の実行（check run `123899291378`、開始 04:54:41Z、success、log の JSON は `verdict: PASS`・`head` = 上の head・`effective_risk: R4`）の後に、統合の後の実行（check run `123900271280`、開始 04:58:16Z、failure、`reason: PR head/base/state changed`）がある。check runs の既定の一覧（`filter=latest`）は後者だけを返す。だから「最新の実行」は統合の時の状態を表さない。
- **[OBS] 実行の素性**: check run の id は Actions の job の id で、`GET /repos/{repo}/actions/jobs/{id}` が `run_id`・`head_sha`・`started_at`・`conclusion` を、`GET /repos/{repo}/actions/runs/{run_id}` が `event`（例 `pull_request_target`）・`path`（呼出し側の file）・`referenced_workflows`（例 `[{"path": "watchout/shirube/.github/workflows/sds-gate.yml@6847393a…", "sha": "6847393a…"}]`）を返し、`GET /repos/{repo}/actions/runs/{run_id}/jobs` がその run の job の一覧を返す（aun の run `41005479383` で確かめた）。
- **[OBS] `issue_comment` の実行は PR の head の check runs に出ない**: `issue_comment` で動いた実行は default branch の commit で動くので、Actions の job（check run）は default branch の commit に付き、PR の head（H）の check runs には出ない。門がその実行の中で H に付ける commit status `sds-gate`（`target_url` = その run の URL）だけが、H からその実行を指す。aun#68 の H では、commit status `sds-gate` が 9 個（9 つの run を指す）、check runs `sds-gate / sds-gate` が 7 個（6 つの run と、取り消された 1 つ）で、status だけが指す 3 つの run（`41005031607`・`41004706117`・`41003989794`）は、どれも `event: issue_comment`・`head_sha` = default branch の commit `f6ab9daf`・`referenced_workflows` = shirube の `sds-gate.yml@6847393a…`、job の名前は `sds-gate / sds-gate` だった。だから check runs だけを見ると、`issue_comment` で動いた実行（監査の返却の comment の後の実行など）を取りこぼす。
- commit status は消せない（GitHub に status を消す API は無い）。偽の status は足せるが、門の実行が付けた status は残る。

## 3. 作る物

### 3.1 作る単位の設計の記録の PR は R2 以上にする（規範の変更）

- 作る単位の設計の記録（`sds-design` の block の `approval.kind` が `unit_design`）を足す・改める PR は、docs だけでも `risk:R2` 以上の label を付ける。すると判定 3 が、その PR の head で監査の受領（固定の checker の `--review` が `RECEIPT_ACCEPTED` = 返却が PASS で必須の指摘 0、作者の受領あり、依頼がその PR とその head を名指す）を確かめ、門の実行の記録（job の log の JSON）に残る。
- block の `audit` 欄（`request`・`request_sha256`・`review`）は、判定 3 が今までどおり読む（R2 以上に求める欄と同じ）。`distribution.md` 122 行の「（R1）」と「(1b) が読む」を改める。
- 門の code（判定 1〜3）は変えない。R1 の label で統合した設計を後の PR が名指すと、§3.2 の (f) で FAIL になる（抜けは機械で見つかる）。

### 3.2 5.3u の確かめ（門）

`approval.kind` が `unit_design` の時、門は 5.3・5.4 の代わりに次の (a)〜(f) を確かめる。読むのは GitHub API の GET だけ（PR・contents・check runs・commit status・Actions の run・run の job の一覧・job の log）。PR の code は checkout も実行もしない。

- (a) `design_ref` の repo が、今の PR の repo と同じ（`design_pr` は同じ repo の PR の番号）。
- (b) `design_pr` の PR が統合済み（`merged_at` がある）。その `head.sha` を H、`merged_at` を T とする。
- (c) `design_ref` の path の file を H で読み、bytes の SHA-256 が今の PR の `design_sha256` と同じ（名指す設計の版が、その PR で統合された bytes である）。
- (d) 門の実行の候補を集める。(d1) H の check runs を `filter=all` で全頁読み、app が `github-actions`、名前が ` / sds-gate` で終わる物の job の `run_id`。(d2) H の commit status を全頁読み、`context` が `sds-gate` で `target_url` が `https://github.com/<今の repo>/actions/runs/<数字>` の物の run の id（`issue_comment` で動いた実行は (d2) でしか見つからない、[OBS]）。(d1) と (d2) の和を候補とする（同じ run は 1 つに数える）。
- (e) 候補の run ごとに、run の `event` が `pull_request_target` か `issue_comment`（定義は default branch から）で、`referenced_workflows` に `watchout/shirube/.github/workflows/sds-gate.yml@<40 桁の commit>` があり、その run の job の一覧に、名前が ` / sds-gate` で終わる job がちょうど 1 つあって `status` が `completed`、`conclusion` が `success` か `failure`、`started_at` ≤ T の物だけを残す。`cancelled`・`skipped` などは数えない。T より後に始まった実行は、閉じた PR を判定するので見ない（[OBS]）。素性が合わない run は数えない（偽の status が指す run を含む）。
- (f) 残った run を job の `started_at` の新しい順に見る。job の log の門の結果の行（行の先頭の時刻の後が `{"check":"sds-gate"` で始まる行）がちょうど 1 つでなければ、その時点で FAIL（最後の実行の結果が読めないので、古い実行に戻らない）。その JSON の `head` が H でなければ、ほかの PR を判定した実行なので数えず、次の run を見る。`head` が H の最初の 1 つを R とする。R が無ければ FAIL。R の job の `conclusion` が `success` で、R の JSON の `verdict` が `PASS`、`effective_risk` が `R2`・`R3`・`R4` のどれか（判定 3 が監査の受領を確かめた）でなければ FAIL。
- 偽の status は候補を足せるだけで、門の実行の結果を作れない（log の JSON は門の実行だけが書く）。消せない status と Actions が作る check run から、統合の前の最後の本物の実行を選ぶので、偽の status で後の FAIL を隠すこともできない。

- (a)〜(f) が全部通れば 5.3u は失敗を出さない。ほかの確かめ（5.1・5.2・5.5〜5.9）も通れば `design_binding.result` は PASS。
- 1 つでも当たらなければ FAIL（reason `5.3u <何が当たらないか>`。例: `5.3u design_pr 12 is not merged`、`5.3u no sds-gate run of watchout/shirube/.github/workflows/sds-gate.yml on <H> started before the merge`、`5.3u the last sds-gate run before the merge did not pass at R2 or above`）。
- 読めない時（API の失敗、log の保存期間切れを含む）は FAIL（`5.0a` と同じく `NOT_CHECKED` にしない、S8）。
- 段階は今のまま（`report-only` は全体の verdict を変えない、`blocking` は FAIL で止める）。
- 門は `design_pr` に固定の checker を当てない（統合した PR は開いていないので、checker は必ず拒む。[U4] §6 の 3）。監査の判断は、設計の PR の head で、その時に判定 3 として 1 回だけ行われたものを読む（判断を 2 か所に持たない、S3）。

### 3.3 読み取りと判断の分け方（S4）

- `gate.mjs` が材料を読む: `design_pr` の PR（`merged_at`・`head.sha`）、H での設計の file の bytes、H の check runs の一覧と commit status の一覧（どちらも全頁）、候補の run とその job の一覧、(f) で見る job の log の文字列。log は新しい順に、R が決まるか FAIL になるまでだけ読む。
- 判断は `design-gate.mjs` の純粋な関数が行う: 候補の集め方（(d)）、素性と時刻での絞り込み（(e)）、R の選び方と照合（(f)）、(a)〜(c) の照合。時刻・環境・網を読まない（T と `started_at` は API の値を比べるだけ）。`designGate` の入力に、この材料を 1 つの欄（例 `unitEvidence`）で足す。log を順に読む所は、`gate.mjs` が純粋な関数に「次に読む run」を尋ね、読んだ log を渡して答えを受ける形にする（読み取りと判断を混ぜない）。
- 材料を読む前に (a) と (b) が当たらなければ、それより後の読み取りはしない（読まない物は判断にも使わない）。

### 3.4 統合する席の手順（`distribution.md` 117 行）

- `unit_design` の時の (1a)〜(1d) の手での照合を、「門の JSON の `design_binding` を読み、5.3u の失敗が無く `result` が PASS であること」に替える（判断を門の 1 か所にする、S3）。判定 5 が `report-only` の間は、merge 担当が merge の直前にこれを確かめ、FAIL なら merge しない（作者に戻す。設計の版が承認を持たない時は、設計の PR を R2 で監査し直して新しい版にする）。`blocking` の後は門が止める。
- 117 行の「5.3u は門の段階に関わらず承認を確かめないので、判定 5 が blocking になってもこの確かめは続く」は、門が確かめるようになるので消す。

### 3.5 変えない物

block の形（`approval` は `{ "kind": "unit_design" }` だけ）、PR の `design_binding` の `design_pr`、Owner の決定で承認する設計の 5.3・5.4、判定 1〜4、固定の checker、workflow の file（再利用の workflow・呼出し側）、pin の mode。

### 3.6 置き方

| file | 中身 |
|---|---|
| `scripts/sds/design-gate.mjs` | 5.3u の照合（§3.2 の (a)〜(f) の判断と R の選び方）。`unit_design` の時の `NOT_CHECKED` をやめる。時刻・環境・網を読まない |
| `scripts/sds/gate.mjs` | `unit_design` の時の材料の読み取り（§3.3）。check runs は頁を全部読む（`files` と同じ形） |
| `docs/sds/distribution.md`・`docs/design/sds-gate-judgment-5.md` | §4 の判定 5 の行の 5.3u、117 行の統合する席の手順（§3.4）、122 行の作る単位の設計の記録の PR を R2 以上に（§3.1）、§8 の手順の項。**判定の規範の変更なので risk R3**（§5 の 1） |
| `templates/PULL_REQUEST_TEMPLATE.md` | 判定 5 の説明の文の「作る単位の設計の PR は R1 で `audit` を書く」を「R2 以上の label を付け、判定 3 の監査を通す」に |
| 試験 | §4 |

実装の PR（R2）は保護面（`.github/**`・`.shirube/**`）に触れず、規範の文書も変えない（R3 の PR で先に変える）。

## 4. 試験

| # | 場合 | 期待 |
|---|---|---|
| T1 | 正例: `design_pr` が統合済み、H の file が `design_sha256` と同じ、統合の前の実行が 1 つ（`pull_request_target`、shirube の再利用の workflow、success、JSON は PASS・head H・R2）、統合の後の失敗の実行も 1 つ | 5.3u は失敗を出さず、ほかも通れば `result` = PASS。**今の本体では `NOT_CHECKED`**（Red → Green） |
| T2 | `design_pr` が統合されていない | FAIL `5.3u` |
| T3 | H の file の SHA-256 が `design_sha256` と違う | FAIL `5.3u` |
| T4 | 当たる実行が 1 つも無い | FAIL `5.3u` |
| T5 | 統合の後に始まった実行だけがある | FAIL `5.3u`（統合の後の実行は見ない） |
| T6 | 統合の前の最後の実行が failure（その前に success がある） | FAIL `5.3u` |
| T7 | 統合の前の最後が cancelled、その前が success | cancelled を数えず、success の実行で判断する |
| T8 | 名前は合うが app が `github-actions` でない check run | 候補に入れない（ほかに無ければ FAIL） |
| T9 | 候補の run の `event` が `pull_request` | 数えない（ほかに無ければ FAIL） |
| T10 | 候補の run の `referenced_workflows` に shirube の `sds-gate.yml` が無い | 数えない（ほかに無ければ FAIL） |
| T11 | R の log の JSON の `effective_risk` が `R1`（R1 の label で統合した設計） | FAIL `5.3u` |
| T12 | R の log の JSON の `head` が H でない | FAIL `5.3u` |
| T13 | R の log に門の結果の行が 2 行 | FAIL `5.3u` |
| T14 | 読み取りの失敗（PR・file・check runs・commit status・run・job の一覧・log のどれか）、log の保存期間切れ | FAIL（`NOT_CHECKED` にしない） |
| T15 | `design_ref` の repo が今の PR の repo と違う | FAIL `5.3u` |
| T16 | 当たる実行が check runs・commit status の 2 頁目にある | 見つけて判断する |
| T17 | (a)・(b) が当たらない時、それより後の材料を読まない | 呼ばれたら失敗する偽物の口を渡しても、FAIL の reason が (a)・(b) |
| T24 | 統合の前の最後の実行が `issue_comment` で動いた PASS（H の check runs には無く、commit status だけが指す。[OBS] の形）で、その前の `pull_request_target` の実行は FAIL | (d2) で見つけ、R = その PASS の実行。ほかも通れば PASS |
| T25 | 統合の前の最後の実行が `issue_comment` で動いた FAIL で、その前の `pull_request_target` の実行は PASS | FAIL `5.3u`（check runs だけを見ると PASS に見える場合の負例） |
| T26 | 偽の status が、ほかの PR を判定した本物の run（JSON の `head` が H でない）を指す | その run は数えず、次の run で判断する |
| T27 | 偽の status が、H の古い PASS の run を指し、その後に H の本物の FAIL の run がある | FAIL `5.3u`（started_at の新しい本物の FAIL が R） |
| T28 | 偽の status が、素性の合わない run（`event: pull_request`、または shirube の `sds-gate.yml` を呼んでいない）を指す | 数えない |
| T29 | 絞り込んだ後の最新の run の log に門の結果の行が無い | FAIL `5.3u`（古い run に戻らない） |
| T18 | `kind` が無い・`owner_decision` | 今の 5.3・5.4 の試験がそのまま通る |
| T19 | `report-only` で 5.3u が FAIL / `blocking` で 5.3u が FAIL | 前者は門が止まらず FAIL を記録、後者は止まる（今の判定 5 と同じ） |
| T20 | `design-gate.mjs` が時刻・環境・網を読まない | import が `node:crypto` だけのまま（今の試験の形） |
| T21 | 門が `design_pr` に固定の checker を当てない | checker の口を呼ばれたら失敗する偽物にしても通る（[U4] の T12 を、この形に置き換える） |
| T22 | 文書の試験 | R3 の PR の `distribution.md` に、作る単位の設計の PR が R2 以上であることと、統合する席が門の JSON の 5.3u を読む手順がある（`tests/workflow-contract.test.mjs` と同じ形の文の照合） |
| T23 | 今の判定 1〜5 と kit の試験 | 全部通る。ただし [U4] の T8・T10（`unit_design` は常に `NOT_CHECKED`）の期待は、この設計の目的どおり T1・T4〜T6 の形に置き換える（弱めるのではなく、確かめる形に替える。置き換えた試験の名前を PR 本文に並べる） |

## 5. 作る順と PR、Owner の手

| 順 | PR | 区分 | 中身 | Owner の手 |
|---|---|---|---|---|
| 0 | この設計の記録（docs だけ） | R1 | この file と項目集合 | 無し（事前の設計監査） |
| 0b | aidlc-shirube の要件の記録を合わせる | ― | §1.1 のとおり、[U4] §5 の 0b と一緒に書き換える | 要約の確認と段の承認（AI-DLC の会話の手。下の 2 回とは別に数える） |
| 1 | 判定 5 の規範の改版 | R3 | `distribution.md` の §4 の判定 5 の行（5.3u）、117 行（§3.4）、122 行（§3.1）、§8 の手順の項、`sds-gate-judgment-5.md` の書き足し、PR の雛形の文。T22 | **exact-head 1 回**（R3。[U4C] の 2） |
| 2 | U4 の続きの実装 | R2 | §3.2〜§3.3、T1〜T21・T23〜T29 | 無し（1 の統合の後） |
| 3 | shirube 自身の版上げ | R4（保護面） | 自己用の caller の `uses` の commit と pin の `sds_commit`・`files` の指紋を、2 の統合 commit に一緒に上げる（[U4] §5 の 3 と同じ手順、kit は使わない） | **exact-head 1 回**（`.github/**`・`.shirube/**`） |
| 4 | aun の版上げ | ― | 2 以降の kit で `kit.mjs upgrade --target <aun>`。差分は kit の file だけ、kit check OK、pin の 2 つの mode と `delivery_plan` が前と同じ | 無し（[KIT]） |

- Owner の手は 2 回（1 の R3 と 3 の R4）。0b は別に数える。
- 1 の確かめ: R3 の事前の設計監査は、この記録（0）の監査が兼ねる（1 はこの記録の §3 を文書に写す PR）。1 の実装監査で、写した文がこの記録と食い違わないことを見る。
- 3 の確かめ: 統合の後、次の shirube の PR の `sds-gate-self` の実行が新しい commit を呼んだことと、`design_binding` の 5.3u の出方を読み戻して #24 に書く。
- 4 の確かめ: aun の最初の `unit_design` の PR（aun の u1 の設計の記録の次の改版。R2 で監査して統合し、その後の実装の PR が名指す）で、5.3u が PASS になることを読み戻す。

見積もり: 2 は code 約 65 行（`gate.mjs` の材料の読み取り 約 35、`design-gate.mjs` の照合 約 30）・試験 約 280 行。追加 400 行・20 file の内。新しい外部の依存は無い。判定 5 の内訳の予算（250 行、OD-SHIRUBE-GATE5-BUDGET-150-TO-250-20261030-001）の残りを作る席が `git diff --numstat` で測り、超える見込みなら作る前に止めて arc に返す（arc が Owner に伺う）。

## 6. 採らなかった案

1. **統合の後の最新の実行を読む**: 統合した PR への comment で門が動き直し、必ず FAIL になる（[OBS]）。統合の時の状態を表さない。
2. **commit status `sds-gate` を読む**: `statuses: write` を持つどの token・workflow でも付けられる。PR が足した workflow でも付けられる（`sds-gate.yml` の冒頭の (b)）。
3. **設計の PR の監査の返却を、門が読み直して照らす**: 固定の checker の判断を門に写すことになり、判断が 2 か所になる（S3）。checker は開いた PR しか受けない。comment は統合の後にも編集・削除できる。
4. **固定の checker を、統合した PR も受けるように変える**: 全 repo の監査の受付の道具の改造で、`verifier_sha256` が変わる。この作業の単位の範囲を越える（[U4] §6 の 3）。
5. **devauditor に PR の review（APPROVE）を付けてもらい、それを読む**: 監査の返却の形（`sds-audit-review/1` の comment）と監査席の手順を変えることになる。
6. **branch protection の required check を承認の証とする**: repo ごとに設定が違う（aun は門を必須にしていない）、管理者は越えられる、status は偽れる。
7. **label に依らず、`unit_design` の block を足す PR を門の code で実効 R2 にする**: 判定 3 の code の範囲を変えることになる。label を R2 にする決まり（§3.1）なら、門の code の変更は 5.3u の読み取りだけで済み、R1 で統合した設計は後の PR の (f) で機械が見つける。
8. **check run の名前を完全一致（`sds-gate / sds-gate`）で選ぶ**: 呼出し側の job 名に依る点は同じで、` / sds-gate` で終わる形の方が、再利用の workflow の job 名（`sds-gate`）だけに依る。名前で拾った後に (e) で素性を確かめる。
9. **H の check runs だけを候補にする**: `issue_comment` で動いた実行は default branch の commit に付き、H の check runs に出ない（[OBS]）。監査の返却や受領の comment の後の実行を取りこぼし、統合の前の最後の実行を誤る（T24・T25）。
10. **H の commit status の最新の 1 つだけを見る**: status は偽れるので、偽の status で本物の最後の実行を隠せる。status は run を探す手がかりにだけ使い、選ぶのは run と log の本物の記録で行う（T27）。

## 7. 秘密・権限・復旧

- 資格情報は作らない。門が足す読み取りは、PR・contents・check runs・Actions の job・run・job の log の GET で、呼出し側が既に持つ `contents: read`・`pull-requests: read`・`actions: read`・`checks: read` の内（workflow の権限は変えない）。
- API の呼び出しが、`unit_design` を名指す PR だけ、候補の run の数の約 2 倍と数回増える（aun#68 の形なら 9 つの run で約 25 回）。呼出し側の `GITHUB_TOKEN` の上限（repo ごとに 1 時間 1,000 回）の内。
- 戻し方: 1（R3）・2 は PR の revert（1 の revert は R3）。3 は自己用の caller と pin を前の commit に戻す PR（保護面）。4 は aun の pin の `sds_commit` を戻す版上げの PR。
- 表・記録は書かない。

## 8. 既知の弱み

- **log の保存期間**: Actions の job の log は保存期間（既定 90 日、repo の設定）を過ぎると読めない。古い設計の版を名指す PR は 5.3u が FAIL になる。その時は設計の PR を R2 で監査し直して新しい版にする。
- **統合の時の状態を承認とする**: 統合の前の最後の実行が PASS なら、統合の後に監査の返却が消された・編集されても見ない。
- **素性の確かめは GitHub の記録に依る**: `referenced_workflows` と `event` は GitHub が付ける値で、作者は書き換えられない。shirube のどの commit の再利用の workflow でもよい（その時の pin。古い版の門でも、判定 3 は同じ固定の checker を使う）。
- **名前の形**: 再利用の workflow の job 名 `sds-gate` を変えると拾えなくなり、FAIL 側に倒れる（止まるが、通りはしない）。
- **偽の status**: 書ける token を持つ者は、H に偽の status を足して候補を増やせる。偽の status が門の結果の行の無い run（ほかの PR の壊れた実行など）を指し、それが一番新しいと、5.3u は FAIL になる（止まる側に倒れる。通す側には倒れない）。
- **意味は見ない**: 設計が良いか、設計どおりに作ったかは、独立の監査と受入の試験の仕事のまま。
