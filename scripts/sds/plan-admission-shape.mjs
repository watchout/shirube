// PLAN_ADMISSION, the form check (KIT-ADF E, iyasaka-arc#57 6230190519 §1): what ADF 561baebe validatePlanShape reports,
// rewritten as data (PLAN) and one walker. Pure: no clock, environment or network is read (S4); the caller passes the plan.
const INVALID = "INVALID_DELIVERY_PLAN";
const STEPS = ["DP0", "DP1", "DP2", "DP3", "DP4", "DP5", "DP6", "DP7"];
const text = (v) => typeof v === "string" && v.trim() !== "";
const record = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const unique = (v) => v.every(text) && new Set(v).size === v.length;
const leaf = (test, what) => ({ test, what });
const like = (re, what) => leaf((v) => typeof v === "string" && re.test(v), what);
const is = (expected) => leaf((v) => v === expected, `equal to ${expected}`);
const among = (allowed) => leaf((v) => allowed.includes(v), "a known value");
const each = (item) => ({ each: item });
const shape = (fields, extra = []) => ({ fields, extra }); // every key is allowed and required; `extra` keys are checked by hand
const STR = leaf(text, "a non-empty string");
const STRS = leaf((v) => Array.isArray(v) && v.length > 0 && unique(v), "a non-empty array of unique non-empty strings");
const IDS = leaf((v) => Array.isArray(v) && unique(v), "an array of unique non-empty strings");
const BOOL = leaf((v) => typeof v === "boolean", "boolean");
const COUNT = leaf((v) => Number.isInteger(v) && v >= 1, "a positive integer");
const DATE = leaf((v) => typeof v === "string" && !Number.isNaN(Date.parse(v)), "an ISO date-time");
const DIGEST = like(/^(?:sha256:)?[a-f0-9]{64}$/, "a sha256 digest");
const GIT_SHA = like(/^[a-f0-9]{40}$/, "a 40-character git sha");
const NODE_ID = like(/^DP-N[A-Z0-9._:-]+$/, "a DP-N identifier");
const PIN = shape({ framework_version: STR, skill_digest: DIGEST, schema_digest: DIGEST, validator_digest: DIGEST });
const PREDICATE = shape({ id: like(/^[A-Z][A-Z0-9._:-]+$/, "an upper-case identifier"), description: STR, evidence_required: STR });
const REPOSITORY = shape({ name: like(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "owner/name"), branch: STR, commit: GIT_SHA, tree: GIT_SHA, evidence_ref: STR });
const RUNTIME = shape({ release_id: STR, process_identity: STR, evidence_ref: STR, config_digest: DIGEST, policy_digest: DIGEST, target_manifest_digest: DIGEST });
const NODE = shape({
  id: NODE_ID, repository: STR, depends_on: IDS, changes_predicates: STRS, deliverable: STR, integration_evidence: STR,
  lifecycle_status: among(["PLANNED", "IN_PROGRESS", "BLOCKED", "COMPLETE"]),
});
const PLAN = shape({
  schema_version: is("shirube-delivery-plan/v1"),
  plan_id: like(/^DP-[A-Z0-9._:-]+$/, "a DP- identifier"),
  generation: COUNT,
  status: among(["DRAFT", "ADMITTED", "INVALIDATED", "SEALED_PLAN_ONLY"]),
  control_source: shape({ url: STR, body_sha256: DIGEST }),
  owner_outcome: shape({ source_refs: STRS, observable_behavior: STR, environment: STR, non_goals: STRS, terminal_evidence: STR, terminal_predicates: each(PREDICATE) }),
  live_baseline: shape({ observed_at: DATE, evidence_ref: STR, repositories: each(REPOSITORY), runtime: RUNTIME }, ["freshness"]),
  delivery_graph: shape({ nodes: each(NODE) }),
  critical_path: shape({ step_ids: STRS, wip_limit: COUNT }),
  anti_work: STRS,
  next_action: shape({ owner_agent: STR, owner_function: STR, action: STR, changes_predicates: STRS, blocking: BOOL }, ["node_id"]),
  procedure_coverage: shape(Object.fromEntries(STEPS.map((step) => [step, shape({ status: is("COVERED"), evidence_refs: STRS })]))),
  self_application: shape({ required: BOOL, control_source_ref: STR, expected: PIN, observed: PIN }),
});
// Allowed at the top level although other admissions own them.
const TOP = [...Object.keys(PLAN.fields), "test_contracts", "replan_triggers", "terminal_acceptance", "delivery_acceleration"];

const at = (path, key) => (path ? `${path}.${key}` : key);

function flag(out, reason, path, message) {
  if (!out.some((f) => f.reason === reason && f.path === path)) out.push({ reason, path, message });
}

function walk(node, value, path, out) {
  if (node.test) {
    if (!node.test(value)) flag(out, INVALID, path, `${path} must be ${node.what}.`);
  } else if (node.each) {
    if (!Array.isArray(value) || value.length === 0) flag(out, INVALID, path, `${path} must be a non-empty array.`);
    else value.forEach((entry, i) => walk(node.each, entry, `${path}[${i}]`, out));
  } else {
    object(node, value, path, out);
  }
}

function object(node, value, path, out) {
  if (!record(value)) flag(out, INVALID, path, `${path} must be an object.`);
  else {
    const keys = [...Object.keys(node.fields), ...node.extra];
    for (const key of Object.keys(value)) if (!keys.includes(key)) flag(out, INVALID, at(path, key), `Unknown field ${at(path, key)}.`);
    for (const key of keys) if (!(key in value)) flag(out, INVALID, at(path, key), `${at(path, key)} is required.`);
  }
  fields(node, value, path, out);
}

// The children are checked even when the parent is not an object, so a missing section reports every field under it.
function fields(node, value, path, out) {
  for (const [key, child] of Object.entries(node.fields)) walk(child, record(value) ? value[key] : undefined, at(path, key), out);
}

// A blocking action names its node; a non-blocking (terminal) plan sets node_id to null.
function nodeId(next, out) {
  if (next?.blocking === true) walk(NODE_ID, next.node_id, "next_action.node_id", out);
  else if (next?.node_id !== null) flag(out, REASON.CRITICAL_PATH_INVALID, "next_action.node_id", "A non-blocking terminal plan must set next_action.node_id to null.");
}

export function checkPlanShape(document) {
  if (!record(document)) return [{ reason: INVALID, path: "$", message: "Delivery plan must be an object." }];
  const out = [];
  for (const key of Object.keys(document)) if (!TOP.includes(key)) flag(out, REASON.UNKNOWN_FIELD, `$.${key}`, `Unknown field $.${key}.`);
  fields(PLAN, document, "", out);
  if (record(document.live_baseline) && document.live_baseline.freshness !== "FRESH") flag(out, REASON.STALE_BASELINE, "live_baseline.freshness", "The live baseline must be FRESH.");
  nodeId(document.next_action, out);
  return out;
}

// Shared with plan-admission.mjs (S3): the pin's fields, and every reason PLAN_ADMISSION can give.
export const PIN_FIELDS = Object.keys(PIN.fields);
export const REASON = Object.freeze({
  INVALID_DELIVERY_PLAN: INVALID, UNKNOWN_FIELD: "UNKNOWN_FIELD", STALE_BASELINE: "STALE_BASELINE", CRITICAL_PATH_INVALID: "CRITICAL_PATH_INVALID",
  SELF_APPLICATION_DRIFT: "SELF_APPLICATION_DRIFT", PLAN_STATUS_NOT_ADMITTED: "PLAN_STATUS_NOT_ADMITTED", OWNER_OUTCOME_INCOMPLETE: "OWNER_OUTCOME_INCOMPLETE", DELIVERY_GRAPH_INCOMPLETE: "DELIVERY_GRAPH_INCOMPLETE",
  STAGE_ENTRY_WITHOUT_CONDITIONS: "STAGE_ENTRY_WITHOUT_CONDITIONS", // PA-1, Shirube's own: ADF has no such reason
});
