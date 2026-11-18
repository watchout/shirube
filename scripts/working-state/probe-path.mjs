// LC1 観測の読取り（adapter。子 process）の前半: 起動する実行ファイルの探索。起動の条件 2・3（infrastructure-specification）。
// 返すのは事実だけ（見つけた実体・同一性・捨てた欄の種別）。分類・判定（未導入か観測不能か）は LC2 が読む（read-check.mjs の interpretProbe）。
// PATH は「空でなく・絶対で・対象の根の外」の dir だけを探す。判定は対象の根と各 dir・各実行ファイルを symlink 解決した実体で行う。
import { constants } from "node:fs";
import path from "node:path";

const MISSING = new Set(["ENOENT", "ENOTDIR"]);
const idOf = (stat) => `${stat.dev}:${stat.ino}`;
const cannotStart = (dropped = []) => ({ state: "cannot_start", dropped });

// 実体が対象の根そのもの・根の下にあるか（実体の path どうしで比べる）。
function isUnder(real, rootReal) {
  const relative = path.relative(rootReal, real);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

// 実体（symlink を解決した path）。無い = missing、ほかの失敗（権限など）= failed。
async function realOf(fs, target) {
  try {
    return { real: await fs.realpath(target) };
  } catch (error) {
    return MISSING.has(error?.code) ? { missing: true } : { failed: true };
  }
}

// 普通の file で、実行できる実体の同一性。普通の file でなければ notFile、読めない・実行できなければ failed。
async function executableId(fs, file) {
  try {
    const stat = await fs.stat(file, { bigint: true });
    if (!stat.isFile()) return { notFile: true };
    await fs.access(file, constants.X_OK);
    return { id: idOf(stat) };
  } catch {
    return { failed: true };
  }
}

// 起動の直前の再確認に使う同一性。読めなければ null（確かめられない = 同じと読まない）。
export async function identityOf(fs, file) {
  try {
    return idOf(await fs.stat(file, { bigint: true }));
  } catch {
    return null;
  }
}

// PATH の 1 要素の扱い。drop = 探さない（種別）、dir = 探す実体の dir、skip = 実在しない、failed = 解決できない。
async function classify(element, rootReal, fs) {
  if (element === "") return { drop: "empty" };
  if (!path.isAbsolute(element)) return { drop: "relative" };
  const found = await realOf(fs, element);
  if (found.real === undefined) return found.failed ? { failed: true } : { skip: true };
  return isUnder(found.real, rootReal) ? { drop: "under_root" } : { dir: found.real };
}

// PATH を絞る。探す dir（実体）と、捨てた欄の種別（PATH の順）を返す。1 つでも解決の失敗があれば null（絞れたと言わない）。
async function narrow(pathValue, rootReal, fs) {
  const result = { dirs: [], dropped: [] };
  for (const element of pathValue.split(path.delimiter)) {
    const step = await classify(element, rootReal, fs);
    if (step.failed) return null;
    if (step.drop) result.dropped.push(step.drop);
    if (step.dir) result.dirs.push(step.dir);
  }
  return result;
}

// 絞った dir を順に探す。実行ファイルの実体も根の外であること（根の中なら起動せず、捨てた欄として数える）。
async function searchDirs(name, narrowed, rootReal, fs) {
  const dropped = [...narrowed.dropped];
  for (const dir of narrowed.dirs) {
    const candidate = await realOf(fs, path.join(dir, name));
    if (candidate.failed) return cannotStart(dropped);
    if (candidate.real === undefined) continue;
    if (isUnder(candidate.real, rootReal)) {
      dropped.push("under_root");
      continue;
    }
    const checked = await executableId(fs, candidate.real);
    if (checked.notFile) continue;
    return checked.failed ? cannotStart(dropped) : { state: "found", file: candidate.real, id: checked.id, dropped };
  }
  return { state: "not_found", dropped };
}

// node は process.execPath だけ（PATH を使わない）。
async function locateExecPath(execPath, fs) {
  const checked = await executableId(fs, execPath);
  return checked.id === undefined ? cannotStart() : { state: "found", file: execPath, id: checked.id, dropped: [] };
}

// 結果: { state: "found" | "not_found" | "cannot_start", file?, id?, dropped: [種別], searchPath? }。searchPath は子へ渡す PATH（絞り込み後。元の PATH が無ければ無し）。
export async function locateTool({ tool, root }, { env, execPath, fs }) {
  const rootOf = await realOf(fs, root);
  const hasPath = typeof env.PATH === "string";
  if (rootOf.real === undefined || (!hasPath && tool !== "node")) return cannotStart();
  const narrowed = hasPath ? await narrow(env.PATH, rootOf.real, fs) : { dirs: [], dropped: [] };
  if (narrowed === null) return cannotStart();
  const located = tool === "node" ? await locateExecPath(execPath, fs) : await searchDirs(tool, narrowed, rootOf.real, fs);
  return hasPath ? { ...located, searchPath: narrowed.dirs.join(path.delimiter) } : located;
}
