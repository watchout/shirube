import test from "node:test";
import assert from "node:assert/strict";
import { failure, gate } from "../scripts/sds/gate.mjs";

const head = "a".repeat(40), base = "b".repeat(40);
const REPO = "watchout/kodama";
const b64 = (s) => ({ content: Buffer.from(s).toString("base64") });

function fixture(over = {}) {
  const block = { schema: "sds-pr/1", risk_class: "R1", changed_paths: ["src/a.ts"], ...over.block };
  const f = {
    body: over.body ?? `## PR\n\n\`\`\`json sds-pr\n${JSON.stringify(block)}\n\`\`\`\n`,
    labels: over.labels ?? ["risk:R1", "docs"],
    files: over.files ?? ["src/a.ts"],
    basePin: over.basePin,
    pinError: over.pinError,
    request: over.request,
  };
  f.api = (path) => {
    if (path === `repos/${REPO}/pulls/7`) return { head: { sha: head }, base: { sha: base }, body: f.body, labels: f.labels.map((name) => ({ name })) };
    if (path.startsWith(`repos/${REPO}/pulls/7/files`)) {
      const page = Number(/[?&]page=(\d+)/.exec(path)[1]);
      return f.files.slice((page - 1) * 100, page * 100).map((x) => (typeof x === "string" ? { filename: x } : x));
    }
    if (path === `repos/${REPO}/contents/.shirube/sds-pin.json?ref=${base}`) {
      if (f.pinError) throw new Error(f.pinError);
      if (!f.basePin) throw new Error("gh: Not Found (HTTP 404)");
      return b64(f.basePin);
    }
    if (path === `repos/${REPO}/issues/comments/1`) return { body: `\`\`\`json\n${JSON.stringify(f.request)}\n\`\`\`\n` };
    throw new Error(`unexpected ${path}`);
  };
  return f;
}
const run = (f, verify) => gate({ repo: REPO, pr: 7 }, f.api, 0, verify);

test("R1 with one matching label and exact changed paths passes without an audit", () => {
  const r = run(fixture());
  assert.equal(r.verdict, "PASS"); assert.equal(r.effective_risk, "R1");
  assert.equal(r.owner_approval, "NOT_CHECKED_BY_MACHINE"); assert.equal(r.authorization, "NONE");
});
const failures = [
  ["no PR block", { body: "no block" }, /sds-pr block/],
  ["two PR blocks", { body: "```json sds-pr\n{}\n```\n```json sds-pr\n{}\n```\n" }, /sds-pr block/],
  ["1 no risk label", { labels: ["docs"] }, /1 risk_class: exactly one/],
  ["1 two risk labels", { labels: ["risk:R1", "risk:R2"] }, /1 risk_class: exactly one/],
  ["1 label differs from the block", { labels: ["risk:R0"] }, /1 risk_class: label R0 differs/],
  ["2 undeclared file in the diff", { files: ["src/a.ts", "src/b.ts"] }, /2 changed paths/],
  ["2 declared file missing from the diff", { block: { changed_paths: ["src/a.ts", "src/c.ts"] } }, /2 changed paths/],
  ["3 R2 without audit refs", { labels: ["risk:R2"], block: { risk_class: "R2" } }, /3 audit: R2\+ needs/],
  ["3 audit refs that do not resolve", { labels: ["risk:R3"], block: { risk_class: "R3", audit: { request: "x", request_sha256: "y", review: "z" } } }, /Unsupported comment URL/],
];
for (const [name, over, why] of failures) test(`FAIL: ${name}`, () => assert.throws(() => run(fixture(over)), why));

test("a protected path makes an R1 change R4, so it needs the audit", () => {
  const over = { files: [".github/workflows/x.yml"], block: { changed_paths: [".github/workflows/x.yml"] } };
  assert.throws(() => run(fixture(over)), /3 audit: R2\+ needs/);
});
test("protected paths come from the base branch pin, not from the PR", () => {
  const f = fixture({ basePin: JSON.stringify({ protected_paths: ["src/**"] }), block: { protected_paths: [] } });
  assert.throws(() => run(f), /3 audit: R2\+ needs/);
  assert.equal(run(fixture({ basePin: JSON.stringify({ protected_paths: ["db/**"] }) })).protected_touched, false);
});

// Judgment 3 binds the accepted receipt to this PR at this head (a receipt for another PR or head fails).
const AUDIT = { request: `https://github.com/${REPO}/pull/7#issuecomment-1`, request_sha256: "c".repeat(64), review: "r" };
const accepted = () => ({ verdict: "RECEIPT_ACCEPTED" });
for (const [name, target, verify, ok] of [
  ["this PR at this head", { pr: 7, head }, accepted, true],
  ["another PR", { pr: 8, head }, accepted, false],
  ["another head", { pr: 7, head: "d".repeat(40) }, accepted, false],
  ["a receipt that is not accepted", { pr: 7, head }, () => ({ verdict: "BLOCKED" }), false],
]) {
  test(`3 audit: an R3 receipt for ${name} ${ok ? "passes" : "fails"}`, () => {
    const f = fixture({ labels: ["risk:R3"], block: { risk_class: "R3", audit: AUDIT }, request: { targets: [{ repo: REPO, ...target }] } });
    if (ok) assert.equal(run(f, verify).verdict, "PASS");
    else assert.throws(() => run(f, verify), /does not name this PR at this head/);
  });
}
test("the base pin adds protected paths but never removes the kit's own", () => {
  const over = { basePin: JSON.stringify({ protected_paths: ["db/**"] }), files: [".github/workflows/x.yml"], block: { changed_paths: [".github/workflows/x.yml"] } };
  assert.throws(() => run(fixture(over)), /3 audit: R2\+ needs/);
  assert.equal(run(fixture({ basePin: JSON.stringify({}) })).protected_touched, false);
});
test("a base pin that cannot be read (not a 404) fails closed", () => {
  assert.throws(() => run(fixture({ pinError: "gh: Server Error (HTTP 500)" })), /base pin could not be read/);
});
test("a rename out of a protected path counts as touching it", () => {
  const over = { files: [{ filename: "docs/x.yml", previous_filename: ".github/workflows/x.yml" }], block: { changed_paths: ["docs/x.yml"] } };
  assert.throws(() => run(fixture(over)), /3 audit: R2\+ needs/);
});
test("changed paths are read across all pages of the PR files", () => {
  const many = Array.from({ length: 150 }, (_, i) => `src/f${i}.ts`);
  assert.equal(run(fixture({ files: many, block: { changed_paths: many } })).verdict, "PASS");
});
test("a run fails when the PR head moved after it read the head", () => {
  assert.throws(() => gate({ repo: REPO, pr: 7, head: "e".repeat(40) }, fixture().api), /PR head moved/);
});
test("FAIL output also says Owner approval is not checked by the machine", () => {
  const r = failure(new Error("x"), { head });
  assert.equal(r.owner_approval, "NOT_CHECKED_BY_MACHINE"); assert.equal(r.authorization, "NONE"); assert.equal(r.head, head);
});
