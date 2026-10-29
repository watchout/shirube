<!-- sds-gate judgment 5: the design record. Source of truth = arc's design v1 §3 and work order S1-1; written after the implementation (PR #51, #54 on main), for the design audit (audit-method §3 D1-D6, Owner decision T154). -->
# sds-gate 判定 5（design binding）— 設計の記録

状態: 設計 v1 を Owner が承認（T103）し、実装（A1 = PR #51、A2 = PR #54）と文書（PR #55）が先に出た。audit-method §2 は R3 に事前監査を求めるが、作業指示がこれを抜かした。Owner の決定 T154 に従い、この記録を後から書いて設計の監査を受ける。
正本は設計 v1 [V1] と作業指示 S1-1 [S1-1]（§10）。この記録は意味を足さない。実装が設計 v1 と食い違う所は §5 に「差」として書き、実装は直さない（直すなら別の PR を ARC が指示する）。
範囲: main `c05e8ed0` の `scripts/sds/design-gate.mjs`（63 行）、`scripts/sds/gate.mjs` の判定 5、`scripts/sds/plan-binding.mjs`（`export` の 2 語）、`tests/design-gate.test.mjs`。文書側（distribution.md §4・§4.1・§6・§8、kit の 1 文）は PR #55 で、ここでは繰り返さない。
監査項目との対応: DGD-1 = §1〜§3、DGD-2 = §6、DGD-3 = §5・§7、DGD-4 = §8、DGD-5 = §9、DGD-6 = §10。

## 1. Owner の原文と決定 ID

| ID と場所 | Owner の原文（verbatim）と、決まったこと |
|---|---|
| T102 = A（OD-SHIRUBE-CONTROL-FIRST-THIN-SLICE-20261020-001、#49 6284653618） | 「…本当はSDS-V2をshirubeに落とし、shirubeの制御がSDS-V2を適用させる＋LLMの制御までやる。というものを作って開発をした方がいいのではないか？と思いますがどうですか？並行でできると言われてやってきましたが、今回のように形骸化したSDS-V2の適用度しかえられていない」→ 入力 A。最初の薄片は設計の段の門（空欄の答えが残る／承認の記録が無い／道筋の最初の node が主要な接続を通さない、のどれかを機械が止める） |
| T103 = A（OD-SHIRUBE-CONTROL-SLICE1-DESIGN-V1-APPROVED-20261020-001、#49 6284872857） | 入力 A。設計 v1 を承認し、Q1〜Q5 は全部既定。Q5 = A「PR 側の判定 5 は report-only から」 |
| T108 = A（OD-SHIRUBE-OWN-CODE-BUDGET-2300-20261020-001、#49 6285364300） | 「2000以内には確実に収まらないということか？」→ 入力 A。own_code を 2,300 行に広げ、内訳を固定: 判定 5 ≤ 150、席側の hook ≤ 150、KIT-ADF 450、未割当 50 |
| T154（OD-R3-MISSED-PREAUDIT-RUN-AUDITS-20261020-001、#49 6301299856） | 「とりあえず監査を通しましょう。そもそも監査なしでマージできてしまう仕組みがおかしいよね？」→ 判定 5 の設計の監査を後から行う（この記録が対象） |

## 2. 目的と対象外

目的: 設計の版に、**空欄の答え・承認の記録の欠け・主要な接続の順の乱れ**がある PR を、構造の事実だけで見つける。[V1] §1 の失敗 3 種のうち、A 未決の持ち越し = 5.2 に当たる。B 順番の誤りは、5.5・5.6 が見る範囲（主要な接続の node が今すぐ着手できること、PR の node がそれかその先であること）だけで、[V1] §3.1 の「最初の未完了 node との一致」は見ていない（§3・§5）。承認の欠け（5.3・5.4）は [V1] §3.1 の条件。
対象外（機械で見ない）:
- 設計の意味（問いが妥当か、答えが設計に反映されたか）。C 作者の誤り（採択済みの値と違う設計）も判定 5 は見ない（[V1] §3.1「意味は見ない」）。[V1] §1 は 3 種を「機械が止める」と書くので、C は設計 v1 の中で食い違う。C は独立監査（D1〜D6 と採択済み決定との照合）に残る。
- Owner の本人確認。`owner_approval: NOT_CHECKED_BY_MACHINE` は不変。
- 席側の hook（[V1] §3.2、DP-N-SHIRUBE-SEAT-HOOK）。未実装。設置は席の設定で、設計・独立監査・Owner の承認を経る別の工程。
- 判定 1〜4 の挙動の変更。T5-14 が、`design_binding` を除いた出力が変更前の bytes と一致することを保つ。

## 3. 門が読む契約 `sds-design/1` と 3 条件（[V1] §3.1 と [S1-1] §1.1。違う所は §5）

製品設計 1 枚の中に、```` ```json sds-design ```` の block を 1 個置く: `schema`（`sds-design/1`）、`design_id`、`version`（整数）、`open_decisions[]`（`id`・`question`・`options`・`default`・`answer`・`decided_ref`）、`approval`（`ref`・`sha256`）、`main_connection`（`id`・`statement`・`first_node`）。
1. 未決あり（5.2）: `answer` が空（空白だけを含む）、または `decided_ref` が `https://github.com/watchout/<repo>/issues/<n>#issuecomment-<id>` の形でない未決が 1 つでもある。findings に未決の `id` を書く。形は [S1-1] §1.1 の正規表現が正で、[V1] §3.1 の `#49` は承認の置き場の例（作業指示 v3 §0 の答え 2）。
2. 承認なし（5.3・5.4）: `approval.ref` が同じ形でない、`approval.sha256` が取得した本文の SHA-256 と一致しない、本文に marker `shirube-owner-decision/v1` と `design_id@version`（前後が `[\w.-]` でない 1 語）が無い。
3. 主要な接続が最初でない。書き方が 3 つあり、**実装が検査するのは (c) だけ**:
   - (a) T102 A (1)（Owner が A で選んだ、ARC の選択肢の原文）: 道筋の最初の node が主要な接続を通さない。
   - (b) [V1] §3.1: `first_node` が、道筋で `lifecycle_status` が COMPLETE でない最初の node の id と一致しない。「最初」の順（配列の並びか依存の順か）は [V1] に定義が無い [未確認]。**実装も試験も無い**（§5・§6）。
   - (c) [S1-1] §1.1 の 5.5・5.6（実装）: `first_node` が plan に無い、COMPLETE である、`depends_on` に COMPLETE でないものがある（今すぐ着手できない）。R2 以上では、PR の node が `first_node` そのものか、`first_node` を `depends_on` の推移閉包に持つもの以外は FAIL。
   (c) は (b) と同じ条件ではない。(b) を (c) に置き換えるという記述は、[S1-1]・作業指示 v3・v4 に見つからない [未確認]。

## 4. PR 側の判定 5 の流れ（[V1] §3.3）と判定の本体（[V1] §3.4）

`gate.mjs` の `judgment5`。判定 1〜4 の後で、読取りだけ。
1. base の pin（`.shirube/sds-pin.json`）の `design_binding_mode` を読む。欄が無い、pin が無い（404）、`off` は NOT_CHECKED（欄 `{mode, result, reason}` だけ）。
2. PR の `sds-pr/1` の任意の欄 `design_binding`（`design_ref`・`design_sha256`・`design_id`・`version`）が無い、または型が違う → 5.0。
3. `design_ref`（commit 固定の `.md`）を contents の GET で取り、取得した bytes の SHA-256 を `design_sha256` と比べる（5.0a 読めない、5.0b 不一致）。file の `json sds-design` block がちょうど 1 個（5.0c）。
4. block の `approval.ref` の comment 本文を GET で取る。判定 4 の結果が PASS の時だけ、判定 4 と同じ読み手で plan を読み直して渡す。
5. `designGate(block, { approvalBody, plan, boundNodeId, riskIndex })` を呼ぶ。PR が名指す `design_id`・`version` と block が違えば 5.8 を足す。
6. 結果 `{mode, result, design_id, version, reason?, findings}` を、出力 JSON の最後の欄 `design_binding` に付ける。`report-only` は verdict を変えない。`blocking` は `5 design binding: <reason>` を投げ、verdict が FAIL。上記以外の値は FAIL（fail-closed）。

判定の本体は `scripts/sds/design-gate.mjs` の `designGate` 1 関数（S3）。純粋で（S4）、時計・乱数・環境・ネットワークを読まず、import は `node:crypto` だけ（試験が source を検査）。digest は渡された bytes から計算する（S5）。壊れた入力は例外でなく FAIL と reason（S8）。findings は失敗と注記（`N/A`・`NOT_CHECKED`）を同じ形で持ち、verdict は失敗だけで決まる。

## 5. 実装での具体化と、設計 v1 からの差（main `c05e8ed0`）

| 項目 | 設計 v1 / S1-1 | 実装 | 扱い |
|---|---|---|---|
| reason の集合 | 5.1〜5.9（[S1-1] §1.1）、`gate.mjs` 側の 5.0・5.0b・5.0c（§1.2） | 5.1〜5.7 は `designGate`、5.0・5.0a・5.0b・5.0c・5.8 は `gate.mjs`。5.9 は使わない | 5.0a（読めない）は S8 の具体化、5.8 は下 |
| 5.8 | [V1]・[S1-1] に無い | PR が名指す `design_id`・`version` が block と違えば FAIL。block が 5.1 に合わない時は足さない | 宣言した版と実際に読んだ版が別でも通る穴（S5）を塞ぐ。作業指示 v3 §0 の答え 3 |
| plan を渡す条件 | 判定 4 が解決した plan（[S1-1] §1.1） | 判定 4 の結果が PASS の時だけ読み直す。他は plan = null で 5.5・5.6 が NOT_CHECKED | 判定 4 が通さなかった bytes を根拠にしない。読み手は判定 4 のもの（S3）。作業指示 v3 §0 の答え 1 |
| plan が無い時（5.7） | [S1-1] T5-08「verdict は 5.1〜5.4 で決まる」 | `designGate` 単体は T5-08 のとおり。gate 全体では 5.0〜5.4 と 5.8 が続く（5.8 は block が 5.1 に合う時） | 文書側の誤りは PR #55 の監査 1 回目の F01 で直した。S1-1 の文言は直さない |
| 段階 | [S1-1] §1.2 は「無し = NOT_CHECKED」、`off`・`report-only`・`blocking`。§2 は「NOT_CHECKED は 2 つだけ」 | 欄無し・pin 無し・`off` が NOT_CHECKED（reason は違う）。それ以外の値は型違いも FAIL で、stage が report-only でないので verdict も FAIL | `off` が 3 つ目の NOT_CHECKED（判定 4 の `off` と同じ。作業指示 v3 §0）。S1-1 §2 の文言との差 |
| 取得の失敗 | S8: NOT_CHECKED でなく FAIL | 5.0a。base64 でない内容（大きな file）も 5.0a。digest はデコードした bytes から計算 | 一致 |
| 主要な接続が最初か | [V1] §3.1: `first_node` = COMPLETE でない最初の node。[S1-1] §1.1 の 5.5・5.6 は着手できること（ready）と bound node の依存 | 5.5（ready）と 5.6（R2 以上で bound が `first_node` かその先）だけ。「最初の未完了 node との一致」は**実装も試験も無い**。反例（作者が main `c05e8ed0` で実行）: nodes = [EARLY, MC]（どちらも PLANNED、依存なし）、`first_node` = bound = MC、R2 → `PASS`・findings = []。[MC, EARLY] でも PASS | **未実装・未検証の差**。(b) を採るか (c) で足りるとするかは ARC の裁定（別の作業指示）。この記録は選ばない。決定の記録は見つかっていない [未確認] |
| `decided_ref` の形 | [V1] §3.1 は「`#49` の comment の URL」 | [S1-1] §1.1 5.2 の正規表現: `watchout` の repo の issue の comment なら何でも | 解決済み: 作業指示 v3 §0 の答え 2 で、正規表現が正、`#49` は承認の置き場の例 |
| 契約の内側の読み | [S1-1] §1.1 の文言（「空でない文字列」「`design_id@version`」「着手できる」） | 空白だけの `answer` は空、`design_id@version` は前後が `[\w.-]` でない 1 語、`first_node` は空でない文字列、`undefined` の plan は FAIL（`null` だけが NOT_CHECKED）、不正な `riskIndex` は plan がある時 FAIL、5.5 は `depends_on` が配列であることを要する | fail-closed 側の読み。PR #51・#54 本文の design_judgments に根拠つきで記録済み（設計の意味は変えない） |
| control_handoff との一致 | [V1] §3.3 (c) にある | **実装していない**。[S1-1] §1.2 の流れ (a)〜(e) に (c) が無い。`gate.mjs`・`plan-binding.mjs` に control_handoff の `design_binding` を読む code は無い（判定 4 は `plan_binding` だけを照合） | 決定済みの未実装: 作業指示 v3 §0 の答え 3 で、S1-1 §1.2 の凍結の中身に無いので PR-A に入れず、席の hook（SEAT-HOOK）の作業指示で扱う。handoff が名指す設計の版と PR が名指す版が違っても、それまで判定 5 は気づかない |
| FAIL の結果 | 欄は `{mode, result, design_id, version, findings}`（[S1-1] §1.2 (e)） | `reason`（最初の失敗の message）を足す | blocking の `5 design binding: <reason>` を作るため。判定 4 の `{mode, result, reason}` と同形 |
| 出力の欄の位置 | 指定なし | `design_binding` は `gate()`・`failure()` の最後の欄 | T5-14 が、欄を除いた出力を変更前の bytes と比べるため |

## 6. 検証計画と実測

受入の単位は [S1-1] §4 の T5-01〜15。[V1] §3.1・T102 の文言のうち S1-1 の表に無いものは、別の行で示す。

| 受入 | 試験（`tests/design-gate.test.mjs`） |
|---|---|
| 正例 1 | T5-01（findings = []）、gate 経由の「everything binds」（R1 なので 5.6 N/A） |
| 負例 1 空欄の答え | T5-02（空・空白・文字列でない・`decided_ref` 無し・別の形の 5 通り、`id` を名指す）、T5-13（report-only は verdict PASS、blocking は `5 design binding: 5.2`） |
| 負例 2 承認なし | T5-03（SHA-256 不一致・本文に 1 字足す・ref の形・digest の形・本文 null）、T5-04（marker だけ・語だけ・`@12`・`my-` 接頭の 4 通りは FAIL、括弧つきの語は PASS） |
| 負例 3（S1-1 の定義）`first_node` が着手できない／bound node が先でない | T5-05（plan の 8 形）、T5-06（R2 で `first_node` でも先でもない 3 通り、先は PASS、循環、`riskIndex` 不正 5 通り）、T5-07（R1 は 5.6 N/A）、gate 経由の「effective risk と bound node」 |
| [V1] §3.1・T102 A (1) の「最初の未完了 node との一致」 | **試験なし**（実装が無い。上の負例 3 は別の条件）。§5 の反例は PASS になる [未実装・未検証] |
| 壊れた block・入力 | T5-09（block 14 形と入力 4 形で例外なし・5.1）、F01 の 3 件と gate 経由 2 件（型違いは FAIL か NOT_CHECKED で、例外にも文字列変換での PASS にもならない）、壊れた JSON の block は 5.1 だけ |
| 壊れた plan | T5-05 と F01 の plan 形（5.5 FAIL）、判定 4 が FAIL なら plan を渡さない（「plan reaches designGate only when judgment 4 passed」） |
| 各 reason | 5.0（`design_binding` 無し = T5-10、commit 固定でない、SHA-256 無し、型違い 5 欄）、5.0a（3 形）、5.0b（T5-11）、5.0c（0 個・2 個）、5.1〜5.6 は上、5.8（design_id・version の 2 通り）。表駆動の 12 行は soft と blocking の両方を見る |
| `design_binding_mode` の 5 通り | 無し・pin 無し（T5-12）、`off`、`report-only`（T5-10・11・13 で verdict 不変）、`blocking`（T5-13 と表駆動で FAIL）、不正な値（`enforce` と型違い 3 通り） |
| 決定性・純粋・既存の保持 | T5-15、import 検査（`node:crypto` だけ）、T5-14（main `77b91ef5` の gate の出力 3 場面と bytes 比較） |

実測（作者が main `c05e8ed0`、Node v26.9.0 で実行）: `node --test tests/design-gate.test.mjs` = 43 件中 43 通過。全体 `node --test tests/*.test.mjs tests/u2/*.test.mjs` = 373 件中 373 通過。
PR 本文の記録（今回は再実行していない。script が無い）: A1（PR #51）は Red = 15 件中 12 失敗 → Green 15/15。変異 10 個は初め 2 個が生き残り、試験を足して 10/10 検出。監査 1 回目の F01 の是正は Red = 18 件中 3 失敗 → 18/18、元に戻す変異 6/6 検出。A2（PR #54）は Red = 32 件中 17 失敗、追加の Red 3、Green 43/43、変異 24/24 検出。
独立監査（devauditor）: A1 は 1 回目 BLOCK（F01）、2 回目 PASS（6 項目、6290045511）。A2 は PASS（7 項目、6291237236）。PR #55 は 1 回目 BLOCK（F01）、2 回目 PASS（6 項目、6293586996）。PASS の 3 件は固定 checker の `--review` で `RECEIPT_ACCEPTED`。
**未測定**:
- 変異の script は成果物に含めていないので、変異の結果は repo から再現できない。PR 本文と監査の返却の記録に頼る。
- [V1] §3.1 の「最初の未完了 node との一致」（§5）。実装も試験も無く、作者が main `c05e8ed0` で反例が PASS になることを実行した。
- 判定 5 の本体が実際の PR で動くところ。PR #54 の統合後に main の gate を実際の `gh` 経路で #53・#54 に実行したが、どちらも判定 3 以前で FAIL し、`design_binding: NOT_CHECKED`（`an earlier judgment failed`）の欄を見ただけ。pin に `design_binding_mode` を置いた consumer はまだ無く、全ての consumer で NOT_CHECKED になる。
- private の repo の comment を workflow の `github.token` で読めるか（§8）。
- plan の comment の読み直しの失敗（`planOf` の 5.0a）を直接起こす試験は無い（stub が同じ comment を返し続ける）。

## 7. 採った案と採らなかった案

- (a) 判定の本体を 1 関数にし、`gate.mjs` と将来の hook がそれだけを呼ぶ。採らなかった案: hook と `gate.mjs` がそれぞれ規則を書く。同じ判断が 2 か所で下せる状態になる（S3）。
- (b) 段階は base の pin の `design_binding_mode`（判定 4 の `plan_binding_mode` と同じ enforcement graduation、[V1] Q5 = A）。採らなかった案: 最初から blocking（[V1] Q5 の B。`design_binding` を持たない PR が全て FAIL になる、§8 (a)）、workflow の入力で決める（workflow は保護面 R4）、PR が自分の段階を宣言する（宣言は証拠でない、S5）。pin は信頼できる base から読む。
- (c) 5.8 を足し、plan は判定 4 が PASS の時だけ渡す。採らなかった案: 5.8 無し（PR が宣言した版と読んだ版が別でも PASS になる）、plan を常に読む（判定 4 が通さなかった bytes を 5.5・5.6 の根拠にする）、判定 5 が plan を別に取得して検証する（判定 4 の読み手と二重になる、S3）。
- (d) [V1] §3.3 (c)「control_handoff の `design_binding` との一致」は実装していない。作業指示 v3 §0 の答え 3: [S1-1] §1.2 の凍結の中身に無いので PR-A（A1・A2）に入れず、席の hook（SEAT-HOOK、道筋 g6 の node DP-N-SHIRUBE-SEAT-HOOK）の作業指示で扱う。採った判断: v3 のとおり入れない。採らなかった案: A1・A2 に入れる（S1-1 の凍結の外になる）。SEAT-HOOK の作業指示が出ているかは確認していない [未確認]。それまでは handoff と PR の設計の版の食い違いを、判定 5 は見ない。
- (e) 主要な接続が最初か（§5）: [V1] §3.1 の「最初の未完了 node との一致」と、S1-1 の 5.5・5.6 のどちらを採るかの決定の記録は見つかっていない [未確認]。実装は S1-1 に従った。採らなかった案: (b) を実装する。足すなら ARC の別の作業指示で、残り 28 行（§9）の中に収まるかは測っていない。

## 8. 権限と秘密、blocking の前の未決

- 判定 5 の読取りはすべて `gh api <path>` の GET で、timeout 20 秒。contents と comments だけ。書く操作は無い。sds-gate の workflow が最後に commit status を 1 つ書く（caller の `statuses: write`）のは判定とは別の step で、判定 5 はそこに関わらない。
- 資格情報は `GH_TOKEN` = `github.token`（caller の permissions: contents・pull-requests・issues・actions・checks は read）。`SHIRUBE_READ_TOKEN`（任意の secret）は、tools の checkout にだけ使う。
- PR の code を checkout も実行もしない。tools は reusable workflow 自身の commit（`job.workflow_sha`）から取り、caller は `pull_request_target` なので、PR は判定する check を書き換えられない。
- FAIL の理由に載るのは、符号（5.x）、PR・設計の欄の値（型を問わず `JSON.stringify`）、読めなかった時の `gh` の error message。token の値を組み立てる code は無い。`gh` の error message に token が出ないことは実測していない [未測定]。
- blocking にする前の未決 2 点（決めるのは Owner、ARC が案を出す。解けるまで blocking にしない）:
  - (a) `design_binding` を持たない PR の扱い。blocking は R0・R1 を含む全ての PR を 5.0 で FAIL にする（PR #54 の design_judgment 10、distribution.md §4.1）。設計の版に依らない PR を除く扱いが要る。
  - (b) private の repo の comment を `github.token` で読めるか [未確認]。測ったのは認証なしの GET（private は 404、public は 200）だけ。読めない時は 5.0a で FAIL。読取り用 token の追加は workflow と secret の変更（R4）。
- pin への `design_binding_mode` の追加も保護面（`.shirube/**`、R4）で、Owner の exact-head が要る。どの pin にも無い。

## 9. 予算

T108（§1）の内訳（own_code 2,300 行）: 判定 5（`design-gate.mjs` と `gate.mjs` の追記）≤ 150、席側の hook ≤ 150（別枠。判定 5 の残りとは合算しない）、KIT-ADF 450、未割当 50。
使用: A1 の `scripts/**` の追加 61 行（`design-gate.mjs`）+ A2 の 61 行（`design-gate.mjs` 7、`gate.mjs` 52、`plan-binding.mjs` 2）= 122 行、残り 28 行（PR #54 本文の数え方）。最終の木では `git diff --numstat 77b91ef5 c05e8ed0` の追加が 63 + 52 + 2 = 117 行（A2 が A1 の 5 行を書き換えた分、PR ごとの合計より 5 少ない）。どちらの数え方でも 150 以内。`own-code-budget` の全体は main で 1,820 / 2,300（他の作業の分を含む）。
A1・A2 の分割は、作業指示 v3 §0 の答え 5（大きさ）で ARC が 2 本に分けてよいとしたもの（v4 が項目集合を A1 用と A2 用に分けた）。数字から読めること: hygiene の上限は PR の追加 400 行・20 file、新規 file 300 行。A1 = 追加 237 行、A2 = 追加 245 行（削除 32 行）で、1 本にすると約 480 行になる。試験 file も 297 行で上限に近い。固定 checker は全項目が PASS でなければ受領せず（N/A が無い）、v4 は純粋関数（A1、6 項目）と配線（A2、7 項目）を別の項目集合にした。

## 10. 参照の一覧（comment の本文の SHA-256 は、取得した bytes から計算）

| 名 | URL | SHA-256 |
|---|---|---|
| 作業指示（この記録）CH-SHIRUBE-GATE5-DESIGN-AUDIT-20261021 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6301860279 | `9ef06cfdf7ab75c93f18f21dbb6b950e0e7a5fb7fbfa4697d982ffca8b5a1fba` |
| T154（Owner の決定） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6301299856 | `9eac9f4d6d9a52e9538ce63a20fabf3f9ac0b09ff9b6f2235a75283e05cec02c` |
| T102 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6284653618 | `f87958eba3e7fbed02d317a58927642ad900772cfb4ce078a1f43957037be659` |
| T103 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6284872857 | `9c1a7ac0fd1c5d95eebfb7dc710672e7de1adda50b2360e4219dde843b2f5af4` |
| T108 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6285364300 | `6698fb37f9b4c5f5fe3b2eab1d27600b09312afb36e70809493501bc47992154` |
| [V1] 設計 v1 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6284740098 | `4db1d8efb614f2893f00bb56d174da55519501963b9e3acde37a17de3cd8d72e`（T103 が引く `f64c2f25…` は、本文に改行を 1 つ足した値。訂正 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6285591709） |
| [S1-1] 作業指示 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6285014153 | `70edaaa05102fb8f3c1d5f4d20f04b9b161366eab1368acd0e0b8f2b96c974c3` |
| 道筋 DP-SUITE-001 generation 6 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6290585968 | `8c89e9d81736189caf8878b9cb5bb43e828cae3d982c6532b42597caa6773231` |
| A1 / A2 の作業指示 v3（不明点への答え） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6287183581 | `4e281c57161dfe8a367478562852e2ffabd827cac8ec9197c3ec9a4e31b41917` |
| A1 / A2 の作業指示 v4 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6288911560 | `1256938635ef0c1e747826de70547c7b15f230a9ea4184b91d48b463ab68a8c8` |
| PR-B の作業指示 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6292122024 | `108a331d480554cf3ee3aea39b4ec0023e208c2e84809db5eae60e858cf1d594` |

PR（`watchout/shirube`）: #51（head `acc76dae`、統合 `7f50460c`）、#54（head `541af1c3`、統合 `4362ee1e`）、#55（head `1144d08c`、2 回目の PASS で受領済み）。基準: main `c05e8ed0`、`docs/sds/audit-method.md` §3。

| 監査の返却（PASS） | URL | SHA-256 |
|---|---|---|
| A1（PR #51、6 項目） | https://github.com/watchout/shirube/pull/51#issuecomment-6290045511 | `bb8d8d378c906e3ceaecb8dab5415e54daa8ed5f61f3f519a1739fc6eb098556` |
| A2（PR #54、7 項目） | https://github.com/watchout/shirube/pull/54#issuecomment-6291237236 | `e1dea6c2108a59a68b18767cc431f3bcda4b31bbcfc51663e82d2fd28ee1c7c4` |
| 文書（PR #55、6 項目） | https://github.com/watchout/shirube/pull/55#issuecomment-6293586996 | `454aace857338fa8755516a9995ea193656a9d37f9edd2b2d1ebe00cd2211d98` |

## 11. U4 による書き足し（設計の記録 `u4-gate-judgements.md` 版 4。実装は U4 の実装の PR = R2 の 2a・2b）

記号: [DR] = `docs/design/u4-gate-judgements.md` 版 4（shirube#75、設計監査 4 回目 PASS = shirube#75 6481982956）。[U4A] = Owner の決定 OD-SHIRUBE-U4-PATH-CHECK-FIRST-UNIT-DESIGN-APPROVAL-NEXT-UNIT-20261029-001（iyasaka-arc#49 6481509642、本文 SHA-256 `3167a28237b09da288390c4fb7fe0cc47fde3a598c1dbeed430a4a13545c2d34`）。
この節は意味を足さず、[DR] §3.1〜§3.3・§3.7 を判定 5 の契約に写す。§1〜§10 は U4 の前（main `c05e8ed0`）の記述として変えない。§5 の「5.9 は使わない」は、この節の 5.9 が code に入るまでの実装の記述である。判定 5 の 5.1〜5.8 の意味、段階（§4 の 1、`design_binding_mode`）、§8 の blocking の前の未決 2 点 (a)(b)、判定 1〜4、固定した checker は変えない。

### 11.1 契約に足す欄（どれも任意。無ければ今までどおり読む）

| 欄 | 型と意味 | 誤りの時 |
|---|---|---|
| block の `placements` | 空でない文字列の配列。1 つずつが glob で、書き方は `scripts/hygiene/lib.mjs` の `matchesAny`（`protected_paths` と同じ）。この設計に従う PR が変えてよい path の全部（その設計の PR が触るなら、試験・項目集合の置き場も書く） | 配列でない・空の文字列を含む → 5.1 |
| block の `approval.kind` | `owner_decision`（欄が無い時もこれ。今の 5.3・5.4）か `unit_design`（作る単位の設計の記録）。`unit_design` の時の `approval` は `{ "kind": "unit_design" }` だけ | 知らない値 → 5.1。`owner_decision`（`kind` が無いのも同じ）の設計に `unit_design` の欄を混ぜる、または `design_pr` だけを書く → 5.1 |
| PR の `design_binding.design_pr` | `unit_design` の時に必須。その設計の版を統合した PR の番号（同じ repo）。門は読まず、結果の JSON に写すだけ（統合する席が読む） | `unit_design` で無い → 5.1 |

### 11.2 足す確かめ

- **5.9 置き場**: 判定 2 が確かめた変更 path（rename は旧と新の両方）を判定 5 に渡し、block に `placements` があれば、1 つずつが `matchesAny(path, placements)` に当たるかを見る。当たらない path が 1 つでもあれば FAIL（reason `5.9 paths outside the design placements: <path, ...>`。外れた path を全部、並びを固定して出す）。`placements` が無い block は FAIL にせず `5.9 NOT_CHECKED: the design names no placements`（今ある block に新しい FAIL を足さない）。5.9 は 5.1 が通った時だけ見る。
- **5.3u 作る単位の設計**: `approval.kind` が `unit_design` の時、門はその版の承認（設計監査の合格）を確かめない。5.3・5.4 の代わりに `5.3u NOT_CHECKED: the approval of a unit design is checked by the merging seat, not by the gate` の印を出し、5.9 などほかの確かめは今までどおり行う。`design_binding.result` は、FAIL の確かめが 1 つでもあれば FAIL、無ければ `NOT_CHECKED`（理由に 5.3u と、5.9 が通ったこと）。**`unit_design` の時は PASS にならない**。門は `design_pr` の PR・監査・固定の checker を呼ばない（呼ぶと、統合済みの PR を開いた PR 専用の checker に当てることになり、必ず拒まれる）。
- `report-only` の間は、5.9 の FAIL も 5.3u の `NOT_CHECKED` も verdict を変えない。`blocking` の時の `NOT_CHECKED` の扱いは今の判定 5 のまま。blocking への切り替えは Owner が repo ごとに決める。

### 11.3 統合する席の確かめと、要件との関係

- 作る単位の設計の承認は、統合する席が統合の直前に確かめる。4 つ（`design_pr` が統合済み／その本文の `sds-pr` の `audit` の返却が PASS で作者の受領がある／依頼が `design_pr` とその統合した head を名指す／その head の設計の file の SHA-256 が今の PR の `design_sha256` と同じ）と、確かめたことを merge の記録に書くこと、合わない時は merge しないことは `docs/sds/distribution.md` §4.1 の判定 5 の行に書く（ここには繰り返さない、S3）。
- 後の PR の承認の元になる設計の記録の PR（R1）は、監査の依頼を出した後に、自分の PR 本文の `sds-pr` の block に `audit` を書いてから統合する（`distribution.md` §4.1）。
- U4 は要件 FR6.1 の一部だけを作る。作る単位の設計の承認の機械の確かめは次の作業の単位に移した（[U4A]、[DR] §1.1）。aidlc-shirube の要件の記録は次の版の範囲・要件の段を開き直す時に合わせ、それまでの正本は [U4A] である。

### 11.4 試験の計画（[DR] §4）と実測

受入は [DR] §4 の T1〜T22。判定 5 の code と試験は 2a（T1〜T7、T19〜T22）と 2b（T8〜T14、T16〜T18）で入り、この節を書く PR は文書の文の照合（T15、`tests/workflow-contract.test.mjs`）だけを持つ。
実測: この節の PR は文書と T15 だけで、5.3u・5.9 の code は無い。挙動の実測は 2a・2b の後。
