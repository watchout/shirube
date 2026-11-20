// 呼び出し workflow（sds-gate）の text から、jobs の直下の job の直下の `uses` が指す commit だけを取り出す（LC2 の内側の純粋な関数、F01 の是正）。
// 木は workflow-tree.mjs が字下げで作る（どの深さの重複 key・続き行・括弧の取り違えも決められない形）。ここでは jobs → job → uses だけを辿り、
// env・with・steps の中・文字列の中・comment・別の document の行は呼び出しとして読まない。
// 決められない形は null（呼び出し側が malformed にする）。名前が読んだ呼び出しの数より多く現れるときも null（読まない場所に名前がある）。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。
import { readContentLines } from "./workflow-lines.mjs";
import { readWorkflowTree } from "./workflow-tree.mjs";

const CALLER_NAME = "watchout/shirube/.github/workflows/sds-gate.yml";
const CALLER_USES_RE = new RegExp(`^${CALLER_NAME.replace(/[./]/gu, "\\$&")}@([^\\s'"#]+)$`, "u");

// job 1 つの uses の commit（無ければ空の列）。job は map か空。uses は 1 行の plain な文字だけで、steps と同居しない。決められなければ null。
function jobRefs(job) {
  if (job.type === "null") return [];
  if (job.type !== "map") return null;
  const uses = job.entries.get("uses");
  if (uses === undefined) return [];
  if (uses.type !== "scalar" || uses.kind !== "plain" || job.entries.has("steps")) return null;
  const match = CALLER_USES_RE.exec(uses.value);
  return match === null ? [] : [match[1]];
}

// jobs の直下の job ぜんぶの commit の列。jobs が無い・空なら空、map 以外は null。
function allRefs(root) {
  const jobs = root.entries.get("jobs");
  if (jobs === undefined || jobs.type === "null") return [];
  if (jobs.type !== "map") return null;
  const refs = [];
  for (const job of jobs.entries.values()) {
    const found = jobRefs(job);
    if (found === null) return null;
    refs.push(...found);
  }
  return refs;
}

const countMentions = (lines) => lines.reduce((count, line) => count + line.body.split(CALLER_NAME).length - 1, 0);

// 読んだ呼び出しの commit の列（同じ commit の重複を含む）。決められなければ null。
export function readCallerRefs(text) {
  const root = readWorkflowTree(text);
  const refs = root === null ? null : allRefs(root);
  return refs !== null && countMentions(readContentLines(text)) === refs.length ? refs : null;
}
