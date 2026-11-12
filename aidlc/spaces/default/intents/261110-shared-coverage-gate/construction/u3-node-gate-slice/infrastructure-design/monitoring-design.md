# U3 u3-node-gate-slice — 監視の設計（monitoring-design）

この単位は新しい監視の仕組み（収集、通知、ダッシュボード）を足さない。門自身が出す 5 つの観測の面（observability-design.md）が、そのまま監視の入口になる。ここでは、この PR で観測できる物と、配線（U7）の後でしか観測できない物を分けて書く。後者を前者の成功に読み替えない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [observability-design.md](../nfr-design/observability-design.md)（OB1〜OB5）、[reliability-design.md](../nfr-design/reliability-design.md)、[security-design.md](../nfr-design/security-design.md)。要件: [observability-requirements.md](../nfr-requirements/observability-requirements.md)（NFR4.9〜NFR4.11、NFR10.1〜NFR10.3）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR7.3・NFR7.4）。
- 評価の指標は自社で観測できるものだけ（team.md の Mandated。NFR10.1）。

## Metrics & KPIs

| Metric | Source | Threshold | この PR で観測できるか | Why it matters |
|---|---|---|---|---|
| 門の試験の結果 | `npm test` の実行の記録（実行数・合格数・失敗数・skip 数） | 失敗 0、skip 0、実行数が期待どおり（実行されない・時間切れは成功に数えない） | できる | 全部品の正例・負例を確かめる（NFR7.2・NFR7.6） |
| Red の失敗の記録 | TDD の Red の commit の実行の記録 | 実装が無い状態で新しい試験が失敗する | できる | 試験が実際に確かめている（NFR7.1） |
| 門自身の行の網羅率 | OB5 の記録のための 1 回の実行の結果の JSON と、Node の組込みの lcov の別計算の突き合わせ | 100%、2 つの値が一致、対象が 0 件でない | できる | 100% の床を観測した値で残す（NFR7.3・NFR7.4）。対象 0 件・記録なし・不一致は成功に数えない |
| 追加のみであること | 足した file を除いた木の既存の `npm test` の結果と、base の実物との SHA-256 の突き合わせ | 既存の試験が通り、base と一致を 1 回観測する | できる | 戻せる（NFR8.2） |
| 既存の構造の検査 | dependency-cruiser・knip・jscpd・ESLint・OWN-01 の実行の結果 | 失敗 0（当たった場合は PR に理由を書く） | できる | NFR9.2・NFR9.3 |
| 子の環境から除いた名前 | 子が環境を書き出す試験 | 4 つの名前が無い | できる | NFR5.1 |
| 孫の process が残らないこと | 孫を起こして眠る架空の試験で、止めた後の process の存在を確認 | 残らない | できる（Linux） | NFR4.3。確かめられなければ設計に戻す |
| 20 万件の記録の処理時間 | 合成の記録での変換・判定・整形の時間 | 10 秒以内（網であって保証ではない） | できる | 二乗の時間を見つける（NFR1.4） |
| 配線された workflow での実行 | 利用先の Actions の実行の記録 | 区分と理由が summary と成果物に出る | **できない**（workflow は U7。この単位は配線しない） | 実測は U7 の後。それまで「観測できなかった」と書く |
| Node 22 以外の版での実行 | 版の組み合わせを回す CI | 22 で通る | **できない**（組み合わせの CI は U7 以降）。作った側の実測として 22・24・26 で lcov が一致した事実だけを記録に書く | 保証は 22 だけ（NFR1.1・NFR1.2） |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| （新設しない） | 既存の PR の check の表示（成功・失敗）と、門自身が出す notice・job summary がそのまま知らせになる | — | PR の画面と job の画面。新しい通知経路は足さない |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| （定めない） | この単位は稼働するサービスではないので、可用性・遅延の目標値を置かない。20 万件で 10 秒の上限は性能の保証でなく網であり、SLO ではない | — |

## Logs & Tracing

- 新しいログの集約、追跡、ダッシュボードは足さない。記録は GitHub Actions の実行の記録、PR の記録、門が出す 5 つの面（結果の JSON、job summary、notice、出力値、標準エラー）が持つ。
- Build and Test の記録には、試験の観測値（実行数・合格数・失敗数・skip 数）、Red の失敗の記録、OB5 の網羅率の突き合わせの結果、base との SHA-256 の突き合わせの結果を書く。「観測できなかった」ものは成功と書かず、そう書く。申告された値は写さない（S5）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 配線された実行の観測は、U7 が workflow を定義して統合された後に、利用先の最初の実行で 1 回行う。

### Open Questions

1. OB5 の網羅率の記録の置き場（追跡表の中か、別の機械が読める file か）。コード生成の計画で決める。
