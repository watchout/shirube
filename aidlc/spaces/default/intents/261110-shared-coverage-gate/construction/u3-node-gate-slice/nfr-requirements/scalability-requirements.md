# U3 u3-node-gate-slice — 拡張・費用の要件

この単位は、CI の 1 回の実行の中で動く command で、常設の資源を持たない。ここでは、利用先の大きさが増えた時の振る舞いと、費用の要件を NFR1・NFR11 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1・NFR11。想定する大きさは [performance-requirements.md](./performance-requirements.md) の NFR1.5。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR2.3 = 期限と総予算、BR3.1 = 再計算）。

## 要件

### NFR1 大きさに対する振る舞い（続き）

- **NFR1.6** 利用先の大きさ（file の数、行の数、試験の数）が増えても、門は設計を変えずに動く。1 回の測定は子プロセス 1 つで、file ごとに process を起こさない。記録は 1 回の読みで行ごとの表に変換し、メモリは記録の件数に比例する（lcov の全文と行の表を同時に持つので、全文の大きさの数倍）（想定の 20 万件で、現在の CI の runner のメモリに十分収まる）。[NFR1]
- **NFR1.7** 利用先の試験が遅くなって上限を超えた場合は、設計を変えずに観測できずで落ちる（NFR4.3）。上限（期限と総予算）を上げるのは利用先が入力で宣言する。門は上限の既定を勝手に大きくしない。[NFR1、NFR4]
- **NFR1.8** 同じ repo の複数の PR・複数の job が同時に門を流しても、門は互いに干渉しない。状態を共有の場所に持たず、書くのは実行ごとの `--result` の path、一時 directory（実行ごとに別）、その job の summary と出力値だけ。同じ `--result` の path を複数の実行が共有する構成は、利用先の誤りで、後の実行が前の結果を消す（NFR4.6）。[NFR1]

### NFR11 費用

- **NFR11.1** 新しい有料サービスや常設のクラウド資源を足さない。門は CI の runner の上で、利用先の試験の実行 1 回分の時間だけを使う。[NFR11]
- **NFR11.2** 1 回の実行で使う時間の上限は、総予算（既定 900 秒）。それを超える使い方は、利用先が自分で入力を変える場合に限る。門が自動で再試行して費用を増やすことはない（NFR4.3）。[NFR11]

## 気づいたこと

- 実際の費用は、利用先の試験を 1 回余分に走らせる時間（現在の試験の job と別に、網羅率つきで走らせる場合）で決まる。試験を 1 回で済ませる配線（既存の試験の job に統合するか）は U7 の設計で、この単位は決めない。

## Assumptions & Open Questions

### Assumptions

- [assumption] メモリの使い方は、記録の表が 20 万件で数十 MB に収まる見込み。コード生成の合成の記録で、使用量が極端に大きくないことを 1 度観測して記録する（保証の数字にはしない）。

### Open Questions

1. 網羅率つきの試験の実行を、既存の試験の job と 1 回にまとめるか、別に走らせるか（費用と時間に効く）。U7 の設計で、Owner の判断が要る保護対象（workflow）として扱う。
