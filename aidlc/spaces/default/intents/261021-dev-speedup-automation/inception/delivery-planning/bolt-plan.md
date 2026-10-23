# 作る順番の計画（Bolt Plan）

出典:
- 要件: `inception/requirements-analysis/requirements.md`
- 物語: `inception/user-stories/stories.md`
- 部品: `inception/domain-design/components.md`
- Unit: `inception/units-generation/unit-of-work.md`・`unit-of-work-dependency.md`・`unit-of-work-story-map.md`
- 受け渡しの形: `inception/contract-design/contract-summary.md`
- 進め方: `inception/practices-discovery/team-practices.md`
- この段の答え: `delivery-planning-questions.md`（Q1〜Q8）

Bolt は、作る 1 回分の単位です。1 つの Bolt が終わると、動く物ができます。ここでは 1 つの Bolt = 1 つの Unit です（Q3）。

## 進め方の前提（チームの決まり）

- **統合**: 席ごとの branch から PR を出し、merge commit で main に統合する。統合は作者と別の席（suite-lead）が、監査 PASS の後に行う（`team-practices.md` の Way of Working）。
- **最初の版**: 最初の Bolt は端から端まで通る細い版（walking skeleton）。部品がつながって最後まで動くことを、機能を足す前に確かめる最小の版。
- **試験**: 試験が先（tdd）。行の網羅率 80% を床にし、統合の前に CI で確かめる（iyasaka-arc#49 6336689921）。
- **展開**: 本番は無い。配布先は shirube の commit を固定して呼ぶ。
- **作る席**: shirube の Bolt（B1〜B5）は同じ shirube の実装の席が作るので、順に進める。B6・B7 は別の席なので並べて進められる。

## Bolt の並び

| 順 | Bolt | Unit | 細い版 | 待つ Bolt | 作る席 |
|----|------|------|--------|-----------|--------|
| 1 | B1 | U1 u1-skeleton | ✓ | — | shirube の実装の席 |
| 2 | B2 | U2 u2-metrics | — | B1 | shirube の実装の席 |
| 3 | B3 | U3 u3-approval-records | — | B1 | shirube の実装の席 |
| 4 | B4 | U4 u4-gate-judgements | — | B1・B3 | shirube の実装の席 |
| 随時 | B5 | U5 u5-plan-admission | — | B1 の後（依存は無い） | shirube の実装の席 |
| 5 | B6 | U6 u6-dist-aun | — | B4 | aun の実装の席 |
| 5 | B7 | U7 u7-dist-onza | — | B4 | Onza の席 |

- B5 は、B1 の後、shirube の席が監査や Owner の決定を待っている間に入れる（Q1）。同じ席に 2 つの Bolt を同時に渡さない。
- この表は計画です。Construction で実際に作る順は、Unit の依存（`unit-of-work-dependency.md`）から決まり、最初は U1 です。

## B1 U1 u1-skeleton — 端から端まで通る細い版

- **中身**:
  - PR の block の AI-DLC の記録の欄
  - 記録の橋（承認の記録 1 種類、記録だけ）
  - 承認の記録の作り手の最小の形
  - 門の status
  - 計測が status と log を数えて出すところ
  - shirube の門の呼出しの workflow と pin（記録だけ）（Q8）
- **済みの条件**:
  - 試験が先にあり（失敗を確かめてから実装）、統合の前の CI で行の網羅率が 80% 以上。
  - shirube の保護面の PR（門の呼出し・pin・網羅率の CI）を、Owner の exact-head 1 回で統合した。監査の席の分類の役の決定（FR5.4）も、この 1 回にまとめて記録した。
  - shirube の実際の PR 1 本が AI-DLC の記録の欄を持ち、門が記録だけで判定し、承認の記録を読み、commit status と log の 1 行の JSON（`sds-gate-result/1`）を出した。
  - 計測がその status と log を読み、PASS と FAIL を数えた 1 行の JSON（`sds-metrics/1` の最小の形）を出した。
  - 門は統合を止めていない。
- **確かめること**: workflow → commit status → log → 計測の読取りが、実際の GitHub の上でつながる。記録だけの門は、正しい PR を止めない。
- **見せる物**: 実際の PR の門の log の 1 行の JSON と、計測の出力（Q7）。
- **実際に通す確かめ**: 門の workflow が、その PR の head で `sds-gate` の status を付け、計測の CLI がその PR を数えに入れること。

## B2 U2 u2-metrics — 計測の全体

- **中身**:
  - 今の値の固定（9/21〜10/20 の 101 件の番号の一覧）
  - 4 つの指標
  - 半分の判定と、切り替えの目安
  - 「誤って止めた」分類の形と読取り
  - Owner の手の収集
- **済みの条件**:
  - 今の値の PR の番号の一覧と値が固定され、同じ入力から同じ bytes が出る。
  - 4 つの指標と判定が、物語 US1.1〜US1.7 の受入の条件を満たす。
  - W2 の道具の担当（iyasaka-arc）に、受け渡しの形 C4 を渡した。
  - 全体の own-code の見積もりを出し、超えるなら Owner に予算の改めを 1 回伺った（Units Generation の Q5）。
- **確かめること**: 今の値を、GitHub の記録だけから同じ物差しで測れる。門で止め始める前に、今の値がそろう（実現性の条件 C3）。
- **見せる物**: 今の値を含む `sds-metrics/1` の出力と、#53 に載せる文。

## B3 U3 u3-approval-records — 記録の橋と承認の記録

- **中身**:
  - 承認の記録の形（`sds-approval-record/1`）の確定
  - 作り手の CLI
  - 記録の橋の FAIL の扱い（無い・壊れている・ほかの形）
- **済みの条件**:
  - この intent の AI-DLC の audit の承認から、同じ bytes の承認の記録を作れる。
  - 記録の橋が、無い・壊れている記録を FAIL にし、ほかの形の「承認」を読まない。
  - 承認の記録の置き場が保護面の外（`approvals/...`）。
- **確かめること**: AI-DLC の承認を、決まった形に機械で写せる。
- **見せる物**: この intent の承認から作った承認の記録と、門がそれを受け入れる様子。

## B4 U4 u4-gate-judgements — 門の判定の追加

- **中身**:
  - 判定 5 の置き場の検査（`sds-design-locations/1`）
  - 判定の段階
  - PR の雛形の欄
  - 配布先の一覧に shirube を足す
  - shirube 自身への適用の仕上げ
  - 保護面には触れない（Q8）
- **済みの条件**:
  - 設計に書いた置き場の外を変えた PR が、記録だけの段で FAIL として記録される。
  - 受け渡しの形の未決の問い C7 を設計で決め、決めたとおりに動く（packaging の Unit と、Unit を指さない PR の扱い）。
  - shirube の PR の門の status が残る（S1-SH-06）。
- **確かめること**: 置き場の検査が、正しい PR を止めない。
- **見せる物**: 置き場の外を変えた試しの PR の FAIL の記録と、正しい PR の PASS。

## B5 U5 u5-plan-admission — 「Inception が先」

- **中身**: 計画の受付に、今の段の採択の参照（`stage_adoption_ref`）の検査を足す。
- **済みの条件**: 採択の参照の無い道筋が受け付けられない負例の記録が残る（S1-SH-03）。受け渡しの形の未決の問い C6（ai-dev-framework との等価の試験の扱い）を決めた。
- **確かめること**: Inception を飛ばした道筋を、Unit を置く前に止められる。
- **見せる物**: 負例の道筋の BLOCK と、正しい道筋の PASS。

## B6 U6 u6-dist-aun — aun への配布

- **中身**:
  - 配布キットの apply（B4 の後の shirube の commit に固定、記録だけ）
  - 配布先の一覧に aun を足す
  - aun の保護面の変更（最初の導入・網羅率の CI）を 1 本の PR にまとめる
- **済みの条件**: aun の保護面の PR を Owner の exact-head 1 回で統合した。aun で kit check が OK。aun の実際の PR が門を通る。
- **確かめること**: 配布キットで、別の repo でも同じ門が効く。
- **見せる物**: aun の PR の門の status と、計測の出力の aun の行。

## B7 U7 u7-dist-onza — onza への配布

- **中身**: B6 と同じ形を onza に入れる（Onza の席）。
- **済みの条件**: onza の保護面の PR を Owner の exact-head 1 回で統合した。onza で kit check が OK。
- **確かめること**: 3 つ目の repo でも同じ形で入る。
- **見せる物**: onza の PR の門の status。

## Bolt の後: 止める形への切り替えと S1 の済みの確かめ

- 記録だけの期間に、shirube と aun で実際の PR がそれぞれ 10 件以上門を通り、門の不備が 0 になったら、arc が Owner に切り替えを 1 回にまとめて伺う（Q4、FR7.2）。
- 切り替えの後、完了の条件 S1-SH-01〜07 を、実際の記録で確かめる。
  - 監査なしの PR の負例
  - 道筋の外の PR の負例
  - 採択の無い道筋の負例
  - AUN の実際の PR の統合
  - 作者の diff
  - shirube の status
  - Owner の手の数

## Owner の手の予定（1 周 5 回、上限 6 回）

| # | いつ | 何 |
|---|------|----|
| 1 | B1 | shirube の保護面の exact-head（門の呼出し・pin・網羅率の CI・分類の役の決定をまとめる） |
| 2 | B2 の見積もりの後（超える時だけ） | own-code の予算の改め |
| 3 | B6 | aun の保護面の exact-head（最初の導入・網羅率の CI） |
| 4 | B7 | onza の保護面の exact-head（最初の導入・網羅率の CI） |
| 5 | Bolt の後 | 門を止める形への切り替え（shirube と aun をまとめて） |

AI-DLC の会話での段の承認と要約の確認は、この 5 回に数えません（要件 FR1.6）。
