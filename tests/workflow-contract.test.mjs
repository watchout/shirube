// Contract of the reusable workflow (handover v5 §12 T2: inputs/outputs are the contract, versioned by commit).
// Also the S8 guard: no failure hiding in either workflow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const wf = readFileSync(resolve(import.meta.dirname, "../.github/workflows/hygiene.yml"), "utf8");
const ci = readFileSync(resolve(import.meta.dirname, "../.github/workflows/ci.yml"), "utf8");

test("hygiene.yml declares the four inputs and the optional read token", () => {
  for (const key of ["profile:", "targets:", "node-version:", "python:"]) assert.match(wf, new RegExp(`\\n\\s+${key}`));
  assert.match(wf, /SHIRUBE_READ_TOKEN:\n\s+required: false/);
  assert.match(wf, /ref: \$\{\{ github\.workflow_sha \}\}/); // tools come from the calling workflow's own commit
});

test("workflows hide no failures (S8): no continue-on-error, no || true, no if-present on required steps", () => {
  for (const text of [wf, ci]) {
    assert.doesNotMatch(text, /continue-on-error/);
    assert.doesNotMatch(text, /\|\|\s*true/);
    assert.doesNotMatch(text, /--if-present/);
  }
});

test("gitleaks is pinned by version and sha256, and the guard run disables inline config", () => {
  assert.match(wf, /GITLEAKS_VERSION: 8\.30\.1/);
  assert.match(wf, /GITLEAKS_SHA256_LINUX_X64: [0-9a-f]{64}/);
  assert.match(wf, /sha256sum -c -/);
  assert.match(wf, /eslint --no-inline-config --max-warnings 0 --config "\$SHIRUBE_TOOLS\/configs\/guard-only\.config\.mjs"/);
});
