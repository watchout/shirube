import assert from "node:assert/strict";
import test from "node:test";
import { LCOV_MAX_BYTES, isLcovTooLarge, parseLcov } from "../scripts/coverage-gate/lcov.mjs";

const CWD = "/repo";
const rec = (lines, ...extra) => ["TN:", ...lines, ...extra, "end_of_record"].join("\n");

test("converts DA lines into line records and the measured path", () => {
  const text = `${rec(["SF:/repo/src/a.mjs", "DA:1,1", "DA:2,0", "DA:3,5,abcd", "LF:3", "LH:2"])}\n`;
  const r = parseLcov(text, CWD);
  assert.equal(r.ok, true);
  assert.deepEqual(r.measuredPaths, ["src/a.mjs"]);
  assert.deepEqual(r.records, [
    { path: "src/a.mjs", lineNumber: 1, hitCount: 1 },
    { path: "src/a.mjs", lineNumber: 2, hitCount: 0 },
    { path: "src/a.mjs", lineNumber: 3, hitCount: 5 },
  ]);
});

test("normalizes a leading ./ and repeated slashes; ignores paths outside the working directory", () => {
  const text = [rec(["SF:./src/b.mjs", "DA:1,1"]), rec(["SF:src//c.mjs", "DA:1,1"]), rec(["SF:/other/x.mjs", "DA:1,1"]), rec(["SF:/repository/y.mjs", "DA:1,1"]), rec(["SF:../z.mjs", "DA:1,1"])].join("\n");
  const r = parseLcov(text, CWD);
  assert.equal(r.ok, true);
  assert.deepEqual(r.measuredPaths, ["src/b.mjs", "src/c.mjs"]);
  assert.equal(r.records.length, 2);
});

test("sorts records by path (code point) and numeric line number; a file with no DA is still a measured path", () => {
  const text = [rec(["SF:/repo/b.mjs", "DA:10,1", "DA:2,1"]), rec(["SF:/repo/a.mjs", "DA:1,1"]), rec(["SF:/repo/empty.mjs"])].join("\n");
  const r = parseLcov(text, CWD);
  assert.deepEqual(r.measuredPaths, ["a.mjs", "b.mjs", "empty.mjs"]);
  assert.deepEqual(r.records.map((x) => `${x.path}:${x.lineNumber}`), ["a.mjs:1", "b.mjs:2", "b.mjs:10"]);
});

test("a path that appears in two SF blocks is merged when the lines differ", () => {
  const text = [rec(["SF:/repo/a.mjs", "DA:1,1"]), rec(["SF:/repo/a.mjs", "DA:2,1"])].join("\n");
  const r = parseLcov(text, CWD);
  assert.equal(r.ok, true);
  assert.deepEqual(r.measuredPaths, ["a.mjs"]);
  assert.equal(r.records.length, 2);
});

test("ignores records the gate does not use (function and branch lines)", () => {
  const text = rec(["SF:/repo/a.mjs", "FN:1,f", "FNDA:1,f", "FNF:1", "FNH:1", "BRDA:1,0,0,1", "BRF:1", "BRH:1", "DA:1,1", "LF:1", "LH:1"]);
  assert.equal(parseLcov(text, CWD).ok, true);
});

test("a duplicated (path, line) is a broken record", () => {
  const text = rec(["SF:/repo/a.mjs", "DA:1,1", "DA:1,0"]);
  assert.equal(parseLcov(text, CWD).cause, "failed");
  const two = [rec(["SF:/repo/a.mjs", "DA:1,1"]), rec(["SF:./a.mjs", "DA:1,1"])].join("\n");
  assert.equal(parseLcov(two, CWD).cause, "failed");
});

test("LF or LH that disagree with the DA lines are a broken record", () => {
  assert.equal(parseLcov(rec(["SF:/repo/a.mjs", "DA:1,1", "DA:2,0", "LF:3", "LH:1"]), CWD).cause, "failed");
  assert.equal(parseLcov(rec(["SF:/repo/a.mjs", "DA:1,1", "DA:2,0", "LF:2", "LH:2"]), CWD).cause, "failed");
});

test("malformed DA lines are a broken record", () => {
  for (const da of ["DA:0,1", "DA:1,-1", "DA:a,b", "DA:1.5,1", "DA:1", "DA:1,1.5", "DA:,", "DA:1,1e3"]) {
    const r = parseLcov(rec(["SF:/repo/a.mjs", da]), CWD);
    assert.equal(r.ok, false, da);
    assert.equal(r.cause, "failed", da);
  }
});

test("DA before any SF, or after end_of_record, is a broken record", () => {
  assert.equal(parseLcov("DA:1,1\n", CWD).cause, "failed");
  assert.equal(parseLcov(`${rec(["SF:/repo/a.mjs", "DA:1,1"])}\nDA:2,1\n`, CWD).cause, "failed");
});

test("no DA line at all is no_records", () => {
  assert.equal(parseLcov("", CWD).cause, "no_records");
  assert.equal(parseLcov(rec(["SF:/repo/a.mjs"]), CWD).cause, "no_records");
  assert.equal(parseLcov(rec(["SF:/other/a.mjs", "DA:1,1"]), CWD).cause, "no_records");
});

test("failure results carry a fixed detail and no records", () => {
  const r = parseLcov("DA:1,1\n", CWD);
  assert.equal(r.ok, false);
  assert.equal(typeof r.detail, "string");
  assert.equal(r.records, undefined);
});

test("the size cap is 64 MiB", () => {
  assert.equal(LCOV_MAX_BYTES, 64 * 1024 * 1024);
  assert.equal(isLcovTooLarge(LCOV_MAX_BYTES), false);
  assert.equal(isLcovTooLarge(LCOV_MAX_BYTES + 1), true);
});

test("200,000 synthetic records convert in well under ten seconds", () => {
  const blocks = [];
  for (let f = 0; f < 2000; f += 1) {
    const lines = [`SF:/repo/gen/f${f}.mjs`];
    for (let l = 1; l <= 100; l += 1) lines.push(`DA:${l},${l % 2}`);
    blocks.push(rec(lines));
  }
  const start = performance.now();
  const r = parseLcov(blocks.join("\n"), CWD);
  const elapsed = performance.now() - start;
  assert.equal(r.records.length, 200000);
  assert.ok(elapsed < 10000, `took ${elapsed} ms`);
});
