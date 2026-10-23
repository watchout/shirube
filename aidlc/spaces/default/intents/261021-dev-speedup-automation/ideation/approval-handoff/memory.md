<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-22T00:42:53Z — 段階の質問のうち「関係者全員が合意しているか」は「この記録を GitHub に載せるか」に置き換えた; 決定は Owner が対話で下す体制で、記録がこの Mac の作業場にしかないと、ARC や今ある席が正本として読めない（記録の正本は GitHub、意図の記録 Q9）ため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-22T00:42:53Z — 段の境目の確認で、範囲の段で足した 3 項目（作者の手間、Shirube 自身が門を通る、Onza への配布）に実現性の裏づけがないことを「注意」として残し、止めずに要件定義で確かめる形にした; 実現性の段を開き直すと Owner の手が増え、3 項目はどれも完了の条件か Owner の依頼から入ったもので、外すことはないため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
