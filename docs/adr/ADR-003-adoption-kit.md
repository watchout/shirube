# ADR-003 — The SDS adoption kit is one checklist that links decisions, not a document that restates them

Status: proposed (design 0.1.5 v2; owner instruction iyasaka-arc#49 5907926613; design audit BLOCK 5918787188 answered in v2). Adopted claims: P3 ADR (SRC-M-05), P11 Diátaxis / docs-as-code (候補, applied as 社内条件).

## Context

On 2026-09-30 the same five failures recurred while applying already-settled standards (spec's count in shirube#16: progress records treated as adoption records, colliding ID families, a classification kept in two places, a template PR over its budget, the audit checklist's canonical copy living in another repository) [検証済: shirube#16 §Business Reason]. The owner's instruction: a new repository or lane must not redo this hammering-out. Provenance of the canonical checklist: it is moved from the iyasaka-arc repository, file `cross-cutting/decisions/2026-09-30-sds-audit-v1-source-checklist.md` at commit `eb0e9888836d4c3b2467c881a0be7547d0cc6f56` (69 lines) [検証済: read 2026-10-01; source sha256 `96fc690d3be1db8915842866006673d25a00195ae37882036cc77ea966b827fe`; L35 corrected against Google’s original approval standard, independent delta review pending]; that path is recorded here and nowhere else in this repository, so a live reference to the old copy is detectable (design A3).

## Decision

1. The kit is a single entry file with an eight-row checklist; each row links (never restates) the template or decision it depends on, and its `state` cell stays visibly unfilled until a URL is provided.
2. Three rules travel with the table: adoption needs an adoption-record URL (a progress record is not one); new ID families are checked against the existing ones and the prefix is recorded; each classification lives in exactly one table.
3. The audit v1 checklist's canonical copy lives in this repository (`docs/audit/`); other repositories point here.
4. The kit is documents and templates only. **Its four files — the three under `templates/adoption/` and the canonical checklist — share one budget of 150 lines** (v2; v1 left the checklist outside the budget, which the design audit rejected as a requirement change). Enforcement of the kit's own filling is a later tool (W6 seat readback), not a script inside the kit.
5. **The checklist table is the authority and the `sds_adoption:` YAML block is a projection of it** (v2): the reader recomputes the filled set from the table; a difference between the two is a mismatch and counts as not filled.

## Alternatives not taken

- One document per item (rejected: several canonical places, a classification repeated, more lines).
- Keeping the checklist in iyasaka-arc and linking it (rejected: AK-04 requires the canonical copy here).
- Counting the checklist outside the 150 lines (rejected by the design audit: the requirement says the kit in total).
- A validator script inside the kit (rejected: AK-08 says no code; W6 is the later tool).

## Consequences (including what gets worse)

- A new repository reaches "eight items filled" by following links; the cost is that links must stay valid (A2 checks them at audit time; a dead link is a finding, not a silent gap).
- The checklist's 71 lines take half the budget, so the three kit files hold at most 79 lines; guidance lives at the linked source and readers follow one more link.
- Until W6 exists, "filled" is asserted by hand and verified by the auditor against the table — the same trust boundary as today's PR body fields; a YAML that disagrees with the table is never trusted.

## Retired requirements (AM-03)

| ID | reason | replaced by |
|---|---|---|
| — | none | — |
