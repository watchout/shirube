// Measures with Node's own test runner and coverage, then turns what the child left behind into a MeasurementResult.
// It converts and classifies; thresholds, reason codes and the meaning of the result belong to the judge.
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEventLines, tallyEvents } from "./events.mjs";
import { isLcovTooLarge, parseLcov } from "./lcov.mjs";
import { runInTempDir } from "./runner.mjs";

/** @public */
export const GUARANTEED_NODE_MAJOR = 22;
/** @public */
export const OBSERVATION_FILES = Object.freeze({ lcov: "coverage.lcov", events: "events.jsonl" });
const REPORTER_PATH = join(import.meta.dirname, "events-reporter.mjs");
const VERSION_PATTERN = /^(\d+)\.\d+\.\d+/u;

/** @public */
export function isGuaranteedNode(version) {
  const match = VERSION_PATTERN.exec(version);
  return match !== null && Number(match[1]) >= GUARANTEED_NODE_MAJOR;
}

function unobservable(cause, carried = {}) {
  return { kind: "unobservable", cause, testObservations: [], testFilesRun: [], testFailurePaths: [], ...carried };
}

function runCause(run) {
  if (run.stoppedBy !== null) return run.stoppedBy;
  if (run.spawnFailed || run.signal !== null) return "failed";
  return null;
}

function readTextOrNull(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readLcov(dir, cwd) {
  const path = join(dir, OBSERVATION_FILES.lcov);
  let size;
  try {
    size = statSync(path).size;
  } catch {
    return { ok: false, cause: "no_records" };
  }
  if (isLcovTooLarge(size)) return { ok: false, cause: "failed" };
  return parseLcov(readFileSync(path, "utf8"), cwd);
}

function summarize(observations) {
  return {
    testObservations: observations,
    testFilesRun: observations.filter((o) => o.passed >= 1).map((o) => o.path),
    testFailurePaths: observations.filter((o) => o.failed >= 1).map((o) => o.path),
  };
}

// Reads what the child left in its directory. A missing or unreadable piece is never a success.
/** @public */
export function observeDir({ dir, run, cwd, requiredTestPaths }) {
  const early = runCause(run);
  if (early !== null) return unobservable(early);
  const text = readTextOrNull(join(dir, OBSERVATION_FILES.events));
  const parsed = text === null ? { ok: false } : parseEventLines(text);
  if (!parsed.ok || parsed.events.length === 0) return unobservable("failed");
  const tally = tallyEvents(parsed.events, { cwd, testPaths: requiredTestPaths });
  const carried = summarize(tally.observations);
  if (tally.unboundFailures > 0 || carried.testFailurePaths.length > 0) return unobservable("test_failed", carried);
  if (run.exitCode !== 0) return unobservable("failed", carried);
  const lcov = readLcov(dir, cwd);
  if (!lcov.ok) return unobservable(lcov.cause, carried);
  return { kind: "records", records: lcov.records, measuredPaths: lcov.measuredPaths, ...carried };
}

// Node hands a file whose name starts with "-" to its child as it is, and the child reads it as an option ("./" is
// dropped on the way), so such a file is given by its absolute path.
function buildNodeArgs(dir, testPaths, cwd) {
  return [
    "--test",
    "--experimental-test-coverage",
    "--test-reporter=lcov",
    `--test-reporter-destination=${join(dir, OBSERVATION_FILES.lcov)}`,
    `--test-reporter=${REPORTER_PATH}`,
    `--test-reporter-destination=${join(dir, OBSERVATION_FILES.events)}`,
    ...testPaths.map((path) => (path.startsWith("-") ? join(cwd, path) : path)),
  ];
}

function endStateOf(run) {
  if (run.stoppedBy !== null) return run.stoppedBy;
  return run.spawnFailed || run.signal !== null || run.exitCode !== 0 ? "failed" : "completed";
}

export async function measureNode({ cwd, runId, input, requiredTestPaths, nodeVersion = process.versions.node, spawnFn, removeFn }) {
  const base = {
    measurementDefinition: { name: "node-builtin", measuredTarget: "declared tracked sources", toolName: "node --test coverage", toolVersion: nodeVersion },
  };
  const attempt = { toolName: "node", deadlineSeconds: input.deadlineSeconds, totalBudgetSeconds: input.totalBudgetSeconds };
  if (!isGuaranteedNode(nodeVersion)) {
    return { ...unobservable("child_process_not_countable"), ...base, childProcessLinesCounted: false, cleanupFailed: false, attempt: { ...attempt, spentSeconds: 0, endState: "failed" } };
  }
  const { run, observation, cleanupFailed } = await runInTempDir({
    runId,
    cwd,
    deadlineSeconds: input.deadlineSeconds,
    totalBudgetSeconds: input.totalBudgetSeconds,
    buildArgs: (dir) => buildNodeArgs(dir, requiredTestPaths, cwd),
    observe: (dir, finished) => observeDir({ dir, run: finished, cwd, requiredTestPaths }),
    spawnFn,
    removeFn,
  });
  const observed = observation ?? unobservable(runCause(run));
  return { ...observed, ...base, childProcessLinesCounted: true, cleanupFailed, attempt: { ...attempt, spentSeconds: run.spentSeconds, endState: endStateOf(run) } };
}
