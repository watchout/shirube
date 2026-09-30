// Contract of the reusable workflow (handover v5 §12 T2: inputs/outputs are the contract, versioned by commit).
// Also the S8 guard (no failure hiding) and the callee-identity rule (audit B01).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
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
