# 信頼性の作り方（Reliability Design）— U1 u1-skeleton

出典: U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/reliability-requirements.md`）、U1 の設計（`construction/u1-skeleton/functional-design/rules.md`）、この段の答え（`nfr-design-questions.md` の Q2・Q3）。

## 失敗を 3 つの値で返す（NFR1.1・NFR1.2）

- どの CLI も、終わり方を exit code で返す: 0 = PASS、1 = FAIL（入力が壊れている）、2 = 観測できず。
- 読めない・壊れている・形が違う物は、例外にして入口で受け、FAIL か「観測できず」に分ける。PASS に落ちる道を作らない。

## log の 1 行の JSON の見つけ方（NFR1.4、Q2）

- 計測は、門の workflow の log の各行を見て、`sds-gate-result/1` の schema を持つ 1 行の JSON を探す。
- 1 行だけ見つかった時に、その verdict を数える。0 行か 2 行以上なら、その PR を「観測できず」にする。log が読めない（保持期間を過ぎた）時も「観測できず」。
- commit status の state だけで PASS・FAIL を数えない（観測していない物を観測したことにしない）。

## repo の間の失敗（Q3）

- repo ごとに読取りを分け、失敗した repo を「観測できず」として、ほかの repo の件数はそのまま出す。partial = true。

## 同じ入力から同じ結果（NFR2.1・NFR13.1）

- 核の関数（判定・数え方・承認の記録の作り方）は、入力と時刻の引数だけから結果を作る。
- 出力の JSON は、欄の順を固定して書く。
- 門は同じ head で 2 回動いても、同じ判定を出し、commit status を 1 つ書き直すだけ。

## 時刻（NFR12.1）

- 時刻は UTC の時点で持つ。期間の境目は、日本時間の日の始まり（00:00 +09:00）から、終わりの日の次の日の始まりの前まで。

## 再試行

- 自動の再試行はしない（受け渡しの形 Q7）。門は作者が workflow を再実行し、計測は次の回で測り直す。
