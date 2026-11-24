// CI-COST-REDUCE: the reader behind pattern-check.mjs. It reads a small block-YAML subset into a structure and THROWS on everything else, so a file it
// cannot read is never read as "fine". Two tables: what is read (with the value it must give) and what is refused (each with its reason).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYaml, YamlError } from "../scripts/ci/yaml-subset.mjs";

const plain = (value) => JSON.parse(JSON.stringify(value)); // a null-prototype map compares as a plain object

const READ = [
  ["a mapping with a nested mapping and a list", "a: 1\nb:\n  c: x\n  d:\n    - 1\n    - two\n", { a: "1", b: { c: "x", d: ["1", "two"] } }],
  ["a list at its key's own indent", "jobs:\n  t:\n    steps:\n    - run: a\n    - run: b\n    other: z\n", { jobs: { t: { steps: [{ run: "a" }, { run: "b" }], other: "z" } } }],
  ["a list item that opens a mapping, with more keys under the dash", "steps:\n  - id: s\n    uses: x@1\n    with:\n      k: v\n  - run: y\n", { steps: [{ id: "s", uses: "x@1", with: { k: "v" } }, { run: "y" }] }],
  ["a dash on its own line over a block", "a:\n  -\n    k: v\n  -\n    - x\n", { a: [{ k: "v" }, ["x"]] }],
  ["a list inside a list", "a:\n  - - x\n    - y\n  - - z\n", { a: [["x", "y"], ["z"]] }],
  ["a key with no value is null", "a:\nb: 1\n", { a: null, b: "1" }],
  ["comments: a whole line, after a space, and none inside a word or quotes", "# top\na: 1 # note\nb: x#y\nc: \"p # q\" # r\nd: 'p # q'\n\n  # indented comment\ne: 2\n", { a: "1", b: "x#y", c: "p # q", d: "p # q", e: "2" }],
  ["single quotes: '' is a quote; double quotes: escapes", "a: 'it''s'\nb: \"t\\tn\\n\\\\ \\\" \\/\"\n", { a: "it's", b: "t\tn\n\\ \" /" }],
  ["a quoted key, and a key with a space before the colon of a quoted key", "\"if\": a\n'on' : b\n", { if: "a", on: "b" }],
  ["a ${{ }} expression with a colon-free body and with braces", "a: ${{ github.event_name == 'push' }}\nb: ci-${{ format('x-{0}', github.run_id) }}\n", { a: "${{ github.event_name == 'push' }}", b: "ci-${{ format('x-{0}', github.run_id) }}" }],
  ["a url and a time keep their colon (no space after it)", "a: https://x.example/y\nb: 12:30\n", { a: "https://x.example/y", b: "12:30" }],
  ["a literal block keeps its lines, its blank lines and its # lines", "run: |\n  set -e\n\n  # not a comment\n  npm ci\nnext: 1\n", { run: "set -e\n\n# not a comment\nnpm ci\n", next: "1" }],
  ["a folded block joins its lines, a blank line is a break, - strips the last break", "run: >-\n  one\n  two\n\n  three\nz: 1\n", { run: "one two\nthree", z: "1" }],
  ["a folded block with the default chomping keeps one final break", "a: >\n  one\n  two\nb: |-\n  x\n  y\nc: |\n  z\n\n\nd: |\n", { a: "one two\n", b: "x\ny", c: "z\n", d: "" }],
  ["a block scalar that ends at the end of the file, and one with a trailing comment on its header", "a: | # c\n  x\n  y\n", { a: "x\ny\n" }],
  ["a block scalar in a list item", "- run: |\n    a\n    b\n- run: c\n", [{ run: "a\nb\n" }, { run: "c" }]],
  ["a flow list and a flow mapping, nested, quoted, empty", "a: [x, 'y z', \"w\", [1, 2], {k: v}]\nb: {k: v, 'q': \"r\", n: [a], e: {}}\nc: []\n", { a: ["x", "y z", "w", ["1", "2"], { k: "v" }], b: { k: "v", q: "r", n: ["a"], e: {} }, c: [] }],
  ["a flow value followed by a comment", "a: [x, ab] # c\n", { a: ["x", "ab"] }],
  ["a leading --- and CRLF line ends", "---\r\na: 1\r\nb:\r\n  - x\r\n", { a: "1", b: ["x"] }],
  ["a list as the whole document", "- a\n- b: c\n", ["a", { b: "c" }]],
  ["blank and comment rows between entries, and at the end", "a: 1\n\n# x\n\nb: 2\n\n# end\n", { a: "1", b: "2" }],
  ["a sibling list after a mapping key that holds a list at its own indent", "a:\n- x\nb: y\n", { a: ["x"], b: "y" }],
];

test("Y1 what is read: each shape gives exactly the structure YAML gives (every scalar is a string)", () => {
  for (const [name, text, expected] of READ) assert.deepEqual(plain(parseYaml(text)), expected, name);
});

const REFUSED = [
  ["a tab in the indent", "a:\n\tb: 1\n", /tab/],
  ["an anchor", "a: &x 1\n", /anchor/],
  ["an alias", "a: *x\n", /anchor/],
  ["a tag", "a: !!str 1\n", /anchor, alias, tag/],
  ["a directive", "%YAML 1.2\na: 1\n", /not a mapping|key the reader|expected/],
  ["the merge key", "a:\n  <<: b\n", /merge key/],
  ["a duplicate key", "a: 1\na: 2\n", /duplicate key "a"/],
  ["a duplicate key under a nested mapping", "a:\n  b: 1\n  b: 2\n", /duplicate key "b"/],
  ["a duplicate key in a flow mapping", "a: {k: 1, k: 2}\n", /duplicate key "k"/],
  ["a quoted scalar over several lines", "a: \"x\n  y\"\n", /unterminated/],
  ["an unterminated single-quoted scalar", "a: 'x\n", /unterminated/],
  ["an unsupported escape", "a: \"\\u0041\"\n", /escape/],
  ["text after a quoted value", "a: \"x\" y\n", /text after/],
  ["text after a flow value", "a: [x] y\n", /text after/],
  ["a plain scalar that holds a colon and a space", "a: b: c\n", /: /],
  ["a flow list never closed", "a: [x, y\n", /flow/],
  ["a broken flow list", "a: [x}]\n", /flow|unterminated|malformed/],
  ["a flow mapping with a non-pair", "a: {k}\n", /key: value/],
  ["a flow list with an empty item", "a: [x, , y]\n", /empty/],
  ["a flow list with an anchor item", "a: [*x]\n", /unsupported|empty/],
  ["a block scalar header the reader does not take", "a: |2\n  x\n", /block scalar header/],
  ["a plain flow item with a colon inside a word", "a: [x, a:b]\n", /colon/],
  ["a plain value that starts with a flow indicator", "a: ]invalid\n", /anchor, alias, tag/],
  ["a plain value that starts with a comma", "a: ,x\n", /anchor, alias, tag/],
  ["a comment inside a flow mapping (it would end the mapping early)", "on: {pull_request: null # comment}\n", /comment inside a flow/],
  ["a comment inside a flow list", "a: [x, #c\n]\n", /comment inside a flow/],
  ["the merge key inside a flow mapping", "a: {<<: {if: false}, x: 1}\n", /merge key/],
  ["a block scalar with keep chomping", "a: |+\n  x\n", /block scalar header/],
  ["a folded block with a more-indented line", "a: >\n  one\n    two\n", /more-indented/],
  ["a block scalar line indented less than its first line", "a: |\n    x\n  y\n", /indented less/],
  ["a line indented deeper than its siblings", "a: 1\n  b: 2\n", /unexpected indentation/],
  ["a list item indented deeper than its siblings", "a:\n  - x\n    - y\n", /unexpected|expected/],
  ["a list item where a key was expected", "a: 1\n- b\n", /key: value/],
  ["a line that is no key and no item", "a: 1\nb\n", /key: value/],
  ["a complex key", "? a\n: b\n", /key: value|key the reader/],
  ["an empty key", ": a\n", /key the reader/],
  ["a second document", "a: 1\n---\nb: 2\n", /key: value|after the document|not a mapping/],
  ["a scalar document", "just text\n", /not a mapping|key: value/],
  ["an empty document", "", /not a mapping or a list/],
  ["a document of comments only", "# a\n# b\n", /not a mapping or a list/],
  ["a list marker where a value was expected", "a: - b\n", /list marker/],
  ["not text", undefined, /not text/],
  ["a flow mapping key that is not text", "a: {[x]: y}\n", /plain `key: value`/],
];

test("Y2 what is refused: each shape outside the subset throws a YamlError that says why", () => {
  for (const [name, text, why] of REFUSED) {
    assert.throws(() => parseYaml(text), (error) => error instanceof YamlError && why.test(error.message), `${name}: ${String(text)}`);
  }
});

test("Y3 the error names the line, so a person can find the shape that was refused", () => {
  assert.throws(() => parseYaml("a: 1\nb: 2\nc: &x 3\n"), /^YamlError: line 3: |line 3:/);
});
