// U2 LC1 子 process の起動の条件 1・4・5・6 と子の止め方（SC1a・SC-GAP-1）。環境変数は 4 つだけ・shell を通さない・標準入力を閉じる・cwd は OS の根・
// 自分の process group で起動し、枠（時間・出力）を超えたら孫を含めて group ごと止める。出力は読みながら数えて上限で打ち切る。止めたか確かめられなければ成功にしない。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { fsWith, inBox, isGone, marking, probe, profileOf, sampleEnv, spawnSpy } from "./working-state-probe-fixtures.mjs";

const cause = (fact) => ws.interpretProbe(fact);
const pidOf = (b, name) => Number(readFileSync(b.flag(name), "utf8").trim());
// 試験の後始末: 止まらなかった子を group ごと止める（印が無い・もう居ない時は何もしない。試験の判定には使わない）。
function reap(b) {
  try {
    process.kill(-pidOf(b, "pid"), "SIGKILL");
  } catch {
    // 子がもう居ない・印が書かれる前に落ちた。後始末なので続ける。
  }
}
const limited =(over) => ({ loadProfile: async () => profileOf(over) });
const OS_ROOT = path.parse(process.cwd()).root;

test("T2.2 子の起動 起動の形: 確かめた絶対 path・固定の引数（--version）・shell なし・自分の process group・cwd は OS の根・環境変数は 4 つだけ", async () => {
  await inBox(async (b) => {
    const file = b.exe(b.outside, "aidlc", `pwd\n${marking(b, "form")}`);
    const spy = spawnSpy();
    const env = sampleEnv(b, { GH_TOKEN: "sample-token-0000", NPM_TOKEN: "sample-token-1111", AWS_ACCESS_KEY_ID: "sample-key", OTHER: "x" });
    const fact = await probe("aidlc", b, { spawn: spy.spawn, env });
    const [command, args, options] = spy.calls[0];
    assert.deepEqual([command, args], [file, ["--version"]]);
    assert.deepEqual([options.shell === true, options.detached, options.cwd], [false, true, OS_ROOT]);
    assert.deepEqual(Object.keys(options.env).sort(), ["HOME", "LANG", "LC_ALL", "PATH"]);
    assert.equal(options.env.PATH, b.outside);
    assert.equal(options.stdio[0], "ignore");
    assert.equal(fact.output, `${OS_ROOT}\naidlc 2.11.1\n`);
  });
});

test("T2.2 子の起動 環境にある架空の token・資格情報の名前は子へ渡らない。PATH は絞り込み後だけ。無い名前（HOME など）は作らない", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", "export -p");
    const env = { PATH: [b.root, "", b.outside].join(path.delimiter), LANG: "C", GH_TOKEN: "sample-token-0000", GITHUB_TOKEN: "sample-token-2222", AWS_SECRET_ACCESS_KEY: "sample-secret" };
    const spy = spawnSpy();
    const fact = await probe("aidlc", b, { env, spawn: spy.spawn });
    assert.deepEqual(Object.keys(spy.calls[0][2].env).sort(), ["LANG", "PATH"]);
    assert.equal(spy.calls[0][2].env.PATH, b.outside);
    for (const secret of ["sample-token-0000", "sample-token-2222", "sample-secret", "GH_TOKEN", "AWS_"]) assert.equal(fact.output.includes(secret), false);
    assert.equal(fact.output.includes(b.outside), true);
  });
});

test("T2.2 子の起動 標準入力は閉じる（読もうとしても待たずに終わる）。終了コードが 0 でなければ生の事実として返す", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", 'read line\necho "got:$line"\nexit 3');
    const fact = await probe("aidlc", b);
    assert.deepEqual([fact.launch, fact.exitCode, fact.output, fact.stop], ["ok", 3, "got:\n", null]);
    assert.deepEqual(cause(fact), { status: "unavailable", cause: "tool_cannot_start" });
  });
});

test("T2.2 子の起動 cwd に使えない（OS の根を開けない）時は起動せず cannot_start。別の場所へ代えない", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", marking(b, "cwd"));
    const spy = spawnSpy();
    const noRoot = fsWith({ access: async (target, ...rest) => { if (target === OS_ROOT) throw Object.assign(new Error("denied"), { code: "EACCES" }); return fsPromises.access(target, ...rest); } });
    const fact = await probe("aidlc", b, { fs: noRoot, spawn: spy.spawn });
    assert.deepEqual([fact.launch, spy.calls.length, b.ran("cwd")], ["cannot_start", 0, false]);
    assert.deepEqual(cause(fact), { status: "unavailable", cause: "tool_cannot_start" });
  });
});

test("T2.2 子の起動 process group の停止を確かめられない OS（Windows）では起動せず cannot_start", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", marking(b, "win"));
    const spy = spawnSpy();
    const fact = await probe("aidlc", b, { platform: "win32", spawn: spy.spawn });
    assert.deepEqual([fact.launch, spy.calls.length, b.ran("win")], ["cannot_start", 0, false]);
  });
});

test("T2.2 子の起動 profile（予算）が読めない・形が不正な時は起動せず、既定の予算を使わない（LC2 は malformed）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", marking(b, "profile"));
    const spy = spawnSpy();
    const broken = await probe("aidlc", b, { loadProfile: async () => { throw new Error("unreadable"); }, spawn: spy.spawn });
    const shapeless = await probe("aidlc", b, { loadProfile: async () => ({ version: "p/1" }), spawn: spy.spawn });
    for (const fact of [broken, shapeless]) {
      assert.deepEqual([fact.launch, fact.budget, fact.budgetProfile, fact.measured.requests], ["not_started", null, null, 0]);
      assert.deepEqual(cause(fact), { status: "unavailable", cause: "malformed" });
    }
    assert.deepEqual([spy.calls.length, b.ran("profile")], [0, false]);
  });
});

test("T2.2 出力の枠: 上限ちょうどは通る。上限を 1 バイト超えたら読取りを打ち切り、保持せず、budget_exceeded（成功にしない）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", 'echo "123456789"');
    const fits = await probe("aidlc", b, limited({ maxBytesPerResponse: 10 }));
    assert.deepEqual([fits.launch, fits.output, fits.stop, fits.measured.bytesRead], ["ok", "123456789\n", null, 10]);
    b.exe(b.outside, "aidlc", 'echo "1234567890"');
    const over = await probe("aidlc", b, limited({ maxBytesPerResponse: 10 }));
    assert.deepEqual([over.stop, over.output, over.measured.bytesRead], [{ reason: "output_limit", confirmed: true }, undefined, 11]);
    assert.deepEqual(cause(over), { status: "unavailable", cause: "budget_exceeded" });
  });
});

test("T2.2 出力の枠: 出し続ける子は上限で打ち切り、子（group）ごと止める。数えるのは読みながら（読み終えを待たない）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", `echo $$ > "${b.flag("pid")}"\nwhile :; do echo xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx; done`);
    const fact = await probe("aidlc", b, limited({ maxBytesPerResponse: 100 }));
    assert.deepEqual([fact.stop, fact.output, fact.measured.bytesRead], [{ reason: "output_limit", confirmed: true }, undefined, 101]);
    assert.equal(await isGone(pidOf(b, "pid")), true);
  });
});

test("T2.2 時間の枠: 応答しない子は枠で止め、timed_out（成功にしない）。止めたあとに子は生きていない", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", `echo $$ > "${b.flag("pid")}"\nwhile :; do :; done`);
    const fact = await probe("aidlc", b, limited({ timeoutMs: 150 }));
    assert.deepEqual([fact.launch, fact.stop, fact.output, fact.exitCode], ["ok", { reason: "timeout", confirmed: true }, undefined, null]);
    assert.deepEqual(cause(fact), { status: "unavailable", cause: "timed_out" });
    assert.equal(await isGone(pidOf(b, "pid")), true);
  });
});

test("T2.2 孫を作る子が枠を超えたら、孫も group ごと止まる（子だけを止めて孫を残さない）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", `( while :; do :; done ) &\necho $! > "${b.flag("grandchild")}"\necho $$ > "${b.flag("pid")}"\nwhile :; do :; done`);
    const fact = await probe("aidlc", b, limited({ timeoutMs: 200 }));
    assert.deepEqual(fact.stop, { reason: "timeout", confirmed: true });
    assert.deepEqual([await isGone(pidOf(b, "pid")), await isGone(pidOf(b, "grandchild"))], [true, true]);
  });
});

test("T2.2 止めたか確かめられない（group がまだ残る・止める呼び出しが失敗する）時は confirmed を false にし、成功にしない", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", `echo $$ > "${b.flag("pid")}"\nwhile :; do :; done`);
    const attempts = [];
    const stubborn = (pid, signal) => { attempts.push(signal); if (signal === 0) return process.kill(-pid, 0); return undefined; };
    const failing = (pid, signal) => { if (signal === 0) return process.kill(-pid, 0); throw Object.assign(new Error("not permitted"), { code: "EPERM" }); };
    for (const killGroup of [stubborn, failing]) {
      try {
        const fact = await probe("aidlc", b, { ...limited({ timeoutMs: 100 }), killGroup });
        assert.deepEqual([fact.stop.reason, fact.stop.confirmed, fact.output], ["timeout", false, undefined]);
        assert.equal(cause(fact).status, "unavailable");
      } finally {
        reap(b);
      }
    }
    assert.equal(attempts.includes("SIGKILL"), true);
  });
});
