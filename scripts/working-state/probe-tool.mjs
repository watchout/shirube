// LC1 観測の読取り（adapter。子 process）: 道具（node・aidlc）の版の問い合わせを 1 回だけ子 process で行い、生の事実を返す（BR2.2）。
// 返すのは LC2（read-check.mjs の interpretProbe）が読む形の事実だけで、分類・比較・判定をしない。時計を読むのはここだけ。
// 起動の条件（infrastructure-specification「子 process の起動の条件」）: 道具は固定の集合、node は process.execPath、aidlc は PATH のうち
// 空でなく絶対で対象の根の外の dir だけ（実体も根の外）、環境変数は PATH（絞り込み後）・LANG・LC_ALL・HOME だけ、shell を通さず標準入力を閉じる、
// cwd は OS の根（使えなければ起動せず、別の場所へ代えない）。確かめた実体の絶対 path で、起動の直前に同一性を再確認して起動する。
// 予算は信頼版の profile（U1）から読む。読めない時は起動しない。U2 は何も作らず何も書かない。
// この OS（POSIX）以外では、group ごとの停止を確かめられないので起動しない。
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { identityOf, locateTool } from "./probe-path.mjs";
import { killGroupOf, runChild } from "./probe-run.mjs";
import { REAL_CLOCK, loadBudgetProfile, readProfile } from "./read-file.mjs";

const TOOLS = new Set(["node", "aidlc"]);
const QUERY_ARGS = Object.freeze(["--version"]);
const CHILD_ENV_NAMES = Object.freeze(["LANG", "LC_ALL", "HOME"]);
const OS_ROOT = path.parse(path.resolve(path.sep)).root;
const NO_DROPPED = Object.freeze([]);

const withDefaults = (deps = {}) => ({
  fs: fsPromises, clock: REAL_CLOCK, loadProfile: loadBudgetProfile, env: process.env, execPath: process.execPath,
  platform: process.platform, spawn, killGroup: killGroupOf, ...deps,
});

// 起動しなかった結果の事実（子は動いていない）。
const notRun = (launch, dropped = NO_DROPPED) => ({ launch, exitCode: null, output: undefined, stop: null, bytesRead: 0, requests: 0, dropped });

function childEnv(env, searchPath) {
  const child = searchPath === undefined ? {} : { PATH: searchPath };
  for (const name of CHILD_ENV_NAMES) if (typeof env[name] === "string") child[name] = env[name];
  return child;
}

async function cwdUsable(fs) {
  try {
    await fs.access(OS_ROOT, constants.R_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// 探索 → 作業中の dir の確認 → 同一性の再確認 → 起動、の順。どこで止まっても、起動していなければ requests は 0。
async function launch(request, deps, profile) {
  if (!TOOLS.has(request.tool) || deps.platform === "win32") return notRun("cannot_start");
  const located = await locateTool(request, deps);
  if (located.state !== "found") return notRun(located.state, located.dropped);
  if (!(await cwdUsable(deps.fs)) || (await identityOf(deps.fs, located.file)) !== located.id) return notRun("cannot_start", located.dropped);
  const command = { file: located.file, args: QUERY_ARGS, env: childEnv(deps.env, located.searchPath), cwd: OS_ROOT };
  const ran = await runChild(command, { timeoutMs: profile.budget.maxElapsedMs, maxBytes: profile.budget.maxBytes }, deps);
  return { ...ran, requests: 1, dropped: located.dropped };
}

const elapsedSince = (deps, started) => Math.max(0, Math.ceil(deps.clock.monotonic() - started));

// 道具の確かめ 1 回。request = { tool, root }（root は対象の根）。deps は試験が差し替える部品（fs・clock・loadProfile・env・execPath・platform・spawn・killGroup）。
export async function probeToolFact(request, depsIn) {
  const deps = withDefaults(depsIn);
  const started = deps.clock.monotonic();
  const profile = await readProfile(deps);
  const head = { sourceKind: "tool_probe", locator: request?.tool, observedAt: deps.clock.instant().toISOString() };
  const counted = (dropped) => ({ count: dropped.length, kinds: [...dropped] });
  if (profile === null) {
    const { bytesRead, requests, dropped, ...rest } = notRun("not_started");
    return { ...head, ...rest, budget: null, budgetProfile: null, measured: { elapsedMs: 0, bytesRead, requests }, dropped: counted(dropped) };
  }
  const { bytesRead, requests, dropped, ...rest } = await launch(request ?? {}, deps, profile);
  return { ...head, ...rest, budget: { ...profile.budget }, budgetProfile: { version: profile.version }, measured: { elapsedMs: elapsedSince(deps, started), bytesRead, requests }, dropped: counted(dropped) };
}
