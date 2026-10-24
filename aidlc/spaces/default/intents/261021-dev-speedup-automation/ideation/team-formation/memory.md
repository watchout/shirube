<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-22T00:21:51Z — 質問ファイルに「arc の下書き」と書かれた答えが入っていたため、Owner の答えとはみなさず、要約の確認で Owner が確定するまでは下書きとして扱った; 答えの権限は Owner にあり、別の席の下書きをそのまま採ると Owner の決定を席が代わりに下すことになるため。空いていた Q3 は Owner に直接聞いた。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-22T00:21:51Z — 段階の説明にある時差・拠点・外部の協力会社（AWS Professional Services を含む）の質問は外し、代わりに「すでに進んでいる Shirube の S1 との関係」を最初に置いた; 席はすべてこの Mac と GitHub 上にあり、新しい席や外部ツールは最初の版で入れない（[IC-Q6]）ため。完了の条件が Shirube の S1 と同じになったので、二重の作業を避ける確認を優先した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-22T01:46:35Z — Approval & Handoff の途中で Owner が承認済みの Q6 を B から C に変える依頼をしたため、後の段の中で書き換える案と、段を開き直す案を示し、Owner が開き直すほうを選んだ; 開き直すと Approval & Handoff をもう一度通すことになるが、承認済みの記録を後の段から黙って書き換えずに済む。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
