# 作業の単位（Unit of Work）

出典:
- 部品の一覧: `inception/domain-design/components.md`
- 設計の決定: `inception/domain-design/decisions.md`（ADR-001〜009）
- 要件: `inception/requirements-analysis/requirements.md`
- 物語: `inception/user-stories/stories.md`
- この段の答え: `units-generation-questions.md`（Q1〜Q6 と分け方の承認）

決まり:
- 部品の関係の深いまとまりごとに分ける（Q1）。
- 1 つの Unit は、PR 1〜2 本（1 本あたり追加 400 行・20 file の中）に収まる大きさにする（Q3）。
- 試験が先（`team-practices.md`）。

## Unit の一覧

| Unit ID | Directory | 種類 | 大きさ | 置き場の repo | 作る席 |
|---------|-----------|------|--------|---------------|--------|
| U1 | u1-skeleton | service | M | shirube | shirube の実装の席 |
| U2 | u2-metrics | service | L | shirube | shirube の実装の席 |
| U3 | u3-approval-records | service | M | shirube | shirube の実装の席 |
| U4 | u4-gate-judgements | service | M | shirube | shirube の実装の席 |
| U5 | u5-plan-admission | service | S | shirube | shirube の実装の席 |
| U6 | u6-dist-aun | packaging | S | aun | aun の実装の席 |
| U7 | u7-dist-onza | packaging | S | onza | Onza の席 |

- 種類の意味:
  - service = GitHub Actions や CLI として動く物
  - packaging = 配布の部品と pin
- 監査はどの Unit も devauditor、統合は suite-lead（作者と別の席）。
- 同じ席に 2 つの Unit を同時に渡さない（Q4）。

## U1 u1-skeleton — 端から端まで通る細い版

- **中身**: 次の流れを、最小の形で 1 本通す（Q2）。
  1. PR の機械向けの block に AI-DLC の記録の欄（intent と段）を足す（SdsGate）。
  2. 記録の橋（RecordBridge）が、前の段の承認の記録を 1 種類だけ読む。
  3. 承認の記録の作り手（ApprovalRecordWriter）が、その記録を最小の形で作る。
  4. 門（SdsGate）がこの判定を記録だけ（report-only）で行い、commit status に結果を含める。
  5. 計測（MetricsCollector・MetricsCore）が、その status を読んで PASS と FAIL を数え、1 行の JSON を出す。
- **境目**: 各部品の最小の形だけを作る。指標の全体は U2、承認の記録の形の確定は U3、設計の置き場の検査は U4 で作る。
- **動かし方**: shirube 自身の PR で、門を固定 commit の再利用 workflow から記録だけ（report-only）で動かす（統合は止めない）。計測は CLI として手で動かせる。
- **注意と制約**:
  - shirube の門の呼出しの workflow と pin（記録だけ）を U1 に入れる。どちらも保護面なので、U1 の PR は R4 で、Owner の exact-head を通す。この 1 回に、網羅率の検査の CI と、監査の席の分類の役の決定もまとめる（Delivery Planning の Q8・Q4、この段の中で直した）。
  - 計測は書込みをしない（ADR-003）。

## U2 u2-metrics — 計測の全体

- **中身**:
  - 今の値の固定（9/21〜10/20 の PR の番号の一覧）（FR1.8）
  - 4 つの指標（時間の中央値と 90 パーセンタイル、手戻りの回数と率、Owner の手、誤って止めた回数）
  - 半分の判定と、切り替えの目安
  - 「誤って止めた」分類の形（`sds-gate-fail-classification/1`）と、その読取り
  - #49 の Owner の決定のうち、この intent を指す物の収集
- **境目**: MetricsCore（純粋な計算）と MetricsCollector（GitHub の読取り）。監査の返却と PR の block は、門の部品の読み方を使う（ADR-009）。
- **動かし方**: CLI。W2 の道具（この Mac で 04:30・18:00）が呼び、出力を #53 に載せる。W2 の道具の側の変更は iyasaka-arc の担当（ADR-003）。
- **注意と制約**: 監査の席が分類を書き始めるのは、分類の役の Owner の決定を #49 に記録した後（FR5.4）。監査の skill に、分類の書き方を足す。

## U3 u3-approval-records — 記録の橋と承認の記録

- **中身**:
  - 承認の記録の形の確定（`本人確認: なし` の印、元の承認の出来事の digest）
  - AI-DLC の audit から承認の記録を作る CLI（ApprovalRecordWriter）
  - 記録の橋（RecordBridge）による、無い・壊れている記録の FAIL と、ほかの形の「承認」を読まないこと
- **境目**: 記録の橋は形と在りかだけを見て、本人の承認かは見ない。
- **注意と制約**:
  - 承認の記録の形は、門が記録を読む橋の設計（R3、独立監査）で確定する（iyasaka-arc#49 6315688299）。
  - AI-DLC の版を上げる時は、audit の形の確かめが要る（ADR-005）。

## U4 u4-gate-judgements — 門の判定の追加と shirube 自身への適用

- **中身**:
  - 判定 5（DesignBinding）を広げ、PR の変更 path が設計の記録に書いた置き場の中かを見る（FR6）。
  - 門の各判定の段階（記録だけ・止める）を pin の mode に揃える。
  - PR の雛形に、AI-DLC の記録と直す元の PR の欄を足す（KitCli）。
  - 配布先の一覧（`docs/sds/consumers.json`）に shirube を足す。
  - shirube 自身への適用の仕上げ（S1-SH-06。門の呼出しと pin は U1 で入れる）。
- **境目**: 意味のずれは門で見ない（独立監査の I7）。
- **注意と制約**: U4 は保護面に触れない（shirube の保護面の変更は U1 の 1 回にまとめた。Delivery Planning の Q8、この段の中で直した）。止める形への切り替えは、目安（FR7.2）を満たした後に、Owner が 1 回にまとめて決める。

## U5 u5-plan-admission — 「Inception が先」

- **中身**: 既存の計画の受付（PlanAdmission）に、今の段の済みの条件を Owner が採択した記録への参照の検査を足す。参照の無い道筋を BLOCK にする（FR2.3、ADR-007）。
- **境目**: 受付は形と参照の在りかだけを見る。
- **注意と制約**: 受付は判定 4 にまだつながっていない。つなぐかは、この取り組みでは変えない。

## U6 u6-dist-aun — aun への配布

- **中身**:
  - 配布キットの apply で、aun に Shirube の版（U4 までの部品と pin）を入れる。
  - 配布先の一覧に aun を足す。
  - kit check が OK になることを確かめる。
- **注意と制約**:
  - 最初の導入は Owner の exact-head が要る。
  - 門は記録だけで始め、止める形への切り替えは目安を満たした後に Owner が決める。
  - 完了の条件 S1-SH-04（AUN の実 PR が門を通って統合される）は、この Unit の後に観測する。

## U7 u7-dist-onza — onza への配布

- **中身**: 配布キットの apply で、onza に Shirube の版を入れる。配布先の一覧に onza を足す。kit check が OK になることを確かめる。
- **注意と制約**:
  - 作るのは Onza の席。
  - 最初の導入は Owner の exact-head が要る。
  - Onza は完了の条件の確かめ方には入らない（範囲の定義）。
