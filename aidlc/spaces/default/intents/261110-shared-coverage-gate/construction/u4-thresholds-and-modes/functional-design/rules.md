# U4 u4-thresholds-and-modes — 規則（rules）

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR・NFR の ID）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。部品: [components.md](../../../inception/domain-design/components.md)。実体: [entities.md](./entities.md)。
- 土台: U3 の規則 [rules.md](../../u3-node-gate-slice/functional-design/rules.md)（BR1〜BR5）。この単位の規則は BR6〜BR8 とし、U3 の規則と番号が重ならない。U3 の規則を書き換える所は「U3 の BRx.y に足す」と明記した。
- 決定済みの前提: 終了コードは 0 = 落とさない、1 = 落とす、2 = 判定に至らなかった（入力不正または入口の失敗）で、動作に関わらず 2 は隠さない（契約の Q2 の答え。arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。「記録だけ」の間も閾値未満・未計測・NOT_RUN は CI を落とさない（FR6.4 の前提。要件の承認の場で arc が確認した）。
- 実測（作った側の観測）: U3 の実装の入力の検査・判定・出力の構造を読んだ。入力の検査は文字列を受けて検査済みの入力か最初の失敗を返す純粋な関数、判定は検査済みの値だけを受ける純粋な関数、出力は 1 つの文書から JSON・summary・notice・出力値を作る関数で、どれも時計・環境・file を読まない。この単位はその構造のまま項目を足す。

## 規則（source of truth）

規則は 3 つの持ち主で分ける。BR6 = 閾値の例外の入力の検査（CoverageInputContract）、BR7 = 動作と判定への反映（CoverageInputContract の mode の検査と CoverageJudge）、BR8 = 出力（ResultReporter）。

```yaml
rules:
  # ---- BR6 閾値の例外の入力の検査 ----
  - id: BR6.1
    category: validation
    statement: 入力が持てる項目に threshold と mode を足す。threshold の中が持てる項目は percent、decisionUrl、rationale だけで、これ以外のキーはどの階層でも失敗にする。
    applies_to: CoverageInputContract
    trigger: 入力を検査する時（U3 の BR1.3 に足す）
    logic: IF threshold が object で、中に 3 つ以外のキーがある THEN INPUT_FIELD_UNKNOWN（field "threshold.<キー名>"）。最上位の集合に threshold と mode を足す。exclusions と measurement は引き続き未知（U5・U6 が足す）。
    violation: 測定に進まない。結果の文書に inputFailure を残し、終了コード 2。
    source: [NFR4, FR3.2, FR5.4]

  - id: BR6.2
    category: validation
    statement: threshold を書くなら、percent、decisionUrl、rationale の 3 つがそろっていなければならない。1 つでも欠ければ、下げた値は受け付けない。threshold が object でない（null、配列、文字列など）のも失敗にする。
    applies_to: CoverageInputContract
    trigger: 動作の検査（BR7.1）を通った後
    logic: IF threshold が存在し object でない THEN INPUT_FIELD_INVALID（field "threshold"）。IF percent、decisionUrl、rationale のどれかが無い THEN INPUT_FIELD_MISSING（field "threshold.<欠けたキー>"）。欠けたキーが複数あるときは percent、decisionUrl、rationale の順で最初の 1 件。threshold が無い入力は例外なしで、行 100%。
    violation: BR6.1 と同じ（終了コード 2）。URL が無いのに値だけ下げる入力は、ここで失敗にする。
    source: [FR3.2, FR3.3]

  - id: BR6.3
    category: validation
    statement: 下げる値（percent）は JSON の数で、0 以上、既定の閾値（行 100%）未満、小数第 2 位までとする。数として読めない値、100 以上の値は例外ではないので失敗にする。
    applies_to: CoverageInputContract
    trigger: BR6.2 を通った後
    logic: IF percent が JSON の数でない（文字列 "95" を含む） THEN INPUT_FIELD_INVALID（field "threshold.percent"）。IF percent が 0 未満、または GateConstants.defaultThresholdHundredths を 100 で割った値以上 THEN 同じ。percent を 100 倍して最も近い整数にし、その整数を 100 で割った値が percent と等しいときだけ小数第 2 位までの数とする（そうでなければ同じ失敗）。通ったら、整数（percentHundredths）に正規化する。-0 は 0 に正規化する。
    violation: BR6.1 と同じ。100 という数字を書かず、上限は既定の閾値の定数から導く（S3）。
    source: [FR3.2, FR3.3, NFR3]

  - id: BR6.4
    category: validation
    statement: 決定の URL は、GitHub の issue または pull request のコメントを指す形（https://github.com/<owner>/<repo>/issues/<番号>#issuecomment-<番号>、または /pull/）に合うものだけ。形だけを確かめる。
    applies_to: CoverageInputContract
    trigger: BR6.3 を通った後
    logic: IF decisionUrl が文字列でない、GateConstants.decisionUrlMaxLength を超える、または GateConstants.decisionUrlShape に完全に合わない THEN INPUT_FIELD_INVALID（field "threshold.decisionUrl"）。長さの確かめを形の確かめより先に行う。完全一致で、前後の空白、query、別の fragment、別の host、資格情報つきの URL（user@host）、http は合わない。owner は英数字と - だけで 1〜39 文字、repo は英数字と . _ - だけで 1〜100 文字、"." と ".." だけの名前は合わない。番号は先頭が 0 でない 1〜12 桁の数字。
    violation: BR6.1 と同じ。
    source: [FR3.2, FR3.3]

  - id: BR6.5
    category: validation
    statement: 根拠（rationale）は、空白だけでない 1 行の文字列で、GateConstants.rationaleMaxLength 文字（code point）以内、制御文字を含まない。入力のとおりに保存し、整形し直さない。
    applies_to: CoverageInputContract
    trigger: BR6.4 を通った後
    logic: IF rationale が文字列でない、空白だけ、制御文字（U+0000〜U+001F、U+007F）を含む、または上限を超える THEN INPUT_FIELD_INVALID（field "threshold.rationale"）。
    violation: BR6.1 と同じ。
    source: [FR3.2, FR3.3, NFR4]

  - id: BR6.6
    category: constraint
    statement: 門は決定の実在、書き手、本文が値を認めているかを確かめない。GitHub への問い合わせをせず、GitHub を読む資格情報を読まず、持たない。これらを確かめるのは独立の監査である。
    applies_to: CoverageInputContract, CoverageJudge, ResultReporter, CoverageGateCli
    trigger: 常に
    logic: 入力の検査・判定・出力の file は、ネットワークの module（http、https、net、dns、tls、fetch）を読み込まず、環境変数から資格情報（トークンの名前）を読まない。入口が読む環境変数は GITHUB_RUN_ID、GITHUB_RUN_ATTEMPT、GITHUB_STEP_SUMMARY、GITHUB_OUTPUT だけ（U3 の BR5.4 のまま）。workflow が資格情報を受けない宣言（secrets を持たない）は U7 が受ける。
    violation: 該当なし（構造の制約。試験で file の中身と読み込みを確かめる）。
    source: [FR3.3, NFR5]

  # ---- BR7 動作と判定への反映 ----
  - id: BR7.1
    category: validation
    statement: 動作（mode）は入力 1 つで切り替える。省略は enforce。値は enforce か record-only だけ。それ以外の値、null、文字列でない値は失敗にする。
    applies_to: CoverageInputContract
    trigger: 期限と総予算の検査（U3 の BR1.8）を通った後
    logic: IF mode が無い THEN GateConstants.defaultMode（enforce）。IF mode が GateConstants.modes に含まれる文字列 THEN その値。それ以外（"fail"、"Enforce"、"record"、null、数、真偽）THEN INPUT_FIELD_INVALID（field "mode"）。大文字小文字と別名を受け付けない。
    violation: BR6.1 と同じ。書き間違いが「記録だけ」にも「落とす」にも読み替えられない。入力の失敗は動作に関わらず終了コード 2。
    source: [FR6.1, FR6.2, NFR4]

  - id: BR7.2
    category: policy
    statement: 動作の意味はここだけが決める。落とすかどうか（shouldFail）は、結果の区分が一致でなく、かつ動作が enforce のときに限り真。結果の区分と理由コードは動作に影響されない。
    applies_to: CoverageJudge
    trigger: 判定する時（U3 の BR3.7 の shouldFail を置き換える）
    logic: shouldFail = (outcome が match でない) AND (mode が enforce)。mode が record-only なら、mismatch でも unobservable でも shouldFail は偽。outcome と reasonCodes は U3 の BR3.1〜BR3.7 のまま計算し、record-only のために match へ書き換えない。mode は入力から受けた値を verdict に持つ。
    violation: 該当なし（意味の定義）。workflow と入口は動作に応じた分岐を持たない（ADR-004）。
    source: [FR6.1, FR6.3, FR6.4, NFR3]

  - id: BR7.3
    category: policy
    statement: 入力の失敗と入口の失敗は、動作が record-only でも終了コード 2 のままで、結果の文書の mode は null にする。動作を信じられない入力は動作として扱わない。
    applies_to: CoverageGateCli, ResultReporter
    trigger: 入力の失敗または入口の失敗の時（U3 の BR5.3、BR4.2 のまま）
    logic: 判定に至ったとき（verdict がある）の終了コードは shouldFail が偽なら 0、真なら 1。入力の失敗は 2。結果の file・summary・出力値の書き込みの失敗は record-only でも 2（記録が残らないので隠さない）。
    violation: 成功と見える終了を作らない。
    source: [NFR4, FR6.3]

  - id: BR7.4
    category: calculation
    statement: 閾値の既定は行 100% で、判定の核の定数 1 か所だけが持つ。閾値の例外があれば、その値が実際の閾値になる。比較は整数どうしで厳密に行う。
    applies_to: CoverageJudge
    trigger: 判定する時（U3 の BR3.6 を広げる）
    logic: effectiveThresholdHundredths = (例外があればその percentHundredths、無ければ GateConstants.defaultThresholdHundredths)。IF coveredLines × 10000 < totalLines × effectiveThresholdHundredths THEN reasonCodes に BELOW_THRESHOLD。例外の値は defaultThresholdHundredths 未満なので、既定より厳しくはならない。判定が観測できずでも effectiveThresholdHundredths は入力から決まるので値を持つ。
    violation: outcome は mismatch（U3 の BR3.7 と同じ）。
    source: [FR3.1, FR3.2, NFR3]

  - id: BR7.5
    category: constraint
    statement: 閾値の例外は verdict に、主張された値と実際に比べた値の両方を別の項目として残す。例外を使った事実は、結果の区分や網羅率の高さに関わらず残る。
    applies_to: CoverageJudge
    trigger: 判定する時
    logic: 例外があれば verdict.thresholdException = {decisionUrl, claimedHundredths（入力が主張した値）, rationale}、verdict.effectiveThresholdHundredths = 比較に実際に使った値。例外が無ければ thresholdException は null。観測できずの判定でも、match の判定でも、入力にあれば載せる。網羅率が 100% でも「例外を使った」事実を消さない。
    violation: 該当なし（残す規則）。
    source: [FR3.4, FR8.4]

  - id: BR7.6
    category: constraint
    statement: 判定の核は mode と閾値の例外を明示の入力として受け、時計・乱数・識別子・環境変数・file を取得しない。同じ入力で同じ出力になる。
    applies_to: CoverageJudge
    trigger: 常に（U3 の BR3.8 のまま）
    logic: judge の入力に mode と threshold（null か ThresholdException）を足す。入力のどれを変えても出力が変わる（読み捨てる入力が無い）。
    violation: 該当なし（構造の制約）。
    source: [NFR2, S4]

  # ---- BR8 出力 ----
  - id: BR8.1
    category: policy
    statement: 結果の文書の thresholdException には、決定の URL、主張された値、根拠を残し、effectiveThresholdPercent に実際に比べた閾値を残す。閾値を下げていないとき thresholdException は null。mode には動作を残す。
    applies_to: ResultReporter
    trigger: 文書を作る時（U3 の BR4.2 の固定の項目に値を持たせる）
    logic: thresholdException = verdict.thresholdException が null でなければ {decisionUrl, claimedPercent（claimedHundredths を「NN.NN」に）, rationale}、null なら null。effectiveThresholdPercent は verdict.effectiveThresholdHundredths から「NN.NN」。mode は verdict.mode。入力の失敗の文書は U3 のまま（thresholdException と effectiveThresholdPercent と mode が null）。項目の名前は増やさない。
    violation: 該当なし。
    source: [FR3.4, FR6.3, FR8.4, FR8.3]

  - id: BR8.2
    category: policy
    statement: 閾値を下げて使った事実は、job summary の最初の行に、成功の見出しより前に書く。表の閾値の欄にも、下げていること（既定の 100.00% との差）が分かるように書く。
    applies_to: ResultReporter
    trigger: summary を作る時
    logic: thresholdException があるとき、summary の最初の行に「閾値を 100.00% より低い NN.NN% に下げている」旨の 1 行を、結果の見出しの前に置く。続く表の Threshold 行に実際の閾値と、既定から下げていることを書く。表の後に「Threshold exception」の節を置き、決定の URL、主張された値、根拠を書く。これらは結果の区分（match、mismatch、unobservable）に関わらず出す。thresholdException が無いとき、これらの行・節は出ない（AC4.3.3）。URL と根拠は自由な文字列なので、U3 の BR4.7 の無害化を通す。
    violation: 該当なし。
    source: [FR3.5, FR3.4, NFR4]

  - id: BR8.3
    category: policy
    statement: notice は、同じ文書から、区分と動作と例外に応じた注釈の種類で書く。実際の閾値を必ず書く。例外を使ったときは成功でも通常の notice にせず、目立つ種類にする。
    applies_to: ResultReporter
    trigger: notice を作る時（U3 の BR4.4・BR4.5 に足す）
    logic: |
      注釈の種類は次の表。上から順に評価する。
        入力の失敗                                   -> error（U3 のまま）
        outcome が match で、例外なし                -> notice（U3 のまま）
        outcome が match で、例外あり                -> warning
        outcome が match でなく、mode が enforce     -> error（U3 のまま。例外があれば例外の一言を足す）
        outcome が match でなく、mode が record-only -> warning（落とさないことを一言で書く）
      文面は固定の文型で、実際の閾値（effectiveThresholdPercent）を含む。例外あり: 「threshold lowered by exception」と決定の URL（形を検査済みなので無害）を含む。record-only で outcome が unobservable: 「not observable (計測不能)」と書く。record-only の文面は成功とは書かず、「recorded only, the job is not failed」の旨を含む。根拠（rationale）は notice に載せない（job summary と JSON にある）。
    violation: 該当なし。
    source: [FR3.5, FR6.3, FR8.2]

  - id: BR8.4
    category: policy
    statement: 動作が record-only のとき、job summary に、落とさない動作であることを書き、計測できなかった結果には「計測不能」と書く。結果の見出しは成功と書かない。
    applies_to: ResultReporter
    trigger: summary と notice を作る時
    logic: mode が record-only のとき、summary の表の直後に「Record-only mode: this result is recorded and does not fail the job.」の旨の 1 行を置く。表の Mode 欄に record-only を書く。outcome が unobservable のとき、見出しは「Not observable (計測不能)」にする。outcome が mismatch の見出しは「Mismatch」のまま（成功と書かない）。理由コードと名前つきの一覧は enforce と同じに出す（FR6.4）。mode が enforce のとき、見出し・本文は U3 のまま変えない。
    violation: 該当なし。
    source: [FR6.3, FR6.4]

  - id: BR8.5
    category: constraint
    statement: 動作も例外も指定しない入力の実行は、結果の文書・job summary・notice・出力値のすべてが U3 の出力とバイトまで一致する。出力値の名前は増やさない。
    applies_to: ResultReporter, CoverageGateCli
    trigger: 常に
    logic: 例外なしかつ mode が enforce のとき、BR8.1〜BR8.4 の追加の行・節・種類の変更は出ない。出力値は outcome、should-fail、mode、line-ratio-percent、effective-threshold-percent、exclusion-count、schema-version の 7 つのまま。動作か例外を指定した実行では、mode と effective-threshold-percent の値が指定どおりになるだけで、名前は増えない。
    violation: 後ろ向きの互換が壊れる（U3 の試験が落ちる）。
    source: [NFR8, FR8.2, FR8.4]

  - id: BR8.6
    category: constraint
    statement: 結果の文書・summary・notice・出力値は、U3 と同じく 1 つの文書から 1 つの整形で作る。出力の宛先を増やさず、sds-gate や監査の入力には組み込まない。
    applies_to: ResultReporter, CoverageGateCli
    trigger: 出力を作る時（U3 の BR4.5、BR5.4 のまま）
    logic: 例外・動作の表示は、判定の結果とは別の経路で読み直さない。宛先は結果の file、job summary、出力値、標準出力の notice、標準エラーだけ。
    violation: 該当なし。
    source: [FR8.3, FR8.5, NFR3]
```

## 規則の一覧（人が読む要約。source of truth は上の yaml）

| 持ち主 | 規則 | 要点 |
|---|---|---|
| 閾値の例外の入力 | BR6.1〜BR6.6 | threshold は 3 つそろいで書く。値は 0 以上 100 未満の小数第 2 位までの数、URL は GitHub のコメントの形、根拠は 1 行。実在は確かめず、資格情報を持たない |
| 動作と判定 | BR7.1〜BR7.6 | mode は enforce か record-only だけ、省略は enforce。落とすかは判定の核だけが決める。区分と理由は動作で変えない。入力の失敗は record-only でも 2。例外は主張した値と実際の値を別に残す |
| 出力 | BR8.1〜BR8.6 | 例外は summary の最初の行・表・節に出し、notice は目立つ種類にする。record-only は落とさないと書き、計測不能は「計測不能」と書く。例外も動作も無い実行は U3 とバイトまで一致 |

## 門が保証しないこと

- 閾値の例外について、門は URL の**形**、下げる値、根拠がそろっていることしか確かめない。URL が実在するか、書き手が Owner か、本文が値を認めているかは、門の外の独立の監査が GitHub の公開記録と照らして確かめる（FR3.3。門に GitHub を読む資格情報を持たせない）。
- この補い方は今ある独立の監査で行い、新しい道具や別の取り組みへは広げない。広げる前に Owner に伺う（プロジェクトの訂正の記録）。
