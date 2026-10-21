<!-- arc:design:DS-SHIRUBE-AIDLC-INCLUDE-V4:20261021 -->
## 設計 v4: AI-DLC の内包 — 設定は deny で守り、reviewer は開始の時に切り、記録は原典どおり commit する（DS-SHIRUBE-AIDLC-INCLUDE-V4）

supersedes: 設計 v3（iyasaka-arc#57 6310367027、本文 SHA-256 `bb0323fca55a19171c73e48f03cb24d7b82e9dbaddaab151b394b041201d2ebf`）の全体。v3 の設計監査 round 3 = BLOCK（shirube#64 6310750260）の BF-05（AI-4: 新しい workflow の開始に `REVIEW_CLASS_CHANGED` を求めた観測の条件が、原典の新規作成の経路と合わない）を直した。BF-06（道筋の deliverable の旧 path）は道筋 g6 訂正 3 で直す。round 4 は OD-SHIRUBE-PR64-ROUND4-20261021-001（#49 6314983198）。v3 からの変更は §1 の 5、§3.6、§9 の P3、§7 の道筋の版、この節の文だけ。設計の記録の file 名はこの版から `docs/design/aidlc-include.md`（版に依らない）。round 1（6309470154）の BF-01〜03 と round 2（6310341648）の BF-01-R2・BF-04 の是正は v3 のまま。
適用 ID: OD-SHIRUBE-INCLUDE-AIDLC-NO-REINVENT-20261021-001（#49 6309035411、`3cbfb54ac5c577439ae61efc90549569eec1ab91bdf055a95352f2afe01663c0`）、OD-SHIRUBE-INIT-AND-INTENT-START-20261021-001（#49 6308731943、`c3b2a2161f6706b26175a67b49fde2d7bcf5b8c89f1213c39fc2fca21fac2554`）、OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001、OD-INCEPTION-ENTRY-AIDLC-FORM-AS-IS-20261021-001、protected-surface R1、subagent-owner-approval、S1〜S9、escalation-policy。原典 = awslabs/aidlc-workflows（MIT-0）。stage file = commit `9b8df02231f0230fd6f19846a0df1fb5567e7ece`、source・docs・試験 = release v2.11.1 = `895a35d86d20336d9b7bc4aedc9440e4a12c83ab`（評価の作業場で動かした版も 2.11.1）。risk = R4（`.claude/settings.json` の hook と permission は席の設定 = 保護面）。

### §0 Owner の言葉と決定の対応（v1 と同じ）
| Owner 原文 | 決定 | 節 |
|---|---|---|
| 「AIDLCを各リポジトリに入れる。shirubeも含めて」 | INCLUDE 2・3 | §2・§6 |
| 「外部依存といっても開発者のサーバーやAPIと連携したり依存はしないんだよね？」 | 根拠 | §3.4 |
| 「shirubeとしてAI-DLCの再発明は必要ない…開発が早く進むようになればいいだけ」 | INCLUDE 1・4 | §1 |
| 「--initという形で明らかな起動を宣言」「入っているだけでは発動しない」 | INIT 1・2 | §6 の 4 |
| 「Bでよいが勝手に始まるのは困る」 | INIT 3 | §5・§8 |
| 「Aで進めましょう。」 | INCLUDE 2（形 A） | 全体 |

### §1 完了条件と観測（着手前に固定）
目的 = 「開発が早く進むようになればいい」。この Unit の完了 = shirube の repo で次の 8 つが観測され、記録が shirube#6 に残ること。
| # | 条件 | 観測（誰が・何を・何が出れば） |
|---|---|---|
| 1 | engine を git に入れない形で原典が動く | 新しい clone で `kit prepare` → `aidlc config --yes` → `aidlc doctor` が成功（出力を記録） |
| 2 | 再生成の後も subagent が止まっている | 1 の後の `.claude/settings.json` で `permissions.deny` に `Agent` がある（`allow` に原典の `Task` が戻っていてもよい）。既存の checkout の refresh（`aidlc config --yes` 2 回目）の後も同じ |
| 3 | 版が揃う | `.aidlc-version` と `aidlc version` が一致し、kit check が OK |
| 4 | 席にもともと入っている hook とぶつからない | user 設定の hook と project の hook の表。同じ event で同じ command が 2 回動く組 = 0、互いの出力を壊す組 = 0 |
| 5 | Intent capture が subagent なしで完了する | Owner が `--init` → `--review none` を付けた intent の開始 → 問い → 要約の確認 → 承認まで。`aidlc-state.md` の `Review Override` が `none`、audit の WORKFLOW_STARTED の event の `Review Override` の欄が `none`、SUBAGENT_* の event が 0 |
| 6 | 問いが日本語で出る | 問いの file（評価 S1-0 では日本語） |
| 7 | kit check が負例を見つける | §9 の負例 4 つがそれぞれ DRIFT、`aidlc` が無い時は UNKNOWN |
| 8 | 記録が門の読める所に残り、機械の名前を含まない | intent の記録が PR で main に入る。audit の shard の名前の host が、この機械の hostname から作る値と違う |
Codex の席での動きは S1 の必須にしない（shirube の実装席は Claude）。aun に広げる時に測る。

### §2 形: git に入れる物・入れない物
| 物 | 置き場 | 理由 |
|---|---|---|
| `.aidlc-version`（`aidlc config --pin <version>` が書く） | git | 全 checkout で同じ版。版の正本はこの 1 file（S3。pin に写さない） |
| `aidlc.settings.json`（effort の preset。原典「Presets never set model IDs」） | git | 原典の既定 |
| `.claude/settings.json` = 原典の生成物 ＋ `permissions.deny: ["Agent"]` | git | §3。refresh は deny を保つ |
| `.gitignore` の AI-DLC の管理 block ＋ Shirube の行（§2b） | git | |
| `aidlc/spaces/default/memory/**`（2.11.1 で 8 file・382 行、評価の作業場で実測） | git（原典の既定） | 学びの環が `project.md` に書く。全席で共有する |
| `aidlc/spaces/default/intents/**` の記録（状態・問いの file・段の出力・audit の shard） | git（原典の既定）。engine の内部 state は原典の block が除外 | 門と人が読む |
| engine・hook・skill・agent・knowledge・scopes・sensors の写し（`.claude/tools` 120 file 213,374 行ほか） | git に入れない。checkout ごとに `aidlc config --yes` が固定した版から再生成 | hygiene の上限（PR +400 行・20 file・100KB、新規 file 300 行）。上流の写しを repo に持たない |
| `aidlc/.aidlc-clone-id`（checkout ごと、原典の block が除外） | git に入れない。kit prepare が最初の `aidlc` の前に書く | §2c |
| `aidlc` の binary と runtime | per-user に 1 回（この Mac は全席が同じ user）。Owner の手 | 外部依存は user に置く |
| `.mcp.json` | 作らない（MCP server = none） | 外のサービスに依存しない |

**deviation_ledger**: 原典 `docs/guide/01-getting-started.md` §3 は `.claude/` 全部を commit とする。採った判断 = engine の写しを git に入れず checkout ごとに再生成。採らなかった代替 = hygiene の除外で全部 commit（Owner が不採択、#49 6309035411 の 2）。`.claude/settings.json` だけは commit する（原典の refresh は既存の settings を保って同梱の項目を足す = `aidlc-init.ts` L5311〜5321、上流試験 t294「a project's own settings.json is kept on first install, with AI-DLC's entries added」L4826〜4842）。

§2b Shirube が `.gitignore` に足す行: `.claude/tools/`・`.claude/hooks/`・`.claude/skills/aidlc/`・`.claude/agents/`・`.claude/knowledge/`・`.claude/aidlc-common/`・`.claude/scopes/`・`.claude/sensors/`・`.claude/rules/`・`.claude/CLAUDE.md`・`.claude/settings.local.json.example`。`.claude/skills/sds-audit/` と `.claude/settings.json` は除外しない。

§2c 機械の名前を出さない: 原典は audit の shard を `audit/<host>-<token>.md` と名づけ、host は `aidlc/.aidlc-clone-id` の 2 行目、無ければ `os.hostname()` から作る（`aidlc-lib.ts` L12075〜12110、`auditShardHostSegment`）。評価の作業場では shard の名前に機械の名前が入った。kit prepare が最初の `aidlc` の前に、この file を `<token>\n<席の名前>\n` で書く（token = `[a-z0-9]{12}`、席の名前は GitHub に既に出ている名前 = owner・shirube など。原典の形式 `^[a-z0-9][a-z0-9-]{0,47}$`）。shirube は public repo なので、記録の中身（問いへの答え）にも秘密・個人情報・機械の名前を書かない（gitleaks は hygiene で走る）。

### §3 権限: allow は触らず、deny で止める
3.1 事実（原典）: refresh は `permissions` の他の key を保ち、`allow` だけを「同梱 ＋ 利用者の追加」の和集合にする（`aidlc-init.ts` L5317〜5321 `staged.permissions = {...permissions, allow: [...shippedAllow, ...userAllow 以外]}`）。同梱の `Task`・`Edit(/**)`・`WebSearch` を外しても再追加される（上流試験 t294 L4642〜4680）。利用者の `deny` は保たれる（t294 L4262〜4287 と L4826〜4842 が `permissions.deny` の不変を期待値に固定）。
3.2 事実（Claude Code）: 規則は deny → ask → allow の順で評価され、最初に当たった物で決まる。どの階層の deny も他の階層の allow で覆せない（https://code.claude.com/docs/en/permissions ）。subagent を起こす道具の正式名は `Agent`（https://code.claude.com/docs/en/tools-reference 。原典の allow の `Task` は今の道具名ではない）。
3.3 よって: kit は `allow` を編集しない（原典のまま）。committed の `.claude/settings.json` に `permissions.deny: ["Agent"]` を書く。refresh の後も deny が残り、allow に何があっても subagent は起きない。committed の file に入っているので、clone の直後の最初の session から効く（確かめる前に session を起動しても止まっている）。kit check と CI の自己検査（§4）は、この deny が消えていないかを見る。
3.4 `Edit(/**)`: 先頭の `/` は settings の置き場（project）からの相対で、project の外には広がらない（permissions の文書「`/path` Path relative to the settings source」）。原典のまま。`WebSearch` = Q1（§8）。
3.5 外部依存の中身（v1 §3.4 と同じ。source で確認）: engine は外の API とつながらない。利用の計測は `AIDLC_METRICS_ENDPOINT` を設定した時だけ送り、送り先は同梱されない。通信は install / update の GitHub release の取得だけ（署名の検証あり）。Bedrock は使わない。MCP server は none。
3.6 reviewer = none。原典の Intent capture は `review_class: advisory`（stage file の frontmatter）で、feature の scope には review の上限が無いので、既定では reviewer の subagent を起こす（deny `Agent` とぶつかる）。原典の操作 = workflow を始める時に `--review none` を付ける（`docs/guide/12-cli-commands.md`「`/aidlc --review <class>`」: 「`--review none` skips gated stage reviewer dispatch」「It can be supplied when a workflow is created or alongside `--scope`」。新しく始める時は、`aidlc-state.md` の `Review Override` と、audit の最初の event WORKFLOW_STARTED の `Review Override` の欄に `none` が書かれる（`core/tools/aidlc-utility.ts` L8325〜8341 の WORKFLOW_STARTED（L8339 の `Review Override` の欄）、L8714 の state の欄、上流試験 t266「intent-create and scope-change persist and audit --review」L369〜400 の intent-create 側）。`REVIEW_CLASS_CHANGED` は、動いている workflow の設定を途中で変えた時（scope の変更や `/aidlc --review none` の打ち直し）だけに出る（同じ試験の scope-change 側）。文書の 1 文だけから event の名前を決めない）。deny `Agent` を外して回避しない。独立監査は別の席（devauditor）のまま。

### §4 配布キットの変更（kit。GATE4-C とは別 Unit）
- 新しい file `scripts/sds/kit-aidlc.mjs`（own-code の枠 AIDLC-INCLUDE 150 = 席側の hook 150 の付け替え。file 300 行・関数 50 行・複雑さ 10）。`kit.mjs`（176 行）は subcommand の配線だけ足す。
- `prepare --target <checkout> --seat <name>`: `aidlc/.aidlc-clone-id` が無ければ §2c の形で書く。有って host が席の名前と違えば書き換えず報告（既存の shard を壊さない）。
- `apply --aidlc`: committed の `.claude/settings.json` の `permissions.deny` に `Agent` が無ければ足す（allow・hooks・他の key は触らない）。`.gitignore` に §2b の行を足す。
- `check`（既存の check に足す）: 次はそれぞれ DRIFT（理由を JSON に）: `deny` に `Agent` が無い／`.mcp.json` がある／`.aidlc-version` が無い、または `aidlc version` の出力と違う／audit の shard の名前の host が、この機械の hostname から原典の規則で作る値と同じ。`aidlc` が無くて版を観測できない時は UNKNOWN（OK にしない、S8）。版は宣言と手元の実測を比べる（S5）。時刻・乱数は check に入れない（S4。乱数は prepare の token だけ）。
- v1 の「pin に欄 `aidlc: {version, settings_sha256}`」はやめる（版の正本は `.aidlc-version`、settings は refresh のたびに allow が並び直るので digest は誤った DRIFT になる）。`.shirube/sds-pin.json` は変えない。
- `upgrade`: `aidlc config --pin <new>` と refresh。settings が変わるので R4（Owner の exact-head）。kit の版上げの standing（#49 6308341298 の 1）には入れない。

### §5 門が AI-DLC の記録を読む橋（別 Unit DP-N-SH-GATE-RECORDS-BRIDGE、R3。境界だけ）
PR の sds-pr/1 block に `aidlc_record: {intent, stage}`。門は PR の head の `aidlc/spaces/default/intents/<intent>/aidlc-state.md` と audit の shard の承認の event（`GATE_APPROVED` など）を形で見る。無い・読めない・壊れている = FAIL（report-only から）。機械が見るのは形と在りかまで（本人の承認かは OD-CF-AUTH-01-A-20261005-001）。設計は別の記録で D1〜D6。

### §6 順・責任・PR ごとの大きさ（BF-02）
各 PR の上限 = +400 行・20 file（`tests/fixtures/**` と profile の exclude_generated を除く）。見込みは実測した値から。
| 番 | 内容 | 担当 | risk | 見込み | 超えた時の分け方 |
|---|---|---|---|---|---|
| 0 | この設計の記録と項目集合の docs PR → 設計監査 | shirube → devauditor → suite-lead | R1 | 約 260 行・2 file | — |
| 1 | kit の変更: `kit-aidlc.mjs`（新、約 120）・`kit.mjs`（+約 20）・`tests/sds-kit-aidlc.test.mjs`（新、約 160。正例 2・負例 4・UNKNOWN 1）・`docs/sds/distribution.md`（+約 25） | shirube → devauditor → suite-lead | R2 | 約 325 行・4 file | 1a = prepare・apply と試験、1b = check と試験と docs（1b は 1a の後） |
| 2 | Owner が `aidlc` を per-user に入れる（版 = 2.11.1 か、その時の最新の release を Owner が選ぶ） | Owner | 外部依存 | — | — |
| 3 | shirube への self-apply: `.aidlc-version`（1）・`aidlc.settings.json`（約 10）・`.claude/settings.json`（約 235）・`.gitignore`（+約 40）・`.shirube/hygiene-profile.md`（+約 3: audit の shard を exclude_generated に）・`tests/self-aidlc-settings.test.mjs`（新、約 25: committed の settings に deny `Agent`、`.mcp.json` が無い） | shirube → devauditor → Owner の exact-head → suite-lead | R4 | 約 315 行・6 file | 3a = settings・version・preset・gitignore、3b = profile と自己検査（どちらも R4。exact-head が 2 回になるので、超えない限り 1 本） |
| 4 | memory の PR: `aidlc/spaces/default/memory/**` | shirube → devauditor → suite-lead | R1 | 8 file・382 行（2.11.1 の実測） | phases/ を別の PR に |
| 5 | Owner の手: 自分の clone で `kit prepare --seat owner` → `aidlc config --yes` → `kit check` が OK → `claude` → `/aidlc --init`（READY で止まる）→ `/aidlc --scope feature --review none <Shirube への依頼>`（開始と reviewer の上限を 1 行で。§3.6）→ `aidlc-state.md` の `Review Override` が `none` かを見る（違えば `/aidlc --review none` を打ち直してから進む）→ 問いに答える → 要約の確認 → 承認 | Owner | 製品の仕事 | — | — |
| 6 | intent の記録の PR: 状態（約 110）・intents.json（約 10）・project-description（1）・問いの file（約 80）・memory.md（約 15）・intent-statement と stakeholder-map（見込み 100〜200）。audit の shard（評価では途中までで 435 行）は 3 の profile で exclude_generated | shirube の席が Owner の clone から写す（同じ OS user、読むだけ）→ devauditor → suite-lead | R1 | 約 320〜420 行・7 file | 6a = 問いの file・memory.md・状態、6b = 段の出力（6b は 6a の後） |
| 7 | 検証の記録（§1 の 8 条件）を shirube#6 に | shirube ＋ arc | 記録 | — | — |
3 と 6 の作業は、席の session の cwd（`~/Developer/claude-shirube`）ではなく repo の別の clone で行う。席の作業場は repo の checkout ではないので、3 の統合で席自身の session に AI-DLC の hook は入らない。hook が効くのは shirube の checkout で起動した session（5 の Owner の session）だけ。
Owner の手 = 2（install 1 回）・3 の exact-head 1 回・5（製品の仕事）。S1-SH-07 の数に入るのは 3 の exact-head だけ。

### §7 道筋
DP-SHIRUBE-001 g6 の DRAFT（訂正 3。成果物の path を版に依らない `docs/design/aidlc-include.md` に、設計の参照を「作業指示が名指す版」にした）: node DP-N-SH-AIDLC-INCLUDE（§6 の 0〜7、S1-SH-03・S1-SH-06、依存 = GATE4-A-BINDING）と DP-N-SH-GATE-RECORDS-BRIDGE（S1-SH-02・S1-SH-03、依存 = AIDLC-INCLUDE・GATE4-B-ADMISSION）。SELF-GATE の pin は BRIDGE を含む main。Suite の DP-N-SHIRUBE-SEAT-HOOK は Suite g8 で退役。新しい判断を含むので PL-1〜5 の独立監査の PASS の後に ADMITTED。

### §8 risk と未決
- risk: `.claude/settings.json`・`.shirube/hygiene-profile.md` = R4。kit = R2。橋 = R3。
- Q1 `WebSearch` の許可: A = 原典のまま（勧め。読むだけの検索）／B = `ask` の規則を足して毎回聞く。3 の exact-head の時に settings の中身と一緒に Owner が決める。
- Q2 subagent を使う 4 段（User stories = mob、Reverse engineering = pipeline、Practices discovery・Code generation = subagent）と reviewer: deny `Agent` のまま着くと engine が止まる。着いた時に Owner に伺う（その段だけ deny を外すか、段を飛ばすか）。
- Q3 Owner が回す clone: 既定 = Owner 自身の clone（席の作業場は使わない）。
- Q4 記録の PR: 既定 = shirube の席が Owner の clone から写して出す（Owner は git を触らない）。

### §9 検証計画（負例を先に。fresh clone と既存の checkout の refresh を通す）
| 例 | 入力 | 期待 |
|---|---|---|
| P1 | 新しい clone（committed の settings に deny `Agent`）→ prepare → `aidlc config --yes` | deny に `Agent` が残る、allow に `Task` が戻る、check OK、shard の host = 席の名前 |
| P2 | 既存の checkout で `aidlc config --yes` をもう一度 | deny に `Agent` が残る、check OK |
| N1 | settings から deny の `Agent` を消す | check DRIFT、CI の自己検査が FAIL |
| N2 | `.mcp.json` がある | check DRIFT |
| N3 | `.aidlc-version` と `aidlc version` が違う | check DRIFT。`aidlc` が無い = UNKNOWN |
| N4 | prepare を飛ばして `aidlc` を動かし、shard の名前に hostname が入る | check DRIFT |
| P3 | 5 の開始の 1 行（`--review none`）の直後 | `aidlc-state.md` の `Review Override` = `none`、audit の WORKFLOW_STARTED の `Review Override` の欄 = `none`（新規作成の経路。`REVIEW_CLASS_CHANGED` は求めない。途中で打ち直した時だけ `REVIEW_CLASS_CHANGED` が足される）、Intent capture の段の指示に reviewer の dispatch が無い。承認までに SUBAGENT_* の event = 0。`--review none` を付け忘れた時は reviewer の dispatch が deny `Agent` で拒まれて止まる（その時は打ち直す。deny は外さない） |
P1・P2 は 1 の試験では原典の動きを模擬し（P3 は 5 の Owner の session で観測する）（`aidlc` の binary は CI に入れない）、実物は 5 の前に Owner の clone で 1 回確かめて記録する。根拠の行番号は release v2.11.1 の file のもの。

next_action: actor=shirube; what=作業指示 v4 で #64 の file を docs/design/aidlc-include.md（この版）に差し替え、索引の PR iyasaka-org #54 の統合の後に round 4 を依頼する; blocking=false
