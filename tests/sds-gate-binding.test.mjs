// Judgment 4 of sds-gate for a delivery_plan_binding of {plan_id, node_id} (iyasaka-arc#57 6306257668 §3.1-3.3, 3.5, 3.7; CH-SHIRUBE-GATE4-A-20261021):
// T4-33 and later. The gate reads the plan from the pin's delivery_plan.control_source, so these tests serve an issue's comments, the handoff
// and the closed PRs through a stub API. T4-01..T4-32 (old form) stay in sds-gate.test.mjs, unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { failure, gate } from "../scripts/sds/gate.mjs";
import { currentStage } from "../scripts/sds/stage.mjs";

const REPO = "watchout/aun", SOURCE = "https://github.com/watchout/aun/issues/3", head = "a".repeat(40), base = "b".repeat(40);
const PLAN_ID = "DP-AUN-ROUTE-001", MARK = "<!-- shirube-v3:control-handoff:X -->";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const fence = (kind, text) => `\`\`\`${kind}\n${text}\n\`\`\`\n`;
const refOf = (id) => `${SOURCE}#issuecomment-${id}`;
const accepted = () => ({ verdict: "RECEIPT_ACCEPTED" });

// o: plan_id / status / generation / terminal / satisfied / n0 (the status of the node N1 depends on) / n1 (its predicates) / onlyN0 (no node N1)
function planBody(o = {}) {
  const terminal = (o.terminal ?? ["S1-A", "S1-B", "S2-C"]).map((id) => `{id: ${id}}`).join(", ");
  return fence("yaml", ["schema_version: shirube-delivery-plan/v1", `plan_id: ${o.plan_id ?? PLAN_ID}`, `generation: ${o.generation ?? 2}`, `status: ${o.status ?? "ADMITTED"}`,
    `owner_outcome: {terminal_predicates: [${terminal}]}`, ...(o.satisfied ? [`terminal_acceptance: {satisfied_predicates: [${o.satisfied}]}`] : []),
    `delivery_graph: {nodes: [{id: N0, repository: ${REPO}, depends_on: [], lifecycle_status: ${o.n0 ?? "COMPLETE"}, changes_predicates: [S1-A]}${o.onlyN0 ? "" : ","}`,
    ...(o.onlyN0 ? [] : [`  {id: N1, repository: ${REPO}, depends_on: [N0], lifecycle_status: PLANNED, changes_predicates: ${o.n1 ?? "[S1-A, S1-B]"}}`]), "]}"].join("\n"));
}
// pb: the plan the handoff was written against (an older generation than the resolved one is normal), and changes (its changes_predicates)
const HANDOFF = (extra = "", pb = {}) => `${MARK}\n${fence("yaml", ["schema_version: shirube-v3/control_handoff/v1", "cell: {id: X}",
  `plan_binding: {plan_id: ${PLAN_ID}, generation: ${pb.generation ?? 1}, node_id: N1, changes_predicates: [${pb.changes ?? "S1-A"}], plan_comment_ref: "${pb.ref ?? refOf(1)}", plan_comment_sha256: "${pb.digest ?? "0".repeat(64)}"}`,
  "allowed_paths: [src/**]", ...(extra ? [extra] : [])].join("\n"))}`;
const HANDOFF_BODY = HANDOFF();

// o: comments (the control_source issue's comments, [id, body]), pin, listError, binding (the PR's delivery_plan_binding), closed ([PR]), closedError, mode
function scene(o = {}) {
  const comments = (o.comments ?? [[1, planBody({ generation: 1 })], [2, planBody({ generation: 2 })], [3, planBody({ generation: 3, status: "DRAFT" })], [4, "just a note"],
    [5, planBody({ plan_id: "DP-OTHER-001", generation: 9 })]]).map(([id, body]) => ({ id, body }));
  const handoff = o.handoff ?? HANDOFF_BODY;
  const block = { schema: "sds-pr/1", risk_class: "R1", changed_paths: ["src/a.ts"], delivery_plan_binding: { plan_id: PLAN_ID, node_id: "N1", ...o.binding },
    control_handoff: { ref: refOf(12), sha256: sha(handoff) }, ...o.block };
  const pin = "pin" in o ? o.pin : JSON.stringify({ plan_binding_mode: o.mode ?? "report-only", delivery_plan: { control_source: SOURCE } });
  const calls = [];
  const closed = (o.closed ?? []).map((pr) => ({ merged_at: "2026-10-21T00:00:00Z", base: { ref: "main" }, ...pr }));
  const api = (path) => {
    calls.push(path);
    if (path === `repos/${REPO}/pulls/7`) return { head: { sha: head }, base: { sha: base }, body: `\`\`\`json sds-pr\n${JSON.stringify(block)}\n\`\`\`\n`, labels: [{ name: "risk:R1" }] };
    if (path.startsWith(`repos/${REPO}/pulls/7/files`)) return [{ filename: "src/a.ts" }];
    if (path === `repos/${REPO}/contents/.shirube/sds-pin.json?ref=${base}`) {
      if (pin === null) throw new Error("gh: Not Found (HTTP 404)");
      return { content: Buffer.from(pin).toString("base64") };
    }
    if (path.startsWith(`repos/${REPO}/issues/3/comments?`)) { if (o.listError) throw new Error(o.listError); return paged(comments, path); }
    if (path === `repos/${REPO}/issues/comments/12`) return { body: handoff };
    if (path === `repos/${REPO}`) return { default_branch: "main" };
    if (path.startsWith(`repos/${REPO}/pulls?state=closed`)) { if (o.closedError) throw new Error(o.closedError); return paged(closed, path); }
    throw new Error(`unexpected ${path}`);
  };
  return { api, calls };
}
const paged = (list, path) => { const page = Number(/[?&]page=(\d+)/.exec(path)[1]); return list.slice((page - 1) * 100, page * 100); };
const run = (o) => { const s = scene(o); return { ...gate({ repo: REPO, pr: 7 }, s.api, 0, accepted), calls: s.calls }; };
const failing = (o) => { try { run(o); } catch (error) { return failure(error, {}); } return assert.fail("the gate passed"); };
const reason = (o) => run(o).plan_binding.reason;

test("T4-33 a binding of plan_id and node_id resolves the highest ADMITTED generation and copies it with the comment id", () => {
  const r = run();
  assert.equal(r.verdict, "PASS");
  assert.deepEqual(r.plan_binding, { mode: "report-only", result: "PASS", plan_id: PLAN_ID, generation: 2, node_id: "N1", comment_id: 2, comment_ref: refOf(2), comment_sha256: sha(planBody({ generation: 2 })) });
});
test("T4-33 the handoff may name an older generation than the resolved one (the author never writes a generation)", () => {
  assert.equal(run().plan_binding.result, "PASS"); // HANDOFF names generation 1, the plan resolves to 2
});
test("T4-33 the comments of the control_source are read across pages and only with GET paths of the same repository", () => {
  const filler = Array.from({ length: 130 }, (_, i) => [100 + i, "note"]);
  const r = run({ comments: [...filler, [900, planBody({ generation: 7 })]] });
  assert.equal(r.plan_binding.generation, 7);
  assert.ok(r.calls.every((c) => c.startsWith(`repos/${REPO}`)));
});
for (const [id, name, o, why] of [
  ["T4-34", "no delivery_plan.control_source in the pin", { pin: JSON.stringify({ plan_binding_mode: "report-only" }) }, /^4\.3a /],
  ["T4-34", "no pin at all (404)", { pin: null }, /^4\.3a /],
  ["T4-35", "a control_source of another repository", { pin: JSON.stringify({ delivery_plan: { control_source: "https://github.com/watchout/kodama/issues/3" } }) }, /^4\.3b /],
  ["T4-35", "a control_source that is not an issue", { pin: JSON.stringify({ delivery_plan: { control_source: "https://github.com/watchout/aun/pull/3" } }) }, /^4\.3b /],
  ["T4-36", "a control_source that cannot be read (404)", { listError: "gh: Not Found (HTTP 404)" }, /^4\.3c .*404/],
  ["T4-36", "a plan block that is not valid YAML", { comments: [[1, planBody({ generation: 1 })], [2, `${planBody({ generation: 2 })}${fence("yaml", "schema_version: shirube-delivery-plan/v1\nbroken: [")}`]] }, /^4\.3c /],
  ["T4-37", "no ADMITTED block for the plan_id", { comments: [[1, planBody({ status: "DRAFT" })], [2, planBody({ plan_id: "DP-OTHER-001" })]] }, /^4\.3d /],
  ["T4-37", "no comment at all", { comments: [] }, /^4\.3d /],
  ["T4-38", "two ADMITTED blocks of the highest generation", { comments: [[1, planBody({ generation: 2 })], [2, planBody({ generation: 2 })]] }, /^4\.3e /],
]) {
  test(`${id} ${name}: plan_binding FAILs ${why.source.slice(1, 6)} and report-only keeps the verdict`, () => {
    const r = run(o);
    assert.equal(r.verdict, "PASS"); assert.equal(r.plan_binding.result, "FAIL"); assert.match(r.plan_binding.reason, why);
  });
}
test("T4-39 the same failures FAIL the gate in blocking mode (a FAIL is never turned into PASS)", () => {
  const r = failing({ mode: "blocking", comments: [] });
  assert.equal(r.verdict, "FAIL"); assert.match(r.reason, /^4 plan binding: 4\.3d /);
});

// Both forms at once: an old-form block is judged the old way even when the pin has a control_source.
const OLD = (planText, extra = {}) => ({ comment_ref: refOf(11), comment_sha256: sha(planText), generation: 2, ...extra });
test("T4-40 a block with comment_ref, comment_sha256 and generation is the old form: judged by its own comment, the control_source is not read", () => {
  const plan = planBody({ generation: 2 });
  const s = scene({ comments: [[11, plan]], binding: OLD(plan), handoff: HANDOFF("", { generation: 2, ref: refOf(11), digest: sha(plan) }) });
  const api = (path) => (path === `repos/${REPO}/issues/comments/11` ? { body: plan } : s.api(path));
  const r = gate({ repo: REPO, pr: 7 }, api, 0, accepted);
  assert.equal(r.plan_binding.result, "PASS"); assert.equal(r.plan_binding.generation, 2); assert.equal("comment_id" in r.plan_binding, false);
  assert.ok(!s.calls.some((c) => c.includes("/issues/3/comments")));
});
test("T4-41 an old-form block that contradicts its plan comment (another plan_id) FAILs 4.4", () => {
  const plan = planBody({ generation: 2 });
  const s = scene({ binding: OLD(plan, { plan_id: "DP-OTHER-001" }) });
  const api = (path) => (path === `repos/${REPO}/issues/comments/11` ? { body: plan } : s.api(path));
  assert.match(gate({ repo: REPO, pr: 7 }, api, 0, accepted).plan_binding.reason, /^4\.4 /);
});
test("T4-54 the old form is accepted as it was (no stage rule): a plan whose IDs have no S<k>- prefix PASSes old and FAILs 4.18 new", () => {
  const plan = planBody({ generation: 2, terminal: ["P1", "P2"], n1: "[P1]" }), handoff = (pb) => HANDOFF("", { changes: "P1", ...pb });
  const s = scene({ comments: [[11, plan]], binding: OLD(plan), handoff: handoff({ generation: 2, ref: refOf(11), digest: sha(plan) }) });
  const api = (path) => (path === `repos/${REPO}/issues/comments/11` ? { body: plan } : s.api(path));
  assert.equal(gate({ repo: REPO, pr: 7 }, api, 0, accepted).plan_binding.result, "PASS");
  assert.match(reason({ comments: [[2, plan]], handoff: handoff() }), /^4\.18 .*stage prefix/);
});
test("T4-42 half of the old form (a digest without a comment_ref) FAILs 4.1", () => {
  assert.match(reason({ binding: { comment_sha256: "a".repeat(64) } }), /^4\.1 /);
});
test("T4-43 a new-form handoff must name the same plan_id and node_id (generation and plan comment are not compared)", () => {
  const other = HANDOFF_BODY.replace("node_id: N1", "node_id: N0");
  assert.match(reason({ handoff: other }), /^4\.11 /);
});

// Dependencies: N1 depends on N0. COMPLETE passes; otherwise a merged PR that completes the unit does.
const NAMING = (node, handoffRef = refOf(21), handoff = HANDOFF_BODY) => ({ number: 30, body: `\`\`\`json sds-pr\n${JSON.stringify({ schema: "sds-pr/1", risk_class: "R1", changed_paths: [], delivery_plan_binding: { plan_id: PLAN_ID, node_id: node }, control_handoff: { ref: handoffRef, sha256: sha(handoff) } })}\n\`\`\`\n` });
const COMPLETING = HANDOFF("completes_unit: true").replace("node_id: N1", "node_id: N0");
function withDependency(o) {
  const plan = planBody({ n0: "PLANNED" }), s = scene({ comments: [[2, plan]], ...o.scene });
  const api = (path) => (path === `repos/${REPO}/issues/comments/21` ? { body: o.completing ?? COMPLETING } : s.api(path));
  return gate({ repo: REPO, pr: 7 }, api, 0, accepted).plan_binding;
}
test("T4-44 a depends_on node that is not COMPLETE passes when a merged PR names it and its handoff has completes_unit: true", () => {
  assert.equal(withDependency({ scene: { closed: [NAMING("N0", refOf(21), COMPLETING)] } }).result, "PASS");
});
test("T4-45 a COMPLETE depends_on node passes without looking at any PR", () => {
  const r = run();
  assert.equal(r.plan_binding.result, "PASS"); assert.ok(!r.calls.some((c) => c.includes("pulls?state=closed")));
});
const BAD_HANDOFF = (body, why) => [`a merged PR whose handoff is ${why}`, { scene: { closed: [NAMING("N0", refOf(21), body)] }, completing: body }];
const FALSE_TWIN = COMPLETING.replace("completes_unit: true", "completes_unit: false");
for (const [name, o, why] of [
  ...[[`${COMPLETING}\n${FALSE_TWIN}`, "contradicted by a second block", /CHANDOFF-REF-007/], [`${COMPLETING}\n${fence("yaml", "schema_version: shirube-v3/control_handoff/v1\nbroken: [")}`, "followed by a broken block", /CHANDOFF-REF-008/],
    [COMPLETING.replace(MARK, ""), "without the marker", /CHANDOFF-REF-005/]].map(([body, why, code]) => [...BAD_HANDOFF(body, why), new RegExp(`^4\\.10 ${code.source}`)]),
  ["a merged PR whose handoff lacks completes_unit", { scene: { closed: [NAMING("N0", refOf(21), HANDOFF().replace("node_id: N1", "node_id: N0"))] }, completing: HANDOFF().replace("node_id: N1", "node_id: N0") }, /^4\.8 /],
  ["a PR that was closed without merging", { scene: { closed: [{ ...NAMING("N0", refOf(21), COMPLETING), merged_at: null }] } }, /^4\.8 /],
  ["a PR merged into a branch that is not the default", { scene: { closed: [{ ...NAMING("N0", refOf(21), COMPLETING), base: { ref: "feature/x" } }] } }, /^4\.8 /],
  ["a merged PR that names another node", { scene: { closed: [NAMING("N1", refOf(21), COMPLETING)] } }, /^4\.8 /],
  ["no closed PR at all", { scene: { closed: [] } }, /^4\.8 /],
  ["closed PRs that cannot be read", { scene: { closedError: "gh: Server Error (HTTP 500)" } }, /^4\.8 .*500/],
]) test(`T4-46 a depends_on node that is not COMPLETE FAILs 4.8 with ${name}`, () => assert.match(withDependency(o).reason, why));

// The current stage k: the lowest stage with a terminal ID that is not in satisfied_predicates (a COMPLETE node does not count).
test("T4-47 currentStage: the lowest stage with a terminal ID not satisfied; null when all are", () => {
  const plan = (terminal, satisfied) => ({ owner_outcome: { terminal_predicates: terminal.map((id) => ({ id })) }, ...(satisfied && { terminal_acceptance: { satisfied_predicates: satisfied } }) });
  assert.equal(currentStage(plan(["S1-A", "S2-B"])), "S1");
  assert.equal(currentStage(plan(["S1-A", "S1-B", "S2-C"], ["S1-A"])), "S1");
  assert.equal(currentStage(plan(["S1-A", "S2-B", "S3-C"], ["S1-A"])), "S2");
  assert.equal(currentStage(plan(["S2-B", "S1-A"], ["S1-A", "S2-B"])), null);
  assert.equal(currentStage(plan([], [])), null);
});
test("T4-48 currentStage throws a reason for what it cannot read or what contradicts", () => {
  const bad = (terminal, satisfied) => () => currentStage({ owner_outcome: { terminal_predicates: terminal }, terminal_acceptance: { satisfied_predicates: satisfied } });
  assert.throws(bad([{ id: "S1-A" }], ["S1-Z"]), /not a terminal predicate/);
  assert.throws(bad([{ id: "X-A" }], []), /stage prefix/);
  assert.throws(bad([{ id: "S5-A" }], []), /stage prefix/);
  assert.throws(bad([{ id: "BAD-A" }, { id: "S2-B" }], ["BAD-A"]), /stage prefix/); // a satisfied ID is checked too
  assert.throws(bad([{ id: "BAD-A" }], ["BAD-A"]), /stage prefix/); // also when every ID is satisfied
  assert.throws(bad([{ id: 7 }], []), /id/);
  assert.throws(bad("S1-A", []), /array/);
  assert.throws(bad([{ id: "S1-A" }], "S1-A"), /array/);
  assert.throws(() => currentStage(null), /array/);
});
test("T4-49 (b') a node whose predicates are all in the current stage passes, also when an earlier ID is satisfied", () => {
  assert.equal(run({ comments: [[2, planBody({ satisfied: "S1-A" })]] }).plan_binding.result, "PASS");
});
test("T4-50 (b') boundary: every node of S1 COMPLETE but S1 not in satisfied_predicates, so k is S1 and a node of S2 FAILs 4.18", () => {
  const plan = planBody({ n1: "[S2-C]", n0: "COMPLETE" });
  assert.match(reason({ comments: [[2, plan]], handoff: HANDOFF("", { changes: "S2-C" }) }), /^4\.18 .*S2-C.*S1/);
});
test("T4-51 (b') all terminal IDs satisfied: the plan is closed and a node FAILs 4.18", () => {
  assert.match(reason({ comments: [[2, planBody({ satisfied: "S1-A, S1-B, S2-C" })]] }), /^4\.18 .*closed/);
});
test("T4-52 (b') a satisfied ID that is not a terminal ID, or an ID without a stage prefix, FAILs 4.18 with the reason", () => {
  assert.match(reason({ comments: [[2, planBody({ satisfied: "S1-Z" })]] }), /^4\.18 .*not a terminal predicate/);
  assert.match(reason({ comments: [[2, planBody({ terminal: ["S1-A", "S1-B", "Q-C"] })]] }), /^4\.18 .*stage prefix/);
  const accepted = planBody({ terminal: ["BAD-A", "S2-C"], satisfied: "BAD-A", n1: "[S2-C]" }); // a bad prefix that is already satisfied must not pass
  assert.match(reason({ comments: [[2, accepted]], handoff: HANDOFF("", { changes: "S2-C" }) }), /^4\.18 .*stage prefix/);
});
// Judgment 5 reads the plan judgment 4 resolved: a new-form PR has no comment_ref of its own, so the gate's own resolved comment is used.
const DESIGN_REF = `https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6285512379`, SRC = "c".repeat(40), APPROVAL = "<!-- shirube-owner-decision/v1:OD-X -->\nd@1 を承認する\n";
const DESIGN_FILE = `# design\n\n${fence("json sds-design", JSON.stringify({ schema: "sds-design/1", design_id: "d", version: 1, open_decisions: [], approval: { ref: DESIGN_REF, sha256: sha(APPROVAL) },
  main_connection: { id: "MC1", statement: "s", first_node: "N1" } }, null, 2))}`;
function designRun(comments) { // the design binding of a new-form PR, with the plan comments served from `comments` ([id, body])
  const pin = JSON.stringify({ plan_binding_mode: "report-only", design_binding_mode: "report-only", delivery_plan: { control_source: SOURCE } });
  const design_binding = { design_ref: `https://github.com/watchout/iyasaka-arc/blob/${SRC}/docs/design.md`, design_sha256: sha(DESIGN_FILE), design_id: "d", version: 1 };
  const s = scene({ pin, block: { design_binding }, comments }), plans = new Map(comments);
  const api = (path) => (path === `repos/watchout/iyasaka-arc/contents/docs/design.md?ref=${SRC}` ? { encoding: "base64", content: Buffer.from(DESIGN_FILE).toString("base64") }
    : path === "repos/watchout/iyasaka-arc/issues/comments/6285512379" ? { body: APPROVAL } : plans.has(Number(/repos\/watchout\/aun\/issues\/comments\/(\d+)$/.exec(path)?.[1])) ? { body: plans.get(Number(path.split("/").at(-1))) } : s.api(path));
  const r = gate({ repo: REPO, pr: 7 }, api, 0, accepted);
  return [r.plan_binding.result, r.plan_binding.generation, r.design_binding.result, r.design_binding.findings?.map((f) => f.reason)];
}
test("T4-55 judgment 5 gets the plan that judgment 4 resolved for a new-form PR (the PR names no comment_ref)", () => {
  assert.deepEqual(designRun([[2, planBody({ generation: 2 })]]), ["PASS", 2, "PASS", ["5.6"]]); // 5.5 would mean the plan did not arrive
});
for (const [name, first] of [["an older generation", planBody({ generation: 1, onlyN0: true })], ["another plan_id", planBody({ plan_id: "DP-OTHER-001", generation: 9, onlyN0: true })]]) {
  test(`T4-56 judgment 5 reads the block judgment 4 chose, not the first block of the comment (${name} comes first)`, () => {
    assert.deepEqual(designRun([[2, first + planBody({ generation: 2 })]]), ["PASS", 2, "PASS", ["5.6"]]);
    assert.deepEqual(designRun([[2, planBody({ generation: 2 }) + first]]), ["PASS", 2, "PASS", ["5.6"]]); // the order does not matter
  });
}
test("T4-53 FAIL reasons are plain text with no tokens or credentials", () => {
  for (const o of [{ comments: [] }, { listError: "gh: Not Found (HTTP 404)" }, { pin: null }]) assert.doesNotMatch(reason(o), /ghp_|token|Authorization/i);
});
