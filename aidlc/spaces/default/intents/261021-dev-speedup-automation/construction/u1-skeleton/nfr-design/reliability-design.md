# 信頼性の作り方（Reliability Design）— U1 u1-skeleton

出典: U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/reliability-requirements.md`）、U1 の設計（`construction/u1-skeleton/functional-design/rules.md`）、この段の答え（`nfr-design-questions.md` の Q2・Q3・Q5）、チームの決まり（`team.md` の Testing Posture、Owner の決定 iyasaka-arc#49 6336689921）。

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

## 網羅率の床（NFR8.2、Q5、監査の指摘 BF-05）

- **数える物**: `scripts/**` の全部。試験が読まない file も 0% として数える（Node の `--test-coverage-include='scripts/**'` と `--test-coverage-include-all`）。試験の file（`tests/**`）は数えない。
- **床**: 行の網羅率 80%（`--test-coverage-lines=80`）。下回ったら試験の実行が失敗で終わり、試験の job が失敗して統合できない（fail closed、Shirube 開発規格 S8）。
- **動かす所**: `ci.yml` の試験の job。PR と main への push で動く。Node の組込み（`--experimental-test-coverage`）だけを使い、新しい依存は足さない。`ci.yml` の変更は P1（保護面の 1 本、Owner の exact-head）に入る。
- **今の値**: 98.20%（2026-10-23、この Mac の Node 26.9 で `scripts/**` を全部数えた値）。入れた時から床を満たす。CI は Node 22 で動くので、P1 の CI の結果を最初の観測とする。
- **確かめ方（負例）**: Code Generation の確かめに、次の 2 つを入れる。
  - 網羅率を 80% より下げた試しの変更で、試験の job が失敗する。
  - 今の試験で、試験の job が成功する。
- **弱めない**: Build and Test の段でも、床の値（80%）と数える物（`scripts/**` の全部）を弱めない（`team.md` の Testing Posture）。閾値を変える時は、それで通す PR と別の PR で、Owner の決定を通す。
