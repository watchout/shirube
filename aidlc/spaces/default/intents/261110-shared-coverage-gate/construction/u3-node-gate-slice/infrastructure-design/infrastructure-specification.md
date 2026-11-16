# U3 u3-node-gate-slice — 基盤の仕様（infrastructure-specification）

この単位は、クラウドの資源・サービス・常設の物を足さない。CI の runner の上で、利用先の repo の試験を 1 回走らせる command（`scripts/coverage-gate/`）を足すだけで、どの workflow にもまだ配線しない（配線は U7）。ここでは、その command が動く基盤の前提、書く場所、他の単位との共有を表にする。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [performance-design.md](../nfr-design/performance-design.md)、[security-design.md](../nfr-design/security-design.md)、[scalability-design.md](../nfr-design/scalability-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)、[observability-design.md](../nfr-design/observability-design.md)、[logical-components.md](../nfr-design/logical-components.md)。機能の設計 [functional-spec.md](../functional-design/functional-spec.md)。契約 [contract-summary.md](../../../inception/contract-design/contract-summary.md)。部品の一覧 [components.md](../../../inception/domain-design/components.md)。
- 基準の観測（公開 Shirube の `origin/main` = `0f9ea89175ece32604e0dcfde9db28462f0d2f35` の実物。`package.json` は blob `4b23a0a0e8feb4f666f0a7eb3109d68f1430b907`、SHA-256 `ed2e11f383a1714ebdd973b009f5516836b75832ed4bae6c12c69daf545205ee`。`.github/workflows/ci.yml` は blob `6ee7b6c3f078285bfd1c65812c1a42b4aabd6310`、SHA-256 `d116d938fdc01ea546dc9276929eefb06757135aa279269022a7333351b8789f`）。作業場の木は古いことがあるので使っていない。

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| 計算の形 | CI の runner の上で動く 1 回きりの Node の command（`node scripts/coverage-gate/cli.mjs --input <path> --result <path>`）。常駐しない | 門は判定を出して終わる（NFR1、NFR11） |
| 動作を保証する環境 | GitHub Actions の Linux の runner、Node 22 | NFR1.1。23 以上は実行するが保証しない（NFR1.2）。ローカルの macOS は保証の外（NFR1.3） |
| ネットワーク | 外への通信を持たない。入口も出口も持たない | NFR5.5。通信の module を import しない |
| 保管 | 持たない。書くのは `--result` の file、実行ごとの一時 directory（終わりで消す）、job summary、出力値の file だけ | NFR5.5・NFR5.6 |
| 環境 | 本番・staging の区別なし。配布先ごとに CI の中で動く。この単位は配布も展開もしない（配布は U7・U8） | NFR8.4 |
| 構成の管理（IaC） | 足す物はコード（`scripts/coverage-gate/` とその試験）だけ。クラウドの構成の定義は無い | NFR6.3、NFR11.1 |
| 資源の大きさ | runner の既定。メモリは記録の件数に比例し、想定の 20 万件で数十 MB の見込み（観測するまで保証の数字にしない） | NFR1.5・NFR1.6 |
| 実行の上限 | 期限（既定 600 秒）と総予算（既定 900 秒）の小さい方。超えたら process group ごと止める | NFR4.3・NFR1.7 |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| （足さない） | — | — | データベース・cache・queue・search・CDN・DNS・load balancer のどれも持たない（NFR11.1・NFR11.3） |
| GitHub Actions の runner | 実行の場所（既存） | 変更しない | 門を呼ぶ workflow は U7 で定義する。保護対象で、Owner の決定が要る |
| 既存の `scripts/hygiene/lib.mjs` | 分母の解決（既存の部品） | 変更せず呼ぶだけ（`resolveTargets`、`trackedFiles`） | NFR3.3・NFR8.1。blob `90195d5ec2510c32ba726c9c831a0c84a3849fa9` |
| 既存の CI の検査（`test` job、構造の検査、own-code budget OWN-01） | 新しい file に自動で当たる既存の検査 | 変更しない | `scripts/**` に 80% の床。新しい file の行数で OWN-01 に当たる場合は、設定を変えず PR に「AI-DLC の単位の作る段の出力」と書く（NFR9.3） |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| `scripts/coverage-gate/`（入口、核、測定の部品） | U3 | U4（閾値・動作）、U5（除外）、U6（TypeScript と vitest の測定）、U7（workflow の配線） | 入力・結果の JSON の版 1 の契約。後の単位は追加の順で足し、既存の意味と型を変えない（NFR8.3）。この単位が受け付けない項目は未知のキーとして失敗にする |
| 結果の JSON（版 1） | U3 | U7（成果物として残す）、U8（集計の手引き） | `schemaVersion`・`runId` を必ず持つ。観測できない値は null |
| `scripts/hygiene/lib.mjs` | 既存（hygiene） | U3 | 変更せず呼ぶだけ |

## 費用

| 項目 | 内容 |
|---|---|
| 追加の費用 | なし。新しい有料サービスも常設の資源も足さない（NFR11.1・NFR11.3） |
| 実行の費用 | 利用先の試験を網羅率つきで 1 回余分に走らせる時間になりうる（既存の試験の job と別に走らせる場合）。統合するかは U7 の設計で、保護対象として Owner の判断が要る。この単位は決めない |
| 上限 | 総予算（既定 900 秒）が 1 回の実行の時間の上限。自動の再試行はしない（NFR11.2） |

## 変更の中身

| 追加 | 内容 |
|---|---|
| `scripts/coverage-gate/*.mjs` | 13 file（logical-components の LC1）。追加のみ |
| `tests/coverage-gate-*.test.mjs`、`tests/coverage-gate-fixtures.mjs` | 試験と補助。既存の `npm test` の対象に入る位置 |
| 変更しない物 | 既存の `scripts/hygiene`・`scripts/sds`・`.github/workflows`・`kit`・`package.json`・設定（ESLint、dependency-cruiser、knip、jscpd、OWN-01） |

## Assumptions & Open Questions

### Assumptions

- [assumption] 新しい file が既存の dependency-cruiser・knip・jscpd・OWN-01 に当たるかは、この段では実行していない。コード生成の中で既存の検査を流して記録する。
- [assumption] 利用先がどの Node を使うかは、門を呼ぶ workflow の定義（U7）で決まる。既存の `test` job は Node 26 で動くので、門が既存の job で走るなら 26 で動く（保証は 22 だけ）。

### Open Questions

1. 網羅率つきの試験の実行を既存の試験の job と 1 回にまとめるか（費用と時間に効く）。U7 の設計で、Owner の判断が要る保護対象。
