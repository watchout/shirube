// The exclusion declaration check and the set difference (BR9.1 to BR9.5, BR10.1, BR10.2). Every path and value here is fictional.
import assert from "node:assert/strict";
import test from "node:test";
import { EXCLUSION_KEYS, EXCLUSION_KINDS, checkExclusions, subtractExclusions } from "../scripts/coverage-gate/exclusions.mjs";
import { RATIONALE_MAX_LENGTH } from "../scripts/coverage-gate/threshold.mjs";

const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const REASON = `Generated file, see ${URL_OK} for the decision.`;
const entry = (path, reason = REASON) => ({ path, reason });
const INVALID = "INPUT_FIELD_INVALID";
const MISSING = "INPUT_FIELD_MISSING";
const UNKNOWN = "INPUT_FIELD_UNKNOWN";

const fails = (value) => {
  const r = checkExclusions(value);
  assert.equal(r.ok, false, JSON.stringify(value));
  return r.failure;
};
const where = (value) => {
  const f = fails(value);
  return [f.reasonCode, f.field];
};

test("the owner constants: two keys for an input element, three kinds", () => {
  assert.deepEqual([...EXCLUSION_KEYS], ["path", "reason"]);
  assert.deepEqual([...EXCLUSION_KINDS], ["source", "test", "both"]);
  assert.throws(() => EXCLUSION_KEYS.push("x"), TypeError);
  assert.throws(() => EXCLUSION_KINDS.push("x"), TypeError);
});

test("no exclusions: an omitted value and an empty array are the same, an empty list", () => {
  assert.deepEqual(checkExclusions(undefined), { ok: true, exclusions: [] });
  assert.deepEqual(checkExclusions([]), { ok: true, exclusions: [] });
});

test("a value that is not an array is refused as invalid at exclusions, never read as no exclusions", () => {
  for (const value of [null, "src/a.mjs", {}, { path: "a", reason: REASON }, 5, true, false]) assert.deepEqual(where(value), [INVALID, "exclusions"], JSON.stringify(value));
});

test("an element that is not an object is refused at its position", () => {
  for (const element of [null, [], [entry("a")], "a", 5, true, undefined]) {
    assert.deepEqual(where([entry("ok.mjs"), element]), [INVALID, "exclusions[1]"], JSON.stringify(element));
  }
});

test("a key other than path and reason is unknown; the first in code-point order is named; it comes before a missing key", () => {
  assert.deepEqual(where([{ ...entry("a"), kind: "source" }]), [UNKNOWN, "exclusions[0].kind"]);
  assert.deepEqual(where([{ ...entry("a"), zeta: 1, alpha: 1 }]), [UNKNOWN, "exclusions[0].alpha"]);
  assert.deepEqual(where([{ extra: 1 }]), [UNKNOWN, "exclusions[0].extra"]);
  assert.deepEqual(where([entry("a"), { ...entry("b"), extra: 1 }]), [UNKNOWN, "exclusions[1].extra"]);
  for (const key of ["__proto__", "constructor", "prototype"]) {
    const parsed = JSON.parse(`[{"path":"a","reason":${JSON.stringify(REASON)},"${key}":{"polluted":true}}]`);
    assert.deepEqual(where(parsed), [UNKNOWN, `exclusions[0].${key}`], key);
  }
  assert.equal({}.polluted, undefined);
});

test("a missing path or reason is named, path first when both are missing", () => {
  assert.deepEqual(where([{}]), [MISSING, "exclusions[0].path"]);
  assert.deepEqual(where([{ reason: REASON }]), [MISSING, "exclusions[0].path"]);
  assert.deepEqual(where([{ path: "a" }]), [MISSING, "exclusions[0].reason"]);
  assert.deepEqual(where([entry("a"), { path: "b" }]), [MISSING, "exclusions[1].reason"]);
  assert.deepEqual(where([{ path: 5 }]), [MISSING, "exclusions[0].reason"], "a missing key is reported before a bad path");
});

test("a path that is not a string or is empty is refused; any other string is kept as written", () => {
  for (const path of [5, "", null, ["a"], {}, true]) assert.deepEqual(where([{ path, reason: REASON }]), [INVALID, "exclusions[0].path"], JSON.stringify(path));
  for (const path of ["src/a.mjs", "./a.mjs", "../a.mjs", "/abs/a.mjs", "src/*.mjs", "src", " space ", "A.MJS", "日本語.mjs"]) {
    assert.deepEqual(checkExclusions([entry(path)]).exclusions, [entry(path)], path);
  }
});

test("a reason is checked by the sentence rule: 1 to 300 characters on one line, no control or command or table sequences", () => {
  const fill = (n) => `${URL_OK} ${"x".repeat(n - URL_OK.length - 1)}`;
  assert.equal(checkExclusions([entry("a", fill(RATIONALE_MAX_LENGTH))]).ok, true);
  const bad = [fill(RATIONALE_MAX_LENGTH + 1), "", " ", `${URL_OK}\nmore`, `${URL_OK}\r`, `${URL_OK}\t`, `${URL_OK} \u0000`, `${URL_OK} ::error::`, `${URL_OK} %0A`, `${URL_OK} %0d`, `${URL_OK} a|b`, `${URL_OK} \`x\``, 5, null, ["x"], {}];
  for (const reason of bad) assert.deepEqual(where([{ path: "a", reason }]), [INVALID, "exclusions[0].reason"], JSON.stringify(reason).slice(0, 40));
});

test("a reason with no decision URL piece is refused, and so is one where the URL is glued to other text", () => {
  const base = "https://github.com/example-org/example-repo";
  const bad = ["no address", `${base}/issues/12`, `${URL_OK}?tab=1`, `see:${URL_OK}`, `説明${URL_OK}`, `${URL_OK}。`, `(${URL_OK})`, `see　${URL_OK}`, `http://github.com/a/b/issues/1#issuecomment-2`];
  for (const reason of bad) assert.deepEqual(where([{ path: "a", reason }]), [INVALID, "exclusions[0].reason"], reason);
  for (const reason of [URL_OK, `${URL_OK} is why`, `why: ${URL_OK}`, `x  ${URL_OK}  y`, `a ${URL_OK} b https://example.invalid/x`]) assert.equal(checkExclusions([entry("a", reason)]).ok, true, reason);
});

test("the sentence rule is checked before the URL rule: a multi-line reason with no URL is refused as a sentence", () => {
  assert.equal(fails([{ path: "a", reason: "one\ntwo" }]).detail.includes("one line"), true);
  assert.equal(fails([{ path: "a", reason: "one line with no address" }]).detail.includes("address"), true);
});

test("the first failure by position is the one reported, element by element", () => {
  assert.deepEqual(where([{ path: "a", reason: "no address" }, null]), [INVALID, "exclusions[0].reason"]);
  assert.deepEqual(where([entry("a"), { path: 5, reason: REASON }, { path: "b" }]), [INVALID, "exclusions[1].path"]);
  assert.deepEqual(where([entry("a"), entry("a"), { path: "b" }]), [MISSING, "exclusions[2].reason"], "a repeat is judged after every element has a good form");
});

test("a repeated path is refused at the later position; spelling differences are different paths here", () => {
  assert.deepEqual(where([entry("a.mjs"), entry("b.mjs"), entry("a.mjs")]), [INVALID, "exclusions[2].path"]);
  assert.deepEqual(where([entry("a.mjs"), entry("a.mjs"), entry("a.mjs")]), [INVALID, "exclusions[1].path"]);
  assert.equal(checkExclusions([entry("a.mjs"), entry("A.mjs"), entry("./a.mjs"), entry("a.mjs ")]).ok, true);
});

test("the result is sorted by code point, whatever the order of the input, and the objects are new", () => {
  const paths = ["b.mjs", "a.mjs", "😀.mjs", "ｚ.mjs", "B.mjs"];
  const input = paths.map((path) => entry(path));
  const first = checkExclusions(input);
  assert.deepEqual(first.exclusions.map((e) => e.path), ["B.mjs", "a.mjs", "b.mjs", "ｚ.mjs", "😀.mjs"]);
  assert.deepEqual(checkExclusions([...input].reverse()), first);
  assert.deepEqual(checkExclusions([input[2], input[0], input[4], input[1], input[3]]), first);
  assert.notEqual(first.exclusions[0], input[4]);
  first.exclusions[0].reason = "changed afterwards";
  assert.equal(input[4].reason, REASON);
});

test("the check is pure: the same input gives the same result and the input is not changed", () => {
  const input = [entry("b"), entry("a")];
  const before = JSON.stringify(input);
  assert.deepEqual(checkExclusions(input), checkExclusions(input));
  assert.equal(JSON.stringify(input), before);
});

test("a failure is one plain line that names the position and never echoes the path or the reason", () => {
  const leak = "leak-marker-path";
  const cases = [[{ path: leak }], [{ path: leak, reason: "leak-marker-reason::x" }], [{ path: "", reason: "leak-marker-reason" }], [entry(leak), entry(leak)], [{ path: leak, reason: "leak-marker-reason no address" }]];
  for (const value of cases) {
    const f = fails(value);
    assert.ok(f.detail.length > 0 && !/[\r\n]/.test(f.detail), f.detail);
    assert.ok(!f.detail.includes("leak-marker") && !f.field.includes("leak-marker"), f.detail);
  }
});

test("very long values are handled in linear time: a long path is kept, a long reason is refused without a full scan", () => {
  const started = Date.now();
  assert.equal(checkExclusions([entry("a".repeat(5_000_000))]).ok, true);
  for (const reason of ["a".repeat(5_000_000), "😀".repeat(2_000_000), "a ".repeat(2_000_000), " ".repeat(5_000_000)]) assert.equal(checkExclusions([{ path: "a", reason }]).ok, false);
  assert.ok(Date.now() - started < 1000, "the long values took far longer than a linear pass");
});

const S = ["src/a.mjs", "src/b.mjs", "src/c.mjs", "src/shared.test.mjs"];
const T = ["tests/a.test.mjs", "tests/b.test.mjs", "src/shared.test.mjs"];
const subtract = (paths, den = S, tests = T) => subtractExclusions(den, tests, paths.map((path) => entry(path)));
const sfails = (paths, den = S, tests = T) => {
  const r = subtract(paths, den, tests);
  assert.equal(r.ok, false, paths.join(","));
  return r.failure;
};

test("with no exclusions both lists are returned as they are, with an empty excluded list", () => {
  const r = subtractExclusions(S, T, []);
  assert.equal(r.ok, true);
  assert.equal(r.denominatorPaths, S);
  assert.equal(r.requiredTestPaths, T);
  assert.deepEqual(r.excluded, []);
});

test("a source is taken out of the denominator only, a test out of the required tests only, a file in both lists out of both", () => {
  const r = subtract(["src/a.mjs", "tests/b.test.mjs", "src/shared.test.mjs"]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.denominatorPaths, ["src/b.mjs", "src/c.mjs"]);
  assert.deepEqual(r.requiredTestPaths, ["tests/a.test.mjs"]);
  assert.deepEqual(r.excluded, [
    { path: "src/a.mjs", reason: REASON, kind: "source" },
    { path: "tests/b.test.mjs", reason: REASON, kind: "test" },
    { path: "src/shared.test.mjs", reason: REASON, kind: "both" },
  ]);
});

test("excluding a source does not take out the test of the same name, and excluding a test does not take out the source", () => {
  const src = subtract(["src/a.mjs"]);
  assert.deepEqual(src.requiredTestPaths, T);
  const test_ = subtract(["tests/a.test.mjs"]);
  assert.deepEqual(test_.denominatorPaths, S);
  assert.deepEqual(test_.requiredTestPaths, ["tests/b.test.mjs", "src/shared.test.mjs"]);
});

test("a test that is not named stays required, however many others are excluded", () => {
  assert.deepEqual(subtract(["tests/a.test.mjs"]).requiredTestPaths.includes("tests/b.test.mjs"), true);
});

test("the order of the lists is kept, and the excluded list follows the order it was given", () => {
  const r = subtract(["src/c.mjs", "src/a.mjs"]);
  assert.deepEqual(r.denominatorPaths, ["src/b.mjs", "src/shared.test.mjs"]);
  assert.deepEqual(r.excluded.map((e) => e.path), ["src/c.mjs", "src/a.mjs"]);
});

test("a path in neither list is refused at its position, whatever its spelling", () => {
  const spellings = ["src/new.mjs", "SRC/A.MJS", "src/A.mjs", "./src/a.mjs", "src//a.mjs", "src/../src/a.mjs", "../outside.mjs", "/abs/src/a.mjs", "src", "src/", "src/*.mjs", "src/**", "src/a.mjs ", "", "constructor", "__proto__", "toString"];
  for (const path of spellings) {
    const f = sfails(["src/a.mjs", path].sort());
    assert.equal(f.reasonCode, "TARGET_UNRESOLVED", path);
  }
  assert.deepEqual([sfails(["src/new.mjs"]).reasonCode, sfails(["src/new.mjs"]).field], ["TARGET_UNRESOLVED", "exclusions[0].path"]);
  assert.equal(sfails(["src/a.mjs", "src/b.mjs", "nope.mjs"]).field, "exclusions[2].path");
});

test("when several paths are unmatched the first by position is named, and that comes before an empty result", () => {
  assert.equal(sfails(["src/a.mjs", "x1", "x2"]).field, "exclusions[1].path");
  const f = sfails(["src/a.mjs", "src/b.mjs", "src/c.mjs", "src/shared.test.mjs", "x1"]);
  assert.deepEqual([f.reasonCode, f.field], ["TARGET_UNRESOLVED", "exclusions[4].path"]);
});

test("the failure for an unmatched path is a fixed sentence that does not carry the path", () => {
  const long = "/very/long/absolute/leak-marker/".repeat(40_000);
  for (const path of ["/abs/leak-marker.mjs", "../leak-marker.mjs", "leak-marker/x.mjs", long]) {
    const f = sfails([path]);
    assert.ok(!f.detail.includes("leak-marker") && !f.field.includes("leak-marker") && !/[\r\n]/.test(f.detail), path.slice(0, 20));
    assert.ok(f.detail.length < 300);
  }
});

test("taking out every source is refused, and so is taking out every required test; the two have different sentences", () => {
  const noSource = sfails(["src/a.mjs", "src/b.mjs", "src/c.mjs", "src/shared.test.mjs"].sort());
  assert.deepEqual([noSource.reasonCode, noSource.field], ["TARGET_EMPTY", "exclusions"]);
  const noTest = sfails(["tests/a.test.mjs", "tests/b.test.mjs", "src/shared.test.mjs"].sort());
  assert.deepEqual([noTest.reasonCode, noTest.field], ["TARGET_EMPTY", "exclusions"]);
  assert.notEqual(noSource.detail, noTest.detail);
  assert.ok(noSource.detail.includes("denominator") && noTest.detail.includes("required test"));
  const both = subtractExclusions(["src/a.test.mjs"], ["src/a.test.mjs"], [entry("src/a.test.mjs")]);
  assert.deepEqual([both.ok, both.failure.field, both.failure.detail], [false, "exclusions", noSource.detail], "when both are empty the denominator is reported first");
});

test("one source left and one test left is enough", () => {
  const r = subtract(["src/a.mjs", "src/b.mjs", "tests/a.test.mjs"]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.requiredTestPaths, ["tests/b.test.mjs", "src/shared.test.mjs"]);
});

test("the lists given are not changed and the result does not share them", () => {
  const den = [...S];
  const tests = [...T];
  const list = [entry("src/a.mjs")];
  const r = subtractExclusions(den, tests, list);
  assert.deepEqual([den, tests, list], [S, T, [entry("src/a.mjs")]]);
  r.denominatorPaths.push("x");
  r.excluded[0].reason = "changed afterwards";
  assert.deepEqual(den, S);
  assert.equal(list[0].reason, REASON);
});

test("5,000 files and 1,000 exclusions take well under the loose limit, and results are the same twice", () => {
  const den = Array.from({ length: 5000 }, (_, i) => `src/m${String(i).padStart(5, "0")}.mjs`);
  const tests = Array.from({ length: 50 }, (_, i) => `tests/t${i}.test.mjs`);
  const list = den.slice(0, 1000).map((path) => entry(path));
  const started = Date.now();
  const first = subtractExclusions(den, tests, list);
  assert.equal(first.ok, true);
  assert.equal(first.denominatorPaths.length, 4000);
  assert.deepEqual(subtractExclusions(den, tests, list), first);
  assert.ok(Date.now() - started < 10_000);
  const checked = checkExclusions(list);
  assert.equal(checked.ok, true);
  assert.equal(checked.exclusions.length, 1000);
});
