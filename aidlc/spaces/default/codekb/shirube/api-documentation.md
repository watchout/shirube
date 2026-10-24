# 外とのやり取り（API Documentation）: shirube

## CLI

| コマンド | 主な引数 | 出力 | exit code |
|----------|----------|------|-----------|
| `node scripts/sds/gate.mjs` | `--repo <owner/name> --pr <n> --head <sha>` | 1 行の JSON（`check: sds-gate`、`verdict`、`risk_class`、`effective_risk`、`protected_touched`、`plan_binding`、`design_binding`、`owner_approval: NOT_CHECKED_BY_MACHINE`） | 0 PASS / 1 FAIL |
| `node scripts/sds/kit.mjs apply` / `upgrade` | `--target --commit --protected [--adoption --adoption-sha256 --adopted-at]` | 書いた file の一覧 | 0 / 2 ERROR |
| `node scripts/sds/kit.mjs check` | `--target` | `verdict: OK / DRIFT`、ずれ・旧部品・旧参照の一覧 | 0 OK / 1 DRIFT / 2 ERROR |
| `node scripts/sds/kit.mjs status` | `[--latest <sha>]` | 配布先ごとの pin・digest の一致・旧部品・errors | 0 / 2 |
| `node scripts/hygiene/audit-admission.mjs` | `--request <url> --sha256 <hex> (--preflight | --review <url>)` | `READY_FOR_REVIEW` / `RECEIPT_ACCEPTED` / `BLOCKED` | 0 / 1 |
| `node scripts/hygiene/<check>.mjs` | `--profile`、検査ごとに `--targets`・`--base`・`--head`・`--today` など | 1 行の JSON（PASS / FAIL / UNOBSERVABLE） | 0 / 1 / 2 |

## 再利用 workflow

| workflow | 入力 | secret | すること |
|----------|------|--------|----------|
| `.github/workflows/sds-gate.yml` | `pr`（number、必須） | `SHIRUBE_READ_TOKEN`（任意） | 固定 commit の shirube で gate.mjs を動かし、PR の head に commit status `sds-gate` を付ける |
| `.github/workflows/hygiene.yml` | `profile`、`targets`、`node-version`、`package-manager`（npm / bun）、`bun-version`、`python` | `SHIRUBE_READ_TOKEN`（任意） | 衛生の検査を全部動かし、全部の結果を並べて 1 つでも失敗なら job を失敗にする |

配布先の呼出し（`kit/sds-gate-caller.yml`）は `pull_request_target`（opened・synchronize・reopened・edited・ready_for_review・labeled・unlabeled）と `issue_comment`（created・edited・deleted）で動き、権限は読取りと `statuses: write` だけ。

## GitHub API の使い方

- 読取り（`gh api` の GET）: `pulls/<n>`、`pulls/<n>/files`、`contents/<path>?ref=`、`issues/comments/<id>`、`issues/<n>/comments`、`pulls?state=closed`、`commits/<sha>/check-runs`、`actions/runs/<id>`、`actions/jobs/<id>`・`/logs`、`git/commits/<sha>`、`compare/<a>...<b>`、`repos/<repo>`。
- 書込み: sds-gate.yml の `statuses/<sha>`（context `sds-gate`）だけ。kit は GitHub に書かない。

## 形の契約（機械が読む block）

| 契約 | 置き場 | 主な欄 |
|------|--------|--------|
| `sds-pr/1` | PR の本文の ` ```json sds-pr ` | `risk_class`、`changed_paths`、`audit{request, request_sha256, review}`、`delivery_plan_binding`、`control_handoff`、`design_binding` |
| `sds-pin/1` | 配布先の `.shirube/sds-pin.json` | `sds_commit`、`kit_version`、`files`（SHA-256）、`instructions`、`protected_paths`、`adoption`、`plan_binding_mode`、`design_binding_mode`、`delivery_plan.control_source` |
| `sds-audit-request/1` | PR の comment の ` ```json ` | `expires_at`、`author`、`reviewer{actor, github}`、`verifier_sha256`、`targets[]`、`item_set`、`plan_binding` |
| `sds-audit-review/1` | 同じ PR の comment | `request_digest`、`reviewer`、`blocking_findings`、`targets[]`、`items[]`（result・reason・counterexample・evidence） |
| `sds-audit-items/1` | 対象の head の file | `items[].id` |
| `sds-design/1` | 設計の file の ` ```json sds-design ` | `design_id`、`version`、`open_decisions[]`、`approval{ref, sha256}`、`main_connection.first_node` |
| `shirube-delivery-plan/v1` | Issue の comment の ` ```yaml ` | `plan_id`、`generation`、`status`、`owner_outcome.terminal_predicates`、`delivery_graph.nodes`、`critical_path`、`next_action`、`terminal_acceptance` など |
| `shirube-v3/control_handoff/v1` | marker つきの Issue の comment の ` ```yaml ` | `plan_binding{plan_id, node_id, changes_predicates, …}`、`allowed_paths`、`completes_unit` |

## export された関数

| 関数 | 置き場 | 入力 → 出力 |
|------|--------|-------------|
| `gate(args, api, now, verify, parse)` | `scripts/sds/gate.mjs` | PR の判定 → 結果の object（失敗は例外、`failure()` で JSON にする） |
| `verifyAudit(args, api, now)` | `scripts/hygiene/audit-admission.mjs` | 依頼と返却 → 受領の object |
| `planBinding(mode, input, io)` | `scripts/sds/plan-binding.mjs` | 判定 4 の結果 |
| `designGate(block, input)` | `scripts/sds/design-gate.mjs` | 判定 5 の `{verdict, findings}` |
| `planAdmission(document, {actualSelfPin})` | `scripts/sds/plan-admission.mjs` | `{decision, verdict, reason, findings}` |
| `currentStage(plan)` | `scripts/sds/stage.mjs` | `"S1"`〜`"S4"` か `null` |
| `render` / `apply` / `check` / `status` | `scripts/sds/kit.mjs` | 配布キットの操作 |
| `createProgression({store, executor, clock})` | `src/progression/continuation.mjs` | `{record, tick, recover, status}` |
