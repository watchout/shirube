# U4 u4-thresholds-and-modes — 監視の設計（monitoring-design）

この単位は新しい監視の仕組み（収集、通知、ダッシュボード）を足さない。門自身が出す 4 つの観測の面（結果の JSON、job summary、注釈、出力値）と標準エラーが、そのまま監視の入口になる。ここでは、この PR で観測できる物と、配線（U7）の後でしか観測できない物を分けて書く。後者を前者の成功に読み替えない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [observability-design.md](../nfr-design/observability-design.md)（OB1〜OB6）、[reliability-design.md](../nfr-design/reliability-design.md)、[security-design.md](../nfr-design/security-design.md)。要件: [observability-requirements.md](../nfr-requirements/observability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（NFR7）。土台: U3 の [monitoring-design.md](../../u3-node-gate-slice/infrastructure-design/monitoring-design.md)。
- 評価の指標は自社で観測できるものだけ（team.md の Mandated。NFR10.1）。

## Metrics & KPIs

| Metric | Source | Threshold | この PR で観測できるか | Why it matters |
|---|---|---|---|---|
| 試験の結果 | `npm test` の実行の記録（実行数・合格数・失敗数・skip 数） | 失敗 0、skip 0、実行数が期待どおり（実行されない・時間切れは成功に数えない） | できる | 規則 BR6.1〜BR8.6 の正例・負例を確かめる（NFR7.1） |
| Red の失敗の記録 | TDD の Red の commit の実行の記録 | 実装が無い状態で新しい試験が失敗する | できる | 試験が実際に確かめている（NFR7.1） |
| 足す・触る file の行の網羅率 | `scripts/coverage-gate/` の足した・触った file に対する、門自身の結果の JSON と Node の組込みの lcov の別計算の突き合わせ | 100%、2 つの値が一致、対象が 0 件でない | できる | 100% の床を観測した値で残す（NFR7.2）。対象 0 件・記録なし・不一致は成功に数えない |
| 動作ごとの区分の同一 | 同じ入力の mode だけを変えた判定の結果 | `outcome`・`reasonCodes`・`perFile` が等しく、`shouldFail` だけが違う（6 通り） | できる | 記録だけが失敗を隠さない（NFR4.1） |
| 例外が区分で消えないこと | 一致・不一致・観測できずの結果の文書と summary | 3 つすべてで例外が残る | できる | 閾値を下げた事実を隠さない（NFR4.6・NFR4.8） |
| 後ろ向きの互換 | U3 の出力から固定した例（golden）との比較 | 例外も動作も無い入力で 4 つの面がバイトまで一致 | できる | 既存の挙動を変えない（NFR8.1） |
| 追加と置き換えだけであること | 足した file を除き置き換えた試験を戻した木で既存の `npm test` を流し、base の実物と SHA-256 を突き合わせる | 既存の試験が通り、base と一致を 1 回観測する | できる | 戻せる（NFR8.3） |
| 既存の構造の検査 | dependency-cruiser・knip・jscpd・ESLint・OWN-01 の実行の結果 | 失敗 0（当たった場合は PR に理由を書く） | できる | NFR9.1〜NFR9.3 |
| 入力の検査の時間 | 上限ちょうどの長さの繰り返しの文字列での失敗までの時間 | 1 秒以内（網であって保証ではない） | できる | 後戻りの無い検査（NFR1.3） |
| ネットワーク・資格情報を持たないこと | `scripts/coverage-gate/` の全 file の中身を調べる試験 | 通信の module・トークンの名前が現れない | できる | NFR5.1 |
| 例外・動作の利用の数 | 利用先の結果の JSON の `mode`・`thresholdException` の有無・`effectiveThresholdPercent` | 集計の手引きは U8 | **できない**（配線は U7、集計は U8） | 実測は U7 の後。それまで「観測できなかった」と書く |
| 配線された workflow での表示 | 利用先の Actions の画面の summary・注釈の見え方 | 例外の行・warning が読める | **できない**（workflow は U7） | それまで「観測できなかった」と書く |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| （新設しない） | 閾値を下げた事実は、門が出す summary の最初の行と注釈（warning）で知らせる。動作 record-only の一致でない結果も warning | — | PR の画面と job の画面。新しい通知経路は足さない |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| （定めない） | この単位は稼働するサービスではないので、可用性・遅延の目標値を置かない。1 秒・10 秒の上限は性能の保証でなく網であり、SLO ではない | — |

## Logs & Tracing

- 新しいログの集約、追跡、ダッシュボードは足さない。記録は GitHub Actions の実行の記録、PR の記録、門が出す面（結果の JSON、job summary、注釈、出力値、標準エラー）が持つ。
- Build and Test の記録には、試験の観測値、Red の失敗の記録、行の網羅率の突き合わせの結果、golden の比較の結果、base との SHA-256 の突き合わせの結果を書く。「観測できなかった」ものは成功と書かず、そう書く。申告された値は写さない（S5）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 配線された実行の観測（summary の見え方、注釈の種類の見え方）は、U7 が workflow を定義して統合された後に、利用先の最初の実行で 1 回行う。

### Open Questions

なし。
