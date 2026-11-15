# U2 u2-gate-trigger-narrowing — 監視の設計

この単位は新しい監視の仕組み（収集、通知、ダッシュボード）を足さない。絞りが意図どおりに働くかは、この PR で観測できるもの（試験の結果、base の実物との突き合わせ）と、利用先への導入の後でしか観測できないものに分けて書く。後者を前者の成功に読み替えない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [security-design.md](../nfr-design/security-design.md)（設計 5 の確かめ方、設計 6 の観測できないこと）。要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（NFR4.4〜4.6）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR7.3、NFR10.1、NFR11.1）。
- 評価の指標は自社で観測できるものだけ（team.md の Mandated。NFR10.1）。

## 観測する物（Metrics）

| Metric | Source | Threshold | この PR で観測できるか | Why it matters |
|---|---|---|---|---|
| 定義の試験の結果 | `npm test` の実行の記録（実行数・合格数・失敗数） | 失敗 0、実行数が期待どおり（実行されない・時間切れは成功に数えない） | できる | 設計の P1・P2・N1〜N7・逆向き・同居を確かめる（NFR4.5、NFR7.3） |
| 変更前の caller で新しい試験が失敗すること | TDD の Red の実行の記録 | 新しい試験が失敗する | できる | 試験が絞りを実際に確かめている（NFR7.1） |
| caller の変更が追加のみであること | 取り除いた結果の SHA-256 と base の `e6eaa2eb…` の比較 | 一致を 1 回観測する | できる | 戻せる（NFR8.3、設計 8） |
| 権限・起動の種類・`uses:` が変わっていないこと | 試験 N1・N6 と差分の読み取り | 変更前と同じ | できる | 権限を広げない（NFR5.1） |
| 印の集合が門の実物の印と一致すること | 試験 P1 | 過不足なく一致 | できる | 規則を 1 か所に保つ（NFR3.1） |
| `if:` が GitHub 上で意図どおりに評価されるか | 利用先の Actions の実行の一覧 | 印のない作成で job が skip、印のある作成と編集・削除で実行 | **できない**（kit の caller は利用先に写されるひな形。この PR の Actions では動かない） | 実測は導入の後（設計 6）。それまで「観測できなかった」と書く |
| skip した時に `sds-gate` の commit status が変わらないか | 利用先の head の status の一覧 | 既存の status が書き換わらない | **できない**（同上） | NFR4.4 の実測。導入の後 |
| 流れる回数が減ったか | 利用先の Actions の一覧から PR ごとの `sds-gate` の run を数える | 数えた値をそのまま記録する | **できない**（同上） | 減るという主張は数えるまで書かない（NFR11.1）。数え方は実装の段の記録に書く |

## 通知（Alerts）

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| （新設しない） | 既存の PR の check の表示（成功・失敗）がそのまま知らせになる | — | PR の画面。新しい通知経路は足さない |

## 目標値（SLIs / SLOs）

| SLI | SLO target | Measurement window |
|---|---|---|
| （定めない） | この単位は稼働するサービスではないので、可用性・遅延の目標値を置かない。費用や回数が減ったという主張は、観測するまで書かない（NFR11.1） | — |

## ログと追跡・ダッシュボード

- 新しいログの集約、追跡、ダッシュボードは足さない。記録は GitHub Actions の実行の記録と PR の記録が持つ。
- Build and Test の記録には、試験の観測値（実行数・合格数・失敗数）、Red の失敗の記録、base との SHA-256 の突き合わせの結果を書く。「観測できなかった」ものは成功と書かず、そう書く。申告された値は写さない（S5）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 利用先での観測は、kit の導入（別の決定、この単位の範囲外）の後に、導入先の最初の PR で 1 回行う。導入の決定に条件として渡す（設計 6）。

### Open Questions

1. なし（新しい監視を足さないため、この段で新しく生じた未決は無い）。
