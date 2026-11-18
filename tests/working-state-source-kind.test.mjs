// U2 項目一覧の出典の種類（sources[].kind）と、外した項目の位置の印（決定 95 の 2 回目の追い指示）。
// 出典の種類は閉じた一覧（SOURCE_KINDS の 7）にある物だけ読む。外にある種類の出典を持つ項目は、種類を別の物（tool_probe など）に
// 置き換えて観測せず、(b) の形（観測できず・malformed の単位を項目一覧の位置で返す）で返し、値を写さず、観測した物にも成功にも数えない。
// 位置の印は項目名の形（小文字で始まる英数字と _）に当たらない形で、正当な項目名は印と同じにならない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { fileRead, goodReads, settingsText } from "./working-state-fixtures.mjs";
import { CATALOG, NOTE_ITEM, observeWith } from "./working-state-answer-fixtures.mjs";
import { buildDraft } from "./working-state-draft-fixtures.mjs";
import { absent } from "./working-state-secret-fixtures.mjs";

const KIND_LEAK = "Zk3Qw9XvL1m7Rt5Yp2Nb8Hd4Gs6Jf0Ca9Bv7Cx5DPq4Lm8Xc2Rt6vB1nZ3hY9kF5"; // 架空の 64 文字（大小文字・数字が混ざる）
const MARKER = /^catalog-position-\d+$/;
const ITEM_SHAPE = /^[a-z][a-z0-9_]{0,63}$/;
const source = (kind) => ({ kind, requiredForConfirmed: true, targetBinding: "by-location" });
const kindItem = (kind, over) => ({ itemKey: "extra_note", valueType: "string", userAnswerable: true, sources: [source(kind)], ...over });
const markersIn = (observed) => observed.items.filter((unit) => MARKER.test(unit.itemKey));
const readOf = (kind) => ({ ...fileRead("aidlc_settings", settingsText()), sourceKind: kind });

test("K1+ 出典の種類（読取りが当たる道）: 閉じた一覧の外の種類を持つ出典の項目は、同じ種類の読取りが渡されても観測せず、種類を写さない。(b) の形の単位だけを返す", () => {
  const catalog = [...CATALOG, kindItem(KIND_LEAK)];
  const observed = observeWith(catalog, [...goodReads(), readOf(KIND_LEAK)]);
  assert.equal(absent(KIND_LEAK, observed), true);
  assert.equal(observed.items.some((unit) => unit.itemKey === "extra_note"), false);
  const [dropped] = markersIn(observed);
  assert.equal(markersIn(observed).length, 1);
  assert.deepEqual([dropped.itemKey, dropped.sourceRef.locator, dropped.observation.availability, dropped.unobservableCause], ["catalog-position-5", "catalog-position-5", "unavailable", "malformed"]);
  assert.deepEqual([dropped.presence, dropped.valueDigest, dropped.observation.observedDigest], [undefined, undefined, null]);
  assert.deepEqual(observed.items.filter((unit) => !MARKER.test(unit.itemKey)), observeWith(CATALOG).items);
});

test("K2+ 出典の種類（読取りが無い道）: 読取りが無くても、外の種類は『読めなかった出典』の単位に写らず、(b) の形になる。種類の一覧の中の種類（claude_settings・remote_metadata）は今までどおり読めなかった単位になる", () => {
  const observed = observeWith([...CATALOG, kindItem(KIND_LEAK)]);
  assert.equal(absent(KIND_LEAK, observed), true);
  assert.equal(markersIn(observed).length, 1);
  assert.equal(observed.items.some((unit) => unit.itemKey === "extra_note"), false);
  for (const kind of ["claude_settings", "remote_metadata"]) {
    const legit = observeWith([...CATALOG, kindItem(kind)]);
    const [unit] = legit.items.filter((entry) => entry.itemKey === "extra_note");
    assert.deepEqual([markersIn(legit).length, unit.sourceRef.sourceKind, unit.unobservableCause], [0, kind, "fetch_failed"], kind);
  }
});

test("K3+ 出典の種類は置き換えない: 外の種類の項目は tool_probe の項目にならず、道具の確かめの読取りに当たらない（別の項目の単位・値も変わらない）", () => {
  const catalog = [...CATALOG, kindItem(KIND_LEAK, { itemKey: "tool_extra" })];
  const reads = [...goodReads(), readOf(KIND_LEAK), { ...goodReads().find((read) => read.sourceKind === "tool_probe"), locator: "extra" }];
  const observed = observeWith(catalog, reads);
  assert.equal(observed.items.some((unit) => unit.itemKey === "tool_extra"), false);
  assert.equal(observed.items.some((unit) => unit.sourceRef.locator === "extra"), false);
  assert.equal(absent(KIND_LEAK, observed), true);
  assert.deepEqual(observed.items.filter((unit) => !MARKER.test(unit.itemKey)), observeWith(CATALOG).items);
});

test("K4+ 出典の一覧の形: 出典の一覧が配列でない・出典が object でない・種類が文字列でない項目も、外の種類と同じに (b) の形で返す。1 つでも外にあれば、ほかの出典が一覧の中でも項目ごと外す", () => {
  const bad = [kindItem("sds_pin", { sources: [source("sds_pin"), source(KIND_LEAK)] }), kindItem("sds_pin", { sources: source("sds_pin") }), kindItem("sds_pin", { sources: [null] }), kindItem("sds_pin", { sources: [{ kind: 7 }] })];
  for (const item of bad) {
    const observed = observeWith([...CATALOG, item]);
    assert.equal(markersIn(observed).length, 1);
    assert.equal(observed.items.some((unit) => unit.itemKey === "extra_note"), false);
    assert.equal(absent(KIND_LEAK, observed), true);
  }
});

test("K5+ 位置の印: 外した項目の印は項目名の形に当たらない形（catalog-position-N）で、itemKey・位置・参照のどれにも同じ印だけが入る", () => {
  const catalog = [...CATALOG.slice(0, 1), kindItem(KIND_LEAK), ...CATALOG.slice(1), kindItem(KIND_LEAK, { itemKey: "other_note" })];
  const observed = observeWith(catalog);
  const markers = markersIn(observed);
  assert.deepEqual(markers.map((unit) => unit.itemKey).sort(), ["catalog-position-1", "catalog-position-6"]);
  for (const unit of markers) {
    assert.equal(ITEM_SHAPE.test(unit.itemKey), false);
    assert.deepEqual([unit.sourceRef.locator, unit.observation.sourceRef.endsWith(`:${unit.itemKey}`), unit.observation.observationId.startsWith(`${unit.itemKey}|`)], [unit.itemKey, true, true]);
  }
});

test("K6+ 印と正当な項目名は同じにならない: 項目名の形・初期の項目一覧の項目名は、どの位置の印とも違う。印と同じ文字列を項目名にした項目は、その項目自身が (b) の形で外れる（印は予約）。旧い形 catalog_position_N は正当な項目名として観測できる", () => {
  const legit = [...ws.INITIAL_CATALOG.map((entry) => entry.itemKey), ...CATALOG.map((entry) => entry.itemKey), "a", "x_1", "catalog_position_5", "position_5", "catalog_position"];
  for (const key of legit) {
    assert.equal(ITEM_SHAPE.test(key), true, key);
    for (let position = 0; position < 200; position += 1) assert.notEqual(key, `catalog-position-${position}`);
  }
  const reserved = observeWith([...CATALOG, { ...NOTE_ITEM, itemKey: "catalog-position-5" }]);
  const [unit] = reserved.items.filter((entry) => entry.itemKey === "catalog-position-5");
  assert.deepEqual([markersIn(reserved).length, unit.observation.availability, unit.unobservableCause, unit.presence], [1, "unavailable", "malformed", undefined]);
  assert.equal(buildDraft({ catalog: [...CATALOG, { ...NOTE_ITEM, itemKey: "catalog-position-5" }] }).reason, "invalid_input");
  const oldForm = observeWith([...CATALOG, { ...NOTE_ITEM, itemKey: "catalog_position_5" }]);
  assert.deepEqual([markersIn(oldForm).length, oldForm.items.some((entry) => entry.itemKey === "catalog_position_5" && entry.sourceRef.locator === "aidlc.settings.json")], [0, true]);
});
