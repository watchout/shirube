# 信頼性の決まり（Reliability）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の NFR1・NFR2・NFR12・NFR13）、U1 の設計（`construction/u1-skeleton/functional-design/rules.md`）、この段の答え（`nfr-requirements-questions.md` の Q3）。

## 失敗を隠さない

| ID | 決まり | 確かめ方 |
|----|--------|----------|
| NFR1.1 | 門は、読めない・壊れている・形が違う時に FAIL か「観測できず」を返し、PASS にしない（exit code 0 = PASS、1 = FAIL、2 = 観測できず） | 負例の入力で exit code 1・2 が出る試験 |
| NFR1.2 | 計測は、入力が壊れている時に exit code 1、読めない repo がある時に exit code 2 で終わる。どちらでも、読めた分の出力は出す | 負例の入力の試験 |
| NFR1.4 | 門の log が読めない PR（保持期間を過ぎたものを含む）は「観測できず」として数え、その件数を出す。commit status の state だけで PASS・FAIL に数えない | log の無い PR の試験の入力で「観測できず」に数えられる |

## 同じ入力から同じ結果

| ID | 決まり | 確かめ方 |
|----|--------|----------|
| NFR2.1 | 計測と承認の記録の作り手は、同じ入力（PR の一覧・時刻の引数・audit）から同じ bytes を出す。核の関数は時計を読まない | 同じ入力で 2 回動かし、出力を bytes で比べる試験 |
| NFR13.1 | 同じ head で門が 2 回動いても、判定の結果は同じで、書く commit status は 1 つ | 同じ入力で門の判定を 2 回動かす試験 |

## 時刻の扱い

| ID | 決まり | 確かめ方 |
|----|--------|----------|
| NFR12.1 | 時刻は UTC の時点で持つ。計測の期間の境目は日本時間の日で、始まりと終わりの両日を含む | 境目の時刻（23:59 と 00:00、日本時間）の PR の試験 |

## 止め方

- U1 の記録の判定は記録だけ（report-only）なので、門の不具合で正しい PR の統合が止まることはない（`rules.md` の BR4.1）。
- 門の呼出しの workflow が動かない時は、commit status が付かない。計測は、その PR を「観測できず」として数える。
