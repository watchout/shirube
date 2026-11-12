# U3 u3-node-gate-slice — 実体（entities）

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 契約 2〜7: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。部品: [components.md](../../../inception/domain-design/components.md)。単位: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)。
- [Q1]〜[Q4]: [functional-design-questions.md](./functional-design-questions.md)（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。

## 読み方

- 契約の概要が「最小」と書いた形を、この単位で確定した。契約に無い項目を足した所は `added_by_u3: true` と書いた（追加は版を上げない追加。契約の持ち主の規則）。
- 値の置き場所（1 か所の定数）は `GateConstants`。ほかの実体はそこを参照する（NFR3）。
- 論理の型だけを書く。実装の言語や書き方は決めない。

## 実体の定義（source of truth）

```yaml
entities:
  GateConstants:
    description: 規則の値を 1 か所にまとめた物。持ち主ごとに分かれて置く（判定の核、入力の検査、測定の部品）。他の実体は値を写さずここを参照する。
    attributes:
      - { name: schemaVersion, type: integer, required: true, defaults: 1, owner: CoverageJudge }
      - { name: outcomes, type: enum-set, required: true, allowed: [match, mismatch, unobservable], owner: CoverageJudge }
      - { name: reasonCodes, type: enum-set, required: true, allowed: "ReasonCode の集合", owner: CoverageJudge }
      - { name: defaultThresholdHundredths, type: integer, required: true, defaults: 10000, constraints: "100.00% を 100 分の 1 単位で持つ。比較は整数だけ", owner: CoverageJudge }
      - { name: defaultDeadlineSeconds, type: integer, required: true, defaults: 600, owner: CoverageInputContract }
      - { name: defaultTotalBudgetSeconds, type: integer, required: true, defaults: 900, owner: CoverageInputContract }
      - { name: testFilePattern, type: string-set, required: true, defaults: "*.test.js, *.test.mjs, *.test.cjs（basename）", owner: CoverageInputContract }
      - { name: guaranteedNodeMajor, type: integer, required: true, defaults: 22, owner: NodeBuiltinMeasurer }
      - { name: strippedEnvNames, type: string-set, required: true, defaults: "GITHUB_TOKEN, ACTIONS_RUNTIME_TOKEN, ACTIONS_ID_TOKEN_REQUEST_TOKEN, ACTIONS_ID_TOKEN_REQUEST_URL", owner: MeasurementRunner }
      - { name: summaryListLimit, type: integer, required: true, defaults: 20, owner: ResultReporter }

  ReasonCode:
    description: 成功にならない理由、または入口が止まった理由の名前。意味と集合は判定の核だけが持つ。
    attributes:
      - { name: code, type: string, required: true, unique: true }
      - { name: class, type: enum, required: true, allowed: [input, mismatch, unobservable, entry] }
      - { name: exitCode, type: integer, required: true, allowed: [1, 2], constraints: "class が mismatch か unobservable（判定に至った）なら 1（shouldFail が真のとき）。input と entry は 2" }
    members:
      input: [INPUT_UNREADABLE, INPUT_VERSION_INVALID, INPUT_FIELD_UNKNOWN, INPUT_FIELD_MISSING, INPUT_FIELD_INVALID, INPUT_SHAPE_UNSUPPORTED, TARGET_UNRESOLVED, TARGET_EMPTY]
      mismatch: [UNMEASURED_FILES, TESTS_NOT_RUN, BELOW_THRESHOLD]
      unobservable: [MEASUREMENT_FAILED, TEST_FAILED, MEASUREMENT_TIMED_OUT, MEASUREMENT_BUDGET_EXCEEDED, NO_RECORDS, CHILD_PROCESS_NOT_COUNTABLE]
      entry: [ENTRY_ARGUMENTS_INVALID, ENTRY_ENVIRONMENT_INVALID, ENTRY_OUTPUT_FAILED]

  GateInput:
    description: 検査済みの入力（契約 4 の validated）。入力の JSON を検査して正規化した値。この単位は node-builtin の形だけを受ける。
    attributes:
      - { name: schemaVersion, type: integer, required: true, allowed: [1] }
      - { name: shape, type: enum, required: true, allowed: [node-builtin] }
      - { name: declaredTargets, type: string-list, required: true, constraints: "1 件以上。各 1 文字以上" }
      - { name: testTargets, type: string-list, required: true, constraints: "1 件以上。各 1 文字以上", added_by_u3: false }
      - { name: deadlineSeconds, type: integer, required: false, defaults: "GateConstants.defaultDeadlineSeconds", min: 1 }
      - { name: totalBudgetSeconds, type: integer, required: false, defaults: "GateConstants.defaultTotalBudgetSeconds", min: 1 }
    constraints:
      - "上の項目以外のキーは、どの階層でも INPUT_FIELD_UNKNOWN（threshold、mode、exclusions、measurement を含む。U4・U5・U6 が受け付ける項目に足す）"
    relationships:
      - { to: ResolvedTargets, cardinality: "1..1", direction: "GateInput -> ResolvedTargets（検査の中で解決する）" }

  ResolvedTargets:
    description: 宣言を、追跡されている file の集合に解決した物（契約 8）。
    attributes:
      - { name: denominatorPaths, type: path-list, required: true, constraints: "1 件以上。重複なし。code-point 順" }
      - { name: requiredTestPaths, type: path-list, required: true, constraints: "1 件以上。重複なし。code-point 順。testFilePattern に合う物だけ" }
    constraints:
      - "解決は既存の HygieneLib の呼び出し（resolveTargets、trackedFiles）だけで行い、規則を持たない"

  InputFailure:
    description: 入力の検査の失敗（契約 4 の invalid）。結果の文書の inputFailure に載る。
    attributes:
      - { name: reasonCode, type: ReasonCode, required: true, constraints: "class が input" }
      - { name: field, type: string, required: true, constraints: "どの項目か。項目に当たらない失敗は 入力全体を表す \"$\"" }
      - { name: detail, type: string, required: true, constraints: "名前つきの説明。失敗した file 名やキー名を含む。内容は決まった文型" }

  LineRecord:
    description: 行ごとの記録（契約 5）。観測した値だけ。
    attributes:
      - { name: path, type: path, required: true, constraints: "repo からの相対 path。先頭の ./ や // を除いた形" }
      - { name: lineNumber, type: integer, required: true, min: 1 }
      - { name: hitCount, type: integer, required: true, min: 0 }
    constraints:
      - "(path, lineNumber) は一意。重複は測定の失敗"

  TestObservation:
    description: 試験 file 1 本について、報告係が受けた出来事を数えた物。標準出力の文面は使わない。
    attributes:
      - { name: path, type: path, required: true, unique: true }
      - { name: passed, type: integer, required: true, min: 0, constraints: "skip でも todo でもない合格した試験（suite を除く）の数" }
      - { name: failed, type: integer, required: true, min: 0, constraints: "skip でも todo でもない失敗の数。file の読み込みの失敗を含む" }
      - { name: skipped, type: integer, required: true, min: 0 }
      - { name: todo, type: integer, required: true, min: 0 }
    derived:
      - { name: ran, rule: "passed が 1 以上" }

  MeasurementAttempt:
    description: 測定 1 回の終わり方の観測（契約 6）。再試行しないので、1 回の実行につき 1 件。
    attributes:
      - { name: toolName, type: string, required: true, defaults: "node" }
      - { name: deadlineSeconds, type: integer, required: true }
      - { name: totalBudgetSeconds, type: integer, required: true }
      - { name: spentSeconds, type: integer, required: true, min: 0, constraints: "実測の経過時間を秒に切り上げた値" }
      - { name: endState, type: enum, required: true, allowed: [completed, failed, timed_out, budget_exceeded] }
    note: "契約の attemptId は、1 回しか実行しないので持たない（added_by_u3 ではなく省略。複数回の実行を足す単位が足す）"

  MeasurementResult:
    description: 測定の結果（契約 5）。形を決めるのは判定の核。測定の部品は変換するだけで、閾値・理由コード・結果の意味を決めない。
    attributes:
      - { name: kind, type: enum, required: true, allowed: [records, unobservable] }
      - { name: records, type: LineRecord-list, required: "kind が records のとき", constraints: "path と lineNumber の順" }
      - { name: measuredPaths, type: path-list, required: "kind が records のとき", added_by_u3: true, constraints: "記録の中に SF として現れた file。行が 0 件の file も含む" }
      - { name: testObservations, type: TestObservation-list, required: true, added_by_u3: true, constraints: "path の順。kind が unobservable でも、観測できた分を持つ" }
      - { name: testFilesRun, type: path-list, required: true, constraints: "TestObservation.ran が真の file" }
      - { name: testFailurePaths, type: path-list, required: true, added_by_u3: true, constraints: "failed が 1 以上の file" }
      - { name: measurementDefinition, type: MeasurementDefinition, required: true }
      - { name: childProcessLinesCounted, type: boolean, required: true }
      - { name: attempt, type: MeasurementAttempt, required: true }
      - { name: cause, type: enum, required: "kind が unobservable のとき", allowed: [failed, test_failed, timed_out, budget_exceeded, no_records, child_process_not_countable], added_by_u3: "test_failed を足した" }
    relationships:
      - { to: LineRecord, cardinality: "0..*", direction: "MeasurementResult -> LineRecord" }
      - { to: TestObservation, cardinality: "0..*", direction: "MeasurementResult -> TestObservation" }
      - { to: MeasurementAttempt, cardinality: "1..1", direction: "MeasurementResult -> MeasurementAttempt" }

  MeasurementDefinition:
    description: 何を、何で測ったか（FR1.5、FR8.4）。
    attributes:
      - { name: name, type: string, required: true, allowed: [node-builtin] }
      - { name: measuredTarget, type: string, required: true, defaults: "declared tracked sources" }
      - { name: toolName, type: string, required: true, defaults: "node --test coverage" }
      - { name: toolVersion, type: string, required: true, added_by_u3: true, constraints: "実行した Node の版（process.versions.node）。観測した事実で、保証ではない" }

  GateVerdict:
    description: 判定の結果（契約 7）。動作の意味はここだけが決める。
    attributes:
      - { name: outcome, type: enum, required: true, allowed: [match, mismatch, unobservable] }
      - { name: shouldFail, type: boolean, required: true }
      - { name: mode, type: enum, required: true, allowed: [enforce], note: "U4 が record-only を足す" }
      - { name: reasonCodes, type: ReasonCode-list, required: true, constraints: "決まった順。outcome が match なら空" }
      - { name: coveredLines, type: integer, required: "outcome が unobservable でないとき。それ以外は null", min: 0 }
      - { name: totalLines, type: integer, required: "outcome が unobservable でないとき。それ以外は null", min: 1 }
      - { name: lineRatioHundredths, type: integer, required: "同上", min: 0, max: 10000, constraints: "floor(coveredLines × 10000 ÷ totalLines)。切り捨て" }
      - { name: effectiveThresholdHundredths, type: integer, required: true, defaults: "GateConstants.defaultThresholdHundredths" }
      - { name: thresholdException, type: "null", required: true, note: "U4 が値を持たせる" }
      - { name: unmeasuredPaths, type: path-list, required: "outcome が unobservable でないとき。それ以外は null" }
      - { name: notRunPaths, type: path-list, required: "同上" }
      - { name: perFile, type: PerFileSummary-list, required: "同上", added_by_u3: true }
      - { name: recordsSha256, type: string, required: "同上", added_by_u3: true, constraints: "正規化した LineRecord の列の SHA-256（16 進 64 文字）" }
    relationships:
      - { to: PerFileSummary, cardinality: "0..*", direction: "GateVerdict -> PerFileSummary" }

  PerFileSummary:
    description: 測れた file ごとの行の数。監査席が合計を足し直せるようにする。
    attributes:
      - { name: path, type: path, required: true, unique: true }
      - { name: coveredLines, type: integer, required: true, min: 0 }
      - { name: totalLines, type: integer, required: true, min: 0 }
    constraints:
      - "coveredLines の合計 = GateVerdict.coveredLines、totalLines の合計 = GateVerdict.totalLines"

  ResultDocument:
    description: CI の成果物の JSON（契約 3）。GateVerdict と観測から作る。入力の失敗のときも作る。
    attributes:
      - { name: schemaVersion, type: integer, required: true, allowed: [1] }
      - { name: runId, type: string, required: true, constraints: "入口が環境から作って渡す。形は ^[A-Za-z0-9._-]{1,64}$" }
      - { name: outcome, type: enum, required: true, allowed: [match, mismatch, unobservable] }
      - { name: shouldFail, type: boolean, required: true }
      - { name: mode, type: enum, required: true, allowed: [enforce, "null"], constraints: "入力の失敗のとき null" }
      - { name: reasonCodes, type: ReasonCode-list, required: true }
      - { name: coveredLines, type: integer, required: true, constraints: "unobservable のとき null" }
      - { name: totalLines, type: integer, required: true, constraints: "unobservable のとき null" }
      - { name: lineRatioPercent, type: string, required: true, constraints: "\"NN.NN\"（小数第 2 位で切り捨て、常に 2 桁）。unobservable のとき null" }
      - { name: effectiveThresholdPercent, type: string, required: true, constraints: "\"100.00\"（この単位の固定値の書式）。入力の失敗のとき null" }
      - { name: thresholdException, type: "null", required: true }
      - { name: measurementDefinition, type: MeasurementDefinition, required: true, constraints: "入力の失敗のとき null" }
      - { name: denominator, type: DenominatorSummary, required: true, constraints: "入力の失敗のとき null" }
      - { name: exclusions, type: list, required: true, defaults: "[]" }
      - { name: exclusionCount, type: integer, required: true, defaults: 0 }
      - { name: unmeasuredPaths, type: path-list, required: true, constraints: "unobservable のとき null" }
      - { name: notRunPaths, type: path-list, required: true, constraints: "unobservable のとき null" }
      - { name: testFailurePaths, type: path-list, required: true, added_by_u3: true, constraints: "失敗した試験 file。無ければ []。入力の失敗のとき null" }
      - { name: perFile, type: PerFileSummary-list, required: true, added_by_u3: true, constraints: "unobservable のとき null" }
      - { name: recordsSha256, type: string, required: true, added_by_u3: true, constraints: "unobservable のとき null" }
      - { name: measurementAttempt, type: MeasurementAttempt, required: true, constraints: "測定に至らなかったとき null" }
      - { name: inputFailure, type: InputFailure, required: true, added_by_u3: true, constraints: "入力の失敗のときだけ値。それ以外は null" }
    relationships:
      - { to: GateVerdict, cardinality: "1..1", direction: "ResultDocument <- GateVerdict（入力の失敗のときは GateVerdict を作らない）" }

  DenominatorSummary:
    description: 分母の件数。分母の件数と記録の件数の突き合わせ（FR2.3）を出力から確かめられるようにする。
    attributes:
      - { name: declaredTargets, type: string-list, required: true }
      - { name: resolvedFileCount, type: integer, required: true, min: 1 }
      - { name: measuredFileCount, type: integer, required: true, added_by_u3: true, min: 0 }
    constraints:
      - "outcome が unobservable でないとき、resolvedFileCount = measuredFileCount + unmeasuredPaths の件数"
      - "outcome が unobservable のとき measuredFileCount は null"
```

## 実体の一覧（人が読む要約）

- 設定の値: GateConstants 1 つ。理由コード 20（入力 8、不一致 3、観測できず 6、入口 3）。
- 入力の側: GateInput、ResolvedTargets、InputFailure。
- 測定の側: LineRecord、TestObservation、MeasurementAttempt、MeasurementResult、MeasurementDefinition。
- 判定と出力の側: GateVerdict、PerFileSummary、ResultDocument、DenominatorSummary。
- 契約に無く足した項目（追加は版を上げない）: MeasurementResult の measuredPaths・testObservations・testFailurePaths と cause の test_failed、MeasurementDefinition の toolVersion、GateVerdict の perFile・recordsSha256、DenominatorSummary の measuredFileCount、ResultDocument の testFailurePaths・perFile・recordsSha256・inputFailure。
- 契約の項目で省いた物: MeasurementAttempt の attemptId（1 回しか実行しない）。契約 7 の「現在時刻」の入力（出力に時刻に依る項目が無いので判定の核は取らない。時刻に依る項目を足す単位が、核への明示の入力として足す）。
