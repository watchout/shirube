<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-23T02:16:43Z — 2 回目: U1 だけ PR の数の決まりを「保護面の 1 本と実装の PR 3 本まで」に改めた（Q7 = A）。全部の Unit を緩める案（B）は、例が 1 つしか無い物を一般の決まりにするので採らなかった。計測を U2 へ移す案（C）は、細い版で計測までを通す確かめ（Delivery Planning の Q7）が無くなるので採らなかった。1 本あたりの上限（追加 400 行・20 file）は変えていない
- 2026-10-23T21:30:08Z — 3 回目: 監査の指摘 BF-04（3 本・400 行で成り立つ分け方が無い）を受け、U1 の実装の PR を 4 本までにした（Q8 = X、Owner の D）。1 本の上限を広げる案（B）は repo の全部の PR に効くので採らなかった。Owner の「PR の数を増やすのも冗長化と同じ。理由つきで超えてよい仕組みの方が効く」という考えは、後の Unit の候補として unit-of-work.md に記録した

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
