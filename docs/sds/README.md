# SDS-V2 — 小さな実機能を完成まで導く開発規格

状態: **SDS-V2への命名・実践の取り込み・適用はOwner指示済み。本改訂本文の独立監査・main統合・利用元の版切替は未完。** 規格があることと、実案件を完成できたことは別に観測する。
Owner原文「では、これを取り込んでSDS-V2とネーミングして適用しましょう」のcontrol_source_ref: https://github.com/watchout/shirube/issues/6#issuecomment-6027721133 / 本文SHA-256 `d6f826a9e8ff3407b411d4eabcf4a778a55ae015454e69027ef2694484385a05`。
改訂前のAI-DLC基盤SDSは採択済み: https://github.com/watchout/shirube/issues/6#issuecomment-5927903682 / 本文SHA-256 `0623bba1351ec351c239790e1a76afddc0d04a19f5086b77a2f3eaa8495f53c6`、統合版 `3b9f5c8e8f22a98374f1929ea8bcff8e084dab3b`。旧本文の「候補」は作成時の状態。下記F01〜F10/64項目の処置履歴まで今回の独立PASSに置き換えない。

SDS-V2の最優先は、目的・完了条件に沿って実作業を進め、不足を是正し、統合した実物の利用まで導くこと。記録は判断・継続・復旧を支える。具体例/必要な試作で意味を確認し、実行できる試験を先に用意して実装・修正し、独立監査と実環境受入へつなぐ。[実施手順](../process/ai-dlc.md)§2/4/6〜8が実行方法の正本。
正本は既存のこの入口・従属文書を更新する。別の`SDS-V2`本文コピーやキットを作らない。名称は規格の世代であり、製品/package版、要求ID、監査JSONのschemaを改名しない。最新の監査・採択・統合済み版はmainで解決し、利用元は公開判断に結ぶcommitを固定する。候補branchを自動追随させない。

更新依頼: https://github.com/watchout/shirube/issues/6#issuecomment-5922221959 / 本文 SHA-256 `860492462b3eb5f990184c0031dbd2229e14a425ca01a67b4150e15f05874fa5`。
別キットの撤回: https://github.com/watchout/shirube/issues/6#issuecomment-5921805227 / 本文 SHA-256 `7802c88e0b67fabeb20b26985dd67486239b1f1732bbfdefefa859d976f1dc63`。Shirube 本体が入口で、別キットは再作成しない。

## 正本と改訂の範囲

- 開発の入口は[AI-DLC実施手順](../process/ai-dlc.md)。[原典選定・補完の正本](lifecycle-basis.md)に依頼原文・公開根拠・比較・適用差分、[source lock](source-lock.json)に取得版を集約。
- [P1〜P12 / T1〜T11][baseline]: baseline v10 改訂案。採択済みv7と未採択の後継を区別。既存IDは保持し、実施手順への対応は原典正本§5を参照する。
- [監査方法][audit]: AI-DLC一体系を主軸に機械/独立LLM/人の担当を固定。既存保護と対象別IDを継承し、[旧原典対応表][sources]は後継への参照にする。
- [runtime policy 改訂案][policy]と[公開決定の索引][owner-index]: リスク別深度・権限・独立性・証拠の扱い。
- [S1〜S9 改訂本文](engineering-standards.md): 旧 rules snapshot を継承した版管理原稿。
- [道具と受入 ID][handover]: W1〜W6 / K1 / RR / DS / OR。規範の意味は上記正本を参照し、道具を新規の規範と数えない。

この入口は下記64項目の出所と処置を解決する参照表。規範本文をここへ重複転記しない。本文の物理的な全集約は未完で、arc/org の既存正本を今回の commit に固定する。採択時はこの参照版を更新し、利用元の profile と配布物を同じ採択版へ切り替える。ローカル rules と generated managed block を先に編集しない。
旧 org PR#4 の S1〜S9 候補とはこの改訂を照合してから採択する。org 改訂は既存 PR#6 の上に積んだ差分であり、その採否も独立に確認する。

## 10件の指摘の反映先

全行は作者による「反映済み候補」の対応であり、独立監査の PASS ではない。

| 指摘 | 改訂した本文・実装 | 確認方法と残る適用確認 |
|---|---|---|
| F01 判定矛盾 | [監査 §2][audit]、policy Evidence Rules、S1〜S9 冒頭 | 全軸の重大未達/UNKNOWN/例外条件を独立に読み合わせる |
| F02 適用度過大 | [測定 script][measure]、[回帰試験][tests]、監査 §3/5、W2/W4 | N1〜N4を含む9試験PASS。配置観測のみ。実効性の証拠結合はW2/W4、定期公開への反映は未実施 |
| F03 AI信頼境界 | baseline P12/T2/T3、policy Memory Partition、S9 | 旧 governance §8/§11.2–3との継承確認。製品の攻撃拒否・外部効果0は別途実測 |
| F04 依存・脆弱性 | baseline P7/T6/T10、S9 | 既存scan/waiver/runbookへ接続。製品の導入・復旧試験は未実施 |
| F05 リスク比例 | baseline P3、監査 §2、policy、残件表 G1/DS、templates | 軽微変更の重複文書を除き保護面のgateを保持。今回の独立監査は省略しない |
| F06 検証の対応 | baseline P2/P5、監査 §3/5、W2、templates | 多対多・採択全ID・重要不変条件・親自身の受入・隔離負例を読み合わせる |
| F07 AI受入 | baseline T5/T9、policy Memory Partition、technical-design、S4 | AI搭載製品の評価契約を補完。製品別閾値の採択/実測は未実施 |
| F08 過大制約 | S1/S2/S5/S6 | 引退列・3例・cache・downを不変条件へ訂正。製品別のDB試験は未実施 |
| F09 正本の重複 | 原典対応表、PR雛形、適用表、索引、本入口 | 64IDを維持。6軸の対応/17repo/旧称を訂正。参照統合と物理集約は区別 |
| F10 改善の根拠 | baseline P9、監査 §5、owner-fit-check | 既存PDCAへ負担・リスク・誤拒否/流出/負例検出を接続。速度効果は未測定 |

## 64項目の処置と参照

入力は独立監査 `reports/2026-10-01-sds-sufficiency/audit.md`（SHA-256 `c2b2247a361d4f2eaef6fe0d23a9a5e3614c68ccb3563398ee86f964381148ea`）と `ledger.md`（`44158c2a6884cbc8aaefbb34e398201c361c0767c79d6a153f506507dcb765f3`）。監査対象 digest は `13827e0afc10ba478081f4a49e939e4f23119dea0dcf021666a2f060d4e89ada`。
64 は規範・道具・索引を含む追跡母集団で、等重みの64安全条件や適合率ではない。維持18／統合18／補強14／条件化9／修正5。適用条件・判定は参照先の該当 ID/節を使う。
下表の処置区分は前段F01〜F10への対応履歴。今回の原典入替は同じP/T IDに原典正本§5の対応を重ね、既存受入・保護を削らない。

| ID（監査と同じ） | 処置 | 正本の該当行・節 | 指摘 |
|---|---|---|---|
| P1 | 維持 | [工程の型の当該行][baseline] | F10 |
| P2 | 補強 | [工程の型の当該行][baseline] | F06 |
| P3 | 条件化 | [工程の型の当該行][baseline] | F05 |
| P4 | 条件化 | [工程の型の当該行][baseline] | F05 |
| P5 | 補強 | [工程の型の当該行][baseline] | F06 |
| P6 | 補強 | [工程の型の当該行][baseline] | F01 |
| P7 | 補強 | [工程の型の当該行][baseline] | F04 |
| P8 | 補強 | [工程の型の当該行][baseline] | F04 |
| P9 | 補強 | [工程の型の当該行][baseline] | F10 |
| P10 | 補強 | [工程の型の当該行][baseline] | F03,F04 |
| P11 | 統合 | [工程の型の当該行][baseline] | F09 |
| P12 | 補強 | [工程の型の当該行][baseline] | F03 |
| T1 | 条件化 | [技術分類の当該行][baseline] | F08 |
| T2 | 条件化 | [技術分類の当該行][baseline] | F03,F04 |
| T3 | 条件化 | [技術分類の当該行][baseline] | F06 |
| T4 | 条件化 | [技術分類の当該行][baseline] | F05 |
| T5 | 補強 | [技術分類の当該行][baseline] | F07 |
| T6 | 補強 | [技術分類の当該行][baseline] | F03,F04,F07 |
| T7 | 統合 | [技術分類の当該行][baseline] | F10 |
| T8 | 条件化 | [技術分類の当該行][baseline] | F05 |
| T9 | 補強 | [技術分類の当該行][baseline] | F03,F07 |
| T10 | 統合 | [技術分類の当該行][baseline] | F04,F09 |
| T11 | 統合 | [技術分類の当該行][baseline] | F05 |
| Policy:Control Plane | 統合 | [policy の当該節][policy] | F05,F09 |
| Policy:Glossary | 統合 | [policy の当該節][policy] | F09 |
| Policy:Risk-Tiered Gate Depth | 維持 | [policy の当該節][policy] | F05 |
| Policy:Function Model | 統合 | [policy の当該節][policy] | F05,F09 |
| Policy:Function Boundaries | 維持 | [policy の当該節][policy] | F01 |
| Policy:Function Selection | 統合 | [policy の当該節][policy] | F09 |
| Policy:Control Docs | 統合 | [policy の当該節][policy] | F05 |
| Policy:Human Approval Gates | 維持 | [policy の当該節][policy] | F01,F04 |
| Policy:Non-Blocking Progress | 維持 | [policy の当該節][policy] | F05 |
| Policy:Next Action Contract | 統合 | [policy の当該節][policy] | F05 |
| Policy:Memory Partition | 補強 | [policy の当該節][policy] | F03,F07 |
| Policy:Evidence Rules | 補強 | [policy の当該節][policy] | F02 |
| Policy:Local Instruction Drift | 統合 | [policy の当該節][policy] | F09 |
| Policy:Cell Admission | 統合 | [policy の当該節][policy] | F05 |
| Policy:Uplift §1 policy identity | 統合 | [policy の当該節][policy] | F09 |
| Policy:Uplift §2 enforcement consistency | 維持 | [policy の当該節][policy] | F02 |
| Policy:Uplift §3 program layer | 統合 | [policy の当該節][policy] | F06,F09 |
| Policy:Uplift §4 distribution lanes | 統合 | [policy の当該節][policy] | F09 |
| Policy:Uplift §5 uplift | 条件化 | [policy の当該節][policy] | F10 |
| Policy:Uplift §6 machine checks | 統合 | [policy の当該節][policy] | F09 |
| S1 | 修正 | [S1〜S9 の当該節](engineering-standards.md) | F08 |
| S2 | 修正 | [S1〜S9 の当該節](engineering-standards.md) | F08 |
| S3 | 維持 | [S1〜S9 の当該節](engineering-standards.md) | F05 |
| S4 | 維持 | [S1〜S9 の当該節](engineering-standards.md) | F07 |
| S5 | 修正 | [S1〜S9 の当該節](engineering-standards.md) | F02,F08 |
| S6 | 修正 | [S1〜S9 の当該節](engineering-standards.md) | F08 |
| S7 | 維持 | [S1〜S9 の当該節](engineering-standards.md) | F03 |
| S8 | 維持 | [S1〜S9 の当該節](engineering-standards.md) | F01 |
| S9 | 維持 | [S1〜S9 の当該節](engineering-standards.md) | F03,F04 |
| W1 | 維持 | [引き継ぎの当該行][handover] | F02,F05 |
| W2 | 補強 | [引き継ぎの当該行][handover] | F02,F06 |
| W3 | 維持 | [引き継ぎの当該行][handover] | F01 |
| W3-op | 維持 | [引き継ぎの当該行][handover] | F03 |
| W4 | 維持 | [引き継ぎの当該行][handover] | F02 |
| W5 | 維持 | [引き継ぎの当該行][handover] | F03 |
| W6 | 維持 | [引き継ぎの当該行][handover] | F05 |
| K1 | 統合 | [引き継ぎの当該行][handover] | F03,F08 |
| RR | 維持 | [引き継ぎの当該行][handover] | F02 |
| DS | 統合 | [引き継ぎの当該行][handover] | F05,F06 |
| OR | 条件化 | [引き継ぎの当該行][handover] | F05,F09 |
| Owner instruction index | 修正 | [公開決定の索引][owner-index] | F09 |

## 検証と発効

前段F01〜F10の作者検証: 測定9試験PASS（N1 403/404/429、N2名前のみ、N3空参照/文字列、N4整形のみ、timeout/不正JSON、旧schema、公開本文生成等）。Shirube既存85試験PASS、自前code予算904/1500。今回の原典改訂の監査や全製品での適用試験の代用ではない。今回の対象版と検証は改訂PRから辿る。
今回の順序: 指示されたSDS-V2本文とShirube適用差分を独立監査→作者受領→既存権限内の別担当merge→main/利用元の版切替・読戻し→実案件での一周を実証。命名・取り込み・適用の同じOwner確認を繰り返さず、結果を変える未決の判断や必要な保護認可だけを人へ返す。監査中は旧採択版の保護を維持し、改訂候補の合格/配布を捏造しない。P1は§2の対話から進め、PR#18の旧入口を普遍的手順として再導入しない。

[baseline]: https://github.com/watchout/iyasaka-arc/blob/15f171922038a27ddbcb5ae872776708161dc8a0/cross-cutting/decisions/2026-09-25-established-practice-baseline.md
[audit]: audit-method.md
[sources]: https://github.com/watchout/iyasaka-arc/blob/15f171922038a27ddbcb5ae872776708161dc8a0/cross-cutting/decisions/2026-09-30-sds-audit-v1-source-checklist.md
[policy]: https://github.com/watchout/iyasaka-org/blob/d3f1a1e90499f77772d48fba33532c68ed4cb1fa/docs/shirube/shirube-v3-runtime-policy.md
[owner-index]: https://github.com/watchout/iyasaka-org/blob/d3f1a1e90499f77772d48fba33532c68ed4cb1fa/docs/shirube/owner-instruction-index.md
[handover]: https://github.com/watchout/iyasaka-arc/blob/15f171922038a27ddbcb5ae872776708161dc8a0/cross-cutting/decisions/2026-09-25-shirube-handover-list.md
[measure]: https://github.com/watchout/iyasaka-arc/blob/e12656006d0c81a61b420702d8194fef164b24e0/tools/sds-conformance.py
[tests]: https://github.com/watchout/iyasaka-arc/blob/e12656006d0c81a61b420702d8194fef164b24e0/tools/test_sds_conformance.py
