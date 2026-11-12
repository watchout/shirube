# U1 u1-ci-concurrency — 置き場の設計（基盤の仕様）

この単位が足すのは `.github/workflows/ci.yml` の `concurrency:` の記述だけで、新しい基盤（クラウドの資源、サービス、常設の物）は 1 つも足さない。ここでは、その変更が載る場所と、載らない物を表で明らかにする。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)（設計 1〜6、SD1〜SD5）。要件: [security-requirements.md](../nfr-requirements/security-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)。部品: [components.md](../../../inception/domain-design/components.md) の ShirubeCi（既存・変更）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（S10 は新しい契約を作らない）。
- 現状の観測: `.github/workflows/ci.yml`（job `test` と `hygiene`、`runs-on: ubuntu-latest`、Node 22）。同じ repo の `sds-gate.yml` に job 単位の `concurrency`（先例）。

## 置き場（Deployment）

| Facet | Choice | Rationale |
|---|---|---|
| 計算の形 | GitHub Actions の runner（`ubuntu-latest`）。変更なし | 追加の計算資源が要らない（NFR11.1） |
| ネットワーク | 変更なし。追加の外向き・内向きの通信を作らない | 権限・通信を広げない（NFR5.1） |
| 保管 | 変更なし。実行の記録は GitHub が保持する | 新しい保管場所を作らない |
| 環境 | 本物の環境は 1 つ（この repo の GitHub Actions）。dev/staging/prod の区別は無い | Shirube 自身の CI で、配布先ではない |
| 構成の管理 | workflow の file そのもの（`ci.yml`）が定義。PR で変更し、git の履歴が戻す方法になる | 別の IaC は要らない |
| 変更の中身 | 最上位に `concurrency:` を 1 か所（`group` と `cancel-in-progress` の 2 行） | 設計 1（SD1） |
| 大きさ | 追加は数行。新しい実行時間・並列数の上限を置かない | NFR9.1 |

## 基盤のサービス（Infrastructure Services）

| Service | Role | Configuration | Notes |
|---|---|---|---|
| （なし） | 新しいデータベース・キャッシュ・キュー・検索・CDN・DNS・負荷分散は足さない | — | クラウドの資源は無い。IAM・VPC・暗号鍵・secret も足さない |

## 共有の基盤（Shared Infrastructure）

この単位は、ほかの単位と共有する資源を作らない。次の表は、既存の物との重なりを確認したもの。

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| GitHub Actions の concurrency の group 名前空間 | U1（`ci-` の接頭語） | （既存の `sds-gate.yml` は `sds-gate-` の接頭語で別） | 接頭語が違うので重ならない。`hygiene.yml` に `concurrency` は無い |

## 費用

- 新しい有料サービスや常設の資源を足さない（NFR11.1）。取り消しにより実行時間が減るかは、実際の実行の記録で観測するまで書かない。`main` への push の実行は、実行ごとの別の group で並行して流れうる（費用は増えうるが、検査の結果が欠けないことを優先した。設計 2、SD3）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 変更の戻しは、追加した `concurrency:` の記述を取り除くだけ。別の基盤の片付けは要らない。
- [assumption] AWS など外の基盤は使わない。AWS の設計の手引き（Well-Architected など）は、この単位には当てはまらない。

### Open Questions

1. なし（基盤を足さないため、この段で新しく生じた未決は無い。式の評価の確かめと試験の置き場は、security-design.md の Open Questions のまま）。
