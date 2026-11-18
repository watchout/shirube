// U2 開いた形の生の値の経路（NFR2.6・T3.4p）。主の証拠は動的な走査: 架空の開いた形の値を入れ、返り値・draft・案内・C02 の形・表示・標準出力の全体に、
// その値がそのままの形で現れないことを確かめる（例外を起こす入力でも）。派生形（長さの区分・presence・一致の組の番号）は証明しない（N3）。
// 静的な検査（import の向き・例外の文面）は working-state-structure.test.mjs の T12.i+。ここは動かして確かめる。
// 観測した値（file の中身）は決定 116・120 のとおりどこにも写らない。利用者の回答は、形式に合えば回答の記録（と、それを写す draft・C02 の answers）にだけ載り、
// 案内・表示・標準出力には載らない。拒否した回答（秘密らしい・形式に合わない）はどこにも載らない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { CATALOG, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";
import { builtDraft } from "./working-state-draft-fixtures.mjs";
import { GATE_FAIL } from "./working-state-guidance-fixtures.mjs";
import { goodReads, pinText } from "./working-state-fixtures.mjs";
import { PIN_LOCATOR, readThrough, withDir } from "./working-state-read-file-fixtures.mjs";

// 架空の値。OPEN = 形式に合う開いた形、SECRET = 秘密らしい長さの語（保持しない側）、INVALID = 形式に合わない（空白を含む）。
const OPEN = "marker-open-q7x2";
const SECRET = "zq9-marker-withheld-run-001";
const INVALID = "marker invalid value";
const NOTHING = "unrelated-answer";
const FULL = Object.freeze([...CATALOG, ws.findItem("protected_paths")]);
const ANSWER_PARTS = new Set(["answered", "draft", "wire"]);

// 標準出力・標準エラーの書込みを集める（流れは変えない）。
function capture(run) {
  const chunks = [];
  const wrap = (stream) => {
    const original = stream.write;
    stream.write = function write(chunk, ...rest) { chunks.push(String(chunk)); return original.call(this, chunk, ...rest); };
    return () => { stream.write = original; };
  };
  const restore = [wrap(process.stdout), wrap(process.stderr)];
  try { return { value: run(), output: chunks }; } finally { restore.forEach((undo) => undo()); }
}

// LC1 が実際に読んだ pin（観測する値を含む）から、核の全部の出力までを 1 回通す。回答は note_text（利用者が答えられる文字列の項目）に 1 件。
async function wholePath({ observed, answer }, dir) {
  dir.put(PIN_LOCATOR, pinText({ protected_paths: [observed] }));
  const pinFact = await readThrough(dir, PIN_LOCATOR);
  const reads = [pinFact, ...withContent(goodReads(), "aidlc_settings", "{}").filter((read) => read.sourceKind !== "sds_pin")];
  return capture(() => {
    const seen = observeWith(FULL, reads);
    const answered = send(answerInput({ itemKey: "note_text", value: answer }), { observed: seen, catalog: FULL });
    const draft = builtDraft({ catalog: FULL, observedItems: seen.items, answers: answered.answers });
    const guided = ws.buildGuidance({ draft, catalog: FULL, conformance: GATE_FAIL });
    const shown = ws.DISPLAY_DESTINATIONS.map((destination) => ws.escapeForDisplay(destination, guided.guidance.text));
    return { observed: seen, answered, draft, guided, wire: ws.draftToC02Wire(draft), shown };
  });
}

const textOf = (body) => JSON.stringify(body);

for (const [name, marker] of [["形式に合う", OPEN], ["秘密らしい長さ", SECRET], ["形式に合わない", INVALID]]) {
  test(`T12.i+ 観測した開いた形の値（${name}）は LC1 の返り値の content にだけ載り、観測・回答・draft・案内・C02 の形・表示・標準出力のどこにも現れない`, () => withDir(async (dir) => {
    const { value, output } = await wholePath({ observed: marker, answer: NOTHING }, dir);
    assert.equal(value.observed.status, "observed");
    assert.equal(value.draft.items.length > 0, true);
    for (const [part, body] of Object.entries(value)) assert.equal(textOf(body).includes(marker), false, part);
    assert.equal(output.some((chunk) => chunk.includes(marker)), false);
  }));
}

for (const [name, marker, kept] of [["形式に合う", OPEN, true], ["秘密らしい長さ", SECRET, false], ["形式に合わない", INVALID, false]]) {
  test(`T12.i+ 利用者の回答（${name}）: ${kept ? "回答の記録と、それを写す draft・C02 の answers にだけ載る" : "拒否され、どこにも載らない"}。案内・表示・標準出力・観測には載らない`, () => withDir(async (dir) => {
    const { value, output } = await wholePath({ observed: NOTHING, answer: marker }, dir);
    assert.equal(value.answered.status, kept ? "recorded" : "rejected");
    for (const [part, body] of Object.entries(value)) assert.equal(textOf(body).includes(marker), kept && ANSWER_PARTS.has(part), part);
    assert.equal(output.some((chunk) => chunk.includes(marker)), false);
  }));
}

test("T12.i+ 走査の目盛り: LC1 の返り値の content には値が載り、核は形式に合う値を長さの区分だけ、秘密らしい・形式に合わない値を固定の分類だけにする", () => withDir(async (dir) => {
  dir.put(PIN_LOCATOR, pinText({ protected_paths: [OPEN] }));
  assert.equal((await readThrough(dir, PIN_LOCATOR)).content.includes(OPEN), true);
  const pathsOf = async (marker) => (await wholePath({ observed: marker, answer: NOTHING }, dir)).value.observed.items.filter((item) => item.itemKey === "protected_paths");
  for (const item of await pathsOf(OPEN)) assert.deepEqual([item.presence, "lengthBucket" in item, "withheld" in item], ["value", true, false]);
  for (const marker of [SECRET, INVALID]) for (const item of await pathsOf(marker)) assert.deepEqual([item.presence, "lengthBucket" in item, "withheld" in item], ["value", false, true]);
}));

test("T12.i+ 走査の目盛り: 標準出力・標準エラーへの書込みは集められ（値を足せば検出できる）、集めた後は元の書込みに戻る", () => {
  const before = [process.stdout.write, process.stderr.write];
  const { output } = capture(() => { process.stdout.write(""); process.stderr.write("capture-probe\n"); });
  assert.equal(output.some((chunk) => chunk.includes("capture-probe")), true);
  assert.deepEqual([process.stdout.write, process.stderr.write], before);
});

test("T12.i- 例外を起こす入力でも、例外の文面・stack・返り値に開いた形の値が載らない（核は固定の文面で投げる。入口は固定の分類を返す）", () => {
  const trap = { get value() { throw new Error(OPEN); } };
  const thrown = [() => ws.escapeForDisplay("no-such-destination", OPEN), () => ws.escapeForDisplay("plain", { [OPEN]: OPEN }), () => ws.canonicalJson({ [OPEN]: () => OPEN }),
    () => ws.canonicalJson({ [OPEN]: 1n }), () => ws.lengthBucketOf(OPEN)];
  for (const run of thrown) assert.throws(run, (error) => !`${error.name} ${error.message} ${error.stack}`.includes(OPEN));
  const observedItems = observeWith().items;
  const results = [ws.receiveAnswer({ catalog: CATALOG, observedItems, answers: [], input: answerInput({ value: trap }) }),
    ws.receiveAnswer({ catalog: CATALOG, observedItems, answers: [], input: { ...answerInput(), value: [OPEN], get answerId() { throw new Error(OPEN); } } }),
    ws.buildDraft({ draftId: "draft-1", targetRef: OPEN, catalog: CATALOG, observedItems: [trap], answers: [] }),
    ws.buildGuidance({ draft: { items: [trap], targetRef: OPEN }, catalog: CATALOG }),
    ws.observeAll({ targetRef: OPEN, now: "not-a-time", catalog: CATALOG, reads: [], requiredVersions: {} })];
  for (const result of results) assert.equal(textOf(result).includes(OPEN), false);
});
