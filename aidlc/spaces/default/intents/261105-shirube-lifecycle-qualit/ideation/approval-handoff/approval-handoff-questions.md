# Shirube ベース機能 — 構想の引継ぎ確認

## 入力と回答済み事項

この段は、前段で確認した内容を initiative-brief.md と decision-log.md に集約する。製品像・範囲・実証環境・対話の入口を再質問しない。以下の出典は本取り組み内の回答と承認済み成果物であり、保護対象の変更を許可する公開決定の代わりにしない。

| 確認する話題 | 引き継ぐ内容 | 回答・成果物の出典 |
|---|---|---|
| 目的と完成の範囲 | Shirube 自身で導入から初回のゴール、実際の追加変更のゴールまで通す。規格・監査・試験を双方で保つ | [intent-capture-questions.md](../intent-capture/intent-capture-questions.md) Q1〜Q4、[intent-statement.md](../intent-capture/intent-statement.md) IC-S1〜IC-S3、[stakeholder-map.md](../intent-capture/stakeholder-map.md) |
| 社内実証と既存の担当 | 現在の社内体制、Codex CLI・Mac・GitHub・GitHub Actions を使う。新しいチーム・追加環境・有償契約の指定はない。既存の担当範囲と承認条件を保持する | [feasibility-questions.md](../feasibility/feasibility-questions.md) Q1、[scope-document.md](../scope-definition/scope-document.md)、[constraint-register.md](../feasibility/constraint-register.md) C-01・C-06〜C-09・C-14 |
| 実現性とリスク | 条件付きで実現可能。自己導入・現在の AI-DLC への接続・証拠収集・現行規格への適合・初回と追加変更・停止と再開は、まだ実証していない | [feasibility-assessment.md](../feasibility/feasibility-assessment.md) F-01〜F-06、[raid-log.md](../feasibility/raid-log.md) R-01〜R-09。実証へ向けた具体化の承認を引き継ぎ、リスクが解消済みとは記さない |
| 範囲と優先する価値 | M-01〜M-13 は全て必須。最小の流れを先に実証する。4つの機械的な確認と AUN の実配布・実際の PR の正例・負例を含む。AUN 以外への展開、他 CLI の動作保証、新規の社内規格の採択は対象外。DB 固有の範囲は別に保持する | [scope-definition-questions.md](../scope-definition/scope-definition-questions.md) Q1〜Q4、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md) BL-01〜BL-10 |
| 体制と実際の着手条件 | 親は製品・試験コードを書かず、設計・進捗・品質・受入を管理する。配下は承認された作業を最大3体まで可変に配分し、モデルは親と同じものを継承する。見直し役は同時1体。実装は必要な段・実装計画・所有範囲が揃ったものから渡す | [team-assessment.md](../team-formation/team-assessment.md)、[mob-composition.md](../team-formation/mob-composition.md)、[team-formation-questions.md](../team-formation/team-formation-questions.md)。担当名・人数の設定を稼働・技能・追加委任の証拠にしない |
| 設計と承認の機械的な確認 | 現在の対象に対応する見直し役の READY、DB の構造・権限・契約・セキュリティに触れる単位の実装前の設計監査、単位 PR の記録・承認、CI での traceability・upstream-coverage の再実行とセンサー設定の配布・ずれの検出を含む。設計監査後に同じ PR へ実装を追加する | scope-document.md M-09〜M-12、scope-definition-questions.md Q3=A。内部の audit/ と .aidlc-engine/ は PR から除く。古い判定4・5は使わない |
| 実現性の追加分 | F-01〜F-06 の評価だけで、追加した CI 再実行・見直しや承認の真正な対応付け・AUN の実適用まで実証済みとはしない。既存実装の分析、要件・契約・設計で成立条件と検証を具体化する | scope-document.md「初版全体の完了条件」、intent-backlog.md BL-06〜BL-10。成立しない条件や範囲変更が必要なら差と影響を示して判断を受ける |
| 旧取り組みと将来の相談 | 旧取り組みは archive 済み。有効な残作業は今回へ対応付け、完成済みの成果と履歴を保全する。単位ごとの実装を保った設計3.1〜3.4の先行制御は、将来検討の相談メモとして保持し、今回の範囲・設定へ追加しない | [legacy-work-transfer.md](../scope-definition/legacy-work-transfer.md)、team-assessment.md、Owner の今回の相談。旧取り組みの成功・移管先の完成・設定変更済みと扱わない |
| 共通の製品像と個別環境の実証 | 入口は LLM との対話であり Codex 専用にしない。初回の Codex 環境での実証を他環境の動作保証に流用しない | [rough-mockups-questions.md](../rough-mockups/rough-mockups-questions.md) Q1 と要約、[wireframes.md](../rough-mockups/wireframes.md)、[user-flow.md](../rough-mockups/user-flow.md) |
| 関係者への共有と権限 | Owner が製品と段の判断を行う。AI-DLC の記録を元の作業場に保持し、対象単位の PR に必要な成果物を含め、独立監査・作者の受領・作者以外の統合につなぐ。保護対象の決定は公開された原本で確認する | stakeholder-map.md、constraint-register.md C-05〜C-10、適用中の team の Way of Working。関係者の受領や GitHub への掲載を未観測のまま済んだとは記さない |

市場調査は省略済み。Team Formation は更新後の体制で承認済みであり、省略したと扱わない。新しい人員・予算の確約を捏造しない。後続で追加の環境・費用・人員・範囲変更が必要になれば、その具体的な差と判断を示す。

## 更新前の範囲で確認した要約（履歴）

- 製品は LLM との対話を入口に、導入・設定・明示的な開始・AI-DLC に沿った開発と Shirube の確認・最初のゴール・実際の追加変更のゴールまで扱う。初回の実証は Shirube 自身と現在の社内の Codex CLI・Mac・GitHub・GitHub Actions を使う。他環境の動作保証は個別の実証後に扱う。
- M-01〜M-08 を必須のまま保持し、まず端から端まで通る最小の流れを優先する。技術・セキュリティ規格、行網羅率100%、独立監査、必要な承認は最初の変更から適用する。他リポジトリへの実導入・一斉展開、新しい社内規格そのものの採択は今回の対象外とする。
- 安全な自己導入、AI-DLC への接続、実際の証拠の収集、規格への適合、初回と追加変更の完走、停止と再開の検証は未完了として引き継ぐ。要件・受入条件・設計・試験に対応付け、文書や部品の存在だけで実証済みとしない。
- 既存の担当・承認履歴・DB 側の承認済み範囲を保持する。公開 repo の試験には架空データだけを使う。記録は元の作業場で保持し、PR に必要な成果物を含めて監査へ渡す。保護対象の決定・独立監査・作者の受領・作者以外の統合を省略しない。
- 今回は構想を要件・設計へ引き継ぐための集約であり、製品の実装・実証が完成したとは記さない。正式な unit・依存関係・実装計画・具体的なゴールと検証方法は後続で確定し、承認済み計画の範囲から実装する。追加の費用・環境・人員の確約を作らない。

この内容で、構想の引継ぎ文書と決定の一覧を作成してよいですか？

- Looks correct
- Request changes

[Answer]: Looks correct

## 今回の引継ぎで保持する注意点

Rough Mockups の軽微な指摘 R-01 は、説明上の「保護対象」を M-10 の DB の構造・権限・契約・セキュリティの4分類と明記する改善である。前段は指摘を残したまま承認された。その事実を保持し、後続の要件では4分類を明記し、workflow・料金などに必要な Owner の承認条件と混同しない。前段の文書をこの段から黙って書き換えたり、指摘を修正済みと扱ったりしない。

Owner は md ファイルを読めないため、判断に必要な内容はこの会話で具体的に説明する。出典のファイル参照だけを説明の代わりにしない。今回、新たに決める製品条件はなく、回答済みの製品像・範囲・体制を再質問しない。

## Consolidated Summary Confirmation

- LLM との対話による導入・設定、明示的な開始、AI-DLC に沿った開発、最初のゴール、実際の追加変更による次のゴールまでを実現する。初回は Shirube 自身と社内の Codex CLI・Mac・GitHub・GitHub Actions で実証し、製品の共通の入口は Codex 専用にしない。
- 承認済みの13項目を必須とし、最小の流れを先に実物で通す。段に対応する見直し役の READY、DB の構造・権限・契約・セキュリティに触れる設計の実装前の独立監査、PR 内の必要な記録・承認、CI の再検査とセンサー設定の配布・ずれの検出を機械で守らせる。設計だけの変更を監査した後、同じ PR に実装を追加する。
- AUN への実配布と、実際の PR で通る例・止まる例・設定のずれの検証を含む。配布の準備・適用・検証は区別し、既存の担当・保留・必要な承認を保持する。AUN 以外への一斉展開、未検証の他 CLI の動作保証、新しい社内規格の採択は含めない。
- 採択済みの技術・セキュリティ規格、TDD、行網羅率100%、適用される安全の試験、独立監査・作者の受領・別の席による統合を維持する。公開する試験データは架空のものだけとし、実データ・秘密・AUN の非公開記録を入れない。audit/ と .aidlc-engine/ を PR に含めず、廃止した判定4・5を復活させない。
- 親はコードを書かず、設計・進捗・品質・受入を管理する。承認された対象作業を最大3体まで、作業量と依存関係に応じて配分する。DB 側の範囲・記録は別に保持し、旧取り組みの有効な残作業と既存成果を引き継ぐ。設計3.1〜3.4の先行制御は将来検討のメモとし、今回へ自動追加しない。
- 自己導入、現在の AI-DLC との接続、証拠の収集、規格への適合、CI の再検査、AUN の実適用は未実証として引き継ぐ。次の既存実装の分析から再利用箇所と不足を確かめ、要件・設計・正式な単位・実装計画・試験を具体化する。今回の確認を製品の完成や保護対象の変更の一括許可とは扱わない。

この内容で、構想の引継ぎ文書と決定の一覧を更新してよいですか？

- Looks correct
- Request changes

[Answer]: Looks correct
