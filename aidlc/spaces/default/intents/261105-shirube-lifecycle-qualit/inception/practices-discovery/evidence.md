# Shirube — 実践の根拠と未検証事項

## 状態と調査の範囲

Step 2 の初期草案と Step 4 の面談内容を、Owner の Looks correct と正式な要約確認記録に基づいて Step 5 で最終統合した。最終版は team-practices.md、discovered-rules.md、本 evidence.md と practices-discovery-timestamp.md の4文書である。`PRACTICES_DISCOVERED` の発行、promotion、段の最終承認はまだ行っていない。共通 memory・state・cursor・audit は直接編集していない。

- 実担当: `/root/practices_lead`、役: `aidlc-pipeline-deploy-agent`。`mode: subagent`、`support_agents: []`、Collaborators off、reviewer なし。支援役・独立見直しの contribution は存在するものとして扱わない。
- 今回の分担は、実作業と文書の作成・修正を子が行い、親は確認・進捗・品質・承認を管理する形である。この取り組みの担当分担として記録し、他の取り組みの恒久制約にはしない。最終統合も同じ子が4文書を編集し、親は成果物を編集していない。
- 最初に `agent-memory recover_context(project="ai-dev-framework")` を実行し、backend identity `adf-lead` と project を確認した。戻された旧 Next Action は再開せず、今回の依頼と現 state の Practices Discovery Running を採用した。記憶検索は補助であり権限の根拠にしていない。
- 読み取り基準: root HEAD `62ff73db52ce8f29f3b982507b5d2e36578ae60f`。main 補足は承認済み分析の固定版 `7e775afd5b755e51e55e269d8dc35b09d180c33e`。後者を現在の作業場や、その後も不変の main と同一視しない。
- 前段で承認された全体分析を再利用し、製品全体の再スキャンはしていない。補足は直近8件の Git 履歴、root/main の CI と profile、root の manifest・ESLint・依存境界の読み取りに限定した。
- 製品コード・試験・設定の編集、製品 test/build/CLI/CI の実行、依存導入、GitHub投稿、AUN接続/適用はしていない。GitHub は必要な公開根拠を GET で読んだだけである。

## Sources

| 入力 | 今回参照した内容 |
|---|---|
| [aidlc-state.md](../../aidlc-state.md) | Brownfield、default、practices-discovery Running、strict、Sensors/Learnings/Summary/Plan on、Collaborators off、unit-major/serial |
| [org.md](../../../../memory/org.md) | 五層の解決、一般既定と採択済み team の区別、試験姿勢と Methodology/Ordering の契約 |
| [team.md](../../../../memory/team.md) | 5分野の既存採択、監査受付手順、保護対象、規格、古い文の併記 |
| [project.md](../../../../memory/project.md) | 既存 hard constraints と過去の学び。今回の promotion で既存行を削除・改変しない |
| [inception.md](../../../../memory/phases/inception.md) | 検証可能性、未解決の矛盾を隠さないこと、上流への追跡 |
| [code-structure.md](../../../../codekb/shirube/code-structure.md) | CLI/核/adapter/設定/試験の責任、root/main の区別、測定対象の不足 |
| [technology-stack.md](../../../../codekb/shirube/technology-stack.md) | ESM、Node、Node 組込み試験、開発依存の版、Node engine の詳細条件 |
| [dependencies.md](../../../../codekb/shirube/dependencies.md) | 共通lib・Git/GitHub境界、固定版配布、lockfile の観測限界 |
| [code-quality-assessment.md](../../../../codekb/shirube/code-quality-assessment.md) | 100%との差、READY/承認/collector/CIセンサー/AUN の未接続、S1〜S9との差 |
| [architecture.md](../../../../codekb/shirube/architecture.md) | 再利用workflowとCLI、判定とI/Oの分離、自己適用と現在のAI-DLC接続の不足 |
| [business-overview.md](../../../../codekb/shirube/business-overview.md) | LLM導入から初回/追加変更までの目的、再利用候補と未実証の区別 |
| [developer-scan.md](../reverse-engineering/developer-scan.md) | 前段の全体調査、M-01〜M-13/BL-01〜BL-10 と再利用/不足、動作未検証 |
| [initiative-brief.md](../../ideation/approval-handoff/initiative-brief.md)・[decision-log.md](../../ideation/approval-handoff/decision-log.md) | 今回の承認済み目的・境界・引継ぎ、後続で定める詳細 |
| [scope-document.md](../../ideation/scope-definition/scope-document.md) | M-01〜M-13、W-01〜W-03、初回/実追加変更/AUN、4つの確かめ、架空データ限定 |
| [team-assessment.md](../../ideation/team-formation/team-assessment.md) | 親と実作業の分担、最大3体の可変配分、既存AUN担当/DB intentの保持 |

段の方法は `.codex/aidlc-common/stages/inception/practices-discovery.md` と ensemble/summary/sensors/learnings、質問表示の契約を読んだ。役の事前読取りとして `.codex/knowledge/aidlc-shared/` の対象4文書、`aidlc-pipeline-deploy-agent/` の3文書を順に読み、指定された format reference は必要になっていないため除外した。default 空間の両 knowledge サブディレクトリは存在しなかった。

## 公開決定の本文照合

以下の `control_source_ref` は GitHub API が返した `body` の UTF-8 bytes 全体から SHA-256 を再計算した。ローカルのミラーや端末記憶を代用していない。P番号は本資料の出典番号であり、新しい工程・権限・状態の名前ではない。

| 参照 | control_source_ref.url | control_source_ref.sha256 | 本段で参照する意味 |
|---|---|---|---|
| P1 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646126384 | `d4c48a46139e71880db9d92ae8409c95b21dc0713136d4d07642f87c5a9df502` | AI-DLCへの一本化、退役する工程/予算、残す監査・保護対象・技術規格、strict/Learnings/後続工程 |
| P2 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646012529 | `c0450932f04b3e9f2c2667fe8deef3de20dd2bcac8b7eb75d7f02a4ee03e17b4` | Shirubeの切替採択、技術/安全性を予算整理に巻き込んで外さない、既存成果を保持 |
| P3 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 | `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462` | 限定された見直し役、4分類の設計監査、PRへの単位記録、audit/internal除外、blockingセンサー |
| P4 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6647418162 | `4d4a85a99e8778f58c0ee4fccdaa3d5cece3c6efe4305bd11816c0fd8692647d` | 行網羅率100%、除外の監査、CI変更は別途対象PRのexact-head |
| P5 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6380845765 | `5cd75b9904c7cb8a229ba8be55d417d2c56af2eb920ef7f94875c9689fa45501` | LLM制御を文だけにせずscript/機械/hookで検査・停止する |
| P6 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308341298 | `d2d1a8e4da93411d6baa1cca8ef2338d6b9822db15eb43489b9d3dabeb43bf94` | 限定されたキット版上げfileと条件でper-PR exact-headの例外。初回導入やmode/必須検査等は除外 |
| P7 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646144286 | `224a607fb07ae0c6c0cb09453882ae369032e0e20537bdafbc924521a8c508cc` | 規格を維持・向上し、TDD/CI/DB/最小権限/秘密/脆弱性確認等を工程整理で外さない |

P3/P5 は依頼にある既知の SHA-256 とも一致した。P1〜P7 は今回の具体的な workflow・固定checker・pin・保護設定・資格情報などの変更権限にはならない。

旧記述の確認だけに用いた公開資料も本文を照合した: own-code 4000 の旧決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379138360、sha256 `b3678290324f793f0b6ec14a284d349e6e83ca4862d7c994f09e42f0849c3b5c`。薄片の旧決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6284653618、sha256 `f87958eba3e7fbed02d317a58927642ad900772cfb4ce078a1f43957037be659`。古い予算値・SDS工程・担当順を今回へ復活させる引用には使わない。

## 5分野の採択と実装の観測

`team-practices.md` の5節は正式な promotion で空間の共通実践へ反映される。共通の採択として保持するのは Guard Policy strict、Learnings on、P3の traceability/upstream-coverage blocking であり、それ以外は各取り組みの正式な設定と適用される承認・検査に従う。現在の Sensors/Summary Confirmation/Plan Approval on、`unit-major/serial`、今回の支援役/見直し役の有無、root/main の実装観測はこの evidence に置き、別の取り組みの固定規則へ格上げしない。M-01〜M-13、AUN実証、W-01〜W-03、旧S1の今回への引継ぎ、将来の設計先行メモは現在の取り組みだけの範囲であり、共通 team/project の恒久的なゴールや禁止範囲にしない。

| 分野 | 引き継ぐ採択 | 読み取りで確認した事実 | 判断・検証の限界 |
|---|---|---|---|
| Way of Working | AI-DLC・正式な設定/段/単位、1単位1PR、PRごとの独立監査/受領/別席統合、merge commit、保護対象の許可 | 現stateはunit-major/serial。直近8件に merge commit と席branch。旧判定4/5のコードは残る | 特定intentの設定を他intentへ固定しない。8件の履歴で全運用やbranch protectionを証明しない。退役コードを使う条件にはしない |
| Walking Skeleton | 最初に端から端まで動く薄い版を実証する | 現 scope は LLM導入/設定/明示開始、初回と追加変更、AUN実証まで要求 | 旧S1のPR1件という条件で今回の初版全体を完了としない。最初の単位と確認コマンドは未確定 |
| Testing Posture | tdd、node:test、行100%、適用SEC-Tと依存導入前の脆弱性確認 | root ci.yml は Node22・npm test・閾値なし。固定mainはNode26・scripts/**・80%。root manifestはコンパイルbuildを定義しない | 試験数/成功数/実測coverageは未計測。100%の分母を後続で定める |
| Deployment | 固定commitのworkflow/キット、限定版上げ例外、初回導入等は保護対象 | 前段分析に kit/pin/check と自己適用の制限。常駐HTTP/DB adapterなし | staging/production自動展開は既存運用と確認できない。AUN適用/rollbackは未実証 |
| Code Style | ESM、実行時npm依存なし、既存技術検査、S1〜S9 | root/main両profileは新file300、PR400/20、own-code root2300/main4000。ESLint関数50/複雑さ10、guard、共通profile、依存方向。formatterなし | 旧予算は現行の新規計画上限にしない。新ソースfile300/関数50/複雑さ10まで消す根拠として拡張しない |

## 古い記述の整理と保持の対応

| 調査時の team の記述 | 確認済みの最終版での扱い | 根拠・保持する内容 |
|---|---|---|
| 設計文書のPR/事前設計監査を行わないという一律の文と、4分類の設計監査を行う文の併記 | 一律の否定を引き継がず、AI-DLC内の設計とP3の限定設計監査を明記 | P3は後の具体的決定。旧独自工程の廃止は保つ |
| PR400/20・own-code4000等の予算を廃止する文と、Code Styleで上限を課す文の併記 | 廃止済みの計画上限と、未変更の保護設定の観測を分ける | P1・P2。設定実変更は権限確認後。新ソースfile300/関数50/複雑さ10等を一緒に消さない |
| Walking Skeletonの旧S1-SH-01〜06/PR1件の完了定義 | 共通節には最小の実動版と各取り組みの正式な受入に従う条件だけを保持。旧定義と今回の関係はこの記録で追跡 | 今回の承認済みscope M-01〜M-13。旧条件だけでは今回の全体完了にしない。過去の成果・履歴を保ち、最初の単位・受入を後続で定める |
| TDDの証拠が red/green 別PR | 実装前に失敗する試験を確かめる方法を保持し、現在は単位の同一PRへ記録 | 既存teamの明示した Ordering と、後の1単位1PRを両立する。試験PRを2本出す規則にはしない |
| R2以上に監査を課す旧文と各PR監査 | 各PRの独立監査を維持 | P1・P2、既存team。R0/R1を省略する根拠にしない |
| kitの限定的な版上げ例外と、workflow/pinは一律exact-headという表現 | 一般の保護条件にP6の狭い例外を明記 | 対象file・check OK・上げる先・独立監査/受領/別席統合を全て保持。センサー配布等へ拡張しない |
| 検査は全部1行JSON・exit0/1/2という文 | 各CLIの既存契約を守ると整理 | 前段分析はhygieneとgate/audit/kitが別契約であることを確認。観測不能を成功にしない意図を保持 |
| 作業状態はrepoファイルでなくIssue/PRという文 | 製品/PR状態とAI-DLC進行記録を両方保持 | AI-DLC stateや単位記録を削除する意味にはしない。写しを権限にしない |

既存teamの5節以外（Guard Policy、Mandated、Forbidden、Corrections）の規則・DB固定版・評価指標・問いの扱い等は、正式な promotion で5節を置換する際に削除する対象ではない。既存projectのstamped hard constraintsも残す。1単位1PR、作者自身の監査依頼、branch/merge方式、sds-pr/risk、受付checkout/本文digest/READY_FOR_REVIEW/RECEIPT_ACCEPTEDの手順は最終版に保持した。これらは既存採択の引継ぎであり、文書の完成や要約確認による新しい操作許可ではない。

公開決定 P1〜P7 の全文 URL と本文 SHA-256 は `team-practices.md` の Way of Working 内にも置いた。5節だけを反映した後も参照が残る。`discovered-rules.md` の公開決定を引用する各規則にも独立に URL と SHA-256 を置き、project に行単位で追加されても出典を失わない。失敗を成功にしない規則は必須工程・適用される検証を対象とし、任意工程・正式な適用外を一律禁止へ広げていない。

今回固有の境界は、M-01〜M-13 のすべて、初回と実追加変更、AUNの実配布/実PR正負例/設定のずれ、Codex CLI・Mac・GitHub・GitHub Actions での初回実証である。入口は LLM との対話で Codex 専用にしない。W-01〜W-03、別 DB intent `261105-db-design-security` の保持、設計3.1〜3.4の先行制御を将来メモのままにすることも、この取り組みの引継ぎとして保持する。これらは別 DB intent や将来 intent の必須範囲・禁止を変更しない。

## 人による要約確認と最終統合

5分野の基本方針は既存の採択と今回の承認済みscopeで確定しているため、新しく選ばせる質問は作っていない。上の整理を含む7項目の要約を親が会話で説明し、Owner は「1」と返信して Looks correct を明示した。[practices-discovery-questions.md](practices-discovery-questions.md) の唯一の Consolidated Summary Confirmation は `[Answer]: Looks correct` である。

親から、正式な記録の成功 `SUMMARY_CONFIRMATION_RECORDED` / `Looks correct`、`summary_authorization_id: af498e8d0a7acc9bbc433d19c98ae40c2048c762e0274943fb8c6733601ffe92` を受け取った。この識別子は今回の最終文書生成に対応する要約確認の記録であり、保護対象の公開決定や段の最終承認の代わりではない。確認済みの質問本文と回答を、本最終統合では変更していない。質問ファイルの統合前 SHA-256 は `c4b6b7d1985fae84dbd073ba59f71cdb735dcddb3012a9de706505769a7f02cf`。

最終版は、確認された次の意味を保持する。

- 各取り組みの正式な AI-DLC 設定/段、1単位1PR、独立監査・受領・別席統合、4分類の設計監査から同じPRの実装監査への接続。
- 共通実践として最小の実動版を確認し、今回固有の初回/実追加変更/AUNの完了条件はこの取り組みだけに対応付けること。
- TDD、Node組込みの試験、行網羅率100%、安全の試験、依存導入前の脆弱性確認、最小権限の保持。
- 単位の記録をPRへ掲載する共通条件と、今回作る READY/設計監査/記録/CI再検査/設定のずれの機能を区別すること。
- 旧工程・PR規模/own-code予算の退役と、ソースfile300行・関数50行・複雑さ10等の技術検査の保持。
- 固定commitの配布、P6の限定例外を対象外へ広げないこと、AUNの担当/保留を保持し受け手の実物で確かめること。
- 採択済みの判断を再質問せず、単位・受入・順序・確認コマンドを後続で定め、文書の確認を製品や配布の完了としないこと。

## 残る未検証と次の操作

- 実装基準commitと既存main差分の取り込み方法、単位の分割・依存・順序、初回/追加変更の具体的受入・確認コマンドは後続で決める。
- READY/承認の対象との対応、見直し役がない段の扱い、設計変更時の再監査条件、CI検査の信頼元・版・権限・対象集合は要件/契約/設計で定める。旧Claude/Bun/2.11.1/solo-unit-major前提や `identityCheck:none` は適合済みではない。
- 100%基準とroot/mainの差、src/progressionを含めた対象・分母は試験/CIで解消・検証する。計測除外を自動承認しない。
- AUNの対象・担当の受領・保留・必要な公開決定と対象head、実配布・PR正負例・設定のずれは未観測。registry不在やcontentsの404を未導入の証拠にしない。
- これらは今回の5分野の意思をもう一度聞く事項ではなく、後続の詳細化・権限確認・実証で解く課題である。成立しない条件や新しい矛盾が出た場合は黙って変更しない。

子が完了したのは、人の確認後の4文書の最終統合である。支援役や独立した見直し役のレビューは実施していない。製品の試験・CI・設定変更・配布・AUN適用も未実施のままである。親が次に正規CLIで `PRACTICES_DISCOVERED`、学びの確認、段の承認の問いを扱い、人の Approve を受けた後に promotion を成功させてから正式な段の承認を記録する。最終文書の存在と要約確認だけで、段の承認や共通memoryへの反映を済んだとしない。子は質問/回答log、これらのイベント/進行、共通memory/state/cursor/auditの直接編集を行っていない。
