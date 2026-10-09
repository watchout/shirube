import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyAudit } from "../scripts/hygiene/audit-admission.mjs";

const hash = (s) => createHash("sha256").update(s).digest("hex");
const json = (v) => `\`\`\`json\n${JSON.stringify(v)}\n\`\`\``;
const head = "a".repeat(40), base = "b".repeat(40);
const merge = "c".repeat(40), repoUrl = "https://api.github.com/repos/watchout/shirube";
function fixture() {
  const set = JSON.stringify({ schema: "sds-audit-items/1", items: [{ id: "LC-01" }, { id: "LC-02" }] });
  const target = { id: "s", repo: "watchout/shirube", pr: 21, head, base, checks: ["test"], workflow: ".github/workflows/ci.yml" };
  const request = { schema: "sds-audit-request/1", expires_at: "2026-10-09T00:00:00Z", author: "maker", reviewer: { actor: "checker", github: "iyasaka-ai" }, targets: [target], item_set: { target: "s", path: "items.json", sha256: hash(set) }, verifier_sha256: hash(readFileSync(new URL("../scripts/hygiene/audit-admission.mjs", import.meta.url))) };
  const control = "https://api.github.com/repos/watchout/shirube/issues/6";
  const origin = { issue_url: control, user: { login: "watchout" }, created_at: "2026-10-01T00:00:00Z", body: json(request) };
  const items = ["LC-01", "LC-02"].map((id) => ({ id, result: "PASS", reason: "Checked against the source", counterexample: "Removed condition would fail", evidence: [{ target: "s", path: "design.md", line: 2, quote: "Human confirmation required" }] }));
  const record = { schema: "sds-audit-review/1", request_digest: hash(origin.body), reviewer: "checker", targets: [{ id: "s", head }], items, blocking_findings: [], verdict: "PASS" };
  const review = { issue_url: control, user: { login: "iyasaka-ai" }, updated_at: "2026-10-01T01:00:00Z", body: json(record) };
  const runs = { total_count: 1, check_runs: [{ id: 1, name: "test", app: { slug: "github-actions" }, head_sha: head, status: "completed", conclusion: "success", html_url: "https://github.com/watchout/shirube/actions/runs/10/job/1" }] };
  const workflow = { path: target.workflow, head_sha: head, event: "pull_request", status: "completed", conclusion: "success", repository: { full_name: target.repo }, pull_requests: [{ number: 21, url: `${repoUrl}/pulls/21`, head: { sha: head }, base: { sha: base, repo: { url: repoUrl } } }] };
  const proof = { job: { run_id: 10, head_sha: head, check_run_url: `${repoUrl}/check-runs/1` }, commit: { sha: merge, parents: [{ sha: base }, { sha: head }] }, log: `2026-10-01T00:00:00Z [command]/usr/bin/git log -1 --format=%H\n2026-10-01T00:00:01Z ${merge}\n` };
  const pr = { state: "open", head: { sha: head }, base: { sha: base } };
  const calls = [];
  const api = (path) => {
    calls.push(path);
    if (path.endsWith("/comments/1")) return origin;
    if (path.endsWith("/comments/2")) return review;
    if (path.endsWith("/pulls/21")) return pr;
    if (path.includes("/check-runs?")) return runs;
    if (path.includes("/actions/runs/")) return workflow;
    if (path.endsWith("/logs")) return proof.log;
    if (path.includes("/actions/jobs/")) return proof.job;
    if (path.includes("/git/commits/")) return proof.commit;
    const content = path.includes("/items.json?") ? set : "# Design\nHuman confirmation required\n";
    assert.ok(path.includes("/contents/"));
    return { type: "file", encoding: "base64", content: Buffer.from(content).toString("base64") };
  };
  const args = { request: "https://github.com/watchout/shirube/issues/6#issuecomment-1", sha256: hash(origin.body), review: "https://github.com/watchout/shirube/issues/6#issuecomment-2" };
  return { args, api, pr, runs, workflow, proof, request, origin, review, record, calls, now: Date.parse("2026-10-01T02:00:00Z") };
}
test("authenticated, complete receipt is accepted; preflight is not a semantic verdict", () => {
  const f = fixture();
  assert.equal(verifyAudit(f.args, f.api, f.now).verdict, "RECEIPT_ACCEPTED");
  assert.equal(f.calls.filter((x) => x.endsWith("/pulls/21")).length, 2);
  const r = verifyAudit({ ...f.args, review: undefined, preflight: true }, f.api, f.now);
  assert.equal(r.verdict, "READY_FOR_REVIEW"); assert.equal(r.semantic_audit, "NOT_RUN");
});
const mutations = [
  ["missing item", (f) => f.record.items.pop()],
  ["duplicate item", (f) => f.record.items.push(f.record.items[0])],
  ["extra item", (f) => f.record.items.push({ ...f.record.items[0], id: "OTHER" })],
  ["FAIL despite summary PASS", (f) => { f.record.items[0].result = "FAIL"; }],
  ["UNKNOWN", (f) => { f.record.items[0].result = "UNKNOWN"; }],
  ["self-exempt N/A", (f) => { f.record.items[0].result = "N/A"; }],
  ["empty evidence", (f) => { f.record.items[0].evidence = []; }],
  ["invented quote", (f) => { f.record.items[0].evidence[0].quote = "Silence is approval"; }],
  ["unbound source", (f) => { f.record.items[0].evidence[0].target = "external"; }],
  ["missing reasoning", (f) => { f.record.items[0].reason = ""; }],
  ["missing counterexample", (f) => { f.record.items[0].counterexample = ""; }],
  ["stale reviewer target", (f) => { f.record.targets[0].head = base; }],
  ["another request", (f) => { f.record.request_digest = "0".repeat(64); }],
  ["impersonated actor", (f) => { f.record.reviewer = "maker"; }],
  ["open blocker outside fixed items", (f) => { f.record.blocking_findings = ["Required condition omitted from the list"]; }],
];
for (const [name, mutate] of mutations) test(name, () => {
  const f = fixture(); mutate(f); f.review.body = json(f.record);
  assert.throws(() => verifyAudit(f.args, f.api, f.now));
});
const observedMutations = [
  ["forged publisher", (f) => { f.review.user.login = "watchout"; }],
  ["wrong control source", (f) => { f.review.issue_url += "7"; }],
  ["changed head", (f) => { f.pr.head.sha = base; }],
  ["changed base", (f) => { f.pr.base.sha = head; }],
  ["new failing rerun overrides old green", (f) => f.runs.check_runs.push({ ...f.runs.check_runs[0], id: 2, conclusion: "failure" }) && (f.runs.total_count = 2)],
  ["forged check name from other app", (f) => { f.runs.check_runs[0].app.slug = "other"; }],
  ["same check name in another workflow", (f) => { f.workflow.path = ".github/workflows/fake.yml"; }],
  ["workflow_dispatch instead of PR CI", (f) => { f.workflow.event = "workflow_dispatch"; }],
  ["workflow not finished", (f) => { f.workflow.status = "in_progress"; }],
  ["CI belongs to another repository", (f) => { f.workflow.repository.full_name = "watchout/other"; }],
  ["same head but another PR", (f) => { f.workflow.pull_requests[0].number = 22; }],
  ["same PR and head but another base", (f) => { f.workflow.pull_requests[0].base.sha = "1".repeat(40); }],
  ["CI has no PR association", (f) => { f.workflow.pull_requests = []; }],
  ["job belongs to another run", (f) => { f.proof.job.run_id = 11; }],
  ["no observed checkout commit", (f) => { f.proof.log = ""; }],
  ["ambiguous checkout commits", (f) => { f.proof.log += f.proof.log.replace(merge, head); }],
  ["metadata matches but actual tested base is stale", (f) => { f.proof.commit.parents[0].sha = "1".repeat(40); }],
  ["partial API page", (f) => { f.runs.total_count = 101; }],
  ["edited request", (f) => { f.origin.body += " edited"; }],
  ["multiple records", (f) => { f.review.body += "\n" + f.review.body; }],
  ["duplicate JSON key", (f) => { f.review.body = f.review.body.replace('"blocking_findings":[]', '"blocking_findings":["defect"],"blocking_findings":[]'); }],
  ["expired request", (f) => { f.now = Date.parse("2026-10-10T00:00:00Z"); }],
  ["missing review", (f) => { delete f.args.review; }],
];
for (const [name, mutate] of observedMutations) test(name, () => {
  const f = fixture(); mutate(f); assert.throws(() => verifyAudit(f.args, f.api, f.now));
});
test("API unavailable and edits during verification cannot pass", () => {
  const f = fixture(); assert.throws(() => verifyAudit(f.args, () => { throw new Error("403"); }, f.now));
  let reads = 0;
  const api = (path) => { if (path.endsWith("/pulls/21") && ++reads === 2) f.pr.head.sha = base; return f.api(path); };
  assert.throws(() => verifyAudit(f.args, api, f.now));
});
// OD-GAP-5 (G-07): a request may opt in with `base_moved`, so a base that moved on after the request stays accepted only while the move is provably unrelated.
function moved(change = () => {}) {
  const f = fixture(), now = "9".repeat(40), pages = { move: { status: "ahead", files: [{ filename: "docs/other.md" }] }, own: { files: [{ filename: "design.md" }] } };
  f.request.targets[0].base_moved = { ref: "main" };
  f.pr.base = { sha: now, ref: "main" };
  change(f.request.targets[0], f.pr, pages);
  f.origin.body = json(f.request); f.args.sha256 = hash(f.origin.body); f.record.request_digest = f.args.sha256; f.review.body = json(f.record);
  const api = (path) => (path.includes(`/compare/${base}...${now}`) ? pages.move : path.includes(`/compare/${base}...${head}`) ? pages.own : f.api(path));
  return () => verifyAudit(f.args, api, f.now);
}
test("a moved base is accepted only on request and the receipt records where it moved", () => {
  const r = moved()();
  assert.equal(r.verdict, "RECEIPT_ACCEPTED"); assert.deepEqual(r.base_moved, [{ target: "s", from: base, to: "9".repeat(40), moved_files: 1 }]);
});
const refused = [
  ["PR files overlap the moved files", (t, pr, p) => p.move.files.push({ filename: "design.md" })],
  ["a rename in the move hits a PR file", (t, pr, p) => p.move.files.push({ filename: "x.md", previous_filename: "design.md" })],
  ["the move touched the CI definition", (t, pr, p) => p.move.files.push({ filename: ".github/workflows/ci.yml" })],
  ["the move touched the checker", (t, pr, p) => p.move.files.push({ filename: "scripts/hygiene/audit-admission.mjs" })],
  ["the move touched the dependencies", (t, pr, p) => p.move.files.push({ filename: "package-lock.json" })],
  ["the move touched package.json", (t, pr, p) => p.move.files.push({ filename: "package.json" })],
  ["the move touched a nested package.json", (t, pr, p) => p.move.files.push({ filename: "tools/x/package.json" })],
  ["the move touched another lockfile", (t, pr, p) => p.move.files.push({ filename: "pnpm-lock.yaml" })],
  ["the move touched yarn.lock", (t, pr, p) => p.move.files.push({ filename: "yarn.lock" })],
  ["the move touched npm-shrinkwrap.json", (t, pr, p) => p.move.files.push({ filename: "npm-shrinkwrap.json" })],
  ["the move touched a non-workflow file under .github", (t, pr, p) => p.move.files.push({ filename: ".github/CODEOWNERS" })],
  ["the requested base is not an ancestor", (t, pr, p) => { p.move.status = "diverged"; }],
  ["the PR was retargeted to another branch", (t, pr) => { pr.base.ref = "release"; }],
  ["the moved file list is truncated", (t, pr, p) => { p.move.files = Array.from({ length: 300 }, (_, i) => ({ filename: `f${i}` })); }],
  ["the PR file list is truncated", (t, pr, p) => { p.own.files = Array.from({ length: 300 }, (_, i) => ({ filename: `g${i}` })); }],
  ["opt-in without a branch", (t) => { t.base_moved = {}; }],
  ["no opt-in in the request", (t) => { delete t.base_moved; }],
];
for (const [name, change] of refused) test(`moved base refused: ${name}`, () => assert.throws(moved(change), /base_moved|base changed/));
