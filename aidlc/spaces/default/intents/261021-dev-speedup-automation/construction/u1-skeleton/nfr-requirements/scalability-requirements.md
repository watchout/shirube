# 規模の決まり（Scalability）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の NFR3）、U1 の設計（`construction/u1-skeleton/functional-design/rules.md` の BR6.2・BR6.4）、この段の答え（`nfr-requirements-questions.md` の Q5）。

## 読む量

| ID | 決まり | 値 | 確かめ方 |
|----|--------|----|----------|
| NFR3.4 | 計測は、件数の上限を決めず、期間の中に統合された PR を全部読む。読み切れない時は全体の予算（NFR3.3）で止め、その repo を「観測できず」にする | 上限の件数なし。今の値は 3 repo で 101 件 | 多数の PR の試験の入力で、全部を数えるか、予算で止まって「観測できず」になる |

## 見込み

- 門は PR ごとに 1 回動き、読むのはその PR と base の記録だけなので、repo の PR の数が増えても 1 回の量は変わらない。
- 計測の量は、期間の中の PR の数に比例する。配布先が増えた時（Suite 全体・OmotenasuAI、次の段階）は、予算の見直しを B2 の実測から決める。
