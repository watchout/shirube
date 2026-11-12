# U4 u4-thresholds-and-modes — 信頼性・失敗の扱いの要件

この単位は「記録だけ」という、落とさない動作を足す。落とさない動作は、失敗を隠す入り口になりやすい。ここでは、落とさなくても失敗を成功と読み替えない要件と、決定性、新旧の同居を、NFR2・NFR4・NFR8 の枝番で書く。可用性の目標（SLA）は U3 と同じく持たない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR2・NFR4・NFR8、FR3.2、FR6.1〜FR6.4。社内の標準 S4・S5・S6・S8。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR6 = 例外の入力の検査、BR7.1〜BR7.6 = 動作と判定、BR8.4・BR8.5 = 出力）。土台: U3 の [reliability-requirements.md](../../u3-node-gate-slice/nfr-requirements/reliability-requirements.md)（NFR2.1〜NFR2.5、NFR4.1〜NFR4.8、NFR8.1〜NFR8.4）。
- 決定済みの前提: 入力の失敗と入口の失敗は record-only でも終了コード 2（契約の Q2 の答え。arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。

## 要件

### NFR2 決定性

- **NFR2.1** 判定の核（judge）と文書の組み立て・整形は、`mode` と `threshold` を明示の入力として受け、時計・乱数・識別子・環境変数・file の読み書きを取得しない。U3 の NFR2.1 の確かめ（核の file にこれらが現れない）を、この単位が足す code にも当てる。[NFR2、S4、BR7.6]
- **NFR2.2** 同じ入力（固定した検査済みの入力、固定した MeasurementResult、固定した runId）で、判定と整形を 2 回行うと、文字列がバイトまで一致する。`mode` か `threshold` の 1 要素（値、URL、根拠）を変えると、出力が変わる。読み捨てる入力が無い。[NFR2、BR7.6]
- **NFR2.3** 並べ順と書式は決まっている: 例外の項目は決まった順（decisionUrl、claimedPercent、rationale）、割合と閾値は小数第 2 位までの固定の書式。ロケールに依らない。[NFR2、BR8.1]

### NFR4 失敗を隠さない

- **NFR4.1** 動作が「記録だけ」でも、結果の区分と理由コードは「落とす」の時と同じ値になる。区分を一致に書き換えない、理由コードを消さない、計測不能を成功と書かない。判定: 同じ入力の mode だけを変えた 2 回の実行で、`outcome` と `reasonCodes` と `perFile` が等しく、`shouldFail` と終了コードだけが違う。[NFR4、FR6.3、BR7.2]
- **NFR4.2** 動作の値は `enforce` か `record-only` の完全一致だけ。それ以外（別名、大文字小文字の違い、null、数、空文字）は入力の失敗（終了コード 2）で、どちらの動作にも倒れない。省略は `enforce`（落とす）。判定: 負例が全部 2、省略の入力で一致でない結果が 1。[NFR4、FR6.2、BR7.1]
- **NFR4.3** 入力の失敗と入口の失敗は、動作が record-only でも終了コード 2 のまま。文書の mode は null。結果の file・summary・出力値の書き込みの失敗も、record-only でも 2。判定: record-only の入力で、入力の失敗・書き込みの失敗・予期しない例外が 2 になる。[NFR4、BR7.3、U3 の NFR4.5]
- **NFR4.4** 終了コードは 0（落とさない）、1（落とす）、2（判定に至らなかった）の 3 つのまま。record-only で一致でない時の終了コードは 0。終了コードを足さない。[NFR4、BR7.2、BR7.3]
- **NFR4.5** 閾値の例外は、入力の検査を全部通った時だけ判定に反映される。検査の途中の失敗（URL が無い、値が数でない、根拠が空、未知のキー）は、既定の閾値に黙って戻して続行しない。最初の失敗で測定に進まず終了コード 2。[NFR4、BR6.1〜BR6.5]
- **NFR4.6** 閾値の例外は、割合が高くても低くても、観測できずの結果でも、結果の文書に残る。例外を使った事実を、結果の区分で消さない。判定: 一致・不一致・観測できずの 3 つの結果で、例外が文書に残る。[NFR4、BR7.5]
- **NFR4.7** 実際の閾値は、主張された値から別に記録する。食い違いは、門では起こらない（同じ入力から両方を作る）が、記録が両方を持つので、照らす側が食い違いを見つけられる。[NFR4、S5、BR7.5、AC6.2.2]

### NFR8 新旧の同居

- **NFR8.1** 例外も動作も指定しない入力では、結果の文書・job summary・notice・出力値が U3 の出力とバイトまで一致する。判定: U3 の出力を固定した例（golden）と、この単位の code の出力を比べる試験。[NFR8、BR8.5]
- **NFR8.2** 追加の順を守る。結果の JSON の版は 1 のまま、項目の名前を増やさず、出力値の名前も増やさない。既存の項目の意味と型を変えない。値を持たせるのは、U3 が null や固定値で出していた項目だけ。[NFR8、契約の追加の規則]
- **NFR8.3** 逆向きがある: この単位の変更を取り消すと、U3 の状態に戻り、U3 の試験が全部通る。戻した後の状態で既存の試験を流して確かめる（S6）。実装の段で、base の実物（U3 の統合後の main）の SHA-256 と突き合わせる。[NFR8、S6]
- **NFR8.4** U3 の試験のうち、`threshold` と `mode` を「未知のキー」として失敗にする試験は、この単位が意図して置き換える（U3 の NFR8.3 が予告した変更）。置き換えは、同じ試験が検証していた「未知のキーは失敗」の性質を、別の未知のキーで保ったまま行い、弱めない。[NFR8、NFR7]
- **NFR8.5** 入口はまだどの workflow にも呼ばれない（U7 が配線する）ので、この単位が統合されても CI の挙動は変わらない。[NFR8]

## 気づいたこと

- 「記録だけ」は、失敗を許す動作ではなく、失敗を落とさずに記録する動作。NFR4.1 の「区分も理由も同じ」が、この違いを機械で守る。
- NFR8.4 のとおり、U3 の試験を 1 つ変える必要がある。弱めずに置き換えることを、この単位の PR の監査の項目に入れる。

## Assumptions & Open Questions

### Assumptions

- [assumption] golden（NFR8.1）は、U3 の統合後の main の出力から作る。U3 の PR が統合される前は、U3 の PR の head の出力を土台にして、統合後に突き合わせ直す。
- [assumption] 予期しない例外の最上位の捕捉は U3 のまま（標準エラーに 1 行の JSON、終了コード 2）。record-only でも変えない。

### Open Questions

なし。
