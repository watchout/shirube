// Contract of the reusable workflow (handover v5 §12 T2: inputs/outputs are the contract, versioned by commit).
// Also the S8 guard (no failure hiding) and the callee-identity rule (audit B01).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const wf = readFileSync(resolve(import.meta.dirname, "../.github/workflows/hygiene.yml"), "utf8");
const ci = readFileSync(resolve(import.meta.dirname, "../.github/workflows/ci.yml"), "utf8");
const body = wf.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n"); // comments may mention forbidden words

test("hygiene.yml declares the six inputs and the optional read token", () => {
  for (const key of ["profile:", "targets:", "node-version:", "package-manager:", "bun-version:", "python:"]) assert.match(wf, new RegExp(`\\n\\s+${key}`));
  assert.match(wf, /SHIRUBE_READ_TOKEN:\n\s+required: false/);
});

test("AB-24: dependencies come from the consumer's lockfile by package manager — npm ci or bun install --frozen-lockfile, anything else exits 2; the npm cache is used only for npm", () => {
  assert.match(body, /case "\$\{\{ inputs\.package-manager \}\}" in\n\s+npm\) npm ci ;;\n\s+bun\) bun install --frozen-lockfile ;;\n\s+\*\) echo '\{"check":"install","verdict":"UNOBSERVABLE"[^\n]*; exit 2 ;;/);
  assert.match(body, /cache: \$\{\{ inputs\.package-manager == 'npm' && 'npm' \|\| '' \}\}/);
  assert.match(body, /if: \$\{\{ inputs\.package-manager == 'bun' \}\}\n\s+uses: oven-sh\/setup-bun@v2/);
  assert.doesNotMatch(body, /npm install\b/);
});

test("B01: tools are checked out from the callee's own repository and commit, never from the caller's context", () => {
  assert.match(body, /repository: \$\{\{ job\.workflow_repository \}\}/);
  assert.match(body, /ref: \$\{\{ job\.workflow_sha \}\}/);
  assert.doesNotMatch(body, /github\.workflow_sha|github\.workflow_ref/);
  assert.match(body, /test "\$\{\{ job\.workflow_repository \}\}" = "watchout\/shirube"/);
  assert.match(body, /rev-parse HEAD\)" = "\$\{\{ job\.workflow_sha \}\}"/);
});

test("workflows hide no failures (S8): no continue-on-error, no || true, no if-present on required steps", () => {
  for (const text of [body, ci]) {
    assert.doesNotMatch(text, /continue-on-error/);
    assert.doesNotMatch(text, /\|\|\s*true/);
    assert.doesNotMatch(text, /--if-present/);
  }
});

test("gitleaks, ruff and vulture are pinned; the guard run disables inline config; every script gets the profile and the clock", () => {
  assert.match(wf, /GITLEAKS_VERSION: 8\.30\.1/);
  assert.match(wf, /GITLEAKS_SHA256_LINUX_X64: [0-9a-f]{64}/);
  assert.match(wf, /sha256sum -c -/);
  assert.match(wf, /"ruff==\$\{RUFF_VERSION\}" "vulture==\$\{VULTURE_VERSION\}"/);
  assert.match(body, /--ignore-gitleaks-allow --exit-code 0 [^\n]*--report-format json --report-path \.hygiene\/gitleaks-allowed\.json/);
  assert.match(wf, /eslint --no-inline-config --max-warnings 0 --config "\$SHIRUBE_TOOLS\/configs\/guard-only\.config\.mjs"/);
  const scriptSteps = body.match(/node "\$SHIRUBE_TOOLS\/scripts\/hygiene\/[a-z-]+\.mjs"[^\n]*/g);
  assert.equal(scriptSteps.length, 6);
  for (const s of scriptSteps) { assert.match(s, /--profile "\$SHIRUBE_PROFILE"/); assert.match(s, /--today/); }
});

test("AB-05 is declared pull_request-only: the PR size step runs on pull_request, a NOT_APPLICABLE line runs otherwise, and no other check is conditioned on the event", () => {
  assert.match(body, /name: PR size \(AB-05\) — pull_request only\n\s+id: prsize\n\s+if: \$\{\{ !cancelled\(\) && steps\.refs\.outcome == 'success' && github\.event_name == 'pull_request' \}\}\n\s+run: node "\$SHIRUBE_TOOLS\/scripts\/hygiene\/pr-size\.mjs"/);
  assert.match(body, /name: PR size \(AB-05\) — not applicable on push\n\s+id: prsize_na\n\s+if: \$\{\{ !cancelled\(\) && steps\.refs\.outcome == 'success' && github\.event_name != 'pull_request' \}\}\n\s+run: echo '\{"check":"pr-size","verdict":"NOT_APPLICABLE"/);
  const conditioned = body.match(/^\s+if: .*$/gm).map((l) => l.trim());
  assert.deepEqual(conditioned.filter((l) => l.includes("github.event_name")), [`${RUN_AFTER_FAILURE} && github.event_name == 'pull_request' }}`, `${RUN_AFTER_FAILURE} && github.event_name != 'pull_request' }}`]);
  assert.deepEqual(conditioned.filter((l) => !l.startsWith(RUN_AFTER_FAILURE)), ["if: ${{ inputs.package-manager == 'bun' }}", "if: ${{ always() }}"]);
});

const RUN_AFTER_FAILURE = "if: ${{ !cancelled() && steps.refs.outcome == 'success'";
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function checkAllOutcomes(text) {
  const steps = text.split(/\n(?=\s+- name: )/).filter((s) => /^\s+- name: /.test(s));
  const summary = steps.at(-1);
  assert.match(summary, /\n\s+if: \$\{\{ always\(\) \}\}\n/);
  const checks = steps.filter((s) => s.includes(RUN_AFTER_FAILURE));
  const id = (s) => s.match(/\n\s+id: ([a-z_]+)\n/)?.[1];
  const afterRefs = steps.slice(steps.findIndex((s) => id(s) === "refs") + 1, -1);
  assert.deepEqual(checks, afterRefs, "every check after setup must keep its condition");
  assert.ok(checks.length > 0);
  for (const s of checks) assert.match(s, new RegExp(`\\n\\s+id: [a-z_]+\\n\\s+${escape(RUN_AFTER_FAILURE)}`));
  const outcomes = [...summary.matchAll(/([a-z-]+)=\$\{\{ steps\.([a-z_]+)\.outcome \}\}/g)];
  assert.deepEqual(outcomes.map((m) => m[2]).sort(), checks.map(id).sort(), "exact check/outcome set");
  assert.equal(new Set(outcomes.map((m) => m[1])).size, outcomes.length, "unique summary labels");
  const label = (checkId) => outcomes.find((m) => m[2] === checkId)?.[1];
  const unconditional = checks.filter((s) => s.includes(`${RUN_AFTER_FAILURE} }}`)).map(id);
  assert.equal(unconditional.length, 9);
  const loop = summary.match(/for k in ([a-z -]+); do/)?.[1].split(/\s+/);
  assert.deepEqual(loop?.sort(), unconditional.map(label).sort(), "aggregate covers unconditional checks");
  assert.match(summary, /\[ "\$\(get "\$k"\)" = success \] \|\| \{[^\n]*fail=1; \}/);
  const pair = checks.filter((s) => s.includes(`${RUN_AFTER_FAILURE} && github.event_name`)).map(id);
  assert.deepEqual(pair, ["prsize", "prsize_na"]);
  assert.match(summary, new RegExp(escape(`[ "$(get ${label(pair[0])})" = success ] || [ "$(get ${label(pair[1])})" = success ] || {`) + "[^\\n]*fail=1; \\}"));
  assert.deepEqual(checks.filter((s) => s.includes("&& inputs.python")).map(id), ["python"]);
  assert.match(summary, new RegExp(escape(`[ "$(get ${label("python")})" = success ] || [ "$(get ${label("python")})" = skipped ] || {`) + "[^\\n]*fail=1; \\}"));
  assert.match(summary, /\n\s+exit \$fail\n?$/);
  return summary;
}

test("AB-27: derived checks, outcome list and all three aggregate rules agree", () => checkAllOutcomes(body));

const mutations = [
  ["drop a check condition", body.replace(/(id: lines\n)\s+if: [^\n]*\n/, "$1")],
  ["drop lines outcome", body.replace(/^\s+lines=\$\{\{ steps\.lines\.outcome \}\}\n/m, "")],
  ["drop PR-size aggregate", body.replace(/^.*\[ "\$\(get pr-size\)" = success \].*\n/m, "")],
  ["drop lines from aggregate loop", body.replace("for k in coverage lines ", "for k in coverage ")],
  ["new check without outcome", body.replace("      - name: Outcome of every check", `      - name: New check\n        id: audit_new\n        ${RUN_AFTER_FAILURE} }}\n        run: echo audit\n\n      - name: Outcome of every check`)],
];
for (const [name, fixture] of mutations) test(`AB-27 mutation: ${name}`, () => {
  assert.notEqual(fixture, body, "fixture must change the workflow");
  assert.throws(() => checkAllOutcomes(fixture), assert.AssertionError);
});

// A6 exercises the actual shell, not a second implementation of its decision rules.
const shell = checkAllOutcomes(body).split("        run: |\n")[1].replace(/^          /gm, "");
const required = ["coverage", "lines", "large-files", "jscpd", "knip", "depcruise", "structural", "guard", "secrets"];
const normal = { ...Object.fromEntries(required.map((k) => [k, "success"])), "pr-size": "success", "pr-size-not-applicable": "skipped", python: "success" };
const cases = [["all success", {}, 0]];
for (const key of required) for (const outcome of ["failure", "cancelled", "skipped", ""]) cases.push([`${key}=${outcome || "missing"}`, { [key]: outcome }, 1]);
cases.push(
  ["PR-size both skipped", { "pr-size": "skipped" }, 1],
  ["PR-size PR success", {}, 0],
  ["PR-size push success", { "pr-size": "skipped", "pr-size-not-applicable": "success" }, 0],
  ["PR-size both missing", { "pr-size": "", "pr-size-not-applicable": "" }, 1],
);
for (const outcome of ["success", "skipped", "failure", "cancelled", ""]) cases.push([`python=${outcome || "missing"}`, { python: outcome }, ["success", "skipped"].includes(outcome) ? 0 : 1]);
cases.push(["setup failed", Object.fromEntries(Object.keys(normal).map((k) => [k, "skipped"])), 1]);
assert.equal(cases.length, 47);
for (const [name, patch, exit] of cases) test(`A6 aggregate shell: ${name}`, () => {
  const dir = mkdtempSync(resolve(tmpdir(), "shirube-outcomes-"));
  try {
    const outcomes = Object.entries({ ...normal, ...patch }).map(([k, v]) => `${k}=${v}`).join("\n");
    const summaryPath = resolve(dir, "summary");
    const result = spawnSync("bash", ["-c", shell], { encoding: "utf8", timeout: 10000,
      env: { PATH: process.env.PATH, OUTCOMES: outcomes, GITHUB_STEP_SUMMARY: summaryPath } });
    assert.ifError(result.error);
    assert.equal(result.status, exit, result.stdout + result.stderr);
    const summary = readFileSync(summaryPath, "utf8");
    assert.equal(summary, outcomes + "\n");
    assert.equal(summary.trimEnd().split("\n").length, 12);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// U1 P1 (iyasaka-arc#49 6377584568): shirube runs its own gate from a pinned commit, report-only, and floors coverage in CI.
const file = (p) => readFileSync(resolve(import.meta.dirname, "..", p), "utf8");
const strip = (t) => t.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
const job = (t, n) => t.match(new RegExp(`\\n  ${n}:(\\n[\\s\\S]*?)(?=\\n  [a-z-]+:\\n|$)`))?.[1] ?? "";
const perms = (t) => Object.fromEntries([...t.matchAll(/\n +([a-z-]+): (read|write)(?=\n)/g)].map((m) => [m[1], m[2]]));
const COVERAGE = "node --test --experimental-test-coverage --test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs";

test("BR7.1 NFR4.1 NFR10.1: shirube's own gate is report-only, calls the pinned reusable gate on pull_request_target, never checks out the PR, and writes statuses only", () => {
  const t = strip(file(".github/workflows/sds-gate-self.yml")), pin = JSON.parse(file(".shirube/sds-pin.json"));
  assert.match(pin.sds_commit, /^[a-f0-9]{40}$/);
  assert.deepEqual([pin.schema, pin.plan_binding_mode, pin.design_binding_mode], ["sds-pin/1", "report-only", "report-only"]);
  for (const [p, sha] of Object.entries(pin.files)) assert.equal(createHash("sha256").update(file(p)).digest("hex"), sha, p);
  assert.match(t, /\non:\n\s+pull_request_target:\n[\s\S]*\n\s+issue_comment:\n/);
  assert.match(t, new RegExp(`uses: watchout/shirube/\\.github/workflows/sds-gate\\.yml@${pin.sds_commit}\\n`));
  assert.doesNotMatch(t, /actions\/checkout/);
  assert.deepEqual(perms(t), { actions: "read", checks: "read", contents: "read", issues: "read", "pull-requests": "read", statuses: "write" });
});

test("BR7.2 NFR8.2 NFR10.3: ci.yml floors scripts/** coverage at 80% on Node 26, drops permissions at the top, and measures read-only off pull requests", () => {
  const t = strip(ci), tests = job(t, "test"), measure = job(t, "measure");
  assert.match(t, /\npermissions: \{\}\n/);
  assert.match(t, /\n {2}push:\n {4}branches: \[main\]\n {2}workflow_dispatch:\n/);
  assert.match(tests, /node-version: "26"/);
  assert.ok(tests.includes(`run: ${COVERAGE}`) && tests.indexOf("run: npm ci") < tests.indexOf(`run: ${COVERAGE}`), "coverage runs after npm ci");
  assert.equal(JSON.parse(file("package.json")).engines.node, ">=22");
  for (const n of ["test", "hygiene"]) assert.deepEqual(perms(job(t, n)), { contents: "read" });
  assert.deepEqual(perms(measure), { contents: "read", actions: "read", "pull-requests": "read", statuses: "read" });
  assert.match(measure, /if: \$\{\{ github\.event_name != 'pull_request' \}\}/);
  assert.match(measure, /if: \$\{\{ hashFiles\('scripts\/sds\/metrics\/cli\.mjs'\) != '' \}\}[\s\S]*run: node scripts\/sds\/metrics\/cli\.mjs --repos watchout\/shirube /);
  assert.doesNotMatch(measure, /secrets\./);
});

// U4 T15 (docs/design/u4-gate-judgements.md §3.2, §4): the merging seat's four checks of a unit design are written in distribution.md §4.1, as sentences.
const UNIT_DESIGN_CHECKS = [["1a", ["design_pr", "統合済み"]], ["1b", ["design_pr", "audit", "返却", "PASS", "受領"]], ["1c", ["依頼", "design_pr", "統合した head", "名指"]], ["1d", ["design_sha256", "SHA-256"]]];
const judgment5Row = (t) => t.split("\n").find((l) => l.startsWith("| 設計の版の承認・未決の答え・主要な接続の順（判定 5")) ?? "";
const sentenceOf = (row, tag) => row.match(new RegExp(`\\(${tag}\\)[^。]*。`))?.[0] ?? "";
const missingChecks = (t) => UNIT_DESIGN_CHECKS.filter(([tag, words]) => !words.every((w) => sentenceOf(judgment5Row(t), tag).includes(w))).map(([tag]) => tag);

test("T15: distribution.md §4.1 tells the merging seat the four checks of a unit design, and to record them and not merge on any mismatch", () => {
  const dist = file("docs/sds/distribution.md"), row = judgment5Row(dist);
  assert.notEqual(row, "", "the judgment 5 row of §4.1 exists");
  assert.deepEqual(missingChecks(dist), []);
  assert.match(row, /kind: "unit_design"/);
  assert.match(row, /\(1a\)〜\(1d\) の 1 つでも合わなければ merge しない/);
  assert.match(row, /merge の記録に書き/);
  assert.match(dist, /作る単位の設計の記録の PR（R1）は、監査の依頼を出した後に、自分の PR 本文の `sds-pr` の block に `audit`[^。]*書いてから統合する/);
});

for (const [tag, words] of UNIT_DESIGN_CHECKS) test(`T15 mutation: check (${tag}) is reported missing when its sentence, or any key word of it, is removed`, () => {
  const dist = file("docs/sds/distribution.md"), row = judgment5Row(dist), sentence = sentenceOf(row, tag);
  assert.notEqual(sentence, "", `sentence (${tag}) exists`);
  for (const weaker of ["", ...words.map((w) => sentence.replaceAll(w, ""))]) {
    assert.notEqual(weaker, sentence, "the mutation must change the sentence");
    assert.deepEqual(missingChecks(dist.replace(row, () => row.replace(sentence, () => weaker))), [tag]);
  }
});
