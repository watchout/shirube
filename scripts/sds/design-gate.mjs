// sds-gate judgment 5, the pure function (iyasaka-arc#57 6285014153 §1.1): structural facts about one `sds-design/1` block, never the
// meaning of a design. Time, randomness, the environment and the network are not read; the caller passes everything (S4).
import { createHash } from "node:crypto";

const REF = /^https:\/\/github\.com\/watchout\/[\w.-]+\/issues\/\d+#issuecomment-\d+$/;
const NOTES = new WeakSet();
const text = (x) => typeof x === "string" && x.trim() !== "";
// Fields come from JSON, so they can be any type: only a string is tested or printed as one (no implicit conversion).
const ref = (x) => typeof x === "string" && REF.test(x);
const hex = (x) => typeof x === "string" && /^[0-9a-f]{64}$/.test(x);
const show = (x) => (typeof x === "string" ? x : JSON.stringify(x));
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const bad = (reason, why, id) => ({ reason, ...(typeof id === "string" && { id }), message: `${reason} ${why}` });
const note = (reason, status, why) => { const n = { reason, message: `${reason} ${status}: ${why}` }; NOTES.add(n); return n; };
const deps = (node) => (Array.isArray(node?.depends_on) ? node.depends_on : []);
const find = (nodes, id) => nodes.find((n) => n?.id === id);

function ancestors(nodes, id, seen = new Set()) { // transitive depends_on, safe on a cycle
  for (const d of deps(find(nodes, id))) if (!seen.has(d)) { seen.add(d); ancestors(nodes, d, seen); }
  return seen;
}
function ready(nodes, id) { // 5.5: not COMPLETE, and every dependency is
  const n = find(nodes, id);
  return Boolean(n) && n.lifecycle_status !== "COMPLETE" && Array.isArray(n.depends_on) && n.depends_on.every((d) => find(nodes, d)?.lifecycle_status === "COMPLETE");
}
function shaped(b) { // 5.1
  return object(b) && b.schema === "sds-design/1" && text(b.design_id) && Number.isInteger(b.version) && Array.isArray(b.open_decisions)
    && object(b.approval) && object(b.main_connection) && text(b.main_connection.first_node);
}
function answered(b) { // 5.2
  const open = (d) => !(text(d?.answer) && ref(d?.decided_ref));
  return b.open_decisions.filter(open).map((d) => bad("5.2", `open decision ${show(d?.id)} needs an answer and a decided_ref`, d?.id));
}
function approved(b, body) { // 5.3, 5.4: the digest is recomputed from the fetched body, never taken from the block
  if (typeof body !== "string") return [bad("5.3", "there is no approval body to check")];
  const found = [], token = `${b.design_id}@${b.version}`;
  if (!ref(b.approval.ref) || !hex(b.approval.sha256) || createHash("sha256").update(body).digest("hex") !== b.approval.sha256) {
    found.push(bad("5.3", "approval.ref or approval.sha256 does not match the approval body"));
  }
  const whole = new RegExp(`(?<![\\w.-])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w.-])`);
  if (!body.includes("shirube-owner-decision/v1") || !whole.test(body)) found.push(bad("5.4", `the approval body needs shirube-owner-decision/v1 and ${token}`));
  return found;
}
function bounded(first, nodes, bound, risk) { // 5.6: from R2 up, nothing else is built before the main connection
  if (!Number.isInteger(risk) || risk < 0 || risk > 4) return [bad("5.6", "riskIndex must be an integer from 0 to 4")];
  if (risk < 2) return [note("5.6", "N/A", `risk index ${risk} is below 2`)];
  return bound === first || ancestors(nodes, bound).has(first) ? [] : [bad("5.6", `${show(bound)} is not first_node ${first} and does not depend on it`)];
}
function connected(b, plan, bound, risk) { // 5.5, 5.6, 5.7
  const first = b.main_connection.first_node, nodes = plan?.delivery_graph?.nodes;
  if (plan === null) return ["5.5", "5.6"].map((r) => note(r, "NOT_CHECKED", "there is no plan"));
  if (!Array.isArray(nodes)) return [bad("5.5", "the plan has no delivery_graph.nodes")];
  return [...(ready(nodes, first) ? [] : [bad("5.5", `first_node ${first} is not a node that can start now`)]), ...bounded(first, nodes, bound, risk)];
}
const result = (findings) => ({ verdict: findings.every((f) => NOTES.has(f)) ? "PASS" : "FAIL", findings });

export function designGate(block, input) {
  const { approvalBody, plan, boundNodeId, riskIndex } = input ?? {};
  if (!shaped(block)) return result([bad("5.1", "the block needs schema sds-design/1 and the fields and types of the design contract")]);
  return result([...answered(block), ...approved(block, approvalBody), ...connected(block, plan, boundNodeId, riskIndex)]);
}
