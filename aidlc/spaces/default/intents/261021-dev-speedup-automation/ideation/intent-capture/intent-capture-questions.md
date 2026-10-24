# Intent Capture & Framing — 質問

## Sources

- [desc] Initial description: "開発の高効率化自動化による高速開発化"
- [scope] Workflow-selected scope: `feature`.

この段階では、上の 2 つと、下の質問への答え（`[Q<n>]`）だけを根拠にします。進め方（feature）は選択済みなので、ここでは問いません。

---

## Q1. [プロダクトオーナー] 速くしたい「開発」の範囲

「開発」がどこまでを指すかで、測る対象も関係者も変わるため、最初に範囲を決めます。

A. Shirube 自身の開発
B. Suite（AUN・Shirube・Onza・Kusabi・Tsumama）の開発
C. 社内のすべての製品の開発（Suite と OmotenasuAI などを含む）
D. 特定の 1 製品の開発（名前を Other に書いてください）
E. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: C

## Q2. [プロダクトオーナー] いま開発を遅くしている主な原因 (select all that apply)

自動化する対象を決めるため、時間が失われている場所を教えてください。

A. 人（Owner）の判断・承認・手渡しを待つ時間が長い
B. AI の席どうしの依頼・引継ぎが人を介す（URL の手渡し、中継、追いかけ）
C. 監査や検査の往復・やり直しが多い
D. 設計と実装のずれや、工程の飛ばしによる手戻りが多い
E. Not identified（どこで遅れているかはまだ測れていない）
X. Other (please specify)

[Answer]: A, B, C, D

## Q3. [プロダクトオーナー] 一番得をする人と、その人の困りごと

誰の困りごとを解く取り組みかで、成功の基準が変わります。

A. Owner（人が追いかけずに済み、判断と承認だけに集中できる）
B. 設計・取りまとめの席（ARC・実行リード）。配車や中継の手間が減る
C. 実装・監査の AI の席。待たずに次の作業に入れる
D. 製品の利用者・お客様。機能が早く届く
E. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q4. [プロダクトオーナー] 成功をどう測るか (select all that apply)

「速くなった」を後で確かめられるよう、数えられる指標を選んでください（目標の数値は答えを見てから追加で伺います）。

A. 依頼（意図の記録）から統合（merge）までにかかる時間
B. 1 周あたりに Owner の手が必要になる回数
C. 人が追いかけなくても次の工程へ渡った作業の割合
D. 差し戻し・手戻りの回数
E. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A, D（主な指標）; 見張りとして B（1 周あたりの Owner の手の回数、6 回まで）, X: 正しい作業を誤って止めた回数（0）（見張りの 2 つは Requested Changes Feedback 1 回目の 3 による追加）

## Q5. [プロダクトオーナー] なぜ今取り組むのか（きっかけ）

優先順位を判断する材料として、今この取り組みを始める理由を教えてください。

A. これまでの進め方が何度もうまくいかず、人が追いかける負担が大きい
B. 製品（AUN・OmotenasuAI など）の完成が遅れている
C. AI-DLC と Shirube を使い始め、仕組みにできる段階に来た
D. 費用（AI の利用料・人の時間）を減らしたい
E. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: B

## Q6. [プロダクトオーナー] この最初の版でやらないこと (select all that apply)

最初の版を小さく保つため、今回は対象外にするものを選んでください（進め方は feature で選択済みです）。

A. 本番・保護面（デプロイ、必須検査や branch 保護、DB スキーマ、資格情報）の自動化
B. Suite 以外の製品（OmotenasuAI など）への適用
C. 新しい AI の席の追加や、新しい外部ツールの導入
D. 人の承認そのものを無くすこと（承認は残し、承認の手間だけを減らす）
E. None（除外するものは今はない）
X. Other (please specify)

[Answer]: A, D, X: 新しい AI の席の追加や、AI-DLC（10/21 に決定済み）以外の新しい外部ツールの導入（C を Requested Changes Feedback 1 回目の 1 により修正）

## Q7. [開発の運営] 主な関係者 (select all that apply)

この取り組みに関わり、意見や影響を受ける人・席を教えてください。

A. Owner
B. ARC（設計）
C. 実行リード（suite-lead・hotel-lead）
D. 実装・監査の席（spe-dev・devauditor など）
E. Not identified（まだ特定していない）
X. Other (please specify)

[Answer]: A, B, C, D

## Q8. [開発の運営] 範囲や優先順位を決めるのは誰か

決め方がはっきりしていないと、作業が止まる場所が増えるため確認します。

A. Owner が決める。AI の席は案と根拠を出す
B. Owner が方針を決め、細かい順番は ARC が決める
C. ARC が決め、Owner は保護面だけを決める
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: C

## Q9. [開発の運営] 報告・連絡の決まり

人が追いかけずに済む形にするには、報告の置き場と頻度を先に決める必要があります。

A. GitHub の Issue・PR に記録（正本）し、chat には要点だけ
B. 決まった時刻に進捗を報告する（例: 朝と夕方）
C. 止まったとき・判断が要るときだけ知らせる
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q10. [プロダクトオーナー] 成功の指標の目標値（Q4 の追加質問）

Q4 で選んだ「依頼から統合（merge）までの時間」と「差し戻し・手戻りの回数」について、どこまで下げれば成功とするかを決めます。今の値はまだ測られていないため、測り方を含めて選んでください。

A. まず今の値を測り、両方を半分にすることを目標にする
B. まず今の値を測り、両方を 3 割減らすことを目標にする
C. 最初の版では今の値を測れるようにするところまでを目標にし、目標値はその後に決める
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A

## Q11. [プロダクトオーナー] 最初の版で先に解く原因（Q2 の追加質問）

Q2 では 4 つの原因（Owner 待ち、席間の引継ぎ、監査の往復、手戻り）すべてを選んでいます。最初の版を小さく保つため、先に解くものを決めます。

A. Owner の判断・承認・手渡しを待つ時間
B. AI の席どうしの依頼・引継ぎが人を介すこと
C. 監査や検査の往復・やり直し
D. 設計と実装のずれや、工程の飛ばしによる手戻り
E. Not yet defined（順番は決めず、4 つを同時に扱う）
X. Other (please specify)

[Answer]: D

## Q12. [開発の運営] 決め方の確認（Q8 の追加質問）

Q8 では「ARC が決め、Owner は保護面だけを決める」を選んでいます。一方、10 月 21 日に記録された運用では「どこから進めるか・何をするか・どうするかは Owner との対話で決め、ARC は案と根拠を出し、Owner が決めてから動く」となっています。この取り組みでどちらに従うかを確認します。

A. この取り組みでは Q8 のとおり ARC が決める（既存の運用を変える。変更の記録は GitHub に残す）
B. 既存の運用のまま（Owner が対話で決め、ARC は案と根拠を出す）
C. 範囲と優先順位の大枠は Owner が対話で決め、その中の細かい順番は ARC が決める
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: C

## Q13. [プロダクトオーナー] この取り組みの前提（Requested Changes Feedback 1 回目の 2 による追加）

要約の確認で、前提を 1 つ足すよう依頼がありました。その内容を前提として記録します。

A. AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る（10/21 の決定）
B. None（前提は置かない）
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- 対象: 社内のすべての製品の開発（Suite と OmotenasuAI などを含む）を速くする [Q1]
- 前提: AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る（10/21 の決定） [Q13]
- 遅れの原因: Owner の判断・承認・手渡しの待ち、AI の席どうしの引継ぎが人を介すこと、監査や検査の往復、設計と実装のずれや工程の飛ばしによる手戻りの 4 つすべて [Q2]
- 最初の版で先に解くもの: 設計と実装のずれや工程の飛ばしによる手戻り [Q11]
- 一番得をする人: Owner（人が追いかけずに済み、判断と承認だけに集中できる） [Q3]
- 成功の測り方（主な指標）: 依頼から統合（merge）までの時間と、差し戻し・手戻りの回数。目標はまず今の値を測り、両方を半分にする [Q4][Q10]
- 成功の測り方（見張り）: 1 周あたりの Owner の手の回数（6 回まで）、正しい作業を誤って止めた回数（0） [Q4]
- きっかけ: 製品（AUN・OmotenasuAI など）の完成が遅れている [Q5]
- 最初の版でやらないこと: 本番・保護面（デプロイ、必須検査や branch 保護、DB スキーマ、資格情報）の自動化、新しい AI の席の追加や AI-DLC（10/21 に決定済み）以外の新しい外部ツールの導入、人の承認そのものを無くすこと [Q6]
- 関係者: Owner、ARC、実行リード（suite-lead・hotel-lead）、実装・監査の席 [Q7]
- 決め方: 範囲と優先順位の大枠は Owner が対話で決め、その中の細かい順番は ARC が決める [Q8][Q12]
- 報告: GitHub の Issue・PR を正本にし、chat には要点だけ [Q9]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

要約の確認（1 回目）で何を変えるか。

[Answer]: 1. やらないことの「外部ツールの導入」は「AI-DLC（10/21 に決定済み）以外の新しい外部ツールの導入」に直す
  2. 前提に「AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る（10/21 の決定）」を足す
  3. 成功の測り方に「1 周あたりの Owner の手の回数（6 回まで）」と「正しい作業を誤って止めた回数（0）」を見張りとして足す

## Assumption Confirmation

文書を作る中で、答えだけでは決められなかった点が 4 つあります。未確定のまま残すか、追加の質問で決めるかを選んでください。

- intent-statement.md: 主な指標の「今の値」を測る期間と、「半分」を達成したかを判定する時点は、まだ決まっていない。
- intent-statement.md: 見張りの指標の「1 周」が何を指すか（たとえば 1 件の依頼が意図の記録から統合まで通ること）は、まだ決まっていない。
- stakeholder-map.md: ARC、実行リード、実装・監査の席それぞれの関心事は、答えではまだ確認されていない。
- stakeholder-map.md: 実行リードと実装・監査の席が「決める人」か「影響する人」かは、答えではまだ確認されていない。

A. Accept assumptions
B. Convert to follow-up questions

[Answer]: A. Accept assumptions
