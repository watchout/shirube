// U2 出口の項目 × BR5.2（M17+ の手で作った draft 版）: 観測の入口を通らず手で作った draft の位置・出典の種類・観測の参照に、(a)〜(e) の 5 つの形の全部を入れても、
// 案内・選択・wire のどれにも写らないこと。M17+ は観測の入口が断る形を調べる。この試験は入口を通らない draft を、出口の側だけで調べる。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { builtDraft, conflictObserved, createSelection } from "./working-state-draft-fixtures.mjs";
import { guide } from "./working-state-guidance-fixtures.mjs";
import { COLUMNS, SHAPES, absent, variants } from "./working-state-secret-fixtures.mjs";

const BASE = builtDraft({ observedItems: conflictObserved().items });
const CONFLICT = BASE.items.findIndex((item) => item.itemKey === "sds_commit");
const mapCandidate = (draft, change) => ({ ...draft, items: draft.items.map((item, i) => (i === CONFLICT ? { ...item, candidates: item.candidates.map((entry, j) => (j === 0 ? change(entry) : entry)) } : item)) });
const SPOTS = Object.freeze({
  "候補の出典の種類（sourceRef.sourceKind）": (draft, form) => mapCandidate(draft, (entry) => ({ ...entry, sourceRef: { ...entry.sourceRef, sourceKind: form } })),
  "候補の位置（sourceRef.locator）": (draft, form) => mapCandidate(draft, (entry) => ({ ...entry, sourceRef: { ...entry.sourceRef, locator: form } })),
  "項目の観測の参照（items[].observationRefs）": (draft, form) => ({ ...draft, items: draft.items.map((item, i) => (i === CONFLICT ? { ...item, observationRefs: [form, ...item.observationRefs.slice(1)] } : item)) }),
  "draft の観測の参照（observationRefs）": (draft, form) => ({ ...draft, observationRefs: [form, ...draft.observationRefs.slice(1)] }),
});
const outputsOf = (draft, form) => {
  const guidance = guide(draft);
  const selections = [createSelection(draft, { candidateRef: draft.items[CONFLICT].candidates[0].candidateRef }), createSelection(draft, { observationRef: form })];
  const wires = [ws.draftToC02Wire(draft), ...selections.map((selection) => (selection.selection ? ws.selectionToC02Wire(selection.selection) : selection))];
  return [guidance, ...selections, ...wires];
};

test("M17+ 手で作った draft（位置・出典の種類・観測の参照の 4 か所）: (a)〜(e) の 5 つの形の全部が、案内・選択・wire のどれにも写らない", () => {
  let checked = 0;
  for (const [spot, put] of Object.entries(SPOTS)) {
    for (const column of COLUMNS) {
      for (const form of variants(SHAPES[column])) {
        const draft = put(BASE, form);
        for (const output of outputsOf(draft, form)) assert.equal(absent(SHAPES[column], output), true, `${spot} ${column} ${form}`);
        checked += 1;
      }
    }
  }
  assert.equal(checked, Object.keys(SPOTS).length * COLUMNS.length * 4); // 4 か所 × 5 列 × 4 つの形
});

test("M17+ 手で作った draft の対照: 読める位置・種類・参照なら案内は built になる（上の試験が全部断るだけで通っていない）", () => {
  for (const [spot, put] of Object.entries(SPOTS)) {
    const readable = put(BASE, spot.includes("種類") ? "sds_pin" : "readable-place.json");
    assert.equal(guide(readable).status, "built", spot);
    assert.equal(ws.draftToC02Wire(readable).status, "converted", spot);
  }
  assert.equal(ws.draftToC02Wire(BASE).status, "converted");
});
