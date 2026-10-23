# 決まり（Business Rules）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の FR・NFR）、受け渡しの形（`inception/contract-design/contract-summary.md`）、Unit（`inception/units-generation/unit-of-work.md`）、物語（`inception/user-stories/stories.md`）、この段の答え（`functional-design-questions.md` の Q1〜Q6）。

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
    statement: aidlc_record の intent と stage は文字列で必須。Construction の段では unit も必須
    category: validation
    applies_to: AidlcRecordRef
    trigger: aidlc_record がある時
    logic: IF intent か stage が無い、または Construction の段で unit が無い THEN FAIL（足りない欄の名前を出す）
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

  # BR2 直前の段の決め方
  - id: BR2.1
    statement: 確かめる承認は、PR が指す段の、直前に実行された段の承認とする
    category: policy
    applies_to: StageSequence
    trigger: aidlc_record が形として正しい時
    logic: main の状態の記録から、飛ばした段を除いた実行の順を作り、PR が指す段（Construction の段は同じ Unit の中）の 1 つ前の段を求める。Unit の最初の段の前は、Inception の最後の段とする
    violation: —
    source: FR2.1
  - id: BR2.2
    statement: PR が指す段が状態の記録に無い時は FAIL
    category: validation
    applies_to: AidlcRecordRef
    trigger: 直前の段を求める時
    logic: IF 段が見つからない THEN FAIL（理由「その段は状態の記録に無い」）
    violation: 記録の判定が FAIL
    source: FR2.1
  - id: BR2.3
    statement: PR が指す段の前に実行された段が無い時（intent の最初の段）は、求める承認が無いので PASS
    category: policy
    applies_to: StageSequence
    trigger: 直前の段を求める時
    logic: IF 前の段が無い THEN 記録の判定 = PASS（理由「最初の段」）
    violation: —
    source: FR2.1

  # BR3 承認の記録の読取り
  - id: BR3.1
    statement: 承認の記録は PR の base（main）からだけ読む
    category: authorization
    applies_to: ApprovalRecord
    trigger: 直前の段の承認を探す時
    logic: approvals/<intent>/<段>/<unit>.json（Inception の段は _intent.json）を base の commit から読む。PR の head の記録は読まない
    violation: head にだけある記録は無い物として扱う
    source: FR2.2
  - id: BR3.2
    statement: 形 sds-approval-record/1 で必須の欄がそろい、identity_check が none の記録を承認として受け入れる
    category: validation
    applies_to: ApprovalRecord
    trigger: 記録を読めた時
    logic: IF schema と必須の欄がそろい、intent・段・Unit が求める物と同じ、identity_check = none THEN 承認済み
    violation: 形が違えば BR3.4
    source: FR2.2
  - id: BR3.3
    statement: 承認の記録の試行の番号が、状態の記録のその段の一番新しい試行と同じでなければならない
    category: constraint
    applies_to: ApprovalRecord.attempt
    trigger: 記録を受け入れる前
    logic: IF attempt が一番新しい試行より小さい THEN FAIL（理由に、要る試行の番号を出す）
    violation: 記録の判定が FAIL
    source: FR2.1
  - id: BR3.4
    statement: 承認の記録が無い・読めない・壊れている時は FAIL にし、探した path を出す
    category: validation
    applies_to: ApprovalRecord
    trigger: 記録を探した時
    logic: IF 無い、JSON として読めない、形が違う THEN FAIL（理由に探した path）
    violation: 記録の判定が FAIL。PASS にはしない
    source: FR2.1
  - id: BR3.5
    statement: 決まった形の file のほかは、承認として読まない
    category: authorization
    applies_to: ApprovalRecord
    trigger: 承認を探す時
    logic: コメントの文、ほかの形の file、AI-DLC の audit の file そのものは、承認として扱わない
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
    logic: 問い合わせごとに時間の上限を持ち、超えたら verdict = UNOBSERVABLE（exit code 2）。自動の再試行はしない
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

  # BR5 承認の記録の作り手（最小の形）
  - id: BR5.1
    statement: 作り手は、AI-DLC の audit から指定された段の一番新しい試行の承認の出来事を探し、決まった形の記録を 1 つ作る
    category: calculation
    applies_to: ApprovalRecord
    trigger: 席が作り手の CLI を動かした時
    logic: intent・段・Unit・audit の path を受け、承認の出来事を見つけたら、欄の順を決めた 1 つの JSON を作業場の file に書く
    violation: BR5.2
    source: FR2.2
  - id: BR5.2
    statement: 承認の出来事が無い時は、何も書かずに失敗で終わる
    category: validation
    applies_to: ApprovalRecord
    trigger: 出来事が見つからない時
    logic: IF 見つからない THEN exit code 1、理由を出し、file は作らない
    violation: —
    source: NFR1
  - id: BR5.3
    statement: source_event_digest は、承認の出来事の本文の SHA-256 とする。同じ入力からは同じ bytes を作る
    category: calculation
    applies_to: ApprovalRecord.sourceEventDigest
    trigger: 記録を作る時
    logic: 出来事の本文の bytes から SHA-256 を求める。時刻は出来事に書かれた時刻を使い、今の時刻を読まない
    violation: —
    source: NFR2
  - id: BR5.4
    statement: 作り手は push も統合もせず、作業場に file を書くだけ
    category: authorization
    applies_to: ApprovalRecordWriter
    trigger: 記録を作る時
    logic: file を書いたら終わる。記録を main に入れるのは、記録を入れる PR（席が作る）
    violation: —
    source: NFR10

  # BR6 計測の最小の形
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

  # BR7 shirube 自身の門の呼出し（保護面）
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
```

## 決まりの一覧

| 群 | 決まり | 要点 |
|----|--------|------|
| BR1 | BR1.1〜BR1.3 | PR の block の記録の欄の形 |
| BR2 | BR2.1〜BR2.3 | 直前に実行された段の求め方 |
| BR3 | BR3.1〜BR3.5 | 承認の記録は main からだけ、決まった形だけ、一番新しい試行、無い・壊れた時は FAIL |
| BR4 | BR4.1〜BR4.4 | 記録だけの判定、log の 1 行の JSON、観測できず、同じ head で同じ結果 |
| BR5 | BR5.1〜BR5.4 | 作り手は同じ bytes を作り、push しない |
| BR6 | BR6.1〜BR6.5 | 計測は引数で受け、数えて出すだけで、書かない |
| BR7 | BR7.1〜BR7.2 | shirube 自身の門の呼出しと網羅率の床（保護面、Owner の exact-head） |
