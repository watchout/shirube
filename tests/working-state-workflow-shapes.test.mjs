// 呼び出し workflow の読みが受ける YAML の形の表（#115 の独立の実装監査 1 回目の指摘の是正）。1 行 = 1 つの形。
// accepted の形は値を取り出し、rejected の形は決められない形として malformed（観測できず側）にする。表に無い形は読まない側に倒れる。
// 比べる軸: 重複 key（どの深さ）・括弧の種類と閉じ・値の続き行・anchor・alias・tag・merge key・document・字下げ・引用符と comment・複雑な key。
// fixture は実物と同じ形の架空の値だけ。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { readContentLines } from "../scripts/working-state/workflow-lines.mjs";

const OID = "0123456789abcdef".repeat(2) + "01234567";
const NAME = "watchout/shirube/.github/workflows/sds-gate.yml";
const CALL = `    uses: ${NAME}@${OID}`;
const read = (text) => {
  const parsed = ws.parseSourceContent("workflow_caller", text);
  assert.equal(parsed.ok, true);
  return ws.pickItem("workflow_caller", "sds_commit", parsed.doc);
};
const wf = (head, ...tail) => [...head, "jobs:", "  gate:", CALL, ...tail].join("\n");
const MALFORMED = { presence: "malformed" };
const VALUE = { presence: "value", value: OID };

// [形の名前, 中身, 期待]。期待は "ok"（commit を取り出す）か "no"（malformed）。
const SHAPES = [
  ["block-mapping", wf(["name: x"]), "ok"],
  ["block-sequence-under-key", wf(["name: x"], "    needs:", "      - a", "      - b"), "ok"],
  ["sequence-at-key-indent", wf(["name: x"], "    needs:", "    - a"), "ok"],
  ["sequence-of-mappings", wf(["name: x"], "    matrix:", "      - a: 1", "        b: 2", "      - a: 3"), "ok"],
  ["flow-sequence-closed", wf(["on: [push, pull_request]"]), "ok"],
  ["flow-sequence-nested", wf(["on: [a, [b, c]]"]), "ok"],
  ["flow-sequence-empty", wf(["on: []"]), "ok"],
  ["flow-mapping-empty", wf(["permissions: {}"]), "ok"],
  ["flow-quoted-brackets", wf(['tags: ["a]", \'b}\']']), "ok"],
  ["quoted-value-with-hash", wf(['name: "a # b"']), "ok"],
  ["quoted-value-with-colon", wf(['name: "a: b"']), "ok"],
  ["plain-value-with-hash-no-space", wf(["name: a#b"]), "ok"],
  ["plain-value-comment-tail", wf(["name: x # note"]), "ok"],
  ["plain-continuation-lines", wf(["name: x"], "    if: ${{ a ==", "      b }}"), "ok"],
  ["blank-line-in-continuation", wf(["name: x"], "    if: a", "", "      b"), "ok"],
  ["leading-document-marker", wf(["---", "name: x"]), "ok"],
  ["crlf-lines", wf(["name: x"]).replaceAll("\n", "\r\n"), "ok"],
  ["duplicate-key-root", wf(["name: a", "name: b"]), "no"],
  ["duplicate-key-in-with", wf(["name: a"], "    with:", "      target: a", "      target: b"), "no"],
  ["duplicate-key-in-item-mapping", wf(["name: a"], "    steps2:", "      - a: 1", "        a: 2"), "no"],
  ["duplicate-job-id", `${wf(["name: a"])}\n  gate:\n${CALL}`, "no"],
  ["duplicate-jobs", `${wf(["name: a"])}\njobs:\n  other:\n    runs-on: x`, "no"],
  ["duplicate-uses", wf(["name: a"], CALL), "no"],
  ["flow-mismatched-closer", wf(["on: [workflow_dispatch}"]), "no"],
  ["flow-mismatched-opener", wf(["on: {workflow_dispatch]"]), "no"],
  ["flow-unclosed", wf(["on: [a, b"]), "no"],
  ["flow-closer-inside-then-more", wf(["on: [a}, b]"]), "no"],
  ["flow-missing-comma", wf(["on: [a [b]]"]), "no"],
  ["flow-quoted-without-comma", wf(['on: ["a" "b"]']), "no"],
  ["flow-multiline", wf(["on: [a,", "  b]"]), "no"],
  ["flow-empty-element", wf(["on: [a,, b]"]), "no"],
  ["flow-trailing-garbage", wf(["on: [a] b"]), "no"],
  ["flow-mapping-nonempty", wf(["on: {a: b}"]), "no"],
  ["flow-nested-too-deep", wf([`on: ${"[".repeat(9)}${"]".repeat(9)}`]), "no"],
  ["flow-plain-with-colon", wf(["on: [a: b]"]), "no"],
  ["flow-anchor-alias", wf(["on: [&a x, *a]"]), "no"],
  ["plain-continuation-with-mapping", wf(["name: sample", "  nested: bad"]), "no"],
  ["plain-continuation-after-comment", wf(["name: sample"], "    if: a", "    # c", "      b"), "no"],
  ["plain-continuation-with-item", wf(["name: sample"], "    if: a", "      - b"), "no"],
  ["plain-continuation-with-comment", wf(["name: sample"], "    if: a", "      b # c"), "no"],
  ["plain-value-with-colon-space", wf(["name: a: b"]), "no"],
  ["plain-value-with-trailing-colon", wf(["name: a:"]), "no"],
  ["plain-value-starts-with-dash", wf(["name: - a"]), "no"],
  ["closed-value-continuation", wf(["name: \"a\""], "      more"), "no"],
  ["uses-continuation", wf(["name: a"], "      more"), "no"],
  ["anchor-on-value", wf(["name: &a x"]), "no"],
  ["alias-value", wf(["name: *a"]), "no"],
  ["tag-on-value", wf(["name: !!str x"]), "no"],
  ["merge-key", wf(["<<: *base"]), "no"],
  ["merge-key-flow", wf(["<<: {}"]), "no"],
  ["block-scalar-literal", wf(["name: |", "  text"]), "no"],
  ["block-scalar-folded", wf(["name: >-", "  text"]), "no"],
  ["multi-document", `${wf(["name: a"])}\n---\nname: b`, "no"],
  ["document-end-marker", `${wf(["name: a"])}\n...`, "no"],
  ["marker-with-content", wf(["--- a"]), "no"],
  ["directive", wf(["%YAML 1.2", "---", "name: a"]), "no"],
  ["tab-indentation", wf(["name: a"], "\tneeds: b"), "no"],
  ["tab-after-spaces", wf(["name: a"], "    \tneeds: b"), "no"],
  ["quoted-key", wf(['"name": a']), "no"],
  ["complex-key", wf(["? name", ": a"]), "no"],
  ["unclosed-quote", wf(['name: "a']), "no"],
  ["quote-then-garbage", wf(['name: "a" b']), "no"],
  ["nested-sequence-item", wf(["name: a"], "    needs:", "      - - a"), "no"],
  ["nested-sequence-item-key", wf(["name: a"], "    needs:", "      - - k: v"), "no"],
  ["item-misaligned-after-block", wf(["name: a"], "    needs:", "      -", "          k: 1", "        - b"), "no"],
  ["key-anchor", wf(["&a k: v"]), "no"],
  ["key-tag", wf(["!!str k: v"]), "no"],
  ["key-flow", wf(["[a]: v"]), "no"],
  ["key-alias", wf(["*a : v"]), "no"],
  ["key-empty", wf([": v"]), "no"],
  ["key-with-comment", wf(["a #c: v"]), "no"],
  ["scalar-block-under-key", wf(["name: a"], "    needs:", "      text"), "no"],
  ["scalar-root", "just text", "no"],
  ["sequence-root", "- a\n- b", "no"],
  ["indented-root", ` ${wf(["name: a"])}`, "no"],
  ["uneven-indent", wf(["name: a"], "   needs: b"), "no"],
  ["deeper-after-sibling", wf(["name: a"], "    env:", "      A: 1", "        B: 2"), "no"],
  ["jobs-not-mapping", "jobs: x", "no"],
  ["jobs-sequence", "jobs:\n  - gate", "no"],
  ["job-not-mapping", "jobs:\n  gate: x", "no"],
  ["uses-quoted", `jobs:\n  gate:\n    uses: "${NAME}@${OID}"`, "no"],
  ["uses-with-steps", wf(["name: a"], "    steps:", "      - run: x"), "no"],
  ["name-outside-job-uses", wf(["name: a"], `    env:`, `      X: ${NAME}@${OID}`), "no"],
  ["nesting-too-deep", ["jobs:", ...Array.from({ length: 70 }, (_, i) => `${" ".repeat(i + 1)}k${i}:`)].join("\n"), "no"],
];

test("YAML の形の表: 形の名前は重ならず、accepted は commit を取り出し、rejected は malformed になる", () => {
  const names = SHAPES.map(([name]) => name);
  assert.equal(new Set(names).size, names.length);
  for (const [name, text, expect] of SHAPES) assert.deepEqual(read(text), expect === "ok" ? VALUE : MALFORMED, name);
});

test("YAML の形の表: 受ける形は rejected の形と 1 つの違い（重複・括弧・続き・字下げ）だけで分かれ、足りない形を成功にしない", () => {
  assert.deepEqual(read(wf(["on: [a, b]"])), VALUE);
  assert.deepEqual(read(wf(["on: [a, b}"])), MALFORMED);
  assert.deepEqual(read(wf(["name: a", "name: a"])), MALFORMED);
  assert.equal(SHAPES.filter(([, , expect]) => expect === "no").length > SHAPES.filter(([, , expect]) => expect === "ok").length, true);
});

test("行の読み: tab の字下げ・制御文字・文字でない入力は、行の列にせず null（観測できず側）にする", () => {
  assert.equal(readContentLines("a: 1\n\tb: 2"), null);
  assert.equal(readContentLines("a: 1\n  b\u0001: 2"), null);
  assert.equal(readContentLines(undefined), null);
  assert.deepEqual(readContentLines("a: 1\n\n# c\nb: 2").map((line) => line.body), ["a: 1", "b: 2"]);
});
