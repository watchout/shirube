// Read-only receipt checks, not a proof of semantic correctness or merge authorization.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./lib.mjs";

const digest = (s) => createHash("sha256").update(s).digest("hex");
const nonempty = (s) => typeof s === "string" && s.trim().length > 0;
function need(ok, why) { if (!ok) throw new Error(why); }
function same(a, b) { return JSON.stringify(a.toSorted()) === JSON.stringify(b.toSorted()); }
function unique(a) { return a.length > 0 && a.every(nonempty) && new Set(a).size === a.length; }
function github(path) {
  const body = execFileSync("gh", ["api", path], { encoding: "utf8", timeout: 20000, maxBuffer: 8000000 });
  return path.endsWith("/logs") ? body : JSON.parse(body);
}
function comment(url, api) {
  const m = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/(?:issues|pull)\/(\d+)#issuecomment-(\d+)$/.exec(url);
  need(m, "Unsupported comment URL");
  const c = api(`repos/${m[1]}/issues/comments/${m[3]}`);
  need(c.issue_url === `https://api.github.com/repos/${m[1]}/issues/${m[2]}`, "Comment belongs to another target");
  need(typeof c.body === "string", "Missing comment body");
  return c;
}
function payload(body) {
  const blocks = [...body.matchAll(/^```json\r?\n([\s\S]*?)^```\s*$/gm)];
  need(blocks.length === 1, "Exactly one JSON payload is required");
  const raw = blocks[0][1].trim(), value = JSON.parse(raw);
  need([JSON.stringify(value), JSON.stringify(value, null, 2)].includes(raw), "Use canonical JSON; duplicate keys/ambiguous formatting are refused");
  return value;
}
function file(target, path, api) {
  need(nonempty(path) && !path.split("/").includes(".."), "Invalid evidence path");
  const r = api(`repos/${target.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${target.head}`);
  need(r.type === "file" && r.encoding === "base64", "Evidence is not an observed file");
  return Buffer.from(r.content, "base64").toString("utf8");
}
function requestChecks(r, c, now) {
  need(c.user?.login === "watchout", "Request publisher is not the configured owner account");
  need(r.schema === "sds-audit-request/1", "Unknown request schema");
  need(Date.parse(r.expires_at) > now, "Expired or invalid request");
  need(r.verifier_sha256 === digest(readFileSync(fileURLToPath(import.meta.url))), "Verifier version differs");
  need(nonempty(r.author) && nonempty(r.reviewer?.actor) && r.author !== r.reviewer.actor, "Maker/checker conflict");
  need(nonempty(r.reviewer.github) && r.reviewer.github !== c.user.login, "Reviewer account is not independent");
  need(unique(r.targets.map((t) => t.id)), "Duplicate or empty targets");
  need(unique(r.targets.map((t) => `${t.repo}#${t.pr}`)), "Repeated target PR");
}
function targetCheck(t, api) {
  need(/^watchout\/[\w.-]+$/.test(t.repo) && Number.isSafeInteger(t.pr) && t.pr > 0, "Invalid target PR");
  need(/^[a-f0-9]{40}$/.test(t.head) && /^[a-f0-9]{40}$/.test(t.base), "Unpinned target");
  const p = api(`repos/${t.repo}/pulls/${t.pr}`);
  need(p.state === "open" && p.head.sha === t.head && p.base.sha === t.base, "PR head/base/state changed");
  const observed = [];
  need(Array.isArray(t.checks), "Required checks must be explicit");
  if (t.checks.length === 0) return observed;
  need(unique(t.checks), "Duplicate check names");
  const runs = api(`repos/${t.repo}/commits/${t.head}/check-runs?per_page=100`);
  need(runs.total_count === runs.check_runs.length, "Incomplete checks observation");
  for (const name of t.checks) {
    const run = successfulRun(runs.check_runs, name, t.head);
    const testedMerge = workflowCheck(run, t, api);
    observed.push({ name, id: run.id, url: run.html_url, tested_merge: testedMerge });
  }
  return observed;
}
function successfulRun(runs, name, head) {
  const run = runs.filter((x) => x.name === name && x.app?.slug === "github-actions").sort((a, b) => b.id - a.id)[0];
  need(run?.head_sha === head && run.status === "completed" && run.conclusion === "success", `Required check not successful: ${name}`);
  return run;
}
function workflowCheck(run, t, api) {
  const prefix = `https://github.com/${t.repo}/actions/runs/`;
  const ids = run.html_url?.startsWith(prefix) && /^(\d+)\/job\/(\d+)$/.exec(run.html_url.slice(prefix.length));
  need(ids && nonempty(t.workflow), "Unbound workflow run");
  const w = api(`repos/${t.repo}/actions/runs/${ids[1]}`);
  need(w.path === t.workflow && w.head_sha === t.head && w.event === "pull_request", "Wrong workflow/trigger/head");
  need(w.status === "completed" && w.conclusion === "success", "Workflow not successful");
  workflowPr(w, t);
  return checkoutProof(run, ids, t, api);
}
function workflowPr(w, t) {
  const repoUrl = `https://api.github.com/repos/${t.repo}`;
  need(w.repository?.full_name === t.repo && Array.isArray(w.pull_requests), "CI repository/PR association missing");
  const prs = w.pull_requests.filter((p) => p.number === t.pr && p.url === `${repoUrl}/pulls/${t.pr}`);
  need(prs.length === 1, "CI does not identify the requested PR");
  const p = prs[0];
  need(p.head?.sha === t.head && p.base?.sha === t.base && p.base?.repo?.url === repoUrl, "CI PR/head/base differs");
}
function checkoutProof(run, ids, t, api) {
  const job = api(`repos/${t.repo}/actions/jobs/${ids[2]}`);
  need(job.run_id === Number(ids[1]) && job.head_sha === t.head && job.check_run_url === `https://api.github.com/repos/${t.repo}/check-runs/${run.id}`, "Check/job/run binding differs");
  const logs = api(`repos/${t.repo}/actions/jobs/${ids[2]}/logs`);
  const shas = [...new Set([...logs.matchAll(/^\S+ \[command\]\/\S*git log -1 --format=%H\r?\n\S+ ([a-f0-9]{40})(?:\r?\n|$)/gm)].map((m) => m[1]))];
  need(shas.length === 1, "Missing or ambiguous checkout commit");
  const commit = api(`repos/${t.repo}/git/commits/${shas[0]}`);
  need(commit.sha === shas[0] && same(commit.parents.map((p) => p.sha), [t.base, t.head]), "Tested merge parents differ from requested base/head");
  return commit.sha;
}
function evidence(ref, targets, api) {
  const t = targets.find((x) => x.id === ref.target);
  need(t && Number.isSafeInteger(ref.line) && ref.line > 0 && nonempty(ref.quote), "Unbound evidence");
  const text = file(t, ref.path, api);
  need(text.split(/\r?\n/)[ref.line - 1]?.includes(ref.quote), "Evidence quote does not match target bytes");
  return { target: t.id, head: t.head, path: ref.path, sha256: digest(text), line: ref.line };
}
function itemResults(record, items, targets, api) {
  const expected = items.map((x) => x.id);
  const actual = record.items.map((x) => x.id);
  need(unique(actual) && same(expected, actual), "Missing, duplicate or extra audit items");
  const observed = [];
  for (const item of record.items) {
    need(item.result === "PASS", `Mandatory item not PASS: ${item.id}`);
    need(nonempty(item.reason) && nonempty(item.counterexample), `Missing reasoning/attempted counterexample: ${item.id}`);
    need(Array.isArray(item.evidence) && item.evidence.length > 0, `Missing evidence: ${item.id}`);
    for (const ref of item.evidence) observed.push({ item: item.id, ...evidence(ref, targets, api) });
  }
  return observed;
}
export function verifyAudit(args, api = github, now = Date.now()) {
  const c = comment(args.request, api);
  const requestDigest = digest(c.body);
  need(/^[a-f0-9]{64}$/.test(args.sha256) && requestDigest === args.sha256, "Request digest changed");
  const r = payload(c.body);
  requestChecks(r, c, now);
  const checks = r.targets.map((t) => ({ target: t.id, runs: targetCheck(t, api) }));
  const setTarget = r.targets.find((t) => t.id === r.item_set.target);
  need(setTarget, "Item set target absent");
  const setText = file(setTarget, r.item_set.path, api);
  need(digest(setText) === r.item_set.sha256, "Item set digest changed");
  const set = JSON.parse(setText);
  need(set.schema === "sds-audit-items/1" && unique(set.items.map((x) => x.id)), "Invalid item set");
  const receipt = { request: args.request, request_digest: requestDigest, observed_at: new Date(now).toISOString(), checks };
  if (args.preflight) {
    need(!args.review, "Preflight cannot accept a review");
    return { ...receipt, verdict: "READY_FOR_REVIEW", semantic_audit: "NOT_RUN" };
  }
  need(args.review, "Independent review missing");
  const review = comment(args.review, api);
  need(review.issue_url === c.issue_url, "Review is outside the request control source");
  need(review.user?.login === r.reviewer.github, "Review publisher differs from assigned reviewer");
  need(Date.parse(review.updated_at) >= Date.parse(c.created_at), "Review predates request");
  const record = payload(review.body);
  need(record.schema === "sds-audit-review/1" && record.request_digest === requestDigest, "Review request binding differs");
  need(record.reviewer === r.reviewer.actor, "Reviewer actor differs");
  need(Array.isArray(record.blocking_findings) && record.blocking_findings.length === 0, "Open or unspecified blocking findings");
  need(same(record.targets.map((t) => `${t.id}:${t.head}`), r.targets.map((t) => `${t.id}:${t.head}`)), "Reviewed targets differ");
  const refs = itemResults(record, set.items, r.targets, api);
  for (const t of r.targets) targetCheck(t, api); // Re-observe after reading evidence; later edits require another run.
  need(digest(comment(args.request, api).body) === requestDigest, "Request edited during verification");
  need(digest(comment(args.review, api).body) === digest(review.body), "Review edited during verification");
  return { ...receipt, verdict: "RECEIPT_ACCEPTED", review: args.review, review_digest: digest(review.body), evidence: refs, authorization: "NONE" };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(verifyAudit(parseArgs(process.argv.slice(2))))}\n`); }
  catch (error) { process.stdout.write(`${JSON.stringify({ verdict: "BLOCKED", reason: error.message })}\n`); process.exitCode = 1; }
}
