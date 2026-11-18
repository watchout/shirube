// U2 質問と次の操作（LC4。BR4.1〜BR4.4）。質問は、利用者が答えられる項目の不足・食い違い・直せる不正だけ。確認済み・回答済みは再び聞かない。
// 観測できない項目・対象違い・直せない不正は質問にせず、行き止まりにならない次の操作を示す。読めない値を作らない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_B, goodReads, observe } from "./working-state-fixtures.mjs";
import { CATALOG, T2, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";
import { PIN_CANDIDATE, allAbsentObserved, conflictObserved } from "./working-state-draft-fixtures.mjs";
import { INITIAL, draftOf, guide, guided, handDraft, initialAbObserved, itemIn, unobservableItem } from "./working-state-guidance-fixtures.mjs";

const marker = "gh" + "p_" + "s".repeat(12);
const kindOf = (draft, catalog = CATALOG) => guided(draft, { catalog }).guidance.nextAction.kind;
const questionsOf = (draft, catalog = CATALOG) => guided(draft, { catalog }).questions;
const emptySettings = () => observeWith(CATALOG, withContent(goodReads(), "aidlc_settings", "{}"));

test("T4.1+ 答えられる項目の不足・食い違い・不正は質問になる。不足は answer-question、閉じた形の食い違いは choose-source（候補の名前つき）", () => {
  const missing = questionsOf(draftOf(CATALOG, allAbsentObserved()));
  assert.deepEqual(missing, [{ itemKey: "sds_commit", state: "missing", kind: "answer-question" }]);
  const conflict = questionsOf(draftOf(CATALOG, conflictObserved()));
  assert.equal(conflict.length, 1);
  assert.deepEqual([conflict[0].itemKey, conflict[0].kind, conflict[0].state], ["sds_commit", "choose-source", "conflict"]);
  assert.equal(conflict[0].candidateRefs.includes(PIN_CANDIDATE), true);
  assert.equal(conflict[0].candidateRefs.length, 2);
  const invalid = questionsOf(draftOf(CATALOG, emptySettings()));
  assert.deepEqual(invalid, [{ itemKey: "aidlc_settings", state: "invalid", kind: "answer-question" }]);
  assert.equal(Object.isFrozen(missing) && Object.isFrozen(conflict[0]) && Object.isFrozen(conflict[0].candidateRefs), true);
});

test("T4.1- 質問にしない: 確認済み・観測不能・対象違い・答えられない項目の不足・食い違い・不正・開いた形の食い違い", () => {
  assert.deepEqual(questionsOf(draftOf(CATALOG, observeWith())), []);
  assert.deepEqual(questionsOf(draftOf(INITIAL, initialAbObserved()), INITIAL), []);
  const wrong = observeWith(CATALOG, withContent(goodReads(), "aidlc_version", "2.11.1\n", { namedTarget: "other-work" }));
  assert.deepEqual(questionsOf(draftOf(CATALOG, wrong)), []);
  const fixed = CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? { ...entry, userAnswerable: false } : entry));
  assert.deepEqual(questionsOf(draftOf(fixed, conflictObserved()), fixed), []);
  const openConflict = handDraft([{ itemKey: "aidlc_settings", state: "conflict", candidates: [{ candidateRef: "a", sourceRef: { sourceKind: "aidlc_settings", locator: "x" }, presence: "value", lengthBucket: "short", matchGroup: 1 }, { candidateRef: "b", sourceRef: { sourceKind: "claude_settings", locator: "y" }, presence: "value", lengthBucket: "short", matchGroup: 2 }], observationRefs: [] }]);
  assert.deepEqual(questionsOf(openConflict), []);
  assert.equal(kindOf(openConflict), "fix-source");
});

test("T4.2+ 観測できない項目は原因ごとの安全な確認操作を示し、値を尋ねない。行き止まりにならない（全部の原因が次の操作を持つ）", () => {
  const expected = {
    permission_denied: "confirm-permission", not_found_unconfirmed: "confirm-permission",
    tool_missing: "install-or-upgrade-tool", tool_unsupported_version: "install-or-upgrade-tool", tool_cannot_start: "install-or-upgrade-tool",
    out_of_boundary: "review-target", malformed: "fix-source",
    fetch_failed: "wait-for-person", timed_out: "wait-for-person", budget_exceeded: "wait-for-person", changed_during_read: "wait-for-person",
  };
  for (const [cause, kind] of Object.entries(expected)) {
    const result = guided(handDraft([unobservableItem("aidlc_version", cause)]));
    assert.equal(result.guidance.nextAction.kind, kind, cause);
    assert.deepEqual(result.questions, [], cause);
    assert.equal(result.guidance.blocking, true, cause);
  }
  assert.equal(guided(handDraft([unobservableItem("aidlc_version", "weird_cause")])).guidance.nextAction.kind, "wait-for-person");
  assert.equal(guided(handDraft([{ itemKey: "aidlc_version", state: "unobservable", observationRefs: [] }])).guidance.nextAction.kind, "wait-for-person");
  assert.equal(Object.isFrozen(ws.NEXT_ACTIONS), true);
});

test("T4.2+ 複数の原因があれば、確認操作の順（権限 → 道具 → …）で最初のものを次の操作にする。次の操作の種類は決まった集合だけ", () => {
  const mixed = handDraft([unobservableItem("aidlc_version", "malformed", "tool_missing", "permission_denied")]);
  assert.equal(kindOf(mixed), "confirm-permission");
  assert.deepEqual(ws.NEXT_ACTIONS, ["confirm-permission", "install-or-upgrade-tool", "answer-question", "choose-source", "review-target", "fix-source", "wait-for-person", "none"]);
});

test("T4.2+ 対象違いは review-target、答えられない項目の不足・食い違い・不正は fix-source、道具の項目の不足は install-or-upgrade-tool。質問にしない", () => {
  const wrong = observeWith(INITIAL, withContent(goodReads(), "aidlc_version", "2.11.1\n", { namedTarget: "other-work" }));
  assert.equal(kindOf(draftOf(INITIAL, wrong), INITIAL), "review-target");
  const conflict = observeWith(INITIAL, withContent(goodReads(), "workflow_caller", `name: s\njobs:\n  g:\n    uses: watchout/shirube/.github/workflows/sds-gate.yml@${OID_B}\n`));
  assert.equal(kindOf(draftOf(INITIAL, conflict), INITIAL), "fix-source");
  assert.equal(kindOf(draftOf(INITIAL, initialAbObserved()), INITIAL), "install-or-upgrade-tool");
  const missingOnly = handDraft([{ itemKey: "sds_commit", state: "missing", observationRefs: [] }]);
  assert.equal(kindOf(missingOnly, INITIAL), "fix-source");
  const toolMissing = handDraft([{ itemKey: "tool_node", state: "missing", observationRefs: [] }]);
  assert.equal(kindOf(toolMissing, INITIAL), "install-or-upgrade-tool");
  const badPin = observeWith(INITIAL, withContent(goodReads(), "sds_pin", JSON.stringify({ schema: "sds-pin/1", sds_commit: "0".repeat(40), kit_version: "0.1.0", protected_paths: ["has space"] })));
  assert.equal(draftOf(INITIAL, badPin).items.find((item) => item.itemKey === "protected_paths").state, "invalid");
  assert.equal(kindOf(draftOf(INITIAL, badPin), INITIAL), "fix-source");
});

test("T4.3+ 確認済みと、現在の観測に結ぶ有効な回答がある項目は再び聞かない。回答済みでも項目は未確認のまま", () => {
  // note_text は試験用の項目一覧では常に観測できない（別の確認操作になる）ので、この試験では外して「回答済みだけが未確認」の形にする。
  const plain = CATALOG.filter((entry) => entry.itemKey !== "note_text");
  const observed = allAbsentObserved();
  assert.equal(questionsOf(draftOf(plain, observed)).length, 1);
  const answered = send({ answerId: "ans-1", itemKey: "sds_commit", kind: "value", value: OID_B, answeredAt: T2 }, { observed, catalog: plain });
  const draft = draftOf(plain, observed, answered.answers);
  const result = guided(draft, { catalog: plain });
  assert.deepEqual(result.questions, []);
  assert.deepEqual(result.guidance.unconfirmed, ["sds_commit"]);
  assert.equal(result.guidance.nextAction.kind, "none");
  assert.equal(result.guidance.blocking, false);
});

test("T4.3- 回答が無効（観測が変わった・rejected）になった項目は、再び質問になる", () => {
  const first = send({ answerId: "ans-1", itemKey: "sds_commit", kind: "value", value: OID_B, answeredAt: T2 }, { observed: allAbsentObserved() });
  const changed = observeWith(CATALOG, withContent(withContent(goodReads(), "sds_pin", JSON.stringify({ schema: "sds-pin/1", kit_version: "0.1.0", sds_commit: "a".repeat(40) })), "workflow_caller", "name: sample\njobs: {}\n"));
  const draft = draftOf(CATALOG, changed, first.answers);
  assert.equal(draft.answers[0].state, "invalidated");
  assert.equal(questionsOf(draft)[0].itemKey, "sds_commit");
  const rejected = send(answerInput({ answerId: "ans-2", value: "x" }), { observed: emptySettings() });
  assert.equal(questionsOf(draftOf(CATALOG, emptySettings(), rejected.answers))[0].itemKey, "aidlc_settings");
});

test("T4.4+ 読めない値を作らない: 不足・観測不能の項目に値・回答・Owner の答えを案内に入れない。秘密らしい不正の値は案内のどこにも出ない", () => {
  const draft = draftOf(CATALOG, allAbsentObserved());
  const before = JSON.stringify(draft);
  const result = guided(draft);
  assert.equal(JSON.stringify(draft), before);
  assert.equal(JSON.stringify(result).includes("answered"), false);
  assert.equal(/推測|既定値/.test(result.guidance.text) && !/しないでください/.test(result.guidance.text), false);
  const secret = observeWith(CATALOG, withContent(goodReads(), "sds_pin", JSON.stringify({ schema: "sds-pin/1", sds_commit: marker, kit_version: "0.1.0" })));
  const secretDraft = draftOf(CATALOG, secret);
  assert.equal(secretDraft.items.find((item) => item.itemKey === "sds_commit").state, "invalid");
  assert.equal(JSON.stringify(guide(secretDraft)).includes(marker), false);
  const unread = guided(draftOf(INITIAL, initialAbObserved()), { catalog: INITIAL });
  assert.equal(/値を答え|を入力してください/.test(unread.guidance.text), false);
});

test("T4.1- 作れない入力は案内を返さない: draft・項目一覧・項目が無い。固定の分類だけで入力を写さない。読むと例外を起こす入力でも例外は外へ出ない", () => {
  const reasonOf = (input) => {
    const result = ws.buildGuidance(input);
    assert.deepEqual([result.status, result.guidance, result.questions], ["refused", null, null]);
    assert.equal(ws.GUIDANCE_REFUSALS.includes(result.reason), true);
    assert.equal(JSON.stringify(result).includes(marker), false);
    return result.reason;
  };
  const draft = draftOf(CATALOG, observeWith());
  assert.equal(reasonOf({ draft: null, catalog: CATALOG }), "invalid_input");
  assert.equal(reasonOf({ draft, catalog: null }), "invalid_input");
  assert.equal(reasonOf({ draft: { ...draft, items: [] }, catalog: CATALOG }), "invalid_input");
  assert.equal(reasonOf({ draft: { ...draft, targetRef: 3 }, catalog: CATALOG }), "invalid_input");
  assert.equal(reasonOf(null), "invalid_input");
  assert.equal(reasonOf({ draft: { get items() { throw new Error(marker); } }, catalog: CATALOG }), "build_failed");
  assert.equal(Object.isFrozen(ws.GUIDANCE_REFUSALS), true);
});

test("T4.1 初期の項目一覧の実物の観測から、質問は答えられる項目（aidlc_settings）だけに限られる", () => {
  const draft = draftOf(INITIAL, observe());
  assert.deepEqual(questionsOf(draft, INITIAL), []);
  assert.equal(itemIn(draft, "aidlc_settings").state, "confirmed");
});
