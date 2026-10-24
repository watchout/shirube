# Practices Discovery — 質問

shirube の記録（git の履歴、CI の設定、profile、文書）から進め方の下書きを作りました（`inception/practices-discovery/team-practices.md`）。記録だけでは決められない点を聞きます。ここで決めた内容は、承認の後にチームの決まり（`aidlc/spaces/default/memory/team.md`）に書き込まれ、この space の以後の取り組みでも使われます。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号（例: `A`、複数なら `A, C`）か、`X:` に続けて自分の言葉を書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [開発の運営] main への統合の仕方

記録では、席ごとの branch（例: `adf-lead/gate4a-binding-20261021`）から PR を出し、GitHub の merge commit（"Merge pull request #N"）で main に統合しています。squash（1 つの commit にまとめる統合）はしていません。

A. 今のまま（席ごとの branch から PR を出し、merge commit で main に統合する）
B. squash で統合する形に変える
C. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A（arc の下書き。読み取った今の形のまま。統合は作者と別の席が監査 PASS の後 = iyasaka-arc#49 6288848200・6301299856。AUN も同じ答え）

## Q2. [開発の運営] 最初に端から端まで通る細い版を作るか

「端から端まで通る細い版（walking skeleton）」とは、機能を入れる前に、部品どうしが全部つながって最後まで動くことを確かめるための最小の版のことです。記録からは、shirube でこれを作る決まりがあるかを読み取れませんでした。

A. 作る（最初の作業単位で、端から端まで通る細い版を作ってから機能を足す）
B. 作らない
C. 取り組みの進め方（feature などの scope）の既定に任せる
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A（arc の下書き。制御系は全部作ってからではなく、薄片ごとに実証すると決めている = iyasaka-arc#49 6284653618。最初の版の完了も「1 周を門と計測つきで通す」= 6329622282）

## Q3. [品質] 試験と実装の順番

記録には、失敗する試験だけの PR を先に出し、その後に試験を通す実装の PR を出した例があります（監査項目の集合 `pr34-u2-red.json` と `pr34-u2-green.json`）。ただ、それがいつもの決まりかは読み取れませんでした。

A. 試験が先（失敗する試験を先に書き、それを通す実装を書く）
B. 実装が先（実装の後に試験を書く）
C. 混ぜる（受入の試験は実装の前、細かい単体試験は実装の後）
D. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: A（arc の下書き。記録にある失敗する試験の PR を先に出す形（pr34-u2-red → green）を決まりとして続ける。AUN も同じ答え）

## Q4. [品質] 行の網羅率の下限

shirube は今、行の網羅率（試験が通ったコードの行の割合）を測っていません。AI-DLC の既定では、feature の取り組みに 80% の下限を置きます。Node には網羅率を測る機能が組み込まれているので、新しい依存を足さずに測ることはできます。

A. 80% を下限にする（Node 組込みの測定を使い、新しい依存は足さない）
B. 下限は置かず、判定ごとに正例・負例の試験をそろえる今のやり方を続ける
C. Not yet defined（まだ決まっていない）
X. Other (please specify)

（arc の勧め: X「B の今のやり方（判定ごとに正例・負例の試験をそろえる）を続け、行の網羅率は Node 組込みの機能で測って記録だけする。下限を統合の条件にするかは、測った値を見て Owner が決める」。CI の必須の検査に足すのは保護面 = iyasaka-arc#36。AUN の同じ問いへの勧めと同じ形）

[Answer]: X: 行の被覆率 80% を目標にし、まず CI で測って記録だけする（統合を止める条件にはしない）。止める条件にするかは、測った値を見て Owner が決める

## Q5. [開発の運営] 配布（リリース）の仕方

記録では、本番環境への展開は無く、配布先の repo は shirube の commit を固定して呼んでいます。版を上げる時は kit の PR を出し、workflow や pin（`.shirube/**`）を変える時は保護面として Owner の exact-head の承認を取っています。

A. 今のまま（commit を固定して呼び、版上げは kit の PR。保護面は Owner の exact-head）
B. Not yet defined（まだ決まっていない）
X. Other (please specify)

[Answer]: X: A。ただし配布キットの版上げの PR（kit upgrade で、差分がキットの file だけ・kit check OK・上げる先は監査 PASS で統合された shirube main）は、独立監査 PASS の後に各 repo の統合担当が統合し、PR ごとの exact-head は要らない = iyasaka-arc#49 6308341298。mode・必須検査・ruleset・profile・protected_paths・最初の導入は今までどおり Owner の exact-head（arc の下書き）

## Q6. [開発の運営] ハードな決まりとして残すもの (select all that apply)

記録の中で人が書いた決まりのうち、破ってはいけない決まりとしてチームの記録に残すものを選んでください（`inception/practices-discovery/discovered-rules.md` の候補）。

A. 作る人が自分の作業を監査・承認・統合しない
B. PR の本文に `json sds-pr` のブロックを 1 個置き、`risk:R0`〜`risk:R4` の label を 1 つ付ける
C. 検査の閾値を緩める変更を、同じ PR で行わない
D. `scripts/hygiene` の検査に、実行時の npm 依存を足さない
E. 検査は読めない・壊れている時に失敗にする（fail closed）
F. None（ハードな決まりとしては残さない）
X. Other (please specify)

[Answer]: A, B, C, D, E（arc の下書き。どれも記録の中で人が書いた決まりで、今の運用でも守っている。A = 作者と別の席の監査と統合、E = 失敗を隠さない = Shirube 開発規格 S8）

## Consolidated Summary Confirmation

- main への統合: 今のまま、席ごとの branch から PR を出し、merge commit で main に統合する。統合は作者と別の席が監査 PASS の後に行う（arc の下書き） [Q1]
- 端から端まで通る細い版: 作る。最初の作業単位で端から端まで通る細い版を作ってから機能を足す（薄片ごとに実証する決定と同じ）（arc の下書き） [Q2]
- 試験と実装の順番: 試験が先。失敗する試験を先に書き、それを通す実装を書く（pr34-u2-red → green の形を続ける）（arc の下書き） [Q3]
- 行の網羅率: 80% を目標にし、まず CI で測って記録だけする（統合を止める条件にはしない）。止める条件にするかは、測った値を見て Owner が決める。CI の設定を変える時は保護面として Owner の exact-head を通す [Q4]
- 配布の仕方: commit を固定して呼び、版上げは kit の PR。キットの版上げの PR（差分がキットの file だけ・kit check OK・上げる先は監査済みの shirube main）は、独立監査 PASS の後に各 repo の統合担当が統合し、PR ごとの exact-head は要らない。mode・必須検査・ruleset・profile・protected_paths・最初の導入は Owner の exact-head（arc の下書き） [Q5]
- ハードな決まりとして残すもの: 作る人が自分の作業を監査・承認・統合しない／PR に `json sds-pr` のブロックと risk の label を 1 つ／閾値を緩める変更を同じ PR で行わない／hygiene の検査に実行時の npm 依存を足さない／検査は読めない・壊れている時に失敗にする（arc の下書き） [Q6]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
