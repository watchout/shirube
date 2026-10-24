<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-22T00:18:26Z — 完了の条件を記録済みの Owner 決定（S1-SH-01〜07）に揃えたとき、「必ず入れるもの」が完了の条件より狭くならないよう、S1-SH-02・03・05・06 も Must に加えるかを確認した; 範囲と完了の条件が食い違うと、後の段階で「完了できない範囲」になるため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-22T00:18:26Z — 順番の方針は「価値の大きいものから」だが、計測だけは先頭に置いた; 承認済みの実現性の条件 C3（門で止め始める前に今の値を測る）を守らないと「半分」が判定できないため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
