// sds-gate (docs/sds/distribution.md §4): the single required check of the SDS-V2 kit. Four judgments only:
//   1 risk_class: exactly one `risk:R0`..`risk:R4` label, equal to the PR block; a protected path makes it R4
//   2 changed paths: the PR block lists exactly the files in the diff
//   3 R2 and above: the pinned audit-admission checker accepts the audit at the current head
//   4 plan binding (plan-binding.mjs), after 1-3: its stage is the base pin's plan_binding_mode (default report-only)
//   5 design binding (design-gate.mjs), after 1-4: its stage is the base pin's design_binding_mode (absent = NOT_CHECKED)
// Read-only. Run from a pinned shirube commit, never from the PR head. It does not check Owner approval (§7).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { matchesAny, parseArgs } from "../hygiene/lib.mjs";
import { verifyAudit } from "../hygiene/audit-admission.mjs";
import { planBinding, planBlock, comment } from "./plan-binding.mjs";
import { refOf, hex, show, designGate, failed } from "./design-gate.mjs";
import { parseYaml } from "./yaml.mjs";

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
    return { guarded: DEFAULT_PROTECTED, mode: "report-only" };
  }
  const read = JSON.parse(Buffer.from(pin.content, "base64").toString("utf8")), extra = read.protected_paths ?? [];
  need(Array.isArray(extra), "protected paths: the base pin's protected_paths must be a list");
  const source = read.delivery_plan?.control_source; // the issue holding this repo's plan (judgment 4, new form)
  return { guarded: [...DEFAULT_PROTECTED, ...extra], mode: read.plan_binding_mode === undefined ? "report-only" : read.plan_binding_mode, design_binding_mode: read.design_binding_mode, controlSource: typeof source === "string" ? source : undefined }; // only a missing field defaults
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
  return request; // judgment 4 reads its plan_binding
}
// Judgment 5 (iyasaka-arc#57 6285014153 §1.2): read the design the PR names and the approval it points to, then ask designGate. Read-only; what cannot be read is a FAIL (S8).
const DESIGN_REF = /^https:\/\/github\.com\/(watchout\/[\w.-]+)\/blob\/([0-9a-f]{40})\/(.+\.md)$/;
function read(what, fn) { try { return fn(); } catch (error) { throw new Error(`5.0a could not read ${what}: ${error.message}`); } }
const named = (d) => (typeof d?.design_ref === "string" && hex(d.design_sha256) && typeof d.design_id === "string" && Number.isInteger(d.version) ? DESIGN_REF.exec(d.design_ref) : null); // the parts of design_ref, when every field has its type
function designBlock(d, api) { // 5.0 to 5.0c: the one sds-design block of the file at the commit the PR names; a broken one is left to designGate (5.1)
  const m = named(d);
  need(m, "5.0 design_binding needs design_ref (a commit-pinned .md file), design_sha256, design_id and version");
  const file = read("the design file", () => api(`repos/${m[1]}/contents/${m[3].split("/").map(encodeURIComponent).join("/")}?ref=${m[2]}`));
  need(file?.encoding === "base64" && typeof file.content === "string", "5.0a the design file has no readable content");
  const bytes = Buffer.from(file.content, "base64");
  need(createHash("sha256").update(bytes).digest("hex") === d.design_sha256, `5.0b the design file does not have SHA-256 ${d.design_sha256}`);
  const found = [...bytes.toString("utf8").matchAll(/^```json sds-design\r?\n([\s\S]*?)^```\s*$/gm)];
  need(found.length === 1, `5.0c the design file needs exactly one json sds-design block, not ${found.length}`);
  try { return JSON.parse(found[0][1]); } catch { return found[0][1]; }
}
function approvalOf(block, api) { // null when approval.ref has no valid shape (designGate reports 5.3), and for a unit design, whose approval the gate does not read (5.3u)
  const m = block?.approval?.kind === "unit_design" ? null : refOf(block?.approval?.ref);
  return m ? read("the approval comment", () => api(`repos/${m[1]}/issues/comments/${m[2]}`).body) : null;
}
function planOf(binding, b, { api, parse }) { // judgment 4's plan, read again only when judgment 4 passed, with judgment 4's own reader (S3)
  const ref = binding.comment_ref ?? b?.comment_ref, digest = binding.comment_sha256 ?? b?.comment_sha256; // the new form has the gate's own resolved comment
  return binding.result === "PASS" ? read("the plan comment", () => { const p = planBlock(comment(ref, digest, "5", api), binding.plan_id, binding.generation, parse); need(p, "the plan block judgment 4 chose is not in the comment"); return p; }) : null;
}
function judged(d, block, input) { // designGate, and 5.8: the PR names the design_id and version the block has
  const { findings } = designGate(block, input), differs = findings[0]?.reason !== "5.1" && (block.design_id !== d.design_id || block.version !== d.version);
  return differs ? [...findings, { reason: "5.8", message: `5.8 the PR names ${d.design_id}@${d.version}, the block is ${block.design_id}@${block.version}` }] : findings;
}
function outcome(mode, d, findings) {
  const bad = failed(findings), unit = findings.find((f) => f.reason === "5.3u"); // a unit design's approval is not checked, so it is never PASS
  return { mode, result: bad.length > 0 ? "FAIL" : unit ? "NOT_CHECKED" : "PASS", design_id: d.design_id, version: d.version, ...(Number.isInteger(d.design_pr) && { design_pr: d.design_pr }),
    ...(bad.length > 0 ? { reason: bad[0].message } : unit && { reason: `${unit.message}; the other checks (5.9 included) did not fail` }), findings };
}
function designBinding(mode, { pr, effective, binding, paths }, io) {
  if (mode === undefined || mode === "off") return { mode: mode ?? null, result: "NOT_CHECKED", reason: mode === "off" ? "design_binding_mode is off" : "the base pin has no design_binding_mode" };
  try {
    need(["report-only", "blocking"].includes(mode), `design_binding_mode must be off, report-only or blocking, not ${show(mode)}`);
    need(pr.design_binding, "5.0 no design_binding");
    const d = pr.design_binding, block = designBlock(d, io.api), b = pr.delivery_plan_binding;
    return outcome(mode, d, judged(d, block, { approvalBody: approvalOf(block, io.api), plan: planOf(binding, b, io), boundNodeId: b?.node_id, riskIndex: RISKS.indexOf(effective), changedPaths: paths, matches: matchesAny, designPr: d.design_pr })); // 5.9: judgment 2's paths and the protected_paths matcher
  } catch (error) { return { mode, result: "FAIL", reason: error.message }; }
}
function judgment5(mode, input, io) { // like judgment 4: a FAIL stops the gate unless the stage is report-only
  const design = designBinding(mode, input, io);
  if (design.result === "FAIL" && design.mode !== "report-only") throw Object.assign(new Error(`5 design binding: ${design.reason}`), { binding: input.binding, design_binding: design });
  return design;
}
export function gate({ repo, pr: number, head }, api = github, now = Date.now(), verify = verifyAudit, parse = parseYaml) {
  const p = api(`repos/${repo}/pulls/${number}`);
  need(!head || p.head.sha === head, `the PR head moved from ${head} to ${p.head.sha}; the newer run reports it`);
  const ctx = { repo, pr: Number(number), head: p.head.sha, base: p.base.sha };
  const pr = block(p.body);
  const declared = risk(p, pr);
  const actual = files(repo, ctx.pr, api);
  const paths = [...new Set(actual.flatMap((f) => (f.from ? [f.from, f.path] : [f.path])))]; // a rename declares both paths
  need(JSON.stringify([...paths].sort()) === JSON.stringify([...pr.changed_paths].sort()), "2 changed paths: the block differs from the PR diff");
  const { guarded, mode, design_binding_mode, controlSource } = protectedPaths(ctx, api);
  const protectedTouched = actual.some((f) => [f.path, f.from].some((x) => x && matchesAny(x, guarded))); // renames count both sides
  const effective = protectedTouched ? "R4" : declared;
  const request = RISKS.indexOf(effective) >= 2 ? audited(pr, ctx, api, now, verify) : null;
  const binding = planBinding(mode, { pr, ctx, paths, request }, { api, parse, controlSource, block });
  if (binding.result === "FAIL" && mode !== "report-only") throw Object.assign(new Error(`4 plan binding: ${binding.reason}`), { binding });
  const design = judgment5(design_binding_mode, { pr, effective, binding, paths }, { api, parse });
  return { check: "sds-gate", verdict: "PASS", head: ctx.head, risk_class: declared, effective_risk: effective, protected_touched: protectedTouched, owner_approval: "NOT_CHECKED_BY_MACHINE", authorization: "NONE", plan_binding: binding, design_binding: design };
}
export const failure = (error, args) =>
  ({ check: "sds-gate", verdict: "FAIL", head: args.head ?? null, reason: error.message, owner_approval: "NOT_CHECKED_BY_MACHINE", authorization: "NONE", plan_binding: error.binding ?? { mode: null, result: "NOT_CHECKED", reason: "an earlier judgment failed" }, design_binding: error.design_binding ?? { mode: null, result: "NOT_CHECKED", reason: "an earlier judgment failed" } });
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  try { process.stdout.write(`${JSON.stringify(gate(args))}\n`); }
  catch (error) { process.stdout.write(`${JSON.stringify(failure(error, args))}\n`); process.exitCode = 1; }
}
