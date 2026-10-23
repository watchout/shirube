# 速さの決まり（Performance）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の NFR3）、受け渡しの形（`inception/contract-design/contract-summary.md` の Q7）、U1 の設計（`construction/u1-skeleton/functional-design/rules.md` の BR4.3・BR6.4）、この段の答え（`nfr-requirements-questions.md` の Q1）。

## 時間の上限と予算

| ID | 決まり | 値 | 確かめ方 |
|----|--------|----|----------|
| NFR3.1 | GitHub への問い合わせ 1 回の時間の上限 | 20 秒。今の門（`scripts/sds/gate.mjs`）と同じ値を 1 か所で持ち、門・記録の橋・計測が同じ値を使う | 応答しない問い合わせを模した試験で、20 秒で打ち切られ「観測できず」になる |
| NFR3.2 | 門の 1 回の全体の予算 | 5 分。使い切ったら verdict = UNOBSERVABLE、exit code 2 | 予算を小さくした試験で、途中で止まり「観測できず」になる |
| NFR3.3 | 計測の 1 回の全体の予算 | 10 分。使い切ったら、読み終えていない repo を「観測できず」、partial = true、exit code 2 | 予算を小さくした試験で、読めた repo の件数と「観測できず」が並ぶ |

## 再試行

- 自動の再試行はしない（受け渡しの形 Q7）。門は作者が workflow を再実行でき、計測は次の 04:30・18:00 の回で測り直す。

## 見込み

- 計測が読むのは、3 repo・約 100 件の PR とその status と log。1 回 20 秒の上限の中で、10 分の予算に収まる見込み（見込みは B2 の実測で確かめる）。
