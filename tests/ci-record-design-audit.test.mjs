import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { target, NOW, HEAD, BASE } from "./ci-record-fixtures.mjs";
const api = await import("../scripts/sds/ci-record-design-audit.mjs").catch((error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; return {}; });
const sha = (s) => createHash("sha256").update(s).digest("hex");
const body = (v) => `\`\`\`json\n${JSON.stringify(v)}\n\`\`\`\n`;
function fixture() {
  const t = target(), designHead = "d".repeat(40), prefix = `aidlc/spaces/${t.space}/intents/${t.intent}`, path = `${prefix}/inception/contract-design/contract-summary.md`;
  const itemSetText = JSON.stringify({ schema: "sds-audit-items/1", items: [{ id: "EXAMPLE-01", requirement: "synthetic design rule" }] });
  const itemPath = "docs/audit/example-design.json", url = `https://github.com/${t.repo}/pull/7`;
  const request = { schema: "sds-audit-request/1", expires_at: "2026-11-11T00:00:00Z", author: "example-maker", reviewer: { actor: "devauditor", github: "iyasaka-ai" }, verifier_sha256: "f".repeat(64), targets: [{ id: "example-design", repo: t.repo, pr: 7, head: designHead, base: BASE, checks: ["test"], workflow: ".github/workflows/ci.yml" }], item_set: { target: "example-design", path: itemPath, sha256: sha(itemSetText) } };
  const requestBody = body(request), record = { schema: "sds-audit-review/1", request_digest: sha(requestBody), reviewer: "devauditor", targets: [{ id: "example-design", head: designHead }], blocking_findings: [], items: [{ id: "EXAMPLE-01", result: "PASS", reason: "synthetic requirement checked", counterexample: "changed requirement was rejected", evidence: [{ target: "example-design", path, line: 1, quote: "synthetic design" }] }] };
  const reviewBody = body(record), artifacts = [{ path, bytes: 16, sha256: sha("synthetic design") }];
  const digest = sha(`${JSON.stringify([path, 16, sha("synthetic design")])}\n`);
  const check = { name: "test", id: 5, head_sha: designHead, app: { slug: "github-actions" }, status: "completed", conclusion: "success", html_url: `https://github.com/${t.repo}/actions/runs/3/job/4` };
  const root = `repos/${t.repo}`, merge = "e".repeat(40), workflow = { path: ".github/workflows/ci.yml", head_sha: designHead, event: "pull_request", status: "completed", conclusion: "success", repository: { full_name: t.repo }, pull_requests: [{ number: 7, url: `https://api.github.com/${root}/pulls/7`, head: { sha: designHead }, base: { sha: BASE, repo: { url: `https://api.github.com/${root}` } } }] };
  return { target: t, now: NOW, prObservation: { repo: t.repo, number: 7, head: HEAD, base: BASE },
    categories: Object.fromEntries(["database", "permissions", "contracts", "security"].map((name) => [name, { outcome: name === "contracts" ? "APPLIES" : "NOT_APPLICABLE", evidencePaths: [path] }])),
    reference: { repo: t.repo, pr: 7, designHead, designArtifactSetDigest: digest, requestUrl: `${url}#issuecomment-1`, requestBodySha256: sha(requestBody), reviewUrl: `${url}#issuecomment-2`, reviewBodySha256: sha(reviewBody), expectedPublisher: "iyasaka-ai", verifierVersion: "public:synthetic-verifier-v1" },
    requestComment: { body: requestBody, user: { login: "watchout" }, issue_url: `https://api.github.com/repos/${t.repo}/issues/7`, created_at: "2026-11-09T00:00:00Z" },
    reviewComment: { body: reviewBody, user: { login: "iyasaka-ai" }, issue_url: `https://api.github.com/repos/${t.repo}/issues/7`, updated_at: "2026-11-09T01:00:00Z" },
    verifierSha256: "f".repeat(64), itemSetText, artifacts, evidenceFiles: { [path]: "synthetic design", [itemPath]: itemSetText },
    history: { designCommit: { sha: designHead }, ancestorComparison: { base_commit: { sha: designHead }, merge_base_commit: { sha: designHead }, status: "ahead", total_commits: 1, commits: [{ sha: HEAD, files: [{ filename: "scripts/example.mjs" }] }] }, designComparison: { base_commit: { sha: BASE }, merge_base_commit: { sha: BASE }, status: "ahead", total_commits: 1, commits: [{ sha: designHead }], files: [{ filename: path }] } },
    checkRuns: { total_count: 1, check_runs: [check] }, ciObservations: { [`${root}/actions/runs/3`]: workflow,
      [`${root}/actions/jobs/4`]: { run_id: 3, head_sha: designHead, check_run_url: `https://api.github.com/${root}/check-runs/5` },
      [`${root}/actions/jobs/4/logs`]: `2026-11-09T00:00:00Z [command]/usr/bin/git log -1 --format=%H\n2026-11-09T00:00:00Z ${merge}\n`,
      [`${root}/git/commits/${merge}`]: { sha: merge, parents: [{ sha: BASE }, { sha: designHead }] } },
    implementationOrder: { designReviewRef: `${url}#issuecomment-2`, implementationAfterRef: `${url}#issuecomment-2` } };
}
function evaluate(f) { assert.equal(typeof api.evaluateDesignAudit, "function", "BR5.2 requires historical audit binding"); return api.evaluateDesignAudit(f); }
function changePayload(f, key, mutate) { const c = f[key], r = JSON.parse(c.body.match(/```json\n([\s\S]*?)\n```/)[1]); mutate(r); c.body = body(r); f.reference[key === "requestComment" ? "requestBodySha256" : "reviewBodySha256"] = sha(c.body); }
test("U1-DA01 four evidenced exclusions only; one applicable category requires audit", () => {
  const f = fixture(); delete f.reference; assert.equal(evaluate(f).outcome, "FAIL");
  Object.values(f.categories).forEach((c) => { c.outcome = "NOT_APPLICABLE"; }); assert.equal(evaluate(f).outcome, "NOT_APPLICABLE");
  f.categories.security.evidencePaths = []; assert.equal(evaluate(f).outcome, "UNKNOWN");
});
test("U1-DA02 same PR design-only ancestor with mandatory all-PASS", () => { assert.equal(evaluate(fixture()).outcome, "PASS"); });
test("U1-DA03 wrong repo PR unit scope or design head rejected", () => {
  for (const mutate of [(f) => { f.reference.repo = "watchout/other"; }, (f) => { f.reference.pr = 8; }, (f) => { f.target.intent = "other-intent"; }, (f) => { f.reference.designHead = HEAD; }]) {
    const f = fixture(); mutate(f); assert.notEqual(evaluate(f).outcome, "PASS");
  }
});
test("U1-DA04 body digest publisher and request_digest binding", () => {
  for (const mutate of [(f) => { f.requestComment.body += " "; }, (f) => { f.reviewComment.user.login = "watchout"; }, (f) => { changePayload(f, "reviewComment", (r) => { r.request_digest = "0".repeat(64); }); }]) {
    const f = fixture(); mutate(f); assert.equal(evaluate(f).outcome, "FAIL");
  }
});
test("U1-DA05 mandatory items expiry and blocking findings remain enforced", () => {
  for (const mutate of [(f) => { changePayload(f, "reviewComment", (r) => { r.items = []; }); }, (f) => { changePayload(f, "reviewComment", (r) => { r.items[0].result = "UNKNOWN"; }); }, (f) => { changePayload(f, "reviewComment", (r) => { r.blocking_findings = ["synthetic blocker"]; }); }, (f) => { f.now = "2026-11-12T00:00:00Z"; }]) {
    const f = fixture(); mutate(f); assert.equal(evaluate(f).outcome, "FAIL");
  }
  const unavailable = fixture(); unavailable.evidenceFiles = {}; assert.equal(evaluate(unavailable).outcome, "UNKNOWN");
});
test("U1-DA06 design changed then reverted still invalidates historical PASS", () => {
  const f = fixture(), path = f.artifacts[0].path; f.history.ancestorComparison.total_commits = 2;
  f.history.ancestorComparison.commits = [{ sha: "c".repeat(40), files: [{ filename: path }] }, { sha: HEAD, files: [{ filename: path }] }];
  assert.deepEqual(evaluate(f).reasonCodes, ["DESIGN_AUDIT_STALE"]);
});
test("U1-DA07 missing ancestry base-moved proof or incomplete history UNKNOWN", () => {
  for (const mutate of [(f) => { delete f.history; }, (f) => { f.history.ancestorComparison.total_commits = 9; }, (f) => { f.prObservation.base = "c".repeat(40); }]) {
    const f = fixture(); mutate(f); assert.notEqual(evaluate(f).outcome, "PASS");
  }
});
test("U1-DA08 intake readiness never substitutes review or consistent operation order", () => {
  const missing = fixture(); delete missing.reviewComment; assert.notEqual(evaluate(missing).outcome, "PASS");
  const order = fixture(); order.implementationOrder.implementationAfterRef = "public:earlier"; assert.equal(evaluate(order).outcome, "FAIL");
  const code = fixture(); code.history.designComparison.files.push({ filename: "scripts/implementation.mjs" }); assert.equal(evaluate(code).outcome, "FAIL");
  const failedCI = fixture();
  failedCI.ciObservations["repos/watchout/example/actions/runs/3"].conclusion = "failure";
  assert.notEqual(evaluate(failedCI).outcome, "PASS");
});
