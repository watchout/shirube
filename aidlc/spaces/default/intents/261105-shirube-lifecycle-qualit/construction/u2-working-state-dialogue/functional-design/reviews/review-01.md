## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-17T02:39:03Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR3.1 logic and violation | 項目状態の決め方に抜けがある。出典 A に値があり、出典 B は読めたが項目が無い場合（例: sds_commit は sds_pin と workflow_caller の 2 出典を持つ）は、conflict（有効な値が 2 つ以上で異なる）、missing（読めた全出典に無い）、confirmed（全出典が有効で一致）のどれにも当たらない。violation 欄の「曖昧なら unobservable」は、読めている項目を観測不能と誤ってラベルする。Item State Machine と BR4.1 の質問生成も、この場合の状態と質問の扱いが決まらない。 | 「一部の出典にだけ値がある」場合の状態（新しい状態か、既存状態への明示的な割当）と質問の扱いを BR3.1 に定める。BR3.1 の順序を全ての組み合わせで 1 つの状態に決まる形に直す。正例・負例の試験（T3.1+・T3.1-）にこの境界を加える。「曖昧なら unobservable」の既定を外すか、使う場面を限定する。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/functional-spec.md > W06, W07, Item State Machine, BR8.3, BR9.2 | U6 の「選択→再確認→切替」との線が引かれていない。unit-of-work.md の U2 除外は、U6 のこの実追加を先取りして完成扱いしないと定める。ところが U2 の設計は、(a) 利用者が「次の操作」の候補を選べる GuidanceSelection を作り（W07）、(b) 再観測で回答を無効にして項目を再評価し、新しい draft を示し、他の回答を保持する（BR6.2・BR8.3）。これは AC3.3.2 の「B を選ぶ→再照合→解消した B と残る A の案内へ切替、A の回答は保持」とほぼ同じ動作である。再観測を誰が何を契機に起こすかも未定義で、BR9.2 は線を述べていない。U2 が先に作ると、U6 の AC3.3.6（初回に既にある動作は増分に数えない）を満たせなくなる。 | U2 で行うことと U6 に残すことを、契機（誰が再観測を起こすか）と出力（選択に結びつく再照合と案内切替をするか）で書き分ける。選べるのは出典の食い違いの値（Q1 = A の choose-source）に限り、「次の操作」の候補選択と、選択を契機にした再照合・案内切替は U6 の持ち物とすることを、BR9.2 と W07 に明記する。境界を確かめる負例を T9.2- に加える。 | New |
| R-03 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR5.2, BR5.1 and entities.md > Answer | AC1.3.3 を支える秘密の扱いの判定基準が、試験できる形で書かれていない。「秘密の値らしい（鍵・token・資格情報の形）」は判定の集合が無く、見逃した場合（未検出の秘密が value として保持・表示される）の扱いも無い。rejected の理由（rejectionReason）や案内に入力の値を写してはならないことが、BR5.1・BR5.2 に書かれていない（rejectionReason は string で、写しを禁じる制約が無い）。Answer.valueDigest が rejected の回答にも要るのかも未定義で、秘密の digest を保持すると推測攻撃の足場になる。 | 秘密らしさの判定の最小の集合と、判定が確実でない入力の既定（保持せず rejected にするなど）を BR5.2 に定める。rejected の理由・案内・記録に入力の値を含めないこと、rejected の回答は valueDigest を持たないことを、BR5.1・BR5.2 と entities の Answer の制約に書く。T5.2- に「未検出の形の入力」と「理由に値が写らない」を加える。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR4.1, BR4.2, entities.md > GuidanceMessage.nextAction | 状態 wrong_target と、利用者が直せない invalid には、質問（BR4.1 が除外）も案内の nextAction（BR4.2 は unobservable だけ。enum に該当が無い）も定められておらず、利用者の行き先が無い行き止まりになる。BR3.1 は wrong_target を最優先にするため、別の出典に正しい値があっても項目全体が wrong_target に隠れる。 | wrong_target・invalid（直せない）の nextAction（対象の指定の見直しなど）と、有効な別出典の値の見せ方を BR3.3・BR4.x に定める。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/rules.md > BR5.4, BR6.2, BR8.3 and entities.md > ConfigurationDraft.draftDigest | draftDigest は items・answers・observationRefs から導くが、BR8.3 は「再観測で draftDigest が変わる」ときに古い draft・selection を無効にする。回答を 1 件足しただけでも draftDigest が変わり、直前の選択が無効になる。entities の invariants は observationRefs の digest の変化だけを理由に挙げており、BR8.3 と食い違う。BR5.4 の「最新を有効とする」も、到着順か呼出側が渡す answeredAt か不明で、遅れて届いた古い回答の扱いが決まらない。計画（questions）が約束した「古い応答が後から来る場合は最後の観測の結果だけを使う」に対応する規則も無い。 | 無効化の契機を観測の変化だけに揃えるか、draftDigest の入力から answers を外す（または別の digest に分ける）。BR5.4 の「最新」の定義と、観測の時刻（observedAt）の古い結果を捨てる規則を足し、試験を置く。 | New |
| R-06 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/traceability.json > AC3.2.5 | story map が U2 に割り当てた AC3.2.5 を N/A にしている。一方で U2 は完了範囲の表示（BR9.4）と継続利用の確認（BR6.4）を寄与として挙げており、N/A（適用外）は実態に合わない。FR2.4・AC3.2.5 の「設定・履歴の継続利用」を、保存しない（Q2 = A）代わりに再観測で確かめるという読みは、Owner の条件が挙げた AC3.1.3 だけに持ち越しの行があり、AC3.2.5 の履歴の部分には記録が無い。 | AC3.2.5 を、U2 の寄与（BR6.4・BR9.4）を持つ行と、持ち越す部分（履歴の継続利用）を分けた行にし、履歴の部分の持ち越し先と理由（Q2 = A）を AC3.1.3 と同じ形で記録する。 | New |
| R-07 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/traceability.json > AC1.3.2, AC2.2.1, AC1.1.3 | OK 行の主張が強い。AC1.3.2 は「契約で定める優先関係と出典を示す」と書くが、Q1 = A で優先関係を定めないため、この AC を「順位は無く全出典を示す」と読んだことが行に書かれていない。AC2.2.1 の「対象と版を識別して双方向に追跡でき」は U1 の寄与で、U2 の BR7.1（案内の並び）・BR7.6（理由コードを読む）は一部しか満たさない。AC1.1.3 の「依存する開始を止める」は U3 の寄与（BR2.2 自身がそう述べている）。 | 各行に U2 が満たす部分と外の条件を注記し、AC1.3.2 には Q1 = A の読みを書く。 | New |
| R-08 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/functional-design/entities.md > initialCatalog | 項目ごとの出典（例: protected_paths の出典を sds_pin、required_checks を workflow_caller と sds_pin とする）が、対象の実ファイルの根拠なしに置かれている。この審査では作業場の外の実物を開けず、検証できなかった。team.md の配布の節は protected_paths を pin とは別に挙げており、出典の割当は未確認の主張である。 | 各 itemKey の出典を、設計の入力にした実物の位置と突き合わせた根拠（読んだ file と SHA-256）で裏づけるか、「後続の設計で確定する」と明記する。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability | {"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0} | 構造は通る。ただし N/A と OK の行の意味（中身）は別で、上の Minor の指摘のとおり。 |

### Summary

U2 の 20 件の AC は漏れなく行に載り、Q1 = A・Q2 = A と持ち越し（AC3.1.3 を U3・U5 へ）、理由コードを U1 だけに置く点は矛盾なく反映されている。ただし BR3.1 の状態決定の抜け、U6 の選択→再照合→切替との境界の未定義、秘密の判定基準の試験不能の 3 件の Major があり、Major が 2 件を超えるため NOT-READY とする。
