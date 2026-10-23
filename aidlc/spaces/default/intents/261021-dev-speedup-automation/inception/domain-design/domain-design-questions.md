# Domain Design — 部品の分け方の質問

承認済みの要件（`inception/requirements-analysis/requirements.md`）と物語（`inception/user-stories/stories.md`）を、どの部品（書くコードのまとまり）で受け持つかを決めます。決めるのは、部品の境目・持つデータ・呼び合う向きまでです。どこに置いて動かすか、技術の選択、型の細部は後の段で決めます。

今ある部品（`aidlc/spaces/default/codekb/shirube/component-inventory.md`）:
- 門 sds-gate（判定 1〜3）
- 判定 4（plan-binding）、判定 5（design-gate）
- 計画の受付（plan-admission。判定 4 にはまだつながっていない）
- 監査の受領（audit-admission）
- 配布キット（kit-cli）、hygiene の検査

無い物（要件の「まだ無いもの」）:
- 計測
- 「誤って止めた」件の分類の記録
- 設計の置き場の検査
- 門が AI-DLC の記録を読む橋
- 承認の記録

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [設計] 門の新しい判定（前の段の承認・設計の置き場）の置き方

要件の FR2（前の段の承認の記録を確かめる）と FR6（変更 path が設計の置き場の中か）を、どこに置くかを決めます。

A. 既存の門（sds-gate）に判定として足す。AI-DLC の記録と承認の記録を読む部分は、新しい部品「記録の橋」として分ける。設計の置き場の検査は、既存の判定 5（design-gate）を広げる
B. 既存の門とは別に、新しい門（別の commit status）を作る
C. 判定 5（design-gate）を広げて、記録の橋もその中に入れる
X. Other (please specify)

[Answer]: A（arc の設計。commit status を 1 つに保つと、必須の検査も Owner の決定も 1 つで済む。記録を読む部分は、決めてある別の Unit「門が記録を読む橋」= iyasaka-arc#49 6315688299 の 2 として分ける。置き場の検査は、設計の版を見ている判定 5 の持ち物なので、そこを広げる）

## Q2. [設計] 計測の部品の分け方

要件の FR1 の計算（中央値・90 パーセンタイル・率・半分の判定・切り替えの目安）と、GitHub から読む部分の分け方を決めます。チームの決まりでは、時刻と外部への問い合わせは引数で渡します。

A. 2 つに分ける: 計算の核（PR の一覧・時刻・分類を引数で受ける純粋な関数）と、GitHub から読んで核に渡す部分
B. 1 つの script にまとめる
C. 指標ごとに 4 本の script に分ける
X. Other (please specify)

[Answer]: A（arc の設計。時刻と外への問い合わせは引数で渡し、判定と計算の核は自分で時計や GitHub を読まない = Shirube 開発規格 S4、要件 NFR2。核を純粋にすると、同じ入力から同じ値が出ることを試験で示せる）

## Q3. [設計] #53 の W2 の報告への書込みの担い手

A. shirube の計測は結果（1 行の JSON と、#53 に載せる文）を出すだけにする。#53 への置き換えは、既存の W2 の道具（iyasaka-arc 側）が行う
B. shirube の計測が #53 を直接置き換える
X. Other (please specify)

[Answer]: A（arc の設計。#53 を書くのは既存の W2 の道具 1 つに保つ。shirube の計測が iyasaka-arc に書く資格情報を持たずに済む = Shirube 開発規格 S9（鍵は用途ごと）。要件 NFR10 の「書込みは最小」にも合う）

## Q4. [設計] 「誤って止めた」分類の記録の形

要件の FR5 で、監査の席（devauditor）が門の FAIL ごとに書く分類の形を決めます。

A. 既存の監査の返却の形（`sds-audit-review/1`）に、分類の欄を足す
B. 新しい形（例: `sds-gate-fail-classification/1`）を作り、その PR の comment に書く
X. Other (please specify)

[Answer]: B（arc の設計。分類は、監査の依頼の無い PR（R0・R1 など）で門が FAIL を出した時にも要る。今の監査の返却の形を変えると、固定の checker（shirube@b13192d0 の audit-admission.mjs）にも手が入る。数える時に読む形を 1 種類に保つ = Shirube 開発規格 S3）

## Q5. [設計] S1 の承認の記録の作り手

要件の FR2.2 では、門が承認として読むのは、Shirube が GitHub に公開する承認の記録の 1 種類だけです（S1 は `本人確認: なし` の印）。S1 で、その記録を誰がどう作るかを決めます。

A. Owner の AI-DLC の会話の記録（audit の承認）から、shirube の CLI が決まった形の承認の記録を作る。記録を repo に入れる PR に含める
B. arc が #49 に、承認の記録の comment を決まった形で書く
C. AI-DLC の audit の file そのものを承認の記録とし、門がそれを読む（設計 v4 §5 の形。#49 6315688299 は、橋の設計で置き換えるとしている）
X. Other (please specify)

[Answer]: A（arc の設計。門が読む承認の記録は「Shirube が GitHub に公開する 1 種類」で、S1 は「本人確認: なし」の印 = iyasaka-arc#49 6315688299 の 2。Shirube の CLI が Owner の AI-DLC の会話の承認から決まった形で作れば、人の手で写す間違いが入らない。C の「audit の file を門が直接読む」は、同じ決定で置き換えると決めた）

## Q6. [設計] 1 周の Owner の手として数える物の見分け方

要件の FR1.6 で、どの Owner の決定がこの 1 周に属するかの見分け方を決めます。

A. #49 の決定の印（`shirube-owner-decision/v1`）・exact-head・カードのうち、この intent か道筋（DP-SHIRUBE-001）を指す物だけを数える
B. 1 周の期間の中の Owner の決定を全部数える
X. Other (please specify)

[Answer]: A（arc の設計。1 周の数は、この intent か道筋 DP-SHIRUBE-001 を指す決定だけを数える。B だと OmotenasuAI など別の取り組みの決定まで入る。arc は #49 の決定の記録に、この intent を指す行を書く）

## Q7. [設計] 「Inception が先」（FR2.3）の置き場

A. 既存の計画の受付（plan-admission）に、今の段の採択の参照の検査を足す
B. 記録の橋で、道筋が指す製品の AI-DLC の記録を見て判定する
X. Other (please specify)

[Answer]: A（arc の設計。要件 FR2.3 は「採択の参照の無い道筋は、計画の受付が拒む」と決めている。今ある計画の受付（plan-admission）に足すのが、置き場として一番近い）

## Q8. [設計] 統合の後の fix の PR が、直す元の PR を示す形

要件の FR1.4 で、「統合の後に、その変更を直す PR」を数える方法を決めます（revert の PR は GitHub が自動で元の PR を書きます）。

A. PR の機械向けの block（`json sds-pr`）に、直す元の PR の欄を足す（作者が書く 1 行）
B. PR の本文の決まった文（例: `Fixes #N`）を読む
C. fix の PR には、監査の席が印を付ける
X. Other (please specify)

[Answer]: A（arc の設計。作者が書くのは PR の block の数行だけ = 要件 FR9.1 の範囲に収まる。B の「Fixes #N」は Issue を閉じる書き方で、PR を指す決まった形にならない。C は監査の席の仕事を増やす）

## Consolidated Summary Confirmation

- 門の新しい判定: 既存の門（sds-gate）に足し、commit status は 1 つのまま。AI-DLC の記録と承認の記録を読む部分は、新しい部品「記録の橋」に分ける。設計の置き場の検査は、判定 5（design-gate）を広げる（arc の設計） [Q1]
- 計測の部品: 計算の核（PR の一覧・時刻・分類を引数で受ける純粋な関数）と、GitHub から読んで核に渡す部分の 2 つに分ける（arc の設計） [Q2]
- #53 への書込み: shirube の計測は結果（1 行の JSON と #53 に載せる文）を出すだけ。#53 の置き換えは既存の W2 の道具が行う。要件 NFR10 の「書込みは最小」を、shirube の計測は何も書かない形に狭める（arc の設計） [Q3]
- 「誤って止めた」分類の形: 新しい形（例: `sds-gate-fail-classification/1`）を作り、その PR の comment に書く。監査の依頼の無い PR の FAIL にも使える（arc の設計） [Q4]
- S1 の承認の記録: Owner の AI-DLC の会話の承認から、shirube の CLI が決まった形の承認の記録（`本人確認: なし`）を作り、記録を repo に入れる PR に含める（arc の設計） [Q5]
- Owner の手の数え方: #49 の決定・exact-head・カードのうち、この intent か道筋 DP-SHIRUBE-001 を指す物だけを数える（arc の設計） [Q6]
- 「Inception が先」: 既存の計画の受付（plan-admission）に、今の段の採択の参照の検査を足す（arc の設計） [Q7]
- fix の PR: PR の機械向けの block に、直す元の PR の欄を足す（作者が書く 1 行）（arc の設計） [Q8]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
