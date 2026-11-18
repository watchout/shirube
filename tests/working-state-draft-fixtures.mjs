// U2 draft・選択・wire（LC5。BR8.1〜BR8.5）の試験が共有する入力の作り方（架空の値だけ）。
// 名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する。
import assert from "node:assert/strict";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_B, TARGET, callerText, goodReads, pinText } from "./working-state-fixtures.mjs";
import { CATALOG, observeWith, withContent } from "./working-state-answer-fixtures.mjs";

export const DRAFT_ID = "draft-1";
export const SELECTION_ID = "selection-1";
export const PIN_CANDIDATE = "sds_commit@sds_pin:.shirube/sds-pin.json";
export const GUIDANCE_TEXT = "出典が食い違っています。どちらを採るかを選んでください。";

// 契約が許さない「効果・許可」の欄の名前（BR8.1・BR8.4）。出力の欄の名前に現れてはならない。
export const EFFECT_KEYS = ["explicitStart", "requestId", "idempotencyKey", "permission", "approval", "authorization", "effect"];

export const buildInput = (over = {}) => ({ draftId: DRAFT_ID, targetRef: TARGET, catalog: CATALOG, observedItems: observeWith().items, answers: [], ...over });
export const buildDraft = (over) => ws.buildDraft(buildInput(over));
export function builtDraft(over) {
  const result = buildDraft(over);
  assert.equal(result.status, "built");
  return result.draft;
}

// sds_commit が pin と workflow_caller で食い違う観測（値のある候補が 2 つ）。
export const conflictObserved = () => observeWith(CATALOG, withContent(goodReads(), "workflow_caller", callerText(OID_B)));
// pin には無く workflow_caller にはある（値のある候補 1 つと、無い候補 1 つ）。
export const absentConflictObserved = () => observeWith(CATALOG, withContent(goodReads(), "sds_pin", JSON.stringify({ schema: "sds-pin/1", kit_version: "0.1.0", protected_paths: ["a"] })));
// pin にも workflow_caller にも無い（missing）。
export const allAbsentObserved = () => observeWith(CATALOG, withContent(withContent(goodReads(), "sds_pin", JSON.stringify({ schema: "sds-pin/1", kit_version: "0.1.0" })), "workflow_caller", "name: sample\njobs: {}\n"));
// pin の中身だけが変わる（参照名は同じ）。
export const pinChangedObserved = () => observeWith(CATALOG, withContent(goodReads(), "sds_pin", pinText({ sds_commit: OID_B })));

export const guidanceOf = (over = {}) => ({
  targetRef: TARGET,
  conclusion: "sds_commit の出典が食い違っています。",
  nextAction: { kind: "choose-source", text: "どちらかの出典を選んでください。" },
  causes: [],
  unconfirmed: [],
  reasons: [],
  observationRefs: [],
  blocking: true,
  text: GUIDANCE_TEXT,
  ...over,
});

export function selectionInput(draft, over = {}) {
  return { selectionId: SELECTION_ID, draft, catalog: CATALOG, candidateRef: PIN_CANDIDATE, observationRef: draft.observationRefs[0], guidance: guidanceOf(), ...over };
}
export const createSelection = (draft, over) => ws.createSelection(selectionInput(draft, over));
export function createdSelection(draft, over) {
  const result = createSelection(draft, over);
  assert.equal(result.status, "created");
  return result.selection;
}

// 値の中に出てくる欄の名前を全部集める（配列の中も、入れ子の中も）。
export function keysDeep(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((element) => keysDeep(element, found));
  else if (typeof value === "object" && value !== null) {
    for (const [key, inner] of Object.entries(value)) keysDeep(inner, found.add(key));
  }
  return found;
}
