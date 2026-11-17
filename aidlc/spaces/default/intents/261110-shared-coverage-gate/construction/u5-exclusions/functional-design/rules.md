# U5 u5-exclusions — 規則（rules）

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR・NFR の ID）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。部品: [components.md](../../../inception/domain-design/components.md)。実体: [entities.md](./entities.md)。
- 土台: U3 の規則 [rules.md](../../u3-node-gate-slice/functional-design/rules.md)（BR1〜BR5）と U4 の規則 [rules.md](../../u4-thresholds-and-modes/functional-design/rules.md)（BR6〜BR8）。この単位の規則は BR9〜BR11 とし、番号が重ならない。U3・U4 の規則を書き換える所は「U3 の BRx.y に足す」と明記した。
- 決定済みの前提: 終了コードは 0 = 落とさない、1 = 落とす、2 = 判定に至らなかった（入力不正または入口の失敗）で、除外があっても 2 は隠さない（契約の Q2 の答え。arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。DB の構造は変えない（unit-of-work の仮定）。
- 実測（作った側の観測）: 統合済みの実装で、入力の検査は文字列を受けて検査済みの入力か最初の失敗を返す純粋な関数（`checkInput`）、分母の解決は既存の HygieneLib の解決を使って `{denominatorPaths, requiredTestPaths}` か名前つきの失敗を返す関数（`resolveInput`）、判定は分母の file の集合と記録だけを受ける純粋な関数（`judge`）、出力は 1 つの文書から JSON・summary・notice・出力値を作る関数であることを読んだ。判定は分母に無い file の記録を数えない（`groupTargetRecords`）。この単位はその構造のまま足す。

## 規則（source of truth）

規則は 3 つの持ち主で分ける。BR9 = 除外の宣言の検査（CoverageInputContract）、BR10 = 分母への適用と、除外の持ち主・判定への影響（CoverageInputContract の解決と CoverageJudge。判定の核には分岐を足さない）、BR11 = 出力（ResultReporter）。

```yaml
rules:
  # ---- BR9 除外の宣言の検査 ----
  - id: BR9.1
    category: validation
    statement: 入力が持てる最上位の項目に exclusions を足す。省略と空の配列は 0 件で同じ。値は配列で、要素は object で、要素が持てる項目は path と reason だけ。これ以外のキーはどの階層でも失敗にする。
    applies_to: CoverageInputContract
    trigger: 入力を検査する時（U3 の BR1.3 に足す）
    logic: IF exclusions が存在し配列でない THEN INPUT_FIELD_INVALID（field "exclusions"）。IF 要素が object でない THEN INPUT_FIELD_INVALID（field "exclusions[<i>]"）。IF 要素に path・reason 以外のキーがある THEN INPUT_FIELD_UNKNOWN（field "exclusions[<i>].<キー名>"、キーは符号点順で最初の 1 件）。最上位の既知の集合に exclusions を足す。denominator の中の exclusions は引き続き未知（U3 の BR1.3）。検査は要素の添字の昇順に行い、最初の失敗 1 件を返す。
    violation: 測定に進まない。結果の文書に inputFailure を残し、終了コード 2。
    source: [FR5.2, FR5.4, NFR4]

  - id: BR9.2
    category: validation
    statement: 除外 1 件は path と reason の 2 つがそろっていなければならない。理由が書かれていない除外は受け付けない。
    applies_to: CoverageInputContract
    trigger: BR9.1 の形の確かめのあと、要素ごと
    logic: IF path が無い THEN INPUT_FIELD_MISSING（field "exclusions[<i>].path"）。IF reason が無い THEN INPUT_FIELD_MISSING（field "exclusions[<i>].reason"）。両方無いときは path が先。path が文字列でない、または空文字列なら INPUT_FIELD_INVALID（field "exclusions[<i>].path"）。
    violation: BR9.1 と同じ（終了コード 2）。
    source: [FR5.2, FR5.3]

  - id: BR9.3
    category: validation
    statement: 除外の理由は、閾値の例外の根拠（U4 の BR6.5）と同じ 1 つの規則で確かめる。1 行で、空白だけでなく、制御文字がなく、命令や表の区切りの並びを含まず、上限以内。この規則と定数は 1 か所だけが持ち、除外の理由の側に写して持たない。
    applies_to: CoverageInputContract
    trigger: BR9.2 のあと、要素ごと
    logic: 規則の関数に確かめる値と、失敗の時の field の名前（"exclusions[<i>].reason"）を渡す。失敗は INPUT_FIELD_INVALID。規則の中身（上限、禁じる並び）は U4 と同じ値を同じ定数から取る。長さの確かめは、上限を超える値を全部は走査せず、上限 + 1 で止める（検査の時間を線形に保つ）。
    violation: BR9.1 と同じ（終了コード 2）。
    source: [FR5.3, NFR3, NFR4]

  - id: BR9.4
    category: validation
    statement: 同じ path を 2 件以上宣言できない。黙ってまとめない。
    applies_to: CoverageInputContract
    trigger: BR9.3 のあと（全要素の形が通ったあと）
    logic: path を文字列として比べ、同じ値が 2 件目以降に現れたら、その要素の添字で INPUT_FIELD_INVALID（field "exclusions[<i>].path"）。比べる前に正規化も大文字小文字の畳み込みもしない（正規化の違いは BR10.1 で分母の file と一致しないので失敗になる）。
    violation: BR9.1 と同じ（終了コード 2）。
    source: [FR5.4, NFR4]

  - id: BR9.5
    category: validation
    statement: 除外の理由は、決定の URL を 1 つ以上含まなければならない。決定の URL は、閾値の例外の決定の URL（U4 の BR6.4）と同じ形の 1 つの規則で確かめる。要素の形は変えない（持てる項目は path と reason だけ）。URL の実在・書き手・本文が除外を認めているかは確かめない。
    applies_to: CoverageInputContract
    trigger: BR9.3 のあと、要素ごと
    logic: reason を ASCII の空白（U+0020）で区切った断片のうち、1 つ以上が GateConstants.decisionUrlShape に完全に合い、その断片の長さが GateConstants.decisionUrlMaxLength 以内であること。1 つも合わなければ INPUT_FIELD_INVALID（field "exclusions[<i>].reason"、detail は固定の文で、reason の中身を書かない）。長さの確かめは BR9.3 を先にし、形の確かめは 1 断片ずつ行う（上限 + 1 で止める）。URL と文が空白なしでつながっている形（日本語の文のすぐ後ろに URL）は合わず、失敗側に倒す（URL の前後に空白を置く）。形の規則は U4 の関数を 1 つの共有の場所に出して両方から呼び、除外の側に写して持たない（S3）。reason は 1 行の文のまま、結果にそのまま写す（BR11.1）。
    violation: BR9.1 と同じ（終了コード 2）。URL が無い理由つきの除外は、理由の無い除外と同じく受け付けない。
    source: [FR5.3, FR5.4, NFR4]

  # ---- BR10 分母への適用と持ち主 ----
  - id: BR10.1
    category: validation
    statement: 除外の path は、解決した分母のソースの file、または必須の試験の file（U3 の BR1.7 の requiredTestPaths）の 1 つと、文字列として一致していなければならない。directory 名、wildcard、`./` や `..` を含む綴り、どちらの集合にも無い file、追跡されていない file は、すべて受け付けない。一致した集合で種別（source、test、両方に入る file は both）が決まる。
    applies_to: CoverageInputContract
    trigger: 分母と必須の試験を解決したあと（U3 の BR1.6・BR1.7 のあと）
    logic: 各 path を、解決した分母の file の集合 S と必須の試験の file の集合 T と文字列として照らす（展開も解決もしない）。S にだけ一致 = source、T にだけ一致 = test、両方に一致 = both（試験の名前の型の file が分母にも入っている形）。どちらにも一致しない path があれば TARGET_UNRESOLVED（field "exclusions[<i>].path"、添字の昇順で最初の 1 件）。detail は固定の文で、path の文字列を書かず、位置（field の添字）だけで示す（長い path・repository の外を指す path・絶対 path を出力に写さない）。無視して先へ進まない（宣言した除外が効かないのは、綴りの誤りで穴を隠している可能性があるので、成功にしない）。
    violation: 測定に進まない。結果の文書に inputFailure を残し、終了コード 2。
    source: [FR4.3, FR5.1, FR5.2, NFR4]

  - id: BR10.2
    category: policy
    statement: 除外した file は、種別に応じて、分母または必須の試験の集合から外れる。除外を引いて分母が空になる、または必須の試験が空になるときは失敗にする。
    applies_to: CoverageInputContract
    trigger: BR10.1 を通ったあと
    logic: denominatorPaths = S − (種別が source または both の path)。effectiveRequiredTestPaths = T − (種別が test または both の path)。denominatorPaths が空なら TARGET_EMPTY（field "exclusions"、detail は「除外で分母が空になる」旨）。effectiveRequiredTestPaths が空なら TARGET_EMPTY（field "exclusions"、detail は「除外で必須の試験が空になる」旨）。測定の対象になる file も、確かめる試験も 1 本も無い実行を成功にしない（U3 の BR3.4 と同じ考え方）。判定の核へ渡すのは denominatorPaths と effectiveRequiredTestPaths だけ。
    violation: BR10.1 と同じ（終了コード 2）。
    source: [FR4.3, FR5.1, FR5.3, NFR4]

  - id: BR10.3
    category: policy
    statement: 試験の除外は、理由つきで名指した試験 file だけを必須の試験の集合から外す。名指さない試験の未実行は、除外とは無関係に NOT_RUN のままで、除外が隠さない。testTargets を狭めただけの呼び出しは除外ではなく、除外の記録も残らない（入力の差分として見える変更）。除外した file の行の記録と未実行の名前は、種別ごとに次のとおり扱う。
    applies_to: CoverageInputContract, CoverageJudge
    trigger: 必須の試験を決める時と判定する時
    logic: (1) 名指さない必須の試験で流れなかった物は NOT_RUN（U3 の BR3.3）で、除外の有無や件数で成功にならない。新しい試験 file が除外にも流れた試験にも無ければ NOT_RUN（U3 のまま）。(2) 種別が test または both の path は effectiveRequiredTestPaths に入らず、流れていなくても notRunPaths に現れない。理由と path は結果の exclusions に残る（BR11.1）ので、未実行の記録は消えず、理由つきの除外の記録として残る。(3) 種別が source または both の path は分母に入らず、測定の記録に行があっても数えず（U3 の BR2.6 の「記録にある file を数える」は分母の中だけ）、unmeasuredPaths にも perFile にも現れない。(4) 重なる形（分母のソースだけを除外し、同じ名前の型の試験 file を除外しない = 種別 source）は、試験が必須のまま残るので、流れていなければ NOT_RUN で notRunPaths に出る。ソースの除外は試験の除外を意味せず、逆も同じ。判定の核はこの 2 つの集合しか見ない。
    violation: 該当なし（除外が、理由を残さずに試験の未実行を隠してはならない。隠れる形があれば、この規則の違反）。
    source: [FR4.3, FR5.1, FR5.3]

  - id: BR10.4
    category: constraint
    statement: 除外を足せる道は、入力の file の exclusions だけ。環境変数、ほかの引数、既定の一覧、前回の結果、呼ぶ側の別の入力では広げられない。結果の除外は入力の exclusions と過不足なく一致し、門は 1 件も足さず 1 件も落とさない。
    applies_to: CoverageInputContract, CoverageGateCli, ResultReporter
    trigger: 常に
    logic: (1) 入口の引数は --input と --result だけ（U3 の BR5.1）。別の引数で除外を足そうとすれば ENTRY_ARGUMENTS_INVALID（標準エラーに書き、終了コード 2）。(2) 門は除外のために環境変数を 1 つも読まない。環境で足そうとしても反映されず、除外は入力の宣言のとおり。拒否の文は書かない（採らなかった代替。環境の名前の集合を門が持つことになるため）。代わりに、構造の試験（除外を決める code に環境変数の読みが 0 件）と負例（環境変数を置いても結果の文書と記録が変わらない）で確かめる。(3) 入力の file の中で別の道（`exclusion`、`excludes`、`denominator.exclusions`、`exclusions.extra` など）を足そうとすれば、未知のキーとして INPUT_FIELD_UNKNOWN（BR9.1）。(4) 結果の exclusions の path の集合 = 入力の exclusions の path の集合、件数も同じ。除外の増減は、呼び出し側の入力の差分に 1 件ずつ見える。
    violation: 該当なし（構造の制約）。
    source: [FR5.4, NFR4]

  - id: BR10.5
    category: policy
    statement: 除外を宣言しない呼び出しの除外は 0 件で、分母は宣言された全 file になる。門は DB の file の一覧も DB の試験の一覧も持たない。「DB の job で測る」か「理由つきで除外」かの選びは、除外の宣言の有無だけで表す。除外はソースの file も試験の file も名指せる（BR10.1）。
    applies_to: CoverageInputContract
    trigger: 常に
    logic: exclusions が無い、または空なら、excludedPaths は空、denominatorPaths は解決した分母のまま、effectiveRequiredTestPaths は必須の試験のまま。DB を要する file を測りたい呼び出し（DB の job）は除外に書かない。測れない呼び出しは、その DB を要する試験 file とその対象のソース file を 1 本ずつ、決定の URL つきの理由で除外に書く（試験の file も除外に書く。testTargets を狭めて外す形は除外ではなく、記録が残らない）。どちらも門の同じ道を通り、DB のための分岐はない。DB の job の起動と PostgreSQL の版または指紋の固定は呼ぶ側（U7）の仕事で、この単位は決めない。
    violation: 該当なし。
    source: [FR5.1, FR5.4]

  - id: BR10.6
    category: constraint
    statement: 判定の核は除外を知らない。受ける分母と必須の試験が、除外を引いたあとの file の集合になるだけで、未計測・NOT_RUN・割合・区分・理由コードの決め方は U3・U4 のまま変えない。除外のための判定の分岐を足さない。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: judge の入力の形は変えない（分母の file の集合、必須の試験の集合、測定の結果、動作、閾値の例外）。この 2 つの集合に入るのは denominatorPaths と effectiveRequiredTestPaths（BR10.2）。除外を引く操作は BR10.2 の集合の差だけで、判定の核は引いたあとの集合しか見ない（元の集合も除外の一覧も渡さない）。分母を決める場所は解決の 1 か所で、判定の核と出力の側で別々に引かない（S3）。
    violation: 該当なし（構造の制約）。
    source: [NFR2, NFR3, FR8.4]

  # ---- BR11 出力 ----
  - id: BR11.1
    category: policy
    statement: 結果の文書の exclusions には、除外した file、理由、種別（kind = source、test、both）を、path の符号点順で残す。exclusionCount は exclusions の長さ。denominator.resolvedFileCount は除外を引いたあとの分母の件数。
    applies_to: ResultReporter
    trigger: 文書を作る時（U3 の BR4.2 の固定の項目に値を持たせ、exclusions の要素に kind を足す）
    logic: exclusions = 検査済みの入力の exclusions の {path, reason} をそのまま写し（宣言そのものを残す。U3 の BR4.3 の declaredTargets と同じ扱い）、解決の段が決めた kind（BR10.1）を足した {path, reason, kind}。kind は入力の項目ではなく、解決が分母と必須の試験と照らして決めた値で、入力に kind があれば INPUT_FIELD_UNKNOWN（BR9.1）。並びは path の符号点順で、入力の並びに依存しない。exclusionCount = exclusions の長さ（both も 1 件と数える）。denominator の項目の名前は増やさない。入力の失敗の文書は U3 のまま（exclusions は空の配列、exclusionCount は 0）。
    violation: 該当なし。
    source: [FR4.3, FR5.3, FR8.4]

  - id: BR11.2
    category: policy
    statement: job summary に、除外した file・種別・理由を名前つきの一覧で出す。結果の区分に関わらず出し、除外が 0 件のときは出さない。
    applies_to: ResultReporter
    trigger: summary を作る時（U4 の BR8.2 の例外の節のあと、理由の一覧の前）
    logic: 除外が 1 件以上あるとき、表（Exclusions の行は件数。U3 のまま）のあとに「Excluded files (N):」の節を置き、1 件ずつ「path (kind): reason」を書く。先頭の SUMMARY_LIST_LIMIT 件までを出し、残りは件数と「全体は結果の file にある」旨の 1 行にする（U3 の名前つきの一覧と同じ形）。上限の値は、summary を組み立てる ResultReporter（`report.mjs` が持つ SUMMARY_LIST_LIMIT）が一覧の組み立ての呼び出しに引数として渡し、除外の一覧を作る部品は値を持たず、判定の核からも読まない（値の複製も循環も作らない。S3）。path と reason は自由な文字列なので、U3 の BR4.7 の無害化を通す。
    violation: 該当なし。
    source: [FR5.3, FR8.4, NFR4]

  - id: BR11.3
    category: policy
    statement: notice は、除外があるとき件数を 1 つの固定の文で添える。注釈の種類は変えない。理由の文は notice に載せない。出力値の名前は増やさない。
    applies_to: ResultReporter, CoverageGateCli
    trigger: notice と出力値を作る時
    logic: 除外が 1 件以上のとき、notice の本文の最後に「Exclusions: N.」の旨の固定の文を添える（N は数）。除外は呼ぶ側の宣言された正当な選択（FR5.1）なので、注釈の種類（notice・warning・error）は U3・U4 の表のまま変えない。出力値は U3 の 7 つの名前のままで、exclusion-count に件数が入る。
    violation: 該当なし。
    source: [FR5.3, NFR8]

  - id: BR11.6
    category: policy
    statement: 除外があるとき、job summary の最初の行に、除外した件数と種別ごとの件数を 1 行で必ず出す。結果の区分（match、mismatch、unobservable）、動作（enforce、record-only）、閾値の例外の有無に関わらず毎回出し、除外が 0 件のときは出さない。除外は隠れず、毎回見える形にする。
    applies_to: ResultReporter
    trigger: summary を作る時（U4 の BR8.2 の閾値の例外の 1 行と同じ位置の決まり）
    logic: 除外が 1 件以上あるとき、summary の最初の行（結果の見出しの前）に「Excluded from the gate: N (source S, test T, both B)」の固定の文型の 1 行を置く（N = exclusionCount、S・T・B は kind ごとの件数で S + T + B = N）。閾値の例外の行があるときは、その例外の行を先にして、その次の行に置く（例外が無い呼び出しでは最初の行）。数は文書の exclusions から数え直し、宣言や別の入力から写さない。除外が 0 件のとき、この行も節も出ず、U4 の summary とバイトまで一致する（BR11.4）。一覧の節（BR11.2）は表のあとに残り、頭の 1 行は一覧の代わりではない。
    violation: 該当なし。
    source: [FR5.3, FR8.4, NFR8]

  - id: BR11.4
    category: constraint
    statement: 除外を宣言しない入力の実行は、結果の文書・job summary・notice・出力値のすべてが U4 の出力とバイトまで一致する。同じ入力で 2 回判定と整形を行うと、バイトまで一致する。
    applies_to: ResultReporter, CoverageGateCli, CoverageInputContract
    trigger: 常に
    logic: 除外が 0 件のとき、BR11.1〜BR11.3 と BR11.6 の追加の行・節・文は出ない。exclusions の入力の並びを入れ替えても出力は変わらない（BR11.1 の並べ替え）。除外の 1 件を足す・直す・消すと、文書の exclusions と exclusionCount と summary と notice が変わる。
    violation: 後ろ向きの互換が壊れる（U3・U4 の試験が落ちる）。
    source: [NFR2, NFR8]

  - id: BR11.5
    category: constraint
    statement: 結果の数値は観測した記録と判定だけから作る。除外の一覧は宣言そのものとして残し、観測した値として扱わない。出力は 1 つの文書から作り、sds-gate や監査の入力に組み込まない。
    applies_to: ResultReporter, CoverageGateCli
    trigger: 出力を作る時（U3 の BR4.3・BR5.4、U4 の BR8.6 のまま）
    logic: 割合・行数・件数（resolvedFileCount と measuredFileCount と exclusionCount を除く観測の値）は記録から再計算する。exclusions の path・reason は入力の宣言で、kind は解決が分母と必須の試験から決めた値。記録の値を写さず、記録に除外を足さない。除外が割合を上げたかどうかは、読む側が分母の件数と exclusions から読める（門は主張しない）。宛先は結果の file、job summary、出力値、標準出力の notice、標準エラーだけ。
    violation: 該当なし。
    source: [FR8.4, NFR3, NFR4]
```

## 規則の一覧（人が読む要約。source of truth は上の yaml）

| 持ち主 | 規則 | 要点 |
|---|---|---|
| 除外の宣言の検査 | BR9.1〜BR9.5 | exclusions は配列で、1 件は path と reason だけ。両方そろい、理由は U4 の根拠と同じ 1 つの規則で確かめ、同じ path は 2 件持てない。理由は決定の URL を 1 つ以上含む（形だけ、実在は監査） |
| 分母への適用と持ち主 | BR10.1〜BR10.6 | path は分母のソースか必須の試験の file と文字列で一致しなければ失敗（directory・wildcard・どちらにも無い file も）。除外した file は種別（source・test・both）に応じて分母か必須の試験の集合から外れ、名指さない試験の未実行は NOT_RUN のまま。足せる道は入力の exclusions だけ。宣言が無ければ 0 件。判定の核には分岐を足さない |
| 出力 | BR11.1〜BR11.6 | 文書に path・理由・種別を符号点順で残し、summary の最初の行に件数と種別ごとの件数を毎回出し、一覧の節に path と理由を出し、notice は件数を添える。除外が無い実行は U4 とバイトまで一致。数値は記録から作り、監査の入力には組み込まない |

## 門が保証しないこと

- 除外の**理由が正しいか**（本当に DB の job でだけ流れる file か）は、門は確かめない。門は、path が分母のソースまたは必須の試験の file と一致すること、理由が 1 行の文として形を満たし決定の URL の形の断片を 1 つ以上含むこと、一覧が入力と過不足なく一致することだけを確かめる。決定の URL の**実在・書き手・本文**は門は見ない（形だけ。U4 の閾値の例外と同じ扱い）。**試験 file の除外は必須の試験の集合を減らす**ので、その除外が妥当な理由かは監査が、入力の差分と exclusions の kind・理由を読んで確かめる。理由の妥当性と、除外が割合を不当に上げていないかは、門の外の独立の監査が、入力の差分（除外の増減）と結果の JSON の exclusions・分母の件数を読んで確かめる。
- この補い方は今ある独立の監査で行い、新しい道具や別の取り組みへは広げない。広げる前に Owner に伺う（プロジェクトの訂正の記録）。
