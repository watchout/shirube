# U4 u4-thresholds-and-modes — 拡張・費用の要件

この単位は、CI の 1 回の実行の中で動く command に項目を足すだけで、常設の資源も新しい process も持たない。ここでは、大きさが増えた時の振る舞いと費用の要件を NFR1・NFR11 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1・NFR11。土台: U3 の [scalability-requirements.md](../../u3-node-gate-slice/nfr-requirements/scalability-requirements.md)（NFR1.6〜NFR1.8、NFR11.1・NFR11.2）と [performance-requirements.md](./performance-requirements.md)（この単位の NFR1.1〜NFR1.4）。
- 機能の設計: [rules.md](../functional-design/rules.md)（BR7.4 = 実際の閾値、BR8.5 = 後ろ向きの互換）。

## 要件

### NFR1 大きさに対する振る舞い（続き。NFR1.1〜NFR1.4 は performance-requirements.md）

- **NFR1.5** 利用先の大きさ（file、行、試験の数）が増えても、この単位が足す処理は増えない（NFR1.2）。結果の文書に足す項目は、固定の大きさ（例外 1 つ、動作 1 つ）だけで、利用先の大きさに比例して増えない。[NFR1]
- **NFR1.6** 同じ repo の複数の PR・複数の job が、それぞれ違う閾値の例外や動作で同時に門を流しても、互いに干渉しない。例外も動作も入力で渡され、共有の状態に保存されない（U3 の NFR1.8 のまま）。[NFR1]
- **NFR1.7** 例外を使う入力の数に上限を置かない（入力 1 つにつき例外は高々 1 つ）。複数の閾値（file ごとなど）を足す要望は、この単位の範囲外で、別の変更になる。[NFR1]

### NFR11 費用

- **NFR11.1** 新しい有料サービスや常設のクラウド資源を足さない。この単位は CI の費用を増やさない（足すのは入力の検査と出力の行だけで、試験の実行時間は変わらない）。[NFR11]
- **NFR11.2** 「記録だけ」の動作でも、試験の実行回数や時間の上限は enforce と同じ。動作で測定の量を変えない（記録だけにしても測定は省略されず、同じ値を出す）。[NFR11、BR7.2]

## Assumptions & Open Questions

### Assumptions

- [assumption] 閾値は 1 つだけ（全体の行の割合に 1 つ）。file ごとの閾値や、file の種類ごとの閾値は、契約と要件に無い。

### Open Questions

なし。
