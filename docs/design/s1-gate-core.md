# Shirube S1 を品質の門の芯に絞る — 設計の記録

適用 ID: OD-SHIRUBE-S1-GATE-CORE-ONLY-AND-SECURITY-IN-S2-20261027-001（[#49 6430561109](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6430561109)、本文 SHA-256 `0d381d9ec3e4533a324d2bad24ac31d3d30be6380f04480b6463b4f076412ea0`。以下 [OD]）、OI-SHIRUBE-QUALITY-OVER-RECORDS-BUILD-ONLY-NEEDED-20261027-001（[#49 6430346631](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6430346631)、`c4729e90a7f1bd78c19ae87c8974f3af5a2e37a98c36a289211cb0849f084e25`。以下 [OI]）、OD-SHIRUBE-S1-DONE-CONDITIONS-AND-LEAD-HANDOFF-SCOPE-20261021-001（[#49 6305753673](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305753673)。以下 [DONE]）、OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（[#49 6336035707](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6336035707)。以下 [MEAS]）、OD-SHIRUBE-APPROVAL-RECORD-CONTRACT-FIRST-DB-LATER-20261021-001（[#49 6315688299](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6315688299)。以下 [REC]）。設計の作者 = arc。

## 1. 目的と対象外

Owner の言葉（[OI]）: 「とりあえず記録よりも品質維持だと思うんです。AI-DLCだけでは抜けてしまう穴を塞ぐこと、AI-DLCだけで開発が進むならshirubeを無理にすぐ作らなくてもいいです。ただそれだと成立しない気がするので、必要な部分を作って配布したいだけです」。

**目的**: S1 を、AI-DLC だけでは塞げない 2 つの穴を機械で塞ぐ門の芯に絞り、shirube と aun（S1-SH-04 の対象）に効かせる。
1. 監査を通っていない PR が統合できてしまう（S1-SH-01）。
2. 工程を飛ばした PR が進めてしまう: 道筋に無い作業（S1-SH-02）と、Inception の済みの条件を Owner が採択する前の作業（S1-SH-03）。

**対象外**（この記録では変えない）: S1 の完了の条件 S1-SH-01〜07 の文、門の判定 1〜5 の決まり、固定 checker、required checks と branch protection の中身、AI-DLC の engine と Guard Policy、S2 のセキュリティの制御の中身（[OD] の 3）、G1・G2 の設計（shirube#70）。

## 2. 穴と、使う物

| 穴（完了の条件） | 使う物 | 今の状態 | S1 ですること |
|---|---|---|---|
| 監査なしの統合（S1-SH-01） | 判定 1 risk_class・2 変更 path・3 監査の受領 | shirube では止める形（branch protection の必須、[#49 6389465250](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6389465250)）。CI での受領の読み直しの障害は G1（統合済み）と G2（shirube#71、Owner の exact-head 待ち）で直る | 新しい code は無い。aun に配る（§4 の 3） |
| 道筋に無い作業（S1-SH-02） | 判定 4 plan binding | 実装済み、shirube の pin で `report-only` | 新しい code は無い。aun に配る。止める形への切り替えは [MEAS] の目安（記録だけの期間に実際の PR 10 件以上・誤った FAIL 0）を満たした後に Owner が repo ごとに決める |
| Inception が先（S1-SH-03） | 計画の受付（`scripts/sds/plan-admission.mjs`） | 形と意味の検査はある。「今の段の済みの条件を Owner が採択した記録」への参照の検査は無い | U5 だけを作る: 道筋（`shirube-delivery-plan/v1`）が、その製品の Inception の済みの条件の採択を記録した Owner の決定（control source に公開された `shirube-owner-decision/v1` の comment、URL と本文 SHA-256）を指していなければ受け付けない |

**承認の根拠の置き場**: S1-SH-03 の「採択」の根拠は、AI-DLC の audit から作る承認の記録ではなく、control source に公開された Owner の決定の記録（`shirube-owner-decision/v1`）とする。これは権限の置き場の決まり（R1: 権限は control source に publish された決定だけ）と同じ置き場で、受付が確かめるのは記録の在りか・marker・本文 SHA-256 の一致だけ（本人確認は CF-AUTH-01 で後の版）。[REC] の「門が承認として読むのは Shirube が GitHub に公開する承認の記録の 1 種類だけ」は、S1 ではこの 1 種類を `shirube-owner-decision/v1` の記録と読む。**この読みは [REC] の文の解釈を含むので、aidlc-shirube の開き直し（§6）で Owner の確認を取る。**

## 3. 後の版へ回す物（S1 から外す）

| 物 | 元の置き場 | 扱い |
|---|---|---|
| 承認の記録の作り手（I1）・承認の記録の PR（A） | U1 / U3 | 後の版。shirube PR #67 は閉じる。PR #68（I1 の設計 v7、設計監査 round 6 PASS）は、shirube#70 §3.4 のとおり門の直しの最後の確かめに使って統合し、後の版の設計の記録として残す（S1 では作らない） |
| kit の自己用の書く先と `budget.mjs`（I2）・記録の橋と門の判定（I3）・計測（I4）・kit の版上げ（K） | U1 | 後の版。S1-SH-06（Shirube 自身が門を通る）は、shirube の main の branch protection と sds-gate の必須で既に満たしている |
| 計測の全体 | U2 | 後の版。S1-SH-04・05 の確かめは §5 のとおり既存の物で行う |
| 判定 5 を変更 path の包含まで広げる・PR の雛形の欄 | U4 | 後の版。判定 5 は今の形（`report-only`）のまま |
| onza への配布 | U7 | S1 の後（Onza は完了の条件の確かめ方に入らない = 範囲の定義） |

## 4. 作る順と PR

1. G2（shirube#71）の統合 → shirube#70（G1・G2 の設計の記録）の統合 → #68 の追従・確かめ・統合（shirube#70 §3.4 のまま。門が直った最後の証拠）。どれも [OD] の前に決まった手順のまま。
2. この記録の docs だけの PR（R1）の統合（1 の 3 本の後。それより先に main に入れない。#70 §3.3 の main を止める範囲を崩さないため）。
3. U5 の PR（R2、1 本、追加 400 行・20 file の中）: `plan-admission.mjs` に採択の参照の検査と、負例の試験（参照が無い・marker が違う・SHA-256 が合わない道筋を拒む）を足す。保護面には触れない。
4. aun への配布（U6）: 配布キットの apply で、aun に門と pin を入れる（判定 4・5 は `report-only`）。最初の導入なので Owner の exact-head（1 回）。
5. 判定 3 は aun でも必須にする設定、判定 4 の止める形への切り替えは、目安を満たした後に Owner が決める（設定 = S1-SH-07 の数に入る）。

## 5. 完了の条件の確かめ方（S1-SH-01〜07 は変えない）

- S1-SH-01: 負例 PR（R2・監査なし）が shirube と aun で FAIL し、merge できなかった記録。
- S1-SH-02: 負例 PR（道筋の node を名指さない・許可 path の外）の判定 4 の FAIL の記録。
- S1-SH-03: 採択の参照の無い道筋を受付が拒む負例の記録（U5 の試験と、aun の実の道筋での 1 回）。
- S1-SH-04: aun の実 PR 1 件以上が門を通って統合され、記録だけの期間の FAIL の分類（devauditor が PR ごとに書く、[MEAS]）で門の不備が 0。Shirube の計測の部品は作らない。
- S1-SH-05: 実 PR の diff と作者の席の記録（作者が書くのは PR の機械向けの block と label だけ）。数は W2 の測定（iyasaka-arc#53）で見る。
- S1-SH-06: shirube の PR の sds-gate の status と branch protection の読み戻し（既に満たしている）。
- S1-SH-07: 1 周の Owner の手（承認・exact-head・設定。AI-DLC の会話の承認と要約の確認は別に数える = [MEAS]）。上限は [MEAS] の 6 回。既に使った物: P1 の exact-head（10/24）・G1 の exact-head（10/26）。これからの見込み: G2 の exact-head・aun への導入の exact-head・必須と止める形の設定 1〜2・この記録の範囲の採択 1。合わせて 6〜7 回で、**上限を 1 回超えうる**。超える分は壊れた門の直し（G1・G2）から来るので、それを数えに入れるかを、開き直しの範囲の段で Owner に確かめる（数え方を黙って変えない）。

## 6. aidlc-shirube で開き直す段

S1 の作業の単位が 7 つから U1（済みの分）・U5・U6 に減り、範囲の「必ず入れるもの」のうち「今の値の計測」を Shirube の部品にしないので、範囲の段（Scope Definition）から開き直す。各段では、承認済みの答えを書き換えず、置き換える問いを足す（会話の学びのとおり）。問いは arc が質問ボードで噛み砕いて Owner に聞く（OD-AIDLC-QUESTIONS-ASKED-IN-PLAIN-DIALOGUE-NOT-DRAFTED-20261023-001）。§2 の [REC] の読みの確認は、要件の段の問いにする。

## 7. 採らなかった案

- **今の計画のまま（承認の記録の作り手を作る）**: 3 本目だけで実装の監査 4 回・設計の監査 6 回を使った（[OD] の前の流れ）。作り手は AI-DLC の engine が中で決めている判断を外から作り直す物で、端の場合が出るたびにやり直しになる。Owner が B を選ばなかった。
- **S1 にセキュリティの制御を入れる**: 守る基準（security-intel の基準 v0.1）がまだ無く、作り直しになる。Owner が [OD] の Q2 で S2 を選んだ。
- **S1-SH-03 を外す（Inception が先を機械で見ない）**: 「工程を飛ばした PR は進めない」が Owner の選んだ芯（[OD] の 1）なので外さない。U5 は S（小）で、新しい部品を作らずに今の受付に足すだけで済む。
- **計測の部品を S1 に残す**: Owner の「記録よりも品質維持」に合わない。S1-SH-04・05 は devauditor の分類と W2 で確かめられる。

## 8. 秘密・権限・復旧・予算

- 門の資格情報は今のまま（`github.token`、読むだけ）。U5 は control source の comment を GET で読むだけで、書込みをしない。PR の head の code を checkout も実行もしない（判定 4・5 と同じ）。
- 失敗を隠さない: 参照が読めない時は受付を FAIL にする（NOT_CHECKED にしない）。
- 戻し方: U5 は revert で戻せる。aun への導入は、使い始める前なら kit の file を消す PR で戻せる。
- 予算: own-code の上限 4,000 行（OD-SHIRUBE-OWN-CODE-BUDGET-4000-FOR-S1-20261024-001）の中。U5 の追加は 1 本 400 行の中。この記録は docs だけ。
