// planAdmission (KIT-ADF E PR-3): the minimum the audit items ask for. The evidence of equivalence with ADF is tests/plan-admission-equivalence.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { planAdmission } from "../scripts/sds/plan-admission.mjs";
import { PIN_FIELDS, REASON } from "../scripts/sds/plan-admission-shape.mjs";

const { base, pin } = JSON.parse(readFileSync(new URL("./fixtures/plan-admission/cases.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../scripts/sds/plan-admission.mjs", import.meta.url), "utf8");
const freeze = (v) => { if (v && typeof v === "object") Object.values(Object.freeze(v)).forEach(freeze); return v; };
const plan = (mutate = () => {}) => { const doc = structuredClone(base); mutate(doc); return doc; };

test("a plan that is well formed and consistent passes", () => {
  assert.deepEqual(planAdmission(plan(), { actualSelfPin: pin }), { decision: "PLAN_ADMISSION", verdict: "PASS", reason: "PLAN_ADMITTED", findings: [] });
});

test("a malformed source_refs, next_action.changes_predicates or dependency is a BLOCK, not an exception (ADF throws on all)", () => {
  const refs = (value) => (d) => { d.owner_outcome.source_refs = value; };
  const malformed = [{ a: 1 }, { includes: 1 }, { includes: "x" }, { includes: {} }, { includes: [] }, { includes: null }, 5].map(refs);
  const others = [(d) => { d.next_action.changes_predicates = "P1"; }, (d) => { d.delivery_graph.nodes[0].depends_on = [{ toString: null }]; }];
  for (const mutate of [...malformed, ...others]) {
    const result = planAdmission(plan(mutate), { actualSelfPin: pin });
    assert.equal(result.verdict, "BLOCK");
    assert.ok(result.findings.length > 0);
  }
});

test("the verdict names the most decisive reason found", () => {
  const result = planAdmission(plan((d) => { d.status = "DRAFT"; d.live_baseline.freshness = "STALE"; d.generation = 0; }), { actualSelfPin: pin });
  assert.equal(result.reason, REASON.STALE_BASELINE);
  assert.ok(result.findings.some((f) => f.reason === REASON.PLAN_STATUS_NOT_ADMITTED) && result.findings.some((f) => f.reason === REASON.INVALID_DELIVERY_PLAN));
});

test("the same input gives the same output and is left untouched", () => {
  const input = freeze(plan((d) => { d.generation = 0; d.status = "DRAFT"; }));
  const first = planAdmission(input, { actualSelfPin: pin });
  assert.ok(first.findings.length > 1);
  assert.deepEqual(planAdmission(input, { actualSelfPin: pin }), first);
});

test("the pin's fields and the reasons come from the shape module, and no clock, environment, randomness or network is read (S3, S4)", () => {
  assert.doesNotMatch(source, new RegExp(`"(?:${[...PIN_FIELDS, ...Object.values(REASON)].join("|")})"`));
  assert.doesNotMatch(source, /Date\.now|new Date\(|Math\.random|randomUUID|process\.|fetch\(|globalThis/);
  for (const [, from] of source.matchAll(/from "([^"]+)"/g)) assert.match(from, /^(node:|\.\.\/hygiene\/lib\.mjs$|\.\/)/);
});

test("the comparison tool says SKIPPED, and exits 0, when no ADF checkout is given", () => {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL("./plan-admission-equivalence.mjs", import.meta.url))], { encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.equal(JSON.parse(run.stdout).verdict, "SKIPPED");
});

// PA-1 (S1-SH-03; iyasaka-arc#24 SHIRUBE-U5-20261027; docs/design/s1-gate-core.md §2.1): a plan is admitted only if an owner decision that adopts its current stage
// is among its source refs. The comment bodies are the bytes that were published (fixtures/plan-admission/owner-decisions/<id>.md); nothing is read from outside.
const AUN = "6306226221", BUDGET = "6379138360", SHIRUBE = "6305753673", GET = /^repos\/watchout\/[\w.-]+\/issues\/comments\/\d+$/;
const decision = (id) => readFileSync(new URL(`./fixtures/plan-admission/owner-decisions/${id}.md`, import.meta.url), "utf8");
const ref = (id) => `https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-${id}`;
const edit = (id, from, to) => { const body = decision(id); assert.ok(body.includes(from)); return body.replace(from, to); };
const stagePlan = ({ refs = [ref(AUN)], terminal = ["S1-EXCHANGE-LOOP", "S2-LOCAL-SEATS"], accepted = [] } = {}) => plan((d) => {
  d.plan_id = "DP-AUN-ROUTE-001";
  d.owner_outcome.terminal_predicates = terminal.map((id) => ({ id, description: "d", evidence_required: "e" }));
  d.owner_outcome.source_refs = [...refs, d.control_source.url];
  d.delivery_graph.nodes[0].changes_predicates = terminal;
  d.next_action.changes_predicates = [terminal[0]];
  d.terminal_acceptance = { satisfied_predicates: accepted };
});
function admit(doc, served = {}) { // the reader is given a path and nothing else: a GET. An unknown comment is a 404.
  const bodies = { [AUN]: decision(AUN), [BUDGET]: decision(BUDGET), [SHIRUBE]: decision(SHIRUBE), ...served }, calls = [];
  const api = (path) => { calls.push(path); const body = bodies[/(\d+)$/.exec(path)[1]]; if (body === undefined) throw new Error("gh: Not Found (HTTP 404)"); return { body }; };
  return { result: planAdmission(doc, { actualSelfPin: pin, api }), calls };
}
const blocked = (result, name) => { assert.equal(result.verdict, "BLOCK", name); assert.equal(result.reason, REASON.STAGE_ENTRY_WITHOUT_CONDITIONS, name); return result.findings; };

test("PA-1: a plan whose current stage is adopted by an owner decision among its refs is admitted, by one GET of a comment", () => {
  const { result, calls } = admit(stagePlan());
  assert.deepEqual(result, { decision: "PLAN_ADMISSION", verdict: "PASS", reason: "PLAN_ADMITTED", findings: [] });
  assert.deepEqual(calls, [`repos/watchout/iyasaka-arc/issues/comments/${AUN}`]); // the first ref adopts, so nothing else is read
});

test("PA-1: a plan without the adoption of its current stage is a BLOCK, whatever else its refs hold", () => {
  const rows = [
    ["no owner decision among the refs", stagePlan({ refs: [] }), { 1: "an ordinary comment\n" }],
    ["a real decision that adopts nothing: no stage_adoption line", stagePlan({ refs: [ref(BUDGET)] })],
    ["the adoption of another product's plan", stagePlan({ refs: [ref(SHIRUBE)] })],
    ["the adoption of another stage", stagePlan({ refs: [ref(7)] }), { 7: edit(AUN, "stage_adoption: S1 ", "stage_adoption: S2 ") }],
    ["a comment with the line but without the owner-decision marker", stagePlan({ refs: [ref(8)] }), { 8: edit(AUN, "shirube-owner-decision/v1", "shirube-v3:owner-instruction-capture") }],
  ];
  for (const [name, doc, served] of rows) {
    const { result, calls } = admit(doc, served);
    assert.ok(blocked(result, name).some((f) => f.path === "owner_outcome.source_refs"), name);
    assert.ok(calls.every((path) => GET.test(path)), name);
  }
});

test("PA-1: a comment that cannot be read counts as absent: a BLOCK that says so, never a PASS or an exception", () => {
  const fail = (message) => () => { throw new Error(message); };
  const readers = [fail("gh: Not Found (HTTP 404)"), fail("gh: Resource not accessible (HTTP 403)"), fail("spawnSync gh ETIMEDOUT"), () => null, () => ({}), () => ({ body: 5 }), "not a function"];
  for (const api of readers) {
    const findings = blocked(planAdmission(stagePlan(), { actualSelfPin: pin, api }), String(api));
    assert.ok(findings.some((f) => /could not be read/.test(f.message)), String(api));
  }
});

test("PA-1: a current stage that cannot be decided, or none left, is a BLOCK (design §3.3)", () => {
  const rows = [
    ["an acceptance ID without a stage prefix S1- to S4-", stagePlan({ terminal: ["S1-EXCHANGE-LOOP", "S5-LOCAL-SEATS"] })],
    ["an accepted ID that is not a terminal predicate", stagePlan({ accepted: ["S1-NOT-THERE"] })],
    ["every acceptance ID accepted: the plan is closed", stagePlan({ accepted: ["S1-EXCHANGE-LOOP", "S2-LOCAL-SEATS"] })],
  ];
  for (const [name, doc] of rows) assert.ok(blocked(admit(doc).result, name).some((f) => f.path === "terminal_acceptance.satisfied_predicates"), name);
});

test("PA-1 runs only when the caller passes api; without it the verdict is what it was, which keeps the comparison with ADF", () => {
  const doc = stagePlan({ refs: [] });
  assert.equal(planAdmission(doc, { actualSelfPin: pin }).verdict, "PASS");
  assert.equal(planAdmission(doc, { actualSelfPin: pin, api: undefined }).verdict, "PASS");
});

test("the recorded owner decisions are the bytes that were published (design §9.1)", () => {
  const digests = { [AUN]: "44095e3060618975ac1e4bc7fe5ea5739b19f3ca7a2d09e9189c731e01edece5", [BUDGET]: "b3678290324f793f0b6ec14a284d349e6e83ca4862d7c994f09e42f0849c3b5c", [SHIRUBE]: "8c6f8542888d5cd0302146f5d6f10bb097ab9fe12893fee533f670984a5a4893" };
  for (const [id, digest] of Object.entries(digests)) assert.equal(createHash("sha256").update(decision(id)).digest("hex"), digest, id);
});
