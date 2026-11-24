// CI-COST-REDUCE: the reader behind pattern-check.mjs. It reads with the public `yaml` library under strict settings and THROWS on everything the settings do not
// allow, so a file it cannot read is never read as "fine". Tables: what is read, what is refused (with why), the machine-built negatives (Y4, Y5), the library that
// cannot be used (Y6), and the pinned dependency (Y7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openLibrary, parseYaml, PINNED_VERSION, YamlError } from "../scripts/ci/yaml-read.mjs";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

const READ = [
  ["a mapping with a nested mapping and a list", "a: 1\nb:\n  c: x\n  d:\n    - 1\n    - two\n", { a: "1", b: { c: "x", d: ["1", "two"] } }],
  ["a list at its key's own indent", "jobs:\n  t:\n    steps:\n    - run: a\n    - run: b\n    other: z\n", { jobs: { t: { steps: [{ run: "a" }, { run: "b" }], other: "z" } } }],
  ["a list item that opens a mapping", "steps:\n  - id: s\n    uses: x@1\n    with:\n      k: v\n  - run: y\n", { steps: [{ id: "s", uses: "x@1", with: { k: "v" } }, { run: "y" }] }],
  ["a list inside a list", "a:\n  - - x\n    - y\n  - - z\n", { a: [["x", "y"], ["z"]] }],
  ["a key with no value is null, and so are the null words", "a:\nb: ~\nc: null\nd: [~, Null, x]\n", { a: null, b: null, c: null, d: [null, null, "x"] }],
  ["a number or a boolean keeps the text it was written as", "a: 1.0\nb: True\nc: 0x1F\nd: 1e3\ne: 012\n", { a: "1.0", b: "True", c: "0x1F", d: "1e3", e: "012" }],
  ["on is a plain key (YAML 1.2), not a boolean", "on:\n  push:\n", { on: { push: null } }],
  ["a CRLF file reads like an LF file", "a: x\r\nb:\r\n  - y\r\n", { a: "x", b: ["y"] }],
  ["comments: a whole line, after a space, and none inside a word or quotes", "# top\na: 1 # note\nb: x#y\nc: \"p # q\" # r\nd: 'p # q'\n", { a: "1", b: "x#y", c: "p # q", d: "p # q" }],
  ["quotes and escapes", "a: 'it''s'\nb: \"t\\tn\\n\\\\ \\\" \\u0041\"\n", { a: "it's", b: "t\tn\n\\ \" A" }],
  ["a ${{ }} expression and a url keep their text", "a: ${{ github.event_name == 'push' }}\nb: https://x.example/y\nc: 12:30\n", { a: "${{ github.event_name == 'push' }}", b: "https://x.example/y", c: "12:30" }],
  ["a literal block keeps its lines, its blank lines and its # lines", "run: |\n  set -e\n\n  # not a comment\n  npm ci\nnext: 1\n", { run: "set -e\n\n# not a comment\nnpm ci\n", next: "1" }],
  ["a folded block joins its lines, - strips the last break", "run: >-\n  one\n  two\n\n  three\nz: 1\n", { run: "one two\nthree", z: "1" }],
  ["a block scalar in a list item", "- run: |\n    a\n    b\n- run: c\n", [{ run: "a\nb\n" }, { run: "c" }]],
  ["a flow list and a flow mapping, nested, quoted, empty", "a: [x, 'y z', \"w\", [1, 2], {k: v}]\nb: {k: v, 'q': \"r\", n: [a], e: {}}\nc: []\n", { a: ["x", "y z", "w", ["1", "2"], { k: "v" }], b: { k: "v", q: "r", n: ["a"], e: {} }, c: [] }],
  ["a flow mapping with a null value", "on: {pull_request: null, push: {branches: [main]}}\n", { on: { pull_request: null, push: { branches: ["main"] } } }],
  ["a leading --- , a list as the whole document, a missing final line break", "---\n- a\n- b: c", ["a", { b: "c" }]],
  ["a quoted key", "\"if\": a\n'on' : b\n", { if: "a", on: "b" }],
];

test("Y1 what is read: each shape gives exactly the structure YAML gives (every scalar is a string or null)", () => {
  for (const [name, text, expected] of READ) assert.deepEqual(parseYaml(text), expected, name);
});

const REFUSED = [
  ["a duplicate key", "a: 1\na: 2\n", /DUPLICATE_KEY/],
  ["a duplicate key under a nested mapping", "a:\n  b: 1\n  b: 2\n", /DUPLICATE_KEY/],
  ["a duplicate key in a flow mapping", "a: {k: 1, k: 2}\n", /DUPLICATE_KEY/],
  ["an anchor", "a: &x 1\n", /anchor, alias or tag/],
  ["an alias", "a: &x 1\nb: *x\n", /anchor, alias or tag/],
  ["an alias with no anchor", "b: *x\n", /anchor, alias or tag|ANCHOR|alias/i],
  ["a tag", "a: !!str 1\n", /anchor, alias or tag/],
  ["a tag the library does not know (a warning of the library)", "a: !foo x\n", /TAG_RESOLVE_FAILED/],
  ["the merge key", "a:\n  <<: b\n", /merge key/],
  ["the merge key inside a flow mapping", "a: {<<: {if: false}, x: 1}\n", /merge key/],
  ["a second document", "a: 1\n---\nb: 2\n", /exactly one YAML document \(found 2\)/],
  ["a document marker at the end, which opens a second document", "a: 1\n---\n", /exactly one YAML document \(found 2\)/],
  ["no document", "", /found 0/],
  ["a document of comments only", "# a\n# b\n", /found 0/],
  ["a YAML directive", "%YAML 1.2\n---\na: 1\n", /directive/],
  ["a TAG directive", "%TAG !e! tag:example.com,2000:\n---\na: 1\n", /directive/],
  ["a document that is only a marker", "---\n", /not a mapping or a list/],
  ["a scalar document", "just text\n", /not a mapping or a list/],
  ["a comment inside a key (round 4)", "name # comment: ci\n", /not a mapping or a list/],
  ["a comment inside a key under a job", "jobs:\n  t:\n    name # comment: ci\n    runs-on: x\n", /BAD_INDENT/],
  ["a block scalar whose first lines are blank and deeper than the body (round 4)", "a: |\n   \n  x\n", /MISSING_CHAR/],
  ["a block scalar with a deeper blank line after a blank line", "a: |\n\n    \n  x\n", /MISSING_CHAR/],
  ["a flow item that is a block-scalar header", "a: {run: |}\n", /BAD_SCALAR_START/],
  ["a key that is a number, a boolean, a null word, or empty", "1: x\n", /mapping key/],
  ["a boolean key", "true: x\n", /mapping key/],
  ["a null word as a key", "~: x\n", /mapping key/],
  ["an empty key", ": a\n", /mapping key/],
  ["__proto__ as a key", "__proto__: x\n", /mapping key/],
  ["an explicit key", "? [a, b]\n: c\n", /explicit/],
  ["an explicit key before a list item", "? x\n- y\n", /explicit|UNEXPECTED|BLOCK/],
  ["a plain value that starts with a colon in a flow", "a: [:x]\n", /colon or question mark/],
  ["a plain value that starts with a question mark in a flow", "a: {k: ?x}\n", /colon or question mark/],
  ["a plain value with a colon inside a flow list", "a: [x:y]\n", /colon or question mark/],
  ["a colon stuck to the next character in a flow mapping", "a: {k:,v}\n", /colon stuck|colon or question mark/],
  ["a tab in the indent", "a:\n\tb: 1\n", /tab/],
  ["a tab right after a list marker", "- \tx\n", /tab/],
  ["an unterminated single-quoted scalar", "a: 'x\n", /MISSING_CHAR/],
  ["an unterminated double-quoted scalar at the end of the file", "a: \"x", /MISSING_CHAR/],
  ["a flow list never closed", "a: [x, y\n", /BAD_INDENT|MISSING_CHAR|flow/i],
  ["text after a quoted value", "a: \"x\" y\n", /UNEXPECTED_TOKEN/],
  ["a nested mapping in a plain value", "a: b: c\n", /BLOCK_AS_IMPLICIT_KEY/],
  ["a no-break space", "a:\u00a0x\n", /outside the list/],
  ["a byte order mark", "\ufeffa: x\n", /outside the list/],
  ["a bare carriage return", "a: x\rb: y\n", /outside the list/],
  ["a control character", "a: x\u0000\n", /outside the list/],
  ["not text", undefined, /not text/],
  ["nested deeper than the limit", `${"[".repeat(70)}${"]".repeat(70)}\n`, /deeper than/],
];

test("Y2 what is refused: each shape outside the strict settings throws a YamlError that says why", () => {
  for (const [name, text, why] of REFUSED) {
    assert.throws(() => parseYaml(text), (error) => error instanceof YamlError && why.test(error.message), `${name}: ${JSON.stringify(text)}`);
  }
});

test("Y3 a wrong shape never gives a partial result: the error is a YamlError, not a half-read structure", () => {
  for (const text of ["a: 1\nb: [x\n", "a: &x 1\nb: 2\n"]) assert.throws(() => parseYaml(text), YamlError);
});

// Machine-built negatives: a character is put into the slot where a plain scalar starts (a block value, a flow item, a flow value, a list item, a key), and the
// characters that are read there are only the ones on the list below, written here independently of the reader.
const SLOTS = [(x) => `a: ${x}\n`, (x) => `a: [${x}]\n`, (x) => `a: {k: ${x}}\n`, (x) => `- ${x}\n`, (x) => `${x}: v\n`];
const INDICATORS = "!&*|>%@`'\"[]{}:?"; // a comma is apart: {k: ,x} is an empty value, then x (valid YAML), and is refused in every other slot
const SAFE_FIRST = /^[A-Za-z0-9_./$()+=;<\\^~ -]$/; // a space and a dash start text in some slots; # is a comment start in two
const accepts = (text) => { try { parseYaml(text); return true; } catch { return false; } };

test("Y4 a plain scalar starts only with a listed character, and an indicator character is never read as the start of a value", () => {
  for (let code = 0x20; code < 0x7f; code++) {
    const ch = String.fromCharCode(code);
    for (const slot of SLOTS) {
      const text = slot(`${ch}x`);
      if (INDICATORS.includes(ch)) assert.equal(accepts(text), false, JSON.stringify(text));
      else if (accepts(text)) assert.ok(SAFE_FIRST.test(ch) || (ch === "#" && [0, 3].includes(SLOTS.indexOf(slot))) || (ch === "," && slot === SLOTS[2]), JSON.stringify(text));
    }
  }
});

test("Y5 a control character, a space that is not a plain space, or a lone surrogate is refused wherever it sits (a tab inside text is text)", () => {
  const OUTSIDE = [0, 1, 7, 8, 11, 12, 13, 14, 27, 31, 0x7f, 0x85, 0xa0, 0x1680, 0x2000, 0x200a, 0x200b, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff, 0xd800, 0xdfff].map((c) => String.fromCharCode(c));
  const SEEDS = ["a: x\n", "a: [x, y]\n", "a:\n  - k: v\n", "a: |\n  t\n", "a: 'q'\n", "a: \"q\"\n", "a: x # c\n"];
  for (const seed of SEEDS) for (let at = 0; at <= seed.length; at++) for (const ch of OUTSIDE) {
    if (ch === "\r" && seed[at] === "\n" && at > 0) continue; // a CRLF line break is a line break (read like LF)
    assert.throws(() => parseYaml(seed.slice(0, at) + ch + seed.slice(at)), YamlError, JSON.stringify(seed.slice(0, at) + ch + seed.slice(at)));
  }
  assert.deepEqual(parseYaml("a: x\ty\n"), { a: "x\ty" });
});

const GOOD = { parseAllDocuments: () => [], isScalar: () => false, isMap: () => false, isSeq: () => false, isAlias: () => false };
const FAKE_DOC = (contents) => ({ errors: [], warnings: [], directives: { yaml: { explicit: false }, tags: { "!!": "tag:yaml.org,2002:" } }, contents });

test("Y6 a library that cannot be used stops the read: not loadable, not the pinned version, missing a function, throwing, or giving a node it does not know", async () => {
  const broken = await openLibrary(async () => { throw new Error("no such package"); });
  assert.match(broken.error, /could not be loaded \(no such package\)/);
  assert.throws(() => parseYaml("a: 1\n", broken), (error) => error instanceof YamlError && /could not be loaded/.test(error.message));
  assert.match((await openLibrary(async () => ({ lib: GOOD, version: "2.9.2" }))).error, /version 2\.9\.2, not the pinned 2\.9\.1/);
  assert.match((await openLibrary(async () => ({ lib: { ...GOOD, isSeq: undefined }, version: PINNED_VERSION }))).error, /no isSeq/);
  const throwing = await openLibrary(async () => ({ lib: { ...GOOD, parseAllDocuments: () => { throw new Error("boom"); } }, version: PINNED_VERSION }));
  assert.throws(() => parseYaml("a: 1\n", throwing), /the YAML library failed \(boom\)/);
  const strange = await openLibrary(async () => ({ lib: { ...GOOD, parseAllDocuments: () => [FAKE_DOC({ kind: "unknown" })] }, version: PINNED_VERSION }));
  assert.throws(() => parseYaml("a: 1\n", strange), /not a scalar, list or mapping/);
  const empty = await openLibrary(async () => ({ lib: { ...GOOD, parseAllDocuments: () => [FAKE_DOC(null)] }, version: PINNED_VERSION }));
  assert.throws(() => parseYaml("a: 1\n", empty), /the document is empty/);
});

test("Y7 the dependency is pinned: one exact version in package.json, the lockfile and the installed copy, with its integrity and no install script", () => {
  const INTEGRITY = "sha512-3NxN8+78OdzbT7C/WjGsyfPAtJaN3FNDsWxv7Y7mcDsT/oOmgW8BpyQQFFBnvZE3j9Y2Sdz1ULFLezL7Eb2yFw==";
  assert.equal(read("package.json").devDependencies.yaml, PINNED_VERSION);
  const lock = read("package-lock.json");
  assert.equal(lock.packages[""].devDependencies.yaml, PINNED_VERSION);
  const entry = lock.packages["node_modules/yaml"];
  assert.equal(entry.version, PINNED_VERSION);
  assert.equal(entry.integrity, INTEGRITY);
  assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\/yaml\/-\/yaml-2\.9\.1\.tgz$/);
  assert.equal(entry.hasInstallScript, undefined);
  assert.equal(entry.dependencies, undefined);
  const installed = read("node_modules/yaml/package.json");
  assert.equal(installed.version, PINNED_VERSION);
  for (const hook of ["preinstall", "install", "postinstall", "prepare"]) assert.equal(installed.scripts?.[hook], undefined, hook);
});
