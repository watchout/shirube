# 見張りの仕組み（Monitoring Design）— U1 u1-skeleton

出典: U1 の見え方の作り方（`construction/u1-skeleton/nfr-design/observability-design.md`）、U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/observability-requirements.md`）、受け渡しの形（`inception/contract-design/contract-summary.md` の C3・C4）。

## 指標

| 指標 | 元 | 目安 | 意味 |
|------|----|------|------|
| 門の結果の 1 行の JSON が 1 行だけ出た PR の割合 | 計測の出力（`sds-metrics/1` の件数） | K（pin を I2 の後の main に上げる）の後の PR で、観測できず 0。I1・I2 は U1 の前の門で判定されるので、`sds-gate-result/1` の行が無く観測できずになりうる | 門と計測のつながり（細い版の確かめ）が動いているか |
| 記録の判定の FAIL の件数 | 計測の出力の FAIL | 目標は置かない（記録だけの段） | U2 で、監査の席の分類と合わせて「誤って止めた」回数を数える元 |
| CI の行の網羅率 | `ci.yml` の試験の job の出力 | 80% 以上 | 下回ると CI が失敗し、統合できない（NFR8.2） |

## 知らせ

| 知らせ | 条件 | 重さ | 届け先 |
|--------|------|------|--------|
| 門の FAIL・観測できず | commit status `sds-gate` の説明文と log | 記録だけの段では止めない | PR を見る作者・監査・統合の席 |
| CI の失敗（網羅率を含む） | `ci.yml` の job が失敗 | 統合できない | PR を見る作者・統合の席 |

ほかの通知（Issue への書込みなど）は足しません（NFR10）。

## 目標の値（U1 の範囲）

| 見る物 | 目標 | 期間 |
|--------|------|------|
| 門の結果を計測が読めた割合 | 100%（観測できず 0） | U1 の確かめの PR（K の後の I3）から、U2 が始まるまで |

## log

- 門の判定の理由は、門の workflow の log の 1 行の JSON に残す。
- 計測の結果は、`ci.yml` の計測の job の log の 1 行の JSON に残す。
- log は Actions の保持期間のあいだ読める。集める仕組みや画面は足さない（Owner は U2 の後に #53 で見る）。
