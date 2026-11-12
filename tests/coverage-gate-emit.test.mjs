import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { emitOutputs, removeOldResult, writeResult } from "../scripts/coverage-gate/emit.mjs";
import { buildInputFailureDocument, renderJson, renderNotice, renderOutputs, renderSummary } from "../scripts/coverage-gate/report.mjs";
import { makeDir, removeDir } from "./coverage-gate-fixtures.mjs";

const document = buildInputFailureDocument({ runId: "local", failure: { reasonCode: "INPUT_UNREADABLE", field: "$", detail: "The input could not be read as a JSON object." } });
const dir = makeDir();
test.after(() => removeDir(dir));
const path = (name) => join(dir, name);

test("removing an old result: a missing file is fine, an existing one is gone afterwards", () => {
  assert.equal(removeOldResult(path("never-existed.json")), true);
  writeFileSync(path("old.json"), "stale");
  assert.equal(removeOldResult(path("old.json")), true);
  assert.equal(existsSync(path("old.json")), false);
});

test("an old result that cannot be removed is reported, never ignored", () => {
  mkdirSync(path("a-directory"));
  assert.equal(removeOldResult(path("a-directory")), false);
  writeFileSync(path("stuck.json"), "stale");
  assert.equal(removeOldResult(path("stuck.json"), { remove() {}, exists: () => true }), false);
  assert.equal(removeOldResult(path("throws.json"), { remove() { throw new Error("denied"); }, exists: () => false }), false);
});

test("the result is written through a temporary file and no temporary file is left", () => {
  assert.equal(writeResult(path("result.json"), "text\n"), true);
  assert.equal(readFileSync(path("result.json"), "utf8"), "text\n");
  assert.deepEqual(readdirSync(dir).filter((name) => name.includes(".tmp")), []);
});

test("a result that cannot be written is reported, and the temporary file is removed", () => {
  assert.equal(writeResult(path("missing-parent/result.json"), "x"), false);
  const removed = [];
  const io = { write() {}, rename() { throw new Error("rename failed"); }, remove: (p) => removed.push(p) };
  assert.equal(writeResult(path("r2.json"), "x", io), false);
  assert.equal(removed.length, 1);
  assert.ok(removed[0].startsWith(path("r2.json")));
  const stubborn = { write() {}, rename() { throw new Error("rename failed"); }, remove() { throw new Error("remove failed"); } };
  assert.equal(writeResult(path("r3.json"), "x", stubborn), false);
});

test("all four outputs are written, in order: result, summary, outputs, notice", () => {
  const notices = [];
  const r = emitOutputs({ document, resultPath: path("e1.json"), summaryPath: path("e1.md"), outputPath: path("e1.out"), writeNotice: (line) => notices.push(line) });
  assert.deepEqual(r.failed, []);
  assert.equal(readFileSync(path("e1.json"), "utf8"), renderJson(document));
  assert.equal(readFileSync(path("e1.md"), "utf8"), renderSummary(document));
  assert.equal(readFileSync(path("e1.out"), "utf8"), renderOutputs(document));
  assert.deepEqual(notices, [`${renderNotice(document)}\n`]);
});

test("summary and output values are appended to what is already there", () => {
  writeFileSync(path("e2.md"), "earlier step\n");
  writeFileSync(path("e2.out"), "earlier=1\n");
  emitOutputs({ document, resultPath: path("e2.json"), summaryPath: path("e2.md"), outputPath: path("e2.out"), writeNotice() {} });
  assert.ok(readFileSync(path("e2.md"), "utf8").startsWith("earlier step\n## Coverage gate"));
  assert.ok(readFileSync(path("e2.out"), "utf8").startsWith("earlier=1\noutcome="));
});

test("a destination that is not set is skipped, not counted as a failure", () => {
  const r = emitOutputs({ document, resultPath: path("e3.json"), summaryPath: null, outputPath: null, writeNotice() {} });
  assert.deepEqual(r.failed, []);
});

test("one failing output does not stop the others, and every failure is named", () => {
  const notices = [];
  const r = emitOutputs({ document, resultPath: path("no-such-dir/e4.json"), summaryPath: path("no-such-dir/e4.md"), outputPath: path("e4.out"), writeNotice: (l) => notices.push(l) });
  assert.deepEqual(r.failed, ["result", "summary"]);
  assert.equal(existsSync(path("e4.out")), true);
  assert.equal(notices.length, 1);
});

test("a notice that cannot be written is a failure too", () => {
  const r = emitOutputs({ document, resultPath: path("e5.json"), summaryPath: null, outputPath: null, writeNotice() { throw new Error("closed"); } });
  assert.deepEqual(r.failed, ["notice"]);
});
