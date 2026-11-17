# U5 u5-exclusions — 信頼性・失敗の扱いの要件

この単位は、分母から file を外せる「除外」を足す。除外は、測れていない file を隠す入口になりやすい。ここでは、除外があっても失敗を成功と読み替えない要件と、決定性、新旧の同居を、NFR2・NFR4・NFR8 の枝番で書く。可用性の目標（SLA）は U3・U4 と同じく持たない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR2・NFR4・NFR8、FR5.1〜FR5.4、FR8.4。社内の標準 S4・S5・S6・S8。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR9 = 除外の宣言の検査、BR10.1〜BR10.6 = 分母への適用と判定への影響、BR11.1〜BR11.6 = 出力）。土台: U3 の [reliability-requirements.md](../../u3-node-gate-slice/nfr-requirements/reliability-requirements.md)（NFR2・NFR4・NFR8）と U4 の [reliability-requirements.md](../../u4-thresholds-and-modes/nfr-requirements/reliability-requirements.md)。
- 決定済みの前提: 入力の失敗と入口の失敗は、除外があっても終了コード 2（契約の Q2 の答え。arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。

## 要件

### NFR2 決定性

- **NFR2.1** 除外を引く処理と、除外の検査は、時計・乱数・識別子・環境変数・file の読み書きを取得しない純粋な関数で、入力（検査済みの exclusions、解決した分母の file の集合）だけから結果を作る。判定の核（judge）は除外を知らず、U3 の NFR2.1 の確かめ（核の file にこれらが現れない）をこの単位が足す code にも当てる。判定: 除外を扱う file に `Date`、`Math.random`、`randomUUID`、`process.env`、file の読み書きが現れない。[NFR2、S4、BR10.4、BR10.6]
- **NFR2.2** 同じ入力（固定した検査済みの入力、固定した分母、固定した MeasurementResult、固定した runId）で、判定と整形を 2 回行うと、文字列がバイトまで一致する。除外の 1 件（path か理由）を足す・直す・消すと、出力が変わる。読み捨てる入力が無い。[NFR2、BR11.4]
- **NFR2.3** 除外の並びは path の符号点順で固定し、入力の並びに依存しない。入力の exclusions の並びを入れ替えても出力はバイトまで一致する。ロケールに依らない。[NFR2、BR11.1、BR11.4]

### NFR4 失敗を隠さない

- **NFR4.1** 除外の宣言の検査に失敗する入力（配列でない、要素が object でない、path か reason が無い、キーが未知、path が空、理由が不正、理由に決定の URL が無い、同じ path の重複）は、除外なしに黙って戻して続行しない。最初の失敗で測定に進まず終了コード 2。判定: 各負例で終了コード 2、結果の文書に inputFailure があり exclusions は空の配列、exclusionCount は 0。[NFR4、BR9.1〜BR9.5]
- **NFR4.2** 分母のソースにも必須の試験にも一致しない除外の path（directory 名、wildcard、綴りの違い、追跡されていない file、どちらの集合にも無い file）は、無視せず TARGET_UNRESOLVED（終了コード 2）。除外を引いて分母のソースが空になる入力と、必須の試験が空になる入力は TARGET_EMPTY（終了コード 2）。成功と読まない。判定: 各負例で終了コード 2。[NFR4、BR10.1、BR10.2]
- **NFR4.3** 除外は理由つきで名指した file だけを種別に応じて外し、名指さない必須の試験を減らさない。名指さない必須の試験が流れなかった時は、除外があっても NOT_RUN で不合格。名指した試験 file は必須の集合から外れて notRunPaths に出ず、path・理由・種別が exclusions に残る。除外した source の行の記録は数えず、未計測にも数えない。分母に残る file の未計測は、除外があっても未計測で不合格。判定: 除外ありで、(a) 名指さない必須の試験が流れない、(b) 分母に残る file が計測されない、(c) 試験の失敗がある、それぞれの負例が不一致または観測できずになり、一致にならない。[NFR4、BR10.3、AC-U5-TESTEX-1]
- **NFR4.4** 除外が割合を上げたかどうかは、門が結論を書かず、読む側が分母の件数（resolvedFileCount）と exclusions から読める形で出す。除外は結果の区分（一致・不一致・観測できず）を書き換えず、理由コードを消さない。終了コードは 0・1・2 の 3 つのまま、増やさない。判定: 同じ入力から除外だけを足した 2 回の実行で、区分と理由コードの決め方が変わらず、変わるのは分母の file の集合と、それに依る割合だけ。[NFR4、BR10.6、BR11.5]
- **NFR4.5** 入力の失敗と入口の失敗は、除外があっても終了コード 2 のまま。結果の file・summary・出力値の書き込みの失敗も、除外があっても 2 で、先に書けた結果の文書は書き直さない（U3 の NFR4.5、U4 の NFR4.3 のまま）。判定: 除外ありの入力で、入力の失敗・書き込みの失敗・予期しない例外が 2 になる。[NFR4]

### NFR8 新旧の同居

- **NFR8.1** 除外を宣言しない入力（`exclusions` の省略と、空の配列の両方）では、結果の文書・job summary・notice・出力値が U4 の出力とバイトまで一致する。判定: U3・U4 の出力を固定した例（golden。`tests/coverage-gate-golden*`）と、この単位の code の出力を比べる試験。[NFR8、BR11.4]
- **NFR8.2** 追加の順を守る。結果の JSON の版は 1 のまま、項目の名前を増やさず、出力値の名前も増やさず、理由コードも増やさない。既存の項目の意味と型を変えない。値を持たせるのは、U3 が空・0 で出していた `exclusions`・`exclusionCount` と、`denominator.resolvedFileCount` の意味（除外を引いた後の件数）だけ。判定: 結果の文書の項目の名前の集合・出力値の名前の集合・理由コードの集合が U4 と等しい。[NFR8、契約の追加の規則]
- **NFR8.3** 逆向きがある: この単位の変更を取り消すと U4 の状態に戻り、U3・U4 の試験が全部通る。戻した後の状態で既存の試験を流して確かめる（S6）。実装の段で、base の実物（U4 の統合後の main）の SHA-256 と突き合わせる。[NFR8、S6]
- **NFR8.4** 既存の試験のうち、`exclusions` を未知のキーか、不正な型として扱う物は、この単位が意図して置き換える（U3・U4 が予告した変更）。現時点で読んだ該当は次の 4 つ（実装の段で数え直す）。置き換えは、同じ試験が検証していた「未知のキーは失敗」の性質を、別の未知のキーで保ったまま行い、弱めない。
  - `tests/coverage-gate-input.test.mjs` の未知のキーの繰り返し（`exclusions` を含む）と、「exclusions と measurement はまだ未知」の試験。
  - `tests/coverage-gate-cli.test.mjs` の入力の失敗の例（`exclusions: 50`）。U5 後は INPUT_FIELD_UNKNOWN でなく INPUT_FIELD_INVALID になる。
  - `tests/coverage-gate-golden.mjs` と `coverage-gate-golden.test.mjs` の失敗の入力の例（`exclusions: ["src/a.mjs"]` を INPUT_FIELD_UNKNOWN の失敗の入力に使っている）。別の未知のキーに替える。
  - `tests/coverage-gate-cli-modes.test.mjs` の追加のキーの例（`exclusions: []`）。
  [NFR8、NFR7]
- **NFR8.5** 入力の受け入れの広がり（`exclusions: []` が U3・U4 では失敗で、U5 では受け入れられる）は、既存の呼び出し側にとって失敗が成功に変わる向きではなく、これまで受け付けなかった入力を新しく受け付ける向きなので、既存の呼び出し側を壊さない。除外を宣言しない呼び出しの動作は変わらない（NFR8.1）。[NFR8]
- **NFR8.6** 入口はまだどの workflow にも呼ばれない（U7 が配線する）ので、この単位が統合されても CI の挙動は変わらない。[NFR8]

## 気づいたこと

- 除外は、失敗を許す動作ではなく、測れない file を理由つきで名指しで外す宣言。NFR4.3 の「名指さない必須の試験は減らさない」「分母に残る file の未計測は不合格」が、この違いを機械で守る。
- NFR8.4 のとおり、U3・U4 の試験を置き換える必要がある。弱めずに置き換えることを、この単位の PR の監査の項目に入れる。

## Assumptions & Open Questions

### Assumptions

- [assumption] golden（NFR8.1）は、U4 の統合後の main の出力から作る（現時点の origin/main で U4 は統合済み）。コード生成の段で、base の実物と突き合わせ直す。
- [assumption] 予期しない例外の最上位の捕捉は U3 のまま（標準エラーに 1 行の JSON、終了コード 2）。除外があっても変えない。

### Open Questions

なし。
