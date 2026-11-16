// Historical scope deliberately does not call the current-head targetCheck/verifyAudit entry.
import { payload, requestChecks, reviewChecks, itemResults, baseCheck, successfulRun, workflowCheck } from "../hygiene/audit-admission.mjs";
import { need, parseRecordJson, isSha256, isGitOid, validatePublicPath, unique } from "./ci-record-input.mjs";
import { sha256, artifactSetDigest } from "./ci-record-evidence.mjs";

const result = (outcome, code) => ({ outcome, reasonCodes: code ? [code] : [] });
const CATEGORIES = ["database", "permissions", "contracts", "security"];
function applicability(input) {
  const observed = new Set(input.artifacts?.map((x) => x.path));
  const categories = CATEGORIES.map((key) => input.categories?.[key]);
  if (!categories.every((c) => c && ["APPLIES", "NOT_APPLICABLE", "UNKNOWN"].includes(c.outcome) && Array.isArray(c.evidencePaths) && c.evidencePaths.length > 0 && c.evidencePaths.every((p) => observed.has(p)))) return "UNKNOWN";
  if (categories.some((c) => c.outcome === "APPLIES")) return "APPLIES";
  return categories.every((c) => c.outcome === "NOT_APPLICABLE") ? "NOT_APPLICABLE" : "UNKNOWN";
}
function publicDesignPath(path, target) {
  validatePublicPath(path);
  const prefix = `aidlc/spaces/${target.space}/intents/${target.intent}/`;
  const unitScope = !path.startsWith(`${prefix}construction/`) || path.startsWith(`${prefix}construction/${target.unit}/`);
  return (path.startsWith(prefix) && unitScope && /\.(?:md|json)$/.test(path) && !/(?:^|\/)(?:aidlc-state\.md|runtime-graph\.json)$/.test(path)) || /^docs\/audit\/[\w.-]+\.json$/.test(path);
}
function comparisonEndsAt(c, base, head) {
  return head === base ? c.commits.length === 0 : c.commits.at(-1)?.sha === head;
}
function comparisonComplete(c, base, head) {
  need(c && c.base_commit?.sha === base && c.merge_base_commit?.sha === base && ["ahead", "identical"].includes(c.status), "INPUT_UNOBSERVABLE");
  need(Array.isArray(c.commits) && Number.isSafeInteger(c.total_commits) && c.total_commits === c.commits.length && comparisonEndsAt(c, base, head), "INPUT_UNOBSERVABLE");
  unique(c.commits, (x) => x.sha); c.commits.forEach((x) => need(isGitOid(x.sha), "INPUT_UNOBSERVABLE"));
}
function historyChecks(input, auditTarget) {
  const { history: h, reference: ref, prObservation: pr, target } = input;
  need(h?.designCommit?.sha === ref.designHead, "INPUT_UNOBSERVABLE");
  comparisonComplete(h.designComparison, auditTarget.base, ref.designHead);
  comparisonComplete(h.ancestorComparison, ref.designHead, pr.head);
  const designFiles = h.designComparison.files;
  need(Array.isArray(designFiles) && designFiles.length > 0 && designFiles.length < 300, "INPUT_UNOBSERVABLE");
  const names = (files) => files.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean));
  need(names(designFiles).every((p) => publicDesignPath(p, target)), "DESIGN_AUDIT_BINDING_MISMATCH");
  const paths = new Set(input.artifacts.map((a) => a.path));
  need(input.artifacts.every((a) => publicDesignPath(a.path, target) || a.path.startsWith(`aidlc/spaces/${target.space}/codekb/${target.workspace}/`)), "DESIGN_AUDIT_BINDING_MISMATCH");
  for (const commit of h.ancestorComparison.commits) {
    need(Array.isArray(commit.files) && commit.files.length < 3000, "INPUT_UNOBSERVABLE");
    need(!names(commit.files).some((path) => paths.has(path)), "DESIGN_AUDIT_STALE");
  }
}
function historicalApi(input) {
  return (route) => {
    if (input.baseMoveObservations && Object.hasOwn(input.baseMoveObservations, route)) return input.baseMoveObservations[route];
    if (input.ciObservations && Object.hasOwn(input.ciObservations, route)) return input.ciObservations[route];
    for (const [path, content] of Object.entries(input.evidenceFiles)) {
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      if (route === `repos/${input.reference.repo}/contents/${encoded}?ref=${input.reference.designHead}`) return { type: "file", encoding: "base64", content: Buffer.from(content).toString("base64") };
    }
    throw new Error("INPUT_UNOBSERVABLE");
  };
}
function auditTarget(request, pr, reference) {
  const t = request.targets.find((x) => x.repo === pr.repo && x.pr === pr.number && x.head === reference.designHead);
  need(t && request.targets.length === 1 && t.checks.length > 0 && typeof t.workflow === "string", "DESIGN_AUDIT_BINDING_MISMATCH");
  return t;
}
function auditPayloads(input) {
  const { reference: ref, requestComment: c, reviewComment: review, prObservation: pr } = input;
  need(c && review, "INPUT_UNOBSERVABLE");
  need(sha256(c.body) === ref.requestBodySha256 && sha256(review.body) === ref.reviewBodySha256, "DESIGN_AUDIT_BINDING_MISMATCH");
  const expectedIssue = `https://api.github.com/repos/${pr.repo}/issues/${pr.number}`;
  need(c.issue_url === expectedIssue && review.issue_url === expectedIssue, "DESIGN_AUDIT_BINDING_MISMATCH");
  const r = payload(c.body), record = payload(review.body);
  need(isSha256(input.verifierSha256), "INPUT_UNOBSERVABLE");
  requestChecks(r, c, Date.parse(input.now), input.verifierSha256);
  need(r.reviewer.actor === "devauditor" && r.reviewer.github === "iyasaka-ai" && ref.expectedPublisher === "iyasaka-ai", "DESIGN_AUDIT_BINDING_MISMATCH");
  const t = auditTarget(r, pr, ref);
  const runs = input.checkRuns;
  need(runs && runs.total_count === runs.check_runs.length, "INPUT_UNOBSERVABLE");
  unique(t.checks); t.checks.forEach((name) => workflowCheck(successfulRun(runs.check_runs, name, t.head), t, historicalApi(input)));
  baseCheck(t, { base: { sha: pr.base, ref: input.currentBaseRef } }, historicalApi(input), []);
  reviewChecks({ r, c, review, record, requestDigest: ref.requestBodySha256 });
  need(r.item_set.target === t.id && sha256(input.itemSetText) === r.item_set.sha256, "DESIGN_AUDIT_BINDING_MISMATCH");
  const set = parseRecordJson(input.itemSetText); need(set.schema === "sds-audit-items/1" && set.items.length > 0, "DESIGN_AUDIT_BINDING_MISMATCH"); unique(set.items, (x) => x.id);
  itemResults(record, set.items, r.targets, historicalApi(input));
  return t;
}
function referenceChecks(input) {
  const { reference: ref, prObservation: pr } = input;
  need(ref.repo === pr.repo && ref.pr === pr.number && input.target.repo === pr.repo && isGitOid(ref.designHead), "DESIGN_AUDIT_BINDING_MISMATCH");
  need(artifactSetDigest(input.artifacts) === ref.designArtifactSetDigest, "DESIGN_AUDIT_BINDING_MISMATCH");
}
function operationOrder(input) {
  const order = input.implementationOrder;
  need(order && order.designReviewRef === input.reference.reviewUrl && order.implementationAfterRef === input.reference.reviewUrl, "DESIGN_AUDIT_BINDING_MISMATCH");
}
export function evaluateDesignAudit(input) {
  const applies = applicability(input);
  if (applies === "UNKNOWN") return result("UNKNOWN", "INPUT_UNOBSERVABLE");
  if (applies === "NOT_APPLICABLE") return result("NOT_APPLICABLE");
  if (!input.reference) return result("FAIL", "DESIGN_AUDIT_MISSING");
  try {
    referenceChecks(input);
    const t = auditPayloads(input); historyChecks(input, t);
    operationOrder(input);
    return result("PASS");
  } catch (error) {
    if (error.message === "INPUT_UNOBSERVABLE") return result("UNKNOWN", "INPUT_UNOBSERVABLE");
    return result("FAIL", error.message === "DESIGN_AUDIT_STALE" ? error.message : "DESIGN_AUDIT_BINDING_MISMATCH");
  }
}
