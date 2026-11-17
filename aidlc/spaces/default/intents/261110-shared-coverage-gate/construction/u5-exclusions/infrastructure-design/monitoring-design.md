# U5 u5-exclusions — 監視の設計（monitoring-design）

この単位は新しい監視の仕組み（収集、通知、ダッシュボード）を足さない。門自身が出す 4 つの観測の面（結果の JSON、job summary、注釈、出力値）と標準エラーが、そのまま監視の入口になる。ここでは、この PR で観測できる物と、配線（U7）の後でしか観測できない物を分けて書く。後者を前者の成功に読み替えない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [observability-design.md](../nfr-design/observability-design.md)（OB1〜OB7）、[reliability-design.md](../nfr-design/reliability-design.md)、[security-design.md](../nfr-design/security-design.md)。要件: [observability-requirements.md](../nfr-requirements/observability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)。土台: U3・U4 の同名の監視の設計。
- 評価の指標は自社で観測できるものだけ（team.md の Mandated。NFR10.1）。

## Metrics & KPIs

| Metric | Source | Threshold | この PR で観測できるか | Why it matters |
|---|---|---|---|---|
| 試験の結果 | `npm test` の実行の記録（実行数・合格数・失敗数・skip 数） | 失敗 0、skip 0、実行数が期待どおり（実行されない・時間切れは成功に数えない） | できる | 規則 BR9.1〜BR11.6 の正例・負例を確かめる（NFR7.1） |
| Red の失敗の記録 | TDD の Red の commit の実行の記録 | 実装が無い状態で新しい試験が失敗する | できる | 試験が実際に確かめている（NFR7.1） |
| 足す・触る file の行の網羅率 | `scripts/coverage-gate/` の足した・触った file に対する、門自身の結果の JSON と Node の組込みの lcov の別計算の突き合わせ | 100%、2 つの値が一致、対象が 0 件でない | できる | 100% の床を観測した値で残す（NFR7.2） |
| 除外が必須の試験・未計測を隠さないこと | 除外ありの負例の結果（名指さない必須の試験が流れない、source の除外だけで同名の型の試験が必須のまま NOT_RUN、分母に残る file の未計測、試験の失敗）と、test の除外が exclusions に残る正例 | 負例はすべて一致にならない | できる | 除外が失敗を隠さない（NFR4.3、NFR4.11） |
| 除外が毎回見えること | 区分 × 動作 × 閾値の例外 × 除外の有無の表で、summary の最初の行の有無・位置・件数 | 除外 1 件以上で必ず出る。0 件で出ず U4 とバイトまで一致 | できる | NFR4.12 |
| 分母に無い path・全部除外の失敗 | TARGET_UNRESOLVED・TARGET_EMPTY の負例（directory 名、wildcard、綴りの違い、追跡されていない file、絶対 path、必須の試験の全部除外）と、理由に決定の URL が無い INPUT_FIELD_INVALID の負例 | すべて終了コード 2。失敗の文に path の文字列が無い | できる | NFR4.2、NFR5.4、NFR5.6 |
| 除外の道が入力の file だけであること | 構造の試験（除外を決める code に環境変数の読みが 0 件）と負例（除外らしい環境変数を置いても結果・記録が変わらない） | 読み 0 件、出力がバイトまで一致 | できる | NFR5.2 |
| 後ろ向きの互換 | U3・U4 から固定した例（golden）との比較 | 除外が無い入力（省略・空の配列）で 4 つの面がバイトまで一致 | できる | 既存の挙動を変えない（NFR8.1） |
| 追加と置き換えだけであること | 足した file を除き置き換えた試験を戻した木で既存の `npm test` を流し、base の実物と SHA-256 を突き合わせる | 既存の試験が通り、base と一致を 1 回観測する | できる | 戻せる（NFR8.3） |
| 既存の構造の検査 | dependency-cruiser・knip・jscpd・ESLint・OWN-01 の実行の結果 | 失敗 0（当たった場合は PR に理由を書く） | できる | NFR9.1〜NFR9.3 |
| 検査の時間 | 上限ちょうどの繰り返しの理由、分母にない長い path、分母 5,000 件・除外 1,000 件の入力での時間 | 1 秒・10 秒以内（網であって保証ではない） | できる | 後戻りと二乗の無い検査（NFR1.2、NFR1.3） |
| ネットワーク・資格情報を持たないこと | `scripts/coverage-gate/` の全 file の中身を調べる試験 | 通信の module・トークンの名前が現れない | できる | NFR5.1 |
| 除外の利用の数 | 利用先の結果の JSON の `exclusionCount`・`exclusions`・`denominator.resolvedFileCount` | 集計の手引きは U8 | **できない**（配線は U7、集計は U8） | 実測は U7 の後。それまで「観測できなかった」と書く |
| 配線された workflow での表示 | 利用先の Actions の画面の summary の節・注釈の見え方 | 最初の行・除外の節・「Exclusions: N.」が読める | **できない**（workflow は U7） | それまで「観測できなかった」と書く |

## Alerts

- 新しい警報は足さない。除外の不正・分母との不一致・全部除外は、門自身が終了コード 2 と注釈（error）で出す。除外の利用そのものは警報でなく、注釈の種類を変えず summary と結果の JSON に残す（OB2・OB3）。
- 除外が割合を不当に上げていないかは、機械の警報でなく独立の監査が入力の差分と結果の JSON を読んで確かめる（rules.md「門が保証しないこと」）。

## Dashboards / Logs

- ダッシュボードは足さない。結果の JSON が集計の入口で、集計の仕方は U8 の手引きに書く。
- 失敗の記録は標準エラーと結果の JSON の `inputFailure`。除外の path は失敗の文に写さない（SC6）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 観測できる物は、この PR の試験と既存の CI の検査の結果だけ。配線後の表示と利用の数は、U7・U8 の後の観測とする。

### Open Questions

なし。
