<!-- arc:shirube-u1-design-revision:engine-judge:v8 -->
## arc の設計の記録: Shirube U1 の設計の改版 v8（I1: 段の「済み」を AI-DLC の engine の判断で読む。v8 = §7 の追補で aun・onza に広げ、門の判定 6 として入れる）

適用: R1〜R3、L1〜L6、S2・S4・S5・S8、OD-SHIRUBE-INCLUDE-AIDLC-NO-REINVENT-20261021-001（#49 6309035411）、OD-SHIRUBE-I1-ENGINE-STATE-COPY-DESIGN-REVISION-20261024-001（#49 6381170673）、OD-SHIRUBE-I1-UNIT-DONE-VIA-ENGINE-PARTS-WITH-BUN-20261025-001（#49 6389500200。索引の行 = iyasaka-org main 40e2f18f）、OI-LLM-CONTROL-BY-SCRIPT-MECHANISM-HOOK-MUST-20261024-001、OD-SHIRUBE-I1-DESIGN-ROUND6-WHOLE-COPY-20261025-001（#49 6393696963。索引の行 = iyasaka-org main 79ec8cd1）。v6（#57 6390523968）への設計監査 round 5 の返却（shirube#68 6392576496、BF-R5-01・02）と Owner の決定（入力を 1 つずつ数えて写し原典の一覧と照らす形をやめ、丸ごと写して指紋と engine の版を残す）を受けて §3-5 を書き直した。round 4 の返却（shirube#68 6392358644）は受付の BLOCK で、設計の中身を見ていない。v6 の答えのうち §3-5 に関わらない物は保つ。以下は v6 までの経緯。v2（#57 6389874375）への設計監査 round 2 の返却（shirube#68 6390071922、BF-R2-01〜06）と、shirube の席の確認（#24 6389980151・6390213665・6390265024）を受けて全体を書き直した。v2・v3（#57 6390136222）・v4（#57 6390236637）・v5（#57 6390272104）は置き換え（v3・v4 は監査に出す前に席の確認で直した）。v5 への設計監査 round 3 の返却（shirube#68 6390455033、BF-R3-01〜05）と、席の確認（#24 6390338940）を受けて直した。round 1 の指摘（BF-01〜07）への答えは保つ。対象 = U1 の Functional Design（entities.md・rules.md）と NFR Requirements の tech-stack-decisions.md。独立の監査の前の案。

### 0. 指摘との対応
| 指摘 | v7 の答え（節） |
|---|---|
| BF-01 engine と同値でない | engine 自身の関数をそのまま呼ぶ。条件を組み立てない（§3-1、§3-6） |
| BF-02 橋の前の行 | BR2.1・BR2.4・BR2.5 を保ち、免除の行を飛ばすだけを足す（§3-4） |
| BF-03 段の分類 | `isPerUnitStage` と段の phase で 3 つに分ける（§3-1） |
| BF-04 検証と決定的な入力 | §3-3、§3-5、§4 |
| BF-05 読取りの安全・誤った file | §3-7 |
| BF-06 engine の同一性 | §3-5 |
| BF-07 adapter と CI | §3-6 |
| BF-R2-01 walk の block は全段ではない | 行にする段を stage graph と Unit の一覧から全部並べ、walk を使わない。各 (段, Unit) に engine の `unitStageStop` を呼ぶ（§3-1、§3-4） |
| BF-R2-02 Initialization に承認が無い | phase が `initialization` の段は人の承認の無い段とし、`[x]` なら `exempt`（§3-1） |
| BF-R2-03 観測入力の固定 | engine を環境変数を消した子の process で動かし、作業場の `.claude/` と `aidlc/` を丸ごと写した物だけを読ませ、その指紋を残す（§3-5。v7 で、読む物を数えて snapshot にする形から丸ごとの写しに替えた） |
| BF-R2-04 証拠が本体に渡る契約 | adapter の返す型を決め、成功した要約の確認の答え・block の bytes・時刻・番号に要る履歴を返す（§3-6） |
| BF-R2-05 BR2.6 相当 | engine の「今の試行で始めた Unit」（`unitLifecycleSnapshot` の `open`）を行に持ち、橋は PR の段が「承認済み」か「今の試行で始めた」時だけ通す（§3-4） |
| BF-R2-06 bun の決定が索引に無い | iyasaka-org PR #71 で索引に行を足し、統合済み（main 40e2f18f、監査 PASS 6390152401） |
| 席の確認 6390213665 の 1（判断する intent が固定されていない） | engine が使う選択を対象の intent と照らし、違えば止める。選択に関わる file も丸ごとの写しに入る（§3-5） |
| 席の確認 6390213665 の 2（子の process が束縛を書きうる） | 束縛を書かせない渡し方にする。v7 では engine が書いても写しの中だけで、作業場は変わらない（§3-5） |
| 席の確認 6390265024 の 1（`.aidlc-sessions/` の全 file を入れると hook の書込みで毎回変わる） | v7: transcript なども写しに入るが、作業場と比べ直すのは audit の shard・`aidlc-state.md`・名札の file だけ（§3-5） |
| 席の確認 6390265024 の 2（`exempt` を飛ばすと最初の段の前の行が無い） | `exempt` を飛ばして前の行が無くなる段を「intent の最初の段」とし、BR2.4 のとおり PASS（§3-4） |
| BF-R3-01 段全体の skip を Unit の免除へ写せない | Unit の段の一覧を engine の `unitMajorConstructionStageSlugs(scope, state, true)` で決め、段全体が `[S]` の Unit の段は全 Unit の行を `exempt` にする（§3-1） |
| BF-R3-02 BR2.6 の拒否が Unit の段だけ | 段単位の行にも `started`（Stage Progress の印が `[x]`・`[-]`・`[?]`・`[R]`。開き直しで engine が `[ ]` に戻す）を持ち、橋の確かめを両方に当てる（§3-4） |
| BF-R3-03 環境と session の固定が足りない | 子の process を `bun --no-env-file`・`.env` の無い一時的な場所を cwd にして起動し、読み込みの後も 2 つの override が残っていることを確かめる。専用の id の名の file（`<id>.helper-of` を含む）と `intents/intents.json` を観測に入れる（§3-5） |
| BF-R3-04 tools の写し先と scopes などの読込先が違う | v7: `.claude/` を丸ごと一時的な harness に写し、engine はその写しだけを読む。照らす一覧は持たない（§3-5、§3-6） |
| BF-R3-05 返却に sourceAuditRef が無い | `evidence` に、使った block のある audit の shard の相対 path（`sourceAuditRef`）を足す（§3-6） |
| BF-R4-ADMISSION-01 決定が索引に無い | 決定の行を足す索引の PR（#72）の統合を待たずに依頼させた arc の誤りだった。round 5 は統合の後に依頼した。round 6 も、決定 OD-SHIRUBE-I1-DESIGN-ROUND6-WHOLE-COPY-20261025-001 の行の統合（iyasaka-org main 79ec8cd1）の後に依頼する |
| BF-R5-01 名札の file が観測の外 | 読む物を 1 つずつ数えて写すのをやめ、`.claude/` と `aidlc/` を丸ごと写す（名札の file・team の範囲の印も入る）。名札に host が無ければ止め、engine が `hostname()` から host を取る経路を通さない。重なった shard の正負の試験を足す（§3-5、§4 の 7） |
| BF-R5-02 固定の一覧の出所 | Owner の決定で、原典 2.11.1 の一覧と照らす形をやめた。版は写しの engine の `AIDLC_VERSION` で確かめ（engine の報告で確かめることは Owner の決定で受け入れた）、`.claude/` の写しの指紋を C9 に残す。scopes は指紋に入るだけで、止める条件にはしない（§3-5、§4 の 7） |

### 1. 事実（AI-DLC 2.11.1、原典 commit 895a35d8。Owner の作業場の `.claude/tools/` と bytes が同じ = #24 6389739676）
- 作る段階の Unit の段の「止まり」は `aidlc-orchestrate.ts` の `unitStageStop(projectDir, stateContent, k, u, kind, recordPrefix, codekbCtx, ledger)`（13197 行目）が決める（null = 済み）。免除は `unitExempt(k, u, kind, ledger)`（11447）、台帳は `unitLedgerFor(projectDir, slug)`（11410、wave の時の扱いと Guard Policy を含む）、記録の置き場は `engineRelativeRecordDir(projectDir)`（823）、codekb の文脈は `codekbCtxFor(projectDir)`（6785）。どれも export されていない。main は `import.meta.main` の時だけ動く（18423）。
- 要約の確認は `checkSummaryConfirmationEvidence`（`aidlc-lib.ts` 14380、export）。成功の答えに確認の行を指す欄は無い。Unit の種類は `resolveBoltDag(projectDir).unitKinds`（44359、export）。今の試行で始めて済んでいない Unit は `unitLifecycleSnapshot(...).open`（37950、export）。
- walk の block（`constructionUnitMajorBlock`）は、Checkpoints が無効なら `[x]` の段を、いつも `[S]` の段を除く。済んだ段の一覧には使えない（BF-R2-01）。
- 段の一覧は `.claude/tools/data/stage-graph.json`（33 段、phase = initialization・ideation・inception・construction・operation）。Initialization の 3 段（`workspace-scaffold`・`workspace-detection`・`state-init`）は人の承認が無く、engine が自分で進めて `[x]` を付ける（本物の audit でも `GATE_APPROVED` は 0 件 = #24 6389980151）。
- engine は `AIDLC_STAGE_GRAPH`・`AIDLC_SCOPES_DIR`・`AIDLC_HARNESS_DIR`・`AIDLC_RUNTIME_ROOT` などの環境変数で読む先を変える（一覧 = #24 6390213665 の A）。Guard Policy は intent の space の `memory/org.md`・`team.md`・`project.md` も読む。
- `engineRelativeRecordDir`・`codekbCtxFor` は `engineSelection(projectDir)` で判断する space・intent を決め、chat の束縛（`aidlc/.aidlc-sessions/<chat>.binding.json`）、無ければ cursor（`aidlc/active-space`・`aidlc/spaces/<space>/intents/active-intent`）を使う。名指しの session が無く `AIDLC_SESSION_OVERRIDE_SOURCE` が `payload` でない時は、束縛を書きうる（`resolveChat(..., {bind: true})`）。chat の id は環境変数と process の祖先から探す（#24 6390213665 の確認 1・2）。
- `resolveBoltDag` は `unit-of-work-dependency.md` を正本にし、`unitKinds` は `state: "ok"` の時だけ返す。
- engine の driver が歩く Unit の段は `unitMajorConstructionStageSlugs(scope, stateContent, includeCompleted)`（`aidlc-lib.ts` 39959、export）で決まる。段全体の `[S]` はいつも除き、`includeCompleted` が偽なら `[x]` も除く。`unitExempt` は種類の除外と Unit の `UNIT_SKIPPED` だけを見て、段全体の `[S]` は見ない（BF-R3-01）。
- 開き直し（jump）は、対象の段とその下流の印（`[x]`・`[-]`・`[?]`・`[R]`・`[S]`）を `[ ]` に戻す（`aidlc-jump.ts` 516 行目）。
- `aidlc-runtime-paths.ts` は読み込まれた時に `dropDotenvNames()`（95 行目）を動かし、bun が cwd の `.env` 群を読んでいれば、そこで名指された変数を環境から消す。bun 1.3 には自動の `.env` の読込みを止める `--no-env-file` がある。`resolveChat` は束縛のほかに `<id>.helper-of` を読む。`codekbCtxFor` は space の `intents/intents.json` を読む。`resolveHarnessRoot` は module の位置の `.claude` を選ぶので、scopes などは写し先の物が読まれる（BF-R3-03・04）。
- audit の shard の名は `<host>-<token>.md`。読む側の `knownAuditShardName`（`aidlc-lib.ts` 15340）は、team の範囲の印 → process の中の cache → `aidlc/.aidlc-clone-id`（名札）の順に名を決め、名札に host が無い時は既存の shard から、それも無ければ `hostname()` から host を取る。重なった block をどの shard に残すかはこの名で決まる（BF-R5-01）。今の作業場の名札は token と host（`owner`）の両方を持つ。
- engine の版は `aidlc-version.ts` の `AIDLC_VERSION`（`"2.11.1"`）。原典の `core/tools` と、導入が作る作業場の `.claude/tools` は、導入の時の書き換え・生成で同じ集合・同じ bytes にならない（BF-R5-02）。

### 2. 変えないもの
- 門の判定 1〜5 と FAIL の扱い、記録の橋の BR2 の決まり（BR2.1・BR2.4・BR2.5・BR2.6 の意味）。門が読むのは main にある記録だけ。公開の repo の CI に bun も engine も入れず、`ci.yml`・pin・網羅率の母集団を変えない。
- 承認の記録（C2）の置き場、書き換えない・消さない、`identityCheck: none`、`approverRole: owner`。PR の順、1 本 400 行、own-code の予算 4,000 行。audit は公開の repo に載せない。

### 3. 変えるもの
**3-1 行にする段と「承認済み」の決め方（BR5.1・BR5.2 を置き換える）**
- 行にする (段, Unit) = stage graph の段のうち、状態の file の Stage Progress に印がある段（intent が選んだ段）。`isPerUnitStage` が真の段は `runtime-graph.json` の Unit ごとに 1 行、偽の段は 1 行。walk の block は使わない。
- Unit の段のうち、段全体の印が `[S]` の段は、全 Unit の行を `exempt` にする（engine の driver が歩かない段）。`[S]` でない Unit の段は、engine の `unitMajorConstructionStageSlugs(scope, stateContent, true)` が返すこと（driver が歩く段であること）を確かめ、返さない段は「確かめられない」とする。
- 段の 3 つの分類:
  1. **人の承認の無い段**（phase = `initialization`）: `[x]` → `exempt`。それ以外 → `not_approved`。承認の記録は作らない。
  2. **作る段階の Unit の段**（`isPerUnitStage` が真で、段全体が `[S]` でない）: engine の `unitStageStop` を (段, Unit) ごとに呼ぶ。null で `unitExempt` が真 → `exempt`。null で `unitExempt` が偽 → `approved`。null でない → `not_approved`。引数（kind・recordPrefix・codekbCtx・ledger）は engine の関数（`resolveBoltDag`・`engineRelativeRecordDir`・`codekbCtxFor`・`unitLedgerFor`）で作り、自分で組み立てない。
  3. **段単位の人の承認のある段**（上の 2 つ以外。ideation・inception・Build and Test など）: Stage Progress が `[x]` で、audit にその段の `GATE_APPROVED` がある → `approved`。`[S]` → `exempt`。それ以外 → `not_approved`。`[x]` なのに `GATE_APPROVED` が無い → 「確かめられない」。
- この版の対象 = solo・unit-major・swarm でない intent で、`resolveBoltDag` が `state: "ok"` を返す intent。`none`・`malformed`、team・swarm・段単位の成果物の形（engine の `usesStageLevelPerUnitArtifacts` が真。`aidlc-lib.ts` 39927 行目、export）の intent → 「確かめられない」。
- 「確かめられない」= 何も書かずに exit code 1（S5）。

**3-2 試行の番号 n**
- Unit の段（`approved` の時）: その段・Unit の `UNIT_COMPLETED` の行を audit の順に並べ、`Run floor` の値が初めて現れた順に番号を付け、一番新しい `UNIT_COMPLETED` の行の番号を n とする。同じ `Run floor` の行は同じ番号。完了の無い試行は数えない。`UNIT_COMPLETED` が無いのに engine が済みと言う時（台帳を使わない intent）→ 「確かめられない」。
- 段単位の承認のある段: その段の `GATE_APPROVED` を audit の順に数えた、一番新しい物の番号。

**3-3 作る元の指紋と時刻**
- audit の block = 「`## ` で始まる見出しの行」から「次の `---` だけの行」の直前まで（両端の空行を除く）の bytes。LF・UTF-8 のまま。
- Unit の段: `sourceEventDigest` = SHA-256（一番新しい `UNIT_COMPLETED` の block + LF 1 つ + 要約の確認の成功の答えの正規の JSON）。正規の JSON = 鍵を辞書順、空白なし、UTF-8。`approvedAt` = その block の Timestamp。
- 段単位の承認のある段: `sourceEventDigest` = SHA-256（一番新しい `GATE_APPROVED` の block）。`approvedAt` = その Timestamp。
- 今の時刻は読まない（S4）。

**3-4 段の順の記録（C9 `sds-stage-sequence/2`）と記録の橋**
- 行の並び = stage graph の段の順。Unit の段は `runtime-graph.json` の Unit の並びで、Unit ごとに Unit の段を続けて並べる（unit-major）。
- 欄: `order`・`stage`・`unit`（Unit の段だけ）・`status`（`approved` / `exempt` / `not_approved`）・`started`（真偽。今の試行で始めた。Unit の段 = engine の `unitLifecycleSnapshot(...).open` にその Unit がある、または `approved`。段単位の段 = Stage Progress の印が `[x]`・`[-]`・`[?]`・`[R]` のどれか。開き直しで engine が `[ ]` に戻すので、上流の開き直しの後に始め直していない段は偽になる）・`approvalRef`（`approved` の時だけ、§3-2 の n の file の path）。
- `sourceDigest` = BR5.6 のまま（audit の shard 全体）。`inputDigest`・`engineTreeDigest`・`engineVersion` = §3-5 の写しの指紋と版（C9 の欄。C2 は変えない）。同じ写しからは同じ bytes。
- 記録の橋（I2）:
  - 前の行の選び方は BR2 のまま（intent の最初の段 = PASS = BR2.4、Unit の段の前は同じ Unit の 1 つ前の段 = BR2.1、Unit の最初の段の前は Inception の最後の行 = BR2.5）。`exempt` の行は前の行に選ばず、同じ決まりで 1 つ前へ進む。
  - 「intent の最初の段」= `exempt` の行を飛ばして 1 つ前へ進むと前の行が無くなる段（Initialization の 3 段が `exempt` なら `intent-capture`）。この段は BR2.4 のとおり PASS。Initialization の段が `exempt` でない（`[x]` でない = `not_approved`）時は、その行が前の行に選ばれて FAIL になる（初期化の済んでいない intent は通さない）。
  - PR が指す段の行の確かめ（BR2.6 の意味を engine の判断で保つ。Unit の段にも段単位の段にも当てる）: PR が指す行が `approved` でも `started` でもない → FAIL（上流を開き直して再承認しても、その段を今の試行で始めていない＝古い試行の作業）。
  - 前の行が `approved` で `approvalRef` の file が main にあり、取り消し（§3-7）が無い → 通す。それ以外 → FAIL。
- 3 つの状態の期待（Unit の段と段単位の段の両方）: (a) 上流が `not_approved` → FAIL。(b) 上流を再承認しただけで下流をまだ始めていない（下流の行が `started: false`）→ FAIL。(c) 下流を今の試行で始めた（`started: true`）→ 通す。

**3-5 入力の写しと指紋（BF-06・BF-R2-03・BF-R5-01・BF-R5-02。Owner の決定 OD-SHIRUBE-I1-DESIGN-ROUND6-WHOLE-COPY-20261025-001 で、読む物を 1 つずつ数えて写し原典の一覧と照らす形をやめた）**
- 丸ごとの写し: 作業場の `.claude/` の下と `aidlc/` の下を、file を選ばずに丸ごと一時的な harness（`<一時的な場所>/.claude/`・`<一時的な場所>/aidlc/`）に写す。写しの root にはこの 2 つのほかは置かない。engine はこの写しだけを読む（module の位置から harness root を決めるので、scopes などの読込先も写しになる）。何を読むかを数えないので、名札の file（`aidlc/.aidlc-clone-id`）・team の範囲の印・`intents/intents.json`・束縛の file などの数え漏れは起きない（BF-R5-01）。symbolic link があれば写さずに止める（`COPY_FAILED`。作業場の外を読ませない）。
- 指紋: `inputDigest` = 写した全 file の「`.claude/` か `aidlc/` から始まる相対 path と SHA-256 の組を、path の UTF-8 の bytes の順に並べた物」の SHA-256。engine を呼ぶ前に写しから計算する。同じ写しからは同じ値で、同じ値なら同じ答えが出ることを試験で確かめる（§4 の 7）。写しにはほかの chat の transcript なども入るので、値は作るたびに変わりうる（値は「engine が見た入力の指紋」で、同じ作業場の状態を指す番号ではない）。transcript・usage などを作業場との比べ直し（下の「写しの途中の変化」）には戻さない（席の確認 6390265024 の 1、BF-R5-01 の注意）。指紋に入るのは、丸ごとの写しで engine に見える物の全部を指すためで、止める条件にはしない。`engineTreeDigest` = 同じ作り方で `.claude/` の写しだけから計算した指紋。
- 版: 子の process が写しの `.claude/tools/aidlc-version.ts` の `AIDLC_VERSION` を読み込んで返し、`"2.11.1"` でなければ何も書かない（`ENGINE_VERSION_MISMATCH`）。原典 2.11.1 の file と 1 つずつ同じであることは保証しない（Owner の決定。導入の時の書き換え・生成・plugin の選択を照らす一覧を持たないので、BF-R5-02 の「一覧の出所」は生じない）。後から作業場と照らせるように、`engineVersion` と `engineTreeDigest` を C9 に残す。
- 名札: 写しの名札の file が無い、または token と host のどちらかが無ければ、何も書かない（`CLONE_ID_INCOMPLETE`）。engine が host を `hostname()` から取る経路（写しの外の機械の名前に依る）を通さないため（BF-R5-01 の host fallback）。今の作業場の名札は両方を持つ。
- 写しの途中の変化: 写した後に、作業場の audit の shard・`aidlc-state.md`・名札の file を読み直して写しと bytes を比べ、違えば 1 回だけ写し直す。2 回目も違えば何も書かない（`WORKSPACE_CHANGED`）。会話が audit に書き足している最中の、途中で切れた写しで判断しないため。ほかの file（transcript など）は比べない（答えは写しに対する物で、指紋がその写しを指す）。
- 子の process: `bun --no-env-file` で動かし、cwd は写しの root（`.env` は無い）。環境変数を全部消してから、要る物だけを渡す: PATH、空の一時的な場所を指す HOME（作業場の外の機械の設定を読ませない）、projectDir を決める変数（写しの root）、束縛を書かせないための `AIDLC_SESSION_OVERRIDE_SOURCE=payload` と、束縛を持たない専用の session の id（`AIDLC_SESSION_OVERRIDE`）。ほかの `AIDLC_`・`CLAUDE_`・`KIRO_`・`CODEX_` で始まる変数は渡さない。読み込みの後に 2 つの override が渡した値のまま残っているかを確かめ、消えていれば何も返さない（`OVERRIDE_DROPPED`）。専用の id は作り手が引数で受けた新しい id で、写しに `<id>.` で始まる file が 1 つも無いことを確かめる（在れば止める）。
- 判断する intent の固定: 作り手は対象の space と intent を引数で受ける。子の process は export の shim で足した `engineSelection` を呼び、engine が使う space・intent が対象と同じかを確かめる。違えば何も書かない（`SELECTION_MISMATCH`）。この渡し方で選択が cursor から対象に決まることは、作る席が実物で確かめる（確かめられなければ、この設計の対象外として止める）。
- 作業場は変えない: engine が書くのは写しの中だけで、写しは終わったら消す。作り手が作業場に書くのは、最後にまとめて置く `approvals/` の file だけ（§3-7）。

**3-6 adapter の契約と CI（BF-01・BF-07・BF-R2-04）**
- engine を呼ぶ所は `scripts/sds/engine-judge.mjs`（ESM の JS、300 行の内）1 つ。中身: (1) §3-5 の丸ごとの写しと名札・版の確かめ、(2) 写しの `aidlc-orchestrate.ts` の末尾に `export { unitStageStop, unitExempt, unitLedgerFor, engineRelativeRecordDir, codekbCtxFor, engineSelection };`（`unitMajorConstructionStageSlugs` は `aidlc-lib.ts` の export をそのまま使う）（`usesStageLevelPerUnitArtifacts`・`checkSummaryConfirmationEvidence`・`unitLifecycleSnapshot`・`resolveBoltDag`・`isPerUnitStage` は `aidlc-lib.ts` の export をそのまま使う） の 1 行だけを足す、(3) 子の process で §3-1 の判断と証拠の取り出しを行い、下の型の JSON だけを返す。一時的な場所は終わったら消す。
- 返す型（`sds-engine-judgment/1`）: `{ inputDigest, engineTreeDigest, engineVersion, sourceDigest, rows: [ { stage, unit|null, kind: "initialization"|"per-unit"|"stage-gate", status, started|null, evidence|null } ] }`。`evidence` は `approved` の時だけ: Unit の段は `{ completedBlock: string（§3-3 の bytes）, completedAt, runFloorOrdinal, summary: object（成功の答えのまま）, sourceAuditRef: string（その block のある audit の shard の、作業場の root からの相対 path）}`、段単位は `{ gateBlock: string, gateAt, gateOrdinal, sourceAuditRef: string }`。本体は `sourceAuditRef` を承認の記録の `sourceAuditRef`（C2 の必須の欄）にそのまま入れる。番号（ordinal）は子の process が §3-2 の決まりで audit の全 shard から数える（engine が刻んだ印を数えるだけで、境目は作らない）。
- 本体（`approval-record.mjs`）はこの JSON だけを受け、承認の記録と C9 を作る（指紋・path・並び）。engine の判断を本体で作り直さない（S2）。
- engine の読込みは引数で受ける（`importModule(path)`。既定は動的な `import()`）。読む path は実行時に決まるので、knip・depcruise の静的な解析に engine は入らない。
- CI（Node 26、網羅率 80%、hygiene）は、偽の `importModule` と偽の audit・state で `engine-judge.mjs` と本体を試す。本物の engine は CI で読み込まない。本物での 1 回の実行は、席が Owner の作業場で行い、返った JSON の `inputDigest` と U1 の各行の status、作った file の SHA-256 を PR に証拠として載せる。偽と本物で同じ型の JSON を受けて n・指紋・`approvedAt`・C9 を作れることを契約の試験にする。

**3-7 安全と誤った file の復旧（BF-05）**
- 書く物は一時的な場所に全部作ってから、最後にまとめて `approvals/` に置く。途中の失敗では何も置かない。既にある file と bytes が違えば何も置かない（BR5.8）。
- 出す理由は決まった code だけ（`ENGINE_VERSION_MISMATCH`・`CLONE_ID_INCOMPLETE`・`COPY_FAILED`・`ENGINE_LOAD_FAILED`・`ENGINE_CALL_FAILED`・`UNSUPPORTED_SHAPE`・`SELECTION_MISMATCH`・`OVERRIDE_DROPPED`・`WORKSPACE_CHANGED`・`EVIDENCE_MISSING`・`FILE_CONFLICT`）。例外の文・絶対 path・秘密は出さない（詳しい内容は repo の外の作業場の log にだけ）。
- 誤って作った承認の記録は消さず書き換えず、同じ場所に `attempt-<n>.revoked.json`（`schema: sds-approval-revocation/1`・対象・理由の code・正しい記録の path（あれば）・決定の記録の URL と sha256）を足す PR で取り消す。足すのは arc の作業指示を受けた shirube の席、独立の監査の後に統合。橋は取り消しのある試行を承認として読まない。

### 4. 試験（作り直す I1 と I2 の merge の条件）
偽の adapter・偽の入力で（CI）:
1. Initialization の 3 段が `[x]` で `GATE_APPROVED` が無い → 3 行とも `exempt`、全体は失敗しない（正常な初期化から U1 の記録が作れる）。
2. Unit の段: 受領と確認あり → `approved`。確認が古い → `not_approved`。飛ばした・種類で当てはまらない → `exempt`。Checkpoints が無効で Functional Design が `[x]`、Code Generation が作業中 → Functional Design の行は `approved` のまま残る（walk の block に頼らない）。Code Generation の行は `started: true`・`not_approved`。
3. 段単位: `[x]` と `GATE_APPROVED` → `approved`。`[S]` → `exempt`。`[x]` だけ → 「確かめられない」。Build and Test を段単位として扱う。
3b. skip と除外を分けて: 段全体が `[S]` の Unit の段 → 全 Unit の行が `exempt`（成果物・受領が無くても `not_approved` にしない）。段は歩くが 1 つの Unit が `UNIT_SKIPPED` → その Unit の行だけ `exempt`。種類で当てはまらない Unit → その Unit の行だけ `exempt`。Checkpoints が有効でも無効でも同じ結果。段全体が `[S]` の段の次の段の PR → 橋は `exempt` を飛ばして通す。
4. 番号・指紋・時刻: `Run floor` が 2 種類（開き直し 1 回）で一番新しい完了が 2 種類目 → n = 2。同じ `Run floor` の完了が 2 行 → 同じ番号。完了の無い試行は数えない。決めた block の bytes と正規の JSON から期待の SHA-256（試験に値を書く）と一致し、鍵の順を変えた JSON でも同じ値。`approvedAt` は `UNIT_COMPLETED` の時刻。
5. C9: 行の並び（unit-major）・`status`・`started`・`approvalRef`。同じ写しで 2 回 → bytes が同じ。作る段階より後へ進んだ intent でも、済んだ Unit の段の行が全部 `approved` で残る。
6. 橋: 段単位の段でも (a)(b)(c) の 3 状態（例: Requirements を開き直して再承認しただけで User Stories が `[ ]` → User Stories の PR は FAIL、User Stories を始め直して `[-]` → 通す）。Initialization の 3 段が `exempt` の時、`intent-capture` の PR → 前の行が無いので PASS（BR2.4）。Initialization の 1 段が `not_approved` の時、`intent-capture` の PR → FAIL。Unit 2 の最初の段 → Inception の最後の行を見る。前の行が `exempt` → さらに前へ。§3-4 の (a)(b)(c) の 3 状態。取り消しあり → FAIL。
7. 入力: 写しの `AIDLC_VERSION` が `"2.11.1"` でない → `ENGINE_VERSION_MISMATCH`・何も書かない。`.claude/` か `aidlc/` の中に symbolic link → `COPY_FAILED`。名札の file が無い・host が無い → `CLONE_ID_INCOMPLETE`（`hostname()` の経路を通らない）。名札が同じで、2 つの shard に同じ `UNIT_COMPLETED` の block がある → engine が残した方の shard が `sourceAuditRef` になり、名札の file を変えると `inputDigest` が変わる（BF-R5-01 の正と負）。`AIDLC_STAGE_GRAPH` を親で設定しても子に渡らず結果が変わらない。親の HOME に機械の設定を置いても結果が変わらない（子の HOME は空）。memory の Guard Policy・`scopes/`・`codekb/`・`intents/intents.json` を変えると `inputDigest` が変わる（止めない）。同じ写しで 2 回 → `inputDigest` と結果の bytes が同じ。写しの後に作業場の audit の shard が伸びる → 1 回写し直し、2 回とも違えば `WORKSPACE_CHANGED`・何も書かない。写しの後に transcript だけが変わる → 失敗しない。cursor が別の intent を指す → `SELECTION_MISMATCH`。写しに `<id>.helper-of` が在る → 止める。子の process が写しの中に束縛の file を書いても、作業場の `aidlc/.aidlc-sessions/` は変わらない。
7b. 承認の記録: 2 つの shard に audit が分かれ、使う `UNIT_COMPLETED` が 2 つ目の shard にある → `sourceAuditRef` がその shard の相対 path になり、C2 の必須の欄がそろった承認の JSON が作れる。`resolveBoltDag` が `malformed` → 「確かめられない」。
8. 途中の失敗・理由: 3 行目で engine が例外 → 何も置かない。既にある file と bytes が違う → 何も置かない。どの失敗でも、出す文は決まった code だけで、絶対 path を含まない。
本物の engine で 1 回（席の作業場、PR に証拠）:
9. Initialization の 3 段 = `exempt`、ideation・inception の段 = `approved`、U1 の設計 4 段 = `approved`、Code Generation = `started: true`・`not_approved`。#24 6381255682・6389980151 の実測と合う。

### 5. 流れ
1. Owner の決定 OD-SHIRUBE-I1-DESIGN-ROUND6-WHOLE-COPY-20261025-001 の索引の行は統合済み（iyasaka-org main 79ec8cd1）。
2. この v7 を PR #68 に置いて設計監査の round 6（項目集合に BF-R5-01・02 の確かめを足し、EJ-33 を新しい決定と索引の commit 79ec8cd1 に結び直す）。round 6 でも不合格なら、席は 7 回目を出さずに止まり、arc が Owner に伺う。
3. 合格と受領の後、shirube の席が Owner の作業場で U1 の Functional Design と NFR Requirements を開き直してこの案のとおり直す（要約の確認と承認は Owner）。
4. 席が PR #67 を作り直し（I1）、実装監査の後に suite-lead が統合。

### 6. 残る未決
- §3-5 の渡し方（`AIDLC_SESSION_OVERRIDE_SOURCE=payload` と専用の session の id）で、engine が束縛を書かず、選択が cursor から対象の intent に決まることを、作る席が実物で 1 回確かめて PR に証拠を載せる。違えば I1 の実装に入らず arc に返す（arc が設計を直す）。
- 丸ごとの写しの大きさと時間（今の作業場で何 MB・何秒か）を、作る席が実物で 1 回測って PR に載せる。1 GB を超える・1 分を超える時は I1 の実装に入らず arc に返す。
- 閉じた物: Initialization のほかに `[x]` で `GATE_APPROVED` の無い段は無い（stage の定義で「NO approval gate」は 3 段だけ。#24 6390213665）。engine が読む物を数える形は v7 でやめた（丸ごと写す）。

（v7 の next_action は §7 の最後の next_action が置き換える。）

### 7. 版 8 の追補（2026-11-03。aun・onza に広げ、門の判定 6 として入れる）

v7 の §1〜§6 は v7 のまま残す（§3-1〜§3-7 の作り手の作りは変えない）。この §7 は、Owner の決定 OD-SHIRUBE-NEXT-GOAL-GATE-READS-AIDLC-APPROVAL-START-20261103-001（iyasaka-arc#49 6588894545。以下 [NG]）の決定 4（作業指示の前に v7 を 10/25 より後の門の変更と照らし、食い違えば設計の改版を事前の設計監査に通す）による追補で、照らし合わせの結果（iyasaka-arc#57 6589245832）の食い違い 3 つだけを埋める。§7 と §1〜§6 が食い違う所は §7 が正（§7.2 に列挙）。

#### 7.0 目的と済みの条件（[NG] の決定 1・3 のまま）
- 目的: 「AI-DLC で承認した段の作業だけが統合される」。
- 済みの条件: aun と onza で、(1) 承認の記録を持つ PR が門を通って統合される、(2) 承認の無い段の作業の PR（負例）を門が FAIL にする、(3) 記録だけの期間に誤った FAIL（門の不備と分類された FAIL）が 0 なら、止める形にするかを Owner に伺う。
- 対象外（[NG] の含まないもの）: 止める形への切り替え、各 PR の exact-head、U2・U3・U7・S2 のセキュリティの制御、新しい外部の依存（bun は OD-SHIRUBE-I1-UNIT-DONE-VIA-ENGINE-PARTS-WITH-BUN-20261025-001 で決まっている）、aidlc-shirube の次の版の範囲の段の答え、S1 の済みの判定。

#### 7.1 事実（2026-11-03 に arc が読んだ）
- 門（shirube main `5356af4f` の `scripts/sds/gate.mjs`）の判定は 1〜5。判定 4 = 道筋（pin の `delivery_plan.control_source`）、判定 5 = 設計（`design_binding`。5.3u = 作る単位の設計の記録の独立の設計監査、5.9 = 置き場）。どちらも pin の mode（`plan_binding_mode`・`design_binding_mode`）で段階を決め、aun（pin `5356af4f`）・onza（pin `5bccc25d`）ともに `report-only`。sds-gate は 3 つの repo で必須の検査（aun `feature/bootstrap`・onza `main` は OD-SHIRUBE-SDS-GATE-REQUIRED-AUN-ONZA-20261102-001 = #49 6572790201 で、shirube `main` は OD-SHIRUBE-MAIN-BRANCH-PROTECTION-AND-SDS-GATE-REQUIRED-20261025-001 で。2026-11-03 に branch protection の必須の一覧を読んで確かめた）。判定 1〜3 で止め、4・5 は記録だけ。
- 配布キットの PR の雛形（aun・onza の `.github/pull_request_template.md`）は、`aidlc_record` を散文の 1 行（「aidlc/ の下の記録の path」）でしか持たず、`sds-pr` の block に欄が無い。門はこの行を読まない。
- U1 の Functional Design（shirube main の `aidlc/spaces/default/intents/261021-dev-speedup-automation/construction/u1-skeleton/functional-design/`）は、記録の判定を門の 1〜5 とは別の「記録の判定」にし（BR1.1・BR4.1）、`sds-pr` の block に `aidlc_record`（`intent`・`stage`・`unit`）を足し（C1）、承認の記録を repo の `approvals/<intent>/…` に置く（C2・C9）と決めている。v7 はその読み方（§3-4 の橋）を engine の判断に替えた物。
- aun・onza の repo は非公開。AI-DLC の記録は repo に無く、Owner の作業場（`~/Developer/aidlc-owner/aun`・`~/Developer/aidlc-owner/onza`。どちらもその repo の checkout で、`.claude/`・`aidlc/` は git の外）にだけある。3 つの作業場とも `AIDLC_VERSION = "2.11.1"`、Unit Ownership = solo、unit-major。
- aun の作業場（intent `261021-ai-handoff-relay`）: Inception の段は全部 `[x]`・`[S]`。作る段は u1 の設計の 4 段の記録がある（記録の追いつき）。u2 以降の Unit の作る段は始まっていない。aun の作る単位（u2・u3・u5 …）は、arc の設計の記録（独立の設計監査 = 判定 5 の 5.3u の対象）で作っている（OD-U5-U1-IMPLEMENT-ALONGSIDE-AIDLC-RESYNC-20261027-001・OD-AUN-REMAINING-UNITS-DESIGN-AHEAD-AND-U3-ON-SPE-DEV-20261102-001）。
- onza の作業場（intent `261021-decision-stall-visibilit`。もう 1 つ `261021-staff-knowledge-support` がある）: Inception と U1 の設計の 4 段が承認済みで、onza の実装の席がこの作業場で U1 の Code Generation を回している（OD-ONZA-U1-RELAUNCH-IMPL-SEAT-IN-AIDLC-WORKSPACE-BY-CTO-20261102-001）。
- shirube の own code は 2,178 行 / 4,000 行（main `5356af4f`、`scripts/hygiene/own-code-budget.mjs`）。

#### 7.2 v7 のうち §7 が置き換える所
| v7 の所 | v8 |
|---|---|
| §2「門の判定 1〜5 と FAIL の扱い…を変えない」 | 判定 1〜5 は変えない。U1 の「記録の判定」を **判定 6**（record binding）として足す（§7.5） |
| §2「承認の記録（C2）の置き場」・§3-7「最後にまとめて `approvals/` に置く」 | 置き場は shirube・aun・onza の各 repo の root の `approvals/<intent>/…`（C2・C9 の path のまま）。作り手は Owner の作業場を読み、書く先は引数で受けた repo の checkout の root（Owner の作業場に書かない。onza のように作業場がその repo の checkout の時は同じ場所になる）（§7.3） |
| §5 流れ | §7.7 |
| U1 の C1 の `intent` の決まり「repo の aidlc/spaces/default/intents/ の下の名前」 | 「base に `approvals/<intent>/_sequence.json` がある名前」（aun・onza は repo に AI-DLC の記録を持たないので）。無ければ BR2.2 の FAIL |

#### 7.3 対象の repo と承認の記録の置き場（食い違い 1）
- 対象の repo は shirube・aun・onza。各 repo に `approvals/<intent>/<段>/<unit>/attempt-<n>.json`（Inception の段は `<unit>` の代わりに `_intent`）、`approvals/<intent>/_sequence.json`、取り消しの `attempt-<n>.revoked.json` を置く（形は v7 の C2・C9・§3-7 のまま）。
- `approvals/**` は保護面（pin の `protected_paths`）にしない（記録の PR のたびに Owner の exact-head が要ることになるため）。代わりに判定 6 が次を機械で確かめる（§7.5 の R6.1〜R6.5）: 記録の PR は `approvals/**` だけを変える、足すだけ（今ある `attempt-*.json` を変えない・消さない）、形が決まりどおり、R2 以上（判定 3 の独立の監査が要る）。
- **記録の PR を作るのは、その repo の実装の席**（shirube = shirube の席、aun = aun の席、onza = onza の席）。作り方: その repo の pin の `sds_commit` の shirube の checkout から作り手（I1）を、`--workspace <Owner の作業場>`・`--intent <intent>`・`--out <その repo の checkout の root>` で動かす。作り手は v7 §3-5 のとおり作業場を丸ごと写して読み、作業場に何も書かない。
- **記録の PR の独立の監査**（項目集合に必ず入れる）: 形と path と足すだけ（R6.1〜R6.5 と同じ事を目でも見る）に加え、**作り直しの照合**: 監査の席が同じ固定の作り手（同じ `sds_commit`）を同じ作業場で動かし、PR が足した `attempt-*.json` が作り直しと bytes で同じこと、PR の `_sequence.json` の各行が作り直しの行より多くを主張しないこと（PR で `approved` の行は作り直しでも `approved` で `approvalRef` が同じ、PR で `started: true` の行は作り直しでも `started: true` か `approved`）を確かめる。作業場が PR の後に進んでいても（承認が増えても）通り、開き直しで PR の承認が消えていれば通らない。監査の席が作業場を読めない・bun を動かせない時、この項目は「観測できず」で合格にならない（§7.9 の 1）。
- 記録の PR を出す時: Owner が AI-DLC の会話で段 k を承認し、席が段 k+1 を始めた後（段 k+1 の行が `started: true` になる）で、段 k+1 の作業の PR を統合する前。判定 6 は base の記録だけを読む（BR3.1）ので、記録の PR が先に統合されていないと作業の PR は FAIL になる（記録だけの間は止めない）。

#### 7.4 PR と AI-DLC の段の結び付け（食い違い 2）
- `sds-pr/1` の block に `aidlc_record: { "intent": "<intent>", "stage": "<段の slug>", "unit": "<Unit の名>" }` を書く（U1 の C1・BR1.2 のまま。`unit` は Construction の Unit の段で必須）。`schema` は `sds-pr/1` のまま（足すだけ）。
- PR の種類と判定 6 の当て方（§7.5 の R6.0）:
  1. **記録の PR**（変更 path に `approvals/` の下がある）: `aidlc_record` を要らない。R6.1〜R6.5 で見る。
  2. **配布キットだけの PR**（変更 path が全部、base の pin の `files` の鍵か `.shirube/sds-pin.json`）: `NOT_CHECKED`（理由 `kit_only`。キットの版上げは AI-DLC の段の作業ではなく、R4 で Owner の exact-head が付く）。
  3. **ほかの PR**: `aidlc_record` を要る。無ければ FAIL（BR1.1）。あれば v7 §3-4 の橋（BR2・BR3 と v7 の `started` の確かめ）。
- 配布キットの PR の雛形の散文の `aidlc_record` の行を、`sds-pr` の block の例の欄に替える（K、§7.7）。

#### 7.5 判定 6（記録の判定）と、今の門との重なり（食い違い 3）
- 判定 6 は判定 1〜5 の後に動く。段階は base の pin の `record_binding_mode`（無い = `NOT_CHECKED`、`off`、`report-only`、`blocking`。`design_binding_mode` と同じ読み方）。最初は shirube・aun・onza とも `report-only`。`report-only` の FAIL は門の結果を変えない（BR4.1）。門の JSON に `record_binding: { mode, result, reason, intent, stage, unit, findings }` を足す。
- 決まり（R6。判定の芯 `scripts/sds/record-gate.mjs` に置く。時刻・乱数を読まない、S4）:
  - R6.0 種類（§7.4 の 1〜3）。
  - R6.1 変更 path に `approvals/` の下が 1 つでもあれば、変更 path は全部 `approvals/` の下（記録と作業を混ぜない）。違えば FAIL。
  - R6.2 `approvals/` の下の変更は、`attempt-<n>.json` と `attempt-<n>.revoked.json` の追加と、`_sequence.json` の追加か置き換えだけ。`attempt-*.json` の変更・消し・名前の変更は FAIL（BR5.8 を機械にする）。
  - R6.3 足した file の名前が C2・C9 の path の決まりどおりで、JSON として読め、`schema` が `sds-approval-record/1`・`sds-stage-sequence/2`・`sds-approval-revocation/1` のどれかで、path の intent・段・Unit・試行の番号が中身と同じ。違えば FAIL。中身の正しさ（engine の判断どおりか）は独立の監査の作り直しの照合で見る（§7.3）。
  - R6.4 記録の PR の実際の risk（判定 1 の `effective`）は R2 以上。R1 以下なら FAIL（判定 3 の独立の監査を通さずに記録を入れさせない）。
  - R6.5 ほかの PR は v7 §3-4 の橋（BR1〜BR3、`exempt` の飛ばし、`started` の確かめ、取り消しの読み）。
- 今の門との重なり: 判定 4・5・6 は別の事実を見る。同じ事実を 2 回見ない。

| 判定 | 見る事実 | 証拠 |
|---|---|---|
| 4 道筋 | その作業が採択された道筋の node にあるか | 道筋の comment（`delivery_plan.control_source`） |
| 5 設計 | その PR が独立の監査を通った設計の版の置き場の中か（5.9）、その設計が承認済みか（5.3 = Owner の決定、5.3u = 作る単位の設計の記録の独立の設計監査と監査席の Approve） | 設計の file・監査の依頼と返却・Approve |
| 6 記録 | その PR の AI-DLC の段の前の段を **Owner が AI-DLC の会話で承認した**か、その段を今の試行で始めたか | repo の `approvals/` の承認の記録と段の順の記録 |

  5.3u（独立の監査が設計の記録を通したこと）と 6（Owner が AI-DLC の段を承認したこと）は承認した者も証拠も違い、片方で片方を置き換えない。同じ PR に 4・5・6 が全部当たることがある。
- 置き場: 判定の芯 `scripts/sds/record-gate.mjs`（約 150 行）と、`gate.mjs` の読み手（base の `approvals/` を contents の API で読む。約 40 行）。作り手（I1）は v7 §3-6 の `engine-judge.mjs`（300 行の内）と `approval-record.mjs`（約 150 行）。合わせて約 640 行で、own code は約 2,820 行 / 4,000 行（予算は変えない。超えそうな時は作る席が止めて arc に返す）。

#### 7.6 aun・onza で済みの条件をどう満たすか
- onza: U1 の設計の 4 段が承認済みで、Code Generation を作業場で回しているので、U1 の作業の PR（`aidlc_record` = `code-generation`・`u1-skeleton-board`）は、前の行（`infrastructure-design` の U1）が承認済み・自分の行が `started: true` なら判定 6 を通る（済みの条件 (1) の正例）。
- aun: 作る段が AI-DLC の会話で回っていない Unit（u3・u5 …）の作業の PR は、判定 6 で FAIL になる（記録だけの間は止めない）。これは門の誤りではなく「その段を AI-DLC で承認していない」という正しい FAIL で、devauditor の分類（OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001）では「PR の不備」に入る。aun で済みの条件 (1) の正例を出すには、どれかの Unit の作る段を aidlc-aun の会話で回す（Owner の承認が要る）必要がある。どの Unit からそうするかは、進め方の決定なので arc が別に Owner に伺う（§7.9 の 2）。
- 負例（済みの条件 (2)）: 承認の無い段の作業の PR を、aun か onza で 1 本ずつ出して FAIL を確かめて閉じる（S1-SH-01 の負例の PR と同じやり方）。

#### 7.7 作る順と PR（v7 §5 を置き換える）
1. この v8 を shirube に置く PR（R1、docs だけ）の事前の設計監査（devauditor）。合格と受領の後に suite-lead が統合。
2. **I1** 作り手（`engine-judge.mjs`・`approval-record.mjs`、R2）。v7 §6 の残る未決 2 つ（束縛を書かない渡し方の実物の確かめ、写しの大きさと時間）を PR に証拠として載せる。
3. **A** shirube 自身の記録の PR（R2、`approvals/261021-dev-speedup-automation/…`）。§7.3 の作り直しの照合つき。
4. **I2** v7 のまま（kit の自己用の書く先と `budget.mjs`）。
5. **I3** 判定 6（`record-gate.mjs`・`gate.mjs` の読み手・`docs/sds/distribution.md` §4 に判定 6 の文）。門の判定の決まりの文を変えるので、統合の前に Owner の exact-head（[NG] の決定 4）。
6. **K** 配布キットの版上げ: shirube 自身（`sds-gate-self.yml`・pin に `record_binding_mode: report-only`）・aun・onza（pin に `record_binding_mode: report-only`、PR の雛形の `aidlc_record` の欄）。版の固定・workflow を変える PR なので、repo ごとに統合の前に Owner の exact-head（3 回）。
7. aun・onza の記録の PR（R2、各 repo の実装の席）。
8. **I4** 計測（v7 のまま）。
9. 記録だけの期間: devauditor が判定 6 の FAIL を PR ごとに「門の不備／PR の不備」に分ける。[NG] の済みの条件と、OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（#49 6336035707）の目安（記録だけの期間に実際の PR 10 件以上・誤った FAIL 0）がそろったら、arc が repo ごとに止める形にするかを Owner に伺う。
- v7 §5 の 3（Owner の作業場で U1 の Functional Design と NFR Requirements を開き直す）は、aidlc-shirube の記録の追いつきとして実装と並べて行い（[NG] の決定 5）、I1 の前に置かない。
- Owner の手（この §7 の範囲）: I3 の exact-head 1 回、K の exact-head 3 回、§7.9 の 2 の 1 問、止める形の切り替え（後で）。

#### 7.8 試験（v7 §4 に足す）
偽の入力で（CI）:
10. R6.0: 配布キットだけの PR → `NOT_CHECKED`（`kit_only`）。pin の `files` に無い file を 1 つ足した PR → 種類 3 で `aidlc_record` が無いので FAIL。
11. R6.1: `approvals/` の file と `src/` の file を同じ PR で変える → FAIL。
12. R6.2: 今ある `attempt-1.json` を書き換える・消す・名前を変える → FAIL。`attempt-2.json` を足し `_sequence.json` を置き換える → 通る。取り消しの file を足す → 通る。
13. R6.3: path の段と中身の段が違う・`schema` が違う・JSON が壊れている → FAIL。
14. R6.4: 記録の PR を R1 で出す → FAIL。R2 → 通る（判定 3 が監査を求める）。
15. BR2.2 の v8 の読み: base に `approvals/<intent>/_sequence.json` が無い intent を名指す → FAIL（探した path を出す）。
16. 段階: `record_binding_mode` が無い → `NOT_CHECKED`、`report-only` の FAIL → 門は PASS のまま `record_binding.result = FAIL`、`blocking` の FAIL → 門が FAIL。
17. 判定 4・5 と並べて: 同じ PR で判定 5 が PASS・判定 6 が FAIL → 門の JSON に両方が別々に出て、片方が片方を上書きしない。
本物で 1 回ずつ（席の作業場、PR に証拠）:
18. onza の作業場で作り手を動かし、U1 の設計の 4 段が `approved`、Code Generation が `started: true` になる（I1 の PR か onza の記録の PR）。
19. aun の作業場で作り手を動かし、u1 の設計の段の行と、u2 以降の Unit の行が `not_approved`・`started: false` になる（記録の PR に載せる）。

#### 7.9 未決と、伺う事
1. **監査の席が Owner の作業場を読めるか**: §7.3 の作り直しの照合は、監査の席（devauditor、Codex の席）が同じ Mac の `~/Developer/aidlc-owner/<product>` を読み、bun で固定の作り手を動かせることを前提にする。この v8 の事前の設計監査で、監査の席は読めるか・動かせるかを項目の答えに書く。読めない・動かせない時は、arc が照合の担い手を替える案（例: 統合の直前に suite-lead が作り直して照らし、#24 に読み戻す）を書いて v8 を直す（その案は監査の席の独立性を弱めるので、採るなら Owner に伺う）。
2. **aun の作る段を AI-DLC で回す Unit**（§7.6）: aun で済みの条件 (1) の正例を出すには、どれかの Unit の作る段（Functional Design から）を aidlc-aun の会話で回し、Owner が各段を承認する必要がある。どの Unit から、どの形で（arc の設計の記録を AI-DLC の段の成果物として取り込むか、段の中で作り直すか）回すかは進め方の決定なので、arc が Suite の質問ボードで Owner に伺う。答えまで、aun の PR は判定 6 で記録だけの FAIL のまま進む（止まらない）。
3. v7 §6 の 2 つは I1 の PR で確かめる（§7.7 の 2）。

next_action: actor=shirube; what=この v8 の file を shirube に置く PR（R1）を作り、事前の設計監査を頼む（作業指示 = iyasaka-arc#24、写し = shirube#6）; blocking=false
