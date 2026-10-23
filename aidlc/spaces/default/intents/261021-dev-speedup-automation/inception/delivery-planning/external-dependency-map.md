# 外からの待ち（External Dependency Map）

出典: この段の答え（`delivery-planning-questions.md` の Q4・Q5）、受け渡しの形の未決の問い（`inception/contract-design/contract-summary.md`）、作る順番の計画（`bolt-plan.md`）。

Bolt は、作る 1 回分の単位です（1 つの Bolt = 1 つの Unit）。ここに並べるのは、この取り組みの外の担当や決定を待つ物です。

## 外の担当や決定を待つ物

| # | 待つ物 | 持ち主 | 待つ Bolt | 遅れた時の手当て |
|---|--------|--------|-----------|------------------|
| X1 | W2 の道具が計測を呼び、出力（`sds-metrics/1` の `report_markdown`）を #53 に載せる変更 | iyasaka-arc の担当（W2 の道具の持ち主） | B2 の結果を Owner が #53 で見るところ | 計測の CLI は単独で動くので、変更が入るまでは CLI の出力を GitHub に記録して読む。計測そのものは止めない |
| X2 | aun の実装の席が、配布の Bolt を受け持てること | aun の席（配車は suite-lead） | B6 | AUN 自身の作業と重ならない時に受け持つ。B7 は別の席なので、B6 を待たずに進められる |
| X3 | Onza の席が、配布の Bolt を受け持てること | Onza の席（配車は suite-lead） | B7 | Onza の Inception と重ならない時に受け持つ。Onza は完了の条件の確かめ方に入らないので、遅れても S1 の済みを止めない |
| X4 | Owner の exact-head と切り替えの決定（予定 5 回） | Owner | B1（shirube）、B2 の後（予算）、B6（aun）、B7（onza）、Bolt の後（切り替え） | 決定はまとめて 1 回で伺う。伺う時は、選択肢と勧めと根拠を #49 の決まった形でそろえる |
| X5 | AI-DLC の版を上げる時の audit の形の確かめ | Owner（版を選ぶ）、shirube の実装の席（確かめる） | B3（承認の記録の作り手） | 1 周の間は版を固定する。上げる時は、承認の記録の作り手の試験を先に回す |

## 待ちではない物（中で閉じる物）

- 監査（devauditor）と統合（suite-lead）: 既存の決まりで毎回回る。この取り組みでは待ちとして数えない。
- 設計の段の下書き（arc）と承認（この会話）: AI-DLC の流れの中で回る。
