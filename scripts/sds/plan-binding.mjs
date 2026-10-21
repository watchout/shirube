// sds-gate judgment 4 (distribution.md §4; ARC 5-section v1.1, iyasaka-arc#57 6176441018 §3; design v2 iyasaka-arc#57 6306257668 §3): digest,
// id, status and path matches in its §2 order, stopping at the first miss (4.1..4.18); yaml blocks as ADF 561baebe extractCanonicalControlHandoff.
// Two forms of delivery_plan_binding. Old: comment_ref, comment_sha256, generation, plan_id, node_id (the plan is the comment the PR names).
// New: plan_id and node_id only (4.3a-4.3e): the plan is the highest ADMITTED generation among the comments of the base pin's
// delivery_plan.control_source, an issue of the same repository, so the author never copies a digest or a generation.
import { createHash } from "node:crypto";
import { matchesAny } from "../hygiene/lib.mjs";
import { currentStage } from "./stage.mjs";
const REF = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/(issues|pull)\/(\d+)#issuecomment-(\d+)$/, ISSUE = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/issues\/(\d+)$/, SCHEMA = /schema_version\s*:/m, BROKEN = Symbol("broken");
const str = (x) => typeof x === "string", hex = (x) => str(x) && /^[0-9a-f]{64}$/.test(x), list = (x) => (Array.isArray(x) ? x : []);
const OLD_KEYS = ["plan_id", "generation", "node_id"], NEW_KEYS = ["plan_id", "node_id"], PAGE = 100, MAX_PAGES = 30;
const same = (a, b, keys) => keys.every((k) => a[k] === b[k]), within = (xs, set) => Array.isArray(xs) && xs.length > 0 && xs.every((x) => str(x) && list(set).includes(x));
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable)}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)}}` : JSON.stringify(v));
function need(ok, why) { if (!ok) throw new Error(why); }
export function comment(ref, digest, step, api) {
  const [, repo, , , id] = REF.exec(ref), body = api(`repos/${repo}/issues/comments/${id}`).body;
  need(createHash("sha256").update(body).digest("hex") === digest, `${step} the body of ${ref} does not have SHA-256 ${digest}`);
  return body;
}
export function blocks(body, schema, parse) {
  const all = [...body.matchAll(/```ya?ml[ \t]*\r?\n([\s\S]*?)\r?\n```/gi)].map((m) => m[1]);
  const read = all.map((yaml) => { try { return parse(yaml); } catch (error) { need(error instanceof SyntaxError, "yaml reader unavailable"); return SCHEMA.test(yaml) ? BROKEN : null; } });
  return { found: read.filter((v) => v?.schema_version === schema), broken: read.includes(BROKEN), other: all.some((y) => SCHEMA.test(y)) };
}
// A GET list read to its end: a list that does not end within MAX_PAGES is a failure, never a partial read (S8).
function pages(api, path, what, step) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let batch;
    try { batch = api(`${path}${path.includes("?") ? "&" : "?"}per_page=${PAGE}&page=${page}`); } catch (error) { throw new Error(`${step} could not read ${what}: ${error.message}`); }
    need(Array.isArray(batch), `${step} ${what} did not return a list`);
    out.push(...batch);
    if (batch.length < PAGE) return out;
  }
  throw new Error(`${step} ${what} has more than ${MAX_PAGES * PAGE} entries`);
}
// The plan block judgment 4 chose, found again in its comment by plan_id and generation (judgment 5 reads it; a comment may hold several blocks).
export const planBlock = (body, planId, generation, parse) => blocks(body, "shirube-delivery-plan/v1", parse).found.find((p) => p.plan_id === planId && p.generation === generation && p.status === "ADMITTED");
function loadOld(b, { api, parse }) {
  const r = blocks(comment(b.comment_ref, b.comment_sha256, "4.3", api), "shirube-delivery-plan/v1", parse), p = r.found[0];
  need(!r.broken && r.found.length === 1 && p.plan_id === b.plan_id && p.generation === b.generation, "4.4 the comment needs one shirube-delivery-plan/v1 block with this plan_id and generation");
  need(p.status === "ADMITTED", `4.5 the plan is ${p.status}, not ADMITTED`);
  return { p };
}
function admitted(body, id, planId, parse) { // the ADMITTED blocks of one comment for this plan_id; a broken block is a failure, never skipped
  if (!str(body) || !body.includes("shirube-delivery-plan/v1")) return [];
  const r = blocks(body, "shirube-delivery-plan/v1", parse);
  need(!r.broken, `4.3c a shirube-delivery-plan/v1 block in comment ${id} is not valid YAML`);
  return r.found.filter((p) => p.plan_id === planId && p.status === "ADMITTED").map((p) => {
    need(Number.isInteger(p.generation) && p.generation > 0, `4.3c the ADMITTED block in comment ${id} has no positive integer generation`);
    return { p, id, body };
  });
}
function loadNew(b, ctx, { api, parse, controlSource }) {
  need(str(controlSource), "4.3a the base pin has no delivery_plan.control_source, so a delivery_plan_binding of plan_id and node_id cannot be resolved");
  const m = ISSUE.exec(controlSource);
  need(m && m[1] === ctx.repo, `4.3b delivery_plan.control_source must be an issue of ${ctx.repo} (https://github.com/<owner>/<repo>/issues/<n>), not ${controlSource}`);
  const found = pages(api, `repos/${ctx.repo}/issues/${m[2]}/comments`, `the comments of ${controlSource}`, "4.3c").flatMap((c) => admitted(c?.body, c?.id, b.plan_id, parse));
  need(found.length > 0, `4.3d no ADMITTED shirube-delivery-plan/v1 block for ${b.plan_id} in ${controlSource}`);
  const top = Math.max(...found.map((x) => x.p.generation)), tops = found.filter((x) => x.p.generation === top);
  need(tops.length === 1, `4.3e generation ${top} of ${b.plan_id} is ADMITTED in ${tops.length} blocks of ${controlSource}`);
  const ref = `https://github.com/${ctx.repo}/issues/${m[2]}#issuecomment-${tops[0].id}`;
  return { p: tops[0].p, resolved: { comment_id: tops[0].id, comment_ref: ref, comment_sha256: createHash("sha256").update(tops[0].body).digest("hex") } };
}
// A node that is not COMPLETE counts as done when a PR naming it was merged into the default branch and its handoff says completes_unit: true.
function namedHandoff(pr, id, planId, block) { // the control_handoff ref of a PR whose sds-pr block binds this node, or null
  let named;
  try { named = block(pr.body); } catch { return null; } // a PR without exactly one sds-pr block names no node
  const b = named.delivery_plan_binding, h = named.control_handoff;
  return b?.plan_id === planId && b?.node_id === id && str(h?.ref) && REF.test(h.ref) ? h : null;
}
function completesUnit(pr, id, planId, io) {
  const h = namedHandoff(pr, id, planId, io.block);
  if (!h) return false;
  const { doc } = handoff(h, io); // the one reader of 4.9/4.10: a missing marker, a broken YAML or differing blocks is no completion
  return doc.completes_unit === true && doc.plan_binding?.node_id === id && doc.plan_binding?.plan_id === planId;
}
const candidate = (pr, branch) => Boolean(pr?.merged_at) && pr.base?.ref === branch && str(pr.body); // a merged PR into the default branch is the only thing that can complete a Unit
function mergedUnit(id, planId, repo, io) {
  let branch;
  try { branch = io.api(`repos/${repo}`).default_branch; } catch (error) { throw new Error(`4.8 could not read ${repo}: ${error.message}`); }
  let unread;
  for (const pr of pages(io.api, `repos/${repo}/pulls?state=closed`, `the closed PRs of ${repo}`, "4.8")) {
    if (!candidate(pr, branch)) continue;
    try { if (completesUnit(pr, id, planId, io)) return true; } catch (error) { unread ??= error; } // an unreadable handoff is not a completion, and is not hidden
  }
  if (unread) throw new Error(`${unread.message} (while looking for a merged PR that completes ${id})`);
  return false;
}
function nodeOf(p, b, repo, io) {
  const nodes = list(p.delivery_graph?.nodes), node = nodes.find((n) => n?.id === b.node_id);
  need(node, `4.6 node ${b.node_id} is not in the plan`);
  need(node.repository === repo, `4.7 node ${b.node_id} is for ${node.repository}, not ${repo}`);
  need(Array.isArray(node.depends_on), `4.8 depends_on of node ${b.node_id} is not a list`);
  for (const id of node.depends_on) {
    const dep = nodes.find((n) => n?.id === id);
    need(dep, `4.8 depends_on names ${id}, which is not a node of the plan`);
    need(dep.lifecycle_status === "COMPLETE" || mergedUnit(id, b.plan_id, repo, io), `4.8 a depends_on node (${id}) is not COMPLETE and no merged PR completes it (completes_unit: true)`);
  }
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
function requested(rp, b, hp, keys) { // R2 and above: the audit request judgment 3 accepted
  need(rp && typeof rp === "object", "4.14 the audit request has no plan_binding");
  need(same(rp, b, keys), `4.15 the audit request names another ${keys.join(", ")}`);
  need(within(rp.changes_predicates, hp.changes_predicates), "4.16 the audit request's changes_predicates must be in the control_handoff's");
}
function inStage(p, node) { // 4.18 (b'), new form: a Unit changes only the acceptance IDs of the current stage k (design v2 §3.3, §3.5)
  let k;
  try { k = currentStage(p); } catch (error) { throw new Error(`4.18 the current stage cannot be read: ${error.message}`); }
  need(k !== null, "4.18 every terminal predicate is satisfied, so the plan is closed: a Unit needs an Owner adoption of the next stage first");
  const outside = list(node.changes_predicates).filter((id) => !str(id) || !id.startsWith(`${k}-`));
  need(outside.length === 0, `4.18 node ${node.id} changes ${outside.map(String).join(", ")}, outside the current stage ${k} (anti_work)`);
}
function agrees(doc, b, old, node, terminal) { // 4.11 to 4.13: the control_handoff against the PR's binding, the node and the terminal predicates
  const hp = doc.plan_binding ?? {}, keys = old ? OLD_KEYS : NEW_KEYS;
  need(same(hp, b, keys), `4.11 the control_handoff names another ${keys.join(", ")}`);
  if (old) need(hp.plan_comment_ref === b.comment_ref && hp.plan_comment_sha256 === b.comment_sha256, "4.12 the control_handoff names another plan comment or digest (a string)");
  need(within(hp.changes_predicates, node.changes_predicates) && within(hp.changes_predicates, terminal), "4.13 changes_predicates must be in the node and in the terminal predicates");
  return hp;
}
function covered(doc, paths) { // 4.17
  const allowed = list(doc.allowed_paths).every(str) ? list(doc.allowed_paths) : [], outside = paths.filter((x) => !matchesAny(x, allowed));
  need(allowed.length > 0 && outside.length === 0, `4.17 allowed_paths do not cover: ${outside.join(", ")}`);
}
function judge(b, old, h, { ctx, paths, request }, io) {
  const { p, resolved } = old ? loadOld(b, io) : loadNew(b, ctx, io), { node, terminal } = nodeOf(p, b, ctx.repo, io), { doc, warnings } = handoff(h, io);
  const hp = agrees(doc, b, old, node, terminal);
  if (request) requested(request.plan_binding, b, hp, old ? OLD_KEYS : NEW_KEYS);
  covered(doc, paths);
  if (!old) inStage(p, node); // the old form is accepted as it was for one generation (S6); the stage rule is the new form's
  return { result: "PASS", plan_id: b.plan_id, generation: old ? b.generation : p.generation, node_id: b.node_id, ...resolved, ...(warnings.length > 0 && { warnings }) };
}
export function planBinding(mode, input, io) {
  if (mode === "off") return { mode, result: "NOT_CHECKED", reason: "plan_binding_mode is off" };
  const b = input.pr.delivery_plan_binding ?? {}, h = input.pr.control_handoff ?? {};
  const old = ["comment_ref", "comment_sha256", "generation"].some((k) => b[k] !== undefined); // any old-only field makes it the old form
  try {
    need(["report-only", "blocking"].includes(mode), `plan_binding_mode must be off, report-only or blocking, not ${mode}`);
    need([str(b.plan_id), str(b.node_id), str(h.ref), hex(h.sha256), ...(old ? [str(b.comment_ref), hex(b.comment_sha256), Number.isInteger(b.generation)] : [])].every(Boolean), "4.1 delivery_plan_binding and control_handoff need the fields and types of sds-pr/1");
    need(REF.test(h.ref) && (!old || REF.test(b.comment_ref)), "4.2 comment_ref and control_handoff.ref must be https://github.com/watchout/<repo>/(issues|pull)/<n>#issuecomment-<id>");
    return { mode, ...judge(b, old, h, input, io) };
  } catch (error) { return { mode, result: "FAIL", reason: error.message }; }
}
