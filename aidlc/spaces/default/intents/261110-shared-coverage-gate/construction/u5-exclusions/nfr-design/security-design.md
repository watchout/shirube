# U5 u5-exclusions — 安全の設計

この単位は、自由な文字列（除外の path と理由）を新しく受け、分母から file を外せる入口を作る。ここでは、除外の道を入力の file だけに閉じる設計、除外が試験の未実行を隠さない設計、自由な文字列を出力へ出す前の無害化を決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（NFR5.1〜NFR5.7、脅威 T2・T3・T10〜T13）。機能の設計: [rules.md](../functional-design/rules.md)（BR9〜BR11）。
- 土台: U3 の [security-design.md](../../u3-node-gate-slice/nfr-design/security-design.md)（SC1〜SC8）と U4 の [security-design.md](../../u4-thresholds-and-modes/nfr-design/security-design.md)。
- 環境変数の読みの扱い: arc の答え（Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。採った判断は「環境変数を読まない（拒否の文は書かない）」、採らなかった代替は「除外らしい名前の環境変数があれば拒否の文を出す」（名前の集合を門が持つことになり、漏れが穴になる）。設計監査で確かめる。

## SC1 資格情報とネットワークを持たない（NFR5.1）

- 除外を決める code（入力の検査、集合の差、出力の組み立て）と入口の file は、ネットワークの module と資格情報の環境変数を読み込まない。除外の理由が正しいかは確かめない（脅威 T10。独立の監査が読む）。
- 確かめ: 構造の試験が、これらの file の中身にネットワークの module とトークンの名前が現れないことを調べる。

## SC2 除外の道は入力の file だけ（NFR5.2、脅威 T11）

| 試みる道 | 門の扱い | 確かめ |
|---|---|---|
| 入口の別の引数 | ENTRY_ARGUMENTS_INVALID（標準エラー、終了コード 2。U3 のまま） | 負例 |
| 環境変数 | 読まない。反映されない。拒否の文は書かない | (a) 構造の試験: 除外を決める code に環境変数の読みが 0 件。(b) 負例: 除外らしい名前の環境変数を置いても、結果の文書・記録・終了コードが置かない時とバイトまで一致 |
| 入力の別の道（`exclusion`、`excludes`、`denominator.exclusions`、`exclusions[i].extra`） | INPUT_FIELD_UNKNOWN（BR9.1） | 負例 |
| 既定の一覧・前回の結果 | 持たない・読まない | 構造の試験（file の読み書きが無い） |

- 環境の指定が黙って効いたように見えない理由: 報告に「除外 N 件」が出る（OB1〜OB3）。環境で足したつもりでも件数は 0 のまま。

## SC3 除外は分母のソースだけを外す（NFR5.3）

- 除外を引く操作は、解決した分母の集合からの差だけ（BR10.2）。必須の試験の集合（requiredTestPaths）は除外と無関係に決まる（BR10.3）。判定の核は除外を知らず、引いた後の集合と必須の試験の集合を受ける。
- 除外した file の行の記録は、分母に無いので数えられず、未計測にも入らない。分母に残る file は除外があっても未計測で不合格になる。必須の試験が流れなければ NOT_RUN で不合格。
- 確かめ: 試験 file の名前に合う file を除外しても必須から外れない負例、必須の試験が流れない負例、分母に残る file が計測されない負例（すべて一致にならない）。

## SC4 完全一致だけ（NFR5.4、脅威 T12）

- 除外の path は、解決した分母の集合に対する文字列の完全一致だけ。展開・正規化・大文字小文字の畳み込み・symlink の解決をしない。分母の集合は追跡された file の相対 path だけなので、`..` や絶対 path や repository の外を指す path は集合に存在せず、一致しない。
- 一致しない path は、無視せず TARGET_UNRESOLVED（終了コード 2）。directory 名・wildcard・`./` つきの綴り・大文字小文字の違いも同じ。
- 確かめ: これらの負例が終了コード 2 になる試験。

## SC5 自由な文字列の無害化（NFR5.5、脅威 T2）

| 面 | path | 理由 |
|---|---|---|
| 結果の JSON | 入力のとおり保存 | 入力のとおり保存 |
| job summary | U3 の無害化を通し、コードの印で囲む | U3 の無害化を通す |
| notice | 載せない（件数の固定の 1 文だけ） | 載せない |
| 出力値（GITHUB_OUTPUT） | 載せない（`exclusion-count` は数だけ） | 載せない |

- 理由は U4 の根拠と同じ 1 つの規則（1 行、制御文字なし、命令や表の区切りの並びなし、上限）で入力の検査（BR9.3）で拒む。出口の無害化はそれでも残す二重の防御。
- 確かめ: 命令・表の区切りを含む架空の理由（`::error::`、改行、バッククォート、`%0A`、縦線）が入力で失敗になる試験。通る理由と path が summary で無害化されて読める試験。

## SC6 失敗の文に path を写さない（NFR5.6、脅威 T3）

- 分母に無い path の失敗（TARGET_UNRESOLVED）の detail は固定の文で、path の文字列を書かず、field の添字（`exclusions[<i>].path`）で示す。絶対 path・`..` を含む path・長い path が、結果の文書・標準エラー・summary の失敗の文に出ない。
- 確かめ: 絶対 path と `..` を含む path の負例で、失敗の文に path の文字列が無い。

## SC7 検査を通った時だけ反映する（NFR5.7）

- 検査の順は、形 → 必須 → 理由 → 重複（入力の検査。BR9.1〜BR9.4）→ 分母との一致 → 全部除外でないこと（解決。BR10.1・BR10.2）。最初の失敗で測定に進まず終了コード 2。除外なしに黙って戻らない。結果の文書の exclusions は空の配列。

## 脅威と受ける設計

| ID | 受ける設計 |
|---|---|
| T2 | SC5 |
| T3 | SC6 |
| T10 | 門は確かめない（SC1）。出力に件数・path・理由を必ず残す（OB1・OB2）。独立の監査が読む |
| T11 | SC2 |
| T12 | SC4 |
| T13 | performance-design.md の PF3 |

## Assumptions & Open Questions

### Assumptions

- [assumption] 分母の集合が追跡された file の相対 path だけであることは、既存の解決（HygieneLib の解決）が保証する。コード生成の段で、実物の戻り値を読んで確かめる。

### Open Questions

なし。環境変数の読みの扱いは設計監査で確かめる。
