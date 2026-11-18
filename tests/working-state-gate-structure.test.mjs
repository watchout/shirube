// U2 唯一の門（Owner の決定 95）の試験 その 2: 手で作った構造体（回答の値・案内・回答の列）の門。
// 構造体の中の文字列だけでなく key も (a)〜(d) に通し、知っている入れ物（配列・素の object・Map・Set）の外は含む側（失敗側）に倒す。
// 同じ入れ物を何度も調べない（共有された部品の DAG で時間が伸びない）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { ANSWER, BASE, selectionWireOf, wireOf } from "./working-state-gate-fixtures.mjs";
import { buildDraft, createSelection, guidanceOf } from "./working-state-draft-fixtures.mjs";
import { JWT3, TOKEN } from "./working-state-secret-fixtures.mjs";

const carries = (value) => ws.carriesSecretShape(value);
class Box { constructor(value) { this.value = value; } }

test("S1+ 構造体の key にある (a)〜(d) の形も含む側（値だけを調べない）", () => {
  assert.equal(carries({ [TOKEN]: 1 }), true);
  assert.equal(carries({ [JWT3]: "x" }), true);
  assert.equal(carries({ outer: { [TOKEN]: [] } }), true);
  assert.equal(carries([{ [TOKEN]: 0 }]), true);
  assert.equal(carries(Object.assign([], { [TOKEN]: 1 })), true);
  assert.equal(carries(new Map([[TOKEN, 1]])), true);
});

test("S2+ Map・Set の中（key・値・入れ子）の (a)〜(d) の形も含む側", () => {
  assert.equal(carries(new Map([["k", TOKEN]])), true);
  assert.equal(carries(new Set([TOKEN])), true);
  assert.equal(carries(new Map([["k", new Set([[TOKEN]])]])), true);
  assert.equal(carries({ inner: new Map([["k", { deep: TOKEN }]]) }), true);
});

test("S3+ 知っている入れ物（配列・素の object・Map・Set）の外の object は含む側（RegExp・Error・String・Number・Date・ArrayBuffer・型付き配列・class の実体・配列と Map の継承）", () => {
  const outsiders = [new RegExp(TOKEN), new Error(TOKEN), new String(TOKEN), new Number(1), new Date(0), new ArrayBuffer(8), new Uint8Array(4), new Box("harmless"), new (class extends Array {})(), new (class extends Map {})()];
  for (const value of outsiders) assert.equal(carries(value), true, Object.prototype.toString.call(value));
  assert.equal(carries({ inner: new Box("harmless") }), true);
  assert.equal(carries([new Date(0)]), true);
});

test("S4+ key が symbol・値が getter・symbol・function の入れ物は含む側（getter を呼ばない）", () => {
  let called = 0;
  const withGetter = { get lazy() { called += 1; return "harmless"; } };
  assert.equal(carries(withGetter), true);
  assert.equal(called, 0);
  assert.equal(carries({ [Symbol("k")]: "harmless" }), true);
  assert.equal(carries({ inner: Symbol("v") }), true);
  assert.equal(carries({ inner: () => 1 }), true);
  assert.equal(carries(new Proxy({}, { ownKeys() { throw new Error(TOKEN); } })), true);
});

test("S5- 普通の構造体は含まない（文字列・数・真偽・undefined・null・入れ子の配列と object・Map・Set・prototype の無い object）", () => {
  const harmless = { a: "harmless", b: [1, true, null, undefined, "x"], c: { d: new Map([["k", ["v"]]]), e: new Set(["s"]) }, f: Object.create(null) };
  assert.equal(carries(harmless), false);
  assert.equal(carries({ id: "x".repeat(40), uuid: "123e4567-e89b-12d3-a456-426614174000", [`k${"y".repeat(30)}`]: [new Set(["z".repeat(30)])] }), false); // 構造体の文字列・key は (e) を当てない（正当な長い名前・UUID）
  for (const value of ["harmless", "", 0, 1.5, true, null, undefined, 10n, [], {}, new Map(), new Set(), [[[]]]]) assert.equal(carries(value), false, String(value));
});

test("S6+ 確かめきれない深さ（8 段以上）は含む側。循環は 1 回ずつ調べて止まる（循環だけでは含む側にしない）", () => {
  const deep = (n, leaf) => (n === 0 ? leaf : { inner: deep(n - 1, leaf) });
  assert.equal(carries(deep(8, "harmless")), false);
  assert.equal(carries(deep(9, "harmless")), true);
  assert.equal(carries(deep(2, TOKEN)), true);
  const loop = { name: "harmless" };
  loop.self = loop;
  assert.equal(carries(loop), false);
  loop.leak = TOKEN;
  assert.equal(carries(loop), true);
});

test("S7+ 共有された部品は 1 回だけ調べる（幅 12・深さ 5 の DAG で入れ物の列挙は 1 回）", () => {
  let enumerations = 0;
  const leaf = new Proxy({ v: "harmless" }, { ownKeys(target) { enumerations += 1; return Reflect.ownKeys(target); } });
  const widen = (inner) => Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, inner]));
  let node = leaf;
  for (let level = 0; level < 5; level += 1) node = widen(node);
  assert.equal(carries(node), false);
  assert.equal(enumerations, 1);
  let wide = { a: TOKEN };
  for (let level = 0; level < 5; level += 1) wide = widen(wide);
  assert.equal(carries(wide), true);
});

test("S8+ 出口: wire の回答の値・案内の文・手で作った回答の列・選択に写す案内の key の (a)〜(d) の形は断る", () => {
  for (const value of [{ [TOKEN]: 1 }, new Map([["k", TOKEN]]), new Set([TOKEN]), new Date(0), new Box("harmless")]) {
    assert.equal(wireOf({ answers: [{ ...ANSWER, value }] }), "refused");
    assert.equal(buildDraft({ answers: [{ ...ANSWER, value }] }).reason, "invalid_input");
  }
  assert.equal(createSelection(BASE, { guidance: guidanceOf({ nextAction: { kind: "choose-source", text: "x", [TOKEN]: 1 } }) }).reason, "invalid_guidance");
  assert.equal(createSelection(BASE, { guidance: guidanceOf({ unconfirmed: [new Map([["k", TOKEN]])] }) }).reason, "invalid_guidance");
  assert.equal(selectionWireOf({ guidance: { text: "x", [TOKEN]: 1 } }), "refused");
  assert.equal(wireOf({ answers: [{ ...ANSWER, value: { plain: ["harmless"] } }] }), "converted");
});
