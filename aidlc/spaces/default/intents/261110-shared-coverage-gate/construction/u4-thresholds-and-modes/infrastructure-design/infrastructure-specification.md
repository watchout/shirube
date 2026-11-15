# U4 u4-thresholds-and-modes — 基盤の仕様（infrastructure-specification）

この単位は、クラウドの資源・サービス・常設の物を足さない。U3 が足した command（`scripts/coverage-gate/`）の入力の検査・判定・整形に、閾値の例外と動作の項目を足すだけで、どの workflow にもまだ配線しない（配線は U7）。ここでは、基盤の前提が U3 のままであること、書く場所、他の単位との共有を表にする。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [performance-design.md](../nfr-design/performance-design.md)、[security-design.md](../nfr-design/security-design.md)、[scalability-design.md](../nfr-design/scalability-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)、[observability-design.md](../nfr-design/observability-design.md)、[logical-components.md](../nfr-design/logical-components.md)。機能の設計 [functional-spec.md](../functional-design/functional-spec.md)。契約 [contract-summary.md](../../../inception/contract-design/contract-summary.md)。部品の一覧 [components.md](../../../inception/domain-design/components.md)。
- 土台: U3 の [infrastructure-specification.md](../../u3-node-gate-slice/infrastructure-design/infrastructure-specification.md)。基盤の観測は、公開 `main` の `1dd43e457361d9650153578baa71120788285e98`（#105 の統合後）の bytes で突き合わせ直した: `package.json` `ed2e11f383a1714ebdd973b009f5516836b75832ed4bae6c12c69daf545205ee`、`.github/workflows/ci.yml` `d116d938fdc01ea546dc9276929eefb06757135aa279269022a7333351b8789f`、`scripts/hygiene/lib.mjs` `294ca623c2a002aafe1940544ec178b27f07085528e6192b14c1edf2a51117c4`（U3 の設計の時の値と同じ）。`scripts/coverage-gate/` はこの `main` にまだ無い（U3 の PR #104 は統合前）。U3 の統合後の `main` は、コード生成の始めに実物と突き合わせ直す。作業場の木は古いことがあるので使っていない。

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| 計算の形 | U3 のまま。CI の runner の上で動く 1 回きりの Node の command。常駐しない | 門は判定を出して終わる（NFR1、NFR11） |
| 動作を保証する環境 | U3 のまま。GitHub Actions の Linux の runner、Node 22 | NFR1.1。足す code は新しい module を import しない（PF1） |
| ネットワーク | 外への通信を持たない。決定の URL は形を確かめるだけで読みに行かない | NFR5.1。GitHub を読む資格情報を持たない |
| 保管 | 持たない。書く物は U3 のまま（`--result` の file、一時 directory、job summary、出力値の file）。例外・動作は結果の文書の既存の項目に入る | NFR8.2。書く場所を増やさない |
| 環境 | 本番・staging の区別なし。この単位は配布も展開もしない（配布は U7・U8） | NFR8.5 |
| 構成の管理（IaC） | 足す物はコード（`scripts/coverage-gate/` の 2 file と既存 3 file への追加、その試験）だけ。クラウドの構成の定義は無い | NFR6.2、NFR11.1 |
| 資源の大きさ | 変わらない。足す処理は入力の大きさに依らない一定の量 | NFR1.2、NFR1.5 |
| 実行の上限 | 変わらない（期限と総予算）。record-only でも測定の量は同じ | NFR11.2 |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| （足さない） | — | — | データベース・cache・queue・search・CDN・DNS・load balancer のどれも持たない（NFR11.1） |
| GitHub Actions の runner | 実行の場所（既存） | 変更しない | 門を呼ぶ workflow は U7。保護対象で、Owner の決定が要る |
| 既存の `scripts/hygiene/lib.mjs` | 分母の解決（既存の部品） | 変更しない。この単位は呼ぶ側も変えない | NFR6.1 |
| 既存の CI の検査（`test` job、構造の検査、own-code budget OWN-01） | 新しい・変更した file に自動で当たる既存の検査 | 変更しない | 新しい file の行数で OWN-01 に当たる場合は、設定を変えず PR に「AI-DLC の単位の作る段の出力」と書く（NFR9.2） |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| `scripts/coverage-gate/`（入口、核、測定の部品） | U3 | U4（この単位: 閾値・動作）、U5（除外）、U6（TypeScript と vitest）、U7（配線） | 入力・結果の JSON の版 1 の契約。この単位は `threshold` と `mode` を受け付ける項目として足し、既存の意味と型を変えない。名前を増やさない（NFR8.2） |
| 動作の集合・閾値の既定（`judge.mjs`）、例外の上限と URL の形（`threshold.mjs`）、例外の表示の文型（`report-exception.mjs`） | U4 | U5 以降（同じ持ち主を参照し、値を写さない） | 規則の値の持ち主を 1 か所に（NFR3.1）。他の単位は参照する |
| 結果の JSON（版 1） | U3 | U7（成果物として残す）、U8（集計の手引き） | `mode`・`thresholdException`・`effectiveThresholdPercent` に値が入る。観測できない値は null（NFR10.2） |

## 費用

| 項目 | 内容 |
|---|---|
| 追加の費用 | なし。新しい有料サービスも常設の資源も足さない（NFR11.1） |
| 実行の費用 | U3 のまま。record-only でも測定の量は enforce と同じ（NFR11.2）。例外の検査は線形の小さな処理 |

## 変更の中身

| 変更 | 内容 |
|---|---|
| 新規 | `scripts/coverage-gate/threshold.mjs`、`scripts/coverage-gate/report-exception.mjs`、その試験（`tests/coverage-gate-threshold.test.mjs`、`tests/coverage-gate-report-exception.test.mjs`） |
| 既存への追加 | `input.mjs`（既知のキー、`mode`、`threshold` の呼び出し）、`judge.mjs`（`MODES`・`DEFAULT_MODE`、実際の閾値、shouldFail）、`report.mjs`（文書の値と `report-exception` の呼び出し）。必要なら `cli.mjs` の配線 |
| 試験の置き換え | U3 の「`threshold`・`mode` は未知のキー」の試験を意図して置き換える（保つ確かめを残す。RL6、NFR8.4 相当） |
| 変更しない物 | 既存の `scripts/hygiene`・`scripts/sds`・`.github/workflows`・`kit`・`package.json`・設定（ESLint、dependency-cruiser、knip、jscpd、OWN-01） |

## Assumptions & Open Questions

### Assumptions

- [assumption] 新しい・変更した file が既存の dependency-cruiser・knip・jscpd・OWN-01 に当たるかは、この段では実行していない。コード生成の中で既存の検査を流して記録する。
- [assumption] 利用先がどの Node を使うかは U7 の workflow で決まる（U3 と同じ）。

### Open Questions

なし（網羅率つきの試験の実行を既存の job とまとめるかは U7 の設計で、U3 から続く保護対象の判断）。
