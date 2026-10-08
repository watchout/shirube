# SDS-V2 が引く runtime policy の節（値を変えない取り込み）

状態: **写し。独立監査と Owner の採択の前**。`docs/sds/distribution.md` §8 の 3 の作業です。SDS-V2 が固定している V3 runtime policy の版から、§8 の 2 が挙げる 5 つの節を、**本文を変えずに**ここへ写しました。各節の本文は出典と 1 byte も違いません（§0 の方法で照合できます）。

## 0. 出典と照合の方法

- 出典: `watchout/iyasaka-org` @ `d3f1a1e90499f77772d48fba33532c68ed4cb1fa` の `docs/shirube/shirube-v3-runtime-policy.md`（file SHA-256 `85e1b0a5c5443aaf9e48454115a726bac1d57939056422900e5aa763e5839d45`、800 行）。これは、統合済みの `docs/sds/README.md` の 123 行目が固定している版です。
- 範囲: 各節の見出しの行から、その節の最後の空でない行までです（次の `## ` 見出しの前にある空行は含みません）。
- SHA-256: 範囲の行を改行（LF）でつなぎ、末尾に改行を 1 つ付けた UTF-8 のバイト列の値です。

| 節 | 出典の行 | 本文の SHA-256 |
|---|---|---|
| Risk-Tiered Gate Depth | 61〜83 | `11f60dd42b49cdfcd02a614819dd4a8dc7d456d721bc1216f75c9447c3d24be1` |
| Human Approval Gates | 234〜243 | `ea18b9c2e9a0a11fcccad7699e40108baa082143349a75ca154905bae2f65c18` |
| Evidence Rules | 297〜319 | `2a26f07ef6126cf66340a4d4ac18458a58030cc0ebdc1047f9a7931ee684c8cc` |
| Function Boundaries | 121〜178 | `ed4bc26ed1e4b853fa9ccb721e09c360da1989d4f991eab89586c292669e4c1f` |
| Next Action Contract | 264〜287 | `b9d408141e3b94ca8be91fe20d2040753ece1966d05118ed936e4e8d9c1f04f5` |

- iyasaka-org の main（`3573f80aa4ce37f69365b9910608703d6bb70032`）との違い: Risk-Tiered Gate Depth・Evidence Rules・Next Action Contract の 3 節で本文が違います。出典の版には、SDS の補正（F01・F03・F05 など。出典 794 行目以降の「SDS sufficiency remediation」節が「F01/F02/F03/F05/F06/F09 are reflected above」と記録）が入っており、main には入っていません。本書は SDS-V2 が固定した版に合わせ、main の版は使いません。Human Approval Gates と Function Boundaries は、両方の版で同じです。

### 0.1 本文が依存する外部の定義（出典の同じ commit で辿る）

| 依存 | 出典の節（行） | 本書の節での使われ方 |
|---|---|---|
| 用語 `cell`、`control_source`、PR（delivery container） | Glossary（33〜60） | Risk-Tiered Gate Depth、Next Action Contract |
| 制御の記録 `execution_context`、`control_handoff`、`owner_decision`、`gate_result`、`next_action`、`evidence`、`lifecycle_state` | Control Plane（11〜32） | Function Boundaries、Human Approval Gates、Next Action Contract、Evidence Rules |
| 役割の名前 `implementation_executor`、`evidence_audit_gate`、`protected_surface_gate`、`orchestration_controller` など | Function Model（92〜120） | Function Boundaries、Next Action Contract |

- 本書は、上の節も、5 節以外の節も取り込みません。定義が必要な時は、出典の同じ commit の該当行を読みます。
- 出典の Amendment（334〜782 行目）は、取り込みません。どの Amendment も、5 つの節を節名では参照していません（節名で検索して確認）。ただし、節名を使わずに作業の進め方へ条件を足す Amendment があります（Generation Cap and Verifier Presence、Cell Admission Preconditions、Policy Identity / Enforcement Consistency など）。これらは V3 の cell の運用への追加で、5 節の本文を書き換えるものではありません。SDS-V2 でそれぞれに当たる扱い（たとえば監査の往復の上限）は、SDS-V2 の文書（`docs/process/ai-dlc.md`、`docs/sds/audit-method.md`）が決めます。
- ローカルの絶対パスは含みません。

### 0.2 取り込まないものと、正本の関係

- 組織の権限（Owner、保護面の一覧、収益の判断、「管理を AI に任せない」決定など）は取り込みません。iyasaka-org の短い 1 文書に残し、その文書は ARC が書きます。
- 役割ごとのエージェント設定は ARC が設計中です（iyasaka-arc#60 B）。本書はそこに踏み込まず、節を写すだけです。
- 正本: この 5 節の規範の正本は、本書の採択（独立監査と Owner の承認）までは、`docs/sds/README.md` 123 行目が固定する出典の版のままです。本書は、その版と同じ本文の写しです。README 123 行目の参照を本書へ切り替えるのは、本書の採択の後の別の PR で行います。それまでは二重の正本にはしません。
- V3 policy の本体は変えません。全 repo から旧部品が撤去されるまで、履歴として残します（distribution.md §8 の 3）。
- 本書の 5 節の本文を変える時は、出典との違いを明示する別の PR で行います。値を変えない取り込みの範囲を超えるためです。

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

For R0/R1 changes within an existing design, record reason, scope, acceptance/checks and the existing design reference in the same Issue/PR. No new design document, ADR, pre-review or owner decision is required solely to repeat unchanged information. R2 needs the relevant design change and post-implementation audit; R3/R4 add prior review as above. New ADRs record new decisions. Protected surfaces, explicit review requests and role independence still apply.

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

Mandatory acceptance, authority, safety, data-integrity, serious-regression or evidence failures block regardless of the audit axis. Unobserved/expired/wrong-target evidence is UNKNOWN, not success or proof of absence. WARNING is for optional improvements only. A deviation record does not itself authorize an exception.

Evidence binds requirement IDs, target SHA, producer/executor, check and policy versions, settings/environment, observed_at and explicit validity/invalidation conditions. Reuse stored evidence only when these remain verifiable. Recompute from observed facts; do not echo expected values. Reobserve changed, expired or unknown settings; retain live authorization checks immediately before protected effects. API 403/404/timeout does not establish that protection is absent.

Acceptance/test/evidence links may be many-to-many while covering all adopted acceptance IDs with the necessary verification types. Preserve parent acceptance/outcome evidence independently of child test results. File/keyword/check-name presence only proves inventory; effective enforcement also requires valid settings, executions and rejection of a defective case (W2/W4).

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

A complete handoff is required when responsibility transfers. During the same authorized work, reference the existing context and update only changed information; do not manufacture a second queue, execution context or approval for each status report.
