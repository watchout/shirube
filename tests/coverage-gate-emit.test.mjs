import assert from "node:assert/strict";
import { existsSync, linkSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FILE_IO, emitOutputs, guardResultPath, removeOldResult, writeResult } from "../scripts/coverage-gate/emit.mjs";
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

test("each write uses a new temporary name, so two writes never share one", () => {
  const names = [];
  const io = { write: (p) => names.push(p), rename() {}, remove() {}, token: (() => { let n = 0; return () => `t${n++}`; })() };
  writeResult(path("fresh.json"), "a", io);
  writeResult(path("fresh.json"), "b", io);
  assert.equal(new Set(names).size, 2);
  assert.ok(names.every((name) => name.startsWith(path("fresh.json")) && name.endsWith(".tmp")));
});

test("a link already sitting at the temporary name is never written through, and is left alone", () => {
  writeFileSync(path("victim.txt"), "original\n");
  symlinkSync(path("victim.txt"), path("linked.json.fixed.tmp"));
  assert.equal(writeResult(path("linked.json"), "text\n", { ...FILE_IO, token: () => "fixed" }), false);
  assert.equal(readFileSync(path("victim.txt"), "utf8"), "original\n");
  assert.equal(lstatSync(path("linked.json.fixed.tmp")).isSymbolicLink(), true);
  assert.equal(existsSync(path("linked.json")), false);
});

test("a plain file already at the temporary name is not overwritten either", () => {
  writeFileSync(path("taken.json.fixed.tmp"), "someone else's\n");
  assert.equal(writeResult(path("taken.json"), "text\n", { ...FILE_IO, token: () => "fixed" }), false);
  assert.equal(readFileSync(path("taken.json.fixed.tmp"), "utf8"), "someone else's\n");
});

test("the real write creates the file private to the owner", () => {
  assert.equal(writeResult(path("private.json"), "text\n"), true);
  assert.equal(statSync(path("private.json")).mode & 0o077, 0);
});

test("guarding a result path: a plain new file in an existing folder is accepted as its real path", () => {
  const ok = guardResultPath({ cwd: dir, input: "in.json", result: "new-result.json", tracked: () => [] });
  assert.equal(ok, join(realpathSync(dir), "new-result.json"));
});

test("guarding a result path: a link, the input, a hard link of the input, a tracked file and a missing folder are all refused", () => {
  writeFileSync(path("in.json"), "{}");
  writeFileSync(path("kept.txt"), "kept\n");
  symlinkSync(path("kept.txt"), path("link.json"));
  linkSync(path("in.json"), path("hard.json"));
  symlinkSync(dir, path("alias"));
  const refused = (result, tracked = []) => guardResultPath({ cwd: dir, input: "in.json", result, tracked: () => tracked }) === null;
  assert.equal(refused("link.json"), true);
  assert.equal(refused("in.json"), true);
  assert.equal(refused("./in.json"), true);
  assert.equal(refused("alias/in.json"), true);
  assert.equal(refused("hard.json"), true);
  assert.equal(refused("kept.txt", ["kept.txt"]), true);
  assert.equal(refused("alias/kept.txt", ["kept.txt"]), true);
  assert.equal(refused("no-folder/r.json"), true);
  assert.equal(readFileSync(path("kept.txt"), "utf8"), "kept\n");
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
