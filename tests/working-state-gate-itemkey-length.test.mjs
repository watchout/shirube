// U2 項目名（itemKey）の長さの上限（G-7(b)）: 項目名の門（isItemKeyText）は、項目名の規則（ITEM_NAME_RE。1〜64 文字）の長さを上限に持つ。
// 読める語を並べただけの長い名前（読める名前の判定は通るが、64 文字を超える）は、どの入口・出口でも項目名として受けず、写さない（断る形は今までの (b) の形のまま）。
// 正当な項目名（初期の項目一覧の全部）は 0 件断られない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { INITIAL_CATALOG } from "../scripts/working-state/catalog.mjs";
import { CATALOG, T2, answerInput, observeWith, send } from "./working-state-answer-fixtures.mjs";
import { buildInput } from "./working-state-draft-fixtures.mjs";
import { guide, handDraft, unobservableItem } from "./working-state-guidance-fixtures.mjs";
import { absent } from "./working-state-secret-fixtures.mjs";

const BASE57 = "aidlc_settings_models_default_version_preset_thorough_kit";
const NAME_64 = `${BASE57}_ab_cde`;
const NAME_65 = `${BASE57}_ab_cdef`;
const words = (count) => Array.from({ length: count }, (_, i) => `ab${String.fromCharCode(97 + (i % 26))}`).join("_");
const LONG_63_WORDS = words(63);
const LONG_3000 = Array.from({ length: 300 }, (_, i) => `model${i % 10}x`).join("_").slice(0, 3000);

test("G7+ 項目名の長さ: 64 文字ちょうどは通り、65 文字は断る（長さの根拠は項目名の規則 ITEM_NAME_RE と同じ）", () => {
  assert.deepEqual([NAME_64.length, NAME_65.length], [64, 65]);
  assert.equal(ws.ITEM_NAME_RE.test(NAME_64), true);
  assert.equal(ws.ITEM_NAME_RE.test(NAME_65), false);
  assert.equal(ws.isItemKeyText(NAME_64), true);
  assert.equal(ws.isItemKeyText(NAME_65), false);
});

test("G7+ 読める語を並べた長い名前（63 語を _ で連ねた名前・3000 文字の名前）は項目名として断る", () => {
  for (const name of [LONG_63_WORDS, LONG_3000, "a".repeat(65), `${"abc_".repeat(20)}abc`]) {
    assert.equal(name.length > 64, true);
    assert.equal(ws.isItemKeyText(name), false, name.slice(0, 20));
  }
});

test("G7+ 正当な項目名は 0 件断られない: 初期の項目一覧の全部と、短い読める名前", () => {
  for (const entry of INITIAL_CATALOG) assert.equal(ws.isItemKeyText(entry.itemKey), true, entry.itemKey);
  for (const name of ["aidlc_settings_models_default_version", "tool_node", "a", "x_y"]) assert.equal(ws.isItemKeyText(name), true, name);
});

test("G7- 長い名前は入口で断る: 項目一覧の項目名（draft は作らない）・今までの回答の列（unreadable）・案内（invalid_input）・wire（変換しない）", () => {
  for (const name of [LONG_63_WORDS, LONG_3000]) {
    const note = { ...CATALOG[3], itemKey: name };
    const built = ws.buildDraft(buildInput({ catalog: [...CATALOG, note] }));
    assert.deepEqual([built.status, built.reason], ["refused", "invalid_input"], name.slice(0, 20));
    const good = send(answerInput({ answerId: "ans-1", itemKey: "aidlc_version", value: "3.0.0" })).answers[0];
    const received = send(answerInput({ answerId: "ans-2", itemKey: "sds_commit", value: "0".repeat(40), answeredAt: T2 }), { answers: [good, { ...good, itemKey: name }] });
    assert.deepEqual([received.status, received.answers], ["unreadable", []]);
    const guided = guide(handDraft([unobservableItem(name, "tool_missing")]));
    assert.deepEqual([guided.status, guided.reason, guided.guidance], ["refused", "invalid_input", null]);
    assert.equal(absent(name, [built, received, guided]), true, name.slice(0, 20));
    const wired = ws.draftToC02Wire({ draftId: "draft-1", targetRef: "sample-work", missingItems: [name], conflicts: [], observationRefs: [], answers: [] });
    assert.deepEqual([wired.status, wired.wire], ["refused", null]);
  }
});

test("G7- 長い名前の観測の単位は、位置で示す観測できずの単位に置き換わり、名前は写らない（観測の入口の (b) の形）。ほかの単位はそのまま", () => {
  const [first, second] = observeWith().items;
  for (const name of [LONG_63_WORDS, LONG_3000]) {
    const units = ws.readableUnitsOf([first, { ...second, itemKey: name }]);
    assert.equal(units[0], first);
    assert.deepEqual([units[1].itemKey, units[1].unobservableCause, units[1].observation.availability], ["observed-position-1", "malformed", "unavailable"]);
    assert.equal(absent(name, units), true, name.slice(0, 20));
    assert.equal(ws.unitsFit(CATALOG, [{ ...second, itemKey: name }]), false);
    assert.equal(absent(name, ws.buildDraft(buildInput({ observedItems: [{ ...second, itemKey: name }] }))), true);
  }
});
