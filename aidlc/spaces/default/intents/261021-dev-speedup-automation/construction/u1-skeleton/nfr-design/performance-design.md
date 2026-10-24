# 速さの作り方（Performance Design）— U1 u1-skeleton

出典: U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/performance-requirements.md`・`scalability-requirements.md`）、U1 の設計（`construction/u1-skeleton/functional-design/`）、この段の答え（`nfr-design-questions.md` の Q1・Q3）。

## 時間の上限と予算の部品（`scripts/sds/budget.mjs`）

- 問い合わせ 1 回の上限（20 秒）、門の全体の予算（5 分）、計測の全体の予算（10 分）の値を、この 1 か所に書く（NFR3.1〜NFR3.3）。今の門の `gate.mjs` が持つ 20 秒も、ここを使う形に寄せる。
- 時計を読むのは CLI の入口だけ。核の関数は、開始の時刻と今の時刻を引数で受け、残りの予算を計算する。
- 問い合わせの前に残りを確かめ、足りなければ問い合わせずに「観測できず」を返す。

```text
残り = 予算 - (今 - 開始)
IF 残り <= 0 THEN 観測できず
ELSE 問い合わせ（上限 = min(20 秒, 残り)）
```

## 計測の読み方（NFR3.4）

- repo ごとに、期間の中に統合された PR を、ページ単位で順に読む。件数の上限は持たない。
- repo ごとに、予算の残りを確かめながら読む。全体の予算を使い切ったら、読み終えていない repo を「観測できず」にする（Q3）。
- 同じ PR の status と log は、1 回ずつだけ読む（同じ物を 2 度問い合わせない）。

## 置かない物

- 結果を貯めておく仕組み（cache）は置かない。毎回 GitHub の記録から数える（宣言した値を証拠にしない、Shirube 開発規格 S5）。
