# Scope Definition — 質問

これまでの記録（`ideation/intent-capture/intent-statement.md`、`ideation/feasibility/feasibility-assessment.md`、`ideation/feasibility/constraint-register.md`）をもとに、最初の版の範囲と順番を決めます。最初に解くのは手戻り、前提は「AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る」、時期は決めず完了の条件で区切ります（時期の質問はしません）。

---

## Q1. [プロダクトオーナー] 最初の版に必ず入れるもの (select all that apply)

これまでの答えから、最初の版の候補になる取り組みを 5 つに分けました。必ず入れるもの（Must）を選んでください。

A. 今の値の計測（統合までの時間、手戻りの回数、Owner の手の回数、誤って止めた回数）
B. 工程の飛ばしを止める門（前の段階の記録がないと次の段階に進めない）
C. 設計と実装のずれを見つける検査
D. 誤って止めた件を判定して記録する手順
E. Suite の各 repo への同じ版の配布
X. Other (please specify)

[Answer]: A, B, C, D; X: 監査なしの PR は統合できない（S1-SH-01）、道筋に無い作業は統合できない（S1-SH-02）、Inception が先（S1-SH-03）、作者の手間は増えない（S1-SH-05）、Shirube 自身がこの門を通って作られる（S1-SH-06）; E は対象の repo（Shirube・AUN・Onza）への Shirube の版の配布に限って入れる（Suite 全体と OmotenasuAI への配布は次の段階）（X と E は Requested Changes Feedback 1 回目による追加）

## Q2. [プロダクトオーナー] 価値が出る最小の範囲

最初の版を小さく保つため、これだけあれば価値が出る、という最小の範囲を決めます。

A. 計測だけ（今の値を見える形にする）
B. 計測と、工程の飛ばしを止める門（止めずに記録だけする report-only で数えるところまで）
C. 計測と、門で実際に止めるところまで（必須検査にする Owner の決定を含む）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: C

## Q3. [プロダクトオーナー] 順番の方針

取り組みをどの順番で進めるかの考え方を決めます。

A. 価値の大きいものから
B. リスクの大きいものから（不確かなことを先に確かめる）
C. 依存の順（計測 → 門 → 配布のように、前提になるものから）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q4. [プロダクトオーナー] 手戻り以外の遅れの原因の扱い

遅れの原因のうち、Owner 待ち・席どうしの引継ぎ・監査の往復は、最初の版で先に解く対象ではありません。最初の版でどう扱うかを決めます。

A. 最初の版では改善しない（統合までの時間の計測には含まれるので、測るだけはする）
B. 手戻りの次に、同じ版の中で扱う
C. 最初の版では測りもしない
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q5. [開発の運営] 最初の版で対象にする repo

最初に試す場所は「いま動いている Suite の製品」です。どの repo がそれに当たるかで、範囲の大きさが変わります。

A. Shirube と AUN だけ
B. Shirube・AUN・Onza
C. Suite の 5 製品すべて（Kusabi・Tsumama を含む）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: C

## Q6. [開発の運営] 最初の版の完了の判定

時期ではなく完了の条件で区切るため、最初の版が終わったと言える条件を決めます。

A. 対象の repo で今の値を測り、手戻りの回数が半分になったことを確かめたとき
B. 門と計測が対象の repo で動き、今の値が出たとき（効果の確認は次の版）
C. 1 周（意図の記録から統合まで）を 1 件、門と計測つきで通したとき
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: X: 10/21 に採択した Shirube の S1 の条件 S1-SH-01〜07 に揃える（門が Shirube と AUN で効き、AUN の実際の PR が 1 件以上門を通って統合される。誤って止めた PR は 0。Owner の手は 1 周 6 回まで）。根拠: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673 と、6 回に改めた https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6306226221 （C を Requested Changes Feedback 1 回目により置換）

## Q7. [プロダクトオーナー] Kusabi と Tsumama の扱い（Q5 の追加質問）

Q5 では Suite の 5 製品すべてを対象に選んでいます。一方、10 月 20〜21 日に記録された決定では「Kusabi・Tsumama の新規実装は、制御系が 1 周回るまで止める」となっています。最初の版でこの 2 つをどう扱うかを確認します。

A. 対象に入れ、門と計測を先に入れておく（新規実装の停止はそのまま。作業が出たときから測る）
B. 対象から外し、制御系が 1 周回って再開してから加える
C. 停止を解き、最初の版の対象として開発も進める（既存の決定を変える。変更の記録は GitHub に残す）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: B

## Q8. [開発の運営] 完了の条件の「1 件」の数え方（Q6 の追加質問）

Q6 では「1 周を 1 件、門と計測つきで通したとき」を完了の条件に選んでいます。対象が複数の repo なので、1 件をどう数えるかを決めます。

A. 対象の repo のどれか 1 つで 1 件通せば完了
B. 対象の repo それぞれで 1 件ずつ通したら完了
C. Shirube で 1 件通したら完了（ほかの repo へは次の段階で広げる）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: X: S1-SH-04 のとおり、AUN の実際の PR が 1 件以上、門を通って統合されること。門は Shirube と AUN で効いていること（C を Requested Changes Feedback 1 回目により置換）

## Consolidated Summary Confirmation

- 最初の版に必ず入れるもの（計測と検査）: 今の値の計測（統合までの時間、手戻りの回数、Owner の手の回数、誤って止めた回数）、設計と実装のずれの検査、誤って止めた件を判定して記録する手順 [Q1]
- 最初の版に必ず入れるもの（門）: 工程の飛ばしを止める門、監査なしの PR は統合できない（S1-SH-01）、道筋に無い作業は統合できない（S1-SH-02）、Inception が先（S1-SH-03） [Q1]
- 最初の版に必ず入れるもの（守ること）: 作者の手間は増えない（S1-SH-05）、Shirube 自身がこの門を通って作られる（S1-SH-06） [Q1]
- 最初の版に必ず入れるもの（配布）: 対象の repo（Shirube・AUN・Onza）への Shirube の版の配布。Suite 全体と OmotenasuAI への配布は次の段階 [Q1]
- 価値が出る最小の範囲: 計測と、門で実際に止めるところまで（必須検査にする Owner の決定を含む） [Q2]
- 順番の方針: 価値の大きいものから [Q3]
- 手戻り以外の原因（Owner 待ち・席どうしの引継ぎ・監査の往復）: 最初の版では改善せず、測るだけ [Q4]
- 最初の版の対象 repo: Shirube・AUN・Onza。Kusabi と Tsumama は対象から外し、制御系が 1 周回って再開してから加える [Q5][Q7]
- 最初の版の完了の条件: 10/21 採択の Shirube の S1 の条件 S1-SH-01〜07 に揃える。門が Shirube と AUN で効き、AUN の実際の PR が 1 件以上門を通って統合される。誤って止めた PR は 0。Owner の手は 1 周 6 回まで [Q6][Q8]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

要約の確認（1 回目）で何を変えるか。

[Answer]: 1. 完了の条件は、10/21 に採択した Shirube の S1 の条件 S1-SH-01〜07 に揃える（門が Shirube と AUN で効き、AUN の実際の PR が 1 件以上門を通って統合される。誤って止めた PR は 0。Owner の手は 1 周 6 回まで）。根拠: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673 と、6 回に改めた https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6306226221
2. 必ず入れるものに「監査なしの PR は統合できない」を加える（S1-SH-01）。
3. 必ず入れるものに「対象の repo（Shirube・AUN・Onza）への Shirube の版の配布」を加える。Suite 全体と OmotenasuAI への配布は次の段階。
追加の確認「上の 3 点に加えて、S1-SH-02・03・05・06 も「必ず入れるもの」に加えますか？」への答え: 加える（おすすめ）
