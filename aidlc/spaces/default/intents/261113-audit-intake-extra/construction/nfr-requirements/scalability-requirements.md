**Collaborator:** aidlc-architect-agent

# 拡張の要件（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file。受付は負荷に応じて増える service ではない。ここで扱う「大きさ」は、1 回の依頼が持つ宣言の件数・対象の数と、受付の file の行数の増え方である。

## 上流

- requirements: `aidlc/spaces/default/intents/261113-audit-intake-extra/inception/requirements-analysis/requirements.md`（NFR4・NFR5、FR1.5）。
- functional-design: `aidlc/spaces/default/intents/261113-audit-intake-extra/construction/functional-design/functional-spec.md` §7。

## 要件

| ID | 要件 | 測り方 |
|---|---|---|
| NFR5.7 | 宣言の件数は 1 つの対象で 4 件まで（FR1.5）。この上限の値の持ち主は実装の 1 つの定数だけ（NFR7.1）。上限を上げる変更は、この取り組みの外の別の判断（問い合わせの総数と、監査席が 1 件ずつ見る負担に関わる） | 5 件目が拒否になる負例。定数が 1 か所にだけあること |
| NFR5.8 | 足す問い合わせの総数は、対象の数 T に線形（受付 4 × T、返却の確認 8 × T）。T に新しい上限を足さない（今の仕様のまま）。1 つの依頼が持つ対象の数と宣言の件数が、人の手で書ける大きさ（1〜数件）であることを前提とし、前提を超える大きさの依頼の性能は保証しない | 性能の要件 NFR5.2 の合計の試験が、上限ちょうどで通ること |
| NFR4.4 | 受付の file の行数の増え方に上限を置く。`audit-admission.mjs` は基準の版の 180 行から、足す判定の分（見込み 60〜90 行）を含めて **300 行以下**。超えそうなら、宣言の検査と commit の分類を小さい関数に分けて収め、判定を別の file に出さない（NFR9.2） | 最終の行数を `wc -l` で数えて記録に書く（申告ではなく測った値） |
| NFR4.5 | 将来の追加（宣言の repo の許可の一覧、宣言の中身を照らす形など）は、この file の 300 行の枠の中では足さない。足す時は別の取り組みで、判定を 1 file に収める制約（NFR9.2）と行数の上限を再び設計する | 要件の「対象外」に記録済み。この取り組みでは試験しない |

## 対象外

- 並行する依頼の数、受付の同時起動（起動のたびに独立した 1 回の処理で、共有する状態を持たない）。
- 保存する値の増え方（受付は何も保存しない。DB に触れない）。
