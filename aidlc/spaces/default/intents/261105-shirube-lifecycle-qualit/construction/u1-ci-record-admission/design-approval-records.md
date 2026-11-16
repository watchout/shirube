# U1 — 設計PRの承認読戻し

## Scope and Limits

対象は `261105-shirube-lifecycle-qualit / u1-ci-record-admission` の先行設計監査PR。本書は既存Qfile・公開可能なnative照会・可読reviewの必要最小限の写しであり、新しい承認発行者・publisher・署名証明・正式進行元ではない。`shirube-pr-records/1`の実装/掲載結果でもない。attempt/現内容bindingの全fieldを備えた完全projectionとして消費しない。

元のprivate audit/engine/host履歴・人返信本文・個別環境metadataをコピーせず、種類/対象/固定選択値/記録時刻だけを整理した。native照会の記録は変更可能な履歴データであり、本人性/実発行元/実review実行や保護対象変更の権限を証明しない。保護対象のOwner決定には具体公開comment URLと本文SHA-256等の既存条件を別に要する。

## Native Plan Approval

| kind | 対象 | canonical choice | native記録時刻 |
|---|---|---|---|
| plan | U1 / code-generation / plan-approval | Approve Plan | 2026-11-09T06:12:20Z |

正規read-only `aidlc engine audit history --event PLAN_APPROVAL_RECORDED` で、Stage=code-generation、Unit=u1-ci-record-admission、Checkpoint=plan-approval、Details=Approve Planを確認した。[engine作成の質問と回答](code-generation/code-generation-questions.md)にも `[Answer]: A. Approve Plan` がある。対象は [承認済み計画](code-generation/code-generation-plan.md) と [試験手順](code-generation/unit-test-instructions.md)。この承認を製品実装開始の単独条件にせず、同PRの設計だけheadの独立設計監査PASSと必要Owner権限を先に揃える。計画のcheckboxは本準備で完了へ変えない。

## Summary Confirmation — stage-completionとは別のkind

正規read-only `aidlc engine audit history --event SUMMARY_CONFIRMATION_RECORDED` から次の該当記録を確認し、各段QfileのLooks correctとも照合した。Consolidated Summary Confirmationの固定選択をkind=summaryとして読み戻すもので、段完了承認を作らない。

| kind | stage | unit | canonical choice | native記録時刻 |
|---|---|---|---|---|
| summary | contract-design | null（intent段） | Looks correct | 2026-11-09T01:19:09Z |
| summary | functional-design | u1-ci-record-admission | Looks correct | 2026-11-09T04:15:20Z |
| summary | nfr-requirements | u1-ci-record-admission | Looks correct | 2026-11-09T04:47:42Z |
| summary | nfr-design | u1-ci-record-admission | Looks correct | 2026-11-09T05:20:02Z |
| summary | infrastructure-design | u1-ci-record-admission | Looks correct | 2026-11-09T05:42:27Z |

U1 Functional Design/NFR Requirements/NFR Design/Infrastructure Designのgate:falseに対応する要約確認を、GATE_APPROVED/人のstage-completionへ変換しない。Code Generationの未来のsummary/段完了承認や未開始Build and Test/CI承認は本書から発行しない。

## Human Stage-completion — 既存履歴の種類を保持

正規read-only `aidlc engine audit history --event GATE_APPROVED` で確認した本intentの記録。時刻順に原承認/後の承認を別行で保持し、最新時刻だけで必要attemptを自動選択しない。人返信本文・内部review path・session等は掲載しない。本表の時刻を公開Owner permissionへ変換しない。

| kind | stage | canonical choice | native記録時刻 |
|---|---|---|---|
| stage-completion | intent-capture | Approve | 2026-11-05T07:26:17Z |
| stage-completion | feasibility | Approve | 2026-11-05T07:46:40Z |
| stage-completion | scope-definition | Approve | 2026-11-05T07:59:56Z |
| stage-completion | rough-mockups | Approve | 2026-11-05T23:39:59Z |
| stage-completion | approval-handoff | Approve | 2026-11-06T00:18:35Z |
| stage-completion | scope-definition | Approve | 2026-11-06T01:12:15Z |
| stage-completion | team-formation | Approve | 2026-11-06T02:15:43Z |
| stage-completion | rough-mockups | Approve | 2026-11-06T03:41:08Z |
| stage-completion | approval-handoff | Approve | 2026-11-06T05:13:00Z |
| stage-completion | reverse-engineering | Approve | 2026-11-06T05:48:52Z |
| stage-completion | practices-discovery | Approve | 2026-11-06T06:25:32Z |
| stage-completion | requirements-analysis | Approve | 2026-11-06T07:10:01Z |
| stage-completion | user-stories | Approve | 2026-11-06T07:56:53Z |
| stage-completion | refined-mockups | Approve | 2026-11-06T08:25:13Z |
| stage-completion | domain-design | Approve | 2026-11-06T21:03:12Z |
| stage-completion | units-generation | Approve | 2026-11-07T05:46:21Z |
| stage-completion | contract-design | Approve | 2026-11-09T01:49:45Z |
| stage-completion | delivery-planning | Approve | 2026-11-09T02:30:19Z |

Contract Designの承認では、非保証/既知残件をCI・AUNへ渡すことと、承認の種類別肯定値/否定拒否試験の2点をU1機能設計へ引き継ぐ条件を保持した。対応は[契約review](../../inception/contract-design/reviews/review-01.md)と[U1機能設計](functional-design/functional-spec.md)を読む。引継ぎの具体化と製品試験の成功は別である。

## Native Reviews and Document Checks

| stage | 可読reviewの記録 | Verdict | 文書の観測と限界 |
|---|---|---|---|
| functional-design | [review-01](functional-design/reviews/review-01.md)、2026-11-09T04:26:10Z | READY | traceability/upstream-coverageのpass=true・findings_count=0。全30AC=25 OK/4 N/A/1 Deferred。E05説明誤記のMinor R-01は未解消 |
| nfr-requirements | [review-01](nfr-requirements/reviews/review-01.md)、2026-11-09T04:52:46Z | READY | 両文書sensor pass=true・findings_count=0。19詳細NFR、NFR7のみ理由付き非適用 |
| nfr-design | [review-01](nfr-design/reviews/review-01.md)、2026-11-09T05:25:15Z | READY | 両文書sensor pass=true・findings_count=0。SOL1〜9と19詳細NFRの対応 |
| infrastructure-design | [review-01](infrastructure-design/reviews/review-01.md)、2026-11-09T05:49:27Z | READY | 両文書sensor pass=true・findings_count=0。既存配置と監査受付の読取照合 |

これらはAI-DLCの文書review/構造sensorであり、このPRのdevauditor独立設計監査PASS/作者受領ではない。コード生成計画の82予定シナリオ・行100%・SEC-T・実PR→CI停止・実配布は未実施。Code Generationの実装後reviewや段完了を本表で先取りしない。

## Publication and Baseline

- 初回U1のため、必要Inceptionと、その参照に必要な同intentの正式Ideation出力を同じ設計PRへ含める。現在採択の実践は[inceptionのteam-practices](../../inception/practices-discovery/team-practices.md)・requirements・本単位設計/計画に本文で保持される。新しい共有規則の直接変更はしない。
- 元のContract Design質問fileは個別環境調査/私的経路を含むため公開対象から除外した。最終契約の要約確認は上の2026-11-09T01:19:09Zのsummary、段承認は01:49:45Zのstage-completionとして必要最小限を本書へ読み戻した。元質問fileへの凍結文書の歴史参照が公開PRでは解決しないことを明示し、原本を黙って加工・置換しない。
- ローカル設計/計画の読取基準root HEADは `62ff73db52ce8f29f3b982507b5d2e36578ae60f`。公開PRのbaseはmain `7e775afd5b755e51e55e269d8dc35b09d180c33e`。別の実装を合算して完成にしない。先行設計PRは製品実行sourceを変更しない。実装時には承認計画Step1の実基準/差分/互換を再確認する。
- 公開mainのshared memory/CodeKBは既存参照として保持する。org.mdはローカルと同bytes、team.md/project.mdとCodeKB9fileは相違することをread-onlyで確認した。これら12fileを本PRで上書きせず、公開main既存bytesを現在のローカル採択の証明として流用しない。共有入力の差に必要な変更判断があれば別に扱う。
- 個別環境metadataを含む質問原本、全depthのaudit/.aidlc-engine、diary、研究/生成schema/外部草案、別intent、他repo資料、keys/生chat/一時データ、state/cursor/runtime graphは公開しない。公開された正式Qfileは構造化された必要選択/設計記録として扱い、生会話の公開にしない。

## Public CI Observation — 設計凍結後の新時点

親が公開GitHub API/公開checkoutから読んだ値を本準備の事実として区別する。凍結設計にある当時の未観測記述を書き換えたり、この観測を設定変更権限と扱ったりしない。

| 対象 | 新時点の観測 |
|---|---|
| branch protection | requiredはtest、hygiene / hygiene、sds-gate（app 15368）、strict=false、enforce_admins=true。rulesetsは空 |
| 既存self caller/pin | sds-gate-self.ymlはpull_request_target/issue_comment、固定commit `4d314163f783b40c42ab5d0816cb2ebd48b5e2cd`。pinも同値 |
| 現行監査受領checker | 固定calleeと既存relayのGit blobが同一。SHA-256 `0fdf596fb024b335c1cc6eb5b0d68ebbe1e16da410c94fc74f79a5985e83c38d` |
| main CI | testはNode26/coverage80%、hygieneはNode22。設計/計画が要求する新U1の100%実測済みを意味しない |

設計監査の受付は対象headのtest/hygieneと対応ci.yml全体successを確認する既存経路。sds-gateの受領を用いる統合条件と区別し、先行監査前のsds-gate successを捏造したりrequiredから削除したりしない。CI完了・依頼投稿・preflight・返却・作者受領はこれから親が実対象で行う。

## Remaining Work

FD Minor R-01は未解消で、正しい共有契約E05=U2/U6→LLMテキスト対話を用いる。過去READY不足は実PR/現在集合で評価し、閾値前だけnonblocking、閾値後/再承認対象は不足ならFAIL。不足を架空READY・承認取消・日付改変で埋めない。

U1→U4指定順の正式runtime反映、Construction Verification Command、SEC-T項目同定/実測、実装/coverage/製品CI/固定版適用/後続受入は残る。同PRの独立設計監査PASS・必要Owner権限の前に製品編集を始めず、実装headには新CI/独立実装監査/作者受領/必要公開判断・R3/R4 exact-head/別suite-lead統合を要する。

