# 共有の網羅率の門 — 契約の概要

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 単位: [unit-of-work.md](../units-generation/unit-of-work.md)。依存: [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)。部品: [components.md](../domain-design/components.md)。要件: [requirements.md](../requirements-analysis/requirements.md)（FR1〜FR8、NFR2〜NFR4、NFR8）。
- 判断: [decisions.md](../domain-design/decisions.md)（ADR-001〜007）。
- [Q1]〜[Q4]: [contract-design-questions.md](./contract-design-questions.md)（すべて arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
- 先例: `.github/workflows/hygiene.yml`（commit 固定で呼ぶ再利用 workflow、profile の path を入力で受ける形）、`scripts/hygiene/lib.mjs`（`resolveTargets`、`trackedFiles`、終了コードの定義）。

## 読み方

- 契約は 8 本。公開される面は 2 本（契約 1 の workflow の入力と出力値、契約 3 の結果の JSON）、門の入口の入力の形が 1 本（契約 2）、門の中の境目が 4 本（契約 4〜7）、既存の部品の使い方が 1 本（契約 8）。
- 項目の**型と意味**はここで決める。項目の**完全な一覧**のうち、ここで「最小」と書いた物は、持ち主の単位の機能の設計で確定し、追加はすべて追加の順（[Q3] の A）で行う。
- S10 の 2 つ（U1・U2）は新しい契約を作らない。U2 の起動の種類の一覧は、その単位の機能の設計で書く。
- 公開に載る例は架空の repo と値だけ。

## 契約の一覧

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| 1 | U7（CoverageGateWorkflow） | External: 利用先の `ci.yml`（通常の job と DB の job） | `workflow_call` の入力と出力値（commit を 40 桁で固定して呼ぶ） | U7 |
| 2 | U3（CoverageGateCli） | U7（workflow が呼ぶ） | command の引数 2 つ（入力の JSON の path と結果の path）、入力の JSON、終了コード 0・1・2 | U3（入力の項目の追加は U4・U5・U6） |
| 3 | U3（ResultReporter） | U7（出力値にする）、U8（検証）、External: 利用先と後の監査（CI の成果物を機械で読む） | CI の成果物の JSON（`schemaVersion` つき） | U3（項目の追加は U4・U5） |
| 4 | U3（CoverageInputContract） | U3（CoverageGateCli から CoverageJudge へ）、U4、U5 | 同じ repo の中の共有の型: 検査済みの入力、または入力の失敗（理由コード） | U3 |
| 5 | U3（CoverageJudge が LineRecord の形を決める） | U3（NodeBuiltinMeasurer）、U6（TypeScriptVitestMeasurer） | 同じ repo の中の共有の型: 測定の結果（行ごとの記録、または観測できない原因） | U3 |
| 6 | U3（MeasurementRunner） | U3（NodeBuiltinMeasurer）、U6（TypeScriptVitestMeasurer） | 同じ repo の中の呼び出し: 子プロセスの実行の依頼と、終わり方の観測 | U3 |
| 7 | U3（CoverageJudge） | U3（ResultReporter、CoverageGateCli） | 同じ repo の中の共有の型: 判定の結果（GateVerdict） | U3（項目の追加は U4・U5） |
| 8 | 既存の HygieneLib（この取り組みでは変更しない） | U3（CoverageInputContract） | 既存の関数の呼び出し（`resolveTargets`） | 既存（変更しない） |

## 契約 1 — 再利用 workflow の入力と出力値（公開）

利用先の `ci.yml` が `uses: watchout/shirube/.github/workflows/<門の workflow>.yml@<40 桁の commit>` で呼ぶ。入力は**利用先の repo に置いた JSON の file の path 1 つ**（先例の `hygiene.yml` の `profile` と同じ形）で、値そのもの（除外・閾値の例外・動作など）は `with:` では渡さない（[Q1] の A を、この形に解釈した。確認が要る点は末尾の表）。除外や動作が利用先の repo の file の差分として見える（FR5.4）。

```yaml
# workflow-call: 再利用 workflow の公開された面（U7 が持つ）
workflow_call:
  inputs:
    config:
      description: 利用先の repo にある入力の JSON の path（契約 2 の入力の形）
      type: string
      required: true
    node-version:
      type: string
      default: "22"
  secrets: {}            # 資格情報は受け取らない（NFR5。GitHub を読む資格情報を持たせない）
  outputs:                # job の出力値。結果の JSON（契約 3）から作る（申告値を写さない）
    outcome:              # match | mismatch | unobservable（一致・不一致・観測できず）
    should-fail:          # "true" | "false"
    mode:                 # enforce | record-only
    line-ratio-percent:   # 観測できず のとき空
    effective-threshold-percent:
    exclusion-count:
    schema-version:
permissions:              # job の権限は最小（NFR5）
  contents: read
artifact:
  name: coverage-gate-result
  file: coverage-result.json    # 契約 3
call_rules:
  - 呼び出しは commit の 40 桁で固定する。短い指定やブランチ名の呼び出しは、手引きの試験で不合格にする（FR7.1、AC1.5.3）
  - 通常の job からも、版または指紋を固定した PostgreSQL を起動する job からも、同じ入力と出力で呼べる（FR7.2、FR5.5）
  - 必須の step に continue-on-error、`|| true`、`--if-present` を置かない。門の入口が返した終了コードを、そのまま job の成否にする（ADR-004、NFR4）
  - 動作（enforce か record-only）に応じた分岐を workflow の step に持たない（ADR-004）
```

- 出力値の `outcome` は 3 値（`match`、`mismatch`、`unobservable`）。観測できないとき、`line-ratio-percent` は空で、申告値や前回の値は入れない（AC2.4.4）。
- notice と job summary は、この出力値と同じ結果から作り、食い違わない（AC2.3.3）。値は、測った行の割合、閾値、動作、除外の件数。

## 契約 2 — 門の入口の command と入力の JSON

入口は command 1 つ。引数は 2 つだけで、値は渡さない（[Q1] の A）。

```text
<入口の command> --input <入力の JSON の path> --result <結果の JSON を書く path>
```

- 入口は、現在時刻と実行の識別子（GitHub Actions の実行の番号と試行の番号）を環境から読み、判定の核へ明示の入力として渡す。判定の核は時計も乱数も読まない（NFR2、S4）。
- 入口が書く先は、`--result` の file（契約 3）、`GITHUB_STEP_SUMMARY`、`GITHUB_OUTPUT`、notice の標準出力だけ。
- 入口の置き場所と名前は、U3 の機能の設計で決める。

入力の JSON（共有の型）:

```yaml shared-schema
# coverage-gate-input v1（持ち主: U3。項目の追加: U4=threshold と mode、U5=exclusions、U6=measurement）
schemaVersion: 1                      # 整数。未知または欠けていれば、入力不正（失敗）
shape: node-builtin                   # node-builtin | typescript-vitest（後者は U6 が値を足す）
denominator:                          # 測る対象のソースの集合を呼ぶ側が宣言する（FR2.1）
  targets: [src/]                     # 追跡されている file、または追跡された file を含む directory。解決は契約 8
testTargets: [tests/]                 # 「必須の試験」を決める宣言（FR4.3）。名前と形は U3 の機能の設計で確定（末尾の表）
exclusions:                           # 省略可。省略は 0 件（FR3.3 ではなく FR5.2〜FR5.4）
  - path: src/example/db-only.mjs     # 追跡されている file を 1 本ずつ。directory 名と wildcard は入力不正
    reason: DB の job でだけ流れる。理由が無い・空の除外は入力不正
threshold:                            # 省略可。省略は行 100%（FR3.1）
  percent: 95                         # 0 以上 100 未満。100 以上は例外ではないので入力不正
  decisionUrl: https://github.com/example-org/example-repo/issues/1#issuecomment-1   # 形だけ検査。実在は監査が確かめる（FR3.3）
  rationale: 架空の根拠の文               # 空は入力不正
mode: enforce                         # enforce | record-only。省略は enforce（FR6.2）
deadlineSeconds: 600                  # 省略可。1 回の測定の期限。既定は 1 か所に置く（U3 の機能の設計）
totalBudgetSeconds: 900               # 省略可。測定全体の総予算。既定は 1 か所に置く
measurement:                          # U6 が値を足す。workflow は値を通すだけで、検査は入口の側（ADR-006）
  definition: built-js                # 例。許される値の集合は U6 の機能の設計で決める
unknown_keys: reject                  # 未知の項目は入力不正（fail closed）。理由は末尾の表
```

- 形の検査の失敗は、門が持つ理由コードの 1 つとして返し、入口の終了コードは 2 になる。入力不正は動作に関わらず 2 で、「記録だけ」でも隠さない（判定に至らなかったため。末尾の表で確認する）。
- 入口が読む入力は `--input` の JSON だけ。環境変数や別の引数で除外・閾値・動作を足したり上書きしたりする経路は作らない（FR5.4）。

終了コード（[Q2] の B）:

| 終了コード | 意味 | 「記録だけ」のとき |
|---|---|---|
| 0 | 落とさない（判定が一致、または動作が `record-only` で shouldFail が偽） | 判定が不一致・観測できずでも 0 |
| 1 | 落とす（判定が不一致、または観測できず。動作が `enforce`） | 1 にならない |
| 2 | 入力不正、または入口の失敗（判定に至らなかった） | 2 のまま（動作で隠さない） |

## 契約 3 — 結果の JSON（公開）

CI の成果物 `coverage-result.json`。観測した記録から作った判定の結果だけから作る（FR8.3、S5）。

```yaml shared-schema
# coverage-gate-result v1（持ち主: U3。項目の追加: U4=thresholdException と mode の表示、U5=exclusions）
schemaVersion: 1                       # 整数。読む側は、未知または欠けていれば失敗にする（[Q3] の A）
runId: "123456-1"                      # 実行の識別子（入口が環境から読んで渡す。判定の核は作らない）
outcome: match                         # match | mismatch | unobservable
shouldFail: false
mode: enforce                          # enforce | record-only
reasonCodes: []                        # 成功にならない理由。集合は判定の核が 1 か所で持つ（NFR3）
coveredLines: 120                      # 観測できず のとき null
totalLines: 120                        # 観測できず のとき null
lineRatioPercent: "100"                # coveredLines と totalLines から再計算した値。観測できず のとき null。精度の規則は U3 の機能の設計
effectiveThresholdPercent: "100"
thresholdException: null               # 100% より低く使ったとき {decisionUrl, claimedPercent, rationale}（FR3.4）
measurementDefinition:                 # 何を測ったか（FR1.5、FR8.4）
  name: node-builtin
  measuredTarget: tracked JS sources
  toolName: node --test coverage
denominator:
  declaredTargets: [src/]
  resolvedFileCount: 3
exclusions:                            # 0 件以上。名前と理由（FR5.3）
  - { path: src/example/db-only.mjs, reason: DB の job でだけ流れる }
exclusionCount: 1
unmeasuredPaths: []                    # 測定の記録が無い宣言された file（FR2.2）
notRunPaths: []                        # 流れていない必須の試験 file（FR4.1）
measurementAttempt:                    # 測定の終わり方（契約 6）
  toolName: node
  deadlineSeconds: 600
  totalBudgetSeconds: 900
  spentSeconds: 12
  endState: completed                  # completed | failed | timed_out | budget_exceeded
```

- 観測できないとき（`unobservable`）、値の項目は `null` で、成功とは書かない（AC2.4.4）。
- 「記録だけ」では `mode: record-only`、`shouldFail: false` で、`outcome` と `reasonCodes` は成功と書き換えずに残す（FR6.3、FR6.4）。
- 閾値を 100% より低く使ったとき、`thresholdException` が入り、notice と job summary では成功の表示より前に書く（FR3.5）。

## 契約 4 — 検査済みの入力と入力の失敗（門の中）

```yaml shared-schema
# validated-input（持ち主: U3 CoverageInputContract。入口が受け取り、判定の核へ渡す）
result: validated | invalid
validated:                              # result が validated のとき
  input: <契約 2 の入力を検査して正規化した値。denominator は契約 8 で解決済みの file の集合>
invalid:                                # result が invalid のとき
  reasonCode: <判定の核が持つ理由コードの集合の 1 つ>
  field: <どの項目か>
  detail: <名前つきの説明。失敗した file の名前など>
rules:
  - 理由コードの意味は定義しない。集合は判定の核だけが持つ（ADR-001、NFR3）
  - 閾値の例外は URL の形・値・根拠がそろっていることだけを確かめる。実在は確かめない（FR3.3）
  - 「落とすか」はここで決めない。判定の核が shouldFail として返す（ADR-004）
```

## 契約 5 — 測定の結果と行ごとの記録（門の中）

```yaml shared-schema
# measurement-result（持ち主: U3。形を決めるのは CoverageJudge。測定の部品は変換するだけ ADR-002）
LineRecord:
  path: <repo からの相対 path。契約 8 と同じ正規化（./ や // を除いた形）>
  lineNumber: <1 以上の整数>
  hitCount: <0 以上の整数>
MeasurementResult:
  kind: records | unobservable
  records: [LineRecord]                 # kind が records のとき
  testFilesRun: [path]                  # 実際に流れた試験 file（NOT_RUN の判定に使う）
  measurementDefinition: <契約 3 の measurementDefinition>
  childProcessLinesCounted: true | false   # false の組み合わせはこの形に使わず、数えられないことを返す（FR1.4）
  attempt: <契約 6 の MeasurementAttempt>
  cause: <kind が unobservable のとき: failed | timed_out | budget_exceeded | no_records | child_process_not_countable>
rules:
  - 測定の部品は、閾値・理由コード・結果の意味を定義しない（S2、ADR-002）
  - 判定の核は、行の割合を records から再計算する。道具が出した割合の数字は信じない（FR2.3）
```

## 契約 6 — 測定の実行と終わり方（門の中）

```yaml shared-schema
# measurement-run（持ち主: U3 MeasurementRunner）
request:
  toolName: <測定の道具の名前>
  command: <実行する command と引数>
  cwd: <作業 directory>
  deadlineSeconds: <1 回の期限>
  remainingBudgetSeconds: <総予算の残り>
MeasurementAttempt:
  attemptId: <識別子>
  toolName: <同上>
  deadlineSeconds: <同上>
  totalBudgetSeconds: <同上>
  spentSeconds: <使った時間>
  endState: completed | failed | timed_out | budget_exceeded
rules:
  - 期限か総予算を超えたら子プロセスを止め、timed_out か budget_exceeded を返す（FR4.4）
  - 子プロセスの標準出力の文面を根拠にしない。終わり方は終了の観測から決める（S5）
  - 再試行しない（[Q4] の A）。1 回の失敗・時間切れ・記録なしは、そのまま観測できずの原因にする。再実行は利用先の CI の再実行に任せる
  - 期限と総予算に、時刻を読む責任はこの部品にある（判定の核は時計を読まない）
```

## 契約 7 — 判定の結果（門の中）

```yaml shared-schema
# gate-verdict（持ち主: U3 CoverageJudge。入口と出力の部品が受け取る）
GateVerdict:
  outcome: match | mismatch | unobservable
  shouldFail: <真偽>                    # 動作の意味はここだけが決める（ADR-004）
  mode: enforce | record-only
  reasonCodes: [<理由コード>]
  lineRatio: { coveredLines: <整数|null>, totalLines: <整数|null> }
  effectiveThresholdPercent: <値>
  thresholdException: <契約 4 の検査済みの値|null>
  unmeasuredPaths: [path]
  notRunPaths: [path]
inputs_the_core_takes:                   # 核は自分で取得しない（NFR2、S4）
  - 検査済みの入力
  - 測定の結果（契約 5）
  - 現在時刻と実行の識別子（入口が渡す）
rules:
  - 同じ入力で同じ出力になる（再実行でバイト一致）
  - 成功にならないのは、未計測がある、必須の試験が流れていない、計測できなかった、閾値に満たない、入力の形の失敗、のどれか。観測できずを一致に読み替えない（FR4.1、FR4.2）
```

## 契約 8 — 既存の HygieneLib の使い方（変更しない）

```yaml shared-schema
# hygiene-lib-use（持ち主: 既存。この取り組みでは変更しない ADR-003）
call: resolveTargets(cwd, targets) -> { include: [glob], missing: [raw] }
         trackedFiles(cwd, { include, exclude }) -> [path]
rules:
  - 分母の宣言は、この呼び出しで追跡されている file の集合に解決する。対象の解決の規則を 2 か所で持たない（S3）
  - missing が 1 件でもあれば、その名前を出して入力不正にする（黙って少なく測らない）
  - 実行時の npm 依存を足さない（NFR6）
```

## 契約の持ち主の規則

- 持ち主は、その形を提供する単位。契約 1 は U7、契約 2〜7 は U3。U4・U5・U6 は持ち主の単位に項目を**足す**側で、既存の項目の意味を変えない。
- 破壊的な変更（項目の削除・改名・意味の変更）は、持ち主の単位の変更として扱い、`schemaVersion` を上げる。契約 1 の workflow の入力の削除・改名は破壊的で、利用先が commit を上げたときに直す。
- 追加的な変更（[Q3] の A）: 結果の JSON は、項目の追加で版を上げない。読む側は知らない項目を無視し、`schemaVersion` が未知または欠けていれば失敗にする（fail closed）。workflow の入力の追加は省略可にし、省略時の既定は今までの動作を保つ。
- 契約 1 と 3 の変更は、利用先と監査に届くので、持ち主の単位の PR の独立監査で確かめる。契約 1 の追加・変更は workflow の変更で保護対象（FR7.5）。
- 非公開の土台の識別子・コード・製品固有の名前は、この文書に写さない（FR9.1）。

## Assumptions & Open Questions

### Assumptions

- [assumption] [Q1] の A を、「入力の JSON の file を利用先の repo に置き、workflow はその path を `config` として受け取り、入口の command に `--input` として渡す」形と解釈した。workflow が `with:` の個別の値から file を組み立てる形ではない。
- [assumption] 入力の JSON は、未知の項目を入力不正にする（fail closed）。[Q3] の A の「未知の項目は無視」は、結果の JSON を読む側の規則で、入力の JSON には当てはめない。
- [assumption] 入力不正と入口の失敗は、動作が `record-only` でも終了コード 2 のまま。判定に至らず、動作を信じられないため。
- [assumption] 必須の試験を決める宣言（`testTargets`）を入力に置く。FR4.3 の「追跡されている試験 file のすべて」を決めるのに必要なため。

### Open Questions

| Contract | Question | Blocks |
|---|---|---|
| 1 | 呼び出しが 40 桁の commit で固定されているかを、門の側で確かめられるか（`job.workflow_ref` などで読めるか）。読めなければ手引きの試験と PR の検査で担保する | U7 |
| 1・2 | [Q1] の A の解釈（利用先に JSON を置き、workflow は path だけを受ける）でよいか | U7、U3 |
| 2 | 入力の JSON の未知の項目を入力不正にしてよいか（上の仮定） | U3 |
| 2 | 入力不正・入口の失敗を `record-only` でも 2 のままにしてよいか（上の仮定） | U3、U4 |
| 2 | `testTargets` の名前と形、および `deadlineSeconds`・`totalBudgetSeconds` の既定の値 | U3 |
| 3 | `lineRatioPercent` の精度と丸めの規則、`reasonCodes` の具体の名前の集合、`runId` の形 | U3 |
| 2・5 | 子プロセスの行を Node 組込みの網羅率が数えられるか。数えられなければ `child_process_not_countable` を返す組み合わせを決める | U3 |
| 2 | `measurement.definition` に許される値の集合（TypeScript の測定の定義）と、測定の道具が新しい依存になるときの arc-sec の確認と Owner の決定 | U6 |
| 3 | 結果の JSON を sds-gate や監査の入力に組み込むか（範囲外。組み込む場合は範囲を広げる Owner の判断が要る） | なし（この取り組みの範囲外） |
| 1 | Node 22 より新しい版を保証するか（`node-version` の許す値） | U3、U7 |
