# U2 u2-gate-trigger-narrowing — 安全の設計（門を流す出来事の絞り方）

この単位は、kit の門の呼び出し側 `kit/sds-gate-caller.yml` が `issue_comment` で動く条件を、門の判定が読むコメントの作成だけに絞る。ここでは、その絞りをどう組み立てるか、何を守るか、どう確かめるかを設計として書く。実装の code（caller の変更と試験）は、設計監査の PASS の後に書く。性能・拡張・信頼性（可用性）・観測・論理部品の各設計は、この種類（packaging）の単位には当てはまらないので作らない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（NFR3.1、NFR4.1〜4.6、NFR5.1〜5.3、NFR6.1、NFR8.1〜8.4）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（D1〜D5、NFR1.1、NFR7.1〜7.3、NFR9.1、NFR10.1、NFR11.1）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（S10 の 2 つは新しい契約を作らない）。
- 基準の観測（公開 Shirube の clone の `origin/main` = `0f9ea89175ece32604e0dcfde9db28462f0d2f35` の実物を `git show` で読んだ。作業場の木は使っていない）:
  - `kit/sds-gate-caller.yml`（SHA-256 `e6eaa2eb0745f63a64e11b7497bc772a0e842c93deaca34a06765a4bd7a6ff5f`）: `on:` は `pull_request_target`（types は `opened, synchronize, reopened, edited, ready_for_review, labeled, unlabeled`）と `issue_comment`（types は `created, edited, deleted`）。job `sds-gate` の `if:` は `github.event_name == 'pull_request_target' || github.event.issue.pull_request` だけ。`with.pr` は `github.event.pull_request.number || github.event.issue.number`。
  - 再利用 workflow `.github/workflows/sds-gate.yml`（SHA-256 `ac38c62e7f04ca55b8532877c66fa0dcc85452241fd011a192eef9d3f57e812c`）: group は `sds-gate-<repo>-<pr>`、`cancel-in-progress: true`。commit status `sds-gate` を投稿するのはこの workflow の最後の step だけ（`gh api repos/<repo>/statuses/<head>`）。冒頭の注記に「受領が head の変更なしに失効する場合（返却の削除、base の移動、別の issue の依頼・返却）は、caller が PR のコメント削除で再実行し、それ以外は統合する席が統合の直前に最新の `sds-gate` を再実行する」とある。
  - 門 `scripts/sds/gate.mjs`（SHA-256 `b4f529aeb40270382b44a5a2754d2651b47c1e5414a683016bd34c3a5b1f5aa1`、156 行）の判定 1（54〜58 行）は `p.labels` から `risk:R0`〜`R4` をちょうど 1 つ取り、PR 本文の `risk_class` と一致を要求する。判定 3 は PR 本文の `audit` 欄が指す依頼コメントと返却コメントを読む。判定 4・5 は設定（利用先の pin の `plan_binding_mode`・`design_binding_mode`）が `off` 以外のとき、計画のコメントと設計の承認コメントも読む。作者の受領のコメントは読まない。
  - 門が使う印（`scripts/` の実物）: 依頼 `sds-audit-request/1` と返却 `sds-audit-review/1`（`scripts/hygiene/audit-admission.mjs` 40 行・165 行、`scripts/sds/design-gate.mjs` 83・84 行）、計画のコメント `shirube-v3:control-handoff`（`scripts/sds/plan-binding.mjs` 104 行）。設計の承認コメントは印を持たない（`approval.ref` が指す任意の Owner のコメント）。
- [文献確認]（取得できた範囲）: `contains` は文字列の部分一致で、大文字小文字を区別せず、値を文字列に直す。job の `if:` が偽なら job は流れず、skip された job は check run としては成功と表示される（GHES の expressions と job 条件の文面）。**現行の github.com の event payload の文面そのもの（`changes.body.from` の key 名、`deleted` の event が本文を持つこと）は取得できていない**ので、この設計はそれらに頼らない（設計 2）。実際の GitHub での動きは、この単位では観測できない（設計 6）。
- 席の方針: [team.md の Way of Working・Testing Posture・Deployment]、aidlc-only 版 7 の KY の表（差し戻しの基準）。

## 設計

### 1. 規則を置く場所と形（D1・D2、NFR3.1・NFR8.2）

caller の `on:` は変えない（`issue_comment` の types は `created, edited, deleted` のまま。既存の試験を変えない）。絞りは job `sds-gate` の `if:` の 1 か所だけで行う。`if:` の外に規則を持たない。形は次のとおり（目安。字句は Code Generation の計画で確定し、設計監査で確かめる）。

```yaml
if: ${{ github.event_name == 'pull_request_target' || (github.event.issue.pull_request && (
  github.event.action != 'created' ||
  contains(github.event.comment.body, 'sds-audit-request/1') ||
  contains(github.event.comment.body, 'sds-audit-review/1') ||
  contains(github.event.comment.body, 'shirube-v3:control-handoff'))) }}
```

- 絞るのは**コメントの作成（`created`）だけ**。コメントの編集（`edited`）と削除（`deleted`）は、本文に印があるかを見ずに、今までどおり常に流す。理由は設計 2。
- 印は 3 つ。1 つにつき `if:` の中に 1 回だけ現れる。値の集合を 2 か所に持たない（S3）。
- 印の集合は、門の実物が使う印と食い違わないことを試験で守る（設計 5 の P1）。
- skip された job は check run としては成功に見えるので、caller の冒頭の注記に「skip された job は `sds-gate` の status を変えない。必須の検査はその commit status であって、この job の check run ではない」と 2 行足す（コメント行の追加。設計 2 の注意の手当て）。

### 2. 何で流し、何で流さないか（NFR4.2・NFR4.3・NFR5.3）

| 出来事 | 流すか | 理由 |
|---|---|---|
| `pull_request_target` のすべて（`opened, synchronize, reopened, edited, ready_for_review, labeled, unlabeled`） | 流す（変えない） | head・PR 本文・label・変更 file はすべて判定が読む。`labeled`・`unlabeled` を外さない理由は設計 3 |
| PR のコメントの作成で、本文に印（依頼・返却・計画）を含む | 流す | 依頼・返却・計画のコメントの作成は、受領と計画の結合の成立を変える |
| PR のコメントの**編集**（本文に印があるかを問わない） | 流す | 印が消える編集は、本文の新旧のどちらかを見ないと判別できない。変更前の本文の取り方（`changes.body.from`）の現行の文面を取得できていないので、頼らない。編集は作成より少なく、流しすぎは費用だけで済む |
| PR のコメントの**削除**（本文に印があるかを問わない） | 流す | 削除では本文が payload に残るかを確かめていない。既存の動き（常に再判定）を保つ |
| 印を含まない PR のコメントの**作成**（会話、作者の受領の記録など） | 流さない | 門はそれらを読まない（設計 4）。ここが絞りの効く所 |
| PR ではない issue のコメント | 流さない（変えない） | 既存の `github.event.issue.pull_request` の条件のまま |

- 迷う時は流す側に倒す（流しすぎは費用、流さなさすぎは古い PASS が残る）。KY で判定すると、後者は「失敗が成功と記録される」で重大、前者は軽。そのため、本文の新旧に頼らないと判別できない編集・削除は絞らない。**この形は、FR10.1 の「監査に関わるコメントに絞る」より弱い**（編集・削除の雑音は残る）。逸脱として SD3 に記録し、設計 7 で arc に伝える。編集・削除も絞る案は、現行の payload の文面を確かめてから、別の判断として扱う。
- 流さなかった時、caller の job は skip される（`if:` が偽）。skip された job は再利用 workflow を呼ばないので、`sds-gate` の commit status を投稿する step も動かない。**その head の既存の status は書き換えられず、成功にもならない**（status を投稿するのは再利用 workflow の最後の step だけ、という定義から。実際の動きは観測していない）。また、関係の無いコメントの作成が、実行中の門の run を取り消すこともなくなる（再利用 workflow の `cancel-in-progress` は、呼ばれた時だけ働く）。
- 注意: skip された job は、GitHub 上で check run としては「成功」と表示される（GHES の文面）。必須の検査にするのは commit status `sds-gate`（caller 冒頭の注記）であって、job の check run ではない。job の check run 名を必須の検査にしている利用先では、skip が成功に見える。この単位はそれを確かめていないので、caller の注記（設計 1）で書き、導入の決定（範囲外）に条件として渡す（設計 6）。

### 3. `labeled`・`unlabeled` は外さない（FR10.2）

`scripts/sds/gate.mjs` の判定 1 は、PR の label を実行のたびに API から読み、`risk:R0`〜`R4` がちょうど 1 つで PR 本文の `risk_class` と一致することを要求する（54〜58 行）。label の付け替えは判定の結果を変える（付け替えた後に古い PASS が残るのは、失敗が成功と記録される形）。したがって `labeled`・`unlabeled` は判定に効くので外さず、`pull_request_target` の types は変えない。

- Owner の決定の括弧書き（`labeled`・`unlabeled` を外す案）は、事実の誤りにあたる。arc に伝え、arc が Owner に伝える（FR10.2 の取り決め）。伝える内容: 判定 1 が label を読む 1 つの事実と、gate.mjs の行。
- 試験（設計 5 の P2）は、この前提が崩れたとき（門が label を読まなくなったとき）に落ちる形にする。後で見直す余地を、記録ではなく試験に持たせる。

### 4. 流れなくなる判定の列挙（NFR4.6）

絞る前は流れ、絞った後は流れなくなるものは、**印を含まない PR のコメントの作成**だけである。門が読むものは `scripts/sds/gate.mjs` と、その呼ぶ `audit-admission.mjs`・`design-gate.mjs`・`plan-binding.mjs` の実物から読んだ。

| 流れなくなる出来事 | 門が読むか | 判断 |
|---|---|---|
| 印を含まないコメントの作成（会話） | 読まない | 流さなくてよい |
| 作者の受領のコメントの作成（`sds-audit-*` の印を持たない） | 読まない（受領は依頼と返却から固定の checker が計算する値） | 流さなくてよい。FR10.1 の「作者の受領」を絞りの対象に含められない食い違いは、設計 7 で扱う |
| 設計の承認コメントの作成（`approval.ref` が指す任意のコメント。印なし） | 利用先が `design_binding_mode` を `off` 以外にしているときだけ読む | 流さなくてよい。PR 本文がそのコメントの URL を指すには、先にそのコメントがなければならず、PR 本文の編集は流れる。承認コメントの**編集・削除**は設計 2 で常に流れる |
| PR の review（承認など） | 設計の承認で読む | `pull_request_review` はもともと起動に入っていない。変えない |

読んでいないものを「判定に効かない」と書かない。上で「読まない」としたのは、`gate.mjs` と呼び先の実物で `issue_comment` 由来の本文を読む箇所が見つからなかったことによる（確認は `origin/main` の bytes に対する検索。Code Generation の計画で再度突き合わせる）。利用先ごとの設定で読むものは、この単位では確かめていないと書く。

### 5. 確かめ方（D5、NFR4.5・NFR7.1・NFR8.3）

試験は既存の `tests/sds-gate.test.mjs` の読み方（caller を文字列として読む）に合わせ、`node:test` と `assert` で書く。先に、変更前の caller で失敗する試験を書いて失敗を確かめ（TDD）、次にそれを通す変更を書く。

| ID | 種類 | 確かめること | 見るもの |
|---|---|---|---|
| P1 | 正例・食い違い | caller の `if:` の印の集合が、`audit-admission.mjs` が検査する `sds-audit-request/1`・`sds-audit-review/1` と、`plan-binding.mjs` の `shirube-v3:control-handoff` と、過不足なく一致する | caller と、`scripts/` の該当 file の文字列 |
| P2 | 前提 | 門が label を読んでいる間（`gate.mjs` の判定 1 が `p.labels` から `risk:` を取っている間）、caller の `pull_request_target` の types に `labeled`・`unlabeled` が残っている | caller と `gate.mjs` の文字列 |
| N1 | 負例 | `on.issue_comment.types` が `created, edited, deleted` のまま（既存の試験が引き続き通る）。`on:` の起動の種類が増えていない | caller の文字列 |
| N2 | 負例 | 印を含まないコメントの作成は偽になる形である: 式の `contains` の対象が `github.event.comment.body` で、印 3 つのどれでもない文字列に当たらない。小さな評価器（`contains` = 大文字小文字を区別しない部分一致、`!=`、`&&`、`\|\|`）で `if:` を読み、印あり・なしの作成、編集、削除、`pull_request_target`、PR でない issue の各 event に当てる | `if:` を取り出した文字列と、式を評価する小さな関数 |
| N3 | 負例 | 編集・削除は常に流れる: `edited`・`deleted` の event では、本文が印を含まなくても式が真になる | 同上 |
| N4 | 負例 | 印を含む作成は流れる（3 つの印のそれぞれ）。大文字小文字の違いでも流れる | 同上 |
| N5 | 負例 | 足した行に `continue-on-error`、`\|\| true`、`--if-present` が無く、`run:`・`with:` に本文（`github.event.comment`）が渡らない | 足した行 |
| N6 | 負例 | 権限（6 つ）、`uses: …@<SHIRUBE_COMMIT>` の形、`with.pr`、`pull_request_target` の使用が変わっていない | caller の文字列 |
| N7 | 負例 | 読めない・解釈できない caller や `if:` は失敗になる（成功に読み替えない）。評価器が解釈できない式は例外にし、真・偽に読み替えない | caller の文字列と評価器 |
| 逆向き | 逆向き | 足した `if:` の節を取り除くと、読み手が「絞りなし」と判定し、取り除いた結果が元の caller から追加分だけを削ったものと一致する | 取り除いた文字列 |
| 同居 | 同居 | 取り除いた結果の構造（`on:`、権限、`uses:`、`with:`）が、変更後の同じ部分と一致する。構造の知識を試験の中に書き写さず、前と後を比べる（S3） | 変更後と取り除いた後の文字列の差分 |

- 評価器は**式の写し**であって、GitHub の評価そのものではない。式の意味（`contains` の大文字小文字、null の扱い）を GitHub が試験の想定どおりに評価するかは、文字列の試験では証明できない。足りない分は、設計監査と、利用先での観測（設計 6）で補う。評価器の対象の言語は、`if:` に出てくる部分だけ（上の形）に限り、足りない構文は例外にする（N7）。
- 評価器は試験 file の中に置く。`scripts/` の本体 code にはしない（足すのは試験と YAML だけ。NFR7.2）。
- 公開に載る試験データは架空だけ。fixture に実在の識別子、12 文字の英数字の `token:` の形を使わない。
- 試験の結果は、実行した数・合格数・失敗数の観測として Build and Test の記録に残す（NFR7.3）。申告値を写さない。

### 6. 観測できないこと（NFR4.4・NFR10.1・S5）

kit の caller は Shirube 自身の workflow ではなく、利用先に写されるひな形である。Shirube 自身の門は `.github/workflows/sds-gate-self.yml`（pin された commit を呼ぶ別 file）で、この単位は変えない。このため、**この PR 自身の Actions の実行では、新しい `if:` の評価（どのコメントで流れ、どのコメントで流れないか）を観測できない**。

- この単位で観測できるのは、caller の文字列に対する試験の結果、base の実物との SHA-256 の突き合わせ、逆向き（追加分を取り除くと元に戻ること）だけ。
- 式の評価と、skip された job が既存の status を書き換えないことの実測は、kit が利用先へ導入されて（別の決定）から、利用先での実行の記録として観測する。それまでは「観測できなかった」と書き、成功とは書かない。
- 実行回数が減るという主張は、利用先での Actions の一覧から数えるまで書かない。数え方（どの一覧のどの欄で、`sds-gate` の run を PR ごとに数えるか）は、実装の段の記録に書く。測定そのものはこの単位の範囲外。
- 導入の決定（範囲外）に渡す条件: 利用先の必須の検査が commit status `sds-gate` であること、導入後に最初の PR で `if:` の動きを 1 回観測すること。

### 7. 要件の文言と実装の事実の食い違い（arc に伝える）

- FR10.1 は「監査に関わるコメント（`sds-audit-request/1`、`sds-audit-review/1`、作者の受領）に絞る」と書く。作者の受領のコメントは印を持たず、門はそれを読まない。受領を絞りの条件に入れても、入れなくても判定は変わらず、入れる手段が無い。受領は「流れない側」に置く（設計 4）。
- 絞るのはコメントの**作成**だけで、編集・削除は今までどおり流す。FR10.1 より弱い。変更前の本文の取り方が現行の文面で確かめられていないため（設計 2）。編集・削除も絞る案は、別の判断として扱い、必要なら arc 経由で Owner に伺う。
- 門は計画のコメント（印 `shirube-v3:control-handoff`）も読む。FR10.1 の列挙に無いが、利用先が計画の結合を blocking にしたとき、このコメントの作成は判定を変える。流れなくすると古い PASS が残るので、印に加える（NFR4.2。FR10.1 からの逸脱として SD2 に記録する）。
- `labeled`・`unlabeled` を外す案は、判定 1 が label を読むので採れない（設計 3）。
- 機能の設計の段は、この単位では省かれている（packaging）ため、この設計の記録で arc に伝える。arc が Owner に伝える。

### 8. 変更を戻す方法（S6、NFR8.3）

追加した `if:` の節と注記を取り除くだけで、変更前の caller に戻る。追加の変更で、既存の行の削除・改名を含まない（`labeled`・`unlabeled` も残す）。新旧の同居の期間の宣言は要らない。実装の段で、取り除いた結果の SHA-256 が base の `e6eaa2eb…` と一致することを 1 回観測して記録する（恒久の試験にはしない）。利用先の caller は、kit の版上げ（別の決定）までは古いまま動く。古い caller と新しい再利用 workflow、新しい caller と古い再利用 workflow のどちらも、入力 `pr` と出力 status が変わらないので動く（NFR8.1）。

### 9. 「現在の file」の記述を base の実物と突き合わせる（F01 の再発防止）

設計・計画・監査の項目が「現在の caller・再利用 workflow・gate.mjs」について書く事実（SHA-256、`on:` の types、`if:` の形、権限、group の形、判定 1 が label を読む行）は、書いたあとに `origin/main` の bytes（`git show`）と機械で突き合わせる。1 件でも DOES_NOT_HOLD なら監査を依頼しない。突き合わせの結果は、Code Generation の計画の段で観測として記録する（この段では未実施）。作業場の木や共有の CodeKB は基準に使わない。

## 守る物の条件

- この変更は workflow の定義（kit の呼び出し側）で、保護対象として扱う。段の承認は実行の許可ではない。team.md のとおり、機能・非機能・置き場の設計を終えたら設計記録だけの PR を先に出し、独立の設計監査（devauditor）を 1 回出す。code は設計監査の PASS の後に書く。統合の前に、対象 head への Owner の承認（R3）が要る。
- 利用先への導入（kit の版上げ）はこの単位の範囲外。

## 設計の判断（採った判断と採らなかった代替）

| ID | 採った判断 | 採らなかった代替 | 規格の項目 |
|---|---|---|---|
| SD1 | 絞りは job の `if:` の 1 か所。`on:` の types は変えない | `on:` の側で絞る（できない）、本文を読む別の job を足す（権限と費用が増える） | S3、NFR3.1、NFR8.2 |
| SD2 | 印は 3 つ（依頼・返却・計画）。計画の印を FR10.1 に足す | 依頼・返却の 2 つだけ（利用先が計画の結合を blocking にしたとき、計画のコメントの作成で古い PASS が残る） | S5、NFR4.2。FR10.1 からの逸脱 |
| SD3 | 絞るのは作成だけ。編集・削除は本文を見ずに常に流す | 編集・削除も本文と変更前の本文で絞る（現行の payload の文面を確かめていない key 名・本文の有無に頼り、外れると受領の失効や承認コメントの編集が流れず、古い PASS が残る。KY: 失敗が成功と記録される＝重大） | S5、S8、NFR4.2。FR10.1 からの逸脱 |
| SD4 | `labeled`・`unlabeled` を残す。Owner の決定の括弧書きは実物（`gate.mjs` 54〜58 行）と合わないので、起動を残す側を採った（arc の答え。起動を減らさない側なので Owner には回さない） | 外す（label の付け替えで判定が変わる穴が出て、古い PASS が残る） | S5、FR10.2。決定の括弧書きからの逸脱 |
| SD10 | 範囲を `docs/sds/distribution.md` の 1 file 広げ、`issue_comment` の説明（107 行目）を caller の変更に合わせて直す（arc の答え） | 広げず、食い違いを記録だけに残す（設計と実装が黙って食い違う。`authority-and-waiting.md` R3） | R3。unit の境界からの逸脱 |
| SD5 | 本文は `if:` の式の中の `contains()` の引数だけに使い、`run:`・`with:` に渡さない | 環境変数に入れて shell で判定する（式の注入の面が増える） | S9、NFR5.2 |
| SD6 | 文字列として読む定義の試験と、`if:` だけを読む小さな評価器（試験 file の中）。印の集合は門の実物との突き合わせで守る | YAML を解釈する依存を足す、印を caller に直書きして突き合わせない（食い違いが静かに積もる） | S3、NFR3.1、NFR6.1 |
| SD7 | この PR の実行では観測できないことを、観測できなかったと書く | 文字列の試験が通ったことを「流れる・流れない」の実測として書く | S5、NFR4.4 |
| SD8 | 追加だけの変更。取り除けば元に戻る | 既存の `issue_comment` の types を変える（既存の試験と食い違う） | S6、NFR8.2・8.3 |
| SD9 | skip の意味を caller の注記に 2 行書く | 注記なし（job の check run を必須にした利用先で skip が成功に見えるのに、誰も気づけない） | S5、NFR4.4 |

## KY の表での自分の残りの先読み（監査の依頼の前の点検 5 の下書き）

aidlc-only 版 7 の表に照らして、この設計の残りを先に判定した。

| 残り | 対象外か | 起きやすさ | 困る大きさ | 差し戻す組み合わせか |
|---|---|---|---|---|
| 印を持たない設計の承認コメントの作成が、PR 本文の URL より後に必要になる | 対象外（URL を指すには先にコメントがなければならず、PR 本文の編集は流れる） | — | — | 該当しない |
| 編集・削除の本文に頼らない（payload の key 名の誤りが残らない） | 対象外ではない | — | — | 頼らないので該当しない（SD3） |
| skip された job が check run では成功に見え、job の check run を必須にしている利用先で門が効かない | 対象外ではない | 低（kit の注記は commit status を必須にする） | 重大 | 差し戻す組み合わせ（重大×低）。手当て: caller の注記に書く（SD9）、導入の決定に条件として渡す（設計 6）。この単位では利用先を変えられず、確かめていない。監査で割れたら高い方を採る |
| 絞りで関係の無い作成が流れなくなる結果、門の run の取り消しが減り、古い PASS が後から着地する可能性 | 対象外ではない | 極低（取り消しが減るのは、関係の無い作成が流れなくなる側。判定を変える出来事は今までどおり流れ、最新の run が最後に着地する） | 軽 | 差し戻さない |
| 評価器が GitHub の評価とずれる | 対象外ではない | 低 | 重大（絞りが外れて印のある作成が流れない場合） | 差し戻す組み合わせ（重大×低）。手当て: 評価器は式の写しと明記し、評価の実測は利用先での観測に持ち越す（設計 6）。印の集合の突き合わせ（P1）と、編集・削除を常に流す形（SD3）で under-run の幅を狭めた。残りは監査で確かめる |

差し戻す組み合わせになる 2 件は、**上の手当てを設計に書いて受けた**。それでも残る部分（利用先の設定、GitHub の評価の実測）は、この単位では確かめられず、導入の決定（範囲外）への条件として渡す。

## Assumptions & Open Questions

### Assumptions

- [assumption] `github.event.action` は `issue_comment` で `created`・`edited`・`deleted` のいずれかで、`created` の event の `comment.body` は読める。`created` 以外（key が無い場合を含む）は流す側に倒れる式なので、この前提が崩れても under-run にならない。
- [assumption] 利用先の必須の検査は commit status `sds-gate` である（caller の冒頭の注記）。

### Open Questions

1. （解決済み）試験は新しい file `tests/sds-gate-caller-trigger.test.mjs` に分ける。`tests/sds-gate.test.mjs` が 300 行ちょうどのため（Code Generation の計画）。
2. （解決済み）`docs/sds/distribution.md` の 107 行目を直すため、境界を 1 file 広げる（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない。SD10）。
3. （解決済み）設計 7 の点を arc に伝えた。arc の答え: label を残す判断で良い、作成だけを絞る・計画の印を足す・受領を対象にできない扱いも了解、skip の件は「観測できなかった」と書く。
4. 編集・削除も絞る案を、現行の payload の文面を確かめたうえで別の判断として扱うか（この単位では扱わない。必要なら別の判断として arc 経由で伺う）。
