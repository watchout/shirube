// sds-gate judgment 4 (distribution.md §4; ARC 5-section v1.1, iyasaka-arc#57 6176441018 §3): digest, id, status and path
// matches in its §2 order, stopping at the first miss (4.1..4.17); yaml blocks as ADF 561baebe extractCanonicalControlHandoff.
import { createHash } from "node:crypto";
import { matchesAny } from "../hygiene/lib.mjs";
const REF = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/(issues|pull)\/(\d+)#issuecomment-(\d+)$/, SCHEMA = /schema_version\s*:/m, BROKEN = Symbol("broken");
const str = (x) => typeof x === "string", hex = (x) => str(x) && /^[0-9a-f]{64}$/.test(x), list = (x) => (Array.isArray(x) ? x : []);
const same = (a, b) => ["plan_id", "generation", "node_id"].every((k) => a[k] === b[k]), within = (xs, set) => Array.isArray(xs) && xs.length > 0 && xs.every((x) => str(x) && list(set).includes(x));
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable)}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)}}` : JSON.stringify(v));
function need(ok, why) { if (!ok) throw new Error(why); }
function comment(ref, digest, step, api) {
  const [, repo, , , id] = REF.exec(ref), body = api(`repos/${repo}/issues/comments/${id}`).body;
  need(createHash("sha256").update(body).digest("hex") === digest, `${step} the body of ${ref} does not have SHA-256 ${digest}`);
  return body;
}
function blocks(body, schema, parse) {
  const all = [...body.matchAll(/```ya?ml[ \t]*\r?\n([\s\S]*?)\r?\n```/gi)].map((m) => m[1]);
  const read = all.map((yaml) => { try { return parse(yaml); } catch (error) { need(error instanceof SyntaxError, "yaml reader unavailable"); return SCHEMA.test(yaml) ? BROKEN : null; } });
  return { found: read.filter((v) => v?.schema_version === schema), broken: read.includes(BROKEN), other: all.some((y) => SCHEMA.test(y)) };
}
function plan(b, repo, { api, parse }) {
  const r = blocks(comment(b.comment_ref, b.comment_sha256, "4.3", api), "shirube-delivery-plan/v1", parse), p = r.found[0];
  need(!r.broken && r.found.length === 1 && p.plan_id === b.plan_id && p.generation === b.generation, "4.4 the comment needs one shirube-delivery-plan/v1 block with this plan_id and generation");
  need(p.status === "ADMITTED", `4.5 the plan is ${p.status}, not ADMITTED`);
  const nodes = list(p.delivery_graph?.nodes), node = nodes.find((n) => n?.id === b.node_id);
  need(node, `4.6 node ${b.node_id} is not in the plan`);
  need(node.repository === repo, `4.7 node ${b.node_id} is for ${node.repository}, not ${repo}`);
  need(Array.isArray(node.depends_on) && node.depends_on.every((id) => nodes.find((n) => n?.id === id)?.lifecycle_status === "COMPLETE"), "4.8 a depends_on node is not COMPLETE");
  return { node, terminal: list(p.owner_outcome?.terminal_predicates).map((t) => t?.id) };
}
function handoff(h, { api, parse }) {
  const body = comment(h.ref, h.sha256, "4.9", api);
  need(/<!--\s*shirube-v3:control-handoff(?::[^\s>]+)?\s*-->/.test(body), "4.10 CHANDOFF-REF-005 the shirube-v3:control-handoff marker is missing");
  const r = blocks(body, "shirube-v3/control_handoff/v1", parse);
  need(!r.broken, "4.10 CHANDOFF-REF-008 a control_handoff block is not valid YAML");
  need(r.found.length > 0, r.other ? "4.10 CHANDOFF-REF-009 no block has schema_version shirube-v3/control_handoff/v1" : "4.10 CHANDOFF-REF-006 no control_handoff block");
  need(new Set(r.found.map(stable)).size === 1, "4.10 CHANDOFF-REF-007 the control_handoff blocks differ");
  return { doc: r.found[0], warnings: r.found.length > 1 ? ["CHANDOFF-REF-W001 duplicate identical control_handoff blocks"] : [] };
}
function requested(rp, b, hp) { // R2 and above: the audit request judgment 3 accepted
  need(rp && typeof rp === "object", "4.14 the audit request has no plan_binding");
  need(same(rp, b), "4.15 the audit request names another plan_id, generation or node_id");
  need(within(rp.changes_predicates, hp.changes_predicates), "4.16 the audit request's changes_predicates must be in the control_handoff's");
}
function judge(b, h, { ctx, paths, request }, io) {
  const { node, terminal } = plan(b, ctx.repo, io), { doc, warnings } = handoff(h, io), hp = doc.plan_binding ?? {};
  need(same(hp, b), "4.11 the control_handoff names another plan_id, generation or node_id");
  need(hp.plan_comment_ref === b.comment_ref && hp.plan_comment_sha256 === b.comment_sha256, "4.12 the control_handoff names another plan comment or digest (a string)");
  need(within(hp.changes_predicates, node.changes_predicates) && within(hp.changes_predicates, terminal), "4.13 changes_predicates must be in the node and in the terminal predicates");
  if (request) requested(request.plan_binding, b, hp);
  const allowed = list(doc.allowed_paths).every(str) ? list(doc.allowed_paths) : [], outside = paths.filter((x) => !matchesAny(x, allowed));
  need(allowed.length > 0 && outside.length === 0, `4.17 allowed_paths do not cover: ${outside.join(", ")}`);
  return { result: "PASS", plan_id: b.plan_id, generation: b.generation, node_id: b.node_id, ...(warnings.length > 0 && { warnings }) };
}
export function planBinding(mode, input, io) {
  if (mode === "off") return { mode, result: "NOT_CHECKED", reason: "plan_binding_mode is off" };
  const b = input.pr.delivery_plan_binding ?? {}, h = input.pr.control_handoff ?? {};
  try {
    need(["report-only", "blocking"].includes(mode), `plan_binding_mode must be off, report-only or blocking, not ${mode}`);
    need([str(b.comment_ref), hex(b.comment_sha256), str(b.plan_id), Number.isInteger(b.generation), str(b.node_id), str(h.ref), hex(h.sha256)].every(Boolean), "4.1 delivery_plan_binding and control_handoff need the fields and types of sds-pr/1");
    need(REF.test(b.comment_ref) && REF.test(h.ref), "4.2 comment_ref and control_handoff.ref must be https://github.com/watchout/<repo>/(issues|pull)/<n>#issuecomment-<id>");
    return { mode, ...judge(b, h, input, io) };
  } catch (error) { return { mode, result: "FAIL", reason: error.message }; }
}
