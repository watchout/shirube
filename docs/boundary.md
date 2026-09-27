# Boundary — who is responsible for what (one diagram)

Internal requirement from handover v5 §12 (structure): one diagram of Shirube / GitHub / AUN and executors / product
repositories, with trust boundaries. The notation is a plain container diagram; the C4 notation itself is still a
candidate (baseline ADR, source confirmation pending), so this page claims no C4 compliance.

```mermaid
flowchart LR
  subgraph GH[GitHub — source of authority]
    ISSUE[Issues / PRs / comments<br/>owner decisions, adopted scope, evidence URLs]
    PROT[branch protection, required checks<br/>owner-only settings]
    ACT[Actions runners]
  end
  subgraph SH[watchout/shirube — control layer]
    W1[hygiene.yml + scripts]
    CFG[configs, templates, docs]
  end
  subgraph EXEC[Executors — AUN, seats, product CI]
    AUN[AUN: dispatch, claim, budgets, heartbeat]
    SEAT[implementation seats<br/>start record, PR, evidence]
  end
  subgraph PROD[Product repositories]
    PRO[.shirube/hygiene-profile.md<br/>knip.jsonc, .dependency-cruiser.cjs]
    SRC[source, tests, acceptance IDs]
  end
  PRO -->|"profile (declared)"| W1
  SRC -->|"diff, tracked files"| W1
  W1 -->|"PASS / FAIL / UNOBSERVABLE per check"| ACT
  ACT -->|"required check result"| PROT
  SEAT -->|"PR + start record"| ISSUE
  AUN -->|"dispatch / evidence"| ISSUE
  ISSUE -. "owner decision URL + sha256 (W3, later)" .-> W1
```

## Responsibilities and trust

| party | owns | must not |
|---|---|---|
| GitHub settings (owner) | branch protection, required checks, repository access, secrets | — |
| Shirube (this repo) | the checks, their configs and templates, the acceptance rows they implement | run, deliver, recover, remember; decide product behaviour; hold secrets |
| Executors (AUN / seats) | starting work only after the start record, producing evidence, finite budgets, heartbeat | self-review, self-merge, widening scope |
| Product repositories | the profile (what applies), entries and boundaries, acceptance IDs and tests | reading an old declaration as the current one (F5) |

Trust boundary: everything Shirube reads from a product repository is a declaration (profile) or a diff; Shirube verifies
declarations against observed facts where it can (baseline vs actual length, inventory vs scan, sha256 of the pinned
gitleaks binary) and reports UNOBSERVABLE rather than PASS when it cannot.
