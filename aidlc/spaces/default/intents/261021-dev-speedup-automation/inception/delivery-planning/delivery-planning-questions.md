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

## Consolidated Summary Confirmation

- 作る順番: U1（細い版）→ U2（計測。門で止め始める前に今の値を測る）→ U3（記録の橋と承認の記録）→ U4（門の判定の追加）→ U6・U7（aun・onza への配布）。U5 は U1 の後、同じ席の空いた所に入れる（arc の設計） [Q1]
- 順番の物差し: 点数の型は使わず、依存の順・実現性の条件 C3・完了の条件への効き方で決める（arc の設計） [Q2]
- Bolt の大きさ: 1 つの Bolt = 1 つの Unit（arc の設計） [Q3]
- Owner の手の内訳: 保護面の変更は repo ごとに 1 本にまとめ（shirube・aun・onza で 3 回）、門を止める形への切り替えは目安を満たした所で 1 回にまとめ、予算の改めが 1 回。合計 5 回 [Q4]
- 外からの待ち: W2 の道具の変更、aun・Onza の席の受け持ち、Owner の exact-head と切り替え、AI-DLC の版を上げる時の audit の形の確かめ（arc の設計） [Q5]
- 一番の心配: 門が正しい PR を止めること、Owner の手が上限を超えること、own-code の予算を超えること（arc の設計） [Q6]
- U1 の確かめ方: shirube の実際の PR 1 本で、門が記録だけで判定し、承認の記録を読み、計測が status を数えて出すことを、門の log と計測の出力で確かめる（arc の設計） [Q7]
- U1 の保護面: shirube の門の呼出しと pin（記録だけ）を U1 に入れ、shirube の保護面の exact-head（予算以外の shirube の保護面の変更・網羅率の CI・分類の役の決定をまとめた 1 回）を U1 で行う。U4 は保護面に触れない。合計は 5 回のまま [Q8]
- 承認済みの記録の直し: Units Generation の unit-of-work.md の U1・U4 の注意の行（保護面の扱い）を、この段の中で Q8 に合わせて直し、直した事を記録に残す（段は開き直さない）

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
