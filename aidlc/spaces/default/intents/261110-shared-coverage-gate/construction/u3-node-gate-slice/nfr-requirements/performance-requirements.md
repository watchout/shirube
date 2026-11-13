# U3 u3-node-gate-slice — 性能・動作環境の要件

この単位は、網羅率の門の最初の実体（入口の command、測定、判定、出力）を `scripts/coverage-gate/` に作る service。ここでは動作環境と、門自身の処理の大きさの要件を、元の NFR の番号に枝番を付けて書く。試験そのものの実行の長さは利用先の試験で決まるので、門は上限（期限と総予算）で縛る（NFR4.3、reliability-requirements.md）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1（動作環境）、FR1.4、FR4.4。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR2.2 = Node 22 保証、BR2.3 = 期限と総予算）。答え [Q3]・[Q4] は [functional-design-questions.md](../functional-design/functional-design-questions.md)（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
- 実測（作った側の観測。架空の小さな例を Node 22.23.4・24.22.1・26.12.1 で流した）: 3 つの版で lcov がバイトまで一致した。例は 1 つで、すべての組み合わせの保証ではない。

## 要件

### NFR1 動作環境

- **NFR1.1** 動作を保証する環境は、GitHub Actions の Linux の runner と Node 22 だけ。22 より古い Node では測定を始めず、観測できず（CHILD_PROCESS_NOT_COUNTABLE）にする（BR2.2）。判定: 版を差し替えた試験で、22 未満が試験を走らせずに観測できずになる。[NFR1、Q4]
- **NFR1.2** Node 23 以上は実行するが保証しない。実行した版は、結果の文書の `measurementDefinition.toolVersion` に観測した事実として残す。24・26 の実測で lcov が一致した事実は設計の記録に書くが、保証の根拠にしない。版の組み合わせの検査と workflow の変更は U7 以降が扱う。[NFR1、Q4]
- **NFR1.3** 利用する Node の機能は Node 22 の組込みだけ（`node:test`、組込みの網羅率、lcov の報告係、独自の報告係の module、`node:child_process`、`node:fs`、`node:path`、`node:crypto`）。ローカルの開発機（macOS）で動くことは求めるが、保証の範囲は Linux の runner である。[NFR1]
- **NFR1.4** 門自身の処理（試験の実行を除く、入力の検査・記録の変換・判定・整形・書き込み）は、記録の件数 n に対して n log n を超える時間にならず（整列だけが n log n、そのほかは線形）、追加の process を起こさない（起こすのは測定の子プロセス 1 つだけ）。目安の確かめは、合成した 20 万件の行の記録の判定と整形が、ゆるい上限（10 秒）以内に終わる試験。この上限は性能の保証ではなく、二乗の時間や無限の待ちを見つける網である。実測の経過は結果の文書の `measurementAttempt.spentSeconds` に残る（試験の実行を含む）。[NFR1、NFR4]
- **NFR1.5** 想定する大きさ（設計の見込み。上限ではない）: 分母 2,000 file、行の記録 20 万件、必須の試験 file 2,000 本。これを超えても動くが、その大きさでの時間は保証しない。記録の数と file の数は結果の文書に出る（`denominator`、`perFile`）ので、利用先が自分の大きさを観測できる。[NFR1]

## 気づいたこと

- 試験の実行時間そのものは、利用先の試験の量で決まり、門は短くできない。門ができるのは上限を宣言して超えたら観測できずにすること（NFR4.3）と、門自身の処理を線形に保つこと（NFR1.4）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 想定する大きさ（NFR1.5）は、社内の製品 repo の規模からの見込みで、実測していない。公開に載る記録なので、製品固有の数字は書いていない。
- [assumption] 10 秒の網の上限（NFR1.4）は、CI の実行機の負荷の揺れで偽の失敗を出さないよう大きめに置いた。揺れる場合は、時間でなく処理の回数を数える試験に置き換え、理由を記録する。
- [assumption] ローカルの macOS での動作は、保証の範囲に入れない（NFR1.3）。差が出た場合は Linux を正とする。

### Open Questions

1. 24・26 を保証の範囲に入れるかは、版の組み合わせを回す CI の変更が要る（U7 以降。Owner の判断が要る保護対象）。この単位では保証しない。
