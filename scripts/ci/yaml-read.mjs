// CI-COST-REDUCE: the one place a workflow's YAML is read (behind pattern-check.mjs). It reads with the public `yaml` library (pinned below, locked in
// package-lock.json) under strict settings, and STOPS (throws YamlError) on anything the settings do not allow, so a file it cannot read is never read as "fine":
//   YAML 1.2 core schema, a duplicate key is an error, no merge key, no anchor or alias or tag or directive, exactly one document, every error AND every
//   warning of the library stops, a character outside the readable list stops, and a library that cannot be loaded (or is not the pinned version) stops.
// The structure it returns holds maps, lists, strings and null only (a number or a boolean becomes the text it was written as), so the rules read one kind of value.
export class YamlError extends Error {
  constructor(message) {
    super(message);
    this.name = "YamlError";
  }
}

export const PINNED_VERSION = "2.9.1"; // the one place the version is written in code; package.json and package-lock.json must say the same (a test checks)
const OPTIONS = { version: "1.2", schema: "core", uniqueKeys: true, merge: false, strict: true, prettyErrors: false, keepSourceTokens: true };
const NEEDED = ["parseAllDocuments", "isScalar", "isMap", "isSeq", "isAlias"];
const DEFAULT_TAGS = JSON.stringify({ "!!": "tag:yaml.org,2002:" });
const FORBIDDEN_KEYS = new Set(["<<", "__proto__"]);
const MAX_DEPTH = 64;
// control characters, spaces that are not a plain space, a byte order mark, and lone surrogates (a tab, and a line feed, are text; CRLF is turned into LF first)
const OUTSIDE_LIST = /[\u0000-\u0008\u000b-\u001f\u007f-\u00a0\u1680\u180e\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff\ufffe\uffff\ud800-\udfff]/u;

const loadDefault = async () => ({
  lib: await import("yaml"),
  version: (await import("yaml/package.json", { with: { type: "json" } })).default.version,
});

// {lib} when the library loaded, is the pinned version and has what is needed; else {error}. `load` is a parameter so a test can make it fail.
export async function openLibrary(load = loadDefault, pinned = PINNED_VERSION) {
  try {
    const { lib, version } = await load();
    if (version !== pinned) return { error: `the YAML library is version ${version}, not the pinned ${pinned}` };
    const missing = NEEDED.filter((name) => typeof lib[name] !== "function");
    return missing.length === 0 ? { lib } : { error: `the YAML library has no ${missing.join(", ")}` };
  } catch (error) {
    return { error: `the YAML library could not be loaded (${error.message})` };
  }
}
const OPENED = await openLibrary();

// null stays null, a string stays itself, a number or a boolean becomes the text it was written as (1.0 stays "1.0", True stays "True")
function scalarText(node) {
  if (node.value === null) return null;
  return typeof node.value === "string" ? node.value : node.source;
}

// Where YAML 1.2 and the YAML 1.1 parsers (libyaml, so Ruby's Psych, and workflow linters built on it) disagree, the file is stopped, not read: a plain scalar that
// starts with a colon or a question mark ([:x], {k: ?x}), and a plain scalar inside a flow list or mapping that has a colon or a question mark anywhere in it
// ([x:y], {k:v}). Only the scalar's own source text is looked at.
function plainRisk(ctx, node, inFlow) {
  if (node.type !== "PLAIN") return false;
  const source = ctx.text.slice(node.range[0], node.range[1]);
  return ":?".includes(source[0]) || (inFlow && /[:?]/.test(source));
}

const textKey = (ctx, key, inFlow) => (ctx.lib.isScalar(key) && !key.anchor && !key.tag && !plainRisk(ctx, key, inFlow) ? key.value : undefined);

// the key's own text is followed by a colon that is stuck to the next character ({k:,v}, [x:, y]): YAML 1.1 parsers refuse it
const stuckColon = (ctx, key) => /^[ \t]*:(?![ \t\n])/.test(ctx.text.slice(key.range[1]));
const explicitKey = (pair) => (pair.srcToken?.start ?? []).some((token) => token.type === "explicit-key-ind");

function convertMap(ctx, node, depth, inFlow) {
  const out = {};
  for (const pair of node.items) {
    const { key, value } = pair;
    if (explicitKey(pair) || (inFlow && ctx.lib.isScalar(key) && stuckColon(ctx, key))) throw new YamlError("an explicit `?` key, or a colon stuck to the next character in a flow, is not read");
    const name = textKey(ctx, key, inFlow);
    if (typeof name !== "string" || FORBIDDEN_KEYS.has(name)) throw new YamlError("a mapping key that is not plain text (or is a merge key)");
    out[name] = convert(ctx, value, depth + 1, inFlow);
  }
  return out;
}

function convertScalar(ctx, node, outerFlow) {
  if (plainRisk(ctx, node, outerFlow)) throw new YamlError("a plain value with a colon or question mark where YAML parsers disagree is not read");
  return scalarText(node);
}

function convertCollection(ctx, node, depth, outerFlow) {
  const inFlow = outerFlow || node.flow === true;
  if (ctx.lib.isSeq(node)) return node.items.map((item) => convert(ctx, item, depth + 1, inFlow));
  if (!ctx.lib.isMap(node)) throw new YamlError("a node that is not a scalar, list or mapping");
  return convertMap(ctx, node, depth, inFlow);
}

function convert(ctx, node, depth, outerFlow) {
  if (depth > MAX_DEPTH) throw new YamlError(`nested deeper than ${MAX_DEPTH} levels`);
  if (node === null) return null;
  if (ctx.lib.isAlias(node) || node.anchor || node.tag) throw new YamlError("an anchor, alias or tag is not read");
  return ctx.lib.isScalar(node) ? convertScalar(ctx, node, outerFlow) : convertCollection(ctx, node, depth, outerFlow);
}

// the text itself: CRLF is LF, it always ends with one line break (the library lets an unclosed quote at the very end pass), and no character outside the list
function readableText(text) {
  if (typeof text !== "string") throw new YamlError("not text");
  const lines = `${text.replace(/\r\n/g, "\n").replace(/\n$/, "")}\n`;
  if (OUTSIDE_LIST.test(lines)) throw new YamlError("a character outside the list of readable characters");
  if (/^[ -]*\t/m.test(lines)) throw new YamlError("a tab in the indent or right after a list marker");
  return lines;
}

// exactly one document, no error and no warning of the library, no directive
function onlyDocument(lib, lines) {
  let docs;
  try { docs = lib.parseAllDocuments(lines, OPTIONS); } catch (error) { throw new YamlError(`the YAML library failed (${error.message})`); }
  if (docs.length !== 1) throw new YamlError(`the file must hold exactly one YAML document (found ${docs.length})`);
  const [doc] = docs;
  const problem = [...doc.errors, ...doc.warnings][0];
  if (problem) throw new YamlError(`${problem.code}: ${problem.message.split("\n")[0]}`);
  if (doc.directives.yaml.explicit || JSON.stringify(doc.directives.tags) !== DEFAULT_TAGS) throw new YamlError("a directive is not read");
  if (doc.contents === null) throw new YamlError("the document is empty");
  return doc;
}

export function parseYaml(text, opened = OPENED) {
  if (opened.error) throw new YamlError(opened.error);
  const lines = readableText(text);
  const value = convert({ lib: opened.lib, text: lines }, onlyDocument(opened.lib, lines).contents, 0, false);
  if (typeof value !== "object" || value === null) throw new YamlError("the document is not a mapping or a list");
  return value;
}
