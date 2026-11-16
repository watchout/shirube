# 機能設計の問い（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file（arc の指示）。この取り組みは refactor の scope で、units-generation と domain-design の記録は作られない（仕様どおり）。現状の構造は走査の記録（`inception/reverse-engineering/` と codekb）と公開 main の実物を正とする。
>
> 要件で決まっている形（宣言は対象ごと・同じ repo は不可・4 件まで・統合の版はちょうど 1 つ・宣言と完全一致かつ宣言の repo に実在・step 名を読まない）は聞き直しません。ここには、設計の途中で承認済みの要件と食い違うことが分かった 1 つだけを置きます。[Answer] は空けてあります。

## Q1. [依頼の形] 1 つの対象に必須の検査が 2 つ以上あるとき、宣言した追加の checkout を、どの検査の job の記録に求めるか

背景: 1 つの対象（PR）は、必須の検査を複数持てます（例: 検査 `test` と検査 `hygiene / hygiene`）。受付は検査ごとに job の記録を読みます。要件では、宣言は「対象ごと」に書き（Q1 の答え）、「宣言にあって job の記録に出ていない組があれば拒否」としました（FR2.4）。ところが、追加の checkout を持つのが片方の検査の job だけ（再利用の `hygiene.yml` を呼ぶ側の job だけが、固定 commit の checkout を足す、など。コードからの導出で、実 CI では未確認）のとき、要件の文のままでは、もう片方の job の記録に宣言した組が出ないので、依頼全体が拒否されます。たとえば、`hygiene / hygiene` の job だけが Common の固定 commit を checkout する PR は、`test` の job で拒否されて受け付けられません。承認済みの要件の文と実例の形が食い違うため、聞きます。

- A. 宣言した組を、その対象の必須の検査すべての job の記録に求める（要件の文のまま。どの job にも同じ追加の checkout が出る PR だけ受けられる。job ごとに形が違う PR は受けられない）
- B. 宣言は対象に 1 回書き、各 job の記録には宣言した組の一部だけが出てよい（各 job は、宣言に無い追加の commit があれば拒否し、宣言した組はその対象のどれか 1 つ以上の job の記録に出ていればよい。どの job にも出ない組は拒否）
- C. 宣言ごとに、どの必須の検査の job に出るかを名指しさせる（宣言に検査の名前を 1 つ結ぶ。名指した job の記録には必ずその組が出ていなければならず、名指していない job には出てはならない。検査の名前は、依頼がすでに対象ごとに宣言している必須の検査の名前と完全一致でなければならない。受付が job の名前や step の名前から除くことはしない）
- X. Other (please specify)

[Answer]: B. どれかの job に出ればよい（arc の答え。Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 による。Owner の言葉ではない）

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
