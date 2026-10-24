# Approval & Handoff — 質問

Ideation のすべての記録（意図・実現性・範囲・体制）をまとめ、Inception に進んでよいかを決めます。市場調査と画面のたたき台は、当てはまらないため飛ばしています。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号（例: `A`、複数なら `A, C`）か、`X:` に続けて自分の言葉を書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [プロダクトオーナー] この記録を GitHub に載せるか

この AI-DLC の記録（`aidlc/` 以下）は、いまこの Mac の作業場にだけあり、GitHub にはまだ載っていません。記録の正本は GitHub と決めているため（意図の記録 Q9）、ARC や今ある席が使えるようにするには載せる必要があります。

A. この記録を shirube の repo に PR で入れる（監査と統合は今ある席）
B. 要点を iyasaka-arc の Issue に書き、記録の本体はこの Mac に置く
C. Inception の要件（要件定義と User Stories）まで終わってから、まとめて載せる
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

（arc の勧め: A。Shirube の仕様では、AI-DLC の各段の出力が repo の記録として残り、次の段がそれを参照する = iyasaka-arc#49 6305503572・6309035411。Q6 で設計の段から arc に渡すので、arc が読める所に要る。注意: shirube は公開の repo なので、PR の前に記録の中に秘密・個人の情報・機械の名前が無いことを確かめる（作業場の記録の置き場の名前は owner にしてある）。B は正本が GitHub に無い形になり、C は arc が要件の途中の記録を読めない）

[Answer]: A

## Q2. [プロダクトオーナー] 影響の大きいリスクの手当て

実現性の段階で、影響の大きいリスクを 3 つ挙げ、手当ての方向を書きました（`ideation/feasibility/raid-log.md`）。
- R1: 今の値を測る前に改善を始め、「半分になったか」を判定できなくなる → 改善より先に今の値を測る
- R2: 門を厳しくして、正しい作業まで止めてしまう → 誤りと判定して記録する手順を先に決め、記録だけで数えてから止める形に移す
- R7: 個人情報を含む製品のデータに触れてしまう → 個人情報を含むデータを検査と記録の対象から外す

A. 3 つとも、この手当ての方向で受け入れる
B. 一部を直す（どれをどう直すかを Other に書いてください）
C. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A（arc の下書き。R1 は範囲の段で採った「計測を先に置く」、R2 は門を記録だけで数えてから止める形に移す今の進め方（必須検査は超過 0 になった所から順に有効にする = iyasaka-arc#49 5902935506）、R7 は「実案件の個人情報・顧客原本・秘密値を出さない」決まりと合う）

## Q3. [プロダクトオーナー] AI の利用料の上限を決める時期

AI の利用料が増えるのは許容し、上限は後で決めることになっています（実現性 Q6）。決める時期を決めておかないと、決めないまま進みます。

A. 設計の段で ARC が見込みを出してから、Owner が決める
B. 今決める（金額を Other に書いてください）
C. 上限は置かない
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

（arc の勧め: A。費用の見込みは設計の中身（どの段で何回 AI を呼ぶか）で決まるので、設計の段で見込みを出してから決めるのが早い。料金・費用の決定は Owner = rules escalation-policy）

[Answer]: A

## Q4. [開発の運営] Onza への導入を担う席

体制の段階で、Onza に Shirube の版を入れる作業の担い手が決まっていません（`ideation/team-formation/skill-matrix.md`）。

A. Onza の今ある席が担う
B. shirube の席が Onza にも入れる
C. 要件定義の段で決める（skill-matrix の案のまま）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A（arc の下書き。配布キットの導入 PR は、その repo の席が作る形 = kodama #87。OmotenasuAI も各 repo の指示系統が作る = iyasaka-arc#49 6303458175。Onza には今ある席がいる = onza PR #29 を作った席）

## Q5. [開発の運営] 記録を載せる PR を誰がいつ作るか（Q1 の追加質問）

Q1 では「この記録を shirube の repo に PR で入れる」を選んでいます。この作業場は clone で、ここから PR を出す決まりはまだありません。PR を作る席と時期を決めます。

A. この会話で、Ideation の承認の後に PR を作る（秘密・個人の情報・機械の名前がないことを確かめてから。監査と統合は今ある席）
B. shirube の席に渡し、shirube の席が PR を作る
C. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: B（arc の下書き。統合済みの設計 shirube docs/design/aidlc-include.md の手順 6「intent の記録の PR: shirube の席が Owner の clone から写す（同じ OS user、読むだけ）→ devauditor → suite-lead、R1」のとおり。時期は同じ設計の順で、kit の変更（手順 1）と shirube への self-apply（手順 3、.gitignore と audit の shard の扱い、Owner の exact-head）と memory の PR（手順 4）の後。今の分担（Q3 = A）とも合う）

## Consolidated Summary Confirmation

- 記録の載せ方: この記録を shirube の repo に PR で入れる。公開の repo なので、載せる前に秘密・個人の情報・機械の名前がないことを確かめる [Q1]
- PR を作る席と時期: shirube の席が Owner の clone から写して PR を作り、devauditor の監査、suite-lead の統合を通す。時期は統合済みの設計（aidlc-include.md）の順で、配布キットの変更、shirube への適用（.gitignore と監査の記録の扱い。Owner の exact-head）、memory の PR の後（時期は arc の下書き） [Q5]
- 影響の大きいリスクの手当て: R1（改善より先に今の値を測る）、R2（誤りの判定と記録の手順を先に決め、記録だけで数えてから止める形に移す）、R7（個人情報を含むデータを検査と記録の対象から外す）を、この方向で受け入れる（arc の下書き） [Q2]
- AI の利用料の上限: 設計の段で ARC が見込みを出してから、Owner が決める [Q3]
- Onza への導入: Onza の今ある席が担う（arc の下書き） [Q4]
- 体制の変更（要約の確認 1 回目の依頼による）: Team Formation を開き直し、Q6 を C に直した。この会話は Inception の最後まで進め、設計の段は ARC が書いた設計をこの会話で確認・承認する [Requested Changes Feedback]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

要約の確認（1 回目）で何を変えるか。

[Answer]: team-formation の Q6 を C に直してください（Inception の最後までこの会話で進め、設計の段は arc が書いた設計をこの会話で確認・承認する）。直し方: Team Formation を開き直す
