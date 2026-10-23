# データの形（Entities）— U1 u1-skeleton

出典:
- 部品の一覧: `inception/domain-design/components.md`
- 受け渡しの形: `inception/contract-design/contract-summary.md` の C1〜C4・C7・C9（C9 は 2026-10-23 に Contract Design を開き直して足した）
- Unit: `inception/units-generation/unit-of-work.md`・`unit-of-work-story-map.md`
- 要件: `inception/requirements-analysis/requirements.md`
- 物語: `inception/user-stories/stories.md`
- この段の答え: `functional-design-questions.md` の Q1〜Q11
- 独立監査の指摘: shirube PR #65 の sds-audit-review の BF-01〜BF-03

U1 は各データの最小の形だけを扱います。全部の欄と FAIL の扱いは、U2（計測）と U3（承認の記録と段の順の記録）で仕上げます。

```yaml
entities:
  - name: SdsPrBlock
    description: PR の本文の機械向けの block（sds-pr/1）。U1 は aidlc_record と fixes_pr の欄を足して読む（C1）
    owner_component: SdsGate
    attributes:
      - { name: schema, type: string, required: true, allowed: ["sds-pr/1"] }
      - { name: riskClass, type: string, required: true, allowed: ["R0", "R1", "R2", "R3", "R4"] }
      - { name: changedPaths, type: list<string>, required: true }
      - { name: aidlcRecord, type: AidlcRecordRef, required: false, constraints: "無い時は記録の判定が FAIL（記録だけの段では止めない）" }
      - { name: fixesPr, type: string, required: false, constraints: "形は <owner>/<repo>#<番号>" }
    constraints:
      - PR の本文に 1 つだけ
    relationships:
      - { to: AidlcRecordRef, cardinality: "0..1", direction: "SdsPrBlock -> AidlcRecordRef" }

  - name: AidlcRecordRef
    description: PR が指す AI-DLC の記録の場所（intent と段と Unit）
    owner_component: RecordBridge
    attributes:
      - { name: intent, type: string, required: true, constraints: "repo の aidlc/spaces/default/intents/ の下の名前" }
      - { name: stage, type: string, required: true, constraints: "段の slug" }
      - { name: unit, type: string, required: false, constraints: "Construction の Unit の段では必須。Unit の directory 名" }
    constraints:
      - 読むのは PR の base（main）の記録だけ（Q2）
    relationships:
      - { to: StageSequence, cardinality: "1", direction: "AidlcRecordRef -> StageSequence（同じ intent）" }

  - name: StageSequence
    description: >
      段の順の記録（sds-stage-sequence/1、C9）。intent の中で実行した段・Unit・試行と承認の有無を、
      AI-DLC の audit から実行した順に並べた物。記録の橋は、前の段と一番新しい試行をこれだけで決める（Q8、BF-02）
    owner_component: ApprovalRecordWriter
    attributes:
      - { name: schema, type: string, required: true, allowed: ["sds-stage-sequence/1"] }
      - { name: intent, type: string, required: true }
      - { name: sourceDigest, type: "string (SHA-256 の 16 進 64 桁)", required: true, constraints: "元にした audit の範囲の SHA-256。範囲の決め方は U3（C9 の未決の問い）。U1 は最小の形（rules.md の BR5.6）" }
      - { name: entries, type: "list<StageSequenceEntry>", required: true, constraints: "実行した順。order は 1 から重ならずに増える" }
    constraints:
      - 置き場は repo の approvals/<intent>/_sequence.json（保護面の外、C9）
      - 飛ばした段は入らない
      - 段を開き直すと新しい試行の行が足される。古い行は消さない
      - 記録を入れる PR のたびに audit から作り直す。同じ audit からは同じ bytes
      - 読み手は RecordBridge。作り手は ApprovalRecordWriter（U3 で仕上げ、U1 で最小の形）
    relationships:
      - { to: StageSequenceEntry, cardinality: "1..n", direction: "StageSequence -> StageSequenceEntry" }

  - name: StageSequenceEntry
    description: 段の順の記録の 1 行（1 つの段・Unit・試行）
    owner_component: ApprovalRecordWriter
    attributes:
      - { name: order, type: integer, required: true, min: 1 }
      - { name: stage, type: string, required: true }
      - { name: unit, type: string, required: false, constraints: "Construction の Unit の段だけ" }
      - { name: attempt, type: integer, required: true, min: 1 }
      - { name: approved, type: boolean, required: true, constraints: "Unit の設計の段は、要約の確認の記録と Unit の完了の記録の両方がこの試行にそろった時だけ true（Q10）" }
      - { name: approvalRef, type: string, required: false, constraints: "approved が true の時だけ。C2 の置き場の決まりどおりの path" }
    constraints:
      - approved が true なら approvalRef は必須、false なら approvalRef は無い
    relationships:
      - { to: ApprovalRecord, cardinality: "0..1", direction: "StageSequenceEntry -> ApprovalRecord（approvalRef が指す）" }

  - name: ApprovalRecord
    description: 承認の記録（sds-approval-record/1、C2）。U1 は最小の欄を作って読む
    owner_component: ApprovalRecordWriter
    attributes:
      - { name: schema, type: string, required: true, allowed: ["sds-approval-record/1"] }
      - { name: intent, type: string, required: true }
      - { name: stage, type: string, required: true }
      - { name: unit, type: string, required: false }
      - { name: attempt, type: integer, required: true, min: 1 }
      - { name: approvedAt, type: "string (UTC ISO 8601)", required: true, constraints: "作る元の出来事に書かれた時刻（Unit の設計の段は 2 つのうち遅い方）" }
      - { name: approverRole, type: string, required: true, allowed: ["owner"] }
      - { name: identityCheck, type: string, required: true, allowed: ["none"], constraints: "S1 は none だけ。verified は DB の段で足す" }
      - { name: sourceEventDigest, type: "string (SHA-256 の 16 進 64 桁)", required: true, constraints: "作る元にした出来事（Unit の設計の段は 2 つの記録）の本文の SHA-256（C2）" }
      - { name: sourceAuditRef, type: string, required: true, constraints: "元の audit の file の path。audit は公開の repo に載せない（iyasaka-arc#49 6354411741）ので、門と記録の橋はこの path を読まない" }
    constraints:
      - 置き場は repo の approvals/<intent>/<段>/<unit>.json（Inception の段は _intent.json）
      - 一度作った記録を書き換えない
      - 作る元（Q10、C2）は、Inception の段と Code Generation 以降が段の承認の出来事、Unit の設計の段が要約の確認の記録と Unit の完了の記録の 2 つ
    relationships:
      - { to: AidlcRecordRef, cardinality: "1", direction: "ApprovalRecord -> AidlcRecordRef（同じ intent・段・Unit）" }

  - name: GateResult
    description: 門の結果（sds-gate-result/1、C3）。commit status 1 つと、log の 1 行の JSON
    owner_component: SdsGate
    attributes:
      - { name: schema, type: string, required: true, allowed: ["sds-gate-result/1"] }
      - { name: repo, type: string, required: true }
      - { name: pr, type: integer, required: true }
      - { name: head, type: string, required: true }
      - { name: verdict, type: string, required: true, allowed: ["PASS", "FAIL", "UNOBSERVABLE"] }
      - { name: judgements, type: "list<{id, verdict, mode, reasons}>", required: true, constraints: "id は 1〜5 と records。mode は report-only か blocking" }
    constraints:
      - commit status の state は、blocking の判定が 1 つでも FAIL なら failure。report-only の FAIL は state を変えない
    relationships: []

  - name: GateCountSnapshot
    description: U1 の計測の出力（sds-metrics/1 の最小の欄、C4）
    owner_component: MetricsCore
    attributes:
      - { name: schema, type: string, required: true, allowed: ["sds-metrics/1"] }
      - { name: measuredAt, type: "string (UTC ISO 8601)", required: true, constraints: "引数で渡す" }
      - { name: period, type: "{from, to}", required: true, constraints: "日本時間の日。両日を含む" }
      - { name: repos, type: "list<{repo, state, reason}>", required: true, allowed_state: ["observed", "unobservable"] }
      - { name: partial, type: boolean, required: true }
      - { name: gateCounts, type: "{prCount, pass, fail, unobservable}", required: true, min: 0 }
    constraints:
      - pass + fail + unobservable = prCount
    relationships:
      - { to: GateResult, cardinality: "0..n", direction: "GateCountSnapshot -> GateResult（数える元）" }

  - name: KitCallerTarget
    description: >
      配布キットが門の呼出しと pin を書く先（Q9、BF-03）。配布先では呼出しを .github/workflows/sds-gate.yml に書く。
      shirube 自身では、その path が再利用 workflow そのものなので、呼出しを .github/workflows/sds-gate-self.yml に書く
    owner_component: KitCli
    attributes:
      - { name: target, type: string, required: true, constraints: "kit に渡す checkout の場所（--target）" }
      - { name: selfTarget, type: boolean, required: true, constraints: "target の .github/workflows/sds-gate.yml が再利用 workflow（on: workflow_call を持つ）なら true" }
      - { name: callerPath, type: string, required: true, allowed: [".github/workflows/sds-gate.yml", ".github/workflows/sds-gate-self.yml"] }
      - { name: pinPath, type: string, required: true, allowed: [".shirube/sds-pin.json"] }
    constraints:
      - selfTarget が true の時、kit は .github/workflows/sds-gate.yml に書かない
      - target の files だけから決める（GitHub に問い合わせない）
    relationships: []
```

## まとめ

- PR の block（SdsPrBlock）が、AI-DLC の記録の場所（AidlcRecordRef）を指します。
- 記録の橋は、main にある段の順の記録（StageSequence、C9）から、PR が指す段の前の段と、その段の一番新しい試行を求めます。そして、その試行の承認の記録（ApprovalRecord）を main から読みます。
  - `aidlc-state.md` には Unit ごとの試行の番号が無いので、使いません。
  - audit は公開の repo に載せないので、門と記録の橋は audit を読みません（BF-02）。
- 段の順の記録と承認の記録は、承認の記録の作り手（ApprovalRecordWriter）が Owner の作業場の audit から作ります。承認の記録の PR（`bolt-plan.md` の A。作り手を入れる I1 の後）が、2 つを main に入れます。
- Unit の設計の段には単独の承認がありません。そこで、要約の確認の記録と Unit の完了の記録が一番新しい試行にそろった物を承認済みとします（Q10、C2・C9）。
- 門は、その結果を判定の 1 つ（records）として門の結果（GateResult）に入れます。計測は、門の結果を数えて最小の出力（GateCountSnapshot）を出します。
- 配布キットは、書く先（KitCallerTarget）を target ごとに選びます。shirube 自身では再利用 workflow を上書きしません（BF-03）。
