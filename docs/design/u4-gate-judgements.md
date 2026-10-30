# Shirube U4 — 門の判定 5 を、変更 path が設計の置き場の中かまで広げる（設計の記録）

版 4（2026-10-29。版 3 との違い: 設計監査 3 回目（shirube#75 6465949944）の BF-U4-04（作る単位の設計の承認を門の機械の確かめから外したのが、要件 FR6.1 と合わない）を、Owner の決定 [U4A] で直した。U4 は FR6.1 の一部を作る作業の単位で、作る単位の設計の承認の機械の確かめは次の作業の単位に移す（要件の変更、§1.1）。門の振る舞いは版 3 と同じ（`unit_design` は `NOT_CHECKED`、PASS にしない）。変えたのは §1・§1.1（新）・§5 の 0b（新）・§8 の文と、要件の記録を合わせる段取り。版 3 = iyasaka-arc#57 6465425185）。

版 3（2026-10-28。版 2 との違い: 設計監査 2 回目（shirube#75 6465338055）の 2 つの指摘を直した。BF-U4-01 = 統合済みの設計の監査を固定の checker（開いた PR の今の受領だけを見る）で確かめ直す形はやめ、作る単位の設計の承認は門では確かめず `NOT_CHECKED` と記録し（PASS にしない）、今の決まりどおり統合する席が統合の直前に確かめる形（`kind: "unit_design"`、§3.2）にした。機械で確かめる形は後の版の候補（§8）。BF-U4-03 = 判定 5 の規範（`distribution.md` §4 と判定 5 の設計の記録）を変える部分を R3 の PR（Owner の exact-head）に分けた（§5）。版 1 → 版 2 の違い: 1 回目の指摘 BF-U4-01・BF-U4-02 の直し（承認の確かめ方、自己用の caller と pin の版上げ、kit の mode の引き継ぎ）。版 2 = iyasaka-arc#57 6464797192）。設計の作者 = arc。作る席 = shirube の席、監査 = devauditor、統合 = suite-lead。

適用 ID:
- OD-SHIRUBE-NEXT-VERSION-START-U4-20261028-001（[iyasaka-arc#49 6463776044](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6463776044)、本文 SHA-256 `b0cd543f8198be0da69ebc00e378df94578b4c7056f7deb5cc84e104d64d3d14`。次の版を今から U4 で始める。以下 [NV]）
- OD-SHIRUBE-U4-PATH-CHECK-FIRST-UNIT-DESIGN-APPROVAL-NEXT-UNIT-20261029-001（[iyasaka-arc#49 6481509642](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6481509642)、本文 SHA-256 `3167a28237b09da288390c4fb7fe0cc47fde3a598c1dbeed430a4a13545c2d34`。U4 は置き場の確かめを先に出し、作る単位の設計の承認の機械の確かめは次の作業の単位に回す。以下 [U4A]）
- OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（#49 6336035707。止める判定に LLM を使わない、門の FAIL は devauditor が分類する）
- OD-SHIRUBE-TF-Q7-B-LATER-VERSIONS-IN-SAME-INTENT-20261027-001（#49 6437072374。後の版も同じ取り組みの記録で扱う）
- OD-KIT-UPGRADE-STANDING-AND-INCEPTION-WHILE-WAITING-20261021-001（[#49 6308341298](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308341298)、本文 SHA-256 `d2d1a8e4da93411d6baa1cca8ef2338d6b9822db15eb43489b9d3dabeb43bf94`。kit の版上げの PR の決まり。以下 [KIT]）

入力: shirube main `6847393a51b337e5f1a7ed9967ea16d78de41c12` の `scripts/sds/gate.mjs`・`scripts/sds/design-gate.mjs`・`scripts/sds/kit.mjs`・`scripts/hygiene/lib.mjs`（`matchesAny`）・`scripts/hygiene/audit-admission.mjs`（`verifyAudit`）・`.github/workflows/sds-gate-self.yml`・`.shirube/sds-pin.json`・`docs/design/sds-gate-judgment-5.md`・`templates/PULL_REQUEST_TEMPLATE.md`・`docs/sds/consumers.json`・`docs/sds/distribution.md`。以下 [M]。要件: aidlc-shirube の取り組み `261021-dev-speedup-automation` の要件 FR6.1・FR6.2・FR7.3 と、作業の単位 U4。以下 [REQ]。

## 1. 目的と対象外

**目的**（[REQ] の FR6.1 のうち U4 で作る部分。[U4A] による。§1.1）: 門の判定 5 が、形だけを見て次の 2 つを確かめる。当たらない時、または確かめられない時は FAIL（最初は記録だけ）。門が確かめない物は `NOT_CHECKED` と記録し、PASS にしない。
1. PR が指す設計の記録のその版が承認済みか（Owner の決定で承認する設計は今の 5.3・5.4。作る単位の設計は門では確かめず `NOT_CHECKED`、統合する席が確かめる、§3.2。機械の確かめは次の作業の単位、§1.1）。
2. PR の変更 path が、その設計の記録に書いた置き場の中か。外れた path を出す。

設計どおりの振る舞いかという意味のずれは、今までどおり独立の監査（監査の規格 v1 の I7）と受入の試験で見る（[REQ] の FR6.2）。門は意味を見ない。止める判定に LLM を使わない。

あわせて U4 の残り 2 つを入れる: PR の雛形に「AI-DLC の記録」と「直す元の PR」の欄を足す、配布先の一覧に shirube を足す。版上げで判定 5 が黙って止まらないよう、kit が pin の 2 つの mode を残す直しも入れる（§3.6）。

**対象外**: 判定 5 を止める形にすること（pin の `design_binding_mode` は `report-only` のまま。切り替えは repo ごとに Owner が決める、[REQ] の FR7.3）、判定 1〜4 の決まり、固定 checker、required checks・branch protection、計測の部品（U2）、承認の記録の作り手（I1〜I4・K）。

### 1.1 要件の変更（[U4A]）と、U4 が満たさない所

U4 は [REQ] の FR6.1 の**一部だけを作る**作業の単位です。採択済みの要件に全部適合した設計としては扱いません。

| 要件・受入 | 今の文（[REQ]） | [U4A] の後 | U4 での門の振る舞い |
|---|---|---|---|
| FR6.1（承認） | 門が、PR が指す設計の版が承認済みかを機械で確かめ、当たらなければ FAIL | Owner の決定で承認する設計（`kind` 無し・`owner_decision`）は、U4 でも今の 5.3・5.4 のまま確かめる。作る単位の設計（`unit_design`）の承認の機械の確かめは、次の作業の単位（U4 の続き）に移す | `unit_design` は `5.3u NOT_CHECKED` で PASS にしない。承認は統合する席が統合の直前に確かめる（§3.2） |
| FR6.1（置き場） | 変更 path が設計の置き場の中かを機械で確かめ、外れたら FAIL | 変えない | 5.9（§3.3） |
| 受入の正例（承認済みかつ置き場の中なら FR6 は PASS） | すべての設計に当てる | Owner の決定で承認する設計に当てる。作る単位の設計の正例は、次の作業の単位の受入に移す | `unit_design` で置き場の中・ほかも通る時、`design_binding.result` = `NOT_CHECKED`（T8） |
| 受入の負例（置き場の外なら FAIL） | 変えない | 変えない | FAIL `5.9`（T2・T9） |

- 要件の記録（aidlc-shirube の取り組み `261021-dev-speedup-automation` の `requirements.md` の FR6.1 と受入の例）は、次の版の範囲・要件の段を aidlc-shirube で開き直す時に、上の表のとおりに書き換える（[NV] の 3。Owner の手は要約の確認と段の承認、§5 の 0b）。書き換えるまでの正本は [U4A]（control source）で、この設計の記録は食い違いをここに書いて隠さない（R3）。
- 次の作業の単位の設計とその時期は決まっていない（[U4A] の含まないもの）。候補の形は §8。
- 役目の分け方: 門 = 置き場と、Owner の決定で承認する設計の承認を確かめる。統合する席 = 作る単位の設計の承認を確かめる（§3.2 の読み方、`distribution.md` 115 行）。独立の監査 = 意味のずれ（FR6.2）。

## 2. 今の形（[M]）

- 判定 5 は、PR 本文の `design_binding`（`design_ref` = commit を固定した .md、`design_sha256`、`design_id`、`version`）が指す file から ```` ```json sds-design ```` の block を 1 個読み、`designGate` に渡す。
- `designGate` が見るのは: 形（5.1）、未決の問いに答えがあるか（5.2）、承認（5.3・5.4 = `approval.ref` の comment に `shirube-owner-decision/v1` と `design_id@version`）、道筋の今の node との結び付き（5.5〜5.7）、PR が名指す版と block の版（5.8）。
- 変更 path は見ていない。判定 2 が「PR の block の changed_paths = diff」を確かめた `paths` は、判定 5 に渡っていない。
- `sds-design` の block を持つのは、製品設計 1 枚（例: aun の `docs/design/aun-product-design.md`）だけ。製品設計の置き場は製品全体なので粗い。
- 判定 3（監査の受領）は R2 以上だけを見る（`gate.mjs` 131 行）。`distribution.md` 94 行のとおり R0・R1 は監査が要らない。だから「base に統合済み」は「監査済み」を意味しない。設計の記録の PR（R1）も同じ。
- 判定 5 の段階は pin の `design_binding_mode`（shirube・aun とも `report-only`）。`kit.mjs` の `apply`（`upgrade` も同じ）は新しい pin を作る時に `protected_paths` と `adoption` を引き継ぐが、`plan_binding_mode` と `design_binding_mode` は書かない（80〜81 行）。版上げの後、判定 5 は「the base pin has no design_binding_mode」で NOT_CHECKED になり、判定 4 は既定の report-only に戻る。
- shirube 自身の門は、自己用の caller `.github/workflows/sds-gate-self.yml` が `uses: watchout/shirube/.github/workflows/sds-gate.yml@<commit>` を literal で持ち、pin の `sds_commit` と同じ commit を指す。kit はこの自己用の caller を作らない（kit が作るのは配布先の caller で、shirube では再利用の workflow `sds-gate.yml` を上書きしてしまう）。

## 3. 作る物

### 3.1 置き場の欄 `placements`

`sds-design/1` の block に、任意の欄 `placements` を足す。
- 形: 文字列の配列。1 つずつが glob で、書き方は `scripts/hygiene/lib.mjs` の `matchesAny`（`protected_paths` と同じ）。新しい書き方を作らない（S3）。
- 意味: この設計の記録に従う PR が変えてよい path の全部。試験・項目集合の置き場（例: `docs/audit/**`）も、この設計の PR が触るなら書く。
- 欄が無い block は、今までどおり読める（新旧の同居、S6）。

### 3.2 作る単位の設計の記録（`kind: "unit_design"`、新しい 5.3u）

置き場を細かく書けるのは、作る単位の設計の記録（例: aun の `docs/design/u1-live-handoff.md`）。これらは Owner の決定ではなく、独立の設計監査を通して統合される。

- block の `approval` に `kind` を足す。`kind` が無い・`owner_decision` の時は今のまま（5.3・5.4）。
- `kind: "unit_design"` の時、block の `approval` は `{ "kind": "unit_design" }` だけ。PR 本文の `design_binding` に `design_pr`（その設計の版を統合した PR の番号。同じ repo）を足す。
- 門は、その版の承認（設計監査の合格）を確かめない。5.3・5.4 の代わりに `5.3u NOT_CHECKED: the approval of a unit design is checked by the merging seat, not by the gate` の印を出す。5.9 などほかの確かめは今までどおり行う。
- `design_binding.result` は、FAIL の確かめが 1 つでもあれば FAIL、無ければ `NOT_CHECKED`（理由に 5.3u と、5.9 が通ったこと）。**`unit_design` の時は PASS にならない。** 確かめていない承認を、承認済みとして記録しないため。
- 承認の確かめは、統合する席が統合の直前に行う（`distribution.md` 115 行の今の決まりの (1) に、作る単位の設計の時の読み方を足す。§5 の 1 の R3 の PR）: `design_pr` が統合済み、`design_pr` の本文の `sds-pr` の block の `audit`（監査の依頼と返却）の返却が PASS で作者の受領があり、依頼が `design_pr` とその統合した head を名指し、その head の設計の file の SHA-256 が今の PR の `design_sha256` と同じ。確かめたことを統合の記録（読み戻し）に書く。
- だから、後の PR の承認の元にする設計の記録の PR（R1）は、監査の依頼を出した後に自分の PR 本文の block に `audit`（`request`・`request_sha256`・`review`）を書いてから統合する（判定 3 が R2 以上に求める欄と同じ形）。
- 固定の checker（`audit-admission.mjs`）は、開いた PR の今の受領だけを確かめる道具のまま使う（変えない）。統合した後の PR に当てると、PR の状態が開いていないので必ず拒む（2 回目の監査の実測）。

### 3.3 置き場の確かめ（新しい 5.9）

- 判定 2 が確かめた変更 path（rename は旧と新の両方）を、判定 5 に渡す。
- block に `placements` があれば、変更 path の 1 つずつが `matchesAny(path, placements)` に当たるかを見る。当たらない path が 1 つでもあれば FAIL（理由 `5.9 paths outside the design placements: <path, ...>`。外れた path を全部、並びを固定して出す）。
- `placements` が無ければ、FAIL にせず `5.9 NOT_CHECKED: the design names no placements` の印を出す（今ある block に新しい FAIL を足さないため）。
- 5.9 は 5.1 が通った時だけ見る。

### 3.4 PR の雛形（`templates/PULL_REQUEST_TEMPLATE.md`）

- 「What this PR does」に 1 行足す: `aidlc_record:`（この PR が従う AI-DLC の記録の path。無ければ `none`）。
- `sds-pr` の block の例に、任意の欄 `fixes_pr`（この PR が直す元の PR の URL。直しでなければ欄ごと消す）を足す。門は読まない（[M] の `gate.mjs` 25〜31 行）。後の版の計測（U2）が読む。
- 判定 5 の説明の文に、`placements`・`kind: "unit_design"`・`design_pr` と、§3.2 の設計の PR にも `audit` を書く段落を足す。

### 3.5 配布先の一覧（`docs/sds/consumers.json`）

shirube 自身を 1 行足す（`repo: watchout/shirube`、`state: adopted`、`adoption` = OD-SHIRUBE-P1-PR66-EXACT-HEAD-AND-P1-SETTINGS-20261024-001 の記録 [#49 6379461383](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379461383) と、その本文 SHA-256 を作る席が API の本文から測って書く、`hygiene_profile` は今の一覧の値の種類のうち shirube の `.shirube/hygiene-profile.md` に合う物）。

### 3.6 kit が pin の 2 つの mode を残す（`scripts/sds/kit.mjs`）

- `apply`（`upgrade` も同じ関数）は、前の pin にある `plan_binding_mode` と `design_binding_mode` を、`protected_paths`・`adoption` と同じく新しい pin に引き継ぐ。前の pin に無い欄は書かない（無い時の今の既定のまま、S6）。値は変えない（mode の変更は Owner、[KIT]）。
- `apply` の `--target` が shirube 自身の checkout の時（再利用の workflow `.github/workflows/sds-gate.yml` が `on: workflow_call` を持つ時）は、何も書かずに止まり、理由を出す（再利用の workflow を caller で上書きしないため）。shirube 自身の版上げは §5 の 3 の手順で行う。

### 3.7 置き方

| file | 中身 |
|---|---|
| `scripts/sds/design-gate.mjs` | 5.3u と 5.9。`designGate` の入力に `changedPaths` を足す。`unit_design` の時は PASS を返さない。時刻・環境・網を読まない（S4） |
| `scripts/sds/gate.mjs` | 判定 5 に `paths` を渡す。`design_pr` は読まずに JSON に写すだけ（統合する席が読む） |
| `scripts/sds/kit.mjs` | §3.6 |
| `templates/PULL_REQUEST_TEMPLATE.md` | §3.4 |
| `docs/sds/consumers.json` | §3.5 |
| `docs/design/sds-gate-judgment-5.md`・`docs/sds/distribution.md` | §4 の判定 5 の行に 5.3u と 5.9、115 行の統合する席の確かめに作る単位の設計の読み方、§3.6 の mode の引き継ぎ、shirube 自身の版上げ（§5 の 3）。**判定の規範の変更なので risk R3**（§5 の 1。判定 4・5 を足した時の §8 の 6・7 の手順と同じ） |
| 試験 | §4 |

U4 の実装の PR（R2）は保護面に触れず（`.github/**`・`.shirube/**` を変えない）、規範の文書（`distribution.md`・判定 5 の設計の記録）も変えない（R3 の PR で先に変える）。

## 4. 試験

| # | 場合 | 期待 |
|---|---|---|
| T1 | `placements` に当たる path だけの PR | 5.9 は何も出さない |
| T2 | 1 つの path が外れる PR | FAIL `5.9`、外れた path が出る。**今の本体では 5.9 が無く PASS になる**（Red → Green） |
| T3 | 3 つ外れる | 3 つとも並びを固定して出る |
| T4 | rename の旧の path だけが外れる | FAIL（旧と新の両方を見る） |
| T5 | `placements` が無い block | FAIL にならず、`5.9 NOT_CHECKED` の印 |
| T6 | `placements` が文字列の配列でない・空の文字列を含む | FAIL `5.1` |
| T7 | glob の書き方 | `**`・`*` が `protected_paths` と同じに当たる（`matchesAny` の今の試験と同じ組） |
| T8 | `unit_design`、置き場の中の path だけ、ほかの確かめも通る | `design_binding.result` = `NOT_CHECKED`、理由に `5.3u` と 5.9 が通ったこと。**PASS にならない**（負例、BF-U4-01） |
| T9 | `unit_design`、1 つの path が外れる | FAIL `5.9`（5.3u の印も出る） |
| T10 | `unit_design` で、監査して統合した設計を指す PR と、監査なしで統合した設計を指す PR | どちらも PASS にならず、`NOT_CHECKED`（門は承認を確かめたと書かない。区別は統合する席が §3.2 の読み方で行う） |
| T11 | `unit_design` で `design_pr` が無い | FAIL `5.1` |
| T12 | `unit_design` の時、門が `design_pr` の PR・監査・固定の checker を呼ばない | 呼ばれたら失敗する偽物の口を渡しても通る（門が統合済みの PR に checker を当てない） |
| T13 | `owner_decision` の block に `unit_design` の欄を混ぜる・`design_pr` だけを書く | FAIL `5.1`（今の 5.3・5.4 の読み方は変えない） |
| T14 | `report-only` の時に 5.9 が FAIL / 5.3u だけの `NOT_CHECKED` | 門は止まらず、それぞれ FAIL・`NOT_CHECKED` で記録される。`blocking` の時の `NOT_CHECKED` の扱いは今の判定 5 のまま（blocking への切り替えは Owner、§1 の対象外） |
| T15 | 統合する席の確かめ（§3.2）を文書で照らす | R3 の PR の `distribution.md` の 115 行の表の手順に、`design_pr` の監査の返却・受領・名指しの head・file の SHA-256 の 4 つが書かれている（文書の試験、`tests/workflow-contract.test.mjs` と同じ形の文の照合） |
| T16 | `kind` が無い・`owner_decision` | 今の 5.3・5.4 の試験がそのまま通る |
| T17 | `kind` が知らない値 | FAIL `5.1` |
| T18 | `owner_decision` の block で `design_binding_mode` が `blocking` の時に 5.9 が FAIL | 門が止まる（今の判定 5 と同じ） |
| T19 | kit: 2 つの mode を持つ pin に `apply` / `upgrade` | 新しい pin に同じ値が残る。持たない pin では欄が増えない。**今の kit では消える**（Red → Green、BF-U4-02） |
| T20 | kit: `--target` が shirube 自身（`workflow_call` を持つ `sds-gate.yml`） | 何も書かずに止まり、理由が出る |
| T21 | 今の判定 1〜5 と kit の試験 | 全部そのまま通る（期待を弱めない） |
| T22 | 雛形と一覧 | 雛形に `aidlc_record`・`fixes_pr`・`design_pr` と、設計の PR に `audit` を書く説明がある。`consumers.json` が今の形の検査を通り、shirube の行がある |

## 5. 作る順と PR、Owner の手

| 順 | PR | 区分 | 中身 | Owner の手 |
|---|---|---|---|---|
| 0 | この設計の記録（docs だけ） | R1 | この file と項目集合 | 無し（事前の設計監査） |
| 0b | aidlc-shirube の要件の記録を合わせる | ― | `requirements.md` の FR6.1 と受入の例を §1.1 の表のとおりに書き換える（次の版の範囲・要件の段の開き直しの中で、aidlc-shirube の会話が行う） | 要約の確認と段の承認（AI-DLC の会話の手。下の 2 回とは別に数える、OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001） |
| 1 | 判定 5 の規範の改版 | R3 | `docs/sds/distribution.md` の §4 の判定 5 の行（5.3u・5.9）、115 行の統合する席の確かめ（作る単位の設計の読み方、§3.2）、§3.6 の mode の引き継ぎ、shirube 自身の版上げの手順、`docs/design/sds-gate-judgment-5.md` の書き足し。T15 | **exact-head 1 回**（R3） |
| 2a | U4 の実装 その 1 | R2 | 5.9・雛形・一覧・kit の mode の引き継ぎと shirube 自身への書き込みを止める直し（§3.1・§3.3〜§3.6）、T1〜T7・T19〜T22 | 無し（1 の統合の後） |
| 2b | U4 の実装 その 2 | R2 | 5.3u（§3.2）、T8〜T14・T16〜T18 | 無し（2a の統合の後） |
| 3 | shirube 自身の版上げ | R4（保護面） | `.github/workflows/sds-gate-self.yml` の `uses` の commit と、`.shirube/sds-pin.json` の `sds_commit` と `files` の自己用の caller の指紋を、2b の統合 commit に一緒に上げる。2 つの mode と `protected_paths` は変えない。手で書く（kit は使わない、§3.6） | **exact-head 1 回**（`.github/**`・`.shirube/**` の変更） |
| 4 | aun の版上げ | ― | 2a 以降の kit で `kit.mjs upgrade --target <aun>`。差分は kit の file だけ、kit check が OK、2 つの mode が残る | 無し（[KIT] の版上げの決まり。mode は変えない） |

- U4 で Owner の手は 2 回（1 の R3 と 3 の R4）。0b の AI-DLC の会話の要約の確認と段の承認は別に数える。
- 1 の確かめ: R3 の事前の設計監査は、この記録（0）の監査が兼ねる（1 はこの記録の §3・§5 を文書に写す PR）。1 の実装監査で、写した文がこの記録と食い違わないことを見る。
- 3 の確かめ: 統合の前に、workflow-contract の今の試験（pin と `uses` の commit が同じ）が通る。統合の後に、次の shirube の PR の `sds-gate-self` の実行が新しい commit の再利用の workflow を呼んだこと（実行の記録の workflow の参照）と、`design_binding` に 5.9 の印が出ることを読み戻して #24 に書く。
- 4 の確かめ: 版上げの PR で、pin の `plan_binding_mode`・`design_binding_mode` が前と同じ、`.github/workflows/sds-gate.yml`（aun の caller）の `uses` が新しい commit、kit check が OK。
- 3 は [KIT] の standing に当たらない（shirube の自己用の caller は kit の file ではない）。だから Owner の exact-head が 1 回要る。

見積もり: 1 は文書だけ約 40 行と文の照合の試験。2a は code 約 45 行（design-gate の 5.9 が 20、gate の受け渡し 5、kit 10、雛形と一覧 10）・試験約 150 行。2b は code 約 25 行（design-gate の 5.3u が 20、gate の写し 5）・試験約 140 行。どちらも追加 400 行・20 file の内。新しい外部の依存は無い。

最初に使うのは aun の u1 の設計の記録の次の改版（`sds-design` の block に `placements` と `kind: "unit_design"` を書き、その改版の PR の block に `audit` を書いて統合する）。

## 6. 採らなかった案

1. **置き場を製品設計 1 枚に書く**: 製品全体の置き場になり粗い。
2. **base に統合済みであることだけで承認とする（版 1 の `base_branch`）**: 判定 3 は R1 を見ないので、監査なしで統合した設計も PASS になる（1 回目の BF-U4-01）。
3. **統合した設計の PR の監査を、固定の checker で統合の時刻に確かめ直す（版 2 の `audited_merge`）**: 固定の checker は PR が今開いていることを求めるので、統合した後の PR には必ず拒む（2 回目の BF-U4-01）。checker を変えるのは監査の受付の道具の改造になり、U4 の範囲を越える。
4. **統合した後も確かめられる証拠の形を今作る**（例: 設計の PR の head の `sds-gate` の実行の記録とその workflow の版を読む、判定 3 を設計の記録の PR にも当てる）: 判定 3 の範囲を変える規範の変更と、実行の記録の読み方の設計が要る。U4 の目的（置き場の確かめ）を遅らせるので、後の版の候補にする（§8）。
5. **設計の記録の block に、自分の監査の依頼・返却の URL を書く**: 監査は block を書いた後に行うので、自分の中に書けない。
6. **設計の記録の PR を R2 にして判定 3 で止める**: 設計の記録は docs だけで、R1 の決まり（`distribution.md`）を変えることになる。
7. **shirube 自身の版上げも kit で行う**: kit は自己用の caller を作らず、再利用の workflow を上書きする（1 回目の BF-U4-02）。
8. **規範の文書の書き足しを実装の PR（R2）に入れる**: 判定の規範の変更は R3 で、Owner の exact-head が要る（2 回目の BF-U4-03、判定 4・5 を足した時の手順）。
9. **`placements` が無い時に FAIL**: 今ある block すべてに新しい FAIL が出る。書いた設計から効かせる。

## 7. 秘密・権限・復旧

- 資格情報は作らない。門が足す GitHub の読み取りは無い（`design_pr` は JSON に写すだけ）。
- 戻し方: 1（R3）・2a・2b は PR の revert（1 の revert は R3）。3 は自己用の caller と pin を前の commit に戻す PR（保護面）。4 は aun の pin の `sds_commit` を戻す版上げの PR。
- 表・記録は書かない。

## 8. 既知の弱み

- 作る単位の設計の承認は、門では確かめない（`NOT_CHECKED`）。確かめるのは統合する席と独立の監査（I7）で、人の手順の抜けは機械では止まらない（U4 が FR6.1 の一部の実装である所、§1.1）。次の作業の単位（[U4A] の 1）の候補: 設計の記録の PR の head での `sds-gate` の実行の記録（GitHub Actions が作る check run で、個人の資格情報では作れない）と、その実行が呼んだ再利用の workflow の版を読み、その版の門が設計の記録の PR にも監査の受領を求めていたことを確かめる形（判定 3 の範囲を設計の記録の PR に広げる規範の変更と組で、R3）。
- 設計の記録の PR に `audit` を書き忘れて統合した版は、統合する席の確かめで止まる（統合しない）。記録だけの段階のうちは、門の JSON では `NOT_CHECKED` のままなので、統合する席の確かめが唯一の止め。
- `placements` は作者が書く。広すぎる glob（`**`）を書けば何でも通る。広さは設計監査（D5 の範囲）で見る。
- 意味のずれ（設計と違う動き）は門では見つからない。独立の監査と受入の試験の仕事のまま。
## 9. 実装の時に決めた読み（2a・2b）

U4 の 2a（shirube#77）と 2b の実装で、arc が設計の作者として答えた読み（iyasaka-arc#24 6511256242 と 2b の作業指示）。§3・§4 の意味は変えない。

1. T21 の「そのまま通る」は「期待を弱めない」の意味。`placements` の無い block で T5 の `5.9 NOT_CHECKED` の印が増え、既存の試験の完全一致の期待に `5.9` を足すのは、弱めたことにならない。
2. 行の数え方は hygiene の own_code と同じ（空行と comment も数える）。判定 5 の予算は、U4 の PR が `scripts/**` に足した行（`git diff --numstat` の追加）の合計が U4 の枠 100 行（250 − 150、OD-SHIRUBE-GATE5-BUDGET-150-TO-250-20261030-001）以内かで見る。2a = 25 行、2b は 40 行以下。
3. `matchesAny` は `design-gate.mjs` に引数で渡す（import は `node:crypto` だけ）。確かめられない時は FAIL。`placements: []` は 5.1 を通り、変更 path があれば全部 5.9 で FAIL になる。
4. 判定 5 に変更 path が渡されない呼び方では、5.9 を黙って飛ばさず `5.9 NOT_CHECKED: changed paths were not given` の印を出す（2b）。
5. kit が shirube 自身を見分けるのは、`.github/workflows/sds-gate.yml` の `on` のトリガーの構造（判定 4 と同じ YAML reader で読む。YAML 1.1 で `on` が `true` と読まれる場合を含む）。読めない時は書かない（2a の実装監査 1 回目 BF-U4A-01）。

## 10. 2c で足した直し（kit が `delivery_plan` を引き継ぐ）

U4 の 4（aun の版上げ）の作業指示を書く前に、arc が手元で試して見つけた漏れの直し（iyasaka-arc#24 の 2c の作業指示）。§3・§4 の判定の意味は変えない。

1. kit の `apply`（`upgrade` も同じ関数）は、前の pin の `delivery_plan`（判定 4 が読む、その repo の道筋の置き場 `control_source`）も、§3.6 の 2 つの mode と同じく、値を変えずに新しい pin に引き継ぐ。前の pin に無ければ書かない。
2. 漏れた理由: §3.6 は 2 つの mode だけを挙げ、§5 の 4 の確かめも 2 つの mode・`uses`・kit check だけだった。aun の pin は U6（aun#50）で `delivery_plan` を手で足している。2b までの kit で aun を `upgrade` すると `delivery_plan` が消え、kit check は OK のまま通る。消えると、道筋に結ぶ aun の PR の判定 4 は `4.3a the base pin has no delivery_plan.control_source` になり、判定 5 の 5.5・5.6 も NOT_CHECKED になる（arc が shirube main `1cd35a4e` の kit で、aun main `95edaee` の写しに対して確かめた）。
3. §5 の 4 の確かめに、pin の `delivery_plan` が前と同じであることを足す。U4 の 4 は 2c の統合の後に、2c の統合 commit の kit で行う。版上げの PR の監査は、版上げのたびに使う項目集合（aun の `docs/audit/sds-kit-upgrade-audit-items.json`）で行い、base の pin の欄が 1 つも消えないことを見る。
4. `docs/sds/distribution.md` §3 の mode の引き継ぎの文にこの欄の名前を足すのは、次に distribution.md を改める PR（R3）で行う。それまでの規範の文と kit の違いは、この節に書いて明示する（kit は規範より 1 欄多く守るだけで、規範に反する振る舞いは無い）。
