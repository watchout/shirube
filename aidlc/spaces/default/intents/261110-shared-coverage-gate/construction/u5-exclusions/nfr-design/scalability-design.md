# U5 u5-exclusions — 拡張・費用の設計

この単位は、CI の 1 回の実行の中で動く command の分母の解決に、除外を引く処理を足すだけで、常設の資源も共有の状態も持たない。ここでは、大きさが増えた時の振る舞いと費用を決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [scalability-requirements.md](../nfr-requirements/scalability-requirements.md)（NFR1.6〜NFR1.9、NFR11.1〜NFR11.3）。機能の設計: [rules.md](../functional-design/rules.md)（BR10.4、BR10.5、BR11.2）。
- 土台: U3 の [scalability-design.md](../../u3-node-gate-slice/nfr-design/scalability-design.md)、U4 の [scalability-design.md](../../u4-thresholds-and-modes/nfr-design/scalability-design.md)。

## SL1 結果に足す項目の大きさ（NFR1.6）

- 結果の文書に足す物は `exclusions` の一覧と `exclusionCount` だけ。一覧の大きさは、呼び出し側が 1 件ずつ書いた宣言の数そのもので、利用先の file・行・試験の数には依らない。処理は分母と除外の件数に対する n log n（performance-design.md の PF2）。

## SL2 件数に上限を置かない（NFR1.7）

- 除外の件数に上限を置かず、黙って切り捨てず、黙って上限で失敗にもしない。件数の多さは結果の JSON の `exclusionCount` で見え、監査が読む。summary は 20 件までで残りは件数の 1 行（PF5）。上限を足したい要望は別の変更で、Owner に伺う。
- 採らなかった代替: 件数の上限（たとえば 50 件）で失敗にする。理由: 要件にも契約にも上限が無く、決める根拠が無い。黙って足さない（プロジェクトの訂正の記録）。

## SL3 共有の状態を持たない（NFR1.8）

- 除外は入力の file で渡され、保存されない。同じ repo の複数の PR・複数の job が、それぞれ違う除外で同時に流しても、互いに干渉しない（U3 のまま）。

## SL4 DB のための分岐を持たない（NFR1.9）

- 門は DB の file の一覧も DB の試験の一覧も持たない。「DB の job で測る」と「理由つきで除外」の違いは、除外の宣言の有無だけで表す（BR10.5）。呼び出し側が増えても、門に分岐・一覧・設定が増えない。DB の job の起動と版の固定は U7 の仕事。

## SL5 費用（NFR11.1〜NFR11.3）

- 新しい有料サービスや常設のクラウド資源を足さない。足すのは入力の検査と集合の差と出力の行だけで、試験の実行時間は変わらない（NFR11.1）。
- 除外は分母から外す file の宣言で、必須の試験は同じだけ流れる。試験の実行回数や時間の上限を変えない（NFR11.2）。
- DB の job を足す費用は範囲外（U7）。この単位は DB の job を作らない（NFR11.3）。

## Assumptions & Open Questions

### Assumptions

- [assumption] 除外の件数が増えた時の読みにくさ（summary は 20 件まで、結果の file に全件）は、運用で気づけば別の変更として提案する。

### Open Questions

なし。
