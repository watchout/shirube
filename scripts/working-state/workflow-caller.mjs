// 呼び出し workflow（sds-gate）の text から、jobs の直下の job の直下の `uses` が指す commit だけを取り出す（LC2 の内側の純粋な関数、F01 の是正）。
// 構造は字下げと key の位置で決め、env・with・steps の中・文字列の中・comment・別の document の行は呼び出しとして読まない。
// 決められない形は null（呼び出し側が malformed にする）。名前が読んだ呼び出しの数より多く現れるときも null（読まない場所に名前がある）。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。
import { classifyBody, readContentLines } from "./workflow-lines.mjs";

const CALLER_NAME = "watchout/shirube/.github/workflows/sds-gate.yml";
const CALLER_USES_RE = new RegExp(`^${CALLER_NAME.replace(/[./]/gu, "\\$&")}@([^\\s'"#]+)$`, "u");

// 親の key の下に置く 1 行の役割（jobs → job → job の key）を確かめ、役割ごとの記録を足す。置けない形なら false。
function placeTop(state, line, parsed) {
  if (line.indent !== 0 || parsed.item || parsed.key === null) return false;
  if (parsed.key !== "jobs") return true;
  const fresh = !state.seenJobs && parsed.kind === "empty";
  state.seenJobs = true;
  return fresh;
}

function placeJobId(state, line, parsed) {
  if (parsed.item || parsed.key === null || parsed.kind !== "empty" || state.jobs.has(parsed.key)) return false;
  state.jobsIndent ??= line.indent;
  if (state.jobsIndent !== line.indent) return false;
  state.jobs.set(parsed.key, { keyIndent: null, keys: new Set() });
  return true;
}

// job の key 1 つの置き場の確かめ。同じ key の重複・字下げの不一致・列の項目・steps と同居する uses は置けない。
function claimJobKey(job, line, parsed) {
  if (parsed.item || parsed.key === null || job.keys.has(parsed.key)) return false;
  job.keyIndent ??= line.indent;
  if (job.keyIndent !== line.indent) return false;
  job.keys.add(parsed.key);
  return !(job.keys.has("uses") && job.keys.has("steps"));
}

// job の key 1 つ。uses は 1 行の plain な文字だけ。caller の名前なら commit を記録し、別の action は数えない。
function placeJobKey(state, job, line, parsed) {
  if (!claimJobKey(job, line, parsed)) return false;
  if (parsed.key !== "uses") return true;
  if (parsed.kind !== "plain") return false;
  const match = CALLER_USES_RE.exec(parsed.value);
  if (match !== null) state.refs.push(match[1]);
  return true;
}

function place(state, line, parsed) {
  const { stack } = state;
  if (stack.length === 0) return placeTop(state, line, parsed);
  if (stack[0].key !== "jobs") return true;
  if (stack.length === 1) return placeJobId(state, line, parsed);
  return stack.length === 2 ? placeJobKey(state, stack[1].job, line, parsed) : true;
}

// 親が plain な値・閉じた値の時の、深い行の扱い。plain な値の続き行は読まない（uses の続き行・閉じた値の下の深い行は決められない）。
const isScalarChild = (top, line) => top !== undefined && line.indent > top.indent && top.kind !== "empty";
const allowsContinuation = (top) => top.kind === "plain" && top.key !== "uses";

// 1 行を進める。
function step(state, line) {
  const { stack } = state;
  const top = stack.at(-1);
  if (isScalarChild(top, line)) return allowsContinuation(top);
  while (stack.length > 0 && stack.at(-1).indent >= line.indent) stack.pop();
  const parsed = classifyBody(line.body);
  if (parsed === null || !place(state, line, parsed)) return false;
  const job = stack.length === 1 ? state.jobs.get(parsed.key) : undefined;
  stack.push({ indent: parsed.key === null ? line.indent : line.indent + parsed.offset, key: parsed.key, kind: parsed.kind, job });
  return true;
}

const countMentions = (lines) => lines.reduce((count, line) => count + line.body.split(CALLER_NAME).length - 1, 0);

// 読んだ呼び出しの commit の列（同じ commit の重複を含む）。決められなければ null。
export function readCallerRefs(text) {
  const lines = readContentLines(text);
  if (lines === null) return null;
  const state = { stack: [], jobs: new Map(), jobsIndent: null, seenJobs: false, refs: [] };
  if (!lines.every((line) => step(state, line))) return null;
  return countMentions(lines) === state.refs.length ? state.refs : null;
}
