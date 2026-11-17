# U5 u5-exclusions — 信頼性・失敗の扱いの設計

この単位は、分母から file を外せる「除外」を足す。ここでは、除外があっても失敗を成功と読み替えない設計、決定性、新旧の同居を決める。可用性の目標（SLA）は U3・U4 と同じく持たない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [reliability-requirements.md](../nfr-requirements/reliability-requirements.md)（NFR2.1〜NFR2.3、NFR4.1〜NFR4.5、NFR8.1〜NFR8.6）。機能の設計: [rules.md](../functional-design/rules.md)（BR9〜BR11）、[functional-spec.md](../functional-design/functional-spec.md)。
- 土台: U3 の [reliability-design.md](../../u3-node-gate-slice/nfr-design/reliability-design.md)（RL1〜）と U4 の [reliability-design.md](../../u4-thresholds-and-modes/nfr-design/reliability-design.md)。
- 決定済みの前提: 入力の失敗と入口の失敗は除外があっても終了コード 2（契約の Q2 の答え。arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。

## 失敗と範囲

| 失敗 | 範囲を止める物 | 終了コード |
|---|---|---|
| 除外の宣言の形・必須・理由・重複の不正（BR9） | 測定に進まない。結果の文書に inputFailure、exclusions は空 | 2 |
| どちらの集合にも無い path（BR10.1）、全部除外（分母または必須の試験が空。BR10.2） | 測定に進まない。TARGET_UNRESOLVED / TARGET_EMPTY | 2 |
| 除外ありの判定（必須の試験の未実行、分母に残る file の未計測、試験の失敗） | 判定の核がこれまでどおりに不一致・観測できずにする | 1 |
| 結果の file・summary・出力値の書き込みの失敗 | 先に書けた結果は書き直さない | 2 |

## RL1 純粋な関数（NFR2.1）

- 除外の検査と集合の差は、検査済みの入力と解決した分母だけを受ける純粋な関数。時計・乱数・識別子・環境変数・file の読み書きを取得しない。判定の核は除外を知らない。構造の試験が、これらの file の中身に禁じた物が現れないことを調べる。

## RL2 バイト一致（NFR2.2）

- 同じ入力で判定と整形を 2 回行うとバイトまで一致する試験。除外の 1 件を足す・直す・消すと出力が変わる試験。

## RL3 並びの固定（NFR2.3）

- 除外は検査済みの入力の段階で path の符号点順に並べ替えて持つ。出力はその並びを使い、入力の並びに依存しない。入れ替えた入力でバイト一致する試験。ロケールに依る比較（`localeCompare`）を使わず、符号点の比較にする。

## RL4 検査の失敗を黙って戻さない（NFR4.1）

- 検査の途中の失敗は、除外なしに戻して続行しない。最初の失敗で止め、各負例（配列でない、要素が object でない、path か reason が無い、未知のキー、path が空、理由が不正、重複）で終了コード 2、exclusions は空、exclusionCount は 0。

## RL5 分母との一致と全部除外（NFR4.2）

- 分母に無い path は無視せず TARGET_UNRESOLVED。全部除外は TARGET_EMPTY。成功と読まない。

## RL6 試験の未実行と未計測を隠さない（NFR4.3）

- 分母と必須の試験の集合を決める場所は解決の 1 か所で、名指さない必須の試験は除外と無関係に決まる。判定の核の NOT_RUN・未計測の決め方は変えない。除外ありの 3 つの負例（必須の試験が流れない、分母に残る file が計測されない、試験の失敗）が一致にならない試験。

## RL7 区分と理由コードを変えない（NFR4.4）

- 判定の核に除外の分岐を足さない（ADR-001、BR10.6）。理由コードの集合と終了コード（0・1・2）は増やさない。除外が割合を上げたかどうかは門が結論を書かず、分母の件数と exclusions から読む。

## RL8 書き込みの失敗は 2 のまま（NFR4.5）

- U3 の NFR4.5・U4 の NFR4.3 の経路を変えない。除外ありの入力で、入力の失敗・書き込みの失敗・予期しない例外が 2 になる試験。

## RL9 後ろ向きの互換（NFR8.1、NFR8.5）

- 除外を宣言しない入力（省略・空の配列）で、結果の文書・summary・notice・出力値が U4 の出力とバイトまで一致する。U3・U4 の golden（`tests/coverage-gate-golden*`）と比べる。`exclusions: []` はこれまで失敗だったが、新しく受け付ける向きなので既存の呼び出し側を壊さない。

## RL10 追加の順（NFR8.2）

- 結果の JSON の版は 1 のまま。項目の名前・出力値の名前・理由コードを増やさない。値を持たせるのは `exclusions`・`exclusionCount` と、`denominator.resolvedFileCount` の意味（除外を引いた後の件数）だけ。名前の集合を U4 と比べる試験。

## RL11 逆向き（NFR8.3）

- この単位の変更を取り消すと U4 の状態に戻る。戻した状態で U3・U4 の試験が通ることを確かめる（S6）。コード生成で、base の実物の SHA-256 と突き合わせる。

## RL12 置き換える既存の試験（NFR8.4）

- `exclusions` を未知のキー・不正な型として扱う既存の試験 4 件（`tests/coverage-gate-input.test.mjs`、`coverage-gate-cli.test.mjs`、`coverage-gate-golden.mjs` と `coverage-gate-golden.test.mjs`、`coverage-gate-cli-modes.test.mjs`）を、別の未知のキーで性質を保ったまま置き換える。弱めない。コード生成の段で数え直し、PR の監査の項目にする。

## RL13 配線しない（NFR8.6）

- 入口はまだどの workflow にも呼ばれない（U7 が配線する）。この単位の統合で CI の挙動は変わらない。

## Assumptions & Open Questions

### Assumptions

- [assumption] golden は U4 の統合後の main の出力から作る（現時点の origin/main で U4 は統合済み）。コード生成の段で、base の実物と突き合わせ直す。

### Open Questions

なし。
