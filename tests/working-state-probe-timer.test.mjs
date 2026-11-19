// U2 LC1 子の止め方の部品の差し替え（S4。負荷で揺れる試験を、時計に頼らない形にするための入口）: 枠の時計（setTimer）と、止めた後に消えるのを待つ回数・間隔（settle）は、
// 呼出側（試験）が渡せる。渡さない時は本物の setTimeout と今の定数（20 回・10ms）のまま、挙動は変わらない。
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { inBox, probe, profileOf, spawnSpy } from "./working-state-probe-fixtures.mjs";

const limited = (over) => ({ loadProfile: async () => profileOf(over) });
const reap = (pids) => {
  for (const pid of pids) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // 子がもう居ない。後始末なので続ける。
    }
  }
};
// 印の file ができる（子が動き出した）のを待つ。上限は試験が固まらないためだけ。
async function appears(file) {
  for (let tries = 0; tries < 2000 && !existsSync(file); tries += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  return existsSync(file);
}
// 枠の時計の差し替え: 呼び出しを記録し、自分では鳴らさない（試験が鳴らす）。戻り値は取り消す関数。
function manualTimer() {
  const timers = [];
  const state = { cancelled: 0 };
  return { timers, state, setTimer: (fn, ms) => { timers.push({ fn, ms }); return () => { state.cancelled += 1; }; } };
}
const LOOP = (b) => `echo $$ > "${b.flag("pid")}"\nwhile :; do :; done`;

test("T2.2 枠の時計の差し替え: 渡した setTimer が枠（timeoutMs）を預かり、鳴らすまで止まらない。鳴らすと timeout で止め、止めたことを確かめ、時計を取り消す", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", LOOP(b));
    const spy = spawnSpy();
    const timer = manualTimer();
    try {
      const pending = probe("aidlc", b, { ...limited({ timeoutMs: 50 }), spawn: spy.spawn, setTimer: timer.setTimer, settle: { tries: 500, ms: 10 } });
      assert.equal(await appears(b.flag("pid")), true);
      await new Promise((resolve) => setTimeout(resolve, 120)); // 本物の枠（50ms）の何倍も待っても、差し替えた時計は鳴らさないので止まらない
      assert.deepEqual([timer.timers.length, timer.timers[0].ms], [1, 50]);
      timer.timers[0].fn();
      const fact = await pending;
      assert.deepEqual([fact.launch, fact.stop, fact.output], ["ok", { reason: "timeout", confirmed: true }, undefined]);
      assert.equal(timer.state.cancelled, 1);
    } finally {
      reap(spy.pids);
    }
  });
});

test("T2.2 枠の時計の差し替え: 子が枠の前に終われば、時計は鳴らさず取り消すだけ（止めない・timeout にしない）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", 'echo "aidlc 2.11.1"');
    const timer = manualTimer();
    const fact = await probe("aidlc", b, { ...limited(), setTimer: timer.setTimer });
    assert.deepEqual([fact.launch, fact.stop, fact.exitCode, fact.output], ["ok", null, 0, "aidlc 2.11.1\n"]);
    assert.deepEqual([timer.timers.length, timer.state.cancelled], [1, 1]);
  });
});

test("T2.2 止めた後の待ちの差し替え: settle = { tries, ms } の回数だけ消えたかを確かめ（回数 + 最後の 1 回）、残っていれば confirmed を false にする", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", LOOP(b));
    for (const tries of [0, 1, 3]) {
      const spy = spawnSpy();
      const timer = manualTimer();
      const signals = [];
      const stubborn = (pid, signal) => { signals.push(signal); if (signal === 0) return process.kill(-pid, 0); return undefined; };
      try {
        const pending = probe("aidlc", b, { ...limited({ timeoutMs: 50 }), spawn: spy.spawn, setTimer: timer.setTimer, killGroup: stubborn, settle: { tries, ms: 0 } });
        assert.equal(await appears(b.flag("pid")), true);
        timer.timers[0].fn();
        const fact = await pending;
        assert.deepEqual([fact.stop.reason, fact.stop.confirmed], ["timeout", false]);
        assert.equal(signals.filter((signal) => signal === 0).length, tries + 1, `tries=${tries}`);
        assert.equal(signals.filter((signal) => signal === "SIGKILL").length, 1);
      } finally {
        reap(spy.pids);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      await import("node:fs").then(({ rmSync }) => rmSync(b.flag("pid"), { force: true }));
    }
  });
});

test("T2.2 差し替えが無い時は今のまま: 消えたかの確かめは 20 回 + 最後の 1 回、間隔は 10ms（合計で 200ms 近く待つ）。本物の setTimeout で枠が来る", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", LOOP(b));
    const spy = spawnSpy();
    const signals = [];
    const stubborn = (pid, signal) => { signals.push(signal); if (signal === 0) return process.kill(-pid, 0); return undefined; };
    try {
      const started = performance.now();
      const fact = await probe("aidlc", b, { ...limited({ timeoutMs: 300 }), spawn: spy.spawn, killGroup: stubborn });
      assert.deepEqual([fact.stop.reason, fact.stop.confirmed], ["timeout", false]);
      assert.equal(signals.filter((signal) => signal === 0).length, 21);
      assert.equal(performance.now() - started >= 300 + 190, true, "枠 + 待ちの合計より短く終わった（本物の時計が使われていない）");
    } finally {
      reap(spy.pids);
    }
  });
});
