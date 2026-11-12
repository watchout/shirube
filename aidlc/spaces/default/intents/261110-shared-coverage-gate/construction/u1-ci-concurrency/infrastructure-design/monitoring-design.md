# U1 u1-ci-concurrency — 監視の設計

この単位は新しい監視の仕組み（収集、通知、ダッシュボード）を足さない。取り消しの規則が意図どおりに働いているかは、GitHub Actions の実行の記録（既存）を観測して確かめる。ここでは、何を見るかを表で決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)（設計 5 の確かめ方、設計 3 の取り消す条件）。要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（NFR4.2〜4.4）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR7.3、NFR10.1、NFR11.1）。
- 評価の指標は自社で観測できるものだけ（team.md の Mandated。NFR10.1）。

## 観測する物（Metrics）

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| 同じ PR の古い head の実行が「取り消し」で終わったか | この PR 自身の Actions の実行の一覧（`gh run list` の読み取り） | 古い head の実行が取り消され、最新の head の実行は取り消されない | 取り消しが正しい対象にだけ働く（NFR4.2） |
| 最新の head の実行の結論 | 同上 | `test` と `hygiene` が最後まで流れ、結論が `success` か `failure`（取り消しではない）。`measure` は `pull_request` では動かない（既存の条件）ので、PR の実行の一覧に無くてよい | 取り消しが成功と数えられない（NFR4.2） |
| `main` への push の実行の結論 | `main` の Actions の実行の一覧 | 取り消し（cancelled）が 0 件。`workflow_dispatch` の手動の実行も取り消されない | `main` の検査の結果が欠けない（NFR4.3） |
| 権限の設定が変わっていないこと | この PR の実行の job 一覧の権限の表示（読み取り） | 最上位 `permissions: {}` と job 別の権限が base と同じ | `concurrency:` の追加が権限に影響しない（NFR5.1） |
| 定義の試験の結果 | `npm test` の実行の記録（実行数・合格数・失敗数） | 失敗 0、実行数が期待どおり（実行されない・時間切れは成功に数えない） | 設計の負例 N1〜N5 を確かめる（NFR7.3） |

## 通知（Alerts）

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| （新設しない） | 既存の PR の check の表示（成功・失敗・取り消し）が、そのまま知らせになる | — | PR の画面。新しい通知経路は足さない |

## 目標値（SLIs / SLOs）

| SLI | SLO target | Measurement window |
|---|---|---|
| （定めない） | この単位は稼働するサービスではないので、可用性・遅延の目標値を置かない。費用や時間が減ったという主張は、実際の実行の記録を観測するまで書かない（NFR11.1） | — |

## ログと追跡・ダッシュボード

- 新しいログの集約、追跡、ダッシュボードは足さない。記録は GitHub Actions の実行の記録が持つ。
- Build and Test の記録には、定義の試験の観測値（実行数・合格数・失敗数）と、この PR の実行の一覧から読んだ事実（どの head の実行が取り消されたか）を書く。申告された値は写さない（S5）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 取り消しが起きる場面（古い head の実行が走っている間に新しい push が来る）を、この PR 自身の更新の中で実際に観測できる。起きなかった場合は「観測できなかった」と書き、成功とは書かない（S5）。

### Open Questions

1. なし（新しい監視を足さないため、この段で新しく生じた未決は無い）。
