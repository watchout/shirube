# U2 — Logical Components

## Sources and Scope

U2（実物に基づく導入状態・設定・規格の対話）の論理の部品。入力: [functional-spec](../functional-design/functional-spec.md)（W01〜W07・項目状態機械）、[rules](../functional-design/rules.md)（BR1〜BR9）、[entities](../functional-design/entities.md)、NFR 要件 6 文書（[tech-stack-decisions](../nfr-requirements/tech-stack-decisions.md) ほか）、[contract-summary](../../../inception/contract-design/contract-summary.md)。確認は [questions](nfr-design-questions.md) の要約確認 Looks correct（決定 116・120 と対象の結びを足した後に取り直し済み）。本書は設計であり、実装・測定・試験の結果ではない。

論理の部品は「何が何を持つか」だけを決める。物理の置き場（file・CLI 入口・行の網羅率の分母）は Infrastructure Design で決め、ここでは file 名・module 名を決めない。

## Components

判定は核（LC2〜LC5）だけが持つ。adapter（LC1・LC6）は I/O・時計・形式だけを持ち、分類・比較・判定をしない。1 つの規則の判定の持ち主は 1 部品で、I/O の部分だけを adapter が受け持つ。

| ID | 部品 | 種類 | 判定の持ち主である規則 | 持つ物 |
|---|---|---|---|---|
| LC1 | 観測の読取り | adapter（I/O、時計） | なし（BR1.1・BR1.4・BR1.5・BR1.6 の I/O の部分だけ） | 実対象の解決（実体の事実を返すだけ）・読取り・道具の起動・時計の読み。予算の枠での停止（時間・出力の大きさ・回数。予算の値は profile を読んで適用する）。子 process は自分の process group で起動し、枠を超えたら group ごと止める。返すのは生の事実だけ: 解決した実体（path・同一性・根との位置関係の事実）、読取りの前後の digest と大きさ、所要時間、読んだ大きさ、終了コード、出力、止めたか・止めたと確かめられたか。分類・比較・判定はしない |
| LC2 | 観測の解釈 | 核（純粋） | BR1.1、BR1.2、BR1.3、BR1.4、BR1.5、BR1.6、BR2.1、BR2.2、BR2.3、BR3.4（file の破損 = malformed）、BR9.1 | LC1 の生の事実と呼出側の明示入力（targetRef・予算の値）から Observation（observed / unavailable）を組み立てる。BR1.1: 対象の指定の有無、出典が名指す対象との比較（wrong_target）。BR1.4: 測った値と予算の値を比べた分類（budget_exceeded・timed_out）。BR1.5: 解決した実体の事実から根の内外・同じ実体・付随ファイルの判定（out_of_boundary）。BR1.6: 読取り前後の digest の比較（changed_during_read）。BR2.x: 道具の分類（present・unsupported_version・cannot_start・missing・timed_out）、必要な版との 3 値比較、未導入の確定。止められなかった・止めたか確かめられなかった事実は観測不能にする。観測の単位 (targetRef, itemKey, sourceRef) ごとに observedAt が最も新しい 1 つだけを選び、同じ項目の別の出典の観測は捨てずにすべて LC3 へ渡す（BR9.1）。同じ時刻で内容が違う 2 件は観測不能。LC5 が使う「観測の事実」（BR8.3）の元になる、可否・有無・値の digest・原因を実際に読んだ結果から出す。BR1.1 の対象の結び: 出典ごとの targetBinding（by-location / named。書かれていなければ named）から targetMatch（matches / differs / unspecified）を決め、differs は wrong_target、unspecified は観測不能（原因 malformed。新しい原因は作らない）にする。**観測値の取り扱い（Owner の決定 116・120）:** 分類の前の値は LC2 の中だけで持つ。LC2 は LC3 が持つ判定の関数（`value-exposure.mjs`。末端の純粋な関数）を呼んで、保持できる値か保持しない分類（withheld）かを決め、観測の事実には閉じた形（valueForm = closed）で形式に合う値の valueDigest だけを載せる。開いた形（open）の値は保持も digest もせず、同じ項目の全出典（最新 1 件を選んだ後）を normalization の規則でメモリ上だけで比べて matchGroup の番号を振り、presence・lengthBucket・matchGroup だけを事実に残して値を捨てる。事実の項目は {availability、targetMatch、presence（targetMatch = matches の時だけ）、valueDigest（閉じた形だけ）、lengthBucket・matchGroup（開いた形で presence = value の時だけ）、withheld、unobservableCause} |
| LC3 | 項目状態 | 核（純粋） | BR3.1〜BR3.3、BR3.4（値の型・形式・範囲の不正と秘密らしい観測値 = invalid。開いた形の値も同じ判定の対象）、BR3.5、BR5.2 の判定の関数（`value-exposure.mjs`。他の部品を import しない末端の純粋な関数で、観測値の呼び出し（LC2 が値を外へ出す前）と回答の呼び出し（LC5）の両方が使う唯一の持ち主）。出典の対象の結びが unspecified の単位は unavailable（原因 malformed）として数える（BR3.1）。開いた形の項目の「有効な値」は presence = value で表し、値が異なるかは出典どうしの matchGroup が違うことで決める（値は持たない） | 出典ごとの観測を value・absent・unavailable・wrong_target・invalid に分け（invalid の出典は値・digest・候補を持たず、項目・出典・固定の分類だけを DraftItem.invalidSources に載せる。Owner の決定 116（iyasaka-arc#49 の 6962989955、本文 SHA-256 `3986367d…`））、必須の出典（requiredForConfirmed。書かれていなければ必須）が absent なら confirmed にしない。項目状態を 1 つ決める唯一の持ち主。candidates（順位なし）。BR3.4 の持ち主は 2 つに分かれる: 出典の file の破損（malformed）は LC2、値そのものの不正（invalid）は LC3。**回答を入力に取らない** |
| LC4 | 質問と案内 | 核（純粋） | BR4.1〜BR4.4、BR7.1〜BR7.7、BR9.2、BR9.4 | LC3 の項目状態と LC5 の有効な回答の集合（引数）から、質問の対象と GuidanceMessage の内容・順序・平文の形を決める。U1 の理由コードは読むだけ |
| LC5 | 回答・draft・選択 | 核（純粋）＋対話ごとの値 | BR5.1〜BR5.4、BR6.1〜BR6.5、BR8.1〜BR8.3、BR8.5 | 回答の検査（型・長さ・文字。秘密らしさの判定は LC3 の `value-exposure.mjs` を呼ぶ）、保持、観測 digest との結び（BR6.2 の唯一の持ち主。回答は boundObservationDigest を 1 件持つ。無効化が検出するのは、閉じた形では値の digest の変化、開いた形では presence・lengthBucket・matchGroup・出典・対象の結び・原因の変化までで、開いた形の中身だけの変化は検出しない = U2 が保証しないこと。開いた形の回答は「回答済み」のままで一致を確認済みと示さず「比べられず観測できず」と示す）、無効化、ConfigurationDraft と draftDigest の組み立て（項目状態と有効な回答と observationRefs から）、GuidanceSelection、draft の古さの判定（BR8.3 の唯一の持ち主。観測の事実から observationDigest を再計算する。参照名からは作らない）、C02 の既存の受渡し形への変換 toC02Wire（BR8.5 の唯一の持ち主。answers は object、guidance は string。内部の構造体を保つ。開いた形の回答の値は answers にだけ現れ、BR5.2 の選別と fail closed を通ったものに限る。wire 以外へは写さない。受け手側の扱いは U2 が保証しない） |
| LC6 | 表示の escape | adapter（形式だけ） | なし（BR7.2・BR8.2 の escape の部分だけ） | 外から来た文字列の表示先ごとの escape。文言の意味・判定を持たない。BR7.2（平文の形）の判定は LC4、BR8.2（命令として評価しない）の判定は LC5 |
| LC7 | 網羅率の記録 | 試験時の記録生成 | なし（NFR1.1・NFR1.1b の記録の生成だけ） | 試験の中で子 process に Node の lcov を流して解析し、機械可読な記録を作る |

**LC1 の線引き:** LC1 は分類・比較・判定を持たない。実体の解決と読取りは 2 段に分け（解決 → LC2 が根の内外を判定 → LC2 が許した実体だけを LC1 が読む）、判定の前に根の外を読まない。止めるのは枠（時間・出力の大きさ・回数）という機構で、超過かどうかの分類は LC2 が測った値から決める。

**全部品が守る規則（持ち主を 1 つにしない横断）:** BR8.4（外部への効果 0）は全部品が守り、構造の試験で効果の経路（書込み・push・投稿・network）が核に無いことを確かめる。BR9.3（架空 fixture・非公開本文を写さない）は試験と成果物が守る（security-design SC6）。

## Dependency Direction

矢印 `A → B` は「A の出力を B が引数（明示入力）で受ける」を表す。import の向きも同じで、逆向きの import は無い。

```text
LC1 → LC2 → LC3 → LC5 → LC4
          LC2 ────→ LC5   (観測 digest・observationRefs)
LC3 ────────────→ LC4   (項目状態)
LC4・LC5 の出力 → LC6   (表示の直前。核は LC6 を import しない)
```

- 判定の関数 `value-exposure.mjs`（秘密らしさ・許される形式）は他の部品を import しない末端の純粋な関数で、LC2（観測値を外へ出す前）と LC5（回答の検査）が呼ぶ。LC2 が LC3 の項目状態の関数を import するわけではないので、向きの逆転も循環も起きない。関数の定義と判定の持ち主は 1 か所（S3）。
- LC3 は回答を受け取らない。項目状態は観測だけから決まり、回答は項目状態を変えない（回答済みでも項目は missing・conflict のまま、回答の状態は別。functional-spec の状態機械）。したがって LC3 と LC5 の間に循環は無い。
- 再観測で digest が変わった時の流れ: LC2 が新しい Observation を作る → LC3 が BR3.1 で項目状態を決め直す → LC5 が回答の結び先の観測 digest と比べて無効化し、有効な回答の集合を出す → LC4 がその集合と項目状態から質問を決める。「BR3.1 で再評価」は LC3 の再実行を指し、LC5 が項目状態を決めない。
- 核（LC2〜LC5）は LC1・LC6・LC7 に依存しない。時刻・識別子・観測は呼出側が明示入力で渡す（S4）。LC1 だけが時計と I/O を持つ。
- 予算: LC1 が信頼版の profile を読んで読取りの枠として適用し、適用した予算の識別（profile の版・値）を測った値と一緒に LC2 へ明示入力として渡す。対象側（PR・配布先・利用者の回答）が渡す値は使わない。核は予算の数値を定数として持たず、LC2 が渡された値と測った値を比べて超過を分類する（LC1 は枠で止めて測った値だけを返す）。

## Failure Domains and Blast Radius

| 領域 | 失敗の例 | 閉じ込める範囲 | 外に出さないこと |
|---|---|---|---|
| 1 つの出典の読取り（LC1） | 読めない・予算超過・読取り中の変化・破損・子 process を止められない | その出典の項目だけ観測不能または invalid。止められなかった・止めたか確かめられなかった時も、成功にせず観測不能。読めた別の出典は使い続ける（NFR6.1a） | 空の値や既定値で埋める、成功に読み替える |
| 1 つの観測値（LC2・LC3） | 秘密らしい・形式に合わない値、開いた形の値 | その項目・出典だけ invalid（値・digest・候補・案内文を作らず、項目・出典・固定の分類だけ）。開いた形は形式に合っても値を持たず、presence・lengthBucket・matchGroup だけ。他の出典・他の項目は使い続ける | 値・digest を LC2 の関数の外へ出す |
| 1 件の回答（LC5） | 不正・過大・秘密らしい入力 | その回答だけ rejected。他の回答は残る（BR5.3） | 入力の写し・digest を持つ |
| 1 つの対話（全体） | 対話が閉じる・process の終了 | その対話の回答・draft・選択だけが消える（Q2 = A） | 別の対話の状態を読む（NFR4.3） |
| 表示（LC6） | escape 先の不明 | 表示を失敗にして生の文字列を出さない | 外から来た文字列をそのまま命令・markup として出す |

## Shared Resources

- 予算の profile（時間・総時間・回数・応答の大きさ・自動再試行 0）: 持ち主は信頼版の tools（U1 の規則 policy.budget）。U2 は読むだけで複製しない（NFR6.1、S3）。
- U1 の理由コードの集合: 持ち主は U1。LC4 は読むだけで新設しない（NFR5.2）。
- 共通契約の形（Observation・C02・E05）: 持ち主は契約。U2 は変えない（NFR8.2）。
- 診断の出先: U2 自身は file・log を書かない。診断（観測の参照・理由・件数）は、呼出側へ返す値（Observation・GuidanceMessage・ConfigurationDraft）と試験の出力だけに載せる。呼出側が記録する先は呼出側の持ち物で、U2 は保存しない（Q2 = A）。
- 対話ごとの状態: 部品どうしで共有する可変の状態は無い。回答・draft・観測は対話ごとの値として渡す（NFR4.3）。

## Placement Not Decided Here

どの file・どの入口（既存の対話・CLI への組込み）に置くか、行の網羅率の対象集合と分母は、Infrastructure Design で決める。確定するまで、100% を達成済みとも対象を全体とも示さない（NFR1.1）。

仮定 A-07（functional-spec）: initialCatalog の出典の割当（例: protected_paths = sds_pin、required_checks = workflow_caller と sds_pin）は設計時点の想定で、実物の位置・形式との突き合わせを Infrastructure Design で行って確定する。突き合わせるまでは「確認できず」として扱い、確認済みと示さない。

## Structural Checks (design)

構造の試験で確かめる: LC1・LC6 に分類・比較・判定が無い（LC1 は生の事実だけ返す）。LC1 が子 process を group ごと止める経路を持ち、止めたか確かめられない時の戻り値が成功にならない。核が `Date`・乱数・UUID・環境変数・file・子 process・network を使わない。LC3 が回答の型を import しない。`value-exposure.mjs` が何も import せず、LC2 と LC5 が同じ関数を呼ぶ（定義の複製が無い）。開いた形の値が LC2 の関数の外（返す Observation・事実・draft・案内・試験の出力）に現れない。部品の import に循環が無い。1 つの規則の判定の持ち主が 1 部品だけである。

## Assumptions & Open Questions

None。仮定: 部品の数と分け方は論理の設計で、物理の置き場で変えうる。変える時はこの文書と追跡表を先に直す。
