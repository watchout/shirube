# SDS-V2 が引く runtime policy の節（値を変えない取り込み）

状態: `docs/sds/distribution.md` §8 の 3 の作業です。iyasaka-org の V3 runtime policy から、§8 の 2 が挙げる 5 つの節を、**値を変えずに**ここへ移しました。各節の本文は出典と 1 byte も違いません（次の表の sha256 で照合できます）。

## 0. 出典と範囲

- 出典: `watchout/iyasaka-org` @ `3573f80aa4ce37f69365b9910608703d6bb70032` の `docs/shirube/shirube-v3-runtime-policy.md`（file SHA-256 `31944ed5df221a13737599da823fb3840316cb05d69876d9148d9915a97a54a0`、777 行）
- 各節の本文の範囲と SHA-256 は、次のとおりです。範囲は、見出しの行から、次の `## ` 見出しの前の行までです。SHA-256 は、その範囲の行を改行でつなぎ、末尾に改行を 1 つ付けた UTF-8 の値です。

| 節 | 出典の行 | 本文の SHA-256 |
|---|---|---|
| Risk-Tiered Gate Depth | 59〜80 | `84e6773be763b2be16a77e50d655a29226ef423b67f85ce513ba941c21268edd` |
| Human Approval Gates | 231〜241 | `ea18b9c2e9a0a11fcccad7699e40108baa082143349a75ca154905bae2f65c18` |
| Evidence Rules | 290〜307 | `65584146ba207790944efeba9332d6f1f84f1d14abe1817ba4b91420ff4f6fb3` |
| Function Boundaries | 118〜176 | `ed4bc26ed1e4b853fa9ccb721e09c360da1989d4f991eab89586c292669e4c1f` |
| Next Action Contract | 261〜283 | `ee116711e2921c749f260cb6b109e2f28477609924b4f9c53fa7616e56727a67` |

- 取り込まないもの:
  - 組織の権限（Owner、保護面の一覧、収益の判断、「管理を AI に任せない」決定など）は、iyasaka-org の短い 1 文書に残します。その文書は ARC が書きます。
  - 上の 5 節以外の節（Glossary、Function Model、Amendment 以下など）も取り込みません。本文中の用語（cell、control_handoff など）の定義は、出典の同じ commit の Glossary が正です。
  - 出典の Amendment（2026-07-21〜2026-09-25）は、節の名前でこの 5 節を参照していません。出典の 319 行目以降を、5 つの節名で検索して確かめました。
- 役割ごとのエージェント設定は、ARC が設計中です（iyasaka-arc#60 B）。本書はそこに踏み込まず、節を移すだけです。
- V3 policy の本体は変えません。全 repo から旧部品が撤去されるまで、履歴として残します（distribution.md §8 の 3）。
- 本書の節の本文を変える時は、出典との違いを明示する別の PR で行います。値を変えない取り込みの範囲を超えるためです。

---

## Risk-Tiered Gate Depth

Gate depth scales with the cell's declared `risk_class`. Machine gates
(decomposition check, path scope check, CI) run for every tier and cost
seconds; LLM audits and owner decisions are reserved for tiers that need them.

| risk_class | required gates | LLM audit | owner decision |
|---|---|---|---|
| R0 (docs, tests, typo; non-runtime) | machine gates only | none | not required; auto-merge allowed once required checks are enforced |
| R1 (low-risk internal change) | machine gates + CI | none | not required |
| R2 (standard feature or fix) | machine gates + CI + post-impl code audit | 1 | not required |
| R3 (high risk) | R2 set + pre-impl plan audit + narrow verification | 2 | required (exact-head) |
| R4 (protected surface) | full chain | 2 | required (exact-head); Human Approval Gates section applies |

R0 cells may use the cell-lite profile: `cell_id`, a one-line `cell_goal`,
`allowed_paths`, and `forbidden_paths`. Other cell fields are optional.
Metadata authoring for an R0 cell must not cost more than the change itself.

Protected surfaces listed under Human Approval Gates always require
`owner_decision` regardless of the declared `risk_class`. A gate already
passed by machine checks must not be re-checked by an LLM or human layer.

## Human Approval Gates

Offer, sales process, pricing, guarantee/risk reversal, LP/publication,
branch protection, required checks, production deploy, customer-impacting
runtime changes, external sends, secrets, DB migrations, and authority changes
require explicit owner/human approval through `owner_decision`.

For IYASAKA revenue work, Human Approval Gate #23 remains binding:
Offer / Sales / price / guarantee / LP publish decisions are not final without
CEO approval.

## Evidence Rules

Completion cannot be based on ACKs, queue IDs, green CI alone, or unverified
runtime state.

Evidence must include exact targets and enough machine-checkable data for the
next gate:

- exact PR head SHA when PR-related;
- changed files and allowed/forbidden scope result;
- commands/checks run and results;
- runtime identity evidence when runtime is claimed;
- agent-comms `agents` row plus live `AGENT_ID` verification when online state is
  claimed;
- smoke transcript when communication reachability is claimed;
- owner decision for protected or approval-gated work.
- `next_action` when another function, agent, or owner must act.

## Function Boundaries

`orchestration_controller` is the parent control function. It may recover
context, inspect exact work items, create bounded `execution_context` and
`control_handoff` artifacts from explicit owner directives, route work to a
canonical function, and continue non-blocking work through closure. It may
assume another canonical function only through a recorded execution context
that states the exact target, allowed and forbidden scope, stop conditions,
and required evidence. It must not use function switching to self-audit,
self-approve, merge its own work, bypass a human approval gate, or expand an
owner directive. Any implementation performed in the same execution chain
taints that agent as maker and requires a different agent for audit or gate
work.

`control_source_author` may produce requirements, acceptance criteria,
non-goals, human approval points, and source references. It must not implement,
edit product files, approve, or merge.

`control_artifact_author` may author Control artifacts, SPEC, CELL, gate docs,
handoff docs, decision docs, and Shirube control metadata. It may create
Control docs/spec PRs only under an explicit `control_handoff`. It must not
create product runtime PRs, edit API/DB/UI/runtime/deploy files, audit its own
PR, approve, or merge.

`coordination_recorder` may route, summarize, record state, and keep owner-facing
status. It must not substitute Shirube gates, audit evidence, or owner
decisions.

`implementation_executor` may edit files, run checks, commit, and open PRs only
inside an explicit `control_handoff` with allowed paths, forbidden operations,
stop conditions, and required evidence. It must not self-audit, approve, merge,
or expand scope.

`runtime_recovery_executor` may recover one exact named agent or session when
an explicit owner directive authorizes that target. Before mutation it must
verify the exact runtime identity, confirm that the target has no in-progress
or claimed queue work, run the supported restart dry-run, and pass the provider
identity/account precheck. It may then restart only that exact target and must
verify the live process or tmux session, bound port, `AGENT_ID`, and sanitized
provider identity after recovery. It must fail closed on identity drift,
incomplete profile data, an active queue, dry-run failure, or ambiguous target.
It must not mutate DB profiles, credentials, provider accounts, queues, or
unrelated sessions; restart the controller's own active session; or perform a
fleet-wide restart without a separate exact owner decision.

`evidence_audit_gate` validates diff scope, evidence integrity, exact head,
maker-checker separation, and SSOT alignment. It must not fix what it audits.

`scenario_verification_gate` verifies commands, generated artifacts, smoke
behavior, failure modes, and recovery behavior. It must not implement fixes.

`operator_acceptance_gate` validates field/operator usability and owner-facing
acceptance. It must not replace audit, QA, or owner approval.

`protected_surface_gate` issues GO, CONDITIONAL GO, or NO-GO for protected
surfaces and high-risk changes based on Shirube evidence. It must not implement,
edit files, mutate runtime state, approve its own work, or bypass required
evidence.

## Next Action Contract

Any handoff, gate result, block, rejection, conditional pass, owner request, or
work-splitting message must include `next_action`. A vague "next owner
function" is not enough.

`next_action` must identify:

- `owner_agent` or `owner_function`: who must act next;
- `action`: the concrete verb and work requested;
- `handoff_method`: where/how to deliver it, such as agent-comms target,
  GitHub PR comment, issue comment, or local PR branch;
- `input_refs`: the exact PR, issue, control_source, cell, commit, artifact, or
  evidence references the next owner should use;
- `scope`: allowed paths/surfaces and forbidden paths/surfaces;
- `deliverable`: what output is expected;
- `completion_evidence`: what evidence closes the action;
- `blocking`: whether current work must stop until this action is complete;
- `stop_reason`: required when `blocking: true`.

When no external action is required, write `next_action: none` and continue
inside the current function's approved scope.
