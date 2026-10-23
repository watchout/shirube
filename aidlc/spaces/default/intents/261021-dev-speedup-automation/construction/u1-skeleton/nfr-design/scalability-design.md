# 規模の作り方（Scalability Design）— U1 u1-skeleton

出典: U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/scalability-requirements.md`）、この段の答え（`nfr-design-questions.md` の Q3）。

## 量が増えた時の振る舞い

| 増える物 | 振る舞い | 決まり |
|----------|----------|--------|
| repo の PR の数 | 門は PR ごとに 1 回動き、読むのはその PR と base の記録だけ。1 回の量は変わらない | NFR3.2 |
| 期間の中の PR の数 | 計測は repo ごとにページ単位で全部読む。全体の予算で止まり、読み終えていない repo は「観測できず」 | NFR3.4・NFR3.3 |
| 配布先の repo の数 | 計測は repo ごとに分けて読む。1 つの repo の失敗は、ほかの repo に広がらない（Q3） | NFR3.4 |

## 見直す時

- 配布先が増える次の段階（Suite 全体・OmotenasuAI）の前に、B2 の実測から計測の予算を見直す。予算の値は `scripts/sds/budget.mjs` の 1 か所だけを変える。
