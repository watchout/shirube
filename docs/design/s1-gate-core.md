# Shirube S1 を品質の門の芯に絞る — 設計の記録

適用 ID: OD-SHIRUBE-S1-GATE-CORE-ONLY-AND-SECURITY-IN-S2-20261027-001（[#49 6430561109](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6430561109)、本文 SHA-256 `0d381d9ec3e4533a324d2bad24ac31d3d30be6380f04480b6463b4f076412ea0`。以下 [OD]）、OI-SHIRUBE-QUALITY-OVER-RECORDS-BUILD-ONLY-NEEDED-20261027-001（[#49 6430346631](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6430346631)、`c4729e90a7f1bd78c19ae87c8974f3af5a2e37a98c36a289211cb0849f084e25`。以下 [OI]）、OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001（[#49 6305753673](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673)。以下 [DONE]）、OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（[#49 6336035707](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6336035707)。以下 [MEAS]）、OD-SHIRUBE-APPROVAL-RECORD-CONTRACT-FIRST-DB-LATER-20261021-001（[#49 6315688299](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6315688299)。以下 [REC]）、薄片 2・3 の設計の記録 `docs/design/slice23-control-v1.md`（shirube main `9cfe421f`、独立監査済み。以下 [SL23]）。設計の作者 = arc。版 3（設計監査 1 回目 [shirube#72 6432170453](https://github.com/watchout/shirube/pull/72#issuecomment-6432170453) の BF-S1G-ADOPTION-BINDING-01・BF-S1G-OWNER-COUNT-01 を直した。変えた所は §2・§2.1・§4 の 3・§5 の S1-SH-03 と S1-SH-07・§8・§9）。

## 1. 目的と対象外

Owner の言葉（[OI]）: 「とりあえず記録よりも品質維持だと思うんです。AI-DLCだけでは抜けてしまう穴を塞ぐこと、AI-DLCだけで開発が進むならshirubeを無理にすぐ作らなくてもいいです。ただそれだと成立しない気がするので、必要な部分を作って配布したいだけです」。

**目的**: S1 を、AI-DLC だけでは塞げない 2 つの穴を機械で塞ぐ門の芯に絞り、shirube と aun（S1-SH-04 の対象）に効かせる。
1. 監査を通っていない PR が統合できてしまう（S1-SH-01）。
2. 工程を飛ばした PR が進めてしまう: 道筋に無い作業（S1-SH-02）と、Inception の済みの条件を Owner が採択する前の作業（S1-SH-03）。

**対象外**（この記録では変えない）: S1 の完了の条件 S1-SH-01〜07 の文、門の判定 1〜5 の決まり、固定 checker、required checks と branch protection の中身、AI-DLC の engine と Guard Policy、S2 のセキュリティの制御の中身（[OD] の 3）、G1・G2 の設計（shirube#70）。

## 2. 穴と、使う物

| 穴（完了の条件） | 使う物 | 今の状態 | S1 ですること |
|---|---|---|---|
| 監査なしの統合（S1-SH-01） | 判定 1 risk_class・2 変更 path・3 監査の受領 | shirube では止める形（branch protection の必須、[#49 6389465250](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6389465250)）。CI での受領の読み直しの障害は G1（統合済み）と G2（shirube#71、Owner の exact-head 待ち）で直る | 新しい code は無い。aun に配る（§4 の 3） |
| 道筋に無い作業（S1-SH-02） | 判定 4 plan binding | 実装済み、shirube の pin で `report-only`。判定 4 は pin の `delivery_plan.control_source` が指す issue の道筋の comment を読む。shirube の pin にはまだその欄が無い | 新しい code は無い。aun に配る時、pin の `delivery_plan.control_source` を aun の repo の issue（aun#3）にし、AUN の道筋の comment をそこに置く（§8 のとおり、aun の門は aun の repo しか読めないため）。止める形への切り替えは [MEAS] の目安（記録だけの期間に実際の PR 10 件以上・誤った FAIL 0）を満たした後に Owner が repo ごとに決める |
| Inception が先（S1-SH-03） | 計画の受付（`scripts/sds/plan-admission.mjs`） | 形と意味の検査はある。「今の段の済みの条件を Owner が採択した記録」への参照の検査は無い | U5 だけを作る。中身は [SL23] §3.3（今の段 k の決め方）と §3.4（PA-1）のまま: 道筋（`shirube-delivery-plan/v1`）の `terminal_acceptance.satisfied_predicates` から今の段 k を決め、`owner_outcome.source_refs` の URL のどれかが「1 行目が marker `shirube-owner-decision/v1:<ID>`、本文に `stage_adoption: S<k> <plan_id>` の 1 行（plan_id はその道筋の plan_id）」の comment でなければ受け付けない（STAGE_ENTRY_WITHOUT_CONDITIONS）。結合と拒む場合は §2.1。U5 は門（CI）では動かさず、道筋を受け付ける時の CLI（suite-lead の前検査、T129）で動き、Owner の決定はその席の資格情報で読む |

**承認の根拠の置き場**: S1-SH-03 の「採択」の根拠は、AI-DLC の audit から作る承認の記録ではなく、control source に公開された Owner の決定の記録（`shirube-owner-decision/v1`）とする。これは権限の置き場の決まり（R1: 権限は control source に publish された決定だけ）と同じ置き場で、受付が確かめるのは記録の在りか・marker・`stage_adoption` の行が道筋の plan_id と今の段 k に合うことだけ（本人確認は CF-AUTH-01 で後の版）。[REC] の「門が承認として読むのは Shirube が GitHub に公開する承認の記録の 1 種類だけ」は、S1 ではこの 1 種類を `shirube-owner-decision/v1` の記録と読む。**この読みは [REC] の文の解釈を含むので、aidlc-shirube の開き直し（§6）で Owner の確認を取る。**

### 2.1 採択の結合（U5 が受け付ける場合と拒む場合）

「この製品・今の段の済みの条件の採択」との結合は、新しい欄を作らず、既にある構造を使う: Owner の決定の記録は 2 行目に `stage_adoption: S<k> <plan_id>` を持つ（[DONE] は `stage_adoption: S1 DP-SHIRUBE-001`、[#49 6306226221](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6306226221) は `stage_adoption: S1 DP-AUN-ROUTE-001`）。この行の段と plan_id が、受け付ける道筋の今の段 k と plan_id に合うことを U5 が確かめる。製品はその道筋の plan_id で、段は k で見分ける。決定の種類は `stage_adoption` の行があることで見分ける（この行は段の採択の決定にだけ書く）。

| 場合（U5 の試験に置く。comment の本文は記録した bytes を使い、試験は外を読まない） | 結果 |
|---|---|
| 正例: AUN の道筋（plan_id `DP-AUN-ROUTE-001`、k = S1）の source_refs に #49 6306226221（`stage_adoption: S1 DP-AUN-ROUTE-001`）がある | 受け付ける |
| 負例 1: source_refs に Owner の決定が 1 つも無い | 拒む（STAGE_ENTRY_WITHOUT_CONDITIONS） |
| 負例 2: 実在し marker も正しいが採択ではない決定だけを指す（own-code の上限の決定 [#49 6379138360](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379138360)、本文 SHA-256 `b3678290324f793f0b6ec14a284d349e6e83ca4862d7c994f09e42f0849c3b5c`。`stage_adoption` の行が無い） | 拒む |
| 負例 3: 別の製品の採択を指す（AUN の道筋に [DONE] の `stage_adoption: S1 DP-SHIRUBE-001`） | 拒む（plan_id が違う） |
| 負例 4: 別の段の採択を指す（k = S1 の道筋に `stage_adoption: S2 <同じ plan_id>` の決定） | 拒む（段が違う） |
| 負例 5: marker の無い comment（Owner の指示の記録 `owner-instruction-capture` など）に `stage_adoption` の行を書いた | 拒む（marker が違う） |
| 負例 6: source_refs の comment が読めない（404・権限なし） | 拒む（FAIL。読めない = 無いと同じ、[SL23] §3.4） |
| 負例 7: 今の段 k が決まらない（`satisfied_predicates` に `terminal_predicates` に無い id、接頭辞が S1〜S4 でない） | 拒む（[SL23] §3.3） |

版 2 の「本文 SHA-256 の一致」は外した: ADF の schema の `source_refs` は URL だけで凍結されていて（[SL23] の A2 の表の (c)）、照らす値の置き場が無い。[SL23] §3.4 の PA-1 も digest を見ない。後からの書き換えを見分けないことは §8 の既知の弱みに書く。

## 3. 後の版へ回す物（S1 から外す）

| 物 | 元の置き場 | 扱い |
|---|---|---|
| 承認の記録の作り手（I1）・承認の記録の PR（A） | U1 / U3 | 後の版。shirube PR #67 は閉じる。PR #68（I1 の設計 v7、設計監査 round 6 PASS）は、shirube#70 §3.4 のとおり門の直しの最後の確かめに使って統合し、後の版の設計の記録として残す（S1 では作らない） |
| kit の自己用の書く先と `budget.mjs`（I2）・記録の橋と門の判定（I3）・計測（I4）・kit の版上げ（K） | U1 | 後の版。S1-SH-06（Shirube 自身が門を通る）は、shirube の main の branch protection と sds-gate の必須で既に満たしている |
| 計測の全体 | U2 | 後の版。S1-SH-04・05 の確かめは §5 のとおり既存の物で行う |
| 判定 5 を変更 path の包含まで広げる・PR の雛形の欄 | U4 | 後の版。判定 5 は今の形（`report-only`）のまま |
| onza への配布 | U7 | S1 の後（Onza は完了の条件の確かめ方に入らない = 範囲の定義） |

## 4. 作る順と PR

1. G2（shirube#71）の統合 → shirube#70（G1・G2 の設計の記録）の統合 → #68 の追従・確かめ・統合（shirube#70 §3.4 のまま。門が直った最後の証拠）。どれも [OD] の前に決まった手順のまま。
2. この記録の docs だけの PR（R1）の統合（1 の 3 本の後。それより先に main に入れない。#70 §3.3 の main を止める範囲を崩さないため）。
3. U5 の PR（R2、1 本、追加 400 行・20 file の中）: `plan-admission.mjs` に [SL23] §3.3・§3.4 の検査と、§2.1 の正例 1・負例 7 の試験を足す。保護面には触れない。
4. aun への配布（U6）: 配布キットの apply で、aun に門と pin を入れる（判定 4・5 は `report-only`）。最初の導入なので Owner の exact-head（1 回）。
5. 判定 3 は aun でも必須にする設定、判定 4 の止める形への切り替えは、目安を満たした後に Owner が決める（設定 = S1-SH-07 の数に入る）。

## 5. 完了の条件の確かめ方（S1-SH-01〜07 は変えない）

- S1-SH-01: 負例 PR（R2・監査なし）が shirube と aun で FAIL し、merge できなかった記録。
- S1-SH-02: 負例 PR（道筋の node を名指さない・許可 path の外）の判定 4 の FAIL の記録。
- S1-SH-03: §2.1 の負例 7 つを U5 の試験が拒む記録と、aun の実の道筋での 1 回。その時の aun の道筋の plan_id と今の段 k に合う `stage_adoption` の決定が無ければ、受付が拒むのが正しい挙動で、その時は Owner に段の採択を伺う。
- S1-SH-04: aun の実 PR 1 件以上が門を通って統合され、記録だけの期間の FAIL の分類（devauditor が PR ごとに書く、[MEAS]）で門の不備が 0。Shirube の計測の部品は作らない。
- S1-SH-05: 実 PR の diff と作者の席の記録（作者が書くのは PR の機械向けの block と label だけ）。数は W2 の測定（iyasaka-arc#53）で見る。
- S1-SH-06: shirube の PR の sds-gate の status と branch protection の読み戻し（既に満たしている）。
- S1-SH-07: 数え方は [MEAS] の決定 1 のまま変えない（「1 周（この最初の版 S1 を作り終えるまで）で、#49 の決定・exact-head・保護面の設定・指示ボードのカードを数え、6 回まで。AI-DLC の会話での段の承認と要約の確認は 6 回に数えず、回数だけ別に記録する」）。数え始めは S1 の採択（[DONE]、10/21 01:29Z）。
  - **今の値は少なくとも 43 回で、上限の 6 回を既に超えている**。内訳（一覧は §9）: #49 の Shirube の決定 37（§9.1）、#49 に自分の記録の無い指示ボードのカード 6（§9.2）。10/23 より前の Suite 指示ボードのカードのうち、選択のカードは #49 に写されて §9.1 に入っているが、操作だけのカードは数え切れていない（下限）。全製品にかかる決定（§9.1 の OD-AIDLC-OWNER-SESSIONS-NAMED-20261022-001・OD-SUITE-AIDLC-COVERAGE-FLOOR-80-20261022-001・OD-AIDLC-QUESTIONS-ASKED-IN-PLAIN-DIALOGUE-NOT-DRAFTED-20261023-001 の 3 件）を外しても 40 回で、結論は変わらない。
  - 別に記録する数（6 回に数えない、[MEAS]）: #49 に写された会話の承認 2（§9.3）、質問ボードの会話の段の締めのカード 12（§9.2 の表の下）、aidlc-shirube の audit の event の数（段の承認 23・要約の確認 45、Owner の作業場の file。公開しない決まり = OD-SHIRUBE-PUBLIC-REPO-NO-AIDLC-AUDIT-20261023-001）。
  - 数えなかった物と理由（§9.4）: Owner が自分から出した指示（`owner-instruction-capture` の記録 4）は、Owner に求めた手ではないので数えていない。別の製品の決定は数えていない。この 2 つの扱いも、下の問いで Owner に確かめる。
  - これからの見込み（§4 のとおりに進めた時）: G2 の exact-head 1、aun への導入の exact-head 1、aun の必須と止める形の設定 1〜2、開き直しで #49 に記録する決定 1 以上。合わせて 4〜5 回以上が足される。
  - 版 2 の「既に使った物 2 回」は arc の数え誤り（exact-head だけを数えた）で、取り消す。[DONE] の S1-SH-07 は「超えたら設計の誤り」なので、今の数え方のままでは S1-SH-07 は満たせない。
  - **この記録は数え方も上限も変えない**（L6）。Owner に伺う範囲（aidlc-shirube の開き直しの要件の段の問い、§6）: (a) 数え方を変えず、S1-SH-07 は満たせなかった（設計の誤り）と記録し、S1 の済みにこの条件をどう扱うか、(b) 数え始めを [OD]（10/27 00:22Z）に改める（今からの見込み 4〜5 回で 6 回の中）、(c) 上限や数える物を改める。どれも Owner の決定で、決まるまで S1-SH-07 は「未決」と書く。

## 6. aidlc-shirube で開き直す段

S1 の作業の単位が 7 つから U1（済みの分）・U5・U6 に減り、範囲の「必ず入れるもの」のうち「今の値の計測」を Shirube の部品にしないので、範囲の段（Scope Definition）から開き直す。各段では、承認済みの答えを書き換えず、置き換える問いを足す（会話の学びのとおり）。問いは arc が質問ボードで噛み砕いて Owner に聞く（OD-AIDLC-QUESTIONS-ASKED-IN-PLAIN-DIALOGUE-NOT-DRAFTED-20261023-001）。§2 の [REC] の読みの確認は、要件の段の問いにする。

## 7. 採らなかった案

- **今の計画のまま（承認の記録の作り手を作る）**: 3 本目だけで実装の監査 4 回・設計の監査 6 回を使った（[OD] の前の流れ）。作り手は AI-DLC の engine が中で決めている判断を外から作り直す物で、端の場合が出るたびにやり直しになる。Owner が B を選ばなかった。
- **S1 にセキュリティの制御を入れる**: 守る基準（security-intel の基準 v0.1）がまだ無く、作り直しになる。Owner が [OD] の Q2 で S2 を選んだ。
- **S1-SH-03 を外す（Inception が先を機械で見ない）**: 「工程を飛ばした PR は進めない」が Owner の選んだ芯（[OD] の 1）なので外さない。U5 は S（小）で、新しい部品を作らずに今の受付に足すだけで済む。
- **計測の部品を S1 に残す**: Owner の「記録よりも品質維持」に合わない。S1-SH-04・05 は devauditor の分類と W2 で確かめられる。

## 8. 秘密・権限・復旧・予算

- 門の資格情報は今のまま（`github.token`、読むだけ）。読む所と資格情報:
  - 判定 1〜3: PR の repo の中（label・diff・PR の comment）だけ。aun でも `github.token` で読める。
  - 判定 4: pin の `delivery_plan.control_source` が指す issue。GitHub の workflow の `github.token` はその workflow の repo だけを読める（GitHub の仕様。aun では U6 の導入の時に 1 回測る）ので、aun では道筋をこの issue に置く。iyasaka-arc（private）の comment を aun の門から読む作りにはしない。読取り用の token を足す案は資格情報と workflow の変更（保護面）なので、S1 では採らない。
  - U5: 門では動かない。道筋を受け付ける席が CLI で動かし、control source の comment を GET で読むだけで、書込みをしない。
  - どれも PR の head の code を checkout も実行もしない（判定 4・5 と同じ）。
- 既知の弱み（隠さない）: 門は道筋の本文の `status: ADMITTED` と本文の SHA-256 を読むだけで、受付（U5 を含む）が実際に走ったかは機械で確かめない（今の判定 4 の作りのまま。道筋の後からの書き換えは SHA-256 で止まる）。U5 は Owner の決定の comment が後から書き換えられても見分けない（§2.1 の終わり。GitHub には編集の履歴が残る）。受付の結果の記録を門が確かめる形と、決定の comment の書き換えを見分ける形は、後の版の候補として S2 の検討に入れる。
- 失敗を隠さない: 参照が読めない時は受付を FAIL にする（NOT_CHECKED にしない）。
- 戻し方: U5 は revert で戻せる。aun への導入は、使い始める前なら kit の file を消す PR で戻せる。
- 予算: own-code の上限 4,000 行（OD-SHIRUBE-OWN-CODE-BUDGET-4000-FOR-S1-20261024-001）の中。U5 の追加は 1 本 400 行の中。この記録は docs だけ。

## 9. Owner の手の一覧（§5 の S1-SH-07）

本文の SHA-256 は、GitHub API の comment の `body` を bytes のまま実測した値（2026-10-27）。索引（iyasaka-org main `7b262c15`）の各行の sha256 の頭と一致する。

### 9.1 数えた物: #49 の Shirube の決定（37）

| # | 決定 ID | #49 の comment | 種類 | 本文 SHA-256 |
|---|---|---|---|---|
| 1 | OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001 | [6305753673](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673) | 決定 | `8c6f8542888d5cd0302146f5d6f10bb097ab9fe12893fee533f670984a5a4893` |
| 2 | OD-SHIRUBE-PR60-EXACT-HEAD-20261021-001 | [6305999700](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305999700) | exact-head | `a9f78ec30a1c5e277e4151c460ea20aff61be3ee145969757bfbc2d66ca680c2` |
| 3 | OD-AUN-S1-REGROUP-AND-SHIRUBE-S1-SH-07-SIX-20261021-001 | [6306226221](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6306226221) | 決定 | `44095e3060618975ac1e4bc7fe5ea5739b19f3ca7a2d09e9189c731e01edece5` |
| 4 | OD-KIT-UPGRADE-STANDING-AND-INCEPTION-WHILE-WAITING-20261021-001 | [6308341298](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308341298) | 決定 | `d2d1a8e4da93411d6baa1cca8ef2338d6b9822db15eb43489b9d3dabeb43bf94` |
| 5 | OD-INCEPTION-ENTRY-AIDLC-FORM-AS-IS-20261021-001 | [6308461447](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308461447) | 決定 | `37c2912b0910bd0e000c8a9f3f7abde96cfbe51f0ab3f517968a251b17e856a8` |
| 6 | OD-SHIRUBE-INIT-AND-INTENT-START-20261021-001 | [6308731943](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308731943) | 決定 | `c3b2a2161f6706b26175a67b49fde2d7bcf5b8c89f1213c39fc2fca21fac2554` |
| 7 | OD-SHIRUBE-INCLUDE-AIDLC-NO-REINVENT-20261021-001 | [6309035411](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6309035411) | 決定 | `3cbfb54ac5c577439ae61efc90549569eec1ab91bdf055a95352f2afe01663c0` |
| 8 | OD-SHIRUBE-PR64-ROUND4-20261021-001 | [6314983198](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6314983198) | 決定 | `b5611c8cc0f09db7002fcb2d435e9c71a2aa4173a8095375a6896cf3c9ccf961` |
| 9 | OD-SHIRUBE-APPROVAL-RECORD-CONTRACT-FIRST-DB-LATER-20261021-001 | [6315688299](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6315688299) | 決定 | `4c1074c43b48a609d9a0f070ef1ed6c0cc9815d6642ad149f414fbf6ad89c951` |
| 10 | OD-AIDLC-OWNER-SESSIONS-NAMED-20261022-001 | [6327673130](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6327673130) | 決定 | `1334dc52caef1340f40de7fece9e2ab4080b69c12bc17d3bf340cfd452f86037` |
| 11 | OD-SHIRUBE-FIRST-TRIAL-ALL-SUITE-AND-OMOTENASUAI-TWO-STAGE-RESUME-20261022-001 | [6328896533](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6328896533) | 決定 | `aa45131c610e3419b916cf4e379e4fdadc5b090abb92321c857dd019eb1cd892` |
| 12 | OD-INTENT-CAPTURE-DRAFTED-BY-ARC-SHIRUBE-AUN-20261022-001 | [6329313516](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6329313516) | 決定 | `8287e34ce112a642741a1fc1e090af78e93deaf0a0d959906d4c6264e91ee9cc` |
| 13 | OD-SHIRUBE-DESIGN-INSIDE-AIDLC-SESSION-20261022-001 | [6329978835](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6329978835) | 決定 | `2673d133c39e3bd6e17f5bb8c5595bf2e4c5670e37ac57e5dbc8f93e38a46844` |
| 14 | OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001 | [6336035707](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6336035707) | 決定 | `77fd29384aad0515266a711eaf48d336f5d89203ddc1d77a5a899b9d98a02472` |
| 15 | OD-SUITE-AIDLC-COVERAGE-FLOOR-80-20261022-001 | [6336689921](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6336689921) | 決定 | `1e75bff61da21abf8452b49a0f33e3e084443daad3b4e790d09888adf0d9e776` |
| 16 | OD-SHIRUBE-U1-IMPL-SEAT-IN-AIDLC-WORKSPACE-20261023-001 | [6353826462](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6353826462) | 決定 | `46d3c4ba44c5141ee42792fd0e70cc005fb3c33abe836846ed52a8dd8cdf631b` |
| 17 | OD-SHIRUBE-PR-SIZE-RECORDS-AND-U1-BUNDLE-20261023-001 | [6354019047](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6354019047) | 決定 | `d382cac38d77ae68d3bcfa8fe996da9519f452f5cc786e7b183188a762bf222e` |
| 18 | OD-SHIRUBE-PUBLIC-REPO-NO-AIDLC-AUDIT-20261023-001 | [6354411741](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6354411741) | 決定 | `71c65350b8f8a5f8165d225d1977ac5d5de00e52a52414e9d50d288f1ddff8bb` |
| 19 | OD-SHIRUBE-U1-PR-ORDER-AND-BUDGET-IN-P1-20261023-001 | [6357471211](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6357471211) | 決定 | `59a9c0d3d1b0736e90a7eb879c22088dfea5a5e0a556a3810075d7fb43be6fb2` |
| 20 | OD-SHIRUBE-U1-KIT-BUMP-BEFORE-I3-AND-VERIFY-COMMAND-20261023-001 | [6358433267](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6358433267) | 決定 | `94ed4c13867bacb340ddb5eec1e4685a8b7904cdea54f79b1113d6ffd3bea17a` |
| 21 | OD-SHIRUBE-U1-IMPL-SEAT-STARTS-IN-OWNER-WORKSPACE-20261023-001 | [6360130806](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6360130806) | 決定 | `aa930ed9e3ce1c3695dacedfa2a9dbe5716bf740d2fbe3c00517d2b0060054e2` |
| 22 | OD-AIDLC-QUESTIONS-ASKED-IN-PLAIN-DIALOGUE-NOT-DRAFTED-20261023-001 | [6360243431](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6360243431) | 決定 | `fedf2228ebac2f7a62cf2c6cb994a764db6db64a78b395b504fac8a1d0ed149d` |
| 23 | OD-SHIRUBE-U1-FOUR-IMPL-PRS-SUPERSEDED-MARK-ATTEMPT-FILES-NODE26-20261024-001 | [6375005810](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6375005810) | 決定 | `2ad957181a51e770ba743498499725573f8e1c140b17e72f999e4ef16fc515cc` |
| 24 | OD-SHIRUBE-U1-CODE-GENERATION-START-20261024-001 | [6377584568](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6377584568) | 決定 | `1c68e26b8a45313a1846faf0f70217e4541a0861ee2a1a8f3b7bd0439d02c500` |
| 25 | OD-SHIRUBE-OWN-CODE-BUDGET-4000-FOR-S1-20261024-001 | [6379138360](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379138360) | 決定 | `b3678290324f793f0b6ec14a284d349e6e83ca4862d7c994f09e42f0849c3b5c` |
| 26 | OD-SHIRUBE-P1-PR66-EXACT-HEAD-AND-P1-SETTINGS-20261024-001 | [6379461383](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379461383) | exact-head | `cc806f3339a39d03182ba598ce10eb2ee7a25865262929d98077cf5bfc1f4556` |
| 27 | OD-SHIRUBE-R65-W1-NAMED-FIVE-PATHS-EXCEPTION-20261024-001 | [6379831485](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379831485) | 決定 | `dbb02a1ee70696c77a3c7c4b5921dd00d31d7a6d288297bd832b97c4a71d8330` |
| 28 | OD-SHIRUBE-I1-ROUND4-SAME-KIND-AND-AIDLC-OVERLAP-CHECK-20261024-001 | [6380750052](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6380750052) | 決定 | `2b4c1372c55a3e28d243595f4c1ffe14b9f4e70218b17c9e8af21d55fe71e95f` |
| 29 | OD-SHIRUBE-I1-ENGINE-STATE-COPY-DESIGN-REVISION-20261024-001 | [6381170673](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6381170673) | 決定 | `c3a785ee163ff14c4fa00f8eebaaab6134446de895f6901490ef72c388cdd6d6` |
| 30 | OD-SUITE-FLOW-SHIRUBE-PROTECTION-AND-GATE-FIRST-GUARD-OFF-20261024-001 | [6381325839](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6381325839) | 決定 | `29a7d96f700e6eef221ce4b65351bee8567579f2c87218228bc9b6866a9cdb9f` |
| 31 | OD-SHIRUBE-MAIN-BRANCH-PROTECTION-AND-SDS-GATE-REQUIRED-20261025-001 | [6389465250](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6389465250) | 保護面の設定 | `c43992dbaeeecffdda4a997466b139879bc580bc3cbfef5ea086b11a48e3b68f` |
| 32 | OD-SHIRUBE-I1-UNIT-DONE-VIA-ENGINE-PARTS-WITH-BUN-20261025-001 | [6389500200](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6389500200) | 決定 | `8bff5a804725d274039686f2f89ba54e392423743a21093af1c94e79619e742e` |
| 33 | OD-SHIRUBE-I1-DESIGN-AUDIT-ROUND4-UP-TO-5-20261025-001 | [6392241050](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6392241050) | 決定 | `2c909fea0b9ebcc726a0d2cb79b12b297d385544f94b350aebf1264e480f0df1` |
| 34 | OD-SHIRUBE-I1-DESIGN-ROUND6-WHOLE-COPY-20261025-001 | [6393696963](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6393696963) | 決定 | `358303d8534e1417f608cc3e9a3754e5ce6909ec0b18988a60fd1a3698e83ddc` |
| 35 | OD-SHIRUBE-GATE-FIX-ADMIN-ENFORCE-TEMP-OFF-20261026-001 | [6404453776](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6404453776) | 保護面の設定 | `8062d996b7e596eea1f3859ef6300d433d97d528f41bf64f57db88a726169c8f` |
| 36 | OD-SHIRUBE-GATE-FIX-G1-PR69-EXACT-HEAD-20261026-001 | [6411293387](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6411293387) | exact-head | `bc0ba4231fba2151d160d3034385772b6d5476cd92e4778721e2e50c9926a40f` |
| 37 | OD-SHIRUBE-S1-GATE-CORE-ONLY-AND-SECURITY-IN-S2-20261027-001 | [6430561109](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6430561109) | 決定 | `0d381d9ec3e4533a324d2bad24ac31d3d30be6380f04480b6463b4f076412ea0` |

### 9.2 数えた物: #49 に自分の記録の無い指示ボードのカード（6）

出典 = iyasaka-arc `cross-cutting/boards/question-board/suite/db-export-20261025.json`（main `cdb9cb04` の file、SHA-256 `f973738667fe7b065a6d94889feefedf90f695a81ae76707128a651b27f11f41`）の `done`。今の質問ボードの db も同じ id を持つ。カードの題は今の repo に残っていない物があり、その中身は id からの見立てと書く。

| カード id | Owner の印の時刻 | 中身 |
|---|---|---|
| shirube-cto-seat-1 | 2026-10-23T08:34:37Z | CTO の会話に、shirube の実装の席を AI-DLC の作業場で起動し直す作業指示の文を貼る |
| shirube-bf-reopen-1 | 2026-10-23T11:53:53Z | aidlc-shirube で、監査の指摘 4 つを記録に反映させる（開き直しの指示を打つ） |
| shirube-r4-done-1 | 2026-10-23T21:24:44Z | 題は残っていない（id からの見立て: 監査 round 4 の後、会話に done と打つ） |
| suite-lead-enter-1 | 2026-10-23T22:00:31Z | 題は残っていない（id からの見立て: suite-lead の画面で Enter を押す） |
| shirube-park-2 | 2026-10-23T23:42:23Z | 題は残っていない（id からの見立て: aidlc-shirube の会話を止めておく操作） |
| suite-lead-protect-allow-1 | 2026-10-24T21:04:34Z | 題は残っていない（id からの見立て: 保護面の設定の許可の文を suite-lead に貼る） |

`shirube-cg-start-1`（10/24 00:21Z、「始めて」）は #49 の OD-SHIRUBE-U1-CODE-GENERATION-START-20261024-001 に写されたので、9.1 で 1 回だけ数えた。

別に記録する会話の段の締めのカード（12、6 回に数えない）: shirube-ug-summary-1・shirube-ug-learn-1・shirube-cd-learn-1・shirube-cd-approve-1・shirube-dp-summary-1・shirube-dp-learn-1・shirube-dp-approve-1・shirube-fd-summary-5・shirube-nfrr-summary-1・shirube-nfrd-summary-1・shirube-infra-summary-1・shirube-cg-plan-2。学びの選択（learn）を段の承認の一部として別に数えたのは arc の読みで、§5 の問いで Owner に確かめる。

### 9.3 別に記録する物: #49 に写された会話の承認（2）

| 決定 ID | #49 の comment | 本文 SHA-256 |
|---|---|---|
| OD-SHIRUBE-SCOPE-AND-KUSABI-INTENT-APPROVED-20261022-001 | [6329622282](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6329622282) | `7f2f1597eb143b901dcf6690c8229cf23471563e202c797d733f2f0cf54cf85b` |
| OD-SHIRUBE-INCEPTION-APPROVED-20261022-001 | [6350628309](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6350628309) | `43665254cea00d52264d3a1c83db028ee2e911732963b40e9f46c8523e343068` |

### 9.4 数えなかった物: Owner が自分から出した指示（4）

| 指示 ID | #49 の comment | 本文 SHA-256 |
|---|---|---|
| OI-DIALOGUE-BASED-PROGRESSION-20261021-001 | [6308414423](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308414423) | `316f417af404afa3ba97a76e79702307e31bfb0c2df8c1dfd333a38e75af5ffe` |
| OI-DO-AS-DEFINED-AIDLC-INTENT-CAPTURE-SHIRUBE-AUN-20261021-001 | [6315837693](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6315837693) | `8ac15301bf2a40cd296c1e28ab83898f8fcde4a9ed1e8c31b4967a8a998a3390` |
| OI-AIDLC-DESCEND-AFTER-SHIRUBE-FRAME-20261022-001 | [6327895565](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6327895565) | `4c9a69c1c1e04ebe369d38dcca8cf629ff52a6f25b6997bc049ad1acb85691a5` |
| OI-SHIRUBE-QUALITY-OVER-RECORDS-BUILD-ONLY-NEEDED-20261027-001 | [6430346631](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6430346631) | `c4729e90a7f1bd78c19ae87c8974f3af5a2e37a98c36a289211cb0849f084e25` |

別の製品（AUN・Onza・Kusabi・OmotenasuAI）の決定は、Shirube への言及があっても数えていない（例: OD-AUN-SCOPE-R2-M-S-AND-ROUTE-S1-FOLLOWS-20261024-001、OD-OMO-MOTENASHI-FIRST-RELEASE-BUILD-BEFORE-SHIRUBE-LOOP-20261026-001）。S1 の採択（10/21 01:29Z）より前の決定（OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001 など）は、数え始めより前なので数えていない。
