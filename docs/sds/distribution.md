# SDS-V2 の配布 — 旧 Shirube（V3/V4.1）部品の撤去範囲と、配布キット v0 の要求

状態: **段階 1（残す・撤去する範囲）の確定案。ARC の確定（iyasaka-arc#57 6049863576）を取り込み済み。独立監査と Owner の head 単位の承認の前。** キットの実装・各 repo への適用・必須検査の設定変更はまだ行っていない。作者 codex-adf、2026-10-08。

## 0. 根拠

| 入力 | 参照 |
|---|---|
| Owner 判断（配布の層を先に作る、範囲は ARC と codex-adf、キットは codex-adf） | https://github.com/watchout/iyasaka-arc/issues/52#issuecomment-6049770830 |
| 作業指示（段階 1〜3） | https://github.com/watchout/shirube/issues/6#issuecomment-6049775092 |
| ARC の確定（範囲・必須検査の 3 判定・配布先管理・Owner 承認の扱い） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049863576 |
| ARC の推奨（確定の前の比較材料） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049838786 |
| codex-adf の案（観測と 5 項目） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049793570 |
| 規格 | SDS-V2 shirube@`d34b31e98df522c463d5cafb7c17e0beece33fb2`（`docs/sds/README.md`、`docs/process/ai-dlc.md`、`docs/sds/audit-method.md`） |

観測した旧部品（読取りのみ）: kodama main `40afc723`、agent-memory main `9bd874ce`（ARC）/ `c199e31`（codex-adf の clone 時点）。両者の内訳は ARC の推奨 §0 の表のとおり。

本書は ARC の確定（6049863576）を取り込んだもの。確定と推奨・codex-adf の案の違いは §6 に記録する。

## 1. 原則

- SDS-V2 の 3 つの形（PR の記載、監査方法と機械受付 checker、hygiene）で同じ証拠が取れるものは、旧部品を撤去する。取れないものだけを必須検査 1 本へ移す。
- 必須検査は、人が読めない**構造の事実**（risk の label・変更 path・今の head での受領の有無）だけを見る。意味の判断は独立監査（LC-01〜07、設計 D1〜D6 など）に残す。
- 案件ごとの状態ファイルを repo に置かない。工程の現在地は Issue と PR に書く。
- 過去の記録は消さず、履歴として残す。

## 2. 残す・撤去する範囲（kodama・agent-memory・onza。aun は旧部品なし）

| 部品 | 処置 | 代わり |
|---|---|---|
| `.shirube/runtime/rapid-lite/**`、`.github/workflows/shirube-rapid-lite-gates-report.yml` | 撤去 | §4 の必須検査 1 本、監査方法、hygiene |
| `.shirube/runtime/merge-authority/**`、`.github/workflows/merge-authority.yml` | 撤去 | §4 の必須検査 1 本と、統合担当による確認（§7） |
| V3 の状態ファイル（execution-context、lifecycle-state、control-state-completeness、enforcement-policy、route-policy、repo-spec、profile.json の `shirube_v3` 節、framework-lock、adoption-intake、existing-state-scan、v3-normalization、open-pr-inventory、pr-body-refs、`profiles/`） | 撤去 | Issue と PR の記録。項目集合は Shirube の固定版を引用 |
| `.framework/**` と、それを呼ぶ hooks（pre-code-gate、framework-runner、framework-mode-check、gate-*、skill-tracker） | 撤去 | ai-dlc §1 の開始記録と §6 の試験先行。hook では止めない |
| 上の hooks の**呼出し元**: `.claude/settings.json` の hook 登録、`.framework` や旧 3 ゲート・Pre-Code Gate を読む skill（kodama の `implement` の該当手順、`gate-design`・`gate-quality`・`gate-release`）、`framework-runner.sh` を呼ぶ `post-task.sh` | 撤去した部品を呼ぶ箇所を、同じ導入 PR で削除または置換する。skill は、旧ゲートを読む手順だけを SDS-V2 の手順（ai-dlc と監査依頼）への参照に置き換えるか、skill ごと削除するかを、その repo の担当が決める。旧工程と無関係な処理は残す | 導入 PR の条件（§2.1） |
| CLAUDE.md・AGENTS.md の `shirube-v3-runtime` managed block、kodama CLAUDE.md の Pre-Code Gate 節 | 置換 | §3 の指示の共通ブロック。ローカルの絶対パスを使わない |
| `.shirube/control-handoffs`、`cells`、`evidence`、`review-plans`、`audit-checklists`、`source-mirrors`（あるもの） | 残す（履歴）。**どの検査も読まない**。新規には作らない | 新しい引渡しは Issue のコメント＋本文 SHA-256 |
| agent-memory の `.shirube/cells/kusabi-sds-u1*` | PR332・PR333 の統合まで残し、その後は履歴 | 同上 |
| `.shirube/` ディレクトリ | 残す。中身は `hygiene-profile.md`（使う repo だけ）と版の固定ファイル（§3）と履歴 | — |
| 現行製品の action inventory とリスク分類（kodama の `.shirube/action-surfaces.json`、`.shirube/action-risk-classifications.json`）と、それを読む製品の試験（`tests/governed-action-profiles.test.ts`） | **撤去しない**。V3 の状態ではなく、製品の MCP ツール登録・権限・秘密・監査・復旧の受入と試験の入力。所有は製品の担当（kodama 席）。置き場を `.shirube/` の外へ移すかは、その repo の製品 PR で決める（キットでは動かさない） | 製品の受入のまま。試験も残す |
| V3 と無関係のもの（`ssot-audit.yml`、`channel-routing.sh` など） | 対象外。その repo の担当が判断する | — |

旧検査が見ていた中身の移し先（ARC の確定 §2）:
- design-rules（LLM を最終判断にしない、保護面での停止）→ 作る人／確かめる人の分離と R3/R4 の Owner 承認。重複コードは hygiene、設定値・定数・hard delete は実装監査の項目で見る。
- 状態系（execution-context、adoption、gate-contract、lifecycle、control-state）→ Issue と PR の公開記録。ファイルは持たない。
- flow-safety、review-plan、audit-checklist → 監査依頼（`sds-audit-request/1`）と項目集合。
- merge-authority → §4 の必須検査 1 本と、統合担当による確認（§7）。
- gate-contract が機械で拒否していたもの（宣言 head の不一致 RL-PR-004、許可外・禁止 path RL-PR-002/003、引渡しの digest）→ §4.1 の適用差分のとおり。判定 2 が引き継ぐのは、変更 path の集合が実際の diff と一致することだけ。
- technical_owner_review は必須にしない。

### 2.1 導入 PR の条件（各 repo）

- 撤去した部品（`.shirube/runtime`、`.framework`、撤去した hooks・workflow）への参照が、稼働する入口（`.claude/settings.json`、`.claude/skills/**`、`.claude/hooks/**`、`.github/workflows/**`、CLAUDE.md、AGENTS.md）に残っていないことを、導入 PR の中で検索して示す。キットの `check` は、この参照の有無も一覧にする（PR38 で実装）。
- `.shirube/` に残すファイルのうち、製品の試験やコードが読むもの（kodama の action inventory など）は、撤去せずに一覧にして所有者を書く。
- 旧ランタイム専用の試験は、ランタイムと一緒に廃止する。製品の安全条件を確かめる試験は残し、導入 PR の CI で通ることを示す。

## 3. 配布キット v0 の部品（段階 2 の要求）

| 部品 | 要求 |
|---|---|
| 指示の共通ブロック | CLAUDE.md と AGENTS.md に入れる短い段落。印で囲み、repo 固有の記述と分けて置換できる。内容は SDS-V2 の固定 commit、PR の記載、監査方法、R0〜R4 と承認の参照（§7）。ローカルの絶対パスを持たない |
| PR の記載（機械で読める部分） | 今の `templates/PULL_REQUEST_TEMPLATE.md` は文章の箇条書きで、機械では解析できない。§4 のために、risk_class・changed_paths・監査依頼と返却の参照を持つ機械向けブロックを 1 個加える。検査は Node の組込み機能だけで動かすため、形式は JSON とする（YAML の解析器を持ち込まない） |
| risk label | `risk:R0`〜`risk:R4` の label を、各 repo に用意する |
| 必須検査 1 本 `sds-gate` | §4 |
| skill | 監査依頼（`sds-audit-request/1`）の JSON の生成と前検査、統合前の確認手順 |
| 版の固定ファイル | 各 repo の `.shirube/sds-pin.json`。`sds_commit`、`kit_version`、配った各ファイルの SHA-256、保護面の path の一覧、採択の記録（Owner decision の URL＋本文 SHA-256）、採択日時。置き場は `.shirube/` の 1 か所にまとめる（ARC の確定では例として `.sds/lock.json` も挙がったが、置き場の選択は codex-adf に任されている） |
| CLI | `apply`（固定ファイルと部品を入れる PR を作る）、`upgrade`（版を上げる PR を作る）、`check`（固定ファイルと実ファイルの一致を見る）。どれも各 repo へ直接 push しない |
| 配布先の一覧と `status` | §5 |

配るものはこれだけにする。案件ごとの状態ファイル、席ごとの設定、常駐する実行部品は配らない。

## 4. 必須検査 1 本 `sds-gate`

読取り専用。最初は report-only で入れ、required にするのは Owner が各 repo で行う。判定は次の 3 つだけで、増やさない（ARC の確定 §3）。

| 判定 | 見ること |
|---|---|
| 1 risk_class | PR の label `risk:R0`〜`risk:R4` を正とする。label がない、複数ある、または PR の機械向けブロックの `risk_class` と違えば FAIL。保護面の path（固定ファイルの一覧）に触れていれば、label に関わらず R4 として扱う |
| 2 変更 path | 実際の diff のファイル一覧が、ブロックの `changed_paths` と一致する。違えば FAIL |
| 3 監査の受領 | R2 以上: その PR の監査依頼と返却について、固定した checker（`scripts/hygiene/audit-admission.mjs`）の `--review` が、今の head で RECEIPT_ACCEPTED になる。R0・R1 は監査不要 |

見ないもの: 設計規則の意味、lifecycle、引渡しの digest、許可・禁止の範囲、Owner の承認（§7）、固定ファイルとのずれ（§5 の `status` で見る）。機械から外したものの扱いは §4.1。

実装上の要求:
- checker と判定の本体は、PR の head からではなく、固定した Shirube の commit から取得する。PR が検査を書き換えて自分を通す経路を作らない。
- 保護面の path の一覧は、PR ではなく base ブランチの固定ファイルから読む。
- 監査の返却はコメントで届くため、`pull_request_target` に加えて `issue_comment` でも動かし、結果は head SHA への commit status として付ける。head が変わると古い受領は使えない（判定 3 が今の head を要求するため）。
- 差し替えの経路を 2 つの手段で止める（ARC の判断 1、iyasaka-arc#57 6051365638、PR37 への転記 6051376399）。(a) 配布先の呼出し側は `pull_request_target` で起動する。定義は default branch から読まれるので、PR がその PR を判定する検査を書き換えても効かない。gate は PR のコードを checkout も実行もしない。(b) workflow を足す・変える PR は保護面 `.github/workflows/**` に触れるので effective R4 とし、merge 担当は status の色ではなく gate の run の JSON を読む。残る穴は 2 つ。同じ context に後から success を付けられることは、必須化（段階 3 以降）の時に Owner が各 repo で ruleset の required workflow（SHA 固定）が使えるかを確かめ、使えれば閉じる（Owner 回答 Q-SDS-RULESET-20261008、iyasaka-arc#52 6052355440）。同じアカウントの席が API で直接 status を付けられることは、Owner 専用アカウント（§7 の案 b）の課題として残す。
- job log は Actions の中で読む（Actions 外の席では読めない環境がある。PR34・PR35 で観測）。

### 4.1 機械から外したものの扱い（適用差分）

旧 gate-contract は、宣言 head の不一致、許可外・禁止 path、引渡しの digest を機械で拒否していた。SDS-V2 のキットでは、判定を 3 つに限る（ARC の確定）。外したものは、移したのではなく**次のとおり人の確認に置き換える**判断であり、ここに明示する。

| 旧の機械判定 | キットでの扱い | 誰が・いつ | 残す証拠 | 合わない時 |
|---|---|---|---|---|
| 宣言 head の不一致（RL-PR-004） | `sds-gate` の結果は head SHA ごとの commit status なので、別の head の結果は使えない（構造で保たれる）。R2 以上は、監査依頼が head と base を固定し、checker が照合する | 機械（status）＋ checker | commit status、監査依頼の JSON | head が変われば status は付け直し、R2 以上は依頼を出し直す |
| 許可外・禁止 path（RL-PR-002/003） | 引渡し（control source）の許可・禁止の範囲と、PR の変更 path を照合する | R2 以上は独立監査担当（監査の中で）。全 risk で、merge 担当が merge の直前に | PR 本文の Evidence 節に「範囲の照合結果（範囲内／範囲外の path）」を作者が書き、merge 担当が確認したことを merge の記録に書く（policy Evidence Rules の allowed/forbidden scope result） | merge しない。作者に戻し、範囲を直すか、範囲の変更を引渡しの側で決める |
| 引渡しの digest | PR が引く引渡しコメントの本文 SHA-256 と、作業時の版の一致 | R2 以上は監査依頼に固定。全 risk で、merge 担当が merge の直前に | 同上 | 本文が変わっていれば merge しない。作者が新しい版で照合し直す |

R0・R1 は独立監査がないため、上の確認は merge 担当だけが行う。merge 担当は作者・監査担当と別の席（SDS-V2 の分離）。

## 5. 配布先の管理

ARC の推奨（案 A と 4 点の補強）を採る。
- 各 repo の `.shirube/sds-pin.json` が「その repo が動かしている版」の正。
- Shirube 側の配布先一覧（1 ファイル。repo・採択者・採択の記録・hygiene profile の種類）が「配布先」の正。追加・削除は Owner 承認の PR。
- `status` は読取り専用の観測。配布先ごとに、固定版・最新の採択版・digest の一致・旧部品の残り・hygiene workflow の `uses: …@<sha>` と固定版の commit の一致・必須検査の実態を出す。自動では更新しない。
- 更新 PR は Shirube 側の席が出し、各 repo の担当がその repo の gate で統合する。workflow と必須検査を含む更新は保護面なので、repo ごとに Owner の head 単位の承認が要る。文書だけの更新（共通ブロック、skill）は R0〜R1。
- ただし `.shirube/**`（版の固定ファイルと `hygiene-profile.md`）は保護面なので、文言だけの変更でも R4 として扱う（ARC の指摘 B）。

## 6. 確定に至った違いの記録

| 点 | 確定 | 出所 |
|---|---|---|
| 必須検査の判定 | 3 つ（§4）。推奨の (a)〜(f) のうち、引渡しの digest・禁止 path・Owner の承認・固定ファイルのずれは機械の判定に入れない | ARC の確定 §3 |
| risk_class の取り方 | label を正とし、機械向けブロックと照合する | ARC の確定 §3（codex-adf 案の label と推奨の雛形を両方使う） |
| 履歴の扱い | review-plans・audit-checklists・source-mirrors も撤去せず履歴として残す | ARC の確定 §1（codex-adf 案） |
| 版の固定ファイル | `.shirube/sds-pin.json` | codex-adf（置き場の選択は任されている） |
| 機械向けブロックの形式 | JSON | codex-adf（組込み機能だけで動かすため） |
| runtime policy | v0 は commit・SHA-256・節名で参照し、取り込みは別の PR | ARC の確定 §6 |

## 7. Owner 承認の本人確認について（ARC の確定 §4 で案 a を採択）

- 今は Owner と AI の各席が、同じ GitHub アカウント `watchout` で投稿している。そのため、owner decision の記録が Owner 本人の判断か、AI 席の転記かを、機械では区別できない。`templates/owner-decision.md` の `posted_by` の照合も、同じ理由で本人の証明にならない。
- 必須検査は Owner の承認を見ない。R3 以上の Owner の head 単位の承認は、統合担当が merge の直前に人の記録（owner decision の exact head と本文 digest）で確かめる。今の運用と同じ。
- Owner 専用の GitHub アカウントを用意する案（b）は、Owner が後で選べる案として残す。キット v0 の条件にはしない。
- GitHub の必須 review（1 承認）が残っている repo では、監査席の正式な APPROVE で満たす。

## 8. 順序と範囲外

1. 本書の確定（独立監査と Owner の承認）。
2. キット v0 の作成（codex-adf、R3）。§3・§4・§5 の部品。runtime policy は、v0 では必要な節（Risk-Tiered Gate Depth、Human Approval Gates、Evidence Rules、Function Boundaries の作る人≠確かめる人≠統合する人、Next Action Contract）を commit・SHA-256・節名で参照する。
3. runtime policy の取り込み（別の PR、R2）: 上の節を値を変えずに Shirube の `docs/sds/` の 1 文書へ移す（codex-adf）。組織の権限（Owner、保護面の一覧、収益判断、管理を AI に任せない決定など）は iyasaka-org の短い 1 文書に残し、commit と SHA-256 で引用する（ARC）。V3 policy 本体は、全 repo から旧部品が撤去されるまで履歴として残す。
4. kodama で試験導入: 追加と撤去を 1 PR で行う（R4）。必須検査の付け替えは Owner。PR84 の head は動かさず、キットの統合後に main に合わせて、`sds-gate` が R2 として受領を読めるかを確かめる。受入には次の負例 2 件を加える（ARC の判断 1）。① PR が呼出し側の `uses: …@<sha>` を別の commit に書き換えても、その PR の `sds-gate` の status は default branch の定義での結果になる（書き換えが効かない）。② PR が `statuses: write` を持つ workflow を足して `sds-gate` の success を付けても、base の定義で動く gate は `protected_touched: true`・effective R4 を出し、merge 担当の手順で止まる。
5. agent-memory（PR332・PR333 の統合後）、onza・aun（共通ブロックの置換だけ）の順に配る。

範囲外: agent-comms-mcp・ai-dev-framework・misell に残る旧検査（後続で同じ手順）、製品の機能開発（キットを待って止めない）、Shirube 製品の本体（PR34・PR35 は今の計画のまま）。
