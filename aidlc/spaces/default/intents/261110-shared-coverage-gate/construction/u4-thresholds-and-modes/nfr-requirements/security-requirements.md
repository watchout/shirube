# U4 u4-thresholds-and-modes — 安全の要件

この単位は、利用者の入力から自由な文字列（決定の URL、根拠）を新しく受け、それを結果の JSON と CI の面（job summary、注釈）に出す。また、閾値を下げられる入口を作るので、下げる道が黙って通らないことが安全の中心になる。ここでは、その要件を NFR5 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR4・NFR5、FR3.2〜FR3.5。社内の標準 S5（宣言は証拠でない）・S8（失敗を隠さない）・S9（資格情報は用途ごと）。
- 機能の設計: [rules.md](../functional-design/rules.md) の BR6.1〜BR6.6、BR7.1、BR8.2、BR8.3。土台: U3 の [security-requirements.md](../../u3-node-gate-slice/nfr-requirements/security-requirements.md)（NFR5.1〜NFR5.8）。

## 要件

### NFR5 最小の権限

- **NFR5.1** 門は GitHub を読む資格情報を持たず、ネットワークの呼び出しを持たない。決定の URL は形だけを確かめ、実在・書き手・本文は確かめない（確かめるのは独立の監査）。判定: 入力の検査・判定・出力・入口の file が、ネットワークの module（`node:http`、`node:https`、`node:net`、`node:dns`、`node:tls`、`fetch`）を読み込まず、環境変数からトークンの名前（`GITHUB_TOKEN`、`GH_TOKEN` など）を読まないことを、file の中身を調べる試験で確かめる。入口が読む環境変数は U3 のまま（`GITHUB_RUN_ID`、`GITHUB_RUN_ATTEMPT`、`GITHUB_STEP_SUMMARY`、`GITHUB_OUTPUT`）。workflow が資格情報を受けない宣言は U7（保護対象）が受ける。[NFR5、S9、BR6.6、AC4.2.4]
- **NFR5.2** 閾値を下げる入力は、検査が通らない限り判定に反映されない。検査に失敗した入力は、既定の閾値（行 100%）にも、下げた値にも倒れず、終了コード 2 の入力の失敗になる。判定: threshold の 3 項目のどれかを欠く・壊す・足す負例のすべてで、判定に進まず終了コード 2。[NFR5、NFR4、BR6.1〜BR6.5]
- **NFR5.3** 例外は、入口の引数や環境変数では指定できない。入力の JSON の `threshold` からだけ受ける（U3 の NFR5.2 のまま）。判定: 環境変数に閾値や動作の名前を置いても出力が変わらない負例。[NFR5、BR1.3]
- **NFR5.4** 決定の URL と根拠は、利用者が書いた自由な文字列なので、結果の JSON には入力のとおりに保存し、notice・job summary に載せる時は U3 の無害化（制御文字と改行を無害にし、GitHub の命令の区切りを escape し、summary の path や URL はコードの印で囲む）を通す。出力値（GITHUB_OUTPUT）には自由な文字列を書かない（動作の名前と実際の閾値の数だけ）。根拠は notice に載せない。判定: 命令の区切りを含む架空の根拠（`::error::`、改行、バッククォート、`%0A`）は入力の検査（BR6.5）で失敗になり、URL の形の検査（BR6.4）を通る URL は、無害化の後も元の形で読める。[NFR5、NFR4、BR6.4、BR6.5、BR8.2、BR8.3、脅威 T2]
- **NFR5.5** 結果の文書・notice・summary に、環境変数の値、資格情報、絶対 path を書かない（U3 のまま）。例外の URL に資格情報（`user@host` の形）が入る入力は、形の検査で失敗にする。[NFR5、BR6.4、脅威 T3]
- **NFR5.6** 動作の値は 2 つの名前の完全一致だけで受け、別名・大文字小文字の違い・空白つきを受け付けない。書き間違いが「記録だけ」にも「落とす」にも読み替えられない。判定: `Enforce`、`record_only`、`record`、` enforce`、空文字、null の負例が失敗になる。[NFR5、NFR4、BR7.1、脅威 T8]

## 脅威の見方（この変更に関わるものだけ）

U3 の T1〜T6 は U3 のまま。この単位が足すのは次。

| ID | 脅威 | 受ける要件 |
|---|---|---|
| T2 | 例外の URL・根拠が、GitHub の注釈・出力値の命令として解釈される（U3 の T2 を例外の文字列へ広げる） | NFR5.4 |
| T3 | 例外の URL に資格情報が混ざる、または絶対 path が出る | NFR5.5 |
| T7 | 長い・繰り返しの文字列で検査が遅くなる | NFR1.3（performance-requirements.md） |
| T8 | 書き間違い・別名で、意図しない動作（記録だけ）に倒れる | NFR5.6、NFR4.2（reliability-requirements.md） |
| T9 | 決定が実在しない、書き手が Owner でない、または本文が値を認めていないのに、閾値が下がる | 門は確かめない（NFR5.1）。独立の監査が公開の記録と照らして確かめる。「門が保証しないこと」として rules.md に書いた |

## 気づいたこと

- T9 は門では防げず、防げないことを受け入れている（資格情報を持たせない選択の裏返し）。この補い方は今ある独立の監査で行い、新しい道具や別の取り組みには広げない。広げる前に Owner に伺う。
- 動作を「記録だけ」にできる入力は、書き手が意図して書いた時だけ有効だが、その意図を門は確かめない。「記録だけ」を使った PR は、結果の JSON と job summary に動作が残るので、監査が気づける。

## Assumptions & Open Questions

### Assumptions

- [assumption] URL の形の検査は正規表現でなく、文字列を区切って部品ごとに確かめる形にもできる。どちらにするかは実装の段で、NFR1.3（線形の時間）を満たす方を選ぶ。
- [assumption] 根拠の自由な文字列は、制御文字を含まない 1 行に限るので、U3 の無害化に新しい種類の文字は加わらない。

### Open Questions

なし。
