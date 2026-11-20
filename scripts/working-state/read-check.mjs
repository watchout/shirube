// LC2 の前半: LC1 から届いた 1 回の読取りの生の事実を、使える中身か・使えない理由（既存の UnobservableCause だけ）かに解釈する。
// 解釈は届いた事実だけから行い、宣言・cache・既定の予算を足さない（BR1.2・S5）。時刻・乱数・環境変数・file・子 process・network を使わない（S4）。
// 結果の形: { status: "unavailable", cause, notes? } | { status: "absent" } | { status: "doc", doc } | { status: "output", output }。
import path from "node:path";
import { sha256Hex } from "./canonical.mjs";
import { parseSourceContent } from "./source-extract.mjs";

const unavailable = (cause, notes) => (notes === undefined ? { status: "unavailable", cause } : { status: "unavailable", cause, notes });

const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const BUDGET_KEYS = ["maxElapsedMs", "maxBytes", "maxRequests"];
const MEASURED_KEYS = ["elapsedMs", "bytesRead", "requests"];
const isCountRecord = (record, keys) => typeof record === "object" && record !== null && !Array.isArray(record) && keys.every((key) => isCount(record[key]));

// 予算の profile と実測が読めること（読めなければ既定の予算で代用せず malformed）。
const profileCause = (read) => (isCountRecord(read.budget, BUDGET_KEYS) && isCountRecord(read.measured, MEASURED_KEYS) ? null : "malformed");

// 実測が宣言を超えたか。等しい間は通る。時間 = timed_out、大きさ・回数 = budget_exceeded。
function excessCause(read) {
  if (read.measured.elapsedMs > read.budget.maxElapsedMs) return "timed_out";
  return read.measured.bytesRead > read.budget.maxBytes || read.measured.requests > read.budget.maxRequests ? "budget_exceeded" : null;
}

// 項目の事実に添える使った量。実測が読めない時は 0（使った量を作らない）。
export const usageOf = (read) => (isCountRecord(read?.measured, MEASURED_KEYS) ? { requests: read.measured.requests, bytes: read.measured.bytesRead, elapsedMs: read.measured.elapsedMs } : { requests: 0, bytes: 0, elapsedMs: 0 });

// OS の付随ファイル・編集の一時ファイル。値として読まない。
const COMPANION_RE = /(?:^|\/)(?:\.DS_Store|\._[^/]*|Thumbs\.db|desktop\.ini|\.#[^/]*|#[^/]*#|[^/]*~|[^/]*\.(?:swp|swo|tmp))$/u;

const isRelativeInside = (locator) => typeof locator === "string" && locator !== "" && !locator.startsWith("/") && !locator.split("/").includes("..");

// 実体の path が根の下か（両方とも絶対の path であること。根の名前を前に持つ別の名前は外）。atRoot = 根そのものを内とするか。
function isInsideRoot(realPath, root, atRoot) {
  if (typeof realPath !== "string" || typeof root !== "string" || !path.posix.isAbsolute(realPath) || !path.posix.isAbsolute(root)) return false;
  const relative = path.posix.relative(root, realPath);
  if (relative === "") return atRoot;
  return relative !== ".." && !relative.startsWith("../") && !path.posix.isAbsolute(relative);
}

// 根の内外（BR1.5）。読めた時は実体が根の下の同じ実体であること。無かった時は、いちばん近い存在する祖先（symlink を解決した後）が根の中か根そのものであること（根の外へ向く symlink の先の「無い」を内の未導入にしない）。
function boundaryCause(read) {
  if (!isRelativeInside(read.locator) || COMPANION_RE.test(read.locator) || read.resolution === "loop") return "out_of_boundary";
  if (read.access === "absent") return read.parentReadable === true && !isInsideRoot(read.parentRealPath, read.rootRealPath, true) ? "out_of_boundary" : null;
  if (read.access !== "ok") return null;
  const inside = read.resolution === "resolved" && read.identity === "same" && isInsideRoot(read.realPath, read.rootRealPath, false);
  return inside ? null : "out_of_boundary";
}

const ACCESS_CAUSES = new Map([["denied", "permission_denied"], ["failed", "fetch_failed"]]);

// 読めなかった結果の分類。404 だけでは未導入にせず、親が読めて無いと分かる時だけ absent（BR2.1）。
function accessOutcome(read) {
  if (read.access === "ok") return null;
  if (read.access === "absent") return read.parentReadable === true ? { status: "absent" } : unavailable("not_found_unconfirmed");
  return unavailable(ACCESS_CAUSES.get(read.access) ?? "fetch_failed");
}

// 読んだ中身が前後の digest と一致すること（読取り中の変化の確認。digest が無いのも不一致）。
function interpretContent(read) {
  if (typeof read.content !== "string") return unavailable("fetch_failed");
  const digest = sha256Hex(read.content);
  if (read.digestBefore !== digest || read.digestAfter !== digest) return unavailable("changed_during_read");
  const parsed = parseSourceContent(read.sourceKind, read.content);
  return parsed.ok ? { status: "doc", doc: parsed.doc } : unavailable("malformed");
}

export function interpretFile(read) {
  const cause = boundaryCause(read) ?? profileCause(read) ?? excessCause(read);
  if (cause !== null) return unavailable(cause);
  return accessOutcome(read) ?? interpretContent(read);
}

const DROPPED_KINDS = ["empty", "relative", "under_root"];

// 起動前に PATH から落とした欄の数と種類。形が不正なら null（落とした有無を確かめられない）。
function droppedNotes(dropped) {
  const valid = typeof dropped === "object" && dropped !== null && isCount(dropped.count) && Array.isArray(dropped.kinds) && dropped.kinds.every((kind) => DROPPED_KINDS.includes(kind));
  return valid ? { droppedCount: dropped.count, droppedKinds: [...new Set(dropped.kinds)].sort() } : null;
}

// 起動の結果。実行ファイルが無い = tool_missing（PATH の欠落が無いと分かる時だけ）。落とした欄がある・確かめられない = tool_cannot_start（暫定。R-11 の確認まで）。
function launchOutcome(read) {
  if (read.launch === "ok") return null;
  const notes = read.launch === "not_found" ? droppedNotes(read.dropped) : null;
  if (notes === null) return unavailable("tool_cannot_start");
  return notes.droppedCount === 0 ? unavailable("tool_missing") : unavailable("tool_cannot_start", notes);
}

// 道具の確かめ（BR2.2）。応答しない = timed_out、出力の上限 = budget_exceeded。終了コードが 0 でなければ正常として読まない。
export function interpretProbe(read) {
  const profile = profileCause(read);
  if (profile !== null) return unavailable(profile);
  const failed = launchOutcome(read);
  if (failed !== null) return failed;
  if (read.stop !== null && read.stop !== undefined) return unavailable(read.stop.reason === "output_limit" ? "budget_exceeded" : "timed_out");
  if (read.exitCode !== 0) return unavailable("tool_cannot_start");
  const excess = excessCause(read);
  return excess === null ? { status: "output", output: read.output } : unavailable(excess);
}
