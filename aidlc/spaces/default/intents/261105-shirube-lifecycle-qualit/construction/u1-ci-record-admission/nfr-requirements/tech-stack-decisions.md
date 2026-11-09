# U1 — Tech Stack Decisions

## Sources and Scope

[確認済み要約](nfr-requirements-questions.md)、[functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)、[technology-stack](../../../../../codekb/shirube/technology-stack.md)を使用する。本書はNFR1.1/NFR1.2/NFR5.1/NFR8.1/NFR8.2/NFR10.1の主担当文書。既存選択の維持と後段の適合検証を記載し、新版/新製品の採択は行わない。

## Technology Selections and Rationale

| 項目 | 維持する選択 | 理由と限界 |
|---|---|---|
| 実行/ソース | 既存ESM、manifestのNode >=22、既存CLIのJSON/exit契約 | 現製品構造と共通契約を再利用。>=22全域で実測対応済みとはしない |
| 試験 | Node組込みnode:test/assert、TDD、適用実行コードの実分母100% | 既採択基準。分母/対象/除外/コマンド/結果を示し、80%/分母0/skipへ緩めない |
| 依存/配置 | 実行時npm依存なし。既存開発道具/lockfileと構造・依存・秘密検査を維持 | HTTP/DB/UI frameworkや新CLI/常駐serviceの必要はない。依存追加/アップグレードを今実行しない |
| 境界 | 既存shared-schemaと掲載view、1つの純粋判定核、形式だけのadapter | 意味/理由/閾値を重複させず、provider別の意味を作らない |
| 初回確認環境 | 現在の社内Codex/Mac/GitHub/GitHub Actions | LLM共通の意味を保ち、未検証CLI/環境まで対応を拡張しない |

## Detailed Requirements and Verification

| ID | 要件と合格条件 | 後段で必要な確認 |
|---|---|---|
| NFR1.1 | 核/掲載変換/読取adapter/既存entryの適用実行コードを列挙し、scriptsと適用srcを含む実分母で行網羅率100%を測る。Node組込みTDDの失敗→実装→合格を残す | 対象/分母/コマンド/結果、除外があればPR理由と独立確認。分母0/未測定/部分集合/skip/80%は不適合。実測はCode Generation/Build and Test、実CI接続は後続段/U4 |
| NFR1.2 | FD-T01〜20の正例/四負例/承認値/日付/出力破損/不能/循環防止を実際のassertへ結び、負例門exit1とtest runner成功を区別する | 核/adapter/既存entryを検証し、実PR読取→核→CI停止までのU1統合も確認する。fixture/文書だけで完成としない |
| NFR5.1 | 一つの純粋核へnow/ID/固定規則/観測を明示入力。同一・同義入力は同じ意味/理由/結果となり、実bytes変更は不一致になる | FD-T04/18。核でI/O/時計/乱数/UUIDを取得せず、desiredをobservedへ転記しない。集合digest/固定subsetの正本はBR4.1/4.2 |
| NFR8.1 | 検査版/規則版/schema/入力対象/実行環境を特定し、固定版のclean checkoutで必要な確認を再実行できる | 実測版の記録と旧証拠の対象照合。宣言だけで互換済みにせず、PR自身がcheckerを弱められない接続はU4と連携する |
| NFR8.2 | 共通/掲載schemaは既存majorを維持し、未知major/criticalを拒否。任意説明は既存extensions契約だけに限定する | FD-T17。意味の変更が必要なら新旧同居/試験した逆向き/該当Owner判断を要し、黙って破壊的変更やnullable化をしない |
| NFR10.1 | 既存ESM/Node宣言/Node組込み試験/実行時npm依存なし/構造・依存・秘密検査と既存JSON/exit契約を保持する | 実対象で既存検査を行い、採択されたsource構造等の制約を維持する。退役PR/own-code予算や旧判定4・5を復活させない |

四条件の集約/理由code/kind別肯定値/READY cutoff/manifest計算/完全assessmentはFDの正本を参照する。NFR文書で別の意味を再定義しない。完全assessment/残件/scopeの輸送は[observability-requirements](observability-requirements.md)、早期失敗と失敗伝播は[reliability-requirements](reliability-requirements.md)、最小権限/公開除外は[security-requirements](security-requirements.md)へ対応する。

## Brownfield Baseline and Compatibility Limits

technology-stackの観測対象rootはHEAD `62ff73db52ce8f29f3b982507b5d2e36578ae60f`、公開mainは`7e775afd5b755e51e55e269d8dc35b09d180c33e`であり、合算して完成扱いにしない。

- rootのmanifestはNode >=22、当時のroot CIは22。公開mainの当時CIはNode26/coverage80%であり、現行100%要件の適合証拠ではない。
- RE記録上、ESLintは22系なら22.13.0以降、knipは22系なら22.12.0以降を宣言する。これは当該baselineの依存条件であり、現在runner/lockfileの動作測定や新patch採択ではない。後段で実際の対象版と道具の適合を検証する。
- main相当のengine-judge/approval-record/record-compareは再利用候補の有効部分だけを検討する。Claude/Bun前提・identityCheck:none・配列内容比較のみという限界を消さず、そのままCodex/4条件対応済みとしない。
- Git/gh/runner等の未測定版を対応済みとせず、必要な実環境情報を後段で記録する。自動update、依存導入、別CLIの保証をこの段の承認へ含めない。

## Traceability and Ownership

本段の全詳細IDの定義は主担当文書に一度だけ置く。

| 主担当文書 | 定義する詳細ID |
|---|---|
| performance-requirements | NFR6.1 |
| security-requirements | NFR2.1、NFR2.2、NFR2.3、NFR3.1、NFR3.2 |
| scalability-requirements | NFR4.2 |
| reliability-requirements | NFR4.1、NFR6.2、NFR10.2 |
| observability-requirements | NFR5.2、NFR9.1、NFR9.2 |
| 本書 | NFR1.1、NFR1.2、NFR5.1、NFR8.1、NFR8.2、NFR10.1 |

traceability.jsonは全10親NFRを列挙する。NFR7だけは副作用のない読取/判定出力のため非適用とし、効果の冪等性はU3/U5に残す。他9親は上記19詳細IDへ追跡する。7単位/7辺/既存entity所有を変えない。新DB/表/migrationは作らずDB別intent/担当/保留を保持する。

## Standards and Delivery Constraints

S1〜S9の既定/例外/report-onlyと採択済み安全/実装規約を維持する。SEC-Tと依存追加前の脆弱性確認、公開の架空入力、1単位1PR、該当4分類の同PR設計head独立監査PASS後CodeGen、新実装headのCI/独立監査/作者受領/必要公開判断/別担当統合、前単位統合後の次CodeGenを保持する。本段の文書生成がコード/設定/保護対象変更を許可するわけではない。

FD上流Minor R-01のE05誤記は未解消のまま、共有契約を優先する。正しいE05はU2/U6のLLMテキスト対話。Owner指定順のruntime反映未成立も[reliability-requirements](reliability-requirements.md)の既存残件として保持する。

## Assumptions & Open Questions

None.

新たな技術選択/Owner判断はない。製品試験、coverage、性能、SEC-T、実CI、実環境の適合、U5/U7の実受渡しはまだ確認していない。
