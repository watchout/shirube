// PLAN_ADMISSION (KIT-ADF E, iyasaka-arc#57 6230190519 §1): the form check plus the meaning check and the verdict, rewritten from what
// ADF 561baebe buildDeliveryPlanValidationReport(document, { actualSelfPin }).decisions.PLAN_ADMISSION decides. The caller passes the pin (S4).
import { refOf } from "./design-gate.mjs";
import { checkPlanShape, PIN_FIELDS, REASON } from "./plan-admission-shape.mjs";
import { currentStage } from "./stage.mjs";

const { SELF_APPLICATION_DRIFT: DRIFT, DELIVERY_GRAPH_INCOMPLETE: GRAPH, CRITICAL_PATH_INVALID: PATH, STAGE_ENTRY_WITHOUT_CONDITIONS: ENTRY } = REASON;
// Reasons from most to least decisive: the verdict names the first one that was found.
const PRIORITY = [DRIFT, REASON.STALE_BASELINE, REASON.PLAN_STATUS_NOT_ADMITTED, REASON.OWNER_OUTCOME_INCOMPLETE, ENTRY, GRAPH, PATH, REASON.UNKNOWN_FIELD, REASON.INVALID_DELIVERY_PLAN];
const array = (v) => (Array.isArray(v) ? v : []);
const record = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v) => typeof v === "string" && v.trim() !== "";
const samePin = (a, b) => record(a) && record(b) && PIN_FIELDS.every((f) => a[f] === b[f]);
const wholePin = (p) => record(p) && PIN_FIELDS.every((f) => text(p[f]));
const add = (out, reason, path, message) => { if (!out.some((f) => f.reason === reason && f.path === path)) out.push({ reason, path, message }); };

function cyclic(nodes) {
  const byId = new Map(nodes.filter(record).map((n) => [n.id, n]));
  const visiting = new Set(), visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id) || !byId.has(id)) return false;
    visiting.add(id);
    if (array(byId.get(id).depends_on).some(visit)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...byId.keys()].some(visit);
}

function sourceRef(doc, out) {
  const url = doc.control_source?.url;
  if (typeof url !== "string") return;
  // Only a real `includes` is called, so a malformed source_refs is a finding: ADF throws on any non-function, and no input may make this function throw.
  const refs = doc.owner_outcome?.source_refs;
  if (!(typeof refs?.includes === "function" && refs.includes(url))) add(out, REASON.OWNER_OUTCOME_INCOMPLETE, "owner_outcome.source_refs", "The exact control source must be an owner-outcome source ref.");
  if (doc.self_application?.control_source_ref !== url) add(out, DRIFT, "self_application.control_source_ref", "Self-application must bind the exact control source.");
}

function status(doc, out) {
  if (doc.status === "INVALIDATED") add(out, REASON.STALE_BASELINE, "status", "An invalidated plan cannot be admitted.");
  else if (doc.status === "DRAFT") add(out, REASON.PLAN_STATUS_NOT_ADMITTED, "status", "A draft plan cannot authorize implementation or testing.");
}

// The graph: unique ids, dependencies and predicates that resolve, no cycle, every terminal predicate covered.
function graph(doc, ids, predicates, out) {
  if (predicates.size !== ids.length) add(out, GRAPH, "owner_outcome.terminal_predicates", "Terminal predicate IDs must be unique.");
  const nodes = array(doc.delivery_graph?.nodes), nodeIds = nodes.map((n) => n?.id).filter(text), known = new Set(nodeIds);
  if (known.size !== nodeIds.length) add(out, GRAPH, "delivery_graph.nodes", "Delivery graph node IDs must be unique.");
  nodes.forEach((node, i) => {
    if (array(node?.depends_on).some((d) => !known.has(d) || d === node.id)) add(out, GRAPH, `delivery_graph.nodes[${i}].depends_on`, "Every dependency must reference another graph node.");
    if (array(node?.changes_predicates).some((p) => !predicates.has(p))) add(out, GRAPH, `delivery_graph.nodes[${i}].changes_predicates`, "Every node must trace to a parent terminal predicate.");
  });
  const covered = new Set(nodes.flatMap((n) => array(n?.changes_predicates)));
  if (cyclic(nodes)) add(out, GRAPH, "delivery_graph.nodes", "Delivery graph must be acyclic.");
  for (const p of predicates) if (!covered.has(p)) add(out, GRAPH, "delivery_graph.nodes", `Terminal predicate ${p} is not covered by the graph.`);
  return nodes;
}

// The critical path: closed under dependencies, in order, and within the WIP limit.
function stepOrder(doc, ids, nodes, out) {
  const wip = doc.critical_path?.wip_limit, seen = new Set();
  if (Number.isInteger(wip) && nodes.filter((n) => n?.lifecycle_status === "IN_PROGRESS").length > wip) add(out, PATH, "critical_path.wip_limit", "Too many IN_PROGRESS nodes.");
  ids.forEach((id, i) => {
    const node = nodes.find((n) => n?.id === id), deps = array(node?.depends_on), at = `critical_path.step_ids[${i}]`;
    if (!node || seen.has(id)) return add(out, PATH, at, "Critical-path steps must uniquely reference graph nodes.");
    if (deps.find((d) => !ids.includes(d))) add(out, PATH, at, "The critical path must be dependency-closed.");
    if (deps.find((d) => ids.includes(d) && !seen.has(d))) add(out, PATH, at, "A dependency must precede its dependant.");
    seen.add(id);
  });
}

// The first path node that is not complete and whose dependencies all are.
function frontmost(ids, nodes) {
  const done = new Set(nodes.filter((n) => n?.lifecycle_status === "COMPLETE").map((n) => n.id));
  return ids.map((id) => nodes.find((n) => n?.id === id)).find((n) => n?.lifecycle_status !== "COMPLETE" && array(n?.depends_on).every((d) => done.has(d)));
}

// A blocking next action binds the frontmost eligible node; while such a node exists the action must block.
function nextAction(doc, front, predicates, out) {
  const next = doc.next_action;
  if (next?.blocking !== true) { if (front) add(out, PATH, "next_action.blocking", "An eligible incomplete node needs a blocking next action."); }
  else if (!front || next.node_id !== front.id) add(out, PATH, "next_action.node_id", "A blocking next action must bind the frontmost eligible node.");
  else if (array(next.changes_predicates).some((p) => !array(front.changes_predicates).includes(p))) add(out, PATH, "next_action.changes_predicates", "The next action may change only its node's predicates.");
  if (array(next?.changes_predicates).some((p) => !predicates.has(p))) add(out, PATH, "next_action.changes_predicates", "The next action must change parent terminal predicates.");
}

function selfPin(doc, actualSelfPin, out) {
  const s = doc.self_application;
  if (s?.required !== true) return;
  if (!samePin(s.expected, s.observed)) add(out, DRIFT, "self_application", "The observed pin differs from the required one.");
  if (!wholePin(actualSelfPin) || !samePin(s.expected, actualSelfPin) || !samePin(s.observed, actualSelfPin)) add(out, DRIFT, "self_application", "The declared pins must equal the externally observed pin.");
}

// PA-1 (iyasaka-arc#24 SHIRUBE-U5-20261027; docs/design/slice23-control-v1.md §3.3, §3.4): a plan may work on its current stage only if an owner decision that
// adopts that stage is among its source refs: a comment whose first line is the marker and which has the line `stage_adoption: S<k> <plan_id>`. The caller passes
// `api`, a GET of one path made with its own credentials (S4, S9); this module reads nothing itself. A ref that cannot be read counts as absent (S8).
const MARKER = /^<!--\s*shirube-owner-decision\/v1:[^\s>]+\s*-->\s*$/;
const STAGE_PATH = "terminal_acceptance.satisfied_predicates";

function readBody(ref, api) {
  try {
    const body = api(`repos/${ref[1]}/issues/comments/${ref[2]}`)?.body;
    return typeof body === "string" ? body : undefined;
  } catch { return undefined; }
}

function adopts(body, line) {
  const lines = body.split(/\r?\n/);
  return MARKER.test(lines[0]) && lines.some((l) => l.trimEnd() === line);
}

// The current stage (stage.mjs, §3.3): a string; null when the plan is closed; undefined when it cannot be decided. The last two are findings.
function stageOf(doc, out) {
  try {
    const stage = currentStage(doc);
    if (stage === null) add(out, ENTRY, STAGE_PATH, "Every acceptance ID is already accepted: the plan is closed and a new stage must be adopted.");
    return stage;
  } catch (error) {
    add(out, ENTRY, STAGE_PATH, `The current stage cannot be decided: ${error?.message}.`);
    return undefined;
  }
}

function adoption(doc, api, out) {
  const stage = stageOf(doc, out);
  if (typeof stage !== "string") return;
  const line = `stage_adoption: ${stage} ${doc.plan_id}`, refs = array(doc.owner_outcome?.source_refs).map((url) => refOf(url)).filter(Boolean);
  let unread = 0;
  for (const ref of refs) {
    const body = readBody(ref, api);
    if (body === undefined) unread += 1;
    else if (adopts(body, line)) return;
  }
  add(out, ENTRY, "owner_outcome.source_refs", `No source ref is an owner decision that adopts ${stage} of ${doc.plan_id}${unread > 0 ? ` (${unread} of ${refs.length} could not be read)` : ""}.`);
}

export function planAdmission(document, { actualSelfPin, api } = {}) {
  const findings = checkPlanShape(document);
  if (record(document)) {
    const ids = array(document.owner_outcome?.terminal_predicates).map((e) => e?.id).filter(text), predicates = new Set(ids);
    const nodes = graph(document, ids, predicates, findings), path = array(document.critical_path?.step_ids);
    sourceRef(document, findings);
    if (api !== undefined) adoption(document, api, findings); // PA-1 runs only when the caller reads the owner decisions; without `api` the verdict is ADF's
    status(document, findings);
    stepOrder(document, path, nodes, findings);
    nextAction(document, frontmost(path, nodes), predicates, findings);
    selfPin(document, actualSelfPin, findings);
  }
  const rank = (f) => { const i = PRIORITY.indexOf(f.reason); return i === -1 ? PRIORITY.length : i; };
  const first = findings.reduce((best, f) => (best === undefined || rank(f) < rank(best) ? f : best), undefined);
  return { decision: "PLAN_ADMISSION", verdict: first ? "BLOCK" : "PASS", reason: first ? first.reason : "PLAN_ADMITTED", findings };
}
