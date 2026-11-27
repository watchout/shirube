// Helpers for the audit-intake-extra tests: a GitHub stand-in that answers per path (repo and commit), so a
// commit that exists in one repo can be absent in another. Every name, SHA and repo below is invented.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyAudit } from "../scripts/hygiene/audit-admission.mjs";

export const FIELD = "extra_checkouts"; // the contract's field name, written out here so a typo in the checker is caught
export const PR_REPO = "watchout/example-product", COMMON = "example-org/example-common";
export const digest = (s) => createHash("sha256").update(s).digest("hex");
export const json = (v) => `\`\`\`json\n${JSON.stringify(v)}\n\`\`\``;
export const fake = (tag) => tag.repeat(Math.ceil(40 / tag.length)).slice(0, 40); // a 40-hex SHA built from a hex tag
export const ids = (i) => ({ head: fake(`a${i}`), base: fake(`b${i}`), merge: fake(`c${i}`), other: fake(`e${i}`) });
export const decl = (i, k, repo = COMMON) => ({ repo, commit: fake(`d${i}${k}`) });
export const key = (repo, commit) => `${repo}@${commit}`;
export const logText = (commits) => commits.map((c, n) => `2026-10-01T00:00:0${n}Z [command]/usr/bin/git log -1 --format=%H\n2026-10-01T00:00:0${n}Z ${c}\n`).join("");
export const existence = (calls, repo = COMMON) => calls.filter((p) => p.startsWith(`repos/${repo}/git/commits/`));

const CONTROL = "https://api.github.com/repos/watchout/shirube/issues/6", API = `https://api.github.com/repos/${PR_REPO}`;
const VERIFIER = new URL("../scripts/hygiene/audit-admission.mjs", import.meta.url);

function world(i, spec) {
  const { head, base, merge } = ids(i), checks = spec.checks ?? ["test"], declare = spec.declare;
  const wellFormed = Array.isArray(declare) ? declare.filter((d) => typeof d?.commit === "string") : [];
  const target = { id: `t${i}`, repo: PR_REPO, pr: 21 + i, head, base, checks, workflow: ".github/workflows/ci.yml", ...(declare === undefined ? {} : { [FIELD]: declare }) };
  const jobIds = checks.map((_, n) => 100 * (i + 1) + n + 1);
  const runs = { total_count: checks.length, check_runs: checks.map((name, n) => ({ id: jobIds[n], name, app: { slug: "github-actions" }, head_sha: head, status: "completed", conclusion: "success", html_url: `https://github.com/${PR_REPO}/actions/runs/${10 + i}/job/${jobIds[n]}` })) };
  const workflow = { path: target.workflow, head_sha: head, event: "pull_request", status: "completed", conclusion: "success", repository: { full_name: PR_REPO }, pull_requests: [{ number: 21 + i, url: `${API}/pulls/${21 + i}`, head: { sha: head }, base: { sha: base, repo: { url: API } } }] };
  const logs = checks.map((name) => logText(spec.logs?.[name] ?? [merge, ...wellFormed.map((d) => d.commit)]));
  const jobs = jobIds.map((id) => ({ run_id: 10 + i, head_sha: head, check_run_url: `${API}/check-runs/${id}` }));
  const commits = [[key(PR_REPO, merge), { sha: merge, parents: [{ sha: base }, { sha: head }] }], ...wellFormed.map((d) => [key(d.repo, d.commit), { sha: d.commit, parents: [] }])];
  return { target, pr: { state: "open", head: { sha: head }, base: { sha: base } }, runs, workflow, jobIds, jobs, logs, commits };
}

// spec = { targets: [{ declare, checks, logs }] }; declare === undefined leaves the field out of the request.
export function intake(spec = {}) {
  const worlds = (spec.targets ?? [{ declare: [decl(0, 0)] }]).map((s, i) => world(i, s));
  const set = JSON.stringify({ schema: "sds-audit-items/1", items: [{ id: "LC-01" }, { id: "LC-02" }] });
  const request = { schema: "sds-audit-request/1", expires_at: "2026-10-09T00:00:00Z", author: "maker", reviewer: { actor: "checker", github: "iyasaka-ai" }, targets: worlds.map((w) => w.target), item_set: { target: "t0", path: "items.json", sha256: digest(set) }, verifier_sha256: digest(readFileSync(VERIFIER)) };
  const origin = { issue_url: CONTROL, user: { login: "watchout" }, created_at: "2026-10-01T00:00:00Z", body: json(request) };
  const items = ["LC-01", "LC-02"].map((id) => ({ id, result: "PASS", reason: "Checked against the source", counterexample: "Removed condition would fail", evidence: [{ target: "t0", path: "design.md", line: 2, quote: "Human confirmation required" }] }));
  const record = { schema: "sds-audit-review/1", request_digest: digest(origin.body), reviewer: "checker", targets: worlds.map((w) => ({ id: w.target.id, head: w.target.head })), items, blocking_findings: [], verdict: "PASS" };
  const review = { issue_url: CONTROL, user: { login: "iyasaka-ai" }, updated_at: "2026-10-01T01:00:00Z", body: json(record) };
  const maps = { pulls: new Map(), runs: new Map(), workflows: new Map(), jobs: new Map(), logs: new Map(), commits: new Map() };
  worlds.forEach((w, i) => {
    maps.pulls.set(21 + i, w.pr); maps.runs.set(w.target.head, w.runs); maps.workflows.set(10 + i, w.workflow);
    w.jobIds.forEach((id, n) => { maps.jobs.set(id, w.jobs[n]); maps.logs.set(id, w.logs[n]); });
    for (const [k, v] of w.commits) maps.commits.set(k, v);
  });
  const calls = [];
  // The checker reads CI through the Actions API only; these two answers are made at call time from the same check-run data, so a
  // test that changes `maps.runs` changes what the Actions reads show (run id from the job page, attempt 1, check run in the PR repo).
  const asJobs = (head) => (maps.runs.get(head)?.check_runs ?? []).map((c) => ({ id: c.id, run_id: Number(/\/actions\/runs\/(\d+)\//.exec(c.html_url)?.[1]), run_attempt: 1, name: c.name, head_sha: c.head_sha, status: c.status, conclusion: c.conclusion, check_run_url: `${API}/check-runs/${c.id}`, html_url: c.html_url }));
  const headOfRun = (id) => [...maps.runs.keys()].find((h) => asJobs(h).some((j) => j.run_id === id));
  const runList = (head) => { const ids = [...new Set(asJobs(head).map((j) => j.run_id))]; return { total_count: ids.length, workflow_runs: ids.map((id) => ({ id, head_sha: head, run_attempt: 1 })) }; };
  const jobPage = (id) => { const jobs = asJobs(headOfRun(id)).filter((j) => j.run_id === id); return { total_count: jobs.length, jobs }; };
  const table = [
    [/\/issues\/comments\/1$/, () => origin], [/\/issues\/comments\/2$/, () => review],
    [/\/pulls\/(\d+)$/, (m) => maps.pulls.get(Number(m[1]))],
    [/\/actions\/runs\?head_sha=([a-f0-9]{40})&per_page=100$/, (m) => runList(m[1])], [/\/actions\/runs\/(\d+)\/jobs\?filter=latest&per_page=100$/, (m) => jobPage(Number(m[1]))],
    [/\/actions\/runs\/(\d+)$/, (m) => maps.workflows.get(Number(m[1]))], [/\/actions\/jobs\/(\d+)\/logs$/, (m) => maps.logs.get(Number(m[1]))],
    [/\/actions\/jobs\/(\d+)$/, (m) => maps.jobs.get(Number(m[1]))], [/^repos\/([^/]+\/[^/]+)\/git\/commits\/([a-f0-9]{40})$/, (m) => maps.commits.get(key(m[1], m[2]))],
    [/\/contents\//, (_, p) => ({ type: "file", encoding: "base64", content: Buffer.from(p.includes("/items.json?") ? set : "# Design\nHuman confirmation required\n").toString("base64") })],
  ];
  const api = (path) => {
    calls.push(path);
    const hit = table.map(([re, fn]) => [re.exec(path), fn]).find(([m]) => m);
    const out = hit ? hit[1](hit[0], path) : undefined;
    if (out === undefined) throw new Error(`404 ${path}`);
    if (out instanceof Error) throw out;
    return out;
  };
  const args = { request: "https://github.com/watchout/shirube/issues/6#issuecomment-1", sha256: digest(origin.body), review: "https://github.com/watchout/shirube/issues/6#issuecomment-2" };
  const now = Date.parse("2026-10-01T02:00:00Z");
  return { worlds, maps, calls, api, args, now, request, run: (extra = {}, over = api) => verifyAudit({ ...args, ...extra }, over, now), preflight: (over = api) => verifyAudit({ ...args, review: undefined, preflight: true }, over, now) };
}
