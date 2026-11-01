// sds-gate judgment 5, the pure function (iyasaka-arc#57 6285014153 §1.1): structural facts about one `sds-design/1` block, never the
// meaning of a design. Time, randomness, the environment and the network are not read; the caller passes everything (S4).
import { createHash } from "node:crypto";

const REF = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/issues\/\d+#issuecomment-(\d+)$/;
const NOTES = new WeakSet();
const text = (x) => typeof x === "string" && x.trim() !== "";
// Fields come from JSON, so they can be any type: only a string is tested or printed as one (no implicit conversion).
export const refOf = (x) => (typeof x === "string" ? REF.exec(x) : null); // a decision ref's [_, repo, comment id], or null: the one place that knows its shape
const ref = (x) => refOf(x) !== null;
export const hex = (x) => typeof x === "string" && /^[0-9a-f]{64}$/.test(x);
export const show = (x) => (typeof x === "string" ? x : JSON.stringify(x));
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
const globs = (x) => x === undefined || (Array.isArray(x) && x.every(text)); // 5.1: placements, when present, is a list of non-empty strings
function shaped(b) { // 5.1
  return object(b) && b.schema === "sds-design/1" && text(b.design_id) && Number.isInteger(b.version) && Array.isArray(b.open_decisions)
    && object(b.approval) && object(b.main_connection) && text(b.main_connection.first_node) && globs(b.placements);
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
function kinded(b, designPr) { // 5.1: approval.kind is owner_decision (or absent) or unit_design; only a unit design has design_pr and its approval is {kind} alone
  const kind = b.approval.kind;
  if (kind !== undefined && kind !== "owner_decision" && kind !== "unit_design") return [bad("5.1", `approval.kind ${show(kind)} is not owner_decision or unit_design`)];
  const fits = kind === "unit_design" ? Object.keys(b.approval).length === 1 && Number.isInteger(designPr) && designPr > 0 : designPr === undefined;
  return fits ? [] : [bad("5.1", "a unit design has approval {kind} alone and a design_pr (a PR number); design_pr is for nothing else")];
}
function placed(b, paths, matches) { // 5.9: every changed path is inside the design's placements; the caller passes the glob matcher (the one of protected_paths) and the paths (judgment 2's)
  const none = Array.isArray(paths) ? [] : [note("5.9", "NOT_CHECKED", "changed paths were not given")]; // never skipped silently, with placements or without
  if (b.placements === undefined) return none.length > 0 ? none : [note("5.9", "NOT_CHECKED", "the design names no placements")];
  const outside = none.length === 0 && typeof matches === "function" ? [...new Set(paths)].filter((p) => !matches(p, b.placements)).sort() : null;
  return [...none, ...(outside === null ? [bad("5.9", "the changed paths or the glob matcher are not given, so the placements cannot be checked")] : outside.length === 0 ? [] : [bad("5.9", `paths outside the design placements: ${outside.join(", ")}`)])];
}
const COMMENT = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/(?:pull|issues)\/(\d+)#issuecomment-\d+$/, RECEIVER = "watchout"; // 5.3u (docs/design/u4-unit-design-approval.md §3.1): RECEIVER is the account the pinned checker takes requests from (a test compares)
const HELD = Object.assign(note("5.3u", "", ""), { message: "5.3u (a)-(i) passed; the edit history check (j) is not implemented yet" }); // a note, never a failure
const digest = (s) => createHash("sha256").update(String(s)).digest("hex");
const parsed = (s) => { try { return JSON.parse(s); } catch { return null; } };
export const fenced = (s) => parsed(/^```json\r?\n([\s\S]*?)^```/m.exec(s)?.[1]); // a comment's first json block
const own = (u, e) => { const m = typeof u === "string" ? COMMENT.exec(u) : null; return m !== null && m[1] === e.repo && m[2] === String(e.pr); }; // a comment of the design PR itself
export function approve(e) { // (d): the newest APPROVED on the merged head, made before the merge, whose one json block binds a request and a review of that PR
  const sound = (r) => { const j = fenced(r.body); return r.commit_id === e.head && r.state === "APPROVED" && r.submitted_at <= e.merged && (String(r.body).match(/^```json\r?\n/gm) ?? []).length === 1 && j?.verdict === "RECEIPT_ACCEPTED" && own(j.request, e) && own(j.review, e) && [j.request_digest, j.review_digest, j.checker_sha256].every(hex); };
  const [a] = e.reviews.filter(sound).sort((x, y) => (x.submitted_at < y.submitted_at ? 1 : -1));
  return a ? { ...a, bind: fenced(a.body) } : null;
}
const fresh = (c, who, want, a) => c?.user?.login === who && digest(c.body) === want && c.updated_at <= a.submitted_at; // the comment the Approve names, untouched since
const target = (j, e) => { const t = (Array.isArray(j?.targets) ? j.targets : []).filter((x) => x?.repo === e.repo && x?.pr === e.pr && x?.head === e.head); return t.length === 1 && j.item_set?.target === t[0].id ? t[0].id : null; };
const passed = (j, a, k, e) => j?.schema === "sds-audit-review/1" && j.request_digest === a.bind.request_digest && JSON.stringify(j.targets) === JSON.stringify([{ id: k, head: e.head }]) && j.blocking_findings?.length === 0 && j.items?.length > 0 && j.items.every((i) => i?.result === "PASS"); // (f)
const asked = (j, k, b, a) => j?.schema === "sds-audit-request/1" && j.audit_stage === "design" && k !== null && j.verifier_sha256 === b.checker_sha256 && j.reviewer?.github === a.user?.login; // (e)
const scoped = (j, e) => { const set = parsed(e.item); return digest(e.item) === j?.item_set?.sha256 && typeof set?.scope === "string" && set.scope.includes(e.path); }; // (g)
const printed = (b, e) => { const p = parsed(/^```json sds-pr\r?\n([\s\S]*?)^```\s*$/m.exec(e.body)?.[1])?.audit; return p?.request === b.request && p.request_sha256 === b.request_digest && p.review === b.review; }; // (i)
function audited(a, e) { // (e)-(i): the first that does not hold, or null
  const rq = fenced(e.request?.body), k = target(rq, e), b = a.bind;
  return [[fresh(e.request, RECEIVER, b.request_digest, a) && asked(rq, k, b, a), "(e) the request the Approve names is not an untouched design-stage request for the merged head"],
    [fresh(e.review, a.user?.login, b.review_digest, a) && passed(fenced(e.review.body), a, k, e), "(f) the return the Approve names is not an untouched all-PASS return of the audit seat"], [scoped(rq, e), "(g) the audited item set does not name the design file"],
    [e.files.some((f) => f.path === e.path || f.from === e.path), "(h) the design file is not changed by design_pr"], [printed(b, e), "(i) the audit in the design PR block is not the one the Approve names"]].find(([ok]) => !ok)?.[1] ?? null;
}
function unitWhy(e) { // (a)-(i): the first fact that does not hold, or null; (j), the edit history, is 2b
  if (e.designRepo !== e.repo) return "(a) design_ref is in another repository than this PR";
  if (typeof e.merged !== "string") return `(b) design_pr ${e.pr} is not merged`;
  if (e.got !== e.want) return "(c) the design file at the merged head differs from design_sha256";
  const a = approve(e), later = (r) => r.user?.login === a?.user?.login && r.commit_id === e.head && r.state === "CHANGES_REQUESTED" && r.submitted_at > a.submitted_at && r.submitted_at <= e.merged;
  return a === null || e.reviews.some(later) ? "(d) no APPROVED review of the merged head binds a request and a review of design_pr, or its author asked for changes after it" : audited(a, e);
}
export const failed = (findings) => findings.filter((f) => !NOTES.has(f)); // the findings that are failures, not notes
const result = (findings) => ({ verdict: failed(findings).length === 0 ? "PASS" : "FAIL", findings });

export function designGate(block, input) {
  const { approvalBody, plan, boundNodeId, riskIndex, changedPaths, matches, designPr, evidence } = input ?? {};
  if (!shaped(block)) return result([bad("5.1", "the block needs schema sds-design/1 and the fields and types of the design contract")]);
  const wrong = kinded(block, designPr), unit = block.approval.kind === "unit_design";
  if (wrong.length > 0) return result(wrong);
  const why = unit ? unitWhy(evidence()) : null; // evidence() is read only now that 5.1 passed
  const approval = !unit ? approved(block, approvalBody) : why === null ? [HELD] : [bad("5.3u", why)]; // 5.3u: never PASS for a unit design until (j)
  const r = result([...answered(block), ...approval, ...connected(block, plan, boundNodeId, riskIndex), ...placed(block, changedPaths, matches)]);
  return unit && r.verdict === "PASS" ? { ...r, verdict: "NOT_CHECKED" } : r;
}
