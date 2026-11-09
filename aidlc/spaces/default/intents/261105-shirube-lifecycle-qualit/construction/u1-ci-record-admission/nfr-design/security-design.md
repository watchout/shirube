# U1 — Security Design

## Sources and Scope

[確認済み計画](nfr-design-questions.md)、[security-requirements](../nfr-requirements/security-requirements.md)、[functional-spec](../functional-design/functional-spec.md)、[FD規則](../functional-design/rules.md)、[共通契約](../../../inception/contract-design/contract-summary.md)を使用する。本書がSOL2を定義する。単一判定核/権限非保証は[logical-components](logical-components.md)のSOL3、完全結果は[observability-design](observability-design.md)のSOL7を参照する。

## SOL2 — 公開viewの境界検査

**対応:** NFR2.1、NFR2.2、NFR3.1、NFR3.2。**責任:** EvidenceCollectionの読取/掲載変換と、その公開入力境界。

| 順序/制御点 | 具体的な方法 | 失敗時 |
|---|---|---|
| 読取資格情報の受渡し | metadataを読む周辺だけへread-only資格情報を渡す。純粋核は資格情報を受けず、test/汎用buildへwrite資格情報を渡さない | 拒否された取得は不能、外部変更0。より強い資格情報を求めて成功に変えない |
| 入力量/形式 | SOL1の応答上限を受け、構造検査で完全なJSON・版・型を確認する。必須1件の不正でも止める | 過大/部分/破損/未知major・criticalは構造拒否。無言の切捨て/skipなし |
| 重複key | objectごとのkeyを、JSON escapeを解釈した名前で照合し、同じobject内の重複を上書き前に拒否する。別objectの同名keyとは区別する | 通常parse後に値だけ比較して見逃さない。既存処理の適合確認または後段実装を要し、新parser依存は追加しない |
| 公開形状/意味 | 既存schemaの必須/enum/対象/refとallowlistを検査する。任意説明は既存extensionsだけ。recordRefは公開論理参照でprivate path/bodyを含めない | private raw log/receipt、人返信、秘密、生review bodyを投影/診断へ出さない |
| path | 実Git treeのpath bytesを用い、危険なsegment/絶対path/別表記重複/境界外symlink/submodule参照を拒否する | 境界外を辿らず対象外読書き0。未対応の実体を通常fileとして成功にしない |
| 値の使用/表示 | 文字列をデータとして扱い、外部値をshell/markup命令へ変換しない。表示のescapingをhash前の内容正規化へ流用しない | 生入力を原因文へechoしない。既存理由codeと公開可能な対象参照を使用 |

JSONのkey escape解釈と、値としてのGit pathのUnicode/raw bytes保持は別処理である。新規schema framework/汎用入力言語は設計しない。掲載前のnative形式変換は既存権限内で行い、公開kind/choice/target/attempt/ref/内容対応をCIで検査する。変換元のprivate fields全てを公開必須にしない。

## Authentication, Authorization and Data Protection

engine発行元/Owner本人/実review実施の真正性は非保証。actor値/同UID file/任意JSON/URL存在を認証へ変換せず、新host/producer/署名鍵/外部供給者を作らない。既存devauditorのPR独立監査が記録を読む補完を保持し、暗号的本人証明と呼ばない。

BR2のkind別canonical肯定だけを採用し、否定/空/未知/誤kind/一般質問/plan off/skipped/自動完了を人承認にしない。BR3の固定日付/READY/legacy/再開・再承認、BR5の同PR設計head/独立監査/失効、BR6.1/BR9.1の公開Owner権限条件はそれぞれ既存正本で照合する。4条件PASSが進行/merge/保護対象変更の許可になる設計にしない。

## Verification and Infrastructure Handoff

FD-T09〜11/17/18を用い、重複key（escape別表記も含む）、不正形式/未知critical、悪意path/文字列、架空機密入力、権限拒否で停止・秘密転記0・対象外読書き0を確認する。掲載変換の架空単体入力とCIの架空public viewは別に試す。SEC-Tの適用項目/結果、依存追加前の脆弱性確認を後段で残す。実行時npm依存なしとS1〜S9の既定/例外/report-onlyを維持する。

Infrastructure Designへは、metadata読取とtest/buildの資格情報分離、信頼版の核とPR入力の分離、private原本をCIへ渡さないことを具体制約として渡す。実job/file/保護設定を本書で変更しない。実装/製品試験/SEC-T/実CIは未実施。

## Upstream Provenance

FD W06のE05誤記は未解消の上流Minor R-01のまま保持する。正しいE05はU2/U6→LLMテキスト対話。独立監査/公開判断はE01等の公開原文読取とBR6.1/BR9.1の別条件であり、E05へ移さない。旧componentsの真正性条件は後の採択契約に従い、凍結上流を書き換えない。

## Assumptions & Open Questions

None.

新たな認証方式/権限制度を要求しない。既存機械整合の範囲を超える真正性を実装済みとはしない。
