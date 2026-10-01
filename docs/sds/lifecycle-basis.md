# SDS の開発方法 — AI-DLC を基盤にした改訂候補

状態: 原典照合・手順書の独立監査へ提出する候補。採択・配布・製品への実適用は未実施。
依頼原文: 「AI-DLCをベースとして不足する部分をOpenUPで補う形ではどうか？原典の入れ替えと手順書に落とし込み監査に回したい。」
control_source_ref: https://github.com/watchout/shirube/issues/6#issuecomment-5923186744
本文 SHA-256: `2a1b68c1cc136df1f9431ad5ecb0a0099c2cb432239ff283939a3d4afe118620`。
追加指示原文: 「aidlcが絶対的なベースですが、openUPよりも優れた概念がある場合はそれをさいようしましょう」。
control_source_ref: https://github.com/watchout/shirube/issues/6#issuecomment-5923321824 / SHA-256: `28c4135bea0bd53e636d6927ebb489967a034a1f33e8870b30fb447a80e3de91`。

## 1. 入れ替えるもの

開発全体の進め方の主参照を **AI-DLC** に固定する。補完原典はG1〜G5の目的別比較で選び、OpenUPを優先する前提は置かない。
工程別に独立した手法をつなぐ従来の入口を、[実施手順](../process/ai-dlc.md)へ置換する。
P1〜P12 は要求・監査の追跡 ID として保持し、12段階を全変更で一律に繰り返す意味にはしない。
この文書が原典選択・補完・差分の正本、実施手順が実行方法の正本、[source-lock.json](source-lock.json)が取得した版・digest の正本。
arc の baseline は既存条件とこの正本への参照を保持する。外部原典の本文を複製して別正本を作らない。

AI-DLC の方法定義（AI-00）と公開実装の手順（AI-01〜15）は別の資料である。後者は `9b8df02231f0230fd6f19846a0df1fb5567e7ece` に固定。
OpenUP は Eclipse 公開版 `1.5.1.5_20121212` の確認節に限定。Fowler/Cockburnは著者公開原典の該当節を確認。取得時刻・HTTP GET/identity・bytes・SHA-256 は lock に記録する。
可変 PDF/HTML は再取得時に digest を比較し、不一致なら内容を再確認する。hash 一致は解釈の正しさや独立監査の代用ではない。
作者の取得写しは `/tmp/shirube-aidlc-openup-20261001/`（一時 cache、権限・恒久配布物ではない）。原典は公開 URL から再取得できる。

## 2. 主張と確認節

各 ID の URL は lock の同じ ID に一意に結ぶ。短い引用は照合点であり、原典全体の採用を意味しない。

| 原典 ID / 確認節 | 確認した主張・短い照合点 | 手順への接続 |
|---|---|---|
| AI-00 / II.2–4,9–10・III・V | 人が判断する（“Humans serve as approvers”）。目的から凝集した Unit へ分け、Bolt で反復。既存製品は静的・動的モデルを確かめる。 | §1〜3,9。段階数・AWS製品・速度効果を一律義務にしない |
| AI-12 / Requirements Analysis Steps 2–10 | 要望の種類・範囲・深度を判断し、回答を対話で確認して要求を作る（“Confirm the Consolidated Summary”）。 | §2。既存 ID を保持し、仮説を合意にしない |
| AI-01 / Domain Design Steps 2–6 | 責任・データ所有・依存関係を決める（“Entity ownership”）。境界の選択理由と要求への対応を残す。 | §3 |
| AI-02 / Units Generation Steps 2–5 | 構成部品を開発単位へまとめ、依存・接続・要求との対応を残す（“Integration points and contracts between units”）。 | §4 |
| AI-03 / Contract Design Steps 1–4 | 提供/利用側、形式、所有者、互換性、失敗時動作を全境界で定める（“Versioning and breaking-change policy”）。 | §5 |
| AI-04 / Delivery Planning Steps 2–6 | 依存と価値判断を区別し、反復の完了条件・実動作確認・次の順序を人と決める（“Economic value cannot be derived from the DAG”）。 | §4,7 |
| AI-05 / Reverse Engineering Steps 1,3 | 既存モデルの範囲と鮮度を実コードで確かめる（“verified-CURRENT stores”）。 | §1,9。原典の専用 store/runtime は導入しない |
| AI-06 / Functional Design Steps 1–4 | 契約を入力に、状態遷移・データ・規則・異常/並行時の動作を具体化（“Business Scenarios”）。 | §6 |
| AI-07 / Code Generation Steps 2–5 | 設計から実装と試験を計画・実行する（“Test files are MANDATORY in the plan”）。 | §6。原典実装の定数・実行器は下記の適用差分あり |
| AI-08 / Build and Test Steps 1,3–10 | 全単位の結果を結合し、未実測を成功にしない（“Unverified”）。失敗から原因工程へ戻る。 | §7,9 |
| AI-11 / CI Pipeline Steps 1–5 | 既存 CI を確認し、必要な場合に構築、要求追跡と実検査の強制を確認（“Skip if CI already exists and is adequate”）。 | §7。OpenUPによる別CIを作らない |
| AI-10 / Deployment Execution Steps 1–4 | 配布前提・移行・配布後 smoke/health を確認（“Pre-Deployment Checks”）。 | §8。既存の保護認可が先行 |
| AI-09 / Feedback & Optimization Steps 1–5 | 運用観測と利用者の変化を次の企画へ返す（“inputs to next Ideation cycle”）。 | §8,9 |
| CI-01 / Practices: Everyone Pushes… / Every Push… / Fix Broken Builds… / How do we do pull requests… | 共有mainへの頻繁な統合と更新mainの試験、壊れたbuildの優先修復（“Every Push to Mainline Should Trigger a Build”）。branchだけでは足りず、事前reviewによる頻度低下も扱う。 | G1 / §7 |
| XP-01 / The Enabling Practices of XP / Growing an Architecture / Reversibility / The Will to Design | 試験・CI・リファクタリングを条件に設計を育てる。初期の大まかな構造も考える（“a broad starting point architecture”）。 | G4 / §3,6,9 |
| HA-01 / Intent / Nature of the Solution / Application | 外部技術と内部処理を接続口で分離。同じ口に試験用と実用のadapterを接続し、実DBでの結合確認も行う（“a real database containing test data”）。 | G5 / §3,5,7 |
| OU-01/02 / Continuous Integration: Main Description / Integrate and Create Build: Steps | 基準版への頻繁な統合、他領域の再試験、smokeを扱う。 | G1の比較対象。CI-01へ主参照を交代し、重複する規範として追加しない |
| OU-03 / Assess Results: Steps | 反復の目標と実試験を照合し、完成分の利用者評価・未達・次の作業を反映（“Demonstrate value and gather feedback”）。 | G2 / §7 |
| OU-04 / Request Change: Steps | 変更理由、対象成果物と版、優先度を残す（“including the version”）。 | G3 / §9 |

## 3. 補完原典の比較と選択

「AI-DLCにその概念が無い」とは判断していない。確認した節で薄い実施条件を補う。重複するところは再実施しない。

選定基準は、この用途の具体的な実行条件、原典の直接性、AI-DLCとの接続、重複の少なさ。手法全体の優劣や効果の実測ではなく、以下は作者の比較判断であり監査対象。

| ID | AI-DLC側で既に扱うこと / 補う詳細 | 選択・比較理由 / 増やさないもの |
|---|---|---|
| G1 | AI-04の実動作確認、AI-08の全体試験、AI-11のCIは存在。小変更ごとの共有main更新と検証・壊れたbuildへの処置を明確にする。 | **CI-01を採用候補**。OU-01/02とも整合するが、branch試験との区別・main更新ごとのbuild・事前reviewの摩擦まで直接説明するため主参照を交代。§7の同じCI/PRで行い、第二CI工程を作らない。 |
| G2 | AI-04に反復の完了条件、AI-09に運用後の改善がある。反復終了時に利用者へ示す範囲と未完項目の扱いを明確にする。 | OU-03の評価・完成分の実演・未達/発見の次回反映を既存の受入/PDCA記録へ接続。別会議・別評価表・二重承認を作らない。 |
| G3 | AI-00 Vの既存製品開発、AI-05の既存モデル、AI-09の改善への戻りは存在。追加依頼の対象版・理由・優先度を取りこぼさない。 | OU-04の変更情報を同じIssue/PRに記録。戻り先の分類は§9のSDS適用判断であり、OpenUP原典の固定分岐と偽らない。 |
| G4 | AI-01/06/07/08の設計・実装・検証へ、学びを戻すときの成立条件を補う。 | **XP-01を採用候補**。確認したOU-03の結果評価より設計改善の条件に直接的。§3の初期構造と§6/9の自動試験・CI・小さなリファクタリングへ接続。XP全実践や別反復を一律導入せず、無設計の継ぎ足しを許さない。 |
| G5 | AI-01の責任分離とAI-03の契約へ、内部と外部技術を隔てる実装境界を補う。 | **HA-01を条件付き採用候補**。選んだOpenUP管理/統合タスクとは役割が異なり、置換競争ではない。外部依存が業務処理の試験/変更を妨げる境界に適用。全クラスへのinterface、六つのport、将来だけの汎用層は要求しない。 |

OU-03/04は反復評価・変更要求の具体化として残す。aun提案の3原典はその管理情報を丸ごと代替しない。確認した節に限った比較であり、OpenUP全体に設計の実践が無いとは主張しない。

## 4. 原典からの適用差分と継承

- **方法の採用と実行器の導入を分ける。** 原典の engine、専用ディレクトリ、33 stages、subagent編成、guard off/relaxed、承認スキップは導入しない。既存 repo / Issue / PR / CI を実施先にする社内適用案であり、公開実装そのものへの完全準拠とは呼ばない。
- **対話が必要な意味の確定をAIに委ねない。** AIは根拠と案を出し、人が利用者・価値・重要な境界/契約・変更意図を確認する。沈黙や暫定案を合意にしない。人待ちは一度通知して停止し、待機中の成果物量産をしない。
- **深度は既存policy。** R0/R1の既存設計内変更は理由・範囲・既存参照・必要検査を同じIssue/PRに残す。R2は差分設計と実装後監査、R3/R4は事前監査と必要な認可。明示的監査依頼・保護面・作者≠監査≠mergeを保持する。AI-DLCの人による判断と独立監査を同じものに数えない。
- **CI頻度と独立性を同時に追う。** CI-01が論じる事後reviewへの移動は自動採用しない。既存の認可・独立監査を保持し、小変更と早いreviewで日次以上の統合を目指す。待ちで未達なら未達と報告し、原典準拠や頻度達成に換算しない。
- **帳票を増やさない。** 原典で別ファイルになっている情報は既存の要求・設計・契約・試験記録へ配置できる。入力と出力の参照・版は追えるようにし、同じ本文を再記入させない。ページ数は内容を削る理由にしない。
- **試験の数で充足としない。** AI-07の1要件1試験、5–8/10–15件、80%といった公開実装の既定値は移植しない。採択ID・重要不変条件・必要な検証種別と証拠を多対多で結ぶ既存F06/F07を使う。未知の境界をMinimalの名で省略しない。
- **P1の入口を置換。** Working Backwards単独を全変更で一律必須にする入口は退け、AI-DLCの対話によるIntent/Requirementsへ移す。顧客体験・成功/負担指標・範囲・難所・未解決は維持。PR/FAQは適する企画で使う補助手段。Shirube PR#18の原典監査はその手順の範囲だけで、新方式の監査に流用しない。
- **既存IDは廃止しない。** EARS/BDDは要件と具体例の記法、ADRは決定履歴として保持。監査はAI-13〜15へ統一し、Google等の別チェック表は確認履歴を保持して二重実施をやめる。T1〜T11、S1〜S9、W1〜W6/K1/RR/DS/OR、policy、64項目の既存対応は継承する。外部手法の候補をまとめて採択済みに昇格させない。
- **F01〜F10の補強を継承。** 全軸重大未達BLOCK、未知は未知、AI信頼境界、依存/脆弱性、リスク比例、多対多/親自身の受入、AI評価、実証する復旧、正本参照、実測に基づく改善を維持。[SDS入口](README.md)・[S1〜S9](engineering-standards.md)を参照する。

## 5. 旧工程IDとの対応

| 既存 ID | AI-DLC基盤の実施先 / 原典 |
|---|---|
| P1 | 手順§2の目的・対話 / AI-00,12。既存の利用者成果・負担指標を保持 |
| P2 | §2,4の要求・具体例・単位への対応 / AI-12,02 |
| P3 | §3〜6の境界・契約・差分設計 / AI-01〜06,XP-01,HA-01 |
| P4 | §6の実装 / AI-07,XP-01。小PRと試験・必要動作を維持 |
| P5 | §7の単体・契約・結合・回帰・受入 / AI-08,CI-01 |
| P6 | §6〜8のリスク別独立監査 / [AI-DLCを主軸にした監査方法](audit-method.md)、AI-13〜15と既存SDS保護 |
| P7 | §7,8のCI・版固定・配布 / AI-11,10 |
| P8 | §8の運用受入・観測 / AI-09,10。既存PRR/復旧/SLOを保持 |
| P9 | §7,9の反復評価・追加変更 / AI-00,09,OU-03/04 |
| P10 | §2,5,6,8の非機能・安全 / AI-00,12と既存T/S条件 |
| P11 | 全節の版付き参照・現行本文と決定履歴 / 既存の正本規則 |
| P12 | 上記全体をAI-DLCの対話・計画・実行・確認で進める。AIの権限制約は継承 |

## 6. 監査と発効

監査方法の外部原典はAI-DLC一体系（AI-13〜15）へ選別。[監査方法](audit-method.md)に原典照合点、機械/LLM/人の責任と今回の公開指示を集約する。

今回の作者確認は原典の該当節・参照・読み合わせまで。実製品での手順実行・効果は NOT_RUN。
独立監査は[読み合わせと監査項目](../process/ai-dlc-review.md)のLC-01〜07を、対象SHAと原典で確認する。
採択前は既存採択版が有効。承認された改訂の発効には公開決定、別担当merge、利用元の採択版切替・読戻しが必要。
Shirube #19 / arc #55 / org #7 のF01〜F10候補を依存として明示し、この候補の監査と混同しない。
PR#18の旧入口を後から再導入しないよう、merge担当は入口をこの改訂へ統一する。必要なら同PRは補助手順として整理する。
