// LC1 観測の読取り（adapter。file）。実体の解決（実 path・同一性・根との位置関係の事実だけ）→ 判定は呼出側の核（LC2）→ 許した実体だけを読む、の 2 段。
// 返すのは生の事実だけ（読取りの前後の digest・大きさ・所要時間・読んだ大きさ）で、分類・比較・判定をしない。時計を読むのはここだけ。
// 例外 1 つ: 読む直前に、判定した実体と読む実体が同じかの等値の確認を機構として行い、結果（identity）を事実として返す。観測不能にする判断は LC2。
// 予算は信頼版の profile（U1 の規則 policy.budget）から読む。呼出側は値を渡せず、読めない時は読取りを始めず、既定の予算を使わない。
// 開いた形の生の値（content）は返り値の LC2 への受け渡しだけに載せ、診断・記録・例外・案内へ渡る経路を作らない（Owner の決定 120）。
import { constants } from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./canonical.mjs";

// 1 回の読みの大きさ（バイト）。読みながら大きさを数え、上限に達した時点で打ち切る。
export const CHUNK_BYTES = 65536;

// 前（digest だけ）・本（中身）・後（digest だけ）の 3 回読む。
const PASSES = 3;
const DENIED = new Set(["EACCES", "EPERM"]);
const REPLACED = new Set(["ELOOP", "ENOENT", "ENOTDIR"]);
const ACCESS_OF_RESOLUTION = new Map([["denied", "denied"], ["absent", "absent"]]);
export const REAL_CLOCK = Object.freeze({ instant: () => new Date(), monotonic: () => performance.now() });
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

// 信頼版の予算の profile（U1）。読めなければ例外になり、呼出側（readProfile）が「読めない」に倒す。
export async function loadBudgetProfile() {
  const { BUDGET, RULESET } = await import("../sds/ci-record-policy.mjs");
  return { version: RULESET, budget: BUDGET };
}

const withDefaults = (deps = {}) => ({ fs: fsPromises, clock: REAL_CLOCK, loadProfile: loadBudgetProfile, ...deps });

// profile の値を LC2 が読む予算の形にする。形が不正・欠落なら null（既定の値で埋めない）。
function budgetOf(profile) {
  const raw = profile?.budget;
  if (typeof profile?.version !== "string" || !isCount(raw?.timeoutMs) || !isCount(raw.maxBytesPerResponse) || !isCount(raw.maxRequests)) return null;
  return { version: profile.version, budget: { maxElapsedMs: raw.timeoutMs, maxBytes: raw.maxBytesPerResponse, maxRequests: raw.maxRequests } };
}

export async function readProfile(deps) {
  try {
    return budgetOf(await deps.loadProfile());
  } catch {
    return null;
  }
}

const idOf = (stat) => `${stat.dev}:${stat.ino}`;

// 根の下で、いちばん近い存在する祖先を読めるか（親が読めて無いと分かるための事実）。
async function parentReadable(deps, absolute, root) {
  let directory = path.dirname(absolute);
  for (;;) {
    try {
      await deps.fs.access(directory, constants.R_OK | constants.X_OK);
      return true;
    } catch (error) {
      if (error?.code !== "ENOENT" || directory === root || directory === path.dirname(directory)) return false;
    }
    directory = path.dirname(directory);
  }
}

// 実体が無い・読めない時の事実。つながっていない symlink（lstat はできる）は「無い」にしない。
async function unresolvedFacts(deps, error, absolute, root) {
  if (error?.code === "ELOOP") return { resolution: "loop" };
  if (DENIED.has(error?.code)) return { resolution: "denied" };
  if (error?.code !== "ENOENT") return { resolution: "failed" };
  const dangling = await deps.fs.lstat(absolute).then(() => true, () => false);
  return dangling ? { resolution: "failed" } : { resolution: "absent", parentReadable: await parentReadable(deps, absolute, root) };
}

// 第 1 段: 実体の解決。実 path・同一性（fileId）・根との位置関係の事実だけを返す。file は開かない。
export async function resolveFile({ root, locator }, depsIn) {
  const deps = withDefaults(depsIn);
  let rootRealPath = null;
  try {
    rootRealPath = await deps.fs.realpath(root);
    const absolute = path.resolve(rootRealPath, locator);
    try {
      const realPath = await deps.fs.realpath(absolute);
      const stat = await deps.fs.stat(realPath, { bigint: true });
      return { resolution: "resolved", realPath, rootRealPath, fileId: idOf(stat) };
    } catch (error) {
      return { ...(await unresolvedFacts(deps, error, absolute, rootRealPath)), rootRealPath };
    }
  } catch {
    return { resolution: "failed", rootRealPath };
  }
}

// 1 回分の読み。読みながら大きさを数え、上限（maxBytes + 1）か時間の枠に達したら打ち切る。上限を超えた分は保持しない。
async function pass(handle, limits) {
  const chunks = [];
  let total = 0;
  for (;;) {
    if (limits.expired()) return { stop: "time", total, chunks };
    const want = Math.min(CHUNK_BYTES, limits.maxBytes + 1 - total);
    const buffer = Buffer.allocUnsafe(want);
    const { bytesRead } = await handle.read(buffer, 0, want, total);
    if (bytesRead === 0) return { stop: null, total, chunks };
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
    if (total > limits.maxBytes) return { stop: "size", total, chunks };
  }
}

const textOf = (result) => Buffer.concat(result.chunks).toString("utf8");

// 開いた実体を 3 回読む。途中で枠に達したら、そこで止めて読んだ大きさだけ返す（中身・digest は返さない）。
async function readPasses(handle, limits) {
  const results = [];
  for (let index = 0; index < PASSES; index += 1) {
    results.push(await pass(handle, limits));
    if (results[index].stop !== null) return { identity: "same", access: "ok", bytesRead: results[index].total, requests: 1 };
  }
  return { identity: "same", access: "ok", bytesRead: results[1].total, requests: 1, digestBefore: sha256Hex(textOf(results[0])), content: textOf(results[1]), digestAfter: sha256Hex(textOf(results[2])) };
}

// 読む直前の等値の確認（機構）。判定した実体と同じ file でなければ読まず、違うという事実だけ返す。普通の file でない実体も読まない。
async function readOpened(handle, resolved, limits) {
  const stat = await handle.stat({ bigint: true });
  if (idOf(stat) !== resolved.fileId) return { identity: "differs", access: "ok", bytesRead: 0, requests: 1 };
  if (!stat.isFile()) return { identity: "same", access: "failed", bytesRead: 0, requests: 1 };
  return readPasses(handle, limits);
}

// 開けなかった・読めなかった事実。判定した実体が置き換わった（symlink・無い・dir でない）なら identity は違う。
function failedEntity(error) {
  if (REPLACED.has(error?.code)) return { identity: "differs", access: "ok", bytesRead: 0, requests: 1 };
  return { identity: "not_checked", access: DENIED.has(error?.code) ? "denied" : "failed", bytesRead: 0, requests: 1 };
}

async function closeQuietly(handle) {
  try {
    await handle?.close();
  } catch {
    // 閉じられなくても、読んだ事実は変わらない。
  }
}

async function readEntity(resolved, limits, deps) {
  if (resolved?.resolution !== "resolved") {
    return { identity: "not_checked", access: ACCESS_OF_RESOLUTION.get(resolved?.resolution) ?? "failed", parentReadable: resolved?.parentReadable, bytesRead: 0, requests: 0 };
  }
  let handle = null;
  try {
    handle = await deps.fs.open(resolved.realPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    return await readOpened(handle, resolved, limits);
  } catch (error) {
    return failedEntity(error);
  } finally {
    await closeQuietly(handle);
  }
}

const pathFacts = (resolved) => ({ resolution: resolved?.resolution ?? "failed", realPath: resolved?.realPath, rootRealPath: resolved?.rootRealPath });
const elapsedSince = (deps, started) => Math.max(0, Math.ceil(deps.clock.monotonic() - started));
const head = (request, deps) => ({ sourceKind: request.sourceKind, locator: request.locator, observedAt: deps.clock.instant().toISOString() });

// 読取りを始めなかった事実（profile が読めない・呼出側が許さなかった）。予算は null で、LC2 が既存の原因で観測不能にする。
function notStarted(request, resolved, deps, access) {
  return { ...head(request, deps), budget: null, budgetProfile: null, measured: { elapsedMs: 0, bytesRead: 0, requests: 0 }, ...pathFacts(resolved), identity: "not_checked", access };
}

// 第 2 段: 判定が許した実体だけを読み、生の事実を返す。profile が読めない時は file を開かない。
export async function readResolvedFile(request, resolved, depsIn) {
  const deps = withDefaults(depsIn);
  const started = deps.clock.monotonic();
  const profile = await readProfile(deps);
  if (profile === null) return notStarted(request, resolved, deps, "not_started");
  const limits = { maxBytes: profile.budget.maxBytes, expired: () => deps.clock.monotonic() - started > profile.budget.maxElapsedMs };
  const { bytesRead, requests, ...entity } = await readEntity(resolved, limits, deps);
  return { ...head(request, deps), budget: { ...profile.budget }, budgetProfile: { version: profile.version }, measured: { elapsedMs: elapsedSince(deps, started), bytesRead, requests }, ...pathFacts(resolved), ...entity };
}

const safeAllows = (allow, view) => {
  try {
    return typeof allow === "function" && allow(view) === true;
  } catch {
    return false;
  }
};

// 2 段をつなぐ。allow は核（LC2）の判定を呼出側が包んだ関数で、解決の事実を受けて true の時だけ読む（無い・例外・true 以外は読まない）。
export async function readFileFact(request, allow, depsIn) {
  const deps = withDefaults(depsIn);
  const resolved = await resolveFile(request, deps);
  const view = { sourceKind: request.sourceKind, locator: request.locator, ...resolved };
  return safeAllows(allow, view) ? readResolvedFile(request, resolved, deps) : notStarted(request, resolved, deps, "ok");
}
