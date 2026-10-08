# SDS-V2 の配布 — 旧 Shirube（V3/V4.1）部品の撤去範囲と、配布キット v0 の要求

状態: **段階 1（残す・撤去する範囲）の確定案。独立監査と Owner の head 単位の承認の前。** キットの実装・各 repo への適用・必須検査の設定変更はまだ行っていない。作者 codex-adf、2026-10-08。

## 0. 根拠

| 入力 | 参照 |
|---|---|
| Owner 判断（配布の層を先に作る、範囲は ARC と codex-adf、キットは codex-adf） | https://github.com/watchout/iyasaka-arc/issues/52#issuecomment-6049770830 |
| 作業指示（段階 1〜3） | https://github.com/watchout/shirube/issues/6#issuecomment-6049775092 |
| ARC の推奨（撤去一覧・移し先・必須検査 1 本・配布先管理・policy の扱い） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049838786 |
| codex-adf の案（観測と 5 項目） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049793570 |
| 規格 | SDS-V2 shirube@`d34b31e98df522c463d5cafb7c17e0beece33fb2`（`docs/sds/README.md`、`docs/process/ai-dlc.md`、`docs/sds/audit-method.md`） |

観測した旧部品（読取りのみ）: kodama main `40afc723`、agent-memory main `9bd874ce`（ARC）/ `c199e31`（codex-adf の clone 時点）。両者の内訳は ARC の推奨 §0 の表のとおり。

本書は ARC の推奨を土台にし、codex-adf の案と食い違う点を §6 で決める。

## 1. 原則

- SDS-V2 の 3 つの形（PR の記載、監査方法と機械受付 checker、hygiene）で同じ証拠が取れるものは、旧部品を撤去する。取れないものだけを必須検査 1 本へ移す。
- 必須検査は、人が読めない**構造の事実**（head・path・digest・受領の有無）だけを見る。意味の判断は独立監査（LC-01〜07、設計 D1〜D6 など）に残す。
- 案件ごとの状態ファイルを repo に置かない。工程の現在地は Issue と PR に書く。
- 過去の記録は消さず、履歴として残す。

## 2. 残す・撤去する範囲（kodama・agent-memory・onza。aun は旧部品なし）

| 部品 | 処置 | 代わり |
|---|---|---|
| `.shirube/runtime/rapid-lite/**`、`.github/workflows/shirube-rapid-lite-gates-report.yml` | 撤去 | §4 の必須検査 1 本、監査方法、hygiene |
| `.shirube/runtime/merge-authority/**`、`.github/workflows/merge-authority.yml` | 撤去 | §4 の (e) と、merge 担当による確認（§5） |
| V3 の状態ファイル（execution-context、lifecycle-state、control-state-completeness、enforcement-policy、route-policy、repo-spec、profile.json の V3 節、framework-lock、adoption-intake、existing-state-scan、v3-normalization、open-pr-inventory、pr-body-refs）、`review-plans/`、`audit-checklists/`、`profiles/`、`source-mirrors/`、`action-surfaces.json` など | 撤去 | Issue と PR の記録。項目集合は Shirube の固定版を引用 |
| kodama の `.claude/hooks/pre-code-gate.sh` と、`.framework/**` を呼ぶ hook、`.framework/**` | 撤去 | ai-dlc §1 の開始記録と §6 の試験先行。hook では止めない |
| CLAUDE.md・AGENTS.md の `shirube-v3-runtime` managed block、kodama CLAUDE.md の Pre-Code Gate 節 | 置換 | §3 の指示の共通ブロック。ローカルの絶対パスを使わない |
| `.shirube/control-handoffs/*`、`evidence/`（あるもの） | 残す（履歴）。新規には作らない | 新しい引渡しは Issue のコメント＋本文 SHA-256 |
| agent-memory の `.shirube/cells/kusabi-sds-u1*` | PR332・PR333 の統合まで残し、その後は履歴 | 同上 |
| `.shirube/` ディレクトリ | 残す。中身は `hygiene-profile.md`（使う repo だけ）と版の固定ファイル（§3）と履歴 | — |
| V3 と無関係のもの（kodama の `ssot-audit.yml`、`channel-routing.sh` など） | 対象外。その repo の担当が判断する | — |

旧検査が見ていた中身の移し先は、ARC の推奨 §1.2 の表を採る。要点: head・base・変更 path・禁止 path・引渡しの digest は §4 の機械検査へ移す。構造化された監査回答は監査方法と checker の `--review` で代える。technical_owner_review は必須にしない。lifecycle・review-plan・adoption・execution-context はファイルを持たずに撤去する。design-rules と flow-safety は hygiene と PR の禁止 path で代える。

## 3. 配布キット v0 の部品（段階 2 の要求）

| 部品 | 要求 |
|---|---|
| 指示の共通ブロック | CLAUDE.md と AGENTS.md に入れる短い段落。印で囲み、repo 固有の記述と分けて置換できる。内容は SDS-V2 の固定 commit、PR の記載、監査方法、R0〜R4 と承認の参照（§7）。ローカルの絶対パスを持たない |
| PR の記載（機械で読める部分） | 今の `templates/PULL_REQUEST_TEMPLATE.md` は文章の箇条書きで、機械では解析できない。§4 の (a)・(c) のために、risk_class・control_source_ref（URL＋本文 SHA-256）・changed_paths・forbidden paths・監査依頼／返却／受領の参照・owner decision の参照を持つ 1 個の YAML ブロックを加える |
| 必須検査 1 本 `sds-preflight` | §4 |
| skill | 監査依頼（`sds-audit-request/1`）の JSON の生成と前検査、統合前の確認手順 |
| 版の固定ファイル | 各 repo の `.shirube/sds-pin.json`。`sds_commit`、`kit_version`、配った各ファイルの SHA-256、採択の記録（URL＋本文 SHA-256）、採択日時 |
| CLI | `apply`（固定ファイルと部品を入れる PR を作る）、`upgrade`（版を上げる PR を作る）、`check`（固定ファイルと実ファイルの一致を見る）。どれも各 repo へ直接 push しない |
| 配布先の一覧と `status` | §5 |

配るものはこれだけにする。案件ごとの状態ファイル、席ごとの設定、常駐する実行部品は配らない。

## 4. 必須検査 1 本 `sds-preflight`

読取り専用。最初は report-only で入れ、required にするのは Owner が各 repo で行う。

| 項目 | 見ること |
|---|---|
| (a) | PR 本文の YAML ブロック（§3）が解析でき、必須欄が埋まっている |
| (b) | `control_source_ref` の本文 SHA-256 が、取得した本文と一致する |
| (c) | `changed_paths` が実際の diff と一致し、禁止 path と保護面の path に触れていない |
| (d) | R2 以上: 監査依頼と返却が、同じ head で checker の `--review` により RECEIPT_ACCEPTED になる（`scripts/hygiene/audit-admission.mjs` をそのまま使う） |
| (e) | R3・R4 または保護面: owner decision の記録（`templates/owner-decision.md` の形）があり、`exact_head` が今の head と一致する |
| (f) | `.shirube/sds-pin.json` の digest が、Shirube の公開版と一致する（ずれは WARN） |

実装上の要求:
- checker と検査の本体は、PR の head からではなく、固定した Shirube の commit から取得する。PR が検査を書き換えて自分を通す経路を作らない。
- 監査の返却はコメントで届くため、`pull_request` に加えて `issue_comment` でも動かし、結果は head SHA に付ける。
- job log は Actions の中で読む（Actions 外の席では読めない環境がある。PR34・PR35 で観測）。

## 5. 配布先の管理

ARC の推奨（案 A と 4 点の補強）を採る。
- 各 repo の `.shirube/sds-pin.json` が「その repo が動かしている版」の正。
- Shirube 側の配布先一覧（1 ファイル。repo・採択者・採択の記録・hygiene profile の種類）が「配布先」の正。追加・削除は Owner 承認の PR。
- `status` は読取り専用の観測。配布先ごとに、固定版・最新の採択版・digest の一致・旧部品の残り・必須検査の実態を出す。自動では更新しない。
- 更新 PR は Shirube 側の席が出し、各 repo の担当がその repo の gate で統合する。workflow と必須検査を含む更新は保護面なので、repo ごとに Owner の head 単位の承認が要る。文書だけの更新（共通ブロック、skill）は R0〜R1。

## 6. ARC の推奨と codex-adf の案の突き合わせ（確定）

| 点 | 確定 |
|---|---|
| 版の固定ファイルの置き場 | ARC の `.shirube/sds-pin.json` を採る（codex-adf 案の `.sds/lock.json` は取り下げ。置き場を 1 か所にするため） |
| risk_class の取り方 | ARC の PR 本文 YAML を採る（codex-adf 案の label は取り下げ）。ただし今の雛形は YAML ではないので、§3 で雛形に YAML ブロックを加える |
| 必須検査の中身 | ARC の (a)〜(f) を採り、§4 の実装上の要求 3 点（固定 commit から取得、`issue_comment`、Actions 内で log を読む）を codex-adf から加える |
| Owner 承認の本人確認 | §7 |

## 7. Owner 承認の本人確認について（(e) の限界）

- 今は Owner と AI の各席が、同じ GitHub アカウント `watchout` で投稿している。そのため、owner decision の記録が Owner 本人の判断か、AI 席の転記かを、機械では区別できない。`templates/owner-decision.md` の `posted_by` の照合も、同じ理由で本人の証明にならない。
- (e) が機械で確かめるのは「記録があり、head が一致する」ことまで。記録が本人の判断かどうかは、merge 担当が merge の直前に人の手で確かめる（今の運用と同じ。codex-adf の推奨 a）。
- 機械で本人を区別したい場合は、Owner 専用の GitHub アカウントが要る（codex-adf の案 b）。これは Owner が決める事項で、決まるまでは上の扱いのまま進める。

## 8. 順序と範囲外

1. 本書の確定（独立監査と Owner の承認）。
2. キット v0 の作成（codex-adf、R3）。§3・§4・§5 の部品。runtime policy のうち SDS-V2 が使う 4 節（R0〜R4 の表、保護面と人の承認、証拠の規則、作る人・確かめる人・統合する人の分離と next_action）は、値を変えずに Shirube の `docs/sds/` に取り込む。組織の権限（Owner、収益判断など）は iyasaka-org の短い 1 文書に置き、SDS-V2 からは commit と SHA-256 で引用する（ARC の推奨 §3。iyasaka-org 側は ARC の担当）。V3 policy 本体は、全 repo から旧部品が撤去されるまで履歴として残す。
3. kodama で試験導入: 追加と撤去を 1 PR で行う（R4）。必須検査の付け替えは Owner。PR84 の扱いはこの PR の中で決める。
4. agent-memory（PR332・PR333 の統合後）、onza・aun（共通ブロックの置換だけ）の順に配る。

範囲外: agent-comms-mcp・ai-dev-framework・misell に残る旧検査（後続で同じ手順）、製品の機能開発（キットを待って止めない）、Shirube 製品の本体（PR34・PR35 は今の計画のまま）。
