// sds-gate judgment 5 (design binding), the pure function: T5-01..T5-09 and T5-15 of iyasaka-arc#57 6285014153 §4.
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { designGate } from "../scripts/sds/design-gate.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const REF = "https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6285512379";
const BODY = "<!-- shirube-owner-decision/v1:OD-X -->\naun-product-design@1 を承認する\n";
const freeze = (v) => (v && typeof v === "object" ? Object.freeze(Object.values(v).forEach(freeze) ?? v) : v);
const block = (over = {}) => freeze({
  schema: "sds-design/1", design_id: "aun-product-design", version: 1,
  open_decisions: [{ id: "D1", question: "q", options: ["A", "X"], default: "A", answer: "A", decided_ref: REF }],
  approval: { ref: REF, sha256: sha(BODY) }, main_connection: { id: "MC1", statement: "s", first_node: "N2" }, ...over,
});
const node = (id, lifecycle_status, depends_on) => ({ id, lifecycle_status, depends_on });
const plan = (...nodes) => freeze({ delivery_graph: { nodes } });
const PLAN = plan(node("N1", "COMPLETE", []), node("N2", "PLANNED", ["N1"]), node("N3", "PLANNED", ["N2"]), node("N4", "PLANNED", ["N1"]), node("N5", "PLANNED", ["N3"]));
const input = (over = {}) => ({ approvalBody: BODY, plan: PLAN, boundNodeId: "N2", riskIndex: 2, ...over });
const failed = (r) => r.findings.filter((f) => !/^5\.\d (N\/A|NOT_CHECKED)/.test(f.message)).map((f) => f.reason);
const answered = (body, over = {}) => [block({ approval: { ref: REF, sha256: sha(body) }, ...over }), input({ approvalBody: body })];

test("T5-01 everything binds: PASS and no findings", () => {
  assert.deepEqual(designGate(block(), input()), { verdict: "PASS", findings: [] });
});

for (const [name, answer, decided_ref] of [["empty", "", REF], ["blank", "  \n", REF], ["not a string", 1, REF], ["no decided_ref", "A", ""],
  ["decided_ref of another shape", "A", "https://github.com/watchout/iyasaka-arc/pull/49#issuecomment-1"]]) {
  test(`T5-02 an open decision with ${name} FAILs 5.2 and names its id`, () => {
    const r = designGate(block({ open_decisions: [{ id: "D0", answer: "A", decided_ref: REF }, { id: "D1", answer, decided_ref }] }), input());
    assert.equal(r.verdict, "FAIL");
    assert.deepEqual(r.findings.map((f) => [f.reason, f.id]), [["5.2", "D1"]]);
  });
}

test("T5-03 approval body with another SHA-256 FAILs 5.3 (the declared value is not trusted); a malformed ref or digest FAILs too", () => {
  for (const [b, i] of [[block({ approval: { ref: REF, sha256: sha("other") } }), input()], [block(), input({ approvalBody: `${BODY} ` })],
    [block({ approval: { ref: "https://example.com/x", sha256: sha(BODY) } }), input()], [block({ approval: { ref: REF, sha256: "AB" } }), input()],
    [block(), input({ approvalBody: null })]]) assert.deepEqual(failed(designGate(b, i)), ["5.3"]);
});

test("T5-04 the body needs the marker and design_id@version as a whole token", () => {
  for (const body of ["<!-- shirube-owner-decision/v1:OD-X -->\nno binding here\n", "aun-product-design@1\n",
    "<!-- shirube-owner-decision/v1:OD-X -->\naun-product-design@12\n", "<!-- shirube-owner-decision/v1:OD-X -->\nmy-aun-product-design@1\n"]) {
    assert.deepEqual(failed(designGate(...answered(body))), ["5.4"], body);
  }
  assert.equal(designGate(...answered("<!-- shirube-owner-decision/v1:OD-X -->\n(aun-product-design@1)\n")).verdict, "PASS");
});

test("T5-05 first_node must exist, be unfinished and have every depends_on COMPLETE", () => {
  const cases = [plan(node("N1", "PLANNED", []), node("N2", "PLANNED", ["N1"])), plan(node("N1", "COMPLETE", []), node("N2", "COMPLETE", ["N1"])),
    plan(node("N1", "COMPLETE", [])), plan(node("N2", "PLANNED", ["N9"])), plan({ id: "N2", lifecycle_status: "PLANNED" }), freeze({}), freeze({ delivery_graph: { nodes: "x" } }), undefined];
  for (const p of cases) assert.deepEqual(failed(designGate(block(), input({ plan: p }))), ["5.5"]);
});

test("T5-06 at R2 or above the bound node is first_node or has it as a transitive dependency; otherwise FAIL 5.6", () => {
  for (const boundNodeId of ["N4", "N9", undefined]) assert.deepEqual(failed(designGate(block(), input({ boundNodeId }))), ["5.6"]);
  for (const boundNodeId of ["N3", "N5"]) assert.equal(designGate(block(), input({ boundNodeId })).verdict, "PASS"); // N5 reaches N2 through N3
  const loop = plan(node("N1", "COMPLETE", []), node("N2", "PLANNED", ["N1"]), node("A", "PLANNED", ["B"]), node("B", "PLANNED", ["A"]));
  assert.deepEqual(failed(designGate(block(), input({ plan: loop, boundNodeId: "A" }))), ["5.6"]);
  for (const riskIndex of [-1, 5, 2.5, "2", undefined]) assert.deepEqual(failed(designGate(block(), input({ riskIndex }))), ["5.6"]);
});

test("T5-07 below R2 the same plan passes and the findings say 5.6 N/A", () => {
  const r = designGate(block(), input({ boundNodeId: "N4", riskIndex: 1 }));
  assert.equal(r.verdict, "PASS");
  assert.deepEqual(r.findings.map((f) => f.reason), ["5.6"]);
  assert.match(r.findings[0].message, /^5\.6 N\/A/);
});

test("T5-08 without a plan 5.5 and 5.6 are NOT_CHECKED and the verdict comes from 5.1-5.4 alone", () => {
  const r = designGate(block(), input({ plan: null }));
  assert.equal(r.verdict, "PASS");
  assert.deepEqual(r.findings.map((f) => f.reason), ["5.5", "5.6"]);
  assert.ok(r.findings.every((f) => /^5\.\d NOT_CHECKED/.test(f.message)));
  const bad = designGate(block({ open_decisions: [{ id: "D1", answer: "", decided_ref: REF }] }), input({ plan: null }));
  assert.equal(bad.verdict, "FAIL");
  assert.deepEqual(failed(bad), ["5.2"]);
});

test("T5-09 a wrong schema or a broken block FAILs 5.1 and never throws", () => {
  const broken = [null, undefined, 42, "{broken", [], {}, block({ schema: "sds-design/2" }), block({ design_id: "" }), block({ version: "1" }), block({ version: 1.5 }),
    block({ open_decisions: null }), block({ approval: null }), block({ main_connection: null }), block({ main_connection: { id: "MC1" } })];
  for (const b of broken) {
    let r;
    assert.doesNotThrow(() => { r = designGate(b, input()); });
    assert.deepEqual([r.verdict, r.findings.map((f) => f.reason)], ["FAIL", ["5.1"]]);
  }
  for (const i of [undefined, null, {}, { plan: 5, boundNodeId: {}, riskIndex: NaN }]) assert.doesNotThrow(() => designGate(block(), i));
});

// F01 of the first audit (iyasaka-ai, PR #51): a reference or a digest is a string or it is nothing. JSON also says objects and arrays; those must FAIL
// with a finding, never throw (S1-1 §1.1) and never pass through an implicit string conversion.
const WRONG = (original) => [null, true, 7.5, "", [], {}, { toString: null }, [original]].filter((x) => !(Array.isArray(x) && x.length === 0 && Array.isArray(original)));
const place = (path) => { const doc = JSON.parse(JSON.stringify(block())); return [doc, path.slice(0, -1).reduce((x, k) => x[k], doc), path.at(-1)]; };
const CRITICAL = [["schema"], ["design_id"], ["version"], ["open_decisions"], ["approval"], ["approval", "ref"], ["approval", "sha256"], ["main_connection"], ["main_connection", "first_node"],
  ["open_decisions", 0, "answer"], ["open_decisions", 0, "decided_ref"]];
const MINOR = [["open_decisions", 0, "id"], ["open_decisions", 0, "question"], ["open_decisions", 0, "options"], ["open_decisions", 0, "default"], ["main_connection", "id"], ["main_connection", "statement"]];
test("F01 a field of the wrong JSON type FAILs with a finding: no exception and no PASS through a string conversion", () => {
  for (const path of CRITICAL) {
    const [, holder, key] = place(path);
    for (const wrong of WRONG(holder[key])) {
      const [doc, at, k] = place(path); at[k] = wrong;
      let r; assert.doesNotThrow(() => { r = designGate(doc, input()); }, `${path.join(".")} = ${JSON.stringify(wrong)}`);
      assert.deepEqual([r?.verdict, r?.findings.length > 0], ["FAIL", true], `${path.join(".")} = ${JSON.stringify(wrong)}`);
    }
  }
});
test("F01 a field that no judgment reads may have any JSON type, and an unreadable decision id is still named", () => {
  for (const path of MINOR) for (const wrong of [null, 7.5, [], {}, { toString: null }]) {
    const [doc, at, k] = place(path); at[k] = wrong;
    assert.doesNotThrow(() => designGate(doc, input()), `${path.join(".")} = ${JSON.stringify(wrong)}`);
  }
  const [doc, at] = place(["open_decisions", 0, "id"]); at.id = { toString: null }; at.answer = "";
  assert.doesNotThrow(() => designGate(doc, input()));
  assert.equal(designGate(doc, input()).findings[0].reason, "5.2");
});
test("F01 inputs of the wrong JSON type FAIL or are NOT_CHECKED and never throw", () => {
  const odd = [undefined, null, 5, "x", [], {}, { toString: null }];
  for (const approvalBody of [...odd, [BODY]].filter((x) => x !== "x")) assert.deepEqual(failed(designGate(block(), input({ approvalBody }))), ["5.3"], JSON.stringify(approvalBody)); // a string is read as a body (T5-03, T5-04)
  for (const boundNodeId of [...odd, ["N2"]]) assert.deepEqual(failed(designGate(block(), input({ boundNodeId }))), ["5.6"], JSON.stringify(boundNodeId));
  const sick = { id: { toString: null }, depends_on: [{ toString: null }, null], lifecycle_status: { toString: null } };
  for (const p of [5, "x", [], { delivery_graph: 5 }, { delivery_graph: { nodes: {} } }, plan(null, 5, "x", [], sick), plan(sick, node("N2", "PLANNED", [null, {}]))]) {
    assert.doesNotThrow(() => designGate(block(), input({ plan: p })), JSON.stringify(p));
    assert.deepEqual(failed(designGate(block(), input({ plan: p }))), ["5.5"], JSON.stringify(p));
  }
});

test("T5-15 the same input gives the same output, and the inputs are not changed", () => {
  const cases = [[block(), input()], [block({ schema: "x" }), input()], [block({ open_decisions: [{ id: "D1" }] }), input({ plan: null })], [block(), input({ boundNodeId: "N4" })]];
  for (const [b, i] of cases) assert.equal(JSON.stringify(designGate(b, i)), JSON.stringify(designGate(b, i)));
});

test("designGate reads no clock, random source, environment or network: its only import is node:crypto", () => {
  const source = readFileSync(new URL("../scripts/sds/design-gate.mjs", import.meta.url), "utf8");
  assert.deepEqual([...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1]), ["node:crypto"]);
  assert.doesNotMatch(source, /\bDate\b|Math\.random|randomUUID|randomBytes|process\.|fetch\(|import\(|setTimeout|performance/);
});
