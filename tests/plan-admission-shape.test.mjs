// plan-admission-shape (KIT-ADF E PR-2, iyasaka-arc#57 6230190519 §1/§2): the form check of PLAN_ADMISSION.
// Each expectation is what ADF 561baebe validatePlanShape reports for the same plan, as "path" (reason INVALID_DELIVERY_PLAN)
// or "REASON path"; message wording is free. PR-3 compares the whole of PLAN_ADMISSION against ADF.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkPlanShape } from "../scripts/sds/plan-admission-shape.mjs";

const D = "a".repeat(64), G = "b".repeat(40);
const pin = () => ({ framework_version: "1.3.0", skill_digest: D, schema_digest: D, validator_digest: D });
const STEPS = ["DP0", "DP1", "DP2", "DP3", "DP4", "DP5", "DP6", "DP7"];
const validPlan = () => ({
  schema_version: "shirube-delivery-plan/v1", plan_id: "DP-TEST", generation: 1, status: "ADMITTED",
  control_source: { url: "https://github.com/watchout/x/issues/1#issuecomment-1", body_sha256: D },
  owner_outcome: {
    source_refs: ["ref"], observable_behavior: "b", environment: "e", non_goals: ["n"], terminal_evidence: "t",
    terminal_predicates: [{ id: "P1", description: "d", evidence_required: "e" }],
  },
  live_baseline: {
    observed_at: "2026-10-20T00:00:00Z", evidence_ref: "e", freshness: "FRESH",
    repositories: [{ name: "o/r", branch: "main", commit: G, tree: G, evidence_ref: "e" }],
    runtime: { release_id: "r", process_identity: "p", config_digest: D, policy_digest: D, target_manifest_digest: D, evidence_ref: "e" },
  },
  delivery_graph: { nodes: [{ id: "DP-N1", repository: "o/r", depends_on: [], changes_predicates: ["P1"], deliverable: "d", integration_evidence: "e", lifecycle_status: "PLANNED" }] },
  critical_path: { step_ids: ["DP-N1"], wip_limit: 1 },
  anti_work: ["a"],
  next_action: { node_id: "DP-N1", owner_agent: "a", owner_function: "f", action: "x", changes_predicates: ["P1"], blocking: true },
  procedure_coverage: Object.fromEntries(STEPS.map((s) => [s, { status: "COVERED", evidence_refs: ["e"] }])),
  self_application: { required: true, control_source_ref: "u", expected: pin(), observed: pin() },
});

const CASES = [
  ["unknown top-level field", (d) => (d.extra = 1), ["UNKNOWN_FIELD $.extra"]],
  ["fields other checks own are not shape errors", (d) => Object.assign(d, { test_contracts: 1, replan_triggers: 1, terminal_acceptance: 1, delivery_acceleration: 1 }), []],
  ["schema_version of another generation", (d) => (d.schema_version = "shirube-delivery-plan/v2"), ["schema_version"]],
  ["schema_version missing", (d) => delete d.schema_version, ["schema_version"]],
  ["plan_id in lower case", (d) => (d.plan_id = "dp-1"), ["plan_id"]],
  ["plan_id with nothing after the prefix", (d) => (d.plan_id = "DP-"), ["plan_id"]],
  ["generation zero", (d) => (d.generation = 0), ["generation"]],
  ["generation not an integer", (d) => (d.generation = 1.5), ["generation"]],
  ["generation as a string", (d) => (d.generation = "1"), ["generation"]],
  ["unknown status", (d) => (d.status = "ADMIT"), ["status"]],
  ["a DRAFT status is well formed (the semantic check judges it)", (d) => (d.status = "DRAFT"), []],
  ["control_source is not an object", (d) => (d.control_source = "u"), ["control_source", "control_source.body_sha256", "control_source.url"]],
  ["control_source with an unknown key", (d) => (d.control_source.extra = 1), ["control_source.extra"]],
  ["control_source url blank", (d) => (d.control_source.url = "  "), ["control_source.url"]],
  ["digest of 63 hex characters", (d) => (d.control_source.body_sha256 = "a".repeat(63)), ["control_source.body_sha256"]],
  ["digest in upper case", (d) => (d.control_source.body_sha256 = "A".repeat(64)), ["control_source.body_sha256"]],
  ["digest with the sha256: prefix", (d) => (d.control_source.body_sha256 = `sha256:${D}`), []],
  ["owner_outcome missing", (d) => delete d.owner_outcome, [
    "owner_outcome", "owner_outcome.environment", "owner_outcome.non_goals", "owner_outcome.observable_behavior",
    "owner_outcome.source_refs", "owner_outcome.terminal_evidence", "owner_outcome.terminal_predicates",
  ]],
  ["source_refs empty", (d) => (d.owner_outcome.source_refs = []), ["owner_outcome.source_refs"]],
  ["source_refs duplicated", (d) => (d.owner_outcome.source_refs = ["a", "a"]), ["owner_outcome.source_refs"]],
  ["non_goals with an empty string", (d) => (d.owner_outcome.non_goals = [""]), ["owner_outcome.non_goals"]],
  ["terminal_predicates empty", (d) => (d.owner_outcome.terminal_predicates = []), ["owner_outcome.terminal_predicates"]],
  ["terminal predicate that is not an object", (d) => (d.owner_outcome.terminal_predicates = [null]), [
    "owner_outcome.terminal_predicates[0]", "owner_outcome.terminal_predicates[0].description",
    "owner_outcome.terminal_predicates[0].evidence_required", "owner_outcome.terminal_predicates[0].id",
  ]],
  ["terminal predicate id in lower case", (d) => (d.owner_outcome.terminal_predicates[0].id = "p1"), ["owner_outcome.terminal_predicates[0].id"]],
  ["terminal predicate id of one character", (d) => (d.owner_outcome.terminal_predicates[0].id = "P"), ["owner_outcome.terminal_predicates[0].id"]],
  ["baseline no longer fresh", (d) => (d.live_baseline.freshness = "STALE"), ["STALE_BASELINE live_baseline.freshness"]],
  ["baseline without freshness", (d) => delete d.live_baseline.freshness, ["STALE_BASELINE live_baseline.freshness", "live_baseline.freshness"]],
  ["runtime is not an object", (d) => (d.live_baseline.runtime = null), [
    "live_baseline.runtime", "live_baseline.runtime.config_digest", "live_baseline.runtime.evidence_ref",
    "live_baseline.runtime.policy_digest", "live_baseline.runtime.process_identity",
    "live_baseline.runtime.release_id", "live_baseline.runtime.target_manifest_digest",
  ]],
  ["observed_at that is not a date", (d) => (d.live_baseline.observed_at = "yesterday"), ["live_baseline.observed_at"]],
  ["observed_at as a plain date", (d) => (d.live_baseline.observed_at = "2026-10-20"), []],
  ["repositories empty", (d) => (d.live_baseline.repositories = []), ["live_baseline.repositories"]],
  ["repository name without owner", (d) => (d.live_baseline.repositories[0].name = "repo"), ["live_baseline.repositories[0].name"]],
  ["commit of 39 hex characters", (d) => (d.live_baseline.repositories[0].commit = "b".repeat(39)), ["live_baseline.repositories[0].commit"]],
  ["tree in upper case", (d) => (d.live_baseline.repositories[0].tree = "B".repeat(40)), ["live_baseline.repositories[0].tree"]],
  ["runtime digest malformed", (d) => (d.live_baseline.runtime.policy_digest = "xyz"), ["live_baseline.runtime.policy_digest"]],
  ["nodes empty", (d) => (d.delivery_graph.nodes = []), ["delivery_graph.nodes"]],
  ["node id with nothing after DP-N", (d) => (d.delivery_graph.nodes[0].id = "DP-N"), ["delivery_graph.nodes[0].id"]],
  ["depends_on duplicated", (d) => (d.delivery_graph.nodes[0].depends_on = ["DP-N2", "DP-N2"]), ["delivery_graph.nodes[0].depends_on"]],
  ["depends_on not an array", (d) => (d.delivery_graph.nodes[0].depends_on = "DP-N2"), ["delivery_graph.nodes[0].depends_on"]],
  ["unknown lifecycle_status", (d) => (d.delivery_graph.nodes[0].lifecycle_status = "DONE"), ["delivery_graph.nodes[0].lifecycle_status"]],
  ["node with an unknown key", (d) => (d.delivery_graph.nodes[0].extra = 1), ["delivery_graph.nodes[0].extra"]],
  ["wip_limit zero", (d) => (d.critical_path.wip_limit = 0), ["critical_path.wip_limit"]],
  ["critical path steps empty", (d) => (d.critical_path.step_ids = []), ["critical_path.step_ids"]],
  ["anti_work empty", (d) => (d.anti_work = []), ["anti_work"]],
  ["blocking action with a malformed node_id", (d) => (d.next_action.node_id = "x"), ["next_action.node_id"]],
  ["non-blocking action that still names a node", (d) => (d.next_action.blocking = false), ["CRITICAL_PATH_INVALID next_action.node_id"]],
  ["non-blocking action with a null node_id", (d) => Object.assign(d.next_action, { blocking: false, node_id: null }), []],
  ["next_action without blocking", (d) => delete d.next_action.blocking, ["CRITICAL_PATH_INVALID next_action.node_id", "next_action.blocking"]],
  ["blocking given as a string", (d) => (d.next_action.blocking = "true"), ["CRITICAL_PATH_INVALID next_action.node_id", "next_action.blocking"]],
  ["non-blocking action without node_id", (d) => Object.assign(d.next_action, { blocking: false }) && delete d.next_action.node_id, ["CRITICAL_PATH_INVALID next_action.node_id", "next_action.node_id"]],
  ["next_action missing", (d) => delete d.next_action, [
    "CRITICAL_PATH_INVALID next_action.node_id", "next_action", "next_action.action", "next_action.blocking",
    "next_action.changes_predicates", "next_action.owner_agent", "next_action.owner_function",
  ]],
  ["procedure step missing", (d) => delete d.procedure_coverage.DP3, ["procedure_coverage.DP3", "procedure_coverage.DP3.evidence_refs", "procedure_coverage.DP3.status"]],
  ["procedure step that does not exist", (d) => (d.procedure_coverage.DP8 = { status: "COVERED", evidence_refs: ["e"] }), ["procedure_coverage.DP8"]],
  ["procedure step not covered", (d) => (d.procedure_coverage.DP2.status = "PENDING"), ["procedure_coverage.DP2.status"]],
  ["procedure step without evidence", (d) => (d.procedure_coverage.DP5.evidence_refs = []), ["procedure_coverage.DP5.evidence_refs"]],
  ["procedure step that is not an object", (d) => (d.procedure_coverage.DP4 = null), ["procedure_coverage.DP4", "procedure_coverage.DP4.evidence_refs", "procedure_coverage.DP4.status"]],
  ["self_application.required as a string", (d) => (d.self_application.required = "yes"), ["self_application.required"]],
  ["pin without a digest", (d) => delete d.self_application.observed.validator_digest, ["self_application.observed.validator_digest"]],
  ["pin digest malformed", (d) => (d.self_application.expected.skill_digest = "nope"), ["self_application.expected.skill_digest"]],
  ["pin that differs from the other (the semantic check judges it)", (d) => (d.self_application.observed.framework_version = "9.9.9"), []],
  ["expected pin is not an object", (d) => (d.self_application.expected = 1), [
    "self_application.expected", "self_application.expected.framework_version",
    "self_application.expected.schema_digest", "self_application.expected.skill_digest",
    "self_application.expected.validator_digest",
  ]],
];

const keys = (findings) => [...new Set(findings.map((f) => (f.reason === "INVALID_DELIVERY_PLAN" ? f.path : `${f.reason} ${f.path}`)))].sort();
const found = (mutate) => { const plan = validPlan(); mutate(plan); return checkPlanShape(plan); };
const freeze = (v) => { if (v && typeof v === "object") Object.values(Object.freeze(v)).forEach(freeze); return v; };

test("a well-formed plan has no findings", () => assert.deepEqual(checkPlanShape(validPlan()), []));

for (const [name, mutate, expected] of CASES) test(name, () => assert.deepEqual(keys(found(mutate)), [...expected].sort()));

test("a document that is not an object is rejected at $", () => {
  for (const document of [null, undefined, [], "plan", 7, true]) assert.deepEqual(keys(checkPlanShape(document)), ["$"]);
});

test("freshness is judged only when the baseline is an object", () => {
  const given = keys(found((d) => delete d.live_baseline));
  assert.ok(given.includes("live_baseline") && !given.includes("STALE_BASELINE live_baseline.freshness"));
});

test("each reason of the form check is given at least once by a case", () => {
  const given = new Set(CASES.flatMap(([, mutate]) => found(mutate).map((f) => f.reason)));
  assert.deepEqual([...given].sort(), ["CRITICAL_PATH_INVALID", "INVALID_DELIVERY_PLAN", "STALE_BASELINE", "UNKNOWN_FIELD"]);
});

test("every finding names its path and carries a message", () => {
  const given = checkPlanShape({ generation: 0, extra: 1 });
  assert.ok(given.length > 1);
  for (const f of given) assert.ok(f.reason && f.path && typeof f.message === "string" && f.message !== "");
});

test("the same input gives the same output and is left untouched", () => {
  const plan = freeze({ ...validPlan(), generation: 0, extra: 1 });
  const snapshot = JSON.stringify(plan);
  const first = checkPlanShape(plan);
  assert.ok(first.length > 1);
  assert.deepEqual(checkPlanShape(plan), first);
  assert.equal(JSON.stringify(plan), snapshot);
});

test("the module reads no clock, environment, randomness or network, and imports only builtins and repo helpers (S4)", () => {
  const source = readFileSync(new URL("../scripts/sds/plan-admission-shape.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Date\.now|new Date\(|Math\.random|randomUUID|process\.|fetch\(|globalThis/);
  for (const [, from] of source.matchAll(/from "([^"]+)"/g)) assert.match(from, /^(node:|\.\.\/hygiene\/lib\.mjs$|\.\/)/);
});
