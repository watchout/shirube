// U2 観測の読取り（LC1。file）の第 1 段: 実体の解決と、核の判定が許した実体だけを読むこと（BR1.5、SC5）。実際の一時 dir で動かす。
// LC1 は分類しない。根の外・循環・別綴りの同一 path・権限拒否・未導入は、事実として返り、判定は核（interpretFile）が行う。
import assert from "node:assert/strict";
import { accessSync, constants, mkdirSync, realpathSync, symlinkSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { PIN_LOCATOR, PIN_TEXT, allowByCore, countingFs, depsOf, lc1, readThrough, request, withDir } from "./working-state-read-file-fixtures.mjs";

const causeOf = (fact) => ws.interpretFile(fact);
const SECRET_LOOKING = "outside-marker-" + "k".repeat(12);

test("T1.5+ 根の下の実体は、実 path・同一性・根の実 path の事実つきで読める。核が doc として解釈できる", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const fact = await readThrough(dir, PIN_LOCATOR);
  assert.deepEqual([fact.resolution, fact.identity, fact.access], ["resolved", "same", "ok"]);
  assert.equal(fact.rootRealPath, realpathSync(dir.root));
  assert.equal(fact.realPath, path.join(realpathSync(dir.root), PIN_LOCATOR));
  assert.equal(fact.content, PIN_TEXT);
  assert.equal(ws.interpretFile(fact).status, "doc");
}));

test("T1.5- 根の外の symlink・.. ・絶対 path は、事実を返すだけで file を開かず、核が out_of_boundary にする。外の中身は事実に載らない", () => withDir(async (dir) => {
  dir.put("secret.json", SECRET_LOOKING, dir.outside);
  symlinkSync(path.join(dir.outside, "secret.json"), path.join(dir.root, "link.json"));
  symlinkSync(dir.outside, path.join(dir.root, "linkdir"));
  const locators = ["link.json", "linkdir/secret.json", "../outside/secret.json", path.join(dir.outside, "secret.json")];
  for (const locator of locators) {
    const { fs, calls } = countingFs();
    const fact = await readThrough(dir, locator, { fs });
    assert.equal(calls.open, 0, locator);
    assert.deepEqual([fact.access, fact.identity, fact.content], ["ok", "not_checked", undefined], locator);
    assert.deepEqual([causeOf(fact).status, causeOf(fact).cause], ["unavailable", "out_of_boundary"], locator);
    assert.equal(JSON.stringify(fact).includes(SECRET_LOOKING), false, locator);
  }
  const resolved = await lc1.resolveFile({ root: dir.root, locator: "link.json" }, depsOf());
  assert.equal(resolved.resolution, "resolved");
  assert.equal(resolved.realPath, path.join(realpathSync(dir.outside), "secret.json"));
}));

test("T1.5- 解決の段は file を開かず、読む前の判定が先。判定を渡さない・例外・true 以外でも読まない", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const { fs, calls } = countingFs();
  await lc1.resolveFile(request(dir), depsOf({ fs }));
  assert.equal(calls.open, 0);
  const refusals = [undefined, null, () => false, () => "yes", () => 1, () => { throw new Error(SECRET_LOOKING); }];
  for (const allow of refusals) {
    const fact = await lc1.readFileFact(request(dir), allow, depsOf({ fs }));
    assert.deepEqual([fact.content, fact.identity, fact.budget], [undefined, "not_checked", null]);
    assert.equal(JSON.stringify(fact).includes(SECRET_LOOKING), false);
  }
  assert.equal(calls.open, 0);
}));

test("T1.5- 循環する symlink は resolution が loop の事実になり、核が out_of_boundary にする。読まない", () => withDir(async (dir) => {
  symlinkSync(path.join(dir.root, "b.json"), path.join(dir.root, "a.json"));
  symlinkSync(path.join(dir.root, "a.json"), path.join(dir.root, "b.json"));
  const { fs, calls } = countingFs();
  const fact = await readThrough(dir, "a.json", { fs });
  assert.equal(fact.resolution, "loop");
  assert.equal(calls.open, 0);
  assert.equal(causeOf(fact).cause, "out_of_boundary");
}));

test("T1.5+ 別綴りの同一 path（. ・ // ・ 内側の .. ・ 根の下の symlink）は、同じ実 path・同じ同一性になり、同じ中身が読める", () => withDir(async (dir) => {
  dir.put("dir/x.json", PIN_TEXT);
  symlinkSync(path.join(dir.root, "dir"), path.join(dir.root, "alias"));
  const spellings = ["dir/x.json", "dir/./x.json", "dir//x.json", "dir/../dir/x.json", "alias/x.json"];
  const resolved = await Promise.all(spellings.map((locator) => lc1.resolveFile({ root: dir.root, locator }, depsOf())));
  assert.equal(new Set(resolved.map((entry) => `${entry.realPath}|${entry.fileId}`)).size, 1);
  assert.equal(resolved.every((entry) => entry.resolution === "resolved"), true);
  const facts = await Promise.all(spellings.slice(0, 3).concat("alias/x.json").map((locator) => readThrough(dir, locator)));
  assert.equal(new Set(facts.map((fact) => fact.digestBefore)).size, 1);
  assert.equal(facts.every((fact) => fact.content === PIN_TEXT), true);
}));

test("T2.1+ 無い file は、親が読めて無いと分かる時だけ absent の事実（親が読めるか付き）。つながっていない symlink と根が無い時は absent にしない", () => withDir(async (dir) => {
  const absent = await readThrough(dir, "nope/none.json");
  assert.deepEqual([absent.resolution, absent.access, absent.parentReadable], ["absent", "absent", true]);
  assert.equal(causeOf(absent).status, "absent");
  symlinkSync(path.join(dir.root, "missing-target"), path.join(dir.root, "dangling.json"));
  const dangling = await readThrough(dir, "dangling.json");
  assert.deepEqual([dangling.resolution, dangling.access], ["failed", "failed"]);
  assert.equal(causeOf(dangling).cause, "fetch_failed");
  const noRoot = await lc1.readFileFact({ root: path.join(dir.base, "no-root"), locator: PIN_LOCATOR, sourceKind: "sds_pin" }, allowByCore, depsOf());
  assert.deepEqual([noRoot.rootRealPath, noRoot.access], [null, "failed"]);
  assert.equal(causeOf(noRoot).cause, "fetch_failed");
}));

test("T2.1+ 親 dir が file の時（ENOTDIR）は absent にせず failed。入力が文字列でない locator も例外にならず failed", () => withDir(async (dir) => {
  dir.put("plain", "x");
  const notDir = await readThrough(dir, "plain/child.json");
  assert.equal(notDir.access, "failed");
  const fact = await lc1.readFileFact({ root: dir.root, locator: 3, sourceKind: "sds_pin" }, () => true, depsOf());
  assert.equal(fact.access, "failed");
}));

test("T1.5+ 権限拒否は absent と区別される事実（denied）。核が permission_denied にする（実際の権限で確かめる。作れない環境は失敗にする）", () => withDir(async (dir) => {
  dir.put("locked/x.json", PIN_TEXT);
  dir.lock(path.join(dir.root, "locked"));
  let readable = true;
  try {
    accessSync(path.join(dir.root, "locked"), constants.R_OK | constants.X_OK);
  } catch {
    readable = false;
  }
  assert.equal(readable, false, "権限拒否を作れない環境（root など）: 権限拒否を観測できなかった");
  const denied = await readThrough(dir, "locked/x.json");
  assert.deepEqual([denied.resolution, denied.access], ["denied", "denied"]);
  assert.equal(causeOf(denied).cause, "permission_denied");
  const missing = await readThrough(dir, "free/x.json");
  assert.notEqual(causeOf(missing).cause, "permission_denied");
  assert.equal(missing.access, "absent");
}));

test("T1.5+ 権限拒否の事実は、実際の権限に依らず、file 系の部品が拒否を返す入力でも出る（前提の無い方法）。それ以外の失敗は failed", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const failing = (code) => ({ ...countingFs().fs, stat: async () => { throw Object.assign(new Error(SECRET_LOOKING), { code }); } });
  for (const [code, access] of [["EACCES", "denied"], ["EPERM", "denied"], ["EIO", "failed"]]) {
    const fact = await readThrough(dir, PIN_LOCATOR, { fs: failing(code) });
    assert.equal(fact.access, access, code);
    assert.equal(JSON.stringify(fact).includes(SECRET_LOOKING), false, code);
  }
}));

test("T1.5 resolveFile は根の実 path を返す（根が symlink 経由でも）。根が無い時は failed で rootRealPath は無い", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  mkdirSync(path.join(dir.base, "via"));
  symlinkSync(dir.root, path.join(dir.base, "via", "root-link"));
  const resolved = await lc1.resolveFile({ root: path.join(dir.base, "via", "root-link"), locator: PIN_LOCATOR }, depsOf());
  assert.equal(resolved.rootRealPath, realpathSync(dir.root));
  assert.equal(resolved.resolution, "resolved");
  const none = await lc1.resolveFile({ root: path.join(dir.base, "no-root"), locator: PIN_LOCATOR }, depsOf());
  assert.deepEqual([none.resolution, none.rootRealPath], ["failed", null]);
}));
