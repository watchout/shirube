# U5 u5-exclusions — 基盤の仕様（infrastructure-specification）

この単位は、クラウドの資源・サービス・常設の物を足さない。U3・U4 が足した command（`scripts/coverage-gate/`）の入力の検査・分母の解決・整形に、除外の項目を足すだけで、どの workflow にもまだ配線しない（配線は U7）。ここでは、基盤の前提が U3・U4 のままであること、書く場所、他の単位との共有を表にする。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [performance-design.md](../nfr-design/performance-design.md)、[security-design.md](../nfr-design/security-design.md)、[scalability-design.md](../nfr-design/scalability-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)、[observability-design.md](../nfr-design/observability-design.md)、[logical-components.md](../nfr-design/logical-components.md)。機能の設計 [functional-spec.md](../functional-design/functional-spec.md)。契約 [contract-summary.md](../../../inception/contract-design/contract-summary.md)。部品 [components.md](../../../inception/domain-design/components.md)。
- 土台: U3 の [infrastructure-specification.md](../../u3-node-gate-slice/infrastructure-design/infrastructure-specification.md) と U4 の [infrastructure-specification.md](../../u4-thresholds-and-modes/infrastructure-design/infrastructure-specification.md)。基盤の現状は、統合済みの `origin/main` `7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e`（U3・U4 を含む）を土台にする。コード生成の段で、その時点の `main` の実物と SHA-256 で突き合わせ直す。

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| 計算の形 | U3・U4 のまま。CI の runner の上で動く 1 回きりの Node の command。常駐しない | 門は判定を出して終わる（NFR1、NFR11） |
| 動作を保証する環境 | U3・U4 のまま。GitHub Actions の Linux の runner、Node 22 | NFR1.1。足す code は新しい module を import しない（PF1） |
| ネットワーク | 外への通信を持たない。除外の理由が正しいかは確かめず、読みに行かない | NFR5.1。GitHub を読む資格情報を持たない |
| 保管 | 持たない。書く物は U3・U4 のまま（`--result` の file、一時 directory、job summary、出力値の file）。除外は結果の文書の既存の項目（`exclusions`・`exclusionCount`）に入る | NFR8.2。書く場所を増やさない |
| 環境 | 本番・staging の区別なし。この単位は配布も展開もしない（配布は U7・U8） | NFR8.6 |
| 構成の管理（IaC） | 足す物はコード（`scripts/coverage-gate/` の 2 file と既存 4 file への追加、その試験）だけ。クラウドの構成の定義は無い | NFR6.2、NFR11.1 |
| 資源の大きさ | 変わらない。足す処理は分母と除外の件数に対する n log n で、追加の process を起こさない | NFR1.2、NFR1.6 |
| 実行の上限 | 変わらない（期限と総予算）。除外しても測定の量は同じ | NFR11.2 |
| DB | 持たない。PostgreSQL の起動も DB の file の一覧も門は持たない。DB を要する file は、呼び出し側が「DB の job で測る」か「理由つきで除外」かを宣言で表す | NFR1.9、NFR11.3 |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| （足さない） | — | — | データベース・cache・queue・search・CDN・DNS・load balancer のどれも持たない（NFR11.1） |
| GitHub Actions の runner | 実行の場所（既存） | 変更しない | 門を呼ぶ workflow と DB の job は U7。保護対象で、Owner の決定が要る |
| 既存の `scripts/hygiene/lib.mjs` | 分母の解決（既存の部品） | 変更しない。`resolve.mjs` が呼ぶ戻り値から除外を引く | NFR6.1 |
| 既存の CI の検査（`test` job、構造の検査、own-code budget OWN-01） | 新しい・変更した file に自動で当たる既存の検査 | 変更しない | 新しい file の行数で OWN-01 に当たる場合は、設定を変えず PR に「AI-DLC の単位の作る段の出力」と書く（NFR9.2） |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| `scripts/coverage-gate/`（入口、核、測定の部品） | U3 | U5（この単位: 除外）、U6（TypeScript と vitest）、U7（配線） | 入力・結果の JSON の版 1 の契約。この単位は `exclusions` を受け付ける項目として足し、既存の意味と型を変えない。名前を増やさない（NFR8.2） |
| 理由の 1 行の文の規則（`threshold.mjs`） | U4 | U5（除外の理由が同じ規則を呼ぶ）、U6 以降 | 値を写さず、同じ関数を呼ぶ（NFR3.1）。この単位は関数を export する形に触るが、U4 の結果は変えない |
| 除外の検査と集合の差（`exclusions.mjs`）、除外の表示の文型（`report-exclusions.mjs`） | U5 | U6 以降（同じ持ち主を参照し、値を写さない） | 規則の値の持ち主を 1 か所に（NFR3.1） |
| 結果の JSON（版 1） | U3 | U7（成果物として残す）、U8（集計の手引き） | `exclusions`・`exclusionCount` に値が入り、`denominator.resolvedFileCount` は除外を引いた後の件数になる。観測できない値は null（NFR10.2） |

## 費用

| 項目 | 内容 |
|---|---|
| 追加の費用 | なし。新しい有料サービスも常設の資源も足さない（NFR11.1） |
| 実行の費用 | U3・U4 のまま。除外しても必須の試験は同じだけ流れる（NFR11.2）。除外の検査は線形の小さな処理 |
| DB の job の費用 | この単位の範囲外（U7）（NFR11.3） |

## 変更の中身

| 変更 | 内容 |
|---|---|
| 新規 | `scripts/coverage-gate/exclusions.mjs`、`scripts/coverage-gate/report-exclusions.mjs`、その試験（`tests/coverage-gate-exclusions.test.mjs`、`tests/coverage-gate-report-exclusions.test.mjs`） |
| 既存への追加 | `threshold.mjs`（理由の規則を field の名前を受ける関数として export）、`input.mjs`（既知のキー、`exclusions` の検査の呼び出し）、`resolve.mjs`（集合の差の呼び出し）、`report.mjs`（文書の値と `report-exclusions` の呼び出し）。必要なら `cli.mjs` の配線 |
| 試験の置き換え | `exclusions` を未知のキー・不正な型として扱う既存の試験 4 件を、別の未知のキーで性質を保って置き換える（RL12、NFR8.4） |
| 変更しない物 | `judge.mjs`（除外を知らない）、既存の `scripts/hygiene`・`scripts/sds`・`.github/workflows`・`kit`・`package.json`・設定（ESLint、dependency-cruiser、knip、jscpd、OWN-01） |

## Assumptions & Open Questions

### Assumptions

- [assumption] 新しい・変更した file が既存の dependency-cruiser・knip・jscpd・OWN-01 に当たるかは、この段では実行していない。コード生成の中で既存の検査を流して記録する。
- [assumption] 利用先がどの Node を使うかは U7 の workflow で決まる（U3・U4 と同じ）。

### Open Questions

なし（網羅率つきの試験の実行を既存の job とまとめるかと DB の job は U7 の設計で、保護対象の判断）。
