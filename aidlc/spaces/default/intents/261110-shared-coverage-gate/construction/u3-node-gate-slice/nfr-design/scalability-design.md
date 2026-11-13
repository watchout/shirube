# U3 u3-node-gate-slice — 拡張・費用の設計（scalability-design）

門は 1 回の実行の中で閉じる command で、水平拡張・負荷分散・分割・自動拡張は持たない。ここでは、大きさが増えた時の振る舞い、同時実行の独立、費用の設計を書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 入力: [scalability-requirements.md](../nfr-requirements/scalability-requirements.md)（NFR1.6〜NFR1.8、NFR11.1・NFR11.2）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR11.3）、[performance-design.md](./performance-design.md)、[logical-components.md](./logical-components.md)。

## 設計

### SL1 同時実行の独立（NFR1.8）

- 共有の状態を持たない。書くのは、実行ごとに別の物（`--result` の path とその一時の file、実行ごとの一時 directory、その job の summary と出力値）だけ。一時 directory は乱数つきの名前で、実行同士で名前が衝突しない。
- 同じ `--result` の path を複数の実行が使う構成は、利用先の誤りで、後の実行が前の結果を消す。門は検出しない（検出の仕組みは共有の状態が要る）。設計の記録に利用先の誤りと書く。
- ロック・キュー・外部の状態は持たない。

### SL2 大きさへの対応（NFR1.6）

- 測定は子プロセス 1 つ。記録は 1 回の走査で表に変換する。メモリは「lcov の全文 + 行の表」で、記録の件数に比例する。64 MiB の上限（performance-design.md の PF3）が、メモリの上限を与える。
- 設計は大きさに依らず同じ。大きさが想定を超えても処理の形を変えず、時間は上限（期限と総予算）で縛る。

### SL3 上限を勝手に上げない（NFR1.7）

- 期限（既定 600 秒）と総予算（既定 900 秒）の既定を、大きさに応じて自動で変えない。上げるのは利用先が入力で宣言する場合だけ。超えたら観測できず（reliability-design.md の RL2）。

### SL4 費用（NFR11.1・NFR11.2・NFR11.3）

- 新しい有料サービス・常設の資源・依存を足さない。使うのは CI の runner の時間で、試験 1 回分。総予算が 1 回の実行の時間の上限になり、門は再試行しない。
- 試験を網羅率つきで別に 1 回走らせる費用が出るかは、U7 の配線で決まる（既存の試験の job に統合するか）。この単位は決めない。

## 検証の仕方

| 設計 | 試験 |
|---|---|
| SL1 | 2 つの実行を別の `--result` と別の一時 directory で並べて起こし、互いの結果が変わらない。一時 directory の名前が実行ごとに異なる |
| SL2 | 合成の大きな記録で 1 回の走査（performance-design.md の PF2）。子プロセスが 1 つだけ起きる（起動の回数を数える） |
| SL3 | 入力に期限・総予算が無い時は既定の 600・900、宣言があればその値になる。大きさで既定が変わらない |
| SL4 | `package.json` の依存が変わっていない。`scripts/coverage-gate/` の import が組込みと既存の hygiene の lib だけ |

## Assumptions & Open Questions

### Assumptions

- [assumption] 想定のメモリ使用は数十 MB。コード生成の合成の記録で 1 度観測して記録する（保証の数字にしない）。

### Open Questions

1. 網羅率つきの試験を既存の試験の job と 1 回にまとめるかは U7 の設計で、Owner の判断が要る保護対象（workflow）。この単位では決めない。
