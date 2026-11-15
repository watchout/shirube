# 共有の網羅率の門 — ストーリーと単位の対応

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- ストーリー: [stories.md](../user-stories/stories.md)。単位: [unit-of-work.md](./unit-of-work.md)。依存: [unit-of-work-dependency.md](./unit-of-work-dependency.md)。

## 対応表

複数の単位を書いた行は、`;` で区切る。先に書いた単位が主の担当で、追跡表（traceability.json）の対象になる。

| Story | Unit | Directory |
|---|---|---|
| US1.1 | U3 | u3-node-gate-slice |
| US1.2 | U6 | u6-typescript-vitest |
| US1.3 | U3; U6 | u3-node-gate-slice; u6-typescript-vitest |
| US1.4 | U3 | u3-node-gate-slice |
| US1.5 | U7 | u7-gate-workflow-entry |
| US2.1 | U3 | u3-node-gate-slice |
| US2.2 | U3 | u3-node-gate-slice |
| US2.3 | U3; U7 | u3-node-gate-slice; u7-gate-workflow-entry |
| US2.4 | U3; U7 | u3-node-gate-slice; u7-gate-workflow-entry |
| US3.1 | U5; U7 | u5-exclusions; u7-gate-workflow-entry |
| US3.2 | U5 | u5-exclusions |
| US3.3 | U5 | u5-exclusions |
| US4.1 | U3 | u3-node-gate-slice |
| US4.2 | U4 | u4-thresholds-and-modes |
| US4.3 | U4 | u4-thresholds-and-modes |
| US5.1 | U4 | u4-thresholds-and-modes |
| US5.2 | U4 | u4-thresholds-and-modes |
| US6.1 | U3 | u3-node-gate-slice |
| US6.2 | U4 | u4-thresholds-and-modes |
| US6.3 | U3; U4; U5 | u3-node-gate-slice; u4-thresholds-and-modes; u5-exclusions |
| US7.1 | U2 | u2-gate-trigger-narrowing |
| US7.2 | U2 | u2-gate-trigger-narrowing |
| US7.3 | U1 | u1-ci-concurrency |
| US7.4 | U1; U2 | u1-ci-concurrency; u2-gate-trigger-narrowing |
| US8.1 | U1; U2; U7 | u1-ci-concurrency; u2-gate-trigger-narrowing; u7-gate-workflow-entry |
| US8.2 | U6 | u6-typescript-vitest |
| US9.1 | U8 | u8-guide-and-verification |
| US9.2 | U8 | u8-guide-and-verification |
| US9.3 | U8 | u8-guide-and-verification |
| US9.4 | U8 | u8-guide-and-verification |
| US10.1 | U3 | u3-node-gate-slice |
| US10.2 | U3 | u3-node-gate-slice |
| US10.3 | U7 | u7-gate-workflow-entry |

## 複数の単位にまたがる行（横断）

- **US1.3**（子プロセスの行）: U3 が Node 組込みの形で、U6 が TypeScript の形で受ける。
- **US2.3 / US2.4**（文面と出力値）: U3 が文面と JSON を作り、U7 が GitHub の notice・job summary・出力値・成果物として返す。
- **US3.1**（DB の試験）: U5 が分母に含めるか除外かの選び方を、U7 が版または指紋を固定した PostgreSQL の job から呼ぶ形を受ける。
- **US6.3**（測定の定義・除外・動作を出力から読む）: U3 が測定の定義、U4 が動作、U5 が除外を、結果の JSON に足す。
- **US7.4**（必須の検査を弱めない）と **US8.1**（Owner の対象 head の承認）: workflow を変える単位（U1・U2・U7）のそれぞれが受ける。

## 各単位の中の実装の順

- U3: 行ごとの記録の形と判定の核 → 入力の検査（分母）→ 測定の実行（期限・総予算）→ Node 組込みの変換 → 出力 → command。判定の核を先に正例・負例で固める（TDD）。
- U4: 閾値の例外の形の検査 → 判定への反映 → 出力の表示 → 動作の切り替え。
- U5: 除外の形の検査 → 判定への反映 → 出力の記録 → DB の試験の扱い。
- U6: 道具の確認の条件 → 測定の定義 → 変換 → 出力。
- U7: 入力の対応 → 権限 → 出力値 → DB の job → 40桁の固定の確かめ。
- U8: 検証 → 手引き。
- U1・U2: 差分は小さい。設計の記録だけの PR と設計監査 → workflow の変更 → 負例の試験。

## 網羅の確認

- 列挙した 33 本のストーリーに、すべて単位が割り当たっている。
- 8 つの単位すべてに行がある（U1: 3 行、U2: 4 行、U3: 12 行、U4: 6 行、U5: 4 行、U6: 3 行、U7: 6 行、U8: 4 行）。行数は上の表から数え直した。
- 上流の要件（FR・NFR）への対応は、ストーリーの追跡表の Deferred 7 件（FR7.4、NFR1・3・5・7・9・11）を、この段の unit-of-work.md の責務の欄と実装メモで受けた。

## Assumptions & Open Questions

### Assumptions

- [assumption] 複数の単位を書いた行では、それぞれの単位が、その行の自分の担当部分を機能の設計で受ける。受入条件の全部を各単位が重ねて実装する意味ではない。
- [assumption] 手引きの試験を要する受入条件（US1.2 の AC1.2.3、US1.5 の AC1.5.3、US3.1 の AC3.1.2）は、担当の単位が機能を作り、U8 の検証で手引きの試験を流す。

### Open Questions

1. 上の複数の単位の行で、各単位が機能の設計で受ける受入条件の範囲の切り方（Functional Design で決める）。
