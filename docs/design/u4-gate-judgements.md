# Shirube U4 — 門の判定 5 を、変更 path が設計の置き場の中かまで広げる（設計の記録）

版 1（2026-10-28）。設計の作者 = arc。作る席 = shirube の席、監査 = devauditor、統合 = suite-lead。

適用 ID:
- OD-SHIRUBE-NEXT-VERSION-START-U4-20261028-001（[iyasaka-arc#49 6463776044](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6463776044)、本文 SHA-256 `b0cd543f8198be0da69ebc00e378df94578b4c7056f7deb5cc84e104d64d3d14`。次の版を今から U4 で始める。以下 [NV]）
- OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（#49 6336035707。止める判定に LLM を使わない、門の FAIL は devauditor が分類する）
- OD-SHIRUBE-TF-Q7-B-LATER-VERSIONS-IN-SAME-INTENT-20261027-001（#49 6437072374。後の版も同じ取り組みの記録で扱う）

入力: shirube main `6847393a51b337e5f1a7ed9967ea16d78de41c12` の `scripts/sds/gate.mjs`・`scripts/sds/design-gate.mjs`・`scripts/hygiene/lib.mjs`（`matchesAny`）・`docs/design/sds-gate-judgment-5.md`・`templates/PULL_REQUEST_TEMPLATE.md`・`docs/sds/consumers.json`。以下 [M]。要件: aidlc-shirube の取り組み `261021-dev-speedup-automation` の要件 FR6.1・FR6.2・FR7.3 と、作業の単位 U4（`inception/units-generation/unit-of-work.md`）。以下 [REQ]。

## 1. 目的と対象外

**目的**（[REQ] の FR6.1）: 門の判定 5 が、形だけを見て次の 2 つを確かめる。どちらかに当たらない時は FAIL（最初は記録だけ）。
1. PR が指す設計の記録が承認済みか。
2. PR の変更 path が、その設計の記録に書いた置き場の中か。外れた path を出す。

設計どおりの振る舞いかという意味のずれは、今までどおり独立の監査（監査の規格 v1 の I7）と受入の試験で見る（[REQ] の FR6.2）。門は意味を見ない。止める判定に LLM を使わない。

あわせて U4 の残り 2 つを入れる: PR の雛形に「AI-DLC の記録」と「直す元の PR」の欄を足す、配布先の一覧に shirube を足す。

**対象外**: 判定 5 を止める形にすること（pin の `design_binding_mode` は `report-only` のまま。切り替えは repo ごとに Owner が決める、[REQ] の FR7.3）、判定 1〜4 の決まり、固定 checker、保護面・required checks・branch protection、計測の部品（U2）、承認の記録の作り手（I1〜I4・K）。

## 2. 今の形（[M]）

- 判定 5 は、PR 本文の `design_binding`（`design_ref` = commit を固定した .md、`design_sha256`、`design_id`、`version`）が指す file から ```` ```json sds-design ```` の block を 1 個読み、`designGate` に渡す。
- `designGate` が見るのは: 形（5.1）、未決の問いに答えがあるか（5.2）、承認（5.3・5.4 = `approval.ref` の comment に `shirube-owner-decision/v1` と `design_id@version`）、道筋の今の node との結び付き（5.5〜5.7）、PR が名指す版と block の版（5.8）。
- 変更 path は見ていない。判定 2 が「PR の block の changed_paths = diff」を確かめた `paths` は、判定 5 に渡っていない。
- `sds-design` の block を持つのは、製品設計 1 枚（例: aun の `docs/design/aun-product-design.md`）だけ。製品設計の置き場は製品全体なので、そこに path を書いても粗すぎて外れを見つけにくい。
- 判定 5 の段階は pin の `design_binding_mode`（shirube・aun とも `report-only`）。判定 4 は `plan_binding_mode`、判定 1〜3 は止める形。判定ごとの段階は既に pin の mode にそろっているので、U4 の「段階をそろえる」で足す物は無い（§6 の 3）。

## 3. 作る物

### 3.1 置き場の欄 `placements`

`sds-design/1` の block に、任意の欄 `placements` を足す。
- 形: 文字列の配列。1 つずつが glob で、書き方は `scripts/hygiene/lib.mjs` の `matchesAny`（`protected_paths` と同じ）。新しい書き方を作らない（S3）。
- 意味: この設計の記録に従う PR が変えてよい path の全部。試験・項目集合の置き場（例: `docs/audit/**`）も、この設計の PR が触るなら書く。
- 欄が無い block は、今までどおり読める（新旧の同居、S6）。

### 3.2 作る単位の設計の記録にも block を置ける（承認の種類 `base_branch`）

置き場を細かく書けるのは、作る単位の設計の記録（例: aun の `docs/design/u1-live-handoff.md`、onza の `docs/design/common-0.4-read-principal.md`）。これらは Owner の決定ではなく、独立の設計監査を通して統合される。そこで承認の種類を 1 つ足す。
- block の `approval` に `kind` を足す。`kind` が無い・`owner_decision` の時は今のまま（5.3・5.4）。
- `kind: "base_branch"` の時（新しい 5.3b）: block の `approval` は `{ "kind": "base_branch" }` だけで、`ref`・`sha256` を持たない。門は、`design_ref` の commit が PR の base の commit から辿れる（base に統合済みの設計の記録である）ことを、GitHub の compare（`repos/{repo}/compare/{design の commit}...{base の commit}` の `status` が `ahead` か `identical`）で確かめる。辿れなければ FAIL（理由 `5.3b the design is not on the PR base`）。5.4 は見ない。
- 理由: 作る単位の設計の記録は、統合の前に事前の監査（判定 3）を通る。統合済みであることが承認の証拠になる。監査の依頼には期限があるので、後の PR の時に監査の依頼を読み直す形にはしない（期限切れで正しい PR が FAIL になる）。
- 弱み（§8）: 判定 3 を必須にしていない repo（今は aun）では、統合済みが監査済みを意味しない。そこは記録だけの段階で、FAIL の分類（devauditor）で補う。

### 3.3 置き場の確かめ（新しい 5.9）

- 判定 2 が確かめた変更 path（rename は旧と新の両方）を、判定 5 に渡す。
- block に `placements` があれば、変更 path の 1 つずつが `matchesAny(path, placements)` に当たるかを見る。当たらない path が 1 つでもあれば FAIL（理由 `5.9 paths outside the design placements: <path, ...>`。外れた path を全部、並びを固定して出す）。
- `placements` が無ければ、FAIL にせず `5.9 NOT_CHECKED: the design names no placements` の印を出す（今ある block に新しい FAIL を足さないため。devauditor の分類の手間を増やさない）。
- 5.9 は 5.1 が通った時だけ見る。

### 3.4 PR の雛形（`templates/PULL_REQUEST_TEMPLATE.md`）

- 「What this PR does」に 1 行足す: `aidlc_record:`（この PR が従う AI-DLC の記録の path。無ければ `none`）。
- `sds-pr` の block の例に、任意の欄 `fixes_pr`（この PR が直す元の PR の URL。直しでなければ欄ごと消す）を足す。門は読まない（block の読み方は `schema` と `changed_paths` だけを求める、[M] の `gate.mjs` 25〜31 行）。後の版の計測（U2）が読む。
- 判定 5 の説明の文に、`placements` と `kind: "base_branch"` を足す。

### 3.5 配布先の一覧（`docs/sds/consumers.json`）

shirube 自身を 1 行足す（`repo: watchout/shirube`、`state: adopted`、`adoption` = OD-SHIRUBE-P1-PR66-EXACT-HEAD-AND-P1-SETTINGS-20261024-001 の記録 [#49 6379461383](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379461383) と、その本文 SHA-256 を作る席が API の本文から測って書く、`hygiene_profile` は今の一覧の値の種類（`none`・`docs`・`product`）のうち shirube の `.shirube/hygiene-profile.md` に合う物）。

### 3.6 置き方と順

| file | 中身 |
|---|---|
| `scripts/sds/design-gate.mjs` | 5.3b と 5.9。`designGate` の入力に `changedPaths` と `baseContainsDesign`（真偽、呼び手が渡す）を足す。時刻・環境・網を読まない（S4） |
| `scripts/sds/gate.mjs` | 判定 5 に `paths` を渡し、`kind: "base_branch"` の時だけ compare を 1 回呼んで `baseContainsDesign` を作る。読めなければ FAIL（S8） |
| `templates/PULL_REQUEST_TEMPLATE.md` | §3.4 |
| `docs/sds/consumers.json` | §3.5 |
| `docs/design/sds-gate-judgment-5.md` | 5.3b と 5.9 を足す（設計と実装を黙って食い違わせない、R3） |
| 試験（`tests/design-gate.test.mjs`・`tests/sds-gate.test.mjs` に足す。新しい試験の file を作ってもよい） | §4 |

U4 は保護面に触れない（`.github/**`・`.shirube/**` を変えない）。配布先（aun など）で効くのは、それぞれの pin の `sds_commit` を上げた後（キットの版上げの PR、OD-KIT-UPGRADE-STANDING-AND-INCEPTION-WHILE-WAITING-20261021-001 の決まり）。

## 4. 試験

| # | 場合 | 期待 |
|---|---|---|
| T1 | `placements` に当たる path だけの PR | 5.9 は何も出さない |
| T2 | 1 つの path が外れる PR | FAIL `5.9`、外れた path が出る。**今の本体では 5.9 が無く PASS になる**（Red → Green） |
| T3 | 3 つ外れる | 3 つとも並びを固定して出る |
| T4 | rename の旧の path だけが外れる | FAIL（旧と新の両方を見る） |
| T5 | `placements` が無い block | FAIL にならず、`5.9 NOT_CHECKED` の印 |
| T6 | `placements` が文字列の配列でない・空の文字列を含む | FAIL `5.1`（形の誤り） |
| T7 | glob の書き方 | `**`・`*` が `protected_paths` と同じに当たる（`matchesAny` の今の試験と同じ組で確かめる） |
| T8 | `kind: "base_branch"`、design の commit が base から辿れる | 5.3b は何も出さず、5.3・5.4 は見ない |
| T9 | `kind: "base_branch"`、辿れない（統合前の branch の commit） | FAIL `5.3b` |
| T10 | compare が読めない | FAIL（読めない物を成功にしない、S8） |
| T11 | `kind` が無い・`owner_decision` | 今の 5.3・5.4 の試験がそのまま通る |
| T12 | `kind` が知らない値 | FAIL `5.1` |
| T13 | `design_binding_mode` が `report-only` の時に 5.9 か 5.3b が FAIL | 門は止まらず、`design_binding.result` が FAIL で記録される。`blocking` の時は止まる（今の判定 5 と同じ） |
| T14 | 今の判定 1〜5 の試験 | 全部そのまま通る（期待を弱めない） |
| T15 | 雛形と一覧 | 雛形に `aidlc_record` と `fixes_pr` がある。`consumers.json` が今の形の検査を通り、shirube の行がある |

## 5. 作る順と PR、Owner の手

| 順 | PR | 区分 | 中身 | Owner の手 |
|---|---|---|---|---|
| 0 | この設計の記録（docs だけ） | R1 | この file と項目集合 | 無し（事前の設計監査） |
| 1 | U4 の実装 | R2 | §3.6 の file と §4 の試験 | 無し |
| 2 | shirube 自身の pin の版上げ | ― | `.shirube/sds-pin.json` の `sds_commit` を U4 の統合 commit に | 無し（キットの版上げの決まり） |
| 3 | aun の pin の版上げ | ― | 同じ | 無し（同じ） |

見積もり: code 約 80 行（design-gate 50、gate 15、雛形と一覧 15）、試験約 200 行。追加 400 行・20 file の内。新しい外部の依存は無い。

最初に使うのは aun の u1 の設計の記録の次の改版（受入の前の改版。`sds-design` の block を置き、`placements` と `kind: "base_branch"` を書く）。

## 6. 採らなかった案

1. **置き場を製品設計 1 枚に書く**: 製品全体の置き場になり粗い。外れを見つけにくい。
2. **作る単位の承認を、設計の監査の依頼と返却を読み直して確かめる**: 監査の依頼には期限があり、後の PR の時に期限切れで正しい PR が FAIL になる。統合済みであることで足りる。
3. **判定 1〜5 の段階を 1 つの欄にまとめる**: 判定ごとの段階は既に pin の mode にそろっている（判定 1〜3 は止める、4・5 は pin の mode）。足す物は無い。
4. **置き場を作業指示（項目集合の範囲の文）から読む**: 項目集合は人が読む文で、形が決まっていない。機械が読む欄は設計の記録の block に置く。
5. **`placements` が無い時に FAIL**: 今ある block すべてに新しい FAIL が出て、devauditor の分類の手間が増える。書いた設計から効かせる。

## 7. 秘密・権限・復旧

- 資格情報は作らない。門が読む物は、今の判定 5 と同じ GitHub の読み取りに compare 1 回が足されるだけ。
- 戻し方: PR の revert。配布先は pin の `sds_commit` を戻す。
- 表・記録は書かない。

## 8. 既知の弱み

- 判定 3 を必須にしていない repo では、統合済みの設計の記録が監査済みとは限らない（5.3b の弱み）。aun は判定 3 を必須にする決定の前なので、記録だけの段階のうちは FAIL の分類で補う。
- `placements` は作者が書く。広すぎる glob（`**`）を書けば何でも通る。広さは設計監査（D5 の範囲）で見る。
- 意味のずれ（設計と違う動き）は門では見つからない。独立の監査と受入の試験の仕事のまま。
