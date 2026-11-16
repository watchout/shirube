// Turns the declared targets into tracked files, using the repository's existing resolution (scripts/hygiene/lib.mjs).
// The gate has no resolution rules of its own. A git failure is thrown, never read as an empty result.
import { isAbsolute, normalize, sep } from "node:path";
import { resolveTargets, trackedFiles } from "../hygiene/lib.mjs";
import { isTestFile } from "./input.mjs";
import { sortPaths } from "./order.mjs";
import { SUMMARY_LIST_LIMIT } from "./report.mjs";

function fail(reasonCode, field, detail) {
  return { ok: false, failure: { reasonCode, field, detail } };
}

const OUTSIDE = "<outside the repository>";

// A path the caller wrote that points outside the repository is not echoed back (no absolute or escaping path in any output).
function outsideRepository(name) {
  const plain = normalize(name);
  return isAbsolute(name) || plain === ".." || plain.startsWith(`..${sep}`);
}

function unresolvedDetail(missing) {
  const shown = missing.slice(0, SUMMARY_LIST_LIMIT).map((name) => (outsideRepository(name) ? OUTSIDE : name)).join(", ");
  const rest = missing.length - SUMMARY_LIST_LIMIT;
  return `These declarations are not tracked files or directories holding tracked files: ${shown}${rest > 0 ? ` and ${rest} more` : ""}.`;
}

function resolveOne(cwd, targets, field) {
  const { include, missing } = resolveTargets(cwd, targets);
  if (missing.length > 0) return { problem: fail("TARGET_UNRESOLVED", field, unresolvedDetail(missing)) };
  return { files: sortPaths([...new Set(trackedFiles(cwd, { include }))]) };
}

export function resolveInput(cwd, input) {
  const denominator = resolveOne(cwd, input.declaredTargets, "denominator.targets");
  if (denominator.problem) return denominator.problem;
  if (denominator.files.length === 0) return fail("TARGET_EMPTY", "denominator.targets", "The declared files resolve to no tracked file.");
  const tests = resolveOne(cwd, input.testTargets, "testTargets");
  if (tests.problem) return tests.problem;
  const requiredTestPaths = tests.files.filter(isTestFile);
  if (requiredTestPaths.length === 0) return fail("TARGET_EMPTY", "testTargets", "The test targets hold no tracked test file.");
  return { ok: true, denominatorPaths: denominator.files, requiredTestPaths };
}
