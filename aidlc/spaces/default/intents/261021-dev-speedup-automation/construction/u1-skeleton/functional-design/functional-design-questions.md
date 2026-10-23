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

## Consolidated Summary Confirmation

- 確かめる承認: PR が指す段の、直前の段の承認の記録（要件 FR2.1 のとおり）（arc の設計） [Q1]
- 承認の記録を読む場所: PR の base（main）にある記録だけ。承認の記録は、実装の PR より前に、記録を入れる PR で main に入れる（PR の中で自分の承認を足して通せないように）（arc の設計） [Q2]
- 開き直した段: 一番新しい試行の承認の記録があれば承認済み。古い試行の承認しか無ければ FAIL で、足りない記録として新しい試行の番号を出す（arc の設計） [Q3]
- 承認の記録の作り手: U1 で CLI の最小の形（AI-DLC の audit の 1 つの段の承認から 1 つの file）を作り、全部の形と FAIL の扱いは U3 で仕上げる（arc の設計） [Q4]
- 計測の最小の形: 指定した repo と期間の統合された PR ごとに、門の status の state と log の 1 行の JSON の verdict を読み、PASS・FAIL・観測できずの件数を出す（arc の設計） [Q5]
- 確かめに使う PR: 門の呼出しの PR（保護面、Owner の exact-head）が main に入った後の、U1 の残りの実装の PR（arc の設計） [Q6]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
