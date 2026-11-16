# Shirube ベース機能 — 構想段階の決定と引継ぎの一覧

## Sources and Authority

これは本取り組みの回答・承認済み成果物を追跡する一覧であり、GitHub の公開決定を置き換える権限記録ではない。本段の今回の要約は [approval-handoff-questions.md](approval-handoff-questions.md) で Looks correct と確認済み。要約の確認・段の承認・実装計画・製品の受入は区別し、実際の判断は AI-DLC の正式な記録で確認する。

入力: [intent-statement.md](../intent-capture/intent-statement.md)、[stakeholder-map.md](../intent-capture/stakeholder-map.md)、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)、[team-assessment.md](../team-formation/team-assessment.md)、[wireframes.md](../rough-mockups/wireframes.md)。回答原文・選択肢は、以下に示す各段の questions file を正本とする。公開決定を根拠に保護対象の操作を行う際は、その本文の URL と SHA-256 を照合する。この一覧に記載しただけで権限を増やさない。

## Recorded Decisions

| ID | 決まっている内容 | 記録の出典 | 状態・適用限界 |
|---|---|---|---|
| AH-01 | 導入・設定の対話・明示的な開始・開発中の確認・ゴール・継続開発を製品の対象とする | [intent-capture-questions.md](../intent-capture/intent-capture-questions.md) Q1、intent-statement.md | Intent Capture 承認済み。既存製品が完成済みという意味ではない |
| AH-02 | 採択済みの技術・セキュリティ規格を維持・向上し、社内で統一する | intent-capture-questions.md Q2、scope-document.md「今回の維持と向上」 | 規格の値を緩めたり、新しい規格を独断で採択したりしない |
| AH-03 | 最初は Shirube 自身で実証し、その結果を他 repo への拡張につなぐ | intent-capture-questions.md Q3 | 他 repo の担当・保留・導入承認を解除しない |
| AH-04 | 初回のゴールに加え、実際の追加変更も同じ規格・監査・試験で次のゴールへ通す | intent-capture-questions.md Q4、IC-S1〜IC-S3 | 手順書・部品・初回だけの結果では完成にならない |
| AH-05 | 最初の実証は現在の社内体制と Codex CLI・Mac・GitHub・GitHub Actions を使う | [feasibility-questions.md](../feasibility/feasibility-questions.md) Q1 | 固有の追加環境・条件の指定なし。新しい費用・契約・資格情報変更を許可しない |
| AH-06 | F-01〜F-06 の検証を条件とし、実証に向けて具体化する | feasibility-assessment.md、constraint-register.md、[raid-log.md](../feasibility/raid-log.md) | Feasibility 承認済み。リスク解消・実装完了・受入済みとは区別する |
| AH-07 | M-01〜M-13 は必須。まず端から端まで通る最小の流れを優先する | [scope-definition-questions.md](../scope-definition/scope-definition-questions.md) Q1〜Q4、scope-document.md、intent-backlog.md BL-01〜BL-10 | 更新した Scope Definition 承認済み。BL は正式な unit・依存関係・実装順ではない |
| AH-08 | AUN 以外の他 repo の実導入・一斉展開、他 CLI の動作保証、新規の社内規格そのものの策定・採択は初版から外す | scope-definition-questions.md Q1・Q4、scope-document.md W-01〜W-03 | Q4=B により AUN だけ実配布を今回に含める。既存規格への適合不足を補う M-06 は対象内 |
| AH-09 | 今回の向上は不足する接続・機械検査・証拠と、正例・負例・実利用の検証を整備する成果で確認する | scope-definition-questions.md Q1、scope-document.md | 現状80%と社内100%の差を含めて解消・検証する。必要な保護対象の承認を保つ |
| AH-10 | 入口は LLM との対話。Codex 専用にせず、観測できたことを再質問せず、不足だけを聞く | [rough-mockups-questions.md](../rough-mockups/rough-mockups-questions.md) Q1、wireframes.md、[user-flow.md](../rough-mockups/user-flow.md) | Rough Mockups 承認済み。他環境の動作は個別の実証前に保証しない |
| AH-11 | 導入・設定の確認と開発の開始を分け、明示的な開始で AI-DLC の実際の対象・段へつなぐ | scope-document.md M-03、wireframes.md V-03・V-04 | 設定回答を後の段・保護対象の承認へ流用せず、独自の重複した承認を足さない |
| AH-12 | 失敗・観測不能・人待ちを成功とせず、履歴を保って停止・再開する | scope-document.md M-05・M-07、wireframes.md V-05・V-06 | 中断・再実行・二重効果の負例を後続で実証する |
| AH-13 | 既存の履歴・担当・保護対象の承認条件と、DB 側の承認済み範囲を保持する | scope-definition-questions.md Q1、constraint-register.md C-05〜C-10・C-14 | DB 側の承認をベースの実装承認に流用しない。承認済み計画と担当範囲から実装する |
| AH-14 | 公開 repo の試験には架空データだけを使い、秘密・実データ・非公開記録を入れない | feasibility-questions.md の引継ぎ・確認済み要約、constraint-register.md C-04 | fixture・ログ・出力・対話を含め、後続の実装・試験で確認する |
| AH-15 | 記録を元の作業場で保持し、対象単位の PR に必要な成果物を含め、独立監査・受領・作者以外の統合へ渡す | approval-handoff-questions.md の確認済み要約、constraint-register.md C-06・C-09 | 実際の公開・受領を未観測のまま済んだと記さない。履歴移送を実装開始の前提にしない |
| AH-16 | 段の現在の成果物に対応する見直し役の READY を機械で確認する | scope-document.md M-09、intent-backlog.md BL-06、scope-definition-questions.md 追加要求1 | READY の文字・古い記録・別対象・未確認を合格にしない。見直し役がない段などの適用条件を後続で明示する |
| AH-17 | DB の構造・権限・契約・セキュリティに触れる単位は、同じ PR の設計だけの head を独立監査してから実装を加える | scope-definition-questions.md Q3=A、scope-document.md M-10、BL-07 | 実装監査・作者の受領・統合・必要な Owner の承認を維持する。Rough Mockups の R-01 は表現の改善として残り、後続要件で4分類を明記する |
| AH-18 | 単位の PR に必要な AI-DLC の記録と承認の記録を含め、CI で traceability・upstream-coverage を再実行する。センサー設定を配布しずれを検出する | scope-document.md M-11・M-12、BL-08・BL-09 | audit/・.aidlc-engine/ は PR から除く。席の自己申告で通さず、不合格・未実行・実行不能で止める。検査の正本・版・実行条件は後続で特定 |
| AH-19 | AUN へ実配布し、対象 PR の正例・負例・設定のずれを実証する | scope-definition-questions.md Q4=B、scope-document.md M-13、BL-10 | 準備・適用・検証を区別。既存担当・保留・承認を保持し、Shirube 側の成功だけで代用しない。非公開記録を公開へ写さない |
| AH-20 | 旧取り組みの有効な残作業を移管し、完成済みの成果と履歴を保持して旧取り組みを archive する | scope-definition-questions.md Q2=A、[legacy-work-transfer.md](../scope-definition/legacy-work-transfer.md)、team-assessment.md | archive 実施済み。旧取り組みの成功・移管先の完成とは別。旧 U5 の道筋受付、判定4・5を再開しない |
| AH-21 | 親はコードを書かず設計・進捗・品質・受入を管理。最大3体を仕事量・依存・承認範囲に合わせ可変配分する | [team-formation-questions.md](../team-formation/team-formation-questions.md) の Owner 原文・確認済み要約、team-assessment.md、[mob-composition.md](../team-formation/mob-composition.md) | Team Formation 承認済み。モデルは親と同じものを継承、段の見直し役は同時1体。人数の計画は起動済み・実装済み・追加作業の承認ではない |

今回の4項目と段の見直し役の公開根拠: control_source_ref.url = https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 ; control_source_ref.sha256 = `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462`。LLM を機械で制御する要求の根拠: control_source_ref.url = https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6380845765 ; control_source_ref.sha256 = `5cd75b9904c7cb8a229ba8be55d417d2c56af2eb920ef7f94875c9689fa45501`。この引用を、個別の workflow・必須検査・保護設定・資格情報などの変更の一括許可にしない。

AH の ID は、この文書内で参照するための項目番号であり、新しい工程・役割・権限・状態ではない。

## Omitted Stages

市場調査は社内実証の取り組みとして省略済み。Team Formation は更新した体制で実行・承認済みであり、省略したと扱わない。担当の実際の余力・技能・受領、追加予算の確約を未観測のまま記録しない。

## Deferred Details and Verification

| 後続で確定・検証すること | 引継ぎ先 | 元の範囲・課題 |
|---|---|---|
| 現行の実装と main の再確認、再利用箇所、自己導入・接続・証拠収集の不足 | Reverse Engineering、Requirements Analysis、設計 | F-01〜F-03、I-01〜I-03・I-06 |
| 規格の集合・項目・版・出典・適用対象・合否・証拠。100%基準への対応 | Requirements Analysis、非機能の要件・設計、実装と試験・CI | M-06、F-04、I-04。I-05 の除外範囲と向上の意味は Scope で具体化済み、項目別の検証条件は未確定 |
| 初回と実際の追加変更の具体的な差分・受入条件・実証方法 | Requirements Analysis、User Stories、Delivery Planning、実装・運用 | IC-S1〜IC-S3、F-05 |
| 正式な unit・依存関係・契約・実装基準 commit・所有範囲と実装計画 | Units Generation、Contract Design、Delivery Planning、Code Generation | BL-01〜BL-10、C-06・C-07・C-10・C-14 |
| 人待ち・観測不能・失敗・再実行・停止と再開の正例・負例 | 要件・設計・実装と試験・運用 | M-05・M-07、F-06、R-07 |
| 正式な READY・設計監査・承認と対象成果物の対応、変更時の再確認条件、見直し役が設定されていない段の扱い | 既存実装の分析、Requirements Analysis、Contract Design、各設計 | M-09〜M-11、BL-06〜BL-08。追加分の実現性は未実証 |
| PR 側から弱められない CI の検査の正本・版・実行条件と最小権限、設定の配布・比較 | Requirements Analysis、Contract Design、NFR・Infrastructure Design、実装・CI | M-12、BL-09。不合格・未実行・実行不能を成功にしない |
| AUN の対象・担当・保留・必要な承認・受渡し、公開可能な証拠と実際の PR の検証方法 | 要件・契約・設計、Delivery Planning、配布と運用 | M-13、BL-10。準備だけでは未達 |

## Future Consideration

Owner が相談した「単位ごとの設計・実装を保ち、実装中に次の単位の設計3.1〜3.4だけを先行する制御」は、将来検討のメモとして保持する。現在の範囲・設定・実装計画へ追加せず、その相談を追加の開発・委任の承認と扱わない。メモの記憶 ID は `004626be-88c5-486d-a9a4-913730f3ea7c`（project: ai-dev-framework）。これは検索のための参照であり、権限の記録ではない。

## Assumptions & Open Questions

新しい仮定は追加しない。A-01（既存資産の再利用）と A-02（指定環境での実証）は未検証として保持する。本段の最終承認、実装計画、実物での受入、保護対象の公開決定は、それぞれ必要な時点で確認する。
