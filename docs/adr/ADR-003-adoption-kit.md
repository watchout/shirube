# ADR-003 — The SDS adoption kit is one checklist that links decisions, not a document that restates them

Status: proposed (design 0.1.5; owner instruction iyasaka-arc#49 5907926613). Adopted claims: P3 ADR (SRC-M-05), P11 Diátaxis / docs-as-code (候補, applied as 社内条件).

## Context

On 2026-09-30 the same five failures recurred while applying already-settled standards (spec's count in shirube#16: progress records treated as adoption records, colliding ID families, a classification kept in two places, a template PR over its budget, the audit checklist's canonical copy living in another repository) [検証済: shirube#16 §Business Reason]. The owner's instruction: a new repository or lane must not redo this hammering-out.

## Decision

1. The kit is a single entry file with an eight-row checklist; each row links (never restates) the template or decision it depends on, and its `state` cell stays visibly unfilled until a URL is provided.
2. Three rules travel with the table: adoption needs an adoption-record URL (a progress record is not one); new ID families are checked against the existing ones and the prefix is recorded; each classification lives in exactly one table.
3. The audit v1 checklist's canonical copy lives in this repository (`docs/audit/`); other repositories point here.
4. The kit is documents and templates only, ≤ 150 lines under `templates/adoption/`; enforcement of the kit's own filling is a later tool (W6 seat readback), not a script inside the kit.

## Consequences (including what gets worse)

- A new repository reaches "eight items filled" by following links; the cost is that links must stay valid (A2 checks them at audit time; a dead link is a finding, not a silent gap).
- The 150-line budget forces guidance to live at the linked source; readers follow one more link.
- Until W6 exists, "filled" is asserted by hand and verified by the auditor — the same trust boundary as today's PR body fields.

## Retired requirements (AM-03)

| ID | reason | replaced by |
|---|---|---|
| — | none | — |
