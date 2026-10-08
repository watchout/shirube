// sds-gate (docs/sds/distribution.md §4): the single required check of the SDS-V2 kit. Three judgments only:
//   1 risk_class: exactly one `risk:R0`..`risk:R4` label, equal to the PR block; a protected path makes it R4
//   2 changed paths: the PR block lists exactly the files in the diff
//   3 R2 and above: the pinned audit-admission checker accepts the audit at the current head
// Read-only. Run from a pinned shirube commit, never from the PR head. It does not check Owner approval (§7).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { matchesAny, parseArgs } from "../hygiene/lib.mjs";
import { verifyAudit } from "../hygiene/audit-admission.mjs";

const RISKS = ["R0", "R1", "R2", "R3", "R4"];
// Every location GitHub reads CODEOWNERS from (root, .github/, docs/) is protected.
export const DEFAULT_PROTECTED = [".github/workflows/**", ".shirube/**", "CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];
function github(path) {
  const body = execFileSync("gh", ["api", path], { encoding: "utf8", timeout: 20000, maxBuffer: 8000000 });
  return path.endsWith("/logs") ? body : JSON.parse(body);
}
function need(ok, why) { if (!ok) throw new Error(why); }
function block(body) {
  const blocks = [...(body ?? "").matchAll(/^```json sds-pr\r?\n([\s\S]*?)^```\s*$/gm)];
  need(blocks.length === 1, "exactly one ```json sds-pr block is required in the PR body");
  const v = JSON.parse(blocks[0][1]);
  need(v.schema === "sds-pr/1" && Array.isArray(v.changed_paths), "the block needs schema sds-pr/1 and changed_paths");
  return v;
}
function files(repo, pr, api) {
  const out = [];
  for (let page = 1; ; page += 1) {
    const batch = api(`repos/${repo}/pulls/${pr}/files?per_page=100&page=${page}`);
    out.push(...batch.map((f) => ({ path: f.filename, from: f.previous_filename })));
    if (batch.length < 100) return out;
  }
}
// The kit's own paths always stay protected; the base pin can only add to them. Only a missing pin
// (HTTP 404) falls back to the defaults; any other read or parse failure fails closed.
function protectedPaths(ctx, api) {
  let pin;
  try { pin = api(`repos/${ctx.repo}/contents/.shirube/sds-pin.json?ref=${ctx.base}`); } // trusted base only
  catch (error) {
    need(/\(HTTP 404\)|\b404\b/.test(error.message), `protected paths: the base pin could not be read (${error.message})`);
    return DEFAULT_PROTECTED;
  }
  const extra = JSON.parse(Buffer.from(pin.content, "base64").toString("utf8")).protected_paths ?? [];
  need(Array.isArray(extra), "protected paths: the base pin's protected_paths must be a list");
  return [...DEFAULT_PROTECTED, ...extra];
}
function risk(p, pr) {
  const labels = (p.labels ?? []).map((l) => l.name).filter((n) => /^risk:R[0-4]$/.test(n));
  need(labels.length === 1, "1 risk_class: exactly one risk:R0..risk:R4 label is required");
  const label = labels[0].slice(5);
  need(pr.risk_class === label, `1 risk_class: label ${label} differs from the block's ${pr.risk_class}`);
  return label;
}
function audited(pr, ctx, api, now, verify) {
  const a = pr.audit ?? {};
  need(a.request && a.request_sha256 && a.review, "3 audit: R2+ needs audit.request, audit.request_sha256 and audit.review");
  const receipt = verify({ request: a.request, sha256: a.request_sha256, review: a.review }, api, now);
  const m = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/(?:issues|pull)\/\d+#issuecomment-(\d+)$/.exec(a.request);
  // The binding is read only from a body whose SHA-256 is the digest the checker accepted.
  const body = api(`repos/${m[1]}/issues/comments/${m[2]}`).body;
  need(createHash("sha256").update(body).digest("hex") === a.request_sha256, "3 audit: the request changed after the receipt was accepted");
  const request = JSON.parse(body.match(/^```json\r?\n([\s\S]*?)^```/m)[1]);
  const bound = request.targets.some((t) => t.repo === ctx.repo && t.pr === ctx.pr && t.head === ctx.head);
  need(receipt.verdict === "RECEIPT_ACCEPTED" && bound, "3 audit: the accepted audit does not name this PR at this head");
}
export function gate({ repo, pr: number, head }, api = github, now = Date.now(), verify = verifyAudit) {
  const p = api(`repos/${repo}/pulls/${number}`);
  need(!head || p.head.sha === head, `the PR head moved from ${head} to ${p.head.sha}; the newer run reports it`);
  const ctx = { repo, pr: Number(number), head: p.head.sha, base: p.base.sha };
  const pr = block(p.body);
  const declared = risk(p, pr);
  const actual = files(repo, ctx.pr, api);
  const paths = [...new Set(actual.flatMap((f) => (f.from ? [f.from, f.path] : [f.path])))]; // a rename declares both paths
  need(JSON.stringify([...paths].sort()) === JSON.stringify([...pr.changed_paths].sort()), "2 changed paths: the block differs from the PR diff");
  const guarded = protectedPaths(ctx, api);
  const protectedTouched = actual.some((f) => [f.path, f.from].some((x) => x && matchesAny(x, guarded))); // renames count both sides
  const effective = protectedTouched ? "R4" : declared;
  if (RISKS.indexOf(effective) >= 2) audited(pr, ctx, api, now, verify);
  return { check: "sds-gate", verdict: "PASS", head: ctx.head, risk_class: declared, effective_risk: effective, protected_touched: protectedTouched, owner_approval: "NOT_CHECKED_BY_MACHINE", authorization: "NONE" };
}
export const failure = (error, args) =>
  ({ check: "sds-gate", verdict: "FAIL", head: args.head ?? null, reason: error.message, owner_approval: "NOT_CHECKED_BY_MACHINE", authorization: "NONE" });
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  try { process.stdout.write(`${JSON.stringify(gate(args))}\n`); }
  catch (error) { process.stdout.write(`${JSON.stringify(failure(error, args))}\n`); process.exitCode = 1; }
}
