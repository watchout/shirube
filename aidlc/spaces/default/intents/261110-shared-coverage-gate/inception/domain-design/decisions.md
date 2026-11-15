# 共有の網羅率の門 — 判断の記録

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 部品: [components.md](./components.md)。問いと答え: [domain-design-questions.md](./domain-design-questions.md)（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
- 要件: [requirements.md](../requirements-analysis/requirements.md)。標準: 設計・実装の標準 S2・S3・S4・S5・S8。

## ADR-001: 入力の形の検査と判定の核を分ける

- **Context** — 除外が1本ずつ名指しか、閾値の例外の URL・値・根拠がそろっているか、動作の値が正しいか、という入力の形の検査と、観測した記録から一致・不一致・観測できずを決める判定は、変わる理由が違う（呼び出しの書式 対 判定の規則）。理由コードの集合は1か所だけに置く必要がある（NFR3、S3）。判定の核は同じ入力で同じ出力になる必要がある（NFR2）。[Q1]
- **Decision** — 入力の検査は `CoverageInputContract`、判定の核は `CoverageJudge` に分ける。理由コードの集合は `CoverageJudge` だけが持ち、入力の検査の失敗もその集合の1つとして返す。
- **Consequences** — 良い点: 判定の核が呼び出しの書式の変更に影響されず、正例・負例の試験を判定だけで書ける。理由コードが1か所。悪い点: 入口の部品の間で、入力の形の失敗を渡す手間が1つ増える。中立: 失敗を理由コードとして返す約束が、Contract Design の対象になる。
- **Alternatives Rejected** — 1つの部品にする: 書式の変更が判定の核を触り、純粋さを保つ試験が広がる。設計の段で決める: 後の段が部品の数に依存するので、ここで決めたほうがよい。

## ADR-002: 形ごとの測定の部品を分け、行ごとの記録の形は判定の部品が決める

- **Context** — Node 組込みの形と、TypeScript と vitest の形では、測る道具と記録の出方が違う。判定の核が読む「行ごとの記録」の形は1つでなければならない（S2: adapter は輸送と形式だけ変換し、判定の意味を再定義しない）。範囲の文書に3つ目の形は無い（抽象は3例目）。[Q2]
- **Decision** — `NodeBuiltinMeasurer` と `TypeScriptVitestMeasurer` を分け、どちらも `CoverageJudge` が決めた `LineRecord` の形に変換する。測定の部品は閾値・理由コード・結果の意味を持たない。
- **Consequences** — 良い点: 形を増やすときは、変換の部品を1つ足すだけ。悪い点: 変換が2つになり、共通の `LineRecord` を最初に決める手間が要る。中立: 3つ目の形が出たとき、共通の部分を抽出するかは、その時に決める。
- **Alternatives Rejected** — 測定の部品を1つにして中で2つの形を扱う: 形が増えるたびに分岐が膨らむ。判定の部品の外に記録の形を置く: 記録の形が判定の意味と離れ、2か所で決める恐れがある。

## ADR-003: 分母の解決に衛生の共通部品を使う

- **Context** — 衛生の共通部品（`HygieneLib`）は追跡されている file と宣言された対象を解決する。分母の宣言（FR2.1）の解決も同じ判断である。同じ判断を2か所で下さない（S3）。実行時の npm 依存は足さない（NFR6）。[Q3]
- **Decision** — `CoverageInputContract` は、分母の解決に `HygieneLib` の対象解決を呼ぶ。`HygieneLib` は変更せず、依存は Node 組込みだけのまま。
- **Consequences** — 良い点: 対象の解決の規則が1つ。外の依存は増えない。悪い点: 網羅率の門が衛生の共通部品の変更に影響される。中立: 衛生の共通部品の変更は、網羅率の門の試験でも確かめる。
- **Alternatives Rejected** — 自前で書く: 対象の解決の規則が2つに分かれる。設計の段で決める: 入力の検査の部品の依存が定まらず、後の段が進めにくい。

## ADR-004: 動作（落とす・記録だけ）の意味は判定の部品だけが持つ

- **Context** — 動作は入力1つで切り替える。何も指定しなければ「落とす」。「記録だけ」の間も、結果は成功とは書かない（FR6.1〜FR6.4）。失敗を隠す書き方（`continue-on-error`、`|| true`、`--if-present`）は禁止（NFR4、S8）。
- **Decision** — 動作の意味（CI を落とすか）は `CoverageJudge` が決め、`shouldFail` として返す。`CoverageGateCli` は `shouldFail` を終了コードに写すだけ。`CoverageGateWorkflow` は終了コードをそのまま job の成否にし、動作に応じた分岐を step に持たない。「記録だけ」でも、結果の区分と理由は成功とは書かず残す。
- **Consequences** — 良い点: 動作の意味が1か所。workflow に失敗を隠す書き方を置く誘いが無い。悪い点: 判定の部品が動作を知る。中立: 入力の動作の値の検査（正しい値か）は `CoverageInputContract` が行う。
- **Alternatives Rejected** — workflow の step が動作に応じて失敗を許す: S8 に反する。入口の部品が動作の意味を持つ: 判定の意味が2か所に分かれる（S3）。

## ADR-005: 子プロセスの実行と期限・総予算を1つの部品に持つ

- **Context** — 測定は子プロセスで行い、期限と総予算を超えたら「観測できず」を返す（FR4.4、S5）。2つの測定の部品の両方に必要。
- **Decision** — `MeasurementRunner` を分け、子プロセスの実行、期限・総予算の強制、終わり方（完了・失敗・時間切れ・予算超過）の観測を持たせる。2つの測定の部品は `MeasurementRunner` を呼ぶ。
- **Consequences** — 良い点: 時間切れの扱いが1か所。悪い点: 部品が1つ増える。中立: 期限と総予算の値は呼ぶ側の入力（`CoverageInputContract` が形を検査）。
- **Alternatives Rejected** — 測定の部品ごとに持つ: 時間切れの知識が2か所に重複する（S3）。

## ADR-006: 呼び出し口の workflow は薄くし、判断は入口の Node の部品に置く

- **Context** — 再利用 workflow は保護対象で、変更に Owner の対象 head の承認が要る（FR7.5）。権限は最小（NFR5）。判断を workflow の step に散らすと、試験しにくく、失敗を隠す書き方を誘う。
- **Decision** — `CoverageGateWorkflow` は入力を渡し、権限を宣言し、出力値と成果物を返すだけ。判断は `CoverageGateCli` 以下に置く。
- **Consequences** — 良い点: 判断を Node の試験で検証できる。workflow の変更が小さい。悪い点: workflow と入口の間の入力の対応表を保つ手間。中立: 入力と出力値の名前は設計の段で決める。
- **Alternatives Rejected** — 判断を workflow の step に書く: 試験しにくい。

## ADR-007: CI の実行を減らす直し（S10）は新しい部品を作らない

- **Context** — S10 は、kit の門の呼び出しの起動を監査に関わるコメントに絞り、Shirube 自身の CI に同じ PR の古い実行の取り消しを置く。どちらも既存の workflow の変更で、保護対象（FR10.5）。`labeled`・`unlabeled` を外すかは、risk ラベルが判定に効くかを確かめてから決める（FR10.2）。
- **Decision** — 既存の `KitGateCaller` と `ShirubeCi` の変更として扱い、新しい部品を作らない。ラベルの効きの確認は設計の段で `scripts/sds/gate.mjs` を読んで行い、効くなら `labeled`・`unlabeled` を残す。
- **Consequences** — 良い点: 構造が増えない。悪い点: 変更の確認が workflow の差分と負例の試験に頼る。中立: 順序は最初（範囲の文書）。
- **Alternatives Rejected** — 起動の絞りを新しい部品にする: 構造だけが増え、得られる物が無い。

## 判断が要る事（決めていない）

次の事は、この段で決めておらず、記録だけを残す。DB の構造、新しい外の依存、公開 API の仕様、課金・価格、セキュリティの設計を、この段は変えていない。

- 測定の道具の新しい依存（c8、vitest、TypeScript の道具など）の採用: arc-sec の確認と Owner の決定が要る。
- 再利用 workflow の追加・変更、S10 の変更: Owner の対象 head の承認が要る。
