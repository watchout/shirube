# U1 — Reliability Design

## Sources and Scope

[確認済み計画](nfr-design-questions.md)、[reliability-requirements](../nfr-requirements/reliability-requirements.md)、[functional-spec](../functional-design/functional-spec.md)、[共通契約](../../../inception/contract-design/contract-summary.md)、[FD規則](../functional-design/rules.md)に従う。本書がSOL5/SOL6を定義する。正式AI-DLCの進行/保存/承認を再実装しない。

## SOL5 — 完全結果と前処理診断の分離

**対応:** NFR4.1、NFR10.2。**責任:** 読取周辺の失敗境界、ConformanceGateの入力/出力検査、既存entryへの結果伝播。

| 条件 | 制御 | 出力/下流 |
|---|---|---|
| 構造不正/実head・base未観測/実blob不足でdigest不明 | 前処理を止める。宣言hash/架空hash/空集合hashを実観測の代用にしない | 既存の失敗診断とexit1。有効ConformanceAssessment/AdmissionEnvelopeとして配布・消費しない |
| 必須fieldは実観測で揃うが一部条件の観測が不能 | 明示した不能を核へ渡し、既存規則でUNKNOWNを評価する | 完全assessmentを安全に作れる場合だけ理由付きUNKNOWN/exit1 |
| 4条件の値と全必須fieldが揃う | BR7.1の集約と完全結果検査を行う | PASS/FAIL/UNKNOWNに対応する既存JSON/exit。PASSでも権限NONE |
| 出力の欠落/改変/参照不能/対象変更 | 部分結果や以前のPASSを有効にしない | 下流はdefault補完せず停止する |

契約のSha256/head/base等を黙ってnullableへ変更しない。前処理診断にも対象・失敗段階・理由・既知の非保証を示す。確認済み残件は保持し、残件の判定前なら未評価と示す。`knownRemaining: []`を合成して「残件なし確認済」としない。完全結果の境界は[observability-design](observability-design.md)のSOL7に従う。

## SOL6 — 一回実行と停止

**対応:** NFR6.2、NFR10.2。**責任:** 既存entryと読取周辺。純粋核はprocess終了を行わない。

1. SOL1の一回の取得・SOL3の一回の評価を進め、明示結果を既存JSON/exitへ接続する。必須FAIL/UNKNOWNと前処理失敗はexit1、完全なPASSはexit0。
2. timeout/skip/cancel/取得拒否を成功へ変換しない。無条件PASS、必須stepの失敗無視、continue-on-error、条件を減らす合格経路を設けない。
3. 自動retryは0。人の判断待ちは一回通知後停止し、停止中の効果/成果物/後継記録を生成しない。watcher/自動再開loopは作らない。
4. 正当な新入力/対象変化がある再評価時はSOL4で現対象を再取得する。前のsnapshotやmemoryを現値へ昇格しない。既存正常値/原本/正式stateを更新しない。

U1は副作用のない読取/判定であり、NFR7の効果再送は非適用。U3/U5が既存の同一キー/照会/衝突拒否を担う。retry/backoff/circuit-breaker管理service/health-check daemon/failover DB等は今回追加しない。既存の有限非進捗上限を弱める設計でもない。

## Design Audit Intake and Failure Boundaries

該当4分類では、同PR設計だけhead/独立監査の整合と設計変更失効を既存BR5で照合する。未監査design-only headはU1閉門のまま。一方、設計監査受付の既存必須CIを未取得のU1 PASSに依存させず、checks空/mandatory削除/設計モードPASSを作らない。既存受付workflowの成功条件と実装/統合向け四条件の配置を後段で区別する。

人承認済み段/current checkpointから必要集合を求め、未来CodeGen完了承認や未開始Build and Test/CI承認を先取り要求する循環も避ける。実装前の設計監査、実装headの新CI/独立監査/作者受領/必要公開判断/別担当統合は別の運用条件のままである。実CodeGen開始時刻や非公開履歴の真実を機械証明したとしない。

## Verification and Infrastructure Handoff

FD-T01〜05/17/19に結び、前処理診断・有効UNKNOWN・完全PASSを分けてassertする。早期失敗で偽hash/型変更/残件なし合成が0、負例の門exit1が実entryへ伝播することを確認する。実装/製品試験/実CIは未実施。

後段へは既存entryのエラー/終了契約、観測完了前の出力を消費しないこと、設計監査受付の非循環、資格情報/対象分離を渡す。具体配置/CI結線をここで変更しない。新しいbackup/保存期間/別状態機構を作らない。

## Assumptions & Open Questions

None.

U1→U4を含むOwner指定順のruntime反映は未成立の既存残件。U1終了時に席が正式経路を確認し、無理ならU4前にOwnerへ相談する。偽辺/改名/state/cache/jump/engine変更で迂回しない。
