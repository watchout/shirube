import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fullRepositoryFixture } from "./ci-record-fixtures.mjs";
import { createReader, collectAdmissionInput } from "../scripts/sds/ci-record-evidence.mjs";
import { gate, failure } from "../scripts/sds/gate.mjs";
import { decodeEnvelope } from "../scripts/sds/ci-record-envelope.mjs";
async function run(f) { return gate(f.args, { readRecords: () => collectAdmissionInput(f.args, { reader: createReader({ transport: f.transport, clock: () => 0 }) }) }); }
function cliScenario(mutation = "") {
  const helper = new URL("./ci-record-fixtures.mjs", import.meta.url).href;
  const preload = `import {fullRepositoryFixture} from ${JSON.stringify(helper)}; const f=fullRepositoryFixture(); ${mutation} globalThis.fetch=(url,options)=>f.transport(url.slice("https://api.github.com/".length),options);`;
  const args = Object.entries(fullRepositoryFixture().args).flatMap(([k, v]) => [`--${k}`, v]);
  return spawnSync(process.execPath, ["--import", `data:text/javascript,${encodeURIComponent(preload)}`, "scripts/sds/gate.mjs", ...args], { encoding: "utf8", env: { PATH: "" } });
}
test("U1-INT01 actual modules reader through core envelope and CLI PASS", async () => {
  const f = fullRepositoryFixture(), output = await run(f); assert.equal(output.outcome, "PASS"); assert.equal(output.assessment.knownRemaining.length > 0, true);
  const observed = await collectAdmissionInput(f.args, { reader: createReader({ transport: f.transport, clock: () => 0 }) });
  const text = Object.entries(observed.designAuditObservation.evidenceFiles).find(([p]) => p.endsWith("functional-design/entities.md"))[1]; assert.equal(text.charCodeAt(0), 0xfeff);
  const child = cliScenario(); assert.equal(child.status, 0, child.stdout + child.stderr); assert.equal(JSON.parse(child.stdout).outcome, "PASS");
});
test("U1-INT02 required approval missing reaches real entry exit1", async () => {
  const child = cliScenario('f.updateRecord(r=>{r.stages.find(s=>s.stage==="code-generation").approvals=[];});');
  assert.equal(child.status, 1); assert.equal(JSON.parse(child.stdout).assessment.conditions.records.outcome, "FAIL");
  const weak = fullRepositoryFixture(), summary = [...weak.files.keys()].find((p) => p.endsWith("code-generation/code-summary.md"));
  weak.files.set(summary, Buffer.from(weak.files.get(summary).toString().replace("| code-generation | attempt-1 | false | false | true | false |", "| code-generation | attempt-1 | false | false | false | false |")));
  weak.updateRecord((r) => { r.stages.find((s) => s.stage === "code-generation").approvals = []; }); weak.refreshRecordArtifacts();
  await assert.rejects(() => run(weak), /INPUT_UNOBSERVABLE/);
});
test("U1-INT03 required READY missing reaches real entry exit1", () => {
  const child = cliScenario('f.updateRecord(r=>{r.stages.find(s=>s.stage==="functional-design").review=null;});');
  assert.equal(child.status, 1); assert.equal(JSON.parse(child.stdout).assessment.conditions.ready.outcome, "FAIL");
});
test("U1-INT04 same-size observed-byte mutation fails digest through entry", async () => {
  const f = fullRepositoryFixture(), path = [...f.files.keys()].find((p) => p.endsWith("functional-design/entities.md")), changed = Buffer.from("\ufeffsynthetic desigN"); assert.equal(changed.length, f.files.get(path).length); f.files.set(path, changed);
  const result = await run(f); assert.equal(result.outcome, "FAIL"); assert.equal(result.assessment.conditions.digests.outcome, "FAIL");
});
test("U1-INT05 missing design audit remains closed through CLI exit1", () => {
  const child = cliScenario('f.updateRecord(r=>{delete r.designAudit;});');
  assert.equal(child.status, 1); const result = JSON.parse(child.stdout); assert.equal(result.outcome === "FAIL" || result.verdict === "FAIL", true);
});
test("U1-INT06 interrupted observation and final head movement yield diagnostics", async () => {
  const f = fullRepositoryFixture(); f.mutate = (value, route) => route.endsWith("/pulls/7") && f.calls.filter((p) => p.endsWith("/pulls/7")).length > 2 ? { ...value, head: { sha: "f".repeat(40) } } : value;
  await assert.rejects(() => run(f));
  const broken = fullRepositoryFixture(); broken.transport = async () => { throw Error("SYNTHETIC_SECRET"); };
  try { await run(broken); assert.fail("must stop"); } catch (error) { const result = failure(error, broken.args); assert.equal(result.assessment, undefined); assert.equal(JSON.stringify(result).includes("SYNTHETIC_SECRET"), false); }
});
test("U1-INT07 historical mandatory workflow failure cannot be bypassed", async () => {
  const f = fullRepositoryFixture(); f.mutate = (v, r) => r.endsWith("/actions/runs/3") ? { ...v, conclusion: "failure" } : v;
  const result = await run(f); assert.equal(result.assessment.conditions.designAudit.outcome, "FAIL");
  // Workflow deployment is a separately authorized real acceptance; this checks the source boundary.
  const entry = readFileSync("scripts/sds/gate.mjs", "utf8"); assert.equal(entry.includes("recordGate(args, legacy[0])"), true);
  const moved = await movedBaseFixture(); assert.equal((await run(moved)).assessment.conditions.designAudit.outcome, "PASS");
});
async function movedBaseFixture() {
  const f = fullRepositoryFixture(), prefix = "repos/watchout/example", base = "b".repeat(40), current = "c".repeat(40), design = "d".repeat(40), hash = (s) => createHash("sha256").update(s).digest("hex");
  const comments = {};
  for (const id of [1, 2]) comments[id] = await (await f.transport(`${prefix}/issues/comments/${id}`, { method: "GET" })).json();
  const read = (body) => JSON.parse(body.match(/```json\n([\s\S]*?)\n```/)[1]), body = (v) => `\`\`\`json\n${JSON.stringify(v)}\n\`\`\`\n`;
  const request = read(comments[1].body); request.targets[0].base_moved = { ref: "main" }; comments[1].body = body(request);
  const review = read(comments[2].body); review.request_digest = hash(comments[1].body); comments[2].body = body(review);
  f.updateRecord((r) => { r.designAudit.requestBodySha256 = hash(comments[1].body); r.designAudit.reviewBodySha256 = hash(comments[2].body); });
  const original = f.transport;
  f.transport = async (route, options) => {
    if (route === `${prefix}/compare/${base}...${current}`) return new Response(JSON.stringify({ status: "ahead", files: [{ filename: "docs/unrelated.md" }] }));
    if (route === `${prefix}/compare/${base}...${design}`) return new Response(JSON.stringify({ status: "ahead", files: [{ filename: [...f.designFiles.keys()][0] }] }));
    for (const id of [1, 2]) if (route === `${prefix}/issues/comments/${id}`) return new Response(JSON.stringify(comments[id]));
    const response = await original(route, options);
    if (route.endsWith("/pulls/7")) return new Response(JSON.stringify({ ...await response.json(), base: { sha: current, ref: "main" } }));
    return response;
  };
  return f;
}
test("U1-INT08 transported C01 C03 C05 C07 preserve source debt and assurance", async () => {
  const output = await run(fullRepositoryFixture());
  for (const boundary of ["C01", "C03", "C05", "C07"]) { const carried = { boundary, source: decodeEnvelope(JSON.stringify(output), output), destination: "public:other-consumer" }; assert.deepEqual(carried.source.assessment.knownRemaining, output.assessment.knownRemaining); assert.equal(carried.source.assessment.authorization, "NONE"); }
});
