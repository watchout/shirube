// U2 入力の欄の表の追い試験: 観測の単位（observed-unit）・項目の一覧（catalog）の欄の検査を 1 つずつ外すと落ちるようにする守り（欄ごとの確かめの個別の根拠）。
// 手で作れる単位は、読めない欄があれば値を写さず位置で示す観測できずの単位に置き換える。値の形・配列の確かめは、他の入口を通らない形（function・array-like）で確かめる。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { CATALOG } from "./working-state-answer-fixtures.mjs";
import { conflictObserved } from "./working-state-draft-fixtures.mjs";
import { LEAK } from "./working-state-field-fixtures.mjs";

const UNIT = conflictObserved().items.find((item) => item.itemKey === "sds_commit");
const PLACEHOLDER = ws.readableUnitsOf([null])[0];
const withFunction = (base, over) => Object.assign(() => undefined, base, over);
const replaced = (unit) => ws.readableUnitsOf([unit])[0].itemKey === "observed-position-0";
const kept = (unit) => ws.readableUnitsOf([unit])[0] === unit;

test("U1+ 置き換えた単位は自分でも読める単位（何度置き換えても同じ）で、出典の種類に unreadable を持つ", () => {
  assert.equal(ws.isReadableUnit(PLACEHOLDER), true);
  assert.equal(PLACEHOLDER.sourceRef.sourceKind, "unreadable");
  assert.deepEqual(ws.readableUnitsOf([PLACEHOLDER]), [PLACEHOLDER]);
  assert.equal(kept(UNIT), true);
});

test("U2+ namedTarget（名指した対象）: 空の文字列は読めない（置き換え）、普通の名前は読める", () => {
  assert.equal(replaced({ ...UNIT, namedTarget: "" }), true);
  assert.equal(kept({ ...UNIT, namedTarget: "other-work" }), true);
});

test("U3+ matchGroup（一致の番号）: 1 以上の整数だけ読める（0・負・小数・文字列・NaN は置き換え）", () => {
  assert.equal(kept({ ...UNIT, matchGroup: 1 }), true);
  assert.equal(kept({ ...UNIT, matchGroup: 7 }), true);
  for (const value of [0, -1, 1.5, "1", Number.NaN, null]) assert.equal(replaced({ ...UNIT, matchGroup: value }), true, String(value));
});

test("U4+ 欄の読みで例外を起こす単位（getter）は読めない側（置き換え。値は写らない）", () => {
  const thrower = { ...UNIT, get itemKey() { throw new Error(LEAK); } };
  assert.equal(ws.isReadableUnit(thrower), false);
  assert.equal(replaced(thrower), true);
  assert.equal(JSON.stringify(ws.readableUnitsOf([thrower])).includes(LEAK), false);
});

test("U5+ 単位・出典の参照・観測は object だけ: 欄を持つ function は読めない（置き換え）", () => {
  assert.equal(replaced(withFunction(UNIT)), true);
  assert.equal(replaced({ ...UNIT, sourceRef: withFunction(UNIT.sourceRef) }), true);
  assert.equal(replaced({ ...UNIT, observation: withFunction(UNIT.observation) }), true);
});

test("U6+ 値が項目の定義に合うか（unitFits）: 閉じた形で形式に合う値だけが合う（開いた形・未知の形式・値の型違いは合わない）", () => {
  assert.equal(ws.unitFits({ valueType: "version" }, { value: "1.2.3" }), true);
  assert.equal(ws.unitFits({ valueType: "string" }, { value: "hello" }), false);
  assert.equal(ws.unitFits({ valueType: "list", elementShape: "string" }, { value: ["hello"] }), false);
  assert.equal(ws.unitFits({ valueType: "unknown-type" }, { value: "hello" }), false);
  assert.equal(ws.unitFits({ valueType: "version" }, { value: LEAK }), false);
  assert.equal(ws.unitFits({ valueType: "string" }, {}), true);
  assert.equal(ws.unitFits(undefined, { value: "hello" }), true);
});

test("U7+ 単位の列（unitsFit）は配列だけ: every を持つ array-like は断り、全部読めて合う配列は受ける", () => {
  assert.equal(ws.unitsFit(CATALOG, { every: () => true }), false);
  assert.equal(ws.unitsFit(CATALOG, new Set([UNIT])), false);
  assert.equal(ws.unitsFit(CATALOG, [UNIT]), true);
  assert.equal(ws.unitsFit(CATALOG, [UNIT, null]), false);
});

test("U8+ 項目 1 つの評価（evaluateItem）: 読めない単位（乱数らしい観測の識別）は観測の参照に写らない", () => {
  const entry = CATALOG.find((candidate) => candidate.itemKey === "sds_commit");
  const result = ws.evaluateItem(entry, [{ ...UNIT, observation: { ...UNIT.observation, observationId: LEAK } }]);
  assert.equal(JSON.stringify(result).includes(LEAK), false);
  assert.equal(result.state, "unobservable");
});

test("U9+ 項目の一覧の 1 項目は object だけ（欄を持つ function は読めない）、位置の鍵は 0 以上の整数だけ", () => {
  const entry = CATALOG.find((candidate) => candidate.itemKey === "sds_commit");
  assert.equal(ws.isReadableCatalogItem(entry), true);
  assert.equal(ws.isReadableCatalogItem(withFunction(entry)), false);
  assert.equal(ws.positionKeyOf(0), "catalog-position-0");
  assert.equal(ws.positionKeyOf(5), "catalog-position-5");
  for (const position of [-1, 1.5, Number.NaN, "1", 2 ** 53, null]) assert.throws(() => ws.positionKeyOf(position), (error) => error instanceof TypeError && !error.message.includes(String(position)), String(position));
});
