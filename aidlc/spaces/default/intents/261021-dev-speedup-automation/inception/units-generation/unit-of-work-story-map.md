# 物語と Unit の対応（Unit of Work Story Map）

出典: 物語（`inception/user-stories/stories.md`）、`unit-of-work.md`、この段の答え（`units-generation-questions.md`）。

各行の Unit は、その物語の一部を作る Unit です。その Unit の Functional Design では、行の物語の受入の条件をすべて辿ります。

## 対応表

| 物語 | Unit ID | Directory |
|------|---------|-----------|
| US1.1 | U2 | u2-metrics |
| US1.2 | U1; U2 | u1-skeleton; u2-metrics |
| US1.3 | U2 | u2-metrics |
| US1.4 | U2 | u2-metrics |
| US1.5 | U2 | u2-metrics |
| US1.6 | U2 | u2-metrics |
| US1.7 | U2 | u2-metrics |
| US2.1 | U1; U4 | u1-skeleton; u4-gate-judgements |
| US2.2 | U1; U3 | u1-skeleton; u3-approval-records |
| US2.3 | U5 | u5-plan-admission |
| US2.4 | U4; U6 | u4-gate-judgements; u6-dist-aun |
| US2.5 | U4 | u4-gate-judgements |
| US2.6 | U4 | u4-gate-judgements |
| US2.7 | U4 | u4-gate-judgements |
| US2.8 | U4 | u4-gate-judgements |
| US3.1 | U4; U6; U7 | u4-gate-judgements; u6-dist-aun; u7-dist-onza |
| US3.2 | U6; U7 | u6-dist-aun; u7-dist-onza |

対応表（`traceability.json`）には、複数の Unit にまたがる物語について、その物語を仕上げる Unit を 1 つだけ書きます（検査が 1 行に Unit を 1 つだけ読むため）。上の表は、作る Unit をすべて並べたものです。

## 複数の Unit にまたがる物語

| 物語 | 分け方 |
|------|--------|
| US1.2 | U1 は計測が 1 行の JSON を出すところまで。U2 は 4 つの指標、#53 に載せる文、「一部」の表示 |
| US2.1 | U1 は block の AI-DLC の記録の欄と、門が結果を出すところ。U4 は PR の雛形の欄と、作者が block と label だけを書くことの確かめ |
| US2.2 | U1 は承認の記録 1 種類の読取り。U3 は形の確定と、壊れた記録・ほかの形の「承認」の扱い |
| US2.4 | U4 は shirube での監査なしの PR の FAIL と、止める形の時に統合できないこと。U6 は aun での同じ確かめ（S1-SH-01 は Shirube と AUN） |
| US3.1 | U4 は shirube 自身と配布先の一覧。U6 は aun、U7 は onza |

## Unit の中での順

- U1: 試験（負例を先）→ PR の block の欄 → 記録の橋の最小の形 → 承認の記録の最小の形 → 門への組込み → 計測の最小の形
- U2: 試験 → 今の値の固定 → 時間と手戻り → Owner の手 → 分類の形と読取り → 半分の判定と切り替えの目安 → #53 に載せる文
- U3: 試験 → 承認の記録の形 → 作り手の CLI → 記録の橋の FAIL の扱い
- U4: 試験 → 判定 5 の置き場の検査 → 判定の段階 → PR の雛形の欄と配布先の一覧 → shirube 自身への適用
- U5: 試験 → 採択の参照の検査
- U6・U7: 配布キットの apply → 配布先の一覧 → kit check

## 抜けの確かめ

- 物語 17 本すべてに、1 つ以上の Unit がある。
- Unit 7 つすべてに、1 つ以上の物語がある（U1: US1.2・US2.1・US2.2、U2: US1.1〜US1.7、U3: US2.2、U4: US2.1・US2.4〜US2.8・US3.1、U5: US2.3、U6: US2.4・US3.1・US3.2、U7: US3.1・US3.2）。
