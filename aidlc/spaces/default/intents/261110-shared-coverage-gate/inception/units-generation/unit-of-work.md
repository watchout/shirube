# 共有の網羅率の門 — 作業の単位

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 部品: [components.md](../domain-design/components.md)、判断: [decisions.md](../domain-design/decisions.md)。要件: [requirements.md](../requirements-analysis/requirements.md)。ストーリー: [stories.md](../user-stories/stories.md)。
- この段の回答: [units-generation-questions.md](./units-generation-questions.md) の [Q1]〜[Q3] と分け方の計画の承認（すべて arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
- 範囲の順序: [scope-document.md](../../ideation/scope-definition/scope-document.md)。この段は並べる順を決めない（Delivery Planning が決める）。

## 分け方の方針

- **縦に切る**（[Q1] の A）。最初の本体の単位（U3）は、Node 組込みの形だけで、既定の閾値・3値の結果・期限と総予算・JSON と文面まで、command として端から端まで動く最小の版にする。以降の単位は、それに機能を足す。層ごとの単位は作らない。
- **S10 は 2 つの単位**（[Q2] の B）。Shirube 自身の ci の concurrency（U1）と、kit の門の起動の絞り（U2）。互いに依存しない。
- **再利用 workflow は最初の本体の単位に含めない**（[Q3] の A）。U7 で足し、その単位で Actions 上の接続を確かめる。
- 1単位 = 1 PR。前の単位の PR が統合されてから次の単位の Code Generation に入る（team.md）。Construction は serial。
- 各単位は自分の正例・負例の試験を持つ（TDD）。

## 単位の一覧

| Unit ID | Directory | 種類（kind） | 大きさ | 実装する部品 |
|---|---|---|---|---|
| U1 | u1-ci-concurrency | packaging | S | ShirubeCi（既存・変更） |
| U2 | u2-gate-trigger-narrowing | packaging | S | KitGateCaller（既存・変更） |
| U3 | u3-node-gate-slice | service | L | CoverageJudge（最小）、CoverageInputContract（最小）、MeasurementRunner、NodeBuiltinMeasurer、ResultReporter（最小）、CoverageGateCli |
| U4 | u4-thresholds-and-modes | service | M | CoverageJudge（閾値の例外・動作）、CoverageInputContract（例外・動作の検査）、ResultReporter（目立つ表示・記録だけの文面） |
| U5 | u5-exclusions | service | M | CoverageInputContract（除外の検査）、CoverageJudge（除外の扱い）、ResultReporter（除外の記録） |
| U6 | u6-typescript-vitest | library | M | TypeScriptVitestMeasurer、MeasurementDefinition |
| U7 | u7-gate-workflow-entry | packaging | M | CoverageGateWorkflow |
| U8 | u8-guide-and-verification | spec | M | （部品なし。手引き、九つの項目の架空の利用例での検証） |

種類の付け方は、U3〜U5 は CI で動く command を実行体とみなし `service`、U6 は単独で動かない測定の変換を `library`、U1・U2・U7 は workflow という配布・ビルドの物を `packaging`、U8 は文書と検証の試験を置く単位として `spec`。arc が案のとおりと確認した。

## 単位ごとの内容

### U1 u1-ci-concurrency

- **説明**: Shirube 自身の `ci.yml` に、同じ PR の古い実行を取り消す仕組みを置く（S10 の b）。既定の branch への push は取り消さない。
- **境界**: `.github/workflows/ci.yml` だけ。必須の検査の名前・数・内容、branch protection、試験の中身は変えない。
- **責務**: FR10.3、FR10.4。ストーリー US7.3、US7.4、US8.1。
- **配置の形**: 独立（Shirube の main に取り込む。配る物は無い）。
- **実装メモ**: 取り消し対象を PR の実行に限る負例（既定の branch の push が取り消されない）を、workflow の定義の試験で確かめる。保護対象のため、下の「保護対象の単位の進め方」に従う。

### U2 u2-gate-trigger-narrowing

- **説明**: kit の門の呼び出し（`kit/sds-gate-caller.yml`）の起動を、監査に関わるコメント（`sds-audit-request/1`、`sds-audit-review/1`、作者の受領）に絞る（S10 の a）。
- **境界**: `kit/sds-gate-caller.yml` と、それを検査する試験。`labeled`・`unlabeled` を外すかは、この単位の機能の設計で `scripts/sds/gate.mjs` を読み、risk ラベルが判定に効くかを確かめてから決める（FR10.2）。効くなら残し、Owner の決定の括弧書きは事実の誤りとして arc に伝える。
- **責務**: FR10.1、FR10.2、FR10.4。ストーリー US7.1、US7.2、US7.4、US8.1。
- **配置の形**: 独立。kit の版上げと利用先への導入は別の決定で、この単位の範囲外。
- **実装メモ**: ラベルを付け替える負例を試験で確かめる。保護対象のため、下の「保護対象の単位の進め方」に従う。

### U3 u3-node-gate-slice

- **説明**: 最初の本体。Node 組込みの形（`node --test` と組込みの網羅率）だけで、分母の宣言 → 測定 → 判定 → 出力が、command として端から端まで動く最小の版。
- **境界**: 判定は既定の閾値（行100%）と結果の3値、未計測・NOT_RUN・計測不能・閾値に満たない、の条件。入力の検査は分母の宣言と期限・総予算の形まで（除外・閾値の例外・動作の切り替えは U4・U5）。出力は決まった形の JSON と、notice・job summary の文面（GitHub への出力は U7）。
- **責務**: FR1.1、FR1.3、FR1.4、FR2.1〜FR2.3、FR3.1、FR4.1〜FR4.4、FR8.1〜FR8.4（最小）、NFR2〜NFR4、NFR7、NFR9。ストーリー US1.1、US1.3、US1.4、US2.1〜US2.4、US4.1、US6.1、US10.1、US10.2。
- **配置の形**: 独立（command として動く。利用先への配布は U7）。
- **実装メモ**: 子プロセスの行を数えられるかを実測し、数えられない組み合わせは使わない（Open Question 1）。Node 22 より新しい版を保証するかは実測で決める。LineRecord の形、理由コードの集合、閾値の既定は CoverageJudge だけが持つ（NFR3）。

### U4 u4-thresholds-and-modes

- **説明**: 閾値の例外と、動作（落とす・記録だけ）の切り替え。
- **境界**: 閾値の例外は、Owner の決定の URL の形・下げる値・根拠がそろっていることの確認までで、決定の実在の確認はしない（監査の仕事。FR3.3）。出力に URL・主張された値・根拠・実際の閾値を残し、100% より低く使った事実を目立つ位置に書く。動作は入力 1 つで切り替え、何も指定しなければ「落とす」。
- **責務**: FR3.2〜FR3.5、FR6.1〜FR6.4、FR8.4。ストーリー US4.2、US4.3、US5.1、US5.2、US6.2、US6.3（一部）。
- **配置の形**: U3 の上に積む（独立した配布は無い）。
- **実装メモ**: 「記録だけ」の間も、結果の区分と理由は成功と書かずに残す（ADR-004）。

### U5 u5-exclusions

- **説明**: 理由つきで 1 本ずつ名指しする除外と、DB を要する試験の扱いの選び方。
- **境界**: ディレクトリ名とワイルドカードは受け付けない。理由が無い除外は受け付けない。呼ぶ側の上書きで除外を広げられない。除外した file、理由、件数を出力に残す。DB を要する試験とその対象は、「DB の job で測る（分母に含める）」か「理由つきで除外」のどちらかを選べる。DB の job の PostgreSQL の版または指紋の固定は U7。
- **責務**: FR5.1〜FR5.4、FR8.4。ストーリー US3.1（一部）、US3.2、US3.3、US6.3（一部）。
- **配置の形**: U3 の上に積む。DB の構造は変えない。
- **実装メモ**: 新しい試験 file が除外にも流れた試験にも無ければ、必須の試験として NOT_RUN になる（US2.1 の AC2.1.5 は U3 の判定で受ける。除外の差分の見え方は U5）。

### U6 u6-typescript-vitest

- **説明**: TypeScript の ESM と vitest（`vitest run`、tsc でビルド）の形の測定と、測定の定義。
- **境界**: 何を測るか（ビルド後の JS か、source map 越しの TS か）の定義を設計で決め、出力に書く。測定の道具が新しい依存になる場合は、arc-sec の確認と Owner の決定を得るまで採用しない（FR1.6、NFR6）。得られなければこの単位は検証できず、Owner に伺う。
- **責務**: FR1.2、FR1.3、FR1.4、FR1.5、FR1.6。ストーリー US1.2、US1.3（TypeScript の形の分）、US8.2。
- **配置の形**: U3 の上に積む。他の単位を止めない。
- **実装メモ**: 道具の依存の確認が先。この確認は設計の記録とは別の、Owner の決定を伴う手順で、保護対象（新しい外の依存）として扱う。

### U7 u7-gate-workflow-entry

- **説明**: 利用先が commit を固定して呼ぶ再利用 workflow（`workflow_call`）。
- **境界**: 入力を門の入口へ渡し、job の権限を最小にし、出力値と成果物を返すだけ（ADR-006）。呼び出しが 40 桁の commit で固定されているかを、門の側で確かめられるかを設計で決める（Open Question 10）。通常の job と DB の job から同じ入力・出力で呼べる。PostgreSQL の版または指紋の固定。既存の呼び出し側を壊さない。先例は `hygiene.yml`。
- **責務**: FR5.5、FR7.1〜FR7.5、FR8.2、NFR5、NFR8。ストーリー US1.5、US2.3（GitHub への出力）、US2.4（出力値）、US3.1（DB の job）、US8.1、US10.3。
- **配置の形**: 利用先は commit を固定して呼ぶ。TypeScript の形の値は workflow を通すだけで、入力の検査は CoverageInputContract が行う（ADR-006）ので、U6 が後になっても workflow を変え直さない見込み。保護対象。
- **実装メモ**: 実際の配布前に、対象の版・差分・必要な判断・確認方法・戻し方を具体化する（team.md の Deployment）。

### U8 u8-guide-and-verification

- **説明**: 利用の手引きと、九つの項目の架空の利用例での検証。
- **境界**: 手引きは、commit を固定した呼び出しの例、記録だけから落とすへの切り替え、除外と閾値の例外の書き方、TypeScript の測定の定義の切り替えの意味を含む。検証は、九つの項目それぞれの正例と負例（中身を変えた入力が不一致または観測できずになること、予算超過が観測できずになること）。公開に載る物は架空の例だけにし、非公開の土台を写さない。導入件数は成功の数に入れない。
- **責務**: FR9.1、FR9.2、FR11.1〜FR11.3、NFR10。ストーリー US9.1〜US9.4。
- **配置の形**: 文書と試験。
- **実装メモ**: U6 が Owner の決定で止まっている間は、TypeScript の分を除いて書き、その事実を手引きに明記する（成功とは書かない）。

## 保護対象の単位の進め方

U1・U2・U7 は workflow の変更で保護対象。社内の決まり（aidlc-only §2、team.md の Way of Working、iyasaka-arc#49 6672241656 / 6755171825）に従う。

- 機能の設計から置き場の設計までを終えたら、**設計の記録だけの PR を先に出し、独立の設計監査（devauditor）を 1 回出す**。返却を待つ間も、Code Generation の計画と試験の手順は書いて承認を受けてよい。**code（workflow の変更）は設計監査の PASS の後に書く**。実装は同じ PR に足し、実装監査を受ける。
- arc が U1・U2 を名指しした（arc の答え）。U7 も同じ workflow の変更なので、この記録では U1・U2・U7 を同じ扱いにした。arc に確認する。
- 統合の前に、対象の head への Owner の承認が要る。段の承認は実行の許可ではない。
- U6 の新依存の採用は、arc-sec の確認と Owner の決定が先で、これは U6 の Code Generation に入る前の条件。

## 横断の注意

- 結果の JSON（ResultDocument）は U3 で最小の形を作り、U4・U5 で項目を足す。U7 が出力値として返す。項目と版の識別は、U3 の機能の設計で決める。
- 手引きの試験を要する受入条件（US1.2 の AC1.2.3、US1.5 の AC1.5.3、US3.1 の AC3.1.2）は、担当の単位が機能を作り、U8 の検証で手引きの試験を流す。

## Assumptions & Open Questions

### Assumptions

- [assumption] 並べる順（S10 最初を含む）は、範囲の文書の順序と arc の答えを入力として、Delivery Planning が決める。この段は決めない。
- [assumption] U3 を「最初の本体」の端から端まで動く最小の版（walking skeleton）とみなす。S10 の 2 つの単位は独立の小さな変更で、並べる順の中で最初に置かれても、U3 の位置づけは変わらない。順が確定した後に、最初の単位として何を実証するかを Delivery Planning で確かめる。
- [assumption] 配布の形は単位ごとに分けない（利用先は再利用 workflow を 1 つの commit で固定して呼ぶ）。
- [assumption] U5 の DB の試験の扱いは、判定側の除外の選び方までで、DB の構造は変えない。DB を要する試験の実行は呼ぶ側の DB の job が行う。

### Open Questions

1. 子プロセスの行を Node 組込みの網羅率が数えられるか（U3）。実測して決める。
2. 測定の道具の新しい依存（U6）の arc-sec の確認と Owner の決定。得られなければ U6 は検証できない。
3. 呼び出しが 40 桁の commit で固定されているかを、門の側で確かめられるか（U7）。
4. `labeled`・`unlabeled` のラベルが判定に効くか（U2）。
5. JSON の項目、版の識別、出力値の名前（U3）。
6. TypeScript の測定の定義、Node 22 より新しい版の保証（U3・U6）。
7. 記録の JSON を sds-gate や監査が読むところまでをこの取り組みに入れるか（要件の Open Questions 4）。入れる場合は範囲を広げる Owner の判断が要る。
