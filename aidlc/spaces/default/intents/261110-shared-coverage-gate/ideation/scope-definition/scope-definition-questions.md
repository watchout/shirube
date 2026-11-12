# 共有の網羅率の門 — 範囲の確認

## Prior Context

承認済みの[目的](../intent-capture/intent-statement.md)、[実現性の評価](../feasibility/feasibility-assessment.md)、[制約の一覧](../feasibility/constraint-register.md)を引き継ぐ。指定9項目すべてが対象、初回は架空の利用例、実製品への適用・全repo一括導入・社内基準と既存80%の変更・独自の計測器・既存U1への取り込みは初版の対象外、新依存はarc-secの確認とOwner決定、保護対象は別承認、という点は再質問しない。

追加の依頼: Ownerの決定 [OD-COMPANY-CI-REDUCE-UNNEEDED-RUNS-20261111-001](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6787499810)（本文を確認済み）の 2(a)（kitの門の起動を、監査に関わるcommentの時だけにし、`pull_request_target`の起動の種類から`labeled`・`unlabeled`を外す）と、Shirube自身のciのconcurrency（同じPRの前の実行を取り消し、既定のbranchへのpushは取り消さない）を、この取り組みの範囲に入れる依頼を受けた。arcの接続の記録は[iyasaka-arc#24](https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6791240627)。この追加は承認済みの目的への追加なので、範囲での扱いを下の問いで確かめる。

この質問の答えは、Ownerの言葉のまま写す。Ownerの委任（iyasaka-arc#49 6762288830）でarcが答えた場合は、「Ownerの言葉ではない」と明記して写す。

## Q1. [Owner] 初版で、最低限そろえば価値が出る範囲はどこまでですか？

承認済みの目的は、指定9項目を満たす共有の門です。ここでは、それを「最低限」と「あると良い」に分けるかを決めます。

A. 指定9項目すべてを最低限の範囲（Must）とする。9項目のどれも後の版へ回さない。
B. 指定9項目のうち、Node組込み試験と判定・出力に関わる項目を最低限とし、TypeScript・vitest、子プロセス、DB別jobの一部を後の版へ回す。回す項目を添える。
C. 最低限の範囲はまだ決めない。
X. Other (please specify)

[Answer]: A. 指定9項目すべてを最低限の範囲（Must）とする。9項目のどれも後の版へ回さない。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。理由: 目的の答えが「指定9項目すべてを目的に」で、初版の完成の条件も9項目の正例・負例のため。見込みの項目は設計と試験の段で実測する。）

## Q2. [Owner] 追加の依頼（kitの門の起動の絞りと、Shirube自身のciのconcurrency）を、この取り組みの範囲にどう入れますか？

2つとも、網羅率の門そのものではなく、CIの無駄な実行を減らす直しです。どちらもworkflowの変更で、保護対象です。段の承認は、変更の実行許可ではありません。統合前にOwnerのexact-headが要ります。

A. 指定9項目とは別の単位として、最低限（Must）に入れる。完了の条件にも加え、承認済みの目的の記録に追加の根拠（上の決定のURL）を残す。
B. 範囲には入れるが、指定9項目より後の順にする（Should）。完了の条件には加えない。
C. この取り組みには入れず、別の取り組みにする。
X. Other (please specify)

[Answer]: A. 指定9項目とは別の単位として、最低限（Must）に入れる。完了の条件にも加え、承認済みの目的の記録に追加の根拠（[#49 6787499810](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6787499810)、[#24 6791240627](https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6791240627)）を残す。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q3. [Owner] 門の起動を絞る時、`labeled`・`unlabeled`を外してよいかの確かめをどう扱いますか？

手元の`scripts/sds/gate.mjs`は、PRのrisk:R0〜R4のラベルを判定に使っています（ラベルがちょうど1つあること、PR本文の値と一致すること）。決定の 2(a) は`labeled`・`unlabeled`を「門の判定に効かない物」として外すとしていますが、ラベルを付け替えた後に古い判定が残ると、誤った合格または不合格が残るおそれがあります。

A. 範囲では「起動の絞り」までを決め、`labeled`・`unlabeled`を外してよいかは、設計の段で実際の判定の読取りと負例（ラベルを付け替えた後に古い判定が残らないこと）で確かめる。確かめて問題があれば、Ownerに諮る。
B. ラベルを判定に使っているので、`labeled`・`unlabeled`は外さない。それ以外の起動の絞り（監査に関わるcommentの時だけにする）だけを範囲に入れる。
C. 決定のとおり外す。ラベルの扱いは確かめない。
X. Other (please specify)

[Answer]: X. 範囲は「起動の絞り」までとする。`labeled`・`unlabeled`は、設計の段で`gate.mjs`の実読と負例（ラベルを付け替えた後に古い判定が残らないか）で確かめる。ラベルが判定に効くと確かめられたら外さない（決定の1「必須の検査の中身を弱めない」と、2(a)の「判定に効かない物を外す」の条件に従う。決定の括弧にある「labeled・unlabeled」は、記録した事実の誤りとして扱う）。結果はarcに知らせ、arcがOwnerに伝える。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q4. [Owner] 優先の付け方は、何を先にしますか？

実現性の評価では、子プロセスの計測が最大の不確実さ、新依存の承認が止まりうる点でした。

A. リスクの高いものを先に確かめる。子プロセスと新依存の承認の依頼を、最初の単位に置く。
B. 価値の大きいものを先にする。判定・出力（閾値、未計測の扱い、段階的な導入、結果の出力）を先に作り、リスクの高いものは後に置く。
C. 依存の順に従い、Aで先に確かめた結果で変えてよい。
X. Other (please specify)

[Answer]: X. 追加の単位（CIの絞り）を最初に置く（小さく、CIの費用をすぐ減らすため）。その後はリスクの高いものを先に置く（新依存の承認の依頼を早く出す、子プロセスの実測）。確かめた結果で順を変えてよい。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q5. [Owner] 能力ごとに、外から決まった完了の条件（他の取り組みや承認の完了が前提になるもの）はありますか？

この質問は、時間の言葉ではなく、完了の条件で聞きます。たとえば、利用先への導入の前提となる新依存の承認、共有workflow追加の承認、kitの版上げが該当します。

A. 外から決まった完了の条件は、すでに記録している3つ（新依存のarc-sec確認とOwner決定、共有workflowの追加などの保護対象の別承認、kitの版上げを利用先で扱う別の判断）だけ。ほかにはない。
B. ほかにもある。内容を添える。
C. まだ分からない。
X. Other (please specify)

[Answer]: A. 外から決まった完了の条件は、すでに記録している3つ（新依存のarc-sec確認とOwner決定、共有workflowの追加などの保護対象の別承認、kitの版上げを利用先で扱う別の判断）だけ。ほかにはない。workflowの変更のPRは、統合の前にOwnerのexact-headが要る（保護対象の別承認に含む）。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q6. [Owner] 初版の範囲の外（Won't）は、どう置きますか？

承認済みの目的の対象外は、全repoへの一括導入、社内基準と既存80%の変更、独自の計測器、既存U1への取り込みです。

A. 目的の対象外をそのままWon'tとして置く。追加の依頼の「必須の検査の名前・数・branch protectionの変更、試験の中身を減らすこと、repoの公開・非公開の変更」（決定の「含まないもの」）もWon'tに加える。
B. 目的の対象外だけを置く。
C. まだ決めない。
X. Other (please specify)

[Answer]: A. 目的の対象外をそのままWon'tとして置く。追加の依頼の「必須の検査の名前・数・branch protectionの変更、試験の中身を減らすこと、repoの公開・非公開の変更」（決定の「含まないもの」）もWon'tに加える。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）
