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

## Consolidated Summary Confirmation

- 門の呼出し: kit の部品と同じ中身（出来事・権限・呼び方）を `.github/workflows/sds-gate-self.yml` の名前で shirube に入れ、配布先と同じ形を保つ。権限は kit の部品どおり一番上に置く（job が 1 つなので効き目は job ごとと同じ）（arc の設計） [Q1]
- 同じ Unit の記録の直し（この段の中で、記録に残す）: NFR10.1 に issues・checks の読取りを足す（門の判定 3 が監査の受領を確かめるため）。NFR Design の Q4 の「一番上は権限なし」は `ci.yml` に当て、門の呼出しの workflow は kit の部品の形とする [Q1 から]
- shirube の pin の版上げ: 配布先と同じく kit の版上げの PR で上げ、決まり（#49 6308341298）のとおり監査 PASS の後に統合の担当が統合する（arc の設計） [Q2]
- `ci.yml`: 網羅率の床つきの試験を PR と main への push で動かす。計測の job は main への push と手動で動かし、既定は直近 30 日・対象は shirube（arc の設計） [Q3]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
