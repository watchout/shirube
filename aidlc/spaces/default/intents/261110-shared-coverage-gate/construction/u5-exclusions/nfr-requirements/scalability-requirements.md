# U5 u5-exclusions — 拡張・費用の要件

この単位は、CI の 1 回の実行の中で動く command の分母の解決に、除外を引く処理を足すだけで、常設の資源も新しい process も持たない。ここでは、大きさが増えた時の振る舞いと費用の要件を NFR1・NFR11 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1・NFR11。土台: U3 の [scalability-requirements.md](../../u3-node-gate-slice/nfr-requirements/scalability-requirements.md)、U4 の [scalability-requirements.md](../../u4-thresholds-and-modes/nfr-requirements/scalability-requirements.md)、この単位の [performance-requirements.md](./performance-requirements.md)（NFR1.1〜NFR1.5）。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR10.4 = 除外の道、BR10.5 = 宣言なしは 0 件、BR11.2 = 一覧の上限、BR11.6 = 頭の 1 行）。

## 要件

### NFR1 大きさに対する振る舞い（続き。NFR1.1〜NFR1.5 は performance-requirements.md）

- **NFR1.6** 利用先の大きさ（file、行、試験の数）が増えても、この単位が足す処理は、分母と除外の件数に対する n log n を超えない（NFR1.2）。結果の文書に足す項目は exclusions の一覧と件数だけで、利用先の大きさに比例して増える物は、除外の宣言の件数（呼び出し側が 1 件ずつ書いた数）だけ。[NFR1]
- **NFR1.7** 除外の件数に上限を置かない。入力 1 つの宣言の数は、呼び出し側が理由つきで 1 件ずつ書いた数そのもので、門は黙って切り捨てず、黙って上限で失敗にもしない。件数が多い呼び出しの妥当性は、結果の JSON の `exclusionCount` を読む監査が見る。上限を足したい要望は、別の変更になる（Owner に伺う）。[NFR1、BR11.1]
- **NFR1.8** 同じ repo の複数の PR・複数の job が、それぞれ違う除外で同時に門を流しても、互いに干渉しない。除外は入力で渡され、共有の状態に保存されない（U3 の NFR1.8 のまま）。[NFR1]
- **NFR1.9** DB を要する file を DB の job で測る呼び出しと、理由つきで除外する呼び出しは、門の同じ道を通る。呼び出し側の数が増えても、門に DB のための分岐・一覧・設定が増えない。[NFR1、BR10.5]

### NFR11 費用

- **NFR11.1** 新しい有料サービスや常設のクラウド資源を足さない。この単位は CI の費用を増やさない（足すのは入力の検査と分母の引き算と出力の行だけで、試験の実行時間は変わらない）。[NFR11]
- **NFR11.2** 除外は分母から外す file の宣言であって、試験の実行回数や時間の上限を変えない。除外しても測定は省略されず、名指さない必須の試験は同じだけ流れる（名指した試験 file は必須の集合から外れる）。[NFR11、BR10.3]
- **NFR11.3** DB の job を足す費用（PostgreSQL の起動など）は、この単位の範囲外で、U7 の配線で扱う。この単位は DB の job を作らない。[NFR11、BR10.5]

## Assumptions & Open Questions

### Assumptions

- [assumption] 除外の件数が増えた時の読みにくさ（summary は 20 件まで、結果の file に全件）は、この単位では扱わない上限なしの前提の裏返しで、運用で気づけば別の変更として提案する。

### Open Questions

なし。
