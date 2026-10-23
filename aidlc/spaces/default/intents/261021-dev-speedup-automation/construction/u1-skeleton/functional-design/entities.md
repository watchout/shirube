# データの形（Entities）— U1 u1-skeleton

出典: 部品の一覧（`inception/domain-design/components.md`）、受け渡しの形（`inception/contract-design/contract-summary.md` の C1〜C4）、Unit（`inception/units-generation/unit-of-work.md`・`unit-of-work-story-map.md`）、要件（`inception/requirements-analysis/requirements.md`）、物語（`inception/user-stories/stories.md`）、この段の答え（`functional-design-questions.md`）。

U1 は各データの最小の形だけを扱います。全部の欄と FAIL の扱いは、U2（計測）と U3（承認の記録）で仕上げます。

```yaml
entities:
  - name: SdsPrBlock
    description: PR の本文の機械向けの block（sds-pr/1）。U1 は aidlc_record と fixes_pr の欄を足して読む
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
      - { name: stage, type: string, required: true, constraints: "その intent の状態の記録にある段の slug" }
      - { name: unit, type: string, required: false, constraints: "Construction の段では必須。Unit の directory 名" }
    constraints:
      - 読むのは PR の base（main）の記録だけ
    relationships:
      - { to: StageSequence, cardinality: "1", direction: "AidlcRecordRef -> StageSequence" }

  - name: StageSequence
    description: intent の中で実行された段の順。状態の記録（aidlc-state.md）の、飛ばされていない段を順に並べた物。直前の段を決めるのに使う
    owner_component: RecordBridge
    attributes:
      - { name: intent, type: string, required: true }
      - { name: stages, type: "list<{stage, unit, attempt}>", required: true, constraints: "実行された順。飛ばした段は入らない。Construction の段は Unit ごとに並ぶ" }
    constraints:
      - main の状態の記録から作る。読めない時は「観測できず」
    relationships: []

  - name: ApprovalRecord
    description: 承認の記録（sds-approval-record/1）。U1 は最小の欄を作って読む
    owner_component: ApprovalRecordWriter
    attributes:
      - { name: schema, type: string, required: true, allowed: ["sds-approval-record/1"] }
      - { name: intent, type: string, required: true }
      - { name: stage, type: string, required: true }
      - { name: unit, type: string, required: false }
      - { name: attempt, type: integer, required: true, min: 1 }
      - { name: approvedAt, type: "string (UTC ISO 8601)", required: true }
      - { name: approverRole, type: string, required: true, allowed: ["owner"] }
      - { name: identityCheck, type: string, required: true, allowed: ["none"], constraints: "S1 は none だけ。verified は DB の段で足す" }
      - { name: sourceEventDigest, type: "string (SHA-256 の 16 進 64 桁)", required: true }
      - { name: sourceAuditRef, type: string, required: true, constraints: "repo の中の audit の file の path" }
    constraints:
      - 置き場は repo の approvals/<intent>/<段>/<unit>.json（Inception の段は _intent.json）
      - 一度作った記録を書き換えない
    relationships:
      - { to: AidlcRecordRef, cardinality: "1", direction: "ApprovalRecord -> AidlcRecordRef（同じ intent・段・Unit）" }

  - name: GateResult
    description: 門の結果（sds-gate-result/1）。commit status 1 つと、log の 1 行の JSON
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
    description: U1 の計測の出力（sds-metrics/1 の最小の欄）
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
```

## まとめ

- PR の block（SdsPrBlock）が、AI-DLC の記録の場所（AidlcRecordRef）を指します。
- 記録の橋は、main の状態の記録から段の順（StageSequence）を作ります。そして直前の段の承認の記録（ApprovalRecord）を探します。
- 門は、その結果を判定の 1 つ（records）として門の結果（GateResult）に入れます。
- 計測は、門の結果を数えて最小の出力（GateCountSnapshot）を出します。
- 承認の記録は、作り手の CLI が AI-DLC の audit から作ります。門は main にある物だけを読みます。
