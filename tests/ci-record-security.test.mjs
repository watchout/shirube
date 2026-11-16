import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseRecordJson, validatePath, validateTreeEntry, validateProjection } from "../scripts/sds/ci-record-input.mjs";
import { createReader } from "../scripts/sds/ci-record-evidence.mjs";
import { encodeEnvelope } from "../scripts/sds/ci-record-envelope.mjs";
import { assessRecords } from "../scripts/sds/ci-record-admission.mjs";
import { gate } from "../scripts/sds/gate.mjs";
import { assessmentInput } from "./ci-record-fixtures.mjs";
test("U1-SEC01 escaped duplicate keys and critical policy injection denied", () => {
  assert.throws(() => parseRecordJson('{"choice":"Approve","\\u0063hoice":"Reject"}'), /DUPLICATE_RECORD/);
  const f = assessmentInput(); f.records.requiredArtifacts = []; assert.throws(() => validateProjection(f.records));
});
test("U1-SEC02 traversal symlink submodule and external fetch effects stay zero", async () => {
  for (const p of ["../a", "/a", "a\\b", "a//b"]) assert.throws(() => validatePath(p));
  for (const mode of ["120000", "160000"]) assert.throws(() => validateTreeEntry({ path: "a", mode, type: "blob" }));
  let reads = 0; const reader = createReader({ transport: async () => { reads += 1; return new Response("{}"); } });
  await assert.rejects(() => reader.bytes("https://example.invalid/private")); assert.equal(reads, 0);
});
test("U1-SEC03 secret body and human reply fields cannot cross output allowlist", () => {
  const f = assessmentInput(), assessment = assessRecords(f);
  assessment.applicableConditions.contracts.body = "SYNTHETIC_SECRET_MARKER";
  const scope = { repo: f.target.repo, pr: 7, head: f.prObservation.head, base: f.prObservation.base, target: f.target, checkpoint: "code-generation-submission", rulesetVersion: assessment.rulesetVersion, artifactSetDigest: assessment.artifactSetDigest };
  assert.throws(() => encodeEnvelope({ assessment, evaluationScope: scope, observations: f.observations }));
});
test("U1-SEC04 command markup and URLs remain inert data", () => {
  const f = assessmentInput(); f.records.extensions = { description: "$(SYNTHETIC_COMMAND) <script>SYNTHETIC_MARKUP</script> https://example.invalid" };
  assert.equal(assessRecords(f).outcome, "PASS"); assert.equal(JSON.stringify(assessRecords(f)).includes("SYNTHETIC"), false);
});
test("U1-SEC05 reader uses GET and denial triggers no stronger credential or effect", async () => {
  const seen = [], reader = createReader({ transport: async (route, options) => { seen.push({ route, method: options.method, headers: options.headers }); return new Response("denied", { status: 403 }); } });
  await assert.rejects(() => reader.json("repos/watchout/example/pulls/7")); await assert.rejects(() => reader.json("repos/watchout/example/pulls/7"));
  assert.deepEqual(seen.map((x) => x.method), ["GET"]); assert.equal(seen[0].headers, undefined);
});
test("U1-SEC06 candidate test receives no credential environment and core never reads it", () => {
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", 'import assert from "node:assert/strict"; for(const k of ["GITHUB_TOKEN","GH_TOKEN","GIT_ASKPASS"]) assert.equal(process.env[k],undefined);'], { env: { PATH: "" }, encoding: "utf8" });
  assert.equal(child.status, 0);
  const source = readFileSync("scripts/sds/ci-record-admission.mjs", "utf8"); assert.equal(/process\.env|Date\.now|new Date\(\)|Math\.random|randomUUID|execFile|readFile/.test(source), false);
});
test("U1-SEC07 exceeded budget is terminal with zero automatic retry", async () => {
  let calls = 0; const reader = createReader({ transport: async () => { calls += 1; throw Error("SYNTHETIC_PRIVATE_REASON"); } });
  await assert.rejects(() => reader.json("repos/watchout/example/pulls/7"), /INPUT_UNOBSERVABLE/);
  await assert.rejects(() => reader.json("repos/watchout/example/pulls/7"), /INPUT_UNOBSERVABLE/); assert.equal(calls, 1);
});
test("U1-SEC08 PASS cannot grant authority unknown caller or PR self-exclusion", async () => {
  const f = assessmentInput(); assert.equal(assessRecords(f).authorization, "NONE");
  f.records.extensions = { requiredArtifacts: "[]" }; assert.throws(() => validateProjection(f.records));
  let calls = 0; await assert.rejects(async () => gate({ purpose: "unknown", checkpoint: "code-generation-submission" }, { readRecords: async () => { calls += 1; } })); assert.equal(calls, 0);
});
