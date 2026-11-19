// U2 LC1 子 process の起動の条件 2・3（aidlc の探索）。PATH は「空でなく・絶対で・対象の根の外」の dir だけ（symlink 解決後の実体で判定）。
// 見つけた実行ファイルの実体も根の外。見つからない時は (a) 未導入、(b) dir を捨てた上で見つからない = 観測不能（件数と種別）、(c) 権限・起動失敗。
// 実際の一時 dir と架空の実行ファイル（sh の script）を使う。実在する道具は実行しない。
import assert from "node:assert/strict";
import { mkdirSync, renameSync, symlinkSync, unlinkSync } from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { fsWith, inBox, inCwd, marking, probe, sampleEnv, spawnSpy } from "./working-state-probe-fixtures.mjs";

const pathOf = (...dirs) => dirs.join(path.delimiter);
const withPath = (b, ...dirs) => ({ env: sampleEnv(b, { PATH: pathOf(...dirs) }) });
const cause = (fact) => ws.interpretProbe(fact);
const denied = Object.assign(new Error("denied"), { code: "EACCES" });

test("T2.2 子の起動 見つかれば根の外の dir の実行ファイルを起動し、LC2 が読める生の事実を返す（分類・判定は持たない）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", marking(b, "ok"));
    const fact = await probe("aidlc", b);
    assert.equal(fact.sourceKind, "tool_probe");
    assert.equal(fact.locator, "aidlc");
    assert.equal(fact.observedAt, "2026-11-18T00:00:00.000Z");
    assert.deepEqual(fact.budgetProfile, { version: "test-profile/1" });
    assert.deepEqual(fact.budget, { maxElapsedMs: 5000, maxBytes: 65536, maxRequests: 8 });
    assert.deepEqual([fact.launch, fact.exitCode, fact.output, fact.stop, fact.dropped], ["ok", 0, "aidlc 2.11.1\n", null, { count: 0, kinds: [] }]);
    assert.equal(fact.measured.requests, 1);
    assert.equal(fact.measured.bytesRead, 13);
    assert.equal(Number.isSafeInteger(fact.measured.elapsedMs), true);
    assert.deepEqual(cause(fact), { status: "output", output: "aidlc 2.11.1\n" });
    assert.equal(b.ran("ok"), true);
  });
});

test("T2.2 子の起動 対象の根に置いた同名の実行ファイル・根の node_modules/.bin の同名の実行ファイルは起動しない", async () => {
  await inBox(async (b) => {
    b.exe(b.root, "aidlc", marking(b, "root"));
    b.exe(path.join(b.root, "node_modules", ".bin"), "aidlc", marking(b, "bin"));
    const fact = await probe("aidlc", b, withPath(b, b.root, path.join(b.root, "node_modules", ".bin")));
    assert.deepEqual([fact.launch, fact.dropped], ["not_found", { count: 2, kinds: ["under_root", "under_root"] }]);
    assert.deepEqual([b.ran("root"), b.ran("bin")], [false, false]);
    assert.deepEqual(cause(fact), { status: "unavailable", cause: "tool_cannot_start", notes: { droppedCount: 2, droppedKinds: ["under_root"] } });
  });
});

test("T2.2 子の起動 PATH の相対の欄・空の欄に置いた同名の実行ファイルは起動しない（作業中の dir に実行ファイルがあっても）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", marking(b, "cwd"));
    for (const [element, kind] of [[".", "relative"], ["", "empty"]]) {
      const fact = await inCwd(b.outside, () => probe("aidlc", b, withPath(b, element)));
      assert.deepEqual([fact.launch, fact.dropped], ["not_found", { count: 1, kinds: [kind] }]);
    }
    assert.equal(b.ran("cwd"), false);
  });
});

test("T2.2 子の起動 根へ symlink で貼った dir・根を symlink で名指した場合も、解決した実体で根の下と判定して起動しない", async () => {
  await inBox(async (b) => {
    b.exe(path.join(b.root, "bin"), "aidlc", marking(b, "link"));
    symlinkSync(path.join(b.root, "bin"), path.join(b.other, "link-dir"));
    symlinkSync(b.root, path.join(b.other, "root-link"));
    const viaDir = await probe("aidlc", b, withPath(b, path.join(b.other, "link-dir")));
    assert.deepEqual([viaDir.launch, viaDir.dropped.count, viaDir.dropped.kinds], ["not_found", 1, ["under_root"]]);
    const viaRoot = await probe("aidlc", b, withPath(b, path.join(b.root, "bin")), path.join(b.other, "root-link"));
    assert.deepEqual([viaRoot.launch, viaRoot.dropped.count], ["not_found", 1]);
    assert.equal(b.ran("link"), false);
  });
});

test("T2.2 子の起動 根の外の dir から根の中の実行ファイルへ貼った symlink は起動せず、後ろの dir に正しい物があればそれを起動する", async () => {
  await inBox(async (b) => {
    const inside = b.exe(b.root, "real-aidlc", marking(b, "inside"));
    symlinkSync(inside, path.join(b.outside, "aidlc"));
    const lone = await probe("aidlc", b, withPath(b, b.outside));
    assert.deepEqual([lone.launch, lone.dropped.count, lone.dropped.kinds], ["not_found", 1, ["under_root"]]);
    assert.equal(b.ran("inside"), false);
    b.exe(b.other, "aidlc", marking(b, "later"));
    const next = await probe("aidlc", b, withPath(b, b.outside, b.other));
    assert.deepEqual([next.launch, next.output, next.dropped.count], ["ok", "aidlc 2.11.1\n", 1]);
    assert.deepEqual([b.ran("inside"), b.ran("later")], [false, true]);
  });
});

test("T2.2 子の起動 根の外へ貼った symlink は確かめた実体の絶対 path で起動する（名前では探し直さない）", async () => {
  await inBox(async (b) => {
    const real = b.exe(b.other, "aidlc-real", marking(b, "real"));
    symlinkSync(real, path.join(b.outside, "aidlc"));
    const spy = spawnSpy();
    const fact = await probe("aidlc", b, { spawn: spy.spawn });
    assert.deepEqual([fact.launch, spy.calls.length, spy.calls[0][0]], ["ok", 1, real]);
  });
});

test("T2.2 子の起動 (a) 絞り込み後の dir を全部探しても無ければ未導入（tool_missing）。捨てた欄が 1 つでもあれば未導入と断定せず観測不能で、件数と種別が出る", async () => {
  await inBox(async (b) => {
    const none = await probe("aidlc", b);
    assert.deepEqual([none.launch, none.dropped], ["not_found", { count: 0, kinds: [] }]);
    assert.deepEqual(cause(none), { status: "unavailable", cause: "tool_missing" });
    const dropped = await inCwd(b.outside, () => probe("aidlc", b, withPath(b, b.root, "relative-dir", "", b.outside)));
    assert.deepEqual(dropped.dropped, { count: 3, kinds: ["under_root", "relative", "empty"] });
    assert.deepEqual(cause(dropped), { status: "unavailable", cause: "tool_cannot_start", notes: { droppedCount: 3, droppedKinds: ["empty", "relative", "under_root"] } });
  });
});

test("T2.2 子の起動 PATH に実在しない dir があっても読み飛ばして次を探す。名前だけの dir（実行ファイルでない）も読み飛ばす", async () => {
  await inBox(async (b) => {
    mkdirSync(path.join(b.other, "aidlc"));
    b.exe(b.outside, "aidlc", marking(b, "after"));
    const fact = await probe("aidlc", b, withPath(b, path.join(b.base, "no-such-dir"), b.other, b.outside));
    assert.deepEqual([fact.launch, fact.dropped.count, b.ran("after")], ["ok", 0, true]);
  });
});

test("T2.2 子の起動 (c) 実行権限の無い実行ファイル・dir を解決できない・根を解決できない・PATH が無い時は cannot_start で、起動しない（未導入にも成功にもしない）", async () => {
  await inBox(async (b) => {
    const spy = spawnSpy();
    b.exe(b.other, "aidlc", marking(b, "noexec"), 0o644);
    const noExec = await probe("aidlc", b, { ...withPath(b, b.other), spawn: spy.spawn });
    assert.deepEqual([noExec.launch, noExec.dropped.count], ["cannot_start", 0]);
    const noRoot = await probe("aidlc", b, { spawn: spy.spawn }, path.join(b.base, "no-such-root"));
    const noPath = await probe("aidlc", b, { env: { HOME: "/home/sample-user" }, spawn: spy.spawn });
    const blocked = fsWith({ realpath: async (target, ...rest) => { if (target === b.outside) throw denied; return fsPromises.realpath(target, ...rest); } });
    b.exe(b.outside, "aidlc", marking(b, "blocked"));
    const unreadable = await probe("aidlc", b, { fs: blocked, spawn: spy.spawn });
    assert.deepEqual([noRoot.launch, noPath.launch, unreadable.launch], ["cannot_start", "cannot_start", "cannot_start"]);
    assert.deepEqual([spy.calls.length, b.ran("noexec"), b.ran("blocked")], [0, false, false]);
    for (const fact of [noExec, noRoot, noPath, unreadable]) assert.deepEqual(cause(fact), { status: "unavailable", cause: "tool_cannot_start" });
  });
});

test("T2.2 子の起動 見つけた後・起動の直前に実体が差し替わったら起動しない（同一性の再確認）", async () => {
  await inBox(async (b) => {
    const file = b.exe(b.outside, "aidlc", marking(b, "first"));
    const swapped = b.exe(b.other, "aidlc-new", marking(b, "second"));
    const spy = spawnSpy();
    // 探索の後・起動の前に作業中の dir の確認（OS の根の確認）が入る順なので、その確認の中で差し替える。
    const swapping = fsWith({ access: async (target, ...rest) => { if (target === path.parse(file).root) renameSync(swapped, file); return fsPromises.access(target, ...rest); } });
    const fact = await probe("aidlc", b, { fs: swapping, spawn: spy.spawn });
    assert.deepEqual([fact.launch, spy.calls.length, b.ran("first"), b.ran("second")], ["cannot_start", 0, false, false]);
  });
});

test("T2.2 子の起動 起動の直前に実体が消えた・候補の実体を解決できない（権限）時も cannot_start。同一性を確かめられないものは同じと読まない", async () => {
  await inBox(async (b) => {
    const file = b.exe(b.outside, "aidlc", marking(b, "gone"));
    const spy = spawnSpy();
    const vanishing = fsWith({ access: async (target, ...rest) => { if (target === path.parse(file).root) unlinkSync(file); return fsPromises.access(target, ...rest); } });
    const gone = await probe("aidlc", b, { fs: vanishing, spawn: spy.spawn });
    b.exe(b.outside, "aidlc", marking(b, "hidden"));
    const hidden = fsWith({ realpath: async (target, ...rest) => { if (target === file) throw denied; return fsPromises.realpath(target, ...rest); } });
    const unresolved = await probe("aidlc", b, { fs: hidden, spawn: spy.spawn });
    assert.deepEqual([gone.launch, unresolved.launch, spy.calls.length, b.ran("gone"), b.ran("hidden")], ["cannot_start", "cannot_start", 0, false, false]);
  });
});

test("T2.2 子の起動 道具は固定の集合（node・aidlc）だけ。別の名前・探索の記号を含む名前は起動しない", async () => {
  await inBox(async (b) => {
    const spy = spawnSpy();
    b.exe(b.outside, "sh", marking(b, "sh"));
    b.exe(b.outside, "aidlc;touch-x", marking(b, "name"));
    for (const tool of ["sh", "aidlc;touch-x", "../aidlc", "", undefined]) {
      const fact = await probe(tool, b, { spawn: spy.spawn });
      assert.equal(fact.launch, "cannot_start");
    }
    assert.deepEqual([spy.calls.length, b.ran("sh"), b.ran("name")], [0, false, false]);
  });
});

test("T2.2 子の起動 特殊文字（空白・;・$()）を含む対象名・PATH の dir 名で、追加の命令は走らない（shell を通さない）", async () => {
  await inBox(async (b) => {
    const inject = (name) => `x ;touch ${b.flag(name)};$(touch ${b.flag(name)}) \`touch ${b.flag(name)}\``;
    const root = b.dir(inject("in-root"));
    const where = b.dir(inject("in-path"));
    b.exe(where, "aidlc", marking(b, "special"));
    const fact = await probe("aidlc", b, withPath(b, where), root);
    assert.deepEqual([fact.launch, fact.output, b.ran("special"), b.ran("in-root"), b.ran("in-path")], ["ok", "aidlc 2.11.1\n", true, false, false]);
  });
});

test("T2.2 子の起動 node は process.execPath だけ。PATH 上の同名の node は使わない。execPath が実在しなければ cannot_start（未導入にしない）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "node", marking(b, "from-path", "v1.1.1"));
    const execPath = b.exe(b.other, "node-sample", marking(b, "exec-path", "v9.9.9"));
    const used = await probe("node", b, { execPath });
    assert.deepEqual([used.launch, used.output, b.ran("exec-path"), b.ran("from-path")], ["ok", "v9.9.9\n", true, false]);
    const absent = await probe("node", b, { execPath: path.join(b.other, "no-node") });
    assert.deepEqual([absent.launch, absent.dropped.count], ["cannot_start", 0]);
  });
});

test("T2.2 子の起動 実行ファイルの先頭の行が壊れていて起動できない時は cannot_start（権限・起動失敗）。成功にも未導入にもしない", async () => {
  await inBox(async (b) => {
    b.raw(b.outside, "aidlc", "#!/no/such/interpreter\n");
    const fact = await probe("aidlc", b);
    assert.deepEqual([fact.launch, fact.exitCode, fact.output, fact.measured.requests], ["cannot_start", null, undefined, 1]);
    assert.deepEqual(cause(fact), { status: "unavailable", cause: "tool_cannot_start" });
  });
});
