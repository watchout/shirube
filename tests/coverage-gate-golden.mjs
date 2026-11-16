// Inputs for the backward-compatibility golden (not a test file: the name does not end in .test.mjs).
// The golden strings in coverage-gate-golden-text.mjs were written out from the U3 code before any U4 change, for a run
// with no threshold and no mode. After U4, the same inputs must give the same strings, byte for byte (BR8.5, NFR8.1).
// Everything here is fictional.
export const GOLDEN_PATHS = Object.freeze(["match", "mismatch", "unobservable", "inputFailure"]);

export const GOLDEN_INPUT = JSON.stringify({ schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["src"] }, testTargets: ["tests"] });
// A key a later unit adds: the input fails on it in U3 and in U4 alike.
export const GOLDEN_FAILING_INPUT = JSON.stringify({ schemaVersion: 1, exclusions: ["src/a.mjs"] });

const DEFINITION = { name: "node-builtin", measuredTarget: "declared tracked sources", toolName: "node --test coverage", toolVersion: "22.0.0" };
const ATTEMPT = { toolName: "node", deadlineSeconds: 600, totalBudgetSeconds: 900, spentSeconds: 1, endState: "completed" };

export const goldenMeasurement = (over = {}) => ({
  kind: "records",
  records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 1 }],
  measuredPaths: ["src/a.mjs"],
  testObservations: [],
  testFilesRun: ["tests/a.test.mjs"],
  testFailurePaths: [],
  measurementDefinition: DEFINITION,
  childProcessLinesCounted: true,
  cleanupFailed: false,
  attempt: ATTEMPT,
  ...over,
});

export const GOLDEN_MEASUREMENTS = Object.freeze({
  match: () => goldenMeasurement(),
  mismatch: () => goldenMeasurement({ records: [{ path: "src/a.mjs", lineNumber: 1, hitCount: 0 }] }),
  unobservable: () => goldenMeasurement({ kind: "unobservable", cause: "failed", records: undefined, measuredPaths: undefined }),
});
