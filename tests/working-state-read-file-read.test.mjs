// U2 観測の読取り（LC1。file）の第 2 段: 許した実体だけを読み、生の事実（前後の digest・大きさ・所要時間・読んだ大きさ）を返す（BR1.4〜BR1.6、NFR3.2、NFR6.1、SC5）。
// 予算は信頼版の profile だけから読み、読めない時は読取りを始めない。判定の実体と読む実体が違えば事実として返る。実際の一時 dir で動かす。
import assert from "node:assert/strict";
import { linkSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { BUDGET, RULESET } from "../scripts/sds/ci-record-policy.mjs";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, NOW, TARGET, unit } from "./working-state-fixtures.mjs";
import { INSTANT, PIN_LOCATOR, PIN_TEXT, allowByCore, clockOf, countingFs, depsOf, lc1, mutatingFs, profileOf, readThrough, request, withDir } from "./working-state-read-file-fixtures.mjs";

const MARKER = "raw-value-marker-" + "m".repeat(12);
const causeOf = (fact) => ws.interpretFile(fact);
const SRC = (file) => readFileSync(new URL(`../scripts/working-state/${file}`, import.meta.url), "utf8");

test("T6.1+ 予算は信頼版の profile（U1 の BUDGET）から読んだ値だけを使い、LC2 が読む形に写す。呼出側が渡した予算は使わない", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const fact = await lc1.readFileFact({ ...request(dir), budget: { maxElapsedMs: 1e9, maxBytes: 1e12, maxRequests: 1e6 }, maxBytes: 1 }, allowByCore, { clock: clockOf(1) });
  assert.deepEqual(fact.budget, { maxElapsedMs: BUDGET.timeoutMs, maxBytes: BUDGET.maxBytesPerResponse, maxRequests: BUDGET.maxRequests });
  assert.deepEqual(fact.budgetProfile, { version: RULESET });
  assert.equal(ws.interpretFile(fact).status, "doc");
}));

test("T6.1- profile が読めない・欠落・破損の時は、file を開かず、既定の予算で代用せず、核が malformed にできる事実を返す", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const bad = [
    async () => { throw new Error(MARKER); }, async () => null, async () => ({}), async () => ({ version: 1, budget: profileOf().budget }),
    async () => ({ version: "p", budget: profileOf({ timeoutMs: "5000" }).budget }), async () => ({ version: "p", budget: profileOf({ maxBytesPerResponse: -1 }).budget }),
    async () => ({ version: "p", budget: profileOf({ maxRequests: Infinity }).budget }), async () => ({ version: "p", budget: profileOf({ timeoutMs: Number.NaN }).budget }),
    async () => ({ version: "p" }),
  ];
  for (const loadProfile of bad) {
    const { fs, calls } = countingFs();
    const fact = await readThrough(dir, PIN_LOCATOR, { fs, loadProfile });
    assert.equal(calls.open, 0);
    assert.deepEqual([fact.budget, fact.budgetProfile, fact.access, fact.content], [null, null, "not_started", undefined]);
    assert.deepEqual(fact.measured, { elapsedMs: 0, bytesRead: 0, requests: 0 });
    assert.deepEqual([causeOf(fact).status, causeOf(fact).cause], ["unavailable", "malformed"]);
    assert.equal(JSON.stringify(fact).includes(MARKER), false);
  }
}));

test("T1.4+ 読めた実体の生の事実: 前後の digest が中身の digest と一致し、読んだ大きさ・回数・所要時間（整数）・時計の時刻を返す。複数回に分けて読む大きさでも中身は欠けない", () => withDir(async (dir) => {
  const big = "a".repeat(lc1.CHUNK_BYTES * 2 + 17);
  dir.put("big.txt", big);
  const fact = await readThrough(dir, "big.txt", { loadProfile: async () => profileOf({ maxBytesPerResponse: big.length * 2 }) });
  assert.equal(fact.content, big);
  assert.deepEqual([fact.digestBefore, fact.digestAfter], [ws.sha256Hex(big), ws.sha256Hex(big)]);
  assert.deepEqual(fact.measured, { elapsedMs: fact.measured.elapsedMs, bytesRead: big.length, requests: 1 });
  assert.equal(Number.isSafeInteger(fact.measured.elapsedMs) && fact.measured.elapsedMs >= 0, true);
  assert.equal(fact.observedAt, INSTANT);
  assert.equal(ws.parseInstant(fact.observedAt) !== null, true);
}));

test("T1.4- 大きさの上限: 上限を 1 つ超えた所で読み止め、超えた分は保持せず、中身・digest を返さない。上限ちょうどは読める。核が budget_exceeded にする", () => withDir(async (dir) => {
  dir.put("hundred.txt", "x".repeat(100));
  dir.put("exact.txt", "y".repeat(10));
  dir.put("large.txt", "z".repeat(lc1.CHUNK_BYTES * 2));
  const over = await readThrough(dir, "hundred.txt", { loadProfile: async () => profileOf({ maxBytesPerResponse: 10 }) });
  assert.deepEqual([over.measured.bytesRead, over.content, over.digestBefore, over.digestAfter], [11, undefined, undefined, undefined]);
  assert.equal(causeOf(over).cause, "budget_exceeded");
  const exact = await readThrough(dir, "exact.txt", { loadProfile: async () => profileOf({ maxBytesPerResponse: 10 }) });
  assert.deepEqual([exact.measured.bytesRead, exact.content], [10, "y".repeat(10)]);
  const large = await readThrough(dir, "large.txt", { loadProfile: async () => profileOf({ maxBytesPerResponse: lc1.CHUNK_BYTES + 5 }) });
  assert.deepEqual([large.measured.bytesRead, large.content], [lc1.CHUNK_BYTES + 6, undefined]);
  assert.equal(causeOf(large).cause, "budget_exceeded");
}));

test("T1.4- 時間の上限: 枠を超えたら読み止め、測った所要時間が宣言を超える事実を返す。核が timed_out にする。枠の中なら超えない", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const slow = await readThrough(dir, PIN_LOCATOR, { clock: clockOf(10), loadProfile: async () => profileOf({ timeoutMs: 5 }) });
  assert.equal(slow.measured.elapsedMs > slow.budget.maxElapsedMs, true);
  assert.deepEqual([slow.content, slow.digestBefore], [undefined, undefined]);
  assert.equal(causeOf(slow).cause, "timed_out");
  const quick = await readThrough(dir, PIN_LOCATOR);
  assert.equal(quick.measured.elapsedMs <= quick.budget.maxElapsedMs, true);
}));

test("T1.5- 判定した実体と読む実体が違えば、読まず identity が違うという事実を返す（別の file に差し替え・symlink・dir・消えた）。核が out_of_boundary にする", () => withDir(async (dir) => {
  const target = dir.put(PIN_LOCATOR, PIN_TEXT);
  const swaps = {
    "別の file": () => { dir.put("other.json", MARKER); renameSync(path.join(dir.root, "other.json"), target); },
    symlink: () => { unlinkSync(target); symlinkSync(path.join(dir.root, "decoy.json"), target); },
    // 元の file を hard link で残し、新しい dir が同じ番号（inode）を再利用しないようにする。
    dir: () => { linkSync(target, path.join(dir.root, "keep.json")); unlinkSync(target); mkdirSync(target); },
    消えた: () => unlinkSync(target),
  };
  for (const [name, swap] of Object.entries(swaps)) {
    dir.put(PIN_LOCATOR, PIN_TEXT);
    dir.put("decoy.json", MARKER);
    const resolved = await lc1.resolveFile(request(dir), depsOf());
    swap();
    const fact = await lc1.readResolvedFile(request(dir), resolved, depsOf());
    assert.deepEqual([fact.identity, fact.access, fact.content, fact.digestBefore], ["differs", "ok", undefined, undefined], name);
    assert.equal(causeOf(fact).cause, "out_of_boundary", name);
    assert.equal(JSON.stringify(fact).includes(MARKER), false, name);
    rmSync(target, { recursive: true, force: true });
  }
}));

test("T1.5+ 判定した実体と同じ実体なら identity は same。dir など普通の file でない実体は読まず、access は failed（核が fetch_failed にする）", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const same = await lc1.readResolvedFile(request(dir), await lc1.resolveFile(request(dir), depsOf()), depsOf());
  assert.deepEqual([same.identity, same.access], ["same", "ok"]);
  mkdirSync(path.join(dir.root, "adir"));
  const asDir = await readThrough(dir, "adir");
  assert.deepEqual([asDir.identity, asDir.access, asDir.content], ["same", "failed", undefined]);
  assert.equal(causeOf(asDir).cause, "fetch_failed");
}));

test("T1.6- 読取り中の変化: 前の読みと本の読みの間・本の読みと後の読みの間で中身が変わると、digest が食い違う事実になり、核が changed_during_read にする", () => withDir(async (dir) => {
  const target = dir.put(PIN_LOCATOR, PIN_TEXT);
  for (const [name, at] of [["前と本の間", 3], ["本と後の間", 5]]) {
    writeFileSync(target, PIN_TEXT);
    const fact = await readThrough(dir, PIN_LOCATOR, { fs: mutatingFs((calls) => { if (calls === at) writeFileSync(target, `${PIN_TEXT} `); }) });
    assert.notEqual(fact.digestBefore, fact.digestAfter, name);
    assert.equal(causeOf(fact).cause, "changed_during_read", name);
  }
  writeFileSync(target, PIN_TEXT);
  assert.equal(causeOf(await readThrough(dir, PIN_LOCATOR, { fs: mutatingFs(() => {}) })).status, "doc");
}));

test("T3.4p 開いた形の生の値は返り値の content にだけ載る。他の欄・例外・失敗の文面には載らない（開けない・読めない・予算が読めない入力でも）", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, MARKER);
  const ok = await readThrough(dir, PIN_LOCATOR);
  assert.equal(ok.content, MARKER);
  assert.equal(JSON.stringify({ ...ok, content: undefined }).includes(MARKER), false);
  const boom = () => { throw Object.assign(new Error(MARKER), { code: "EIO" }); };
  const failures = [{ fs: { ...countingFs().fs, open: async () => boom() } }, { fs: mutatingFs(boom) }, { loadProfile: async () => boom() }];
  for (const over of failures) {
    let fact;
    await assert.doesNotReject(async () => { fact = await readThrough(dir, PIN_LOCATOR, over); });
    assert.equal(fact.content, undefined);
    assert.equal(JSON.stringify(fact).includes(MARKER), false);
  }
}));

test("T1.1+ LC1 の事実は LC2（observeAll）がそのまま読める。profile が読めない事実は malformed の観測不能になる", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const observeWith = (fact) => ws.observeAll({ targetRef: TARGET, now: NOW, catalog: ws.INITIAL_CATALOG, reads: [fact], requiredVersions: {} });
  const good = unit(observeWith(await readThrough(dir, PIN_LOCATOR)), "sds_commit", "sds_pin");
  assert.deepEqual([good.observation.availability, good.value], ["observed", OID_A]);
  const stopped = unit(observeWith(await readThrough(dir, PIN_LOCATOR, { loadProfile: async () => null })), "sds_commit", "sds_pin");
  assert.deepEqual([stopped.observation.availability, stopped.unobservableCause], ["unavailable", "malformed"]);
}));

test("T1.4+ 閉じるのに失敗しても、読めた事実は変わらない。実際の時計・実際の信頼版の profile（既定）でも読める", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, PIN_TEXT);
  const closing = { ...countingFs().fs, open: async (...args) => {
    const handle = await countingFs().fs.open(...args);
    return { stat: (...rest) => handle.stat(...rest), read: (...rest) => handle.read(...rest), close: async () => { await handle.close(); throw new Error(MARKER); } };
  } };
  const fact = await readThrough(dir, PIN_LOCATOR, { fs: closing });
  assert.deepEqual([fact.access, fact.content], ["ok", PIN_TEXT]);
  assert.equal(JSON.stringify(fact).includes(MARKER), false);
  const real = await lc1.readFileFact(request(dir), allowByCore);
  assert.deepEqual([real.content, real.budget.maxBytes, real.budgetProfile.version], [PIN_TEXT, BUDGET.maxBytesPerResponse, RULESET]);
  assert.equal(ws.parseInstant(real.observedAt) !== null, true);
  assert.equal(Number.isSafeInteger(real.measured.elapsedMs), true);
}));

test("T6.1 時計と file を使うのは LC1 だけ。LC1 は原因の名前・判定の部品・出力の経路を持たず、核は LC1 を import しない", () => {
  const source = SRC("read-file.mjs");
  for (const cause of ["out_of_boundary", "budget_exceeded", "timed_out", "changed_during_read", "permission_denied", "not_found_unconfirmed", "fetch_failed", "malformed"]) assert.equal(source.includes(cause), false, cause);
  assert.equal(/console\.|process\.std|writeFile|appendFile|node:child_process|node:net|node:http|fetch\(|process\.env/.test(source), false);
  assert.equal(/(?:timeoutMs|maxBytes\w*|maxRequests|maxElapsedMs)\s*[:=]\s*\d/.test(source), false);
  assert.deepEqual([...source.matchAll(/from "(\.\/[^"]+)"/g)].map((match) => match[1]), ["./canonical.mjs"]);
  // LC1 は file の読取り（read-file.mjs）と子 process の確かめ（probe-*.mjs）の 2 系統。核はどちらも import せず、時計・file・子 process・環境変数を使わない。
  // index.mjs は集約 file（R-09）で、LC1 の公開の記号を再 export するため import を持つ。ほかの検査（時計・file・子 process・環境変数を使わない）は index.mjs にも当てる。
  const lc1 = new Set(["read-file.mjs", "probe-path.mjs", "probe-run.mjs", "probe-tool.mjs"]);
  for (const file of readdirSync(new URL("../scripts/working-state/", import.meta.url)).filter((name) => !lc1.has(name))) {
    const other = SRC(file);
    assert.equal(/node:fs|node:child_process|Date\.now|new Date\(\)|performance\.now|process\.env/.test(other), false, file);
    if (file !== "index.mjs") assert.equal(/(?:read-file|probe-path|probe-run|probe-tool)\.mjs/.test(other), false, file);
  }
});
