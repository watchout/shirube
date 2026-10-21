# 薄片 2・3 の設計の記録 v1 — 監査の受領を必須に・Delivery Plan と作業指示に結ぶ

この file は設計の記録です。実装でも Owner の採択でもありません。設計の作者は ARC、この記録の作成は shirube の席（作業指示 CH-SHIRUBE-DESIGN-REC-SLICE23-20261021 v3）です。R4 の実装（薄片 2・3 の code と workflow）の前に、独立監査（D23-1〜6 と PL-1〜5）を受けます。この監査の PASS と受領の前は、これに基づく実装の作業指示は出ません（[CH]）。

## 参照

本文の SHA-256 は、GitHub API の comment の `body` を bytes のまま実測した値です。

| 記号 | 記録 | URL | 本文の SHA-256 |
|---|---|---|---|
| [V1] | 設計 v1（ARC） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6305635938 | `5a896ea234bcb909cdc103a9f1431b7a463164c7e9820c3358422ecc7aa19881` |
| [OD-F] | 仕様の固定（Owner の決定 OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305503572 | `22f4a3c51efde3f0f8fb0041c75d3f7ba7a56d0161b9c54636b7f78dcac38d30` |
| [OI-K] | 門と script・きっかけの prompt（Owner の指示 OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305560011 | `ff88552a4595270c18be431ab973052d868f589f4c42458097e15a845c75f243` |
| [OD-S1] | S1 の 7 条件と作業指示の範囲の拡張（Owner の決定 OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673 | `8c6f8542888d5cd0302146f5d6f10bb097ab9fe12893fee533f670984a5a4893` |
| [DP] | 道筋 DP-SHIRUBE-001 generation 1（ARC が採択） | https://github.com/watchout/shirube/issues/6#issuecomment-6305815774 | comment 全体 `965d060694bc9d3fed1e0797e017dabf32f56878833da070bce6df402632aad2`。道筋の本体 = その中の yaml の囲みの中身（21466 bytes、末尾 LF 1 個）の SHA-256 `d8885559c92ae5caf605cdf1679cc7cf9cf81f751061685aee5d094ba7f83751` |
| [CH] | 作業指示 v3（ARC） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6305927504 | `adf5d739bc716b9d59dff70677b3eb703f4e7ba44d18efd544a94d564b0bb357` |
| [M] | shirube main `f8413fe1734ed24ea6ffdc665019e70e0320a2f9`（tree `4dbd88e4e5641ad428e29fc08299eeb19c2b9f5a`）。引くもの: `docs/sds/distribution.md`・`docs/sds/audit-method.md`・`kit/sds-gate-caller.yml`・`.github/workflows/sds-gate.yml`・`scripts/sds/*.mjs`・`.shirube/hygiene-profile.md` | commit 固定 | — |

道筋の file は repo に写していません（ARC の裁定。知識は 1 か所、S3）。道筋の本体は [DP] の yaml の囲みで、上の SHA-256 で取り直して照合できます。

## 設計 v1 の写し

次の §0〜§8 は [V1] の本文をそのまま写しました（先頭の「適用 ID」の行から §8 の終わりまで。この file の作成時に、[V1] の 4〜72 行と一致することを機械で照合）。設計の中身は変えていません。[V1] の末尾の `next_action` の行は、v1 を出した時点の引渡しなので写していません。

適用 ID: OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001（#49 6305503572）、OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001（#49 6305560011）、OI-SHIRUBE-NO-AUDIT-NO-SKIP-CONTROL-20261021-001（#49 6304645183）、OD-SHIRUBE-CONTROL-FIRST-THIN-SLICE-20261020-001、OD-SHIRUBE-IMPLEMENTER-CODEX-ADF-20260929、Protected surface = owner gate。作者 = arc（control_artifact_author）。risk = R4（workflow と pin に触れる）。実装の前に設計の事前監査（D1〜D6）を通す。

### 0. 目的（Owner の言葉）と完了の定義
「監査なしでは進めない」「フローを飛ばしていたら進めない」「手続きが重くなりすぎるのはやりたくない」「shirube に入れる、aun に配布 → 1 周テスト → 全てに配布、次の段階」。
完了 = §5 の「1 周」の 5 条件を AUN で満たし、全 repo に配り、薄片 3 が止める段で動いている。作者の手間は PR の block の数行と label だけ。

### 1. 段階の表（AI-DLC の段階 × 担い手 × きっかけの prompt × 出力の記録 × 門）
きっかけの prompt = `awslabs/aidlc-workflows` @ `9b8df02231f0230fd6f19846a0df1fb5567e7ece`（MIT-0）の `core/aidlc-common/stages/` の file。Shirube はこれを言い直さず、入力の参照と出力の記録の形だけを添える。

| AI-DLC の段階 | 担い手 | きっかけの prompt（stage file） | 出力の記録 | 門（機械が見る参照） |
|---|---|---|---|---|
| Intent capture | 人 + LLM | ideation/intent-capture.md | 製品設計 1 枚（Intent）と Owner の承認 | なし（Requirements が参照） |
| Requirements analysis | LLM + 人（Owner が Consolidated Summary を確認） | inception/requirements-analysis.md | requirement-sheet（受入 ID の表、EARS）= Delivery Plan の `owner_outcome.terminal_predicates`（今の段の分） | **PA-1（新）**: 今の段の受入 ID に Owner の採択の参照がある道筋だけ受け付ける |
| Domain design | LLM + 設計席 | inception/domain-design.md | technical-design 1 枚 / ADR | なし（R3 以上は設計監査 D1〜D6 = 薄片 4） |
| Units generation | LLM + 実行リード | inception/units-generation.md | Delivery Plan の `delivery_graph.nodes`（Unit）。各 Unit は受入 ID を名指す | **判定 4 (b')（新）**: Unit の `changes_predicates` が今の段の受入 ID の中 |
| Contract design | LLM + 設計席 | inception/contract-design.md | 契約の文書（既存の形） | なし（監査が見る） |
| Delivery planning | 実行リード + Owner（順序と反復の完了条件） | inception/delivery-planning.md | Delivery Plan の版（ADMITTED）、Unit ごとの作業指示（control_handoff）1 枚 | 道筋の受付（plan-admission）、判定 4 (c)（作業指示の digest・marker・path） |
| Functional design | 作者 | construction/functional-design.md | 差分設計（PR か設計 file の版） | 判定 5（設計に結ぶ PR） |
| Code generation（試験先行） | 作者 | construction/code-generation.md | PR（sds-pr の block: risk・changed_paths・Unit・作業指示・監査の参照） | 判定 1（label）・判定 2（変更 path）・hygiene |
| Build and test | CI | construction/build-and-test.md | CI の run | repo の必須検査 |
| Reviewer protocol（AI-13） | 独立監査（作者と別の席） | audit-method §2 の依頼の形 | sds-audit-request / sds-audit-review | **判定 3**: 受領が今の head を名指す（R2 以上） |
| 統合 | 統合担当（作者・監査と別） | — | merge | **ruleset**: sds-gate が FAIL なら統合できない（薄片 2） |
| Deployment / Feedback | 配布担当 + 利用者 + Owner | operation/*.md | 受入 ID の証拠（録画・実演・記録）、段の閉じの決定 | 人（Goal Stages 3）。利用者に見える振る舞いを変えた Unit は Bolt の終わりに Owner が実演を見る |

### 2. 薄片 2 の変更（監査の受領を必須に）
2.1 **Shirube 自身に当てる**: shirube に `.shirube/sds-pin.json`（`sds_commit` = 直前の main）と、kit と同じ形の呼出し `.github/workflows/sds-gate.yml` は reusable 定義なので、呼出し側を `.github/workflows/sds-gate-self.yml`（`pull_request_target` + `issue_comment`、`uses: watchout/shirube/.github/workflows/sds-gate.yml@<pin の commit>`）として足す。PR template に sds-pr の block。label は有り。**自分の PR を自分の最新の code で判定しない**（pin の commit の checker で判定する。これは kit の consumer と同じ条件）。
2.2 **AUN に配る**: kit apply で導入 PR（kodama #87 と同じ形。pin = その時の shirube main、block を CLAUDE.md / AGENTS.md に入れる、旧部品の撤去）。R4。事前監査 = この設計の記録 + D1〜D6（1 枚で Suite の全 repo の導入を覆う。hotel の形と同じ）。
2.3 **必須にする（Owner、保護面）**: shirube main と aun の既定 branch に ruleset: PR 必須・`sds-gate` を必須検査（shirube は `test` も）・force push 禁止。段階は report-only → required の 2 段。
2.4 **checker の版の決まり**: 監査の依頼の `verifier_sha256` は、その repo の pin の commit の `audit-admission.mjs` の SHA-256（kodama の唯一の run が「Verifier version differs」で FAIL した原因）。kit の skill（sds-audit-request の生成）が pin から計算して埋める。
2.5 **負例の手順**: R2 の使い捨て PR を監査なしで出し、sds-gate が FAIL（判定 3）→ ruleset で統合できないことを確かめ、閉じる。1 周の条件 (2) の証拠。

### 3. 薄片 3 の変更（Delivery Plan と作業指示に結ぶ。Inception が先を含む）
原則: 門が要求する参照は、作業の開始時点で既に存在する記録だけ。作者に状態の写し（digest・版・COMPLETE）を書かせない。門が id で記録を取りに行き、現在の状態を自分で解決する。

3.1 **PR の block を id だけに**: `delivery_plan_binding` = `{plan_id, node_id}`。`comment_ref`・`comment_sha256`・`generation` は書かせない。門は repo の pin の `delivery_plan.control_source`（新しい欄。製品の道筋が置かれる issue の URL。例: aun#3）の comment を列挙し、`shirube-delivery-plan/v1` の block で `plan_id` が一致し `status: ADMITTED` の**最大の generation** を現在の道筋とする（決定的。同じ generation が 2 件なら FAIL）。
3.2 **依存 Unit の完了は統合から観測**: 依存 Unit が道筋で COMPLETE、**または**その Unit を名指す PR が既定 branch に統合済みで、その PR の作業指示が `completes_unit: true` を持つ、のどちらかで満たす。道筋の改版を待たない。
3.3 **PA-1（Inception が先）**: 道筋の受付で、今の段 k（未達の受入 ID がある最小の段）について、`owner_outcome.source_refs` のどれかが Owner の決定の comment（marker `shirube-owner-decision/v1`）で、本文に `stage_adoption: S<k> <plan_id>` の 1 行を持つことを要求する。無ければ `STAGE_ENTRY_WITHOUT_CONDITIONS` で受け付けない（記録だけの段では理由を出すだけ）。
3.4 **判定 4 (b')**: Unit の `changes_predicates` が全部、今の段 k の受入 ID（接頭辞 `S<k>-`）の中。次の段の Unit は FAIL（`anti_work`）。
3.5 **作業指示は Unit ごとに 1 枚、常設**: `unit: {plan_id, node_id}`、`allowed_paths` は glob、`completes_unit`（任意）。path の拡張は新しい comment（同じ marker + `supersedes: <前の URL>`）で、**実行リード（Suite = suite-lead、hotel = hotel-lead）が出す**。PR は使う版の comment を名指す（今と同じ）。
3.6 **段階**: AUN で記録だけ（report-only）で 1 周。FAIL を 1 件ずつ「本当の飛ばし／作者が直せる不備／門の不備」に分類し、門の不備 0 で blocking へ（pin の `plan_binding_mode`、R4、Owner）。

変更する file（Shirube）: `scripts/sds/plan-binding.mjs`（3.1・3.2・3.4）、`scripts/sds/plan-admission.mjs`（3.3）、`scripts/sds/gate.mjs`（pin の `delivery_plan.control_source` の読み）、`scripts/sds/kit.mjs`（pin の新しい欄、PR template の block の欄の変更）、`docs/sds/distribution.md` §4 の表（判定 4 の行を 3.1〜3.5 の形に改版、旧の (a)(b) は古い）、`templates/PULL_REQUEST_TEMPLATE.md`。own-code の予算（2,300 行）の中で収める。超えるなら削る候補を先に出す。

### 4. 役割と Owner の手
作者 = shirube の席（実装）、設計 = arc、監査 = devauditor（設計の事前監査 → 実装後）、統合 = suite-lead。Owner の手: exact-head 2 回（shirube の自己適用 = workflow、AUN の導入 = workflow）、ruleset 2 回（shirube・aun）、薄片 3 を blocking に上げる時の pin の exact-head 1 回。全 repo に配る時の必須化の採択は 1 枚。

### 5. 「1 周」の完了条件（AUN）
(1) 実 PR が 1 件、門を通って統合された（N14 か N15 の PR）。(2) 負例が 1 件、門で止まった。(3) 統合後の main で次の PR にも門が効いている。(4) 作者の手間は PR の block の数行と label だけ。(5) 記録だけの期間の判定 4 の FAIL に、門の不備による誤 FAIL が 0。
加えて、利用者に見える振る舞いを変えた Unit があれば、Bolt の終わりに Owner が実演を見た記録。

### 6. V3 の「LLM 自体の制御」の扱い（Owner の問いへの案）
V3 が席に入れていた制御は 5 つに分けられる。
| V3 の制御 | 行き先 | 残すか |
|---|---|---|
| 席の登録・束縛・活性化（CLAUDE.md の Runtime Overlay、enrollment.json、function-bindings） | **共通基盤**（common.seat / seat_binding、0.2〜0.3。T137 のとおりエージェント管理は共通基盤） | 形を変えて残す。Shirube の文書と各席の overlay からは外す |
| 役割の境界（監査席は実装しない、実装席は作業指示の中だけ） | 門（判定 3 の作者≠監査≠統合、判定 4 の allowed_paths）と **薄片 5 の席の hook** | 残す。文章の規則から機械の検査へ |
| 席の振る舞いの記述（function の説明、cell の運用の節） | **きっかけの prompt**（AI-DLC の stage file）と記録の形 | 言い直しは捨てる |
| 席の中の hook（Stop hook など、設計に無い形で置かれていたもの） | 薄片 5 の hook 1 つ（作業指示の無い編集を始めない・main へ push しない・merge しない）だけに統一 | それ以外は撤去 |
| 記憶の分割・復旧 | Kusabi | Shirube の範囲外 |
勧め: **V3 の overlay と .shirube の状態 file は「古い」に含め、薄片 5 の hook と共通基盤の登録に置き換える**。物理的な撤去は薄片 5 の配布と同時（席ごとに 1 回）。それまでの間、overlay は読むだけで、新しい規則を足さない。

### 7. 未決（既定つき。答えが無ければ既定で進める）
- Q1 段の採択の印の形: 既定 = 3.3 の `stage_adoption: S<k> <plan_id>` の 1 行（Owner の決定の comment に書く）。代替 = 道筋の schema に欄を足す（ADF の schema は凍結なので取らない）。
- Q2 作業指示の path の拡張を実行リードが出してよいか: 既定 = よい（3.5）。代替 = ARC だけ（今のまま。列になる）。
- Q3 V3 の LLM 制御の扱い: 既定 = §6 の勧め。
- Q4 依存 Unit の完了の観測（3.2）: 既定 = 道筋の COMPLETE または `completes_unit` の統合済み PR。代替 = 道筋の COMPLETE だけ（改版待ちが残る）。

### 8. 設計監査（事前、D1〜D6）の項目の集合
shirube の docs の PR（この設計の記録 + 項目集合 file）で依頼する。D1 目的と範囲外（§0・§6）／D2 全受入の検証計画（§5 の 5 条件と負例の手順）／D3 代替案（§7 の各代替）／D4 秘密・権限・観測・復旧（ruleset と pin の戻し方、workflow は pin の commit だけを読む）／D5 社内予算（own-code 2,300 行、作者の手間 = block 数行）／D6 検証可能性（各判定の正負例が fixture で書けること）。

## 設計 v1 への追記

ここから先は**追記**です。上の写し（設計 v1 の本文）は書き換えていません。追記は、設計監査の項目 D23-1・2・3・4・5・6 が求める事実を、shirube の席が今の code と記録から読んで足したものです。設計の判断を変える点は書かず、変えたい点・[V1] に無い点は A6 に理由つきで挙げて ARC に返します。

### A0. 目的と対象外（D23-1）

Owner の言葉と決定 ID を、上の参照の表のとおり引きます。
- 完成形（[OD-F] §1、決定 OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001）: 「AI-DLC の各段階の出力が記録として残り、次の段階は前の段階の出力への参照が無いと始まらないことを、全 repo で機械が保証する。作者が書くのは PR の数行だけ。」
- 作り方（[OI-K] の Owner 原文、OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001）: 「LLM主導でやる部分は余計な記述はいれません。shirubeとして必要なのはゲートとスクリプト的な制御が必要な箇所になると思います。」
- S1 の採択（[OD-S1] の問 1・問 2、決定 OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001）: Owner の答えは「１：OK、２：OK」。問 1 = S1 の 7 条件で Shirube の S1 を定めてよいか、問 2 = 作業指示の「触ってよい範囲」の拡張を実行リードが出してよいか。

目的: 薄片 2 = R2 以上は、監査の受領が今の head を名指さないと統合できない（[OD-F] §4 の表の「2 監査の受領を必須に」）。薄片 3 = Unit を名指さない PR・作業指示の範囲外を変えた PR・今の段の採択の無い道筋は進めない（同表の「Inception が先」「3 道筋と作業指示に結ぶ」）。

対象外と、その出どころ:
1. 必須検査・ruleset・pin の変更そのもの = Owner の決定（保護面。[OD-F] §6、[OD-S1] の「含まないもの」、[V1] §2.3・§4）。この記録は変更の設計までで、変更はしない。
2. アカウントの分離（[OD-F] §6）。「Owner の承認が本人のものか」は参照では分からず、S1 の条件に入れない。
3. 薄片 4・5（[OD-S1] 「S1 に入れないもの」。S2・S3 に回す）。
4. V3 の席の制御の撤去（[OD-S1] の「含まないもの」は S3 の設計で別に伺う。それまで新しい規則を足さない）。[V1] §7 の Q3 は既定が「§6 の勧め」だが、[OD-S1] は「Q3 は S3 へ」としたので、§6 の表は採択ではなく案のままである。
5. AI-DLC の engine / hook の導入（[OI-K] の「含まないもの」、T146。借りるのは prompt と記録の形だけ）。
[V1] の Q1（採択の印の形）・Q4（依存 Unit の完了の観測）は、[OD-S1] により技術設計として ARC が既定で進め、この監査が見る。Q2 は [OD-S1] の決定 2 で採択済み。

### A1. S1 の 7 条件と、作業・観測・「1 周」の対応（D23-2、PL-1）

条件の定義は [OD-S1] の決定 1、node と観測の記録の形は [DP]（`terminal_predicates` の `evidence_required`、各 node の `integration_evidence`）、「1 周」の 5 条件は [V1] §5 です。node 名は `DP-N-SH-` を略します。

| 受入 ID | 作業（[DP] の node） | 観測（実際の記録の形） | [V1] §5 |
|---|---|---|---|
| S1-SH-01 監査なしは統合できない | DESIGN-REC・SELF-GATE・KIT-VERIFIER・RULESET-SHIRUBE・DIST-AUN・RULESET-AUN | shirube と aun で各 1 件: R2 の負例 PR の sds-gate の FAIL（判定 3）と、ruleset で merge できなかった記録 | (2)(3) |
| S1-SH-02 道筋に無い作業は統合できない | DESIGN-REC・DIST-AUN・GATE4-IDS・AUN-LOOP・BLOCKING-AUN | Unit を名指さない PR・allowed_paths の外を変えた PR の判定 4 の FAIL 各 1 件。blocking の段では merge できなかった記録 | (2) |
| S1-SH-03 Inception が先 | DESIGN-REC・GATE4-IDS・AUN-LOOP | 採択の参照の無い道筋を plan-admission が STAGE_ENTRY_WITHOUT_CONDITIONS で拒んだ負例の出力と、採択のある道筋（DP-SHIRUBE-001 と AUN）が通った出力 | (2) |
| S1-SH-04 正しい PR は止まらない | AUN-LOOP | 統合された実 PR（N14 か N15）の sds-gate の PASS の status と、記録だけの期間の全 FAIL の 3 分類（本当の飛ばし／作者が直せる不備／門の不備 = 0） | (1)(5) |
| S1-SH-05 作者の手間は増えない | GATE4-IDS・AUN-LOOP | 実 PR の diff（block の行数）と、作者の席の記録（道筋・作業指示の編集が無い） | (4) |
| S1-SH-06 Shirube 自身が門を通る | SELF-GATE・RULESET-SHIRUBE | shirube の PR の sds-gate の status と、main の ruleset の読み戻し | (3) |
| S1-SH-07 Owner の手は 1 周で 5 回まで | AUN-LOOP | 1 周の間に Owner が受けた依頼（カード・決定）の一覧と数 | — |

S1-SH-07 は「1 周」の 5 条件に無く、数えて確かめます（数え方は A6-3）。機械で確かめないもの（未測定・対象外）: Owner の承認が本人のものか（[M] distribution.md §7 のとおり機械で見ない。アカウントの分離は対象外）、要求の意味・設計の良し悪し（独立監査が見る）、ruleset の設定の意図（機械が読み戻すのは設定の値だけ）、Owner の決定の comment が本当に Owner の言葉か（PA-1 は marker と `stage_adoption` の行の構造だけを見る）。

### A2. 代替案（D23-3）

| 論点 | 採った案 | 採らなかった案 | 理由（出どころ） |
|---|---|---|---|
| (a) PR から道筋への参照 | `plan_id` と `node_id` だけ。門が pin の `delivery_plan.control_source` から最新の ADMITTED を解決する（[V1] §3.1） | 道筋の comment の digest と generation を PR に書かせる（今の判定 4。[M] distribution.md §4 は `comment_ref`・`comment_sha256`・`plan_id`・`generation`・`node_id` の 5 欄） | 改版のたびに全 PR の写しが古くなり無効になる。作者に状態の写しを書かせない（[V1] §3 の原則、S1-SH-05、[OD-F] §4） |
| (b) 依存 Unit の完了 | 道筋の COMPLETE、または `completes_unit: true` の作業指示を持つ統合済み PR（[V1] §3.2、Q4 の既定） | 道筋の COMPLETE だけ | 道筋の改版を待つ間、次の Unit が止まる（[V1] §7 Q4、[OD-F] §4 の「改版を待たない」） |
| (c) 段の採択の印 | Owner の決定の comment の `stage_adoption: S<k> <plan_id>` の 1 行（[V1] §3.3、Q1 の既定。[OD-S1] 自身がこの行を持つ） | ADF の schema に欄を足す | ADF の schema は凍結（[V1] §7 Q1。ADF の固定 commit 561baebe は [M] distribution.md §3） |
| (d) 作業指示の拡張 | Unit ごとに常設。拡張は実行リードが同じ marker + `supersedes` の comment で出す（[V1] §3.5、[OD-S1] 決定 2 で採択） | ARC だけが出す、PR ごとに出す | 待ちの列ができる（[OD-S1] 問 2）。範囲の意味は独立監査が見る（同決定） |
| (e) 自己適用 | Shirube 自身も pin の commit の checker で自分の PR を判定する（[V1] §2.1） | 最新の code（PR の head か main）で判定する | PR が検査を書き換えて自分を通せる。checker と判定の本体は PR の head ではなく固定した commit から取る（[M] distribution.md §4「実装上の要求」） |

### A3. 秘密・権限・観測・復旧・データ（D23-4）

- 資格情報: 自己適用の呼出し側 `sds-gate-self.yml` と導入の workflow は、kit の `kit/sds-gate-caller.yml` と同じ形（`pull_request_target` + `issue_comment`）。`permissions` は `contents`・`pull-requests`・`issues`・`actions`・`checks` が read、`statuses` が write だけ。reusable の `.github/workflows/sds-gate.yml` は Shirube を `job.workflow_sha`（pin の commit）で checkout して identity を検査し、判定は `github.token` で GitHub を読み、commit status を 1 つ付けるだけ。PR の code は checkout も実行もしない。定義は既定 branch から読まれる（`pull_request_target`）ので、PR は自分を判定する workflow を書き換えられない。workflow を足す・変える PR は保護面で effective R4（判定 1）。追加の secret は無い（任意の `SHIRUBE_READ_TOKEN` は、Shirube が private の間に consumer が checkout するための名前で、shirube は今 public）。
- `delivery_plan.control_source` の読取り: 門は `github.token` で読む。`github.token` は workflow が動く repo の権限で、GitHub の仕様上 他の private repo の comment は読めない（作者は CI での実測をしていない。AUN の 1 周の観測に含める）。shirube は public（`private: false`）、aun・iyasaka-arc は private。だから道筋は、その製品の repo の issue に置く（[V1] §3.1 の例 aun#3。aun#3 は open で実在）。読めない・parse できない時は FAIL で、PASS を偽らない（今の `planBinding` も try/catch で FAIL。pin の読みも 404 だけが「無い」で、他の失敗は fail-closed）。
- 観測: gate の結果の JSON の `plan_binding.result` と `reason`、commit status の description（先頭 140 字）。blocking に上げる前の FAIL は、gate の run の JSON と PR を見て 3 分類する。
- 戻し方: (1) ruleset の解除（Owner の設定 1 回。解除すると report-only と同じで、読み戻しで確かめる）。(2) pin の `plan_binding_mode` を `report-only` へ戻す PR（`.shirube/**` で R4、Owner の exact-head）。(3) gate の不備なら pin の `sds_commit` を前の commit に戻す PR（同じく R4）。report-only の間は何も止めないので、(1)(2) が安全側の状態。
- blocking に上げる条件: AUN の記録だけの期間の判定 4 の FAIL を 1 件ずつ 3 分類し、門の不備による誤 FAIL が 0（[V1] §3.6・§5 (5)、S1-SH-04）。上げる操作は pin の `plan_binding_mode` の変更（R4、Owner の exact-head 1 回）。
- データ: gate が読むのは同じ repo（と public な repo）の issue・PR・comment だけ。個人情報・秘密を読まず、書かず、この記録にも書かない。

### A4. 予算と範囲・PR の分け方（D23-5）

実測（[M] f8413fe1、`npm run hygiene:budget`）: own_code_lines は **1,820 / 2,300**（24 file）。余りは 480 行。`pr-size` は 1 PR の追加 400 行・20 file（docs と JSON も数え、`tests/fixtures/**` は除く）、新しい file は 300 行、関数 50 行、複雑さ 10。

| file | 今の行数 | 増分の見積もり（作者、実装前） | 内容 |
|---|---|---|---|
| `scripts/sds/plan-binding.mjs` | 63 | +40〜60 | 3.1 の解決、3.2 の依存の観測、3.4 (b')。関数の上限のため、解決の部分は新しい file に分ける可能性がある（300 行以下） |
| `scripts/sds/plan-admission.mjs` | 108 | +15〜25 | PA-1。純関数のまま（S4）で、`stage_adoption` の comment の本文は呼出し側が渡す |
| `scripts/sds/gate.mjs` | 141 | +10〜20 | pin の `delivery_plan.control_source` を読んで渡す |
| `scripts/sds/kit.mjs` | 176 | +10〜20 | pin の新しい欄 |
| `.github/workflows/sds-gate-self.yml` | 0 | +25〜30 | 自己適用の呼出し側（`kit/`・`templates/` は own-code の計数外） |
| 合計 | | +100〜155 | 1,920〜1,975 / 2,300 |

総量は収まる見込みです。ただし [M] distribution.md §3 の枠（既存 1,500・KIT-ADF 450〔今は `plan-admission-shape.mjs` 102 + `plan-admission.mjs` 108 = 210〕・判定 5 は 150 以下・席側の hook は 150 以下・未割当 50）に薄片 3 の枠が無く、どの枠に数えるかは ARC の裁定です（A6-1）。超えた時の削る候補: 旧形の解決（`comment_ref`・`comment_sha256` を検証する経路）を、新形が入った後に外す（旧形を使う repo は pin の旧 commit の code を使い続ける。A6-4）。新しい読み出しは既存の `comment()`・`blocks()` を再利用し、同じ処理を 2 度書かない（S3）。

- 作者の手間の上限: PR の block の `delivery_plan_binding` は `plan_id` と `node_id` の 2 欄（今は 5 欄）と label。`control_handoff` の ref・sha256 は今のまま。道筋・作業指示を作者が更新しに行かない（S1-SH-05）。
- Owner の手の上限: 1 周で承認 1・exact-head 2・設定 2（S1-SH-07）。内訳の見込み: 承認 = [OD-S1]、exact-head = SELF-GATE と DIST-AUN、設定 = RULESET-SHIRUBE と RULESET-AUN。

PR の分け方（[DP] の node の順）:

| 順 | node | PR | risk | Owner の手 |
|---|---|---|---|---|
| 1 | DESIGN-REC | この PR（shirube、docs 2 file） | R1 + 明示の監査 | なし |
| 2 | SELF-GATE | shirube: pin・`sds-gate-self.yml`・PR template | R4 | exact-head 1 |
| 3 | KIT-VERIFIER | shirube: kit の skill と依頼の雛形（`verifier_sha256` を pin の commit から計算） | R1（[DP]） | なし |
| 4 | RULESET-SHIRUBE | PR なし | — | 設定 1 |
| 5 | DIST-AUN | aun: kit apply の導入 PR | R4 | exact-head 1 |
| 6 | RULESET-AUN | PR なし | — | 設定 1 |
| 7 | GATE4-IDS | shirube: 3 PR の案 = (i) distribution.md §4 の判定 4 の行の改版（docs、R3）、(ii) `plan-binding.mjs` と試験、(iii) PA-1・`gate.mjs`・`kit.mjs` と試験。各 PR は追加 400 行以下 | R3（[DP]） | なし（R3 の exact-head は別に要る） |
| 8 | AUN-LOOP | aun・shirube: 実 PR 1 件と負例（監査なし・Unit なし・範囲外）3 件の使い捨て PR、記録は aun#3 と shirube#6 | — | なし |
| 9 | BLOCKING-AUN | aun: pin の `plan_binding_mode` を blocking に | R4 | exact-head 1（A6-3） |

7 の分け方は作者の案で、作業指示で ARC が確定します。

### A5. 各判定の正例・負例の fixture（D23-6）

fixture は `tests/fixtures/**` に置き（pr-size と行数の計数外）、期待値は要求から決めて実装の出力に合わせて変えません（[M] audit-method §3）。

| 判定 | 正例 | 負例（すべて FAIL か拒否。PASS にならない） |
|---|---|---|
| PA-1（道筋の受付） | `source_refs` に marker `shirube-owner-decision/v1` と本文 `stage_adoption: S1 <plan_id>` の行を持つ comment がある | そのような comment が無い（STAGE_ENTRY_WITHOUT_CONDITIONS）、`plan_id` が違う、marker が無い、`stage_adoption: S2 …` だけで現在の段の行が無い |
| 判定 4 (b') | Unit の `changes_predicates` が全部 `S1-` で、今の段が S1 | `S2-` を含む（`anti_work`）、S1 と S2 の混在、空 |
| id だけの解決 | 同じ `plan_id` の ADMITTED が generation 1・2 なら 2 を採る（DRAFT の 3 は無視） | ADMITTED が無い、同じ generation の ADMITTED が 2 件、`control_source` が読めない（404）、`plan_id` が違う、yaml が壊れている |
| 依存の観測 | `depends_on` が道筋で COMPLETE、または統合済み PR の作業指示が `completes_unit: true` | PR は統合済みだが `completes_unit` が無い、PR が未統合、作業指示の `unit` が別の node |
| supersedes の鎖 | 同じ cell の marker + `supersedes: <前の URL>` が最初の作業指示までたどれ、PR が最新を名指す | `supersedes` が無い拡張、別の cell を指す、鎖が輪、範囲外の path（4.17） |
| 自己適用 | shirube の PR を pin の commit の checker が判定し、tools identity の検査（`job.workflow_sha`）が通る | PR が `plan-binding.mjs` を常に PASS に書き換えても同じ PR の判定は変わらず FAIL のまま。workflow を足す PR は effective R4 |

投稿者の席は機械で区別できません（席のアカウントは共有）。supersedes の鎖で機械が見るのは構造だけで、「実行リードが出した」か、範囲の意味が妥当かは、運用と独立監査が見ます（[OD-S1] 決定 2、アカウントの分離は対象外）。

### A6. 設計 v1 に無く、ARC の裁定が要る点

1. 予算の枠: 薄片 3 の code（`plan-binding.mjs`・`gate.mjs`・`kit.mjs`）と PA-1 を、[M] distribution.md §3 のどの枠に数えるか。PA-1 を KIT-ADF の 450（今 210）に数えるか、枠の調整や未割当 50 の使用（ARC の裁定が要る）か。
2. 「今の段 k」の観測: [V1] §3.3・§3.4 は「未達の受入 ID がある最小の段」と書くが、未達を何から読むかが無い。作者の案: その受入 ID を `changes_predicates` に持つ node の全部が COMPLETE でない（または持つ node が無い）受入 ID を未達とする。
3. Owner の手の数え方: [V1] §4 は exact-head 2 + ruleset 2 + blocking の pin の exact-head 1 を挙げ、S1-SH-07 は「1 周で exact-head 2」。blocking の pin は AUN-LOOP の後の node（BLOCKING-AUN）なので、1 周に数えない読みと、数える読みがある。さらに [DP] は GATE4-IDS を R3 とし、R3 は統合の前に Owner の exact-head が要る（A4 の案では 1〜3 PR）。これを S1-SH-07 の「exact-head 2」にどう数えるかも、ARC に確かめたい。
4. 旧形の経路: id だけの形が入った後も、旧形（`comment_ref`・`comment_sha256`）を受け付けるか。残すと own-code が増え、外すと旧形を使う repo は pin を上げる時に block を書き換える。
5. pin に `delivery_plan.control_source` が無い時の結果: [V1] に無い。作者の案: id だけの block を持つ PR は FAIL（理由 = control_source 未設定。S8、見えないものを PASS にしない）。記録だけの間は止めない。

## D23-1〜D23-6・PL-1〜PL-5 への対応

| 項目 | 答える所 |
|---|---|
| D23-1 目的と対象外 | A0、設計 v1 の写しの §0・§6、参照の表 |
| D23-2 全受入の検証計画 | A1、写しの §5 |
| D23-3 代替案 | A2、写しの §7 |
| D23-4 秘密・権限・観測・復旧・データ | A3、写しの §2 |
| D23-5 予算と範囲 | A4、写しの §3・§4 |
| D23-6 検証可能性と独立性 | 参照の表（URL と SHA-256）、A5、写しの §4・§8。この PR は 2 file だけ（この記録と項目集合）。作者（shirube の席）・監査者（devauditor）・統合担当（suite-lead）は別の席。この監査の受領を前提にする node は、[DP] の `depends_on` で DESIGN-REC に依存する SELF-GATE・KIT-VERIFIER・GATE4-IDS |
| PL-1 受入 ID（縦） | [DP] の `terminal_predicates`（S1-SH-01〜07 の description と evidence_required）、A1、[OD-S1]（`stage_adoption: S1 DP-SHIRUBE-001`）、[OD-F] §1。S2〜S4 の受入 ID は description に【条件未採択】とあり、その置き場の node（S2-ALL-REPOS・S3-OPERATION・S4-EFFECT）の deliverable に、Owner が条件を採択してから分けると書かれている（S2 には「それまで作業指示は出さない」とある） |
| PL-2 Unit の大きさ（横） | [DP] の node 9 本（各 node が S1-SH-* を名指し、deliverable と integration_evidence を持つ）と、A4 の PR の分け方 |
| PL-3 依存と順序 | [DP] の `depends_on`（設計監査 → 自己適用、設計監査 → kit の決まり、自己適用 → ruleset、自己適用と kit の決まり → 配布、配布 → ruleset、ruleset と判定 4 の code → 1 周、1 周 → blocking）、`critical_path.step_ids`（12 step。先頭の 9 が S1 の node、残る 3 が S2〜S4 の置き場）、`wip_limit: 1` |
| PL-4 覆いと整合 | [DP] の `terminal_acceptance`（`covered_predicates` は S1-SH-01〜07 と S2〜S4 の 10 件、`uncovered_predicates` は空）。`live_baseline` は main `f8413fe1`・tree `4dbd88e4…`（作者が GitHub API で commit の tree を読み、一致を確認）。道筋 DP-SUITE-001 の Shirube の node は、次の Suite g8 でこの道筋に移す計画が [DP] に書かれている |
| PL-5 独立性 | 参照の表の [DP] の行（URL と yaml の囲みの SHA-256 `d8885559…`）。PR に道筋の写しは置いていない。DESIGN-REC の作業指示はこの監査を含む PR 自身なので、g1（ARC が採択）を根拠にできる。それ以外の node の作業指示は、この監査の受領の後（[CH]） |
