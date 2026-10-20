// sds-gate judgment 5 (design binding), the pure function: T5-01..T5-09 and T5-15 of iyasaka-arc#57 6285014153 §4.
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { designGate } from "../scripts/sds/design-gate.mjs";
import { failure, gate } from "../scripts/sds/gate.mjs";

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

// Judgment 5 in gate.mjs: T5-10..T5-14 of iyasaka-arc#57 6285014153 §4 with the answers of work order v4. Stub api as in sds-gate.test.mjs;
// the yaml reader is replaced by JSON.parse (JSON is YAML), so the plan and the handoff are JSON in yaml fences.
const REPO = "watchout/kodama", HEAD = "a".repeat(40), BASE = "b".repeat(40), SRC = "c".repeat(40);
const DESIGN_REF = `https://github.com/watchout/iyasaka-arc/blob/${SRC}/docs/design.md`;
const fence = (kind, text) => `\`\`\`${kind}\n${text}\n\`\`\`\n`;
const designFile = (b) => `# design\n\n${fence("json sds-design", JSON.stringify(b, null, 2))}`;
const DESIGN = designFile(block());
const b64 = (s) => ({ encoding: "base64", content: Buffer.from(s).toString("base64") });
const PLAN_REF = `https://github.com/${REPO}/issues/1#issuecomment-11`, HANDOFF_REF = `https://github.com/${REPO}/issues/1#issuecomment-12`;
const PLAN_BODY = fence("yaml", JSON.stringify({ schema_version: "shirube-delivery-plan/v1", plan_id: "DP-X", generation: 1, status: "ADMITTED", owner_outcome: { terminal_predicates: [{ id: "P1" }] },
  delivery_graph: { nodes: [{ id: "N1", repository: REPO, depends_on: [], lifecycle_status: "COMPLETE", changes_predicates: ["P1"] }, { id: "N2", repository: REPO, depends_on: ["N1"], lifecycle_status: "PLANNED", changes_predicates: ["P1"] },
    { id: "N3", repository: REPO, depends_on: ["N1"], lifecycle_status: "PLANNED", changes_predicates: ["P1"] }] } }));
const HANDOFF_BODY = `<!-- shirube-v3:control-handoff:X -->\n${fence("yaml", JSON.stringify({ schema_version: "shirube-v3/control_handoff/v1", cell: { id: "X" },
  plan_binding: { plan_id: "DP-X", generation: 1, node_id: "N2", changes_predicates: ["P1"], plan_comment_ref: PLAN_REF, plan_comment_sha256: sha(PLAN_BODY) }, allowed_paths: ["src/**"] }))}`;
const PLANNED = { pin: { plan_binding_mode: "report-only", design_binding_mode: "report-only" }, prBlock: {
  delivery_plan_binding: { comment_ref: PLAN_REF, comment_sha256: sha(PLAN_BODY), plan_id: "DP-X", generation: 1, node_id: "N2" }, control_handoff: { ref: HANDOFF_REF, sha256: sha(HANDOFF_BODY) } } };
const REQUEST_BODY = fence("json", JSON.stringify({ targets: [{ repo: REPO, pr: 7, head: HEAD }], plan_binding: { plan_id: "DP-X", generation: 1, node_id: "N2", changes_predicates: ["P1"] } }));
const R2 = { ...PLANNED, labels: ["risk:R2"], prBlock: { ...PLANNED.prBlock, risk_class: "R2", audit: { request: `https://github.com/${REPO}/pull/7#issuecomment-1`, request_sha256: sha(REQUEST_BODY), review: "r" } } };
const serve = (v) => { if (v instanceof Error) throw v; return v; };
// o: labels (the risk label), dbind (the PR's design_binding), design (the served bytes), designReply / approval (served instead), pin (null = no pin file), prBlock (extra block fields)
function scene(o = {}) {
  const served = o.design ?? DESIGN, pin = "pin" in o ? o.pin : { plan_binding_mode: "off", design_binding_mode: "report-only" };
  const dbind = "dbind" in o ? o.dbind : { design_ref: DESIGN_REF, design_sha256: sha(served), design_id: "aun-product-design", version: 1 };
  const prBlock = { schema: "sds-pr/1", risk_class: "R1", changed_paths: ["src/a.ts"], ...(dbind && { design_binding: dbind }), ...o.prBlock };
  return (path) => {
    if (path === `repos/${REPO}/pulls/7`) return { head: { sha: HEAD }, base: { sha: BASE }, body: fence("json sds-pr", JSON.stringify(prBlock)), labels: (o.labels ?? ["risk:R1"]).map((name) => ({ name })) };
    if (path.startsWith(`repos/${REPO}/pulls/7/files`)) return [{ filename: "src/a.ts" }];
    if (path === `repos/${REPO}/contents/.shirube/sds-pin.json?ref=${BASE}`) { if (!pin) throw new Error("gh: Not Found (HTTP 404)"); return b64(JSON.stringify(pin)); }
    if (path === `repos/watchout/iyasaka-arc/contents/docs/design.md?ref=${SRC}`) return serve(o.designReply ?? b64(served));
    if (path === "repos/watchout/iyasaka-arc/issues/comments/6285512379") return { body: serve(o.approval ?? BODY) };
    if (path === `repos/${REPO}/issues/comments/1`) return { body: REQUEST_BODY };
    if (path === `repos/${REPO}/issues/comments/11`) return { body: PLAN_BODY };
    if (path === `repos/${REPO}/issues/comments/12`) return { body: HANDOFF_BODY };
    throw new Error(`unexpected ${path}`);
  };
}
const run5 = (o, verify) => gate({ repo: REPO, pr: 7 }, scene(o), 0, verify, JSON.parse);
const blocking = { pin: { plan_binding_mode: "off", design_binding_mode: "blocking" } };
const EMPTY_ANSWER = designFile(block({ open_decisions: [{ id: "D1", question: "q", options: ["A"], default: "A", answer: "", decided_ref: REF }] }));

test("through the gate everything binds, so design_binding PASSes and copies design_id and version", () => {
  const r = run5(PLANNED);
  assert.deepEqual([r.verdict, r.design_binding?.result, r.design_binding?.design_id, r.design_binding?.version], ["PASS", "PASS", "aun-product-design", 1]);
  assert.deepEqual(r.design_binding?.findings?.map((f) => f.reason), ["5.6"]); // 5.6 N/A at R1
});
test("T5-10 no design_binding, report-only: the verdict stays PASS and design_binding FAILs 5.0", () => {
  const r = run5({ dbind: undefined });
  assert.equal(r.verdict, "PASS"); assert.equal(r.design_binding?.result, "FAIL"); assert.equal(r.design_binding?.mode, "report-only");
  assert.match(r.design_binding?.reason ?? "", /^5\.0 /);
});
test("T5-11 design_ref bytes with another SHA-256 FAIL 5.0b; the verdict stays PASS in report-only", () => {
  const r = run5({ design: `${DESIGN} `, dbind: { design_ref: DESIGN_REF, design_sha256: sha(DESIGN), design_id: "aun-product-design", version: 1 } });
  assert.equal(r.verdict, "PASS"); assert.equal(r.design_binding?.result, "FAIL"); assert.match(r.design_binding?.reason ?? "", /^5\.0b /);
});
test("T5-12 the base pin has no design_binding_mode (or no pin at all): NOT_CHECKED, and no other field", () => {
  for (const pin of [{ plan_binding_mode: "off" }, null]) {
    const r = run5({ pin });
    assert.equal(r.verdict, "PASS"); assert.deepEqual(Object.keys(r.design_binding ?? {}), ["mode", "result", "reason"]);
    assert.deepEqual([r.design_binding?.mode, r.design_binding?.result], [null, "NOT_CHECKED"]);
  }
});
test("design_binding_mode off is NOT_CHECKED with the reason; any other value FAILs the verdict (fail-closed)", () => {
  const off = run5({ pin: { plan_binding_mode: "off", design_binding_mode: "off" } });
  assert.deepEqual([off.design_binding?.mode, off.design_binding?.result], ["off", "NOT_CHECKED"]); assert.match(off.design_binding?.reason ?? "", /off/);
  assert.throws(() => run5({ pin: { plan_binding_mode: "off", design_binding_mode: "enforce" } }), /^Error: 5 design binding: design_binding_mode must be off, report-only or blocking, not enforce/);
});
test("T5-13 an empty answer: report-only keeps the verdict PASS, blocking FAILs it with `5 design binding: 5.2`", () => {
  const soft = run5({ design: EMPTY_ANSWER });
  assert.equal(soft.verdict, "PASS"); assert.equal(soft.design_binding?.result, "FAIL");
  assert.deepEqual(failed(soft.design_binding ?? { findings: [] }), ["5.2"]);
  let error;
  try { run5({ ...blocking, design: EMPTY_ANSWER }); } catch (e) { error = e; }
  assert.match(error?.message ?? "", /^5 design binding: 5\.2 /);
  const out = failure(error ?? new Error("the gate passed"), { head: HEAD });
  assert.deepEqual([out.verdict, out.design_binding?.result, out.plan_binding.mode], ["FAIL", "FAIL", "off"]);
});

// T5-14: without the design_binding field the output is byte for byte what main's gate printed before judgment 5 (captured from 77b91ef5 for these scenes).
const BEFORE = {
  off: `{"check":"sds-gate","verdict":"PASS","head":"${HEAD}","risk_class":"R1","effective_risk":"R1","protected_touched":false,"owner_approval":"NOT_CHECKED_BY_MACHINE","authorization":"NONE","plan_binding":{"mode":"off","result":"NOT_CHECKED","reason":"plan_binding_mode is off"}}`,
  fail: `{"check":"sds-gate","verdict":"FAIL","head":"${HEAD}","reason":"1 risk_class: exactly one risk:R0..risk:R4 label is required","owner_approval":"NOT_CHECKED_BY_MACHINE","authorization":"NONE","plan_binding":{"mode":null,"result":"NOT_CHECKED","reason":"an earlier judgment failed"}}`,
  blocked: `{"check":"sds-gate","verdict":"FAIL","head":"${HEAD}","reason":"4 plan binding: 4.1 x","owner_approval":"NOT_CHECKED_BY_MACHINE","authorization":"NONE","plan_binding":{"mode":"blocking","result":"FAIL","reason":"4.1 x"}}`,
};
const without = ({ design_binding: _, ...rest }) => JSON.stringify(rest);
test("T5-14 without the design_binding field the gate output is byte for byte what it was before judgment 5", () => {
  assert.equal(without(run5({ dbind: undefined })), BEFORE.off);
  assert.equal(Object.keys(run5()).at(-1), "design_binding");
  assert.equal(without(failure(new Error("1 risk_class: exactly one risk:R0..risk:R4 label is required"), { head: HEAD })), BEFORE.fail);
  const blocked = failure(Object.assign(new Error("4 plan binding: 4.1 x"), { binding: { mode: "blocking", result: "FAIL", reason: "4.1 x" } }), { head: HEAD });
  assert.equal(without(blocked), BEFORE.blocked);
  assert.equal(Object.keys(blocked).at(-1), "design_binding");
});

test("the plan reaches designGate only when judgment 4 passed", () => {
  const onN1 = designFile(block({ main_connection: { id: "MC1", statement: "s", first_node: "N1" } })); // N1 is COMPLETE, so it cannot start
  const withPlan = run5({ ...PLANNED, design: onN1 });
  assert.equal(withPlan.plan_binding.result, "PASS"); assert.deepEqual(failed(withPlan.design_binding ?? { findings: [] }), ["5.5"]);
  const off = run5({ design: onN1 }); // plan_binding_mode off: no plan
  assert.deepEqual([off.design_binding?.result, off.design_binding?.findings?.map((f) => f.reason)], ["PASS", ["5.5", "5.6"]]);
  const broken = run5({ ...PLANNED, design: onN1, prBlock: { ...PLANNED.prBlock, control_handoff: { ref: HANDOFF_REF, sha256: "0".repeat(64) } } }); // judgment 4 FAILs
  assert.equal(broken.plan_binding.result, "FAIL");
  assert.deepEqual([broken.design_binding?.result, broken.design_binding?.findings?.map((f) => f.reason)], ["PASS", ["5.5", "5.6"]]);
});

const SAME = { design_ref: DESIGN_REF, design_sha256: sha(DESIGN), design_id: "aun-product-design", version: 1 };
for (const [name, o, reason] of [
  ["5.0 a design_binding that is not a commit-pinned .md file", { dbind: { ...SAME, design_ref: "https://github.com/watchout/iyasaka-arc/blob/main/docs/design.md" } }, /^5\.0 /],
  ["5.0 a design_binding without a SHA-256", { dbind: { ...SAME, design_sha256: "x" } }, /^5\.0 /],
  ...[["design_ref", { toString: null }], ["design_ref", [DESIGN_REF]], ["design_sha256", [sha(DESIGN)]], ["design_id", ["aun-product-design"]], ["version", [1]]]
    .map(([key, wrong]) => [`5.0 a ${key} of the wrong JSON type ${JSON.stringify(wrong).slice(0, 14)} (F01)`, { dbind: { ...SAME, [key]: wrong } }, /^5\.0 /]),
  ["5.0a a design file the token cannot read", { designReply: new Error("gh: Not Found (HTTP 404)") }, /^5\.0a .*design file/],
  ["5.0a a design file that is too large to read", { designReply: { encoding: "none", content: "" } }, /^5\.0a /],
  ["5.0a an approval comment the token cannot read", { approval: new Error("gh: Not Found (HTTP 404)") }, /^5\.0a .*approval comment/],
  ["5.0c a file with no sds-design block", { design: "# design\n" }, /^5\.0c /],
  ["5.0c a file with two sds-design blocks", { design: DESIGN + DESIGN }, /^5\.0c /],
]) {
  test(`${name} FAILs design_binding, and the verdict only in blocking`, () => {
    const soft = run5(o);
    assert.equal(soft.verdict, "PASS"); assert.equal(soft.design_binding?.result, "FAIL"); assert.match(soft.design_binding?.reason ?? "", reason);
    assert.throws(() => run5({ ...o, ...blocking }), /^Error: 5 design binding: /);
  });
}
test("5.8 a PR that names another design_id or version than the block FAILs with a 5.8 finding", () => {
  for (const dbind of [{ ...SAME, version: 2 }, { ...SAME, design_id: "other" }]) {
    const r = run5({ dbind, design: DESIGN });
    assert.deepEqual([r.design_binding?.result, failed(r.design_binding ?? { findings: [] })], ["FAIL", ["5.8"]]);
  }
});
test("a broken sds-design block FAILs 5.1 and nothing else", () => {
  const r = run5({ design: `# design\n\n${fence("json sds-design", "{broken")}` });
  assert.deepEqual([r.design_binding?.result, failed(r.design_binding ?? { findings: [] })], ["FAIL", ["5.1"]]);
});

test("designGate gets the effective risk and the bound node: from R2 the bound node must be first_node or depend on it", () => {
  const first = (id) => designFile(block({ main_connection: { id: "MC1", statement: "s", first_node: id } }));
  const accepted = () => ({ verdict: "RECEIPT_ACCEPTED" });
  const at = (o, id) => run5({ ...o, design: first(id) }, accepted).design_binding;
  assert.deepEqual(failed(at(R2, "N3")), ["5.6"]); // the PR is bound to N2; N3 is not an ancestor of it
  assert.equal(at(R2, "N2").result, "PASS"); // bound to first_node itself
  assert.deepEqual([at(PLANNED, "N3").result, at(PLANNED, "N3").findings.map((f) => f.reason)], ["PASS", ["5.6"]]); // R1: 5.6 N/A
});

// F01 of the first audit, through the gate: what the gate reads from JSON (the PR's design_binding, the design block's refs, the pin) is a string or it is nothing.
const WRONG_REF = [{ toString: null }, [DESIGN_REF]];
test("F01 through the gate: an approval ref of the wrong JSON type in the design block FAILs 5.3 as a finding, not as an exception text", () => {
  for (const ref of WRONG_REF.map((x) => (Array.isArray(x) ? [REF] : x))) {
    const r = run5({ design: designFile(block({ approval: { ref, sha256: sha(BODY) } })) });
    assert.deepEqual([r.design_binding?.result, failed({ findings: r.design_binding?.findings ?? [] })], ["FAIL", ["5.3"]], JSON.stringify(ref));
    assert.doesNotMatch(r.design_binding?.reason ?? "", /primitive|TypeError/);
  }
});
test("F01 through the gate: a design_binding_mode of the wrong JSON type FAILs the verdict with a readable reason", () => {
  for (const [mode, shown] of [[{ toString: null }, '{"toString":null}'], [["blocking"], '["blocking"]'], [7, "7"]]) {
    assert.throws(() => run5({ pin: { plan_binding_mode: "off", design_binding_mode: mode } }), new RegExp(`^Error: 5 design binding: design_binding_mode must be off, report-only or blocking, not ${shown.replace(/[[\]{}.]/g, "\\$&")}$`));
  }
});
