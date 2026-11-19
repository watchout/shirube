// LC1 観測の読取り（adapter。子 process）の後半: 子の起動・出力の数え方・止め方（SC1a・SC-GAP-1）。分類・判定をしない（生の事実だけを返す）。
// 子は shell を通さず、標準入力を閉じ、自分の process group で起動する。時間・出力の枠を超えたら孫を含めて group ごと止め、止めたか確かめる。
// 出力は読みながら数え、上限を超えた時点で打ち切る（超えた分は保持しない）。止められなかった・確かめられなかった時は confirmed = false で返す。
// 限界: 自分の group から抜けた孫（setsid など）は、この方法では止められず、検知もできない。
import { spawn } from "node:child_process";

// group へ信号を送る（POSIX。負の pid = group）。信号 0 は居るかの確認だけ。
export const killGroupOf = (pid, signal) => process.kill(-pid, signal);

// 止めたあとに group が消えるのを待つ回数と間隔の既定（実装の定数）。試験は deps.settle で差し替えられる（負荷で揺れる待ちを、時計に頼らない形にするため。S4）。
const SETTLE = Object.freeze({ tries: 20, ms: 10 });
// 枠の時計の既定（本物の setTimeout）。戻り値は取り消す関数。試験は deps.setTimer で差し替えられる（枠の時計を試験が預かれる）。
const realTimer = (fn, ms) => {
  const timer = setTimeout(fn, ms);
  return () => clearTimeout(timer);
};
const UNLAUNCHED = Object.freeze({ launch: "cannot_start", exitCode: null, output: undefined, stop: null, bytesRead: 0 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function groupGone(pid, killGroup) {
  try {
    killGroup(pid, 0);
    return false;
  } catch (error) {
    return error?.code === "ESRCH";
  }
}

// group を止め、残っていないことを確かめる。止める呼び出しの成否は読まず（macOS は終わって回収前の子だけの group に EPERM を返す）、
// 消えたことの観測だけで確かめる。消えない（止める呼び出しが効かない・権限がない）時は false。
async function stopGroup(pid, killGroup, settle) {
  try {
    killGroup(pid, "SIGKILL");
  } catch {
    // 成否では確かめない。下で group が消えたことを観測する。
  }
  for (let tries = 0; tries < settle.tries; tries += 1) {
    if (groupGone(pid, killGroup)) return true;
    await sleep(settle.ms);
  }
  return groupGone(pid, killGroup);
}

const optionsOf = (command) => ({ cwd: command.cwd, env: command.env, shell: false, detached: true, stdio: ["ignore", "pipe", "ignore"] });

// 読みながら数える。上限を超えたらそれまでの分も返さず、止める。
function take(state, chunk, maxBytes, halt) {
  if (state.stopped) return;
  state.total += chunk.length;
  if (state.total > maxBytes) halt("output_limit");
  else state.chunks.push(chunk);
}

// 子を 1 回起動して結果の事実を返す。command = { file, args, env, cwd }、limits = { timeoutMs, maxBytes }、deps = { spawn, killGroup, setTimer?, settle? }
// （setTimer・settle は省けて、省けば本物の setTimeout と SETTLE の既定）。
export function runChild(command, limits, deps = { spawn, killGroup: killGroupOf }) {
  return new Promise((resolve) => {
    const state = { chunks: [], total: 0, stopped: false, cancelTimer: () => {} };
    const finish = (result) => {
      state.cancelTimer();
      resolve(result);
    };
    let child = null;
    try {
      child = deps.spawn(command.file, command.args, optionsOf(command));
    } catch {
      finish(UNLAUNCHED);
      return;
    }
    const halt = async (reason) => {
      if (state.stopped) return;
      state.stopped = true;
      const confirmed = await stopGroup(child.pid, deps.killGroup, deps.settle ?? SETTLE);
      finish({ launch: "ok", exitCode: null, output: undefined, stop: { reason, confirmed }, bytesRead: Math.min(state.total, limits.maxBytes + 1) });
    };
    state.cancelTimer = (deps.setTimer ?? realTimer)(() => halt("timeout"), limits.timeoutMs);
    child.on("error", () => finish(UNLAUNCHED));
    child.stdout.on("data", (chunk) => take(state, chunk, limits.maxBytes, halt));
    child.on("close", (code) => {
      if (!state.stopped) finish({ launch: "ok", exitCode: code, output: Buffer.concat(state.chunks).toString("utf8"), stop: null, bytesRead: state.total });
    });
  });
}
