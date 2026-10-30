// U4 2a, judgment 5.9 (docs/design/u4-gate-judgements.md §3.1, §3.3, §4 T1-T7, T9 without 5.3u): every changed path must be inside the design's `placements`.
// designGate stays pure: the matcher is passed in (gate.mjs passes matchesAny, the one glob dialect of protected_paths, S3), so its only import stays node:crypto.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { designGate, failed } from "../scripts/sds/design-gate.mjs";
import { gate } from "../scripts/sds/gate.mjs";
import { matchesAny } from "../scripts/hygiene/lib.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const REF = "https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6285512379", BODY = "<!-- shirube-owner-decision/v1:OD-X -->\nd@1 を承認する\n";
const block = (over = {}) => ({ schema: "sds-design/1", design_id: "d", version: 1, open_decisions: [], approval: { ref: REF, sha256: sha(BODY) }, main_connection: { id: "MC1", statement: "s", first_node: "N1" }, ...over });
const input = (changedPaths, over = {}) => ({ approvalBody: BODY, plan: null, boundNodeId: "N1", riskIndex: 1, changedPaths, matches: matchesAny, ...over });
const reasons = (r) => r.findings.map((f) => f.reason);
const bad = (r) => failed(r.findings); // the findings that are failures, not notes
const OUT = "5.9 paths outside the design placements: ";

test("T1 paths that are all inside the placements: 5.9 says nothing", () => {
  const r = designGate(block({ placements: ["docs/**", "tests/*.mjs"] }), input(["docs/a/b.md", "tests/x.mjs"]));
  assert.deepEqual([r.verdict, reasons(r)], ["PASS", ["5.5", "5.6"]]); // only the notes about the missing plan
});
test("T2 one path outside FAILs 5.9 and names it (main ignores placements, so this PASSed before)", () => {
  const r = designGate(block({ placements: ["docs/**"] }), input(["docs/a.md", "src/b.mjs"]));
  assert.equal(r.verdict, "FAIL"); assert.deepEqual(bad(r).map((f) => f.message), [`${OUT}src/b.mjs`]);
});
test("T3 every outside path is named, sorted and once, whatever the order it came in", () => {
  const r = designGate(block({ placements: ["docs/**"] }), input(["z.mjs", "docs/a.md", "b.mjs", "a/c.mjs", "b.mjs"]));
  assert.deepEqual(bad(r).map((f) => f.message), [`${OUT}a/c.mjs, b.mjs, z.mjs`]);
});
test("T5 without placements nothing FAILs: 5.9 NOT_CHECKED when the caller gave paths, and NOT_CHECKED 'changed paths were not given' when it gave none", () => {
  const r = designGate(block(), input(["anything.mjs"]));
  assert.deepEqual([r.verdict, reasons(r).includes("5.9"), r.findings.find((f) => f.reason === "5.9")?.message], ["PASS", true, "5.9 NOT_CHECKED: the design names no placements"]);
  assert.deepEqual(bad(r), []);
  assert.equal(designGate(block(), { approvalBody: BODY, plan: null, boundNodeId: "N1", riskIndex: 1 }).findings.find((f) => f.reason === "5.9")?.message, "5.9 NOT_CHECKED: changed paths were not given");
});
test("T6 placements that are not a list of non-empty strings FAIL 5.1 and 5.9 is not looked at (it needs 5.1 first)", () => {
  for (const placements of ["docs/**", [1], [""], ["docs/**", "  "], {}, null, [["docs/**"]]]) {
    const r = designGate(block({ placements }), input(["src/x.mjs"]));
    assert.deepEqual([r.verdict, reasons(r)], ["FAIL", ["5.1"]], JSON.stringify(placements));
  }
  assert.deepEqual(reasons(designGate(block({ schema: "x", placements: ["docs/**"] }), input(["src/x.mjs"]))), ["5.1"]);
});
test("T7 the glob dialect is the matcher's: ** and * behave as matchesAny says, for every pair", () => {
  for (const glob of ["a/**", "*.md", "a/*/b.mjs", "**/x.mjs", ".github/workflows/**", "docs/sds/consumers.json"]) {
    for (const path of ["a/b.mjs", "a/c/b.mjs", "a/c/d/b.mjs", "r.md", "docs/r.md", "x.mjs", "q/x.mjs", ".github/workflows/ci.yml", "docs/sds/consumers.json", "docs/sds/consumers.json.bak"]) {
      assert.equal(bad(designGate(block({ placements: [glob] }), input([path]))).length === 0, matchesAny(path, [glob]), `${glob} ${path}`);
    }
  }
});
test("5.9 fails closed: placements with no list of paths, or no matcher, cannot be checked and FAIL", () => {
  for (const changedPaths of [undefined, null, "docs/a.md", {}]) assert.deepEqual(bad(designGate(block({ placements: ["docs/**"] }), input(changedPaths))).map((f) => f.reason), ["5.9"], String(changedPaths));
  for (const matches of [undefined, null, "x"]) assert.deepEqual(bad(designGate(block({ placements: ["docs/**"] }), input(["docs/a.md"], { matches }))).map((f) => f.reason), ["5.9"], String(matches));
  assert.equal(bad(designGate(block(), input(null))).length, 0); // no placements and no paths: nothing to check
});
test("5.9 is pure: the same input gives the same output and the input is not changed", () => {
  const b = Object.freeze(block({ placements: Object.freeze(["docs/**"]) })), i = Object.freeze(input(Object.freeze(["src/b.mjs", "docs/a.md"])));
  assert.equal(JSON.stringify(designGate(b, i)), JSON.stringify(designGate(b, i)));
});

// Through the gate: judgment 2's paths (a rename counts both its old and its new path) reach judgment 5 with the real matchesAny.
const REPO = "watchout/shirube", HEAD = "a".repeat(40), BASE = "b".repeat(40), SRC = "c".repeat(40);
const DESIGN = (b) => `# design\n\n\`\`\`json sds-design\n${JSON.stringify(b, null, 2)}\n\`\`\`\n`;
function run(files, placements, mode = "report-only") {
  const design = DESIGN(block(placements === undefined ? {} : { placements })), b64 = (s) => ({ encoding: "base64", content: Buffer.from(s).toString("base64") });
  const prBlock = { schema: "sds-pr/1", risk_class: "R1", changed_paths: files.flatMap((f) => [f.previous_filename, f.filename].filter(Boolean)),
    design_binding: { design_ref: `https://github.com/watchout/iyasaka-arc/blob/${SRC}/docs/d.md`, design_sha256: sha(design), design_id: "d", version: 1 } };
  const api = (path) => {
    if (path === `repos/${REPO}/pulls/7`) return { head: { sha: HEAD }, base: { sha: BASE }, body: `\`\`\`json sds-pr\n${JSON.stringify(prBlock)}\n\`\`\`\n`, labels: [{ name: "risk:R1" }] };
    if (path.startsWith(`repos/${REPO}/pulls/7/files`)) return files;
    if (path === `repos/${REPO}/contents/.shirube/sds-pin.json?ref=${BASE}`) return b64(JSON.stringify({ plan_binding_mode: "off", design_binding_mode: mode }));
    if (path === `repos/watchout/iyasaka-arc/contents/docs/d.md?ref=${SRC}`) return b64(design);
    if (path === "repos/watchout/iyasaka-arc/issues/comments/6285512379") return { body: BODY };
    throw new Error(`unexpected ${path}`);
  };
  return gate({ repo: REPO, pr: 7 }, api, 0, () => ({ verdict: "RECEIPT_ACCEPTED" }), JSON.parse);
}
test("T4 through the gate: a rename whose OLD path is outside FAILs 5.9 and names only that path; report-only keeps the verdict", () => {
  const r = run([{ filename: "docs/new.md", previous_filename: "src/old.md" }], ["docs/**"]);
  assert.deepEqual([r.verdict, r.design_binding.result, r.design_binding.reason], ["PASS", "FAIL", `${OUT}src/old.md`]);
  assert.equal(run([{ filename: "docs/new.md", previous_filename: "docs/old.md" }], ["docs/**"]).design_binding.result, "PASS");
});
test("through the gate: all inside PASSes with no 5.9 finding; no placements PASSes with the NOT_CHECKED note", () => {
  const inside = run([{ filename: "docs/a.md" }, { filename: "docs/b/c.md" }], ["docs/**"]).design_binding;
  assert.deepEqual([inside.result, inside.findings.map((f) => f.reason)], ["PASS", ["5.5", "5.6"]]);
  const none = run([{ filename: "docs/a.md" }], undefined).design_binding;
  assert.deepEqual([none.result, none.findings.map((f) => f.reason)], ["PASS", ["5.5", "5.6", "5.9"]]);
});
test("through the gate: blocking stops on 5.9, and mode off does not look at placements", () => {
  assert.throws(() => run([{ filename: "src/a.mjs" }], ["docs/**"], "blocking"), /^Error: 5 design binding: 5\.9 paths outside the design placements: src\/a\.mjs/);
  assert.equal(run([{ filename: "src/a.mjs" }], ["docs/**"], "off").design_binding.result, "NOT_CHECKED");
});
