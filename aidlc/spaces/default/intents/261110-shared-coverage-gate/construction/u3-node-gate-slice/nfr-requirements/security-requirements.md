# U3 u3-node-gate-slice — 安全の要件

この単位の門は、利用先の repo の試験を子プロセスとして走らせ、外から来る入力（入力の JSON、利用先の file 名）を読み、結果を CI の面（job summary、注釈、出力値）に書く。ここでは、それが守る安全の要件を NFR5 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR4・NFR5・NFR6。社内の標準 S5（宣言は証拠でない）・S8（失敗を隠さない）・S9（資格情報は用途ごと）。
- 機能の設計: [rules.md](../functional-design/rules.md) の BR2.8（資格情報を渡さない）、BR4.7（無害化）、BR5.1〜BR5.5（入口）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（契約 2 = 入口は `--input` と `--result` だけ）。

## 要件

### NFR5 最小の権限

- **NFR5.1** 試験を走らせる子プロセスの環境は、許可した名前の一覧（GateConstants.childEnvAllowlist: `PATH`、`HOME`、`LANG`、`LC_ALL`、`TZ`）だけを持つ。値は親から写さず、門が置く。`NODE_OPTIONS` と `NODE_PATH` は渡さない。名前を挙げて除く方式にしない（知らない名前の秘密を通すため）。親の環境に、既知の名前（`GITHUB_TOKEN`）・未知の名前・小文字の名前の架空の秘密の 3 種類と、`NODE_OPTIONS`・`NODE_PATH` を置き、子が自分の環境を書き出す架空の試験で、一覧の 5 つの名前だけがあること、どの偽の値も子の中から見えないことを確かめる。workflow の権限を最小にすること（U7、保護対象）は別に残る本防御である。[NFR5、S9、BR2.8]
- **NFR5.2** 入口が受け取る引数は `--input` と `--result` だけ。入力の項目を環境変数や別の引数で足したり上書きしたりできない。入力の JSON の未知のキーは、どの階層でも失敗にする。[NFR5、NFR4、BR1.3、BR5.1]
- **NFR5.3** 子プロセスは、shell を介さず、引数の配列で起動する。入力の文字列（file 名・宣言）を shell の命令として評価しない。試験 file の path は、追跡されている file の一覧（既存の `trackedFiles`）に解決された物だけを渡す。リポジトリの外を指す path や、追跡されていない file は渡らない。[NFR5、脅威 T1]
- **NFR5.4** 利用先の file 名などの自由な文字列を notice・job summary に載せる時は、制御文字と改行を無害にし、GitHub の命令の区切り（`%`、CR、LF）を escape し、summary の path はコードの印で囲む。出力値（GITHUB_OUTPUT）には、区分の名前と数だけを書き、自由な文字列を書かない。悪意のある file 名（改行・`::error::`・バッククォートを含む架空の名前）の負例で確かめる。[NFR5、NFR4、BR4.6、BR4.7、脅威 T2]
- **NFR5.5** 門は、結果の file、job summary、出力値、標準出力と標準エラー以外に書かない。入力で指された file 以外を読まない（子プロセスと既存の `trackedFiles`、`resolveTargets` を除く）。ネットワークの呼び出しを持たない。[NFR5、FR8.5]
- **NFR5.6** 観測の file を置く一時 directory は、利用者だけが読み書きできる形（所有者のみ）で作り、成功でも失敗でも期限超過でも消す。結果の file は一時の file に書いてから名前を替え、途中の状態を残さない。[NFR5、NFR4]
- **NFR5.7** 結果の文書・notice・summary に、環境変数の値、資格情報、絶対 path（利用者のホーム directory を含む）を書かない。書くのは repo からの相対 path と、固定の文型と、観測した数だけ。[NFR5、脅威 T3]
- **NFR5.8** 試験は利用先が自分で書いた、追跡された file であり、門はそれを走らせる。試験の中身の安全は門が保証しない（利用先の信頼の境界）。一方、門は fork の PR の code を権限のある文脈で走らせる使い方をしない。その使い方の禁止と権限の最小化は workflow の定義（U7）が受ける。この単位は「そう使ってはならない」を設計の記録に残す。[NFR5、S9、脅威 T4]

## 脅威の見方（この変更に関わるものだけ）

| ID | 脅威 | 受ける要件 |
|---|---|---|
| T1 | 入力の文字列が shell や path として評価され、任意の命令・外の file の読み書きになる | NFR5.2、NFR5.3 |
| T2 | 利用先の file 名や自由な文字列が、GitHub の注釈・出力値の命令として解釈される | NFR5.4 |
| T3 | 資格情報や利用者の path が、公開の結果・summary に漏れる | NFR5.1、NFR5.7 |
| T4 | 書ける資格情報を持つ job で、利用先（または fork）の試験が走る | NFR5.1、NFR5.8（U7 が本防御） |
| T5 | 古い結果の file が残り、新しい実行の結果に見える | NFR4.6（reliability-requirements.md） |
| T6 | 子プロセスが期限後も残り、後続の job に影響する | NFR4.3（reliability-requirements.md） |

## 気づいたこと

- NFR5.8 のとおり、門は試験の中身を守れない。「記録だけ」の期間でも、試験を走らせる権限は同じ。workflow の権限と実行の文脈は U7 の設計で、保護対象として Owner の決定が要る。

## Assumptions & Open Questions

### Assumptions

- [assumption] 子に渡す環境は許可した名前の一覧だけ（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。秘密を名前で見分けない。親の環境変数に頼る利用先の試験は失敗し、観測できずになる（成功には倒れない）。利用先の workflow が、試験の job に渡す秘密を最小にする本防御は U7 にある。
- [assumption] 一時 directory を所有者のみにする方法（作成時の権限）は、Linux と macOS で同じように働く。Linux で確かめる。
- [assumption] 悪意のある file 名の負例は、Git が許す名前（改行を含む名前）で作る。作れない環境では、結果の整形の部品に直接その名前を渡して確かめる。

### Open Questions

1. 子に渡す名前の追加（利用先が増やしたい場合）は、入力の項目を足す形になる。この単位は固定の 5 つで、要望が出たら別の単位。
