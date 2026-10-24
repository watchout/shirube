<!-- arc:shirube-u1-design-revision:engine-judge:v2 -->
## arc の設計の記録: Shirube U1 の設計の改版 v2（I1: 段の「済み」を AI-DLC の engine の判断で読む）

適用: R1〜R3、L1〜L6、S2・S4・S5・S8、OD-SHIRUBE-INCLUDE-AIDLC-NO-REINVENT-20261021-001（#49 6309035411）、OD-SHIRUBE-I1-ENGINE-STATE-COPY-DESIGN-REVISION-20261024-001（#49 6381170673）、OD-SHIRUBE-I1-UNIT-DONE-VIA-ENGINE-PARTS-WITH-BUN-20261025-001（#49 6389500200）、OI-LLM-CONTROL-BY-SCRIPT-MECHANISM-HOOK-MUST-20261024-001。v1（#57 6389578735）への設計監査の返却（shirube#68 6389815898、BF-01〜07）と、shirube の席の確認（#24 6389739676）を受けて全体を書き直した。v1 は置き換え。対象 = U1 の Functional Design（entities.md・rules.md）と NFR Requirements の tech-stack-decisions.md。独立の監査の前の案。

### 0. v1 からの直しの対応
| 指摘 | v2 の答え（節） |
|---|---|
| BF-01 2 つの部品は unitStageStop と同値でない | engine 自身の関数（`unitMajorWalkBeat`・`unitMajorFinishedWalk`・`unitStageStop`・`unitExempt`・`unitLedgerFor`）をそのまま呼ぶ。条件を自分で組み立てない（§3-1、§3-6） |
| BF-02 前の行の選び方が橋の契約を変える | 記録の橋の BR2 の決まり（最初の段は PASS、同じ Unit の前の段、Unit の最初の段の前は Inception の最後の行）は変えない。免除の行の扱いだけを足す（§3-4） |
| BF-03 Construction の段全体を分類していない | `isPerUnitStage` で 2 つに分ける。偽の段（Inception・Build and Test など）は段単位で扱う（§3-1） |
| BF-04 検証計画と決定的な入力 | 指紋の bytes・JSON の並べ方・番号・時刻・C9 の行・橋・版違い・途中の失敗の試験を足し、入力の範囲を `inputDigest` で決める（§3-3、§3-4、§4） |
| BF-05 読取りの安全と誤った file の復旧 | 読む前後で作業場の file が変わっていないことを確かめる、理由は決まった code だけを出す、誤った file は消さずに取り消しの記録を足す（§3-7） |
| BF-06 版の宣言と読み込む engine を結ぶ | 読み込む engine の file の SHA-256 を、固定の版の一覧と照らす。宣言の版の値は証拠にしない（§3-5） |
| BF-07 本物の adapter と CI の接続 | adapter を小さな ESM の file にし、engine の読込みを注入する。CI は偽の読込みで同じ file を試す（§3-6） |
| 席の確認 1（免除の Unit） | `exempt` の行（§3-1、§3-4） |
| §6 の答え（要約の確認の行を指す欄は無い） | §3-3 を「`UNIT_COMPLETED` の時刻と答えの JSON」に決めた |

### 1. 事実（AI-DLC 2.11.1、原典 commit 895a35d8 の `.claude/tools/`。Owner の作業場の写しと bytes が同じ = #24 6389739676）
- solo・unit-major の作る段階で、engine は `aidlc-orchestrate.ts` の `unitMajorWalkBeat(projectDir, scope, stateContent, currentSlug)` （今の段が Unit の段の時）か `unitMajorFinishedWalk`（今の段が Unit の段より後の作る段階の段の時。どちらも 13295・13336 行目）で Unit の段の並び（block）と Unit の並び・種類・記録の置き場・codekb の文脈を作り、`unitStageStop(projectDir, stateContent, k, u, kind, recordPrefix, codekbCtx, ledger)` で「その Unit のその段でまだ止まるか」を決める（null = 済み）。済みの判断は `unitSettled`（飛ばした／成果物が在る ∧ 台帳を使う時は今の試行の受領 ∧ 種類で当てはまらない時は受領不要）と `unitExempt`（種類で当てはまらない／飛ばした）と要約の確認（`checkSummaryConfirmationEvidence`）。ledger は `unitLedgerFor(projectDir, slug)`（wave の時の `keepChangedWaveCompletions` を含む）。
- これらは export されていない。`aidlc-orchestrate.ts` の main は `import.meta.main` の時だけ動く（18423 行目）ので、読み込むだけでは CLI は動かない。
- `checkSummaryConfirmationEvidence` の答えに、要約の確認の行を指す欄は無い（`SummaryConfirmationEvidence` の型と実測。#24 6389739676）。
- `UNIT_STARTED`・`UNIT_COMPLETED` の行には engine が `Run floor` を刻む。
- 段単位の段（Inception の段、Build and Test など `isPerUnitStage` が偽の段）は、状態の file の Stage Progress の印（`[x]` 済み・`[S]` 飛ばした ほか）を engine が書く。

### 2. 変えないもの
- 門の判定 1〜5 と FAIL の扱い、記録の橋の BR2 の決まり（BR2.1・BR2.4・BR2.5）。門が読むのは main にある記録（JSON）だけ。公開の repo の CI には bun も engine も入れず、`ci.yml`・pin・網羅率の母集団（`scripts/**` の全部）を変えない。
- 承認の記録（C2）の置き場 `approvals/<intent>/<段>/<unit>/attempt-<n>.json`（段単位の段は `.../_intent/attempt-<n>.json`）、一度作ったら書き換えない（BR5.8）、消さない、`identityCheck: none`、`approverRole: owner`。
- PR の順、1 本 400 行、own-code の予算 4,000 行。audit は公開の repo に載せない。

### 3. 変えるもの
**3-1 段の分け方と「承認済み」の決め方（BR5.1・BR5.2 を置き換える）**
- engine の `isPerUnitStage(node)` が真の段（作る段階の Unit の段）: engine の walk の block の各段 k と各 Unit u について、engine 自身の `unitStageStop` を呼ぶ。
  - 戻りが null で、engine の `unitExempt(k, u, kind, ledger)` が真 → `exempt`（file を作らない）。
  - 戻りが null で、`unitExempt` が偽 → `approved`。
  - 戻りが null でない → `not_approved`。
- `isPerUnitStage` が偽の段（段単位）: 状態の file の Stage Progress の印が `[x]` で、audit にその段の `GATE_APPROVED` がある → `approved`。印が `[S]` → `exempt`。それ以外 → `not_approved`。印が `[x]` なのに `GATE_APPROVED` が無い → 「確かめられない」。
- 今の段が Inception の段の時は、Unit の段はまだ始まっていないので Unit の段の行は作らない。今の段が作る段階なのに `unitMajorWalkBeat`・`unitMajorFinishedWalk` が null を返す時（team の intent、swarm、段単位の成果物の形 ほか）→ この版の対象外として「確かめられない」。
- 「確かめられない」= 何も書かずに exit code 1（S5: 観測できずを成功に読み替えない）。

**3-2 試行の番号 n**
- Unit の段（`approved` の時だけ）: その段・Unit の `UNIT_COMPLETED` の行を audit の順に並べ、`Run floor` の値が初めて現れた順に 1, 2, 3… と番号を付ける。audit の中で一番新しい `UNIT_COMPLETED` の行の `Run floor` の番号を n とする（engine が済みと言う時、一番新しい完了の行が今の試行の物 = 開き直しの後に新しい完了が無ければ engine は済みと言わない）。同じ `Run floor` の行が 2 つ以上あれば同じ番号。完了の無い試行（`UNIT_STARTED` だけ）は数えない。`UNIT_COMPLETED` が 1 つも無いのに engine が済みと言う時（台帳を使わない intent）→ この版の対象外として「確かめられない」。
- 段単位の段: その段の `GATE_APPROVED` を audit の順に数えた番号の、一番新しい物を n とする。

**3-3 作る元の指紋と時刻（BR5.4 を改める）**
- audit の block = 「`## ` で始まる見出しの行」から「次の `---` だけの行」の直前まで（両端の空行を除く）の bytes。改行は LF のまま、文字は UTF-8。
- Unit の段: `sourceEventDigest` = SHA-256（一番新しい `UNIT_COMPLETED` の block の bytes + 改行 1 つ + 要約の確認の答えの正規の JSON）。正規の JSON = 鍵を辞書順に並べ、空白を入れない、UTF-8。要約の確認の要らない段（engine の答えが `required: false`）も同じ形。
- 段単位の段: `sourceEventDigest` = SHA-256（一番新しい `GATE_APPROVED` の block の bytes）。
- `approvedAt`: Unit の段は `UNIT_COMPLETED` の block の Timestamp（要約の確認の行を指す欄が答えに無いため = §6 の答え）。段単位は `GATE_APPROVED` の Timestamp。今の時刻は読まない（S4）。

**3-4 段の順の記録（C9）を「engine の今の判断の写し」にする（BR5.5 を置き換え、版を上げる）**
- schema `sds-stage-sequence/2`（main にまだ /1 を読む物は無い）。
- 行: engine の段の並び（段単位の段は AI-DLC の段の順、Unit の段は walk の block を Unit の並びで繰り返した順）の (段, Unit) を 1 行ずつ。欄 = `order`・`stage`・`unit`（Unit の段だけ）・`status`（`approved` / `exempt` / `not_approved`）・`approvalRef`（`approved` の時だけ、§3-2 の n の file の path）。履歴は行に持たない（試行ごとの承認の記録の file が持つ）。v1 の `superseded` は持たない。
- `sourceDigest` = 今の BR5.6 のまま（audit の shard 全体）。足す欄 `inputDigest` = engine が読む入力の範囲（intent の audit の shard・`aidlc-state.md`・`runtime-graph.json`・intent の `inception/` と `construction/` の下の file）の「相対 path と SHA-256 の組を path の順に並べた物」の SHA-256。同じ `inputDigest` からは同じ bytes。
- 記録の橋（I2）の前の行の選び方は BR2 のまま: intent の最初の段は PASS（BR2.4）、Unit の段の前は同じ Unit の 1 つ前の段（BR2.1）、Unit の最初の段の前は Inception の最後の行（BR2.5）。足すのは「`exempt` の行は前の行に選ばず、同じ決まりでさらに 1 つ前へ進む」だけ。選んだ行が `approved` で `approvalRef` の file が main にあれば通し、`not_approved`・file が無い・取り消し（§3-7）があれば FAIL。

**3-5 読み込む engine を固定の版に結ぶ（BF-06）**
- repo に固定の版の一覧（例 `kit/aidlc-engine-2.11.1.json` = 原典 commit 895a35d8 の `.claude/tools/` の各 file の相対 path と SHA-256）を置く。
- 作り手は、読み込む前に作業場の `.claude/tools/` の全 file の SHA-256 を一覧と照らす。1 つでも違う・足りない・余る → 何も書かずに exit code 1（理由 `ENGINE_PIN_MISMATCH`）。`aidlc --version` や配布キットの版の宣言は証拠にしない（S5）。
- 版を上げる時は、一覧を K（kit の版上げの PR）で入れ替え、§4 の試験を通す。

**3-6 呼び方と CI（BF-01・BF-07）**
- 作り手は bun で、席の作業場でだけ動かす。engine を呼ぶ所は `scripts/sds/engine-judge.mjs`（ESM の JS、300 行の内）1 つ。中身: (1) §3-5 の照合、(2) 作業場の `.claude/tools/` を一時的な場所に写し、`aidlc-orchestrate.ts` の写しの末尾に `export { unitMajorWalkBeat, unitMajorFinishedWalk, unitStageStop, unitExempt, unitLedgerFor };` の 1 行だけを足す（原典の file は変えない、ほかの行は変えない）、(3) 写しを読み込んで §3-1 の関数を呼び、(段, Unit, status, 使った行) の一覧だけを返す。一時的な場所は終わったら消す。
- engine の読込みは引数で受ける（`importModule(path)`。既定は動的な `import()`）。読み込む path は実行時に決まるので、knip・depcruise の静的な import の解析に engine は入らない。
- 承認の記録と段の順の記録を組み立てる本体（`approval-record.mjs`）は、adapter の返す一覧だけを受ける。意味の核は本体にだけある（S2）。
- CI（Node 26、網羅率 80%、hygiene）は、偽の `importModule` で `engine-judge.mjs` も本体も試す（写しの 1 行の足し方、照合の失敗、返す一覧の形）。本物の engine は CI で読み込まない。本物での 1 回の実行は、席が Owner の作業場で行い、その結果（U1 の各段の status と、作った file の SHA-256）を PR に証拠として載せる。

**3-7 読取りの安全と誤った file の復旧（BF-05）**
- 読む前と後で、intent の audit の shard と `aidlc-state.md` の SHA-256 を比べる。違えば何も書かずに exit code 1（`WORKSPACE_CHANGED`）。
- 書く物は一時的な場所に全部作ってから、最後にまとめて `approvals/` に置く。途中で失敗したら何も置かない。既にある file と bytes が違えば何も置かずに exit code 1（BR5.8）。
- 出す理由は決まった code だけ（`ENGINE_PIN_MISMATCH`・`ENGINE_LOAD_FAILED`・`ENGINE_CALL_FAILED`・`UNSUPPORTED_SHAPE`・`WORKSPACE_CHANGED`・`EVIDENCE_MISSING`・`FILE_CONFLICT`）。例外の文・作業場の絶対 path・秘密は出さない（詳しい内容は repo の外の作業場の log にだけ書く）。
- 誤って作った承認の記録は、消さず書き換えず、同じ場所に `attempt-<n>.revoked.json`（`schema: sds-approval-revocation/1`・対象の file・理由の code・正しい記録の path（あれば）・決定の記録の URL と sha256）を足す PR で取り消す。取り消しを足すのは arc の作業指示を受けた shirube の席で、独立の監査の後に統合する。記録の橋は取り消しのある試行を承認として読まない（§3-4）。

### 4. 試験（作り直す I1 と、I2 の橋の merge の条件）
偽の adapter・偽の audit で（CI）:
1. Unit の段: 受領あり・確認あり → `approved`、file を作る。受領あり・確認が古い（前の段に戻ってやり直し、やり直しの確認がまだ）→ `not_approved`、file を作らない。飛ばした Unit・種類で当てはまらない Unit → `exempt`、file なし。
2. 番号: `Run floor` が 2 種類（開き直し 1 回）で一番新しい完了が 2 種類目 → n = 2。同じ `Run floor` の完了が 2 行 → 同じ番号。完了の無い試行は数えない。
3. 指紋: 決めた block の bytes と正規の JSON から、期待の SHA-256（試験に値を書く）と一致する。鍵の順を変えた JSON でも同じ値。`approvedAt` は `UNIT_COMPLETED` の時刻。
4. 段単位: `[x]` と `GATE_APPROVED` → `approved`。`[S]` → `exempt`。`[x]` だけ → 「確かめられない」で何も書かない。Build and Test を段単位として扱う。
5. C9 /2: 行の並び・`status`・`approvalRef` が期待どおり。同じ入力（同じ `inputDigest`）で 2 回 → bytes が同じ。
6. 橋: intent の最初の段 → PASS。Unit 1 の最初の段 → Inception の最後の行を見る。Unit 2 の最初の段 → Unit 1 の最後の段ではなく Inception の最後の行を見る。前の行が `exempt` → さらに前へ。前の行が `not_approved`・file 無し・取り消しあり → FAIL。
7. 版: 一覧と 1 file でも違う（宣言の版は 2.11.1 のまま）→ exit code 1、何も書かない。file が足りない・余る → 同じ。
8. 途中の失敗: 3 行目で engine が例外 → 何も置かない。読む前後で audit が変わる → 何も置かない。既にある file と bytes が違う → 何も置かない。
9. 理由: どの失敗でも、出す文は決まった code だけで、絶対 path を含まない。
本物の engine で 1 回（席の作業場、PR に証拠）:
10. U1 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design が `approved`、Code Generation が `not_approved`（今の作業中）と出て、#24 6381255682 の実測と合う。

### 5. 記録の直し方と流れ
1. この v2 を devauditor の設計監査の round 2 に通す（PR #68 の file を v2 の bytes に置き換える。項目集合は前の EJ-1〜EJ-10 に、BF-01〜07 の直しの確かめを足す）。
2. 合格と受領の後、shirube の席が Owner の作業場で U1 の Functional Design と NFR Requirements を開き直し、この案のとおり entities.md・rules.md・tech-stack-decisions.md を直す（要約の確認と承認は Owner）。
3. その後に席が PR #67 を作り直す（I1 = `engine-judge.mjs` と本体と固定の版の一覧）。実装監査の後、suite-lead が統合。
4. 下流の段への響きは、開き直しの時に engine の影響の表示で確かめる。

### 6. 残る未決
- 段単位の段で `[x]` なのに `GATE_APPROVED` が無い形が実際にあるか（今は「確かめられない」で止める）。作る席が本物の audit で確かめる。
- 固定の版の一覧の置き場の名前（`kit/` の下）は、作る席が kit の決まりに合わせて決める（中身の形はこの記録のとおり）。

next_action: actor=shirube; what=PR #68 の file を v2 の bytes に置き換え、devauditor の設計監査の round 2 を依頼する（作業指示 = #24）; blocking=false
