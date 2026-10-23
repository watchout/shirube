# Team Formation — 質問

これまでの記録（`ideation/scope-definition/scope-document.md`、`ideation/scope-definition/intent-backlog.md`、`ideation/feasibility/feasibility-assessment.md`）をもとに、最初の版を誰がどう進めるかを決めます。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号（例: `A`、複数なら `A, C`）か、`X:` に続けて自分の言葉を書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [プロダクトオーナー] すでに進んでいる Shirube の S1 との関係

この取り組みの完了の条件は、10/21 に採択された Shirube の S1 の条件（S1-SH-01〜07）に揃えました。Shirube の S1 は、すでに道筋（DP-SHIRUBE-001）として進んでいます。同じ仕事を二重に進めないため、関係をはっきりさせます。

A. 同じもの（この AI-DLC の記録が、Shirube の S1 の Inception の記録になる）
B. Shirube の S1 を含む、より大きな取り組み（S1 に、計測・設計と実装のずれの検査・誤って止めた件の記録・Onza への配布を足したもの）
C. 別の取り組み（Shirube の S1 とは並行して進める）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: B（arc の下書き。scope-definition で採った範囲は、S1 の条件 S1-SH-01〜07 に、計測・設計と実装のずれの検査・誤って止めた件の記録・Onza への配布を足したもの。Shirube は頭から（Inception の入口から）作ると決めているので、この記録が S1 の Inception の記録も兼ねる = iyasaka-arc#49 6308461447）

## Q2. [プロダクトオーナー] 同じ席を使うほかの取り組み (select all that apply)

同じ席や Owner の時間を取り合う取り組みがあると、順番の調整が要ります。

A. AUN と Shirube の、Owner による作り直し
B. Shirube の AI-DLC の内包の設計と監査（shirube PR #64 など）
C. OmotenasuAI の規格の整備（配布キットの導入など）
D. None（取り合うものはない）
X. Other (please specify)

[Answer]: C, X. Owner の時間は、AUN・Onza・Kusabi・OmotenasuAI の AI-DLC の会話（答えと承認）と取り合う。shirube の席は、配布キットの作業指示 v5 を止めて待っている。B の shirube PR #64 は 10/21 に統合済みで、取り合わない（arc の下書き。出典: OmotenasuAI への配布キット = iyasaka-arc#49 6303458175、2 段の再開 = 6328896533、PR #64 の統合 2026-10-21T12:06Z）

## Q3. [開発の運営] 作業の分担

この AI-DLC の進行（Owner が手で回している、この会話）と、今ある席（ARC・各製品の実装席・監査の席・suite-lead）の役割を決めます。

A. 今ある分担のまま進める（設計 = ARC、実装 = 各製品の実装席、監査 = devauditor、統合 = suite-lead）。この会話の記録は設計の入力にする
B. この会話で設計と実装まで進め、監査と統合は今ある席が行う
C. この会話は Inception（要件と設計）まで。実装は今ある実装席に渡し、監査と統合は今ある席が行う
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

（arc の勧め: C。今ある分担（設計 = arc、実装 = shirube の席、監査 = devauditor、統合 = suite-lead）と独立した監査を保てる。Owner のこの作業場は clone で、ここから PR を出す決まりは無い。出典: 実装・監査・統合の分担 = iyasaka-arc#49 5890001694・6285000580・6288848200。A との違いは、この会話で要件だけでなく設計の段まで進めるかどうか）

[Answer]: A

## Q4. [開発の運営] 統合（merge）を決める人

門を通った PR を誰が統合するかで、Owner の手の回数が変わります。

A. 今の決まりのまま、suite-lead が作者と別の席として統合する（監査 PASS・head の一致・必須の検査がそろえば毎回聞かない。保護面は Owner）
B. Owner が毎回決める
C. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A（arc の下書き。出典: suite-lead が作者と別の席として統合する決まり = iyasaka-arc#49 6288848200、Owner の手は 1 周 6 回まで = 6306226221）

## Q5. [開発の運営] 席の空き具合

最初の版の作業を受けられる余裕があるかで、進める速さと順番が変わります。

A. 余裕がある（今の席で受けられる）
B. Shirube と AUN の席は作り直しで手一杯で、この取り組みは後になる
C. Not identified（まだ分からない）
X. Other (please specify)

[Answer]: A（arc の下書き。10/22 の時点で shirube・aun・spe-dev・suite-lead の席は待機中。shirube の席は配布キットの作業指示 v5 を止めて待っている）

## Q6. [開発の運営] この会話をどこまで進めるか（Q1・Q3 の追加質問）

Q3 では「今ある分担のまま（設計 = ARC、実装 = 各製品の実装席）。この会話の記録は設計の入力にする」を選び、Q1 では「この記録が Shirube の S1 の Inception の記録も兼ねる」としています。この会話の AI-DLC には、このあと要件定義・設計・実装の段も続くため、どこまでをこの会話で行い、どこから今ある席に渡すかを決めます。

A. Ideation の最後（Initiative Approval & Handoff）まで進め、その記録を ARC に渡す
B. Inception の要件（要件定義と User Stories）まで進め、設計の段から ARC に渡す
C. Inception の最後まで進めるが、設計の段は ARC が書いた設計をこの会話で確認・承認する形にする
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: C（Approval & Handoff の要約の確認で Owner が「team-formation の Q6 を C に直してください（Inception の最後までこの会話で進め、設計の段は arc が書いた設計をこの会話で確認・承認する）」と依頼し、B から C に変更。Team Formation を開き直して直した）

## Consolidated Summary Confirmation

- Shirube の S1 との関係: S1 を含む、より大きな取り組み（S1-SH-01〜07 に、計測・設計と実装のずれの検査・誤って止めた件の記録・Onza への配布を足したもの）。この記録が S1 の Inception の記録も兼ねる [Q1]
- 同じ席や時間を取り合う取り組み: OmotenasuAI の規格の整備。Owner の時間は AUN・Onza・Kusabi・OmotenasuAI の AI-DLC の会話と取り合う。shirube の席は配布キットの作業指示 v5 を止めて待っている。shirube PR #64 は統合済みで取り合わない [Q2]
- 作業の分担: 今ある分担のまま（設計 = ARC、実装 = 各製品の実装席、監査 = devauditor、統合 = suite-lead）。この会話の記録は設計の入力にする [Q3]
- この会話の範囲: Inception の最後まで進める。設計の段は、ARC が書いた設計をこの会話で確認・承認する [Q6]
- 統合を決める人: suite-lead が作者と別の席として統合する（監査 PASS・head の一致・必須の検査がそろえば毎回聞かない。保護面は Owner） [Q4]
- 席の空き具合: 余裕がある（shirube・aun・spe-dev・suite-lead の席は待機中） [Q5]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
