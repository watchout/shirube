import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { preflight } from "../scripts/sds/preflight.mjs";

const hash = (s) => createHash("sha256").update(s).digest("hex");
const b64 = (s) => ({ type: "file", encoding: "base64", content: Buffer.from(s).toString("base64") });
const head = "a".repeat(40), base = "b".repeat(40);
const REPO = "watchout/kodama";
const SOURCE = "https://github.com/watchout/kodama/issues/1#issuecomment-11";
const OWNER = "https://github.com/watchout/kodama/issues/1#issuecomment-12";
const ownerBody = (h = head, verdict = "APPROVED") => `\`\`\`yaml\nverdict: ${verdict}\nscope:\n  repository: ${REPO}\n  exact_head: ${h}\n\`\`\``;

function fixture(over = {}) {
  const source = "handoff body";
  const block = { schema: "sds-pr/1", risk_class: "R1", control_source_ref: { url: SOURCE, sha256: hash(source) }, changed_paths: ["src/a.ts"], forbidden_paths: ["secrets/**"], ...over.block };
  const f = {
    body: over.body ?? `## PR\n\n\`\`\`json sds-pr\n${JSON.stringify(block)}\n\`\`\`\n`,
    files: over.files ?? ["src/a.ts"],
    comments: { 11: source, 12: ownerBody(), ...over.comments },
    pins: { [base]: over.basePin, [head]: over.headPin ?? JSON.stringify({ files: { "CLAUDE.md": hash("kit") } }) },
    contents: { "CLAUDE.md": over.claude ?? "kit" },
  };
  f.api = (path) => {
    if (path === `repos/${REPO}/pulls/7`) return { head: { sha: head }, base: { sha: base }, body: f.body };
    if (path.startsWith(`repos/${REPO}/pulls/7/files`)) return f.files.map((filename) => ({ filename }));
    const c = /issues\/comments\/(\d+)$/.exec(path);
    if (c) return { body: f.comments[c[1]] };
    const pin = /contents\/\.shirube\/sds-pin\.json\?ref=(\w+)$/.exec(path);
    if (pin) { if (!f.pins[pin[1]]) throw new Error("404"); return b64(f.pins[pin[1]]); }
    const file = /contents\/(.+)\?ref=/.exec(path);
    if (file) return b64(f.contents[file[1]]);
    throw new Error(`unexpected ${path}`);
  };
  return f;
}
const run = (f) => preflight({ repo: REPO, pr: 7 }, f.api);

test("R1 with matching block, digest and paths passes without audit or owner decision", () => {
  const r = run(fixture());
  assert.equal(r.verdict, "PASS"); assert.deepEqual(r.warnings, []);
  assert.equal(r.owner_identity, "NOT_VERIFIED_BY_MACHINE"); assert.equal(r.authorization, "NONE");
});
const failures = [
  ["(a) no block", { body: "no block" }, /\(a\)/],
  ["(a) two blocks", { body: "```json sds-pr\n{}\n```\n```json sds-pr\n{}\n```\n" }, /\(a\)/],
  ["(a) bad risk", { block: { risk_class: "R9" } }, /\(a\)/],
  ["(b) edited source", { comments: { 11: "edited" } }, /\(b\)/],
  ["(c) undeclared file", { files: ["src/a.ts", "src/b.ts"] }, /\(c\) changed_paths/],
  ["(c) forbidden path", { files: ["secrets/k"], block: { changed_paths: ["secrets/k"] } }, /\(c\) a forbidden/],
  ["(d) R2 without audit", { block: { risk_class: "R2" } }, /\(d\)/],
  ["(d) R3 needs the audit before the owner decision", { block: { risk_class: "R3", owner_decision: OWNER } }, /\(d\)/],
  ["(e) protected path, owner decision for another head", { files: [".shirube/x"], block: { changed_paths: [".shirube/x"], owner_decision: OWNER }, comments: { 12: ownerBody("c".repeat(40)) } }, /\(e\) owner decision does not name/],
];
for (const [name, over, why] of failures) {
  test(`FAIL: ${name}`, () => assert.throws(() => run(fixture(over)), why));
}
test("(e) protected path from the trusted base pin needs an owner decision even at R1", () => {
  const over = { files: [".github/workflows/x.yml"], block: { changed_paths: [".github/workflows/x.yml"] } };
  assert.throws(() => run(fixture({ ...over, comments: { 12: ownerBody(head, "REJECTED") }, block: { ...over.block, owner_decision: OWNER } })), /\(e\)/);
  const ok = run(fixture({ ...over, block: { ...over.block, owner_decision: OWNER } }));
  assert.equal(ok.protected_touched, true);
});
test("protected paths come from the base pin, not from the PR body", () => {
  const f = fixture({ basePin: JSON.stringify({ protected_paths: ["src/**"] }), block: { protected_paths: [] } });
  assert.throws(() => run(f), /\(e\) R3\/R4 or a protected path/);
});
test("(f) drift from the pinned kit is a warning, not a failure", () => {
  const r = run(fixture({ claude: "edited" }));
  assert.equal(r.verdict, "PASS"); assert.match(r.warnings[0], /\(f\) CLAUDE\.md/);
});
