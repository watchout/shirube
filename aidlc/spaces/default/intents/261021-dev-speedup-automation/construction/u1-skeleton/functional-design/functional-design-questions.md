# Functional Design（U1 u1-skeleton）— 質問

U1 は、端から端まで通る細い版です（`inception/units-generation/unit-of-work.md`）。次の流れを、最小の形で 1 本通します。
1. PR の block の AI-DLC の記録の欄
2. 記録の橋（承認の記録 1 種類、記録だけ）
3. 承認の記録の作り手の最小の形
4. 門の status と log
5. 計測

U1 が受け持つ物語は次の 3 つです（`unit-of-work-story-map.md`）。
- US1.2: 計測が 1 行の JSON を出すところまで
- US2.1: block の記録の欄と、門が結果を出すところ
- US2.2: 承認の記録 1 種類の読取り

受け渡しの形は `inception/contract-design/contract-summary.md` の C1〜C4 です。

ここで決めるのは、振る舞いの決まり（何をどう判定するか）です。コードの書き方は Code Generation で決めます。

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [設計] どの段の承認を確かめるか

PR の block の `aidlc_record`（intent・段・Unit）が指す段について、門がどの承認の記録を求めるかを決めます。

A. PR が指す段の、直前の段の承認（例: Code Generation の PR なら、その Unit の直前の設計の段の承認）
B. その Unit で実行した設計の段（Functional Design から Infrastructure Design のうち、実行した物）の承認を全部
C. PR が指す段そのものの承認
X. Other (please specify)

[Answer]: A（arc の設計。要件 FR2.1「門は、指された段の前の段の出力が承認済みであることを、記録の形で確かめる」のとおり。完成形の「次の段階は前の段階の出力への参照が無いと始まらない」= iyasaka-arc#49 6305503572 も、1 つ前の段への参照で鎖をつなぐ形）

## Q2. [設計] 門が承認の記録を読む場所

承認の記録は、repo の `approvals/<intent>/<段>/<unit>.json` に置きます（受け渡しの形 C2）。PR の head（変更後）の記録も読むと、PR の中で自分の承認の記録を足して通せてしまいます。

A. PR の base（統合先の main）にある記録だけを読む。承認の記録は、実装の PR より前に、記録を入れる PR で main に入れる
B. PR の head にある記録も読む
X. Other (please specify)

[Answer]: A（arc の設計。安全のため。PR の head を読むと、その PR の中で自分の承認の記録を足して通せてしまい、門が意味を持たない。承認の記録は、記録を入れる PR（Owner の作業場の file と bytes が同じかを監査する = #49 6329978835 の 3）で先に main に入れ、実装の PR は main にある記録だけで判定する。作者が自分の作業を承認しない決まりにも合う）

## Q3. [設計] 段を開き直した時の承認

AI-DLC では、承認した段を開き直すと試行の番号が増えます。古い試行の承認の記録だけが残っている時の扱いを決めます。

A. 一番新しい試行の承認の記録があれば承認済み。古い試行の承認しか無ければ FAIL（足りない記録として、新しい試行の番号を出す）
B. どの試行でも、承認の記録が 1 つあれば承認済み
X. Other (please specify)

[Answer]: A（arc の設計。段を開き直したのは、前の承認の中身が変わったということなので、古い試行の承認で通すと、承認していない中身を通すことになる。足りない記録として新しい試行の番号を出せば、作者が何を足せばよいか分かる = 失敗を隠さない S8）

## Q4. [設計] U1 での承認の記録の作り手

A. U1 で、作り手の CLI の最小の形を作る（AI-DLC の audit の 1 つの段の承認から、1 つの file を作る）。全部の形と FAIL の扱いは U3 で仕上げる
B. U1 では、承認の記録を手で 1 つ置いて確かめ、作り手の CLI は U3 で作る
X. Other (please specify)

[Answer]: A（arc の設計。承認の記録を人の手で写すと写し間違いが入るので、作り手は CLI にすると決めた = ADR-005。細い版は、部品が実際につながることを確かめる物なので、作り手も最小の形で入れる。全部の形と FAIL の扱いは U3 で仕上げる）

## Q5. [設計] U1 での計測の最小の形

A. 指定した repo と期間の、統合された PR ごとに、門の status の state と log の 1 行の JSON の verdict を読み、PASS・FAIL・観測できずの件数を出す（`sds-metrics/1` の最小の欄だけ）
B. 指定した 1 本の PR だけを読んで、結果を出す
X. Other (please specify)

[Answer]: A（arc の設計。U1 が受け持つ US1.2 は「計測が 1 行の JSON を出すところまで」。期間の中の PR を数える形にしておけば、U2 はその上に指標を足すだけで済み、門で止め始める前に今の値を測る（実現性の条件 C3）にも、そのままつながる。B の 1 本だけでは「数える」部分が細い版に入らない）

## Q6. [設計] 細い版の確かめに使う実際の PR

U1 の済みの条件は、shirube の実際の PR 1 本で、門の log と計測の出力がつながることです（`inception/delivery-planning/bolt-plan.md` の B1）。門の呼出しの workflow が main に入った後でないと、門は動きません。

A. 門の呼出しの PR（保護面、Owner の exact-head）が main に入った後の、U1 の残りの実装の PR を、その確かめに使う
B. 確かめのための小さな PR を、別に 1 本出す
X. Other (please specify)

[Answer]: A（arc の設計。確かめのためだけの PR を足すと、統合の数と監査の手間が増え、計測の対象にも作業ではない PR が混じる。門の呼出しの PR（U1 の保護面の exact-head = 作る順番の段の Q8）が main に入った後の、U1 の残りの実装の PR で確かめれば足りる）

## Q7. [設計] 監査の指摘 BF-01: U1 の変えてよい置き場を、保護面の同梱の範囲に揃える

監査（shirube PR #65 の sds-audit-review、BF-01）の指摘です。U1 の置き場の block（`functional-spec.md` の `sds-design-locations`）が、10/23 の決定と合っていません。
- 決定 iyasaka-arc#49 6354019047 の 4: 保護面の 1 本の PR に、次の 3 つをまとめる。順番は、保護面の 1 本 → 記録の PR → 実装の PR。
  - AI-DLC の自己適用の file（`docs/design/aidlc-include.md` §6 の 3: `.aidlc-version`・`aidlc.settings.json`・`.claude/settings.json`・`.gitignore`・`.shirube/hygiene-profile.md`・`tests/self-aidlc-settings.test.mjs`）
  - 大きさの数えの除外（`.shirube/hygiene-profile.md` の `exclude_generated`）
  - U1 の保護面
- 決定 6354411741 の 2: `.gitignore` に、audit の記録の置き場の除外を足し、保護面の PR に同梱する。

A. 保護面の 1 本に同梱する file を、すべて U1 の置き場に足す（上の自己適用の 6 file と、`.gitignore` の audit の除外）。PR の順と同梱の範囲は、Infrastructure Design の記録に書く
B. AI-DLC の自己適用を別の Unit に切り出し、U1 の置き場には入れない（Units Generation の直しが要り、保護面の PR が 2 本になる）
X. Other (please specify)

[Answer]: A（arc の設計。Owner の決定は「保護面の変更を 1 本の PR にまとめ、exact-head は 1 回」= iyasaka-arc#49 6354019047 の 4、`.gitignore` の audit の除外もその PR に同梱 = 6354411741 の 2。同梱する file が U1 の置き場に無いと、門の判定 5 でその PR が置き場の外になる。B は保護面の PR が 2 本になり、Owner の手が 1 回増えて、決定と食い違う）

## Q8. [設計] 監査の指摘 BF-02: 前の段・Unit・試行を、公開してよい入力だけで決める

監査の指摘 BF-02 です。記録の橋は、前の段と、Unit ごとの一番新しい試行を、main の `aidlc-state.md` から求める設計です（`entities.md` の StageSequence、`rules.md` の BR2.1・BR3.3）。ところが、次の 2 つの事情でこれは成り立ちません。
- `aidlc-state.md` には、Unit ごとの試行の番号がありません。
- 試行の番号は AI-DLC の audit から求まりますが、audit は公開の repo に載せないと決めました（決定 6354411741 の 1）。

どの案でも、次の負例を決まりに入れます。
- 開き直した後の新しい試行に承認が無い
- 複数の Unit
- 入力が足りない
- 古い承認を採らない

A. 承認の記録の作り手が、承認の記録と一緒に、intent ごとの「段の順の記録」を作る。
   - 置き場と形: `approvals/<intent>/_sequence.json`、新しい形 `sds-stage-sequence/1`
   - 中身: 実行した段・Unit・試行の番号・承認の有無を、audit から順に並べた物
   - 記録を入れる PR に含める。記録の橋は、この記録と承認の記録だけを main から読む
   - 受け渡しの形に C9 として足す（Contract Design の記録を、この段の中で直す）
B. 承認の記録 1 つずつに、直前の段（段・Unit・試行）と、その段の一番新しい試行の番号の欄を足す（C2 に欄を足すだけ。版は同じ）。記録の橋は、PR が指す段の承認の記録から直前の段をたどる
X. Other (please specify)

[Answer]: A（arc の設計。B では、ある段を承認した後に開き直して新しい試行に承認が無い時、承認の記録が新しく作られないので、古い記録の「一番新しい試行」の欄のまま通ってしまう = 負例「開き直した後の新しい試行に承認が無い」を止められない。A の段の順の記録は、記録を入れる PR のたびに作り手が audit から作り直すので、承認の無い新しい試行も載る。観測した事実（audit）から作り、作者が宣言した値を使わない = Shirube 開発規格 S5。audit の原文は公開しない = 6354411741。受け渡しの形への C9 の追加は、この段の中で直して記録に残す）

## Q9. [設計] 監査の指摘 BF-03: shirube 自身の門の呼出しと pin を、誰がどう更新するか

監査の指摘 BF-03 です。kit の render・apply・upgrade は、門の呼出しを `.github/workflows/sds-gate.yml` に書きます。shirube 自身ではその path が再利用 workflow そのものなので、kit の版上げで自己用の pin を上げると上書きしてしまいます。自己用の更新と確かめの方法と、それを受け持つ Unit がありません。

A. kit を自己用にも対応させる。
   - target が shirube の時は、呼出しを `sds-gate-self.yml` に書き、再利用 workflow を上書きしない。
   - この kit の変更を U1 に入れ、`scripts/sds/kit.mjs` を U1 の置き場に足す。
   - shirube の pin の版上げも、配布先と同じ kit の版上げの PR で行えるようにする（決まり 6308341298 の版上げの条件に合わせる）。
B. kit は変えない。shirube の自己用の呼出しと pin は手で書き、版上げのたびに保護面の PR（Owner の exact-head）にする（版上げのたびに Owner の手が増える）
C. kit の自己用の対応は U4 に入れる。U4 までの shirube の pin の版上げは、手で書いた保護面の PR で行う
X. Other (please specify)

[Answer]: A（arc の設計。B は shirube の版上げのたびに Owner の exact-head が要り、1 周の Owner の手の上限（6 回）を超えるおそれがある。C は U4 までの間、手で書いた保護面の PR が要る。kit が target ごとに書き先を選べば、shirube も配布先と同じ版上げの決まり（6308341298）で上げられる。kit.mjs の変更の行数は、BF-04 の見積もり（NFR Requirements の段）で own-code の残りに収まるかを確かめる）

## Q10. [設計] Unit の設計の段の「承認」を何とみなすか（Q8 の追加の確認）

AI-DLC では、Unit ごとの設計の段（Functional Design・NFR Requirements・NFR Design・Infrastructure Design）に単独の承認がありません。段ごとに記録されるのは、次の 2 つだけです。
- Owner がその会話で確かめた要約の確認（summary confirmation の記録）
- Unit の完了の記録

承認は、Unit の終わりの確かめ（実装と確かめの command の後）でまとめて行います。U1 の記録の audit にも、設計の段の承認の出来事はありません。Q1 の「直前の段の承認」をこのまま当てると、U1 の実装の PR はすべて FAIL になります。

A. Unit の設計の段は、Owner の要約の確認の記録と Unit の完了の記録の両方が、その段の一番新しい試行にそろった物を「承認済み」とみなす。段の順の記録（Q8）の承認の有無に、この 2 つを入れる。承認の記録（`sds-approval-record/1`）は、その 2 つから作る
B. Unit の設計の段には承認を求めない。Construction の段の PR は、Inception の最後の段（Delivery Planning）の承認を直前の承認とみなす
X. Other (please specify)

[Answer]: A（開き直した Contract Design の Q11 = A で決まった答えを、そのまま使う。Q11 は「この答えは、U1 の Functional Design の Q10 にもそのまま使います」として 2026-10-23 に Owner が要約を確かめて承認した。中身は `contract-summary.md` の C2・C9 に入っている。ここで同じ問いを聞き直さない）

## Q11. [設計] kit が shirube に書く file を、U1 の置き場に足す（2026-10-23 の 2 回目の開き直し）

U1 の NFR Requirements の Q7 で分かったことです。保護面の 1 本の PR（P1）を kit で作ると、kit は呼出しと pin のほかに、次の 3 つも書きます（`scripts/sds/kit.mjs` の render と apply）。どれも U1 の置き場（`functional-spec.md` の `sds-design-locations`）にありません。
- `.claude/skills/sds-audit/SKILL.md`（`kit/skills/sds-audit/SKILL.md` の写し）
- `.github/pull_request_template.md`（`templates/PULL_REQUEST_TEMPLATE.md` の写し）
- `AGENTS.md`（説明文の block。shirube には CLAUDE.md も AGENTS.md も無いので、AGENTS.md を作る）

このままでは、P1 が門の判定 5 で置き場の外になります。

A. 3 つを U1 の置き場に足す
X. Other (please specify)

[Answer]: A（Owner が U1 の NFR Requirements の Q7 = A で選んだ中身。「Functional Design: 置き場に、kit が書く file を足す」。ここで同じ問いを聞き直さない）

## Q12. [設計] 2 回目の監査の返却（BF-07・BF-08・BF-04）で決まった事を、この段の決まりに写す（2026-10-24 の開き直し）

shirube PR #65 の 2 回目の監査の返却を受けて、前の段で Owner が選んだ事です。
- Contract Design の Q12（返却 6362007900 の BF-07）: 作り手が、上流の段を開き直した時点で、それより前の下流の行に無効の印 `superseded: true` を付ける。門は、PR が指す段の一番新しい試行の行に印があれば FAIL。前の段は、印の無い行だけから選ぶ。
- Contract Design の Q13（同じ返却の BF-08）: 承認の記録の置き場に試行の番号を入れる（`approvals/<intent>/<段>/<unit>/attempt-<n>.json`、Inception の段は `.../_intent/attempt-<n>.json`）。一度作った file は書き換えず、同じ path に file があれば bytes を比べ、同じなら書かず、違えば失敗。
- Units Generation の Q8（返却 6362354895 の BF-04）: U1 の実装の PR は 4 本。順は P1 → R → I1 作り手 → A → I2 kit の自己用の書く先と `budget.mjs` → I3 記録の橋と門の判定 → K → I4 計測。確かめの PR は I4。

この段の記録（`entities.md`・`rules.md`・`functional-spec.md`）は、その前の形のままです。
- BR2.1 は「前の行」だけから前の段を選ぶ。
- BR3.3・`entities.md` は、試行の番号の無い置き場を使う。
- W4・W5 は、実装の PR 3 本の順。

A. 写す。上の 3 つを、データの形・決まり・振る舞いの仕様に揃え、C9・C2 の負例と正例を決まりの試験に入れる。新しい判断は入れない
X. Other (please specify)

[Answer]: A（Owner が Contract Design の Q12・Q13 と Units Generation の Q8 で選んだ中身を写すだけなので、ここで同じ問いを聞き直さない）

## Consolidated Summary Confirmation

- 確かめる承認: PR が指す段の、直前の段の承認の記録（要件 FR2.1 のとおり）（arc の設計） [Q1]
- 承認の記録を読む場所: PR の base（main）にある記録だけ。承認の記録は、実装の PR より前に、記録を入れる PR で main に入れる（PR の中で自分の承認を足して通せないように）（arc の設計） [Q2]
- 開き直した段: 一番新しい試行の承認の記録があれば承認済み。古い試行の承認しか無ければ FAIL で、足りない記録として新しい試行の番号を出す（arc の設計） [Q3]
- 承認の記録の作り手: U1 で CLI の最小の形（AI-DLC の audit の 1 つの段の承認から 1 つの file）を作り、全部の形と FAIL の扱いは U3 で仕上げる（arc の設計） [Q4]
- 計測の最小の形: 指定した repo と期間の統合された PR ごとに、門の status の state と log の 1 行の JSON の verdict を読み、PASS・FAIL・観測できずの件数を出す（arc の設計） [Q5]
- 確かめに使う PR: 門の呼出しの PR（保護面、Owner の exact-head）が main に入った後の、U1 の残りの実装の PR（arc の設計） [Q6]
- 置き場と保護面の同梱（BF-01）: 保護面の 1 本の PR に同梱する file（AI-DLC の自己適用の 6 file と `.gitignore` の audit の除外）を、すべて U1 の置き場に足す。PR の順（保護面の 1 本 → 記録の PR → 実装の PR）と同梱の範囲は Infrastructure Design の記録に書く（arc の設計） [Q7]
- 前の段・Unit・試行の決め方（BF-02）: 承認の記録の作り手が、承認の記録と一緒に intent ごとの段の順の記録（`approvals/<intent>/_sequence.json`、形 `sds-stage-sequence/1`。実行した段・Unit・試行の番号・承認の有無を audit から並べた物）を作り、記録を入れる PR に含める。記録の橋は、これと承認の記録だけを main から読む。負例（開き直した後の承認の無い試行・複数の Unit・入力不足・古い承認）を決まりに入れる。C9 は、Owner の指示で Contract Design を開き直して足した（2026-10-23 承認）。この段の中では `contract-summary.md` を直さず、この段の記録は C9 を引く（arc の設計、C9 の足し方は Owner の指示） [Q8]
- 自己用の呼出しと pin（BF-03）: kit を自己用にも対応させ（target が shirube の時は `sds-gate-self.yml` に書き、再利用 workflow を上書きしない）、この変更を U1 に入れて `scripts/sds/kit.mjs` を U1 の置き場に足す。shirube の pin の版上げも、配布先と同じ kit の版上げの PR で行う。kit.mjs の行数は BF-04 の見積もりで確かめる（arc の設計） [Q9]
- Unit の設計の段の「承認」: Owner の要約の確認の記録と Unit の完了の記録の両方が、その段の一番新しい試行にそろった物を承認済みとみなす。段の順の記録の `approved` と承認の記録は、その 2 つから作る。片方だけ・古い試行の物だけなら承認なし（開き直した Contract Design の Q11 = A、C2・C9） [Q10]
- kit が shirube に書く file（2 回目の開き直し）: `.claude/skills/sds-audit/SKILL.md`・`.github/pull_request_template.md`・`AGENTS.md` を U1 の置き場に足す（U1 の NFR Requirements の Q7 = A）。3 回目の開き直し（NFR Requirements の Q8 = A）で確かめた: P1 は今の kit では作れず手で組むので、3 つは P1 に入れない。どの PR で入れるかは Infrastructure Design で決める。置き場の block は変えない [Q11、NFR Requirements の Q8]
- PR の順（2 回目の開き直しで Delivery Planning の Q10 が改めた）: P1 保護面の 1 本 → R 記録の PR → I1 作り手 → A 承認の記録の PR → I2 記録の橋と門の判定 → I3 計測と kit の自己用の書く先。Q6 の「門の呼出しの PR が main に入った後の、U1 の残りの実装の PR」は、A の後の I2・I3 になる（Q6 の答えは変えない） [Q6、Delivery Planning の Q10]
- PR の順（4 回目の開き直しで Delivery Planning の Q11 が改めた）: P1 → R → I1（作り手と kit の自己用の書く先）→ A → I2（記録の橋と門の判定）→ K（kit の版上げの PR。shirube の pin を I2 の後の main に上げ、kit が書く 3 つの file を入れる）→ I3（計測）。門は base の pin の commit から動くので、Q6 の確かめの PR は、K の後の I3 になる（Q6 の答えは変えない）。kit が書く 3 つの file は K で入る [Q6、Q11、Delivery Planning の Q11]
- 2 回目の監査の返却で決まった事の写し（2026-10-24）:
  - 上流を後から開き直した時（C9）: 作り手が古い下流の行に `superseded: true` を付ける。門は、PR が指す段の一番新しい試行の行に印があれば FAIL。前の段は印の無い行だけから選ぶ（BR2 を直す）。
  - 同じ段の 2 回目の承認（C2）: 置き場は `approvals/<intent>/<段>/<unit>/attempt-<n>.json`。一度作った file は書き換えず、同じ path に file があれば bytes を比べる（BR3.3・BR5・entities を直す）。
  - 負例と正例: 上流を開き直した後の FAIL、再承認して始め直した後の PASS、試行 1 保存 → 開き直し → 試行 2 再承認 → 受け入れ。
  - PR の順: P1 → R → I1 作り手 → A → I2 kit の自己用の書く先と `budget.mjs` → I3 記録の橋と門の判定 → K → I4 計測。確かめの PR は I4（W4・W5 を直す。Q6 の答えは変えない）。
  - （Owner が Contract Design の Q12・Q13 と Units Generation の Q8 で選んだ） [Q12]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
