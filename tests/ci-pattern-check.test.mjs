// CI-COST-REDUCE: the pattern a repository's ci.yml follows, checked by machine. Text-based and fail closed: a file it cannot read as
// the expected shape is a FAIL, never a pass. Each rule has a positive fixture and a negative one that breaks only that rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkPattern } from "../scripts/ci/pattern-check.mjs";

const GOOD = `name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions: {}
concurrency:
  group: ci-\${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}
  cancel-in-progress: \${{ github.event_name == 'pull_request' }}
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: scope
        uses: watchout/shirube/.github/actions/ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - if: steps.scope.outputs.scope == 'code'
        run: npm test
  hygiene:
    uses: ./.github/workflows/hygiene.yml
`;
const ids = (text, required = ["test", "hygiene"]) => checkPattern(text, { required }).findings.map((f) => f.id);

test("P0 a file that follows the pattern passes with no finding", () => {
  assert.deepEqual(checkPattern(GOOD, { required: ["test", "hygiene"] }), { verdict: "PASS", findings: [] });
});

test("P1 a pull request's older run must be cancelled, and a push to main must not be", () => {
  assert.deepEqual(ids(GOOD.replace(/concurrency:[\s\S]*?(?=jobs:)/, "")), ["P1"], "no concurrency");
  assert.deepEqual(ids(GOOD.replace("cancel-in-progress: ${{ github.event_name == 'pull_request' }}", "cancel-in-progress: true")), ["P1"], "cancels main too");
  assert.deepEqual(ids(GOOD.replace("cancel-in-progress: ${{ github.event_name == 'pull_request' }}", "cancel-in-progress: false")), ["P1"], "cancels nothing");
});

test("P2 every setup-node step caches its dependencies", () => {
  assert.deepEqual(ids(GOOD.replace("          cache: npm\n", "")), ["P2"]);
  const two = GOOD.replace("      - run: npm ci\n", "      - uses: actions/setup-node@v4\n        with:\n          node-version: \"24\"\n      - run: npm ci\n");
  assert.deepEqual(ids(two), ["P2"], "the second setup-node has no cache");
  const bun = GOOD.replace("cache: npm\n", "").replace("run: npm ci", "run: bun install --frozen-lockfile");
  assert.deepEqual(ids(bun), ["P2"], "any install command counts");
  const noInstall = GOOD.replace("          cache: npm\n", "").replace("      - run: npm ci\n", "");
  assert.deepEqual(ids(noInstall), [], "a job that installs nothing is not asked for a cache");
});

test("P3 the required check names stay: a job id or its name, unchanged", () => {
  assert.deepEqual(ids(GOOD, ["test", "hygiene", "coverage"]), ["P3"]);
  assert.deepEqual(ids(GOOD.replace("  hygiene:\n", "  hygiene:\n    name: lint-all\n")), ["P3"], "renamed away from hygiene");
  assert.deepEqual(ids(GOOD.replace("  hygiene:\n", "  quality:\n    name: hygiene\n")), [], "a job whose name is the required one keeps it");
  assert.deepEqual(ids(GOOD.replace("  test:\n", "  test:\n    strategy:\n      matrix:\n        node: [22, 24]\n    name: test (node ${{ matrix.node }})\n"), ["test", "hygiene"]), [], "a matrix name that starts with the required name keeps it");
});

test("P4 a required job is never skipped by a job-level if (a step-level if is the way)", () => {
  assert.deepEqual(ids(GOOD.replace("  test:\n", "  test:\n    if: ${{ github.event_name == 'push' }}\n")), ["P4"]);
});

test("P5 the workflow has no paths or paths-ignore filter, which would leave a required check pending", () => {
  assert.deepEqual(ids(GOOD.replace("  pull_request:\n", "  pull_request:\n    paths-ignore: ['docs/**']\n")), ["P5"]);
  assert.deepEqual(ids(GOOD.replace("  pull_request:\n", "  pull_request:\n    paths: ['src/**']\n")), ["P5"]);
});

test("P6 when ci-scope is used it is pinned to a 40-hex commit and a later step is guarded by its code answer", () => {
  assert.deepEqual(ids(GOOD.replace("ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd", "ci-scope@main")), ["P6"], "a branch, not a commit");
  assert.deepEqual(ids(GOOD.replace("      - if: steps.scope.outputs.scope == 'code'\n        run: npm test\n", "      - run: npm test\n")), ["P6"], "answers nothing");
  assert.deepEqual(ids(GOOD.replace("      - id: scope\n", "")), ["P6"], "no id to read the answer from");
  assert.deepEqual(ids(GOOD.replace("steps.scope.outputs.scope == 'code'", "steps.scope.outputs.scope == 'docs'")), ["P6"], "guards on docs, which would skip the heavy step for code");
});

test("P7 a file with no jobs, or an unreadable value, is a FAIL, never a pass", () => {
  for (const text of ["", "name: ci\n", "jobs:\n", undefined, 7]) {
    const result = checkPattern(text, { required: ["test"] });
    assert.equal(result.verdict, "FAIL", String(text));
    assert.ok(result.findings.some((f) => f.id === "P7"), String(text));
  }
  assert.equal(checkPattern(GOOD, { required: [] }).verdict, "FAIL", "no required names given");
});

test("P8 the command: PASS exits 0, FAIL exits 1, a misuse exits 2", () => {
  const dir = mkdtempSync(join(tmpdir(), "ci-pattern-"));
  const run = (...args) => spawnSync(process.execPath, [resolve(import.meta.dirname, "../scripts/ci/pattern-check.mjs"), ...args], { encoding: "utf8" });
  try {
    writeFileSync(join(dir, "good.yml"), GOOD);
    writeFileSync(join(dir, "bad.yml"), GOOD.replace("          cache: npm\n", ""));
    const ok = run(join(dir, "good.yml"), "--required", "test,hygiene");
    assert.equal([ok.status, JSON.parse(ok.stdout).verdict].join(), "0,PASS");
    const bad = run(join(dir, "bad.yml"), "--required", "test,hygiene");
    assert.equal([bad.status, JSON.parse(bad.stdout).verdict].join(), "1,FAIL");
    for (const args of [[], [join(dir, "good.yml")], [join(dir, "nope.yml"), "--required", "test"], [join(dir, "good.yml"), "--required"]]) {
      const r = run(...args);
      assert.equal([r.status, JSON.parse(r.stdout).verdict].join(), "2,ERROR", args.join(" "));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P9 the file is read as YAML reads it: wording that sits only in a comment (whole line or end of line) counts for nothing", () => {
  const withP1 = (value) => GOOD.replace("cancel-in-progress: ${{ github.event_name == 'pull_request' }}", `cancel-in-progress: ${value}`);
  assert.deepEqual(ids(withP1("false # pull_request")), ["P1"], "end-of-line comment names pull_request");
  assert.deepEqual(ids(withP1("true # only for pull_request")), ["P1"], "cancels main too, with a comment that says otherwise");
  assert.deepEqual(ids(withP1("${{ github.event_name == 'pull_request' }} # cancels only a pull request")), [], "a real value with a comment still passes");
  assert.deepEqual(ids(GOOD.replace("          cache: npm\n", "          # cache: npm\n")), ["P2"], "a commented cache line");
  assert.deepEqual(ids(GOOD.replace("  hygiene:\n", "  # hygiene:\n  other:\n")), ["P3"], "a commented job header");
  assert.deepEqual(ids(GOOD.replace("      - if: steps.scope.outputs.scope == 'code'\n        run: npm test\n", "      # - if: steps.scope.outputs.scope == 'code'\n      - run: npm test\n")), ["P6"], "a commented guard");
  assert.deepEqual(ids(GOOD.replace("runs-on: ubuntu-latest", "runs-on: ubuntu-latest # not a # comment inside quotes: \"a # b\"")), [], "a # inside quotes is text, and a trailing comment after it is cut");
  assert.deepEqual(ids(GOOD.replace("node-version: \"22\"", "node-version: \"22 # not a comment\"")), [], "a quoted # does not cut the line");
});
