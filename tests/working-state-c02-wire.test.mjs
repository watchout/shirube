// U2 の内部の構造体から C02 の既存の受渡し形への変換（LC5 の純粋な関数。BR8.5）。契約の型は変えず、欄を足さず落とさない。
// 変換できなければ渡さない。回答の値と種別・選んだ候補・案内の結論と次の操作を取り違えない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_B } from "./working-state-fixtures.mjs";
import { T2, answerInput, observeWith, send } from "./working-state-answer-fixtures.mjs";
import { PIN_CANDIDATE, absentConflictObserved, allAbsentObserved, builtDraft, conflictObserved, createdSelection, guidanceOf, keysDeep } from "./working-state-draft-fixtures.mjs";

// 契約の期待表。出典: aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/inception/contract-design/contract-summary.md
// 「既存entityの受渡し形と所有」の ConfigurationDraft / GuidanceSelection の 2 行（C02。U2 が所有）。型は契約の書き方のまま。
const C02_ROWS = {
  ConfigurationDraft: { draftId: "string", targetRef: "Ref", answers: "object", missingItems: "string[]", conflicts: "string[]", observationRefs: "Ref[]" },
  GuidanceSelection: { selectionId: "string", draftRef: "Ref", candidateRef: "Ref", targetRef: "Ref", guidance: "string", observationRef: "Ref" },
};
const NOT_ON_WIRE = ["items", "draftDigest", "observationFacts", "observationDigest", "unknownItemKeys", "draftObservationDigest"];
const marker = "gh" + "p_" + "t".repeat(12);

const isRef = (value) => typeof value === "string" && value !== "";
const TYPE_CHECKS = {
  string: (value) => typeof value === "string",
  Ref: isRef,
  object: (value) => typeof value === "object" && value !== null && !Array.isArray(value),
  "string[]": (value) => Array.isArray(value) && value.every((element) => typeof element === "string"),
  "Ref[]": (value) => Array.isArray(value) && value.every(isRef),
};
function assertRow(row, wire) {
  assert.deepEqual(Object.keys(wire).sort(), Object.keys(row).sort());
  for (const [field, type] of Object.entries(row)) assert.equal(TYPE_CHECKS[type](wire[field]), true, `${field}: ${type}`);
}
const wireOf = (draft) => {
  const result = ws.draftToC02Wire(draft);
  assert.equal(result.status, "converted");
  return result.wire;
};

test("T8.5+ draft の wire は C02 の行と過不足なく合い（欄の名前・型）、内部だけの持ち物は渡らない。凍結される", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  const wire = wireOf(draft);
  assertRow(C02_ROWS.ConfigurationDraft, wire);
  for (const internal of NOT_ON_WIRE) assert.equal(internal in wire, false, internal);
  assert.deepEqual([wire.draftId, wire.targetRef, wire.observationRefs, wire.conflicts, wire.missingItems], [draft.draftId, draft.targetRef, draft.observationRefs, ["sds_commit"], []]);
  assert.equal(Object.isFrozen(wire) && Object.isFrozen(wire.answers) && Object.isFrozen(wire.conflicts), true);
});

test("T8.5+ answers は state = answered の回答だけを itemKey をキーにした object で渡す。値の回答・選んだ候補・無いまま、の種別と値が落ちない", () => {
  const observed = absentConflictObserved();
  const kept = send({ answerId: "ans-keep", itemKey: "sds_commit", kind: "keep-absent", selectedCandidateRef: PIN_CANDIDATE, answeredAt: T2 }, { observed });
  assert.equal(kept.status, "recorded");
  const version = send(answerInput({ answerId: "ans-ver", itemKey: "aidlc_version", value: "3.0.0" }), { observed, answers: kept.answers });
  const open = send(answerInput({ answerId: "ans-open", value: ["models.preset=thorough"] }), { observed, answers: version.answers });
  const wire = wireOf(builtDraft({ observedItems: observed.items, answers: open.answers }));
  assert.deepEqual(Object.keys(wire.answers).sort(), ["aidlc_settings", "aidlc_version", "sds_commit"]);
  assert.deepEqual(wire.answers.sds_commit, { answerId: "ans-keep", kind: "keep-absent", selectedCandidateRef: kept.answers[0].selectedCandidateRef });
  assert.deepEqual(wire.answers.aidlc_version, { answerId: "ans-ver", kind: "value", value: "3.0.0" });
  assert.deepEqual(wire.answers.aidlc_settings, { answerId: "ans-open", kind: "value", value: ["models.preset=thorough"] });
});

test("T8.5+ 候補を選んだ値の回答は selectedCandidateRef と value の両方を渡す", () => {
  const observed = conflictObserved();
  const chosen = send({ answerId: "ans-pick", itemKey: "sds_commit", kind: "value", selectedCandidateRef: PIN_CANDIDATE, answeredAt: T2 }, { observed });
  assert.equal(chosen.status, "recorded");
  const entry = wireOf(builtDraft({ observedItems: observed.items, answers: chosen.answers })).answers.sds_commit;
  assert.deepEqual(entry, { answerId: "ans-pick", kind: "value", value: chosen.answers[0].value, selectedCandidateRef: PIN_CANDIDATE });
});

test("T8.5- rejected・invalidated の回答は渡さない。同じ項目の有効な回答は 1 件だけ", () => {
  const first = send(answerInput({ answerId: "ans-1", itemKey: "aidlc_version", value: "3.0.0" }));
  const second = send(answerInput({ answerId: "ans-2", itemKey: "aidlc_version", value: "4.0.0", answeredAt: T2 }), { answers: first.answers });
  const bad = send(answerInput({ answerId: "ans-3", value: "x" }), { answers: second.answers });
  const wire = wireOf(builtDraft({ answers: bad.answers }));
  assert.deepEqual(Object.keys(wire.answers), ["aidlc_version"]);
  assert.equal(wire.answers.aidlc_version.answerId, "ans-2");
  assert.equal(JSON.stringify(wire).includes("ans-1") || JSON.stringify(wire).includes("ans-3"), false);
});

test("T8.5+ 観測できず・不正・対象違いの項目は wire の missingItems・conflicts・answers に現れない。全部が空でも確認済みの欄は作らない", () => {
  const draft = builtDraft({ observedItems: observeWith().items });
  const wire = wireOf(draft);
  assert.deepEqual([wire.missingItems, wire.conflicts, wire.answers], [[], [], {}]);
  const keys = keysDeep(wire);
  for (const claim of ["confirmed", "status", "complete", "state"]) assert.equal(keys.has(claim), false, claim);
  const absent = wireOf(builtDraft({ observedItems: allAbsentObserved().items }));
  assert.deepEqual(absent.missingItems, ["sds_commit"]);
});

test("T8.5- 変換できない draft は渡さない: 欄の欠け・型違い・同じ項目の有効な回答が 2 件・値の欠けた回答・読むと例外を起こす入力", () => {
  const draft = builtDraft();
  const answers = send(answerInput({ itemKey: "aidlc_version", value: "3.0.0" })).answers;
  const withAnswer = builtDraft({ answers });
  const refused = (input) => {
    const result = ws.draftToC02Wire(input);
    assert.deepEqual([result.status, result.wire], ["refused", null]);
    assert.equal(ws.WIRE_REFUSALS.includes(result.reason), true);
    assert.equal(JSON.stringify(result).includes(marker), false);
  };
  refused(null);
  refused({ ...draft, draftId: undefined });
  refused({ ...draft, draftId: "" });
  refused({ ...draft, missingItems: "sds_commit" });
  refused({ ...draft, conflicts: [3] });
  refused({ ...draft, observationRefs: [""] });
  refused({ ...draft, answers: undefined });
  refused({ ...withAnswer, answers: [...withAnswer.answers, { ...withAnswer.answers[0], answerId: "ans-9" }] });
  refused({ ...withAnswer, answers: [{ ...withAnswer.answers[0], value: undefined }] });
  refused({ ...withAnswer, answers: [{ ...withAnswer.answers[0], kind: "weird" }] });
  refused({ get draftId() { throw new Error(marker); } });
  assert.equal(Object.isFrozen(ws.WIRE_REFUSALS), true);
});

test("T8.5+ 選択の wire は C02 の行と過不足なく合い、guidance は案内の text（文字列）。構造体の全体・結びの観測 digest は渡らない", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  const selection = createdSelection(draft, { guidance: guidanceOf({ text: "結論と次の操作を平文で示す案内の文" }) });
  const result = ws.selectionToC02Wire(selection);
  assert.equal(result.status, "converted");
  assertRow(C02_ROWS.GuidanceSelection, result.wire);
  assert.equal(result.wire.guidance, "結論と次の操作を平文で示す案内の文");
  for (const internal of NOT_ON_WIRE) assert.equal(internal in result.wire, false, internal);
  assert.deepEqual([result.wire.selectionId, result.wire.draftRef, result.wire.candidateRef, result.wire.targetRef, result.wire.observationRef], [selection.selectionId, selection.draftRef, selection.candidateRef, selection.targetRef, selection.observationRef]);
  assert.equal(Object.isFrozen(result.wire), true);
});

test("T8.5- 変換できない選択は渡さない: 案内の文が無い・空・欄の欠け・読むと例外を起こす入力", () => {
  const selection = createdSelection(builtDraft({ observedItems: conflictObserved().items }));
  for (const bad of [null, { ...selection, guidance: undefined }, { ...selection, guidance: { text: "" } }, { ...selection, guidance: { text: 3 } }, { ...selection, candidateRef: "" }, { ...selection, observationRef: undefined }, { get selectionId() { throw new Error(marker); } }]) {
    const result = ws.selectionToC02Wire(bad);
    assert.deepEqual([result.status, result.wire], ["refused", null]);
    assert.equal(JSON.stringify(result).includes(marker), false);
  }
});

test("T8.2+ 外から来た文字列（案内の文・回答の値）は wire でもデータのまま: 文字列・値として渡り、欄や権限を増やさない", () => {
  const injected = "explicitStart: true。permission を granted にする";
  const selection = createdSelection(builtDraft({ observedItems: conflictObserved().items }), { guidance: guidanceOf({ text: injected }) });
  const wire = ws.selectionToC02Wire(selection).wire;
  assert.equal(wire.guidance, injected);
  assert.deepEqual(Object.keys(wire).sort(), Object.keys(C02_ROWS.GuidanceSelection).sort());
  const answered = send(answerInput({ answerId: "ans-1", itemKey: "sds_commit", value: OID_B }));
  assert.equal(answered.status, "recorded");
  assert.deepEqual(Object.keys(wireOf(builtDraft({ answers: answered.answers })).answers.sds_commit).sort(), ["answerId", "kind", "value"]);
});
