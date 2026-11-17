// The wording of the exclusions in the outputs (BR11.2, BR11.3, BR11.6). Every path and reason here is fictional.
import assert from "node:assert/strict";
import test from "node:test";
import { exclusionNotice, exclusionSection, headWithExclusions } from "../scripts/coverage-gate/report-exclusions.mjs";

const URL_OK = "https://github.com/example-org/example-repo/issues/12#issuecomment-345";
const REASON = `Generated file, see ${URL_OK} for the decision.`;
const item = (path, kind = "source", reason = REASON) => ({ path, reason, kind });
const doc = (exclusions) => ({ exclusions, exclusionCount: exclusions.length });
const LIMIT = 20;
const names = (n) => Array.from({ length: n }, (_, i) => item(`src/m${String(i).padStart(2, "0")}.mjs`));
const EXCEPTION_HEAD = ["Threshold lowered to 95.00% (default 100.00%) by decision exception.", ""];

test("no exclusions: the head, the section and the notice sentence add nothing, and the head comes back as it was", () => {
  const head = [...EXCEPTION_HEAD];
  assert.deepEqual(headWithExclusions(head, doc([])), EXCEPTION_HEAD);
  assert.deepEqual(headWithExclusions([], doc([])), []);
  assert.deepEqual(exclusionSection(doc([]), LIMIT), []);
  assert.equal(exclusionNotice(doc([])), "");
});

test("the head is one fixed line with the count and the count of each kind, then a blank line", () => {
  const d = doc([item("a", "source"), item("b", "source"), item("c", "test"), item("d", "both"), item("e", "both"), item("f", "both")]);
  assert.deepEqual(headWithExclusions([], d), ["Excluded from the gate: 6 (source 2, test 1, both 3)", ""]);
  assert.deepEqual(headWithExclusions([], doc([item("a", "test")])), ["Excluded from the gate: 1 (source 0, test 1, both 0)", ""]);
});

test("with the threshold line present the exclusion line is the very next line, and the blank line stays after both", () => {
  assert.deepEqual(headWithExclusions(EXCEPTION_HEAD, doc([item("a")])), [EXCEPTION_HEAD[0], "Excluded from the gate: 1 (source 1, test 0, both 0)", ""]);
});

test("the counts come from the exclusions in the document, not from exclusionCount", () => {
  const lying = { exclusions: [item("a", "source"), item("b", "test")], exclusionCount: 99 };
  assert.deepEqual(headWithExclusions([], lying), ["Excluded from the gate: 2 (source 1, test 1, both 0)", ""]);
  assert.equal(exclusionNotice(lying), " Exclusions: 2.");
  assert.ok(exclusionSection(lying, LIMIT)[1].startsWith("Excluded files (2):"));
});

test("the section lists path (kind): reason for each exclusion, in the order given, after one blank line", () => {
  const d = doc([item("src/a.mjs", "source", `first ${URL_OK}`), item("tests/b.test.mjs", "test", `second ${URL_OK}`)]);
  assert.deepEqual(exclusionSection(d, LIMIT), ["", "Excluded files (2):", `- \`src/a.mjs\` (source): \`first ${URL_OK}\``, `- \`tests/b.test.mjs\` (test): \`second ${URL_OK}\``]);
});

test("the list stops at the limit it was given and says how many more there are; 0, 1, 20 and 21 items", () => {
  assert.equal(exclusionSection(doc(names(1)), LIMIT).length, 3);
  const twenty = exclusionSection(doc(names(20)), LIMIT);
  assert.equal(twenty.length, 2 + 20);
  assert.ok(!twenty.some((line) => line.includes("more")));
  const twentyOne = exclusionSection(doc(names(21)), LIMIT);
  assert.equal(twentyOne.length, 2 + 20 + 1);
  assert.equal(twentyOne[1], "Excluded files (21):");
  assert.equal(twentyOne.at(-1), "- and 1 more (the full list is in the result file)");
  assert.ok(!twentyOne.some((line) => line.includes("m20.mjs")));
  assert.equal(exclusionSection(doc(names(100)), LIMIT).at(-1), "- and 80 more (the full list is in the result file)");
});

test("the limit is a parameter: the same items cut at another number", () => {
  const five = exclusionSection(doc(names(5)), 2);
  assert.deepEqual([five.length, five.at(-1)], [2 + 2 + 1, "- and 3 more (the full list is in the result file)"]);
  assert.equal(exclusionSection(doc(names(5)), 5).length, 2 + 5);
});

test("a path and a reason with a backtick, a bar, a percent sign or a line break cannot break out of the line", () => {
  const evil = "src/a`b|c%0A\r\nd\u0000e.mjs";
  const lines = exclusionSection(doc([item(evil, "test", "why `x` | y\r\n::error::z")]), LIMIT);
  const entry = lines[2];
  assert.ok(!/[\r\n]/.test(entry));
  assert.equal(entry.split("`").length - 1, 4, "only the two code spans' own backticks remain");
  assert.ok(!entry.includes("\u0000"));
  assert.ok(entry.startsWith("- `src/a'b|c%0A??d?e.mjs` (test): `"));
});

test("the notice sentence is one fixed sentence with the count only, led by a space, and carries no path or reason", () => {
  assert.equal(exclusionNotice(doc([item("a")])), " Exclusions: 1.");
  assert.equal(exclusionNotice(doc(names(21))), " Exclusions: 21.");
  assert.ok(!exclusionNotice(doc([item("leak-marker-path", "source", `leak-marker-reason ${URL_OK}`)])).includes("leak-marker"));
});

test("the functions are pure: same input, same output, the input is not changed, the result does not share it", () => {
  const d = doc(names(3));
  const before = JSON.stringify(d);
  assert.deepEqual(exclusionSection(d, LIMIT), exclusionSection(d, LIMIT));
  assert.deepEqual(headWithExclusions([], d), headWithExclusions([], d));
  assert.equal(JSON.stringify(d), before);
  const head = [...EXCEPTION_HEAD];
  headWithExclusions(head, d);
  assert.deepEqual(head, EXCEPTION_HEAD);
});
