// 5.3u (a)-(j) (docs/design/u4-unit-design-approval.md §3.1, §4 T1-T22, T24, T26, T27, T30-T34): a unit design whose PR passed a design-stage audit and got the audit seat's Approve, in the shape of shirube#75, and every way to break one fact.
// T23, T25, T28, T29 stay in design-gate-unit.test.mjs (T16), design-gate.test.mjs (only import node:crypto), workflow-contract.test.mjs and the whole suite.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { designGate, failed } from "../scripts/sds/design-gate.mjs";
import { gate } from "../scripts/sds/gate.mjs";
import { matchesAny } from "../scripts/hygiene/lib.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const REPO = "watchout/shirube", PR = 75, HEAD = "e".repeat(40), P = "docs/design/d.md", ITEMS = "docs/audit/d-items.json", SEAT = "iyasaka-ai", CHECKER = sha("checker");
const MERGED = "2026-10-28T22:17:01Z", ASKED = "2026-10-28T22:05:41Z", RETURNED = "2026-10-28T22:12:05Z", APPROVED = "2026-10-28T22:12:59Z", LATER = "2026-10-28T22:13:30Z";
const at = (id) => `https://github.com/${REPO}/pull/${PR}#issuecomment-${id}`;
const fence = (j, tag = "") => `<!-- note -->\n\`\`\`json${tag}\n${JSON.stringify(j, null, 2)}\n\`\`\`\n`;
const items = (scope) => JSON.stringify({ schema: "sds-audit-items/1", scope });
const edits = (...v) => ({ totalCount: v.length, pageInfo: { hasNextPage: false }, nodes: v }); // the edit history GraphQL gives for a node (userContentEdits)
const node = (type, id, last = null, ...v) => ({ __typename: type, databaseId: id, lastEditedAt: last, userContentEdits: edits(...v) });
const BLOCK = { schema: "sds-design/1", design_id: "d", version: 1, open_decisions: [], approval: { kind: "unit_design" }, main_connection: { id: "MC1", statement: "s", first_node: "N1" } };
const DESIGN = fence(BLOCK, " sds-design");
function world({ stage = "design", scope = `audited: ${P}`, request = {}, review = {}, items: results = [{ id: "D1", result: "PASS" }] } = {}) { // the evidence of a good world, with the request and the return overridable
  const rq = fence({ schema: "sds-audit-request/1", audit_stage: stage, targets: [{ id: "T", repo: REPO, pr: PR, head: HEAD }], item_set: { target: "T", path: ITEMS, sha256: sha(items(scope)) }, verifier_sha256: CHECKER, reviewer: { actor: "devauditor", github: SEAT }, ...request });
  const rv = fence({ schema: "sds-audit-review/1", request_digest: sha(rq), targets: [{ id: "T", head: HEAD }], blocking_findings: [], items: results, ...review });
  const bind = { request: at(1), request_digest: sha(rq), review: at(2), review_digest: sha(rv), verdict: "RECEIPT_ACCEPTED", checker_sha256: CHECKER };
  const approve = { id: 5001, node_id: "PRR_a", user: { login: SEAT }, state: "APPROVED", commit_id: HEAD, submitted_at: APPROVED, body: fence(bind) };
  const body = fence({ schema: "sds-pr/1", audit: { request: bind.request, request_sha256: bind.request_digest, review: bind.review } }, " sds-pr");
  return { repo: REPO, pr: PR, designRepo: REPO, want: sha(DESIGN), got: sha(DESIGN), path: P, head: HEAD, merged: MERGED, body, bind, reviews: [approve], files: [{ path: P }], item: items(scope),
    request: { user: { login: "watchout" }, body: rq, updated_at: ASKED }, review: { id: 2, node_id: "IC_b", user: { login: SEAT }, body: rv, updated_at: RETURNED },
    history: { data: { nodes: [node("PullRequestReview", 5001), node("IssueComment", 2)] } } }; // neither the Approve nor the return was ever edited
}
const GOOD = world(); // a world nothing mutates: every test copies it
const judge = (ev) => designGate(BLOCK, { approvalBody: null, plan: null, boundNodeId: "N1", riskIndex: 1, changedPaths: ["docs/a.md"], matches: matchesAny, designPr: PR, evidence: () => ev });
const out = (ev) => { const r = judge(ev); return [r.verdict, ...failed(r.findings).map((f) => /^5\.3u (\(\w\))/.exec(f.message)?.[1] ?? f.message)]; };
const OK = ["PASS"], no = (x) => ["FAIL", x];
const apart = (ev, patch) => ({ ...ev, reviews: [{ ...ev.reviews[0], ...patch }] }), also = (ev, r) => ({ ...ev, reviews: [...ev.reviews, r] });
const asked = (ev, patch) => ({ ...ev, request: { ...ev.request, ...patch } }), returned = (ev, patch) => ({ ...ev, review: { ...ev.review, ...patch } });
const asks = (ev) => ({ user: { login: SEAT }, state: "CHANGES_REQUESTED", commit_id: ev.head, submitted_at: LATER, body: "" });

test("T1 every fact holds (a)-(j): 5.3u gives no failure and the verdict is PASS (2a held it at NOT_CHECKED until (j) existed)", () => {
  const r = judge(world());
  assert.deepEqual([r.verdict, failed(r.findings), r.findings.filter((f) => f.reason === "5.3u")], ["PASS", [], []]);
});
test("T2, T21, T3 (a) another repository, (b) a design PR that is not merged, (c) a design file that differs from design_sha256", () => {
  assert.deepEqual([{ ...world(), designRepo: "watchout/other" }, { ...world(), merged: null }, { ...world(), merged: undefined }, { ...world(), got: sha("other") }].map(out), [no("(a)"), no("(b)"), no("(b)"), no("(c)")]);
});
test("T4 no Approve binds: no review, another commit, after the merge, no json in the body", () => {
  const ev = world();
  assert.deepEqual([{ ...ev, reviews: [] }, apart(ev, { commit_id: "f".repeat(40) }), apart(ev, { submitted_at: "2026-10-28T22:17:02Z" }), apart(ev, { body: "LGTM" })].map(out), [no("(d)"), no("(d)"), no("(d)"), no("(d)")]);
  assert.deepEqual(out(apart(ev, { submitted_at: MERGED })), OK); // control: made at the merge instant
});
test("T5 a dismissed Approve, or one withdrawn by its author before the merge, FAILs; a request before it, by another, or after the merge does not", () => {
  const ev = world();
  assert.deepEqual([apart(ev, { state: "DISMISSED" }), also(ev, asks(ev))].map(out), [no("(d)"), no("(d)")]);
  assert.deepEqual([also(ev, { ...asks(ev), submitted_at: "2026-10-28T22:12:00Z" }), also(ev, { ...asks(ev), user: { login: "other" } }), also(ev, { ...asks(ev), submitted_at: "2026-10-28T22:18:00Z" })].map(out), [OK, OK, OK]);
});
test("T6 the Approve body must hold one json block with every field, RECEIPT_ACCEPTED, and comments of the design PR itself", () => {
  const b = GOOD.bind, other = `https://github.com/${REPO}/pull/76#issuecomment-1`;
  const bodies = ["no block", fence(b) + fence(b), fence({ ...b, review_digest: undefined }), fence({ ...b, verdict: "RECEIPT_REJECTED" }), fence({ ...b, request: other }), fence({ ...b, review: `https://github.com/watchout/x/pull/${PR}#issuecomment-2` }), fence({ ...b, checker_sha256: "x" })];
  assert.deepEqual(bodies.map((body) => out(apart(GOOD, { body }))), bodies.map(() => no("(d)")));
});
test("T7 BF-U4C-01: a request whose audit_stage is implementation FAILs, though its return is all PASS", () => {
  assert.deepEqual(out(world({ stage: "implementation" })), no("(e)"));
});
test("T8-T11 BF-U4C-04: a request put back to design after the Approve, a changed body, or a comment edited after the Approve FAIL", () => {
  const late = GOOD, w = world({ stage: "implementation" });
  assert.deepEqual([{ ...w, request: { ...w.request, body: GOOD.request.body } }, asked(late, { updated_at: LATER }), asked(late, { body: `${late.request.body} ` }), returned(late, { updated_at: LATER }), returned(late, { body: `${late.review.body} ` })].map(out),
    [no("(e)"), no("(e)"), no("(e)"), no("(f)"), no("(f)")]);
  assert.deepEqual([asked(late, { updated_at: APPROVED }), returned(late, { updated_at: APPROVED })].map(out), [OK, OK]); // control: untouched since the Approve
});
test("T12 the request: another PR or head, two targets, another publisher, another checker, another reviewer, an item set aimed elsewhere", () => {
  const t = { id: "T", repo: REPO, pr: PR, head: HEAD }, set = { target: "T", path: ITEMS, sha256: sha(items(`audited: ${P}`)) };
  const requests = [{ targets: [{ ...t, pr: 76 }] }, { targets: [{ ...t, head: "f".repeat(40) }] }, { targets: [t, t] }, { verifier_sha256: sha("x") }, { reviewer: { actor: "devauditor", github: "other" } }, { item_set: { ...set, target: "Z" } }];
  assert.deepEqual([...requests.map((request) => out(world({ request }))), out(asked(GOOD, { user: { login: "other" } }))], requests.map(() => no("(e)")).concat([no("(e)")]));
});
test("T13, T14 the return: not by the seat, another request, another target, a blocking finding, a FAIL item, no item", () => {
  const rv = [{ request_digest: sha("x") }, { targets: [{ id: "Z", head: HEAD }] }, { targets: [{ id: "T", head: "f".repeat(40) }] }, { blocking_findings: [{ id: "F" }] }];
  assert.deepEqual([...rv.map((review) => out(world({ review }))), out(world({ items: [{ id: "D1", result: "PASS" }, { id: "D2", result: "FAIL" }] })), out(world({ items: [] })), out(returned(GOOD, { user: { login: "watchout" } }))], Array(7).fill(no("(f)")));
});
test("T15 BF-U4C-05: an item set that names design A does not approve design B, and does approve A", () => {
  const w = world({ scope: "audited: docs/design/a.md" }), B = "docs/design/b.md";
  assert.deepEqual([{ ...w, path: B, files: [{ path: B }] }, { ...w, path: "docs/design/a.md", files: [{ path: "docs/design/a.md" }] }].map(out), [no("(g)"), OK]);
});
test("T16 an item set whose bytes differ from item_set.sha256, that is not json, or whose scope is not a string", () => {
  assert.deepEqual([{ ...GOOD, item: `${GOOD.item} ` }, { ...GOOD, item: "not json" }, world({ scope: 5 })].map(out), [no("(g)"), no("(g)"), no("(g)")]);
});
test("T17 a design file that design_pr does not change FAILs; a renamed one counts under its old and new path", () => {
  assert.deepEqual([{ ...GOOD, files: [{ path: "x.md" }] }, { ...GOOD, files: [{ path: "new.md", from: P }] }, { ...GOOD, files: [{ path: P }] }].map(out), [no("(h)"), OK, OK]);
});
test("T18 the audit in the design PR block must be the one the Approve names", () => {
  const w = GOOD, b = w.bind, audit = (a) => fence({ schema: "sds-pr/1", audit: { request: b.request, request_sha256: b.request_digest, review: b.review, ...a } }, " sds-pr");
  assert.deepEqual(["no block", audit({ request_sha256: sha("x") }), audit({ review: at(3) }), audit({ request: at(3) })].map((body) => out({ ...w, body })), Array(4).fill(no("(i)")));
});

// Through the gate: REST reads, pages, failures, stages.
const PRN = 7, BASE = "b".repeat(40), stray = (n, make) => Array.from({ length: n }, make);
const page = (list, path) => { const n = Number(/&page=(\d+)/.exec(path)[1]); return list.slice((n - 1) * 100, n * 100); };
function run(ev, o = {}) {
  const b64 = (s) => ({ encoding: "base64", content: Buffer.from(s).toString("base64") }), calls = [], queries = [], design = `https://github.com/${ev.designRepo}/blob/${HEAD}/${P}`;
  const query = (ids) => { queries.push(ids); if (o.queryFails) throw new Error("HTTP 502 for graphql"); return ev.history; }; // GraphQL is its own mouth: the REST api below throws on anything it does not know
  const binding = { design_ref: design, design_sha256: sha(DESIGN), design_id: "d", version: 1, design_pr: PR };
  const api = (path) => {
    const seen = calls.filter((p) => p === path).length;
    calls.push(path);
    if (o.fail?.(path, seen)) throw new Error(`HTTP 500 for ${path}`);
    if (path === `repos/${REPO}/pulls/${PRN}`) return { head: { sha: "a".repeat(40) }, base: { sha: BASE }, body: fence({ schema: "sds-pr/1", risk_class: "R1", changed_paths: ["docs/a.md"], design_binding: binding }, " sds-pr"), labels: [{ name: "risk:R1" }] };
    if (path.startsWith(`repos/${REPO}/pulls/${PRN}/files`)) return [{ filename: "docs/a.md" }];
    if (path === `repos/${REPO}/contents/.shirube/sds-pin.json?ref=${BASE}`) return b64(JSON.stringify({ design_binding_mode: o.mode ?? "report-only" }));
    if (path === `repos/${REPO}/pulls/${PR}`) return { head: { sha: ev.head }, merged_at: ev.merged, body: ev.body };
    if (path.startsWith(`repos/${REPO}/pulls/${PR}/reviews`)) return page(ev.reviews, path);
    if (path.startsWith(`repos/${REPO}/pulls/${PR}/files`)) return page(ev.files, path).map((f) => ({ filename: f.path, previous_filename: f.from })); // the shape GitHub gives
    if (path.endsWith(`/contents/${P}?ref=${ev.head}`)) return b64(DESIGN);
    if (path === `repos/${REPO}/contents/${ITEMS}?ref=${ev.head}`) return b64(ev.item);
    if (path === `repos/${REPO}/issues/comments/1`) return ev.request;
    if (path === `repos/${REPO}/issues/comments/2`) return ev.review;
    throw new Error(`unexpected ${path}`);
  };
  return { out: gate({ repo: REPO, pr: PRN }, api, 0, () => { throw new Error("the checker must not run"); }, JSON.parse, query), calls, queries };
}
test("T1 and T26 through the gate: design_binding is PASS with no reason, one query reads the Approve and the return, and only the two comments the Approve names are read (the checker stub throws if it is called)", () => {
  const { out: o, calls, queries } = run(world());
  assert.deepEqual([o.verdict, o.design_binding.result, o.design_binding.reason, calls.filter((p) => /issues\/comments\/(?!1$|2$)/.test(p)), queries], ["PASS", "PASS", undefined, [], [["PRR_a", "IC_b"]]]);
});
test("T19 the Approve on page 2 of the reviews and the design file on page 2 of the changed files are found", () => {
  const ev = world(), junk = stray(100, () => ({ user: { login: "x" }, state: "COMMENTED", commit_id: HEAD, submitted_at: APPROVED, body: "" }));
  const { out: o, calls } = run({ ...ev, reviews: [...junk, ...ev.reviews], files: [...stray(100, (_, i) => ({ path: `f${i}.md` })), { path: P }] });
  assert.deepEqual([o.design_binding.result, calls.some((p) => /pulls\/75\/reviews.*page=2/.test(p)), calls.some((p) => /pulls\/75\/files.*page=2/.test(p))], ["PASS", true, true]);
});
test("T20 a read that fails is a FAIL, never PASS: the design PR, the reviews, the changed files, the design file, both comments, the item set, and the GraphQL query", () => {
  const reads = [(p) => p === `repos/${REPO}/pulls/${PR}`, (p) => p.includes(`pulls/${PR}/reviews`), (p) => p.includes(`pulls/${PR}/files`), (p, n) => p.includes(`contents/${P}`) && n === 1, (p) => p.endsWith("comments/1"), (p) => p.endsWith("comments/2"), (p) => p.includes(`contents/${ITEMS}`)];
  for (const [i, fail] of reads.entries()) assert.match(run(world(), { fail }).out.design_binding.reason ?? "", /^5\.0a could not read /, `read ${i}`);
  assert.match(run(world(), { queryFails: true }).out.design_binding.reason, /^5\.0a could not read the edit history: HTTP 502/);
  const answers = [{ errors: [{ message: "NOT_FOUND" }], data: null }, { data: { nodes: [null, null] } }]; // an answer that says it failed, and nodes that are null
  assert.deepEqual(answers.map((history) => run({ ...world(), history }).out.design_binding).map((d) => [d.result, d.reason.startsWith("5.3u (j)")]), answers.map(() => ["FAIL", true]));
});
test("T22 when (a) or (b) fails nothing after the design PR is read, and the GraphQL mouth is not called", () => {
  for (const [ev, why] of [[{ ...world(), merged: null }, "(b)"], [{ ...world(), designRepo: "watchout/other" }, "(a)"]]) {
    const { out: o, calls, queries } = run(ev, { fail: (p) => /pulls\/75\/(reviews|files)|issues\/comments|audit/.test(p) });
    assert.deepEqual([o.design_binding.reason.startsWith(`5.3u ${why}`), calls.filter((p) => /pulls\/75\/(reviews|files)|issues\/comments|audit/.test(p)), queries], [true, [], []], why);
  }
});
test("T24 a 5.3u FAIL is recorded and does not stop the gate in report-only, and stops it in blocking (as every judgment 5 FAIL does)", () => {
  const ev = { ...world(), merged: null };
  assert.deepEqual([run(ev).out.verdict, run(ev).out.design_binding.result], ["PASS", "FAIL"]);
  assert.throws(() => run(ev, { mode: "blocking" }), /^Error: 5 design binding: 5\.3u \(b\)/);
});
// Audit round 1 (shirube#83 6556307897): BF-U4C2A-01 and BF-U4C2A-02. The return is compared by value, and a list is a list (no string or object that has a length).
const viaGate = (ws) => ws.map((w) => run(w).out.design_binding);
test("BF-U4C2A-01 the return's targets are compared by value: the same pair in the other key order is accepted; no list, a count, an id or a head that differs is not", () => {
  const t = (over) => ({ id: "T", head: HEAD, ...over }), reordered = world({ review: { targets: [{ head: HEAD, id: "T" }] } });
  assert.deepEqual([out(reordered), viaGate([reordered])[0].result], [OK, "PASS"]); // control, in the pure function and through the gate
  const odd = [[], [t(), t()], [t({ id: "Z" })], [t({ head: "f".repeat(40) })], "T", { length: 1, 0: t() }, null, undefined].map((targets) => world({ review: { targets } }));
  assert.deepEqual(odd.map(out), odd.map(() => no("(f)")));
  assert.deepEqual(viaGate(odd).map((d) => [d.result, d.reason.startsWith("5.3u (f)")]), odd.map(() => ["FAIL", true]));
});
test("BF-U4C2A-02 blocking_findings and items must be lists: a string, an object with a length, null or no field FAILs (f); a list with a null item FAILs; [] findings and a list of PASS pass", () => {
  const odd = ["", "abc", { length: 0 }, null, undefined], pass = [{ id: "D1", result: "PASS" }];
  const bad = [...odd.map((blocking_findings) => ({ blocking_findings })), ...[...odd.slice(1), pass[0].result, { length: 1 }, [null]].map((items) => ({ items }))].map((review) => world({ review }));
  assert.deepEqual(bad.map(out), bad.map(() => no("(f)")));
  assert.deepEqual(viaGate(bad).map((d) => [d.result, d.reason.startsWith("5.3u (f)")]), bad.map(() => ["FAIL", true]));
  assert.deepEqual([world({ review: { blocking_findings: [], items: pass } })].map(out), [OK]); // control: the shape the seat writes
});
test("a request whose targets or item_set is not a list or an object FAILs (e), and never throws", () => {
  const requests = [{ targets: "T" }, { targets: { length: 1 } }, { targets: null }, { targets: undefined }, { item_set: null }, { item_set: "x" }, { reviewer: null }];
  assert.deepEqual(requests.map((request) => out(world({ request }))), requests.map(() => no("(e)")));
});
test("every field of the request, the return and the Approve body, set in turn to null, a string, a number, a list or an object, FAILs and never throws", () => {
  const odd = [null, "x", 0, 1, [], {}, [null], [{}], { length: 1 }, undefined], b = GOOD.bind;
  const fields = { request: ["schema", "audit_stage", "targets", "item_set", "verifier_sha256", "reviewer"], review: ["schema", "request_digest", "targets", "blocking_findings", "items"] };
  for (const [kind, keys] of Object.entries(fields)) for (const key of keys) for (const v of odd.filter((x) => !(key === "blocking_findings" && Array.isArray(x) && x.length === 0))) { // [] is the value a good return has
    assert.equal(out(world({ [kind]: { [key]: v } }))[0], "FAIL", `${kind}.${key} = ${JSON.stringify(v)}`);
  }
  for (const key of Object.keys(b)) for (const v of odd) assert.equal(out(apart(GOOD, { body: fence({ ...b, [key]: v }) }))[0], "FAIL", `approve.${key} = ${JSON.stringify(v)}`);
});
// 2b, (j): the edit history of the Approve and of the return (docs/design/u4-unit-design-approval.md §3.1 (j), §4 T30-T34). A is at 22:12:59.
const EARLY = "2026-10-28T22:10:00Z", EARLIER = "2026-10-28T22:11:00Z";
const nodeWith = (ev, i, patch) => ({ ...ev, history: { data: { nodes: ev.history.data.nodes.map((n, k) => (k === i ? { ...n, ...patch } : n)) } } });
const ver = (login, when, over) => ({ editor: login === null ? null : { login }, editedAt: when, deletedAt: null, ...over });
const returnEdits = (ev, last, ...v) => nodeWith(ev, 1, { lastEditedAt: last, userContentEdits: edits(...v) }), approveEdits = (ev, last, ...v) => nodeWith(ev, 0, { lastEditedAt: last, userContentEdits: edits(...v) });
test("T30 BF-U4C-04 (3rd round): a rewritten Approve, or an old return rewritten by someone but the seat, FAILs each alone and together; the untouched pair passes", () => {
  const approveOnly = approveEdits(GOOD, EARLY, ver(SEAT, EARLY)), returnOnly = returnEdits(GOOD, EARLY, ver("watchout", EARLY));
  assert.deepEqual([approveOnly, returnOnly, approveEdits(returnOnly, EARLY, ver(SEAT, EARLY))].map(out), Array(3).fill(no("(j)")));
  assert.deepEqual(out(GOOD), OK);
});
test("T31 an Approve with any edit history FAILs: the seat's own, someone else's, only a lastEditedAt, or only versions", () => {
  assert.deepEqual([approveEdits(GOOD, EARLY, ver(SEAT, EARLY)), approveEdits(GOOD, EARLY, ver("other", EARLY)), nodeWith(GOOD, 0, { lastEditedAt: EARLY }), nodeWith(GOOD, 0, { userContentEdits: edits(ver(SEAT, EARLY)) })].map(out), Array(4).fill(no("(j)")));
});
test("T32 a version of the return by someone but the seat, with no editor, or deleted, FAILs", () => {
  const bad = [ver("watchout", EARLY), ver(null, EARLY), ver(SEAT, EARLY, { deletedAt: EARLY }), ver(SEAT, EARLY, { deletedAt: undefined })];
  assert.deepEqual([...bad.map((v) => out(returnEdits(GOOD, EARLY, v))), out(returnEdits(GOOD, EARLY, ver(SEAT, EARLY), ver("watchout", EARLY)))], Array(5).fill(no("(j)")));
});
test("T33 the seat's own edits of the return before the Approve pass; an edit after it, or a version after it, FAILs", () => {
  assert.deepEqual([out(returnEdits(GOOD, EARLIER, ver(SEAT, EARLY), ver(SEAT, EARLIER))), out(returnEdits(GOOD, APPROVED, ver(SEAT, APPROVED)))], [OK, OK]); // control: two edits before, and one at the Approve instant
  assert.deepEqual([returnEdits(GOOD, LATER, ver(SEAT, EARLY), ver(SEAT, LATER)), returnEdits(GOOD, LATER, ver(SEAT, LATER)), returnEdits(GOOD, EARLIER, ver(SEAT, LATER))].map(out), Array(3).fill(no("(j)")));
});
test("T34 a history that contradicts itself, has a second page, or whose count is not its list FAILs", () => {
  const one = edits(ver(SEAT, EARLY)), cases = [{ lastEditedAt: EARLY }, { userContentEdits: one }, { lastEditedAt: EARLY, userContentEdits: { ...one, pageInfo: { hasNextPage: true } } },
    { lastEditedAt: EARLY, userContentEdits: { ...one, totalCount: 2 } }, { userContentEdits: { ...edits(), totalCount: 1 } }, { userContentEdits: { ...edits(), nodes: [ver(SEAT, EARLY)] } }];
  assert.deepEqual(cases.map((patch) => out(nodeWith(GOOD, 1, patch))), cases.map(() => no("(j)")));
});
test("(j) the answer of the query must be two nodes of the right types and ids with no errors: anything else, or no answer, FAILs", () => {
  const [x, y] = GOOD.history.data.nodes, data = GOOD.history.data;
  const answers = [{ errors: [{ message: "x" }], data }, { errors: [], data }, { data: { nodes: [null, y] } }, { data: { nodes: [x, null] } }, { data: { nodes: [y, x] } }, { data: { nodes: [{ ...x, databaseId: 1 }, y] } }, { data: { nodes: [x, { ...y, databaseId: 1 }] } },
    { data: { nodes: [{ ...x, __typename: "IssueComment" }, y] } }, { data: { nodes: [x] } }, { data: { nodes: [x, y, y] } }, { data: { nodes: "xy" } }, { data: null }, {}, null, undefined, "x"];
  assert.deepEqual(answers.map((history) => out({ ...GOOD, history })), answers.map(() => no("(j)")));
  assert.deepEqual([{ ...GOOD, review: { ...GOOD.review, id: undefined } }, { ...nodeWith(GOOD, 1, { databaseId: undefined }), review: { ...GOOD.review, id: undefined } }].map(out), [no("(j)"), no("(j)")]); // a REST row without an id cannot be matched to a node, not even to one that has no id either
});
test("every field of the two history nodes, set in turn to null, a string, a number, a list or an object, FAILs and never throws", () => {
  const odd = [null, "x", 0, 1, [], {}, [null], [{}], { length: 1 }, undefined];
  for (const i of [0, 1]) for (const key of ["__typename", "databaseId", "lastEditedAt", "userContentEdits"]) for (const v of odd.filter((x) => !(key === "lastEditedAt" && x === null))) assert.equal(out(nodeWith(GOOD, i, { [key]: v }))[0], "FAIL", `node ${i}.${key} = ${JSON.stringify(v)}`);
  const edited = returnEdits(GOOD, EARLY, ver(SEAT, EARLY)), withList = (patch) => nodeWith(edited, 1, { userContentEdits: { ...edited.history.data.nodes[1].userContentEdits, ...patch } }), withVersion = (patch) => withList({ nodes: [ver(SEAT, EARLY, patch)] });
  assert.deepEqual(out(edited), OK); // control: the seat edited its return once, before the Approve
  for (const v of odd) {
    const fields = { pageInfo: withList({ pageInfo: v }), nodes: withList({ nodes: v }), editor: withVersion({ editor: v }), editedAt: withVersion({ editedAt: v }), ...(v === 1 ? {} : { totalCount: withList({ totalCount: v }) }), ...(v === null ? {} : { deletedAt: withVersion({ deletedAt: v }) }) };
    for (const [name, ev] of Object.entries(fields)) assert.equal(out(ev)[0], "FAIL", `${name} = ${JSON.stringify(v)}`);
  }
});
test("U4C2B-4 the gate has one GraphQL query that reads two nodes and nothing writes; the pure check has no query at all", () => {
  const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8"), g = read("../scripts/sds/gate.mjs"), d = read("../scripts/sds/design-gate.mjs");
  assert.deepEqual([(g.match(/query\(\$ids:\[ID!\]!\)\{nodes\(ids:\$ids\)/g) ?? []).length, /mutation/i.test(g), /graphql|query\(|mutation/i.test(d)], [1, false, false]);
});
test("T27 the account the gate takes requests from is the one the pinned checker takes", () => {
  const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  assert.equal(/RECEIVER = "([^"]+)"/.exec(read("../scripts/sds/design-gate.mjs"))[1], /c\.user\?\.login === "([^"]+)"/.exec(read("../scripts/hygiene/audit-admission.mjs"))[1]);
});
