// Counts the pass/fail events the gate's reporter wrote, per required test file. Pure.
// The implicit whole-file pass Node emits (name = the file's path, nesting 0, line 1, column 1) is not a test.
import { relativeToCwd } from "./lcov.mjs";
import { sortPaths } from "./order.mjs";

const COUNTED_TYPES = new Set(["test:pass", "test:fail"]);

export function parseEventLines(text) {
  const events = [];
  for (const line of text.split("\n")) {
    if (line === "") continue;
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      return { ok: false };
    }
    if (value === null || typeof value !== "object" || Array.isArray(value) || !COUNTED_TYPES.has(value.type)) return { ok: false };
    events.push(value);
  }
  return { ok: true, events };
}

// The name is the path the file was given as: relative, "./"-prefixed, or absolute (a file whose name starts with "-").
function isImplicitPass(event, path, cwd) {
  const name = typeof event.name === "string" ? relativeToCwd(event.name, cwd) : null;
  return event.type === "test:pass" && event.nesting === 0 && event.line === 1 && event.column === 1 && name === path;
}

function emptyObservation(path) {
  return { path, passed: 0, implicitFilePassCount: 0, failed: 0, skipped: 0, todo: 0 };
}

function countInto(observation, event, cwd) {
  if (isImplicitPass(event, observation.path, cwd)) observation.implicitFilePassCount += 1;
  else if (event.skip === true) observation.skipped += 1;
  else if (event.todo === true) observation.todo += 1;
  else if (event.type === "test:fail") observation.failed += 1;
  else observation.passed += 1;
}

export function tallyEvents(events, { cwd, testPaths }) {
  const observations = new Map(sortPaths([...new Set(testPaths)]).map((path) => [path, emptyObservation(path)]));
  let unboundFailures = 0;
  for (const event of events) {
    if (event.detailsType !== "test") continue;
    const path = typeof event.file === "string" ? relativeToCwd(event.file, cwd) : null;
    const observation = path === null ? undefined : observations.get(path);
    if (observation !== undefined) countInto(observation, event, cwd);
    else if (event.type === "test:fail") unboundFailures += 1;
  }
  return { observations: [...observations.values()], unboundFailures };
}
