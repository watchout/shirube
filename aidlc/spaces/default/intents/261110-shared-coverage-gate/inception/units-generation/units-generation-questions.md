# 共有の網羅率の門 — 作業の単位の分け方の問い

> 範囲・要件・部品の記録で決まっている事は聞き直しません。ここで聞くのは、単位の切り方を決めるために必要で、記録にまだ答えが無い事だけです。答えは [Answer]: に書きます。

## Sources

- 要件: [requirements.md](../requirements-analysis/requirements.md)、ストーリー: [stories.md](../user-stories/stories.md)。
- 部品: [components.md](../domain-design/components.md)、判断: [decisions.md](../domain-design/decisions.md)（ADR-001〜007）。
- 範囲の順序: [scope-document.md](../../ideation/scope-definition/scope-document.md) の「順序」（S10 を最初、その後はリスクの高い物を先、判定・出力・呼び出しは依存の順）。
- 実践: [team-practices.md](../practices-discovery/team-practices.md)、team.md の Way of Working（1単位1PR、前の PR の統合後に次の単位の Code Generation）、Walking Skeleton（最初に端から端まで動く最小の版）。

## 決まっている事（問いではない）

- **1単位は1つの PR で、前の単位の PR が統合されてから次の単位を作る**（team.md）。Construction は serial（1単位ずつ）。複数の単位を並行して作らないので、「並列に作れる単位の組」は、依存が無いというだけの記録になる。
- **S10（CI の実行の絞り）が最初**（範囲の順序、arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。S10 は `KitGateCaller` と `ShirubeCi` の既存の workflow の変更で、ほかの単位に依存しない。
- **保護対象（workflow の追加・変更）は、単位の PR ごとに Owner の対象 head の承認が要る**（FR7.5、FR10.5、制約 O2）。再利用 workflow（`CoverageGateWorkflow`）と S10 の 2 つの workflow の変更がそれにあたる。
- **TypeScript と vitest の形（`TypeScriptVitestMeasurer`）は、測定の道具が新しい依存になる場合、arc-sec の確認と Owner の決定が先**（FR1.6、NFR6）。この形の単位は、Node 組込みの形の単位を止めない別の単位にする。
- **各単位は自分の正例・負例の試験を持つ**（TDD、team.md）。手引き（FR11.2）は、機能が出そろう最後の単位で書く。
- **配布の形は 1 つ**: 単位はすべて同じリポジトリの変更で、利用先は再利用 workflow を commit 固定で呼ぶ（FR7.1）。単位ごとに別々に配る物は無い。
- **DB の構造は変えない**（制約 O4）。DB を要する試験の扱い（FR5.1、FR5.5）は、判定側の除外の単位と呼び出し口の単位に含まれる。

## Q1. [境目] 網羅率の門の本体を、どう単位に切るか

網羅率の門の本体は、部品でいうと入力の検査・判定の核・2つの測定・実行の部品・出力・入口・呼び出し口の workflow です。team.md は「最初に端から端まで動く最小の版を作り、接続を実物で確かめてから機能を足す」と決めています。

たとえば層ごとに切ると、判定の核の単位が統合された時点では、まだ何も測れず、動く物は何もありません。縦に切ると、最初の単位が統合された時点で、架空の試験を Node で測って結果の JSON が出るところまで動きますが、その単位の中に複数の部品を最小の形で入れることになります。

- A. 縦に切る。最初の本体の単位は、Node 組込みの形だけで、既定の閾値（行100%）・3値の結果・JSON の出力まで、最小の形で端から端まで動く。その後の単位で、閾値の例外と「記録だけ」の動作・除外、TypeScript と vitest の形、呼び出し口の workflow、手引きと検証を足していく
- B. 部品（層）ごとに切る。判定の核、入力の検査、測定、出力、入口、workflow をそれぞれ別の単位にし、最後の単位でつないで初めて動く
- C. 設計の段で決める
- X. Other (please specify)

[Answer]: A（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない。縦に切る。最初の本体は Node 組込みの形だけで端から端まで）

## Q2. [粒度] S10（CI の実行の絞り）を、1つの単位にするか、2つにするか

S10 は 2 つの変更です。(a) kit の門の呼び出し（`kit/sds-gate-caller.yml`）の起動を、監査に関わるコメントだけに絞る。(b) Shirube 自身の `ci.yml` に、同じ PR の古い実行を取り消す仕組みを置く。どちらも workflow の変更で保護対象なので、Owner の対象 head の承認が要ります。範囲の文書は「それぞれ小さな変更で、独立した単位にできる。分け方は Units Generation で決める」としました。

たとえば 1 つにすると、Owner が見る PR と承認が 1 回で済みますが、(a) の `labeled`・`unlabeled` を外すかの確認（FR10.2）が長引くと、(b) の `concurrency` も一緒に待たされます。2 つにすると、(b) だけ先に統合できますが、PR と Owner の承認が 2 回になり、監査の依頼も 2 回になります。

- A. 1 つの単位（(a) と (b) を同じ PR で）
- B. 2 つの単位（(a) と (b) を別の PR で。(a) と (b) は互いに依存しない）
- C. 設計の段で決める
- X. Other (please specify)

[Answer]: B（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない。2 つの単位。(b) は小さく CI の費用をすぐ減らせるので先に出して統合し、(a) のラベルの確かめが長引いても (b) を待たせない）

## Q3. [順序・保護対象] 再利用 workflow（`CoverageGateWorkflow`）を、最初の本体の単位に含めるか

再利用 workflow の追加は保護対象で、その PR は統合の前に Owner の対象 head の承認が要ります。最初の本体の単位に含めると、GitHub Actions の上で実際に呼べるところまで動いたと確かめられますが、その単位の PR が Owner の承認を待つ間、その後の本体の単位に進めません。含めなければ、最初の本体の単位はコマンドとして直接動かして確かめ、workflow は呼び出し口の別の単位で足します。

たとえば Owner が数日に 1 回しか承認の確認をしない運用だと、前者は本体全体の足を引っ張りやすく、後者は workflow での実物の確認が後ろにずれます。

- A. 含めない。最初の本体の単位は、コマンドとして直接動かして端から端まで確かめる。workflow は後の別の単位（呼び出し口）で足し、その単位で Actions 上の接続を確かめる
- B. 含める。最初の本体の単位で、workflow も同時に足し、Actions の上で端から端まで確かめる
- C. 設計の段で決める
- X. Other (please specify)

[Answer]: A（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない。最初の本体の単位は command で直接確かめ、workflow は後の呼び出し口の単位で足す。守る物の承認待ちで本体の単位を止めない）
