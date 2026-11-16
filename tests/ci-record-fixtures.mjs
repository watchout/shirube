// Synthetic values only. Expected outcomes in test files come from FD/contract assertions.
import { validateProjection } from "../scripts/sds/ci-record-input.mjs";
import { artifactSetDigest } from "../scripts/sds/ci-record-evidence.mjs";
import { createHash } from "node:crypto";
import { STAGE_DEFINITIONS, derivePolicy, extendChangedArtifacts } from "../scripts/sds/ci-record-policy.mjs";
export const NOW = "2026-11-10T00:00:00Z";
export const HEAD = "a".repeat(40), BASE = "b".repeat(40);
export const target = () => ({ repo: "watchout/example", workspace: "example", space: "default", intent: "261105-example", unit: "u1-example", stage: "code-generation", attempt: "attempt-1" });
export function projection() {
  return validateProjection({ schema: "shirube-pr-records/1", target: target(), rulesetVersion: "shirube-u1-functional-rules/1",
    artifacts: [{ path: "docs/example.md", bytes: 3, sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" }], artifactSetDigest: "c".repeat(64),
    stages: [{ stage: "code-generation", unit: "u1-example", attempt: "attempt-1", artifactPaths: ["docs/example.md"], approvals: [{ kind: "plan", choice: "Approve Plan", recordRef: "public:plan-1" }], review: null }] });
}
export function nativeApproval(kind = "plan") {
  const event = { plan: "PLAN_APPROVAL_RECORDED", summary: "SUMMARY_CONFIRMATION_RECORDED", "stage-completion": "GATE_APPROVED" }[kind];
  const choice = { plan: "Approve Plan", summary: "Looks correct", "stage-completion": "Approve" }[kind];
  return { kind, target: target(), recordRef: `public:${kind}-1`, native: { event, recordedAt: "2026-11-09T01:00:00Z",
    fields: { Stage: "code-generation", Unit: "u1-example", Checkpoint: kind === "summary" ? "summary-confirmation" : "plan-approval", Details: choice, "User Input": choice } },
    receipt: kind === "plan" ? { version: 1, intentId: "synthetic-intent-id", targetId: "unit:u1-example", runFloor: "attempt-1", choice, status: "approved" } : { version: 1, stage: "code-generation", unit: "u1-example", attempt: "attempt-1", choice },
    nativeIntentId: "synthetic-intent-id", offeredChoices: [choice], approvalRecordRef: "public:stage-approval-1" };
}
export function assessmentInput() {
  const records = projection(), artifacts = structuredClone(records.artifacts), digest = artifactSetDigest(artifacts), t = target();
  const stage = records.stages[0]; stage.stage = "functional-design";
  stage.approvals = [{ kind: "stage-completion", choice: "Approve", recordRef: "public:approval-1", approvedAt: "2026-11-06", approvedAtFormat: "date", approvalRecordRef: "public:approval-1" }];
  stage.review = { reviewer: "aidlc-architecture-reviewer-agent", verdict: "READY", requestRef: "public:review-request-1", recordRef: "public:review-1", artifactPaths: [...stage.artifactPaths], artifactSetDigest: digest };
  records.artifactSetDigest = digest; validateProjection(records);
  const prObservation = { repo: t.repo, number: 7, head: HEAD, base: BASE, changedPaths: ["docs/example.md"], complete: true };
  const policy = { outcome: "PASS", rulesetVersion: "shirube-u1-functional-rules/1", checkpoint: "code-generation-submission", requiredArtifacts: [{ path: "docs/example.md", stage: stage.stage, unit: stage.unit, attempt: stage.attempt }],
    slots: [{ stage: stage.stage, unit: stage.unit, attempt: stage.attempt, artifactPaths: [...stage.artifactPaths], kinds: ["stage-completion"], reviewer: "aidlc-architecture-reviewer-agent", reviewPerformed: false }],
    requiredApprovals: [{ stage: stage.stage, unit: stage.unit, attempt: stage.attempt, kind: "stage-completion" }] };
  const observation = { observationId: "public:observation-1", sourceRef: `https://github.com/${t.repo}/pull/7`, issuerObservation: { publisherAuthentication: "not-verified-by-gate" }, target: t,
    versionRef: policy.rulesetVersion, observedContentRef: `https://github.com/${t.repo}/tree/${HEAD}`, observedDigest: digest, availability: "observed", observedAt: NOW, prObservation,
    completeness: { complete: true, files: 1, blobs: 1, tree: true } };
  return { assessmentId: "public:assessment-1", target: t, now: NOW, policy, artifacts, records, prObservation, observations: [observation],
    approvalEvidence: [{ stage: stage.stage, unit: stage.unit, attempt: stage.attempt, recordRef: "public:approval-1", approvedAt: "2026-11-06", approvedAtFormat: "date" }],
    designAuditObservation: null, protectedCategories: Object.fromEntries(["database", "permissions", "contracts", "security"].map((k) => [k, { outcome: "NOT_APPLICABLE", evidencePaths: ["docs/example.md"] }])) };
}
export function fullRepositoryFixture() {
  const t = target(), root = `aidlc/spaces/${t.space}/intents/${t.intent}`, designHead = "d".repeat(40), treeHead = "1".repeat(40), treeDesign = "2".repeat(40), pin = "9".repeat(40), pinTree = "8".repeat(40), merge = "e".repeat(40);
  const hash = (b) => createHash("sha256").update(b).digest("hex"), gitHash = (b) => createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex");
  const plan = { scope: "feature", projectType: "brownfield", kind: "service", firstUnit: true, reference: "public:accepted-plan", baselineReference: `public:design-head:${designHead}`,
    stages: STAGE_DEFINITIONS.map((d) => ({ stage: d.stage, attempt: d.stage === "code-generation" ? t.attempt : `attempt-${d.stage}`, completed: d.phase !== "construction", summaryConfirmed: !["code-generation", "reverse-engineering"].includes(d.stage), planApproved: d.stage === "code-generation", reviewPerformed: d.phase === "construction" && d.stage !== "code-generation" })) };
  plan.baselineStages = structuredClone(plan.stages);
  const policy = derivePolicy({ target: t, checkpoint: "code-generation-submission", plan }), itemPath = "docs/audit/example-design.json", sourcePath = "scripts/sds/ci-record-policy.mjs";
  extendChangedArtifacts(policy, [itemPath, sourcePath], t);
  const files = new Map(policy.requiredArtifacts.map((a) => [a.path, Buffer.from("synthetic design")]));
  const artifact = (path, bytes) => ({ path, bytes: bytes.length, sha256: hash(bytes) });
  const envelope = (value) => `\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n`;
  const requestUrl = `https://github.com/${t.repo}/pull/7#issuecomment-1`, reviewUrl = `https://github.com/${t.repo}/pull/7#issuecomment-2`;
  const summary = plan.stages.map((s) => `| ${s.stage} | ${s.attempt} | ${s.completed} | ${s.summaryConfirmed} | ${s.planApproved} | ${s.reviewPerformed} |`).join("\n");
  const dates = plan.stages.filter((s) => s.completed).map((s) => `| ${s.stage} | null | ${s.attempt} | public:approval-${s.stage} | 2026-11-05 | date |`).join("\n");
  files.set(`${root}/construction/${t.unit}/code-generation/code-summary.md`, Buffer.from(`${summary}\n${dates}\n- Design Audit Review: ${reviewUrl}\n- Implementation After: ${reviewUrl}\n`));
  files.set(`${root}/construction/${t.unit}/code-generation/code-generation-plan.md`, Buffer.from(`## Testing Contract\n\n\`\`\`json\n{"scope":"feature","project_type":"brownfield"}\n\`\`\`\n\n${summary}\n`));
  files.set(`${root}/inception/units-generation/unit-of-work.md`, Buffer.from(`| U1 | ${t.unit} | Synthetic unit | service | shared | L |\n`));
  files.set(`${root}/inception/delivery-planning/bolt-plan.md`, Buffer.from(`| B1 | U1 / ${t.unit} | none | synthetic |\n`));
  files.set(sourcePath, Buffer.from("export const synthetic = true;\n"));
  const evidencePath = `${root}/construction/${t.unit}/functional-design/entities.md`;
  files.set(evidencePath, Buffer.from("\ufeffsynthetic design"));
  const setText = JSON.stringify({ schema: "sds-audit-items/1", items: [{ id: "EXAMPLE-01", requirement: "synthetic design" }] }); files.set(itemPath, Buffer.from(setText));
  const verifierBytes = Buffer.from("synthetic pinned verifier"), verifierEntry = { path: "scripts/hygiene/audit-admission.mjs", type: "blob", mode: "100644", sha: gitHash(verifierBytes), size: verifierBytes.length };
  const request = { schema: "sds-audit-request/1", author: "synthetic-maker", reviewer: { actor: "devauditor", github: "iyasaka-ai" }, expires_at: "2026-11-11T00:00:00Z", verifier_sha256: hash(verifierBytes),
    targets: [{ id: "example-design", repo: t.repo, pr: 7, head: designHead, base: BASE, checks: ["test"], workflow: ".github/workflows/ci.yml" }], item_set: { target: "example-design", path: itemPath, sha256: hash(setText) } };
  const requestBody = envelope(request), review = { schema: "sds-audit-review/1", reviewer: "devauditor", request_digest: hash(requestBody), targets: [{ id: "example-design", head: designHead }], blocking_findings: [],
    items: [{ id: "EXAMPLE-01", result: "PASS", reason: "synthetic design checked", counterexample: "synthetic replacement rejected", evidence: [{ target: "example-design", path: evidencePath, line: 1, quote: "synthetic design" }] }] };
  const reviewBody = envelope(review), artifacts = [...files].map(([path, b]) => artifact(path, b));
  const designPaths = policy.requiredArtifacts.filter((a) => a.stage !== "code-generation").map((a) => a.path);
  const records = { schema: "shirube-pr-records/1", target: t, rulesetVersion: "shirube-u1-functional-rules/1", artifacts, artifactSetDigest: artifactSetDigest(artifacts),
    stages: policy.slots.map((s) => ({ stage: s.stage, unit: s.unit, attempt: s.attempt, artifactPaths: [...s.artifactPaths],
      approvals: s.kinds.map((kind) => ({ kind, choice: kind === "plan" ? "Approve Plan" : kind === "summary" ? "Looks correct" : "Approve", recordRef: `public:approval-${s.stage}`, ...(kind === "stage-completion" ? { approvedAt: "2026-11-05", approvedAtFormat: "date", approvalRecordRef: `public:approval-${s.stage}` } : {}) })),
      review: s.reviewPerformed ? { reviewer: s.reviewer, verdict: "READY", requestRef: `public:review-request-${s.stage}`, recordRef: `public:review-${s.stage}`, artifactPaths: [...s.artifactPaths], artifactSetDigest: artifactSetDigest(artifacts.filter((a) => s.artifactPaths.includes(a.path))) } : null })),
    designAudit: { repo: t.repo, pr: 7, designHead, designArtifactSetDigest: artifactSetDigest(artifacts.filter((a) => designPaths.includes(a.path))), requestUrl, requestBodySha256: hash(requestBody), reviewUrl, reviewBodySha256: hash(reviewBody), expectedPublisher: "iyasaka-ai", verifierVersion: `https://github.com/watchout/shirube/blob/${pin}/scripts/hygiene/audit-admission.mjs` } };
  const recordPath = policy.recordPath; files.set(recordPath, Buffer.from(JSON.stringify(records)));
  const designFiles = new Map([...files].filter(([p]) => designPaths.includes(p) || p === itemPath || /code-generation\/(?:code-generation-plan|unit-test-instructions)\.md$/.test(p)));
  const issue = `https://api.github.com/repos/${t.repo}/issues/7`, calls = [], rootRoute = `repos/${t.repo}`;
  const changed = () => [...files.keys()].filter((p) => !p.includes("/codekb/")).map((filename) => ({ filename, status: "added" }));
  const tree = (entries) => [...entries].map(([path, b]) => ({ path, type: "blob", mode: "100644", sha: gitHash(b), size: b.length }));
  const fixture = { args: { repo: t.repo, pr: "7", head: HEAD, purpose: "ci-record-admission", checkpoint: "code-generation-submission", workspace: t.workspace, space: t.space, intent: t.intent, unit: t.unit, attempt: t.attempt, now: NOW, "assessment-id": "public:assessment-full" }, files, designFiles, records, calls, mutate: (b) => b };
  fixture.updateRecord = (mutate) => { mutate(records); files.set(recordPath, Buffer.from(JSON.stringify(records))); };
  fixture.refreshRecordArtifacts = () => {
    records.artifacts = [...files].filter(([p]) => p !== recordPath).map(([p, b]) => artifact(p, b)); records.artifactSetDigest = artifactSetDigest(records.artifacts);
    for (const s of records.stages) if (s.review) s.review.artifactSetDigest = artifactSetDigest(records.artifacts.filter((a) => s.review.artifactPaths.includes(a.path)));
    files.set(recordPath, Buffer.from(JSON.stringify(records)));
  };
  fixture.transport = async (route, options) => {
    assertRead(options); calls.push(route); let value;
    if (route === `${rootRoute}/pulls/7`) value = { number: 7, head: { sha: HEAD }, base: { sha: BASE }, changed_files: changed().length, commits: 2 };
    else if (route.startsWith(`${rootRoute}/pulls/7/files?`)) value = pageOf(route, changed());
    else if (route.startsWith(`${rootRoute}/pulls/7/commits?`)) value = [{ sha: designHead }, { sha: HEAD }];
    else if (route === `${rootRoute}/git/commits/${HEAD}`) value = { sha: HEAD, tree: { sha: treeHead } };
    else if (route === `${rootRoute}/git/commits/${designHead}`) value = { sha: designHead, tree: { sha: treeDesign } };
    else if (route === `repos/watchout/shirube/git/commits/${pin}`) value = { sha: pin, tree: { sha: pinTree } };
    else if (route === `${rootRoute}/git/trees/${treeHead}?recursive=1`) value = { sha: treeHead, truncated: false, tree: tree(files) };
    else if (route === `${rootRoute}/git/trees/${treeDesign}?recursive=1`) value = { sha: treeDesign, truncated: false, tree: tree(designFiles) };
    else if (route === `repos/watchout/shirube/git/trees/${pinTree}?recursive=1`) value = { sha: pinTree, truncated: false, tree: [verifierEntry] };
    else if (/\/git\/blobs\//.test(route)) {
      const oid = route.split("/").at(-1), bytes = [...files.values(), ...designFiles.values(), verifierBytes].find((b) => gitHash(b) === oid);
      if (!bytes) throw Error("synthetic blob missing"); value = { sha: oid, size: bytes.length, encoding: "base64", content: bytes.toString("base64") };
    } else if (route === `${rootRoute}/issues/comments/1`) value = { body: requestBody, user: { login: "watchout" }, issue_url: issue, created_at: "2026-11-09T00:00:00Z" };
    else if (route === `${rootRoute}/issues/comments/2`) value = { body: reviewBody, user: { login: "iyasaka-ai" }, issue_url: issue, updated_at: "2026-11-09T01:00:00Z" };
    else if (route.startsWith(`${rootRoute}/compare/${BASE}...${designHead}?`)) value = { base_commit: { sha: BASE }, merge_base_commit: { sha: BASE }, status: "ahead", total_commits: 1, commits: [{ sha: designHead }], files: [...designFiles.keys()].filter((p) => !p.includes("/codekb/")).map((filename) => ({ filename })) };
    else if (route.startsWith(`${rootRoute}/compare/${designHead}...${HEAD}?`)) value = { base_commit: { sha: designHead }, merge_base_commit: { sha: designHead }, status: "ahead", total_commits: 1, commits: [{ sha: HEAD }] };
    else if (route.startsWith(`${rootRoute}/commits/${HEAD}?`)) value = { sha: HEAD, files: [{ filename: sourcePath }] };
    else if (route === `${rootRoute}/commits/${designHead}/check-runs?per_page=100`) value = { total_count: 1, check_runs: [{ id: 5, name: "test", app: { slug: "github-actions" }, status: "completed", conclusion: "success", head_sha: designHead, html_url: `https://github.com/${t.repo}/actions/runs/3/job/4` }] };
    else if (route === `${rootRoute}/actions/runs/3`) value = { path: ".github/workflows/ci.yml", event: "pull_request", head_sha: designHead, status: "completed", conclusion: "success", repository: { full_name: t.repo }, pull_requests: [{ number: 7, url: `https://api.github.com/repos/${t.repo}/pulls/7`, head: { sha: designHead }, base: { sha: BASE, repo: { url: `https://api.github.com/repos/${t.repo}` } } }] };
    else if (route === `${rootRoute}/actions/jobs/4`) value = { run_id: 3, head_sha: designHead, check_run_url: `https://api.github.com/repos/${t.repo}/check-runs/5` };
    else if (route === `${rootRoute}/actions/jobs/4/logs`) return new Response(`2026-11-09T00:00:00Z [command]/usr/bin/git log -1 --format=%H\n2026-11-09T00:00:00Z ${merge}\n`);
    else if (route === `${rootRoute}/git/commits/${merge}`) value = { sha: merge, parents: [{ sha: BASE }, { sha: designHead }] };
    else throw Error("unexpected synthetic request");
    return new Response(JSON.stringify(fixture.mutate(value, route)), { status: 200 });
  };
  return fixture;
}
function assertRead(options) { if (options.method !== "GET") throw Error("synthetic fixture refuses effects"); }
function pageOf(route, values) { const page = Number(/[?&]page=(\d+)/.exec(route)[1]); return values.slice((page - 1) * 100, page * 100); }
