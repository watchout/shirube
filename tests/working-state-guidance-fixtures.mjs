// U2 質問と案内（LC4。BR4・BR7）の試験が共有する入力の作り方（架空の値だけ）。
// 名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する。
import assert from "node:assert/strict";
import * as ws from "../scripts/working-state/index.mjs";
import { TARGET, goodReads, probeRead } from "./working-state-fixtures.mjs";
import { CATALOG, observeWith, withContent } from "./working-state-answer-fixtures.mjs";
import { builtDraft } from "./working-state-draft-fixtures.mjs";

export const INITIAL = ws.INITIAL_CATALOG;
export const GATE_FAIL = Object.freeze({ outcome: "FAIL", reasons: ["TARGET_MISMATCH", "INPUT_UNOBSERVABLE"] });

// 項目の状態（LC3 の出力）を直接組んだ draft。案内は draft の items・targetRef・observationRefs だけを読む。
export const handDraft = (items, over = {}) => ({ draftId: "draft-1", targetRef: TARGET, items, observationRefs: ["obs-1", "obs-2"], ...over });
export const unobservableItem = (itemKey, ...causes) => ({ itemKey, state: "unobservable", unobservableCauses: causes, observationRefs: [] });

export const draftOf = (catalog, observed, answers = []) => builtDraft({ catalog, observedItems: observed.items, answers });
export const guide = (draft, options = {}) => ws.buildGuidance({ draft, catalog: CATALOG, ...options });
export function guided(draft, options) {
  const result = guide(draft, options);
  assert.equal(result.status, "built");
  return result;
}

// 初期の項目一覧（sds_commit は利用者が答えられない）で、sds_commit が不足、node が未導入（観測不能）の入力。設定 A 不足・権限 B 観測不能の形。
const emptyPin = JSON.stringify({ schema: "sds-pin/1", kit_version: "0.1.0", protected_paths: [".github/workflows/**"] });
export function initialAbObserved() {
  const reads = withContent(withContent(goodReads(), "sds_pin", emptyPin), "workflow_caller", "name: sample\njobs: {}\n");
  return observeWith(INITIAL, reads.map((read) => (read.locator === "node" ? probeRead("node", "", { launch: "not_found", dropped: { count: 0, kinds: [] } }) : read)));
}
export const itemIn = (draft, itemKey) => draft.items.find((item) => item.itemKey === itemKey);
