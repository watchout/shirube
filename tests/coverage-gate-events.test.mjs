import assert from "node:assert/strict";
import test from "node:test";
import { parseEventLines, tallyEvents } from "../scripts/coverage-gate/events.mjs";
import { REPORTER_CASES, makeRepo, removeDir, runEventsReporter } from "./coverage-gate-fixtures.mjs";

const CWD = "/repo";
const ev = (over) => ({ type: "test:pass", file: "/repo/t/a.test.mjs", name: "adds", nesting: 0, line: 5, column: 1, detailsType: "test", skip: false, todo: false, ...over });
const implicit = (path, over) => ev({ name: path, line: 1, column: 1, ...over });
const tally = (events, testPaths = ["t/a.test.mjs"]) => tallyEvents(events, { cwd: CWD, testPaths });
const one = (events) => tally(events).observations[0];

test("counts passed and failed tests", () => {
  const o = one([ev({}), ev({ name: "two", line: 9 }), ev({ type: "test:fail", name: "bad", line: 12 })]);
  assert.deepEqual(o, { path: "t/a.test.mjs", passed: 2, implicitFilePassCount: 0, failed: 1, skipped: 0, todo: 0 });
});

test("skip and todo are counted apart from passed, whatever the outcome", () => {
  const o = one([ev({ skip: true }), ev({ todo: true, line: 7 }), ev({ type: "test:fail", todo: true, line: 8 }), ev({ line: 9 })]);
  assert.equal(o.passed, 1);
  assert.equal(o.skipped, 1);
  assert.equal(o.todo, 2);
  assert.equal(o.failed, 0);
});

test("suites are not counted", () => {
  const o = one([ev({ detailsType: "suite", name: "group" }), ev({ type: "test:fail", detailsType: "suite", name: "group2" })]);
  assert.deepEqual([o.passed, o.failed, o.implicitFilePassCount], [0, 0, 0]);
});

test("the implicit whole-file pass is kept apart and is not a test", () => {
  const o = one([implicit("t/a.test.mjs")]);
  assert.deepEqual([o.passed, o.implicitFilePassCount], [0, 1]);
});

test("a leading ./ in the event name is ignored when recognizing the implicit pass", () => {
  const o = one([implicit("./t/a.test.mjs")]);
  assert.deepEqual([o.passed, o.implicitFilePassCount], [0, 1]);
});

test("an absolute event name (a file given by its absolute path) is recognized as the implicit pass too", () => {
  const o = one([implicit("/repo/t/a.test.mjs")]);
  assert.deepEqual([o.passed, o.implicitFilePassCount], [0, 1]);
});

test("an event that differs from the implicit pass in any one field is a real test", () => {
  for (const over of [{ nesting: 1 }, { line: 2 }, { column: 2 }, { name: "t/other.test.mjs" }, { detailsType: "suite" }]) {
    const o = one([implicit("t/a.test.mjs", over)]);
    const counted = over.detailsType === "suite" ? 0 : 1;
    assert.equal(o.passed, counted, JSON.stringify(over));
    assert.equal(o.implicitFilePassCount, 0, JSON.stringify(over));
  }
});

test("a failure is counted as failed whether or not it is the implicit position", () => {
  const o = one([implicit("t/a.test.mjs", { type: "test:fail" })]);
  assert.deepEqual([o.failed, o.implicitFilePassCount], [1, 0]);
});

test("a failure that does not map to a required file is reported separately", () => {
  assert.equal(tally([ev({ type: "test:fail", file: "/elsewhere/x.test.mjs" })]).unboundFailures, 1);
  assert.equal(tally([ev({ type: "test:fail", file: undefined })]).unboundFailures, 1);
  assert.equal(tally([ev({ file: "/elsewhere/x.test.mjs" })]).unboundFailures, 0);
});

test("every required file has an observation, in code-point order, even with no events", () => {
  const t = tally([], ["t/b.test.mjs", "t/a.test.mjs"]);
  assert.deepEqual(t.observations.map((o) => o.path), ["t/a.test.mjs", "t/b.test.mjs"]);
  assert.deepEqual(t.observations[0], { path: "t/a.test.mjs", passed: 0, implicitFilePassCount: 0, failed: 0, skipped: 0, todo: 0 });
});

test("a relative file in an event is accepted", () => {
  const o = one([ev({ file: "./t/a.test.mjs" })]);
  assert.equal(o.passed, 1);
});

test("parses one JSON object per line and rejects anything else", () => {
  const good = parseEventLines(`${JSON.stringify(ev({}))}\n\n${JSON.stringify(ev({ line: 6 }))}\n`);
  assert.equal(good.ok, true);
  assert.equal(good.events.length, 2);
  assert.equal(parseEventLines("").ok, true);
  for (const bad of ["{not json}\n", "[1]\n", "42\n", 'null\n', '{"type":"malformed"}\n']) assert.equal(parseEventLines(bad).ok, false, bad);
});

// The real Node reporter over the six observed shapes (plus a nested path and a same-name test).
const cases = Object.keys(REPORTER_CASES);
const real = (() => {
  const dir = makeRepo(REPORTER_CASES);
  const result = {};
  for (const path of cases) {
    const run = runEventsReporter(dir, [path]);
    const parsed = parseEventLines(run.text);
    result[path] = { status: run.status, parsed, observation: parsed.ok ? tallyEvents(parsed.events, { cwd: dir, testPaths: [path] }).observations[0] : null };
  }
  removeDir(dir);
  return result;
})();

test("real reporter: an empty file and an import-only file are an implicit pass only, never a ran test", () => {
  for (const path of ["cases/empty.test.mjs", "cases/import-only.test.mjs", "cases/sub/nested-empty.test.mjs"]) {
    const { observation, status } = real[path];
    assert.equal(status, 0, path);
    assert.deepEqual([observation.passed, observation.implicitFilePassCount, observation.failed], [0, 1, 0], path);
  }
});

test("real reporter: an ordinary passing file counts its test and has no implicit pass", () => {
  const o = real["cases/pass.test.mjs"].observation;
  assert.deepEqual([o.passed, o.implicitFilePassCount, o.failed], [1, 0, 0]);
});

test("real reporter: all-skip and all-todo files pass nothing", () => {
  const skip = real["cases/all-skip.test.mjs"].observation;
  assert.deepEqual([skip.passed, skip.skipped, skip.implicitFilePassCount], [0, 2, 0]);
  const todo = real["cases/all-todo.test.mjs"].observation;
  assert.deepEqual([todo.passed, todo.todo, todo.implicitFilePassCount], [0, 2, 0]);
});

test("real reporter: a load failure is a whole-file failure", () => {
  const { status, observation } = real["cases/load-fail.test.mjs"];
  assert.notEqual(status, 0);
  assert.equal(observation.failed >= 1, true);
  assert.equal(observation.passed, 0);
});

test("real reporter: a test named like its file (on another line) is still a test", () => {
  const o = real["cases/sub/same-name.test.mjs"].observation;
  assert.deepEqual([o.passed, o.implicitFilePassCount], [1, 0]);
});
