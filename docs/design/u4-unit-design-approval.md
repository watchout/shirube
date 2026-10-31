# Shirube U4 の続き — 作る単位の設計の承認を、門が機械で確かめる（設計の記録）

版 3（2026-10-31。版 2 との違い: 設計監査 2 回目（shirube#81 6541419356）の 2 つの指摘を直した。BF-U4C-04 = Approve と、Approve の時に確かめた依頼・返却の bytes を結んでいなかったので、Approve の後・統合の前に依頼と返却を差し替えて、設計の監査をしていない PASS を通せた。BF-U4C-05 = 名指した設計の file が、その設計監査の範囲だったことを確かめていなかったので、同じ PR・同じ head の別の設計だけを監査した PASS を流用できた。版 3 は、(1) 監査席の Approve の本文の JSON（承認の時の依頼と返却の URL と指紋、checker の指紋）を証拠の起点にし、今の依頼・返却の bytes がその指紋と同じで、どちらも Approve より後に編集されていないことを確かめる。(2) 名指した設計の file が設計の PR の変更 file に入っていて、監査の依頼が固定した項目集合（その head の file、指紋つき）の範囲の文がその path を名指すことを確かめる。版 2 = iyasaka-arc#57 6541285902。版 1 との違い（版 2 で直した BF-U4C-01〜03）: 門の実行の記録を読む形をやめ、監査席の exact-head の Approve と依頼・返却の結び付きを読む形にした。作る単位の設計の記録の PR を R2 にする規範の変更はやめた。作者の受領は門が確かめたと書かない。版 1 = iyasaka-arc#57 6541065968）

適用 ID:
- OD-SHIRUBE-U4-CONTINUATION-DESIGN-APPROVAL-CHECK-START-20261031-001（[iyasaka-arc#49 6540758548](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6540758548)、本文 SHA-256 `d3fc3353e1beda01ad93a453cfd81fb6b49216070b7f9cc981e09a9ec6634a8b`。U4 の続きを今から作る。以下 [U4C]）
- OD-SHIRUBE-U4-PATH-CHECK-FIRST-UNIT-DESIGN-APPROVAL-NEXT-UNIT-20261029-001（[iyasaka-arc#49 6481509642](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6481509642)、本文 SHA-256 `3167a28237b09da288390c4fb7fe0cc47fde3a598c1dbeed430a4a13545c2d34`。作る単位の設計の承認の機械の確かめを次の作業の単位に回した。以下 [U4A]）
- OD-SHIRUBE-NEXT-VERSION-START-U4-20261028-001（[iyasaka-arc#49 6463776044](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6463776044)、本文 SHA-256 `b0cd543f8198be0da69ebc00e378df94578b4c7056f7deb5cc84e104d64d3d14`。以下 [NV]）
- OD-KIT-UPGRADE-STANDING-AND-INCEPTION-WHILE-WAITING-20261021-001（[iyasaka-arc#49 6308341298](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308341298)、本文 SHA-256 `d2d1a8e4da93411d6baa1cca8ef2338d6b9822db15eb43489b9d3dabeb43bf94`。kit の版上げの PR の決まり。以下 [KIT]）
- Q-AUDIT-AUTO-APPROVE-20261008（[iyasaka-arc#52 6049850367](https://github.com/watchout/iyasaka-arc/issues/52#issuecomment-6049850367)、本文 SHA-256 `0c456b1202c4a693637c0d7e29b764341611d78cc9a3550e5d9ff9ec41f1b41e`。監査席が、独立監査 PASS と同版の checker の機械受領 RECEIPT_ACCEPTED がそろった PR の対象 head に GitHub の Approve を付ける。Approve は統合の承認ではない。以下 [APV]）
- OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（#49 6336035707。止める判定に LLM を使わない、門の FAIL は devauditor が分類する）

入力: shirube main `5bccc25d37411488735012cc0a243b08604d22b4` の `scripts/sds/gate.mjs`・`scripts/sds/design-gate.mjs`・`scripts/hygiene/audit-admission.mjs`・`.github/workflows/sds-gate.yml`・`kit/sds-gate-caller.yml`・`docs/sds/distribution.md`・`docs/design/sds-gate-judgment-5.md`・`docs/design/u4-gate-judgements.md`（U4 の設計の記録 版 4。以下 [U4]）。以下 [M]。GitHub の実物の観測（§2 の [OBS]）。要件: aidlc-shirube の取り組み `261021-dev-speedup-automation` の要件 FR6.1・FR6.2・FR7.3。以下 [REQ]。

## 1. 目的と対象外

**目的**（[REQ] の FR6.1 のうち、[U4A] で次の作業の単位に回した部分。[U4C] の 1）: PR の `design_binding` が `approval.kind: "unit_design"` の設計（作る単位の設計の記録）を名指す時、門の判定 5 が、その設計の版（その path・その bytes）を範囲にした独立の設計監査が PASS で返り、監査席がその返却を確かめて Approve を付け、その版が統合されたことを機械で確かめる。当たらない時、または確かめられない時は FAIL（最初は記録だけ。pin の `design_binding_mode` は `report-only` のまま）。全部通れば `design_binding.result` は PASS になる（U4 の `NOT_CHECKED` をやめる）。

門は形と結び付きだけを見る。監査の中身の受け入れ（項目集合・証拠の照合）は監査席の固定の checker と監査席の判断に任せ、門はやり直さない。設計が良いか（意味）は、今までどおり独立の監査と受入の試験で見る（[REQ] の FR6.2）。止める判定に LLM を使わない。

**対象外**: 判定 5 を止める形にすること（repo ごとに Owner が決める、[REQ] の FR7.3）、判定 1〜4 の決まり、固定の checker（`audit-admission.mjs`）、Owner の決定で承認する設計（`kind` 無し・`owner_decision`）の 5.3・5.4、作る単位の設計の記録の PR の risk の区分（R1 のまま）、required checks・branch protection、監査席の手順、計測の部品（U2）・U3・U7・承認の記録の作り手（I1〜I4・K）・S2 のセキュリティの制御（[U4C] の含まないもの）。

### 1.1 承認として確かめる事実

作る単位の設計の版が「承認済み」とは、次の F1〜F3 がそろうこと。門はこのうち F1・F2 を機械で確かめ、F3 は確かめない（§8）。

| 事実 | 中身 | 門の確かめ | 確かめる証拠 |
|---|---|---|---|
| F1 統合 | その版が `design_pr` の PR で統合された | する（§3.1 の (a)〜(c)） | PR の `merged_at`・`head.sha`、その head の設計の file の bytes |
| F2 設計監査の PASS | 名指した設計の file（path と bytes）を範囲にし、`design_pr` のその head を対象にした、段が `design` の独立の監査が PASS で返り、監査席がその依頼と返却の bytes を確かめて、その head に Approve を付けた | する（§3.1 の (d)〜(i)） | 監査席の Approve の本文の JSON（承認の時の依頼・返却の URL と指紋）、その依頼と返却の comment、依頼が固定した項目集合の file、設計の PR の変更 file の一覧 |
| F3 作者の受領 | 設計の PR の作者が、その返却への受領を書いた | しない | 設計の PR の統合の条件として、統合する席がその統合の直前に確かめる（T129、`distribution.md` 117 行） |

### 1.2 要件との関係

- [U4] §1.1 の表で「次の作業の単位（U4 の続き）に移す」とした FR6.1（承認）の作る単位の設計の部分と、受入の正例（作る単位の設計が承認済みかつ置き場の中なら PASS）を、この作業の単位で満たす。
- 要件の記録（aidlc-shirube の `requirements.md` の FR6.1 と受入の例）を合わせる段取りは [U4] §5 の 0b と同じで、次の版の範囲・要件の段を aidlc-shirube で開き直す時に、[U4] §1.1 の表と、この記録で満たした行を一緒に書き換える（[NV] の 3）。書き換えるまでの正本は [U4A] と [U4C]（control source）。

## 2. 今の形（[M] と [OBS]）

- 判定 5 は、`approval.kind` が `unit_design` の時、承認を確かめず `5.3u NOT_CHECKED: the approval of a unit design is checked by the merging seat, not by the gate` を出し、`design_binding.result` を FAIL か `NOT_CHECKED` にする（PASS にしない）。`design_pr` は読まずに JSON に写すだけ（`gate.mjs` の `approvalOf`・`outcome`、`design-gate.mjs` の `designGate`）。
- 承認の確かめは、統合する席が統合の直前に手で行う（`distribution.md` 117 行の (1a)〜(1d): `design_pr` の統合・`design_pr` の block の `audit` の返却が PASS で作者の受領がある・依頼が `design_pr` と統合した head を名指す・その head の設計の file の SHA-256 が今の PR の `design_sha256` と同じ）。作る単位の設計の記録の PR は R1 で、`audit`（`request`・`request_sha256`・`review`）を block に書いてから統合する（同 122 行）。
- 固定の checker（`verifyAudit`）は、指定の監査者の返却を受け入れるかを見る。作者の受領の comment も、依頼の `audit_stage` も読まない（監査 1 回目の BF-U4C-01 の実測）。開いた PR だけを受ける（[U4] §6 の 3）。
- **[APV] の Approve**: 監査席は、独立監査 PASS と同版の checker の機械受領がそろった PR の対象 head に、GitHub の review（`state: APPROVED`、`commit_id` = 対象の head）を付ける。review は監査席の account（`iyasaka-ai`）が作り、作者の account（`watchout`）は作れない。取り下げると `state` は `DISMISSED` になる。Approve は統合の承認ではない（[APV]）。
- **[OBS]**（GitHub API で確かめた）:
  - 監査を通った PR には、対象の head に監査席の Approve が付いている。shirube#75（U4 の設計の記録、R1、head `0e66d4c2`、統合 2026-10-28T22:17:01Z）は `iyasaka-ai` の `APPROVED`（`commit_id` `0e66d4c2`、22:12:59Z）。shirube#80・aun#67・aun#68・iyasaka-org#130 も、それぞれの head に `iyasaka-ai` の `APPROVED` がある。
  - shirube#75 の Approve（review `5690385842`、`iyasaka-ai`、`APPROVED`、`commit_id` `0e66d4c2`、22:12:59Z）の本文に ` ```json ` の block が 1 つあり、`request`（URL）・`request_digest`（`34fb3b67…`）・`review`（URL）・`review_digest`（`9654160c…`）・`verdict: RECEIPT_ACCEPTED`・`checker_sha256`（`0fdf596f…`）を持つ。今の依頼の本文の SHA-256 は `34fb3b67…`、今の返却の本文の SHA-256 は `9654160c…` で、どちらも Approve の本文の指紋と同じ。依頼（22:05:41Z）と返却（22:12:05Z）は Approve より前に作られ、その後に編集されていない。
  - shirube#75 の依頼の `item_set` は `{target: SHIRUBE-PR75-U4-GATE-JUDGEMENTS-DESIGN, path: docs/audit/u4-gate-judgements-design-audit-items.json, sha256: 21942049…}` で、head `0e66d4c2` のその file の SHA-256 は `21942049…`、その `scope` の文は設計の file の path `docs/design/u4-gate-judgements.md` を名指す。shirube#75 の変更 file はその 2 つ。依頼の `verifier_sha256` は `0fdf596f…` で、Approve の本文の `checker_sha256` と同じ。
  - shirube#75 の block の `audit.request`（comment `6481855648`、投稿者 `watchout`、作成後に編集なし）は `sds-audit-request/1` で、`audit_stage: "design"`、`risk_class: "R1"`、`reviewer: {actor: devauditor, github: iyasaka-ai}`、`targets: [{repo: watchout/shirube, pr: 75, head: 0e66d4c2…}]`。`audit.review`（comment `6481982956`、投稿者 `iyasaka-ai`、作成後に編集なし）は `sds-audit-review/1` で、`request_digest` = `audit.request_sha256`、`targets` の head `0e66d4c2`、`blocking_findings: []`、項目の `result` は全部 `PASS`。
  - GitHub は、repo に書き込める者が他人の issue・PR の comment も編集できるとしている（監査 2 回目の BF-U4C-04 が引く GitHub の文書）。comment の `updated_at` は編集で進む。PR の review の REST の応答には編集の時刻が無い。
  - 統合した PR に comment が付くと門は動き直し、固定の checker が閉じた PR を拒むので FAIL になる（aun#68 の check run `123900271280`）。だから統合した後に門の実行の結果を読む形は、統合の時の状態を表さない（版 1 の形をやめた理由の 1 つ、§6）。

## 3. 作る物

### 3.1 5.3u の確かめ（門）

`approval.kind` が `unit_design` の時、門は 5.3・5.4 の代わりに次の (a)〜(i) を確かめる。読むのは GitHub API の GET だけ（PR・PR の変更 file の一覧・contents・issue の comment 2 つ・PR の review の一覧）。PR の code は checkout も実行もしない。

- (a) `design_ref` の repo が、今の PR の repo と同じ（`design_pr` は同じ repo の PR の番号）。
- (b) `design_pr` の PR が統合済み（`merged_at` がある）。その `head.sha` を H、`merged_at` を T とする。
- (c) `design_ref` の path（以下 P）の file を H で読み、bytes の SHA-256 が今の PR の `design_sha256` と同じ（名指す設計の版が、その PR で統合された bytes である）。
- (d) Approve を選ぶ: `design_pr` の PR の review を全頁読む。`commit_id` が H、`submitted_at` ≤ T、`state` が `APPROVED` で、本文に ` ```json ` の block がちょうど 1 つあり、その block が `request`・`request_digest`・`review`・`review_digest`・`verdict: "RECEIPT_ACCEPTED"`・`checker_sha256` を持ち、`request` と `review` がどちらも `design_pr` の PR 自身の comment の URL（`https://github.com/<今の repo>/pull/<design_pr>#issuecomment-<数字>`。`issues/` の形も可）である review のうち、`submitted_at` が最も新しい 1 つを A とする。無ければ FAIL（取り下げて `DISMISSED` になった Approve はここで外れる）。A の投稿者を X とする。X が H に A より後（T 以前）に `CHANGES_REQUESTED` の review を出していれば FAIL。
- (e) 監査の依頼（A の `request` の comment）: 投稿者が依頼の受付の account（固定の checker と同じ `watchout`）、本文の SHA-256 が A の `request_digest` と同じ、`updated_at` ≤ A の `submitted_at`（Approve より後に編集されていない）。本文の ` ```json ` の block が `schema: "sds-audit-request/1"`、`audit_stage: "design"`、`targets` に `{repo: <今の repo>, pr: <design_pr>, head: H}` の 1 つ（その `id` を K とする）、`item_set` が `{target: K, path, sha256}`、`verifier_sha256` が A の `checker_sha256` と同じ、`reviewer.github` が X と同じ（依頼が名指した監査席が、その Approve を付けた）。
- (f) 監査の返却（A の `review` の comment）: 投稿者が X、本文の SHA-256 が A の `review_digest` と同じ、`updated_at` ≤ A の `submitted_at`。本文の ` ```json ` の block が `schema: "sds-audit-review/1"`、`request_digest` が A の `request_digest` と同じ、`targets` が `[{id: K, head: H}]`、`blocking_findings` が空の配列、`items` が空でなく全部の `result` が `PASS`。
- (g) 監査の範囲（BF-U4C-05 の直し）: 依頼の `item_set.path` の file を H で読み、bytes の SHA-256 が `item_set.sha256` と同じで、JSON の `scope`（文字列）が P をそのままの文字列で含む。
- (h) 設計の PR の変更: `design_pr` の PR の変更 file の一覧（全頁、rename は旧と新の両方）に P がある（名指す設計は、その PR が足した・改めた file である）。
- (i) 設計の PR の block: `design_pr` の PR 本文の ` ```json sds-pr ` の block の `audit` が、A の `request`・`request_digest`・`review` と同じ（`audit.request` = A の `request`、`audit.request_sha256` = A の `request_digest`、`audit.review` = A の `review`）。

- 起点は監査席の Approve の本文で、依頼と返却はその指紋に一致し、Approve より後に編集されていない物だけを受ける。Approve の後に依頼・返却を差し替えると、指紋か `updated_at` で FAIL になる（BF-U4C-04 の直し）。Approve の本文が後から書き換えられても、それが指せる依頼・返却は、Approve より前から編集されていない、監査席の account が書いた、段が `design` の PASS の返却だけなので、本物の設計監査が無ければ通らない（§8）。
- (a)〜(i) が全部通れば 5.3u は失敗を出さない。ほかの確かめ（5.1・5.2・5.5〜5.9）も通れば `design_binding.result` は PASS。
- 1 つでも当たらなければ FAIL（reason `5.3u <何が当たらないか>`。例: `5.3u design_pr 12 is not merged`、`5.3u the audit request bound by the approval is not a design-stage request for <H>`、`5.3u the review changed after the approval`、`5.3u the audited item set does not name <P>`）。
- 読めない時（API の失敗）は FAIL（`5.0a` と同じく `NOT_CHECKED` にしない、S8）。
- 段階は今のまま（`report-only` は全体の verdict を変えない、`blocking` は FAIL で止める）。
- 門は `design_pr` に固定の checker を当てない（統合した PR は開いていないので、checker は必ず拒む）。監査の受け入れの判断（項目集合・証拠の照合）は監査席の checker と Approve の 1 か所にあり、門は返却の verdict（`blocking_findings` と `result`）と、Approve・依頼・返却・項目集合・変更 file の結び付き（段・PR・head・path・account・指紋・時刻）だけを読み、項目の意味や証拠を監査し直さない（判断を 2 か所に持たない、S3）。

### 3.2 読み取りと判断の分け方（S4）

- `gate.mjs` が材料を読む: `design_pr` の PR（`merged_at`・`head.sha`・本文）、PR の変更 file の一覧（全頁）、PR の review の一覧（全頁、本文つき）、H での設計の file と項目集合の file の bytes、依頼と返却の comment（本文・投稿者・`updated_at`）。
- 判断は `design-gate.mjs` の純粋な関数が行う: (a)〜(i) の照合。時刻・環境・網を読まない（T と `updated_at`・`submitted_at` は API の値を比べるだけ）。`designGate` の入力に、この材料を 1 つの欄（例 `unitEvidence`）で足す。依頼の受付の account（`watchout`）は、固定の checker（変えない）が持つ値と同じ物を、門の側では 1 か所にだけ置き、試験で checker の値と一致することを確かめる（T27）。監査席の account は依頼の `reviewer.github` から読み、門には書かない。
- (a) と (b) が当たらなければ、それより後の読み取りはしない（読まない物は判断にも使わない）。

### 3.3 統合する席の手順（`distribution.md` 117 行）

- `unit_design` の時の (1a)〜(1d) の手での照合を、「門の JSON の `design_binding` を読み、5.3u の失敗が無く `result` が PASS であること」に替える（F1・F2 の判断を門の 1 か所にする、S3）。判定 5 が `report-only` の間は、merge 担当が merge の直前にこれを確かめ、FAIL なら merge しない（作者に戻す。設計の版が承認を持たない時は、設計の PR を監査し直して新しい版にする）。`blocking` の後は門が止める。
- F3（作者の受領）は、作る単位の設計の記録の PR 自身を統合する時に、統合する席がその統合の直前に確かめる（今の T129 の条件のまま。122 行に、設計の記録の PR は統合の前に作者の受領と監査席の Approve がそろうことと、その設計監査の項目集合の `scope` に設計の file の path を書くことを書く）。後の PR の門と merge 担当は、F3 を確かめ直さない。
- 117 行の「5.3u は門の段階に関わらず承認を確かめないので、判定 5 が blocking になってもこの確かめは続く」は、門が F1・F2 を確かめるようになるので消す。

### 3.4 変えない物

block の形（`approval` は `{ "kind": "unit_design" }` だけ）、PR の `design_binding` の `design_pr`、Owner の決定で承認する設計の 5.3・5.4、判定 1〜4、固定の checker、作る単位の設計の記録の PR の risk の区分（R1）と `audit` 欄、監査席の手順（[APV] の Approve）、workflow の file（再利用の workflow・呼出し側）、pin の mode。

### 3.5 置き方

| file | 中身 |
|---|---|
| `scripts/sds/design-gate.mjs` | 5.3u の照合（§3.1 の (a)〜(i) の判断）。`unit_design` の時の `NOT_CHECKED` をやめる。時刻・環境・網を読まない |
| `scripts/sds/gate.mjs` | `unit_design` の時の材料の読み取り（§3.2）。review と変更 file の一覧は頁を全部読む（`files` と同じ形） |
| `docs/sds/distribution.md`・`docs/design/sds-gate-judgment-5.md` | §4 の判定 5 の行の 5.3u、117 行の統合する席の手順（§3.3）、122 行の設計の記録の PR の統合の前の条件（作者の受領と Approve）、§8 の手順の項。**判定の規範の変更なので risk R3**（§5 の 1） |
| `templates/PULL_REQUEST_TEMPLATE.md` | 判定 5 の説明の文に、設計の記録の PR は段が `design` の監査を受け、その項目集合の `scope` に設計の file の path を書き、監査席の Approve と作者の受領の後に統合すること |
| 試験 | §4 |

実装の PR（R2）は保護面（`.github/**`・`.shirube/**`）に触れず、規範の文書も変えない（R3 の PR で先に変える）。

## 4. 試験

| # | 場合 | 期待 |
|---|---|---|
| T1 | 正例: shirube#75 の [OBS] の形（統合済み、H の設計の file が `design_sha256` と同じ、Approve の本文が依頼と返却の指紋を持ち今の bytes と同じ、どちらも Approve より前から編集なし、依頼が `design` 段で `design_pr`@H を対象、項目集合の `scope` が P を名指す、P が変更 file にある、block の `audit` が Approve の本文と同じ） | 5.3u は失敗を出さず、ほかも通れば `result` = PASS。**今の本体では `NOT_CHECKED`**（Red → Green） |
| T2 | `design_pr` が統合されていない | FAIL `5.3u` |
| T3 | H の設計の file の SHA-256 が `design_sha256` と違う | FAIL `5.3u` |
| T4 | 当たる Approve が無い（review が無い・`commit_id` が H でない・`submitted_at` が T より後・本文の JSON が無い） | FAIL `5.3u` |
| T5 | Approve が取り下げられて `DISMISSED`、または X が H に Approve の後（T 以前）に `CHANGES_REQUESTED` | FAIL `5.3u` |
| T6 | Approve の本文に JSON の block が無い・2 つある・欄が欠ける・`verdict` が `RECEIPT_ACCEPTED` でない・URL が別の PR の comment | FAIL `5.3u` |
| T7 | 依頼の `audit_stage` が `implementation`（BF-U4C-01 の反例。返却は PASS） | FAIL `5.3u` |
| T8 | BF-U4C-04 の反例: 実装の監査の依頼と返却に Approve が付いた後、統合の前に依頼の `audit_stage` を `design` に、依頼の指紋・返却の `request_digest`・block の `request_sha256` をそろえ直す（Approve はそのまま） | FAIL `5.3u`（依頼の本文の指紋が Approve の `request_digest` と違う、または `updated_at` が Approve より後） |
| T9 | 依頼か返却の本文の指紋が Approve の本文の指紋と違う | FAIL `5.3u` |
| T10 | 依頼か返却の `updated_at` が Approve の `submitted_at` より後（統合の前でも） | FAIL `5.3u` |
| T11 | Approve の本文が、別の・Approve より後に作った依頼と返却を指すように書き換えられている | FAIL `5.3u`（`updated_at`・作成が Approve より後、または返却の投稿者が X でない） |
| T12 | 依頼の `targets` が別の PR・別の head、依頼の投稿者が受付の account でない、`verifier_sha256` が Approve の `checker_sha256` と違う、`reviewer.github` が Approve の投稿者と違う | FAIL `5.3u` |
| T13 | 返却の投稿者が X でない、`request_digest` が違う、`targets` の id・head が違う | FAIL `5.3u` |
| T14 | 返却の `blocking_findings` が空でない、`result` に `FAIL` がある、`items` が空 | FAIL `5.3u` |
| T15 | BF-U4C-05 の反例: 同じ `design_pr`@H に設計 A と B があり、監査の項目集合の `scope` は A だけを名指す。後の PR が B を名指す | FAIL `5.3u`（`scope` が B の path を含まない）。A を名指す時は PASS（対照） |
| T16 | 項目集合の file の H での指紋が `item_set.sha256` と違う、`scope` が文字列でない | FAIL `5.3u` |
| T17 | P が `design_pr` の変更 file に無い（その PR より前から H にあった設計） | FAIL `5.3u` |
| T18 | block の `audit` が Approve の本文の `request`・`request_digest`・`review` と違う、block が無い | FAIL `5.3u` |
| T19 | review の一覧・変更 file の一覧で、当たる物が 2 頁目にある | 見つけて判断する |
| T20 | 読み取りの失敗（PR・変更 file・review・file・comment のどれか） | FAIL（`NOT_CHECKED` にしない） |
| T21 | `design_ref` の repo が今の PR の repo と違う | FAIL `5.3u` |
| T22 | (a)・(b) が当たらない時、それより後の材料を読まない | 呼ばれたら失敗する偽物の口を渡しても、FAIL の reason が (a)・(b) |
| T23 | `kind` が無い・`owner_decision` | 今の 5.3・5.4 の試験がそのまま通る |
| T24 | `report-only` で 5.3u が FAIL / `blocking` で 5.3u が FAIL | 前者は門が止まらず FAIL を記録、後者は止まる（今の判定 5 と同じ） |
| T25 | `design-gate.mjs` が時刻・環境・網を読まない | import が `node:crypto` だけのまま（今の試験の形） |
| T26 | 門が `design_pr` に固定の checker を当てない | checker の口を呼ばれたら失敗する偽物にしても通る（[U4] の T12 を、この形に置き換える） |
| T27 | 門の側に置いた依頼の受付の account が、固定の checker の値と同じ | checker の file を読んで比べる試験が通る（値が食い違えば失敗する） |
| T28 | 文書の試験 | R3 の PR の `distribution.md` に、統合する席が門の JSON の 5.3u を読む手順と、設計の記録の PR が統合の前に作者の受領と Approve をそろえ、項目集合の `scope` に設計の path を書くことがある（`tests/workflow-contract.test.mjs` と同じ形の文の照合） |
| T29 | 今の判定 1〜5 と kit の試験 | 全部通る。ただし [U4] の T8・T10（`unit_design` は常に `NOT_CHECKED`）の期待は、この設計の目的どおり T1・T2・T7・T4 の形に置き換える（弱めるのではなく、確かめる形に替える。置き換えた試験の名前を PR 本文に並べる） |

## 5. 作る順と PR、Owner の手

| 順 | PR | 区分 | 中身 | Owner の手 |
|---|---|---|---|---|
| 0 | この設計の記録（docs だけ） | R1 | この file と項目集合 | 無し（事前の設計監査） |
| 0b | aidlc-shirube の要件の記録を合わせる | ― | §1.2 のとおり、[U4] §5 の 0b と一緒に書き換える | 要約の確認と段の承認（AI-DLC の会話の手。下の 2 回とは別に数える） |
| 1 | 判定 5 の規範の改版 | R3 | `distribution.md` の §4 の判定 5 の行（5.3u）、117 行（§3.3）、122 行（作者の受領と Approve、項目集合の `scope` に設計の path）、§8 の手順の項、`sds-gate-judgment-5.md` の書き足し、PR の雛形の文。T28 | **exact-head 1 回**（R3。[U4C] の 2） |
| 2 | U4 の続きの実装 | R2 | §3.1〜§3.2、T1〜T27・T29 | 無し（1 の統合の後） |
| 3 | shirube 自身の版上げ | R4（保護面） | 自己用の caller の `uses` の commit と pin の `sds_commit`・`files` の指紋を、2 の統合 commit に一緒に上げる（[U4] §5 の 3 と同じ手順、kit は使わない） | **exact-head 1 回**（`.github/**`・`.shirube/**`） |
| 4 | aun の版上げ | ― | 2 以降の kit で `kit.mjs upgrade --target <aun>`。差分は kit の file だけ、kit check OK、pin の 2 つの mode と `delivery_plan` が前と同じ | 無し（[KIT]） |

- Owner の手は 2 回（1 の R3 と 3 の R4）。0b は別に数える。
- 1 の確かめ: R3 の事前の設計監査は、この記録（0）の監査が兼ねる（1 はこの記録の §3 を文書に写す PR）。1 の実装監査で、写した文がこの記録と食い違わないことを見る。
- 3 の確かめ: 統合の後、次の shirube の PR の `sds-gate-self` の実行が新しい commit を呼んだことと、`design_binding` の 5.3u の出方を読み戻して #24 に書く。
- 4 の確かめ: aun の最初の `unit_design` の PR（aun の u1 の設計の記録の次の改版。段が `design` の監査（項目集合の `scope` に設計の path）と Approve を受けて統合し、その後の実装の PR が名指す）で、5.3u が PASS になることを読み戻す。

見積もり: 2 は code 約 60 行（`gate.mjs` の材料の読み取り 約 25、`design-gate.mjs` の照合 約 35）・試験 約 300 行。追加 400 行・20 file の内。新しい外部の依存は無い。判定 5 の内訳の予算（250 行、OD-SHIRUBE-GATE5-BUDGET-150-TO-250-20261030-001）の残りを作る席が `git diff --numstat` で測り、超える見込みなら作る前に止めて arc に返す（arc が Owner に伺う）。

## 6. 採らなかった案

1. **設計の PR の統合の前の最後の門の実行の記録を読む（版 1）**: 門の PASS は、固定の checker が指定の監査者の返却を受け入れたことしか示さず、段が `design` であることも作者の受領も示さない（BF-U4C-01）。run の再実行で attempt が変わると、統合の前の最後の FAIL を落として古い PASS に戻れる（BF-U4C-02。job と attempt まで固定すると読み取りが大きくなる）。`issue_comment` の実行は PR の head の check runs に出ず、commit status を手がかりに探す必要もある。Actions の log には保存期間がある。
2. **統合の後の最新の実行を読む**: 統合した PR への comment で門が動き直し、必ず FAIL になる（[OBS]）。
3. **commit status `sds-gate` を読む**: `statuses: write` を持つどの token・workflow でも付けられる（`sds-gate.yml` の冒頭の (b)）。
4. **監査の返却の中身を門がすべて照らし直す（項目集合・証拠まで）**: 固定の checker の受け入れの判断を門に写すことになり、判断が 2 か所になる（S3）。門は verdict と結び付きだけを読み、受け入れは監査席の checker と Approve に任せる（§3.1）。
5. **固定の checker を、統合した PR も受けるように変える**: 全 repo の監査の受付の道具の改造で、`verifier_sha256` が変わる。この作業の単位の範囲を越える（[U4] §6 の 3）。
6. **Approve だけを読む（依頼と返却を読まない）**: Approve は段も監査の範囲も持たないので、段が `design` の監査であることを示せない（BF-U4C-01 の反例は Approve の前の受領でも成り立つ）。
7. **依頼と返却だけを読む（Approve を読まない）**: comment は監査席以外の権限でも編集されうる。`updated_at` ≤ T で統合の後の編集は止まるが、監査席が統合の前にその head を承認したことは、監査席の account だけが作れる review の方が強く示す（[APV] の手順が既にある）。
8. **branch protection の required check や required review を承認の証とする**: repo ごとに設定が違う（aun は門を必須にしていない）、管理者は越えられる。
9. **作る単位の設計の記録の PR を R2 にして判定 3 を当てる（版 1 の規範の変更）**: 判定 3 は段も作者の受領も見ないので、R2 にしても F2・F3 は示せない。今の R1 と `audit` 欄と Approve で、(d)〜(i) が読める。
10. **依頼・返却の `updated_at` を統合の時刻 T とだけ比べる（版 2）**: Approve の後・統合の前の差し替えを止められない（BF-U4C-04）。Approve の本文の指紋と、Approve の時刻で比べる。
11. **Approve の本文の編集を GraphQL の `lastEditedAt` で確かめる**: 読み取りの口が 1 つ増える。本文が書き換えられても、指せる依頼・返却は Approve より前から編集されていない本物だけなので（§3.1 の終わり）、REST の読み取りで足りる。
12. **監査の依頼に、設計の path と指紋の新しい欄を足す**: 依頼の形（`sds-audit-request/1`）を変え、固定の checker が受けるかを確かめ直すことになる。今ある項目集合の `scope` は監査席がその通りに監査する範囲で、file は依頼が指紋で固定しているので、そこに path があることを見れば足りる（BF-U4C-05 の直し）。

## 7. 秘密・権限・復旧

- 資格情報は作らない。門が足す読み取りは、PR・PR の変更 file・contents・issue の comment・PR の review の GET で、呼出し側が既に持つ `contents: read`・`pull-requests: read`・`issues: read` の内（workflow の権限は変えない）。
- API の呼び出しが、`unit_design` を名指す PR だけ 7 回ほど増える（PR・変更 file の一覧・review の一覧・file 2 つ・comment 2 つ）。
- 戻し方: 1（R3）・2 は PR の revert（1 の revert は R3）。3 は自己用の caller と pin を前の commit に戻す PR（保護面）。4 は aun の pin の `sds_commit` を戻す版上げの PR。
- 表・記録は書かない。

## 8. 既知の弱み

- **F3（作者の受領）は門が確かめない**: 受領の comment は形が決まっていないので、機械で読めない。設計の PR の統合の時に、統合する席が手で確かめる（T129）。その確かめが抜けた版も、F1・F2 がそろえば門は PASS にする。
- **Approve は監査席の手順に依る**: Approve を付ける条件（PASS と機械受領）は監査席の作業の手順の文で、門は条件を確かめ直さない。代わりに返却の verdict（`blocking_findings` が空・全部 PASS）と Approve の本文の `verdict: RECEIPT_ACCEPTED` を読み、PASS でない返却に付いた Approve を通さない。Approve の本文の JSON の形は監査席の手順の形（[OBS]）で、形が変わると FAIL 側に倒れる（止まるが、通りはしない）。
- **書き込める者による書き換え**: repo に書き込める者は、他人の comment や review の本文も編集できる。依頼・返却の編集は、Approve の本文の指紋と `updated_at` で止まる。Approve の本文の書き換えは REST では時刻が見えないが、指せる依頼・返却は、Approve より前から編集されていない、監査席の account が書いた、段が `design` の PASS の物に限られる。
- **監査席の account**: Approve の投稿者と、依頼の `reviewer.github` が同じことを監査席の account の確かめとする。依頼を書いた者が自分の持つ別の account を書けば、その account の返却と Approve で通りうる（固定の checker も同じ信頼の置き方）。監査席の account を門に固定するかは、後の版の候補。
- **範囲は文字列で見る**: 監査の範囲は、指紋で固定した項目集合の `scope` の文字列に P があるかで見る。`scope` の書き方の意味（例: 「A だけ」と書いた時に B の path が別の文脈で出る）は見ない。設計の記録の PR の項目集合は、設計の file の path を `scope` に書く（122 行）。
- **統合の時の状態を承認とする**: 統合の後に依頼・返却が編集されたら FAIL になり（止まる側に倒れる）、設計の PR を監査し直して新しい版にする。Approve が統合の後に取り下げられた時も FAIL になる。
- **account の値**: 依頼の受付の account（`watchout`）と監査席の account（依頼の `reviewer.github`）に依る。受付の account は固定の checker の中にも同じ値があり（checker は変えないので 2 か所になる）、門の側は 1 か所に置いて試験で一致を確かめる。
- **意味は見ない**: 設計が良いか、設計どおりに作ったかは、独立の監査と受入の試験の仕事のまま。
