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

## Plan Approval

U1 u1-skeleton（service、依存なし）、U2 u2-metrics（service、U1）、U3 u3-approval-records（service、U1）、U4 u4-gate-judgements（service、U1・U3）、U5 u5-plan-admission（service、依存なし）、U6 u6-dist-aun（packaging、U4）、U7 u7-dist-onza（packaging、U4）。U1 を端から端まで通る細い版とする。

- Approve Plan
- Revise Plan

[Answer]: Approve Plan

## Consolidated Summary Confirmation

- Unit の境目: 部品の関係の深いまとまりごとに分ける（計測、記録の橋と承認の記録、門の判定の追加、計画の受付、配布）（arc の設計） [Q1]
- 最初の Unit: PR の block の AI-DLC の記録の欄 → 記録の橋（承認の記録 1 種類、記録だけ）→ 門の status → 計測が status を読んで数えて出す、までを最小の形で 1 本通す。門は記録だけで止めない（arc の設計） [Q2]
- Unit の大きさ: PR 1〜2 本（1 本あたり追加 400 行・20 file の中）に収まる大きさ（arc の設計） [Q3]
- 並べて進めること: 依存の無い Unit は、別の席なら並べてよい。同じ席に 2 つの Unit を同時に渡さない（arc の設計） [Q4]
- own-code の予算: この段の後の見積もりで全体の行数を出し、超えるなら 1 回だけ Owner に予算の改めを伺う。これは Owner の手の 1 回に入るので、Delivery Planning で 6 回の内訳を確かめる（arc の設計） [Q5]
- 配布の Unit: aun と onza で 1 つずつ。shirube 自身への適用は門の Unit の中で行う（arc の設計） [Q6]
- 分け方: 7 つの Unit。U1 u1-skeleton（端から端まで通る細い版、依存なし）、U2 u2-metrics（U1）、U3 u3-approval-records（U1）、U4 u4-gate-judgements（U1・U3）、U5 u5-plan-admission（依存なし）、U6 u6-dist-aun（U4）、U7 u7-dist-onza（U4）。U1〜U5 は service、U6・U7 は packaging（承認済み） [Plan Approval]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
