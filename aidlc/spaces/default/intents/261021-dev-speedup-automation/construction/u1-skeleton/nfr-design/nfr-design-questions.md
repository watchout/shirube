# NFR Design（U1 u1-skeleton）— 質問

U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/`）を、どういう作りで満たすかを決めます。コードの書き方は Code Generation で決めます。前提は次の 3 つです。
- U1 の設計（`construction/u1-skeleton/functional-design/`）
- 受け渡しの形（`inception/contract-design/contract-summary.md`）
- 部品の一覧（`inception/domain-design/components.md`）

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [設計] 時間の上限と予算の置き場

問い合わせ 1 回 20 秒・門の全体 5 分・計測の全体 10 分（NFR3.1〜NFR3.3）を、どこで持つかを決めます。

A. 時間の上限と予算の数え方を 1 つの部品に置き、門・記録の橋・計測がそれを使う。値は 1 か所に書き、時計を読むのは外側（CLI の入口）だけにする。核の関数は、開始の時刻と今の時刻を引数で受ける
B. 部品ごとに、自分の上限と予算を持つ
X. Other (please specify)

[Answer]: A（arc の設計。上限の値を 2 か所で別々に持たない = Shirube 開発規格 S3、NFR の段の Q1 の答え。核の関数は自分で時計を読まず、時刻は外側から渡す = S4・要件 NFR2。同じ入力から同じ結果が出るので、予算切れの場合も試験で確かめられる）

## Q2. [設計] 門の log から 1 行の JSON を見つける方法

計測は、門の workflow の log から `sds-gate-result/1` の 1 行の JSON を読みます（受け渡しの形 C3）。log には、ほかの行も混じります。

A. log の中で、`sds-gate-result/1` の schema を持つ 1 行の JSON を探す。0 行か 2 行以上なら、その PR は「観測できず」
B. log の最後の行を読む
X. Other (please specify)

[Answer]: A（arc の設計。最後の行は、workflow の後片付けの行などで変わりうる。形の名前（schema）で探し、1 行に決まらない時は「観測できず」にすれば、読み違いを PASS・FAIL に数えない = Shirube 開発規格 S5・要件 NFR1）

## Q3. [設計] repo の間の失敗の広がり

A. 計測は repo ごとに読取りと予算の残りを分けて扱い、1 つの repo の失敗が、ほかの repo の数えに広がらないようにする。全体の予算を使い切った時は、読み終えていない repo を全部「観測できず」にする
B. 1 つの repo が失敗したら、計測全体を「観測できず」で止める
X. Other (please specify)

[Answer]: A（arc の設計。一部の repo が読めない時は、読めた repo の値と「観測できず」を並べ、合計は「一部」と示すと要件で決めてある = 要件 NFR11・FR1 の受入の条件。B は 1 つの失敗で読めた値まで捨てる）

## Q4. [安全] Actions の job ごとの権限

NFR10.1・NFR10.3 で、門は commit status の書込みと読取りだけ、U1 の確かめの計測は読取りだけと決めました。workflow での持ち方を決めます。

A. workflow の一番上の permissions は全部なしにする。job ごとに要る物だけを足す。
   - 門の呼出しの job: statuses の書込みと、contents・actions・pull-requests の読取り
   - `ci.yml` の計測の job: contents・actions・pull-requests・statuses の読取りだけ
B. workflow の一番上に、全部の job に共通の権限を置く
X. Other (please specify)

[Answer]: A（arc の設計。読むだけの経路には読むだけの資格情報、書ける資格情報は配る先を絞る = Shirube 開発規格 S9。資格情報の分け方は Owner が arc の案で決めた = NFR の段の Q2。一番上に共通の権限を置くと、計測の job にも status の書込みが付いてしまう。workflow の変更は保護面で、U1 の保護面の exact-head にまとめる = 作る順番の段の Q8）

## Q5. [設計] 監査の指摘 BF-05: 網羅率の床（NFR8.2）の確かめ方を、設計の項として書く（2026-10-23 の開き直し）

監査（shirube PR #65 の sds-audit-review、BF-05）の指摘です。
- この段の対応表（`traceability.json`）で、NFR8.2（行の網羅率 80% を床にし、統合の前に CI で確かめる）の対応先を `security-design.md`・`logical-components.md` にしている。
- しかし、どちらの file にも網羅率の床の項が無い（網羅率・coverage・80% の記述が 0 件）。
- 求められていること: NFR8.2 を、確かめ方を決めた設計の項に結び直す。受入の ID の分母は減らさず、今の期待値・試験が先・CI の証拠へのつながりを保つ。

確かめた事実（この Mac の shirube の作業場、2026-10-23）:
- `npm test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs`。CI（`ci.yml`）は Node 22 で動く。
- Node の組込みで、`--experimental-test-coverage` と `--test-coverage-lines=<最低値>`（下回ると試験の実行が失敗する）・`--test-coverage-include`・`--test-coverage-include-all`（試験が読まない file も 0% として数える）が使える。
- 今の行の網羅率は、`scripts/**` を全部数えて 98.20%（試験が読まない file も含む。この Mac の Node 26.9 で測った値）。

A. `reliability-design.md` に「網羅率の床（NFR8.2）」の節を置き、対応表の NFR8.2 をこの節に結び直す。
   - 数える物: `scripts/**` の全部（`--test-coverage-include='scripts/**' --test-coverage-include-all`）。試験が読まない file も 0% として数える。
   - 床: 行の網羅率 80%（`--test-coverage-lines=80`）。下回ったら試験の job が失敗し、統合できない（fail closed）。
   - 動かす所: `ci.yml` の試験の job（PR と main への push）。Node の組込みだけで、新しい依存は足さない。`ci.yml` の変更は P1（保護面）に入る。
   - 確かめ方（負例）: Code Generation の確かめに「網羅率を 80% より下げた試しの変更で、試験の job が失敗する」ことを入れる。
   - Build and Test の段でも、この床と数える物を弱めない。
B. 数える物を U1 で足す file だけにする（`--test-coverage-include` を U1 の置き場の script に限る）。ほかは A と同じ
X. Other (please specify)

[Answer]: A（arc の設計。承認済みの記録に照らした: team.md の Testing Posture「行の網羅率 80% を床にし、統合の前に CI で確かめる。Build and Test の段でも弱めない」（Owner の決定 A = iyasaka-arc#49 6336689921）、Delivery Planning の P1 の中身（網羅率の CI は P1 = 保護面の 1 本に入る）。A は repo の script の全部を数え、試験が読まない file も 0% として数えるので、試験の無い file が数えから漏れない。今の値は 98.20% で、入れた時から床を満たす。B は U1 で足す file だけを数えるので、既にある script の網羅率が下がっても止まらず、決まりの「床」を狭めることになる。負例（80% より下げた試しの変更で試験の job が失敗する）を Code Generation の確かめに入れるのは、Shirube 開発規格 S8（失敗を隠さない）と S5（観測した事実で判定する）に合う）

## Q6. [設計] 監査の指摘 BF-04: U1 の大きさの見積もりへの対応を結び直す（2026-10-23 の開き直し）

監査の指摘 BF-04 を受けて、U1 の NFR Requirements の `tech-stack-decisions.md` に「大きさの見積もり」の節を置きました（P1・R・I1・A・I2・I3 の表、own-code の増分 約 550〜750 行、予算は P1 で 1 回だけ改める）。この段の対応表では、NFR6.1（own-code の予算）と NFR7.1（PR と関数の大きさ）を「Code Generation の計画で出す」として Deferred にしたままです。監査は、この先送りを指摘しました。

A. `logical-components.md` に「PR ごとの置き方」の節を置く。
   - 見積もりの表の PR（P1・I1〜I3）に、部品と file を割り当てる。
   - 対応表の NFR6.1・NFR7.1 を Deferred から OK に変え、この節と `tech-stack-decisions.md` の見積もりに結ぶ。
   - 実装の PR が 400 行を超える見込みになった時の分け方は、Code Generation の計画で試験と実装の分け方を見直す（U1 の PR の数は変えない）。
B. 対応表の NFR6.1・NFR7.1 は Deferred のまま、対応先の文だけを `tech-stack-decisions.md` の見積もりを指す形に直す
X. Other (please specify)

[Answer]: A（arc の設計。監査の指摘 BF-04 は「大きさを Code Generation の計画へ先送りしている」こと自体なので、B（Deferred のまま文だけ直す）では指摘が残る。A は U1 の NFR Requirements の見積もりの表（Q6・Q8）と、Units Generation の Q7（U1 は保護面の 1 本と実装の PR 3 本まで）・Delivery Planning の Q10（PR の順）に合わせて、部品と file を PR に割り当てるだけで、新しい判断は入らない。400 行を超える見込みになった時も、U1 の PR の数は変えず、試験と実装の分け方で収める）

## Q7. [設計] PR ごとの置き方を、4 回目の開き直しで決まった順と見積もりに写す（2026-10-23）

Delivery Planning の Q11（U1 の Infrastructure Design の Q5 = A で Owner が選んだ）と、U1 の NFR Requirements の Q9 で、次が決まりました。
- 順: P1 → R → I1（作り手と kit の自己用の書く先）→ A → I2（記録の橋と門の判定）→ K（kit の版上げの PR、Unit を指さない）→ I3（計測）。
- `budget.mjs` は、それを使う I2 に置くのを既定とし、Code Generation の計画で I1・I2 を見積もり直して小さい方に置く。
- 見積もり: I1 約 320〜400 行、I2 約 410〜480 行、K 約 110〜115 行、I3 約 290〜350 行。I2 が 400 行の上限に当たる見込みで、3 本の合計が 1,200 行を超える時は Owner に伺う。

この段の `logical-components.md` の「PR ごとの置き方」は、その前の順（kit の自己用の書く先が I3、`budget.mjs` が I1、K が無い）のままです。

A. 写す。PR ごとの置き方の表を、上の順・中身・見積もりに揃え、K の行と注意を足す。新しい判断は入れない
X. Other (please specify)

[Answer]: A（Delivery Planning の Q11 と U1 の NFR Requirements の Q9 は、Owner がこの会話で選び、要約を確かめた中身。写すだけなので、ここで同じ問いを聞き直さない）

## Q8. [設計] 監査の指摘 BF-07: 網羅率の確かめの command が CI の Node 22 で動かない（2026-10-23 の 4 回目の開き直し）

監査（shirube PR #65 の返却 https://github.com/watchout/shirube/pull/65#issuecomment-6362354895 の BF-07。前の返却 6362007900 の BF-06 も同じ指摘）です。
- Q5 で決めた数え方は `--test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80`。
- `--test-coverage-include-all` は Node 26.7.0 で足された機能。監査の席が確かめた結果は次のとおり。
  - Node v22.23.2・v24.20.0: 試験が始まる前に `bad option` で止まる（exit 9）。
  - Node v26.9.0: 動く。
- shirube の CI（`ci.yml`）は Node 22 で動く。98.20% は、この Mac の Node 26.9 で測った値。
- 求められていること: 採択した数え方（80%・`scripts/**` の全部・試験が読まない file も 0%）を保ったまま、Node の版と使える測り方を揃える。選んだ版で、正しく動くことと床を下回った時に止まることを確かめる計画にする。CI の設定は P1 の exact-head の手順に結ぶ。床や数える物は弱めない。
- 参考: `--test-coverage-include`・`--test-coverage-exclude` は Node 22.5.0 から、`--test-coverage-lines` は Node 22.8.0 からある（Node の文書）。

A. 網羅率を測る試験の job と確かめの command を、Node 26（26.7.0 以上）で動かす。
   - `ci.yml` の `node-version` を "26" にする（P1 の中、保護面、Owner の exact-head）。
   - `package.json` の engines（Node 22 以上）は変えない。
   - P1 の CI で、正しく動くことと、床を下回った試しの変更で止まることを確かめる。
B. Node 22 のまま、`--test-coverage-include-all` を使わない。
   - 代わりに、`scripts/**` の全部の file を読み込む試験を足して、試験が読まない file を無くす（数え方は `--test-coverage-include='scripts/**' --test-coverage-lines=80`）。
   - 全部の file が数えに入っているかは、その試験が `scripts/**` の file の一覧と照らして確かめる。
   - 読み込んだ時に CLI として動き出す script が無いかを、file ごとに確かめる要がある。
   - 試験の file が 1 つ増え、U1 の PR の大きさにも入る。
X. Other (please specify)

[Answer]: A（Owner が選んだ。網羅率を測る試験の job と確かめの command を Node 26（26.7.0 以上）で動かす。ci.yml の node-version を 26 にする変更は P1（保護面、Owner の exact-head）の中。package.json の engines は変えない。数え方と 80% の床は変えない。arc が質問ボードで噛み砕いて聞いた（2026-10-24））

## Q9. [設計] PR ごとの置き方を、実装の PR 4 本の分け方に写す（2026-10-24 の開き直し）

Units Generation の Q8（監査の指摘 BF-04）で、Owner が U1 の実装の PR を 4 本までにしました（I1 作り手 / I2 kit の自己用の書く先と `budget.mjs` / I3 記録の橋と門の判定 / I4 計測、順は P1 → R → I1 → A → I2 → I3 → K → I4）。この段の `logical-components.md` の「PR ごとの置き方」は、その前の 3 本の形（I2 が 400 行の上限に当たる見込みの注意つき）のままです。

A. 写す。表を 4 本の分け方と U1 の NFR Requirements の Q10 の見積もりに揃え、上限に当たる見込みの注意を外す。新しい判断は入れない
X. Other (please specify)

[Answer]: A（Owner が Units Generation の Q8 で選んだ中身を写すだけなので、ここで同じ問いを聞き直さない）

## Consolidated Summary Confirmation

- 時間の上限と予算: 1 つの共通の部品に置き、門・記録の橋・計測が使う。値は 1 か所、時計を読むのは CLI の入口だけで、核の関数は開始の時刻と今の時刻を引数で受ける（arc の設計） [Q1]
- 共通の部品の置き場: `scripts/sds/budget.mjs` を新しく置く。U1 の変えてよい置き場（`functional-design/functional-spec.md` の `sds-design-locations` の block）にこの path を足す（同じ Unit の設計の記録を、この段の中で直す） [Q1 から]
- log の 1 行の JSON: `sds-gate-result/1` の schema を持つ行を探し、0 行か 2 行以上なら「観測できず」（arc の設計） [Q2]
- repo の間の失敗: repo ごとに読取りと予算の残りを分け、1 つの失敗をほかに広げない。全体の予算を使い切ったら、読み終えていない repo を全部「観測できず」（arc の設計） [Q3]
- Actions の権限: workflow の一番上は権限なし。job ごとに、門の呼出しは statuses の書込みと読取り、`ci.yml` の計測の job は読取りだけ（arc の設計） [Q4]
- 網羅率の床（監査の指摘 BF-05）: `reliability-design.md` に「網羅率の床（NFR8.2）」の節を置き、対応表の NFR8.2 をこの節に結び直す。
  - 数える物: `scripts/**` の全部。試験が読まない file も 0% として数える。
  - 床: 行の網羅率 80%。下回ったら試験の job が失敗し、統合できない。
  - 動かす所: `ci.yml` の試験の job（PR と main への push）。Node の組込みだけ。`ci.yml` の変更は P1 に入る。
  - 確かめ方: 網羅率を下げた試しの変更で試験の job が失敗することを、Code Generation の確かめに入れる。Build and Test でも弱めない。
  - 今の値は 98.20%。（arc の設計） [Q5]
- 大きさの見積もりへの対応（監査の指摘 BF-04）: `logical-components.md` に「PR ごとの置き方」の節を置き、見積もりの表の PR（P1・I1〜I3）に部品と file を割り当てる。対応表の NFR6.1・NFR7.1 を Deferred から OK に変える。400 行を超える見込みの時は、U1 の PR の数を変えずに試験と実装の分け方で収める（arc の設計） [Q6]
- PR ごとの置き方の直し（4 回目の開き直し）: 表を P1 → R → I1（作り手と kit の自己用の書く先）→ A → I2（記録の橋・門の判定・`budget.mjs` を既定）→ K（Unit を指さない kit の版上げ）→ I3（計測）に揃え、見積もりを U1 の NFR Requirements の Q9 の値にする。I2 が 400 行の上限に当たる見込みと、3 本の合計が 1,200 行を超える時は Owner に伺うことを注意として書く（Delivery Planning の Q11、NFR Requirements の Q9） [Q7]
- 網羅率の Node の版（監査の指摘 BF-07）: 網羅率を測る試験の job と確かめの command を Node 26（26.7.0 以上）で動かす。`ci.yml` の `node-version` を 26 にする変更は P1（保護面、Owner の exact-head）の中。`package.json` の engines は変えない。数え方（`scripts/**` の全部、試験が読まない file も 0%）と 80% の床は変えない。P1 の CI で、正しく動くことと床を下回った試しで止まることを確かめる（Owner の選択） [Q8]
- PR ごとの置き方の直し（監査の指摘 BF-04）: 表を実装の PR 4 本（I1 作り手 / I2 kit の自己用の書く先と `budget.mjs` / I3 記録の橋と門の判定 / I4 計測）にし、順を P1 → R → I1 → A → I2 → I3 → K → I4 にする。どの PR も上の端で 400 行以内なので、Q7 の「上限に当たる見込み」の注意を外す（Units Generation の Q8 の写し） [Q9]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
