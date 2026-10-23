# Contract Design — 受け渡しの形の質問

承認済みの Unit（`inception/units-generation/unit-of-work.md`・`unit-of-work-dependency.md`）と部品（`inception/domain-design/components.md`）の間で、何がどの形で受け渡されるかを決めます。要件は `inception/requirements-analysis/requirements.md` です。

受け渡しの境目の候補:

| # | 渡す側 | 受ける側 | 渡す物 |
|---|--------|----------|--------|
| 1 | 作者の席（外） | 門（U1・U4）、計測（U2） | PR の機械向けの block（sds-pr/1 に AI-DLC の記録の欄と直す元の PR の欄を足す） |
| 2 | 承認の記録の作り手（U1・U3） | 記録の橋（U1・U3） | 承認の記録（`本人確認: なし`） |
| 3 | 門（U1・U4） | 計測（U1・U2） | 門の結果 |
| 4 | 計測（U2） | W2 の道具（外、iyasaka-arc） | 計測の出力（1 行の JSON と #53 に載せる文） |
| 5 | 監査の席（外） | 計測（U2） | 「誤って止めた」分類（`sds-gate-fail-classification/1`） |
| 6 | 設計の席（外） | 計画の受付（U5） | 道筋の記録の、今の段の採択の参照 |
| 7 | 設計の記録（外、AI-DLC の出力） | 門の判定 5（U4） | 設計の置き場の宣言 |
| 8 | 配布キット（U4） | aun・onza（U6・U7） | 部品と pin（sds-pin/1） |

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [設計] 受け渡しの形の書き方

A. 各形を JSON Schema で書き、形ごとに版の名前（例: `sds-approval-record/1`）を付ける。今ある形（sds-pr/1、sds-pin/1 など）と同じ付け方にする
B. 表と文で書くだけにし、機械で検査できる型は作らない
X. Other (please specify)

[Answer]: X: 形ごとに版の名前を付ける（例: `sds-approval-record/1`。今の sds-pr/1・sds-pin/1・sds-audit-review/1 と同じ付け方）。形は設計の記録に、欄の表（名前・型・必須か・意味）と例を 1 つずつ書く。機械の検査は、その形を読む部品が欄を確かめるコードで行う（今の gate.mjs・audit-admission.mjs・design-gate.mjs と同じ。読み方は 1 か所 = ADR-009）。JSON Schema は書かない（arc の設計。JSON Schema を検査する道具は実行時の npm 依存になり、要件 NFR5「実行時の依存を足さない」に反する。検査しない JSON Schema を別に置くと、形の知識が設計の表・schema・コードの 3 か所になる = Shirube 開発規格 S3）

## Q2. [設計] 形の変え方（版の上げ方）

チームの決まり（Shirube 開発規格 S6）では、形の変更は新旧が同居できる段階に分けます。

A. 欄を足すだけの変更は同じ版のまま（読む側は知らない欄を無視する）。欄の意味を変える・消す変更は版を上げ、配布先が新しい版に揃うまで、読む側は古い版も読む
B. どんな変更でも版を上げる
X. Other (please specify)

[Answer]: A（arc の設計。新旧が同居できる段階に分ける = Shirube 開発規格 S6。配布先（aun・onza）は版上げの PR で後から揃うので、揃うまでは読む側が古い版も読む。欄を足すだけなら古い読み手を壊さない）

## Q3. [設計] 承認の記録の置き場

設計の決定 ADR-005 で、承認の記録は shirube の CLI が作り、記録を repo に入れる PR に含めると決めました。repo の中のどこに置くかを決めます。

A. intent の記録の中に、段ごとに 1 つの file（例: `<intent の記録>/approvals/<段>.json`）
B. repo の 1 か所（例: `.shirube/approvals/<intent>/<段>.json`）
X. Other (please specify)

[Answer]: B。Construction の段は Unit ごとに 1 file（`.shirube/approvals/<intent>/<段>/<unit>.json`）（arc の設計。AI-DLC の記録 `aidlc/spaces/default/intents/**` は原典が書くとおりに git に入れる = 内包の設計 `docs/design/aidlc-include.md` の置き場の表。その中に Shirube が作った file を混ぜると、Owner の作業場の file と bytes が同じかの監査（#49 6329978835 の 3）で、AI-DLC が書いた物と Shirube が書いた物を分けて見る手間が増える。Shirube の file は今も `.shirube/`（`sds-pin.json`・`hygiene-profile.md`）に置いている）

## Q4. [設計] 設計の置き場の宣言の場所

判定 5 を広げて、PR の変更 path が設計の記録に書いた置き場の中かを見ます（FR6）。その「置き場」を、どこに機械で読める形で書くかを決めます。

A. AI-DLC の Unit の設計の記録（Functional Design の出力）に、機械で読む block（例: `json sds-design-locations`）を 1 つ置く
B. 既存の設計の block（`json sds-design`、sds-design/1）に、置き場の欄を足す
C. AI-DLC の Code Generation の計画の file に書かれた path の一覧を使う
X. Other (please specify)

[Answer]: X: C の形を、計画の file ではなく、同じ Code Generation の段で AI-DLC が書く `source-manifest.json` で行う。門は、PR が指す Unit の `source-manifest.json`（その Unit が作った・変えた・消した path の一覧。AI-DLC の stage file が Unit ごとに書くと決めている、機械で読める形）を読み、PR の変更 path がその一覧（と、その intent の AI-DLC の記録の置き場）の中かを見る。一覧に無い path は FAIL で、外れた path を出す。一覧の中身が承認済みの計画（Plan Approval）の「Touches」と合っているかという意味の照合は、独立監査（I7 設計適合）で見る = 要件 FR6.2（arc の設計。A は Functional Design に path を書かせることになるが、原典はこの段を「実装の細部を書かない設計の段」と決めている。B の `sds-design/1` は AI-DLC の前の製品設計 1 枚の形で、AI-DLC の流れでは作られない。計画の file の path は文章の中にあり、機械で確実に読めない。manifest なら AI-DLC がそのまま書くので、作者が書き足す物が無い = 要件の完成形「作者が書くのは PR の数行だけ」）

## Q5. [設計] 計測が門の結果を読む所

門が書くのは commit status 1 つだけです（NFR10）。commit status の説明文は短く（140 文字まで）、判定ごとの理由は入りきりません。

A. 計測は commit status の state（成功・失敗）と、門の workflow の log に出る 1 行の JSON を読む（監査の受領の検査が log を読むのと同じ読み方）
B. 計測は commit status の state と説明文だけを読む
X. Other (please specify)

[Answer]: A（arc の設計。今の門 `gate.mjs` は、成功でも失敗でも結果を 1 行の JSON で標準出力に出しているので、workflow の log にその行が残る。監査の受領の検査 `audit-admission.mjs` も Actions の job の log を API で読んでいる。commit status の説明文は 140 文字までで、判定ごとの理由が入りきらない）

## Q6. [設計] 計測の出力の形（W2 の道具への渡し方）

A. 標準出力に 1 行の JSON（版の名前つき）を出す。#53 に載せる文は、その JSON の中の 1 つの欄（markdown の文字列）に入れる
B. JSON と markdown を、別の 2 つの出力（2 つの file）にする
X. Other (please specify)

[Answer]: A（arc の設計。計測は結果を出すだけで、#53 の置き換えは W2 の道具が行う = ADR-003。1 回の実行の出力が 1 つなら、JSON の値と #53 の文が食い違わない。今の Shirube の script も 1 行の JSON を標準出力に出す形）

## Q7. [設計] 境目で読めない時・時間切れの時の扱い

A. どの境目でも、読めない・時間切れは「観測できず」（exit code 2）として返し、自動の再試行はしない。次の回の測定（04:30・18:00）や、次の門の起動に任せる
B. 1 回だけ再試行してから「観測できず」を返す
X. Other (please specify)

[Answer]: A（arc の設計。要件 NFR1 で exit code 2 =「観測できず」、NFR3 で問い合わせごとの時間の上限と全体の予算を持ち、使い切ったら「観測できず」と決めている。自動の再試行を入れると、同じ入力で結果が変わる所が増える（NFR2・NFR13）。門は PR の作者が workflow を再実行でき、計測は次の 04:30・18:00 の回で測り直せる）

## Q8. [設計] 承認の記録の置き場（Q3 の追加の確認）

Q3 の答え（`.shirube/approvals/<intent>/<段>/<unit>.json`）の置き場は、門が既定で保護面として扱う path（`.shirube/**`、`scripts/sds/gate.mjs` の `DEFAULT_PROTECTED`）の中です。このままでは、承認の記録を入れる PR がすべて R4 になり、毎回 Owner の exact-head が要ります。「Owner の手は 1 周 6 回まで」（S1-SH-07）と食い違います。

A. 保護面の外の 1 か所に置く（例: repo の `approvals/<intent>/<段>/<unit>.json`）。AI-DLC が書いた物とも分けられる
B. intent の記録の中に置く（Q3 の A。例: `<intent の記録>/approvals/<段>.json`）。AI-DLC が書いた物と分けるため、置き場の名前で区別する
C. `.shirube/approvals/` のまま、門の保護面の既定からこの path だけを外す（門のコードの変更。保護面の扱いを変える変更なので、Owner の決定が要る）
X. Other (please specify)

[Answer]: A。この答えで Q3 の置き場を置き換える（arc の設計。Q3 の答えは、`.shirube/**` が門の既定の保護面（`gate.mjs` の `DEFAULT_PROTECTED`）だと確かめずに書いた arc の誤り。承認の記録の PR が毎回 R4 になると、S1-SH-07「Owner の手は 1 周 6 回まで」を守れない。C は保護面の扱いを変えるので、Owner の決定が 1 つ増える。保護面の外の 1 か所に置けば、AI-DLC が書いた物とも分けられる。S1 の記録は本人確認なしの印のままで、門が受け入れる印の切り替えは DB の段で行う = iyasaka-arc#49 6315688299）

## Q9. [設計] 設計の置き場を何で見るか（Q4 の追加の確認）

Q4 の答えは、門が見る物を、AI-DLC の Code Generation の段が Unit ごとに書く `source-manifest.json` にします。承認済みの要件 FR6.1 と部品の設計（DesignBinding の DesignRecordRef）は、「設計の記録に書いた置き場の中か」を見るとしています。manifest は実装と同時に書かれる実装の記録なので、門が見る物が「設計」から「AI-DLC の実装の記録」に変わります。また、manifest は、実装を AI-DLC の Code Generation の段で行う時だけ作られます。普段の実装の席を AI-DLC の作業場で動かすかは、実装の段で伺うと決めています（iyasaka-arc#49 6327673130）。

A. Q4 の答えで進める。要件 FR6.1 と部品の設計の書き方を「PR の変更 path が、AI-DLC の実装の記録（source-manifest.json）の中か」に直す。実装を AI-DLC の Code Generation の段で行うことを前提にし、その決定は実装の段で伺う
B. 要件どおり、設計の記録の側に置き場を書く（Q4 の A。Functional Design の出力に機械で読む block を 1 つ置く）
C. Q4 の答えに加え、計画の承認（Plan Approval）の「Touches」も機械で読める形にし、manifest がその中かも門で見る
X. Other (please specify)

[Answer]: B。この答えで Q4 の答えを置き換える。置き場は Unit の Functional Design の出力に、機械で読む block（例: `json sds-design-locations`、形の名前は Q1 の付け方）を 1 つ置き、その Unit が変えてよい folder・file の型（glob）を並べる。block は設計の段で arc が下書きし、Owner が段の承認で確かめる。門は PR が指す Unit の block を読み、変更 path がその中かを見る（arc の設計。Q4 の manifest の案は、実装を AI-DLC の Code Generation の段で行うことを前提にしていた。その前提は実装の段で伺うと決めたままで、まだ決まっていない = iyasaka-arc#49 6327673130。B なら、承認済みの要件 FR6.1 と部品の設計（DesignBinding）を変えずに済み、実装をどこで行っても同じ検査になる。置き場を folder・file の型で書くのは、部品の置き場を決める設計の範囲で、関数の中身のような実装の細部ではない。AI-DLC がこの block を書くように、team.md の決まりに 1 行足す）

## Q10. [設計] 受け渡しの形 C9: 段の順の記録の形（監査の指摘 BF-02 への開き直し）

U1 の設計の独立監査（shirube PR #65 の sds-audit-review、BF-02）を受けて、U1 の Functional Design で次の方針を決めました（Q8 = A）。
- 承認の記録の作り手が、intent ごとの「段の順の記録」を audit から作り、記録を入れる PR に含める。
- 記録の橋は、この記録と承認の記録だけを main から読む。

理由は、記録の橋が前の段・Unit・一番新しい試行を、公開してよい入力だけで決める必要があるためです。
- `aidlc-state.md` には Unit ごとの試行の番号がありません。
- audit は公開の repo に載せないと決めました（iyasaka-arc#49 6354411741）。

この新しい受け渡しの形を、C9 として決めます。

A. 次の形にする。
   - 置き場: `approvals/<intent>/_sequence.json`（C2 と同じ保護面の外の置き場）
   - 形の名前: `sds-stage-sequence/1`
   - 欄: `schema`・`intent`・`source_digest`（元にした audit の範囲の SHA-256）・`entries`（実行した順に `{order, stage, unit, attempt, approved, approval_ref}`）
   - 並べ方: 飛ばした段は入らない。段を開き直すと、新しい試行の行が足される（古い行は消さない）。
   - 持ち主: 作り手は ApprovalRecordWriter（U3、U1 で最小の形）、読み手は RecordBridge。記録を入れる PR のたびに audit から作り直し、同じ audit からは同じ bytes を作る。
   - 読めない・壊れている・intent が違う時は、記録の橋の判定を FAIL にする。
B. A と同じ中身を、承認の記録（C2）の file の中に入れる（形を 1 つにまとめる。承認の記録のたびに段の順を全部持つ）
X. Other (please specify)

[Answer]: A（arc の設計。U1 の Functional Design の Q8 = A と同じ形。B は承認の記録のたびに段の順を全部持つので、同じ知識が記録の数だけ並ぶ = Shirube 開発規格 S3。段の順は intent に 1 つあれば足り、承認の記録は 1 つの段の 1 つの試行だけを持つ形のままにできる。観測した事実（audit）から作り、作者の宣言を使わない = S5。audit の原文は公開しない = iyasaka-arc#49 6354411741）

## Q11. [設計] 受け渡しの形 C9: Unit の設計の段の「承認の有無」の意味

AI-DLC では、Unit ごとの設計の段（Functional Design・NFR Requirements・NFR Design・Infrastructure Design）に単独の承認がありません。段ごとに記録されるのは、次の 2 つだけです。
- Owner がその会話で確かめた要約の確認（summary confirmation の記録）
- Unit の完了の記録

承認は、Unit の終わりの確かめでまとめて行います。U1 の記録の audit にも、設計の段の承認の出来事はありません。C9 の `approved` の欄と、承認の記録（C2）を何から作るかを決めます。この答えは、U1 の Functional Design の Q10 にもそのまま使います。

A. Unit の設計の段は、Owner の要約の確認の記録と Unit の完了の記録の両方が、その段の一番新しい試行にそろった物を「承認済み」とする。承認の記録（C2）は、その 2 つから作る。Inception の段と Code Generation 以降は、今までどおり段の承認の出来事から作る
B. Unit の設計の段には承認を求めない。Construction の段の PR は、Inception の最後の段（Delivery Planning）の承認を直前の承認とみなす
X. Other (please specify)

[Answer]: A（arc の設計。AUN の取り組みの audit で確かめた: U1 の設計の 4 段（functional-design・nfr-requirements・nfr-design・infrastructure-design）は、どれも SUMMARY_CONFIRMATION_RECORDED と、その段の Unit の UNIT_COMPLETED があり、GATE_APPROVED は無い。A なら AI-DLC がもう残している 2 つの記録から作れるので、新しい承認の手順を足さず、作者の手間も Owner の手の数も増えない = S1-SH-05・S1-SH-07。B は、Unit の設計の段を飛ばした実装の PR でも Delivery Planning の承認だけで通るので、「工程を飛ばしたら進めない」= OI-SHIRUBE-NO-AUDIT-NO-SKIP-CONTROL-20261021-001（#49 6304645183）と、仕様の固定の「次の段階は前の段階の出力への参照が無いと始まらない」= #49 6305503572 に届かない。要件 FR2.1「直前の段の承認」は変えず、Unit の設計の段でそれを何の記録で読むかを決める。2 つの記録は同じ試行の物に限り、片方だけ・古い試行の物だけなら承認なしとする）

## Consolidated Summary Confirmation

- 形の書き方: 形ごとに版の名前を付ける（例: `sds-approval-record/1`）。形は設計の記録に、欄の表（名前・型・必須か・意味）と例で書く。機械の検査は、その形を読む部品のコードで行い、JSON Schema は書かない（実行時の依存を足さない NFR5、形の知識を 1 か所に S3）（arc の設計） [Q1]
- 形の変え方: 欄を足すだけなら同じ版のまま（読む側は知らない欄を無視する）。意味を変える・消す時は版を上げ、配布先が揃うまで読む側は古い版も読む（arc の設計） [Q2]
- 承認の記録の置き場: 保護面の外の 1 か所（例: repo の `approvals/<intent>/<段>/<unit>.json`）。Q3 の `.shirube/approvals/` は、門の既定の保護面の中で Owner の手が増えるため置き換えた [Q8、Q3 を置き換え]
- 設計の置き場の宣言: Unit の Functional Design の出力に、機械で読む block（例: `json sds-design-locations`）を 1 つ置き、その Unit が変えてよい folder・file の型を並べる。門は PR が指す Unit の block を読み、変更 path がその中かを見る。要件 FR6.1 と部品の設計は変えない。Q4 の manifest の案は、実装を AI-DLC の中で行う前提が未決のため置き換えた [Q9、Q4 を置き換え]
- 計測が門の結果を読む所: commit status の state と、門の workflow の log に出る 1 行の JSON（arc の設計） [Q5]
- 計測の出力: 標準出力に版の名前つきの 1 行の JSON。#53 に載せる文は、その JSON の中の 1 つの欄（arc の設計） [Q6]
- 読めない時・時間切れ: どの境目でも「観測できず」（exit code 2）を返し、自動の再試行はしない（arc の設計） [Q7]
- 段の順の記録（C9、監査の指摘 BF-02 への開き直し）: `approvals/<intent>/_sequence.json`、形 `sds-stage-sequence/1`。欄は schema・intent・source_digest・entries（実行した順に order・stage・unit・attempt・approved・approval_ref）。飛ばした段は入らず、開き直すと新しい試行の行が足される。作り手は ApprovalRecordWriter（U3、U1 で最小の形）、読み手は RecordBridge。記録を入れる PR のたびに audit から作り直し、同じ audit からは同じ bytes。読めない・壊れている・intent が違う時は FAIL（arc の設計） [Q10]
- Unit の設計の段の承認の有無（C9）: Owner の要約の確認の記録と Unit の完了の記録の両方が、その段の一番新しい試行にそろった物を承認済みとし、承認の記録（C2）もその 2 つから作る。片方だけ・古い試行の物だけなら承認なし。Inception の段と Code Generation 以降は、段の承認の出来事から作る。U1 の Functional Design の Q10 にも使う（arc の設計） [Q11]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
