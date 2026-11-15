import { BUDGET, POSITIVE_CHOICES } from "./ci-record-policy.mjs";

export function need(ok, code = "UNSUPPORTED_SCHEMA") { if (!ok) throw new Error(code); }
export const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
export const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
export const isSha256 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export const isGitOid = (value) => typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
export function fields(value, required, optional = []) {
  need(isObject(value) && required.every((key) => Object.hasOwn(value, key)));
  need(Object.keys(value).every((key) => [...required, ...optional, "extensions"].includes(key)));
  if (value.extensions !== undefined) need(isObject(value.extensions) && Object.values(value.extensions).every((x) => typeof x === "string") && Object.keys(value.extensions).every((x) => x.startsWith("description")));
  return value;
}
export function unique(values, key = (x) => x) {
  need(Array.isArray(values));
  need(new Set(values.map(key)).size === values.length, "DUPLICATE_RECORD");
  return values;
}
// Lexical validation precedes JSON.parse: duplicate escaped keys cannot be overwritten first.
function scanJson(text) {
  let offset = 0;
  const skip = () => { while (/[\x20\t\r\n]/.test(text[offset] ?? "x")) offset += 1; };
  function token() {
    const start = offset; need(text[offset++] === '"');
    while (offset < text.length) {
      const c = text[offset++];
      if (c === '"') return JSON.parse(text.slice(start, offset));
      if (c === "\\") offset += 1;
    }
    need(false);
  }
  function container(depth, object) {
    const keys = new Set(), end = object ? "}" : "]";
    offset += 1; skip();
    if (text[offset] === end) { offset += 1; return; }
    for (;;) {
      skip();
      if (object) {
        const key = token(); need(!keys.has(key), "DUPLICATE_RECORD"); keys.add(key);
        skip(); need(text[offset++] === ":");
      }
      value(depth + 1); skip();
      if (text[offset] === end) { offset += 1; return; }
      need(text[offset++] === ",");
    }
  }
  function value(depth) {
    need(depth <= 128); skip();
    const c = text[offset];
    if (c === "{" || c === "[") return container(depth, c === "{");
    if (c === '"') { token(); return; }
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(offset));
    need(match); offset += match[0].length;
  }
  value(0); skip(); need(offset === text.length);
}
export function parseRecordJson(input) {
  need(typeof input === "string" || Buffer.isBuffer(input));
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  need(bytes.length <= BUDGET.maxBytesPerResponse);
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    scanJson(text); return JSON.parse(text);
  } catch (error) {
    if (error.message === "DUPLICATE_RECORD") throw error;
    throw new Error("UNSUPPORTED_SCHEMA");
  }
}
export function validatePath(path) {
  need(nonempty(path) && !/^(?:\/|[A-Za-z]:)/.test(path) && !/[\\\0]/.test(path));
  need(path.split("/").every((part) => part !== "" && part !== "." && part !== ".."));
  need(Buffer.from(path).toString("utf8") === path);
  return path;
}
export function validatePublicPath(path) {
  validatePath(path);
  const publicItemSet = /^docs\/audit\/[\w.-]+\.json$/.test(path);
  need(!path.split("/").some((part) => [".aidlc-engine", "memory.md", "diary.md"].includes(part)));
  need(publicItemSet || !path.split("/").includes("audit"));
  return path;
}
export function validateTreeEntry(entry) {
  validatePath(entry.path);
  need(entry.type === "blob" && ["100644", "100755"].includes(entry.mode));
  return entry;
}
export function validateRef(ref) {
  need(nonempty(ref) && !/[\x00-\x20\x7f]/.test(ref) && !/^(?:\/|[A-Za-z]:[\\/]|file:)/.test(ref));
  need(!/(?:^|\/)(?:\.aidlc-engine|audit)(?:\/|$)/.test(ref));
  return ref;
}
export function validateTarget(target) {
  fields(target, ["repo", "workspace", "space", "intent", "unit", "stage", "attempt"]);
  need(/^watchout\/[\w.-]+$/.test(target.repo));
  for (const key of ["workspace", "space", "intent", "stage", "attempt"]) validateRef(target[key]);
  if (target.unit !== null) validateRef(target.unit);
  need(![target.workspace, target.space, target.intent, target.stage, target.unit].filter((x) => x !== null).some((x) => /[\\/]|^\.{1,2}$/.test(x)));
  return target;
}
export function validateArtifact(entry) {
  fields(entry, ["path", "bytes", "sha256"]); validatePublicPath(entry.path);
  need(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && isSha256(entry.sha256));
  return entry;
}
function pathArray(paths) { unique(paths); need(paths.length > 0); paths.forEach(validatePublicPath); }
function validateApproval(approval) {
  fields(approval, ["kind", "choice", "recordRef"], ["approvedAt", "approvedAtFormat", "approvalRecordRef", "acceptAsIsOffered"]);
  need(Object.hasOwn(POSITIVE_CHOICES, approval.kind) && typeof approval.choice === "string"); validateRef(approval.recordRef);
  need(approval.acceptAsIsOffered === undefined || (approval.acceptAsIsOffered === true && approval.choice === "Accept as-is"));
  if (approval.kind === "stage-completion") {
    need(typeof approval.approvedAt === "string" && ["date", "timestamp"].includes(approval.approvedAtFormat)); validateRef(approval.approvalRecordRef);
  }
}
function validateStage(stage) {
  fields(stage, ["stage", "unit", "attempt", "artifactPaths", "approvals", "review"], ["reopenedFromApprovalRef"]);
  validateRef(stage.stage); validateRef(stage.attempt); if (stage.unit !== null) validateRef(stage.unit);
  pathArray(stage.artifactPaths); unique(stage.approvals, (x) => x.kind); stage.approvals.forEach(validateApproval);
  if (stage.reopenedFromApprovalRef !== undefined) validateRef(stage.reopenedFromApprovalRef);
  if (stage.review === null) return;
  const review = fields(stage.review, ["reviewer", "verdict", "requestRef", "recordRef", "artifactPaths", "artifactSetDigest"]);
  validateRef(review.reviewer); need(typeof review.verdict === "string"); validateRef(review.requestRef); validateRef(review.recordRef);
  pathArray(review.artifactPaths); need(isSha256(review.artifactSetDigest));
}
export function validateProjection(value) {
  fields(value, ["schema", "target", "rulesetVersion", "artifacts", "artifactSetDigest", "stages"], ["control_source_ref", "designAudit"]);
  need(value.schema === "shirube-pr-records/1"); validateTarget(value.target); validateRef(value.rulesetVersion);
  unique(value.artifacts, (x) => x.path); need(value.artifacts.length > 0); value.artifacts.forEach(validateArtifact);
  need(isSha256(value.artifactSetDigest)); unique(value.stages, (s) => JSON.stringify([s.stage, s.unit, s.attempt]));
  need(value.stages.length > 0); value.stages.forEach(validateStage);
  if (value.control_source_ref !== undefined) {
    fields(value.control_source_ref, ["url", "sha256"]); validateRef(value.control_source_ref.url); need(isSha256(value.control_source_ref.sha256));
  }
  return value;
}
