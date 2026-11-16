import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { planBinding } from "../scripts/sds/plan-binding.mjs";
import { assessmentInput, fullRepositoryFixture, NOW, HEAD } from "./ci-record-fixtures.mjs";
// Load the canonical module once: query-string copies corrupt V8's per-file denominator merge.
await auditCliWithoutCredentials();
const { gate, failure } = await import("../scripts/sds/gate.mjs");
const args = () => ({ repo: "watchout/example", pr: "7", head: HEAD, purpose: "ci-record-admission", checkpoint: "code-generation-submission", workspace: "example", space: "default", intent: "261105-example", unit: "u1-example", attempt: "attempt-1", now: NOW, "assessment-id": "public:assessment-1" });
const io = (input) => ({ readRecords: async () => structuredClone(input) });
test("U1-ENT01 fixed argv reaches complete four-condition JSON", async () => {
  const result = await gate(args(), io(assessmentInput())); assert.equal(result.outcome, "PASS"); assert.equal(result.authorization, "NONE");
  assert.ok(result.assessment); assert.equal(result.head, HEAD);
});
test("U1-ENT02 four negative outcomes stay exit1 results", async () => {
  for (const mutate of [(f) => { f.records.stages[0].approvals = []; }, (f) => { f.records.stages[0].review = null; }, (f) => { f.records.artifactSetDigest = "0".repeat(64); }, (f) => { f.protectedCategories.contracts.outcome = "APPLIES"; }]) {
    const input = assessmentInput(); mutate(input); assert.equal((await gate(args(), io(input))).outcome, "FAIL");
  }
});
test("U1-ENT03 complete observable input with unavailable audit is UNKNOWN", async () => {
  const f = assessmentInput(); f.protectedCategories.contracts.outcome = "APPLIES"; f.designAuditObservation = { availability: "unavailable" };
  assert.equal((await gate(args(), io(f))).outcome, "UNKNOWN");
});
test("U1-ENT04 early failure gives only safe diagnostic no invented digest or debt", async () => {
  const a = args(), read = { readRecords: async () => { throw Error("SYNTHETIC_SECRET_MARKER"); } };
  let rejected = false;
  try { await gate(a, read); } catch (error) {
    rejected = true; const d = failure(error, a);
    assert.equal(d.verdict, "FAIL"); assert.equal(d.assessment, undefined); assert.equal(d.artifactSetDigest, undefined); assert.equal(d.knownRemaining, undefined);
    assert.equal(d.knownRemainingStatus, "not-evaluated"); assert.equal(JSON.stringify(d).includes("SYNTHETIC_SECRET_MARKER"), false);
  }
  assert.equal(rejected, true);
});
test("U1-ENT05 unknown purpose checkpoint profile and duplicate argv refuse before I/O", async () => {
  let reads = 0; const read = { readRecords: async () => { reads += 1; return assessmentInput(); } };
  for (const bad of [{ purpose: "unknown" }, { checkpoint: "future" }, { profile: "arbitrary.json" }, { unit: "../elsewhere" }]) await assert.rejects(async () => gate({ ...args(), ...bad }, read));
  assert.equal(reads, 0);
  const values = Object.entries(args()).flatMap(([k, v]) => [`--${k}`, v]);
  const child = spawnSync(process.execPath, ["scripts/sds/gate.mjs", ...values, "--purpose", "ci-record-admission"], { encoding: "utf8", env: { PATH: "" } });
  assert.equal(child.status, 1); assert.equal(JSON.parse(child.stdout).reason, "UNSUPPORTED_SCHEMA");
});
test("U1-ENT06 U1 never calls old binding audit or legacy parser callbacks", async () => {
  const forbidden = () => { throw Error("legacy invoked"); };
  assert.equal((await gate(args(), io(assessmentInput()), 0, forbidden, forbidden)).outcome, "PASS");
});
test("U1-ENT07 callback identity and default failure JSON remain compatible", async () => {
  let calls = 0;
  assert.throws(() => gate({ repo: "watchout/example", pr: 7 }, () => { calls += 1; throw Error("existing callback"); }), /existing callback/); assert.equal(calls, 1);
  assert.deepEqual(failure(Error("existing failure"), { head: HEAD }), { check: "sds-gate", verdict: "FAIL", head: HEAD, reason: "existing failure", owner_approval: "NOT_CHECKED_BY_MACHINE", authorization: "NONE", plan_binding: { mode: null, result: "NOT_CHECKED", reason: "an earlier judgment failed" }, design_binding: { mode: null, result: "NOT_CHECKED", reason: "an earlier judgment failed" } });
  const original = childProcess.execFileSync;
  try {
    childProcess.execFileSync = (command, values) => {
      assert.equal(command, "gh");
      const route = values[1];
      if (route.includes("/contents/")) throw Error("HTTP 404");
      if (route.includes("/files?")) return JSON.stringify([{ filename: "docs/example.md" }]);
      return JSON.stringify({ head: { sha: HEAD }, base: { sha: "b".repeat(40) }, labels: [{ name: "risk:R1" }], body: '```json sds-pr\n{"schema":"sds-pr/1","risk_class":"R1","changed_paths":["docs/example.md"]}\n```' });
    };
    syncBuiltinESMExports(); assert.equal(gate({ repo: "watchout/example", pr: 7 }).verdict, "PASS");
  } finally { childProcess.execFileSync = original; syncBuiltinESMExports(); }
  let pages = 0;
  const capped = planBinding("blocking", { pr: { delivery_plan_binding: { plan_id: "example", node_id: "node" }, control_handoff: { ref: "https://github.com/watchout/example/issues/1#issuecomment-1", sha256: "a".repeat(64) } }, ctx: { repo: "watchout/example" } }, { controlSource: "https://github.com/watchout/example/issues/1", api: () => { pages += 1; return Array.from({ length: 100 }, () => ({ body: "synthetic" })); } });
  assert.equal(capped.result, "FAIL"); assert.match(capped.reason, /more than 3000/); assert.equal(pages, 30);
});
test("U1-ENT08 failure stops once and legitimate new evaluation reads fresh", async () => {
  let calls = 0; const input = assessmentInput(), read = { readRecords: async () => { calls += 1; return structuredClone(input); } };
  input.records.stages[0].review = null; assert.equal((await gate(args(), read)).outcome, "FAIL"); assert.equal(calls, 1);
  input.records.stages[0].review = assessmentInput().records.stages[0].review; assert.equal((await gate(args(), read)).outcome, "PASS"); assert.equal(calls, 2);
});
async function auditCliWithoutCredentials() {
  const f = fullRepositoryFixture(), prefix = "repos/watchout/example", designHead = "d".repeat(40), merge = "e".repeat(40), responses = new Map();
  const routes = [`${prefix}/pulls/7`, `${prefix}/issues/comments/1`, `${prefix}/commits/${designHead}/check-runs?per_page=100`, `${prefix}/actions/runs/3`, `${prefix}/actions/jobs/4`, `${prefix}/actions/jobs/4/logs`, `${prefix}/git/commits/${merge}`];
  for (const route of routes) { const response = await f.transport(route, { method: "GET" }); responses.set(route, route.endsWith("/logs") ? await response.text() : await response.json()); }
  const moduleUrl = new URL("../scripts/hygiene/audit-admission.mjs", import.meta.url), modulePath = fileURLToPath(moduleUrl), sha = (b) => createHash("sha256").update(b).digest("hex");
  const comment = responses.get(`${prefix}/issues/comments/1`), request = JSON.parse(comment.body.match(/```json\n([\s\S]*?)\n```/)[1]);
  request.verifier_sha256 = sha(readFileSync(modulePath)); request.expires_at = "2999-01-01T00:00:00Z"; // the real CLI reads the wall clock; keep the synthetic request unexpired
  comment.body = `\`\`\`json\n${JSON.stringify(request)}\n\`\`\`\n`;
  Object.assign(responses.get(`${prefix}/pulls/7`), { state: "open", head: { sha: designHead } });
  const path = request.item_set.path; responses.set(`${prefix}/contents/${path}?ref=${designHead}`, { type: "file", encoding: "base64", content: f.designFiles.get(path).toString("base64") });
  const previous = { exec: childProcess.execFileSync, argv: process.argv, write: process.stdout.write, exit: process.exitCode }; const outputs = [];
  try {
    childProcess.execFileSync = (command, values) => { assert.equal(command, "gh"); const value = responses.get(values[1]); assert.notEqual(value, undefined); return typeof value === "string" ? value : JSON.stringify(value); };
    syncBuiltinESMExports(); process.stdout.write = (value) => { outputs.push(value); if (outputs.length === 1) throw Error("synthetic output interruption"); return true; };
    process.argv = [process.execPath, modulePath, "--request", "https://github.com/watchout/example/pull/7#issuecomment-1", "--sha256", sha(comment.body), "--preflight"];
    await import(moduleUrl.href); assert.equal(JSON.parse(outputs[0]).verdict, "READY_FOR_REVIEW");
    assert.equal(JSON.parse(outputs[1]).verdict, "BLOCKED"); assert.equal(process.exitCode, 1);
  } finally { childProcess.execFileSync = previous.exec; syncBuiltinESMExports(); process.argv = previous.argv; process.stdout.write = previous.write; process.exitCode = previous.exit; }
}
