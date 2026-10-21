<!-- arc:design:DS-SHIRUBE-AIDLC-INCLUDE-V1:20261021 -->
## 設計 v1: AI-DLC の内包 — Shirube の配布キットが AI-DLC の版と設定を運び、engine は席ごとの checkout で再生成する（DS-SHIRUBE-AIDLC-INCLUDE-V1）

適用 ID: OD-SHIRUBE-INCLUDE-AIDLC-NO-REINVENT-20261021-001（#49 6309035411、本文 SHA-256 `3cbfb54ac5c577439ae61efc90549569eec1ab91bdf055a95352f2afe01663c0`）、OD-SHIRUBE-INIT-AND-INTENT-START-20261021-001（#49 6308731943、`c3b2a2161f6706b26175a67b49fde2d7bcf5b8c89f1213c39fc2fca21fac2554`）、OD-SHIRUBE-SPEC-FREEZE-AIDLC-TRACE-20261021-001、OI-SHIRUBE-GATES-SCRIPTS-AND-KICKOFF-PROMPTS-20261021-001、OD-SHIRUBE-AIDLC-BORROW-FORM-ONLY-20261020-001（2 点を置換済み）、protected-surface R1（席の設定 = Owner の決定）、S1〜S9、escalation-policy。原典 = awslabs/aidlc-workflows（MIT-0）。設計の読み取りは commit 9b8df02231f0230fd6f19846a0df1fb5567e7ece（stage file）と release v2.11.1 = 895a35d86d20336d9b7bc4aedc9440e4a12c83ab（source・docs）。risk = R4（`.claude/settings.json` の hook は席の設定 = 保護面）。事前監査 = D1〜D6 + 道筋 g6 の PL-1〜5（項目集合 `aidlc-include-design-audit-items.json`）。

### §0 Owner の言葉と決定の対応
| Owner 原文 | 決定 | この設計の節 |
|---|---|---|
| 「AIDLCを各リポジトリに入れる。shirubeも含めて」 | 決定 2・3（内包、shirube から） | §2・§6 |
| 「外部依存といっても開発者のサーバーやAPIと連携したり依存はしないんだよね？」 | 根拠（外の API 無し） | §3.4 |
| 「shirubeとしてAI-DLCの再発明は必要ない…開発が早く進むようになればいいだけ」 | 決定 1・4 | §1 の完了条件 |
| 「--initという形で明らかな起動を宣言」「入っているだけでは発動しない」 | OD-INIT 1・2 | §6 の 3 |
| 「Bでよいが勝手に始まるのは困る」 | OD-INIT 3 | §5（橋）・§8 Q2 |
| 「Aで進めましょう。」 | 決定 2（形 A） | 全体 |

### §1 目的と完了条件（着手前に固定）
目的（Owner の言葉）= 「開発が早く進むようになればいい」「自社仕様をどんどん効率化して高速開発する」。この Unit の完了 = shirube の repo で次の 7 つが観測され、記録が shirube#6 に残ること。
| # | 条件 | 観測の手段（誰が・何を・何が出れば） |
|---|---|---|
| 1 | engine を git に入れない形で原典が動く | 新しい clone で `aidlc config --yes` → `aidlc doctor` が成功（出力を記録）。clone 直後の doctor が「run aidlc config」と言うのは想定どおりで失敗ではない |
| 2 | 版が揃う | `cat .aidlc-version` と `aidlc version` が一致。kit check が一致を PASS と報告 |
| 3 | 席にもともと入っている hook とぶつからない | 席の user 設定の hook 一覧と project の `.claude/settings.json` の hook 一覧を並べた表。同じ event で同じ command が 2 回動く組 = 0、互いの出力を壊す組 = 0 |
| 4 | Intent capture が subagent なしで完了する | reviewer = none の設定で、Owner が `--init` → intent の開始 → 問いの file に答え → 要約の確認 → 承認まで、Task の起動 0 回（audit の記録で確認） |
| 5 | 問いが日本語で出る | 問いの file を記録（評価 S1-0 では日本語で出た） |
| 6 | kit check が不一致を見つける | §9 の負例 3 つがそれぞれ DRIFT |
| 7 | 記録が門の読める所に残る | intent の記録 `aidlc/spaces/default/intents/<record>/` が PR で main に入り、`aidlc-state.md` と問いの file と承認の記録がある |
Codex の席での動き（harness/codex）は S1 の必須に入れない（shirube の実装席は Claude）。aun に広げる時に測る。

### §2 形: 何を git に入れ、何を入れないか
| 物 | 置き場 | 理由 |
|---|---|---|
| `.aidlc-version`（`aidlc config --pin <version>` が書く版の固定） | git | 全席・全 checkout で同じ版（S3） |
| `aidlc.settings.json`（effort の preset。原典「Presets never set model IDs」なので model 名を含まない） | git | 原典の既定の置き場 |
| `.gitignore` の AI-DLC の管理 block（27 行）＋ Shirube が足す行（§2b） | git | |
| `.claude/settings.json`（hook 19 本・permissions・env・welcome） | git。§3 の編集を加えた形 | 全席で同じ hook。保護面 |
| `aidlc/spaces/default/memory/**`（team・project の rule、8 file 382 行） | 編集するまでは再生成。編集したら git | 原典の既定 = commit。未編集なら再生成と同じ bytes |
| `aidlc/spaces/default/intents/**`（intent の記録・状態・問いの file・承認・audit） | git（engine の内部 state は原典の block が除外） | 門と人が読む記録 |
| engine・hook・skill・agent・knowledge・scopes・sensors の写し（`.claude/tools` 120 file 213,374 行ほか、計 330 file） | **git に入れない**。席ごとの checkout で `aidlc config --yes` が固定した版から再生成 | hygiene の上限（PR +400 行・20 file・100KB、新規 file 300 行）。上流の写しを repo に持たない（S2） |
| `aidlc` の binary と harness runtime | per-user に 1 回（原典の native channel。この Mac は全席が同じ user なので 1 回）。版は `.aidlc-version` と一致させる | 外部依存の置き場は user。repo に入れない |
| `.mcp.json` | 作らない（初期設定で MCP server = none） | 外のサービスに依存しない（Owner 原文） |

**deviation_ledger**: 原典の `01-getting-started.md` §3 は `.claude/` 全部を「Commit it? Yes」とする。採った判断 = 写しを git に入れず checkout ごとに再生成（上の理由）。採らなかった代替 = hygiene の除外で全部 commit する（Owner が B として不採択、#49 6309035411 の 2）。原典の refresh は「keeps what you edited」、doctor は「a missing block or file says to run `aidlc config`」なので、再生成の形は原典の挙動の範囲内。

§2b Shirube が `.gitignore` に足す行: `.claude/tools/`・`.claude/hooks/`・`.claude/skills/aidlc/`・`.claude/agents/`・`.claude/knowledge/`・`.claude/aidlc-common/`・`.claude/scopes/`・`.claude/sensors/`・`.claude/rules/`・`.claude/CLAUDE.md`・`.claude/settings.local.json.example`。`.claude/skills/sds-audit/`（Shirube の kit の file）は除外しない。

### §3 `.claude/settings.json` の扱い
3.1 原典が書く `permissions.allow` 45 件のうち 42 件は `Bash(aidlc …)`（engine の命令の自動許可）。残り 3 件 `Task`・`Edit(/**)`・`WebSearch` が席の権限を広げる。
3.2 **`Task` を外す**（決定 2）。実現の案: (a) kit が file を編集して `Task` を外して書く（原典の doctor は hand-modified を conflict と分類するが検査は fail しない。refresh は編集を保つ）／(b) file は原典のまま、各席の user 設定の deny で止める（席の設定 = CTO の領分、kit では運べない）。**勧め = (a)**。§1 の条件 1 の doctor の出力に conflict の表示が出るかを記録し、出るなら表示の意味だけ docs に書く。
3.3 `Edit(/**)` = Q1（§8）。既定 = 外す（席の今の permission の形を変えない）。`WebSearch` も同じ扱い。
3.4 外部依存の中身（Owner 原文への答え、source で確認）: engine は外の API とつながらない。利用の計測（`aidlc-metrics.ts`）は `AIDLC_METRICS_ENDPOINT` を設定した時だけ送り、送り先は同梱されない。通信は install / update の GitHub release の取得だけ（署名の検証あり）。`env.AWS_AIDLC_DEFAULT_SCOPE` は scope の既定値で資格情報ではない。Bedrock は使わない（今の provider のまま）。MCP server は none。
3.5 reviewer = none を既定（`aidlc config flags` か intent の開始時の `--review none`）。独立監査は今までどおり別の席（devauditor）で、原典の reviewer と二重にしない。

### §4 配布キットの変更（kit.mjs。GATE4-C とは別 Unit）
- `apply --aidlc <version>`: §2 の git に入れる file を書く（`.aidlc-version`、`aidlc.settings.json`、`.gitignore` の行、編集済み `.claude/settings.json`）。pin `.shirube/sds-pin.json` に欄 `aidlc: {version, settings_sha256}` を足す（S6: 欄の追加だけ、既存の欄は不変。欄が無い pin は今までどおり）。
- `check`: `.aidlc-version` と手元の `aidlc version` の出力の不一致、`.claude/settings.json` に `Task` の許可がある、`.mcp.json` がある、pin の `settings_sha256` と file の不一致 → それぞれ DRIFT（理由を JSON に。S5: 宣言値ではなく手元の実測を比べる。S8: 読めない時は UNKNOWN で PASS にしない）。
- `upgrade`: 版の付け替え。AI-DLC の版上げが `.claude/settings.json` を変える時は保護面なので Owner の exact-head（kit の版上げ PR の standing = #49 6308341298 の 1 の範囲に入れない）。
- own-code の枠: 「席側の hook 150」→「AIDLC-INCLUDE 150」に付け替え（ARC の裁定、合計 2,300 は不変。#57 6307963936 の表の 4 行目を置換）。
- shirube 自身への適用は kit の self-apply（S1-SH-06）。

### §5 門が AI-DLC の記録を読む橋（別 Unit DP-N-SH-GATE-RECORDS-BRIDGE、R3。ここでは境界だけ）
PR の sds-pr/1 block に `aidlc_record: {intent: <record dir 名>, stage: <stage slug>}`。門は PR の head で `aidlc/spaces/default/intents/<intent>/aidlc-state.md` を読み、名指した stage が完了印で、audit の記録に承認（`GATE_APPROVED`）があることを**形で**見る。無い・読めない・壊れている = FAIL（report-only から）。記録は作者の branch の中にあるので、機械が確かめるのは形と在りかまで（本人の承認かは OD-CF-AUTH-01-A-20261005-001 の画面）。設計は別の記録で D1〜D6。この設計には橋の実装を含めない。

### §6 順と手順（shirube で 1 周）
0. この設計の事前監査（docs PR: `docs/design/aidlc-include-v1.md` + 項目集合）→ 受領。道筋 g6 の PL 監査を同じ依頼に含める。
1. kit.mjs の変更 PR（R2、枠 AIDLC-INCLUDE、試験は負例 3 つを含む）→ 監査 → 統合。
2. shirube への self-apply PR（`.aidlc-version`・`aidlc.settings.json`・`.gitignore`・`.claude/settings.json`。R4 = Owner の exact-head。+400 行以内: settings 230 行 + gitignore 約 40 行 + 2 file）→ 監査 → exact-head → 統合。
3. Owner の手: `aidlc` の per-user install（1 回、版 = `.aidlc-version`）→ 自分の checkout で `aidlc config --yes`（MCP none・Bedrock no・preset balanced・reviewer none）→ `/aidlc --init`（READY で止まる）→ `/aidlc feature <Shirube への依頼>` で Intent capture（問い → 要約の確認 → 承認）。記録を PR で main に（R1 docs）。
4. §1 の 7 条件の検証の記録を shirube#6 に。広げる順（aun → onza・agent-memory・kodama）と時期は Owner。
Owner の手 = exact-head 1 回（2）+ 製品の仕事としての 3。S1-SH-07（1 周 6 回）は Shirube の制御の環の手の数で、3 の Intent capture は数えない（Owner が自分で選んだ製品の仕事）。

### §7 道筋
DP-SHIRUBE-001 g6 = node **DP-N-SH-AIDLC-INCLUDE**（§6 の 0〜4、changes_predicates = S1-SH-03・S1-SH-06、依存 = DP-N-SH-GATE4-A-BINDING）と **DP-N-SH-GATE-RECORDS-BRIDGE**（S1-SH-02・S1-SH-03、依存 = AIDLC-INCLUDE・GATE4-B-ADMISSION）。SELF-GATE の pin は BRIDGE を含む main に。Suite の DP-N-SHIRUBE-SEAT-HOOK は Suite g8 で退役（この決定を integration_evidence に）。新しい判断を含む改版なので PL-1〜5 の独立監査を通してから ADMITTED。

### §8 risk と未決
- risk: `.claude/settings.json` = 席の設定 → R4。kit.mjs = R2。橋 = R3。
- Q1 `Edit(/**)`・`WebSearch` の許可: A = 外す（既定）／B = 原典のまま。
- Q2 subagent を使う 4 段（User stories・Reverse engineering・Practices discovery・Code generation）と reviewer: 既定 = そこに着いた時に Owner に伺う。Intent capture・Requirements は不要。
- Q3 Owner が回す checkout: 既定 = Owner 自身の clone（席の作業場は使わない）。
- 上流の版上げ: shirube の repo で確かめてから kit upgrade。settings を変える版上げは exact-head（§4）。

### §9 検証計画（負例を先に）
kit check の負例 3 つ（版の不一致／`Task` の許可あり／`.mcp.json` あり → DRIFT）と正例 1 つ（一致 → PASS）を試験に。新しい clone の doctor の記録。hook の衝突の表（§1 の 3）。Intent capture の audit で Task の起動 0 回。問いの file の言語。時刻・乱数は kit の check に入れない（S4）。

next_action: actor=shirube; what=作業指示 CH-SHIRUBE-AIDLC-INCLUDE-20261021 の 0 番（この設計の記録と項目集合の docs PR → devauditor の監査）; blocking=false
