import test from "node:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { failure, gate } from "../scripts/sds/gate.mjs";
import { parseYaml } from "../scripts/sds/yaml.mjs";

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

// Judgment 4, plan binding: T4-01..T4-32 of the ARC 5-section v1.1 (iyasaka-arc#57 6176441018 §3, §4). Plan = comment 11,
// control_handoff = comment 12; the real ruby reader reads them unless a test replaces it.
const A9 = "DP-N3-A9-OBSERVATION-COLUMNS", MARK = "<!-- shirube-v3:control-handoff:X -->", keep = (x) => x;
const PLAN_REF = `https://github.com/${REPO}/issues/1#issuecomment-11`, HANDOFF_REF = `https://github.com/${REPO}/issues/1#issuecomment-12`;
const PLAN = ["schema_version: shirube-delivery-plan/v1", "plan_id: DP-AUN-ROUTE-001", "generation: 2", "status: ADMITTED",
  "owner_outcome: {terminal_predicates: [{id: S1-EXCHANGE-LOOP}, {id: S1-IDEMPOTENT-RECOVERY}]}",
  "delivery_graph: {nodes: [{id: DP-N2-A8-RECLAIM, repository: watchout/kodama, depends_on: [], lifecycle_status: COMPLETE, changes_predicates: [S1-EXCHANGE-LOOP]},",
  `  {id: ${A9}, repository: watchout/kodama, depends_on: [DP-N2-A8-RECLAIM], lifecycle_status: PLANNED, changes_predicates: [S1-EXCHANGE-LOOP, S1-IDEMPOTENT-RECOVERY]}]}`].join("\n");
const HANDOFF = (planBody) => ["schema_version: shirube-v3/control_handoff/v1", "cell: {id: X}",
  `plan_binding: {plan_id: DP-AUN-ROUTE-001, generation: 2, node_id: ${A9}, changes_predicates: [S1-EXCHANGE-LOOP], plan_comment_ref: "${PLAN_REF}", plan_comment_sha256: "${sha(planBody)}"}`,
  "allowed_paths: [src/**]"].join("\n");
const fence = (yaml) => `\`\`\`yaml\n${yaml}\n\`\`\`\n`;
// o: plan / handoff (edit the yaml), wrap (the handoff body around its yaml), tamper (edit a served body), binding / block (the PR block), mode / basePin
function bound(o = {}) {
  const planBody = `## delivery plan\n\n${fence((o.plan ?? keep)(PLAN))}`;
  const handoffBody = (o.wrap ?? ((y) => `${MARK}\n\n${fence(y)}`))((o.handoff ?? keep)(HANDOFF(planBody)));
  const binding = { comment_ref: PLAN_REF, comment_sha256: sha(planBody), plan_id: "DP-AUN-ROUTE-001", generation: 2, node_id: A9, ...o.binding };
  const block = { delivery_plan_binding: binding, control_handoff: { ref: HANDOFF_REF, sha256: sha(handoffBody) }, ...o.block };
  const f = fixture({ ...o, block, basePin: "basePin" in o ? o.basePin : JSON.stringify({ plan_binding_mode: o.mode ?? "report-only" }) });
  const api = f.api, bodies = { 11: planBody, 12: handoffBody };
  f.calls = [];
  f.api = (path) => {
    f.calls.push(path);
    const id = /^repos\/watchout\/kodama\/issues\/comments\/(1[12])$/.exec(path)?.[1];
    return id ? { body: (o.tamper ?? keep)(bodies[id], id) } : api(path);
  };
  return f;
}
const run4 = (o, parse) => { const f = bound(o); return { ...gate({ repo: REPO, pr: 7 }, f.api, 0, accepted, parse), calls: f.calls }; };
const fail4 = (o, parse) => { try { run4(o, parse); } catch (error) { return failure(error, {}); } return assert.fail("the gate passed"); };
const fetched = (r) => r.calls.filter((c) => /comments\/1[12]$/.test(c));
const PB = { plan_id: "DP-AUN-ROUTE-001", generation: 2, node_id: A9, changes_predicates: ["S1-EXCHANGE-LOOP"] };
const r2 = (pb) => {
  const request = { targets: [{ repo: REPO, pr: 7, head }], ...(pb && { plan_binding: pb }) };
  return { labels: ["risk:R2"], request, block: { risk_class: "R2", audit: audit(request) } };
};

test("T4-01 everything binds, report-only: PASS, and plan_id, generation and node_id are copied", () => {
  const r = run4();
  assert.equal(r.verdict, "PASS");
  assert.deepEqual(r.plan_binding, { mode: "report-only", result: "PASS", plan_id: "DP-AUN-ROUTE-001", generation: 2, node_id: A9 });
});
test("T4-02 everything binds, blocking: PASS", () => {
  const r = run4({ mode: "blocking" });
  assert.equal(r.verdict, "PASS"); assert.equal(r.plan_binding.result, "PASS");
});
test("T4-03 no delivery_plan_binding, report-only: the verdict stays PASS and plan_binding FAILs 4.1", () => {
  const r = run4({ block: { delivery_plan_binding: undefined } });
  assert.equal(r.verdict, "PASS"); assert.equal(r.plan_binding.result, "FAIL"); assert.match(r.plan_binding.reason, /^4\.1 /);
});
test("T4-04 no delivery_plan_binding, blocking: the verdict FAILs with `4 plan binding: 4.1`", () => {
  const r = fail4({ mode: "blocking", block: { delivery_plan_binding: undefined } });
  assert.equal(r.verdict, "FAIL"); assert.match(r.reason, /^4 plan binding: 4\.1 /); assert.equal(r.plan_binding.result, "FAIL");
});
test("T4-05 a comment_ref of another shape FAILs 4.2 and no comment is fetched", () => {
  const r = run4({ binding: { comment_ref: "https://github.com/watchout/aun/issues/comments/1" } });
  assert.match(r.plan_binding.reason, /^4\.2 /); assert.doesNotMatch(r.plan_binding.reason, /unexpected/); assert.deepEqual(fetched(r), []);
});
const handoffPredicates = (list) => ({ handoff: (y) => y.replace("changes_predicates: [S1-EXCHANGE-LOOP]", `changes_predicates: [${list}]`) });
const misses = [ // report-only: the verdict stays PASS, plan_binding FAILs with this reason
  ["T4-06", "a plan body changed by one byte", { tamper: (b, id) => (id === "11" ? `${b} ` : b) }, /^4\.3 /],
  ["T4-07", "a DRAFT plan", { plan: (p) => p.replace("status: ADMITTED", "status: DRAFT") }, /^4\.5 /],
  ["T4-08", "a node_id that is not in the plan", { binding: { node_id: "DP-N9-NONE" } }, /^4\.6 /],
  ["T4-09", "a node of watchout/aun for a kodama PR", { plan: (p) => p.replace(`${A9}, repository: watchout/kodama`, `${A9}, repository: watchout/aun`) }, /^4\.7 /],
  ["T4-10", "a depends_on node that is PLANNED", { plan: (p) => p.replace("lifecycle_status: COMPLETE", "lifecycle_status: PLANNED") }, /^4\.8 /],
  ["T4-11", "a handoff body that differs from control_handoff.sha256", { tamper: (b, id) => (id === "12" ? `${b} ` : b) }, /^4\.9 /],
  ["T4-12", "a handoff without the marker (N0)", { wrap: (y) => fence(y) }, /^4\.10 CHANDOFF-REF-005/],
  ["T4-13", "a marker and no block (N1)", { wrap: () => `${MARK}\nno block` }, /^4\.10 CHANDOFF-REF-006/],
  ["T4-14", "two different blocks (N2)", { wrap: (y) => `${MARK}\n${fence(y)}${fence(y.replace("[src/**]", "[lib/**]"))}` }, /^4\.10 CHANDOFF-REF-007/],
  ["T4-15", "only the rapid-lite schema (N3)", { handoff: (y) => y.replace("shirube-v3/control_handoff/v1", "shirube-control-handoff/rapid-lite/v1") }, /^4\.10 CHANDOFF-REF-009/],
  ["T4-17", "a handoff of generation 1 for a PR of generation 2", { handoff: (y) => y.replace("generation: 2", "generation: 1") }, /^4\.11 /],
  ["T4-18", "an unquoted 64-digit plan_comment_sha256", { handoff: (y) => y.replace(/plan_comment_sha256: "\w+"/, `plan_comment_sha256: ${"1".repeat(64)}`) }, /^4\.12 /],
  ["T4-19", "empty changes_predicates", handoffPredicates(""), /^4\.13 /],
  ["T4-20", "a predicate in neither the node nor the terminal predicates", handoffPredicates("S1-ENTRY"), /^4\.13 /],
  ["T4-21", "a changed path outside allowed_paths", { files: ["src/exchange/decide.mjs", "docs/x.md"], block: { changed_paths: ["src/exchange/decide.mjs", "docs/x.md"] } }, /^4\.17 \D*: docs\/x\.md$/],
  ["T4-22", "a rename out of allowed_paths", { files: [{ filename: "lib/a.ts", previous_filename: "src/a.ts" }], block: { changed_paths: ["src/a.ts", "lib/a.ts"] } }, /^4\.17 \D*: lib\/a\.ts$/],
  ["T4-28", "R2 with an audit request without plan_binding", r2(null), /^4\.14 /],
  ["T4-29", "R2 with an audit request for node DP-N2-A8-RECLAIM", r2({ ...PB, node_id: "DP-N2-A8-RECLAIM" }), /^4\.15 /],
  ["T4-30", "R2 with an audit request predicate S1-CYCLE", r2({ ...PB, changes_predicates: ["S1-CYCLE"] }), /^4\.16 /],
  ["4.10 (008)", "a handoff block that is not valid YAML", { handoff: (y) => `${y}\nbroken: [` }, /^4\.10 CHANDOFF-REF-008/],
  ["4.13 (terminal)", "a node predicate that is not terminal", { plan: (p) => p.replace("PLANNED, changes_predicates: [", "PLANNED, changes_predicates: [S1-LOCAL, "), ...handoffPredicates("S1-LOCAL") }, /^4\.13 /],
  ["4.17 (rename in)", "a rename into allowed_paths from outside", { files: [{ filename: "src/a.ts", previous_filename: "lib/a.ts" }], block: { changed_paths: ["src/a.ts", "lib/a.ts"] } }, /^4\.17 \D*: lib\/a\.ts$/],
];
for (const [id, name, o, why] of misses) {
  test(`${id} ${name}: plan_binding FAILs ${why.source.slice(1, 12)} and report-only keeps the verdict`, () => {
    const r = run4(o);
    assert.equal(r.verdict, "PASS"); assert.equal(r.plan_binding.result, "FAIL"); assert.match(r.plan_binding.reason, why);
  });
}
test("T4-16 two identical blocks (N4): PASS with the W001 warning", () => {
  const r = run4({ wrap: (y) => `${MARK}\n${fence(y)}${fence(y)}` });
  assert.equal(r.plan_binding.result, "PASS"); assert.match(r.plan_binding.warnings.join(), /CHANDOFF-REF-W001/);
});
test("T4-18 ruby reads the unquoted 64-digit digest as a number, so it is not the string the PR names", () => {
  assert.equal(typeof parseYaml(`plan_comment_sha256: ${"1".repeat(64)}`).plan_comment_sha256, "number");
});
test("T4-31 R2 with an audit request whose plan_binding matches: PASS", () => {
  const r = run4(r2(PB));
  assert.equal(r.verdict, "PASS"); assert.equal(r.plan_binding.result, "PASS"); assert.ok(r.calls.includes(`repos/${REPO}/issues/comments/1`));
});
test("T4-32 R1 without an audit request: PASS, and step 8 is skipped", () => {
  const r = run4();
  assert.equal(r.plan_binding.result, "PASS"); assert.ok(!r.calls.includes(`repos/${REPO}/issues/comments/1`));
});
test("T4-23 plan_binding_mode off: NOT_CHECKED, the verdict of judgments 1-3, and no comment is fetched", () => {
  const r = run4({ mode: "off" });
  assert.equal(r.verdict, "PASS"); assert.equal(r.plan_binding.result, "NOT_CHECKED"); assert.deepEqual(fetched(r), []);
});
test("T4-24 no base pin (404): judgment 4 runs as report-only", () => {
  const r = run4({ basePin: undefined });
  assert.equal(r.plan_binding.mode, "report-only"); assert.equal(r.plan_binding.result, "PASS");
});
test("T4-25 judgment 2 FAILs: the verdict FAILs for judgment 2 and plan_binding is NOT_CHECKED", () => {
  const r = fail4({ block: { changed_paths: ["src/b.ts"] } });
  assert.match(r.reason, /^2 changed paths/); assert.equal(r.plan_binding.result, "NOT_CHECKED");
});
test("T4-26 a protected path in an R1 PR stays effective R4 when the plan binds", () => {
  const o = { ...r2(PB), labels: ["risk:R1"], files: [".github/workflows/x.yml"], handoff: (y) => y.replace("[src/**]", "[.github/workflows/**]") };
  const r = run4({ ...o, block: { ...o.block, risk_class: "R1", changed_paths: [".github/workflows/x.yml"] } });
  assert.equal(r.verdict, "PASS"); assert.equal(r.plan_binding.result, "PASS"); assert.equal(r.effective_risk, "R4");
});
test("T4-27 a YAML reader that cannot run FAILs closed: `yaml reader unavailable`", () => {
  const noRuby = () => { throw new Error("spawnSync ruby ENOENT"); };
  assert.equal(run4({}, noRuby).plan_binding.reason, "yaml reader unavailable");
  assert.equal(fail4({ mode: "blocking" }, noRuby).reason, "4 plan binding: yaml reader unavailable");
});
test("parseYaml: ruby reads YAML here; without ruby it is unavailable; a YAML error is a SyntaxError", () => {
  assert.deepEqual(parseYaml("a: [1, b]"), { a: [1, "b"] });
  assert.throws(() => parseYaml("a: [1"), SyntaxError);
  const path = process.env.PATH;
  process.env.PATH = "";
  try { assert.throws(() => parseYaml("a: 1"), /^Error: yaml reader unavailable$/); } finally { process.env.PATH = path; }
});
test("a plan_binding_mode the pin does not define FAILs closed", () => {
  assert.match(fail4({ mode: "strict" }).reason, /^4 plan binding: plan_binding_mode must be/);
});
