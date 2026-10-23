# Units Generation — 作業の単位の分け方の質問

承認済みの部品の一覧（`inception/domain-design/components.md`）と設計の決定（`decisions.md`）を、作業の単位（Unit）にまとめます。決めるのは、Unit の境目・大きさ・Unit どうしの依存（何が何を待つか）までです。どの順で作るか、何を先に出すかは、次の Delivery Planning の段で決めます。

この段で前提にすること:
- 部品は 10 個です。
  - 既存を広げる物: SdsGate・DesignBinding・PlanAdmission
  - 既存のまま使う物: AuditAdmission・PlanBinding・KitCli
  - 新規: RecordBridge・ApprovalRecordWriter・MetricsCore・MetricsCollector
- チームの決まり（`team-practices.md`）:
  - 最初の作業単位で、端から端まで通る細い版を作る。
  - 試験が先。
  - PR は追加 400 行・20 file まで。
  - own-code は 2,300 行まで（残り約 362 行）。
- 対象の repo は shirube・aun・onza。aun と onza への配布も、この取り組みの範囲に入ります（要件 FR8）。

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [設計] Unit の境目の決め方

A. 部品の関係の深いまとまりごとに分ける（例: 計測、記録の橋と承認の記録、門の判定の追加、計画の受付、配布）
B. 物語のまとまりごとに分ける（計測・門・配布の 3 つ）
C. 部品ごとに 1 つの Unit にする（10 個前後）
X. Other (please specify)

[Answer]: A（arc の設計。部品の関係の深いまとまりで分けると、Unit の中で閉じた試験が書け、Unit の間の依存が少ない。B の 3 つでは 1 つが大きくなりすぎ、PR の上限（400 行・20 file）に収まらない）

## Q2. [設計] 最初の Unit（端から端まで通る細い版）の中身

端から端まで通る細い版は、部品がつながって最後まで動くことを、機能を足す前に確かめる最小の版です。実現性の条件 C3 では、門で止め始める前に今の値を測ると決めています。

A. 次の全部を、最小の形で 1 本通す。
   - PR の block の AI-DLC の記録の欄
   - 記録の橋（承認の記録 1 種類、記録だけ）
   - 門の status
   - 計測が status を読んで数え、結果を出すところ
B. 計測だけ（今の値を測って出す）を最初の Unit にし、門には触れない
C. 記録の橋と門だけを最初の Unit にし、計測は後にする
X. Other (please specify)

[Answer]: A（arc の設計。端から端まで通す版は、部品がつながることを最初に確かめるもの = 進め方の段の決まり。門は記録だけ（report-only）で動かすので止めない。実現性の条件 C3「止め始める前に今の値を測る」とぶつからない）

## Q3. [設計] Unit の大きさ

A. 1 つの Unit は、PR 1〜2 本（1 本あたり追加 400 行・20 file の上限の中）に収まる大きさにする
B. 大きめにまとめ、Unit の中で PR を何本にでも分ける
X. Other (please specify)

[Answer]: A（arc の設計。PR の上限（追加 400 行・20 file）と hygiene の検査に収まる大きさ。監査も 1 本ずつ見られる）

## Q4. [設計] 依存の無い Unit を並べて進めてよいか

A. 依存の無い Unit は、別の席なら並べて進めてよい
B. 1 つずつ順に進める
X. Other (please specify)

[Answer]: A（arc の設計。aun と onza への配布は、それぞれの repo の席が受け持つ = approval-handoff の Q4。shirube の席の Unit は順に進める。同じ席に 2 つの Unit を同時に渡さない）

## Q5. [設計] own-code の残り（約 362 行）を超える時の決め方

新しい部品 4 つと既存の部品の拡張で、残りの約 362 行を超える見込みがあります。予算を上げるのは、Owner の決定です（R3。予算 2,300 行も 10/20 に Owner が決めた = iyasaka-arc#49 6285364300）。Owner の手は 1 周 6 回までです。

A. この段の後の見積もりで全体の行数を出し、超えるなら 1 回だけ Owner に予算の改めを伺う
B. Unit ごとに、超えた時に Owner に伺う
C. 超えないように、Unit の中身を削る
X. Other (please specify)

[Answer]: A（arc の設計。予算を上げるのは Owner の決定で、Owner の手は 1 周 6 回まで = S1-SH-07。Unit ごとに伺うと回数が増えるので、全体の見積もりを出して 1 回にまとめる）

## Q6. [設計] aun と onza への配布の Unit

A. 配布先の repo ごとに 1 つの Unit にする（aun・onza。shirube 自身への適用は、門の Unit の中で行う）
B. aun と onza への配布を 1 つの Unit にまとめる
X. Other (please specify)

[Answer]: A（arc の設計。配布はその repo の席が作り、監査と統合もその repo ごとに通るので、repo ごとに分ける方が依存が単純になる。shirube 自身への適用は門の Unit の中 = S1-SH-06）

## Q7. [設計] U1 の PR の数と中身を、後で決まった事に合わせる（2026-10-23 の開き直し）

U1 の NFR Requirements で、監査の指摘 BF-04（shirube PR #65）を受けて U1 の大きさを見積もりました（Q6 の arc の下書き）。その結果、この段の決まりと合わない所が出たので、Owner の選択（U1 の NFR Requirements の Q7 = A）でこの段を開き直しました。

見積もり（下書き。実装の実測ではない）:
- 実装は約 1,050〜1,200 行。追加 400 行の上限の中で、実装の PR が 3 本（I1〜I3）要る。
- これとは別に、保護面の 1 本（P1、約 380 行・約 11 file）がある。
- 記録の PR（AI-DLC の記録、承認の記録と段の順の記録）は Unit を指さない（受け渡しの形 C7）。

食い違う所:
- Q3 の決まり「1 つの Unit は PR 1〜2 本」に、U1 は収まらない。
- U1 の中身（`unit-of-work.md`）に、後で決まった 2 つが書かれていない。
  - AI-DLC の自己適用の file と大きさの数えの除外を、U1 の保護面と 1 本の PR にまとめる（iyasaka-arc#49 6354019047 の 1・4、6354411741 の 2）。
  - 配布キットが shirube 自身の再利用 workflow を書き換えないようにする kit の変更（U1 の Functional Design の Q9、監査の指摘 BF-03）。

A. Q3 の決まりを U1 だけ改める。
   - U1 は、保護面の 1 本と実装の PR 3 本まで（1 本あたり追加 400 行・20 file の中）。記録の PR は Unit を指さないので数えない。
   - ほかの Unit は PR 1〜2 本のまま。
   - U1 の中身に、上の 2 つを書き足す。
B. 全部の Unit で「PR 1〜3 本」に改める（U1 の中身に上の 2 つを書き足すのは A と同じ）
C. U1 を小さくする。計測を U2 へ移し、U1 の実装の PR を 2 本に収める（細い版で計測までを通す確かめ = Delivery Planning の Q7 を改める要がある）
X. Other (please specify)

[Answer]: A（arc の設計。U1 は端から端まで通る細い版で、部品 5 つ（門・記録の橋・承認の記録の作り手・計測・kit）にまたがるので、ほかの Unit と同じ目安に収まらない。改めるのは U1 だけにし、ほかの Unit は「1〜2 本」のまま保つ。B は U1 のためだけに全部の Unit の目安を緩めることになる（例が 1 つしか無い物を一般の決まりにしない = Shirube 開発規格 S2）。C は細い版で計測までを通す確かめ（Delivery Planning の Q7）を変え、U1 の確かめが「門が判定する」までで止まる。1 本あたり追加 400 行・20 file の上限（hygiene-profile）は変えない。U1 の中身への 2 つの書き足しは、どちらも Owner の決定と承認済みの設計の写しで、新しい判断は入らない）

## Q8. [設計] 監査の指摘 BF-04: U1 の実装の PR 3 本・1 本 400 行の中で成り立つ分け方が無い（2026-10-23 の 3 回目の開き直し）

監査（shirube PR #65 の返却 https://github.com/watchout/shirube/pull/65#issuecomment-6362354895 の BF-04）の指摘です。
- U1 の NFR Requirements の見積もり（幅つき、実装の実測ではない）では、次のとおり。
  - I1（作り手と kit の自己用の書く先）: 約 320〜400 行
  - I2（記録の橋・門の判定・`budget.mjs`）: 約 410〜480 行
  - I3（計測）: 約 290〜350 行
- I2 は下の端でも 1 本 400 行を超える。`budget.mjs` を I1 へ移すと I1 が約 400〜460 行になり、どちらに置いても 1 本が超える。
- 3 本の合計は約 1,020〜1,230 行で、上の端は 3 本の上限 1,200 行を超える。
- 1 本 400 行・20 file の上限は hygiene の検査（`pr-size`、止める形）で、超えた PR は統合できない。
- 求められていること: 各 PR 400 行・20 file と実装 3 本を守る分け方を、幅つきの見積もりで示す。成り立たない時は、既存の Owner の判断の手順に結ぶ。

部品ごとの見込み（U1 の NFR Requirements の Q9）:
- 作り手と試験: 約 270〜340 行
- kit の自己用の書く先と試験: 約 50〜60 行
- `budget.mjs` と試験: 約 60〜80 行
- 記録の橋・門の判定と試験: 約 350〜400 行
- 計測と試験: 約 290〜350 行

A. U1 の実装の PR を 4 本までにする（Q7 の「実装の PR 3 本まで」を改める）。1 本 400 行・20 file の上限は変えない。
   - 分け方の案（どれも上の端で 400 行以内）:
     - I1: 作り手（約 270〜340）
     - I2: kit の自己用の書く先と `budget.mjs`（約 110〜140）
     - I3: 記録の橋と門の判定（約 350〜400）
     - I4: 計測（約 290〜350）
   - 順: P1 → R → I1 → A → I2 → I3 → K → I4。K は門の判定（I3）の後で、I4 が新しい門で判定される確かめの PR になる。
   - Delivery Planning から後の段の PR の順を、この分け方に揃える。
B. 1 本の上限を広げる（`.shirube/hygiene-profile.md` の `pr_added_lines` を、例えば 500 行にする）。実装の PR は 3 本のまま。
   - 上限は repo の全部の PR に効く（U1 だけには絞れない）。team の決まり（Code Style の PR 400 行）も改める。
   - profile は保護面で、P1 の中で Owner が exact-head で決める。
C. U1 の中身を減らし、実装の PR 3 本・1 本 400 行に収める（何を後の Unit へ移すかを決める。細い版の確かめの中身が変わる）
X. Other (please specify)

[Answer]: X（Owner が選んだ D: 「A で進め、『理由つきで超えてよい』仕組みを後の Unit の候補にする」。U1 の実装の PR を 4 本までにする（作り手 / kit の自己用の書く先と budget.mjs / 記録の橋と門の判定 / 計測。1 本 400 行・20 file の上限は変えない。順は P1 → R → I1 → A → I2 → I3 → K → I4）。それとは別に、「機能の深さで大きくなる PR は、理由を書き、独立の監査が重複や肥大でないと確かめたら超えてよい」仕組みを Shirube の後の Unit の候補として記録する。Owner の考え: 「本来コードの冗長化の対策のための制限ですよね？PRの数を無限に増やしたらそれはそれで冗長化と変わらないと思います。実装量や機能の深さによりコード量が適正に増える分には制限を超えてもいいと思います。文字数の制限よりも効果的な方法はないの？」。arc が質問ボードで噛み砕いて聞いた（2026-10-24））

## Plan Approval

U1 u1-skeleton（service、依存なし）、U2 u2-metrics（service、U1）、U3 u3-approval-records（service、U1）、U4 u4-gate-judgements（service、U1・U3）、U5 u5-plan-admission（service、依存なし）、U6 u6-dist-aun（packaging、U4）、U7 u7-dist-onza（packaging、U4）。U1 を端から端まで通る細い版とする。

- Approve Plan
- Revise Plan

[Answer]: Approve Plan

## Consolidated Summary Confirmation

- Unit の境目: 部品の関係の深いまとまりごとに分ける（計測、記録の橋と承認の記録、門の判定の追加、計画の受付、配布）（arc の設計） [Q1]
- 最初の Unit: PR の block の AI-DLC の記録の欄 → 記録の橋（承認の記録 1 種類、記録だけ）→ 門の status → 計測が status を読んで数えて出す、までを最小の形で 1 本通す。門は記録だけで止めない（arc の設計） [Q2]
- Unit の大きさ: PR 1〜2 本（1 本あたり追加 400 行・20 file の中）に収まる大きさ。U1 だけは Q7・Q8 の決まり（arc の設計） [Q3、U1 は Q7・Q8 で改めた]
- 並べて進めること: 依存の無い Unit は、別の席なら並べてよい。同じ席に 2 つの Unit を同時に渡さない（arc の設計） [Q4]
- own-code の予算: この段の後の見積もりで全体の行数を出し、超えるなら 1 回だけ Owner に予算の改めを伺う。これは Owner の手の 1 回に入るので、Delivery Planning で 6 回の内訳を確かめる（arc の設計） [Q5]
- 配布の Unit: aun と onza で 1 つずつ。shirube 自身への適用は門の Unit の中で行う（arc の設計） [Q6]
- U1 の PR の数と中身（2026-10-23 の開き直し）:
  - U1 だけ、保護面の 1 本と実装の PR 3 本まで（1 本あたり追加 400 行・20 file の中）。記録の PR は Unit を指さないので数えない。ほかの Unit は PR 1〜2 本のまま。1 本あたりの上限は変えない。
  - U1 の中身に 2 つを書き足す。どちらも決まった事の写し。
    - AI-DLC の自己適用の file と大きさの数えの除外を、U1 の保護面と 1 本の PR にまとめる（iyasaka-arc#49 6354019047 の 1・4、6354411741 の 2）
    - kit が shirube 自身の再利用 workflow を書き換えない変更（U1 の Functional Design の Q9）
  - （arc の設計） [Q7]
- U1 の実装の PR の数（2026-10-23〜24 の 3 回目の開き直し、監査の指摘 BF-04。Q7 の「実装の PR 3 本まで」を改める）:
  - U1 は、保護面の 1 本と実装の PR 4 本まで。1 本 400 行・20 file の上限は変えない。
  - 分け方（どれも見積もりの上の端で 400 行以内）: I1 作り手（約 270〜340）/ I2 kit の自己用の書く先と `budget.mjs`（約 110〜140）/ I3 記録の橋と門の判定（約 350〜400）/ I4 計測（約 290〜350）。
  - 順: P1 → R → I1 → A → I2 → I3 → K → I4。K は門の判定（I3）の後で、I4 が新しい門で判定される確かめの PR。
  - あわせて、「機能の深さで大きくなる PR は、理由を書き、独立の監査が重複や肥大でないと確かめたら超えてよい」仕組みを、Shirube の後の Unit の候補として記録する（この intent の Unit には足さない）。
  - （Owner が選んだ X = D） [Q8]
- 分け方: 7 つの Unit。U1 u1-skeleton（端から端まで通る細い版、依存なし）、U2 u2-metrics（U1）、U3 u3-approval-records（U1）、U4 u4-gate-judgements（U1・U3）、U5 u5-plan-admission（依存なし）、U6 u6-dist-aun（U4）、U7 u7-dist-onza（U4）。U1〜U5 は service、U6・U7 は packaging（承認済み） [Plan Approval]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
