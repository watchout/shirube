// U2 観測の解釈（LC2）の内側の、呼び出し workflow の取り出し（F01 の是正）の試験。
// 読むのは「jobs の直下の job の直下の uses」だけで、ほかの行（env・with・steps の中、文字列の中、comment、別の document）は
// 値にしない。決められない形は absent にせず malformed（観測できず側）へ回す。fixture は実物と同じ形の架空の値だけ。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";

const OID_A = "0123456789abcdef".repeat(2) + "01234567";
const OID_B = "fedcba9876543210".repeat(2) + "fedcba98";
const NAME = "watchout/shirube/.github/workflows/sds-gate.yml";
const read = (text) => {
  const parsed = ws.parseSourceContent("workflow_caller", text);
  assert.equal(parsed.ok, true);
  return ws.pickItem("workflow_caller", "sds_commit", parsed.doc);
};
const job = (...lines) => ["name: sample", "jobs:", "  gate:", ...lines].join("\n");
const uses = (ref, indent = "    ") => `${indent}uses: ${NAME}@${ref}`;
const MALFORMED = { presence: "malformed" };
const ABSENT = { presence: "absent" };
const valueOf = (ref) => ({ presence: "value", value: ref });

test("F01+ 実物の形（kit の呼び出し workflow）: 複数行の if・with・permissions・comment があっても job の uses を読む", () => {
  const real = readFileSync(new URL("../kit/sds-gate-caller.yml", import.meta.url), "utf8");
  assert.deepEqual(read(real.replaceAll("<SHIRUBE_COMMIT>", OID_A)), valueOf(OID_A));
  assert.deepEqual(read(real), valueOf("<SHIRUBE_COMMIT>"));
  assert.deepEqual(read(real.replaceAll("<SHIRUBE_COMMIT>", OID_A).replaceAll("\n", "\r\n")), valueOf(OID_A));
});

test("F01+ job の直下の uses の @ の後ろを取り出す（行末の comment・先頭の --- 1 つ・同じ commit の複数の job は 1 つの値）", () => {
  assert.deepEqual(read(job(uses(OID_A))), valueOf(OID_A));
  assert.deepEqual(read(`${job(`${uses(OID_A)} # v1`)}`), valueOf(OID_A));
  assert.deepEqual(read(`---\n${job(uses(OID_A))}`), valueOf(OID_A));
  assert.deepEqual(read(`${job(uses(OID_A))}\n  other:\n${uses(OID_A)}`), valueOf(OID_A));
});

test("F01+ 呼び出しが無ければ absent（空・comment だけ・別の action・steps の中の別の uses）", () => {
  assert.deepEqual(read(""), ABSENT);
  assert.deepEqual(read("name: sample"), ABSENT);
  assert.deepEqual(read(job(`    # uses: ${NAME}@${OID_A}`)), ABSENT);
  assert.deepEqual(read(job(`    uses: actions/some/.github/workflows/x.yml@${OID_B}`)), ABSENT);
  assert.deepEqual(read(job("    steps:", `      - uses: actions/checkout@${OID_B}`, "        with:", "          ref: main")), ABSENT);
});

test("F01- 監査の再現 1: env の中の uses が job の呼び出しでないのに確定にならない（pin と同じ commit でも）", () => {
  for (const place of ["env", "with", "steps"]) {
    const text = job("    runs-on: ubuntu-latest", `    ${place}:`, `      ${place === "steps" ? "- " : ""}uses: ${NAME}@${OID_A}`);
    assert.deepEqual(read(text), MALFORMED, place);
  }
});

test("F01- 監査の再現 2: 引用符つきの複数行の文字列の中の uses の行が呼び出しにならない（どの字下げでも）", () => {
  for (const indent of ["", "  ", "    ", "      "]) {
    assert.deepEqual(read(job('    name: "pipeline', uses(OID_A, indent), '    done"')), MALFORMED, JSON.stringify(indent));
    assert.deepEqual(read(job("    name: 'pipeline", uses(OID_A, indent), "    done'")), MALFORMED, JSON.stringify(indent));
  }
});

test("F01- comment の行・行末の comment の中の呼び出しは数えず、行末の comment の中の名前は決められない形として malformed", () => {
  assert.deepEqual(read(job(`    # uses: ${NAME}@${OID_A}`, `    # - uses: ${NAME}@${OID_B}`)), ABSENT);
  assert.deepEqual(read(job(`    runs-on: ubuntu-latest # uses: ${NAME}@${OID_A}`)), MALFORMED);
});

test("F01- 2 つ目の document の jobs は読まない（--- と ... の再出現・directive）", () => {
  assert.deepEqual(read(`${job("    runs-on: x")}\n---\njobs:\n  gate:\n${uses(OID_A)}`), MALFORMED);
  assert.deepEqual(read(`${job(uses(OID_A))}\n...\n---\nname: x`), MALFORMED);
  assert.deepEqual(read(`--- extra\n${job(uses(OID_A))}`), MALFORMED);
  assert.deepEqual(read(`${job(uses(OID_A))}\n--- a: b`), MALFORMED);
  assert.deepEqual(read(`${job(uses(OID_A))}\n... a: b`), MALFORMED);
  assert.deepEqual(read(`%YAML 1.2\n---\n${job(uses(OID_A))}`), MALFORMED);
});

test("F01- 1 つの job が uses と steps の両方を持つなら malformed（呼び出しか、実行かが決まらない）", () => {
  assert.deepEqual(read(job(uses(OID_A), "    steps:", "      - run: echo hi")), MALFORMED);
  assert.deepEqual(read(job("    steps:", "      - run: echo hi", uses(OID_A))), MALFORMED);
});

test("F01- 決められない形は malformed: block scalar・flow・anchor・alias・tag・引用符つきの呼び出し・複雑な key", () => {
  const shapes = [
    job("    run: |", `      uses: ${NAME}@${OID_A}`),
    job("    run: >-", "      echo hi"),
    `name: x\njobs: {gate: {uses: ${NAME}@${OID_A}}}`,
    job(`    uses: {a: ${NAME}@${OID_A}}`),
    job("    needs: [a,", "      b]"),
    job('    needs: ["a, b]'),
    job(`    uses: &pin ${NAME}@${OID_A}`),
    job("    uses: *pin"),
    job(`    uses: !!str ${NAME}@${OID_A}`),
    job(`    uses: "${NAME}@${OID_A}"`),
    job(`    uses: '${NAME}@${OID_A}'`),
    job(`    "uses": ${NAME}@${OID_A}`),
    job(`    ? uses\n    : ${NAME}@${OID_A}`),
    job(`    <<: *base`),
    job("    uses:", `      ${NAME}@${OID_A}`),
    job(`    uses: ${NAME}@${OID_A} extra`),
    job(`    uses: evil/${NAME}@${OID_A}`),
    job(`    uses: ${NAME}@`),
    job(`    uses: "actions/some/.github/workflows/x.yml@${OID_B}"`),
  ];
  for (const text of shapes) assert.deepEqual(read(text), MALFORMED, text);
});

test("F01- 重複・字下げの不一致・列の位置の不正は malformed（key の重複・job の重複・jobs の重複・job の key の字下げ・列の項目）", () => {
  assert.deepEqual(read(job(uses(OID_A), uses(OID_A))), MALFORMED);
  assert.deepEqual(read(`${job(uses(OID_A))}\n  gate:\n${uses(OID_A)}`), MALFORMED);
  assert.deepEqual(read(`${job(uses(OID_A))}\njobs:\n  other:\n    runs-on: x`), MALFORMED);
  assert.deepEqual(read(job(uses(OID_A), `   runs-on: x`)), MALFORMED);
  assert.deepEqual(read(job("    steps:", "    - uses: actions/checkout@" + OID_B)), ABSENT); // steps の列を key と同じ字下げに置くのは正しい YAML（呼び出しは無い）
  assert.deepEqual(read(job(uses(OID_A), "    steps:", "    - run: echo hi")), MALFORMED);
  assert.deepEqual(read(`jobs:\n  - gate\n`), MALFORMED);
  assert.deepEqual(read(` name: x\n${job(uses(OID_A))}`), MALFORMED);
  assert.deepEqual(read(`- a\n- b`), MALFORMED);
});

test("F01- 複数行の値の続きとして書かれた名前・uses の続き行・別々の commit を指す 2 つの呼び出しは malformed", () => {
  assert.deepEqual(read(job("    if: a ==", `      uses: ${NAME}@${OID_A}`)), MALFORMED);
  assert.deepEqual(read(job(uses(OID_A), "      continued")), MALFORMED);
  assert.deepEqual(read(`${job(uses(OID_A))}\n  second:\n${uses(OID_B)}`), MALFORMED);
});

test("F01- 字下げの tab・制御文字・BOM・行の区切りでない \\r・U+2028 を含む中身は malformed", () => {
  assert.deepEqual(read(job(`\tuses: ${NAME}@${OID_A}`)), MALFORMED);
  assert.deepEqual(read(job(`    \tuses: ${NAME}@${OID_A}`)), MALFORMED);
  assert.deepEqual(read(job("    runs-on: x", "\tneeds: y")), MALFORMED);
  assert.deepEqual(read(job(uses(OID_A), "    \tneeds: y")), MALFORMED);
  for (const bad of ["\u0000", "\r", "﻿", " ", "\u0085", "\u007f"]) {
    assert.deepEqual(read(job(uses(OID_A), `    runs-on: a${bad}b`)), MALFORMED, JSON.stringify(bad));
  }
  assert.deepEqual(read(job(`${uses(OID_A)}\ta`)), MALFORMED);
});

test("F01+ 値が空・comment だけの key・深い入れ子・列の中の引用符の入った plain な文字は読み進められる（誤って malformed にしない）", () => {
  assert.deepEqual(read(job("    needs:", "      - a", "      - 'b'", "    name: it's fine", `    env: # note`, "      A: 1", uses(OID_A))), valueOf(OID_A));
  assert.deepEqual(read(job("    permissions: {}", uses(OID_A))), valueOf(OID_A));
  assert.deepEqual(read(job("    strategy:", "      matrix:", "        os: [a, b] # list", "        x: \"q\"", "        tags: [\"a]\", 'b}']", uses(OID_A))), valueOf(OID_A));
});

test("F01- 中身が文字でない・取り出す項目が違うなら解釈も取り出しもしない（失敗側）", () => {
  assert.deepEqual(ws.parseSourceContent("workflow_caller", undefined), { ok: false });
  assert.deepEqual(ws.parseSourceContent("workflow_caller", 5), { ok: false });
  const parsed = ws.parseSourceContent("workflow_caller", job(uses(OID_A)));
  assert.deepEqual(ws.pickItem("workflow_caller", "kit_version", parsed.doc), MALFORMED);
});
