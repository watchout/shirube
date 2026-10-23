# Feasibility & Constraints — 質問

前の段階の意図の記録（`ideation/intent-capture/intent-statement.md`）をもとに、実現できるか・何に縛られるかを確かめます。対象は社内のすべての製品の開発、最初に解くのは手戻り、前提は「AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る」です。

---

## Q1. [開発基盤] 必ずつなぐ必要がある今ある仕組み (select all that apply)

手戻りを減らす仕組みがどこと連携するかで、実現の難しさが変わります。

A. GitHub（Issue・PR・Actions・必須検査）
B. AUN（AI の席どうしの連絡）
C. Shirube の配布キットと門（sds-gate・hygiene の検査）
D. 各 AI の席（Claude Code・Codex の席）
E. None（つなぐ必要のあるものはない）
X. Other (please specify)

[Answer]: A, D

## Q2. [開発基盤] 仕組みを動かす場所

自動化の検査や記録をどこで動かすかで、使える道具と制約が決まります。

A. GitHub（Actions）とこの Mac 上の席だけで動かす
B. VPS（ConoHa など）も使う
C. AWS などのクラウドも使う
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q3. [開発基盤] 手戻りの回数を数える元の記録

成功の指標「手戻りの回数を今の半分にする」を測るには、今の値をどの記録から数えるかを決める必要があります。

A. GitHub の PR の記録（差し戻し・監査の BLOCK・修正の再 push の回数）
B. AI-DLC の記録（各段階の承認と差し戻しの記録）
C. A と B の両方
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q4. [開発基盤] 技術面で一番不確かなこと (select all that apply)

不確かなところを先に洗い出し、最初の版で確かめる順番を決めます。

A. AI の席どうしの自動の受け渡し（AUN）が、まだ常時は動いていない
B. 席ごとに LLM（Claude・Codex）が違い、同じ規格を同じように守らせる方法がまだ確かめられていない
C. 各 repo への配布キットの導入が、まだ report-only（記録だけで止めない）の段階にある
D. Not identified（まだ特定していない）
X. Other (please specify)

[Answer]: A, B, C

## Q5. [プロダクトオーナー] 規制・法令上の制約

規制の対象になるデータや手続きがあると、自動化してよい範囲が狭まります。

A. None（社内の開発工程の改善で、規制の対象はない）
B. 資格情報・秘密情報の扱いの決まりだけを守る
C. 個人情報を含む製品（宿泊者の情報など）のデータには触れない
D. Not identified（まだ特定していない）
X. Other (please specify)

[Answer]: C

## Q6. [プロダクトオーナー] 費用の制約

自動化で AI の利用や検査の実行が増えると費用が変わるため、枠を確認します。

A. 追加の費用は出さない（今の契約の範囲で行う）
B. AI の利用料が増えるのは許容する（上限は後で決める）
C. 上限を決める（金額を Other に書いてください）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: B

## Q7. [プロダクトオーナー] 時期の制約

決まった時期に合わせる必要があるかで、最初の版の大きさが変わります。

A. 時期は決めず、完了の条件で区切る
B. 特定の製品の予定に合わせる必要がある（製品と時期を Other に書いてください）
C. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q8. [プロダクトオーナー] 組織上の制約 (select all that apply)

いま止まっている開発や、Owner の決定が要る作業があると、進め方の順番が変わります。

A. OmotenasuAI の通常の開発は、規格の整備が終わるまで止まっている
B. AUN と Shirube は、Owner が手で作り直している途中
C. 必須検査・branch 保護・ruleset などの変更には Owner の決定が要る
D. None（組織上の制約はない）
X. Other (please specify)

[Answer]: A, B, C

## Q9. [開発基盤] 最初の版での AUN と Shirube の扱い（Q1・Q4・Q8 の追加質問）

Q1 では AUN と Shirube のキット・門をつなぐ相手に選んでいませんが、Q4 ではその 2 つを不確かなこととして選び、Q8 では「Owner が作り直している途中」としています。前提は「Shirube は門・配布・測定だけを作る」です。最初の版でこの 2 つをどう扱うかを決めます。

A. Shirube は作る側（門・配布・測定）。AUN には最初の版では頼らない
B. Shirube は作る側。AUN も最初の版で使う（AUN が常時動くことが前提条件になる）
C. Shirube は作る側。AUN は作り直しが終わったら使い、それまでは頼らない
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q10. [プロダクトオーナー] 最初に試す製品（Q8 の追加質問）

対象は社内のすべての製品ですが、Q8 で「OmotenasuAI の通常の開発は止まっている」を選んでいます。止まっている製品では開発の速さを測れないため、最初に試す場所を決めます。

A. Shirube と AUN の開発で先に試し、効果を確かめてから全製品へ広げる
B. いま動いている Suite の製品すべてで始め、OmotenasuAI は再開してから加える
C. OmotenasuAI の再開を待ち、全製品で同時に始める
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: B

## Consolidated Summary Confirmation

- 必ずつなぐ今ある仕組み: GitHub（Issue・PR・Actions・必須検査）と各 AI の席（Claude Code・Codex） [Q1]
- 動かす場所: GitHub（Actions）とこの Mac 上の席だけ [Q2]
- 手戻りの回数を数える元: GitHub の PR の記録（差し戻し・監査の BLOCK・修正の再 push の回数） [Q3]
- 技術面の不確かさ: AUN がまだ常時動いていない、LLM ごとに同じ規格を守らせる方法が未確認、配布キットがまだ report-only [Q4]
- AUN と Shirube の扱い: Shirube は作る側（門・配布・測定）。AUN には最初の版では頼らない [Q9]
- 規制: 個人情報を含む製品のデータには触れない [Q5]
- 費用: AI の利用料が増えるのは許容する（上限は後で決める） [Q6]
- 時期: 時期は決めず、完了の条件で区切る [Q7]
- 組織上の制約: OmotenasuAI の通常の開発は停止中、AUN と Shirube は Owner が作り直し中、必須検査・branch 保護・ruleset などの変更には Owner の決定が要る [Q8]
- 最初に試す場所: いま動いている Suite の製品すべてで始め、OmotenasuAI は再開してから加える [Q10]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
