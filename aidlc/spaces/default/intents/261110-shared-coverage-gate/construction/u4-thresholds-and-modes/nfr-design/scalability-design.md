# U4 u4-thresholds-and-modes — 拡張・費用の設計

この単位は、CI の 1 回の実行の中の command に固定の大きさの項目を足すだけで、常設の資源を持たない。ここでは、大きさが増えても足した処理が増えない設計と、費用が増えない設計を決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [scalability-requirements.md](../nfr-requirements/scalability-requirements.md)（NFR1.5〜NFR1.7、NFR11.1・NFR11.2）。機能の設計: [rules.md](../functional-design/rules.md)（BR7.2、BR7.4、BR8.5）。
- 土台: U3 の [scalability-design.md](../../u3-node-gate-slice/nfr-design/scalability-design.md)（SL1〜SL4）。

## SL1 足す項目は固定の大きさ（NFR1.5、NFR1.7）

- 結果の文書に足す物は、動作 1 つ、閾値の例外 1 つ（URL、主張された値、根拠）、実際の閾値 1 つ。利用先の大きさに比例して増えない。
- 入力の `threshold` は 1 つだけ（全体の行の割合に 1 つ）。file ごとの閾値や、複数の例外を持つ形にしない。要望が出た場合は契約を見直す別の変更になる。この制限は、入力の検査が `threshold` を object に限ることで構造的に守られる（配列は失敗）。

## SL2 共有の状態を持たない（NFR1.6）

- 動作と閾値の例外は、入力から検査済みの値になり、判定へ引数で渡される。モジュールの変数・環境変数・file に保存しない。複数の PR・job が違う閾値と動作で同時に流れても、互いに干渉しない（U3 の SL1 のまま）。
- 判定の核は、呼ぶたびに同じ入力から同じ出力を返す。呼び出しの間で持ち越す値を持たない（試験: 異なる mode と threshold の判定を交互に呼び、毎回の結果が単独で呼んだ時と一致する）。

## SL3 費用を増やさない（NFR11.1、NFR11.2）

- 動作が record-only でも、測定の量（試験の実行回数、子プロセスの数、期限と総予算）は enforce と同じ。動作は判定の最後の分岐（shouldFail）だけを変え、測定を省略したり変えたりしない。
- 例外の有無で測定を変えない。閾値は判定の比較にだけ使う。

## SL4 新しい資源を足さない（NFR11.1）

- 新しい有料サービス、常設の資源、新しい action を足さない。足す file は `scripts/coverage-gate/` の小さな純粋な module と、その試験だけ。

## Assumptions & Open Questions

### Assumptions

- [assumption] 閾値は全体に 1 つ。file の種類ごとの閾値は要件に無い（scalability-requirements.md の仮定）。

### Open Questions

なし。
