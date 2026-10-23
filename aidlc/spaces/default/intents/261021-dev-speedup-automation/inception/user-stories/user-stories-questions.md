# User Stories — 物語の作り方と質問

承認済みの要件（`inception/requirements-analysis/requirements.md` の FR1〜FR10・NFR1〜NFR13）から、使う人と席ごとの物語（user stories）を作ります。先に作り方を決めます。

## 作り方の案

- **物語の形**: 「〈人・席〉として、〈したいこと〉をしたい。それは〈得られること〉のためだ。」受入の条件は Given / When / Then で書き、止められる場合（負例）を必ず 1 つ入れる。
- **物語の条件**: INVEST（ほかの物語から独立・話し合える・価値がある・見積もれる・小さい・試験できる）を満たす。
- **ID**: 物語は `US{まとまり}.{番号}`（例: `US1.1`）、受入の条件は `AC{まとまり}.{番号}.{連番}`（例: `AC1.1.1`）。
- **優先度**: MoSCoW（Must / Should / Could / Won't）。どこまでを最初の版に入れるかは、後の Delivery Planning で決める。
- **対応表**: 要件の ID ごとに、どの物語が受け持つかを `traceability.json` に書く。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [製品の決まり] 物語の主語にする人と席

要件に出てくる人と席から、物語の主語を選びます。主語にしない人・席の動きは、ほかの物語の受入の条件の中に書きます。

A. 5 つ: Owner、作者の席（shirube・aun・onza の実装の席）、監査の席（devauditor）、統合の席（suite-lead）、設計の席（arc）
B. A から設計の席を外した 4 つ（arc の動きは Owner の物語の中に書く）
C. Owner と作者の席の 2 つだけ
X. Other (please specify)

[Answer]: A（arc の下書き。要件に arc 自身の動きがある（FR7.2 = 切り替えを Owner に伺う、FR5.4 = 監査の席の役を #49 に記録する）ので、設計の席も主語にする）

## Q2. [製品の決まり] 物語の分け方

A. 仕事の流れの順（依頼 → Inception の段 → 道筋と作業指示 → 実装と PR → 監査 → 統合 → 計測と報告）
B. 人・席ごと
C. 要件（FR1〜FR10）ごと
D. 大きなまとまり（計測・門・配布）ごとに分け、その中を仕事の流れの順に並べる
X. Other (please specify)

[Answer]: D（arc の下書き。範囲の段で承認した「必ず入れるもの」の分け方（計測と検査・門・配布）と揃える。まとまりの中は仕事の流れの順）

## Q3. [製品の決まり] 物語の細かさ

A. 要件の小項目（FR1.1 など）ごとに 1 本前後（約 25〜30 本）
B. 要件のまとまり（FR1〜FR10）ごとに 1〜3 本（約 15 本）
C. 人・席ごとに 2〜3 本（約 12 本）
X. Other (please specify)

[Answer]: B（arc の下書き。Owner が確認する量を抑えるため、要件のまとまりごとに 1〜3 本。受入の条件で細かい所を押さえる）

## Q4. [製品の決まり] 優先度の付け方

範囲の定義では、最初の版の項目はすべて Must にしています（`ideation/scope-definition/intent-backlog.md`）。

A. すべて Must
B. 結果に並べて載せるだけの物は Should にし、ほかは Must にする。Should にするのは、意図の記録からの時間（FR1.2）、90 パーセンタイル（FR1.3 の片方）、AI-DLC の会話での承認の回数（FR1.6 の後半）
X. Other (please specify)

[Answer]: A（arc の下書き。範囲の段で全部 Must とし、要件の段で Owner が「中央値と 90 パーセンタイルの両方を載せる」「AI-DLC の会話での承認の回数を別に記録する」と選んだ（Q10・Q1）。B はその答えを下げることになる）

## Consolidated Summary Confirmation

- 物語の主語: Owner、作者の席（shirube・aun・onza の実装の席）、監査の席（devauditor）、統合の席（suite-lead）、設計の席（arc）の 5 つ（arc の下書き） [Q1]
- 分け方: 計測・門・配布の 3 つのまとまりに分け、その中を仕事の流れの順に並べる（arc の下書き） [Q2]
- 細かさ: 要件のまとまり（FR1〜FR10）ごとに 1〜3 本、全体で約 15 本。細かい所は受入の条件で押さえる（arc の下書き） [Q3]
- 優先度: すべて Must（arc の下書き） [Q4]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
