# Infrastructure Design（U1 u1-skeleton）— 質問

U1 の「基盤」は、GitHub Actions の workflow と pin です。クラウドの資源・DB・常駐する部品はありません。
- shirube の門の呼出しの workflow
- `ci.yml`（網羅率の床と計測の job）
- `.shirube/sds-pin.json`

これらはすべて保護面で、U1 の保護面の PR で Owner の exact-head を 1 回通します（作る順番の段の Q8）。

前提:
- U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/`）と作り方（`nfr-design/`）
- 配布キットの呼出しの部品（`kit/sds-gate-caller.yml`）

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [設計] shirube の門の呼出しの作り方と権限

配布キットの呼出しの部品（`kit/sds-gate-caller.yml`）について、次の 3 つが分かりました。
- 配布先の `.github/workflows/sds-gate.yml` に写されます。shirube では、その path が再利用 workflow そのもので、そのままは入れられません。
- 権限を workflow の一番上に置いています。
- 権限には、`issues`（監査の依頼と返却の comment）と `checks` の読取りが入っています。U1 の NFR10.1（statuses の書込みと contents・actions・pull-requests の読取りだけ）では、門が監査の受領を確かめられません。

A. kit の部品と同じ中身（出来事・権限・呼び方）を、`.github/workflows/sds-gate-self.yml` の名前で shirube に入れる。配布先と同じ形を保ち、NFR10.1 に issues・checks の読取りを足す（U1 の NFR の記録を、この段の中で直す）。権限は一番上に置くが、job が 1 つなので効き目は job ごとに置くのと同じ
B. A と同じ中身で、権限は一番上を空にして job に置く（NFR Design の Q4 の形）。配布先の部品とは形が少し違う。NFR10.1 に issues・checks の読取りを足す
C. kit の部品そのものを、一番上は空・job ごとの形に直し（配布先も同じ形になる）、それを shirube に入れる。NFR10.1 に issues・checks の読取りを足す
X. Other (please specify)

[Answer]: A（arc の設計。shirube 自身が門を通ること（S1-SH-06）は、配布先と同じ形で動かして初めて「配る物が効く」ことの確かめになる。形を shirube だけ変える B は、確かめる物と配る物がずれる。C は既に配った先（kodama の report-only の導入 = kodama #87 など）にも版上げの PR を起こし、U1 の範囲が広がる。job が 1 つなので、一番上に置いても効き目は job ごとと同じ。監査の受領を確かめるのに issues・checks の読取りが要るのは、門の判定 3（監査なしは統合できない = S1-SH-01）のため。NFR10.1 の直しはこの段の中で記録に残す）

## Q2. [設計] shirube 自身の pin の版上げ

shirube の門の呼出しは、固定した shirube の commit を呼びます（NFR4.1）。shirube の main が進んだ時の、pin の上げ方を決めます。

A. 配布先と同じく、kit の版上げの PR で上げる。決まり（iyasaka-arc#49 6308341298）のとおり、差分がキットの file だけ・kit check OK・上げる先が監査済みの main なら、監査 PASS の後に統合の担当が統合する（PR ごとの exact-head は要らない）
B. shirube は固定せず、main の最新を呼ぶ
X. Other (please specify)

[Answer]: A（arc の設計。門は固定した shirube の commit から動く = 要件 NFR4。版上げは、差分がキットの file だけ・kit check OK・上げる先が監査済みの main なら、監査 PASS の後に統合の担当が統合してよいと決めてある = iyasaka-arc#49 6308341298。B は固定をやめることになり、NFR4 に反する）

## Q3. [設計] `ci.yml` の網羅率の床と計測の job の動かし方

A. 網羅率の床と計測の job を、次のように入れる。
   - 網羅率の床: 今の試験の step を、網羅率の床つき（`--test-coverage-lines=80`）の command に替え、PR と main への push で動かす
   - 計測の job: 新しい job として足し、main への push と手動（workflow_dispatch）で動かす。期間は引数で受け、既定は直近 30 日、対象は shirube
B. 計測の job も、PR ごとに動かす
X. Other (please specify)

[Answer]: A（arc の設計。網羅率の床は統合の前に CI で確かめる = Owner の決定 iyasaka-arc#49 6336689921 なので、PR ごとに動かす。計測は期間の値を出す物で、PR ごとに動かしても値は main の状態で決まるため、main への push と手動で足りる。U1 の確かめの対象は shirube 自身 = NFR の段の Q2）

## Q4. [設計] 監査の指摘 BF-01: 通し直しで決まった PR の順と範囲を、この段の記録に写す（2026-10-23 の開き直し）

この段の記録（`cicd-pipeline.md`・`infrastructure-specification.md`）は、通し直しの前の形のままです。
- PR の順が「記録を入れる PR → 保護面の PR → 実装の PR」になっている。Delivery Planning の Q10 で決まった順は P1 → R → I1 → A → I2 → I3。
- 保護面の PR の中身に、AI-DLC の自己適用の file・大きさの数えの除外・own-code の予算の改め・`.gitignore` の audit の除外が無い（iyasaka-arc#49 6354019047 の 1・4、6354411741 の 2、Delivery Planning の Q10）。
- 網羅率の command が `--test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs` のまま。NFR Design の Q5 で、数える物は `scripts/**` の全部（`--test-coverage-include='scripts/**' --test-coverage-include-all`）と決まった。
- P1 は今の kit では作れず手で組む（U1 の NFR Requirements の Q8）。

A. 写す。上の 4 つを、`cicd-pipeline.md` と `infrastructure-specification.md` に、決まったとおりに書く。新しい判断は入れない
X. Other (please specify)

[Answer]: A（arc の設計。4 つとも承認済みの記録（Delivery Planning の Q10、#49 6354019047 の 1・4、6354411741 の 2、NFR Design の Q5、NFR Requirements の Q8）の写しで、新しい判断は入らない）

## Q5. [設計] 監査の指摘 BF-03: shirube の pin を上げる順と、新しい門のコードで判定される確かめの PR（2026-10-23 の開き直し）

確かめた事実:
- shirube の門は、base の `sds-gate-self.yml` が固定した shirube の commit から動く（`pull_request_target`、NFR4.1）。
- P1 で固定するのは、U1 の前の shirube の commit。
- I2（記録の橋と門の記録の判定）を統合しても、pin を上げるまで、その後の PR は U1 の前の門で判定される。
- 手で書く pin の版上げは保護面（`.shirube/**`）で、Owner の exact-head が要る。
- Owner の手の要らない kit の版上げの PR（K。決まり iyasaka-arc#49 6308341298 の 1、この段の Q2）は、kit の自己用の書く先ができてからでないと出せない。今の計画では、それは I3 に入る。
- このままでは、U1 の実装の PR（I1〜I3）はどれも新しい門で判定されない。U1 の Functional Design の Q6（U1 の残りの実装の PR で確かめる）と、作る順番の計画の B1 の済みの条件（実際の PR で、門が段の順の記録と承認の記録を main から読む）が成り立たない。

K は、P1 で呼出しと pin を手で入れた後の、差分が kit の file だけの PR です。そこで、どの案でも K は「最初の導入」ではなく「版上げ」として扱う、と書きます。版上げの決まりに当たるので、Owner の手は要りません。違う扱いにすると、Owner の手が 1 回増えます。K で、kit が書く 3 つの file（sds-audit の skill・PR の雛形・`AGENTS.md`）も入ります（U1 の NFR Requirements の Q8 の残り）。

A. kit の自己用の書く先を、I3 から I1 へ移す。
   - 順: P1 → R → I1（作り手と kit の自己用の書く先）→ A → I2（記録の橋と門の判定）→ K（pin を I2 の後の main へ上げる）→ I3（計測）。
   - I3 が、新しい門で判定される確かめの PR になる（Functional Design の Q6 のまま）。
   - PR の数（保護面の 1 本と実装の PR 3 本）と Owner の手（4 回）は変わらない。
   - I1・I3 の中身を変えるので、Delivery Planning を開き直し、U1 の設計の段まで順に通し直す。
   - I1 が 400 行を超えないかは、移す行数（kit の変更と試験で約 60 行の見込み）で確かめる。
B. 中身は変えない。I2 の統合の後に、手で書いた pin の版上げの PR（保護面、Owner の exact-head）を出し、I3 を確かめの PR にする。
   - I3 の後の K で、kit が書く 3 つの file を入れる。
   - 保護面の PR が U1 で 2 本になり、Owner の手は 5 回の予定になる。
   - Units Generation の Q7（保護面の 1 本）を直すので、Units Generation を開き直す。
C. 中身も順も変えない。I3 の後の K で pin を上げ、確かめは K の後に出る最初の実際の PR で行う。
   - Functional Design の Q6 と、B1 の済みの条件を直すので、Delivery Planning と U1 の設計の段を開き直す。
   - B1 の済みは、K の後の次の PR を待つ。
X. Other (please specify)

（arc の勧め: A。承認済みの記録に照らした: Units Generation の Q7（U1 は保護面の 1 本と実装の PR 3 本まで）、Delivery Planning の Q10（PR の順、Owner の手 4 回）、Functional Design の Q6（U1 の残りの実装の PR で確かめる）、B1 の済みの条件、kit の版上げの決まり（#49 6308341298 の 1: 差分が kit の file だけ・kit check OK・上げる先は監査 PASS で別の席が統合した shirube main なら、独立監査と受領の後に Owner の exact-head なしで統合）。どの案も前の段の記録を変えるので、どれでも開き直しは要る。A は PR の数と Owner の手を変えず、細い版の確かめ（U1 の自分の PR が新しい門で判定される）も保てる。直すのは Delivery Planning の順（K を I2 と I3 の間に入れ、kit の自己用の書く先を I1 へ）と、それに続く U1 の設計の段の写しだけ。B は保護面の PR が 2 本になり、Units Generation の Q7 と Owner の手（5 回）を変える。C は確かめを U1 の外の PR に先送りし、細い版の済みの条件を弱める。開き直しの範囲に関わるので Owner が決める）

[Answer]: A（Owner がこの会話で選んだ。Delivery Planning を開き直し、U1 の設計の段まで順に通し直す）

## Q6. [確かめ] 記録済みの確かめの command を、NFR Design の Q5 の数え方に揃えるか

この intent の確かめの command（`aidlc-state.md` の Construction Verification Command。細い版の確かめで使い、人が決める物）は、次の形です。

`node --test --experimental-test-coverage --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs`

NFR Design の Q5 で、CI の網羅率は `scripts/**` の全部を数える（試験が読まない file も 0%、試験の file は数えない）と決めました。今の command は試験が読んだ file だけを数え、試験の file も数えに入るので、CI より緩い数え方です。

A. 確かめの command を、CI と同じ数え方に改める（`--test-coverage-include='scripts/**' --test-coverage-include-all` を足す）。改めるのは Owner の決定として記録する
B. 今のままにする（CI の床が本当の床で、確かめの command は手元の目安）
X. Other (please specify)

（arc の勧め: A。NFR Design の Q5 で、CI の網羅率は scripts/** の全部を数え、試験が読まない file も 0% と決めた。確かめの command が CI より緩いと、手元で通って CI で落ちる食い違いが出る。床の数え方を 1 か所の決まりにそろえる = Shirube 開発規格 S3。今の値は 98.20% なので、そろえても今は通る。確かめの command は人が決める物なので Owner が決める）

[Answer]: A（Owner がこの会話で選んだ。確かめの command の承認の手順で、Owner の言葉「先頭に npm ci && を付ける」を足して承認した。記録した command = `npm ci && node --test --experimental-test-coverage --test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs`）

## Q7. [設計] 段の順の記録に、U1 の Code Generation の行を載せる方法（U1 の Functional Design の日記の未決の点）

確かめた事実:
- 門が I3（`aidlc_record` = code-generation・u1-skeleton）を判定するには、段の順の記録にその段の行が要る（U1 の Functional Design の BR2.3。無ければ FAIL）。
- U1 の Code Generation は、shirube の実装の席が AI-DLC の作業場で `/aidlc --resume` して回す（iyasaka-arc#49 6353826462）。その段の出来事は、席の作業場の audit に残る。
- audit は公開の repo に載せない（6354411741）ので、git では作業場の間で渡らない。
- Owner の作業場（この会話）の audit には、Infrastructure Design までの出来事しか無い。
- 席と Owner の作業場は、同じ Mac の同じ OS user（`docs/design/aidlc-include.md` §6）。

A. 実装の席の作業場に、Owner の作業場の audit の写しを置いてから `/aidlc --resume` する（git には入れない）。
   - 作り手は、その作業場の audit だけを読む。承認の記録の PR（A）は、席が U1 の Code Generation を始めた後（I1 の後）に、その作業場で作る。
   - 作り手の設計は変えない。手順として `cicd-pipeline.md` に書く。
B. 作り手が、複数の作業場の audit の置き場を入力に取り、まとめて段の順の記録を作る。
   - Owner の作業場と席の作業場の両方を読む。
   - 作り手の決まり（U1 の Functional Design の BR5.5・BR5.6）を直すので、その段を開き直す。
C. Code Generation 以降の段は段の順の記録に載らなくてよいとし、門は PR が指す段の行が無い時、その Unit の最後の承認済みの行を前の段とみなす。
   - 受け渡しの形 C9 の決まりを直すので、Contract Design を開き直す。
X. Other (please specify)

（arc の勧め: X. 実装の席を、この Owner の作業場（`~/Developer/aidlc-owner/shirube`）で起動し、その席が同じ作業場で `/aidlc --resume` する。audit は 1 つのまま、作り手も門も設計を変えない。
理由: 決定 iyasaka-arc#49 6353826462 は「shirube の実装の席を AI-DLC の作業場で起動し、`/aidlc --resume` で U1 の Code Generation から続ける」「席の起動の場所と設定を変える」としている。`--resume` で続けられる intent の記録と audit は、今この作業場にしか無いので、席がこの作業場に来る形がこの決定の素直な読み方になる（席が別の作業場のまま、と読める所は決定に無い）。aidlc-shirube の会話は Code Generation を行わない（決定の 2）ので、2 つの会話が同じ作業場で同時に動くことは無い。
A は audit の写しを作るので、記録が 2 つに分かれ、U2 以降の設計の段でまた写す手間とずれが出る。B は作り手の決まり（BR5.5・BR5.6）を直して Functional Design を開き直す。C は門が前の段を確かめない所を作り、受け渡しの形 C9 を弱める。
席の起動の場所を決めるのは席の設定の変更（保護面）なので Owner が決める。X にする時、配布先の repo での席ごとの作業場の扱い（`docs/design/aidlc-include.md` §6）は、U6・U7 で配る時に別に決める）

[Answer]: X: 実装の席を、この Owner の作業場（`~/Developer/aidlc-owner/shirube`）で起動し、その席が同じ作業場で `/aidlc --resume` する。audit は 1 つのまま、作り手も門も設計を変えない（Owner がこの会話で arc の勧めを選んだ。席の起動の場所を変える作業は、決定 6353826462 のとおり手順を別に Owner に示す）

## Q8. [設計] 2 回目の監査の返却で決まった事を、この段の記録に写す（2026-10-24 の開き直し）

shirube PR #65 の 2 回目の監査の返却（6362354895）を受けて、Owner が選んだ事です。
- Units Generation の Q8（BF-04）: U1 の実装の PR は 4 本。順は P1 → R → I1 作り手 → A → I2 kit の自己用の書く先と `budget.mjs` → I3 記録の橋と門の判定 → K → I4 計測。確かめの PR は I4。
- U1 の NFR Design の Q8（BF-07）: 網羅率を測る試験の job と確かめの command を Node 26（26.7.0 以上）で動かす。`ci.yml` の `node-version` を "26" にする変更は P1 の中。

この段の `cicd-pipeline.md`・`infrastructure-specification.md`・`monitoring-design.md` は、その前の形（実装の PR 3 本、CI は Node 22）のままです。記録した確かめの command（Q6）の文は変えません。この Mac の Node は 26.9 なので、そのまま Node 26 で動きます。

A. 写す。PR の順の表、試験と網羅率の行（Node 26）、確かめの PR（I4）、見張りの目標の期間を揃える。新しい判断は入れない
X. Other (please specify)

[Answer]: A（Owner が Units Generation の Q8 と U1 の NFR Design の Q8 で選んだ中身を写すだけなので、ここで同じ問いを聞き直さない）

## Consolidated Summary Confirmation

- 門の呼出し: kit の部品と同じ中身（出来事・権限・呼び方）を `.github/workflows/sds-gate-self.yml` の名前で shirube に入れ、配布先と同じ形を保つ。権限は kit の部品どおり一番上に置く（job が 1 つなので効き目は job ごとと同じ）（arc の設計） [Q1]
- 同じ Unit の記録の直し（この段の中で、記録に残す）: NFR10.1 に issues・checks の読取りを足す（門の判定 3 が監査の受領を確かめるため）。NFR Design の Q4 の「一番上は権限なし」は `ci.yml` に当て、門の呼出しの workflow は kit の部品の形とする [Q1 から]
- shirube の pin の版上げ: 配布先と同じく kit の版上げの PR で上げ、決まり（#49 6308341298）のとおり監査 PASS の後に統合の担当が統合する（arc の設計） [Q2]
- `ci.yml`: 網羅率の床つきの試験を PR と main への push で動かす。計測の job は main への push と手動で動かし、既定は直近 30 日・対象は shirube（arc の設計） [Q3]
- 通し直しで決まった事を写す（監査の指摘 BF-01）:
  - PR の順を P1 → R → I1 → A → I2 → K → I3 にする。
  - 保護面の 1 本（P1）の中身を足す: AI-DLC の自己適用・大きさの数えの除外・own-code の予算・`.gitignore` の audit の除外。P1 は手で組む。
  - 網羅率の command を、`scripts/**` の全部を数える形にする。
  - （arc の下書き） [Q4]
- pin を上げる順（監査の指摘 BF-03）:
  - kit の自己用の書く先を I1 に入れる。I2 の後の kit の版上げの PR（K）で、shirube の pin を I2 の後の main に上げる。kit が書く 3 つの file も K で入る。
  - I3 が、新しい門で判定される確かめの PR になる。K は「版上げ」として扱い、Owner の手なしで統合する。
  - Delivery Planning から U1 の設計の段まで通し直した（Owner の選択） [Q5]
- 確かめの command: CI と同じ数え方に改め、Owner の言葉で先頭に `npm ci &&` を足して承認した。記録した command は `npm ci && node --test --experimental-test-coverage --test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs`（Owner の選択） [Q6]
- 段の順の記録の元の audit:
  - 実装の席を、この Owner の作業場（`~/Developer/aidlc-owner/shirube`）で起動し、同じ作業場で `/aidlc --resume` して U1 の Code Generation を回す。audit は 1 つのままで、作り手も門も設計を変えない。
  - 承認の記録の PR（A）は、席が U1 の Code Generation を始めた後（I1 の後）に、この作業場で作る。
  - 席の起動の場所を変える手順は、決定 6353826462 のとおり別に Owner に示す。（Owner の選択） [Q7]
- 2 回目の監査の返却で決まった事の写し:
  - PR の順を P1 → R → I1 → A → I2 → I3 → K → I4 にし、確かめの PR を I4 にする。K は門の判定（I3）の後で、pin を I3 の後の main に上げる。
  - `ci.yml` の網羅率を測る試験の job を Node 26（26.7.0 以上）で動かす（P1 の中）。確かめの command の文は変えず、この Mac の Node 26.9 で動かす。
  - 見張りの目標の期間を「K の後の I4 から」にする。
  - （Owner が Units Generation の Q8 と U1 の NFR Design の Q8 で選んだ） [Q8]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
