// 呼び出し workflow の text を、字下げで決まる木（map・列・文字・空）にする部品（LC2 の内側の純粋な関数、#115 の 1 回目の指摘の是正）。
// 読むのは固定した小さな形だけで、どの深さの map でも key の重複を拒み、plain / 閉じた値の下の深い行（続き行）・nested の `- - `・
// 文字だけの block・字下げの揃わない行・merge key（<<）・深すぎる入れ子を決められない形として拒む。決められなければ null（失敗側）。
// 1 行の形の分類は workflow-lines.mjs。時刻・乱数・環境変数・file・子 process・network を使わない（S4）。
import { classifyBody, isPlainContinuation, readContentLines } from "./workflow-lines.mjs";

const MAX_DEPTH = 64; // block の入れ子の深さの上限（実装で決めた数値。再帰が尽きる前に決められない形として止める）。
const NULL_NODE = Object.freeze({ type: "null" });

// 決められない形は例外で外へ出し、readWorkflowTree が null（失敗側）にする。
const reject = () => {
  throw new Error("undecidable");
};

const isItem = (body) => body === "-" || body.startsWith("- ");
const scalarNode = (parsed) => ({ type: "scalar", kind: parsed.kind, value: parsed.value });
const peek = (cur) => cur.lines[cur.pos];

// 子の block を読む（次の行が親より深ければその字下げの map か列）。親と同じ字下げの列の項目は列、それ以外は空。
function parseChild(cur, indent) {
  const next = peek(cur);
  if (next === undefined || next.indent < indent) return NULL_NODE;
  if (next.indent === indent) return isItem(next.body) ? parseSequence(cur, indent) : NULL_NODE;
  return parseBlock(cur, next.indent);
}

// plain な値の続き行（親より深い行）を読み進める。続き行は `: `・行末の comment・列の項目を含まず、直前に comment の行が無い物だけ
// （comment の行は値を終わらせ、その後の深い行は YAML として壊れている）。uses の値と閉じた値は続き行を持てない（決められない）。
function skipContinuation(cur, indent, parsed) {
  const open = parsed.kind === "plain" && parsed.key !== "uses";
  while (peek(cur) !== undefined && peek(cur).indent > indent) {
    if (!open || peek(cur).afterComment || !isPlainContinuation(peek(cur).body)) reject();
    cur.pos += 1;
  }
}

// key の値。空なら子の block か空、それ以外は 1 つの文字（plain は続き行を持てる）。
function parseValue(cur, indent, parsed) {
  if (parsed.kind === "empty") return parseChild(cur, indent);
  skipContinuation(cur, indent, parsed);
  return scalarNode(parsed);
}

function parseMapping(cur, indent) {
  const entries = new Map();
  while (peek(cur) !== undefined && peek(cur).indent >= indent) {
    const line = peek(cur);
    const parsed = line.indent > indent || isItem(line.body) ? null : classifyBody(line.body);
    if (parsed === null || parsed.key === null || parsed.key === "<<" || entries.has(parsed.key)) reject();
    cur.pos += 1;
    entries.set(parsed.key, parseValue(cur, indent, parsed));
  }
  return { type: "map", entries };
}

// 列の項目 1 つ。`- ` の後ろが key なら、その字下げの位置の map、文字だけなら 1 行の文字、空なら子の block。nested の `- - ` は、中身が列の項目の行・`-` だけの行として決められず拒まれる。
function parseItem(cur, indent) {
  const rest = peek(cur).body.slice(1);
  const body = rest.trimStart();
  cur.pos += 1;
  if (body === "") return peek(cur) !== undefined && peek(cur).indent > indent ? parseBlock(cur, peek(cur).indent) : NULL_NODE;
  const inner = indent + 1 + rest.length - body.length;
  const parsed = classifyBody(body);
  if (parsed === null) reject();
  if (parsed.key !== null) {
    cur.lines[--cur.pos] = { indent: inner, body };
    return parseMapping(cur, inner);
  }
  return parseValue(cur, indent, parsed);
}

function parseSequence(cur, indent) {
  const items = [];
  while (peek(cur) !== undefined && peek(cur).indent >= indent) {
    if (peek(cur).indent > indent) reject();
    if (!isItem(peek(cur).body)) break;
    items.push(parseItem(cur, indent));
  }
  return { type: "seq", items };
}

// 字下げ indent の block（map か列）。文字だけの block は読まない。
function parseBlock(cur, indent) {
  cur.depth += 1;
  if (cur.depth > MAX_DEPTH) reject();
  const node = isItem(peek(cur).body) ? parseSequence(cur, indent) : parseMapping(cur, indent);
  cur.depth -= 1;
  return node;
}

// text の木（root は字下げ 0 の map か空）。決められない形なら null。
export function readWorkflowTree(text) {
  const lines = readContentLines(text);
  if (lines === null) return null;
  if (lines.length === 0) return { type: "map", entries: new Map() };
  const cur = { lines: [...lines], pos: 0, depth: 0 };
  try {
    if (cur.lines[0].indent !== 0 || isItem(cur.lines[0].body)) reject();
    return parseBlock(cur, 0); // root の map は字下げ 0 以上の行を最後まで読むので、読み残しは出ない（出れば reject が先に働く）。
  } catch {
    return null; // 決められない形だけでなく、想定外の失敗も観測できず側（成功に読み替えない）。
  }
}
