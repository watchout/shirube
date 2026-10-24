<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-10-23T04:39:26Z — U1（3 回目）: この会話が U1 の Functional Design の W4 で、P1 の中身に「kit が書く file」と書いたのは、Q11 の答え（置き場に足すだけ）を超えた書き過ぎ。P1 は今の kit では作れず手で組むので、3 つは P1 に入らない。直し方は Q8 で Owner に伺う。Q8 は arc の勧めが書かれた後に書き直したので、arc に勧めの書き直しを頼んだ
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
