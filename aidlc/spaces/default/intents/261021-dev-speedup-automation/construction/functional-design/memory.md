<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-23T01:57:05Z — U1（2 回目）: kit が target を shirube 自身とみなす条件を「target の .github/workflows/sds-gate.yml が on: workflow_call を持つ」とした（BR7.3）。監査の指摘 BF-03 の壊れ方（再利用 workflow の上書き）を、その file そのものを見て防ぐため。GitHub に問い合わせず、target の file だけで決まる
- 2026-10-23T01:57:05Z — U1（2 回目）: 段の順の記録の source_digest の範囲は、U1 の最小の形として intent の audit の shard 全体（名前の順に連結）の SHA-256 にした（BR5.6）。範囲の決め方は C9 の未決の問いとして U3 で決め直す
- 2026-10-23T01:57:05Z — U1（2 回目）: 段の順の記録の作り手は、承認の記録の作り手と同じ scripts/sds/approval-record.mjs に置き、新しい file は足さない（C9 の作り手は ApprovalRecordWriter）。置き場に docs/sds/distribution.md を足した（kit の自己用の書く先を、説明の文書にも合わせるため）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-23T01:57:05Z — U1（2 回目）: Q8 の答えの文は「C9 を受け渡しの形に足し、Contract Design の記録をこの段の中で直す」と書いているが、Owner の指示（2026-10-23）で Contract Design を開き直して C9 を足し、この段では contract-summary.md を直していない。Q8 の答えそのものは変えていない（Owner の指示: Q1〜Q9 はこのまま）
- 2026-10-23T04:37:19Z — U1（3 回目）: Q2 の答えの文「承認の記録は実装の PR より前に main に入れる」は、I1（承認の記録の作り手を入れる PR）には当てはまらない。Delivery Planning の Q10（Owner が承認）で、承認の記録の PR（A）を I1 の後に置いたため。I1 の記録の判定は記録だけで、FAIL でも止めない。Q2 の答えそのものは変えていない
- 2026-10-23T04:53:02Z — U1（4 回目）: 3 回目に functional-spec.md の W4 と rules.md の BR7.5 で、kit が書く 3 つの file を P1 に入れると書いたのは、Q11（置き場に足すだけ）を超えた書き過ぎだった。P1 は今の kit では作れず手で組むので、その記述を外した（U1 の NFR Requirements の Q8 = A、Owner が開き直しを選んだ）。置き場の block は変えていない
- 2026-10-23T06:58:54Z — U1（5 回目）: W4 と W5 を Delivery Planning の Q11 に合わせた。門は base の pin の commit から動くので、I1・I2 は U1 の前の門で判定され、新しい門で判定される最初の U1 の PR は K の後の I3 になる。kit の自己用の書く先は I1 で入り、kit が書く 3 つの file は K で入る。Q6 の答えそのもの（U1 の残りの実装の PR で確かめる）は変えていない
- 2026-10-23T23:14:42Z — U1（6 回目）: 2 回目の監査の返却（BF-07・BF-08・BF-04）で前の段に決まった事を写した（Q12）。BR2.6（PR が指す段の行に無効の印があれば FAIL）と BR5.8（承認の記録の file は書き換えず、同じ path なら bytes を比べる）を足し、BR2.1・BR3.3・BR5.1・BR5.5・entities を直した。PR の順は I1 作り手 → A → I2 kit と budget.mjs → I3 記録の橋と門 → K → I4 計測で、確かめの PR は I4。Q1〜Q11 の答えは変えていない

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-23T01:57:05Z — U1（2 回目）: C9 の決まりでは、門は PR が指す段（例: U1 の Code Generation）の行を段の順の記録の中に要る（BR2.3）。記録を入れる PR は、その段が AI-DLC で始まった後に作り直す必要がある。Code Generation は実装の席の AI-DLC の作業場で回すので、どの作業場の audit から段の順の記録を作るか、いつ記録を入れる PR を作り直すかを、Infrastructure Design（PR の順）で確かめる
- 2026-10-23T01:57:05Z — U1（2 回目）: docs/design/aidlc-include.md §5 は「門は PR の head の aidlc-state.md と audit の shard の承認の event を見る」と書いている。この段の Q2（main だけ）・Q8（段の順の記録だけ）と iyasaka-arc#49 6354411741（audit を公開しない）と食い違う。設計の文書の直しは U1 の置き場の外なので、arc の docs の PR で直す必要がある
