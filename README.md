# Shirube

Shirube is the small control layer of IYASAKA's repositories: it checks that a change stays within its
contract (scope, size, duplication, unused code, dependency direction, exceptions, secrets), that acceptance is
counted from adopted IDs and real evidence, and that protected operations go through the owner. It does not run,
deliver, recover or remember anything — those belong to AUN, Kusabi and the product repositories.

This repository is being built by selective migration from `ai-dev-framework` (handover list v5 in
`watchout/iyasaka-arc`, `cross-cutting/decisions/2026-09-25-shirube-handover-list.md`). Own code is capped at
1,500 lines (an internal budget, checked by `scripts/hygiene/own-code-budget.mjs`).

## What is here (W1 — hygiene)

| path | what |
|---|---|
| `.github/workflows/hygiene.yml` | reusable workflow: file length vs baseline, PR size, large files + secret-suppression guard, jscpd, knip, dependency-cruiser, ESLint structural run, ESLint guard-only run, gitleaks (pinned by sha256), optional ruff / vulture |
| `scripts/hygiene/*.mjs` | the checks that are not an off-the-shelf tool (baseline, PR size, large files, jscpd inventory guard, own-code budget). No runtime dependencies |
| `configs/` | the two ESLint configs (structural-only, guard-only) and templates for `knip.jsonc` and `.dependency-cruiser.cjs` |
| `templates/` | PR, Issue, ADR, hygiene profile, runbook, owner decision, one-page spec, AGENTS overlay |
| `docs/` | boundary (one diagram), threats and failures, ADR-001, the one-page spec of W1 |
| `.shirube/hygiene-profile.md` | this repository's own profile: the checks run on Shirube itself |

## How a consumer repository uses it

1. Copy `templates/hygiene-profile.md` to `.shirube/hygiene-profile.md` and fill the `json` block (language, include /
   exclude globs, generated paths, exceptions, limits). Copy `configs/knip.template.jsonc` → `knip.jsonc` and
   `configs/dependency-cruiser.template.cjs` → `.dependency-cruiser.cjs`, and add the dev tools to the lockfile:
   `eslint`, `@eslint-community/eslint-plugin-eslint-comments`, `eslint-plugin-unicorn`, `jscpd`, `knip`, `dependency-cruiser`
   (`@typescript-eslint/parser` for TypeScript).
2. Call the workflow, pinned to a resolved commit (never a branch):

   ```yaml
   jobs:
     hygiene:
       uses: watchout/shirube/.github/workflows/hygiene.yml@<commit sha>
       with:
         profile: .shirube/hygiene-profile.md
         targets: src bin
         node-version: "24"
       secrets:
         SHIRUBE_READ_TOKEN: ${{ secrets.SHIRUBE_READ_TOKEN }}
   ```

3. Introduce it as `report_only` with an `enforce_by` date, then make it a required check. Introduction is complete only
   when every applicable AB row (anti-bloat v5 §7) has passed in that repository and AB-14 (a defective PR is rejected
   and a correct PR is allowed by the real required check) is recorded.

## Preconditions that only the owner can set (protected surfaces)

- Actions access of this repository must allow calls from organization repositories (repository setting).
- While this repository is private, consumers need a read token (`SHIRUBE_READ_TOKEN`, Contents: read) to check out
  the scripts; making the repository public removes that need. Both are owner decisions, not PR content.
- Registering the workflow as a required check in a consumer repository is a branch-protection change (owner).

## Every check fails closed

Each script prints one JSON line `{check, verdict, ...}`; exit 0 = PASS, 1 = FAIL, 2 = cannot observe (missing profile,
git failure). Nothing in the workflow hides a failure. An empty scan is distinguished from a misconfigured one
(`jscpd-guard`), and a baseline that was not lowered after a file shrank is a failure, not a pass.

## Working on Shirube itself

`npm ci && npm test` runs the unit tests (real git repositories in a temp dir); `npm run lint:structural`,
`npm run lint:guard`, `npm run hygiene:lines`, `npm run hygiene:jscpd`, `npm run hygiene:budget` run the same checks
on this repository. Changes to rules, checkers, configs or thresholds follow SR-01..03 (handover v5 §1 SR): the previous
adopted baseline and an independent review are the basis, never a threshold loosened in the same PR.
