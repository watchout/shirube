import test from "node:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { failure, gate } from "../scripts/sds/gate.mjs";

const head = "a".repeat(40), base = "b".repeat(40);
const REPO = "watchout/kodama";
const b64 = (s) => ({ content: Buffer.from(s).toString("base64") });
const sha = (s) => createHash("sha256").update(s).digest("hex");
const requestBody = (r) => `\`\`\`json\n${JSON.stringify(r)}\n\`\`\`\n`;

function fixture(over = {}) {
  const block = { schema: "sds-pr/1", risk_class: "R1", changed_paths: ["src/a.ts"], ...over.block };
  const f = {
    body: over.body ?? `## PR\n\n\`\`\`json sds-pr\n${JSON.stringify(block)}\n\`\`\`\n`,
    labels: over.labels ?? ["risk:R1", "docs"],
    files: over.files ?? ["src/a.ts"],
    basePin: over.basePin,
    pinError: over.pinError,
    request: over.request,
    requestBody: over.requestBody,
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
    if (path === `repos/${REPO}/issues/comments/1`) return { body: f.requestBody ?? requestBody(f.request) };
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
const audit = (request) => ({ request: `https://github.com/${REPO}/pull/7#issuecomment-1`, request_sha256: sha(requestBody(request)), review: "r" });
const accepted = () => ({ verdict: "RECEIPT_ACCEPTED" });
for (const [name, target, verify, ok] of [
  ["this PR at this head", { pr: 7, head }, accepted, true],
  ["another PR", { pr: 8, head }, accepted, false],
  ["another head", { pr: 7, head: "d".repeat(40) }, accepted, false],
  ["a receipt that is not accepted", { pr: 7, head }, () => ({ verdict: "BLOCKED" }), false],
]) {
  test(`3 audit: an R3 receipt for ${name} ${ok ? "passes" : "fails"}`, () => {
    const request = { targets: [{ repo: REPO, ...target }] };
    const f = fixture({ labels: ["risk:R3"], block: { risk_class: "R3", audit: audit(request) }, request });
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
  const files = [{ filename: "docs/x.yml", previous_filename: ".github/workflows/x.yml" }];
  assert.throws(() => run(fixture({ files, block: { changed_paths: [".github/workflows/x.yml", "docs/x.yml"] } })), /3 audit: R2\+ needs/);
  assert.throws(() => run(fixture({ files, block: { changed_paths: ["docs/x.yml"] } })), /2 changed paths/, "a rename must declare its old path too");
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

test("3 audit: a request edited after the receipt (same id, now naming this PR) fails", () => {
  const accepted = { targets: [{ repo: REPO, pr: 21, head }] };
  const edited = { targets: [{ repo: REPO, pr: 7, head }] };
  const f = fixture({ labels: ["risk:R3"], block: { risk_class: "R3", audit: audit(accepted) }, request: edited });
  assert.throws(() => run(f, () => ({ verdict: "RECEIPT_ACCEPTED" })), /request changed after the receipt/);
});
test("3 audit: once the review is deleted, re-running the gate on the same head fails", () => {
  const request = { targets: [{ repo: REPO, pr: 7, head }] };
  const f = fixture({ labels: ["risk:R3"], block: { risk_class: "R3", audit: audit(request) }, request });
  assert.equal(run(f, () => ({ verdict: "RECEIPT_ACCEPTED" })).verdict, "PASS");
  assert.throws(() => run(f, () => { throw new Error("gh: Not Found (HTTP 404)"); }), /404/);
});
test("docs/CODEOWNERS is protected like the other CODEOWNERS locations", () => {
  assert.throws(() => run(fixture({ files: ["docs/CODEOWNERS"], block: { changed_paths: ["docs/CODEOWNERS"] } })), /3 audit: R2\+ needs/);
});
test("the caller re-runs when a PR comment is deleted", () => {
  const caller = readFileSync(new URL("../kit/sds-gate-caller.yml", import.meta.url), "utf8");
  assert.match(caller, /issue_comment:\n\s+types: \[created, edited, deleted\]/);
});

// The status step's real shell, run under the runner's default bash -e with stub gh and gate.
const workflow = readFileSync(new URL("../.github/workflows/sds-gate.yml", import.meta.url), "utf8");
const step = workflow.split("      - name: Run sds-gate and report a commit status on the PR head\n")[1].split("        run: |\n")[1]
  .split("\n").filter((l) => l.startsWith("          ") || l === "").map((l) => l.slice(10)).join("\n")
  .replaceAll("${{ github.server_url }}", "https://github.com").replaceAll("${{ github.run_id }}", "1");
function runStep(gateOut, gateCode, ghPostFails = false) {
  const dir = mkdtempSync(join(tmpdir(), "sds-gate-step-"));
  try {
    writeFileSync(join(dir, "gh"), `#!/bin/bash\nif [[ "$2" == */statuses/* ]]; then echo "$@" >> "${dir}/posts"; ${ghPostFails ? "exit 1" : "exit 0"}; fi\necho ${head}\n`);
    chmodSync(join(dir, "gh"), 0o755);
    writeFileSync(join(dir, "gate.mjs"), `process.stdout.write(${JSON.stringify(gateOut)}); process.exitCode = ${gateCode};`);
    const tools = join(dir, "tools"); spawnSync("mkdir", ["-p", join(tools, "scripts/sds")]);
    spawnSync("cp", [join(dir, "gate.mjs"), join(tools, "scripts/sds/gate.mjs")]);
    const r = spawnSync("bash", ["-e", "-c", step], { encoding: "utf8", env: { PATH: `${dir}:${process.env.PATH}`, REPO: REPO, PR: "7", SHIRUBE_TOOLS: tools } });
    let posts = ""; try { posts = readFileSync(join(dir, "posts"), "utf8"); } catch { posts = ""; }
    return { status: r.status, stdout: r.stdout, posts };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test("status step under bash -e: PASS posts success, and a later FAIL on the same head posts failure with its JSON", () => {
  const ok = runStep(JSON.stringify({ verdict: "PASS", risk_class: "R1" }), 0);
  assert.equal(ok.status, 0); assert.match(ok.posts, new RegExp(`statuses/${head} -f state=success`));
  const bad = runStep(JSON.stringify({ verdict: "FAIL", reason: "1 risk_class: exactly one" }), 1);
  assert.equal(bad.status, 1); assert.match(bad.stdout, /"verdict":"FAIL"/); assert.match(bad.posts, new RegExp(`statuses/${head} -f state=failure`));
});
test("status step under bash -e: unreadable gate output still posts failure, and a failed status post fails the step", () => {
  const empty = runStep("", 1);
  assert.equal(empty.status, 1); assert.match(empty.posts, /state=failure .*no readable result/);
  assert.notEqual(runStep(JSON.stringify({ verdict: "PASS", risk_class: "R1" }), 0, true).status, 0);
});
