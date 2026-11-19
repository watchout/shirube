// 呼び出し workflow の text を、構造を読むために 1 行ずつに分け、1 行の形を分類する部品（LC2 の内側の純粋な関数）。
// 読むのは固定した小さな形だけ（block 形の key: value と - の列）。決められない形（block scalar・flow の複数行・anchor・alias・tag・
// 引用符の閉じない文字列・複雑な key）は null を返し、呼び出し側が malformed（観測できず側）にする。YAML の外部 library は使わない。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。

const MARKER_RE = /^(?:---|\.\.\.)(?:\s|$)/u;
const SEPARATOR_RE = /:(?:\s|$)/u;
const BAD_START = new Set([..."&*!|>{}[]%@`?"]);
const FLOW_OPEN = new Set(["[", "{"]);
const FLOW_CLOSE = new Set(["]", "}"]);
const CLOSED = Object.freeze({ kind: "closed", value: "" });
const EMPTY = Object.freeze({ kind: "empty", value: "" });

const isControlCode = (code) => code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029 || code === 0xfeff;

// 制御文字（tab・改行・\r を含む）・DEL・C1・行区切り・BOM を 1 つでも含むか。
export const hasControlChar = (text) => [...text].some((char) => isControlCode(char.codePointAt(0)));

// 行の末尾が、空か、空白で始まる comment だけか。
const endsClean = (rest) => rest.trim() === "" || /^\s+#/u.test(rest);

// 先頭が引用符の文字列の終わり（次の位置）。閉じなければ -1。二重引用符は \ で 1 文字飛ばし、一重引用符は '' が引用符 1 つ。
function quotedEnd(text) {
  const quote = text[0];
  for (let i = 1; i < text.length; i += 1) {
    if (quote === '"' && text[i] === "\\") i += 1;
    else if (text[i] === quote) {
      if (quote === "'" && text[i + 1] === "'") i += 1;
      else return i + 1;
    }
  }
  return -1;
}

// 先頭が [ か { の flow が同じ行で閉じる位置（次の位置）。閉じなければ -1。
function flowEnd(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' || char === "'") {
      const end = quotedEnd(text.slice(i));
      if (end < 0) return -1;
      i += end - 1;
    } else if (FLOW_OPEN.has(char)) depth += 1;
    else if (FLOW_CLOSE.has(char)) {
      depth -= 1;
      if (depth <= 0) return depth === 0 ? i + 1 : -1;
    }
  }
  return -1;
}

const closedUntil = (text, end) => (end >= 0 && endsClean(text.slice(end)) ? CLOSED : null);

// key の後ろ（または列の項目の中身）の値の形: empty（子が続きうる）| closed（同じ行で閉じた引用符・flow）| plain（行末の comment を除いた文字）。決められなければ null。
function classifyValue(raw) {
  const text = raw.trimStart();
  if (text === "" || text.startsWith("#")) return EMPTY;
  const first = text[0];
  if (first === '"' || first === "'") return closedUntil(text, quotedEnd(text));
  if (FLOW_OPEN.has(first)) return closedUntil(text, flowEnd(text));
  if (BAD_START.has(first)) return null;
  return { kind: "plain", value: text.replace(/\s+#.*$/u, "").trimEnd() };
}

// 先頭の "- " を全部外す。外した幅も返す（列の項目の中の key の列の位置）。
function stripItems(body) {
  let rest = body;
  let offset = 0;
  while (rest === "-" || rest.startsWith("- ")) {
    const next = rest.slice(1).trimStart();
    offset += rest.length - next.length;
    rest = next;
  }
  return { rest, offset };
}

const withKey = (key, value) => (value === null ? null : { key, ...value });

// "- " を外した後の中身の分類。key が無ければ文字だけの行・項目。
function classifyRest(rest) {
  if (rest === "") return { key: null, ...EMPTY };
  if (rest[0] === '"' || rest[0] === "'") return withKey(null, closedUntil(rest, quotedEnd(rest)));
  const separator = SEPARATOR_RE.exec(rest);
  if (separator === null) return withKey(null, classifyValue(rest));
  const key = rest.slice(0, separator.index).trimEnd();
  const keyOk = key !== "" && !BAD_START.has(key[0]) && !/\s#/u.test(key);
  return keyOk ? withKey(key, classifyValue(rest.slice(separator.index + 1))) : null;
}

// 1 行（字下げを除いた中身）の分類: { item, offset, key, kind, value } | null（決められない形）。
export function classifyBody(body) {
  const { rest, offset } = stripItems(body);
  const shape = classifyRest(rest);
  return shape === null ? null : { item: offset > 0, offset, ...shape };
}

// 1 行を { indent, body } か、飛ばす行（空行・comment の行）か、null（tab の字下げ・制御文字）にする。
function splitLine(raw) {
  const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
  if (hasControlChar(line.replaceAll("\t", " "))) return null;
  const body = line.replace(/^ +/u, "");
  const indent = line.length - body.length;
  if (body.startsWith("\t")) return null;
  return body.trim() === "" || body.startsWith("#") ? "skip" : { indent, body };
}

// 先頭の --- 1 つだけを許し、2 つ目以降の document・directive は読まない。
function dropFirstMarker(lines) {
  const [first, ...rest] = lines;
  return first !== undefined && first.indent === 0 && first.body.trimEnd() === "---" ? rest : lines;
}

const isForbiddenTopLine = (line) => line.indent === 0 && (MARKER_RE.test(line.body) || line.body.startsWith("%"));

// text を内容のある行（字下げと中身）の列にする。決められない（制御文字・tab の字下げ・文字でない・先頭の --- 以外の marker・directive）なら null。
export function readContentLines(text) {
  if (typeof text !== "string") return null;
  const split = text.split("\n").map(splitLine);
  if (split.includes(null)) return null;
  const lines = dropFirstMarker(split.filter((line) => line !== "skip"));
  return lines.some(isForbiddenTopLine) ? null : lines;
}
