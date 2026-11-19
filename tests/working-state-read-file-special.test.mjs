// U2 観測の読取り（LC1。file）の、普通の file でない実体（FIFO・dir）の扱い（S5）。
// 書き手のいない FIFO の open は戻らず、時間の枠が効かない。open の前に、実 path の stat が普通の file でなければ resolved にせず、開かない。
// 結果は「観測できず」の側（resolution failed・access failed）で、成功にしない。FIFO は試験が mkfifo で作って片付ける（作れない環境は失敗にする）。
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { closeSync, constants, mkdirSync, openSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { allowByCore, countingFs, depsOf, lc1, request, withDir } from "./working-state-read-file-fixtures.mjs";

const LOCATOR = "aidlc.settings.json";
const FRAME_MS = 3000;

const makeFifo = (dir) => {
  const target = path.join(dir.root, LOCATOR);
  execFileSync("mkfifo", [target]);
  return target;
};

// 試験側の時間の枠。実装が止まっても試験は止まらず失敗する。止まった open は、書き手を 1 回開いて戻す（試験が終われるように）。
async function withinFrame(fifo, run) {
  let reject = () => {};
  const timedOut = new Promise((_, fail) => { reject = fail; });
  const signal = AbortSignal.timeout(FRAME_MS);
  signal.addEventListener("abort", () => reject(new Error(`時間の枠（${FRAME_MS}ms）の中で戻らなかった`)), { once: true });
  try {
    return await Promise.race([run(), timedOut]);
  } finally {
    try {
      closeSync(openSync(fifo, constants.O_WRONLY | constants.O_NONBLOCK));
    } catch {
      // 待っている読み手が無ければ開けない。それで良い。
    }
  }
}

test("N2- FIFO は実体の解決で resolved にしない（resolution failed）。open の前に stat で見る", async () => {
  await withDir(async (dir) => {
    makeFifo(dir);
    const { fs, calls } = countingFs();
    const resolved = await lc1.resolveFile(request(dir, LOCATOR, "aidlc_settings"), { fs });
    assert.equal(resolved.resolution, "failed");
    assert.equal(resolved.realPath, undefined);
    assert.equal(resolved.fileId, undefined);
    assert.equal(calls.open, 0);
  });
});

test("N2- FIFO を対象の根の下の file にして readFileFact を流すと、止まらずに戻り、観測できずの側（open しない・中身も digest も無い）", async () => {
  await withDir(async (dir) => {
    const fifo = makeFifo(dir);
    const { fs, calls } = countingFs();
    const fact = await withinFrame(fifo, () => lc1.readFileFact(request(dir, LOCATOR, "aidlc_settings"), allowByCore, depsOf({ fs })));
    assert.deepEqual([fact.resolution, fact.access, fact.identity], ["failed", "failed", "not_checked"]);
    assert.deepEqual([fact.measured.bytesRead, fact.measured.requests], [0, 0]);
    for (const field of ["content", "digestBefore", "digestAfter", "realPath"]) assert.equal(field in fact && fact[field] !== undefined, false, field);
    assert.equal(calls.open, 0);
  });
});

test("N2- FIFO への symlink（根の下）も止まらずに戻り、観測できずの側", async () => {
  await withDir(async (dir) => {
    const fifo = makeFifo(dir);
    const link = path.join(dir.root, "link.json");
    execFileSync("ln", ["-s", LOCATOR, link]);
    const fact = await withinFrame(fifo, () => lc1.readFileFact(request(dir, "link.json", "aidlc_settings"), allowByCore, depsOf()));
    assert.deepEqual([fact.resolution, fact.access, fact.content], ["failed", "failed", undefined]);
  });
});

test("N2- 普通の file でない実体（dir）も open せず、観測できずの側", async () => {
  await withDir(async (dir) => {
    mkdirSync(path.join(dir.root, LOCATOR));
    const { fs, calls } = countingFs();
    const fact = await lc1.readFileFact(request(dir, LOCATOR, "aidlc_settings"), allowByCore, depsOf({ fs }));
    assert.deepEqual([fact.resolution, fact.access, fact.identity, fact.content], ["failed", "failed", "not_checked", undefined]);
    assert.equal(calls.open, 0);
  });
});

test("N2+ 普通の file は今までどおり resolved になり、読める", async () => {
  await withDir(async (dir) => {
    dir.put(LOCATOR, "{}");
    const { fs, calls } = countingFs();
    const resolved = await lc1.resolveFile(request(dir, LOCATOR, "aidlc_settings"), { fs });
    assert.equal(resolved.resolution, "resolved");
    const fact = await lc1.readFileFact(request(dir, LOCATOR, "aidlc_settings"), allowByCore, depsOf({ fs }));
    assert.deepEqual([fact.resolution, fact.access, fact.identity, fact.content], ["resolved", "ok", "same", "{}"]);
    assert.equal(calls.open, 1);
  });
});
