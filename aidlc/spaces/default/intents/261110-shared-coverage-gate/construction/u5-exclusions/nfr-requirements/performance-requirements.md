# U5 u5-exclusions — 性能・動作環境の要件

この単位は、門の分母の解決に「除外を引く」処理と、結果に除外の一覧を出す行を足す。測定は変えない。ここでは、動作環境が変わらないことと、足した処理の大きさの要件を、元の NFR の番号に枝番を付けて書く。枝番はこの単位の中の番号で、U3・U4 の同じ番号とは別の物。他の単位の番号を引く時は単位名を付ける。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR9 = 除外の宣言の検査、BR10 = 分母への適用、BR11 = 出力）。
- 土台: U3 の [performance-requirements.md](../../u3-node-gate-slice/nfr-requirements/performance-requirements.md) と U4 の [performance-requirements.md](../../u4-thresholds-and-modes/nfr-requirements/performance-requirements.md)。この単位はそれを変えない。
- 技術の現状: [technology-stack.md](../../../../../codekb/shirube/technology-stack.md)。

## 要件

### NFR1 動作環境と処理の大きさ

- **NFR1.1** 動作を保証する環境と Node の版の扱いは U3 のまま（Linux の runner と Node 22、23 以上は実行するが保証しない）。この単位は環境の要件を足さず、Node の新しい機能も使わない。判定: この単位が足す code が Node 22 の組込みだけを使う（NFR6.1）。[NFR1]
- **NFR1.2** 除外を引く処理は、解決した分母の file の集合と除外の path の集合を、文字列の完全一致の集合の照合で突き合わせる。処理の量は「分母の file 数 + 除外の件数」に対して n log n（符号点順の並べ替え）を超えない。二乗の照合（件数の積）を使わない。追加の process を起こさない。目安の確かめ: 分母 5,000 件・除外 1,000 件の架空の入力で、解決と整形が、除外なしの同じ大きさの入力に比べて、ゆるい上限（U3 の網と同じ 10 秒の内側）で終わる。[NFR1]
- **NFR1.3** 除外の path と理由の検査（決定の URL を含むかの確かめを含む）は、文字列の長さで上限を置いて行い、検査の時間は長さに対して線形に収まる。理由の上限は U4 の根拠と同じ定数（rationaleMaxLength）で、上限を超える値は全部を走査せず上限 + 1 で止めて失敗にし、URL の形の確かめは空白で区切った断片ごとに、長さの確かめを先にして行う（BR9.3、BR9.5）。path は分母のソースと必須の試験の file との完全一致だけで見るので、形の検査（正規表現）を持たず、後戻りを起こす書き方が入らない。判定: 上限を超える理由と、分母にない長い path（繰り返しの文字列）を渡した試験が、ゆるい上限の内側で失敗を返す。[NFR1、脅威 T13]
- **NFR1.4** 除外を宣言しない入力では、処理の量も出力の大きさも U4 と同じ（追加の行・節・文が出ない）。除外を引く処理は 0 件の集合で動き、追加の走査を行わない。[NFR1、NFR8]
- **NFR1.5** summary に出す除外の一覧は SUMMARY_LIST_LIMIT（20 件。U3 の名前つきの一覧と同じ定数で、持ち主は `report.mjs`。呼び出しに引数として渡す）で上限を置き、残りは件数の 1 行にする。出力の大きさは除外の件数に比例して増えない（結果の file には全件が残る）。[NFR1、BR11.2]

## 気づいたこと

- 除外の検査は人の書く入力の検査で、速度は問題にならない。上限と線形の要件は、速度のためでなく、入力の自由な文字列が出力に出る前の大きさの制限のためにある。
- 除外の件数に上限を置かない（scalability-requirements.md の NFR1.7）。件数が大きくなる呼び出しは、除外が割合を上げているかを監査が読む量も増えるので、運用の判断になる。

## Assumptions & Open Questions

### Assumptions

- [assumption] 「分母 5,000 件・除外 1,000 件」は目安の大きさで、利用先の実測ではない。既存の利用先の分母は桁が小さい見込み。足りなければ試験の大きさだけを変える。
- [assumption] 10 秒の網は U3・U4 と同じ考え方（二乗の時間や無限の待ちを見つける網で、性能の保証ではない）。

### Open Questions

なし。
