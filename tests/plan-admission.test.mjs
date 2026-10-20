// planAdmission (KIT-ADF E PR-3): the minimum the audit items ask for. The evidence of equivalence with ADF is tests/plan-admission-equivalence.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
