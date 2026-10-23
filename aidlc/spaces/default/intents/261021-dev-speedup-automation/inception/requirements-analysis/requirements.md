# 要件（Requirements）: 開発の高効率化・自動化による高速開発化

出典の書き方:
- `[IS]` = `ideation/intent-capture/intent-statement.md`
- `[SD]` = `ideation/scope-definition/scope-document.md`（IN-n・OUT-n・S1-SH-nn）
- `[IB]` = `ideation/scope-definition/intent-backlog.md`
- `[FE]` = `ideation/feasibility/feasibility-assessment.md`（条件 C1〜C4）
- `[CR]` = `ideation/feasibility/constraint-register.md`
- `[TP]` = `inception/practices-discovery/team-practices.md`
- `[CK]` = `aidlc/spaces/default/codekb/shirube/` の business-overview.md・architecture.md・code-structure.md
- `[RE]` = `inception/reverse-engineering/developer-scan.md`
- `[RA-Qn]` = この段の `requirements-analysis-questions.md` の答え
- `[#49 n]` = iyasaka-arc#49 の Owner の決定の comment の id

## 参照した入力

- 意図の記録 `intent-statement.md`: 目的、前提、成功の指標、やらないこと。
- 範囲の定義 `scope-document.md`: 範囲に入るもの IN-1〜IN-10、入らないもの OUT-1〜OUT-10、完了の条件 S1-SH-01〜07。
- バックログ `intent-backlog.md`、実現性の評価 `feasibility-assessment.md`、制約の一覧 `constraint-register.md`。
- チームの進め方 `team-practices.md`（試験は tdd、行の網羅率 80% を床にし統合の前に CI で確かめる、own-code の上限、fail closed）。網羅率は Owner の決定（iyasaka-arc#49 6336689921）で直した。
- コードの読み解き: codekb の business-overview.md・architecture.md・code-structure.md と、developer-scan.md の「すでにあるもの・まだ無いもの」。
- Owner の決定:
  - S1 の済みの条件 [#49 6305753673]・[#49 6306226221]
  - 承認の記録の形を先に固定する [#49 6315688299]
  - AI-DLC の内包 [#49 6309035411]
  - 導入と開始の明示の宣言 [#49 6308731943]
  - 最初に試す場所 [#49 6328896533]・[#49 6329622282]
  - 設計もこの会話で進める [#49 6329978835]
  - 指標は自社が管理できる範囲 [#49 6329643565]

## 意図の分析

- **目的**: 社内のすべての製品の開発を速くする。最初の版で先に解くのは、設計と実装のずれや工程の飛ばしによる手戻りである。 [IS]
- **Shirube の形**: AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る。 [IS][#49 6309035411]
- **完成形**: AI-DLC の各段階の出力が記録として残り、次の段階は、前の段階の出力への参照が無いと始まらない。これを全 repo で機械が保証する。作者が書くのは PR の数行だけ。最初の版は、この完成形を Shirube・AUN・Onza で、S1 の済みの条件まで進める。 [SD][#49 6305753673]
- **一番得をする人**: Owner。人が追いかけずに済み、判断と承認だけに集中できるようになる。 [IS]
- **依頼の性質**:
  - 種類: 既存の門の拡張と、計測の新設（brownfield）。
  - 範囲: 3 repo にまたがる複数の部品（門・配布キット・計測）。
  - 複雑さ: standard。この段の深さは Standard。

## すでにあるもの・まだ無いもの

| 範囲 | すでにあるもの（コード） | まだ無いもの | 出典 |
|------|------------------------|--------------|------|
| 監査なしの PR を止める（IN-3） | 判定 3（`scripts/sds/gate.mjs`、`scripts/hygiene/audit-admission.mjs`） | 統合を止める設定（ruleset と必須検査。保護面） | [RE][CK] |
| 道筋に無い作業を止める（IN-4） | 判定 4（`scripts/sds/plan-binding.mjs`、既定は記録だけ）と、今の段の外を変えさせない 4.18（`stage.mjs`） | 止める形への切り替え（pin の mode。保護面） | [RE] |
| 工程の飛ばしを止める・Inception が先（IN-2・IN-5） | 計画の受付（`plan-admission.mjs`） | 門が AI-DLC の記録を読む橋（設計 v4 §5 は境界だけ） | [RE][#49 6315688299] |
| 設計と実装のずれ（IN-6） | 判定 5（設計の版への結び、`design-gate.mjs`） | 変更の path が設計の置き場の中かの検査 | [RE] |
| 計測（IN-1） | PR ごとの JSON と commit status だけ | 4 つの指標の集計 | [RE][CK] |
| 誤って止めた件（IN-7） | — | 判定と記録の形 | [RE] |
| 配布（IN-10） | 配布キット（apply・upgrade・check・status） | 配布先の一覧（`docs/sds/consumers.json`）に shirube・aun・onza が無い | [RE] |

## 機能要件（Functional Requirements）

### FR1 計測（IN-1、IB-1）

- **FR1.1** 統合された PR ごとに、「PR を開いてから統合まで」の時間を測る。今の値と判定の期間の両方で、この定義を使う。 [IS][RA-Q9]
- **FR1.2** AI-DLC の意図の記録を指す PR については、「意図の記録の開始から統合まで」の時間も別に測って載せる。半分の判定には使わない。 [RA-Q9]
- **FR1.3** 時間は、中央値と 90 パーセンタイルの両方を載せる。半分の判定は中央値で行う。 [RA-Q10]
- **FR1.4** 手戻りとして、次の 3 種類を数える。AI-DLC の段の Request Changes は数えない。 [RA-Q4]
  - 独立監査の返却（`sds-audit-review/1`）が BLOCK だった回数
  - 門（sds-gate）が FAIL を出した後に、直しの push があった回数
  - 統合の後に、その変更を直す PR や戻す PR（fix・revert）が出た回数
- **FR1.5** 手戻りは、回数と、統合された PR 1 件あたりの率の両方を載せる。半分の判定は率で行う。 [RA-Q11]
- **FR1.6** 1 周（この最初の版 S1 を作り終えるまで）の間の Owner の手を数え、1 件ごとに URL を並べる。上限は 6 回。 [RA-Q1][SD S1-SH-07]
  - 数えるもの: #49 の決定・exact-head・保護面の設定・指示ボードのカード。
  - AI-DLC の会話での段の承認と要約の確認は 6 回に数えず、回数だけ別に載せる。
- **FR1.7** 誤って止めた回数 = FR5 の記録で「門の不備」と分類された FAIL の数。目標は 0。 [IS][RA-Q6]
- **FR1.8** 今の値は、次の PR から FR1.1・FR1.3〜FR1.5 の定義で 1 回だけ測る。対象にした PR の番号の一覧を結果と一緒に残し、同じ一覧から何度でも同じ値を出せるようにする。 [RA-Q2]
  - 対象: 2026-09-21〜2026-10-20（日本時間）に統合された shirube・aun・onza の PR。2026-10-22 時点で 101 件。
- **FR1.9** 半分の判定は、S1 の済みの条件を満たした後の 30 日に統合された PR で測る。次の 2 つを満たせば達成とする。 [IS][RA-Q3]
  - 時間の中央値が、今の値の中央値の 50% 以下
  - 手戻りの率が、今の値の率の 50% 以下
- **FR1.10** 測る script は shirube に置く。結果は、既存の W2 の報告（iyasaka-arc#53。この Mac で 04:30 と 18:00 に測って置き換える）に 4 つの指標として足す。 [RA-Q5]

受入の条件:
- Given 期間の中に統合された PR が 3 件あり、時間が 1 時間・2 時間・30 時間、When 計測を動かす、Then 中央値は 2 時間で、90 パーセンタイルも並べて載る。
- Given 期間の中に統合された PR が 0 件、When 計測を動かす、Then 時間と率は「n/a（PR 0 件）」と載り、0 や成功としては載らない。
- Given 3 repo のうち 1 つの読取りに失敗した、When 計測を動かす、Then 読めた repo の値と「aun は観測できず」が載り、合計は「一部」と示される。
- Given 同じ PR の一覧と同じ時刻の引数、When 計測を 2 回動かす、Then 出力は同じ bytes になる。

### FR2 工程の飛ばしを止める門と「Inception が先」（IN-2・IN-5、S1-SH-03）

- **FR2.1** PR の機械向けの block（`json sds-pr`）が、AI-DLC の記録（intent と段）を指す。門は、指された段の前の段の出力が承認済みであることを、記録の形で確かめる。無い・読めない・壊れている時は FAIL にする（最初は記録だけ）。 [SD][#49 6309035411]
- **FR2.2** 門が「承認」として読むのは、Shirube が GitHub に公開する承認の記録の 1 種類だけにする。 [#49 6315688299]
  - S1 では、この記録は本人確認なしで作り、`本人確認: なし` の印を付ける。
  - 形は、門が記録を読む橋の設計で決める。
- **FR2.3** 今の段の済みの条件を Owner が採択していない製品では、道筋（delivery plan）に Unit を置けない。採択の参照の無い道筋は、計画の受付が拒む。 [SD S1-SH-03]
- **FR2.4** 門は止めるだけで、自分から段や作業を始めない。導入は `/aidlc-init` で、開始は intent の開始で、それぞれ明示の宣言だけで行う。 [#49 6308731943]

受入の条件:
- Given 前の段が承認済みの記録を指す PR、When 門が動く、Then FR2 の判定は PASS。
- Given 前の段の承認の記録が無い PR、When 門が動く、Then FR2 の判定は FAIL で、足りない記録の名前が出る。
- Given 採択の参照の無い道筋、When 計画の受付にかける、Then 受け付けられない（負例の記録が残る）。

### FR3 監査なしの PR は統合できない（IN-3、S1-SH-01）

- **FR3.1** R2 以上の PR に、今の head に対する監査の受領が無い時、門は FAIL を出す（判定 3）。 [SD][RE]
- **FR3.2** 統合の押し込みもできない。止めるのは各 repo の ruleset と必須検査で、Shirube と AUN でそれぞれ Owner の決定を通す。 [SD S1-SH-01][CR CO-1]

受入の条件:
- Given 監査の依頼も返却も無い R2 の PR、When 門が動く、Then FAIL。止める形の repo では統合できなかった記録が残る。
- Given 監査が古い head に対するもので、新しい push があった PR、When 門が動く、Then FAIL。

### FR4 道筋に無い作業は統合できない（IN-4、S1-SH-02）

- **FR4.1** 道筋の Unit を名指さない PR と、作業指示の「触ってよい範囲」の外を変えた PR に、門は FAIL を出す（判定 4）。 [SD][RE]

受入の条件:
- Given 道筋の Unit を指さない PR、When 門が動く、Then 判定 4 は FAIL。
- Given 触ってよい範囲の中だけを変えた PR、When 門が動く、Then 判定 4 は PASS。

### FR5 誤って止めた件の判定と記録（IN-7、S1-SH-04）

- **FR5.1** 門が FAIL を出した PR ごとに（記録だけの期間を含む）、独立監査の席（devauditor）が「門の不備」か「PR の不備」かを判定し、決まった形で PR に書く。Owner の手は使わない。 [RA-Q6]
- **FR5.2** 記録の形は機械で読める形にし、FR1.7 はそこから数える。 [RA-Q6]
- **FR5.3** まだ分類されていない FAIL は「未分類」として件数を載せる。0 件としては数えない。 [TP]
- **FR5.4** 監査の席に分類の役を足すことを、Owner の決定として #49 に記録してから始める。 [RA-Q6]

受入の条件:
- Given 門が FAIL を出した PR、When devauditor が分類を書く、Then 計測にその分類が載る。
- Given 分類の無い FAIL、When 計測を動かす、Then 「未分類 1 件」と載り、誤って止めた回数 0 とは載らない。

### FR6 設計と実装のずれの検査（IN-6）

- **FR6.1** 機械は形だけを見る。どちらかに当たらない時は FAIL（最初は記録だけ）。 [RA-Q7]
  - PR が指す設計の記録が、AI-DLC で承認済みか。
  - PR の変更 path が、設計の記録に書いた置き場の中か。
- **FR6.2** 設計どおりの振る舞いかという意味のずれは、独立監査（監査の規格 v1 の実装監査 I7 設計適合）で見る。止める判定に LLM を使わない。 [RA-Q7]

受入の条件:
- Given 承認済みの設計を指し、設計に書いた置き場の中だけを変えた PR、When 門が動く、Then FR6 は PASS。
- Given 設計に書いていない置き場を変えた PR、When 門が動く、Then FR6 は FAIL で、外れた path が出る。

### FR7 記録だけから止める形への切り替え（MVP）

- **FR7.1** 門の各判定は、repo ごとに記録だけ（report-only）で始める。 [SD][FE C3]
- **FR7.2** 次の条件を満たしたら、arc が Owner に切り替えを伺う。計測には、その repo の件数と誤った FAIL の数を載せる。 [RA-Q8]
  - 記録だけの期間に、その repo で実際の PR が 10 件以上門を通った。
  - 誤った FAIL（FR5 の「門の不備」）が 0。
- **FR7.3** 切り替え（pin の mode、必須検査、ruleset）は、repo ごとの Owner の決定だけで行う。 [CR CO-1][FE C4]

受入の条件:
- Given 記録だけの期間に PR が 10 件通り、門の不備が 0、When 計測を動かす、Then 「切り替えを伺える」と示される。
- Given 門の不備が 1 件ある、When 計測を動かす、Then 「切り替えを伺える」とは示されない。

### FR8 Shirube の版の配布（IN-10）

- **FR8.1** shirube・aun・onza に、配布キットで Shirube の版を入れる。最初の導入は repo ごとに Owner の exact-head を通す。 [SD][#49 6308341298]
  - 配布先の一覧（`docs/sds/consumers.json`）に 3 repo を足す。
  - Onza は Onza の席が担う。
- **FR8.2** 各 repo で kit check が OK になる。版上げの PR は、決まり（#49 6308341298）のとおり、監査 PASS の後に各 repo の統合担当が統合する。 [TP]

受入の条件:
- Given 導入を終えた repo、When kit check を動かす、Then OK。
- Given 配った file を手で書き換えた repo、When kit check を動かす、Then 一致しないと出る。

### FR9 作者の手間は増えない（IN-8、S1-SH-05）

- **FR9.1** 作者が書くのは、PR の機械向けの block の数行と risk の label 1 つだけ。道筋や作業指示を作者が直しに行かない。 [SD S1-SH-05]

受入の条件:
- Given 実際の PR、When diff と作者の席の記録を見る、Then 作者が書いたのは block と label だけである。

### FR10 Shirube 自身が門を通る（IN-9、S1-SH-06）

- **FR10.1** shirube の PR も sds-gate を通り、門の status が残る。 [SD S1-SH-06]

受入の条件:
- Given shirube の PR、When 統合する、Then その head に sds-gate の status がある。

## 非機能要件（Non-Functional Requirements）

| ID | 要件 | 確かめ方 | 出典 |
|----|------|----------|------|
| NFR1 | 失敗を隠さない。読めない・壊れている・形が違う時は FAIL か「観測できず」にし、PASS にしない（exit code 0 = PASS、1 = FAIL、2 = 観測できず） | 負例の入力で exit code 1・2 が出る試験 | [TP][CK] |
| NFR2 | 同じ入力からは同じ結果を出す。現在時刻は引数で渡し、判定と計測の核は自分で時計を読まない | 同じ入力で 2 回動かし、出力が同じ bytes | [TP] |
| NFR3 | GitHub への問い合わせには、1 回ごとの時間の上限と全体の予算を持つ。使い切ったら「観測できず」を返す | 応答しない API を模した試験で exit code 2 | [TP][CK] |
| NFR4 | 門は PR の head のコードを使わず、固定した shirube の commit から動く | 門の workflow の checkout の commit を確かめる試験 | [CK] |
| NFR5 | 実行時の npm 依存を足さない（Node ≥ 22 の組込みと、既存の gh・git・ruby だけ） | `package.json` の dependencies が空のまま | [TP] |
| NFR6 | own-code は 2,300 行以内に収める（今は約 1,938 行で、残り約 362 行）。超える時は Owner の決定を通す | own-code の予算の検査が PASS | [RE] |
| NFR7 | PR は追加 400 行・20 file まで。関数は 50 行・複雑さ 10 まで | hygiene の検査が PASS | [TP] |
| NFR8 | 試験が先（tdd）。判定ごとに正例と負例を置く。行の網羅率 80% を床にし、統合の前に CI で確かめる。Build and Test の段でも弱めない。測るのは Node 組込みの機能で、新しい依存は足さない。CI への組込みは保護面で、Owner の exact-head を通す | 試験の PR が実装の PR より先にあること、統合の前の CI で網羅率が 80% 以上であること | [TP][#49 6336689921] |
| NFR9 | 製品の個人情報に触れない。計測が読むのは、PR の時刻・label・監査の返却・commit status などの開発の記録だけ | 計測が読む API の一覧 | [CR CR-1] |
| NFR10 | 書込みは最小にする。門が書くのは commit status 1 つ、計測が書くのは #53 の W2 の報告の置き換えだけ | 書込みの API の一覧 | [CK][TP] |
| NFR11 | 計測の結果には、値・対象の PR の件数・期間・最後に測った時刻を並べる。一部の repo が読めない時は「一部」と示す | FR1 の受入の条件 | [RA-Q5] |
| NFR12 | 時刻は UTC の時点で持つ。期間の境目は日本時間の日で、始まりと終わりの両日を含む | 境目の時刻の PR を使う試験 | [RA-Q2] |
| NFR13 | 同じ head で門が 2 回動いても結果は同じ。計測が重なって 2 回動いても、#53 の報告は 1 つに置き換わる | 2 回動かす試験 | [TP] |

## 制約（Constraints）

- AI-DLC をそのまま使い、Shirube は門・配布・測定だけを作る。 [IS][CR CT-1]
- 仕組みを動かす場所は、GitHub（Actions）とこの Mac 上の席だけ。 [CR CT-2]
- 最初の版は AUN に頼らない（AUN は門をかける対象の repo ではあるが、受け渡しの道具としては使わない）。 [CR CT-4][SD]
- 新しい AI の席や、AI-DLC 以外の新しい外部ツールを入れない。 [CR CT-5]
- 必須検査・branch 保護・ruleset・pin・workflow の変更は、Owner の決定を通す。 [CR CO-1][FE C4]
- 人の承認そのものは無くさない（承認の手間だけを減らす）。 [CR CO-3]
- 時期で区切らず、完了の条件で区切る。 [CR CB-2]
- 評価の指標は、自社が管理できる範囲のものにする。 [#49 6329643565]
- 見張り: Owner の手は 1 周 6 回まで。正しい作業を誤って止めた回数は 0。 [CR CG-1・CG-2]
- 対象の repo は shirube・aun・onza。Kusabi・Tsumama は制御系が 1 周回ってから、OmotenasuAI は再開してから加える。 [SD][#49 6329622282]

## 仮定（Assumptions）

| ID | 仮定 | 理由 | 出典 |
|----|------|------|------|
| AS1 | 今の値の期間の PR には AI-DLC の記録が無く、起点は PR を開いた時点になる | AI-DLC を入れる決定は 10/21 | [FE][RA-Q9] |
| AS2 | 既存の W2 の測定（この Mac で 04:30 と 18:00）から、shirube の計測の script を呼べる | W2 の報告は動いている仕組み | [RA-Q5] |
| AS3 | fix の PR は、直す元の PR を機械で読める形で示す（revert の PR は GitHub が自動で書く）。形は設計で決め、作者の手間は block の数行に収まる | FR1.4 の 3 種類目を数えるのに要る | [RA-Q4] |
| AS4 | 各 repo の AI-DLC の記録は、PR で repo に入る（git に入れる物は設計 v4 §2 のとおり） | 門が読めるのは repo の中の記録 | [#49 6309035411] |
| AS5 | S1 では全席が同じ GitHub アカウントで投稿するため、承認の本人確認は機械で見ない（`本人確認: なし`）。偽装は独立監査と GitHub の履歴で見る | 本人確認の DB は外に配る前の段 | [#49 6315688299][CK] |
| AS6 | 今の値の件数（101 件）は 2026-10-22 時点。FR1.8 で番号の一覧を固定してから測る | 件数を後から動かさない | [RA-Q2] |

## 範囲に入らないもの（Out of scope）

- 範囲の定義の OUT-1〜OUT-10 のすべて（Suite 全体と OmotenasuAI への配布、Kusabi・Tsumama、手戻り以外の遅れの原因の改善、本番・保護面の自動化、新しい席や外部ツール、承認を無くすこと、AUN での受け渡し、個人情報、R3 以上の事前監査の抜けを機械で止めることと席の中で止めること）。 [SD]
- LLM による設計と実装の意味の一致の判定（記録だけの形も含む）。 [RA-Q7]
- AI-DLC の段の Request Changes を手戻りに数えること。 [RA-Q4]
- GitHub の「Request changes」のレビューを使うこと（全席が同じアカウントのため使えない）。 [RA-Q4]
- Shirube の DB と本人確認つきの承認（外に配る前の段）。 [#49 6315688299]
- AUN の旧 repo（agent-comms-mcp）の PR を今の値に含めること。 [RA-Q2]

## 未決の問い（Open Questions）

- 承認の記録の形（FR2.2）は、門が記録を読む橋の設計で決める。 [#49 6315688299]
- どの Owner の決定がこの 1 周に属するかの見分け方（FR1.6）は、設計で決める。決定の記録がこの intent か道筋を指す形が候補。
- fix の PR が直す元の PR を示す形（AS3）は、設計で決める。
- AI の利用料の上限は、設計の段で ARC が見込みを出してから Owner が決める。 [IB][FE]
- 新しいコードが own-code の残り（約 362 行）に収まるかは、設計で見積もる。超えるなら Owner の決定を通す（NFR6）。 [RE]
- 監査の席に分類の役を足す Owner の決定の記録（FR5.4）は、この段の承認の後に arc が #49 に書く。

## トレース（範囲と完了の条件への対応）

| 要件 | 範囲（`scope-document.md`） | 完了の条件 | 答え |
|------|----------------------------|------------|------|
| FR1 | IN-1 | S1-SH-04・S1-SH-07 の確かめ | RA-Q1〜Q5・Q9〜Q11 |
| FR2 | IN-2・IN-5 | S1-SH-03 | — |
| FR3 | IN-3 | S1-SH-01 | — |
| FR4 | IN-4 | S1-SH-02 | — |
| FR5 | IN-7 | S1-SH-04 | RA-Q6 |
| FR6 | IN-6 | — | RA-Q7 |
| FR7 | MVP（計測と門で止めるところまで） | S1-SH-01〜04 の「止める」 | RA-Q8 |
| FR8 | IN-10 | S1-SH-04（AUN の実 PR） | — |
| FR9 | IN-8 | S1-SH-05 | — |
| FR10 | IN-9 | S1-SH-06 | — |
