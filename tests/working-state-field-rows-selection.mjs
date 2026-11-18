// 入力の欄の表（選択 createSelection と C02 の wire 変換 draftToC02Wire・selectionToC02Wire）の行のデータ。手で作れる draft・案内・選択の欄を 1 欄 1 行にする。
// 欄の種類: A = 閉じた一覧、B = 固定の形、C = 唯一の門を通す文字列、U = 読まない欄。
import * as ws from "../scripts/working-state/index.mjs";
import { CATALOG } from "./working-state-answer-fixtures.mjs";
import { PIN_CANDIDATE, builtDraft, conflictObserved, createSelection, createdSelection, guidanceOf } from "./working-state-draft-fixtures.mjs";
import { answerInput, send } from "./working-state-answer-fixtures.mjs";
import { cloneWith, getIn, json } from "./working-state-field-fixtures.mjs";

const PRIOR = send(answerInput({ answerId: "ans-0", itemKey: "note_text", value: "hello" })).answers[0];
const DRAFT = builtDraft({ observedItems: conflictObserved().items, answers: [PRIOR] });
const SELECTION = createdSelection(DRAFT);

const created = (r) => r.status === "created";
const refusedSel = (r) => r.status === "refused" && r.selection === null;
const BASE_SEL = json(createSelection(DRAFT));
const CS = (id, field, cls, check, legit, run, refused, extra = {}) => ({ id, entry: "createSelection", field, cls, check, legit, run, ok: (r) => json(r) === BASE_SEL, refused, ...extra });
const withDraft = (path, v) => createSelection(cloneWith(DRAFT, path, v));
const candidatePath = ["items", DRAFT.items.findIndex((item) => item.itemKey === "sds_commit"), "candidates", 0, "candidateRef"];

// 選択の入力の欄（draft・catalog・参照）。
const inputRows = [
  CS("CS.selectionId", "selectionId", "C", "isRefId", "selection-1", (v) => createSelection(DRAFT, { selectionId: v }), refusedSel),
  CS("CS.draft.draftId", "draft.draftId", "C", "isRefId", DRAFT.draftId, (v) => withDraft(["draftId"], v), refusedSel),
  CS("CS.draft.targetRef", "draft.targetRef", "C", "isRefName", DRAFT.targetRef, (v) => withDraft(["targetRef"], v), refusedSel),
  CS("CS.draft.observationDigest", "draft.observationDigest", "B", "DIGEST_RE（未指定は可）", DRAFT.observationDigest, (v) => withDraft(["observationDigest"], v), refusedSel),
  CS("CS.draft.observationRefs", "draft.observationRefs[]（と observationRef）", "C", "isRefName", DRAFT.observationRefs[0], (v) => createSelection({ ...DRAFT, observationRefs: [v] }, { observationRef: v }), refusedSel),
  CS("CS.candidateRef", "candidateRef（と draft の候補の参照）", "C", "isRefName", PIN_CANDIDATE, (v) => createSelection(cloneWith(DRAFT, candidatePath, v), { candidateRef: v }), refusedSel),
  CS("CS.observationRef", "observationRef", "C", "isRefName", DRAFT.observationRefs[0], (v) => createSelection(cloneWith(DRAFT, ["observationRefs", 0], v), { observationRef: v }), refusedSel),
  CS("CS.draft.itemKey", "draft.items[].itemKey", "C", "isItemKeyText", "sds_commit", (v) => createSelection({ ...DRAFT, items: DRAFT.items.map((item) => (item.itemKey === "sds_commit" ? { ...item, itemKey: v } : item)) }, { catalog: CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? { ...entry, itemKey: v } : entry)) }), refusedSel),
  CS("CS.draft.displayValue", "draft.items[].candidates[].displayValue", "A", "読まない", getIn(DRAFT, candidatePath.slice(0, -1).concat("displayValue")), (v) => withDraft(candidatePath.slice(0, -1).concat("displayValue"), v), created),
  CS("CS.catalog.itemKey", "catalog[].itemKey", "C", "比べるだけ", "sds_commit", (v) => createSelection(DRAFT, { catalog: [...CATALOG, { itemKey: v, valueType: "string", sources: [] }] }), created),
  CS("CS.catalog.valueType", "catalog[].valueType", "A", "valueFormOf", "commit-oid", (v) => createSelection(DRAFT, { catalog: CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? { ...entry, valueType: v } : entry)) }), (r) => created(r) || refusedSel(r)),
  CS("CS.catalog.userAnswerable", "catalog[].userAnswerable", "A", "=== true だけ", true, (v) => createSelection(DRAFT, { catalog: CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? { ...entry, userAnswerable: v } : entry)) }), (r) => created(r) || refusedSel(r)),
  CS("CS.draft.list", "draft.items（配列でない）", "B", "Array.isArray", DRAFT.items, (v) => createSelection({ ...DRAFT, items: v }), refusedSel),
  CS("CS.input", "入力の全体（object でない）", "B", "wellFormed", {}, (v) => (typeof v === "string" ? ws.createSelection(v) : createSelection(DRAFT)), refusedSel),
];

// 案内の構造体（E05）の欄。写る欄は構造体を歩く門（読める文だけ）を通す。知らない欄は持たない。
const guidanceWith = (patch) => createSelection(DRAFT, { guidance: guidanceOf(patch) });
const elem = (v) => (Array.isArray(v) ? v : [v]);
const GUIDANCE_FIELDS = [
  ["targetRef", "C", guidanceOf().targetRef, (v) => ({ targetRef: v })],
  ["conclusion", "C", guidanceOf().conclusion, (v) => ({ conclusion: v })],
  ["nextAction.kind", "A", guidanceOf().nextAction.kind, (v) => ({ nextAction: { ...guidanceOf().nextAction, kind: v } })],
  ["nextAction.text", "C", guidanceOf().nextAction.text, (v) => ({ nextAction: { ...guidanceOf().nextAction, text: v } })],
  ["nextAction（入れ子の欄の名前）", "A", "kind", (v) => ({ nextAction: v === "kind" ? guidanceOf().nextAction : { ...guidanceOf().nextAction, [v]: 1 } })],
  ["causes[]", "C", [], (v) => ({ causes: elem(v) })],
  ["causes[].itemKey", "C", [], (v) => ({ causes: Array.isArray(v) ? v : [{ itemKey: v, state: "missing" }] })],
  ["unconfirmed[]", "C", [], (v) => ({ unconfirmed: elem(v) })],
  ["reasons[]", "C", [], (v) => ({ reasons: elem(v) })],
  ["observationRefs[]", "C", [], (v) => ({ observationRefs: elem(v) })],
  ["blocking", "A", true, (v) => ({ blocking: v })],
  ["text", "C", guidanceOf().text, (v) => ({ text: v })],
];
const guidanceRows = GUIDANCE_FIELDS.map(([name, cls, legit, patch]) => CS(`CS.guidance.${name}`, `guidance.${name}`, cls, "guidanceCopy（構造体を歩く門）", legit, (v) => guidanceWith(patch(v)), (r) => refusedSel(r) && r.reason === "invalid_guidance"));
const guidanceMisc = [
  CS("CS.guidance.extra", "guidance（知らない欄）", "A", "GUIDANCE_KEYS（持たない）", "text", (v) => createSelection(DRAFT, { guidance: v === "text" ? guidanceOf() : { ...guidanceOf(), [v]: 1 } }), created),
  CS("CS.guidance.input", "guidance（object でない）", "B", "isObject", guidanceOf(), (v) => createSelection(DRAFT, { guidance: v }), (r) => refusedSel(r) && r.reason === "invalid_guidance"),
];

// C02 の wire。draftToC02Wire は draft の写す欄と答えの列、selectionToC02Wire は選択の写す欄と案内の text を渡す。
const BASE_WIRE = json(ws.draftToC02Wire(DRAFT));
const wireDraft = (path, v) => ws.draftToC02Wire(cloneWith(DRAFT, path, v));
const wiredOk = (r) => r.status === "converted";
const wireRefused = (r) => r.status === "refused" && r.wire === null;
const DW = (id, field, cls, check, legit, run, refused = wireRefused) => ({ id, entry: "draftToC02Wire", field, cls, check, legit, run, ok: (r) => json(r) === BASE_WIRE, refused });
const answerIdx = DRAFT.answers.findIndex((answer) => answer.state === "answered");
const answerAt = (key) => ["answers", answerIdx, key];
const draftWireRows = [
  DW("DW.draftId", "draftId", "C", "isRefId", DRAFT.draftId, (v) => wireDraft(["draftId"], v)),
  DW("DW.targetRef", "targetRef", "C", "isRefName", DRAFT.targetRef, (v) => wireDraft(["targetRef"], v)),
  DW("DW.missingItems", "missingItems[]", "C", "isItemKeyText", DRAFT.missingItems, (v) => ws.draftToC02Wire({ ...DRAFT, missingItems: elem(v) })),
  DW("DW.conflicts", "conflicts[]", "C", "isItemKeyText", DRAFT.conflicts, (v) => ws.draftToC02Wire({ ...DRAFT, conflicts: elem(v) })),
  DW("DW.observationRefs", "observationRefs[]", "C", "isRefName", DRAFT.observationRefs, (v) => ws.draftToC02Wire({ ...DRAFT, observationRefs: elem(v) })),
  DW("DW.answers.answerId", "answers[].answerId", "C", "isRefId", getIn(DRAFT, answerAt("answerId")), (v) => wireDraft(answerAt("answerId"), v)),
  DW("DW.answers.itemKey", "answers[].itemKey", "C", "isItemKeyText", getIn(DRAFT, answerAt("itemKey")), (v) => wireDraft(answerAt("itemKey"), v)),
  DW("DW.answers.kind", "answers[].kind", "A", "kind の閉じた一覧", getIn(DRAFT, answerAt("kind")), (v) => wireDraft(answerAt("kind"), v)),
  DW("DW.answers.value", "answers[].value", "C", "union 門（isWireValue）", getIn(DRAFT, answerAt("value")), (v) => wireDraft(answerAt("value"), v)),
  DW("DW.answers.value.list", "answers[].value（list の要素）", "C", "union 門（isWireValue）", getIn(DRAFT, answerAt("value")), (v) => wireDraft(answerAt("value"), v === "hello" ? v : [v])),
  DW("DW.answers.selectedCandidateRef", "answers[].selectedCandidateRef", "C", "isRefName", undefined, (v) => wireDraft(answerAt("selectedCandidateRef"), v)),
  DW("DW.answers.state", "answers[].state", "A", "=== answered だけ", getIn(DRAFT, answerAt("state")), (v) => wireDraft(answerAt("state"), v), (r) => wiredOk(r) && !r.wire.answers.note_text),
  DW("DW.answers.list", "answers（配列でない）", "B", "Array.isArray", DRAFT.answers, (v) => ws.draftToC02Wire({ ...DRAFT, answers: v })),
  DW("DW.draft", "draft（object でない）", "B", "destructure", DRAFT, (v) => ws.draftToC02Wire(v)),
  ...["items", "draftDigest", "observationDigest", "observationFacts", "unknownItemKeys"].map((key) => DW(`DW.${key}`, key, "A", "読まない（wire に渡らない）", getIn(DRAFT, [key]), (v) => wireDraft([key], v), wiredOk)),
];

const BASE_SEL_WIRE = json(ws.selectionToC02Wire(SELECTION));
const SW = (id, field, cls, check, legit, run, refused = wireRefused) => ({ id, entry: "selectionToC02Wire", field, cls, check, legit, run, ok: (r) => json(r) === BASE_SEL_WIRE, refused });
const wireSel = (path, v) => ws.selectionToC02Wire(cloneWith(SELECTION, path, v));
const selectionWireRows = [
  ...["selectionId", "draftRef", "candidateRef", "targetRef", "observationRef"].map((key) => SW(`SW.${key}`, key, "C", key === "selectionId" ? "isRefId" : "isRefName", SELECTION[key], (v) => wireSel([key], v))),
  SW("SW.guidance.text", "guidance.text", "C", "読める文の門（isReadableText）", SELECTION.guidance.text, (v) => wireSel(["guidance", "text"], v)),
  ...["conclusion", "targetRef"].map((key) => SW(`SW.guidance.${key}`, `guidance.${key}`, "A", "読まない（wire は guidance.text だけ写す）", SELECTION.guidance[key], (v) => wireSel(["guidance", key], v), wiredOk)),
  SW("SW.guidance.nextAction", "guidance.nextAction.text", "A", "読まない（wire は guidance.text だけ写す）", SELECTION.guidance.nextAction.text, (v) => wireSel(["guidance", "nextAction", "text"], v), wiredOk),
  SW("SW.guidance.reasons", "guidance.reasons[]", "A", "読まない（wire は guidance.text だけ写す）", SELECTION.guidance.reasons, (v) => wireSel(["guidance", "reasons"], elem(v)), wiredOk),
  SW("SW.guidance.causes", "guidance.causes[]", "A", "読まない（wire は guidance.text だけ写す）", SELECTION.guidance.causes, (v) => wireSel(["guidance", "causes"], elem(v)), wiredOk),
  SW("SW.digest", "draftObservationDigest", "U", "読まない（wire に渡らない）", SELECTION.draftObservationDigest, (v) => wireSel(["draftObservationDigest"], v), (r) => r.status === "converted"),
  SW("SW.selection", "selection（object でない）", "B", "destructure", SELECTION, (v) => ws.selectionToC02Wire(v)),
].map((r) => (r.cls === "U" ? { ...r, cls: "A" } : r));

export const SELECTION_ROWS = [...inputRows, ...guidanceRows, ...guidanceMisc, ...draftWireRows, ...selectionWireRows];
