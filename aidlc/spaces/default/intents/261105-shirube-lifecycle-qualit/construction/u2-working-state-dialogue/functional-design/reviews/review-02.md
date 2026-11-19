## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-17T02:43:57Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR3.1 logic and violation | 項目状態の決め方に抜けがある。出典 A に値があり、出典 B は読めたが項目が無い場合（例: sds_commit は sds_pin と workflow_caller の 2 出典を持つ）は、conflict（有効な値が 2 つ以上で異なる）、missing（読めた全出典に無い）、confirmed（全出典が有効で一致）のどれにも当たらない。violation 欄の「曖昧なら unobservable」は、読めている項目を観測不能と誤ってラベルする。Item State Machine と BR4.1 の質問生成も、この場合の状態と質問の扱いが決まらない。 | 「一部の出典にだけ値がある」場合の状態（新しい状態か、既存状態への明示的な割当）と質問の扱いを BR3.1 に定める。BR3.1 の順序を全ての組み合わせで 1 つの状態に決まる形に直す。正例・負例の試験（T3.1+・T3.1-）にこの境界を加える。「曖昧なら unobservable」の既定を外すか、使う場面を限定する。 | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/functional-spec.md > W06, W07, Item State Machine, BR8.3, BR9.2 | U6 の「選択→再確認→切替」との線が引かれていない。unit-of-work.md の U2 除外は、U6 のこの実追加を先取りして完成扱いしないと定める。ところが U2 の設計は、(a) 利用者が「次の操作」の候補を選べる GuidanceSelection を作り（W07）、(b) 再観測で回答を無効にして項目を再評価し、新しい draft を示し、他の回答を保持する（BR6.2・BR8.3）。これは AC3.3.2 の「B を選ぶ→再照合→解消した B と残る A の案内へ切替、A の回答は保持」とほぼ同じ動作である。再観測を誰が何を契機に起こすかも未定義で、BR9.2 は線を述べていない。U2 が先に作ると、U6 の AC3.3.6（初回に既にある動作は増分に数えない）を満たせなくなる。 | U2 で行うことと U6 に残すことを、契機（誰が再観測を起こすか）と出力（選択に結びつく再照合と案内切替をするか）で書き分ける。選べるのは出典の食い違いの値（Q1 = A の choose-source）に限り、「次の操作」の候補選択と、選択を契機にした再照合・案内切替は U6 の持ち物とすることを、BR9.2 と W07 に明記する。境界を確かめる負例を T9.2- に加える。 | Resolved (reviewer) |
| R-03 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR5.2, BR5.1 and entities.md > Answer | AC1.3.3 を支える秘密の扱いの判定基準が、試験できる形で書かれていない。「秘密の値らしい（鍵・token・資格情報の形）」は判定の集合が無く、見逃した場合（未検出の秘密が value として保持・表示される）の扱いも無い。rejected の理由（rejectionReason）や案内に入力の値を写してはならないことが、BR5.1・BR5.2 に書かれていない（rejectionReason は string で、写しを禁じる制約が無い）。Answer.valueDigest が rejected の回答にも要るのかも未定義で、秘密の digest を保持すると推測攻撃の足場になる。 | 秘密らしさの判定の最小の集合と、判定が確実でない入力の既定（保持せず rejected にするなど）を BR5.2 に定める。rejected の理由・案内・記録に入力の値を含めないこと、rejected の回答は valueDigest を持たないことを、BR5.1・BR5.2 と entities の Answer の制約に書く。T5.2- に「未検出の形の入力」と「理由に値が写らない」を加える。 | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR4.1, BR4.2, entities.md > GuidanceMessage.nextAction | 状態 wrong_target と、利用者が直せない invalid には、質問（BR4.1 が除外）も案内の nextAction（BR4.2 は unobservable だけ。enum に該当が無い）も定められておらず、利用者の行き先が無い行き止まりになる。BR3.1 は wrong_target を最優先にするため、別の出典に正しい値があっても項目全体が wrong_target に隠れる。 | wrong_target・invalid（直せない）の nextAction（対象の指定の見直しなど）と、有効な別出典の値の見せ方を BR3.3・BR4.x に定める。 | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR5.4, BR6.2, BR8.3 and entities.md > ConfigurationDraft.draftDigest | draftDigest は items・answers・observationRefs から導くが、BR8.3 は「再観測で draftDigest が変わる」ときに古い draft・selection を無効にする。回答を 1 件足しただけでも draftDigest が変わり、直前の選択が無効になる。entities の invariants は observationRefs の digest の変化だけを理由に挙げており、BR8.3 と食い違う。BR5.4 の「最新を有効とする」も、到着順か呼出側が渡す answeredAt か不明で、遅れて届いた古い回答の扱いが決まらない。計画（questions）が約束した「古い応答が後から来る場合は最後の観測の結果だけを使う」に対応する規則も無い。 | 無効化の契機を観測の変化だけに揃えるか、draftDigest の入力から answers を外す（または別の digest に分ける）。BR5.4 の「最新」の定義と、観測の時刻（observedAt）の古い結果を捨てる規則を足し、試験を置く。 | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/traceability.json > AC3.2.5 | story map が U2 に割り当てた AC3.2.5 を N/A にしている。一方で U2 は完了範囲の表示（BR9.4）と継続利用の確認（BR6.4）を寄与として挙げており、N/A（適用外）は実態に合わない。FR2.4・AC3.2.5 の「設定・履歴の継続利用」を、保存しない（Q2 = A）代わりに再観測で確かめるという読みは、Owner の条件が挙げた AC3.1.3 だけに持ち越しの行があり、AC3.2.5 の履歴の部分には記録が無い。 | AC3.2.5 を、U2 の寄与（BR6.4・BR9.4）を持つ行と、持ち越す部分（履歴の継続利用）を分けた行にし、履歴の部分の持ち越し先と理由（Q2 = A）を AC3.1.3 と同じ形で記録する。 | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/traceability.json > AC1.3.2, AC2.2.1, AC1.1.3 | OK 行の主張が強い。AC1.3.2 は「契約で定める優先関係と出典を示す」と書くが、Q1 = A で優先関係を定めないため、この AC を「順位は無く全出典を示す」と読んだことが行に書かれていない。AC2.2.1 の「対象と版を識別して双方向に追跡でき」は U1 の寄与で、U2 の BR7.1（案内の並び）・BR7.6（理由コードを読む）は一部しか満たさない。AC1.1.3 の「依存する開始を止める」は U3 の寄与（BR2.2 自身がそう述べている）。 | 各行に U2 が満たす部分と外の条件を注記し、AC1.3.2 には Q1 = A の読みを書く。 | Resolved (reviewer) |
| R-08 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/entities.md > initialCatalog | 項目ごとの出典（例: protected_paths の出典を sds_pin、required_checks を workflow_caller と sds_pin とする）が、対象の実ファイルの根拠なしに置かれている。この審査では作業場の外の実物を開けず、検証できなかった。team.md の配布の節は protected_paths を pin とは別に挙げており、出典の割当は未確認の主張である。 | 各 itemKey の出典を、設計の入力にした実物の位置と突き合わせた根拠（読んだ file と SHA-256）で裏づけるか、「後続の設計で確定する」と明記する。 | Resolved (reviewer) |
| R-09 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR3.2 / BR4.1 / BR4.2、entities.md > initialCatalog | BR3.2 は conflict の nextAction を choose-source とするが、BR4.1 は userAnswerable が真の項目しか質問にしない。initialCatalog で userAnswerable が真なのは aidlc_settings だけ。そのため、2 出典を持つ sds_commit と required_checks の conflict（BR3.1 の (3) で今回増えた「一部の出典にだけ値がある」を含む）と、非応答の項目の missing は、質問も nextAction も決まらない。BR4.2 は unobservable・wrong_target・直せない invalid しか扱わない。この組み合わせが行き止まりになる。 | userAnswerable = false の conflict と missing の nextAction を決める（例: 出典の持ち主へ直しを頼む fix-source、または choose-source を userAnswerable に関係なく許すか禁じるか）。BR4.1 と BR3.2 の条件をそろえ、T4.1- か T3.2- に試験を足す。 | New |
| R-10 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/entities.md > initialCatalog、rules.md > BR5.2 (e) | BR5.2 (e) と fail-closed の既定は項目ごとの「許される形式」（valueType・normalization）に頼る。しかし initialCatalog の各項目は valueType を持たない（aidlc_settings は userAnswerable が真なのに valueType が無い）。形式が決まっていないので、正当な回答が拒否される範囲と、見逃される範囲が試験で固定できない。rejectionReason の固定分類も secret_like しか挙げていない。 | userAnswerable が真の項目に valueType と許される形式を置くか、後の設計で決めると A-07 と同じ形で書く。固定分類の集合（secret_like・type・length など）を列挙する。 | New |
| R-11 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR3.2、entities.md > GuidanceSelection / Answer | choose-source の結果が「回答として保持」（BR3.2）と GuidanceSelection.candidateRef（W07）の 2 か所に現れ、Answer の value と valueDigest で「無いまま」をどう表すか決まっていない。BR4.3 が「有効な回答」で再質問を止める以上、選択が Answer になるかどうかで挙動が変わる。 | choose-source の選択を Answer としても保持するか、selection のみかを 1 つに決める。「この出典には無い」の表現（valueDigest を含む）を定め、T3.2+ か T4.3 に試験を足す。 | New |

> R-01 Reviewer note: BR3.1 が出典ごとを value/absent/unavailable/wrong_target/invalid に分け、4 つの場合で 1 状態に決める。一部の出典だけに値がある場合は conflict（「この出典には無い」を候補に載せる）と定め、unobservable の既定は外れた。T3.1 の負例に境界（一部のみ値あり、値あり＋他が unavailable、非必須の absent 無視）が入った。

> R-02 Reviewer note: BR9.2 と W07 が契機と出力で線を引いた。U2 は呼出側要求の再観測と choose-source の受付まで。「次の操作」の選択、選択を契機にした再照合と切替（AC3.3.2）は U6。選択は choose-source の値に限り、T9.2- にも負例が入った。

> R-03 Reviewer note: BR5.2 に検出の最小集合 (a)〜(e) と fail-closed の既定が入った。rejected は value も valueDigest も持たず、reason は入力から作らない固定分類（secret_like）。T5.2- に集合内外の負例が入った。残る細部は新規の指摘に記す。

> R-04 Reviewer note: wrong_target は review-target、直せない invalid は fix-source を nextAction にした。別の出典の有効な値は「参考（採用していない）」として示す。entities の nextAction.kind にも反映済み。

> R-05 Reviewer note: 無効にする契機は observationDigest の変化だけに揃え、draftDigest は同一性の識別に限った。「最新」は answeredAt、観測は observedAt で定義した。古い回答・観測を捨てる規則と試験（T5.4-、T8.3-、T9.1-）が入った。

> R-06 Reviewer note: AC3.2.5 を OK（U2 の寄与: BR6.4 BR9.4）と Deferred（履歴の部分。U3 が主、U5、U6、U7、理由は Q2 = A）に分けた。sensor-traceability は pass: true。

> R-07 Reviewer note: AC1.1.3、AC2.2.1、AC1.3.2 に U2 の寄与と外の条件、Q1 = A の読みが注記された。

> R-08 Reviewer note: 仮定 A-07 を entities と functional-spec の両方に記録した。initialCatalog の出典の割当は、実物と突き合わせるまで確認できずとして扱う。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability --stage-slug functional-design | pass: true、gaps 0、orphans 0、missing_from_table 0、invalid_entries 0 | 20 AC と AC3.1.3 の行が上流に結ばれている。AC3.2.5 を OK と Deferred に分けた行も受け入れられた。 |

### Summary

前回の 8 件はすべて直っており、BR3.1 の全組み合わせの決定、U6 との線、秘密の検出の集合は実装できる水準に達した。新しい穴は 1 つ。userAnswerable が偽の項目で conflict と missing に次の操作が無い点（Major 1 件。READY の条件の範囲内）と、Minor 2 件を作る段の前に直すとよい。
