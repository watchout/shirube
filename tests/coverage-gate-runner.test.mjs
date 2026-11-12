import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { CHILD_ENV_ALLOWLIST, GRACE_MS, buildChildEnv, runInTempDir, tempPrefix } from "../scripts/coverage-gate/runner.mjs";
import { FAKE_SECRETS, makeDir, removeDir, withEnv } from "./coverage-gate-fixtures.mjs";

const NODE_DIR = dirname(process.execPath);
const scripts = makeDir({
  "env-dump.mjs": 'import { writeFileSync } from "node:fs";\nimport { join } from "node:path";\nwriteFileSync(join(process.env.HOME, "env.json"), JSON.stringify(process.env));\n',
  "exit-three.mjs": "process.exit(3);\n",
  "self-kill.mjs": 'process.kill(process.pid, "SIGKILL");\n',
  "sleep-with-grandchild.mjs":
    'import { spawn } from "node:child_process";\nimport { writeFileSync } from "node:fs";\nconst g = spawn(process.execPath, ["-e", "setTimeout(() => {}, 120000)"], { stdio: "ignore" });\nwriteFileSync(process.argv[2], String(g.pid));\nsetTimeout(() => {}, 120000);\n',
  "ignore-term.mjs": 'import { writeFileSync } from "node:fs";\nprocess.on("SIGTERM", () => {});\nwriteFileSync(process.argv[2], String(process.pid));\nsetTimeout(() => {}, 120000);\n',
});
test.after(() => removeDir(scripts));

const base = (over = {}) => ({ runId: "r1", cwd: scripts, deadlineSeconds: 30, totalBudgetSeconds: 60, buildArgs: () => [join(scripts, "exit-three.mjs")], observe: () => "observed", ...over });
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
async function waitGone(pid) {
  for (let i = 0; i < 60 && alive(pid); i += 1) await new Promise((r) => setTimeout(r, 50));
  return !alive(pid);
}

function fakeSpawn(calls) {
  return (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.pid = 4194303;
    setImmediate(() => child.emit("exit", 0, null));
    return child;
  };
}

test("the allowlist is exactly five names", () => {
  assert.deepEqual([...CHILD_ENV_ALLOWLIST].sort(), ["HOME", "LANG", "LC_ALL", "PATH", "TZ"]);
  assert.equal(GRACE_MS, 5000);
});

test("buildChildEnv sets only the gate's own values", () => {
  const env = buildChildEnv({ nodeDir: "/n/bin", homeDir: "/t/home" });
  assert.deepEqual(env, { PATH: "/n/bin:/usr/bin:/bin", HOME: "/t/home", LANG: "C.UTF-8", LC_ALL: "C.UTF-8", TZ: "UTC" });
});

test("spawn boundary: the environment handed to spawn has exactly the allowed names, gate-set values, no parent secrets", async () => {
  const calls = [];
  let tempDir;
  await withEnv({ ...FAKE_SECRETS, NODE_OPTIONS: "--no-warnings", NODE_PATH: "/nowhere", CI: "true" }, async () => {
    await runInTempDir(base({ spawnFn: fakeSpawn(calls), buildArgs: (dir) => { tempDir = dir; return ["a.mjs", "-b"]; } }));
  });
  assert.equal(calls.length, 1);
  const { command, args, options } = calls[0];
  assert.equal(command, process.execPath);
  assert.deepEqual(args, ["a.mjs", "-b"]);
  assert.deepEqual(Object.keys(options.env).sort(), [...CHILD_ENV_ALLOWLIST].sort());
  assert.deepEqual(options.env, buildChildEnv({ nodeDir: NODE_DIR, homeDir: tempDir }));
  const serialized = JSON.stringify(options.env);
  for (const [name, value] of Object.entries(FAKE_SECRETS)) {
    assert.ok(!serialized.includes(name), name);
    assert.ok(!serialized.includes(value), value);
  }
  assert.ok(!("NODE_OPTIONS" in options.env) && !("NODE_PATH" in options.env) && !("CI" in options.env));
  assert.equal(options.cwd, scripts);
  assert.equal(options.detached, true);
  assert.deepEqual(options.stdio, ["ignore", "ignore", "ignore"]);
  assert.ok(!options.shell);
});

test("a real child never sees the parent's secrets, NODE_OPTIONS or NODE_PATH; HOME is the temp directory", async () => {
  let tempDir;
  const result = await withEnv({ ...FAKE_SECRETS, NODE_OPTIONS: "--no-warnings", NODE_PATH: "/nowhere" }, () =>
    runInTempDir(base({
      buildArgs: (dir) => { tempDir = dir; return [join(scripts, "env-dump.mjs")]; },
      observe: (dir) => ({ env: JSON.parse(readFileSync(join(dir, "env.json"), "utf8")), mode: statSync(dir).mode & 0o777 }),
    })));
  const { env, mode } = result.observation;
  const dump = JSON.stringify(env);
  for (const [name, value] of Object.entries(FAKE_SECRETS)) {
    assert.ok(!Object.keys(env).some((k) => k.toLowerCase() === name.toLowerCase()), name);
    assert.ok(!dump.includes(value), value);
  }
  assert.ok(!("NODE_OPTIONS" in env) && !("NODE_PATH" in env));
  assert.equal(env.HOME, tempDir);
  assert.equal(env.TZ, "UTC");
  assert.equal(env.LANG, "C.UTF-8");
  assert.equal(mode, 0o700);
  assert.equal(existsSync(tempDir), false);
  assert.equal(result.cleanupFailed, false);
  assert.equal(result.run.exitCode, 0);
});

test("the temp directory is named by the run id under the OS temp area and removed afterwards", async () => {
  let tempDir;
  const result = await runInTempDir(base({ runId: "77-2", buildArgs: (dir) => { tempDir = dir; return [join(scripts, "exit-three.mjs")]; } }));
  assert.equal(tempPrefix("77-2"), "coverage-gate-77-2-");
  assert.equal(dirname(tempDir), tmpdir());
  assert.ok(basename(tempDir).startsWith("coverage-gate-77-2-"));
  assert.equal(existsSync(tempDir), false);
  assert.equal(result.cleanupFailed, false);
  assert.equal(result.observation, "observed");
});

test("exit codes, signals and spawn failures are observed as they are", async () => {
  const three = await runInTempDir(base());
  assert.deepEqual([three.run.exitCode, three.run.signal, three.run.spawnFailed, three.run.stoppedBy], [3, null, false, null]);
  const killed = await runInTempDir(base({ buildArgs: () => [join(scripts, "self-kill.mjs")] }));
  assert.deepEqual([killed.run.signal, killed.run.stoppedBy, killed.run.spawnFailed], ["SIGKILL", null, false]);
  const missing = await runInTempDir(base({ cwd: join(scripts, "does-not-exist"), observe: () => { throw new Error("observe must not run"); } }));
  assert.equal(missing.run.spawnFailed, true);
  assert.equal(missing.observation, null);
});

test("a deadline stops the whole process group, grandchildren included", async () => {
  const pidFile = join(scripts, "grandchild.pid");
  const start = performance.now();
  const result = await runInTempDir(base({ deadlineSeconds: 1, totalBudgetSeconds: 60, buildArgs: () => [join(scripts, "sleep-with-grandchild.mjs"), pidFile], graceMs: 300, observe: () => { throw new Error("observe must not run"); } }));
  assert.equal(result.run.stoppedBy, "timed_out");
  assert.equal(result.observation, null);
  assert.ok(result.run.spentSeconds >= 1);
  assert.ok(performance.now() - start < 20000);
  const grandchild = Number(readFileSync(pidFile, "utf8"));
  assert.equal(await waitGone(grandchild), true);
});

test("a child that ignores the first signal is killed after the grace period", async () => {
  const pidFile = join(scripts, "ignore-term.pid");
  const result = await runInTempDir(base({ deadlineSeconds: 1, buildArgs: () => [join(scripts, "ignore-term.mjs"), pidFile], graceMs: 300 }));
  assert.equal(result.run.stoppedBy, "timed_out");
  assert.equal(await waitGone(Number(readFileSync(pidFile, "utf8"))), true);
});

test("the total budget is the limit when it is the smaller one; an equal deadline is reported as the deadline", async () => {
  const sleeper = (pidFile) => () => [join(scripts, "ignore-term.mjs"), pidFile];
  const budget = await runInTempDir(base({ deadlineSeconds: 30, totalBudgetSeconds: 1, buildArgs: sleeper(join(scripts, "b.pid")), graceMs: 200 }));
  assert.equal(budget.run.stoppedBy, "budget_exceeded");
  const equal = await runInTempDir(base({ deadlineSeconds: 1, totalBudgetSeconds: 1, buildArgs: sleeper(join(scripts, "e.pid")), graceMs: 200 }));
  assert.equal(equal.run.stoppedBy, "timed_out");
});

test("cleanup failure: a remover that throws makes cleanupFailed true even though the run succeeded", async () => {
  let tempDir;
  const result = await runInTempDir(base({ buildArgs: (dir) => { tempDir = dir; return [join(scripts, "exit-three.mjs")]; }, removeFn: async () => { throw new Error("EACCES"); } }));
  assert.equal(result.cleanupFailed, true);
  assert.equal(result.run.exitCode, 3);
  assert.equal(existsSync(tempDir), true);
  removeDir(tempDir);
});

test("cleanup failure: a remover that returns without removing is also a failure", async () => {
  let tempDir;
  const result = await runInTempDir(base({ buildArgs: (dir) => { tempDir = dir; return [join(scripts, "exit-three.mjs")]; }, removeFn: async () => {} }));
  assert.equal(result.cleanupFailed, true);
  removeDir(tempDir);
});

test("cleanup happens when observe throws, and the error is passed on", async () => {
  let tempDir;
  await assert.rejects(runInTempDir(base({ buildArgs: (dir) => { tempDir = dir; return [join(scripts, "exit-three.mjs")]; }, observe: () => { throw new Error("boom"); } })), /boom/);
  assert.equal(existsSync(tempDir), false);
});

test("a normal run leaves cleanupFailed false", async () => {
  assert.equal((await runInTempDir(base())).cleanupFailed, false);
});
