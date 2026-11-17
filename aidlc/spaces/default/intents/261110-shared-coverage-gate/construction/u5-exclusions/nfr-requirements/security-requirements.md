# U5 u5-exclusions — 安全の要件

この単位は、利用者の入力から自由な文字列（除外の path と理由）を新しく受け、結果の JSON と CI の面（job summary、注釈）に出す。また、分母から file を外せる入口を作るので、外す道が黙って広がらないこと、外しても試験の未実行を隠さないことが安全の中心になる。ここでは、その要件を NFR5 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR4・NFR5、FR5.1〜FR5.4。社内の標準 S5（宣言は証拠でない）・S8（失敗を隠さない）・S9（資格情報は用途ごと）。
- 機能の設計: [rules.md](../functional-design/rules.md) の BR9.1〜BR9.5、BR10.1〜BR10.4、BR11.2・BR11.3・BR11.6。土台: U3 の [security-requirements.md](../../u3-node-gate-slice/nfr-requirements/security-requirements.md)（U3 の NFR5 の各項）と U4 の [security-requirements.md](../../u4-thresholds-and-modes/nfr-requirements/security-requirements.md)（NFR5.1〜NFR5.6、脅威 T2〜T9）。
- 環境変数の読みの扱い: arc の答え（Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。門が環境変数を読まないことで満たし、拒否の文は書かない。代わりに構造の試験と負例を置く。設計監査で確かめる。

## 要件

### NFR5 最小の権限と、除外の道を広げない

- **NFR5.1** 門は GitHub を読む資格情報を持たず、ネットワークの呼び出しを持たない（U3・U4 のまま）。除外の理由が正しいかは確かめない（確かめるのは独立の監査。rules.md「門が保証しないこと」）。判定: 除外を決める code と入口の file が、ネットワークの module（`node:http`、`node:https`、`node:net`、`node:dns`、`node:tls`、`fetch`）を読み込まず、トークンの名前を環境変数から読まないことを、file の中身を調べる試験で確かめる。[NFR5]
- **NFR5.2** 除外を足せる道は、入力の file の `exclusions` だけ。環境変数・ほかの引数・既定の一覧・前回の結果では足せない。判定は 2 つ。(a) 構造の試験: 除外を決める code（入力の検査、除外を引く処理、出力の組み立て）に環境変数の読み（`process.env` など）が 0 件であること。(b) 負例: 除外らしい名前の環境変数（`EXCLUSIONS`、`COVERAGE_EXCLUDE` など）を置いて流しても、結果の文書・記録・終了コードが、置かない時とバイトまで一致する。別の引数は ENTRY_ARGUMENTS_INVALID（終了コード 2）、入力の file の別の道（`exclusion`、`excludes`、`denominator.exclusions`、`exclusions[i].extra`）は INPUT_FIELD_UNKNOWN。拒否の文を環境の側に出さない（採らなかった代替。名前の集合を門が持つことになる）。報告に「除外 N 件」が出るので、環境の指定が黙って効いたようには見えない。[NFR5、BR10.4]
- **NFR5.3** 除外は理由つきで名指した file だけを種別に応じて分母（source）または必須の試験の集合（test）から外し、NOT_RUN・未計測の決め方を変えない。除外が、名指さない流れていない必須の試験や、測れていない分母の file を隠す形がない。理由を残さずに試験を外す形（testTargets を狭めるだけ）は除外ではなく、門は記録しない。判定: 名指さない試験が流れなかった時に、ほかの file の除外があっても NOT_RUN になる負例、source の除外が試験の除外を意味しない負例（重なりの反例）、除外した source の記録が分母に数えられない負例、除外した test が path・理由・種別つきで exclusions に残る正例。[NFR5、NFR4、BR10.3]
- **NFR5.4** 除外の path は、解決した分母のソースの file または必須の試験の file との文字列の完全一致だけで受ける。directory 名・wildcard・`./` と `..` を含む綴り・大文字小文字の違い・追跡されていない file・repository の外を指す path は、すべて分母のソースにも必須の試験にも一致しないので失敗になる（無視しない）。展開・正規化・symlink の解決を門がしない。判定: これらの負例が TARGET_UNRESOLVED（終了コード 2）になる。[NFR5、BR10.1、脅威 T12]
- **NFR5.5** 除外の path と理由は、利用者が書いた自由な文字列なので、結果の JSON には入力のとおりに保存し、job summary に載せる時は U3 の無害化（制御文字と改行を無害にし、GitHub の命令の区切りを escape し、path や URL はコードの印で囲む）を通す。理由は U4 の根拠と同じ規則で 1 行・制御文字なし・命令や表の区切りの並びなしに限り、さらに決定の URL（U4 の decisionUrl と同じ共有の形の規則）を空白で区切って 1 つ以上含むことを要し、入力の検査（BR9.3・BR9.5）で拒む。URL の実在・書き手・本文は門が確かめず、監査が照らす（出口の無害化はそれでも残す二重の防御）。notice には除外の件数の固定の 1 文だけを添え、path も理由も載せない。出力値（GITHUB_OUTPUT）には自由な文字列を書かない（`exclusion-count` は数だけ）。判定: 命令・表の区切りを含む架空の理由（`::error::`、改行、バッククォート、`%0A`、縦線 `|`）が入力の検査で失敗になる。通る理由と path が summary で無害化されて元の形で読める。[NFR5、BR9.3、BR11.2、BR11.3、脅威 T2]
- **NFR5.6** 入力の失敗の文（detail）は固定の文で、除外の path の文字列を書かず、位置（`exclusions[<i>].path`）だけで示す。長い path・絶対 path・repository の外を指す path を、結果の文書・標準エラー・summary の失敗の文に写さない。結果の文書・notice・summary に、環境変数の値、資格情報、絶対 path を書かない（U3 のまま）。判定: 絶対 path と `..` を含む path を渡した負例で、失敗の文の中に path の文字列がない。[NFR5、BR10.1、脅威 T3]
- **NFR5.7** 除外の宣言は、検査を全部通った時だけ分母に反映される。検査の途中の失敗（キーの不足、型違い、理由が不正、同じ path の重複、理由に決定の URL が無い、どちらの集合にも無い path、全部除外）は、除外なしに黙って戻して続行しない。最初の失敗で測定に進まず終了コード 2。判定: 各失敗の負例のすべてで、判定に進まず終了コード 2、結果の文書の exclusions は空。[NFR5、NFR4、BR9.1〜BR9.5、BR10.1、BR10.2]

## 脅威の見方（この変更に関わるものだけ）

U3 の T1〜T6、U4 の T2・T3・T7〜T9 は、それぞれ U3・U4 のまま。この単位が足すのは次。

| ID | 脅威 | 受ける要件 |
|---|---|---|
| T2 | 除外の path・理由が、GitHub の注釈・出力値の命令として解釈される（U3・U4 の T2 を除外の文字列へ広げる） | NFR5.5 |
| T3 | 除外の失敗の文に、絶対 path や repository の外の path が出る | NFR5.6 |
| T10 | 除外が、テストの無い file を黙って分母から外し、割合を不当に上げる（理由が嘘・不当） | 門は理由の妥当性を確かめない（NFR5.1）。独立の監査が入力の差分と結果の JSON の exclusions・分母の件数を読んで確かめる。「門が保証しないこと」として rules.md に書いた。門は、除外を件数・path・理由つきで必ず出力に残す（NFR4.6、NFR4.7。observability-requirements.md） |
| T11 | 環境変数・別の引数・入力の別の道で、呼び出し側の宣言なしに除外が足される | NFR5.2 |
| T12 | 綴りの違い（`./`、`..`、大文字小文字、directory 名、wildcard）で、意図しない file が外れる、または宣言が黙って効かない | NFR5.4 |
| T13 | 長い・繰り返しの文字列や大量の除外で、検査が遅くなる | NFR1.3（performance-requirements.md） |

## 気づいたこと

- T10 は門では防げず、防げないことを受け入れている（理由の中身は人の判断）。この補い方は今ある独立の監査で行い、新しい道具や別の取り組みには広げない。広げる前に Owner に伺う（プロジェクトの訂正の記録）。
- 除外が「0 件」であることも出力に残る（exclusions は空の配列、exclusionCount は 0）。除外が使われていない実行と、使われた実行を、結果の JSON から区別できる。

## Assumptions & Open Questions

### Assumptions

- [assumption] 命令や表の区切りの並びの規則は U4 の根拠の規則と同じ 1 つで、新しい種類の文字は加わらない。
- [assumption] 除外の path を分母の集合と照らす時、集合の側（追跡された file の名前）は repository の中の相対 path だけなので、`..` や絶対 path は集合に存在しえない。展開や解決をしなくても、完全一致で足りる。

### Open Questions

なし。環境変数の扱い（拒否の文を書かない読み）は arc の答えを得ており、設計監査で確かめる。
