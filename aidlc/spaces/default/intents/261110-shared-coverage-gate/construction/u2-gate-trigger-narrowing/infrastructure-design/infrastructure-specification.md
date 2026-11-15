# U2 u2-gate-trigger-narrowing — 置き場の設計（基盤の仕様）

この単位が変えるのは `kit/sds-gate-caller.yml` の job `sds-gate` の `if:` と、冒頭の注記だけで、新しい基盤（クラウドの資源、サービス、常設の物）は 1 つも足さない。ここでは、その変更が載る場所と、載らない物を表で明らかにする。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)（設計 1〜9、SD1〜SD9）。要件: [security-requirements.md](../nfr-requirements/security-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)。部品: [components.md](../../../inception/domain-design/components.md)。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（S10 は新しい契約を作らない）。
- 基準の観測（公開 Shirube の clone の `origin/main` = `0f9ea89175ece32604e0dcfde9db28462f0d2f35` の実物）: `kit/sds-gate-caller.yml`（SHA-256 `e6eaa2eb0745f63a64e11b7497bc772a0e842c93deaca34a06765a4bd7a6ff5f`）は利用先に写されるひな形で、`pull_request_target` と `issue_comment` で起動し、再利用 workflow `.github/workflows/sds-gate.yml`（`ac38c62e…812c`）を commit 固定で呼ぶ。Shirube 自身の門は `sds-gate-self.yml` で、この単位は変えない。作業場の木と共有の CodeKB は基準に使っていない。

## 置き場（Deployment）

| Facet | Choice | Rationale |
|---|---|---|
| 計算の形 | 利用先の GitHub Actions の runner。caller の job は再利用 workflow を呼ぶだけで、skip された時は runner を使わない | 追加の計算資源が要らない（NFR11.1） |
| ネットワーク | 変更なし。追加の外向き・内向きの通信を作らない | 権限・通信を広げない（NFR5.1） |
| 保管 | 変更なし。実行の記録と commit status は GitHub が保持する | 新しい保管場所を作らない |
| 環境 | 本物の環境は無い。caller は利用先へ写されるひな形で、この単位は配布しない | Shirube 自身の門は別 file（NFR8.1） |
| 構成の管理 | `kit/sds-gate-caller.yml` そのものが定義。PR で変更し、git の履歴が戻す方法になる | 別の IaC は要らない |
| 変更の中身 | job `sds-gate` の `if:` に作成だけを本文の印で絞る節を足し、冒頭に skip の意味の注記を 2 行足す。`on:`、権限 6 つ、`uses:`、`with:` は変えない | 設計 1・2・8（SD1・SD8・SD9） |
| 大きさ | 追加は十数行。新しい実行時間・並列数の上限を置かない | NFR9.1 |

## 基盤のサービス（Infrastructure Services）

| Service | Role | Configuration | Notes |
|---|---|---|---|
| （なし） | 新しいデータベース・キャッシュ・キュー・検索・CDN・DNS・負荷分散は足さない | — | クラウドの資源は無い。IAM・VPC・暗号鍵・secret も足さない |

## 共有の基盤（Shared Infrastructure）

この単位は、ほかの単位と共有する資源を作らない。次の表は、既存の物との重なりを確認したもの。

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| 再利用 workflow の concurrency group（`sds-gate-<repo>-<pr>`、cancel-in-progress） | 既存（変更しない） | caller の呼び出し | skip された caller は再利用 workflow を呼ばないので、関係の無い作成が実行中の門を取り消すことがなくなる。group の形は変えない |
| commit status `sds-gate` | 既存の再利用 workflow の最後の step | 利用先の必須の検査 | skip は status を書き換えない見込み（定義から導く。実測は利用先で観測するまで観測できなかったと書く。設計 6） |
| U1 の `ci.yml` の group（`ci-` の接頭語） | U1 | — | 別 file、別の接頭語で重ならない |

## 費用

- 新しい有料サービスや常設の資源を足さない（NFR11.1）。流れる回数が減るという主張は、利用先での Actions の一覧から数えるまで書かない（設計 6）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 変更の戻しは、追加した `if:` の節と注記を取り除くだけ（設計 8）。別の基盤の片付けは要らない。
- [assumption] AWS など外の基盤は使わない。AWS の設計の手引きは、この単位には当てはまらない。
- [assumption] 利用先の必須の検査は commit status `sds-gate`（caller の冒頭の注記）。job の check run を必須にしている利用先は、この単位では確かめていない。

### Open Questions

1. なし（基盤を足さないため、この段で新しく生じた未決は無い。評価の実測、試験の置き場、`docs/sds/distribution.md` の更新は security-design.md の Open Questions のまま）。
