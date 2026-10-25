// The gh wrapper of the reusable gate (.github/workflows/sds-gate.yml, iyasaka-arc#24 6404479439 PR-G1). gh >= 2.97 refuses a raw
// (non-JSON) API response that carries terminal escape sequences unless --allow-escape-sequences is given, and a job log always does;
// the receipt re-check of an R2+ PR reads one (iyasaka-arc#24 6394017590). These tests run the workflow's real wrapper text and its
// real step shell against stub gh programs; they never call GitHub and do not need the runner's gh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, chmodSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const workflow = readFileSync(new URL("../.github/workflows/sds-gate.yml", import.meta.url), "utf8");
const STEP = "      - name: Run sds-gate and report a commit status on the PR head\n";
const stepShell = workflow.split(STEP)[1].split("        run: |\n")[1]
  .split("\n").filter((l) => l.startsWith("          ") || l === "").map((l) => l.slice(10)).join("\n")
  .replaceAll("${{ github.server_url }}", "https://github.com").replaceAll("${{ github.run_id }}", "1");
const wrapperText = `${stepShell.match(/<<'GH_WRAPPER'\n([\s\S]*?)\nGH_WRAPPER\n/)[1]}\n`;
const FLAG = "--allow-escape-sequences";
const LOGS = "repos/o/r/actions/jobs/9/logs";

// A stand-in for the real gh. It records every call (arguments joined by 0x1f, one line per call), answers `api --help`
// (the flag is listed only when STUB_HAS_FLAG=1), and with STUB_REFUSE=1 refuses a log download that lacks the flag the way gh >= 2.97 does.
const STUB = `#!/bin/bash
if [ "$1" = api ] && [ "$2" = --help ]; then
  echo "$@" >> "$STUB_DIR/probes"; echo "Usage: gh api <endpoint> [flags]"
  [ "\${STUB_HAS_FLAG:-}" = 1 ] && echo "      --allow-escape-sequences   Allow printing terminal escape sequences"
  exit 0
fi
for a in "$@"; do printf '%s\\x1f' "$a" >> "$STUB_DIR/calls"; done; printf '\\n' >> "$STUB_DIR/calls"
case " $* " in *" --jq "*) echo abc123; exit 0 ;; esac
for a in "$@"; do
  if [[ "$a" == */logs ]]; then
    if [[ " $* " == *" ${FLAG} "* ]]; then printf '2026-10-25T00:00:00Z \\033[36;1mnpm ci\\033[0m\\n'; exit "\${STUB_EXIT:-0}"; fi
    if [ "\${STUB_REFUSE:-}" = 1 ]; then echo "the response contains terminal escape sequences; pass ${FLAG} to output it anyway" >&2; exit 1; fi
  fi
done
echo stub-out; echo stub-err >&2; exit "\${STUB_EXIT:-0}"
`;
const LOG_TEXT = "2026-10-25T00:00:00Z \u001b[36;1mnpm ci\u001b[0m\n";
const lines = (file) => { try { return readFileSync(file, "utf8").split("\n").slice(0, -1); } catch { return []; } }; // an empty line is a call without arguments

function sandbox(env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "sds-gh-wrap-"));
  const tmp = join(dir, "tmp"); mkdirSync(tmp);
  writeFileSync(join(dir, "real-gh"), STUB); chmodSync(join(dir, "real-gh"), 0o755);
  writeFileSync(join(dir, "gh-wrapper"), wrapperText); chmodSync(join(dir, "gh-wrapper"), 0o755);
  const calls = () => lines(join(dir, "calls")).map((l) => l.split("\x1f").slice(0, -1));
  const base = { PATH: process.env.PATH, STUB_DIR: dir, TMPDIR: tmp, STUB_HAS_FLAG: "1", ...env };
  return { dir, tmp, calls, probes: () => lines(join(dir, "probes")), base, done: () => rmSync(dir, { recursive: true, force: true }) };
}
function wrap(args, env = {}, { real = true } = {}) {
  const s = sandbox(env);
  try {
    const r = spawnSync(join(s.dir, "gh-wrapper"), args, { encoding: "utf8", env: { ...s.base, ...(real ? { SDS_REAL_GH: join(s.dir, "real-gh") } : {}) } });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr, calls: s.calls(), probes: s.probes() };
  } finally { s.done(); }
}

test("a log download gets the flag once, last, when this gh has it", () => {
  const r = wrap(["api", LOGS]);
  assert.deepEqual(r.calls, [["api", LOGS, FLAG]]);
  assert.equal(r.probes.length, 1);
  const options = wrap(["api", "-H", "Accept: text/plain", LOGS, "--method", "GET"]);
  assert.deepEqual(options.calls, [["api", "-H", "Accept: text/plain", LOGS, "--method", "GET", FLAG]]);
});

test("a gh that does not have the flag is called exactly as before", () => {
  const r = wrap(["api", LOGS], { STUB_HAS_FLAG: "0" });
  assert.deepEqual(r.calls, [["api", LOGS]]);
  assert.equal(r.probes.length, 1);
});

test("a flag that is already there is not repeated, wherever it stands, and needs no probe", () => {
  for (const args of [["api", LOGS, FLAG], ["api", FLAG, LOGS]]) {
    const r = wrap(args);
    assert.deepEqual(r.calls, [args]);
    assert.equal(r.probes.length, 0);
  }
});

test("every other call is passed through unchanged, without even a probe", () => {
  const calls = [
    ["api", "repos/o/r/pulls/7", "--jq", ".head.sha"],
    ["api", "repos/o/r/statuses/abc", "-f", "state=success", "-f", "description=a b *c", "-f", "target_url=https://github.com/o/r/actions/runs/1"],
    ["api", "repos/o/r/logs/1"], ["api", "repos/o/r/actions/jobs/9/logs-extra"], ["api", "logs"], ["api", "-f", "x=y"], ["api"],
    ["pr", "view", "1"], ["repo", "view", "o/r/logs"], ["--version"], [],
  ];
  for (const args of calls) {
    const r = wrap(args);
    assert.deepEqual(r.calls, [args], JSON.stringify(args));
    assert.equal(r.probes.length, 0, JSON.stringify(args));
  }
});

test("arguments reach the real gh byte for byte, empty, quoted and glob-like ones included", () => {
  const args = ["api", "repos/o/r/x", "-f", "a=b c", "", "it's", 'say "hi"', "*", "$HOME", "`id`", "-f", "k=v;w"];
  assert.deepEqual(wrap(args).calls, [args]);
  assert.deepEqual(wrap(["api", LOGS, "", "*", "$HOME"]).calls, [["api", LOGS, "", "*", "$HOME", FLAG]]);
});

test("the real gh's output and exit status come through unchanged, with or without the flag", () => {
  for (const [args, stdout, stderr] of [[["api", LOGS], LOG_TEXT, ""], [["api", "repos/o/r/pulls/7"], "stub-out\n", "stub-err\n"], [["pr", "view", "1"], "stub-out\n", "stub-err\n"]]) {
    const r = wrap(args, { STUB_EXIT: "7" });
    assert.equal(r.status, 7, JSON.stringify(args));
    assert.equal(r.stdout, stdout, JSON.stringify(args));
    assert.equal(r.stderr, stderr, JSON.stringify(args));
  }
  assert.equal(wrap(["api", "repos/o/r/pulls/7"], { STUB_EXIT: "0" }).status, 0);
});

test("without the path of the real gh the wrapper fails closed and calls nothing", () => {
  const r = wrap(["api", "repos/o/r/pulls/7"], {}, { real: false });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /SDS_REAL_GH is not set/);
  assert.deepEqual(r.calls, []);
});

// The real step shell, as the runner runs it (bash -e), with a stub gate that reads a job log through PATH the way gate.mjs and the pinned
// audit-admission.mjs do (execFileSync("gh", ["api", path])), and a stub gh that refuses a log without the flag the way gh >= 2.97 does.
function runStep(script, env = {}) {
  const s = sandbox({ STUB_REFUSE: "1", ...env });
  try {
    mkdirSync(join(s.dir, "bin")); mkdirSync(join(s.dir, "tools/scripts/sds"), { recursive: true });
    writeFileSync(join(s.dir, "bin/gh"), STUB); chmodSync(join(s.dir, "bin/gh"), 0o755);
    writeFileSync(join(s.dir, "tools/scripts/sds/gate.mjs"), [
      'import { execFileSync } from "node:child_process";',
      `const log = execFileSync("gh", ["api", "${LOGS}"], { encoding: "utf8" });`,
      'execFileSync("gh", ["api", "repos/o/r/pulls/7"], { encoding: "utf8" });',
      'process.stdout.write(JSON.stringify({ verdict: "PASS", risk_class: "R2", escape_seen: log.includes("\\u001b[36;1m") }));',
    ].join("\n"));
    const r = spawnSync("bash", ["-e", "-c", script], { encoding: "utf8", env: { ...s.base, PATH: `${join(s.dir, "bin")}:${process.env.PATH}`, REPO: "o/r", PR: "7", SHIRUBE_TOOLS: join(s.dir, "tools") } });
    const posts = s.calls().filter((c) => c[1]?.includes("/statuses/")).map((c) => c.join(" "));
    return { status: r.status, stdout: r.stdout, posts, calls: s.calls(), leftover: readdirSync(s.tmp) };
  } finally { s.done(); }
}

test("the step: a job log is read through the wrapper, the gate passes, and the status is posted", () => {
  const r = runStep(stepShell);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /"verdict":"PASS".*"escape_seen":true/);
  assert.deepEqual(r.calls.filter((c) => c[1] === LOGS), [["api", LOGS, FLAG]]);
  assert.equal(r.calls.filter((c) => c.includes(FLAG)).length, 1, "the flag is on the log download only");
  assert.equal(r.posts.length, 1);
  assert.match(r.posts[0], /state=success/);
});

test("the step without the wrapper reproduces the failure it fixes: the log is refused, the gate fails, the status is failure", () => {
  const mutated = stepShell.replace('export PATH="$gh_wrap:$PATH"\n', "");
  assert.notEqual(mutated, stepShell, "the mutation must change the step");
  const r = runStep(mutated);
  assert.equal(r.status, 1);
  assert.equal(r.posts.length, 1);
  assert.match(r.posts[0], /state=failure/);
  assert.equal(r.calls.filter((c) => c.includes(FLAG)).length, 0);
});

test("the step removes its temporary wrapper directory, and a gate failure still fails the step after the status", () => {
  const ok = runStep(stepShell);
  assert.deepEqual(ok.leftover, []);
  const failing = runStep(stepShell.replace("node \"$SHIRUBE_TOOLS/scripts/sds/gate.mjs\"", "node -e 'process.stdout.write(JSON.stringify({verdict:\"FAIL\",reason:\"3 audit: x\"}));process.exitCode=1'"));
  assert.equal(failing.status, 1);
  assert.match(failing.posts[0], /state=failure/);
  assert.deepEqual(failing.leftover, []);
});
