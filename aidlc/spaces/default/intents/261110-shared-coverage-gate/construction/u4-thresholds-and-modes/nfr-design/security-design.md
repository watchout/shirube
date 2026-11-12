# U4 u4-thresholds-and-modes — 安全の設計

この単位が新しく受ける入力は、決定の URL、根拠、閾値の値、動作の名前。どれも利用者が書く自由な入力で、閾値を下げる道になる。ここでは、その道を黙って通さない設計と、自由な文字列を安全に出す設計を決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（NFR5.1〜NFR5.6、脅威 T2・T3・T7〜T9）、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)（NFR4.5）。機能の設計: [rules.md](../functional-design/rules.md)（BR6.1〜BR6.6、BR7.1、BR8.2、BR8.3）。
- 土台: U3 の [security-design.md](../../u3-node-gate-slice/nfr-design/security-design.md)（SC1〜SC8、特に SC5 の面ごとの無害化）。

## SC1 資格情報とネットワークを持たない（NFR5.1）

- 決定の URL は、文字列の形の確かめだけで、読みに行かない。入力の検査・判定・整形・入口の file は、ネットワークの module を import せず、トークンの名前（`GITHUB_TOKEN`、`GH_TOKEN`、`ACTIONS_*TOKEN` など）の環境変数を読まない。入口が読む環境変数は U3 の 4 つ（`GITHUB_RUN_ID`、`GITHUB_RUN_ATTEMPT`、`GITHUB_STEP_SUMMARY`、`GITHUB_OUTPUT`）のまま。
- 確かめる物: `scripts/coverage-gate/` の全 file のソース文字列を読み、`node:http`、`node:https`、`node:net`、`node:dns`、`node:tls`、`fetch(`、`TOKEN`、`secrets` が現れないことを調べる試験（file の中身を調べる試験。U3 の核の 7 file の確かめを全 file に広げる）。
- 門が確かめないこと（決定の実在、書き手、本文が値を認めているか）は、独立の監査が確かめる。この分担を `rules.md` の「門が保証しないこと」に書いてある。workflow が資格情報を受けない宣言は U7（保護対象）が受ける。

## SC2 検査の順と最初の失敗（NFR5.2、NFR4.5）

入力の検査の順（U3 の検査の後ろに足す）:

1. U3 の検査（読めるか、版、未知のキー、shape、分母、必須の試験、期限と総予算）。未知のキーの集合に `threshold` と `mode` を足す。
2. `mode`（省略は enforce。値の集合に含まれなければ失敗）。
3. `threshold` が無ければ例外なし。有れば object であること → 3 項目がそろっていること → 余分なキーが無いこと → `percent` → `decisionUrl` → `rationale` の順に確かめる。

- 各項目の確かめは小さな純粋な関数で、最初の失敗の `{reasonCode, field, detail}` を返し、後続を確かめない。失敗は既定の閾値にも下げた値にも倒れず、測定に進まない（終了コード 2）。
- 余分なキーの確認は、`Object.keys` で集めた名前の集合との差で行う。キー名を使って object に代入する処理を書かない（prototype 汚染を避ける。U3 の SC2 と同じ）。入力の JSON を読む時は、`__proto__` や `constructor` というキー名も未知のキーとして失敗にする（負例の試験）。

## SC3 入力の経路を増やさない（NFR5.3）

- 閾値と動作は、入力の JSON の `threshold` と `mode` からだけ受ける。入口の引数は `--input` と `--result` のままで、環境変数・別の引数・設定 file から閾値や動作を読まない。
- 確かめる物: 環境変数に閾値や動作らしい名前（`COVERAGE_THRESHOLD`、`COVERAGE_MODE`、`MODE`、`THRESHOLD` など）を置いても出力が変わらない試験。

## SC4 自由な文字列の扱い（NFR5.4）

自由な文字列は 2 つ（決定の URL、根拠）。入口で厳しく検査し、出口で面ごとに無害化する（二重の防御）。

| 面 | 決定の URL | 根拠 |
|---|---|---|
| 入力の検査 | 形に合うものだけ受ける。英数字と少数の記号だけなので、制御文字・空白・引用符・改行が入らない | 1 行、制御文字なし、空白だけでない、300 文字以内 |
| 結果の JSON | 入力のとおりに保存する | 入力のとおりに保存する |
| job summary | U3 の無害化を通し、コードの印で囲む | U3 の無害化を通す（縦線や改行が表の形を壊さない） |
| notice | URL を載せる（形を検査済みで命令の区切りを含まない。それでも U3 の無害化を通す） | 載せない |
| 出力値（GITHUB_OUTPUT） | 載せない | 載せない |

- 出力値に載るのは動作の名前（集合に含まれる 2 つのどちらか）と実際の閾値の数だけ。
- 確かめる物: 命令の区切り（`::error::`、`%0A`、改行、バッククォート、`|`）を含む架空の根拠が入力の検査で失敗になる負例。検査を通る URL と根拠が、summary と notice で表の形・注釈の形を壊さない正例。

## SC5 資格情報・絶対 path を出さない（NFR5.5）

- 資格情報つきの URL（`https://user:pass@github.com/...`、`https://user@github.com/...`）は URL の形の検査で失敗にする。URL の部品の文字の集合に `@` と `:`（`https:` の後を除く）を含めない。
- 例外の表示に載るのは、入力の URL・値・根拠・実際の閾値だけ。絶対 path や環境変数の値を足さない。

## SC6 動作の値は完全一致（NFR5.6）

- 動作の集合は判定の核の定数の 1 か所（`MODES`）。入力の検査は `MODES.includes` 相当で完全一致だけを受け、`toLowerCase` や `trim` をかけない。別名の表を持たない。
- 負例: `Enforce`、`ENFORCE`、`record_only`、`record only`、`record`、` enforce`、`enforce `、空文字、null、数、真偽、配列、object。すべて `INPUT_FIELD_INVALID`（field `mode`）。

## SC7 信頼の境界の記録（T9）

- 門が確かめないこと（T9）は、設計の記録に残す。「閾値の例外を使った PR は、結果の JSON と job summary に URL・値・根拠・実際の閾値が残る」ので、独立の監査が公開の記録と照らして確かめられる。確かめる手順そのものは新しい道具にしない（今ある独立の監査で行い、広げる前に Owner に伺う）。
- 動作を record-only にした PR も、結果の JSON と job summary に動作が残る。監査は、その動作が意図したものかを見られる。

## Assumptions & Open Questions

### Assumptions

- [assumption] URL の部品の文字の集合（owner = 英数字と `-`、repo = 英数字と `.`・`_`・`-`）は GitHub の命名規則の範囲で、コメントの番号の位置の `issuecomment-` の後は数字だけ。GitHub の規則が変わっても、門の検査は厳しい側に倒れる（受け付けない）。
- [assumption] notice に URL を載せるのは、利用者が決定を辿れるようにするため。URL は形を検査済みで、悪意のある文字列は入らない。

### Open Questions

なし。
