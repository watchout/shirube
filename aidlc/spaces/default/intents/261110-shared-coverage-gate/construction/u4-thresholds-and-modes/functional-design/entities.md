# U4 u4-thresholds-and-modes — 実体（entities）

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 契約 2・3・4・7: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。部品: [components.md](../../../inception/domain-design/components.md)。単位: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)。要件: [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR3.2〜FR3.5、FR6.1〜FR6.4、FR8.4）。
- 土台: U3 の実体 [entities.md](../../u3-node-gate-slice/functional-design/entities.md)。この単位は U3 の実体に**項目を足す**だけで、既存の項目の意味を変えない（契約の持ち主の規則、追加の順）。
- 判断の記録: [decisions.md](../../../inception/domain-design/decisions.md) の ADR-001（意味の核は 1 か所）、ADR-004（動作の意味は判定の部品だけが持つ）。
- 現状の突き合わせ: U3 の実装（PR #104 の head `48024643e63c70fa5df62714a129972457181406`）の `scripts/coverage-gate/{input,judge,report,cli}.mjs` を読んだ。U3 の PR が統合される前なので、この単位の実装（コード生成）は U3 の統合後の `main` を土台にする。

## 読み方

- 契約が「U4 が足す」と書いた項目（入力の threshold と mode、結果の thresholdException と mode の表示）を確定した。契約に無い項目は足していない。
- 結果の JSON と出力値の**名前は増やさない**（契約 1・3 の一覧のとおり）。出力値の名前を足すと公開の面の変更になるので、この単位では行わない。
- 論理の型だけを書く。実装の言語や書き方は決めない。

## 実体の定義（source of truth）

```yaml
entities:
  GateConstants:
    description: U3 の GateConstants に足す値。持ち主ごとに 1 か所だけ（NFR3）。
    adds:
      - { name: modes, type: enum-set, required: true, allowed: [enforce, record-only], owner: CoverageJudge, note: "動作の集合と意味は判定の核だけが持つ（ADR-004）。入力の検査は集合を参照するだけ" }
      - { name: defaultMode, type: enum, required: true, defaults: enforce, owner: CoverageJudge, note: "何も指定しなければ落とす（FR6.2）" }
      - { name: rationaleMaxLength, type: integer, required: true, defaults: 300, owner: CoverageInputContract, note: "根拠の文字数の上限（code point）。job summary と JSON を読める長さに保つ" }
      - { name: decisionUrlMaxLength, type: integer, required: true, defaults: 300, owner: CoverageInputContract, note: "決定の URL の文字数の上限。形の確かめより先に長さで失敗にする（検査の時間を線形に保つ）" }
      - { name: decisionUrlShape, type: string, required: true, defaults: "https://github.com/<owner>/<repo>/(issues|pull)/<番号>#issuecomment-<番号>", owner: CoverageInputContract, note: "決定の URL の形。形だけを確かめる（FR3.3）" }
    reuses:
      - "defaultThresholdHundredths（U3、判定の核）。例外の値の上限（未満）はこの定数から導き、100 という数字を 2 か所に書かない（S3）"

  ThresholdException:
    description: 検査済みの閾値の例外。入力の threshold を検査して正規化した値。閾値を行 100% より低く使う時にだけ存在する。
    attributes:
      - { name: percentHundredths, type: integer, required: true, min: 0, max: 9999, constraints: "入力の percent（小数第 2 位までの数）を 100 倍した整数。defaultThresholdHundredths 未満" }
      - { name: decisionUrl, type: string, required: true, constraints: "decisionUrlShape に合う。実在は確かめない" }
      - { name: rationale, type: string, required: true, constraints: "1 行。空白だけでない。制御文字なし。rationaleMaxLength 以内" }

  GateInput:
    description: 検査済みの入力。U3 の項目に 2 つ足す。
    adds:
      - { name: mode, type: enum, required: true, allowed: "GateConstants.modes", defaults: "GateConstants.defaultMode", note: "入力で省略されたら enforce。検査済みの入力では必ず値がある" }
      - { name: threshold, type: "ThresholdException|null", required: true, note: "入力に threshold が無ければ null（既定の行 100%）" }
    constraints:
      - "入力が持てる項目に threshold と mode を足す。threshold の中が持てる項目は percent、decisionUrl、rationale だけ。これ以外のキーはどの階層でも INPUT_FIELD_UNKNOWN（exclusions と measurement はまだ未知）"

  GateVerdict:
    description: 判定の結果。U3 の項目の値の出どころを広げる。
    changes:
      - { name: mode, type: enum, allowed: "GateConstants.modes", note: "U3 は enforce だけだった。入力から受けた値をそのまま持つ" }
      - { name: shouldFail, type: boolean, constraints: "(outcome が match でない) かつ (mode が enforce)。mode が record-only なら常に偽。outcome と reasonCodes は mode に影響されない" }
      - { name: effectiveThresholdHundredths, type: integer, constraints: "thresholdException があればその percentHundredths、無ければ defaultThresholdHundredths。観測できずの判定でも入力から決まるので値を持つ" }
      - { name: thresholdException, type: "{decisionUrl, claimedHundredths, rationale}|null", constraints: "入力の ThresholdException から写す。claimedHundredths は入力が主張した値、effectiveThresholdHundredths は判定が実際に比べた値。観測できずの判定でも、入力にあれば載せる" }

  ResultDocument:
    description: 結果の文書。U3 の項目に値を持たせる。名前は増やさない。
    changes:
      - { name: mode, type: enum, allowed: [enforce, record-only, "null"], constraints: "入力の失敗のとき null（入力が読めない以上、動作を信じない）" }
      - { name: thresholdException, type: "{decisionUrl, claimedPercent, rationale}|null", constraints: "claimedPercent は「NN.NN」。閾値を下げていないとき、入力の失敗のとき null" }
      - { name: effectiveThresholdPercent, type: string, constraints: "実際に比べた閾値。例外があれば例外の値、無ければ「100.00」。入力の失敗のとき null" }
    invariants:
      - "thresholdException が null でないとき、claimedPercent と effectiveThresholdPercent は同じ値（食い違えば照らす側は不一致とする。門は両方を出す）"
      - "mode が record-only でも、outcome と reasonCodes は成功と書き換えない"
      - "入力に threshold も mode も無い実行の文書・summary・notice・出力値は、U3 の出力とバイトまで一致する（後ろ向きの互換）"

  ReasonCode:
    description: 理由コードの集合は増やさない。閾値の例外と動作の入力の失敗は、U3 の入力の理由コードで返す。
    reuses: [INPUT_FIELD_UNKNOWN, INPUT_FIELD_MISSING, INPUT_FIELD_INVALID]
    note: "集合は判定の核だけが持つ（NFR3）。例外の値の範囲・URL・根拠・動作の値の失敗は、field に threshold.percent、threshold.decisionUrl、threshold.rationale、mode などを入れて区別する"

  OutputPresentation:
    description: 同じ文書から作る表示の取り決め。表示の種類は ResultReporter だけが持つ。
    attributes:
      - { name: annotationLevel, type: enum, required: true, allowed: [notice, warning, error], constraints: "下の規則 BR8.3 の表のとおり" }
      - { name: exceptionBanner, type: string, required: false, constraints: "閾値を下げているとき、job summary の最初の行。成功の見出しより前" }
      - { name: recordOnlyLine, type: string, required: false, constraints: "mode が record-only のとき、job summary の表の直後に 1 行" }
```

## 実体の一覧（人が読む要約）

- 足す値: GateConstants に modes、defaultMode（判定の核）と rationaleMaxLength、decisionUrlMaxLength、decisionUrlShape（入力の検査）。
- 足す実体: ThresholdException 1 つ（検査済みの閾値の例外）。
- 項目を足す・値の出どころを広げる実体: GateInput（threshold、mode）、GateVerdict（mode、shouldFail、effectiveThresholdHundredths、thresholdException）、ResultDocument（mode、thresholdException、effectiveThresholdPercent に値）。
- 足さない物: 理由コード、結果の JSON の項目の名前、出力値の名前、結果の区分（3 値）。
- 契約の持ち主の規則に沿った追加であり、`schemaVersion` は 1 のまま（項目の値を持たせるだけで、削除・改名・意味の変更は無い）。
