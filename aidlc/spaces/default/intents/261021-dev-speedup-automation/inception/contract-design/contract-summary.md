# 受け渡しの形（Contract Summary）

出典:
- Unit: `inception/units-generation/unit-of-work.md`・`unit-of-work-dependency.md`
- 部品: `inception/domain-design/components.md`
- 要件: `inception/requirements-analysis/requirements.md`
- この段の答え: `contract-design-questions.md`（Q1・Q2・Q5〜Q11。Q3 は Q8、Q4 は Q9 で置き換え。Q10・Q11 は U1 の設計の独立監査 BF-02 を受けて、この段を開き直して足した）

## 書き方の決まり

- 形ごとに版の名前を付ける（例: `sds-approval-record/1`）。今の `sds-pr/1`・`sds-pin/1`・`sds-audit-review/1` と同じ付け方（Q1）。
- 各形は、下の欄の表（名前・型・必須か・意味）と例で書く。JSON Schema は書かない。機械の検査は、その形を読む部品のコードで行う（NFR5、S3、ADR-009）。
- 欄の表は、読み手が確かめる中身の正本。コードは表のとおりに確かめ、表とコードの食い違いは監査で見る。

## 受け渡しの一覧

| # | 渡す側（Provider） | 受ける側（Consumer） | 渡し方（Mechanism） | 形の持ち主（Owner） |
|---|--------------------|----------------------|----------------------|---------------------|
| C1 | External: 作者の席（PR を書く） | U1・U4 の門（SdsGate）、U2 の計測（MetricsCollector） | PR の本文の ```json sds-pr``` block（`sds-pr/1` に欄を足す） | SdsGate（U1・U4） |
| C2 | U1・U3 の承認の記録の作り手（ApprovalRecordWriter） | U1・U3 の記録の橋（RecordBridge） | repo の file `approvals/<intent>/<段>/<unit>.json`（`sds-approval-record/1`） | ApprovalRecordWriter（U3） |
| C3 | U1・U4 の門（SdsGate） | U1・U2 の計測（MetricsCollector） | commit status `sds-gate` の state と、門の workflow の log の 1 行の JSON（`sds-gate-result/1`） | SdsGate（U1・U4） |
| C4 | U1・U2 の計測（MetricsCollector） | External: W2 の道具（iyasaka-arc） | 標準出力の 1 行の JSON（`sds-metrics/1`）と exit code | MetricsCollector（U2） |
| C5 | External: 監査の席（devauditor） | U2 の計測（MetricsCollector） | PR の comment の ```json sds-gate-fail-classification``` block（`sds-gate-fail-classification/1`） | MetricsCollector（U2） |
| C6 | External: 設計の席（arc、道筋を書く） | U5 の計画の受付（PlanAdmission） | 道筋の記録（`shirube-delivery-plan/v1`）に今の段の採択の参照の欄を足す | PlanAdmission（U5） |
| C7 | External: AI-DLC の Functional Design の出力（設計の段で arc が下書き） | U4 の判定 5（DesignBinding） | Unit の `construction/<unit>/functional-design/functional-spec.md` の ```json sds-design-locations``` block（`sds-design-locations/1`） | DesignBinding（U4） |
| C8 | U4 の配布キット（KitCli） | U6・U7（External: aun・onza の repo） | 配布先の `.shirube/sds-pin.json`（`sds-pin/1`、既存）と部品 | KitCli（U4） |
| C9 | U1・U3 の承認の記録の作り手（ApprovalRecordWriter） | U1・U3 の記録の橋（RecordBridge） | repo の file `approvals/<intent>/_sequence.json`（`sds-stage-sequence/1`） | ApprovalRecordWriter（U3） |

## C1 PR の機械向けの block（`sds-pr/1` に欄を足す）

今の欄（schema・risk_class・changed_paths・audit・design_binding）は変えません。欄を足すだけなので、版は `sds-pr/1` のまま（Q2）。今の読み手は知らない欄を無視します。

```yaml
contract: sds-pr/1
added_fields:
  - name: aidlc_record
    type: object
    required: false   # 無い時は、門の「前の段の承認」の判定が FAIL（記録だけの段では止めない）
    meaning: PR が指す AI-DLC の記録
    fields:
      - { name: intent, type: string, required: true, meaning: "intent の記録の名前（例: 261021-dev-speedup-automation）" }
      - { name: stage, type: string, required: true, meaning: "段の slug（例: code-generation）" }
      - { name: unit, type: string, required: false, meaning: "Construction の Unit の directory 名（例: u1-skeleton）。Inception の段では無し" }
  - name: fixes_pr
    type: string
    required: false
    meaning: "統合の後に直す元の PR（形: <owner>/<repo>#<番号>）。fix の PR だけが書く"
```

```json
{
  "schema": "sds-pr/1",
  "risk_class": "R2",
  "changed_paths": ["scripts/sds/record-bridge.mjs", "tests/record-bridge.test.mjs"],
  "audit": { "request": "<URL>", "request_sha256": "<sha256>", "review": "<URL>" },
  "aidlc_record": { "intent": "261021-dev-speedup-automation", "stage": "code-generation", "unit": "u1-skeleton" },
  "fixes_pr": "watchout/shirube#70"
}
```

## C2 承認の記録（`sds-approval-record/1`）

置き場: repo の `approvals/<intent>/<段>/<unit>.json`（Q8）。保護面（`.shirube/**`）の外。Inception の段は `<unit>` の代わりに `_intent.json`。

```yaml
contract: sds-approval-record/1
fields:
  - { name: schema, type: string, required: true, meaning: "sds-approval-record/1" }
  - { name: intent, type: string, required: true, meaning: intent の記録の名前 }
  - { name: stage, type: string, required: true, meaning: 段の slug }
  - { name: unit, type: string, required: false, meaning: Unit の directory 名（Construction の段だけ） }
  - { name: attempt, type: integer, required: true, meaning: 段の試行の番号（開き直すと増える） }
  - { name: approved_at, type: string, required: true, meaning: "承認の時点（UTC、ISO 8601）" }
  - { name: approver_role, type: string, required: true, meaning: "owner（S1 は Owner だけ）" }
  - { name: identity_check, type: string, required: true, meaning: "none（S1）。DB の段で verified を足す" }
  - { name: source_event_digest, type: string, required: true, meaning: "元の AI-DLC の audit の承認の出来事の本文の SHA-256" }
  - { name: source_audit_ref, type: string, required: true, meaning: "元の audit の file の repo の中の path" }
rules:
  - 同じ承認から 2 回作っても、同じ bytes になる（NFR2）
  - 一度作った記録を、後から identity_check: verified に書き換えない（iyasaka-arc#49 6315688299 の 4）
  - 記録の橋は、この形の file だけを承認として読む。ほかの形（コメントの文など）は読まない
  - 作る元（Q11）: Inception の段と Code Generation 以降は、段の承認の出来事から作る。Unit ごとの設計の段（Functional Design・NFR Requirements・NFR Design・Infrastructure Design）は単独の承認が無いので、Owner の要約の確認の記録と Unit の完了の記録の両方が、その段の一番新しい試行にそろった時に作る。片方だけ・古い試行の物だけなら作らない
  - source_event_digest は、作る元にした出来事（Unit の設計の段は 2 つの記録）の本文の SHA-256
```

```json
{
  "schema": "sds-approval-record/1",
  "intent": "261021-dev-speedup-automation",
  "stage": "functional-design",
  "unit": "u1-skeleton",
  "attempt": 1,
  "approved_at": "2026-10-23T02:10:00Z",
  "approver_role": "owner",
  "identity_check": "none",
  "source_event_digest": "<sha256>",
  "source_audit_ref": "aidlc/spaces/default/intents/261021-dev-speedup-automation/audit/<shard>.md"
}
```

## C3 門の結果（`sds-gate-result/1`）

門は commit status `sds-gate` を 1 つだけ書きます（NFR10）。判定ごとの理由は、門の workflow の log に出る 1 行の JSON で渡します（Q5）。今の門は、成功でも失敗でも 1 行の JSON を標準出力に出しています。その行に `schema` と判定ごとの欄を足します。

```yaml
contract: sds-gate-result/1
fields:
  - { name: schema, type: string, required: true, meaning: "sds-gate-result/1" }
  - { name: repo, type: string, required: true, meaning: "<owner>/<repo>" }
  - { name: pr, type: integer, required: true, meaning: PR の番号 }
  - { name: head, type: string, required: true, meaning: head の commit（40 桁） }
  - { name: verdict, type: string, required: true, meaning: "PASS | FAIL | UNOBSERVABLE" }
  - name: judgements
    type: array
    required: true
    meaning: 判定ごとの結果
    fields:
      - { name: id, type: string, required: true, meaning: "1 | 2 | 3 | 4 | 5 | records" }
      - { name: verdict, type: string, required: true, meaning: "PASS | FAIL | UNOBSERVABLE | NOT_CHECKED" }
      - { name: mode, type: string, required: true, meaning: "report-only | blocking" }
      - { name: reasons, type: array, required: true, meaning: 理由の文（FAIL の時は足りない物や外れた path） }
rules:
  - commit status の state は、blocking の判定が 1 つでも FAIL なら failure。report-only の FAIL は state を変えない
  - 計測は state と、この行の両方を読む。この行が log に無い時は、その PR を「観測できず」として数える
```

## C4 計測の出力（`sds-metrics/1`）

標準出力に 1 行の JSON を出し、#53 に載せる文はその中の `report_markdown` の欄に入れる（Q6）。計測はどこにも書かない（ADR-003）。

```yaml
contract: sds-metrics/1
fields:
  - { name: schema, type: string, required: true, meaning: "sds-metrics/1" }
  - { name: measured_at, type: string, required: true, meaning: 測った時刻（UTC、引数で渡された値） }
  - { name: baseline_id, type: string, required: true, meaning: 比べる今の値の id }
  - { name: repos, type: array, required: true, meaning: "repo ごとの {repo, state: observed | unobservable, reason}" }
  - { name: partial, type: boolean, required: true, meaning: 1 つでも観測できない repo があれば true }
  - { name: time, type: object, required: true, meaning: "{median_hours, p90_hours, pr_count, intent_median_hours}。PR が 0 件なら値は null と note: n/a" }
  - { name: rework, type: object, required: true, meaning: "{count, rate, pr_count, by_kind: {audit_block, gate_fail_push, post_merge_fix}}" }
  - { name: owner_touches, type: object, required: true, meaning: "{count, limit: 6, items: [{url, kind}], aidlc_approvals, unreferenced_decisions}" }
  - { name: mis_stops, type: object, required: true, meaning: "{gate_defects, pr_defects, unclassified}" }
  - { name: switch_ready, type: array, required: true, meaning: "repo ごとの {repo, prs_in_report_only, gate_defects, ready}" }
  - { name: half, type: object, required: true, meaning: "{state: before | achieved | not_achieved, time_ratio, rework_ratio}" }
  - { name: report_markdown, type: string, required: true, meaning: "#53 に載せる文" }
exit_codes:
  "0": すべての repo を観測できた
  "1": 入力が壊れている（今の値の file が読めないなど）
  "2": 観測できない repo がある（出力は出し、partial: true）
```

## C5 「誤って止めた」分類（`sds-gate-fail-classification/1`）

監査の席が、門が FAIL を出した PR の comment に 1 つ書きます（ADR-004）。監査の依頼の無い PR でも書けます。

```yaml
contract: sds-gate-fail-classification/1
fields:
  - { name: schema, type: string, required: true, meaning: "sds-gate-fail-classification/1" }
  - { name: repo, type: string, required: true, meaning: "<owner>/<repo>" }
  - { name: pr, type: integer, required: true, meaning: PR の番号 }
  - { name: head, type: string, required: true, meaning: FAIL を出した時の head の commit }
  - { name: gate_run, type: string, required: true, meaning: 門の workflow の run の id }
  - { name: classification, type: string, required: true, meaning: "gate_defect（門の不備）| pr_defect（PR の不備）" }
  - { name: reason, type: string, required: true, meaning: 判定の理由 }
  - { name: auditor_seat, type: string, required: true, meaning: 書いた監査の席の名前 }
rules:
  - 形に合わない comment は分類として数えず、その FAIL は「未分類」のまま（FR5.3）
  - 同じ head と同じ gate_run に 2 つある時は、後の物を使い、食い違いを出力に出す
```

## C6 道筋の記録の、今の段の採択の参照

道筋の記録（`shirube-delivery-plan/v1`）に、欄を 1 つ足します。欄を足すだけなので、版はそのまま（Q2）。

```yaml
contract: shirube-delivery-plan/v1
added_fields:
  - name: stage_adoption_ref
    type: object
    required: true   # 無い道筋は、計画の受付が BLOCK（Inception が先、FR2.3）
    meaning: 今の段の済みの条件を Owner が採択した記録
    fields:
      - { name: url, type: string, required: true, meaning: "#49 などの決定の comment の URL（#issuecomment-<id> まで）" }
      - { name: sha256, type: string, required: true, meaning: その comment の本文の SHA-256 }
      - { name: stage, type: string, required: true, meaning: "採択された段（例: S1）" }
```

## C7 設計の置き場の宣言（`sds-design-locations/1`）

Unit の Functional Design の出力 `functional-spec.md` に、block を 1 つ置きます（Q9）。設計の段で arc が下書きし、Owner が段の承認で確かめます。門は、PR の `aidlc_record` が指す Unit の block を読み、変更 path がその中かを見ます。

```yaml
contract: sds-design-locations/1
fields:
  - { name: schema, type: string, required: true, meaning: "sds-design-locations/1" }
  - { name: unit, type: string, required: true, meaning: Unit の directory 名 }
  - { name: paths, type: array, required: true, meaning: "その Unit が変えてよい folder・file の型（glob）" }
rules:
  - block が無い・2 つある・壊れている時は FAIL（記録だけの段では止めない）
  - その intent の AI-DLC の記録の置き場と、承認の記録の置き場（C2）は、どの Unit でも変えてよい path として扱う
```

```json
{
  "schema": "sds-design-locations/1",
  "unit": "u1-skeleton",
  "paths": ["scripts/sds/gate.mjs", "scripts/sds/record-bridge.mjs", "scripts/sds/metrics/**", "tests/**"]
}
```

## C8 配布の pin（`sds-pin/1`、既存）

形は変えません。U6・U7 は、U4 の後の shirube の commit を `sds_commit` に固定し、`plan_binding_mode` と `design_binding_mode` は記録だけ（report-only）で始めます。pin の変更は保護面で、最初の導入は Owner の exact-head を通します。

## C9 段の順の記録（`sds-stage-sequence/1`）

U1 の設計の独立監査（shirube PR #65、BF-02）を受けて、この段を開き直して足した形です（Q10・Q11）。記録の橋が、前の段・Unit・一番新しい試行を、公開してよい入力だけで決めるのに使います。`aidlc-state.md` には Unit ごとの試行の番号が無く、audit は公開の repo に載せません（iyasaka-arc#49 6354411741）。

置き場: repo の `approvals/<intent>/_sequence.json`（C2 と同じ、保護面の外）。

```yaml
contract: sds-stage-sequence/1
fields:
  - { name: schema, type: string, required: true, meaning: "sds-stage-sequence/1" }
  - { name: intent, type: string, required: true, meaning: intent の記録の名前 }
  - { name: source_digest, type: string, required: true, meaning: 元にした audit の範囲の SHA-256 }
  - name: entries
    type: array
    required: true
    meaning: 実行した段の並び（実行した順）
    fields:
      - { name: order, type: integer, required: true, meaning: 1 から始まる実行の順 }
      - { name: stage, type: string, required: true, meaning: 段の slug }
      - { name: unit, type: string, required: false, meaning: Unit の directory 名（Construction の Unit の段だけ） }
      - { name: attempt, type: integer, required: true, meaning: その段（と Unit）の試行の番号 }
      - { name: approved, type: boolean, required: true, meaning: "この試行が承認済みか（Unit の設計の段は Q11 の 2 つの記録がそろった時に true）" }
      - { name: approval_ref, type: string, required: false, meaning: "approved が true の時、承認の記録（C2）の repo の中の path" }
rules:
  - 飛ばした段は入らない
  - 段を開き直すと、新しい試行の行が足される。古い行は消さない
  - 作り手は、記録を入れる PR のたびに audit から作り直す。同じ audit からは同じ bytes を作る
  - 記録の橋は main のこの file と承認の記録だけを読む。この file が無い・読めない・壊れている・intent が違う時は、記録の判定を FAIL にする
  - 前の段は、PR が指す段（と Unit）の一番新しい試行の行より前にある行のうち、同じ Unit の段の行（Unit の最初の段の前は Inception の最後の段の行）の、一番新しい試行の行とする
```

```json
{
  "schema": "sds-stage-sequence/1",
  "intent": "261021-dev-speedup-automation",
  "source_digest": "<sha256>",
  "entries": [
    { "order": 13, "stage": "delivery-planning", "attempt": 2, "approved": true, "approval_ref": "approvals/261021-dev-speedup-automation/delivery-planning/_intent.json" },
    { "order": 14, "stage": "functional-design", "unit": "u1-skeleton", "attempt": 2, "approved": true, "approval_ref": "approvals/261021-dev-speedup-automation/functional-design/u1-skeleton.json" },
    { "order": 15, "stage": "nfr-requirements", "unit": "u1-skeleton", "attempt": 2, "approved": false }
  ]
}
```

負例（記録の橋の試験に入れる）:
- 開き直した後の新しい試行に承認が無い（古い試行の承認しか無い）→ FAIL。要る試行の番号を出す。
- 複数の Unit がある → 前の段は同じ Unit の行から決める。ほかの Unit の行は使わない。
- 段の順の記録が無い・壊れている → FAIL。探した path を出す。
- 承認の記録の試行の番号が、段の順の記録の一番新しい試行と違う → FAIL。

## 形の持ち主と変え方の決まり

- 形の持ち主は、上の一覧の Owner の部品の Unit。形を変える PR は、その Unit の席が作り、独立監査を通す。
- 欄を足すだけの変更は同じ版のまま。読む側は知らない欄を無視する（Q2）。
- 欄の意味を変える・消す変更は、版を上げる。配布先（aun・onza）が版上げの PR で揃うまで、読む側は古い版も読む（S6）。
- 外の受け手（W2 の道具、監査の席）に関わる形（C4・C5）を変える時は、受け手の担当に先に知らせる。
- 読めない・時間切れの時は、どの境目でも「観測できず」（exit code 2）を返し、自動の再試行はしない（Q7）。門は作者が workflow を再実行でき、計測は次の 04:30・18:00 の回で測り直す。

## 未決の問い

| 受け渡し | 問い | 止める Unit |
|----------|------|-------------|
| C7 | packaging の Unit（U6・U7）には Functional Design の出力が無い（原典の決まり）。記録を入れる PR など、Unit を指さない PR もある。これらの PR の置き場の宣言をどこに置くか（無いまま FAIL にすると、正しい PR を止める） | U4 |
| C6 | 計画の受付は、ai-dev-framework の固定 commit の判定と同じになるよう書き直した物。欄を足すと、その等価の試験の扱いが変わる | U5 |
| C2 | AI-DLC の audit の承認の出来事の、どの欄から digest を取るか（AI-DLC の版で変わりうる） | U3 |
| C9 | `source_digest` の audit の範囲の決め方（intent の audit の shard 全体か、段の出来事だけか） | U3 |
| C4 | W2 の道具の側で、出力を受けて #53 に載せる変更（iyasaka-arc の担当） | U2 |
| C3 | 今の門の 1 行の JSON に `schema` と judgements の欄を足す時、今の読み手（あれば）に影響が無いか | U1 |
