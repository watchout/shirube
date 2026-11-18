// U2 入力の欄の表の追い試験: 案内の写し（guidanceCopyOf）・選択（createSelection）・C02 の wire 変換の欄の検査を 1 つずつ外すと落ちるようにする守り。
// 配列・object・列の確かめは、他の入口を通らない形（array・function・array-like・every/filter を持つ入れ物）で確かめる。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { BASE } from "./working-state-gate-fixtures.mjs";
import { createSelection, guidanceOf, builtDraft, conflictObserved } from "./working-state-draft-fixtures.mjs";
import { LEAK } from "./working-state-field-fixtures.mjs";

const DRAFT = builtDraft({ observedItems: conflictObserved().items });
const copy = (over) => ws.guidanceCopyOf(guidanceOf(over));

test("C1+ 案内の写し: 原因の分類は知っている分類だけ（乱数らしい名前は断る）、普通の分類は写す", () => {
  const cause = (unobservableCause) => [{ itemKey: "sds_commit", state: "unobservable", unobservableCause }];
  assert.notEqual(copy({ causes: cause("malformed") }), null);
  assert.equal(copy({ causes: cause(LEAK) }), null);
  assert.equal(copy({ causes: cause("not-a-cause") }), null);
});

test("C2+ 案内の写し: 列の欄は配列だけ（length を持つ array-like は、中身が読める形でも断る）", () => {
  assert.equal(copy({ unconfirmed: { length: 1, 0: "sds_commit" } }), null);
  assert.equal(copy({ reasons: { length: 0 } }), null);
  assert.equal(copy({ causes: { length: 0 } }), null);
  assert.notEqual(copy({ unconfirmed: ["sds_commit"] }), null);
});

test("C3+ 案内の写し: 全文（text）が無い・文字列でない案内は断る。object でない入れ物（array・function）は text を持っていても断る", () => {
  const { text, ...withoutText } = guidanceOf();
  assert.equal(text.length > 0, true);
  assert.equal(ws.guidanceCopyOf(withoutText), null);
  assert.equal(ws.guidanceCopyOf({ conclusion: "出典が食い違っています。" }), null);
  assert.equal(ws.guidanceCopyOf(Object.assign([], { text: "出典が食い違っています。" })), null);
  assert.equal(ws.guidanceCopyOf(Object.assign(() => undefined, { text: "出典が食い違っています。" })), null);
  assert.deepEqual(ws.guidanceCopyOf({ text }), { text });
});

test("C4+ 選択: 結びの観測 digest は未指定でも作れる（形の確かめは指定された時だけ）。形の違う値は断る", () => {
  const unspecified = createSelection({ ...DRAFT, observationDigest: undefined });
  assert.equal(unspecified.status, "created");
  assert.equal(unspecified.selection.draftObservationDigest, undefined);
  assert.equal(createSelection({ ...DRAFT, observationDigest: LEAK }).status, "refused");
  assert.equal(createSelection(DRAFT).status, "created");
});

test("C5+ C02 の wire: 観測の参照の列・回答の列は配列だけ（every・filter を持つ入れ物は、中身が空や読める形でも断る）", () => {
  assert.equal(ws.draftToC02Wire(BASE).status, "converted");
  assert.equal(ws.draftToC02Wire({ ...BASE, observationRefs: Object.assign(new Set(["obs-1"]), { every: () => true }) }).status, "refused");
  assert.equal(ws.draftToC02Wire({ ...BASE, observationRefs: Object.assign(new Set([LEAK]), { every: () => true }) }).status, "refused");
  assert.equal(ws.draftToC02Wire({ ...BASE, answers: { filter: () => [] } }).status, "refused");
  assert.equal(JSON.stringify(ws.draftToC02Wire({ ...BASE, observationRefs: Object.assign(new Set([LEAK]), { every: () => true }) })).includes(LEAK), false);
});
