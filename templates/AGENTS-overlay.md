<!-- Shirube AGENTS.md overlay template for a consumer repository (handover v5 §1 T1, F6 adoption line). -->
## Current control references

- policy adoption: declaration = <control repo> docs/<declaration> <declaration_id> @ <commit> (sha256 <digest>); policy = iyasaka-org docs/shirube/shirube-v3-runtime-policy.md @ <commit> (sha256 <digest>); adopted <YYYY-MM-DD> by <seat>
- review / merge rule (risk-tiered): <URL of the adopted rule>
- progress source: <control issue URL>
- current handoff: <handoff URL + sha256>

These references govern the current task. This file does not define a separate approval model.
Ordinary R0/R1 work adds no LLM audit or repeated owner approval; the existing independent review and maker/merger separation remain.

## Historical records

`.shirube/` records describe their original adoption cell; they are history, not the current declaration. Do not infer current runtime readiness from an old lifecycle entry.

## Seat notes

- seat identity: <id> / function: implementation_executor / memory project: <name>
- before editing: post the start record (seat id, repo/branch/head, node -v, handoff URL + sha256, time); do not start on a mismatch
