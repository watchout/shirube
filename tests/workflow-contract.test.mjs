// Contract of the reusable workflow (handover v5 §12 T2: inputs/outputs are the contract, versioned by commit).
// Also the S8 guard (no failure hiding) and the callee-identity rule (audit B01).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const CHECK_IDS = ["coverage", "lines", "large", "jscpd", "knip", "depcruise", "structural", "guard", "secrets", "prsize", "prsize_na", "python"];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("AB-27: every check runs even after an earlier check failed (report_only needs every result); only a failed setup skips them; the last step lists every outcome and fails on a failed, cancelled or unexpectedly skipped check", () => {
  const steps = body.split(/\n(?=\s+- name: )/).filter((s) => /^\s+- name: /.test(s));
  const checks = steps.filter((s) => new RegExp(`\\n\\s+id: (${CHECK_IDS.join("|")})\\n`).test(s));
  assert.equal(checks.length, CHECK_IDS.length);
  for (const s of checks) assert.match(s, new RegExp(`\\n\\s+id: [a-z_]+\\n\\s+${escape(RUN_AFTER_FAILURE)}`), s.split("\n")[0]);  // the condition sits right after the id, before env/run
  const summary = steps.find((s) => /\n\s+if: \$\{\{ always\(\) \}\}\n/.test(s));
  assert.ok(summary, "a final always() step lists the outcomes");
  for (const id of CHECK_IDS) assert.match(summary, new RegExp(`=\\$\\{\\{ steps\\.${id}\\.outcome \\}\\}`), id);
  assert.match(summary, /\[ "\$\(get "\$k"\)" = success \] \|\| \{[^\n]*fail=1; \}/);  // nine unconditional checks must be success
  assert.match(summary, /\[ "\$\(get python\)" = success \] \|\| \[ "\$\(get python\)" = skipped \] \|\|/);  // python may be skipped, never failed
  assert.match(summary, /\n\s+exit \$fail\n?$/);
  assert.equal(steps.indexOf(summary), steps.length - 1);
});
