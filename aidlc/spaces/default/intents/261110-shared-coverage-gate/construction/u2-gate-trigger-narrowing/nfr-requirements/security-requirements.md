# U2 u2-gate-trigger-narrowing — 安全・失敗・新旧同居の要件

この単位は、kit の門の呼び出し側 `kit/sds-gate-caller.yml` の起動を、門の判定に関わる出来事だけに絞る小さな workflow の変更（packaging）。ここでは、その変更が守る安全・失敗の扱い・新旧の同居の要件を、元の NFR の番号に枝番を付けて書く。性能・拡張・信頼性（可用性）・観測の各要件は、この種類（packaging）の単位には当てはまらないので作らない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 単位の内容: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md) の U2（FR10.1、FR10.2、FR10.4。`kit/sds-gate-caller.yml` と、それを検査する試験だけ。kit の版上げと利用先への導入は範囲外）。
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR3・NFR4・NFR5・NFR6・NFR7・NFR8、FR10.1・FR10.2・FR10.4・FR10.5。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（S10 の 2 つは新しい契約を作らない）。
- 基準の観測（公開 Shirube の `main` の実物。clone の `origin/main` = `0f9ea89175ece32604e0dcfde9db28462f0d2f35`、U1 の統合後）を、`git show` で取り出した bytes から読んだ。作業場の木は使っていない（古いことがある。nfr-requirements の学び）。
  - `kit/sds-gate-caller.yml`（SHA-256 `e6eaa2eb0745f63a64e11b7497bc772a0e842c93deaca34a06765a4bd7a6ff5f`）: 起動は `pull_request_target`（types は `opened, synchronize, reopened, edited, ready_for_review, labeled, unlabeled`）と `issue_comment`（types は `created, edited, deleted`）。`issue_comment` には本文の条件が無く、PR の全コメントで動く。権限は `contents: read`・`pull-requests: read`・`issues: read`・`actions: read`・`checks: read`・`statuses: write`。job `sds-gate` の `if:` は「`pull_request_target` であるか、コメントが PR のものであるか」だけ。再利用 workflow `watchout/shirube/.github/workflows/sds-gate.yml@<SHIRUBE_COMMIT>` を `pr` だけ渡して呼ぶ。
  - 再利用 workflow `.github/workflows/sds-gate.yml`（SHA-256 `ac38c62e7f04ca55b8532877c66fa0dcc85452241fd011a192eef9d3f57e812c`）: PR ごとに 1 つの group（`sds-gate-<repo>-<pr>`）で `cancel-in-progress: true`。新しい出来事が古い判定の実行を取り消す。この単位は呼び出し側だけを変え、これは変えない。
  - 門 `scripts/sds/gate.mjs`（SHA-256 `b4f529aeb40270382b44a5a2754d2651b47c1e5414a683016bd34c3a5b1f5aa1`、156 行）が読むもの: PR（head・base・本文・label）、PR の変更 file、PR 本文の `audit` 欄が指す依頼コメントと返却コメント（その本文 SHA-256 も）、設定による判定 4・5 では計画のコメントと設計の承認コメント・PR の review。作者の受領コメントは読まない（受領は依頼と返却から固定の checker が計算する値）。
  - 既存の試験が caller を文字列として読んでいる所: `tests/sds-gate.test.mjs` の「the caller re-runs when a PR comment is deleted」（`issue_comment` の types が `created, edited, deleted` であること）。`tests/workflow-contract.test.mjs` の BR7.1 は Shirube 自身の `sds-gate-self.yml` を見るもので、kit の caller ではない。
  - Shirube 自身の pin（`.shirube/sds-pin.json`）は `plan_binding_mode`・`design_binding_mode` とも `report-only`。利用先の mode は利用先ごとに違いうる（この単位の範囲では確かめられない）。
- [文献確認]（取得できた範囲）job の `if:` では `github.event.comment.body` を式の中で `contains()` に渡せる（部分一致、大文字小文字を区別しない）。`issue_comment` の `edited` の event には `changes` が付く（GitHub の 2016 年の更新情報）。現行の github.com の event payload の文面（`changes.body.from` の key 名、`deleted` の event が本文を持つこと）は取得できていない。このため、設計は編集・削除の本文に頼らない形にする（NFR4.3 の「常に流す」）。この単位の PR 自身の Actions の実行では、kit の caller（利用先に写されるひな形）の `if:` を観測できない（nfr-design の設計 6）。
- 席の方針: [team.md の Way of Working・Testing Posture・Deployment]（保護対象の変更の進め方、`|| true` などを置かない、版の識別と配布結果を追跡する）。

## 要件

各行の [ ] は出どころ。

### NFR3 規則は 1 か所

- **NFR3.1** caller が起動の判断に使う監査の印（`sds-audit-request/1`、`sds-audit-review/1`）は、監査の入口が定義する schema 名と食い違わない。値の集合を caller と別の所に 2 か所持たない形にし、食い違えば試験が失敗する（caller の印の集合を、`scripts/hygiene/audit-admission.mjs` が検査する schema 名と突き合わせる）。[NFR3、S3]

### NFR4 失敗を隠さない

- **NFR4.1** 足す行に `continue-on-error`、`|| true`、必須 step の `--if-present` を使わない。呼び出す再利用 workflow の `uses:` の形（`@<SHIRUBE_COMMIT>` の置換点）を変えない。[NFR4、S8]
- **NFR4.2** 絞った結果、門の判定が変わりうる出来事で門が流れないことがない。判定が読むもの（head・PR 本文・label・変更 file・依頼コメント・返却コメント）を変える出来事は、すべて今までどおり門を流す。流さなくてよいのは、判定が読まないものだけを変える出来事（PR の関係の無い会話、作者の受領コメントなど）に限る。迷う時は流す側に倒す（流しすぎは費用、流さなさすぎは古い PASS が残る）。[NFR4、FR10.1]
- **NFR4.3** コメントの編集と削除は、本文に印があるかを見ずに、今までどおり常に門を流す（絞るのは作成だけ）。印が消える編集（変更前の本文に印があり新しい本文に無い）や削除で受領が失効するのを、古い PASS として残さない。本文の新旧に頼らないのは、現行の payload の文面を確かめていないため（上の文献確認）。FR10.1 より弱い絞りになるので、逸脱として記録する。[NFR4、FR10.1、既存の試験の「deleted で再判定」]
- **NFR4.4** 流さなかった（skip された）job は成功ではなく「流れていない」。caller の job が skip されても、その head の既存の `sds-gate` の状態を成功に書き換えない・上書きしない。絞りで流れなかった出来事の後でも、統合する席の統合の直前の再実行は今までどおり必要で、この変更はそれを置き換えない（再利用 workflow の注記と同じ扱い）。[NFR4、S5]
- **NFR4.5** 負例（関係の無いコメントの作成で門が流れない、印を含むコメントの作成で流れる、編集・削除は常に流れる、`labeled`・`unlabeled` の扱いが FR10.2 の確認結果のとおり）は、workflow の定義の試験で確かめる。確かめられない（caller が読めない・解釈できない）時は失敗にする。[NFR4、FR10.1、FR10.2]
- **NFR4.6** 絞る前に流れていた判定のうち、流れなくなるものを列挙して記録する（何が流れなくなるかを、設計の記録に表で残す）。読んでいないものを「判定に効かない」と書かない。門が読むものの確認は gate.mjs の実物から行い、設定で変わるもの（利用先の判定 4・5 の mode が blocking のときの計画・設計承認のコメント）は「この単位では確かめていない」と書く。[NFR4、S5]

### NFR5 最小の権限

- **NFR5.1** caller の権限（6 つ）と、`pull_request_target` で定義を既定 branch から読むこと、PR の code を checkout しないこと、secret を足さないことを変えない。起動の種類を新しく足さない。[NFR5、S9]
- **NFR5.2** コメント本文（外から来る入力）は、`if:` の式の中の比較だけに使い、`run:` の shell や `with:` の値に渡さない。式の中でも、本文を実行・展開しない（`contains()` の引数と、本文が空かどうかの真偽の判定 `!` の対象としてだけ。設計 SD11）。[NFR5、脅威 T1]
- **NFR5.3** 絞りが、判定の入口を弱めない。コメントの投稿者や権限で絞る条件を新しく足して、監査の依頼・返却を門から外さない。逆に、印を偽った comment を流れさせること自体は害がない（流れて判定を読むだけで、判定は固定の checker が行う）。[NFR5、脅威 T2]

### NFR6 依存

- **NFR6.1** 新しい action、npm の依存、外部の資源を足さない。足すのは caller の起動の条件と、それを検査する試験だけ。試験は Node 組込みの `node:test` と `assert`、既存の試験と同じ文字列・正規表現の読み方で書き、YAML の読み取り用の依存を足さない。[NFR6]

### NFR7 試験の方法

- **NFR7.1** TDD で、まず失敗する試験を書いて失敗を確かめてから caller を直す。試験は正例（絞った後も流れる出来事）と負例（流れない出来事）の両方を持つ。[NFR7、team.md]
- **NFR7.2** 行の網羅率 100% の床の対象は、この単位で足す・触る JavaScript の file。この単位が足すのは試験 file と YAML の変更で、`scripts/**` の本体 code を変えない見込みである。対象 file が 0 件のとき、網羅率の表は空のまま 100% と出て通るので、これを合格の根拠にしない。確認コマンドが保証するのは、既存の試験が通ることだけであり、この単位の変更の証拠は PR の試験の実行（Red と Green）の観測で別に残す。[NFR7、nfr-requirements の学び、delivery-planning の学び]

### NFR8 新旧の同居

- **NFR8.1** 既存の利用先は変わらない。利用先の `.github/workflows/sds-gate.yml` は、kit の版上げ（別の決定）までは古い caller のまま動く。この単位が変えるのは Shirube の `main` の `kit/sds-gate-caller.yml` だけで、再利用 workflow（`sds-gate.yml`）の入力（`pr`）と出力（commit status `sds-gate`）を変えない。新しい caller と古い再利用 workflow、古い caller と新しい再利用 workflow のどちらの組み合わせでも動く。[NFR8、FR10.4]
- **NFR8.2** 既存の試験（`tests/sds-gate.test.mjs` の「deleted で再判定」を含む）の中身を変えない・減らさない。`issue_comment` の types（`created, edited, deleted`）は変えずに残し、絞りは job の `if:` で行う。[NFR8、FR10.4]
- **NFR8.3** 逆向きがある。足した条件を取り除くと変更前の caller（base の実物、SHA-256 `e6eaa2eb…`）に戻り、その状態でも変更前の試験が通る。取り除いた結果が元の caller から追加分だけを削ったものと一致する試験と、実装の段で base の SHA-256 と突き合わせる観測で確かめる（S6）。[NFR8]
- **NFR8.4** 追加（条件の追加）が中心で、既存の行の削除・改名は、FR10.2 の確認結果で `labeled`・`unlabeled` を外す場合の types の行だけに限る。外す場合は、外す前の利用先の caller でも新しい再利用 workflow が動くことを同居として記録する。[NFR8、S6]

### NFR9 構造の予算

- **NFR9.1** 新しい試験 file は 300 行以内。ESLint の関数 50 行・複雑さ 10 を保つ。[NFR9]

### NFR10 評価の指標

- **NFR10.1** この変更の効果は、自社で観測できる数で測る: 同じ種類の PR について、絞る前と後で、`sds-gate` の実行の回数が Actions の一覧から数えられること。口コミ・外部の数は使わない。測定そのものはこの単位の範囲外で、数え方（どの一覧のどの欄か）を設計の記録に書く。[NFR10]

### NFR11 費用

- **NFR11.1** 新しい有料サービスや常設の資源を足さない。流れる回数が減る方向の変更で、費用は増えない。[NFR11]

## 脅威の見方（この変更に関わるものだけ）

| ID | 脅威 | 受ける要件 |
|---|---|---|
| T1 | コメント本文（外から来る入力）が shell や出力に渡り、式の注入になる | NFR5.2 |
| T2 | 絞りの条件が弱く（または強く）、監査の依頼・返却が門を流さない／関係の無いコメントが流す | NFR4.2、NFR4.3、NFR5.3 |
| T3 | 印が消える編集・削除で受領が失効したのに、古い PASS の status が残る | NFR4.3、NFR4.4 |
| T4 | 絞りの結果、流れなかった job が成功として数えられる | NFR4.4 |
| T5 | caller の印の集合と、監査の入口の schema 名が別々に変わり、食い違う | NFR3.1 |
| T6 | 絞りに伴って権限や起動の種類が広がる | NFR5.1、NFR6.1 |

## 守る物の条件（機能要件 FR10.5 から。NFR の行ではない）

- この変更は workflow の定義（kit の呼び出し側）で、保護対象として扱う。段の承認は実行の許可ではない。
- 進め方は team.md のとおり。機能・非機能・置き場の設計を終えたら設計記録だけの PR を先に出し、独立の設計監査（devauditor）を 1 回出す。code（caller の変更）は設計監査の PASS の後に書く。統合の前に、対象 head への Owner の承認（R3）が要る。
- kit の版上げと利用先への導入（`kit.mjs upgrade`、利用先の pin の更新）は別の決定で、この単位の範囲外。この単位が Shirube の `main` に入っても、利用先の caller は変わらない。

## 気づいたこと（この単位の範囲の外、または次の段で扱う。この段では変更しない）

- 作者の受領のコメントには schema 名などの印が無く、門はそれを読まない。FR10.1 の文言（監査に関わるコメント（…作者の受領））のうち、受領については絞りの対象にできず、また絞って流さなくても判定は変わらない。要件の文言と実装の事実の食い違いなので、次の段の設計で扱いを決め、arc に伝える（Open Questions の 3）。
- 門は、利用先の mode によっては計画のコメント（`shirube-v3:control-handoff` の印）と設計の承認コメントも読む。これらは `sds-audit-*` の印を持たないため、印だけで絞ると流れなくなる。Shirube 自身は両方 `report-only` だが、利用先は別でありうる（NFR4.6）。
- 門は PR の review も読む（設計の承認で）が、`pull_request_review` は今も起動に入っていない。これは今の状態で、この単位は変えない。

## Assumptions & Open Questions

### Assumptions

- [assumption] `issue_comment` の job の `if:` で、作成の event の本文の印を式の中で見られる。具体の書き方は nfr-design で決めた（作成だけを本文で絞る）。この PR 自身の実行では観測できず、利用先での観測に持ち越す。
- [assumption] caller の job が skip されたとき、その head の既存の `sds-gate` の commit status は変わらない（上書きされない）。status を投稿するのは再利用 workflow の最後の step だけ、という定義から導く。実測は利用先での観測に持ち越し、確かめるまで「観測できなかった」と書く。
- [assumption] FR10.2 のラベルの確認（risk ラベルが判定に効くか）は、`scripts/sds/gate.mjs` の 54〜58 行目（ちょうど 1 つの `risk:R0`〜`R4` と PR 本文の `risk_class` の一致）から「効く」見込みが高い。この段では結論にせず、機能の設計で全文を読んで負例の試験で確かめる。

### Open Questions

1. `if:` での本文の参照と、skip された job が既存の status を変えないことは、この PR 自身の実行では観測できない（kit の caller は利用先に写されるひな形）。利用先への導入の後に、利用先での実行の記録で観測する。観測できなければ「観測できなかった」と書く。`edited` の `changes.body.from` と `deleted` の本文には頼らない設計にした。
2. `labeled`・`unlabeled` を外すか（FR10.2）。nfr-design の設計 3 で決めた: 門の判定 1 が label を読むので残す。Owner の決定の括弧書きは事実の誤りとして arc に伝える（単位の記録の方針どおり）。
3. 作者の受領のコメントは、印が無く門も読まないため、絞りの条件に入れられない（上の「気づいたこと」）。要件の文言の扱い（受領は絞りの対象から外れるだけで、流れない）を、機能の設計で確かめて arc に伝える。
