// U2 観測の単位の欄どうしの関係（#116 の差し戻し F01・F02 の是正）。値・digest・形・対象の関係を単位の入口 1 か所で照らし、
// 壊れた単位は観測できず（malformed）。1 回の評価は 1 つの対象だけ。守りを外すと落ちる負例を持つ。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, OID_B, TARGET, observe, unit } from "./working-state-fixtures.mjs";

const COMMIT = ws.findItem("sds_commit");
const goodPin = () => structuredClone(unit(observe(), "sds_commit", "sds_pin"));
const goodCaller = () => structuredClone(unit(observe(), "sds_commit", "workflow_caller"));
const pair = () => [goodPin(), goodCaller()];
const stateOf = (units) => ws.evaluateItem(COMMIT, units);
const withUnit = (over) => [{ ...goodPin(), ...over }, goodCaller()];

test("U2S3-02 基準: 実物の観測の単位は読め、確認済みになる", () => {
  assert.equal(ws.isReadableUnit(goodPin()), true);
  assert.equal(stateOf(pair()).state, "confirmed");
  assert.equal(ws.unitsFit(ws.INITIAL_CATALOG, pair()), true);
});

test("U2S3-02 F01 再現 1: 値を消して digest だけ残した単位は読めず、確認済みにならない", () => {
  const broken = goodPin();
  delete broken.value;
  assert.equal(ws.isReadableUnit(broken), false);
  const item = stateOf([broken, goodCaller()]);
  assert.equal(item.state, "unobservable");
  assert.equal(ws.unitsFit(ws.INITIAL_CATALOG, [broken, goodCaller()]), false);
});

test("U2S3-02 F01 再現 2: 値だけ変えて digest を残した単位（digest が値と合わない）は読めない", () => {
  const broken = { ...goodPin(), value: OID_B };
  assert.equal(ws.isReadableUnit(broken), false);
  assert.equal(stateOf([broken, { ...goodCaller(), value: OID_B, valueDigest: ws.digestOf(OID_B) }]).state, "unobservable");
});

test("U2S3-02 F01 再現 3: 閉じた形で値も digest も無い単位（presence は value）は確認済みにならない", () => {
  const broken = goodPin();
  delete broken.value;
  delete broken.valueDigest;
  assert.notEqual(stateOf([broken, goodCaller()]).state, "confirmed");
});

test("U2S3-02 F01 再現 4: digest だけ別の値に直した単位は、値から計算し直した digest と合わず読めない", () => {
  const broken = { ...goodPin(), valueDigest: ws.digestOf(OID_B) };
  assert.equal(ws.isReadableUnit(broken), false);
  assert.equal(stateOf([broken, goodCaller()]).state, "unobservable");
});

test("U2S3-02 値を持てない形（absent・differs・保留・観測できず）の値と digest は受けない", () => {
  const shapes = [{ presence: "absent" }, { targetMatch: "differs", namedTarget: "other-work" }, { withheld: "invalid_format" }, { observation: { ...goodPin().observation, availability: "unavailable" }, unobservableCause: "fetch_failed" }];
  for (const over of shapes) {
    const broken = { ...goodPin(), ...over };
    assert.equal(ws.isReadableUnit(broken), false, JSON.stringify(over));
    const clean = { ...broken };
    delete clean.value;
    delete clean.valueDigest;
    if (over.presence === "absent") assert.equal(ws.isReadableUnit(clean), true);
  }
  const digestOnly = goodPin();
  delete digestOnly.value;
  assert.equal(ws.isReadableUnit(digestOnly), false);
});

test("U2S3-02 F02 再現: 2 つの対象の出典を混ぜた評価は、どの項目も確認済みにならない（malformed）", () => {
  const other = { ...goodCaller(), sourceRef: { ...goodCaller().sourceRef, targetRef: "other-work" } };
  const item = stateOf([goodPin(), other]);
  assert.deepEqual([item.state, item.unobservableCauses, item.observationRefs], ["unobservable", ["malformed"], []]);
  assert.equal(ws.sharesOneTarget([goodPin(), goodCaller()]), true);
  assert.equal(ws.sharesOneTarget([goodPin(), other]), false);
  assert.equal(ws.unitsFit(ws.INITIAL_CATALOG, [goodPin(), other]), false);
  const items = ws.evaluateItems([COMMIT], [goodPin(), other]);
  assert.equal(items.items[0].state, "unobservable");
});

test("U2S3-02 読めない単位の代わりは対象を持たず、1 つの対象かどうかの数に入らない", () => {
  const units = ws.readableUnitsOf([goodPin(), 7]);
  assert.equal(ws.sharesOneTarget(units), true);
});

test("U2S3-02 名指した対象と targetMatch の関係: 一致する名指しは matches、別の名指しは differs だけ", () => {
  assert.equal(ws.isReadableUnit({ ...goodPin(), namedTarget: TARGET }), true);
  assert.equal(ws.isReadableUnit({ ...goodPin(), namedTarget: "other-work" }), false);
  const wrong = { ...goodPin(), targetMatch: "differs", namedTarget: "other-work" };
  delete wrong.value;
  delete wrong.valueDigest;
  assert.equal(ws.isReadableUnit(wrong), true);
  assert.equal(ws.isReadableUnit({ ...wrong, namedTarget: TARGET }), false);
  const noMatch = { ...goodPin(), namedTarget: "other-work" };
  delete noMatch.targetMatch;
  assert.equal(ws.isReadableUnit(noMatch), false);
});

test("U2S3-02 同じ識別（対象・項目・出典の種類・位置）の単位は 全部読めない側に置き換える（どちらが本物か決めない）", () => {
  const dup = [goodPin(), goodPin(), goodCaller()];
  const units = ws.readableUnitsOf(dup);
  assert.deepEqual(units.map((u) => u.sourceRef.sourceKind), ["unreadable", "unreadable", "workflow_caller"]);
  assert.equal(units[2], dup[2]);
  const tied = [goodPin(), { ...goodPin(), value: OID_B, valueDigest: ws.digestOf(OID_B) }, goodCaller()];
  assert.equal(stateOf(tied).state, "unobservable");
  assert.equal(stateOf(dup).state, "unobservable");
  assert.equal(ws.unitsFit(ws.INITIAL_CATALOG, dup), false);
  const sameKeyOtherLocator = [goodPin(), { ...goodPin(), sourceRef: { ...goodPin().sourceRef, locator: "other/sds-pin.json" } }];
  assert.equal(ws.readableUnitsOf(sameKeyOtherLocator)[1], sameKeyOtherLocator[1]);
});

test("U2S3-02 getter で例外を起こす欄・配列でない入力は読めない側（失敗側）", () => {
  const trap = goodPin();
  Object.defineProperty(trap, "value", { get() { throw new Error("trap"); }, enumerable: true });
  assert.equal(ws.isReadableUnit(trap), false);
  assert.equal(ws.unitsFit(ws.INITIAL_CATALOG, "x"), false);
  assert.throws(() => ws.readableUnitsOf("x"), { message: "observedItems must be an array" });
});

test("U2S3-02 項目の定義との関係: 閉じた形は形式に合う値、開いた形は値・digest を持たず長さの区分と一致の番号を持つ", () => {
  const closed = ws.INITIAL_CATALOG.find((entry) => ws.valueFormOf(entry.valueType) === "closed");
  const open = ws.INITIAL_CATALOG.find((entry) => ws.valueFormOf(entry.valueType) === "open");
  const closedBad = { ...goodPin(), value: "not-an-oid" };
  closedBad.valueDigest = ws.digestOf(closedBad.value);
  assert.equal(ws.unitFits(COMMIT, closedBad), false);
  assert.equal(ws.unitFits(COMMIT, goodPin()), true);
  assert.equal(ws.unitFits(undefined, closedBad), true);
  const openUnit = { itemKey: open.itemKey, sourceRef: { sourceKind: open.sources[0].kind, locator: "x", targetRef: TARGET }, observation: { observationId: "o", availability: "observed" }, targetMatch: "matches", presence: "value" };
  assert.equal(ws.unitFits(open, openUnit), false);
  assert.equal(ws.unitFits(open, { ...openUnit, lengthBucket: ws.LENGTH_BUCKETS?.[0] ?? "short", matchGroup: 1 }), true);
  assert.equal(ws.unitFits(open, { ...openUnit, lengthBucket: "short", matchGroup: 1, value: "abc" }), false);
  assert.equal(ws.unitFits(closed, { ...openUnit, presence: "absent" }), true);
});

test("U2S3-03 事実: 単位の欄の関係が壊れた単位は事実に値を写さず、観測できずの事実になる", () => {
  const broken = { ...goodPin(), value: OID_B };
  const facts = ws.factsOf([broken, goodCaller()]);
  assert.equal(JSON.stringify(facts).includes(OID_B), false);
  assert.equal(facts.some((fact) => fact.unit.sourceRef.sourceKind === "unreadable"), true);
  assert.notEqual(ws.observationDigestOf(facts), ws.observationDigestOf(ws.factsOf(pair())));
  assert.equal(ws.isObservationStale({ d: ws.observationDigestOf(ws.factsOf(pair())) }, "d", [broken, goodCaller()]), true);
  assert.equal(OID_A.length > 0, true);
  assert.equal(withUnit({}).length, 2);
});

test("U2S3-02 targetMatch が無い単位が対象を名指しても読めない（値を持たない形でも）", () => {
  const unit = { itemKey: "sds_commit", sourceRef: { sourceKind: "sds_pin", locator: "x", targetRef: TARGET }, observation: { observationId: "o", availability: "observed" }, presence: "absent" };
  assert.equal(ws.isReadableUnit(unit), true);
  assert.equal(ws.isReadableUnit({ ...unit, namedTarget: "other-work" }), false);
});

test("U2S3-02 開いた形の単位は、長さの区分と一致の番号の両方が無ければ項目の定義に合わない", () => {
  const open = ws.INITIAL_CATALOG.find((entry) => ws.valueFormOf(entry.valueType) === "open");
  const base = { itemKey: open.itemKey, sourceRef: { sourceKind: open.sources[0].kind, locator: "x", targetRef: TARGET }, observation: { observationId: "o", availability: "observed" }, targetMatch: "matches", presence: "value" };
  assert.equal(ws.unitFits(open, { ...base, matchGroup: 1 }), false);
  assert.equal(ws.unitFits(open, { ...base, lengthBucket: "short" }), false);
});

test("U2S3-02 単位の識別は 4 つの欄の全部で決まる（1 欄でも違えば別の単位。連結で偶然一致する組を同じにしない）", () => {
  const at = (target, item, kind, locator) => ({ itemKey: item, sourceRef: { sourceKind: kind, locator, targetRef: target }, observation: { observationId: "o", availability: "observed" }, targetMatch: "matches", presence: "absent" });
  const readable = (units) => ws.readableUnitsOf(units).every((u, i) => u === units[i]);
  assert.equal(readable([at("t", "ab_c", "sds_pin", "x"), at("ta", "b_c", "sds_pin", "x")]), true);
  assert.equal(readable([at("t", "sds_commit", "sds_pin", "x"), at("u", "sds_commit", "sds_pin", "x")]), true);
  assert.equal(readable([at("t", "sds_commit", "sds_pin", "x"), at("t", "sds_commit", "workflow_caller", "x")]), true);
  assert.equal(readable([at("t", "sds_commit", "sds_pin", "x"), at("t", "sds_commit", "sds_pin", "y")]), true);
  assert.equal(readable([at("t", "sds_commit", "sds_pin", "x"), at("t", "sds_commit", "sds_pin", "x")]), false);
});

test("U2S3-03 F01 再現 4（開いた形）: 開いた形の単位に digest を足しても事実に残らない（単位が読めず、値・digest を写さない）", () => {
  const open = unit(observe(), "protected_paths", "sds_pin");
  const forged = { ...structuredClone(open), valueDigest: ws.digestOf("open-data") };
  assert.equal(ws.isReadableUnit(open), true);
  assert.equal(ws.isReadableUnit(forged), false);
  assert.equal(JSON.stringify(ws.factsOf([forged])).includes(ws.digestOf("open-data")), false);
});

test("U2S3-03 OBS03 の扱い: 正規の全単位に同じ単位の再送を足すと、再送の識別の単位は全部読めない側になり、事実は識別ごとに 1 件（辞書順）", () => {
  const all = structuredClone(observe().items);
  const withResend = [...all, structuredClone(all[0])];
  const facts = ws.factsOf(withResend);
  assert.equal(facts.length, withResend.length);
  assert.equal(facts.filter((fact) => fact.unit.sourceRef.sourceKind === "unreadable").length, 2);
  assert.equal(ws.isObservationStale({ d: ws.observationDigestOf(ws.factsOf(all)) }, "d", withResend), true);
});
