// U2 観測の解釈（LC2）の内側の、workflow_caller の取り出し（BR1.2・BR3.4・S5）の負例。
// 別 commit の本物の呼び出し（引用符つき・flow 形）があるのに、`run: |` の中の文字列の行が pin と同じ commit で、sds_commit が確認済みに読まれないこと。
// 取り出せない・疑わしい形は、どれも観測できない側（malformed）にする。fixture は架空の値だけ。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, OID_B, availabilityOf, fileRead, goodReads, observe, unit } from "./working-state-fixtures.mjs";

const NAME = "watchout/shirube/.github/workflows/sds-gate.yml";
const MALFORMED = { presence: "malformed" };
const pickCaller = (content) => {
  const result = ws.parseSourceContent("workflow_caller", content);
  assert.equal(result.ok, true);
  return ws.pickItem("workflow_caller", "sds_commit", result.doc);
};
const text = (...lines) => ["name: sample", "jobs:", ...lines, ""].join("\n");
const real = (ref) => `  gate:\n    uses: ${NAME}@${ref}`;
const quoted = (ref) => `  gate:\n    uses: "${NAME}@${ref}"`;
const singleQuoted = (ref) => `  gate:\n    uses: '${NAME}@${ref}'`;
const flow = (ref) => `  gate: {uses: ${NAME}@${ref}}`;
const fakeInRun = (ref) => `  note:\n    steps:\n      - run: |\n          uses: ${NAME}@${ref}`;
const fakeInline = (ref) => `  note:\n    steps:\n      - run: echo "uses: ${NAME}@${ref}"`;

test("N1- (a) 引用符つきの本物（別の 40 桁）と、run: | の中の pin と同じ commit の文字列の行は malformed（どちらも確認済みにしない）", () => {
  assert.deepEqual(pickCaller(text(quoted(OID_B), fakeInRun(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(singleQuoted(OID_B), fakeInRun(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(fakeInRun(OID_A), quoted(OID_B))), MALFORMED);
});

test("N1- (b) 呼び出す行が無く、run: | の中の文字列の行だけなら malformed（absent にも確認済みにもしない）", () => {
  assert.deepEqual(pickCaller(text(fakeInRun(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(fakeInline(OID_A))), MALFORMED);
});

test("N1- (c) flow 形 {uses: …} の本物と、文字列の行は malformed", () => {
  assert.deepEqual(pickCaller(text(flow(OID_B), fakeInRun(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(flow(OID_B), fakeInline(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(flow(OID_A))), MALFORMED);
});

test("N1- 守り 1（名前の出現数が行の正規表現で取れた件数と違う）だけで malformed: 引用符つき・flow 形・1 行の文字列・行の後ろの comment の中の名前", () => {
  assert.deepEqual(pickCaller(text(quoted(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(singleQuoted(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(real(OID_A), fakeInline(OID_A))), MALFORMED);
  assert.deepEqual(pickCaller(text(`  gate:\n    uses: ${NAME}@${OID_A} # ${NAME}@${OID_B}`)), MALFORMED);
});

test("N1- (d) block scalar の開始の行がある file は malformed（| > と、|- >- |+ >+ |2 >2- と、行末の空白と comment）", () => {
  for (const mark of ["|", ">", "|-", ">-", "|+", ">+", "|2", ">2", "|2-", ">+2", "| ", ">  ", "| # note"]) {
    assert.deepEqual(pickCaller(text(real(OID_A), `  other:\n    steps:\n      - run: ${mark}\n          echo hi`)), MALFORMED, JSON.stringify(mark));
  }
  assert.deepEqual(pickCaller(text(real(OID_A), "  list:\n    - |\n      body")), MALFORMED);
});

test("N1+ 引用符なしの本物の行だけなら、pin と同じ commit も別の commit も値のまま取り出す（comment の行・@<…> で終わる行は block scalar でない）", () => {
  assert.deepEqual(pickCaller(text(real(OID_A))), { presence: "value", value: OID_A });
  assert.deepEqual(pickCaller(text(real(OID_B))), { presence: "value", value: OID_B });
  assert.deepEqual(pickCaller(text("  # a | b |", `  # ${NAME}@<pinned commit sha>`, real(OID_A))), { presence: "value", value: OID_A });
  assert.deepEqual(pickCaller(text(real("<SHIRUBE_COMMIT>"))), { presence: "value", value: "<SHIRUBE_COMMIT>" });
  assert.deepEqual(pickCaller(text(real(OID_A), "  other:\n    steps:\n      - run: echo a | cat")), { presence: "value", value: OID_A });
});

const swapCaller = (content) => goodReads().map((r) => (r.sourceKind === "workflow_caller" ? fileRead("workflow_caller", content) : r));

test("N1- 観測まで通しても、疑わしい workflow は観測できず（malformed）で、pin と同じ commit の文字列の行で確認済みにならない", () => {
  for (const content of [text(quoted(OID_B), fakeInRun(OID_A)), text(fakeInRun(OID_A)), text(flow(OID_B), fakeInRun(OID_A)), text(real(OID_A), "  other:\n    steps:\n      - run: |\n          echo hi")]) {
    const item = unit(observe({ reads: swapCaller(content) }), "sds_commit", "workflow_caller");
    assert.equal(availabilityOf(item), "unavailable");
    assert.equal(item.unobservableCause, "malformed");
    assert.equal("value" in item, false);
    assert.equal("targetMatch" in item, false);
  }
});

test("N1+ 観測まで通すと、引用符なしの本物の行は値を持ち、別 commit なら pin と違う値になる", () => {
  const same = unit(observe({ reads: swapCaller(text(real(OID_A))) }), "sds_commit", "workflow_caller");
  assert.equal(same.value, OID_A);
  const other = unit(observe({ reads: swapCaller(text(real(OID_B))) }), "sds_commit", "workflow_caller");
  assert.deepEqual([other.value, other.valueDigest], [OID_B, ws.digestOf(OID_B)]);
});
