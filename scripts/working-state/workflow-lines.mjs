// 呼び出し workflow の text を、構造を読むために 1 行ずつに分け、1 行の形を分類する部品（LC2 の内側の純粋な関数）。
// 読むのは固定した小さな形だけ（block 形の key: value と - の列、同じ行で閉じる引用符の文字列、同じ行で閉じる [ ] の列と空の {}）。
// 決められない形（block scalar・flow の複数行・括弧の種類の取り違え・{ } の中身・anchor・alias・tag・引用符の閉じない文字列・
// 複雑な key・値の中の `: `・値の先頭の `- `）は null を返し、呼び出し側が malformed（観測できず側）にする。YAML の外部 library は使わない。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。

const MARKER_RE = /^(?:---|\.\.\.)(?:\s|$)/u;
const SEPARATOR_RE = /:(?:\s|$)/u;
const BAD_START = new Set([..."&*!|>{}[]%@`?,"]);
const FLOW_MAX_DEPTH = 8; // [ ] の入れ子の深さの上限（実装で決めた数値。超えれば決められない形）。
// flow の列の plain な要素: 先頭は記号でなく、中に [ ] { } , を含まない。
const FLOW_PLAIN_RE = /^[^\s[\]{},:#&*!|>%@`'"?-][^[\]{},]*/u;
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

const skipSpaces = (text, from) => {
  let i = from;
  while (text[i] === " ") i += 1;
  return i;
};

// flow の列の要素 1 つの終わり（次の位置）。入れ子の列・引用符の文字・plain な文字だけ。決められなければ -1。
function flowItemEnd(text, start, depth) {
  const char = text[start];
  if (char === "[") return flowSeqEnd(text, start, depth + 1);
  if (char === '"' || char === "'") {
    const end = quotedEnd(text.slice(start));
    return end < 0 ? -1 : start + end;
  }
  const match = FLOW_PLAIN_RE.exec(text.slice(start));
  if (match === null) return -1;
  const word = match[0].trimEnd();
  return SEPARATOR_RE.test(word) || /\s#/u.test(word) ? -1 : start + word.length;
}

// text[start] が [ の列の終わり（次の位置）。要素は , で区切り、空の要素・閉じない・括弧の種類の取り違えは -1。
function flowSeqEnd(text, start, depth) {
  if (depth > FLOW_MAX_DEPTH) return -1;
  let i = skipSpaces(text, start + 1);
  if (text[i] === "]") return i + 1;
  for (;;) {
    const end = flowItemEnd(text, i, depth);
    if (end < 0) return -1;
    i = skipSpaces(text, end);
    if (text[i] === "]") return i + 1;
    if (text[i] !== ",") return -1;
    i = skipSpaces(text, i + 1);
  }
}

// 先頭が flow（[ ] の列か空の {}）で、同じ行で正しく閉じる位置（次の位置）。{ } の中身は読まない。閉じなければ -1。
const flowEnd = (text) => (text.startsWith("{}") ? 2 : text[0] === "[" ? flowSeqEnd(text, 0, 1) : -1);

const closedUntil = (text, end) => (end >= 0 && endsClean(text.slice(end)) ? CLOSED : null);

// 引用符・flow で始まらない値の形: plain（行末の comment を除いた文字）| 決められない形（記号で始まる・先頭の `- `・中に `: `）は null。
function classifyPlain(text) {
  if (BAD_START.has(text[0]) || text === "-" || text.startsWith("- ")) return null;
  const value = text.replace(/\s+#.*$/u, "").trimEnd();
  return SEPARATOR_RE.test(value) ? null : { kind: "plain", value };
}

// key の後ろ（または列の項目の中身）の値の形: empty（子が続きうる）| closed（同じ行で閉じた引用符・flow）| plain。決められなければ null。
function classifyValue(raw) {
  const text = raw.trimStart();
  if (text === "" || text.startsWith("#")) return EMPTY;
  const first = text[0];
  if (first === '"' || first === "'") return closedUntil(text, quotedEnd(text));
  if (first === "[" || first === "{") return closedUntil(text, flowEnd(text));
  return classifyPlain(text);
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

// 1 行を { indent, body } か、飛ばす行（"blank" = 空行・"comment" = comment の行）か、null（tab の字下げ・制御文字）にする。
function splitLine(raw) {
  const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
  if (hasControlChar(line.replaceAll("\t", " "))) return null;
  const body = line.replace(/^ +/u, "");
  const indent = line.length - body.length;
  if (body.startsWith("\t")) return null;
  if (body.trim() === "") return "blank";
  return body.startsWith("#") ? "comment" : { indent, body };
}

// 内容のある行に、直前に comment の行があったか（afterComment）を付ける。comment の行は plain な値の続きを終わらせる。
function annotate(split) {
  const lines = [];
  let afterComment = false;
  for (const entry of split) {
    if (entry === "comment") afterComment = true;
    else if (entry !== "blank") {
      lines.push({ ...entry, afterComment });
      afterComment = false;
    }
  }
  return lines;
}

// plain な値の続き行として読める中身か（`: `・行末の comment・列の項目の `- ` を含まない）。決められなければ false。
export const isPlainContinuation = (body) => !SEPARATOR_RE.test(body) && !/\s#/u.test(body) && body !== "-" && !body.startsWith("- ");

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
  const lines = dropFirstMarker(annotate(split));
  return lines.some(isForbiddenTopLine) ? null : lines;
}
