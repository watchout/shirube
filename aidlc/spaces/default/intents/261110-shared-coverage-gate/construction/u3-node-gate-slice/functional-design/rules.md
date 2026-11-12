# U3 u3-node-gate-slice — 規則（rules）

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR・NFR の ID）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。実体: [entities.md](./entities.md)。
- [Q1]〜[Q4]: [functional-design-questions.md](./functional-design-questions.md)（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
- 実測（作った側の観測。架空の小さな例を Node 22.23.4・24.22.1・26.12.1 で流した）: 子プロセスだけで動く file の行も記録に出る。試験が読み込まない file は記録に出ない。報告係は試験 file ごとに合格・失敗・skip・todo の出来事を受け取れ、suite と試験は `details.type` で区別できる（Node 22 で確認）。lcov の `LF`/`LH` は、この例では `DA` の行から数えた値と一致した。

## 規則（source of truth）

規則は 5 つの持ち主で分ける。BR1 = 入力の検査（CoverageInputContract）、BR2 = 測定の実行と変換（MeasurementRunner、NodeBuiltinMeasurer）、BR3 = 判定の核（CoverageJudge）、BR4 = 出力（ResultReporter）、BR5 = 入口（CoverageGateCli）。

```yaml
rules:
  # ---- BR1 入力の検査 ----
  - id: BR1.1
    category: validation
    statement: 入力は --input の file 1 つだけから読む。読めない、JSON でない、JSON の object でない入力は失敗にする。
    applies_to: CoverageInputContract
    trigger: 入口が入力を読む時
    logic: IF file が読めない OR JSON として読めない OR 最上位が object でない THEN 入力の失敗 INPUT_UNREADABLE（field "$"）を返す。
    violation: 測定に進まない。結果の文書に inputFailure を残し、終了コード 2。
    source: [NFR4, FR8.3]

  - id: BR1.2
    category: validation
    statement: schemaVersion は整数の 1 だけを受け付ける。欠けているか未知の版は失敗にする。
    applies_to: CoverageInputContract
    trigger: 入力を検査する時
    logic: IF schemaVersion が無い OR 整数の 1 でない THEN INPUT_VERSION_INVALID（field "schemaVersion"）。
    violation: BR1.1 と同じ（終了コード 2）。
    source: [NFR4, NFR8]

  - id: BR1.3
    category: validation
    statement: 入力が持てる項目は、schemaVersion、shape、denominator（targets だけ）、testTargets、deadlineSeconds、totalBudgetSeconds だけ。これ以外のキーは、どの階層でも失敗にする。threshold、mode、exclusions、measurement もこの単位では未知である。
    applies_to: CoverageInputContract
    trigger: 入力を検査する時
    logic: IF 上の集合に無いキーがある THEN INPUT_FIELD_UNKNOWN（field にそのキー名の経路）。
    violation: BR1.1 と同じ。後の単位が項目を足す時は、この集合に足す（追加の順）。
    source: [NFR4, FR5.4]

  - id: BR1.4
    category: validation
    statement: shape は必須で、値は node-builtin だけを受け付ける。
    applies_to: CoverageInputContract
    trigger: 入力を検査する時
    logic: IF shape が無い THEN INPUT_FIELD_MISSING（field "shape"）。IF shape が node-builtin でない THEN INPUT_SHAPE_UNSUPPORTED（detail に渡された値）。
    violation: BR1.1 と同じ。typescript-vitest は U6 が受け付ける値に足す。
    source: [FR1.1, NFR4]

  - id: BR1.5
    category: validation
    statement: 測る file の宣言（denominator.targets）は必須で、1 件以上の空でない文字列の配列。宣言が無い呼び出しは成功にしない。
    applies_to: CoverageInputContract
    trigger: 入力を検査する時
    logic: IF denominator.targets が無い THEN INPUT_FIELD_MISSING（field "denominator.targets"）。IF 配列でない OR 空 OR 空文字列を含む THEN INPUT_FIELD_INVALID。
    violation: BR1.1 と同じ。門の中に対象の既定は無い。
    source: [FR2.1]

  - id: BR1.6
    category: calculation
    statement: 分母は、宣言を既存の HygieneLib の resolveTargets と trackedFiles で、追跡されている file の集合に解決した物。門は対象の文字列を直書きせず、解決の規則を持たない。解決できない宣言があるか、解決した集合が空なら失敗にする。
    applies_to: CoverageInputContract
    trigger: BR1.5 を通った後
    logic: resolveTargets が missing を返したら TARGET_UNRESOLVED（detail に missing の宣言の名前をすべて）。解決した file が 0 件なら TARGET_EMPTY。重複は 1 件にし、code-point 順に並べる。
    violation: BR1.1 と同じ。黙って少なく測らない。
    source: [FR2.1, NFR3]

  - id: BR1.7
    category: calculation
    statement: 必須の試験は、testTargets を BR1.6 と同じ解決で追跡されている file にし、その中で basename が試験 file の名前の型（GateConstants.testFilePattern）に合う物すべて。testTargets の下に新しく追跡された試験 file は、黙って必須から外れない。
    applies_to: CoverageInputContract
    trigger: BR1.5 を通った後
    logic: testTargets が無い THEN INPUT_FIELD_MISSING。解決できない宣言 THEN TARGET_UNRESOLVED。型に合う file が 0 件 THEN TARGET_EMPTY（field "testTargets"）。
    violation: BR1.1 と同じ。除外（理由つきで試験 file を外す）は U5 が足す。
    source: [FR4.3]

  - id: BR1.8
    category: validation
    statement: deadlineSeconds と totalBudgetSeconds は省略できる。値があれば 1 以上の整数。省略時の値は GateConstants の 1 か所（600 秒と 900 秒）から取る。
    applies_to: CoverageInputContract
    trigger: 入力を検査する時
    logic: IF 値があり、整数でない OR 1 未満 THEN INPUT_FIELD_INVALID。省略 THEN GateConstants の既定値。deadlineSeconds が totalBudgetSeconds より大きくても入力不正にしない（BR2.3 が小さい方を使う）。
    violation: BR1.1 と同じ。
    source: [FR4.4]

  # ---- BR2 測定の実行と変換 ----
  - id: BR2.1
    category: constraint
    statement: 測定は Node の組込みの試験の実行と組込みの網羅率だけで行う。門は自前の計測の仕組みを持たない。行ごとの記録は、組込みの lcov の出力の DA の行だけから作り、報告係は試験の出来事を転送するだけで判定をしない。
    applies_to: NodeBuiltinMeasurer
    trigger: 測定を始める時
    logic: 実行する command は node の --test、--experimental-test-coverage、lcov の報告係、出来事の報告係、必須の試験 file の一覧だけで組む。
    violation: 該当なし（組み方の制約。試験で組んだ command の中身を確かめる）。
    source: [FR1.1, FR1.3]

  - id: BR2.2
    category: policy
    statement: 動作を保証する Node は 22 だけ。22 より古い版は子プロセスの行を数えられるか確かめていないので、測定に使わない。23 以上は実行するが、保証ではなく観測した事実として版を結果に残す。
    applies_to: NodeBuiltinMeasurer
    trigger: 測定を始める前
    logic: IF 実行中の Node の major が GateConstants.guaranteedNodeMajor 未満 THEN 試験を走らせず、MeasurementResult を unobservable、cause child_process_not_countable、childProcessLinesCounted を偽、detail に観測した版で返す。IF 以上 THEN childProcessLinesCounted を真とし、MeasurementDefinition.toolVersion に観測した版を書く。
    violation: 結果は観測できず、理由 CHILD_PROCESS_NOT_COUNTABLE。
    source: [FR1.4, NFR1, Q4]

  - id: BR2.3
    category: constraint
    statement: 測定は 1 回だけ実行し、再試行しない。実行には期限と総予算を宣言する。小さい方を上限にし、超えたら試験の子プロセスの全体（process group）を止めて、観測できずにする。
    applies_to: MeasurementRunner
    trigger: 測定を実行する時
    logic: 上限 = min(deadlineSeconds, 残りの総予算)。IF 上限を超えた THEN 子プロセスの全体を止め、endState = (deadlineSeconds が残りの総予算以下なら timed_out、そうでなければ budget_exceeded)。IF 上限内に終わった THEN endState は BR2.7 に従う。
    violation: MeasurementResult は unobservable、cause は timed_out か budget_exceeded。止めた後に孫の process を残さない。
    source: [FR4.4, FR4.1]

  - id: BR2.4
    category: validation
    statement: 試験の結果は、報告係が受けた出来事から数える。標準出力の文面は使わない。suite を除く試験 1 件ごとに、skip は skipped、todo は todo（合否を問わない）、それ以外の合格は passed、失敗は failed に数える。file の読み込みの失敗は、その file の failed に数える。
    applies_to: NodeBuiltinMeasurer
    trigger: 測定が終わった後
    logic: IF failed が 1 件以上ある file が 1 つでもある THEN MeasurementResult は unobservable、cause test_failed、testFailurePaths にその file。ran = passed が 1 以上。skip・todo だけの file は ran でない。試験が 0 件の file も ran でない。file に結び付かない失敗の出来事があれば、その失敗も test_failed とする。
    violation: 失敗した実行の割合は低く出るので、その数字で判定しない（観測できず）。
    source: [Q1, FR4.1, FR4.2]

  - id: BR2.5
    category: validation
    statement: 行ごとの記録は lcov から読み、観測した値だけで作る。道具が出した割合の数字（LH/LF を含む）は値に使わない。壊れた記録は失敗にする。
    applies_to: NodeBuiltinMeasurer
    trigger: lcov を読む時
    logic: path は先頭の ./ を除く。cwd の下の絶対 path は相対にする。cwd の外の path は無視する。lineNumber は 1 以上の整数、hitCount は 0 以上の整数でなければならない。(path, lineNumber) の重複は壊れた記録。LF/LH があって、同じ file の DA から数えた件数と合わなければ壊れた記録。DA が 1 件も無ければ no_records。
    violation: 壊れた記録は MeasurementResult が unobservable、cause failed。DA が 1 件も無い時は cause no_records。
    source: [FR2.3, NFR4, S5]

  - id: BR2.6
    category: constraint
    statement: 測れた file は記録の SF から、流れた試験 file は BR2.4 から、観測だけで決める。子プロセスだけで動く file の行も、記録にあれば数える。記録に無い file は、値が高く見えても未計測である。
    applies_to: NodeBuiltinMeasurer
    trigger: 記録を MeasurementResult に変換する時
    logic: measuredPaths = SF の path（行が 0 件の file も含む）。testFilesRun = ran が真の file。宣言の写しで埋めない。
    violation: 該当なし（変換の制約）。未計測の判定は BR3.2。
    source: [FR1.4, FR2.2, S5]

  - id: BR2.7
    category: policy
    statement: 子プロセスの終わり方は、終了の観測（終了コード、signal、起動の失敗）と、出来事の file・記録の file の有無で決める。
    applies_to: MeasurementRunner, NodeBuiltinMeasurer
    trigger: 子プロセスが終わった時
    logic: 起動に失敗、または signal で終わった（BR2.3 で止めた場合を除く） THEN failed。終了コードが 0 でなく、failed の出来事が無い THEN failed。終了コードが 0 で、出来事の file が無いか壊れている THEN failed。終了コードが 0 で、記録の file が無いか空 THEN no_records。上のどれでもない THEN completed。
    violation: 観測できず。cancel・timeout・不明を成功に数えない。
    source: [NFR4, FR4.1, S5]

  - id: BR2.8
    category: constraint
    statement: 試験を走らせる子プロセスには、GateConstants.childEnvAllowlist の名前だけを渡す（許可の名簿）。親の環境から名前を引き算して渡さない。観測の file を置く一時 directory は、成功でも失敗でも片付ける。
    applies_to: MeasurementRunner
    trigger: 子プロセスを起動する時
    logic: 子の環境は空から作り、childEnvAllowlist の各名前に、門が置く値（PATH = 実行中の Node の directory と /usr/bin と /bin だけ、HOME = 実行ごとの一時 directory、LANG と LC_ALL = C.UTF-8、TZ = UTC）を入れる。親の環境の値は 1 つも写さない。NODE_OPTIONS と NODE_PATH は渡さない。一時 directory は OS の一時領域に作り、終わりで消す。
    violation: 該当なし（組み方の制約）。
    source: [NFR5]

  # ---- BR3 判定の核 ----
  - id: BR3.1
    category: calculation
    statement: 行の数と割合は、観測した行ごとの記録から再計算する。申告された値や道具の数字は使わない。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: 対象の記録 = path が分母に含まれ、かつ measuredPaths に含まれる LineRecord。totalLines = 対象の記録の件数。coveredLines = hitCount が 1 以上の件数。lineRatioHundredths = floor(coveredLines × 10000 ÷ totalLines)。perFile は path 順の file ごとの件数。recordsSha256 は、対象の記録を (path, lineNumber) の順に「path TAB lineNumber TAB hitCount LF」で並べた文字列の SHA-256。
    violation: 該当なし（計算の定義）。
    source: [FR2.3, Q2, S5]

  - id: BR3.2
    category: validation
    statement: 分母にあって記録に無い file は未計測として名前を出し、成功にしない。分母の件数は、測れた件数と未計測の件数の和に一致する。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: unmeasuredPaths = 分母 − measuredPaths（code-point 順）。IF 1 件以上 THEN reasonCodes に UNMEASURED_FILES。resolvedFileCount = measuredFileCount + unmeasuredPaths の件数。
    violation: outcome は mismatch。
    source: [FR2.2, FR4.1, FR2.3]

  - id: BR3.3
    category: validation
    statement: 必須の試験のうち流れなかった file は NOT_RUN として名前を出し、成功にしない。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: notRunPaths = 必須の試験 − testFilesRun（code-point 順）。IF 1 件以上 THEN reasonCodes に TESTS_NOT_RUN。
    violation: outcome は mismatch。
    source: [FR4.1, FR4.3, Q1]

  - id: BR3.4
    category: constraint
    statement: 数えられた行が 0 件の判定は、100% と読まず観測できずにする。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: IF 対象の記録が 0 件 THEN unobservable、理由 NO_RECORDS。
    violation: 空の分母や記録なしが成功に見える状態を作らない。
    source: [FR4.1, FR4.2, NFR4]

  - id: BR3.5
    category: policy
    statement: 測定が観測できなかった時、判定は観測できずで、値と一覧は null にする。測定の原因を理由コード 1 つに写す。
    applies_to: CoverageJudge
    trigger: MeasurementResult が unobservable の時
    logic: cause failed -> MEASUREMENT_FAILED、test_failed -> TEST_FAILED、timed_out -> MEASUREMENT_TIMED_OUT、budget_exceeded -> MEASUREMENT_BUDGET_EXCEEDED、no_records -> NO_RECORDS、child_process_not_countable -> CHILD_PROCESS_NOT_COUNTABLE。coveredLines、totalLines、lineRatio、unmeasuredPaths、notRunPaths、perFile、recordsSha256 は null。
    violation: 該当なし（写像の定義）。
    source: [FR4.2, FR4.1, NFR3]

  - id: BR3.6
    category: policy
    statement: 閾値の既定は行 100% で、判定の核の定数 1 か所だけが持つ。比較は整数どうしで厳密に行う。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: 閾値 = GateConstants.defaultThresholdHundredths（10000）。IF coveredLines × 10000 < totalLines × 閾値 THEN reasonCodes に BELOW_THRESHOLD。表示と文書の割合は BR3.1 の切り捨てで、足りない時に 100.00 と見せない。
    violation: outcome は mismatch。
    source: [FR3.1, Q2, NFR3]

  - id: BR3.7
    category: policy
    statement: 結果の区分は 3 値で決める。観測できずを一致に読み替えない。動作が落とすなら、一致でない結果は落とす。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: unobservable = 測定が観測できなかった（BR3.5）または BR3.4。mismatch = 観測できて、reasonCodes に UNMEASURED_FILES、TESTS_NOT_RUN、BELOW_THRESHOLD のどれかがある。match = 観測できて理由が 0 件。reasonCodes の順は UNMEASURED_FILES、TESTS_NOT_RUN、BELOW_THRESHOLD。shouldFail = (outcome が match でない)。mode は enforce。
    violation: 該当なし（区分の定義）。
    source: [FR4.1, FR4.2, FR3.1]

  - id: BR3.8
    category: constraint
    statement: 判定の核と文書の組み立ては、時計・乱数・識別子・環境変数・file を自分で取得しない。同じ入力で同じ出力になる。
    applies_to: CoverageJudge, ResultReporter
    trigger: 常に
    logic: 入力 = 検査済みの入力、MeasurementResult、runId（入口が渡す）。出力の文字列は、決まった項目の順と決まった並び順（path は code-point 順）で作る。入力のどの要素を変えても出力が変わる（読み捨てる入力が無い）。
    violation: 該当なし（構造の制約。核の file に Date、Math.random、randomUUID、process.env、fs が現れないことを試験で確かめる）。
    source: [NFR2, S4]

  # ---- BR4 出力 ----
  - id: BR4.1
    category: policy
    statement: 結果の文書は、どの区分でも、入力の失敗でも、--result の path に書く。形は版 1 で、項目の順・書式・改行が決まっている。
    applies_to: ResultReporter
    trigger: 判定または入力の失敗の後
    logic: 2 文字の字下げの JSON、行末 LF、末尾に改行 1 つ。項目の順は entities.md の ResultDocument の順。path の一覧は code-point 順。
    violation: 書けなければ BR5.3 に従う。
    source: [FR8.1, NFR2]

  - id: BR4.2
    category: policy
    statement: 文書の項目は、判定の結果と観測から作る。観測できない値は null にし、入力の失敗では判定の項目を null にして inputFailure を残す。この単位の固定の項目（動作、除外、閾値の例外）も常に出す。
    applies_to: ResultReporter
    trigger: 文書を作る時
    logic: 通常は GateVerdict と MeasurementResult から埋める。lineRatioPercent は lineRatioHundredths を「NN.NN」（常に小数 2 桁）にする。mode は enforce、exclusions は []、exclusionCount は 0、thresholdException は null、effectiveThresholdPercent は「100.00」。入力の失敗では outcome は unobservable、shouldFail は真、mode と判定の項目と measurementAttempt は null、inputFailure に失敗を入れる。期限か総予算を超えた時は measurementAttempt.endState にそれが残る。
    violation: 該当なし。
    source: [FR8.4, FR8.3, FR4.2, FR6.4]

  - id: BR4.3
    category: constraint
    statement: 文書の値は観測した記録と判定だけから作る。申告された値と前回の値を写さない。宣言した対象の一覧は、宣言そのものとして declaredTargets に残す。
    applies_to: ResultReporter
    trigger: 文書を作る時
    logic: 値の項目の出所は GateVerdict と MeasurementResult だけ。
    violation: 該当なし（出所の制約）。
    source: [FR8.3, FR2.3, S5]

  - id: BR4.4
    category: policy
    statement: job summary は、結果の区分、行の割合、閾値、動作、除外の件数、理由、名前つきの一覧を書く。一致でない結果を成功と書かない。
    applies_to: ResultReporter
    trigger: 文書ができた後
    logic: 区分の見出しは 3 つ（一致 / 不一致 / 観測できず）。観測できずの割合の欄は「not measured」。理由コードを 1 行ずつ。未計測・NOT_RUN・失敗した試験の file は GateConstants.summaryListLimit 件まで名前を出し、残りは件数で書く。完全な一覧は文書にある。
    violation: 該当なし。
    source: [FR7.3, FR4.2, FR6.3]

  - id: BR4.5
    category: constraint
    statement: notice、job summary、出力値、結果の文書は、同じ 1 つの文書から 1 つの整形で作る。食い違わない。
    applies_to: ResultReporter
    trigger: 出力を作る時
    logic: 文書を作った後は、判定の結果を別の経路で読み直さない。
    violation: 該当なし。
    source: [FR7.3, FR8.2, NFR3]

  - id: BR4.6
    category: policy
    statement: 出力値は、決まった名前の項目だけを書く。値は区分の名前か数だけで、自由な文章を入れない。
    applies_to: ResultReporter
    trigger: GITHUB_OUTPUT が設定されている時
    logic: outcome、should-fail、mode、line-ratio-percent（null なら空）、effective-threshold-percent、exclusion-count、schema-version を 1 行ずつ。入力の失敗の時は outcome、should-fail、schema-version だけ値を持ち、ほかは空。
    violation: 書けなければ BR5.3 に従う。
    source: [FR8.2, FR7.3]

  - id: BR4.7
    category: validation
    statement: 利用先の file 名などの自由な文字列を出力に載せる時は、行を壊す文字を無害にする。
    applies_to: ResultReporter
    trigger: notice、summary にテキストを載せる時
    logic: 制御文字と改行は ? に置き換える。notice は % を %25、CR を %0D、LF を %0A にする（GitHub の命令の規則）。summary の path はコードの印で囲み、中のバッククォートを ' に置き換える。
    violation: 該当なし。
    source: [NFR4, NFR5]

  # ---- BR5 入口 ----
  - id: BR5.1
    category: validation
    statement: 入口の引数は --input と --result を 1 回ずつ、値つきだけ。環境変数や別の引数で入力の項目を足したり上書きしたりしない。
    applies_to: CoverageGateCli
    trigger: 入口の起動
    logic: 引数がこの形でない THEN ENTRY_ARGUMENTS_INVALID を標準エラーに 1 行（JSON）で書いて終了コード 2。「この形でない」には、--result の path が --input の path と同じ、または追跡されている file の path（BR5.2 で消す対象が利用先の file になるのを防ぐ）の場合を含む（NFR 設計 SC4 で足した具体化）。
    violation: 測定に進まない。
    source: [NFR4, FR5.4, NFR5]

  - id: BR5.2
    category: constraint
    statement: 入口は、始める時に --result の path の既存の file を消す。前の実行の値が残らない。
    applies_to: CoverageGateCli
    trigger: 引数を確かめた後
    logic: 既存の file があれば消す。消せなければ ENTRY_OUTPUT_FAILED、終了コード 2。
    violation: 古い結果が新しい結果に見える状態を作らない。
    source: [FR8.3, S5]

  - id: BR5.3
    category: policy
    statement: 終了コードは、0 = 落とさない、1 = 落とす（一致でない判定）、2 = 判定に至らなかった（入力の失敗、入口の失敗）。予期しない例外は 2。エラーの後に 0 で終わらない。書く物（結果の file、job summary、出力値）の書き込みに失敗したら 2。
    applies_to: CoverageGateCli
    trigger: 終わる時
    logic: 結果の file は一時の file に書いて名前を替える。書き込みに失敗 THEN ENTRY_OUTPUT_FAILED で 2。判定の shouldFail が偽 THEN 0、真 THEN 1。入力の失敗 THEN 2。
    violation: 成功と見える終了を作らない。
    source: [NFR4, FR4.2, Q2]

  - id: BR5.4
    category: constraint
    statement: 入口は、実行の識別子を環境から 1 回だけ読んで判定の核へ渡す。出力の宛先は、結果の file、job summary、出力値、標準出力の notice、標準エラーだけ。sds-gate や監査の入力に組み込まない。
    applies_to: CoverageGateCli
    trigger: 判定の前
    logic: GITHUB_RUN_ID と GITHUB_RUN_ATTEMPT がともに数字だけの文字列 THEN runId は「ID-ATTEMPT」。ともに無い THEN runId は「local」。それ以外 THEN ENTRY_ENVIRONMENT_INVALID で 2。GITHUB_STEP_SUMMARY と GITHUB_OUTPUT は、設定されていれば書く（無ければ書かない）。
    violation: 該当なし（読み書きの境目の制約）。
    source: [NFR2, FR8.5, S4]

  - id: BR5.5
    category: policy
    statement: 処理の順は、検査 → 測定 → 判定 → 出力 で固定する。入力の失敗は測定をしない。失敗の経路でも、結果の文書と終了コードは出す。
    applies_to: CoverageGateCli
    trigger: 常に
    logic: 入力の失敗 THEN 測定と判定を飛ばし、BR4.2 の入力の失敗の文書を作る。測定が観測できなかった THEN 判定は BR3.5。
    violation: 該当なし。
    source: [NFR4, FR4.2]
```

## 規則の一覧（人が読む要約。source of truth は上の yaml）

| 持ち主 | 規則 | 要点 |
|---|---|---|
| 入力の検査 | BR1.1〜BR1.8 | 読めない・版が違う・未知の項目は失敗。分母と必須の試験を宣言から解決。期限と総予算の既定は 1 か所 |
| 測定 | BR2.1〜BR2.8 | Node 組込みだけ。再試行なし。期限か総予算で全体を止める。試験の失敗は観測できず。壊れた記録は失敗。子の環境は許可した名前の一覧だけ |
| 判定の核 | BR3.1〜BR3.8 | 記録から再計算。未計測・NOT_RUN・閾値未満は不一致。行 0 件と測定の失敗は観測できず。時計・乱数を取らない |
| 出力 | BR4.1〜BR4.7 | 1 つの文書から JSON・summary・notice・出力値を作る。観測できない値は null。自由な文字列は無害にする |
| 入口 | BR5.1〜BR5.5 | 引数は 2 つだけ。古い結果を消す。終了コード 0・1・2。順は固定 |
