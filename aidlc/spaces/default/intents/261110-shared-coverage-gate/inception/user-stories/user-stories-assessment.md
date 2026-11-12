# 共有の網羅率の門 — ユーザーストーリーの要否の判断

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../requirements-analysis/requirements.md)（FR1〜FR11、NFR1〜NFR11、承認済み）。
- 既存部品: [component-inventory.md](../../../../codekb/shirube/component-inventory.md)、[business-overview.md](../../../../codekb/shirube/business-overview.md)。
- 実践: [team-practices.md](../practices-discovery/team-practices.md)。

## Decision

**Execute（ユーザーストーリーを作る）。**

## Rationale

この取り組みの成果は、人（や席）が読み、呼び、判断する仕組みである。利用先の CI を書く人、結果を照らす独立監査、変更を持つ保守担当、保護対象を承認する Owner の4つの立場が別々の目的でこの門に触れる。要件を機能の一覧のまま設計に渡すと、「誰が何のために、どの結果を見て次の行動を決めるか」が抜け、判定の3値（一致・不一致・観測できず）や「記録だけ」の表示が誰の判断を助けるのかが曖昧なまま残る。ストーリーにして受入条件を Given/When/Then で書くことで、九つの指定項目それぞれの正例・負例を、完了の条件（項目ごとに正例1件以上・負例1件以上）に直接結び付けられる。

## Factors considered

| 観点 | 判断 |
|---|---|
| 取り組みの種類 | 新しい共有の仕組み（feature）。利用先が呼ぶ再利用 workflow と、その結果の読み手がいる。 |
| 利用者が触れる面 | 画面は無い。触れる面は、呼び出しの入力、notice と job summary、結果の JSON と出力値、利用の手引き。 |
| 立場の数 | 4（導入担当、独立監査席、保守担当、Owner）。 |
| 業務規則の複雑さ | 高い。既定の閾値と例外、3値の結果、段階導入の2つの動作、除外の宣言、未計測と NOT_RUN の扱いが組み合わさる。 |
| 組織をまたぐ調整 | あり。利用先の repo、独立監査、保護対象の承認、新しい依存の確認が別の担当に分かれる。 |

## 付加価値が大きい所

- 九つの指定項目と追加の1つ（CI の実行を減らす直し）を、立場ごとの目的に結び、受入条件に正例と負例を持たせる。
- 「失敗を隠さない」ことを、読み手が受け取る表示（何が成功とは書かれないか）として書く。
- 保護対象に触れる要件（再利用 workflow の追加、CI の変更）を、Owner の承認が要る手順として明示する。

## Alternatives considered

- 要件だけで足りるとして飛ばす: 受入条件を設計の段まで持ち越すことになり、項目ごとの正例・負例を追跡表に結べない。退ける。
