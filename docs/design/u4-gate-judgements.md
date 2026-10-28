# Shirube U4 — 門の判定 5 を、変更 path が設計の置き場の中かまで広げる（設計の記録）

版 2（2026-10-28。版 1 との違い: 設計監査 1 回目（shirube#75 6464718660）の 2 つの指摘を直した。BF-U4-01 = 作る単位の設計の承認を「base に統合済み」だけで PASS にしていたのをやめ、その版を統合した設計の PR の監査の受領を、統合した時刻で確かめ直す形（`kind: "audited_merge"`、§3.2）にした。BF-U4-02 = 版上げの計画を、shirube 自身の自己用の caller と pin を一緒に上げる保護面の PR（Owner の exact-head 1 回）と、kit が pin の 2 つの mode を落とさない直し（§3.6）に改めた）。設計の作者 = arc。作る席 = shirube の席、監査 = devauditor、統合 = suite-lead。

適用 ID:
- OD-SHIRUBE-NEXT-VERSION-START-U4-20261028-001（[iyasaka-arc#49 6463776044](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6463776044)、本文 SHA-256 `b0cd543f8198be0da69ebc00e378df94578b4c7056f7deb5cc84e104d64d3d14`。次の版を今から U4 で始める。以下 [NV]）
- OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（#49 6336035707。止める判定に LLM を使わない、門の FAIL は devauditor が分類する）
- OD-SHIRUBE-TF-Q7-B-LATER-VERSIONS-IN-SAME-INTENT-20261027-001（#49 6437072374。後の版も同じ取り組みの記録で扱う）
- OD-KIT-UPGRADE-STANDING-AND-INCEPTION-WHILE-WAITING-20261021-001（[#49 6308341298](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308341298)、本文 SHA-256 `d2d1a8e4da93411d6baa1cca8ef2338d6b9822db15eb43489b9d3dabeb43bf94`。kit の版上げの PR の決まり。以下 [KIT]）

入力: shirube main `6847393a51b337e5f1a7ed9967ea16d78de41c12` の `scripts/sds/gate.mjs`・`scripts/sds/design-gate.mjs`・`scripts/sds/kit.mjs`・`scripts/hygiene/lib.mjs`（`matchesAny`）・`scripts/hygiene/audit-admission.mjs`（`verifyAudit`）・`.github/workflows/sds-gate-self.yml`・`.shirube/sds-pin.json`・`docs/design/sds-gate-judgment-5.md`・`templates/PULL_REQUEST_TEMPLATE.md`・`docs/sds/consumers.json`・`docs/sds/distribution.md`。以下 [M]。要件: aidlc-shirube の取り組み `261021-dev-speedup-automation` の要件 FR6.1・FR6.2・FR7.3 と、作業の単位 U4。以下 [REQ]。

## 1. 目的と対象外

**目的**（[REQ] の FR6.1）: 門の判定 5 が、形だけを見て次の 2 つを確かめる。どちらかに当たらない時、または確かめられない時は FAIL（最初は記録だけ）。
1. PR が指す設計の記録のその版が承認済みか。
2. PR の変更 path が、その設計の記録に書いた置き場の中か。外れた path を出す。

設計どおりの振る舞いかという意味のずれは、今までどおり独立の監査（監査の規格 v1 の I7）と受入の試験で見る（[REQ] の FR6.2）。門は意味を見ない。止める判定に LLM を使わない。

あわせて U4 の残り 2 つを入れる: PR の雛形に「AI-DLC の記録」と「直す元の PR」の欄を足す、配布先の一覧に shirube を足す。版上げで判定 5 が黙って止まらないよう、kit が pin の 2 つの mode を残す直しも入れる（§3.6）。

**対象外**: 判定 5 を止める形にすること（pin の `design_binding_mode` は `report-only` のまま。切り替えは repo ごとに Owner が決める、[REQ] の FR7.3）、判定 1〜4 の決まり、固定 checker、required checks・branch protection、計測の部品（U2）、承認の記録の作り手（I1〜I4・K）。

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

### 3.2 作る単位の設計の記録の承認（`kind: "audited_merge"`、新しい 5.3b）

置き場を細かく書けるのは、作る単位の設計の記録（例: aun の `docs/design/u1-live-handoff.md`）。これらは Owner の決定ではなく、独立の設計監査を通して統合される。その承認を、統合した設計の PR の監査の受領から観測する。

- block の `approval` に `kind` を足す。`kind` が無い・`owner_decision` の時は今のまま（5.3・5.4）。
- `kind: "audited_merge"` の時、block の `approval` は `{ "kind": "audited_merge" }` だけ。PR 本文の `design_binding` に `design_pr`（その設計の版を統合した PR の番号。同じ repo）を足す。
- 門の確かめ（5.3b）。全部が成り立つ時だけ何も出さない。
  1. `design_pr` が統合済み（`merged_at` がある）。
  2. `design_pr` の統合の commit が、今の PR の base の commit から辿れる（GitHub の compare の `status` が `ahead` か `identical`）。
  3. `design_pr` の head で、`design_binding` が指す path の file の SHA-256 が `design_sha256` と同じ（監査した版と、今の PR が指す版が同じ bytes）。
  4. `design_pr` の本文の `sds-pr` の block に `audit`（`request`・`request_sha256`・`review`）があり、判定 3 と同じ関数（`gate.mjs` の `audited`、S3）が、ctx = `{ repo, pr: design_pr, head: design_pr の head }`、`now` = `design_pr` の `merged_at` で `RECEIPT_ACCEPTED` を返し、依頼がその PR・その head を名指す。
- どれかが成り立たない時は FAIL（理由 `5.3b the design version has no accepted audit at its merge: <どの確かめか>`）。読めない時も FAIL（理由 `5.3b could not read ...`、S8）。確かめられない物を PASS にしない。
- 監査の依頼の期限（`expires_at`）は、統合した時刻（`merged_at`）で見る。後の PR の時刻で見直さないので、期限切れで正しい PR が FAIL にならない。一方、過去の承認があったかどうかは毎回確かめ直す（上の 4）。この 2 つを分ける。
- 設計の記録の PR（R1）は監査が必須ではない（判定 3 は見ない）。後の PR の承認の元にする設計の記録の PR は、監査の依頼を出した後に自分の PR 本文の block に `audit` を書いてから統合する（判定 3 が R2 以上に求める欄と同じ形）。書かずに統合した版は、5.3b で FAIL になる。

### 3.3 置き場の確かめ（新しい 5.9）

- 判定 2 が確かめた変更 path（rename は旧と新の両方）を、判定 5 に渡す。
- block に `placements` があれば、変更 path の 1 つずつが `matchesAny(path, placements)` に当たるかを見る。当たらない path が 1 つでもあれば FAIL（理由 `5.9 paths outside the design placements: <path, ...>`。外れた path を全部、並びを固定して出す）。
- `placements` が無ければ、FAIL にせず `5.9 NOT_CHECKED: the design names no placements` の印を出す（今ある block に新しい FAIL を足さないため）。
- 5.9 は 5.1 が通った時だけ見る。

### 3.4 PR の雛形（`templates/PULL_REQUEST_TEMPLATE.md`）

- 「What this PR does」に 1 行足す: `aidlc_record:`（この PR が従う AI-DLC の記録の path。無ければ `none`）。
- `sds-pr` の block の例に、任意の欄 `fixes_pr`（この PR が直す元の PR の URL。直しでなければ欄ごと消す）を足す。門は読まない（[M] の `gate.mjs` 25〜31 行）。後の版の計測（U2）が読む。
- 判定 5 の説明の文に、`placements`・`kind: "audited_merge"`・`design_pr` と、§3.2 の最後の段落（設計の PR にも `audit` を書く）を足す。

### 3.5 配布先の一覧（`docs/sds/consumers.json`）

shirube 自身を 1 行足す（`repo: watchout/shirube`、`state: adopted`、`adoption` = OD-SHIRUBE-P1-PR66-EXACT-HEAD-AND-P1-SETTINGS-20261024-001 の記録 [#49 6379461383](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379461383) と、その本文 SHA-256 を作る席が API の本文から測って書く、`hygiene_profile` は今の一覧の値の種類のうち shirube の `.shirube/hygiene-profile.md` に合う物）。

### 3.6 kit が pin の 2 つの mode を残す（`scripts/sds/kit.mjs`）

- `apply`（`upgrade` も同じ関数）は、前の pin にある `plan_binding_mode` と `design_binding_mode` を、`protected_paths`・`adoption` と同じく新しい pin に引き継ぐ。前の pin に無い欄は書かない（無い時の今の既定のまま、S6）。値は変えない（mode の変更は Owner、[KIT]）。
- `apply` の `--target` が shirube 自身の checkout の時（再利用の workflow `.github/workflows/sds-gate.yml` が `on: workflow_call` を持つ時）は、何も書かずに止まり、理由を出す（再利用の workflow を caller で上書きしないため）。shirube 自身の版上げは §5 の 2 の手順で行う。

### 3.7 置き方

| file | 中身 |
|---|---|
| `scripts/sds/design-gate.mjs` | 5.3b と 5.9。`designGate` の入力に `changedPaths` と `auditedMerge`（呼び手が観測した 1〜4 の結果）を足す。時刻・環境・網を読まない（S4） |
| `scripts/sds/gate.mjs` | 判定 5 に `paths` を渡す。`kind: "audited_merge"` の時だけ、`design_pr` の PR・compare・file・`audited`（判定 3 と同じ関数）を読んで `auditedMerge` を作る。読めなければ FAIL（S8） |
| `scripts/sds/kit.mjs` | §3.6 |
| `templates/PULL_REQUEST_TEMPLATE.md` | §3.4 |
| `docs/sds/consumers.json` | §3.5 |
| `docs/design/sds-gate-judgment-5.md` | 5.3b と 5.9 を足す（R3） |
| `docs/sds/distribution.md` | §3.6 の mode の引き継ぎと、shirube 自身の版上げ（§5 の 2）を足す |
| 試験 | §4 |

U4 の実装の PR は保護面に触れない（`.github/**`・`.shirube/**` を変えない）。

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
| T8 | `audited_merge`、1〜4 が全部成り立つ | 5.3b は何も出さず、5.3・5.4 は見ない |
| T9 | **同じ祖先の関係を持つ 2 つの設計の PR のうち、`audit` の無い方（監査なしで統合した R1）を指す** | FAIL `5.3b`（4）。監査した方を指すと T8。**今の本体と版 1 の 5.3b では区別できない**（負例、BF-U4-01） |
| T10 | 受領は通るが、依頼が別の PR か別の head を名指す | FAIL `5.3b`（4） |
| T11 | 監査の依頼の期限が、統合の時刻の後・今の時刻の前 | 5.3b は何も出さない（期限は統合の時刻で見る） |
| T12 | 期限が統合の時刻より前 | FAIL `5.3b`（4） |
| T13 | `design_pr` の head の file の SHA-256 が `design_sha256` と違う（監査の後に変えた版を指す） | FAIL `5.3b`（3） |
| T14 | `design_pr` が未統合 / 統合の commit が base から辿れない | FAIL `5.3b`（1）/（2） |
| T15 | PR・compare・file が読めない | FAIL `5.3b could not read`（S8） |
| T16 | `kind` が無い・`owner_decision` | 今の 5.3・5.4 の試験がそのまま通る |
| T17 | `kind` が知らない値、`audited_merge` で `design_pr` が無い | FAIL `5.1` |
| T18 | `design_binding_mode` が `report-only` の時に 5.9 か 5.3b が FAIL | 門は止まらず、`design_binding.result` が FAIL で記録される。`blocking` の時は止まる |
| T19 | kit: 2 つの mode を持つ pin に `apply` / `upgrade` | 新しい pin に同じ値が残る。持たない pin では欄が増えない。**今の kit では消える**（Red → Green、BF-U4-02） |
| T20 | kit: `--target` が shirube 自身（`workflow_call` を持つ `sds-gate.yml`） | 何も書かずに止まり、理由が出る |
| T21 | 今の判定 1〜5 と kit の試験 | 全部そのまま通る（期待を弱めない） |
| T22 | 雛形と一覧 | 雛形に `aidlc_record`・`fixes_pr`・`design_pr` がある。`consumers.json` が今の形の検査を通り、shirube の行がある |

## 5. 作る順と PR、Owner の手

| 順 | PR | 区分 | 中身 | Owner の手 |
|---|---|---|---|---|
| 0 | この設計の記録（docs だけ） | R1 | この file と項目集合 | 無し（事前の設計監査） |
| 1a | U4 の実装 その 1 | R2 | 5.9・雛形・一覧・kit の mode の引き継ぎ（§3.1・§3.3〜§3.6）、T1〜T7・T19〜T22 | 無し |
| 1b | U4 の実装 その 2 | R2 | 5.3b（§3.2）と判定 5 の設計の記録・distribution.md の書き足し、T8〜T18 | 無し |
| 2 | shirube 自身の版上げ | R4（保護面） | `.github/workflows/sds-gate-self.yml` の `uses` の commit と、`.shirube/sds-pin.json` の `sds_commit` と `files` の自己用の caller の指紋を、1b の統合 commit に一緒に上げる。2 つの mode と `protected_paths` は変えない。手で書く（kit は使わない、§3.6） | **exact-head 1 回**（`.github/**`・`.shirube/**` の変更） |
| 3 | aun の版上げ | ― | 1a 以降の kit で `kit.mjs upgrade --target <aun>`。差分は kit の file だけ、kit check が OK、2 つの mode が残る | 無し（[KIT] の版上げの決まり。mode は変えない） |

- 2 の確かめ: 統合の前に、workflow-contract の今の試験（pin と `uses` の commit が同じ）が通る。統合の後に、次の shirube の PR の `sds-gate-self` の実行が新しい commit の再利用の workflow を呼んだこと（実行の記録の workflow の参照）と、`design_binding` に 5.9 の印が出ることを読み戻して #24 に書く。
- 3 の確かめ: 版上げの PR で、pin の `plan_binding_mode`・`design_binding_mode` が前と同じ、`.github/workflows/sds-gate.yml`（aun の caller）の `uses` が新しい commit、kit check が OK。
- 2 は [KIT] の standing に当たらない（shirube の自己用の caller は kit の file ではない）。だから Owner の exact-head が 1 回要る。

見積もり: 1a は code 約 45 行（design-gate の 5.9 が 20、gate の受け渡し 5、kit 10、雛形と一覧 10）・試験約 150 行。1b は code 約 75 行（design-gate の 5.3b が 25、gate の読み 50）・試験約 220 行。どちらも追加 400 行・20 file の内。新しい外部の依存は無い。

最初に使うのは aun の u1 の設計の記録の次の改版（`sds-design` の block に `placements` と `kind: "audited_merge"` を書き、その改版の PR の block に `audit` を書いて統合する）。

## 6. 採らなかった案

1. **置き場を製品設計 1 枚に書く**: 製品全体の置き場になり粗い。
2. **base に統合済みであることだけで承認とする（版 1 の `base_branch`）**: 判定 3 は R1 を見ないので、監査なしで統合した設計も PASS になる（BF-U4-01）。
3. **後の PR の時刻で、設計の監査の依頼を読み直す**: 依頼の期限が過ぎて、正しい PR が FAIL になる。期限は統合の時刻で見る（§3.2）。
4. **設計の記録の block に、自分の監査の依頼・返却の URL を書く**: 監査は block を書いた後に行うので、自分の中に書けない。統合した PR の block の `audit` から読む。
5. **設計の記録の PR を R2 にして判定 3 で止める**: 設計の記録は docs だけで、R1 の決まり（`distribution.md`）を変えることになる。後の PR の承認の元にする時だけ `audit` を求める形で足りる。
6. **shirube 自身の版上げも kit で行う**: kit は自己用の caller を作らず、再利用の workflow を上書きする（BF-U4-02）。
7. **`placements` が無い時に FAIL**: 今ある block すべてに新しい FAIL が出る。書いた設計から効かせる。

## 7. 秘密・権限・復旧

- 資格情報は作らない。門が足す読み取りは、`design_pr` の PR・compare・file 1 つ・判定 3 と同じ監査の読みだけ（`kind: "audited_merge"` の時だけ）。
- 戻し方: 1a・1b は PR の revert。2 は自己用の caller と pin を前の commit に戻す PR（保護面）。3 は aun の pin の `sds_commit` を戻す版上げの PR。
- 表・記録は書かない。

## 8. 既知の弱み

- `audited_merge` は、設計の PR の監査の受領を観測するだけで、受領の後に人が誤って統合した物も「監査済み」として通る（監査の結果が PASS だったかは受領の checker が見る範囲まで）。
- 設計の記録の PR に `audit` を書き忘れて統合した版は、後の PR で 5.3b が FAIL になる。記録だけの段階のうちは devauditor の FAIL の分類（PR の不備）で見つけ、設計の改版で直す。
- `placements` は作者が書く。広すぎる glob（`**`）を書けば何でも通る。広さは設計監査（D5 の範囲）で見る。
- 意味のずれ（設計と違う動き）は門では見つからない。独立の監査と受入の試験の仕事のまま。
