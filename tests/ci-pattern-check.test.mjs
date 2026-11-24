// CI-COST-REDUCE: the pattern a repository's ci.yml follows, checked by machine. The file is read into a structure by the YAML subset reader, and a
// file the reader refuses is a FAIL (P7), never a pass. Each rule has a positive fixture and a negative one that breaks only that rule.
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
  const bun = GOOD.replace("          cache: npm\n", "").replace("run: npm ci", "run: bun install --frozen-lockfile");
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
  assert.deepEqual(ids(GOOD.replace("      - id: scope\n        uses:", "      - uses:")), ["P6"], "no id to read the answer from");
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

// The table P1..P7 x the entry fields (on, concurrency, steps, uses, if, run, paths): each row breaks ONE field in a way a line or substring reading
// misses and a structure reading catches. Review F-03..F-07.
// one(text, "P6", why) expects exactly the finding P6; one(text, why) (or no second argument) expects a PASS; the third argument names the case.
const one = (text, ...rest) => {
  const id = /^P\d$/.test(rest[0] ?? "") ? rest.shift() : null;
  assert.deepEqual([...new Set(ids(text))], id ? [id] : [], rest[0] ?? id ?? "pass");
};
const SCOPE_STEP = "      - id: scope\n        uses: watchout/shirube/.github/actions/ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd\n";
const GUARD = "      - if: steps.scope.outputs.scope == 'code'\n        run: npm test\n";

test("P1 x concurrency (F-06): the group names the run's own pull request or branch; the cancel condition is exactly the pull_request test", () => {
  const cancel = (value) => GOOD.replace("cancel-in-progress: ${{ github.event_name == 'pull_request' }}", `cancel-in-progress: ${value}`);
  one(cancel("${{ github.event_name != 'pull_request' }}"), "P1");
  one(cancel("${{ github.event_name == 'pull_request' || true }}"), "P1");
  one(cancel("${{ github.event_name == 'push' }}"), "P1");
  one(cancel("\"true\""), "P1");
  one(cancel("${{ github.event_name == 'pull_request' }}"));
  one(GOOD.replace(/  group: .*\n/, "  group: ci\n"), "P1", "a group every run shares");
  one(GOOD.replace(/  group: .*\n/, ""), "P1", "no group");
  one(GOOD.replace(/  group: .*\n/, "  group: ${{ github.head_ref }}\n"));
  one(GOOD.replace("concurrency:\n", "concurrency: ci\n").replace(/  group: .*\n  cancel-in-progress: .*\n/, ""), "P1", "a scalar concurrency has no cancel condition");
  one(GOOD.replace("    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4", "    runs-on: ubuntu-latest\n    concurrency:\n      group: x\n      cancel-in-progress: true\n    steps:\n      - uses: actions/checkout@v4"), "P1", "a job's own concurrency that cancels main too");
  one(GOOD.replace("    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4", "    runs-on: ubuntu-latest\n    concurrency:\n      group: x\n      cancel-in-progress: false\n    steps:\n      - uses: actions/checkout@v4"));
});

test("P2 x run and uses (F-07): an install anywhere in a run (a multi-line block too) needs a cache; a comment or a false cache is not one", () => {
  const noCache = GOOD.replace("          cache: npm\n", "");
  one(noCache.replace("      - run: npm ci\n", "      - run: |\n          set -e\n          npm ci --ignore-scripts\n"), "P2", "install on the second line of a block");
  one(noCache.replace("      - run: npm ci\n", "      - run: >\n          npm ci\n"), "P2", "a folded block");
  one(noCache.replace("      - run: npm ci\n", "      - run: echo ok && pnpm install\n"), "P2");
  one(noCache.replace("      - run: npm ci\n", "      - run: |\n          # npm ci\n          npm test\n"), "a comment line in a shell block is not an install");
  one(GOOD.replace("cache: npm", "cache: ''"), "P2", "an empty cache value");
  one(GOOD.replace("cache: npm", "cache: false"), "P2", "cache: false");
  one(GOOD.replace("          cache: npm\n", "          cache: npm\n      - uses: actions/setup-node@v4\n        with: {node-version: '24'}\n"), "P2", "a second setup-node without a cache, in a flow mapping");
  one(noCache.replace("      - run: npm ci\n", "      - uses: actions/cache@v4\n        with:\n          path: ~/.npm\n          key: npm-${{ hashFiles('package-lock.json') }}\n      - run: npm ci\n"));
  one(noCache.replace("      - run: npm ci\n", "      - run: npm ci\n      - run: npm ci\n"), "P2");
});

test("P4 x needs and if (F-06): a required job is skipped by its own if, or by a job it needs that has one", () => {
  one(GOOD.replace("  hygiene:\n", "  gate:\n    if: ${{ github.event_name == 'push' }}\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo\n  hygiene:\n    needs: gate\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo\n").replace("    uses: ./.github/workflows/hygiene.yml\n", ""), "P4");
  one(GOOD.replace("  hygiene:\n", "  hygiene:\n    needs: [test]\n"), "needs a job that has no if is fine");
  one(GOOD.replace("  test:\n", "  test:\n    if: ${{ always() }}\n").replace("  hygiene:\n", "  hygiene:\n    needs: test\n"), "P4", "a string needs, and the job it needs has an if");
});

test("P5 x on and paths (F-05): the trigger is read as a map, a list or a word; a paths filter anywhere under a trigger counts", () => {
  one(GOOD.replace("on:\n  pull_request:\n  push:\n    branches: [main]\n", "on: [push]\n"), "P5");
  one(GOOD.replace("on:\n  pull_request:\n  push:\n    branches: [main]\n", "on: pull_request\n"));
  one(GOOD.replace("on:\n  pull_request:\n  push:\n    branches: [main]\n", "on: {pull_request: {paths: ['src/**']}}\n"), "P5", "a flow mapping paths");
  one(GOOD.replace("    branches: [main]\n", "    branches: [main]\n    paths-ignore:\n      - '**.md'\n"), "P5", "a filter on push also leaves main without a check");
  one(GOOD.replace("on:\n  pull_request:\n  push:\n    branches: [main]\n", "on:\n  push:\n    branches: [main]\n"), "P5", "no pull_request");
  one(GOOD.replace("on:\n", "\"on\":\n"));
});

test("P6 x if and uses (F-03, F-04): the guard is exactly the code answer; the pin is the uses value, nowhere else", () => {
  const guard = (condition) => GOOD.replace(GUARD, `      - if: ${condition}\n        run: npm test\n`);
  for (const condition of ["false && steps.scope.outputs.scope == 'code'", "steps.scope.outputs.scope == 'code' || true", "steps.scope.outputs.scope != 'code'", "steps.scope.outputs.scope == 'code' || steps.scope.outputs.scope == 'docs'", "${{ steps.scope.outputs.scope == 'docs' }}", "steps.scope.outputs.scope"]) {
    one(guard(condition), "P6", condition);
  }
  one(guard("${{ steps.scope.outputs.scope == 'code' }}"));
  one(guard("  steps.scope.outputs.scope   ==   'code'"));
  one(GOOD.replace(GUARD, "      - \"if\": steps.scope.outputs.scope == 'code'\n        run: npm test\n"), "a quoted key is the same key");
  one(GOOD.replace(GUARD, "      - if : steps.scope.outputs.scope == 'code'\n        run: npm test\n"));
  one(GOOD.replace(GUARD, "      - {if: \"false && steps.scope.outputs.scope == 'code'\", run: npm test}\n"), "P6", "a flow-mapping step is read too");
  one(GOOD.replace(GUARD, GUARD + "      - if: steps.scope.outputs.scope == 'docs'\n        run: echo docs\n"), "P6", "a second step that reads the answer wrongly");
  one(GOOD.replace(SCOPE_STEP + "      - uses: actions/setup-node@v4", "      - uses: actions/setup-node@v4").replace(GUARD, "      - run: npm test\n"), "no ci-scope step at all is not this pattern's business");
  const moved = GOOD.replace(SCOPE_STEP, "").replace(GUARD, GUARD + SCOPE_STEP);
  one(moved, "P6", "a guarded step before the ci-scope step it reads");
  one(GOOD.replace("      - id: scope\n        uses: watchout/shirube/.github/actions/ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd\n", "      - id: scope\n        name: ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd\n        uses: watchout/shirube/.github/actions/ci-scope@main\n"), "P6", "the sha only in a name");
  one(GOOD.replace("ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd", "ci-scope@main # 4d314163f783b40c42ab5d0816cb2ebd48b5e2cd"), "P6", "the sha only in a comment");
  one(GOOD.replace("watchout/shirube/.github", "other/shirube/.github"), "P6", "another owner's action");
  one(GOOD.replace("watchout/shirube/.github/actions/ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd", "./.github/actions/ci-scope"), "P6", "a local path is not a pinned commit");
  one(GOOD.replace("ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd", "ci-scope@4D314163F783B40C42AB5D0816CB2EBD48B5E2CD"), "P6", "upper-case hex is not what git prints");
  one(GOOD.replace("ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2cd", "ci-scope@4d314163f783b40c42ab5d0816cb2ebd48b5e2c"), "P6", "39 hex");
});

test("P7 x steps (F-05): a shape the reader does not know, a broken file, or a job with nothing to run is a FAIL and never a pass", () => {
  const p7 = (text) => one(text, "P7");
  p7(GOOD.replace(/    steps:\n(?:      .*\n)+/, "    steps:\n"));
  p7(GOOD.replace(/    steps:\n(?:      .*\n)+/, "    steps: []\n"));
  p7(GOOD.replace(/    steps:\n(?:      .*\n)+/, "    steps: ~\n"));
  p7(GOOD.replace("      - run: npm ci\n", "      - name: nothing to run\n"));
  p7(GOOD.replace("      - run: npm ci\n", "      - npm ci\n"));
  p7(GOOD.replace("jobs:\n", "jobs: [\n"));
  p7(`${GOOD}\n---\nname: second\n`);
  p7(GOOD.replace("name: ci\n", "name: &n ci\n"));
  p7(GOOD.replace("    uses: ./.github/workflows/hygiene.yml\n", "    uses: ./.github/workflows/hygiene.yml\n    steps:\n      - run: echo\n"));
  p7(GOOD.replace("permissions: {}\n", "permissions: {}\n\tbad: 1\n"));
  p7(GOOD.replace("  hygiene:\n", "  hygiene: not-a-map\n").replace("    uses: ./.github/workflows/hygiene.yml\n", ""));
  p7(GOOD.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    runs-on: macos-latest\n"));
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
