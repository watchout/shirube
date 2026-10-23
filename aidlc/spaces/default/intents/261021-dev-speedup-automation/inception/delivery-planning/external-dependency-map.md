# 外からの待ち（External Dependency Map）

出典: この段の答え（`delivery-planning-questions.md` の Q4・Q5）、受け渡しの形の未決の問い（`inception/contract-design/contract-summary.md`）、作る順番の計画（`bolt-plan.md`）。

Bolt は、作る 1 回分の単位です（1 つの Bolt = 1 つの Unit）。ここに並べるのは、この取り組みの外の担当や決定を待つ物です。

## 外の担当や決定を待つ物

| # | 待つ物 | 持ち主 | 待つ Bolt | 遅れた時の手当て |
|---|--------|--------|-----------|------------------|
| X1 | W2 の道具が計測を呼び、出力（`sds-metrics/1` の `report_markdown`）を #53 に載せる変更 | iyasaka-arc の担当（W2 の道具の持ち主） | B2 の結果を Owner が #53 で見るところ | 計測の CLI は単独で動くので、変更が入るまでは CLI の出力を GitHub に記録して読む。計測そのものは止めない |
| X2 | aun の実装の席が、配布の Bolt を受け持てること | aun の席（配車は suite-lead） | B6 | AUN 自身の作業と重ならない時に受け持つ。B7 は別の席なので、B6 を待たずに進められる |
| X3 | Onza の席が、配布の Bolt を受け持てること | Onza の席（配車は suite-lead） | B7 | Onza の Inception と重ならない時に受け持つ。Onza は完了の条件の確かめ方に入らないので、遅れても S1 の済みを止めない |
| X4 | Owner の exact-head と切り替えの決定（予定 4 回） | Owner | B1（shirube。own-code の予算の改めを含む = Q10）、B6（aun）、B7（onza）、Bolt の後（切り替え） | 決定はまとめて 1 回で伺う。伺う時は、選択肢と勧めと根拠を #49 の決まった形でそろえる |
| X5 | AI-DLC の版を上げる時の audit の形の確かめ | Owner（版を選ぶ）、shirube の実装の席（確かめる） | B1・B3（承認の記録と段の順の記録の作り手） | 1 周の間は版を固定する。上げる時は、承認の記録と段の順の記録（C9）の作り手の試験を先に回す |
| X6 | 記録の PR（R: AI-DLC の記録を Owner の作業場から写す）と承認の記録の PR（A: I1 の CLI で作った承認の記録と段の順の記録）の監査 | shirube の席（写す・作る）、devauditor（bytes の一致を監査する） | R は I1、A は I2（門は main の記録だけを読む） | R は保護面の 1 本の PR の後、A は I1 の後に出す（Q10。#49 6354019047 の 4 の順を改めた）。audit の記録は載せない（6354411741） |
| X7 | kit の版上げの PR（K: shirube の pin を I2 の後の main に上げ、kit が書く 3 つの file を入れる）の監査と統合 | shirube の席（作る）、devauditor（監査）、suite-lead（統合。Owner の手なし = #49 6308341298 の 1） | I3（新しい門で判定される確かめの PR） | I2 の後に出す（Q11）。差分が kit の file だけ・kit check OK・上げる先が監査 PASS の main であることを監査で確かめる |

## 待ちではない物（中で閉じる物）

- 監査（devauditor）と統合（suite-lead）: 既存の決まりで毎回回る。この取り組みでは待ちとして数えない。
- 設計の段の下書き（arc）と承認（この会話）: AI-DLC の流れの中で回る。
