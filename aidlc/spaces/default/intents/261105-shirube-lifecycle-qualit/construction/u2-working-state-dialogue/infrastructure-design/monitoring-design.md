# U2 u2-working-state-dialogue — 監視の設計（monitoring-design）

## Sources

- 入力: [observability-design](../nfr-design/observability-design.md)（OB1〜OB6）、[performance-design](../nfr-design/performance-design.md)（PF1〜PF3）、[reliability-design](../nfr-design/reliability-design.md)、[infrastructure-specification](infrastructure-specification.md)、[questions](infrastructure-design-questions.md)（Q3 = A、Q4 = A）。
- 本書は設計であり、実行結果ではない。U2 は常駐せず、自分では file・log・metric を書かない（Q2 = A）ので、常駐の監視・alert・dashboard・分散 tracing は持たない。ここでの「監視」は、PR の CI の結果と試験の機械可読な記録、呼出側へ返す値で、作者・独立の監査・統合する席が状態を判断できることを指す。

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| 試験の合格・失敗・skip の件数 | `npm test`（node:test）の出力、CI の `test` job | 失敗 0。skip・todo・timeout・未実行は成功に数えない。skip・todo の 0 は LC7 の記録の試験が子の `node --test` の結果から数えて確かめる（CI の `test` job 自体は node:test の skip を止めない。`check:no-failure-hiding` は Shirube の実物に無く、担保にしない） | NFR10.2。必須工程の欠落を成功に読み替えない（S8） |
| `scripts/working-state/` の行の網羅率 | LC7 の機械可読な記録（試験の中で Node の lcov を解析） | 100%。未計測・計測不能・skip は成功に数えない | team.md の行の網羅率の床。申告値は証拠にしない（S5、NFR1.1・NFR1.1b） |
| 網羅率の分母の file 数 | LC7 の記録（分母はディスクの列挙で決める。列挙した file が lcov に現れなければ未計測として失敗） | 1 以上。0 件は失敗 | 対象 0 件のまま 100% と出て通る穴を塞ぐ（A-INF-3） |
| 除外した行・file の件数と理由 | LC7 の記録・PR 本文 | 0 を既定。除外は PR に理由を書き、独立監査で確かめる | 除外で網羅率を作らない |
| 構造・重複・guard の検査 | `lint:structural`・`lint:guard`・`hygiene:jscpd`・`hygiene:coverage`・dependency-cruiser・knip（CI の `hygiene` job。knip は production の entry を 1 件足す、Q6 = A） | 違反 0 | 1 file 300 行・関数 50 行・複雑さ 10・依存方向・循環・重複（NFR10.1） |
| 核の構造の試験 | `tests/working-state-*.test.mjs` | 核に `Date`・乱数・UUID・環境変数・file・子 process・network が無い。理由コードの定義が無い。部品の import に循環が無い | NFR5.1・NFR5.1a・NFR5.2、BR8.4 |
| 子 process の観測の結果の分類 | 呼出側へ返す Observation（present・unsupported_version・cannot_start・missing・timed_out・budget_exceeded・permission_denied） | 起動できない・枠超過・権限拒否は観測不能。成功・未導入に読み替えない | NFR2.1・NFR6.1a。U2 はこの値を保存しない |
| 子の起動の負例 | `tests/working-state-*.test.mjs` | 対象の根・`node_modules/.bin`・PATH の相対要素・symlink 経由の同名の実行ファイルが起動されない。架空の token が子へ渡らない | Q4 = A の条件が守られている証拠。宣言ではなく実測 |
| 観測値の取り扱いの負例（決定 116・120、対象の結び） | `tests/working-state-*.test.mjs`（T1.1u・T3.2o・T3.4o・T5.2o・T6.4o・T8.3o・T8.3p・T3.4p・T6.2m・T6.2n・T6.2o・T6.2p と観測値の負例。T6.2m〜p は BR6.2・BR6.3 の判定の順で、閉じた形で値が一致し全出典が同じ値なら一致を確認を先に判定、それ以外で観測が変われば無効） | 秘密らしい・形式に合わない架空の観測値が、Observation・draft・案内・試験の出力のどこにも値も digest も現れない。開いた形の架空の値が保持・digest・表示に現れず presence・lengthBucket・matchGroup だけ（withheld の時は固定の分類だけで lengthBucket・matchGroup を持たない。例外を起こす入力でも値が出ない = T3.4p）。開いた形の分類だけの変化で observationDigest が変わり古い回答・draft が無効になる（T8.3p）。開いた形の中身だけの変化を「検出できた」と扱わない。対象を名指さない出典が観測不能（malformed）。判定の関数が LC2 と LC5 で同じ 1 つ | Owner の決定 116・120 が守られている証拠。宣言ではなく実測 |
| 開いた形の生の値の経路の構造の試験 | 同上 | LC1 の返り値が診断・記録・案内の組み立てへ渡る経路が無い（主の証拠は動的な走査: 架空の開いた形の値を入れて返り値・draft・案内・試験の出力の全体を走査し、値が現れないこと。import の向きと呼び出しの形を読む静的な試験は補助で、粒度は Code Generation で決め、文字列検索だけにしない）。判定の関数が何も import しない | 生の値が LC1→LC2 の受け渡しの外へ出ない（NFR2.6・NFR2.6a） |
| 秘密の検査（gitleaks） | CI の `hygiene` job の中の `secrets` の step（`id: secrets`） | 検出 0 | 公開の fixture に秘密らしい形を置かない（NFR2.2・NFR2.4） |
| 観測の実測（処理時間・CPU・memory） | 計測した時だけ | 未計測の間は「未計測」と書く | 適合と示さない（PF3、NFR1.1a） |

## Alerts

alert は通知の仕組みを持たない。次の条件が成立した時、CI の検査が失敗し、PR の統合が止まる。通知先は PR の作者と統合する席である。

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| 試験の失敗・skip・未実行 | `test` job が success でない、または skip・未実行がある | 止める（必須） | PR の作者。統合しない |
| 網羅率の未達・未計測 | 行の網羅率が 100% 未満、分母 0、未計測、記録の形が取れない | 止める（必須） | PR の作者。独立監査の項目 |
| 構造・重複・guard の違反 | `hygiene` job が success でない | 止める（必須） | PR の作者 |
| 秘密の検出 | `hygiene` job の `secrets` の step が success でない | 止める（必須） | PR の作者。Owner に知らせる（資格情報の漏れの疑い） |
| 観測値の取り扱いの負例の失敗 | 値・digest が出力に現れた、開いた形の値が保持・表示された、対象を名指さない出典が確認済みになった | 止める（致命。KY 表の致命 × 全部。足し 1 の秘密の値の画面表示に当たる） | PR の作者・独立監査。設計の直しは Owner の判断 |
| 子の起動の負例の失敗 | 同名の実行ファイルが起動された、環境変数が子へ渡った | 止める（致命。KY 表の致命 × 全部） | PR の作者・独立監査。セキュリティの設計の直しは Owner の判断 |
| 保護対象への変更 | 差分に workflow・`.shirube/**`・`package.json`・lockfile・契約 `.v2` が入る | workflow・`.shirube/**` は `protected_paths` で機械が扱う。`package.json`・lockfile・契約 `.v2` は `protected_paths` に入っておらず、機械の関門は無い（作者の PR 本文の確認と独立監査の項目。人の確認） | PR の作者・独立監査。入っていたら Owner の判断（守る物） |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| なし | 置かない | 根拠（実測・利用規模）が無い。稼働率・応答時間・スループットの SLO は作らない |

## Dashboards / Logs

- **Logs**: U2 は file・log を書かず、保存もしない。診断（観測の参照・理由・件数）は、呼出側へ返す値（Observation・GuidanceMessage・ConfigurationDraft）と試験の出力にだけ載せる。入力の写し・秘密らしい値は、どの出先にも載せない（security-design SC2）。
- **Tracing**: 持たない。
- **Dashboards**: 持たない。PR の CI の結果、試験の出力、LC7 の記録が見る場所である。
- **利用先での利用状況**: U2 が配線される後続の単位（U3 以降）で扱う。U2 だけでは観測先が無い。

## Not Set (No Evidence)

SLI・SLO の数値、alert の閾値（上の合格の条件を除く）、dashboard、tracing、常駐の監視。根拠が得られた時に追加する。

## Assumptions & Open Questions

### Assumptions

- CI の `test`・`hygiene` の job 名と、`hygiene` の中の `secrets` の step の結果は、`origin/main`（head `7fa98d1`、`f2d509b` で読み直して同じ）の既存の workflow のとおりとする。
- U2 が保証しないこと（開いた形の中身だけの変化は検出しない、決定 120）は、この監視の対象外。実物の読み直しは U3・U5 の持ち物で、この表の合格を「開いた形の一致を確認済み」と読まない。この設計は workflow を変えない。
- 計測した実行環境の版は、Build and Test の記録に具体的に書く。それまでは未確認である。

### Open Questions

None。

（要約確認 Looks correct（2 回目。arc が決定 95 により入力）の後に保存し直した。決定 116・120・対象の結びを反映済み。未決の問いは無い。）
