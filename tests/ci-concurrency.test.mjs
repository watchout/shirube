// U1 u1-ci-concurrency: ci.yml cancels an older run of the same pull request and nothing else.
// The tests read ci.yml as text (no YAML dependency) and judge only the added concurrency block and where it sits;
// what the rest of ci.yml must look like is already held by BR7.2 in workflow-contract.test.mjs, so it is compared (T7, T8), not copied (S3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const strip = (text) => text.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n"); // comments may mention any word

// A section is a key at column 0 and every line after it up to the next such key (blank lines stay with the section before them).
function sections(text) {
  const out = [];
  for (const line of text.split("\n")) {
    const key = /^([A-Za-z_-]+):/.exec(line)?.[1];
    if (key) out.push({ key, lines: [line] });
    else if (out.length > 0) out.at(-1).lines.push(line);
  }
  return out;
}
const without = (text) => sections(text).filter((s) => s.key !== "concurrency").flatMap((s) => s.lines).join("\n");

// The one top-level concurrency block, or a thrown reason. A nested, inline, duplicated or partial block is not accepted.
function readConcurrency(raw) {
  const text = strip(raw), found = sections(text).filter((s) => s.key === "concurrency");
  assert.equal(found.length, 1, `exactly one top-level concurrency, found ${found.length}`);
  const body = found[0].lines.join("\n");
  const field = (name) => {
    const m = new RegExp(`^ {2}${name}: (.+)$`, "m").exec(body);
    assert.ok(m, `${name} line is missing`);
    return m[1].trim();
  };
  return { text, section: found[0], body, group: field("group"), cancel: field("cancel-in-progress") };
}

const ALLOWED_CONTEXT = new Set(["github.event_name", "github.event.pull_request.number", "github.run_id"]);
const contexts = (expr) => [...expr.matchAll(/\bgithub(?:\.[A-Za-z_]+)+/g)].map((m) => m[0]);
function groupProblems(group) {
  const used = contexts(group), problems = [];
  if (!group.startsWith("ci-")) problems.push("prefix");
  if (!used.includes("github.event.pull_request.number")) problems.push("no-pr-number");
  if (!used.includes("github.run_id")) problems.push("no-run-id");
  for (const c of used) if (!ALLOWED_CONTEXT.has(c)) problems.push(`context:${c}`);
  return problems;
}
const cancelProblems = (cancel) => (cancel === "${{ github.event_name == 'pull_request' }}" ? [] : ["cancel-expression"]);

const FORBIDDEN_IN_ADDED = [
  ["continue-on-error", /continue-on-error/], ["or-true", /\|\|\s*true/], ["if-present", /--if-present/],
  ["permissions", /permissions/], ["uses", /\buses:/], ["secrets", /secrets\./], ["pull_request_target", /pull_request_target/],
  ["trigger-item", /^\s*(pull_request|push|workflow_dispatch|branches|on):/m],
];
const forbiddenIn = (block) => FORBIDDEN_IN_ADDED.filter(([, re]) => re.test(block)).map(([name]) => name);

const ci = read(".github/workflows/ci.yml");

test("T1: ci.yml has one top-level concurrency block right after permissions and before jobs; the group is built from the pull request number and starts with ci-", () => {
  const c = readConcurrency(ci), keys = sections(c.text).map((s) => s.key), at = keys.indexOf("concurrency");
  assert.equal(keys[at - 1], "permissions", "right after the top-level permissions");
  assert.equal(keys[at + 1], "jobs", "right before jobs, never inside on:");
  assert.deepEqual(groupProblems(c.group), []);
  assert.deepEqual(cancelProblems(c.cancel), []);
});

test("T2 N1: only a pull_request run is cancelled; push and workflow_dispatch are not, and a fixed true is rejected", () => {
  assert.deepEqual(cancelProblems(readConcurrency(ci).cancel), []);
  for (const bad of ["true", "${{ true }}", "${{ github.event_name != 'pull_request' }}", "${{ github.event_name == 'push' }}", "${{ github.event_name }}"]) {
    assert.deepEqual(cancelProblems(bad), ["cancel-expression"], bad);
  }
  assert.ok(contexts(readConcurrency(ci).group).includes("github.run_id"), "a run outside a pull request gets its own group per run");
});

test("T3 N2: the group uses no value an author can choose (branch name, title, author, ref, head)", () => {
  for (const bad of ["github.head_ref", "github.ref", "github.ref_name", "github.actor", "github.sha", "github.event.pull_request.title", "github.event.pull_request.head.ref", "github.event.pull_request.user.login"]) {
    const problems = groupProblems(`ci-\${{ format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) || ${bad} }}`);
    assert.deepEqual(problems, [`context:${bad}`], bad);
  }
});

test("T4 N3: the ci- prefix overlaps no group of another workflow, and the reusable hygiene workflow adds no concurrency", () => {
  const ours = readConcurrency(ci).group, literal = (g) => g.split("${{")[0];
  const others = readdirSync(resolve(root, ".github/workflows")).filter((f) => f.endsWith(".yml") && f !== "ci.yml");
  const groups = others.flatMap((f) => [...strip(read(`.github/workflows/${f}`)).matchAll(/^\s*group: (.+)$/gm)].map((m) => m[1]));
  assert.ok(groups.length > 0, "another workflow with a group exists, so the overlap check is not vacuous");
  for (const g of groups) assert.ok(!g.startsWith(literal(ours)) && !ours.startsWith(literal(g)), `no overlap with ${g}`);
  assert.doesNotMatch(strip(read(".github/workflows/hygiene.yml")), /concurrency/);
});

test("T5 N4: the added lines (the concurrency block) hide no failure and touch no permission, step, secret or trigger", () => {
  assert.deepEqual(forbiddenIn(readConcurrency(ci).body), []);
  for (const [name, bad] of [["continue-on-error", "  continue-on-error: true"], ["or-true", "  x: a || true"], ["if-present", "  x: npm --if-present"], ["permissions", "  permissions: write-all"],
    ["uses", "  uses: a/b@v1"], ["secrets", "  x: ${{ secrets.T }}"], ["pull_request_target", "  x: pull_request_target"], ["trigger-item", "  push:"]]) {
    assert.deepEqual(forbiddenIn(`concurrency:\n  group: g\n${bad}`), [name], name);
  }
});

test("T6 N5: a ci.yml that cannot be read as one top-level concurrency block fails, and is never read as success", () => {
  const block = "concurrency:\n  group: ci-x\n  cancel-in-progress: false\n";
  const cases = [
    ["", /found 0/], ["name: ci\njobs:\n  test:\n    runs-on: x\n", /found 0/],
    ["jobs:\n  test:\n    concurrency:\n      group: ci-x\n      cancel-in-progress: false\n", /found 0/],
    [`${block}${block}`, /found 2/], ["concurrency:\n  cancel-in-progress: false\n", /group line is missing/],
    ["concurrency:\n  group: ci-x\n", /cancel-in-progress line is missing/], ["concurrency: ci-x\n", /group line is missing/],
  ];
  for (const [text, reason] of cases) assert.throws(() => readConcurrency(text), reason, JSON.stringify(text));
});

test("T7 reverse: taking the concurrency block away leaves ci.yml as it was, and the reader then reports no concurrency", () => {
  const c = readConcurrency(ci), lines = c.text.split("\n"), start = lines.indexOf("concurrency:");
  const stripped = without(c.text);
  assert.throws(() => readConcurrency(stripped), /found 0/);
  assert.deepEqual(stripped.split("\n"), lines.filter((_, i) => i < start || i >= start + c.section.lines.length), "only the block's own lines are gone");
  assert.ok(c.section.lines.every((l) => l === "" || l === "concurrency:" || l.startsWith("  ")), "the block holds only its key and indented lines");
});

test("T8 coexist: the other top-level parts are untouched by the block, and no concurrency sits inside on: or a job", () => {
  const c = readConcurrency(ci), others = sections(c.text).filter((s) => s.key !== "concurrency");
  assert.deepEqual(others, sections(without(c.text)), "the parts outside the block are identical with and without it");
  for (const s of others) assert.doesNotMatch(s.lines.join("\n"), /^\s+concurrency:/m, `no concurrency inside ${s.key}`);
  assert.equal(without(c.text), others.flatMap((s) => s.lines).join("\n"));
});
