<!-- arc:shirube-u1-design-revision:engine-judge:v1 -->
## arc の設計の記録: Shirube U1 の設計の改版 v1（I1: 段の「済み」を AI-DLC の engine の判断で読む）

適用: R1〜R3、L1〜L6、S2・S4・S5・S8、OD-SHIRUBE-INCLUDE-AIDLC-NO-REINVENT-20261021-001（#49 6309035411）、OD-SHIRUBE-I1-ENGINE-STATE-COPY-DESIGN-REVISION-20261024-001（#49 6381170673）、OD-SHIRUBE-I1-UNIT-DONE-VIA-ENGINE-PARTS-WITH-BUN-20261025-001（#49 6389500200）、OI-LLM-CONTROL-BY-SCRIPT-MECHANISM-HOOK-MUST-20261024-001。対象 = U1 の Functional Design（`construction/u1-skeleton/functional-design/` の entities.md・rules.md）と NFR Requirements の tech-stack-decisions.md。この記録は案で、独立の監査の前。

### 1. なぜ改めるか（事実）
- I1（PR #67、承認の記録の作り手 `scripts/sds/approval-record.mjs`）の実装監査は 4 回とも BLOCK。指摘はどれも「開き直し・やり直し・差し戻しの後、どの要約の確認がどの試行に効くか」の取り違えで、Shirube が engine の決まり（`summaryAttemptFloors` など）を audit の文から作り直していた（AI-DLC の再発明）。
- AI-DLC 2.11.1 の engine は、作る段階（unit-major・solo）で Unit の段を次へ進めてよいかを、`aidlc-orchestrate.ts` の `unitStageStop` で決める。条件は「その Unit が今の試行で済んでいる（完了の受領 `UNIT_COMPLETED`。段が当てはまらない Unit と飛ばした Unit は除く）」かつ「要約の確認が今の試行に効いている（`checkSummaryConfirmationEvidence(...).ok`）」。どちらの部品も `aidlc-lib.ts` の export で、bun で呼べる（shirube の席の実測 #24 6381255682: U1 の設計 4 段はどれも両方を満たす）。
- 状態の file（`aidlc-state.md`）は作る段階では段ごとの印だけで、`Active Unit`・`Unit Stage` の欄は engine のコメントで cache（正本は audit）。Unit ごとの「済み」の代わりにならない。
- `UNIT_STARTED`・`UNIT_COMPLETED` の行には、engine が書く時に試行の印 `Run floor` を刻む（`STAGE_JUMPED:<時刻>#<番号>` か `GATE_REJECTED:<時刻>#<番号>`）。要約の確認の行（`SUMMARY_CONFIRMATION_RECORDED`）には刻まない。

### 2. 変えないもの
- 門の判断の決まり（判定 1〜5、FAIL の時の扱い）と、門が読むのは main にある記録（JSON）だけであること。公開の repo の CI には bun も engine も入れない。
- 承認の記録（C2）の置き場 `approvals/<intent>/<段>/<unit>/attempt-<n>.json`（Inception の段は `.../_intent/attempt-<n>.json`）、一度作ったら書き換えない（BR5.8）、古い試行の file は消さない、`identityCheck: none`、`approverRole: owner`。
- PR の順（P1 → R → I1 → A → I2 → I3 → K → I4）、1 本 400 行の上限、own-code の予算 4,000 行。
- 記録は Owner の作業場の audit から作り、audit は公開の repo に載せない（#49 6354411741）。

### 3. 変えるもの
**3-1 「承認済み」の決め方（BR5.1・BR5.2 を置き換える）**
- 作る段階の Unit の段（engine の `isPerUnitStage` が真の段。Functional Design・NFR Requirements・NFR Design・Infrastructure Design・Code Generation など）: 承認済み ⇔ engine の判断が「その Unit はこの段を済ませ、次へ進めてよい」= `unitCompletedReceipts(projectDir, 段).has(unit)` が真、かつ要約の確認の要る段なら `checkSummaryConfirmationEvidence(projectDir, 段, {stateContent, unit}).ok === true`。作り手は自分で試行を数えず、2 つの部品の答えをそのまま写す。
- Inception の段（段ごとに 1 回の承認がある段）: 承認済み ⇔ engine が状態の file の Stage Progress にその段の済みの印 `[x]` を付けている、かつ audit にその段の承認の出来事（`GATE_APPROVED`）がある。
- どちらでもない・部品が無い・部品が例外を出す・版が 2.11.1 でない時: その段は「確かめられない」とし、承認済みにしない（S5: 観測できずを成功に読み替えない）。作り手は何も書かずに exit code 1 で終わり、理由を出す。

**3-2 試行の番号 n（file の名前の n）**
- 作る段階の Unit の段: engine が刻んだ `Run floor` の値を、その段・Unit の `UNIT_COMPLETED` の行で audit の順に数えた何番目か。承認済みの判断に使った `UNIT_COMPLETED`（その Unit の一番新しい物）の番号を使う。境目を自分で作らない。
- Inception の段: その段の `GATE_APPROVED` を audit の順に数えた何番目か。
- 承認済みでない段の file は作らない（今の BR5.3 のとおり）。

**3-3 作る元の指紋 sourceEventDigest（BR5.4 を改める）**
- 作る段階の Unit の段: 判断に使った `UNIT_COMPLETED` の block の本文と、`checkSummaryConfirmationEvidence` の答え（JSON、欄の順を固定）を、この順につないだ bytes の SHA-256。
- Inception の段: 判断に使った `GATE_APPROVED` の block の本文の SHA-256。
- `approvedAt`: 作る段階は `UNIT_COMPLETED` の時刻と、答えが指す要約の確認の時刻のうち遅い方（答えに時刻が無ければ `UNIT_COMPLETED` の時刻）。Inception は `GATE_APPROVED` の時刻。今の時刻は読まない（S4）。

**3-4 段の順の記録（C9）を「engine の今の判断の写し」にする（BR5.5 を置き換え、版を上げる）**
- schema を `sds-stage-sequence/2` にする（main にまだ /1 を読む物は無い。I1 は未統合）。
- 行は、engine の段の並び（AI-DLC の段の順と `runtime-graph.json` の Unit の順。unit-major なら Unit ごとに段が並ぶ）のうち、この intent で当てはまる (段, Unit) を 1 行ずつ。欄: `order`・`stage`・`unit`・`status`（`approved` / `not_approved`）・`approvalRef`（`approved` の時だけ、3-2 の n の file の path）。
- 履歴（古い試行・開き直し）は行に持たない。履歴は試行ごとの承認の記録の file（消さない）が持つ。今の `superseded` の欄と「jump の時点で下流に印を付ける」決まりは消す（engine が今の試行で判断するので要らない）。
- `sourceDigest` は今の BR5.6 のまま（intent の audit の shard 全体の SHA-256）。同じ audit からは同じ bytes。
- 記録の橋（I2）は「PR が指す段の、この順での 1 つ前の行が `approved` で、`approvalRef` の file が main にある」時だけ通す。前の行が無い・`not_approved` なら FAIL。

**3-5 動かし方（tech-stack-decisions.md の NFR5.1 に 1 行足す）**
- 作り手は席の作業場（AI-DLC の作業場）でだけ、bun で動かす。engine の部品は、作業場の `.claude/tools/aidlc-lib.ts` から読み込む。入れる前に AI-DLC の版（`aidlc --version` か配布キットの固定の版）が 2.11.1 であることを確かめ、違えば exit code 1。
- 部品を呼ぶ所は 1 つの小さな adapter（例 `EngineJudge`）に閉じ込め、承認の記録・段の順の記録を組み立てる本体は adapter の答えだけを受ける（S2: 意味の核は 1 つ。adapter は呼び出しの形だけを変える）。
- CI（Node 26、網羅率 80%）は、本体を偽の adapter で試す。本物の adapter は、席が Owner の作業場の audit で 1 回動かした結果（U1 の設計 4 段の判断と、作った file の SHA-256）を PR に証拠として載せる。
- 新しい依存は bun だけ（Owner の決定 #49 6389500200）。npm の依存は足さない。

### 4. 試験（作り直す I1 の merge の条件）
- 偽の adapter で: (a) 完了の受領あり・要約の確認あり → `approved`、file を作る。(b) 完了の受領あり・要約の確認が古い（前の段に戻ってやり直し、やり直しの確認がまだ = 4 回の監査の場面）→ `not_approved`、file を作らない。(c) 部品が無い・例外 → exit code 1、何も書かない。(d) 同じ入力で 2 回 → bytes が同じ。(e) 既にある file と bytes が違う → exit code 1、書き換えない（BR5.8）。(f) Inception の段で `[x]` が無い → `not_approved`。
- 本物の adapter で 1 回（席の作業場）: U1 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design がどれも `approved` と出て、#24 6381255682 の実測と合う。

### 5. 記録の直し方と流れ
1. この案を devauditor の設計監査（D1〜D6）に通す。監査の場は、shirube の席がこの bytes を `docs/design/u1-engine-judge.md` として載せる記録の PR（R2）。
2. 合格と受領の後、shirube の席が Owner の作業場で U1 の Functional Design と NFR Requirements を開き直し（`/aidlc`）、この案のとおり entities.md・rules.md・tech-stack-decisions.md を直す。要約の確認と承認は Owner（AI-DLC の会話の手。S1-SH-07 の 6 回とは別に数える = #49 6336035707）。
3. その後に席が PR #67 を作り直し（I1）、実装監査に出す。統合は suite-lead（shirube の main は必須の検査 3 つ、#49 6389465250）。
4. 開き直しで下流の段（NFR Design・Infrastructure Design・Code Generation）に響くかは、席が開き直しの時に engine の影響の表示で確かめ、響く所だけ通し直す。

### 6. 残る未決（この案では決めない）
- `checkSummaryConfirmationEvidence` の答えに、要約の確認の行を指す欄があるか（3-3 の approvedAt と指紋に使う）。無ければ `UNIT_COMPLETED` の時刻と答えの JSON で足りる、とした。作る席が実物で確かめ、無い時はこの記録に書き足す。
- AI-DLC の版を上げる時の部品の形の確かめ方（版上げの PR の確かめの項目）は、K（kit の版上げの PR）の作業指示で決める。

next_action: actor=shirube; what=この bytes を docs/design/u1-engine-judge.md として載せる記録の PR を作り、devauditor の設計監査を依頼する（作業指示 = #24）; blocking=false
