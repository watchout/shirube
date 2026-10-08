// sds-preflight (docs/sds/distribution.md §4): structural facts only, read-only. Meaning stays with the independent audit.
// Run from a pinned shirube commit, never from the PR head. Exit 0 = PASS, 1 = FAIL. authorization is always NONE.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { matchesAny, parseArgs } from "../hygiene/lib.mjs";
import { verifyAudit } from "../hygiene/audit-admission.mjs";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digest = (s) => createHash("sha256").update(s).digest("hex");
const RISKS = ["R0", "R1", "R2", "R3", "R4"];
const DEFAULT_PROTECTED = [".github/workflows/**", ".shirube/**", "CODEOWNERS", ".github/CODEOWNERS"];
const COMMENT = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/(?:issues|pull)\/\d+#issuecomment-(\d+)$/;
function github(path) {
  const body = execFileSync("gh", ["api", path], { encoding: "utf8", timeout: 20000, maxBuffer: 8000000 });
  return path.endsWith("/logs") ? body : JSON.parse(body);
}
function need(ok, why) { if (!ok) throw new Error(why); }
function block(body) {
  const blocks = [...(body ?? "").matchAll(/^```json sds-pr\r?\n([\s\S]*?)^```\s*$/gm)];
  need(blocks.length === 1, "(a) exactly one ```json sds-pr block is required in the PR body");
  const v = JSON.parse(blocks[0][1]);
  need(v.schema === "sds-pr/1" && RISKS.includes(v.risk_class), "(a) schema sds-pr/1 and risk_class R0-R4 are required");
  need(Array.isArray(v.changed_paths) && Array.isArray(v.forbidden_paths), "(a) changed_paths and forbidden_paths must be arrays");
  return v;
}
function comment(url, api) {
  const m = COMMENT.exec(url ?? "");
  need(m, `unsupported comment URL: ${url}`);
  return api(`repos/${m[1]}/issues/comments/${m[2]}`).body;
}
function files(repo, pr, api) {
  const out = [];
  for (let page = 1; ; page += 1) {
    const batch = api(`repos/${repo}/pulls/${pr}/files?per_page=100&page=${page}`);
    out.push(...batch.map((f) => f.filename));
    if (batch.length < 100) return out;
  }
}
function auditCheck(pr, ctx, api, now) {
  const a = pr.audit ?? {};
  need(a.request && a.request_sha256 && a.review, "(d) R2+ needs audit.request, audit.request_sha256 and audit.review");
  const receipt = verifyAudit({ request: a.request, sha256: a.request_sha256, review: a.review }, api, now);
  const bound = receipt.checks.length > 0 && JSON.parse(comment(a.request, api).match(/^```json\r?\n([\s\S]*?)^```/m)[1])
    .targets.some((t) => t.repo === ctx.repo && t.pr === ctx.pr && t.head === ctx.head);
  need(receipt.verdict === "RECEIPT_ACCEPTED" && bound, "(d) the accepted audit does not name this PR at this head");
}
function ownerCheck(pr, ctx, api) {
  need(pr.owner_decision, "(e) R3/R4 or a protected path needs owner_decision");
  const body = comment(pr.owner_decision, api);
  need(/^\s*verdict:\s*APPROVED\s*$/m.test(body), "(e) owner decision is not APPROVED");
  need(new RegExp(`^\\s*repository:\\s*${esc(ctx.repo)}\\s*$`, "m").test(body), "(e) owner decision names another repository");
  need(new RegExp(`^\\s*exact_head:\\s*${ctx.head}\\s*$`, "m").test(body), "(e) owner decision does not name the current head");
}
function readPin(ctx, ref, api) {
  try { return JSON.parse(Buffer.from(api(`repos/${ctx.repo}/contents/.shirube/sds-pin.json?ref=${ref}`).content, "base64").toString("utf8")); }
  catch { return null; }
}
function pinCheck(ctx, api) {
  const pin = readPin(ctx, ctx.head, api);
  if (!pin) return ["(f) .shirube/sds-pin.json is missing or unreadable"];
  const warnings = [];
  for (const [path, sha] of Object.entries(pin.files ?? {})) {
    const r = api(`repos/${ctx.repo}/contents/${path}?ref=${ctx.head}`);
    if (digest(Buffer.from(r.content, "base64")) !== sha) warnings.push(`(f) ${path} differs from the pinned kit`);
  }
  return warnings;
}
export function preflight({ repo, pr: number }, api = github, now = Date.now()) {
  const p = api(`repos/${repo}/pulls/${number}`);
  const ctx = { repo, pr: Number(number), head: p.head.sha, base: p.base.sha };
  const pr = block(p.body);
  need(digest(comment(pr.control_source_ref?.url, api)) === pr.control_source_ref?.sha256, "(b) control_source_ref body digest differs");
  const actual = files(repo, ctx.pr, api);
  need(JSON.stringify([...actual].sort()) === JSON.stringify([...pr.changed_paths].sort()), "(c) changed_paths differ from the PR diff");
  const protectedPaths = readPin(ctx, ctx.base, api)?.protected_paths ?? DEFAULT_PROTECTED; // trusted base, never the PR
  need(!actual.some((f) => matchesAny(f, pr.forbidden_paths)), "(c) a forbidden path is changed");
  const protectedTouched = actual.some((f) => matchesAny(f, protectedPaths));
  const level = RISKS.indexOf(pr.risk_class);
  if (level >= 2) auditCheck(pr, ctx, api, now);
  if (level >= 3 || protectedTouched) ownerCheck(pr, ctx, api);
  const warnings = pinCheck(ctx, api);
  return { check: "sds-preflight", verdict: "PASS", head: ctx.head, risk_class: pr.risk_class, protected_touched: protectedTouched, warnings, owner_identity: "NOT_VERIFIED_BY_MACHINE", authorization: "NONE" };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  try { process.stdout.write(`${JSON.stringify(preflight(args))}\n`); }
  catch (error) { process.stdout.write(`${JSON.stringify({ check: "sds-preflight", verdict: "FAIL", reason: error.message, authorization: "NONE" })}\n`); process.exitCode = 1; }
}
