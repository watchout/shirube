// Runs one child process in a throwaway directory, with an environment the gate builds itself (never copied from the
// parent), under a deadline and a total budget, and removes the directory afterwards. No retry.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const GRACE_MS = 5000;

export function buildChildEnv({ nodeDir, homeDir }) {
  return { PATH: `${nodeDir}:/usr/bin:/bin`, HOME: homeDir, LANG: "C.UTF-8", LC_ALL: "C.UTF-8", TZ: "UTC" };
}

// The names the child may have: the names buildChildEnv sets, kept in one place.
export const CHILD_ENV_ALLOWLIST = Object.freeze(Object.keys(buildChildEnv({ nodeDir: "", homeDir: "" })));

export function tempPrefix(runId) {
  return `coverage-gate-${runId}-`;
}

function signalGroup(pid, signal) {
  if (!Number.isInteger(pid)) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // The group is already gone (or cannot be signalled); the exit event is what the run waits for.
  }
}

// Waits for the child. At the limit it stops the whole process group: SIGTERM, then SIGKILL after the grace period,
// and SIGKILL once more after the leader has exited so a grandchild cannot outlive the run.
function supervise({ child, limitMs, stopLabel, graceMs }) {
  return new Promise((resolve) => {
    let stoppedBy = null;
    let finished = false;
    let killTimer = null;
    let limitTimer = null;
    const finish = (outcome) => {
      if (finished) return;
      finished = true;
      clearTimeout(limitTimer);
      clearTimeout(killTimer);
      if (stoppedBy !== null) signalGroup(child.pid, "SIGKILL");
      resolve({ ...outcome, stoppedBy });
    };
    limitTimer = setTimeout(() => {
      stoppedBy = stopLabel;
      signalGroup(child.pid, "SIGTERM");
      killTimer = setTimeout(() => signalGroup(child.pid, "SIGKILL"), graceMs);
    }, limitMs);
    child.once("error", () => finish({ exitCode: null, signal: null, spawnFailed: true }));
    child.once("exit", (exitCode, signal) => finish({ exitCode, signal, spawnFailed: false }));
  });
}

async function removeAndVerify(dir, removeFn) {
  try {
    await removeFn(dir);
  } catch {
    return true;
  }
  return existsSync(dir);
}

const defaultRemove = (dir) => rm(dir, { recursive: true, force: true });

export async function runInTempDir({ runId, cwd, buildArgs, deadlineSeconds, totalBudgetSeconds, observe, graceMs = GRACE_MS, spawnFn = spawn, removeFn = defaultRemove }) {
  const dir = await mkdtemp(join(tmpdir(), tempPrefix(runId)));
  let run;
  let observation = null;
  let cleanupFailed = true;
  try {
    const startedAt = performance.now();
    const child = spawnFn(process.execPath, buildArgs(dir), {
      cwd,
      env: buildChildEnv({ nodeDir: dirname(process.execPath), homeDir: dir }),
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    const limitSeconds = Math.min(deadlineSeconds, totalBudgetSeconds);
    const stopLabel = deadlineSeconds <= totalBudgetSeconds ? "timed_out" : "budget_exceeded";
    const outcome = await supervise({ child, limitMs: limitSeconds * 1000, stopLabel, graceMs });
    run = { ...outcome, spentSeconds: Math.ceil((performance.now() - startedAt) / 1000) };
    if (!run.spawnFailed && run.stoppedBy === null) observation = await observe(dir, run);
  } finally {
    cleanupFailed = await removeAndVerify(dir, removeFn);
  }
  return { run, observation, cleanupFailed };
}
