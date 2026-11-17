import assert from "node:assert/strict";
import test from "node:test";
import { checkExclusions } from "../scripts/coverage-gate/exclusions.mjs";
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
  assert.deepEqual(r.input, { schemaVersion: 1, shape: "node-builtin", declaredTargets: ["src"], testTargets: ["tests"], deadlineSeconds: 600, totalBudgetSeconds: 900, mode: "enforce", threshold: null, exclusions: [] });
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
  for (const key of ["exclusion", "excludes", "Exclusions", "measurement", "extra", "Threshold", "Mode", "thresholds", "modes"]) {
    const f = fails(text({ [key]: 1 }));
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_FIELD_UNKNOWN", key]);
    assert.ok(f.detail.includes(key));
  }
  const nested = fails(text({ denominator: { targets: ["src"], exclude: ["x"] } }));
  assert.deepEqual([nested.reasonCode, nested.field], ["INPUT_FIELD_UNKNOWN", "denominator.exclude"]);
});

test("names that could reach an object's prototype are ordinary unknown keys", () => {
  for (const key of ["__proto__", "constructor", "prototype"]) {
    const f = fails(`{"schemaVersion":1,"${key}":{"polluted":true},"shape":"node-builtin"}`);
    assert.deepEqual([f.reasonCode, f.field], ["INPUT_FIELD_UNKNOWN", key]);
  }
  assert.equal({}.polluted, undefined);
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

// U4: the threshold exception and the mode (BR6.1, BR6.2, BR7.1). Every value here is fictional.
const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const EXCEPTION = { percent: 95, decisionUrl: URL_OK, rationale: "Example rationale for a lowered line." };
const where = (t) => [fails(t).reasonCode, fails(t).field];

test("threshold, mode and exclusions are known keys now; measurement and the other spellings are still unknown", () => {
  assert.equal(checkInput(text({ mode: "enforce", threshold: EXCEPTION })).ok, true);
  for (const key of ["exclusion", "excludes", "measurement"]) assert.deepEqual(where(text({ mode: "enforce", [key]: 1 })), ["INPUT_FIELD_UNKNOWN", key]);
  assert.deepEqual(where(text({ threshold: { ...EXCEPTION, extra: 1 } })), ["INPUT_FIELD_UNKNOWN", "threshold.extra"]);
  assert.deepEqual(where(text({ threshold: { ...EXCEPTION, exclusions: [] } })), ["INPUT_FIELD_UNKNOWN", "threshold.exclusions"]);
});

test("an input with no threshold, no mode and no exclusions is the old input plus mode enforce, threshold null and an empty exclusions list, nothing else", () => {
  const r = checkInput(text());
  assert.deepEqual(Object.keys(r.input), ["schemaVersion", "shape", "declaredTargets", "testTargets", "deadlineSeconds", "totalBudgetSeconds", "mode", "threshold", "exclusions"]);
  assert.deepEqual([r.input.mode, r.input.threshold, r.input.exclusions], ["enforce", null, []]);
});

test("mode: enforce and record-only are accepted exactly; an omitted mode is enforce", () => {
  for (const mode of ["enforce", "record-only"]) assert.deepEqual([checkInput(text({ mode })).ok, checkInput(text({ mode })).input.mode], [true, mode]);
  assert.equal(checkInput(text()).input.mode, "enforce");
});

test("mode: any other value is refused as invalid and is never read as enforce or record-only", () => {
  for (const mode of ["fail", "Enforce", "ENFORCE", "record", "record_only", "Record-Only", " enforce", "enforce ", "record-only\n", "", null, 0, 1, true, false, [], ["enforce"], {}]) {
    assert.deepEqual(where(text({ mode })), ["INPUT_FIELD_INVALID", "mode"], JSON.stringify(mode));
  }
});

test("threshold: a complete exception is carried into the input as whole hundredths, with the other two kept as given", () => {
  const r = checkInput(text({ mode: "record-only", threshold: { ...EXCEPTION, percent: 99.99 } }));
  assert.deepEqual([r.ok, r.input.mode], [true, "record-only"]);
  assert.deepEqual(r.input.threshold, { percentHundredths: 9999, decisionUrl: URL_OK, rationale: EXCEPTION.rationale });
});

test("threshold: each failure has its own reason code and field, as the exception check gives them", () => {
  const cases = [
    [null, ["INPUT_FIELD_INVALID", "threshold"]], [[], ["INPUT_FIELD_INVALID", "threshold"]], ["95", ["INPUT_FIELD_INVALID", "threshold"]], [95, ["INPUT_FIELD_INVALID", "threshold"]],
    [{}, ["INPUT_FIELD_MISSING", "threshold.percent"]], [{ percent: 95, rationale: "r" }, ["INPUT_FIELD_MISSING", "threshold.decisionUrl"]], [{ percent: 95, decisionUrl: URL_OK }, ["INPUT_FIELD_MISSING", "threshold.rationale"]],
    [{ ...EXCEPTION, percent: 100 }, ["INPUT_FIELD_INVALID", "threshold.percent"]], [{ ...EXCEPTION, percent: "95" }, ["INPUT_FIELD_INVALID", "threshold.percent"]],
    [{ ...EXCEPTION, decisionUrl: "http://github.com/a/b/issues/1#issuecomment-2" }, ["INPUT_FIELD_INVALID", "threshold.decisionUrl"]],
    [{ ...EXCEPTION, rationale: "a | b" }, ["INPUT_FIELD_INVALID", "threshold.rationale"]], [{ ...EXCEPTION, rationale: "" }, ["INPUT_FIELD_INVALID", "threshold.rationale"]],
  ];
  for (const [threshold, expected] of cases) assert.deepEqual(where(text({ threshold })), expected, JSON.stringify(threshold));
});

test("a failed exception never falls back to the default line or to no exception: the input is refused whole", () => {
  for (const threshold of [{ percent: 95 }, { ...EXCEPTION, decisionUrl: "" }, { ...EXCEPTION, percent: 100 }]) {
    const r = checkInput(text({ mode: "record-only", threshold }));
    assert.equal(r.ok, false);
    assert.equal(r.input, undefined);
  }
});

test("record-only does not soften an input failure: the input is refused in either mode", () => {
  for (const mode of ["enforce", "record-only"]) {
    assert.equal(checkInput(text({ mode, testTargets: [] })).ok, false);
    assert.equal(checkInput(text({ mode, threshold: { percent: 95 } })).ok, false);
    assert.equal(checkInput(text({ mode, extra: 1 })).ok, false);
  }
});

test("the checks run in a fixed order: the time limits, then mode, then threshold", () => {
  assert.deepEqual(where(text({ deadlineSeconds: 0, mode: "fail", threshold: null })), ["INPUT_FIELD_INVALID", "deadlineSeconds"]);
  assert.deepEqual(where(text({ totalBudgetSeconds: 0, mode: "fail", threshold: null })), ["INPUT_FIELD_INVALID", "totalBudgetSeconds"]);
  assert.deepEqual(where(text({ mode: "fail", threshold: null })), ["INPUT_FIELD_INVALID", "mode"]);
  assert.deepEqual(where(text({ mode: "enforce", threshold: null })), ["INPUT_FIELD_INVALID", "threshold"]);
  assert.deepEqual(where(text({ threshold: { percent: 95 }, extra: 1 })), ["INPUT_FIELD_UNKNOWN", "extra"]);
});

test("the input text with prototype-looking names inside threshold is refused without changing any object", () => {
  const body = `{"schemaVersion":1,"shape":"node-builtin","denominator":{"targets":["src"]},"testTargets":["tests"],"threshold":{"percent":95,"decisionUrl":"${URL_OK}","rationale":"r","__proto__":{"polluted":true}}}`;
  assert.deepEqual(where(body), ["INPUT_FIELD_UNKNOWN", "threshold.__proto__"]);
  assert.equal({}.polluted, undefined);
});

// U5: the exclusions list (BR9.1, BR10.4 (3)). Every value here is fictional.
const REASON = `Generated file, see ${URL_OK} for the decision.`;
const entry = (path, reason = REASON) => ({ path, reason });

test("exclusions: an omitted value and an empty array are both an empty list in the checked input", () => {
  assert.deepEqual(checkInput(text()).input.exclusions, []);
  assert.deepEqual(checkInput(text({ exclusions: [] })).input.exclusions, []);
  assert.deepEqual(checkInput(text({ exclusions: [] })).input, checkInput(text()).input);
});

test("exclusions: one or more are carried into the checked input in code-point order, whatever the order written", () => {
  const written = [entry("src/b.mjs"), entry("src/a.mjs"), entry("src/ｚ.mjs"), entry("src/😀.mjs")];
  const r = checkInput(text({ exclusions: written }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.input.exclusions.map((e) => e.path), ["src/a.mjs", "src/b.mjs", "src/ｚ.mjs", "src/😀.mjs"]);
  assert.deepEqual(checkInput(text({ exclusions: [...written].reverse() })), r);
  assert.deepEqual(r.input.exclusions[0], entry("src/a.mjs"));
});

test("exclusions: each failure is the one the exclusions check gives, with its own reason code and field", () => {
  const cases = [
    [null, ["INPUT_FIELD_INVALID", "exclusions"]], ["src/a.mjs", ["INPUT_FIELD_INVALID", "exclusions"]], [{}, ["INPUT_FIELD_INVALID", "exclusions"]], [50, ["INPUT_FIELD_INVALID", "exclusions"]],
    [[null], ["INPUT_FIELD_INVALID", "exclusions[0]"]], [[entry("a"), "b"], ["INPUT_FIELD_INVALID", "exclusions[1]"]],
    [[{ ...entry("a"), extra: 1 }], ["INPUT_FIELD_UNKNOWN", "exclusions[0].extra"]], [[{ ...entry("a"), kind: "source" }], ["INPUT_FIELD_UNKNOWN", "exclusions[0].kind"]],
    [[{}], ["INPUT_FIELD_MISSING", "exclusions[0].path"]], [[{ path: "a" }], ["INPUT_FIELD_MISSING", "exclusions[0].reason"]],
    [[{ path: "", reason: REASON }], ["INPUT_FIELD_INVALID", "exclusions[0].path"]], [[{ path: 5, reason: REASON }], ["INPUT_FIELD_INVALID", "exclusions[0].path"]],
    [[{ path: "a", reason: "no decision address" }], ["INPUT_FIELD_INVALID", "exclusions[0].reason"]], [[{ path: "a", reason: `${URL_OK}\nmore` }], ["INPUT_FIELD_INVALID", "exclusions[0].reason"]],
    [[entry("a"), entry("a")], ["INPUT_FIELD_INVALID", "exclusions[1].path"]],
  ];
  for (const [value, expected] of cases) {
    assert.deepEqual(where(text({ exclusions: value })), expected, JSON.stringify(value));
    assert.deepEqual(fails(text({ exclusions: value })), checkExclusions(value).failure, JSON.stringify(value));
  }
});

test("exclusions: another way to name them is an unknown key, never read as an exclusion", () => {
  for (const key of ["exclusion", "excludes", "exclude", "Exclusions"]) assert.deepEqual(where(text({ [key]: [entry("src/a.mjs")] })), ["INPUT_FIELD_UNKNOWN", key], key);
  assert.deepEqual(where(JSON.stringify({ ...good, denominator: { targets: ["src"], exclusions: [entry("src/a.mjs")] } })), ["INPUT_FIELD_UNKNOWN", "denominator.exclusions"]);
  assert.deepEqual(where(text({ testTargets: ["tests"], measurement: 1, exclusions: [] })), ["INPUT_FIELD_UNKNOWN", "measurement"]);
});

test("exclusions: they are checked after the time limits, the mode and the threshold, and after the earlier checks", () => {
  const badExclusions = [{ path: "" }];
  assert.deepEqual(where(text({ deadlineSeconds: 0, exclusions: badExclusions })), ["INPUT_FIELD_INVALID", "deadlineSeconds"]);
  assert.deepEqual(where(text({ totalBudgetSeconds: 0, exclusions: badExclusions })), ["INPUT_FIELD_INVALID", "totalBudgetSeconds"]);
  assert.deepEqual(where(text({ mode: "fail", exclusions: badExclusions })), ["INPUT_FIELD_INVALID", "mode"]);
  assert.deepEqual(where(text({ threshold: { ...EXCEPTION, percent: 100 }, exclusions: badExclusions })), ["INPUT_FIELD_INVALID", "threshold.percent"]);
  assert.deepEqual(where(text({ shape: "q", exclusions: badExclusions })), ["INPUT_SHAPE_UNSUPPORTED", "shape"]);
  assert.deepEqual(where(text({ testTargets: [], exclusions: badExclusions })), ["INPUT_FIELD_INVALID", "testTargets"]);
  assert.deepEqual(where(text({ extra: 1, exclusions: badExclusions })), ["INPUT_FIELD_UNKNOWN", "extra"]);
  assert.deepEqual(where(text({ exclusions: badExclusions })), ["INPUT_FIELD_MISSING", "exclusions[0].reason"]);
});

test("exclusions: a failed check gives no input, and the checked exclusions are new objects", () => {
  assert.equal(checkInput(text({ exclusions: [null] })).input, undefined);
  const written = [entry("src/a.mjs")];
  const r = checkInput(JSON.stringify({ ...good, exclusions: written }));
  r.input.exclusions[0].reason = "changed afterwards";
  assert.equal(written[0].reason, REASON);
});

test("exclusions: a failure never carries the path or the reason that was written", () => {
  const f = fails(text({ exclusions: [{ path: "leak-marker-path", reason: "leak-marker-reason no address" }] }));
  assert.ok(!f.detail.includes("leak-marker") && !f.field.includes("leak-marker"));
});
