import assert from "node:assert/strict";
import test from "node:test";
import { compareCodePoint, sortPaths } from "../scripts/coverage-gate/order.mjs";

test("sorts by code point, not by UTF-16 code unit", () => {
  const astral = "\u{10000}";
  const bmpHigh = "￿";
  assert.deepEqual(sortPaths([astral, "b", bmpHigh, "a"]), ["a", "b", bmpHigh, astral]);
});

test("does not mutate the input and handles empty and equal entries", () => {
  const input = ["b", "a", "b"];
  assert.deepEqual(sortPaths(input), ["a", "b", "b"]);
  assert.deepEqual(input, ["b", "a", "b"]);
  assert.deepEqual(sortPaths([]), []);
});

test("compareCodePoint returns a sign", () => {
  assert.ok(compareCodePoint("a", "b") < 0);
  assert.ok(compareCodePoint("b", "a") > 0);
  assert.equal(compareCodePoint("a", "a"), 0);
  assert.ok(compareCodePoint("￿", "\u{10000}") < 0);
});

test("a prefix sorts before its extension and directories sort by character", () => {
  assert.deepEqual(sortPaths(["src/a.mjs", "src/a", "src-b/x.mjs", "src/b.mjs"]), ["src-b/x.mjs", "src/a", "src/a.mjs", "src/b.mjs"]);
});
