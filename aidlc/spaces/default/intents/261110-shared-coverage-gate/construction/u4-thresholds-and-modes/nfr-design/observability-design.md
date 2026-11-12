# U4 u4-thresholds-and-modes — 観測の設計

この単位は、閾値を下げた事実と動作を、4 つの面（結果の JSON、job summary、注釈、出力値）に出す。ここでは、それぞれの面での出し方と、集計できる形を決める。常駐の監視は持たない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [observability-requirements.md](../nfr-requirements/observability-requirements.md)（NFR4.8〜NFR4.12、NFR10.1・NFR10.2）。機能の設計: [rules.md](../functional-design/rules.md)（BR8.1〜BR8.6）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（契約 3）。
- 土台: U3 の [observability-design.md](../../u3-node-gate-slice/nfr-design/observability-design.md)（OB1〜OB5）。

## OB1 job summary の構成（NFR4.8）

例外があるとき、summary の構成は次の順（上から）。例外が無い・enforce の時は、U3 の構成のまま。

1. 例外の行（最初の行）: 「Threshold lowered to NN.NN% (default 100.00%) by decision exception」の旨の固定の文型。
2. 結果の見出し（Match / Mismatch / Not observable。record-only で観測できなければ「Not observable (計測不能)」）。
3. 表（Line coverage / Threshold / Mode / Exclusions）。Threshold 欄は実際の閾値と「lowered from 100.00%」。Mode 欄は enforce か record-only。
4. record-only の行（動作が record-only のとき）: 「Record-only mode: this result is recorded and does not fail the job.」の旨。
5. 理由コードと名前つきの一覧（U3 のまま）。
6. 例外の節（Threshold exception）: 決定の URL、主張された値、根拠。

- 例外の行を結果の見出しより前に置くのは、閾値を下げた事実が成功の表示に隠れないため（FR3.5）。構成は 1 つの関数が組み立て、面ごとに別々の経路を持たない。

## OB2 注釈の種類（NFR4.9）

| 結果 | 例外なし | 例外あり |
|---|---|---|
| 一致 | notice（U3 のまま） | warning（実際の閾値と「lowered」、決定の URL） |
| 一致でない、enforce | error（U3 のまま） | error（U3 の文面に「lowered threshold」の一言と決定の URL を足す） |
| 一致でない、record-only | warning（「recorded only, the job is not failed」） | warning（同上に例外の一言と決定の URL を足す） |
| 観測できない、record-only | warning（「not observable (計測不能)」、「recorded only」） | 同上に例外の一言 |
| 入力の失敗 | error（U3 のまま） | （例外は読み取れていない） |

- 文面は固定の文型で、実際の閾値と区分を必ず含む。根拠は載せない（summary と JSON にある）。自由な文字列（URL）は U3 の無害化を通す。
- 注釈の種類の決定は、整形の部品の 1 つの表（種類を返す純粋な関数）で行い、試験が表のすべての行を確かめる。

## OB3 例外も動作も無い出力は変えない（NFR4.10）

- 例外が無く enforce の時は、追加の行・節・種類の変更を出さない。追加の出力は、例外または record-only の条件の中にだけ置く。golden の比較（reliability-design.md の RL6）で、バイトまで一致を確かめる。

## OB4 4 つの面は 1 つの文書から作る（NFR4.11）

- U3 と同じく、結果の文書（1 つの JSON 相当の値）を 1 回作り、JSON・summary・notice・出力値をそこから作る。整形が判定の結果を別の経路で読み直さない。閾値・動作・例外が面の間で食い違わない構造を、試験が確かめる（4 つの面の閾値の数字と動作の名前を取り出して突き合わせる）。

## OB5 出力値の名前は増やさない（NFR4.12）

- 出力値は 7 つのまま（outcome、should-fail、mode、line-ratio-percent、effective-threshold-percent、exclusion-count、schema-version）。動作は既存の `mode`、実際の閾値は既存の `effective-threshold-percent` に載る。出力値に自由な文字列を書かない。試験: 出力値の名前の集合が U3 と等しい。

## OB6 集計できる形（NFR10.1、NFR10.2）

- 結果の JSON の `mode`、`thresholdException` の有無、`effectiveThresholdPercent` が集計の元になる。観測できない時は null（申告された値や前回の値を入れない）。入力の失敗の文書は、`mode`・`thresholdException`・`effectiveThresholdPercent` を null にする。
- 集計の仕方（例外を使った実行の数、record-only の実行の数）は U8 の手引きに書く。この単位は、集計できる形で出すところまで。

## Assumptions & Open Questions

### Assumptions

- [assumption] summary の最初の行の文型（英語の固定の文型）は、コード生成で確定する。意味（閾値を下げている事実、実際の閾値、既定の 100.00%）を欠かさないことを試験で確かめる。
- [assumption] 注釈の種類 warning の画面での見え方は、U7 の配線の後に観測する。

### Open Questions

なし。
