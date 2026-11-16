# Shirube — 実装計画の担当と受渡し

## Sources and Allocation Basis

Bolt は、対象単位を設計から実装・確認へ通して動く成果を得るひとまとまりである。本計画は[確認済み回答](delivery-planning-questions.md)の指定順と、[bolt-plan.md](bolt-plan.md)の7つのまとまりを担当へ結ぶ。

入力は [requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)、[mockups.md](../refined-mockups/mockups.md)、[components.md](../domain-design/components.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[contract-summary.md](../contract-design/contract-summary.md)、[team-practices.md](../practices-discovery/team-practices.md)。元の[team-assessment.md](../../ideation/team-formation/team-assessment.md)、[mob-composition.md](../../ideation/team-formation/mob-composition.md)、[skill-matrix.md](../../ideation/team-formation/skill-matrix.md)の有効な担当分離を保持する。

## Execution and Ownership

親は管理・品質確認・設計・受入の集約を担当し、コード・試験・正式成果物を直接書かない。各段の成果物作成は、その段が指定する承認済みAI-DLCの役へ、入力・出力・所有範囲を明示して渡す。段の設定が指定しない役を独自に増やさない。

同時に使う配下は1体、親と同じモデル、同じ作業場内。段の正規の役を順に使い、孫への委任、GitHub書込み、統合、他repoの作業開始を渡さない。過去の体制案の最大3体を並列実装の根拠へ戻さない。既存の独立した監査・統合・AUN担当はサブエージェントの起動とは区別し、担当名だけで稼働・受領を観測済みにしない。

| Bolt / Unit | 成果物を作る担当 | 親の管理・品質確認 | 次へ渡すもの |
|---|---|---|---|
| B1 / U1 u1-ci-record-admission | 各設計段の正規役、作る段のaidlc-developer-agent、該当する試験/CI段の正規役 | 4条件・非保証・READY日付/既知残件・R-01/R-02・実PR/CI停止を照合 | 同一核/掲載形式/必要集合、正負結果、未解消事項、対象版 |
| B2 / U4 u4-trusted-ci-verification | 各設計段の正規役、aidlc-developer-agent、CI段のaidlc-pipeline-deploy-agent | 信頼版2センサーの実入力/実結果、弱体化拒否、job別権限 | 同じ対象のSensorResult、固定検査版と必須集合、配布対象設定 |
| B3 / U2 u2-working-state-dialogue | 各設計段の正規役、aidlc-developer-agent、該当する試験段の正規役 | 実設定/版/規格、出典、回答保持、秘密なし、不足と不能の区別 | 対象と観測に結ぶ設定案/有効回答/明示開始入口 |
| B4 / U3 u3-native-operation-control | 各設計段の正規役、aidlc-developer-agent、該当する試験段の正規役 | 現対象/正式操作、開始前効果0、停止/照会/冪等/再読 | NativeOperation/OperationAttemptの観測、版適合/未証明範囲 |
| B5 / U5 u5-safe-versioned-distribution | 各設計段の正規役、aidlc-developer-agent、配布/検証段の正規役 | 許可差分/実適用/実設定/drift/復旧、初回実ゴール | 固定配布版、差分、必要判断、確認方法、戻し方、非保証/残件 |
| B6 / U7 u7-aun-rollout-verification | Shirube側の正規担当が配布素材、AUN既存担当が受け手の実作業 | 現担当受領/保留/必要判断、実PR正負/実設定、公開境界 | AUN対象版・実受入結果・未達と再検証条件 |
| B7 / U6 u6-guided-recheck-increment | 各設計段の正規役、aidlc-developer-agent、該当する試験段の正規役 | 新要求の実増分、同じ入力の前後結果、既存案内/回答保持 | 新差分の結果、必要なAUN最終対象版の再検証 |

上の役は技能と成果の担当であり、段の実行や監査結果を発行済みとはしない。Code Generationや試験を行える時点は正式な段・承認・対象計画で決まる。

## Independent Review, Receipt and Merge

| 役割 | 責任 | 実際に確かめる条件 |
|---|---|---|
| Owner | 段の問い・承認、該当する保護対象の公開判断 | 対象と具体差、必要な公開原文URL/本文SHA、R3/R4の統合前exact-head |
| AI-DLCの見直し役 | 当該段の成果を独立に見直す | 正式役/対象/試行/内容の記録。未実施をREADYにしない。対象規格IDも確認 |
| devauditor | 同PR設計headと実装headの独立PR監査 | 設計監査と実装監査を別々に確認。門が証明しない発行/本人/実見直し実施は既存運用で記録を読んで補う |
| 作者の席である親 | 対象PRの検査・監査依頼・指摘対応・受領を取りまとめる | 現headの必要CIと記録、既存受付、本文SHA、正式な受領。配下の見直しで独立監査を代替しない |
| 作者以外のsuite-lead | 条件の揃ったPRを統合する | 現headの必須検査、監査、作者受領、必要な公開判断と別席であること |
| AUN既存担当 | 受け手の現対象・実適用・実PR/実設定の検証 | 稼働/受領/対象/保留/権限を実際に確認。旧mapや配布元の宣言で代用しない |

1単位1PR。該当する4分類は同じPRの設計だけのheadの独立監査PASS→同PRへの実装→新headのCI/実装監査/受領/必要判断→別担当統合を保つ。次単位のCode Generationは前単位統合と正式な単位checkpointの確認後。単位PRで必要な試験/CIと、正式な案内で後続する全体のBuild and Test・CI・Operationを区別し、後者を各単位の統合前へ独自に前倒しせず、全体完了までの適用段を省略しない。workflowや新センサー、初回導入等の変更を段承認や既存キットの限定例外で一括許可しない。実際の投稿や受渡しは本計画の生成では行っていない。

## Dispatch Inputs and File Ownership

各担当へ、対象intent/unit/stage、現在の正式入力、現在契約と変更対応、適用規格/版、編集可能な成果物・コード・試験、基準commitと対象PR、許された操作、具体的な完了/停止条件を渡す。全13Must・47FR・10NFR・17US/88ACの該当範囲はbolt-planとstory-mapへ戻れるようにする。実ファイルの差分と観測結果で受け取り、自己宣言で完了にしない。

R-01/R-02はB1のU1 Functional Design担当への必須入力として渡し、CI/AUNの非保証・knownRemainingの維持、肯定値の種類別固定と否定/不明/種類違い拒否試験を具体化した参照を返させる。現在未解消であり、単なるAccepted riskの表示を恒久免除へ読み替えない。

AI-DLCの履歴・承認を作業担当用の場所へ複製して作り直さない。親だけが正式進行・質問記録・段の承認を扱い、配下は所有する成果物と観測結果を返す。他者の編集を戻さず、設計外の挙動が必要なら差を親へ返してから扱う。既存Bun/Claude部品を未検証のままCodexで実証済みと報告しない。

## Readiness and Retained Constraints

指定順はU1→U4→U2→U3→U5→U7→U6でDAGの7辺を満たすが、現行runtimeがその順を解決する経路は未成立。U1後U4へ進む境目までに正式経路との適合が必要であり、担当の割当や計画表を実行順の反映証拠にしない。新道具・engine変更・偽辺・改名・state/cache編集・jump迂回・別取り組み・外部提案を始める割当はしない。

READYは固定Asia/Tokyoの2026-11-06以後の段完了承認/再承認に必要。閾値前の不足は既知残件、開き直した時は通常見直し。既存6段のうちscope再承認を含む5段の閾値後の不足は該当PR受入で止め、作業の割当から解消や免除を推定しない。同じ扱いと非保証をAUNへ渡す。

検証コマンドは未設定。placeholderや既存単体試験を未実装の統合/100%測定の証拠にせず、検証可能な段の正式な問いで選ぶ。S1〜S9・TDD・Node組込み/実分母100%・SEC-T・依存導入前確認・最小権限・架空公開データを全担当に保持する。

DB別intentの範囲・担当・承認・保留を保持する。AUNへ渡す既存版と後続U6の差が干渉すれば、受入済み結果を無条件流用せず影響対象版を再検証する。人待ち・観測不能は一度知らせて停止し、監視用watcherや後継依頼の自動生産を追加しない。
