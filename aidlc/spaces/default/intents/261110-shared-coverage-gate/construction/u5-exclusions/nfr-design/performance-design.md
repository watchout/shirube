# U5 u5-exclusions — 性能の設計

この単位が足す処理は、入力の除外の検査と、解決した分母からの集合の差と、出力の追加の行だけ。ここでは、それが U3・U4 の処理の大きさを変えない設計と、自由な文字列の検査を線形に保つ設計を決める。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- NFR の要件: [performance-requirements.md](../nfr-requirements/performance-requirements.md)（NFR1.1〜NFR1.5）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)。機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR9.1〜BR9.4、BR10.1・BR10.2、BR11.2）。
- 土台: U3 の [performance-design.md](../../u3-node-gate-slice/nfr-design/performance-design.md)（PF1〜PF3）と U4 の [performance-design.md](../../u4-thresholds-and-modes/nfr-design/performance-design.md)（PF1〜PF3）。この単位は両方を変えない。

## PF1 動作環境を変えない（NFR1.1）

- 足す code は Node 22 の組込みの言語機能（`Set`、配列の並べ替え、文字列の操作）だけを使う。新しい module の import を足さない。保証する環境は U3 のまま（Linux の runner と Node 22）。

## PF2 除外を引く処理は n log n を超えない（NFR1.2）

| 足す処理 | 持ち主 | 量 |
|---|---|---|
| 除外の要素ごとの形・必須・理由の検査（各 1 回の走査） | CoverageInputContract | 除外の件数 × 長さ（上限つき。PF3） |
| 同じ path の重複の検査（見た path の `Set`） | CoverageInputContract | 件数に線形 |
| 除外の並べ替え（符号点順。出力の順を入力に依存させない） | CoverageInputContract | n log n |
| 分母との完全一致の照合と集合の差（分母の `Set` に対する所属の確かめ） | 分母の解決（`resolve.mjs` が呼ぶ純粋な関数） | 分母の件数 + 除外の件数に線形 |
| 出力の追加の行・節（固定の文型と 20 件までの一覧） | ResultReporter | 定数（PF5） |

- 二乗の処理（除外 × 分母の総当たり）を使わない。分母の `Set` を 1 回作り、除外の各 path は所属の確かめ 1 回で済ませる。
- 確かめ: 分母 5,000 件・除外 1,000 件の合成の入力で、除外あり・なしの検査と整形が、ゆるい上限（10 秒）の内側に収まる試験を 1 つ置く（網であり性能の保証ではない）。

## PF3 自由な文字列の検査を線形に保つ（NFR1.3）

1. 理由の長さの確かめを先に行う。上限（rationaleMaxLength。U4 の根拠と同じ定数）を超える値は、全部を走査せず上限 + 1 で止めて失敗にする（BR9.3）。
2. 理由の制御文字と含めない並びの確かめは、U4 の根拠の検査と同じ 1 つの関数が、上限に切った後に 1 回ずつ見る走査で行う。後戻りを起こす正規表現を使わない。
3. path は、形の検査（正規表現）を持たない。分母の `Set` への所属の確かめだけで、一致しなければ失敗にする。長い path は所属の確かめが 1 回の文字列の比較で済む。
4. 確かめ: 上限ちょうどと上限より 1 文字長い繰り返しの理由、分母にない長い path（繰り返しの文字列）を渡す試験が、ゆるい上限（1 秒）の内側で失敗を返す。

## PF4 除外なしは U4 と同じ（NFR1.4）

- `exclusions` が無い・空の配列のとき、検査は空の配列に対する処理（走査 0 回）、集合の差は何も引かない（分母のまま返す）、出力の追加の行・節・文は出ない。追加の process も走査も起こさない。

## PF5 出力の大きさを件数に比例させない（NFR1.5）

- summary の一覧は SUMMARY_LIST_LIMIT（20。U3 の定数）で切り、残りは件数の 1 行にする。結果の file には全件が残る。notice は固定の 1 文で、件数に依らない。

## 気づいたこと

- 除外の検査の速度は問題にならない。長さと線形の設計は、速度のためでなく、自由な文字列が出力に出る前の大きさの制限のためにある。

## Assumptions & Open Questions

### Assumptions

- [assumption] 分母 5,000 件・除外 1,000 件は目安の大きさで、利用先の実測ではない。足りなければ試験の大きさだけを変える。
- [assumption] 1 秒・10 秒の網は、CI の実行機の揺れを見込んだゆるい上限。揺れる場合は、処理の回数を数える試験に置き換え、理由を記録する（U3・U4 と同じ考え方）。

### Open Questions

なし。
