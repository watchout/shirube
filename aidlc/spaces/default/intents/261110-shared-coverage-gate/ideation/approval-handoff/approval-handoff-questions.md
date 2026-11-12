# 共有の網羅率の門 — 取り組みの承認と引き継ぎの確認

## Prior Context

Ideation の成果を確認する問いです。承認済みの[目的](../intent-capture/intent-statement.md)、[関係者](../intent-capture/stakeholder-map.md)、[実現性](../feasibility/feasibility-assessment.md)、[制約](../feasibility/constraint-register.md)、[範囲](../scope-definition/scope-document.md)、[バックログ](../scope-definition/intent-backlog.md)、[体制](../team-formation/team-assessment.md)を引き継ぎます。

- 決定を Owner が対話で下す体制なので、「関係者全員の合意」は問いません。代わりに、記録が席の読める GitHub に載るかを聞きます（Q1）。
- 市場調査は、社内の開発基盤の改善で外部の市場が関わらないため飛ばした段です。Rough Mockups は、画面も API もない取り組みのため飛ばしました。この2つが無いまま進んでよいかを Q4 で確かめます。
- 体制の確認（席・容量・決める人）は、Team Formation で答え済みなので問い直しません。

## Q1. [Owner] Ideation の記録は、どこに載せますか？

席が別の会話に変わっても読めるようにするための質問です。Inception 以降の単位の PR には、Shirube の取り組みの記録（`aidlc/spaces/default/intents/261110-shared-coverage-gate/` の下）が入る決まりです。Ideation の記録（目的・関係者・実現性・範囲・体制・この段の成果）を同じ形で扱うかが、決まりに書かれていません。

A. 最初の単位の PR に、Ideation の記録も含める（`audit/` と `.aidlc-engine/` は含めない）。Shirube の issue #6 には、承認と引き継ぎの要約を1件だけ書く。
B. 最初の単位の PR には Inception 以降の記録だけを含め、Ideation の記録は作業場に置いたままにする。
C. まだ決めない。最初の単位の設計の段で決める。
X. Other (please specify)

[Answer]: A. 最初の単位の PR に、Ideation の記録も含める（`audit/` と `.aidlc-engine/` は含めない）。Shirube の issue #6 には、承認と引き継ぎの要約を1件だけ書く。条件: 公開の repo なので、PR に入れる前に、非公開の repo の識別子・code・席の model 名が記録に無いことを grep で確かめてから入れる。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q2. [Owner] 重大なリスクを承知して進めますか？

実現性の評価と制約の一覧にあるリスクのうち、進め方に影響する4つです。

- 子プロセスを含む測定は、現行の版での挙動が未確認。実測で数えられないと分かった場合、設計の段で Owner に諮る（独自の計測器は作らない）。
- 新依存（TypeScript・vitest、網羅率の提供部品）の承認が得られない場合、目的の項目 S1 の一部が検証できず、初版の完成条件は満たされない。
- 共有 workflow の追加・変更は保護対象で、PR ごとに統合前の Owner の対象 head の承認が要る。
- 起動の種類から `labeled`・`unlabeled` を外す件は、手元の `gate.mjs` がリスクのラベルを判定に使っているため、外せない可能性が高い。設計の段で実読と負例で確かめ、結果は arc を通じて Owner に伝える。

A. 4つを承知して進める。対策は上のとおり（実測の結果で Owner に諮る、新依存の依頼を早く出す、承認が出るまで該当の単位に着手しない、設計の段で確かめる）。
B. 追加の対策が要る。内容を添える。
C. 保留する。
X. Other (please specify)

[Answer]: A. 4つを承知して進める。対策は上のとおり。`labeled`・`unlabeled` の結果は、設計の段で出たら arc に知らせる。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q3. [Owner] 予算と資源は、追加なしで進めますか？

実現性の評価では、新たな有料サービスも常設のクラウド資源も導入せず、既存の GitHub Actions（Linux）で検証します。作る席は1席です。今回は CI の実行を減らす単位（S10）も入っていて、費用は下がる方向です。予算の額の変更は範囲の外です。

A. 追加の予算・資源なしで進める。必要になったら内容を示して別に判断する。
B. 追加が要る。内容を添える。
C. まだ分からない。
X. Other (please specify)

[Answer]: A. 追加の予算・資源なしで進める。必要になったら内容を示して別に判断する。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q4. [Owner] 市場調査と Rough Mockups が無いまま、Inception に進んでよいですか？

どちらも飛ばした段です。市場調査は外部の市場が関わらない社内の基盤のため、Rough Mockups は画面も API もないため、適用外としました。この取り組みで人が見る出力は、CI の通知と job summary の文面です。その中身は、Inception の機能の設計で決めます。

A. 進む。両方とも適用外のまま。通知と job summary の文面は、機能の設計の段で決める。
B. Rough Mockups だけ戻って、通知と job summary の文面の下書きを先に作る。
C. 両方とも戻る。
X. Other (please specify)

[Answer]: A. 進む。両方とも適用外のまま。通知と job summary の文面は、機能の設計の段で決める。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）

## Q5. [Owner] この取り組みを、Inception に引き継いでよいですか？（go / no-go）

引き継ぐ内容は、指定9項目と CI の実行の絞り（S10）、順序（B1〜B9。S10 を最初）、体制（作る席1席、独立監査 `devauditor`、統合は作者以外の `suite-lead`、守る物は Owner）、条件（新依存、保護対象、利用先の版上げの3つ）です。市場調査と Rough Mockups は適用外、Ideation の段のなかで、他に残っている判断は、新依存が承認されない場合の S1・B6 の扱い（Owner の判断）だけです。

A. go。Inception に進む。
B. go（条件付き）。条件を添える。
C. no-go。取り組みを止める（Reject Initiative）。
X. Other (please specify)

[Answer]: A. go。Inception に進む。理由: Owner が intent-capture で目的を決めた取り組みで、止める理由がない。（arcの答え。Ownerの言葉ではない。Ownerの委任 iyasaka-arc#49 6762288830。）
