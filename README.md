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
| `.github/workflows/hygiene.yml` | reusable workflow: targets coverage, file length vs baseline, large files + gitleaks-config guard, jscpd, knip, dependency-cruiser, ESLint structural run, ESLint guard-only run, gitleaks (pinned by sha256; a second `--ignore-gitleaks-allow` pass makes every marker-hidden finding need a registered exception), PR size, optional ruff / vulture (pinned) |
| `scripts/hygiene/*.mjs` | the checks that are not an off-the-shelf tool (targets coverage, file-length baseline, structural baseline around ESLint, PR size, large files + config guard, secret-suppressions, jscpd inventory guard, own-code budget) and the one baseline rule they share (`judgeBaseline` in `lib.mjs`: frozen at introduction, only goes down). No runtime dependencies |
| `configs/` | the two ESLint configs (structural-only, guard-only; files / ignores / parser come from the profile via `profile-eslint.mjs`) and templates for `knip.jsonc` and `.dependency-cruiser.cjs` |
| `templates/` | PR, Issue, ADR, hygiene profile, runbook, owner decision, one-page spec, AGENTS overlay |
| `docs/` | boundary (one diagram), threats and failures, ADR-001, the one-page spec of W1 |
| `.shirube/hygiene-profile.md` | this repository's own profile: the checks run on Shirube itself |

## How a consumer repository uses it

1. Copy `templates/hygiene-profile.md` to `.shirube/hygiene-profile.md` and fill the `json` block (language, include /
   exclude globs, generated paths, exceptions, limits). Copy `configs/knip.template.jsonc` → `knip.jsonc` and
   `configs/dependency-cruiser.template.cjs` → `.dependency-cruiser.cjs`, and add the dev tools to the lockfile
   (`package-lock.json` for npm, `bun.lock` for bun): `eslint`, `@eslint-community/eslint-plugin-eslint-comments`,
   `eslint-plugin-unicorn`, `jscpd`, `knip`, `dependency-cruiser` (`@typescript-eslint/parser` for TypeScript).
2. Call the workflow, pinned to a resolved commit (never a branch). `targets` are directories or tracked files (a root
   entry point such as `server.ts` is named as itself):

   ```yaml
   jobs:
     hygiene:
       uses: watchout/shirube/.github/workflows/hygiene.yml@<commit sha>
       with:
         profile: .shirube/hygiene-profile.md
         targets: src bin server.ts
         node-version: "22"
         package-manager: npm   # or bun (bun install --frozen-lockfile)
       secrets:
         SHIRUBE_READ_TOKEN: ${{ secrets.SHIRUBE_READ_TOKEN }}   # only while this repository is private
   ```

3. If the repository already exceeds the limits, freeze today's excess once, in the introduction PR: run
   `node .shirube-tools/scripts/hygiene/lines-baseline.mjs --init`, `structural-baseline.mjs --init --targets "<targets>"`,
   `jscpd-guard.mjs --init --targets "<targets>"` and `knip-baseline.mjs --init` (with a checkout of this repository at
   the pinned commit as `.shirube-tools`), commit the written `.hygiene/*.json`, and set `baseline_max_entries` /
   `structural_baseline_max_entries` / `clone_baseline_max_entries` / `knip_baseline_max_entries` to the written counts. From then on the counts
   only go down (`--ratchet` after a fix); raising a value or adding an entry by hand is an owner line, and a file not
   in a baseline must be within the limit (anti-bloat v5 §4.1 "既存超過の扱い", owner decision D0 for functions).
4. Introduce it as `report_only` with an `enforce_by` date, then make it a required check. Introduction is complete only
   when every applicable AB row (anti-bloat v5 §7) has passed in that repository and AB-14 (a defective PR is rejected
   and a correct PR is allowed by the real required check) is recorded.

## Preconditions that only the owner can set (protected surfaces)

- Visibility. While this repository is private, GitHub allows calls to its reusable workflows **only from private
  repositories** owned by the same account (repository setting "Accessible from repositories owned by the user";
  REST `access_level: user`), and the second checkout (the scripts, at the callee's own commit) needs Contents: read
  on this repository: consumers pass `SHIRUBE_READ_TOKEN` (a fine-grained token or an App installation token). A
  **public consumer cannot call a private Shirube at all**, with or without a token. Making this repository public
  removes both the setting and the token. The reusable-workflow file itself is always delivered by GitHub with the
  caller's scoped token. Visibility and tokens are owner decisions, not PR content.
- Registering the workflow as a required check in a consumer repository is a branch-protection change (owner). The
  check is named `<caller job id> / hygiene` (for the example above: `hygiene / hygiene`).

## Every check fails closed

Each script prints one JSON line `{check, verdict, ...}`; exit 0 = PASS, 1 = FAIL, 2 = cannot observe (missing profile,
git failure). Nothing in the workflow hides a failure. An empty scan is distinguished from a misconfigured one
(`jscpd-guard`), and a baseline that was not lowered after a file shrank is a failure, not a pass.

## Working on Shirube itself

`npm ci && npm test` runs the unit tests (real git repositories in a temp dir); `npm run lint:structural`,
`npm run lint:guard`, `npm run hygiene:lines`, `npm run hygiene:jscpd`, `npm run hygiene:budget` run the same checks
on this repository. Changes to rules, checkers, configs or thresholds follow SR-01..03 (handover v5 §1 SR): the previous
adopted baseline and an independent review are the basis, never a threshold loosened in the same PR.
