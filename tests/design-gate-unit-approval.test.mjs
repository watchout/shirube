// 5.3u (a)-(i) (docs/design/u4-unit-design-approval.md §3.1, §4 T1-T22, T24, T26, T27): a unit design whose PR passed a design-stage audit and got the audit seat's Approve, in the shape of shirube#75, and every way to break one fact.
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
const BLOCK = { schema: "sds-design/1", design_id: "d", version: 1, open_decisions: [], approval: { kind: "unit_design" }, main_connection: { id: "MC1", statement: "s", first_node: "N1" } };
const DESIGN = fence(BLOCK, " sds-design");
function world({ stage = "design", scope = `audited: ${P}`, request = {}, review = {}, items: results = [{ id: "D1", result: "PASS" }] } = {}) { // the evidence of a good world, with the request and the return overridable
  const rq = fence({ schema: "sds-audit-request/1", audit_stage: stage, targets: [{ id: "T", repo: REPO, pr: PR, head: HEAD }], item_set: { target: "T", path: ITEMS, sha256: sha(items(scope)) }, verifier_sha256: CHECKER, reviewer: { actor: "devauditor", github: SEAT }, ...request });
  const rv = fence({ schema: "sds-audit-review/1", request_digest: sha(rq), targets: [{ id: "T", head: HEAD }], blocking_findings: [], items: results, ...review });
  const bind = { request: at(1), request_digest: sha(rq), review: at(2), review_digest: sha(rv), verdict: "RECEIPT_ACCEPTED", checker_sha256: CHECKER };
  const approve = { user: { login: SEAT }, state: "APPROVED", commit_id: HEAD, submitted_at: APPROVED, body: fence(bind) };
  const body = fence({ schema: "sds-pr/1", audit: { request: bind.request, request_sha256: bind.request_digest, review: bind.review } }, " sds-pr");
  return { repo: REPO, pr: PR, designRepo: REPO, want: sha(DESIGN), got: sha(DESIGN), path: P, head: HEAD, merged: MERGED, body, bind, reviews: [approve], files: [{ path: P }], item: items(scope),
    request: { user: { login: "watchout" }, body: rq, updated_at: ASKED }, review: { user: { login: SEAT }, body: rv, updated_at: RETURNED } };
}
const GOOD = world(); // a world nothing mutates: every test copies it
const judge = (ev) => designGate(BLOCK, { approvalBody: null, plan: null, boundNodeId: "N1", riskIndex: 1, changedPaths: ["docs/a.md"], matches: matchesAny, designPr: PR, evidence: () => ev });
const out = (ev) => { const r = judge(ev); return [r.verdict, ...failed(r.findings).map((f) => /^5\.3u (\(\w\))/.exec(f.message)?.[1] ?? f.message)]; };
const HELD = ["NOT_CHECKED"], no = (x) => ["FAIL", x];
const apart = (ev, patch) => ({ ...ev, reviews: [{ ...ev.reviews[0], ...patch }] }), also = (ev, r) => ({ ...ev, reviews: [...ev.reviews, r] });
const asked = (ev, patch) => ({ ...ev, request: { ...ev.request, ...patch } }), returned = (ev, patch) => ({ ...ev, review: { ...ev.review, ...patch } });
const asks = (ev) => ({ user: { login: SEAT }, state: "CHANGES_REQUESTED", commit_id: ev.head, submitted_at: LATER, body: "" });

test("T1 every fact holds: 5.3u is NOT_CHECKED because (j) is not implemented, and never PASS", () => {
  const r = judge(world());
  assert.deepEqual([r.verdict, failed(r.findings), r.findings.find((f) => f.reason === "5.3u").message], ["NOT_CHECKED", [], "5.3u (a)-(i) passed; the edit history check (j) is not implemented yet"]);
});
test("T2, T21, T3 (a) another repository, (b) a design PR that is not merged, (c) a design file that differs from design_sha256", () => {
  assert.deepEqual([{ ...world(), designRepo: "watchout/other" }, { ...world(), merged: null }, { ...world(), merged: undefined }, { ...world(), got: sha("other") }].map(out), [no("(a)"), no("(b)"), no("(b)"), no("(c)")]);
});
test("T4 no Approve binds: no review, another commit, after the merge, no json in the body", () => {
  const ev = world();
  assert.deepEqual([{ ...ev, reviews: [] }, apart(ev, { commit_id: "f".repeat(40) }), apart(ev, { submitted_at: "2026-10-28T22:17:02Z" }), apart(ev, { body: "LGTM" })].map(out), [no("(d)"), no("(d)"), no("(d)"), no("(d)")]);
  assert.deepEqual(out(apart(ev, { submitted_at: MERGED })), HELD); // control: made at the merge instant
});
test("T5 a dismissed Approve, or one withdrawn by its author before the merge, FAILs; a request before it, by another, or after the merge does not", () => {
  const ev = world();
  assert.deepEqual([apart(ev, { state: "DISMISSED" }), also(ev, asks(ev))].map(out), [no("(d)"), no("(d)")]);
  assert.deepEqual([also(ev, { ...asks(ev), submitted_at: "2026-10-28T22:12:00Z" }), also(ev, { ...asks(ev), user: { login: "other" } }), also(ev, { ...asks(ev), submitted_at: "2026-10-28T22:18:00Z" })].map(out), [HELD, HELD, HELD]);
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
  assert.deepEqual([asked(late, { updated_at: APPROVED }), returned(late, { updated_at: APPROVED })].map(out), [HELD, HELD]); // control: untouched since the Approve
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
  assert.deepEqual([{ ...w, path: B, files: [{ path: B }] }, { ...w, path: "docs/design/a.md", files: [{ path: "docs/design/a.md" }] }].map(out), [no("(g)"), HELD]);
});
test("T16 an item set whose bytes differ from item_set.sha256, that is not json, or whose scope is not a string", () => {
  assert.deepEqual([{ ...GOOD, item: `${GOOD.item} ` }, { ...GOOD, item: "not json" }, world({ scope: 5 })].map(out), [no("(g)"), no("(g)"), no("(g)")]);
});
test("T17 a design file that design_pr does not change FAILs; a renamed one counts under its old and new path", () => {
  assert.deepEqual([{ ...GOOD, files: [{ path: "x.md" }] }, { ...GOOD, files: [{ path: "new.md", from: P }] }, { ...GOOD, files: [{ path: P }] }].map(out), [no("(h)"), HELD, HELD]);
});
test("T18 the audit in the design PR block must be the one the Approve names", () => {
  const w = GOOD, b = w.bind, audit = (a) => fence({ schema: "sds-pr/1", audit: { request: b.request, request_sha256: b.request_digest, review: b.review, ...a } }, " sds-pr");
  assert.deepEqual(["no block", audit({ request_sha256: sha("x") }), audit({ review: at(3) }), audit({ request: at(3) })].map((body) => out({ ...w, body })), Array(4).fill(no("(i)")));
});

// Through the gate: REST reads, pages, failures, stages.
const PRN = 7, BASE = "b".repeat(40), stray = (n, make) => Array.from({ length: n }, make);
const page = (list, path) => { const n = Number(/&page=(\d+)/.exec(path)[1]); return list.slice((n - 1) * 100, n * 100); };
function run(ev, o = {}) {
  const b64 = (s) => ({ encoding: "base64", content: Buffer.from(s).toString("base64") }), calls = [], design = `https://github.com/${ev.designRepo}/blob/${HEAD}/${P}`;
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
  return { out: gate({ repo: REPO, pr: PRN }, api, 0, () => { throw new Error("the checker must not run"); }, JSON.parse), calls };
}
test("T1 and T26 through the gate: NOT_CHECKED with the (j) reason, the verdict stays PASS, and only the two comments the Approve names are read (the checker stub throws if it is called)", () => {
  const { out: o, calls } = run(world());
  assert.deepEqual([o.verdict, o.design_binding.result, o.design_binding.reason, calls.filter((p) => /issues\/comments\/(?!1$|2$)/.test(p))],
    ["PASS", "NOT_CHECKED", "5.3u (a)-(i) passed; the edit history check (j) is not implemented yet; the other checks (5.9 included) did not fail", []]);
});
test("T19 the Approve on page 2 of the reviews and the design file on page 2 of the changed files are found", () => {
  const ev = world(), junk = stray(100, () => ({ user: { login: "x" }, state: "COMMENTED", commit_id: HEAD, submitted_at: APPROVED, body: "" }));
  const { out: o, calls } = run({ ...ev, reviews: [...junk, ...ev.reviews], files: [...stray(100, (_, i) => ({ path: `f${i}.md` })), { path: P }] });
  assert.deepEqual([o.design_binding.result, calls.some((p) => /pulls\/75\/reviews.*page=2/.test(p)), calls.some((p) => /pulls\/75\/files.*page=2/.test(p))], ["NOT_CHECKED", true, true]);
});
test("T20 a read that fails is a FAIL, never NOT_CHECKED: the design PR, the reviews, the changed files, the design file, both comments, the item set", () => {
  const reads = [(p) => p === `repos/${REPO}/pulls/${PR}`, (p) => p.includes(`pulls/${PR}/reviews`), (p) => p.includes(`pulls/${PR}/files`), (p, n) => p.includes(`contents/${P}`) && n === 1, (p) => p.endsWith("comments/1"), (p) => p.endsWith("comments/2"), (p) => p.includes(`contents/${ITEMS}`)];
  for (const [i, fail] of reads.entries()) assert.match(run(world(), { fail }).out.design_binding.reason ?? "", /^5\.0a could not read /, `read ${i}`);
});
test("T22 when (a) or (b) fails nothing after the design PR is read", () => {
  for (const [ev, why] of [[{ ...world(), merged: null }, "(b)"], [{ ...world(), designRepo: "watchout/other" }, "(a)"]]) {
    const { out: o, calls } = run(ev, { fail: (p) => /pulls\/75\/(reviews|files)|issues\/comments|audit/.test(p) });
    assert.deepEqual([o.design_binding.reason.startsWith(`5.3u ${why}`), calls.filter((p) => /pulls\/75\/(reviews|files)|issues\/comments|audit/.test(p))], [true, []], why);
  }
});
test("T24 a 5.3u FAIL is recorded and does not stop the gate in report-only, and stops it in blocking (as every judgment 5 FAIL does)", () => {
  const ev = { ...world(), merged: null };
  assert.deepEqual([run(ev).out.verdict, run(ev).out.design_binding.result], ["PASS", "FAIL"]);
  assert.throws(() => run(ev, { mode: "blocking" }), /^Error: 5 design binding: 5\.3u \(b\)/);
});
test("T27 the account the gate takes requests from is the one the pinned checker takes", () => {
  const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  assert.equal(/RECEIVER = "([^"]+)"/.exec(read("../scripts/sds/design-gate.mjs"))[1], /c\.user\?\.login === "([^"]+)"/.exec(read("../scripts/hygiene/audit-admission.mjs"))[1]);
});
