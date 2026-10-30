// U4 2b, judgment 5.3u (docs/design/u4-gate-judgements.md §3.2, §4 T8-T14, T16-T18) and the 5.9 note when no changed paths are given (§9 item 4).
// A unit design record is approved by an independent design audit, not by an Owner decision: the gate does not check that approval (5.3u NOT_CHECKED) and never says PASS for it.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { designGate, failed } from "../scripts/sds/design-gate.mjs";
import { gate } from "../scripts/sds/gate.mjs";
import { matchesAny } from "../scripts/hygiene/lib.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const REF = "https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6285512379", BODY = "<!-- shirube-owner-decision/v1:OD-X -->\nd@1 を承認する\n";
const block = (over = {}) => ({ schema: "sds-design/1", design_id: "d", version: 1, open_decisions: [], approval: { ref: REF, sha256: sha(BODY) }, main_connection: { id: "MC1", statement: "s", first_node: "N1" }, ...over });
const unit = (over = {}) => block({ approval: { kind: "unit_design" }, ...over });
const input = (over = {}) => ({ approvalBody: null, plan: null, boundNodeId: "N1", riskIndex: 1, changedPaths: ["docs/a.md"], matches: matchesAny, designPr: 55, ...over });
const reasons = (r) => r.findings.map((f) => f.reason);
const bad = (r) => failed(r.findings).map((f) => f.reason);
const U = "5.3u NOT_CHECKED: the approval of a unit design is checked by the merging seat, not by the gate";

test("T8 a unit design with every other check passing is NOT_CHECKED with the 5.3u note, never PASS (main read {kind} as an Owner approval and FAILed 5.3)", () => {
  const r = designGate(unit({ placements: ["docs/**"] }), input());
  assert.deepEqual([r.verdict, bad(r), r.findings.find((f) => f.reason === "5.3u")?.message], ["NOT_CHECKED", [], U]);
  assert.deepEqual(reasons(r).filter((x) => x !== "5.5" && x !== "5.6"), ["5.3u"]);
});
test("T9 a unit design with a path outside the placements FAILs 5.9, and the 5.3u note is still there", () => {
  const r = designGate(unit({ placements: ["docs/**"] }), input({ changedPaths: ["src/b.mjs", "docs/a.md"] }));
  assert.deepEqual([r.verdict, bad(r), reasons(r).includes("5.3u")], ["FAIL", ["5.9"], true]);
});
test("T11 a unit design needs design_pr, a positive integer: anything else FAILs 5.1 alone", () => {
  for (const designPr of [undefined, null, 0, -1, 5.5, "55", [55], {}]) assert.deepEqual([designGate(unit(), input({ designPr })).verdict, reasons(designGate(unit(), input({ designPr })))], ["FAIL", ["5.1"]], String(designPr));
});
test("T13 the two kinds are not mixed: design_pr without a unit design, or owner-approval fields inside a unit design, FAIL 5.1", () => {
  for (const [b, i] of [[block(), input({ designPr: 55 })], [block({ approval: { kind: "owner_decision", ref: REF, sha256: sha(BODY) } }), input({ designPr: 55, approvalBody: BODY })],
    [unit({ approval: { kind: "unit_design", ref: REF, sha256: sha(BODY) } }), input()], [unit({ approval: { kind: "unit_design", extra: 1 } }), input()]]) assert.deepEqual(reasons(designGate(b, i)), ["5.1"], JSON.stringify(b.approval));
});
test("T16 kind absent or owner_decision keeps reading 5.3 and 5.4 as before", () => {
  for (const approval of [{ ref: REF, sha256: sha(BODY) }, { kind: "owner_decision", ref: REF, sha256: sha(BODY) }]) {
    assert.deepEqual([designGate(block({ approval }), input({ designPr: undefined, approvalBody: BODY })).verdict, bad(designGate(block({ approval }), input({ designPr: undefined, approvalBody: `${BODY} ` })))], ["PASS", ["5.3"]]);
  }
});
test("T17 an unknown kind FAILs 5.1 (a PASS must never come from a spelling)", () => {
  for (const kind of ["x", "UNIT_DESIGN", "unit-design", "", 1, null, ["unit_design"], {}]) assert.deepEqual(reasons(designGate(block({ approval: { kind, ref: REF, sha256: sha(BODY) } }), input({ designPr: undefined }))), ["5.1"], JSON.stringify(kind));
});
test("§9 item 4 without changed paths the 5.9 note is given, not skipped; with placements the check still FAILs closed", () => {
  const r = designGate(block(), input({ changedPaths: undefined, approvalBody: BODY, designPr: undefined }));
  assert.deepEqual([r.verdict, r.findings.find((f) => f.reason === "5.9")?.message], ["PASS", "5.9 NOT_CHECKED: changed paths were not given"]);
  assert.deepEqual(bad(designGate(block({ placements: ["docs/**"] }), input({ changedPaths: undefined, approvalBody: BODY, designPr: undefined }))), ["5.9"]);
});

// Through the gate (the PR names design_pr; the gate copies it and reads nothing about it).
const REPO = "watchout/shirube", HEAD = "a".repeat(40), BASE = "b".repeat(40), SRC = "c".repeat(40);
function run(o = {}) {
  const b64 = (s) => ({ encoding: "base64", content: Buffer.from(s).toString("base64") }), calls = [];
  const design = `# design\n\n\`\`\`json sds-design\n${JSON.stringify(o.block ?? unit({ placements: ["docs/**"] }), null, 2)}\n\`\`\`\n`;
  const dbind = { design_ref: `https://github.com/watchout/iyasaka-arc/blob/${SRC}/docs/d.md`, design_sha256: sha(design), design_id: "d", version: 1, ...("design_pr" in o ? { design_pr: o.design_pr } : { design_pr: 55 }) };
  const files = o.files ?? [{ filename: "docs/a.md" }];
  const prBlock = { schema: "sds-pr/1", risk_class: "R1", changed_paths: files.map((f) => f.filename), design_binding: dbind };
  const api = (path) => {
    calls.push(path);
    if (path === `repos/${REPO}/pulls/7`) return { head: { sha: HEAD }, base: { sha: BASE }, body: `\`\`\`json sds-pr\n${JSON.stringify(prBlock)}\n\`\`\`\n`, labels: [{ name: "risk:R1" }] };
    if (path.startsWith(`repos/${REPO}/pulls/7/files`)) return files;
    if (path === `repos/${REPO}/contents/.shirube/sds-pin.json?ref=${BASE}`) return b64(JSON.stringify({ plan_binding_mode: "off", design_binding_mode: o.mode ?? "report-only" }));
    if (path === `repos/watchout/iyasaka-arc/contents/docs/d.md?ref=${SRC}`) return b64(design);
    if (path === "repos/watchout/iyasaka-arc/issues/comments/6285512379") return { body: BODY };
    throw new Error(`unexpected ${path}`); // the unit design's PR, an audit or a checker would end here
  };
  return { out: gate({ repo: REPO, pr: 7 }, api, 0, () => { throw new Error("the checker must not run"); }, JSON.parse), calls };
}
test("T8 through the gate: design_binding is NOT_CHECKED, names 5.3u in its reason, copies design_pr, and the verdict stays PASS", () => {
  const { out } = run();
  assert.deepEqual([out.verdict, out.design_binding.result, out.design_binding.design_pr, out.design_binding.mode], ["PASS", "NOT_CHECKED", 55, "report-only"]);
  assert.match(out.design_binding.reason, /^5\.3u NOT_CHECKED: .*; the other checks \(5\.9 included\) did not fail$/);
});
test("T10 a unit design whose PR was audited and one whose PR was not read the same: the gate does not tell them apart, and says NOT_CHECKED for both", () => {
  const [a, b] = [run({ design_pr: 11 }).out.design_binding, run({ design_pr: 12 }).out.design_binding];
  assert.deepEqual([a.result, b.result], ["NOT_CHECKED", "NOT_CHECKED"]);
  assert.deepEqual({ ...a, design_pr: 0 }, { ...b, design_pr: 0 });
});
test("T12 the gate never reads the unit design's PR, an audit, the approval comment or the checker (the stub throws on any of them)", () => {
  const { calls } = run({ block: unit({ placements: ["docs/**"], approval: { kind: "unit_design" } }), design_pr: 55 });
  assert.deepEqual(calls.filter((p) => /pulls\/55|issues\/comments|audit/.test(p)), []);
});
test("T12 even a malformed unit design that carries an approval ref is not read: 5.1 FAIL, and the approval comment is never fetched", () => {
  const { out, calls } = run({ block: unit({ approval: { kind: "unit_design", ref: REF, sha256: sha(BODY) } }) });
  assert.deepEqual([out.design_binding.result, out.design_binding.findings.map((f) => f.reason), calls.filter((p) => /issues\/comments/.test(p))], ["FAIL", ["5.1"], []]);
});
test("the other checks of judgment 5 still run on a unit design: an unanswered open decision FAILs 5.2", () => {
  const r = designGate(unit({ open_decisions: [{ id: "D1", answer: "", decided_ref: REF }] }), input());
  assert.deepEqual([r.verdict, bad(r)], ["FAIL", ["5.2"]]);
});
test("T14 report-only records a 5.9 FAIL and a lone 5.3u NOT_CHECKED without changing the verdict", () => {
  const out = run({ files: [{ filename: "src/b.mjs" }] }).out;
  assert.deepEqual([out.verdict, out.design_binding.result, out.design_binding.reason], ["PASS", "FAIL", "5.9 paths outside the design placements: src/b.mjs"]);
  assert.deepEqual([run().out.verdict, run().out.design_binding.result], ["PASS", "NOT_CHECKED"]);
});
test("T11 through the gate: a unit design without design_pr FAILs 5.1 (the gate does not invent one)", () => {
  for (const o of [{ design_pr: undefined }, { design_pr: "55" }]) assert.match(run(o).out.design_binding.reason, /^5\.1 /);
});
test("T18 an owner_decision design (kind named) in blocking mode stops the gate on a 5.9 FAIL, as judgment 5 always did; a unit design stops on it too, not on its NOT_CHECKED", () => {
  const owner = block({ approval: { kind: "owner_decision", ref: REF, sha256: sha(BODY) }, placements: ["docs/**"] });
  assert.throws(() => run({ block: owner, design_pr: undefined, mode: "blocking", files: [{ filename: "src/a.mjs" }] }), /^Error: 5 design binding: 5\.9 paths outside the design placements: src\/a\.mjs/);
  assert.equal(run({ block: owner, design_pr: undefined, mode: "blocking" }).out.design_binding.result, "PASS");
  assert.throws(() => run({ mode: "blocking", files: [{ filename: "src/a.mjs" }] }), /^Error: 5 design binding: 5\.9 /);
  assert.equal(run({ mode: "blocking" }).out.design_binding.result, "NOT_CHECKED"); // NOT_CHECKED does not stop the gate
});
test("the design record ends with section 9 exactly as the work order gave it (SHA-256 of the 9 lines)", () => {
  const lines = readFileSync(new URL("../docs/design/u4-gate-judgements.md", import.meta.url), "utf8").split("\n");
  assert.equal(sha(`${lines.slice(-10, -1).join("\n")}\n`), "706808d817c5adf87b2a202ba3c8de83354a072c80202738f41874ac3d4cd5d0");
  assert.match(lines.at(-10), /^## 9\. 実装の時に決めた読み（2a・2b）$/);
});
