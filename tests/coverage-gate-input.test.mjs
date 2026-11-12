import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DEADLINE_SECONDS, DEFAULT_TOTAL_BUDGET_SECONDS, checkInput, isTestFile } from "../scripts/coverage-gate/input.mjs";

const good = { schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["src"] }, testTargets: ["tests"] };
const text = (over = {}) => JSON.stringify({ ...good, ...over });
const fails = (t) => {
  const r = checkInput(t);
  assert.equal(r.ok, false, String(t));
  return r.failure;
};
const code = (t) => fails(t).reasonCode;

test("a complete input is accepted and gets the default time limits", () => {
  const r = checkInput(text());
  assert.equal(r.ok, true);
  assert.deepEqual(r.input, { schemaVersion: 1, shape: "node-builtin", declaredTargets: ["src"], testTargets: ["tests"], deadlineSeconds: 600, totalBudgetSeconds: 900 });
  assert.deepEqual([DEFAULT_DEADLINE_SECONDS, DEFAULT_TOTAL_BUDGET_SECONDS], [600, 900]);
});

test("given limits are kept, and a deadline above the total budget is not invalid", () => {
  const r = checkInput(text({ deadlineSeconds: 50, totalBudgetSeconds: 20 }));
  assert.deepEqual([r.input.deadlineSeconds, r.input.totalBudgetSeconds], [50, 20]);
  assert.equal(checkInput(text({ deadlineSeconds: 1 })).input.totalBudgetSeconds, 900);
});

test("unreadable input: missing text, broken JSON, and anything that is not an object", () => {
  for (const t of [null, "", "{not json", "[]", "[1]", "42", '"text"', "null", "true"]) {
    const f = fails(t);
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_UNREADABLE", "$"], String(t));
    assert.equal(typeof f.detail, "string");
  }
});

test("schemaVersion must be the integer 1", () => {
  for (const over of [{ schemaVersion: 2 }, { schemaVersion: "1" }, { schemaVersion: 1.5 }, { schemaVersion: null }, { schemaVersion: true }, { schemaVersion: [1] }]) {
    const f = fails(text(over));
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_VERSION_INVALID", "schemaVersion"], JSON.stringify(over));
  }
  const missing = { ...good };
  delete missing.schemaVersion;
  assert.equal(code(JSON.stringify(missing)), "INPUT_VERSION_INVALID");
});

test("keys this version does not know are refused at every level, including the later-unit fields", () => {
  for (const key of ["threshold", "mode", "exclusions", "measurement", "extra"]) {
    const f = fails(text({ [key]: 1 }));
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_FIELD_UNKNOWN", key]);
    assert.ok(f.detail.includes(key));
  }
  const nested = fails(text({ denominator: { targets: ["src"], exclude: ["x"] } }));
  assert.deepEqual([nested.reasonCode, nested.field], ["INPUT_FIELD_UNKNOWN", "denominator.exclude"]);
});

test("the first unknown key in code-point order is the one reported", () => {
  const f = fails(text({ zeta: 1, alpha: 1 }));
  assert.equal(f.field, "alpha");
});

test("the checks run in a fixed order: unreadable, version, unknown keys, shape, targets, test targets, limits", () => {
  assert.equal(code(JSON.stringify({ schemaVersion: 2, extra: 1, shape: "x" })), "INPUT_VERSION_INVALID");
  assert.equal(code(JSON.stringify({ schemaVersion: 1, extra: 1, shape: "x" })), "INPUT_FIELD_UNKNOWN");
  assert.equal(code(JSON.stringify({ schemaVersion: 1, shape: "x", denominator: {}, testTargets: [] })), "INPUT_SHAPE_UNSUPPORTED");
  assert.equal(code(JSON.stringify({ schemaVersion: 1, shape: "node-builtin", denominator: {}, testTargets: [], deadlineSeconds: 0 })), "INPUT_FIELD_MISSING");
  assert.equal(code(JSON.stringify({ schemaVersion: 1, shape: "node-builtin", denominator: { targets: ["src"] }, testTargets: [], deadlineSeconds: 0 })), "INPUT_FIELD_INVALID");
});

test("shape is required and only node-builtin is accepted", () => {
  const missing = { ...good };
  delete missing.shape;
  const m = fails(JSON.stringify(missing));
  assert.deepEqual([m.reasonCode, m.field], ["INPUT_FIELD_MISSING", "shape"]);
  for (const shape of ["typescript-vitest", "", 7, null]) {
    const f = fails(text({ shape }));
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_SHAPE_UNSUPPORTED", "shape"], String(shape));
  }
  assert.ok(fails(text({ shape: "typescript-vitest" })).detail.includes("typescript-vitest"));
});

test("denominator.targets is required and must be a non-empty list of non-empty strings", () => {
  const missing = fails(JSON.stringify({ ...good, denominator: {} }));
  assert.deepEqual([missing.reasonCode, missing.field], ["INPUT_FIELD_MISSING", "denominator.targets"]);
  const none = { ...good };
  delete none.denominator;
  assert.deepEqual([fails(JSON.stringify(none)).reasonCode, fails(JSON.stringify(none)).field], ["INPUT_FIELD_MISSING", "denominator.targets"]);
  for (const targets of [[], "src", [""], [1], ["src", ""], null, {}]) {
    const f = fails(text({ denominator: { targets } }));
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_FIELD_INVALID", "denominator.targets"], JSON.stringify(targets));
  }
  assert.equal(fails(text({ denominator: [] })).field, "denominator");
});

test("testTargets is required and must be a non-empty list of non-empty strings", () => {
  const none = { ...good };
  delete none.testTargets;
  const m = fails(JSON.stringify(none));
  assert.deepEqual([m.reasonCode, m.field], ["INPUT_FIELD_MISSING", "testTargets"]);
  for (const testTargets of [[], "tests", [""], [2], null]) {
    const f = fails(text({ testTargets }));
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_FIELD_INVALID", "testTargets"], JSON.stringify(testTargets));
  }
});

test("time limits must be integers of at least 1 when present", () => {
  for (const name of ["deadlineSeconds", "totalBudgetSeconds"]) {
    for (const value of [0, -1, 1.5, "5", null, true, [], 1e400]) {
      const f = fails(text({ [name]: value }));
      assert.deepEqual([f.reasonCode, f.field], ["INPUT_FIELD_INVALID", name], `${name}=${JSON.stringify(value)}`);
    }
    assert.equal(checkInput(text({ [name]: 1 })).ok, true);
  }
});

test("a failure always has a code, a field and a plain sentence", () => {
  for (const t of [null, "{", text({ schemaVersion: 3 }), text({ x: 1 }), text({ shape: "q" }), text({ testTargets: [] })]) {
    const f = fails(t);
    assert.ok(/^[A-Z_]+$/.test(f.reasonCode) && f.field.length > 0 && f.detail.length > 0 && !/[\r\n]/.test(f.detail));
  }
});

test("a test file is recognized by its basename pattern", () => {
  for (const path of ["a.test.js", "t/a.test.mjs", "x/y/z.test.cjs", "-x.test.mjs"]) assert.equal(isTestFile(path), true, path);
  for (const path of ["a.js", "a.test.ts", "t/atest.mjs", "a.test.mjs.bak", "tests/helpers.mjs", "a.test"]) assert.equal(isTestFile(path), false, path);
});
