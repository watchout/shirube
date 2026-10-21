# 薄片 2・3 の設計の記録 — 設計 v1 + 設計 v2 + 設計 v3（監査 cycle 1・2 の是正）

この file は設計の記録です。実装でも Owner の採択でもありません。設計の作者は ARC、この記録の作成は shirube の席（作業指示 CH-SHIRUBE-DESIGN-REC-SLICE23-20261021 v8）です。R4 の実装（薄片 2・3 の code と workflow）の前に、独立監査（D23-1〜6 と PL-1〜5）を受けます。この監査の PASS と受領の前は、これに基づく実装の作業指示は出ません（[CH]）。file 名は v1 のままです（中身の版は下の表で分かります）。

## 参照

本文の SHA-256 は、GitHub API の comment の `body` を bytes のまま実測した値です。

| 記号 | 記録 | URL | 本文の SHA-256 |
|---|---|---|---|
| [V1] | 設計 v1（ARC）。§3・§7 は [V2] が置換 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6305635938 | `5a896ea234bcb909cdc103a9f1431b7a463164c7e9820c3358422ecc7aa19881` |
| [V2] | 設計 v2（ARC。§3・§3b・§5 への追加・§7・§9）。§5 の 5 つの条件は [V3] が置換 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6306257668 | `1f09a0d44fa180873a3f281163ac92abd98573ecd232056667652e5c8832ceb0` |
| [V3] | 設計 v3（ARC。§5 の置き換え = 証拠を report-only / blocking の段階で分けた表） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6306926136 | `356d5dcd0d9c1d9194e4f8edb8f24ff15e0ee5dfef6156373090483e1569ad36` |
| [A6] | 追記 A6（5 点）への ARC の裁定 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6306089613 | `dad270bd63466f6e62c857dae15c8d739a90127344d17862fbd19266c7212ca5` |
| [OD-2] | Owner の決定 OD-AUN-S1-REGROUP-AND-SHIRUBE-S1-SH-07-SIX-20261021-001（S1-SH-07 = 6 回） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6306226221 | `44095e3060618975ac1e4bc7fe5ea5739b19f3ca7a2d09e9189c731e01edece5` |
| [OD-F] | 仕様の固定（Owner の決定 OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305503572 | `22f4a3c51efde3f0f8fb0041c75d3f7ba7a56d0161b9c54636b7f78dcac38d30` |
| [OI-K] | 門と script・きっかけの prompt（Owner の指示 OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305560011 | `ff88552a4595270c18be431ab973052d868f589f4c42458097e15a845c75f243` |
| [OD-S1] | S1 の 7 条件と作業指示の範囲の拡張（Owner の決定 OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673 | `8c6f8542888d5cd0302146f5d6f10bb097ab9fe12893fee533f670984a5a4893` |
| [DP] | 道筋 DP-SHIRUBE-001 **generation 4**（ARC。g3 を置換。main の移動を live_baseline に写すだけの改版） | https://github.com/watchout/shirube/issues/6#issuecomment-6307040130 | comment 全体 `b5c49cb051925d9590669f737a43760146121a5e080e852edd7ac65e7c7a18bb`。道筋の本体 = yaml の囲みの中身（26968 bytes、末尾 LF 1 個）の SHA-256 `c1aed291c4cc8f1bd117a094d2bddc282e3c6ced66897c391f5752494da5b53d` |
| [DP-g3] | 道筋 g3（**g4 が置換**。cycle 2 の是正の版） | https://github.com/watchout/shirube/issues/6#issuecomment-6306918136 | comment 全体 `52734de703b27f87bc56f8dcab975d56385da626af4d885eca91598cf623aafc`。yaml の囲み（26435 bytes）`656aafd40509bb6590e0a606783063ea0d48f5e7902795d2e593563fc036f94f` |
| [DP-g2] | 道筋 g2（g3・g4 が置換。cycle 2 の監査対象） | https://github.com/watchout/shirube/issues/6#issuecomment-6306247323 | comment 全体 `34ac269b79d5dc4db16da677220156c3ecf9ca03e19593b5ba1caef255b8ee13`。yaml の囲み（24611 bytes）`3297489c50efd12f5a90b489bdda5031271b3cdcbfc516faab578e7c204e0808` |
| [DP-g1] | 道筋 g1（g2〜g4 が置換。cycle 1 の監査対象） | https://github.com/watchout/shirube/issues/6#issuecomment-6305815774 | comment 全体 `965d060694bc9d3fed1e0797e017dabf32f56878833da070bce6df402632aad2`。yaml の囲み（21466 bytes）`d8885559c92ae5caf605cdf1679cc7cf9cf81f751061685aee5d094ba7f83751` |
| [R1] | 監査 cycle 1（BLOCK、BF-01〜06） | https://github.com/watchout/shirube/pull/61#issuecomment-6306167166 | `fc77c412f65ad22eae81c6fb521845ab1ce5c53806c28cd9696f71646d42e336` |
| [R2] | 監査 cycle 2（BLOCK、BF-01 の残り 1 件。9 PASS / 2 FAIL） | https://github.com/watchout/shirube/pull/61#issuecomment-6306541266 | `59c69f0bd349c9106506dab75a8a94fef78946972d6579aecd5d889c75c8c9e2` |
| [CH] | 作業指示 v8（ARC。block つき。中身は v7 + 道筋 g4） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6307046897 | `0947768ecccad1ec4a235a3ff58795be8e082cbd91df62c2d1e7f809e6aa5cd3` |
| [M] | shirube main `3ad60ee2e68e92ff4bf5a2b7c744e97aee8f3a4a`（tree `8daaf9356e2aaad5d5b8727e0f3239d6c53a87ee`。PR #60・#62 の統合で `f8413fe1` から進んだ。動いたのは docs の 4 file で、`scripts/`・`.github/`・`package.json`・`docs/sds/distribution.md`・`docs/sds/audit-method.md` は `f8413fe1` と同じ bytes）。引くもの: `docs/sds/distribution.md`・`docs/sds/audit-method.md`・`kit/sds-gate-caller.yml`・`.github/workflows/sds-gate.yml`・`scripts/sds/*.mjs`・`.shirube/hygiene-profile.md` | commit 固定 | — |

道筋の file は repo に写していません（ARC の裁定。知識は 1 か所、S3）。道筋の本体は [DP] の yaml の囲みで、上の SHA-256 で取り直して照合できます。

## 設計の写し（v1・v2・v3）

設計 v2 の見出しの宣言どおり、§0・§1・§2・§4・§6・§8 は [V1] のまま有効で、§3・§7 は [V2] が置き換え、§3b・§9 は [V2] の追加、§5 は、[V3] の表（証拠を report-only / blocking の段階で分けたもの）が [V1] の 5 つの条件を置き換え、そのあとに [V2] の版の結びが続きます。次の各区間は、出どころの comment の本文をそのまま写しました（区間の上に出どころの行範囲を書き、この file の作成時に、各区間が出どころの行と一致することを機械で照合）。設計の中身は変えていません。[V2] の本文にある `\`` は、ARC の投稿の引用の形がそのまま残ったもので、bytes を揃えるために直していません。[V1]・[V2]・[V3] の末尾の `next_action` の行は、その時点の引渡しなので写していません。

<!-- 写し: [V1] 4 行（適用 ID） -->
適用 ID: OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001（#49 6305503572）、OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001（#49 6305560011）、OI-SHIRUBE-NO-AUDIT-NO-SKIP-CONTROL-20261021-001（#49 6304645183）、OD-SHIRUBE-CONTROL-FIRST-THIN-SLICE-20261020-001、OD-SHIRUBE-IMPLEMENTER-CODEX-ADF-20260929、Protected surface = owner gate。作者 = arc（control_artifact_author）。risk = R4（workflow と pin に触れる）。実装の前に設計の事前監査（D1〜D6）を通す。

<!-- 写し: [V2] 4 行（適用 ID） -->
適用 ID: OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001、OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001、OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001、OD-AUN-S1-REGROUP-AND-SHIRUBE-S1-SH-07-SIX-20261021-001（#49 6306226221）。supersedes: 設計 v1 = #57 6305635938（§0・§1・§2.1〜2.5・§4・§6・§8 は v1 のまま有効。下の節だけ置き換え・追加）。道筋 = DP-SHIRUBE-001 g2（shirube#6 6306247323、yaml SHA-256 3297489c…）。監査 cycle 1 = shirube#61 6306167166。A6 の裁定 = #57 6306089613。

<!-- 写し: [V3] 4 行（適用 ID） -->
適用 ID: OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001、OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001、OD-AUN-S1-REGROUP-AND-SHIRUBE-S1-SH-07-SIX-20261021-001。supersedes_part_of: 設計 v2 = #57 6306257668 の §5（置き換え）。道筋 = DP-SHIRUBE-001 g3（shirube#6 6306918136、yaml SHA-256 656aafd4…）。監査 cycle 2 = shirube#61 6306541266（9 PASS / 2 FAIL = D23-2・PL-3、新規指摘なし）。

<!-- 写し: [V1] 6〜8 行（§0） -->
### 0. 目的（Owner の言葉）と完了の定義
「監査なしでは進めない」「フローを飛ばしていたら進めない」「手続きが重くなりすぎるのはやりたくない」「shirube に入れる、aun に配布 → 1 周テスト → 全てに配布、次の段階」。
完了 = §5 の「1 周」の 5 条件を AUN で満たし、全 repo に配り、薄片 3 が止める段で動いている。作者の手間は PR の block の数行と label だけ。

<!-- 写し: [V1] 10〜26 行（§1） -->
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

<!-- 写し: [V1] 28〜33 行（§2） -->
### 2. 薄片 2 の変更（監査の受領を必須に）
2.1 **Shirube 自身に当てる**: shirube に `.shirube/sds-pin.json`（`sds_commit` = 直前の main）と、kit と同じ形の呼出し `.github/workflows/sds-gate.yml` は reusable 定義なので、呼出し側を `.github/workflows/sds-gate-self.yml`（`pull_request_target` + `issue_comment`、`uses: watchout/shirube/.github/workflows/sds-gate.yml@<pin の commit>`）として足す。PR template に sds-pr の block。label は有り。**自分の PR を自分の最新の code で判定しない**（pin の commit の checker で判定する。これは kit の consumer と同じ条件）。
2.2 **AUN に配る**: kit apply で導入 PR（kodama #87 と同じ形。pin = その時の shirube main、block を CLAUDE.md / AGENTS.md に入れる、旧部品の撤去）。R4。事前監査 = この設計の記録 + D1〜D6（1 枚で Suite の全 repo の導入を覆う。hotel の形と同じ）。
2.3 **必須にする（Owner、保護面）**: shirube main と aun の既定 branch に ruleset: PR 必須・`sds-gate` を必須検査（shirube は `test` も）・force push 禁止。段階は report-only → required の 2 段。
2.4 **checker の版の決まり**: 監査の依頼の `verifier_sha256` は、その repo の pin の commit の `audit-admission.mjs` の SHA-256（kodama の唯一の run が「Verifier version differs」で FAIL した原因）。kit の skill（sds-audit-request の生成）が pin から計算して埋める。
2.5 **負例の手順**: R2 の使い捨て PR を監査なしで出し、sds-gate が FAIL（判定 3）→ ruleset で統合できないことを確かめ、閉じる。1 周の条件 (2) の証拠。

<!-- v1 の §3（35〜45 行）は [V2] の §3 が置き換えた。写さない -->
<!-- 写し: [V2] 6〜30 行（§3 の 3.1〜3.7 と §3b） -->
### §3 薄片 3（置き換え。v1 §3 を次の 3.1〜3.7 に）
原則（不変）: 門が要求する参照は作業の開始時点で既に存在する記録だけ。作者に状態の写し（digest・版・COMPLETE）を書かせない。門が id で記録を取りに行き、現在の状態を自分で解決する。

3.1 **PR の block**（新形）: \`delivery_plan_binding = {plan_id, node_id}\`。門は repo の pin の新しい欄 \`delivery_plan.control_source\`（その製品の道筋が置かれる issue の URL。**門が動く repo と同じ repo の issue**に限る = BF-02）の comment を列挙し、\`shirube-delivery-plan/v1\` の block で plan_id が一致し status が ADMITTED の最大の generation を現在の道筋とする。同じ generation が 2 件・読めない・無い = FAIL（理由を JSON に）。**旧形**（comment_ref・comment_sha256・generation・plan_id・node_id）は 1 世代の間そのまま受け付ける（S6 同居。A6-4）。pin に \`delivery_plan.control_source\` が無く新形の block が来たら FAIL（理由 = control_source 未設定。A6-5）。

3.2 **依存 Unit の完了**: 道筋で COMPLETE、**または**その Unit を名指す PR が既定 branch に統合済みで、その PR の作業指示が \`completes_unit: true\` を持つ。道筋の改版を待たない。

3.3 **今の段 k の決定規則**（BF-04）: 正本の入力 = 道筋の \`terminal_acceptance.satisfied_predicates\`（Owner が証拠を受け入れた受入 ID。Goal Stages 3 の記録が道筋に写されたもの）。k = 接頭辞 \`S<k>-\` の受入 ID のうち satisfied_predicates に無いものがある最小の段。node の COMPLETE は代替にしない（COMPLETE は作業の完了で受入ではない）。satisfied_predicates が terminal_predicates に無い id を含む・接頭辞が S1〜S4 でない・読めない = FAIL。例: S1 の全 node が COMPLETE でも S1 の受入 ID が satisfied に無ければ k = S1（S2 の Unit は FAIL）。全受入 ID が satisfied なら k = 無し（道筋は閉じている。新しい段の採択が要る）。

3.4 **PA-1（Inception が先）**: 道筋の受付（plan-admission、**席の手元で動かす検査。CI の門ではない** = BF-02）で、k について \`owner_outcome.source_refs\` のどれかが Owner の決定の comment（marker \`shirube-owner-decision/v1\`）で、本文に \`stage_adoption: S<k> <plan_id>\` の 1 行を持つことを要求する。無ければ STAGE_ENTRY_WITHOUT_CONDITIONS。読めない comment は「無い」と同じ扱い（FAIL）。

3.5 **判定 4 (b')**: Unit の \`changes_predicates\` が全部、今の段 k の受入 ID の中。次の段の Unit は FAIL（anti_work）。k は 3.3。

3.6 **作業指示は Unit ごとに 1 枚、常設**: \`unit: {plan_id, node_id}\`、\`allowed_paths\` は glob、\`completes_unit\`（任意）。path の拡張は新しい comment（同じ marker + \`supersedes: <前の URL>\`）で、実行リードが出す（決定 2 = OD-SHIRUBE-S1-DONE…）。**門が読む作業指示の comment は、門が動く repo の control_source に置く**（BF-02。作業指示を #57 に書いた時は、その写し（本文の bytes そのまま）を製品の control_source に置き、PR はその写しを名指す）。

3.7 **資格情報と読める範囲の対応表**（BF-02）: sds-gate の workflow = \`github.token\`（読取り。**その repo の中だけ**）→ 読むもの = PR・label・diff・同じ repo の issue comment（道筋・作業指示の写し・監査の依頼と返却）。手元の検査（plan-admission・kit check・audit-admission の --preflight / --review）= 席の \`gh\` の資格情報 → 読むもの = iyasaka-arc の決定の comment（PA-1 の採択の参照）、他 repo の comment。CI に新しい token は足さない（S9。足す時は R4 で Owner）。検証計画: GATE4-A の試験に「同じ repo の comment は読める／他 repo の private の comment は 404 で FAIL（PASS を偽らない）」の正負例を置く。

### §3b Unit の分割と risk（BF-05・BF-03）
| Unit | 内容 | risk | 1 PR の見込み |
|---|---|---|---|
| GATE4-A-BINDING | plan-binding.mjs（3.1・3.2・3.5）と試験 | R2 | +400 行以内（旧形の同居を含む。超えるなら旧形の同居を A' に分ける） |
| GATE4-B-ADMISSION | plan-admission.mjs（3.3・3.4）と試験 | R2 | +250 行 |
| GATE4-C-KIT-DOCS | kit.mjs の pin の欄・PR template・distribution.md §4 の改版・写しの決まり | R2 | +200 行 |
risk の根拠: 記録だけ（report-only）の段の code。止める段に上げる操作（pin の \`plan_binding_mode\`）は BLOCKING-AUN で R4 = Owner の exact-head。設計の事前監査はこの設計 v2 の監査で済む。各 Unit は実装後の独立監査 1 回と統合 1 回で閉じる。
Owner の手（1 周）= 承認 1（設計 v2）+ exact-head 2（SELF-GATE・DIST-AUN）+ 設定 2（ruleset）= 5 ≤ 6（S1-SH-07、決定 2 = A）。BLOCKING-AUN の exact-head は 1 周の外。

<!-- 写し: [V1] 47〜48 行（§4） -->
### 4. 役割と Owner の手
作者 = shirube の席（実装）、設計 = arc、監査 = devauditor（設計の事前監査 → 実装後）、統合 = suite-lead。Owner の手: exact-head 2 回（shirube の自己適用 = workflow、AUN の導入 = workflow）、ruleset 2 回（shirube・aun）、薄片 3 を blocking に上げる時の pin の exact-head 1 回。全 repo に配る時の必須化の採択は 1 枚。

<!-- v1 の §5（50〜52 行。5 つの条件）は [V3] の §5 が置き換えた。写さない -->
<!-- 写し: [V3] 6〜19 行（§5 の置き換え = 証拠を report-only / blocking の段階で分けた表） -->
### §5 「1 周」の完了条件（置き換え）— 証拠と段階の対応
固定 base f8413fe1 の gate.mjs の事実: 判定 1〜3 の FAIL は mode に依らず gate 全体を FAIL にする。判定 4 の FAIL は pin の plan_binding_mode が blocking の時だけ全体を FAIL にし、report-only では JSON の plan_binding に FAIL を書いて verdict は PASS のまま。したがって負例の証拠は段階で分かれる。

| 証拠 | 段階（pin の mode） | 取る node | 何が記録に残るか |
|---|---|---|---|
| (1) 実 PR が門を通って統合された | report-only | AUN-LOOP | gate の PASS の status と統合の記録（pin の commit） |
| (2a) 監査なしの R2 負例が止まる | report-only | AUN-LOOP | 判定 3 で gate 全体 FAIL、ruleset で merge 不可（機械の拒否の実測） |
| (2b) Unit なし・範囲外の負例の判定 4 | report-only | AUN-LOOP | gate の JSON の plan_binding = FAIL（verdict PASS）。merge 不可はここでは取らない |
| (2c) Unit なし・範囲外の負例が止まる | **blocking** | BLOCKING-AUN（Owner の exact-head の後） | gate 全体 FAIL、ruleset で merge 不可（機械の拒否の実測） |
| (3) 統合後の main でも門が効く | report-only | AUN-LOOP | 統合後の次の PR の gate の status |
| (4) 作者の手間は数行 | report-only | AUN-LOOP | 実 PR の diff と作者の席の記録 |
| (5) 誤 FAIL 0 | report-only | AUN-LOOP | 記録だけの判定 4 の FAIL の分類（本当の飛ばし／作者が直せる不備／門の不備 = 0） |
| 採択の無い道筋の拒否 | 手元の受付 | AUN-LOOP | plan-admission の STAGE_ENTRY_WITHOUT_CONDITIONS の出力 |
「1 周」= (1)〜(5) のうち (2c) 以外。S1-SH-02 の受入は (2b) と (2c) の両方で閉じる（BLOCKING-AUN が S1-SH-02 の最後の node）。各記録に pin の commit と mode を結ぶ。手動の統合拒否は機械の merge 不可の代わりにしない。受入条件の意味と report-only の意味は変えない。

<!-- 写し: [V2] 32〜33 行（§5 への追加 = 版の結び） -->
### §5 「1 周」の完了条件（v1 のまま 5 つ）+ 版の結び（BF-01）
1 周は「新しい判定 4 を含む pin」で回す。順序 = DESIGN-REC → GATE4-A・B・C → KIT-VERIFIER → SELF-GATE（pin = GATE4-C の統合後の main）→ RULESET-SHIRUBE → DIST-AUN（同じ pin）→ RULESET-AUN → AUN-LOOP。報告だけの観測と blocking 後の merge 不可の試験は、それぞれ AUN-LOOP と BLOCKING-AUN の integration_evidence に版（pin の commit）を書く。

<!-- 写しではない（作者の参照の 1 行。ARC の指示）。[V1] の §5 の最後の行にあった要求を、置き換えで落とさないための参照 -->
利用者に見える振る舞いを変える Unit は Bolt の終わりに Owner が実演を見る（OD-SHIRUBE-SPEC-FREEZE §3 = [OD-F] §3）。

<!-- 写し: [V1] 54〜63 行（§6） -->
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

<!-- v1 の §7（65〜69 行）は [V2] の §7 が置き換えた。写さない -->
<!-- 写し: [V2] 35〜36 行（§7） -->
### §7 未決（置き換え）
全部 ARC の既定で確定（A6 の裁定 #57 6306089613 の 1・2・4・5、3 は Owner の決定 2 = A）。残る未決は無し。

<!-- 写し: [V1] 71〜72 行（§8） -->
### 8. 設計監査（事前、D1〜D6）の項目の集合
shirube の docs の PR（この設計の記録 + 項目集合 file）で依頼する。D1 目的と範囲外（§0・§6）／D2 全受入の検証計画（§5 の 5 条件と負例の手順）／D3 代替案（§7 の各代替）／D4 秘密・権限・観測・復旧（ruleset と pin の戻し方、workflow は pin の commit だけを読む）／D5 社内予算（own-code 2,300 行、作者の手間 = block 数行）／D6 検証可能性（各判定の正負例が fixture で書けること）。

<!-- 写し: [V2] 38〜39 行（§9） -->
### §9 live_baseline の再現（BF-06）
target_manifest_digest = main f8413fe1 の scripts/sds/ の 7 file を取り出した checkout で \`find scripts/sds -type f | LC_ALL=C sort | xargs shasum -a 256 > manifest.txt; shasum -a 256 manifest.txt\` = \`133ff6267897dbc2841f69dff1280b011a84b81a2381980f9d72105ab2947374\`。

## 追記（作者 shirube の席）

ここから先は**追記**です。上の写しは書き換えていません。追記は、設計監査の項目が求める事実を、shirube の席が今の code と記録から読んで足したものです。cycle 1 の指摘で [V2] が確定した点は、[V2] の節への参照にしました。

### A0. 目的と対象外（D23-1）

Owner の言葉と決定 ID を、上の参照の表のとおり引きます。
- 完成形（[OD-F] §1、決定 OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001）: 「AI-DLC の各段階の出力が記録として残り、次の段階は前の段階の出力への参照が無いと始まらないことを、全 repo で機械が保証する。作者が書くのは PR の数行だけ。」
- 作り方（[OI-K] の Owner 原文、OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001）: 「LLM主導でやる部分は余計な記述はいれません。shirubeとして必要なのはゲートとスクリプト的な制御が必要な箇所になると思います。」
- S1 の採択（[OD-S1] の問 1・問 2）: Owner の答えは「１：OK、２：OK」。問 1 = S1 の 7 条件で Shirube の S1 を定めてよいか、問 2 = 作業指示の「触ってよい範囲」の拡張を実行リードが出してよいか。S1-SH-07 の数だけ [OD-2] が「6 回まで」に改めた。

目的: 薄片 2 = R2 以上は、監査の受領が今の head を名指さないと統合できない（[OD-F] §4 の表の「2 監査の受領を必須に」）。薄片 3 = Unit を名指さない PR・作業指示の範囲外を変えた PR・今の段の採択の無い道筋は進めない（同表の「Inception が先」「3 道筋と作業指示に結ぶ」）。

対象外と、その出どころ:
1. 必須検査・ruleset・pin の変更そのもの = Owner の決定（保護面。[OD-F] §6、[OD-S1] の「含まないもの」、写しの §2.3・§4）。この記録は変更の設計までで、変更はしない。
2. アカウントの分離（[OD-F] §6）。「Owner の承認が本人のものか」は参照では分からず、S1 の条件に入れない。
3. 薄片 4・5（[OD-S1] 「S1 に入れないもの」。S2・S3 に回す）。
4. V3 の席の制御の撤去（[OD-S1] の「含まないもの」は S3 の設計で別に伺う。それまで新しい規則を足さない）。写しの §6 の表は、採択ではなく案のままである（[V1] §7 の Q3 は [OD-S1] が「Q3 は S3 へ」とした）。
5. AI-DLC の engine / hook の導入（[OI-K] の「含まないもの」、T146。借りるのは prompt と記録の形だけ）。

### A1. S1 の 7 条件と、作業・観測・「1 周」の対応（D23-2、PL-1）

条件の定義は [OD-S1] の決定 1（S1-SH-07 の数は [OD-2]）、node と観測の記録の形は [DP]（`terminal_predicates` の `evidence_required`、各 node の `changes_predicates` と `integration_evidence`）、「1 周」の証拠は写しの §5（[V3] の表。(1)〜(5)、(2a)〜(2c)）です。node 名は `DP-N-SH-` を略します。

| 受入 ID | 作業（[DP] の node） | 観測（実際の記録の形） | [V3] §5 |
|---|---|---|---|
| S1-SH-01 監査なしは統合できない | DESIGN-REC・KIT-VERIFIER・SELF-GATE・RULESET-SHIRUBE・DIST-AUN・RULESET-AUN | shirube と aun で各 1 件: R2 の負例 PR の sds-gate の FAIL（判定 3。mode に依らず gate 全体の FAIL）と、ruleset で merge できなかった記録（aun 側は AUN-LOOP の (2a)） | (2a)(3) |
| S1-SH-02 道筋に無い作業は統合できない | DESIGN-REC・GATE4-A・GATE4-C・DIST-AUN・AUN-LOOP・BLOCKING-AUN | **(2b) AUN-LOOP（report-only）**: Unit を名指さない PR・allowed_paths の外を変えた PR の gate の JSON の `plan_binding` = FAIL（verdict は PASS。merge 不可はここでは取らない）。**(2c) BLOCKING-AUN（blocking、Owner の exact-head の後）**: 同じ負例が gate 全体 FAIL になり ruleset で merge できない記録。どちらも pin の commit と mode を結ぶ | (2b)(2c) |
| S1-SH-03 Inception が先 | DESIGN-REC・GATE4-B・AUN-LOOP | 採択の参照の無い道筋を手元の plan-admission が STAGE_ENTRY_WITHOUT_CONDITIONS で拒んだ負例の出力と、採択のある道筋が通った出力 | 受付の拒否 |
| S1-SH-04 正しい PR は止まらない | AUN-LOOP | 統合された実 PR（N14 か N16）の sds-gate の PASS の status（pin の commit と mode = report-only）と、記録だけの期間の全 FAIL の 3 分類（本当の飛ばし／作者が直せる不備／門の不備 = 0） | (1)(5) |
| S1-SH-05 作者の手間は増えない | GATE4-A・GATE4-C・AUN-LOOP | 実 PR の diff（block の行数）と、作者の席の記録（道筋・作業指示の編集が無い） | (4) |
| S1-SH-06 Shirube 自身が門を通る | SELF-GATE・RULESET-SHIRUBE | shirube の PR の sds-gate の status と、main の ruleset の読み戻し | (3) |
| S1-SH-07 Owner の手は 1 周で 6 回まで | AUN-LOOP | 1 周の間に Owner が受けた依頼（カード・決定）の一覧と数 | — |

「1 周」は (1)〜(5) のうち (2c) 以外で、各記録に pin の commit と mode を結びます。手動の統合拒否は機械の merge 不可の代わりにしません（[V3] §5）。S1-SH-07 は [V3] §5 の表に無く、数えて確かめます（数え方は A4）。機械で確かめないもの（未測定・対象外）: Owner の承認が本人のものか（[M] distribution.md §7 のとおり機械で見ない。アカウントの分離は対象外）、要求の意味・設計の良し悪し（独立監査が見る）、ruleset の設定の意図（機械が読み戻すのは設定の値だけ）、Owner の決定の comment が本当に Owner の言葉か（PA-1 は marker と `stage_adoption` の行の構造だけを見る）。

### A2. 代替案（D23-3）

| 論点 | 採った案 | 採らなかった案 | 理由（出どころ） |
|---|---|---|---|
| (a) PR から道筋への参照 | `plan_id` と `node_id` だけ。門が pin の `delivery_plan.control_source` から最新の ADMITTED を解決する。旧形は 1 世代だけ同居（[V2] §3.1） | 道筋の comment の digest と generation を PR に書かせる（今の判定 4。[M] distribution.md §4 は `comment_ref`・`comment_sha256`・`plan_id`・`generation`・`node_id` の 5 欄） | 改版のたびに全 PR の写しが古くなり無効になる。作者に状態の写しを書かせない（[V2] §3 の原則、S1-SH-05）。旧形は S6（新旧の同居）で外す |
| (b) 依存 Unit の完了 | 道筋の COMPLETE、または `completes_unit: true` の作業指示を持つ統合済み PR（[V2] §3.2） | 道筋の COMPLETE だけ | 道筋の改版を待つ間、次の Unit が止まる（[V1] §7 Q4、[OD-F] §4 の「改版を待たない」） |
| (c) 段の採択の印 | Owner の決定の comment の `stage_adoption: S<k> <plan_id>` の 1 行（[V2] §3.4。[OD-S1] 自身がこの行を持つ） | ADF の schema に欄を足す | ADF の schema は凍結（[V1] §7 Q1。ADF の固定 commit 561baebe は [M] distribution.md §3） |
| (d) 作業指示の拡張 | Unit ごとに常設。拡張は実行リードが同じ marker + `supersedes` の comment で出す（[V2] §3.6、[OD-S1] 決定 2 で採択） | ARC だけが出す、PR ごとに出す | 待ちの列ができる（[OD-S1] 問 2）。範囲の意味は独立監査が見る（同決定） |
| (e) 自己適用 | Shirube 自身も pin の commit の checker で自分の PR を判定する（写しの §2.1） | 最新の code（PR の head か main）で判定する | PR が検査を書き換えて自分を通せる。checker と判定の本体は PR の head ではなく固定した commit から取る（[M] distribution.md §4「実装上の要求」） |
| (f) 今の段 k の正本 | 道筋の `satisfied_predicates`（Owner が証拠を受け入れた受入 ID）（[V2] §3.3、[A6] 2） | node の COMPLETE から読む | COMPLETE は作業の完了で受入ではない（[A6] 2、Goal Stages 3） |

### A3. 秘密・権限・観測・復旧・データ（D23-4）

- 資格情報: 自己適用の呼出し側 `sds-gate-self.yml` と導入の workflow は、kit の `kit/sds-gate-caller.yml` と同じ形（`pull_request_target` + `issue_comment`）。`permissions` は `contents`・`pull-requests`・`issues`・`actions`・`checks` が read、`statuses` が write だけ。reusable の `.github/workflows/sds-gate.yml` は Shirube を `job.workflow_sha`（pin の commit）で checkout して identity を検査し、判定は `github.token` で GitHub を読み、commit status を 1 つ付けるだけ。PR の code は checkout も実行もしない。定義は既定 branch から読まれる（`pull_request_target`）ので、PR は自分を判定する workflow を書き換えられない。workflow を足す・変える PR は保護面で effective R4（判定 1）。追加の secret は無い。
- 読める範囲: [V2] §3.7 の対応表のとおり（sds-gate は `github.token` で、その repo の中だけ。PA-1 と手元の検査は席の `gh` の資格情報。CI に新しい token は足さない）。道筋と作業指示の写しは製品 repo の issue に置く（[V2] §3.1・§3.6）。読めない・parse できない時は FAIL で、PASS を偽らない。shirube は public、aun・iyasaka-arc は private（API で確認）。他の private repo の comment を `github.token` が読めないのは GitHub の仕様で、作者は CI での実測を未了（GATE4-A の試験に同じ repo は読める／他の private は 404 で FAIL の正負例を置く = [V2] §3.7）。
- 観測: gate の結果の JSON の `plan_binding.result` と `reason`、commit status の description（先頭 140 字）。blocking に上げる前の FAIL は、gate の run の JSON と PR を見て 3 分類する。
- 戻し方: (1) ruleset の解除（Owner の設定 1 回。解除すると report-only と同じで、読み戻しで確かめる）。(2) pin の `plan_binding_mode` を `report-only` へ戻す PR（`.shirube/**` で R4、Owner の exact-head）。(3) gate の不備なら pin の `sds_commit` を前の commit に戻す PR（同じく R4）。report-only の間は何も止めないので、(1)(2) が安全側の状態。
- blocking に上げる条件: AUN の記録だけの期間の判定 4 の FAIL を 1 件ずつ 3 分類し、門の不備による誤 FAIL が 0（[V3] §5 の (5)、S1-SH-04、[DP] の BLOCKING-AUN の条件）。上げる操作は pin の `plan_binding_mode` の変更（BLOCKING-AUN、R4、Owner の exact-head 1 回。1 周の外）。
- データ: gate が読むのは同じ repo の issue・PR・comment だけ。個人情報・秘密を読まず、書かず、この記録にも書かない。

### A4. 予算と範囲・PR の分け方・Owner の手（D23-5、PL-2）

実測（main f8413fe1 で `npm run hygiene:budget`。今の [M] 3ad60ee2 は `scripts/`・`.github/workflows/`・`configs/` が同じなので変わらない）: own_code_lines は **1,820 / 2,300**（24 file）。余りは 480 行。`pr-size` は 1 PR の追加 400 行・20 file（docs と JSON も数え、`tests/fixtures/**` は除く）、新しい file は 300 行、関数 50 行、複雑さ 10。枠は [A6] 1 のとおり変更する file で数える（PA-1 = `plan-admission.mjs` は KIT-ADF 450 の枠〔今は `plan-admission-shape.mjs` 102 + `plan-admission.mjs` 108 = 210〕、`plan-binding.mjs`・`gate.mjs`・`kit.mjs` と `sds-gate-self.yml` は既存 1,500 の枠、未割当 50 は使わない）。各枠の今の使用は、実装席が各 PR で `own-code-budget.mjs` で測って PR 本文に書く。

| file | 今の行数 | 増分の見積もり（作者、実装前） | 内容（Unit） |
|---|---|---|---|
| `scripts/sds/plan-binding.mjs` | 63 | +40〜60（旧形の同居を含めて +60〜80） | GATE4-A: 3.1・3.2・3.5。関数の上限のため、解決の部分は新しい file に分ける可能性がある（300 行以下） |
| `scripts/sds/plan-admission.mjs` | 108 | +20〜35 | GATE4-B: PA-1 と k の規則。純関数のまま（S4）で、comment の本文は呼出し側が渡す |
| `scripts/sds/gate.mjs` | 141 | +10〜20 | GATE4-A: pin の `delivery_plan.control_source` を読んで渡す |
| `scripts/sds/kit.mjs` | 176 | +10〜20 | GATE4-C: pin の新しい欄 |
| `.github/workflows/sds-gate-self.yml` | 0 | +25〜30 | SELF-GATE: 自己適用の呼出し側（`kit/`・`templates/` は own-code の計数外） |
| 合計 | | +105〜185 | 1,925〜2,005 / 2,300 |

総量は収まる見込みです。超えた時の削る候補: 旧形の同居の経路を、全 consumer が pin を上げた後に別の PR で外す（[V2] §3.1・[A6] 4。旧形を使う repo は pin の旧 commit の code を使い続ける）。新しい読み出しは既存の `comment()`・`blocks()` を再利用し、同じ処理を 2 度書かない（S3）。

- 作者の手間の上限: PR の block の `delivery_plan_binding` は `plan_id` と `node_id` の 2 欄（今は 5 欄）と label。`control_handoff` の ref・sha256 は今のまま。道筋・作業指示を作者が更新しに行かない（S1-SH-05）。
- Owner の手の上限（BF-03）: 1 周で 6 回まで（[OD-2]）。見込み = 承認 1（設計 v2）+ exact-head 2（SELF-GATE・DIST-AUN）+ 設定 2（RULESET-SHIRUBE・RULESET-AUN）= 5。判定 4 の code の 3 つの子 Unit は R2（記録だけの段の code。設計の事前監査はこの監査で済む）で、exact-head を持たない。BLOCKING-AUN の exact-head は 1 周の外（[V2] §3b）。

PR の分け方（[DP] の順。critical_path のとおり 1 つずつ）:

| 順 | node | PR | risk | Owner の手 |
|---|---|---|---|---|
| 1 | DESIGN-REC | この PR（shirube、docs 2 file） | R1 + 明示の監査 | なし |
| 2〜4 | GATE4-A-BINDING / B-ADMISSION / C-KIT-DOCS | shirube: 各 1 PR（見込み +400 以内 / +250 / +200 行） | R2 | なし |
| 5 | KIT-VERIFIER | shirube: kit の skill と依頼の雛形（`verifier_sha256` を pin の commit から計算） | R1 | なし |
| 6 | SELF-GATE | shirube: pin（= GATE4-C の統合後の main）・`sds-gate-self.yml`・PR template | R4 | exact-head 1 |
| 7 | RULESET-SHIRUBE | PR なし | — | 設定 1 |
| 8 | DIST-AUN | aun: kit apply の導入 PR（同じ pin）、作業指示の写しは aun#3 に置く | R4 | exact-head 1 |
| 9 | RULESET-AUN | PR なし | — | 設定 1 |
| 10 | AUN-LOOP | aun・shirube: 実 PR 1 件、監査なしの R2 負例（判定 3 の FAIL と ruleset の拒否 = (2a)）、Unit なし・範囲外の負例（`plan_binding` の FAIL を report-only で記録 = (2b)）の使い捨て PR、受付の負例。記録は aun#3 と shirube#6（pin の commit と mode を結ぶ） | — | なし |
| 11 | BLOCKING-AUN | aun: pin の `plan_binding_mode` を blocking に。統合の後に Unit なし・範囲外の負例 PR 各 1 件で、gate 全体の FAIL と ruleset の merge 不可を観測 = (2c) | R4 | exact-head 1（1 周の外） |

### A5. 各判定の正例・境界・負例の fixture（D23-6、BF-04）

fixture は `tests/fixtures/**` に置き（pr-size と行数の計数外）、期待値は要求から決めて実装の出力に合わせて変えません（[M] audit-method §3）。負例はすべて FAIL か拒否で、PASS になりません。

| 判定 | 正例・境界 | 負例 |
|---|---|---|
| k の決定（[V2] §3.3） | `satisfied_predicates` に S1 の ID が欠けていれば k = S1。**境界**: S1 の全 node が COMPLETE でも S1 の受入 ID が satisfied に無ければ k = S1（S2 の Unit は FAIL）。全受入 ID が satisfied なら k = 無し（道筋は閉じている） | `satisfied_predicates` に `terminal_predicates` に無い id、接頭辞が `S1`〜`S4` でない、`satisfied_predicates` が読めない |
| PA-1（道筋の受付） | `source_refs` に marker `shirube-owner-decision/v1` と本文 `stage_adoption: S<k> <plan_id>` の行を持つ comment がある | そのような comment が無い（STAGE_ENTRY_WITHOUT_CONDITIONS）、`plan_id` が違う、marker が無い、現在の段 k の行が無い、comment が読めない |
| 判定 4 (b') | Unit の `changes_predicates` が全部、今の段 k の受入 ID | 次の段の ID を含む（`anti_work`）、混在、空 |
| id だけの解決・旧形の同居（[V2] §3.1） | 同じ `plan_id` の ADMITTED が generation 1・2 なら 2 を採る（DRAFT の 3 は無視）。旧形 5 欄の block は 1 世代の間 PASS | ADMITTED が無い、同じ generation が 2 件、`control_source` が読めない、pin に `delivery_plan.control_source` が無いのに新形の block、旧形で digest が不一致 |
| 依存の観測（[V2] §3.2） | `depends_on` が道筋で COMPLETE、または統合済み PR の作業指示が `completes_unit: true` | PR は統合済みだが `completes_unit` が無い、PR が未統合、作業指示の `unit` が別の node |
| 作業指示の鎖（[V2] §3.6） | 同じ cell の marker + `supersedes: <前の URL>` が最初の作業指示までたどれ、その写しが門が動く repo の control_source にあり、PR が最新を名指す | `supersedes` が無い拡張、別の cell を指す、鎖が輪、写しが control_source に無い、範囲外の path（4.17） |
| 読める範囲（[V2] §3.7） | 同じ repo の道筋・作業指示の写し・監査の依頼と返却の comment は `github.token` で読める | 他の repo の private の comment は 404 で FAIL |
| 自己適用 | shirube の PR を pin の commit の checker が判定し、tools identity の検査（`job.workflow_sha`）が通る | PR が `plan-binding.mjs` を常に PASS に書き換えても同じ PR の判定は変わらず FAIL のまま。workflow を足す PR は effective R4 |
| 段階（[V3] §5） | report-only: Unit なし・範囲外の PR は `plan_binding` = FAIL でも verdict は PASS（既存の試験 T4-03・T4-21）。blocking: 同じ種類の欠けは gate 全体 FAIL（既存の試験 T4-04）。判定 3 の FAIL は mode に依らず gate 全体 FAIL | report-only の記録に merge 不可を求める、blocking の前に (2c) を求める、各記録に pin の commit と mode を結ばない |

投稿者の席は機械で区別できません（席のアカウントは共有）。作業指示の鎖で機械が見るのは構造だけで、「実行リードが出した」か、範囲の意味が妥当かは、運用と独立監査が見ます（[OD-S1] 決定 2、アカウントの分離は対象外）。

### A6. 設計 v1 に無かった 5 点

ARC の裁定（[A6]）で確定し、[V2] の §3・§3b・§7 に取り込まれました。S1-SH-07 の数は [OD-2] で 6 回です。この記録に未決は残していません。

### A7. 作者の再現（BF-06）

`target_manifest_digest` を、main f8413fe1 と main 3ad60ee2 の `scripts/sds/` の 7 file を取り出したそれぞれの checkout で [V2] §9 の命令（`find scripts/sds -type f | LC_ALL=C sort | xargs shasum -a 256 > manifest.txt; shasum -a 256 manifest.txt`）どおりに作者が再計算し、`133ff6267897dbc2841f69dff1280b011a84b81a2381980f9d72105ab2947374` を、どちらでも得ました（[DP] の値と一致。宣言値を転記したものではありません）。

## 監査項目への対応

| 項目 | 答える所 |
|---|---|
| D23-1 目的と対象外 | A0、写しの §0・§6、参照の表 |
| D23-2 全受入の検証計画 | A1、[V3] §5（証拠を report-only / blocking の段階で分けた表。(1)〜(5)、(2a)〜(2c)） |
| D23-3 代替案 | A2、写しの §7（[V2]）・§3 |
| D23-4 秘密・権限・観測・復旧・データ | A3、[V2] §3.7、写しの §2 |
| D23-5 予算と範囲 | A4、[V2] §3b、[OD-2] |
| D23-6 検証可能性と独立性 | 参照の表（URL と SHA-256）、A5、写しの §4・§8。この PR は 2 file だけ（この記録と項目集合）。作者（shirube の席）・監査者（devauditor）・統合担当（suite-lead）は別の席。この監査の受領を前提にする node は、[DP] の `depends_on` で DESIGN-REC に依存する GATE4-A・GATE4-B・KIT-VERIFIER と、それらを経る SELF-GATE。PR 本文の `delivery_plan_binding` は g4、`control_handoff` は作業指示 v8 |
| PL-1 受入 ID（縦） | [DP] の `terminal_predicates`（S1-SH-01〜07 の description と evidence_required）、A1、[OD-S1]（`stage_adoption: S1 DP-SHIRUBE-001`）、[OD-F] §1。S2〜S4 の受入 ID は description に【条件未採択】とあり、その置き場の node（S2-ALL-REPOS・S3-OPERATION・S4-EFFECT）の deliverable に、Owner が条件を採択してから分けると書かれている（S2 には「それまで作業指示は出さない」とある） |
| PL-2 Unit の大きさ（横） | [DP] の node 11 本（各 node が S1-SH-* を名指し、deliverable と integration_evidence を持つ）、[V2] §3b の子 Unit（各 1 PR・1 監査・1 統合）、A4 の PR の分け方 |
| PL-3 依存と順序 | [DP] の `depends_on`（設計監査 → 判定 4 の code → 自己適用 → ruleset、自己適用 → 配布 → ruleset、ruleset → 1 周 → blocking）、`critical_path.step_ids`（14 step。先頭の 11 が S1 の node、残る 3 が S2〜S4 の置き場）、`wip_limit: 1`、[V2] §5 の版の結び、[V3] §5（AUN-LOOP の証拠 = report-only の (1)(2a)(2b)(3)(4)(5)、BLOCKING-AUN の証拠 = blocking の (2c)。report-only で取れない merge 不可を AUN-LOOP に求めない。[DP] の両 node の `integration_evidence` に pin の commit と mode を結ぶと書かれている。g4 は g3 の写すだけの改版で、node・順序・この証拠は同じ） |
| PL-4 覆いと整合 | [DP] の `terminal_acceptance`（`covered_predicates` は S1-SH-01〜07 と S2〜S4 の 10 件、`uncovered_predicates` は空）。`live_baseline` は main `3ad60ee2`・tree `8daaf935…`（作者が GitHub API で commit の tree を読み一致を確認。g4 が `f8413fe1` から写し直した）、`target_manifest_digest` は A7 のとおり再現。道筋 DP-SUITE-001 の Shirube の node は、次の Suite g8 でこの道筋に移す計画が [DP] に書かれている |
| PL-5 独立性 | 参照の表の [DP] の行（URL と yaml の囲みの SHA-256 `c1aed291…`）。PR に道筋の写しは置いていない。DESIGN-REC の作業指示はこの監査を含む PR 自身なので、g4（ARC が作成）を根拠にできる。それ以外の node の作業指示は、この監査の受領の後（[CH]） |

## 監査 cycle 1（[R1]）・cycle 2（[R2]）の指摘と、直した所

| 指摘 | 直した所 |
|---|---|
| BF-01 AUN-LOOP の前に新 checker が届かない | [V2] §5 の版の結び、[DP] の順（判定 4 の code → SELF-GATE → DIST-AUN が同じ pin → AUN-LOOP） |
| BF-01 の残り（cycle 2）負例の証拠を report-only と blocking で分けていない | [V3] §5（証拠の段階の表）、[DP]（g3 で是正、g4 が写す）の AUN-LOOP（(2a)(2b) = report-only）と BLOCKING-AUN（(2c) = blocking）の `integration_evidence`、A1・A4・A5 |
| main の移動（PR #60・#62 の統合、`3ad60ee2`。docs の 4 file だけ） | [DP] g4（`live_baseline` を写すだけの改版）、参照の表の [M]、PL-4 の行、A7 |
| BF-02 `github.token` では道筋以外の private を読めない | [V2] §3.1・§3.4・§3.6・§3.7、A3 |
| BF-03 S1-SH-07 と計画が両立しない | [OD-2]（6 回）、[V2] §3b、A4 |
| BF-04 「今の段 k」が未定義 | [V2] §3.3、[A6] 2、A5 の k の正例・境界・負例 |
| BF-05 GATE4 が 1 回で閉じる Unit か不明 | [V2] §3b の子 Unit（A・B・C）、[DP] |
| BF-06 `target_manifest_digest` を再現できない | [V2] §9、A7 |
