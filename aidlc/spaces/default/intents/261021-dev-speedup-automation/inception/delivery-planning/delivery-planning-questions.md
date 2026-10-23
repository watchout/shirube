# Delivery Planning — 作る順番と計画の質問

Inception の最後の段です。承認済みの 7 つの Unit（`inception/units-generation/unit-of-work.md`）と依存（`unit-of-work-dependency.md`）を、どの順で作るかを決めます。順番は、作業を「Bolt」（作る 1 回分。終わると動く物ができる）に分けて並べます。依存の輪は無く、待つ関係は次のとおりです。
- U2・U3 は U1 を待つ。
- U4 は U1・U3 を待つ。
- U6・U7 は U4 を待つ。
- U5 はどれも待たない。

前提（決まっていること）:
- 最初の Unit は U1（端から端まで通る細い版。部品がつながって最後まで動くことを、機能を足す前に確かめる最小の版）。
- 門で止め始める前に、今の値を測る（実現性の条件 C3）。
- shirube の Unit（U1〜U5）は同じ shirube の実装の席が作るので順に進める。U6・U7 は aun・Onza の席。
- 完了の条件は S1-SH-01〜07。Owner の手は 1 周 6 回まで（S1-SH-07）。
- 行の網羅率 80% を床にし、統合の前に CI で確かめる（iyasaka-arc#49 6336689921）。CI への組込みは保護面。

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`、複数なら `A, C`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [進め方] 何から作るか

A. 細い版（U1）→ 計測（U2。門で止め始める前に今の値を測る）→ 記録の橋と承認の記録（U3）→ 門の判定の追加と shirube 自身への適用（U4）→ aun・onza への配布（U6・U7）。U5 は U1 の後の空いた所に入れる
B. 細い版（U1）→ 記録の橋（U3）→ 門の判定（U4）→ 配布（U6・U7）を先に通し、計測（U2）は配布と同じ頃に作る
C. 細い版（U1）の後は、価値の大きい物から並べる（並べ方は arc に任せる）
X. Other (please specify)

[Answer]: A（arc の設計。門で止め始める前に今の値を測る = 実現性の条件 C3。計測（U2）を門の判定の追加（U4）より前に置けば、止める形にする前の値がそろう。U5 はどれも待たないので、同じ席の空いた所に入れる = 作業の単位の段の Q4「同じ席に 2 つを同時に渡さない」）

## Q2. [進め方] 順番の決め方の物差し

A. 点数の型は使わない。依存の順、実現性の条件（測ってから止める）、完了の条件（S1-SH-01〜07）への効き方の 3 つで決める
B. WSJF（価値・急ぎ・危うさの減り方を足し、大きさで割った点数の高い順。Reinertsen / SAFe の型）で点数を付けて並べる
X. Other (please specify)

[Answer]: A（arc の設計。7 つの Unit は依存でほぼ順が決まり、点数で並べ替えられる所が少ない。点数を付ける手間を足さず、依存・C3・S1-SH-01〜07 への効き方で決める）

## Q3. [進め方] 1 つの Bolt の大きさ

A. 1 つの Bolt = 1 つの Unit
B. U6・U7（配布）は 1 つの Bolt にまとめ、ほかは 1 つの Unit ずつ
X. Other (please specify)

[Answer]: A（arc の設計。U6 と U7 は repo も作る席も違い、監査と統合も repo ごとに通る = 作業の単位の段の Q6。まとめると片方の待ちがもう片方を止める）

## Q4. [Owner] Owner の手（1 周 6 回まで）の内訳

1 周の間に Owner の手が要る候補を並べると、6 回を超える見込みがあります。
1. own-code の予算の改め（Units Generation の Q5）
2. shirube 自身への適用の保護面（pin・workflow）の exact-head
3. aun の最初の導入の exact-head
4. onza の最初の導入の exact-head
5. shirube で門を止める形にする切り替え
6. aun で門を止める形にする切り替え（S1-SH-01 は Shirube と AUN）
7. 網羅率の検査を CI に入れる exact-head（shirube・aun・onza）
8. 監査の席に分類の役を足す決定（FR5.4）

A. 保護面の変更は repo ごとに 1 本の PR にまとめ、exact-head を repo ごとに 1 回にする。
   - shirube: 2・7・8 を 1 回にまとめる
   - aun: 3・7 を 1 回にまとめる
   - onza: 4・7 を 1 回にまとめる
   - 切り替え: 5・6 を 2 回
   - 予算: 1 を 1 回
   - 合計 6 回
B. A に加え、切り替えも、目安を満たした repo から 1 回にまとめて伺う（合計 5 回）
C. 6 回に収まらない見込みを Owner に伺い直し、上限を見直す
X. Other (please specify)

（arc の勧め: B。止める形への切り替えは、S1-SH-01 が Shirube と AUN の両方を求めているので、目安を満たした所で 1 回にまとめても完了の条件は変わらない。合計 5 回にすれば、見込み違いが 1 つ出ても 6 回の上限に収まる。上限は Owner が決めた物 = iyasaka-arc#49 6306226221 なので、内訳は Owner が選ぶ）

[Answer]: B

## Q5. [外] 外からの待ち (select all that apply)

この取り組みの外の担当や決定を待つ物です。

A. W2 の道具（iyasaka-arc 側）が計測を呼んで #53 に載せる変更（U2 の結果を Owner が見られるようになるのに要る）
B. aun の席と Onza の席が、配布の Unit（U6・U7）を受け持てること
C. Owner の exact-head と切り替えの決定（Q4 の内訳）
D. AI-DLC の版を上げる時の audit の形の確かめ（承認の記録の作り手が依存する）
X. Other (please specify)

[Answer]: A, B, C, D（arc の設計。A は W2 の道具が計測を呼ぶ変更で、計測の結果を Owner が #53 で見るのに要る = ADR-003。B は配布を各 repo の席が受け持つこと = 作業の単位の段の Q6。C は Q4 の内訳。D は承認の記録の作り手が AI-DLC の audit の形に頼っていること = ADR-005 の悪い点）

## Q6. [進め方] 一番の心配（早めに手を打つ物） (select all that apply)

A. 門が正しい PR を止めてしまう（誤って止める回数 0 が守れない）
B. Owner の手が 6 回を超える
C. own-code の予算（残り約 362 行）を超える
D. AI-DLC の版の変化で、記録の橋や承認の記録が壊れる
E. 今の値（9/21〜10/20 の 101 件）を測る前に、門で止め始めてしまう
X. Other (please specify)

[Answer]: A, B, C（arc の設計。A は完了の条件 S1-SH-04「正しい PR は止まらない」に直に効く。B は S1-SH-07。C は残り約 362 行で新しい部品 4 つを作る見込み = 要件 NFR6。D は AI-DLC の版を固定しているので 1 周の間は起きにくい。E は Q1 の順で計測を先に置くので防げる）

## Q7. [進め方] 細い版（U1）が通ったことの確かめ方

A. shirube の実際の PR 1 本に AI-DLC の記録の欄を書き、次の 3 つを、門の log と計測の出力で確かめる。
   - 門が記録だけで判定する
   - 承認の記録を読む
   - 計測がその status を数えて出す
B. 試験の入力（fixture）だけで確かめ、実際の PR は U4 で通す
X. Other (please specify)

[Answer]: A（arc の設計。細い版は、部品が実際につながって最後まで動くことを確かめる物 = 進め方の段の決まり。試験の入力だけでは、workflow の log・commit status・計測の読取りのつながりを確かめられない。門は記録だけ（report-only）で動くので、実際の PR を止めない）

## Q8. [進め方] U1 で実際の PR に門を通すための保護面の変更（Q7 の追加の確認）

今の shirube は、自分の PR で門を動かしていません。`.github/workflows/sds-gate.yml` は配布先から呼ばれる形（workflow_call）だけで、shirube 自身の呼出しがありません。Q7 の A のとおり U1 で shirube の実際の PR に門の status と log を出すには、門の呼出しの workflow（と pin）が要ります。どちらも保護面で、Owner の exact-head が要ります。これは、U1 の「保護面に触れない」と、shirube の exact-head を U4 で 1 回にまとめる内訳（Q4 = B）と食い違います。

A. shirube の門の呼出しと pin（記録だけ）を U1 に入れる。shirube の保護面の exact-head（Q4 の 2・7・8 をまとめた 1 回）を U1 で行い、U4 は保護面に触れない形にする。回数は Q4 の B のまま 5 回
B. U1 では、門を CLI で手で動かして実際の PR を判定させ（commit status は付かない）、計測はその出力を読む形で確かめる。workflow の log と commit status のつながりは U4 で確かめる
C. U1 の確かめを、試験の入力（fixture）だけにする（Q7 を B に替える）
X. Other (please specify)

[Answer]: A（arc の設計。細い版は、workflow・commit status・計測の読取りが実際につながることを、機能を足す前に確かめる物 = 進め方の段の決まり。B では、そのつながりを確かめるのが U4 まで遅れ、細い版の意味が薄れる。A でも shirube の保護面の exact-head は 1 回のままで、Q4 = B の合計 5 回は変わらない。門は記録だけ（report-only）で動くので、正しい PR を止めない。shirube 自身が門を通る（S1-SH-06）ことも U1 から測れる。U1 は保護面に触れることになるので、U1 の PR は R4 として Owner の exact-head を通す）

## Q9. [進め方] 前の承認の後に決まった事を計画に写すか（通し直し）

この段の前の承認（2026-10-22）の後に、次の 3 つが決まりました。
- iyasaka-arc#49 6354019047 の 4: 保護面の 1 本の PR に、次の 3 つをまとめ、Owner の exact-head は 1 回にする。順番は、保護面の 1 本 → 記録の PR → U1 の実装の PR。
  - AI-DLC の自己適用の file
  - 大きさの数えの除外（`exclude_generated`）
  - U1 の保護面（門の呼出し・pin・網羅率の CI と計測の job）
- 6354411741 の 2: `.gitignore` の audit の除外を、その保護面の PR に同梱する（audit の記録は公開の repo に載せない）。
- Contract Design の開き直しで足した C9: 記録を入れる PR に、段の順の記録（`approvals/<intent>/_sequence.json`）を含める。

A. 写す。B1 の中身と PR の順を上の 3 つに揃える。Owner の手は 1 周 5 回の予定のまま（保護面の exact-head は shirube で 1 回）
X. Other (please specify)

[Answer]: A（arc の下書き。3 つとも Owner が決めて #49 に記録済みの事（6354019047 の 4、6354411741 の 2）と、この開き直しで承認した C9 を計画に写すだけで、新しい判断は入らない = OD-ROUTES-G4-ADOPT-AND-REFLECT-WITHOUT-CONFIRM-20261020-001 の考え方。あわせて、10/22 にこの段の中で Units Generation の unit-of-work.md（U1・U4 の注意の行）を直した事を、この段の memory.md の Deviations に 1 行残す。AI-DLC の決まりでは前の段に及ぶ変更は段を戻して通し直すが、この直しは 10/22 のこの段の承認で Owner が受けた物で、今回の開き直しでは中身を変えない）

## Q10. [進め方] U1 の PR の順と、own-code の予算を伺う時点（2026-10-23 の 2 回目の開き直し）

経緯:
- U1 の NFR Requirements で、監査の指摘 BF-04 を受けて U1 の大きさを見積もった（Q6 の arc の下書き。実装の実測ではない）。
- その結果を受けて、Units Generation を開き直した（Q7 = A）。U1 は保護面の 1 本と実装の PR 3 本まで。

今の計画（Q9）のままでは、次の 2 つが成り立ちません。
1. **記録の PR の順**: 承認の記録と段の順の記録は、作り手の CLI で作る（U1 の Functional Design の Q4、ADR-005。手で写さない）。
   - その CLI は、U1 の最初の実装の PR（I1）で初めてできる。
   - 「記録の PR → U1 の実装の PR」（Q9、iyasaka-arc#49 6354019047 の 4）の順では、承認の記録を実装の前に main に入れられない。
2. **予算を伺う時点**: own-code の増分は U1 だけで約 550〜750 行の見込みで、残り 362 行を超える。
   - 今の計画では、予算の改めは B2 の見積もりの後（Owner の手の 2 回目）。
   - それより前に、U1 の実装の PR が予算を超えてしまう。

どちらの案でも、PR の順は次のとおりにします。
- P1: 保護面の 1 本（Owner の exact-head）
- R: 記録の PR（AI-DLC の記録。audit は載せない）
- I1: 承認の記録と段の順の記録の作り手
- A: 承認の記録の PR（I1 の CLI で作った承認の記録と段の順の記録）
- I2: 記録の橋と門の判定
- I3: 計測と、kit の自己用の書く先

決定 6354019047 の 4 の順を改めることは、この段の承認の後に arc が #49 に記録します。

A. 予算は、S1 全体の own-code の見積もりを出したうえで、P1 の `.shirube/hygiene-profile.md` の変更の中で 1 回だけ改める。
   - P1 自身の own-code の増分（約 50 行）は今の予算に収まるので、「検査の閾値を緩める変更を同じ PR で行わない」に当たらない。
   - 予算の決定は P1 の exact-head に入る。Owner の手は 1 周 4 回の予定になる。
B. 予算は、S1 全体の own-code の見積もりを出したうえで、P1 の前の別の PR（R3、Owner の exact-head）で 1 回だけ改める。
   - Owner の手の 2 回目を P1 の前に移す。回数は 5 回のまま。
X. Other (please specify)

[Answer]: A（arc の設計。Owner は「保護面の変更を 1 本の PR にまとめ、exact-head は 1 回にする」と決めている = iyasaka-arc#49 6354019047 の 4。予算の値は P1 がもう変える `.shirube/hygiene-profile.md` の中にあり、同じ file の保護面の変更を 2 本に分ける理由が無い。P1 自身の own-code の増分（約 50 行）は今の予算に収まるので、「検査の閾値を緩める変更を、それで通す PR と同じ PR で行わない」には当たらない。A なら Owner の手は 1 周 4 回の予定になり、計測の専用の資格情報の決定（U1 の NFR Requirements の Q2）が別の 1 回になっても 5 回で、上限 6 回に余裕が残る。予算の値そのものは、P1 を出す時に S1 全体の own-code の見積もりを添えて Owner が exact-head で決める。B は予算だけの PR に 1 回使い、資格情報の決定が入ると上限ちょうどの 6 回になる）

## Q11. [進め方] 新しい門のコードで判定される確かめの PR のための、pin を上げる順（2026-10-23 の 3 回目の開き直し）

U1 の Infrastructure Design で分かったことです（監査の指摘 BF-03）。
- shirube の門は、base の `sds-gate-self.yml` が固定した shirube の commit から動く。P1 で固定するのは U1 の前の commit。
- I2（記録の橋と門の記録の判定）を統合しても、pin を上げるまで、その後の PR は U1 の前の門で判定される。
- Owner の手の要らない kit の版上げの PR（K、決まり iyasaka-arc#49 6308341298 の 1）は、kit の自己用の書く先ができてからでないと出せない。Q10 の順では、それが I3 に入る。
- そのため Q10 の順では、U1 の実装の PR（I1〜I3）はどれも新しい門で判定されない。U1 の Functional Design の Q6（U1 の残りの実装の PR で確かめる）と、B1 の済みの条件が成り立たない。

A. kit の自己用の書く先を I3 から I1 へ移し、I2 と I3 の間に K を入れる。
   - 順: P1 → R → I1（承認の記録と段の順の記録の作り手、kit の自己用の書く先）→ A → I2（記録の橋と門の判定）→ K → I3（計測）。
   - K は、shirube の pin を I2 の後の main に上げ、kit で呼出しを書き、kit が書く 3 つの file（sds-audit の skill・PR の雛形・`AGENTS.md`）を入れる。
   - K は「最初の導入」ではなく「版上げ」として扱い、Owner の手は要らない。Unit を指さない kit の版上げの PR なので、U1 の PR の数（保護面の 1 本と実装の PR 3 本）に数えない。
   - I3 が、新しい門で判定される確かめの PR になる（U1 の Functional Design の Q6 のまま）。
   - Owner の手は 4 回の予定のまま。
   - `budget.mjs` をどの PR に置くかと、I1 が 400 行を超えないかは、U1 の NFR の段で見積もり直す。
X. Other (please specify)

[Answer]: A（Owner が U1 の Infrastructure Design の Q5 で A を選んだ中身。ここで同じ問いを聞き直さない）

## Q12. [進め方] U1 の実装の PR を 4 本にした分け方と順を写す（2026-10-24 の 5 回目の開き直し）

監査の指摘 BF-04（shirube PR #65 の返却 6362354895）を受けて、Units Generation の Q8 で Owner が選んだ事です。
- U1 は、保護面の 1 本と実装の PR 4 本まで。1 本 400 行・20 file の上限は変えない。
- 分け方: I1 作り手 / I2 kit の自己用の書く先と `budget.mjs` / I3 記録の橋と門の判定 / I4 計測。
- 順: P1 → R → I1 → A → I2 → I3 → K → I4。K は門の判定（I3）の後で、I4 が新しい門で判定される確かめの PR。

あわせて、U1 の NFR Design の Q8（監査の指摘 BF-07 = Node 22 で網羅率の command が動かない）で Owner が選んだ事があります。網羅率を測る試験の job と確かめの command を Node 26 で動かすので、P1 の `ci.yml` の変更に Node の版の変更（22 → 26）が加わります。

A. 写す。B1 の中身・PR の順・済みの条件・確かめの PR（I4）を、上の分け方と順に揃える。P1 の中身に、`ci.yml` の Node の版の変更を足す。新しい判断は入れない
X. Other (please specify)

[Answer]: A（Owner が Units Generation の Q8 と U1 の NFR Design の Q8 で選んだ中身を写すだけなので、ここで同じ問いを聞き直さない）

## Consolidated Summary Confirmation

- 作る順番: U1（細い版）→ U2（計測。門で止め始める前に今の値を測る）→ U3（記録の橋と承認の記録）→ U4（門の判定の追加）→ U6・U7（aun・onza への配布）。U5 は U1 の後、同じ席の空いた所に入れる（arc の設計） [Q1]
- 順番の物差し: 点数の型は使わず、依存の順・実現性の条件 C3・完了の条件への効き方で決める（arc の設計） [Q2]
- Bolt の大きさ: 1 つの Bolt = 1 つの Unit（arc の設計） [Q3]
- Owner の手の内訳: 保護面の変更は repo ごとに 1 本にまとめ（shirube・aun・onza で 3 回）、門を止める形への切り替えは目安を満たした所で 1 回にまとめ、予算の改めが 1 回。合計 5 回。**Q10 で改めた**: 予算の改めは shirube の保護面の 1 本（P1）の exact-head に入り、合計 4 回の予定 [Q4、Q10]
- 外からの待ち: W2 の道具の変更、aun・Onza の席の受け持ち、Owner の exact-head と切り替え、AI-DLC の版を上げる時の audit の形の確かめ（arc の設計） [Q5]
- 一番の心配: 門が正しい PR を止めること、Owner の手が上限を超えること、own-code の予算を超えること（arc の設計） [Q6]
- U1 の確かめ方: shirube の実際の PR 1 本で、門が記録だけで判定し、承認の記録を読み、計測が status を数えて出すことを、門の log と計測の出力で確かめる（arc の設計） [Q7]
- U1 の保護面: shirube の門の呼出しと pin（記録だけ）を U1 に入れ、shirube の保護面の exact-head（予算以外の shirube の保護面の変更・網羅率の CI・分類の役の決定をまとめた 1 回）を U1 で行う。U4 は保護面に触れない。合計は 5 回のまま。**Q10 で改めた**: 「予算以外」を外し、予算の改めもこの 1 回に入れる [Q8、Q10]
- 承認済みの記録の直し: Units Generation の unit-of-work.md の U1・U4 の注意の行（保護面の扱い）を、この段の中で Q8 に合わせて直し、直した事を記録に残す（段は開き直さない）
- 通し直しで写す事（2026-10-23）: 保護面の 1 本の PR に、AI-DLC の自己適用の file・大きさの数えの除外・U1 の保護面・`.gitignore` の audit の除外をまとめ、順番は保護面の 1 本 → 記録の PR（C9 の段の順の記録を含む）→ U1 の実装の PR とする（#49 6354019047 の 4、6354411741 の 2）。Owner の手は 1 周 5 回の予定のまま。10/22 の unit-of-work.md の直しは、この段の memory.md の Deviations に 1 行残し、開き直さない。**PR の順は Q10 で改めた** [Q9、Q10]
- U1 の PR の順と予算（2026-10-23 の 2 回目の開き直し）:
  - 順: P1 保護面の 1 本 → R 記録の PR（AI-DLC の記録、audit は載せない）→ I1 作り手 → A 承認の記録の PR（I1 の CLI で作った承認の記録と段の順の記録）→ I2 記録の橋と門の判定 → I3 計測と kit の自己用の書く先。
    - 理由: 承認の記録は CLI で作り、その CLI は I1 で初めてできる。
    - 決定 6354019047 の 4 の順の改めは、この段の承認の後に arc が #49 に記録する。
  - 予算: S1 全体の own-code の見積もりを添えて、P1 の `.shirube/hygiene-profile.md` の中で 1 回だけ改め、P1 の exact-head で Owner が値を決める。
    - P1 自身の増分（約 50 行）は今の予算に収まるので、閾値を同じ PR で緩める決まりに当たらない。
  - Owner の手は 1 周 4 回の予定。計測の専用の資格情報の決定が別の 1 回になっても 5 回。
  - （arc の設計） [Q10]
- pin を上げる順（2026-10-23 の 3 回目の開き直し、Q10 の順と中身を改める）:
  - 順: P1 → R → I1（作り手と kit の自己用の書く先）→ A → I2（記録の橋と門の判定）→ K（kit の版上げの PR）→ I3（計測）。
  - K で shirube の pin を I2 の後の main に上げ、kit が書く 3 つの file も入れる。K は「版上げ」として扱い、Owner の手は要らず、U1 の PR の数に数えない。
  - I3 が、新しい門で判定される確かめの PR になる。
  - Owner の手は 4 回の予定のまま。`budget.mjs` の置き場と I1 の大きさは、U1 の NFR の段で見積もり直す。
  - （Owner が U1 の Infrastructure Design の Q5 = A で選んだ） [Q11]
- U1 の実装の PR を 4 本に（2026-10-24 の 5 回目の開き直し、監査の指摘 BF-04。Q10・Q11 の順と中身を改める）:
  - 分け方: I1 作り手 / I2 kit の自己用の書く先と `budget.mjs` / I3 記録の橋と門の判定 / I4 計測。1 本 400 行・20 file の上限は変えない。
  - 順: P1 → R → I1 → A → I2 → I3 → K → I4。K は I3 の後で、I4 が新しい門で判定される確かめの PR。
  - P1 の `ci.yml` の変更に、網羅率を測る試験の job の Node の版の変更（22 → 26）を足す（U1 の NFR Design の Q8、監査の指摘 BF-07）。
  - Owner の手は 4 回の予定のまま。
  - （Owner が Units Generation の Q8 と U1 の NFR Design の Q8 で選んだ） [Q12]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
