import { createHash } from "node:crypto";
import { BUDGET, RULESET, readAcceptedPlan, derivePolicy, extendChangedArtifacts } from "./ci-record-policy.mjs";
import { need, unique, parseRecordJson, validateTarget, validateRef, validatePath, validatePublicPath, validateTreeEntry, isGitOid, validateArtifact } from "./ci-record-input.mjs";

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function artifactSetDigest(entries) {
  unique(entries, (e) => e.path); need(entries.length > 0); entries.forEach(validateArtifact);
  const sorted = entries.toSorted((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  return sha256(sorted.map((e) => `${JSON.stringify([e.path, e.bytes, e.sha256])}\n`).join(""));
}
function safeRoute(route) {
  need(typeof route === "string" && /^repos\/watchout\/[\w.-]+\/(?:pulls\/|git\/|compare\/|issues\/comments\/|commits\/|actions\/|check-runs\/)/.test(route), "INPUT_UNOBSERVABLE");
  need(!/[\x00-\x20\\#]/.test(route) && !route.split("/").includes("..") && !/%(?:2f|5c|00)/i.test(route), "INPUT_UNOBSERVABLE");
}
async function responseBytes(response, limit, controller) {
  need(response?.status === 200 && response.body, "INPUT_UNOBSERVABLE");
  const chunks = []; let count = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk); count += bytes.length;
    if (count > limit) { controller.abort(); throw new Error("INPUT_UNOBSERVABLE"); }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, count);
}
export function createReader({ transport = (route, options) => fetch(`https://api.github.com/${route}`, { ...options, method: "GET", redirect: "error", headers: { accept: "application/vnd.github+json" } }), clock = () => performance.now() } = {}) {
  const started = clock(), observedBlobs = new Map(); let requests = 0, stopped = false;
  async function bytes(route) {
    const before = clock(), remaining = BUDGET.totalTimeoutMs - (before - started);
    need(!stopped && remaining > 0, "INPUT_UNOBSERVABLE"); safeRoute(route);
    // One already-read immutable Git blob can back multiple tree paths in this evaluation.
    // Every use is still checked against its tree entry/object ID; no prior-run data is reused.
    if (observedBlobs.has(route)) return Buffer.from(observedBlobs.get(route));
    need(requests < BUDGET.maxRequests, "INPUT_UNOBSERVABLE");
    const controller = new AbortController(), allowed = Math.min(BUDGET.timeoutMs, remaining); let timer;
    requests += 1;
    try {
      const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("INPUT_UNOBSERVABLE")); }, allowed); });
      const read = (async () => responseBytes(await transport(route, { signal: controller.signal, method: "GET" }), BUDGET.maxBytesPerResponse, controller))();
      const result = await Promise.race([read, deadline]);
      need(clock() - before <= allowed && clock() - started <= BUDGET.totalTimeoutMs && !controller.signal.aborted, "INPUT_UNOBSERVABLE");
      if (/\/git\/blobs\/[a-f0-9]+$/.test(route)) observedBlobs.set(route, Buffer.from(result));
      return result;
    } catch { stopped = true; controller.abort(); throw new Error("INPUT_UNOBSERVABLE"); }
    finally { clearTimeout(timer); }
  }
  async function json(route) {
    try { return parseRecordJson(await bytes(route)); }
    catch { stopped = true; throw new Error("INPUT_UNOBSERVABLE"); }
  }
  return { bytes, json, statistics: () => ({ requests, elapsedMs: clock() - started, stopped }) };
}
export async function readPages(reader, route) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const batch = await reader.json(`${route}?per_page=100&page=${page}`);
    need(Array.isArray(batch) && batch.length <= 100, "INPUT_UNOBSERVABLE"); all.push(...batch);
    if (batch.length < 100) return all;
  }
}
function prIdentity(pr, number, head) {
  need(pr?.number === number && pr.head?.sha === head && isGitOid(pr.base?.sha), "TARGET_MISMATCH");
  need(Number.isSafeInteger(pr.changed_files) && pr.changed_files > 0 && Number.isSafeInteger(pr.commits) && pr.commits > 0, "INPUT_UNOBSERVABLE");
  return { number, head: pr.head.sha, base: pr.base.sha };
}
function changedPaths(files, paths, recordPath) {
  const seen = unique(files, (f) => f.filename), result = [];
  for (const f of seen) {
    validatePublicPath(f.filename);
    if (f.previous_filename !== undefined) validatePublicPath(f.previous_filename);
    result.push(...[f.filename, f.previous_filename].filter((x) => x !== undefined));
  }
  const all = [...new Set(result)];
  need(all.every((path) => paths.includes(path) || path === recordPath), "ARTIFACT_SET_MISMATCH");
  return all;
}
async function readTree(reader, prefix, head) {
  const commit = await reader.json(`${prefix}/git/commits/${head}`);
  need(commit?.sha === head && isGitOid(commit.tree?.sha), "INPUT_UNOBSERVABLE");
  const tree = await reader.json(`${prefix}/git/trees/${commit.tree.sha}?recursive=1`);
  need(tree?.sha === commit.tree.sha && tree.truncated === false && Array.isArray(tree.tree), "INPUT_UNOBSERVABLE");
  unique(tree.tree, (entry) => entry.path); tree.tree.forEach((entry) => validatePath(entry.path));
  return tree.tree;
}
export async function readBlob(reader, prefix, entry) {
  validateTreeEntry(entry); need(isGitOid(entry.sha), "INPUT_UNOBSERVABLE");
  const blob = await reader.json(`${prefix}/git/blobs/${entry.sha}`);
  need(blob?.sha === entry.sha && blob.encoding === "base64" && typeof blob.content === "string", "INPUT_UNOBSERVABLE");
  const encoded = blob.content.replace(/\s/g, ""), bytes = Buffer.from(encoded, "base64");
  need(bytes.toString("base64") === encoded && bytes.length === blob.size && bytes.length === entry.size, "INPUT_UNOBSERVABLE");
  const actualOid = createHash(entry.sha.length === 40 ? "sha1" : "sha256").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  need(actualOid === entry.sha, "INPUT_UNOBSERVABLE");
  return bytes;
}
export async function collectEvidence({ target, number, head, requiredPaths, recordPath, observationId, now, reader }) {
  validateTarget(target); validateRef(observationId); need(isGitOid(head) && Number.isSafeInteger(number) && number > 0);
  need(typeof now === "string" && Number.isFinite(Date.parse(now)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(now));
  unique(requiredPaths); need(requiredPaths.length > 0); requiredPaths.forEach(validatePublicPath); validatePublicPath(recordPath);
  const prefix = `repos/${target.repo}`, meta = await reader.json(`${prefix}/pulls/${number}`), initial = prIdentity(meta, number, head);
  const files = await readPages(reader, `${prefix}/pulls/${number}/files`);
  need(meta.changed_files === files.length && files.length < 3000, "INPUT_UNOBSERVABLE");
  const changes = changedPaths(files, requiredPaths, recordPath);
  const commits = await readPages(reader, `${prefix}/pulls/${number}/commits`);
  need(commits.length === meta.commits && commits.every((c) => isGitOid(c.sha)), "INPUT_UNOBSERVABLE"); unique(commits, (c) => c.sha);
  const tree = await readTree(reader, prefix, head), blobs = new Map(), artifacts = [];
  for (const path of requiredPaths) {
    const entry = tree.find((x) => x.path === path); need(entry, "INPUT_UNOBSERVABLE");
    const bytes = await readBlob(reader, prefix, entry); blobs.set(path, bytes); artifacts.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  artifacts.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const digest = artifactSetDigest(artifacts), last = prIdentity(await reader.json(`${prefix}/pulls/${number}`), number, head);
  need(last.base === initial.base, "TARGET_MISMATCH");
  const prObservation = { repo: target.repo, ...initial, changedPaths: changes, complete: true };
  const observation = { observationId, sourceRef: `https://github.com/${target.repo}/pull/${number}`, issuerObservation: { publisherAuthentication: "not-verified-by-gate" }, target: structuredClone(target), versionRef: RULESET,
    observedContentRef: `https://github.com/${target.repo}/tree/${head}`, observedDigest: digest, availability: "observed", observedAt: now, prObservation,
    completeness: { files: files.length, commits: commits.length, tree: true, blobs: artifacts.length, complete: true } };
  return { prObservation, artifacts, artifactSetDigest: digest, blobs, tree, commits, observation, budgetResult: reader.statistics() };
}
async function readPolicy({ args, target, root, at, records, summaryBytes }) {
  const planBytes = await at(`${root}/construction/${target.unit}/code-generation/code-generation-plan.md`);
  const contractBlock = /## Testing Contract\r?\n\r?\n```json\r?\n([\s\S]*?)\r?\n```/.exec(planBytes.toString("utf8"));
  need(contractBlock, "INPUT_UNOBSERVABLE"); const testingContract = parseRecordJson(contractBlock[1]);
  const unitBytes = await at(`${root}/inception/units-generation/unit-of-work.md`), boltBytes = await at(`${root}/inception/delivery-planning/bolt-plan.md`);
  const plan = readAcceptedPlan({ testingContract, summary: summaryBytes.toString("utf8"), unitText: unitBytes.toString("utf8"), boltText: boltBytes.toString("utf8"), target,
    reference: `public:accepted-plan:${sha256(summaryBytes)}`, baselineReference: records.designAudit?.designHead ? `public:design-head:${records.designAudit.designHead}` : "" });
  const policy = derivePolicy({ target, checkpoint: args.checkpoint, plan }); need(policy.outcome === "PASS", "INPUT_UNOBSERVABLE");
  return policy;
}
export async function collectAdmissionInput(args, { reader = createReader() } = {}) {
  const target = { repo: args.repo, workspace: args.workspace, space: args.space, intent: args.intent, unit: args.unit, stage: "code-generation", attempt: args.attempt };
  const prefix = `repos/${target.repo}`, number = Number(args.pr), root = `aidlc/spaces/${target.space}/intents/${target.intent}`;
  const meta = await reader.json(`${prefix}/pulls/${number}`); prIdentity(meta, number, args.head);
  const tree = await readTree(reader, prefix, args.head);
  const at = async (path) => { validatePublicPath(path); const entry = tree.find((e) => e.path === path); need(entry, "INPUT_UNOBSERVABLE"); return readBlob(reader, prefix, entry); };
  const recordPath = `${root}/construction/${target.unit}/code-generation/pr-records.json`;
  const records = parseRecordJson(await at(recordPath));
  const summaryBytes = await at(`${root}/construction/${target.unit}/code-generation/code-summary.md`);
  const policy = await readPolicy({ args, target, root, at, records, summaryBytes });
  const files = await readPages(reader, `${prefix}/pulls/${number}/files`);
  need(files.length === meta.changed_files && files.length < 3000, "INPUT_UNOBSERVABLE");
  extendChangedArtifacts(policy, files.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean)), target);
  const observed = await collectEvidence({ target, number, head: args.head, requiredPaths: policy.requiredArtifacts.map((x) => x.path), recordPath, observationId: `${args["assessment-id"]}:pr`, now: args.now, reader });
  const approvalEvidence = [...summaryBytes.toString("utf8").matchAll(/^\| ([\w-]+) \| (null|[\w-]+) \| ([^|\r\n]+) \| ([^|\r\n]+) \| ([^|\r\n]+) \| (date|timestamp) \|$/gm)].map((m) => ({ stage: m[1], unit: m[2] === "null" ? null : m[2], attempt: m[3], recordRef: m[4], approvedAt: m[5], approvedAtFormat: m[6] }));
  const designPaths = policy.requiredArtifacts.filter((a) => a.stage !== "code-generation").map((a) => a.path);
  const protectedCategories = Object.fromEntries(["database", "permissions", "contracts", "security"].map((name) => [name, { outcome: name === "contracts" || name === "security" ? "APPLIES" : "UNKNOWN", evidencePaths: designPaths.filter((p) => /contract-summary|security-design/.test(p)) }]));
  const designAuditObservation = records.designAudit ? await collectHistoricalAudit({ reader, target, prObservation: observed.prObservation, currentBaseRef: meta.base.ref, reference: records.designAudit, designPaths, currentTree: tree }) : null;
  if (designAuditObservation) designAuditObservation.implementationOrder = { designReviewRef: /^- Design Audit Review: (\S+)$/m.exec(summaryBytes.toString("utf8"))?.[1], implementationAfterRef: /^- Implementation After: (\S+)$/m.exec(summaryBytes.toString("utf8"))?.[1] };
  if (records.control_source_ref) need(sha256((await readPublicComment(reader, records.control_source_ref.url, observed.prObservation)).body) === records.control_source_ref.sha256, "INPUT_UNOBSERVABLE");
  const finalMeta = await reader.json(`${prefix}/pulls/${number}`), final = prIdentity(finalMeta, number, args.head); need(final.base === observed.prObservation.base && finalMeta.base.ref === meta.base.ref, "TARGET_MISMATCH");
  return { target, assessmentId: args["assessment-id"], now: args.now, policy, records, artifacts: observed.artifacts, prObservation: observed.prObservation, observations: [observed.observation], approvalEvidence, protectedCategories, designAuditObservation };
}
async function readPublicComment(reader, url, pr) {
  const match = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/(?:pull|issues)\/(\d+)#issuecomment-(\d+)$/.exec(url);
  need(match && match[1] === pr.repo && Number(match[2]) === pr.number, "INPUT_UNOBSERVABLE");
  const comment = await reader.json(`repos/${pr.repo}/issues/comments/${match[3]}`);
  need(comment?.issue_url === `https://api.github.com/repos/${pr.repo}/issues/${pr.number}` && typeof comment.body === "string", "INPUT_UNOBSERVABLE"); return comment;
}
async function readComparison(reader, prefix, base, head) {
  need(isGitOid(base) && isGitOid(head), "INPUT_UNOBSERVABLE"); let comparison;
  const commits = [];
  for (let page = 1; ; page += 1) {
    const c = await reader.json(`${prefix}/compare/${base}...${head}?per_page=100&page=${page}`);
    need(Array.isArray(c.commits) && c.commits.length <= 100 && Number.isSafeInteger(c.total_commits), "INPUT_UNOBSERVABLE");
    comparison ??= c; need(c.total_commits === comparison.total_commits, "INPUT_UNOBSERVABLE"); commits.push(...c.commits);
    if (commits.length === c.total_commits) return { ...comparison, commits };
    need(c.commits.length === 100 && commits.length < c.total_commits, "INPUT_UNOBSERVABLE");
  }
}
async function readCommitFiles(reader, prefix, sha) {
  const files = [];
  for (let page = 1; ; page += 1) {
    const commit = await reader.json(`${prefix}/commits/${sha}?per_page=100&page=${page}`);
    need(commit?.sha === sha && Array.isArray(commit.files) && commit.files.length <= 100, "INPUT_UNOBSERVABLE"); files.push(...commit.files);
    need(files.length < 3000, "INPUT_UNOBSERVABLE"); if (commit.files.length < 100) return files;
  }
}
async function historicalBaseMove(reader, prefix, target, pr) {
  const observations = {};
  if (target.base !== pr.base) for (const head of [pr.base, target.head]) {
    const route = `${prefix}/compare/${target.base}...${head}`; observations[route] = await reader.json(route);
  }
  return observations;
}
async function historicalFiles({ reader, prefix, tree, currentTree, designPaths, paths }) {
  const artifacts = [], evidenceFiles = {};
  for (const path of paths) {
    validatePublicPath(path); const entry = tree.find((e) => e.path === path); need(entry, "INPUT_UNOBSERVABLE");
    const bytes = await readBlob(reader, prefix, entry); evidenceFiles[path] = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (designPaths.includes(path)) {
      artifacts.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
      const current = currentTree.find((e) => e.path === path); need(current?.sha === entry.sha && current.mode === entry.mode, "DESIGN_AUDIT_STALE");
    }
  }
  return { artifacts, evidenceFiles };
}
async function historicalCi(reader, prefix, pr, target) {
  const checkRuns = await reader.json(`${prefix}/commits/${target.head}/check-runs?per_page=100`), ciObservations = {};
  need(checkRuns.total_count === checkRuns.check_runs.length, "INPUT_UNOBSERVABLE");
  for (const name of target.checks) {
    const run = checkRuns.check_runs.filter((r) => r.name === name && r.app?.slug === "github-actions").sort((a, b) => b.id - a.id)[0];
    const ids = new RegExp(`^https://github.com/${pr.repo}/actions/runs/(\\d+)/job/(\\d+)$`).exec(run?.html_url); need(ids, "INPUT_UNOBSERVABLE");
    for (const route of [`${prefix}/actions/runs/${ids[1]}`, `${prefix}/actions/jobs/${ids[2]}`]) ciObservations[route] = await reader.json(route);
    const route = `${prefix}/actions/jobs/${ids[2]}/logs`, logs = (await reader.bytes(route)).toString("utf8"); ciObservations[route] = logs;
    const merge = /^\S+ \[command\]\/\S*git log -1 --format=%H\r?\n\S+ ([a-f0-9]{40})(?:\r?\n|$)/m.exec(logs)?.[1]; need(merge, "INPUT_UNOBSERVABLE");
    ciObservations[`${prefix}/git/commits/${merge}`] = await reader.json(`${prefix}/git/commits/${merge}`);
  }
  return { checkRuns, ciObservations };
}
async function collectHistoricalAudit({ reader, target, prObservation: pr, reference: ref, currentTree, designPaths, currentBaseRef }) {
  try {
    const prefix = `repos/${target.repo}`, requestComment = await readPublicComment(reader, ref.requestUrl, pr), reviewComment = await readPublicComment(reader, ref.reviewUrl, pr);
    const block = /^```json\r?\n([\s\S]*?)^```/m.exec(requestComment.body); need(block, "INPUT_UNOBSERVABLE");
    const request = parseRecordJson(block[1]), t = request.targets.find((x) => x.repo === pr.repo && x.pr === pr.number && x.head === ref.designHead); need(t, "INPUT_UNOBSERVABLE");
    const pinned = /^https:\/\/github\.com\/watchout\/shirube\/blob\/([a-f0-9]{40})\/scripts\/hygiene\/audit-admission\.mjs$/.exec(ref.verifierVersion); need(pinned, "INPUT_UNOBSERVABLE");
    const verifierTree = await readTree(reader, "repos/watchout/shirube", pinned[1]);
    const verifier = verifierTree.find((e) => e.path === "scripts/hygiene/audit-admission.mjs"); need(verifier, "INPUT_UNOBSERVABLE");
    const verifierSha256 = sha256(await readBlob(reader, "repos/watchout/shirube", verifier));
    const tree = await readTree(reader, prefix, ref.designHead), designCommit = await reader.json(`${prefix}/git/commits/${ref.designHead}`);
    const designComparison = await readComparison(reader, prefix, t.base, ref.designHead), ancestorComparison = await readComparison(reader, prefix, ref.designHead, pr.head);
    need(Array.isArray(designComparison.files) && designComparison.files.length < 300, "INPUT_UNOBSERVABLE");
    for (const c of ancestorComparison.commits) c.files = await readCommitFiles(reader, prefix, c.sha);
    const paths = [...new Set([...designPaths, request.item_set.path, ...parseRecordJson(/^```json\r?\n([\s\S]*?)^```/m.exec(reviewComment.body)[1]).items.flatMap((i) => i.evidence.map((e) => e.path))])];
    const { artifacts, evidenceFiles } = await historicalFiles({ reader, prefix, tree, currentTree, designPaths, paths });
    const { checkRuns, ciObservations } = await historicalCi(reader, prefix, pr, t);
    const baseMoveObservations = await historicalBaseMove(reader, prefix, t, pr);
    need(sha256((await readPublicComment(reader, ref.requestUrl, pr)).body) === ref.requestBodySha256 && sha256((await readPublicComment(reader, ref.reviewUrl, pr)).body) === ref.reviewBodySha256, "INPUT_UNOBSERVABLE");
    return { reference: ref, requestComment, reviewComment, verifierSha256, itemSetText: evidenceFiles[request.item_set.path], artifacts, evidenceFiles, history: { designCommit, designComparison, ancestorComparison }, checkRuns, ciObservations, baseMoveObservations, currentBaseRef };
  } catch (error) { return error.message === "DESIGN_AUDIT_STALE" ? { stale: true } : { availability: "unavailable" }; }
}
