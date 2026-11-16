# Shirube — ストーリーと実装単位の対応

## Sources and Mapping Rules

[stories.md](../user-stories/stories.md)の全17US・88受入条件を、[unit-of-work.md](unit-of-work.md)の安定IDとDirectoryへ対応付ける。[確認済みの改訂計画](units-generation-questions.md)と一致する。IDの再採番はしない。

複数単位の行は、それぞれが実装する寄与だけを示し、単に依存先である単位を足さない。各行に載る単位はFunctional Designでその行の**全AC**を追跡し、自単位の実装部分と、他単位/外部の正式原本に必要な接続条件を区別する。各単位が単独でそのストーリー全体を完了するという意味ではない。

## Story Mapping

| Story ID | Unit ID | Directory | Acceptance Criteria | 実装する寄与 |
|---|---|---|---|---|
| US1.1 | U2 | u2-working-state-dialogue | AC1.1.1〜AC1.1.5 | 実対象/版/道具の観測、不足と404/権限等の不能の区別、安全なpath境界、有界読取 |
| US1.2 | U5 | u5-safe-versioned-distribution | AC1.2.1〜AC1.2.5 | 許可差分の実適用、自己workflow保護、途中失敗、同一要求、再導入/形式互換/逆向き |
| US1.3 | U2; U5 | u2-working-state-dialogue; u5-safe-versioned-distribution | AC1.3.1〜AC1.3.5 | U2は不足だけの対話/出典競合/有効回答/安全入出力、U5は設定案と実適用/再読/競合の区別 |
| US1.4 | U3 | u3-native-operation-control | AC1.4.1〜AC1.4.5 | 明示開始前の効果0、現対象と正規入口、古いcursor/許可流用の拒否、実証環境範囲 |
| US2.1 | U1; U3; U4 | u1-ci-record-admission; u3-native-operation-control; u4-trusted-ci-verification | AC2.1.1〜AC2.1.5 | U1は単位PR/監査/受領/統合の条件照合、U3は正規の段進行との接続、U4は新CI実検査条件の接続 |
| US2.2 | U1; U2; U4 | u1-ci-record-admission; u2-working-state-dialogue; u4-trusted-ci-verification | AC2.2.1〜AC2.2.5 | U1は原本/対象/内容からの証拠照合、U2は確認済み/未達/不能の平易な表示、U4はCIの現入力/実結果を証拠へ接続 |
| US2.3 | U4; U5 | u4-trusted-ci-verification; u5-safe-versioned-distribution | AC2.3.1〜AC2.3.5 | U4は規格ID/版/実測とTDD/100%/SEC-T/最小権限等の検証、U5は版更新と実設定/影響範囲/再検証 |
| US3.1 | U3; U5 | u3-native-operation-control; u5-safe-versioned-distribution | AC3.1.1〜AC3.1.5 | U3は正規操作、U5は実適用の停止/照会/競合/再読/有界回復。同じ停止の意味を共有 |
| US3.2 | U1; U2; U3; U4; U5 | u1-ci-record-admission; u2-working-state-dialogue; u3-native-operation-control; u4-trusted-ci-verification; u5-safe-versioned-distribution | AC3.2.1〜AC3.2.5 | 初回の門/実対話/正規接続/実検査/実導入の各寄与と、実コード/必要な監査/統合/実結果までの初回ゴール。U1だけでは完成しない |
| US3.3 | U6 | u6-guided-recheck-increment | AC3.3.1〜AC3.3.7 | 初回実ゴール後の新要求で選択/現対象再照合/案内切替を実追加。未選択回答/初回安全案内保持、同じ入力の前後実比較、新差分の検証 |
| US4.1 | U1 | u1-ci-record-admission | AC4.1.1〜AC4.1.5 | 正式READYの実発行元/現対象/内容/試行、不正記録拒否、未設定でも停止、見直しの既存権限範囲 |
| US4.2 | U1 | u1-ci-record-admission | AC4.2.1〜AC4.2.5 | 4分類根拠、同PRの設計だけのheadの独立監査/実装前の順序、実装headの新確認、設計変更の失効 |
| US4.3 | U1 | u1-ci-record-admission | AC4.3.1〜AC4.3.5 | 必要単位記録/Inception、内部log除外、真正原本からの掲載用記録/PR実内容の照合、偽造/改変/競合/破損の拒否 |
| US4.4 | U4 | u4-trusted-ci-verification | AC4.4.1〜AC4.4.5 | 第4項目の信頼版2センサー実CI検査、対象/head/版/入力/結果、未実行停止、自己弱体化不可、job権限 |
| US5.1 | U5 | u5-safe-versioned-distribution | AC5.1.1〜AC5.1.5 | 版付き設定の実配布/再読、宣言だけ不可、drift、両配置/版、判断付き復旧 |
| US5.2 | U7 | u7-aun-rollout-verification | AC5.2.1〜AC5.2.5 | AUNの現担当/受領/権限/保留と必要判断、受け手実適用/実物、非公開境界、既存例外の限定 |
| US5.3 | U7 | u7-aun-rollout-verification | AC5.3.1〜AC5.3.6 | AUN実PRの4項目正負/必須CI不能/自己弱体化、実drift/復旧、架空公開、初回/追加/AUNを含む全体必須合否 |

## Cross-cutting Concerns

全17行に割当があり、全7単位が実装寄与を持つ。88ACは上表の連続範囲で重複/欠落なく引き継ぐ。47下位FR/13Mustの対応と10NFRの横断制約は[unit-of-work.md](unit-of-work.md#requirements-coverage)に保持する。

US2.1/US2.2/US2.3/US3.1/US3.2は複数単位の実接続を伴う。部分的な照合/表示/適用だけで全ストーリー合格にせず、各ACの必要な成果と現在の原本/版/実結果を合わせて確認する。traceability.jsonのOKは単位設計への割当であり、実装・実験・試験・独立監査・AUN受入が合格済みという意味ではない。

U1の最初の門は3条件の実CI判定、U4は4項目目の2センサー再検査であり混同しない。初回実ゴールにはU1〜U5と実開発/必要なCI・監査・作者受領・公開Owner判断・作者以外の統合の実結果が必要。U6にはその後の新要求受付と新しい実コード/試験/CI/監査の証拠が必要。U7にはAUN実適用/実PR正負/実driftが必要であり、ローカルfixtureや二つの小さなゴールだけで全体完了にしない。

## Implementation Order Within Each Unit

以下は各単位内部の作業上の関係だけを表し、単位間の経済的実装順を採択しない。全単位で該当4分類の設計だけのheadの独立監査を実装前に行い、TDDと実分母100%、適用SEC-T/依存導入前脆弱性/最小権限を保持する。実装headのCI/独立監査/作者受領/必要公開判断/別担当統合を終え、前単位統合を確認してから次単位のCode Generationへ進む。

| Unit ID | 単位内の実装/検証の関係 |
|---|---|
| U1 | Contract Designで実物試験済みの原本契約を受け、対象/3条件/負例を設計→失敗する試験→観測と純粋判定/CI周辺を実装→実PR/実CIの正負と門停止を確認。ローカルmockだけで完成にしない |
| U2 | 実読取/出典/不足と不能の対比を設計→失敗する試験→実観測/質問/表示を実装→実ファイルの変化と入力/パス境界/回答保持を統合確認 |
| U3 | 正式対象/明示開始/停止/照会と競合を設計→失敗する試験→純粋核と正規実行adapterを接続→開始前効果0/結果不明時照会/再読/停止を実経路で確認 |
| U4 | 信頼版/CI入力/必要検査と自己弱体化の負例を設計→失敗する試験→固定版実行と結果の対応を接続→実CIで両検査/不能/旧head/最小権限/規格実測を確認 |
| U5 | 固定版/許可差分/既存資産/復旧を設計→失敗する試験→適用と再読/drift照合を実装→中断/競合/再導入/互換/逆向きを確認→初回の実ゴールを統合確認 |
| U6 | 初回実ゴール後の新要求を受付→初回版の同じ架空入力/観測変化と真の増分を設計→失敗する試験→選択/再照合/切替を実装→初回安全案内/未選択回答保持と前後実結果を確認 |
| U7 | AUNの現対象/担当受領/保留/必要判断を確認→受け手向け固定版/差分/戻し方と正負受入素材を準備→許可後に実適用/実ファイル再読→実PRの4項目正負/CI停止/実drift/復旧を観測 |

## Contract Design and Preserved Boundaries

U1の真正性接続は未検証のまま引き継ぐ。次のContract Designでは、正式AI-DLCが実生成した承認/見直し原本と認可された取得経路/実発行元、現対象/成果物/試行、実CIを用い、内部audit/.aidlc-engineのlogや秘密を公開せず独立確認できることを実物で試す。偽造/改変/旧対象/失効/取得不能等の負例とCI適合の観測証拠を得てから方式を採択する。

単なるJSON再生成一致やローカルmock、未採択の署名者/台帳/DB/信頼元で埋めない。成立不能なら採択と依存操作を停止し、必要な試験案/権限/保護workflow等の具体判断へ戻す。この段で実験/方式選定/保護対象変更を行わない。

公開の試験/fixture/例/出力は架空データのみで、AUN等の非公開原本は権限のある元で照合する。採択済みS1〜S9/例外/report-only、既存担当/保留、別DB intent、1単位1PR/直列checkpoint、旧道筋と判定4・5の退役、W-01〜W-03を保持する。kindで安全性や独立確認を省略しない。
