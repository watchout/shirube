# 決まり（Business Rules）— U1 u1-skeleton

出典:
- 要件: `inception/requirements-analysis/requirements.md` の FR・NFR
- 受け渡しの形: `inception/contract-design/contract-summary.md`（C9 は 2026-10-23 に Contract Design を開き直して足した）
- Unit: `inception/units-generation/unit-of-work.md`
- 物語: `inception/user-stories/stories.md`
- この段の答え: `functional-design-questions.md` の Q1〜Q11
- 独立監査の指摘: shirube PR #65 の sds-audit-review の BF-01〜BF-03

```yaml
rules:
  # BR1 PR の block の AI-DLC の記録の欄
  - id: BR1.1
    statement: PR の block に aidlc_record が無い PR は、記録の判定を FAIL にする
    category: validation
    applies_to: SdsPrBlock
    trigger: 門が PR の block を読んだ時
    logic: IF aidlc_record が無い THEN 記録の判定 = FAIL（理由「aidlc_record が無い」）
    violation: 記録の判定が FAIL。記録だけの段では統合を止めない
    source: FR2.1
  - id: BR1.2
    statement: aidlc_record の intent と stage は文字列で必須。Construction の Unit の段では unit も必須
    category: validation
    applies_to: AidlcRecordRef
    trigger: aidlc_record がある時
    logic: IF intent か stage が無い、または Construction の Unit の段で unit が無い THEN FAIL（足りない欄の名前を出す）
    violation: 記録の判定が FAIL
    source: FR2.1
  - id: BR1.3
    statement: fixes_pr がある時は、形が <owner>/<repo>#<番号> でなければならない
    category: validation
    applies_to: SdsPrBlock.fixesPr
    trigger: fixes_pr がある時
    logic: IF 形が違う THEN 記録の判定の理由に「fixes_pr の形が違う」を足す（U1 では読むだけで数えない）
    violation: 理由に出す。数えるのは U2
    source: FR1.4

  # BR2 前の段の決め方（段の順の記録 C9 だけを使う。Q1・Q8、BF-02）
  - id: BR2.1
    statement: 前の段は、main の段の順の記録（approvals/<intent>/_sequence.json）だけから求める。aidlc-state.md と audit は読まない
    category: policy
    applies_to: StageSequence
    trigger: aidlc_record が形として正しい時
    logic: >
      PR が指す段（と Unit）の一番新しい試行の行を探す。その行より前の行のうち、同じ Unit の段の行の一番新しい試行の行を、前の段とする。
      Unit の最初の段の前は、Inception の最後の段の行とする（C9）
    violation: —
    source: FR2.1
  - id: BR2.2
    statement: 段の順の記録が無い・JSON として読めない・形が違う・intent が違う時は FAIL にし、探した path を出す
    category: validation
    applies_to: StageSequence
    trigger: 段の順の記録を読んだ時
    logic: IF 無い、読めない、schema が sds-stage-sequence/1 でない、必須の欄が無い、intent が aidlc_record と違う THEN FAIL（理由に path と、足りない物）
    violation: 記録の判定が FAIL。PASS にはしない
    source: FR2.1
  - id: BR2.3
    statement: PR が指す段（と Unit）の行が段の順の記録に無い時は FAIL
    category: validation
    applies_to: AidlcRecordRef
    trigger: 前の段を求める時
    logic: IF 行が見つからない THEN FAIL（理由「その段は段の順の記録に無い」と、段と Unit）
    violation: 記録の判定が FAIL
    source: FR2.1
  - id: BR2.4
    statement: PR が指す段の前に行が無い時（intent の最初の段）は、求める承認が無いので PASS
    category: policy
    applies_to: StageSequence
    trigger: 前の段を求める時
    logic: IF 前の行が無い THEN 記録の判定 = PASS（理由「最初の段」）
    violation: —
    source: FR2.1
  - id: BR2.5
    statement: 複数の Unit がある時は、前の段を同じ Unit の行だけから決め、ほかの Unit の行は使わない
    category: constraint
    applies_to: StageSequence
    trigger: 前の段を求める時
    logic: IF 前の行がほかの Unit の行 THEN その行を飛ばして、同じ Unit の行か Inception の最後の段の行を探す
    violation: —
    source: FR2.1

  # BR3 承認の確かめ（Q2・Q3・Q10）
  - id: BR3.1
    statement: 段の順の記録と承認の記録は、PR の base（main）からだけ読む
    category: authorization
    applies_to: ApprovalRecord
    trigger: 前の段の承認を探す時
    logic: 2 つの file を base の commit から読む。PR の head の記録は読まない
    violation: head にだけある記録は無い物として扱う
    source: FR2.2
  - id: BR3.2
    statement: 前の段の一番新しい試行の行が approved = false なら FAIL にし、要る試行の番号を出す
    category: validation
    applies_to: StageSequenceEntry
    trigger: 前の段の行が決まった時
    logic: IF approved = false THEN FAIL（理由に、段・Unit と、要る試行の番号）。古い試行の行が approved = true でも採らない
    violation: 記録の判定が FAIL
    source: FR2.1
  - id: BR3.3
    statement: 前の段の行の approval_ref は、C2 の置き場の決まり（approvals/<intent>/<段>/<unit>.json、Inception の段は _intent.json）と同じ path でなければならない
    category: validation
    applies_to: StageSequenceEntry.approvalRef
    trigger: approved = true の行を読んだ時
    logic: IF approval_ref が無い、または決まりの path と違う THEN FAIL（理由に決まりの path）
    violation: 記録の判定が FAIL
    source: FR2.2
  - id: BR3.4
    statement: 形 sds-approval-record/1 で必須の欄がそろい、intent・段・Unit が前の段と同じで、identity_check が none の記録を、承認として受け入れる
    category: validation
    applies_to: ApprovalRecord
    trigger: 承認の記録を読めた時
    logic: IF schema と必須の欄がそろい、intent・段・Unit が前の段の行と同じ、identity_check = none THEN 次の BR3.5 へ
    violation: 形が違えば BR3.6
    source: FR2.2
  - id: BR3.5
    statement: 承認の記録の試行の番号は、段の順の記録の前の段の一番新しい試行の番号と同じでなければならない
    category: constraint
    applies_to: ApprovalRecord.attempt
    trigger: 記録を受け入れる前
    logic: IF attempt が行の attempt と違う THEN FAIL（理由に、要る試行の番号）。同じなら記録の判定 = PASS
    violation: 記録の判定が FAIL
    source: FR2.1
  - id: BR3.6
    statement: 承認の記録が無い・読めない・壊れている時は FAIL にし、探した path を出す
    category: validation
    applies_to: ApprovalRecord
    trigger: 記録を探した時
    logic: IF 無い、JSON として読めない、形が違う THEN FAIL（理由に探した path）
    violation: 記録の判定が FAIL。PASS にはしない
    source: FR2.1
  - id: BR3.7
    statement: 決まった形の file のほかは、承認として読まない
    category: authorization
    applies_to: ApprovalRecord
    trigger: 承認を探す時
    logic: コメントの文、ほかの形の file、AI-DLC の audit の file、aidlc-state.md は、承認として扱わない
    violation: —
    source: FR2.2

  # BR4 門の結果
  - id: BR4.1
    statement: U1 の記録の判定は記録だけ（report-only）で動き、FAIL でも commit status の state を変えない
    category: policy
    applies_to: GateResult
    trigger: 門が結果をまとめる時
    logic: 記録の判定の mode = report-only。state は blocking の判定だけで決める
    violation: —
    source: FR7.1
  - id: BR4.2
    statement: 門は成功でも失敗でも、log に sds-gate-result/1 の 1 行の JSON を出す
    category: policy
    applies_to: GateResult
    trigger: 門が終わる時
    logic: 判定ごとの id・verdict・mode・reasons を並べた 1 行の JSON を標準出力に出す
    violation: 出せない時は門の失敗として exit code を返す
    source: FR1.10
  - id: BR4.3
    statement: GitHub が読めない・時間切れの時は「観測できず」を返し、PASS にしない
    category: policy
    applies_to: GateResult
    trigger: GitHub への問い合わせが失敗した時
    logic: 問い合わせごとに時間の上限を持ち、超えたら verdict = UNOBSERVABLE（exit code 2）。自動の再試行はしない。file が無いと GitHub が答えた時は「観測できず」ではなく BR2.2・BR3.6 の FAIL
    violation: —
    source: NFR3
  - id: BR4.4
    statement: 同じ head で門が 2 回動いても、結果は同じで、書くのは commit status 1 つだけ
    category: constraint
    applies_to: GateResult
    trigger: 門が動く時
    logic: 判定の入力は base の記録と PR の内容だけで、時刻は引数で渡す。書込みは commit status 1 つ
    violation: —
    source: NFR13

  # BR5 承認の記録と段の順の記録の作り手（最小の形。Q4・Q8・Q10）
  - id: BR5.1
    statement: 作り手は、段の承認の出来事から承認の記録を作る（Inception の段と Code Generation 以降）
    category: calculation
    applies_to: ApprovalRecord
    trigger: 席が作り手の CLI を動かした時
    logic: intent・段・Unit・audit の場所を受け、その段（と Unit）の一番新しい試行の承認の出来事を見つけたら、欄の順を決めた 1 つの JSON を作業場の file に書く
    violation: BR5.3
    source: FR2.2
  - id: BR5.2
    statement: Unit の設計の段（Functional Design・NFR Requirements・NFR Design・Infrastructure Design）は、要約の確認の記録と Unit の完了の記録の両方が、その段の一番新しい試行にそろった時だけ承認の記録を作る
    category: calculation
    applies_to: ApprovalRecord
    trigger: Unit の設計の段の承認の記録を作る時
    logic: IF 2 つがそろう THEN 作る（approved_at は 2 つのうち遅い方の時刻）。IF 片方だけ、または古い試行の物だけ THEN 作らない（BR5.3）
    violation: BR5.3
    source: FR2.1
  - id: BR5.3
    statement: 作る元の出来事が無い時は、その承認の記録を書かずに失敗で終わる
    category: validation
    applies_to: ApprovalRecord
    trigger: 出来事が見つからない時
    logic: IF 見つからない THEN exit code 1、理由を出し、その file は作らない
    violation: —
    source: NFR1
  - id: BR5.4
    statement: source_event_digest は、作る元にした出来事（Unit の設計の段は 2 つの記録）の本文の SHA-256 とする。同じ入力からは同じ bytes を作る
    category: calculation
    applies_to: ApprovalRecord.sourceEventDigest
    trigger: 記録を作る時
    logic: 出来事の本文の bytes から SHA-256 を求める（2 つの時は audit に書かれた順に並べる）。時刻は出来事に書かれた時刻を使い、今の時刻を読まない
    violation: —
    source: NFR2
  - id: BR5.5
    statement: 作り手は、承認の記録と一緒に、intent の段の順の記録を audit から作り直す
    category: calculation
    applies_to: StageSequence
    trigger: 席が作り手の CLI を動かした時
    logic: >
      audit から、実行した段・Unit・試行を実行した順に並べる。飛ばした段は入れない。開き直した段は新しい試行の行を足し、古い行を消さない。
      各行の approved は BR5.1・BR5.2 で承認の記録を作れる時だけ true とし、approval_ref に C2 の置き場の path を書く。
      approvals/<intent>/_sequence.json を作業場に書く（前の file は置き換える）
    violation: audit が読めない時は何も書かずに exit code 1
    source: FR2.1
  - id: BR5.6
    statement: 段の順の記録は、同じ audit からは同じ bytes になる。source_digest は U1 では intent の audit の shard 全体の SHA-256 とする
    category: calculation
    applies_to: StageSequence.sourceDigest
    trigger: 段の順の記録を作る時
    logic: shard の file を名前の順に並べ、bytes をつないだ物の SHA-256 を求める。欄と行の順を決めておく。範囲の決め方（shard 全体か、段の出来事だけか）は U3 で決め直す（C9 の未決の問い）
    violation: —
    source: NFR2
  - id: BR5.7
    statement: 作り手は push も統合もせず、作業場に file を書くだけ
    category: authorization
    applies_to: ApprovalRecordWriter
    trigger: 記録を作る時
    logic: file を書いたら終わる。記録を main に入れるのは、記録を入れる PR（席が作る）。audit の file は写さない（iyasaka-arc#49 6354411741）
    violation: —
    source: NFR10

  # BR6 計測の最小の形（Q5）
  - id: BR6.1
    statement: 計測は repo の一覧と期間と今の時刻を引数で受ける
    category: policy
    applies_to: GateCountSnapshot
    trigger: 計測を動かす時
    logic: 期間は日本時間の日で、始まりと終わりの両日を含む。今の時刻は引数で受け、計算の核は時計を読まない
    violation: 引数が足りない・形が違う時は exit code 1
    source: NFR2
  - id: BR6.2
    statement: 期間の中に統合された PR ごとに、門の status の state と log の 1 行の JSON を読み、PASS・FAIL・観測できずに分ける
    category: calculation
    applies_to: GateCountSnapshot.gateCounts
    trigger: PR を数える時
    logic: IF status と log の JSON がある THEN log の verdict で分ける。IF どちらかが無い THEN 観測できず
    violation: —
    source: FR1.10
  - id: BR6.3
    statement: 出力は sds-metrics/1 の最小の欄を持つ 1 行の JSON で、件数の合計は PR の件数と同じ
    category: constraint
    applies_to: GateCountSnapshot
    trigger: 計測が終わる時
    logic: pass + fail + unobservable = prCount。PR が 0 件なら件数は全部 0 で、note に n/a
    violation: —
    source: NFR11
  - id: BR6.4
    statement: 読めない repo がある時は、その repo を観測できずとし、partial を true、exit code を 2 にする
    category: policy
    applies_to: GateCountSnapshot
    trigger: GitHub の問い合わせが失敗・時間切れの時
    logic: 問い合わせごとの時間の上限と全体の予算を持ち、使い切ったらその repo の state = unobservable。読めた repo の件数は出す
    violation: —
    source: NFR3
  - id: BR6.5
    statement: 計測はどこにも書かない
    category: authorization
    applies_to: MetricsCollector
    trigger: 計測を動かす時
    logic: 出力は標準出力だけ。GitHub への書込みはしない（#53 の置き換えは W2 の道具）
    violation: —
    source: NFR10

  # BR7 shirube 自身の門の呼出し・pin・網羅率の床（保護面）
  - id: BR7.1
    statement: shirube の PR で、固定した shirube の commit の門を、記録だけで動かす
    category: policy
    applies_to: shirube の門の呼出しの workflow
    trigger: shirube の PR の出来事
    logic: 呼出しは固定 commit の再利用 workflow を使い、PR の head のコードでは門を動かさない。pin の mode は記録だけ
    violation: —
    source: FR10.1
  - id: BR7.2
    statement: 統合の前の CI で、行の網羅率が 80% 以上かを確かめる
    category: constraint
    applies_to: shirube の CI
    trigger: PR と main への push
    logic: IF 行の網羅率 < 80% THEN CI を失敗にする
    violation: CI が失敗し、統合できない
    source: NFR8
  - id: BR7.3
    statement: 配布キットは、target が shirube 自身の時、門の呼出しを .github/workflows/sds-gate-self.yml に書き、再利用 workflow の .github/workflows/sds-gate.yml を書き換えない（Q9、BF-03）
    category: constraint
    applies_to: KitCallerTarget
    trigger: kit の render・apply・upgrade・check が動く時
    logic: >
      target の .github/workflows/sds-gate.yml が on: workflow_call を持つなら selfTarget = true とし、呼出しの書き先と check の比べ先を sds-gate-self.yml にする。
      それ以外の target は今までどおり sds-gate.yml。selfTarget の時に sds-gate.yml へ書こうとしたら、何も書かずに exit code 1
    violation: kit が失敗で終わり、file を書かない
    source: FR10.1
  - id: BR7.4
    statement: shirube の pin の版上げも、配布先と同じ kit の版上げの PR で行える
    category: policy
    applies_to: KitCli
    trigger: shirube の pin を上げる時
    logic: kit の upgrade が sds-gate-self.yml と .shirube/sds-pin.json を書き、差分がキットの file だけで kit check が OK なら、配布先と同じ版上げの決まり（iyasaka-arc#49 6308341298 の 1）に当たる
    violation: —
    source: FR10.1
  - id: BR7.5
    statement: 保護面の 1 本の PR に同梱する file（AI-DLC の自己適用の file・.gitignore の audit の除外）と、kit を shirube に当てた時に書く file を、U1 の置き場に入れる（Q7・Q11、BF-01）。kit が書く file は P1 には入れない（P1 は手で組む = U1 の NFR Requirements の Q8）。I2 の後の kit の版上げの PR（K）で入れる（Delivery Planning の Q11）
    category: policy
    applies_to: U1 の置き場の宣言（sds-design-locations）
    trigger: U1 の PR の変更 path を置き場と比べる時
    logic: .aidlc-version・aidlc.settings.json・.claude/settings.json・.gitignore・.shirube/hygiene-profile.md・tests/self-aidlc-settings.test.mjs と、kit が書く .claude/skills/sds-audit/SKILL.md・.github/pull_request_template.md・AGENTS.md を、functional-spec.md の置き場の block に並べる。.gitignore には audit の記録の置き場を除外する行を足す
    violation: —
    source: FR10.1
```

## 決まりの一覧

| 群 | 決まり | 要点 |
|----|--------|------|
| BR1 | BR1.1〜BR1.3 | PR の block の記録の欄の形 |
| BR2 | BR2.1〜BR2.5 | 前の段は main の段の順の記録だけから求める。無い・壊れた・intent が違う時は FAIL、ほかの Unit の行は使わない |
| BR3 | BR3.1〜BR3.7 | main からだけ読む。前の段の一番新しい試行が承認済みで、承認の記録の試行が同じ時だけ PASS。決まった形だけ |
| BR4 | BR4.1〜BR4.4 | 記録だけの判定、log の 1 行の JSON、観測できず、同じ head で同じ結果 |
| BR5 | BR5.1〜BR5.7 | 作り手は承認の記録と段の順の記録を audit から同じ bytes で作り、push せず、audit を写さない。Unit の設計の段は 2 つの記録がそろった時だけ承認 |
| BR6 | BR6.1〜BR6.5 | 計測は引数で受け、数えて出すだけで、書かない |
| BR7 | BR7.1〜BR7.5 | shirube 自身の門の呼出し・pin・網羅率の床、kit の自己用の書く先、保護面の同梱の置き場（保護面は Owner の exact-head） |

## 負例（記録の橋の試験に入れる。C9）

| 負例 | 決まり | 結果 |
|------|--------|------|
| 開き直した後の新しい試行に承認が無い（古い試行の行だけが approved = true） | BR3.2 | FAIL。要る試行の番号を出す |
| 複数の Unit がある（前の行がほかの Unit） | BR2.5 | ほかの Unit の行を使わずに、同じ Unit の行で判定する |
| 段の順の記録が無い・壊れている・intent が違う | BR2.2 | FAIL。探した path を出す |
| 承認の記録の試行の番号が、段の順の記録の一番新しい試行と違う | BR3.5 | FAIL。要る試行の番号を出す |
| PR の head にだけ承認の記録がある | BR3.1 | 無い物として FAIL（BR3.6） |
| Unit の設計の段で、要約の確認の記録だけがあり Unit の完了の記録が無い | BR5.2 | 承認の記録を作らず、段の順の記録の approved = false |
| kit の target が shirube 自身 | BR7.3 | sds-gate.yml を書き換えず、sds-gate-self.yml に書く |
