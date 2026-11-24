// A reader for the small block-YAML subset a GitHub Actions workflow uses (CI-COST-REDUCE). It is NOT a general YAML parser: anything outside
// the subset THROWS a YamlError, so a caller that cannot read a file never reads it as "fine" (fail closed). It runs nothing and has no dependency.
//   read:    block mappings and lists (a list may sit at its key's indent), plain / 'single' / "double" scalars (every scalar is a string),
//            | and > block scalars (clip and strip chomping, no indentation indicator), one-line flow [..] and {..}, # comments (line start or after a space), one leading ---.
//   refused: tabs in the indent, anchors / aliases / tags / directives, the merge key, duplicate keys, a quoted or flow value over several lines,
//            a plain scalar that holds ": ", a second document, a line the reader cannot place by its indent.
export class YamlError extends Error {}
function fail(n, why) { throw new YamlError(`line ${n}: ${why}`); }

const BAD_START = /^[&*!%@`?]/; // an anchor, an alias, a tag, a directive, a reserved indicator, a complex key
const isSeqItem = (text) => text === "-" || text.startsWith("- ");
const indentOf = (raw) => raw.length - raw.trimStart().length;

// The next row that holds content (a blank or comment-only row is skipped); null at the end.
function peek(st) {
  for (; st.i < st.rows.length; st.i++) {
    const { n, raw } = st.rows[st.i];
    const text = raw.trim();
    if (text !== "" && !text.startsWith("#")) return { n, indent: indentOf(raw), text };
  }
  return null;
}

const ESCAPES = { "\\": "\\", "\"": "\"", "/": "/", n: "\n", t: "\t" };
function readDouble(text, n) {
  let value = "";
  for (let i = 1; i < text.length; i++) {
    if (text[i] === "\"") return { value, end: i + 1 };
    if (text[i] !== "\\") { value += text[i]; continue; }
    i += 1;
    if (!(text[i] in ESCAPES)) fail(n, `unsupported escape in a double-quoted scalar`);
    value += ESCAPES[text[i]];
  }
  return fail(n, "unterminated quoted scalar (a quoted scalar over several lines is outside the subset)");
}
function readSingle(text, n) {
  let value = "";
  for (let i = 1; i < text.length; i++) {
    if (text[i] !== "'") { value += text[i]; continue; }
    if (text[i + 1] !== "'") return { value, end: i + 1 };
    value += "'";
    i += 1;
  }
  return fail(n, "unterminated quoted scalar (a quoted scalar over several lines is outside the subset)");
}
const readQuoted = (text, n) => (text[0] === "\"" ? readDouble(text, n) : readSingle(text, n));
// After a closed quote or flow value only a comment (after a space) may follow.
function afterValue(rest, n) {
  if (rest.trim() !== "" && !/^\s+#/.test(rest)) fail(n, "text after a quoted or flow value");
}

// "key: rest" with a quoted key, or null when the quoted text is a plain item (no colon after it).
function quotedKey(text, n) {
  const q = readQuoted(text, n);
  const m = /^\s*:(?:\s+(.*))?$/.exec(text.slice(q.end));
  return m ? { key: q.value, rest: (m[1] ?? "").trim() } : null;
}
const badKey = (key) => key === "" || BAD_START.test(key) || /^[|>#,\]}]/.test(key);

// "key: rest" -> { key, rest }; null when the text is not a key line (a plain item). A key is quoted or plain; a flow start is never a key.
function splitKey(text, n) {
  if (text[0] === "\"" || text[0] === "'") return quotedKey(text, n);
  if (text[0] === "[" || text[0] === "{") return null;
  const m = /:(?:\s|$)/.exec(text);
  if (!m) return null;
  const key = text.slice(0, m.index).trimEnd();
  if (badKey(key)) fail(n, `a key the reader does not support: ${JSON.stringify(key)}`);
  return { key, rest: text.slice(m.index + 1).trim() };
}

class Flow { // one-line flow collections: [a, b] and {k: v}
  constructor(text, n) { this.t = text; this.i = 0; this.n = n; }
  skip() { while (this.t[this.i] === " ") this.i++; }
  value() {
    this.skip();
    const ch = this.t[this.i];
    if (ch === "[") return this.seq();
    if (ch === "{") return this.map();
    if (ch === "\"" || ch === "'") { const q = readQuoted(this.t.slice(this.i), this.n); this.i += q.end; return q.value; }
    return this.plain();
  }
  plain() {
    const start = this.i;
    while (this.i < this.t.length && !",]}[{".includes(this.t[this.i]) && !(this.t[this.i] === ":" && [undefined, " "].includes(this.t[this.i + 1]))) this.i++;
    const value = this.t.slice(start, this.i).trim();
    if (value === "" || BAD_START.test(value)) fail(this.n, "an empty or unsupported flow item");
    if (value.includes(":")) fail(this.n, "a colon inside a plain flow item (quote it)");
    return value;
  }
  sep(close) {
    const ch = this.t[this.i];
    if (ch === ",") this.i++;
    else if (ch !== close) fail(this.n, "an unterminated or malformed flow collection");
  }
  seq() {
    this.i++;
    const out = [];
    for (;;) {
      this.skip();
      if (this.t[this.i] === "]") { this.i++; return out; }
      out.push(this.value());
      this.skip();
      this.sep("]");
    }
  }
  map() {
    this.i++;
    const out = Object.create(null);
    for (;;) {
      this.skip();
      if (this.t[this.i] === "}") { this.i++; return out; }
      const key = this.value();
      this.skip();
      if (typeof key !== "string" || this.t[this.i] !== ":") fail(this.n, "a flow mapping needs plain `key: value` pairs");
      this.i++;
      if (key in out) fail(this.n, `duplicate key ${JSON.stringify(key)}`);
      out[key] = this.value();
      this.skip();
      this.sep("}");
    }
  }
}

function flowValue(text, n) {
  const flow = new Flow(text, n);
  const value = flow.value();
  afterValue(text.slice(flow.i), n);
  return value;
}

// The rows of a block scalar: blank rows and rows indented deeper than the key; the first content row sets the indent.
function collectBlock(st, parentIndent, n) {
  const lines = [];
  let contentIndent = -1;
  while (st.i < st.rows.length) {
    const { raw } = st.rows[st.i];
    const indent = indentOf(raw);
    if (raw.trim() === "") lines.push("");
    else if (contentIndent < 0 && indent > parentIndent) { contentIndent = indent; lines.push(raw.slice(indent)); }
    else if (contentIndent < 0 || indent <= parentIndent) break;
    else if (indent < contentIndent) return fail(n, "a block scalar line indented less than its first line");
    else lines.push(raw.slice(contentIndent));
    st.i++;
  }
  while (lines.at(-1) === "") lines.pop();
  return lines;
}
// A folded block: a line break between two text lines is a space, n blank lines are n breaks. A more-indented line keeps its breaks in YAML, which the
// subset does not read.
function fold(lines, n) {
  let out = "";
  let blanks = 0;
  for (const line of lines) {
    if (line === "") { blanks++; continue; }
    if (/^\s/.test(line)) fail(n, "a folded block scalar with a more-indented line is outside the subset");
    out += out === "" || blanks > 0 ? "\n".repeat(blanks) : " ";
    blanks = 0;
    out += line;
  }
  return out;
}
// Chomping: clip (the default) keeps ONE final line break when the block has text, strip (-) keeps none; keep (+) is outside the subset.
function blockScalar(st, header, parentIndent, n) {
  const m = /^([|>])([+-]?)(?:\s+#.*)?$/.exec(header);
  if (!m || m[2] === "+") fail(n, "this block scalar header is not supported (no indentation indicator, no keep chomping)");
  const lines = collectBlock(st, parentIndent, n);
  const text = m[1] === "|" ? lines.join("\n") : fold(lines, n);
  return m[2] === "-" || lines.length === 0 ? text : `${text}\n`;
}

function plainScalar(text, n) {
  if (BAD_START.test(text) || isSeqItem(text)) fail(n, "an anchor, alias, tag or list marker where a value was expected");
  const value = text.replace(/\s+#.*$/, "").trim();
  if (/:(?:\s|$)/.test(value)) fail(n, "a plain scalar that holds \": \" (quote it)");
  return value;
}
function scalarValue(st, text, parentIndent, n) {
  if (text[0] === "|" || text[0] === ">") return blockScalar(st, text, parentIndent, n);
  if (text[0] === "\"" || text[0] === "'") {
    const q = readQuoted(text, n);
    afterValue(text.slice(q.end), n);
    return q.value;
  }
  if (text[0] === "[" || text[0] === "{") return flowValue(text, n);
  return plainScalar(text, n);
}

// What follows a key or a bare "-" with no value on its line: a deeper block, a list at the key's own indent (keys only), or null.
function childBlock(st, indent, listMayShare) {
  const next = peek(st);
  if (!next) return null;
  if (next.indent > indent || (listMayShare && next.indent === indent && isSeqItem(next.text))) return parseNode(st);
  return null;
}

function seqItem(st, row, indent) {
  const rest = row.text.slice(1).trimStart();
  if (rest === "" || rest.startsWith("#")) { st.i++; return childBlock(st, indent, false); }
  if (isSeqItem(rest) || splitKey(rest, row.n)) { // "- key: v" and "- - x": the rest of the line opens a block of its own, indented past the dash
    st.rows[st.i] = { n: row.n, raw: " ".repeat(indent + row.text.length - rest.length) + rest };
    return parseNode(st);
  }
  st.i++;
  return scalarValue(st, rest, indent, row.n);
}
function parseSeq(st, indent) {
  const out = [];
  for (;;) {
    const row = peek(st);
    if (!row || row.indent < indent || !isSeqItem(row.text)) return out;
    if (row.indent > indent) fail(row.n, "unexpected indentation");
    out.push(seqItem(st, row, indent));
  }
}

function entryKey(row, out) {
  const kv = isSeqItem(row.text) ? null : splitKey(row.text, row.n);
  if (!kv) fail(row.n, "expected a `key: value` line");
  if (kv.key === "<<") fail(row.n, "the merge key is outside the subset");
  if (kv.key in out) fail(row.n, `duplicate key ${JSON.stringify(kv.key)}`);
  return kv;
}
function parseMap(st, indent) {
  const out = Object.create(null);
  for (;;) {
    const row = peek(st);
    if (!row || row.indent < indent) return out;
    if (row.indent > indent) fail(row.n, "unexpected indentation");
    const kv = entryKey(row, out);
    st.i++;
    out[kv.key] = kv.rest === "" || kv.rest.startsWith("#") ? childBlock(st, indent, true) : scalarValue(st, kv.rest, indent, row.n);
  }
}

function parseNode(st) {
  const row = peek(st);
  if (!row) return null;
  return isSeqItem(row.text) ? parseSeq(st, row.indent) : parseMap(st, row.indent);
}

export function parseYaml(text) {
  if (typeof text !== "string") throw new YamlError("the file is not text");
  const rows = text.split("\n").map((line, k) => ({ n: k + 1, raw: line.replace(/\r$/, "") }));
  const tab = rows.find(({ raw }) => /^ *\t/.test(raw));
  if (tab) fail(tab.n, "a tab in the indentation");
  const st = { rows, i: 0 };
  if (peek(st)?.text === "---") st.i++;
  const doc = parseNode(st);
  const extra = peek(st);
  if (extra) fail(extra.n, "unexpected content after the document");
  if (doc === null || typeof doc !== "object") fail(1, "the document is not a mapping or a list");
  return doc;
}
