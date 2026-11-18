// 入力の欄の表（draft と案内の入口 buildDraft・buildGuidance）の行のデータ。draft の入力の欄・案内の入力（手で作れる draft・項目一覧・門の結果）の欄を 1 欄 1 行にする。
// 欄の種類: A = 閉じた一覧、B = 固定の形、C = 唯一の門を通す文字列、U = 読まない欄。
import * as ws from "../scripts/working-state/index.mjs";
import { TARGET } from "./working-state-fixtures.mjs";
import { CATALOG, NOTE_ITEM, answerInput, send } from "./working-state-answer-fixtures.mjs";
import { buildInput, builtDraft } from "./working-state-draft-fixtures.mjs";
import { GATE_FAIL } from "./working-state-guidance-fixtures.mjs";
import { LEAK_UPPER, cloneWith, getIn, json } from "./working-state-field-fixtures.mjs";
import { BASES } from "./working-state-field-rows-units.mjs";

const PRIOR = send(answerInput({ answerId: "ans-0", itemKey: "note_text", value: "hello" })).answers[0];
const indexOf = (draft, itemKey) => draft.items.findIndex((item) => item.itemKey === itemKey);
const draftOf = (given) => builtDraft({ catalog: given.catalog, observedItems: given.units });
const DRAFTS = { closed: draftOf(BASES.closed), open: draftOf(BASES.open), invalid: draftOf(BASES.invalid), differs: draftOf(BASES.differs), unavailable: draftOf(BASES.unavailable) };

const built = (r) => r.status === "built";
const refusedInput = (r) => r.status === "refused" && r.reason === "invalid_input";
const fixedForm = (r) => built(r) || refusedInput(r);

// buildDraft の入力の欄。
const BD = (id, field, cls, check, legit, run, refused, extra) => ({ id, entry: "buildDraft", field, cls, check, legit, run, ok: (r) => built(r), refused, ...extra });
const draftWith = (over) => ws.buildDraft(buildInput(over));
const catalogOf = (over) => CATALOG.map((entry) => (entry.itemKey === "aidlc_settings" ? { ...entry, ...over } : entry));
const BASE_ANSWERS = json(draftWith({ answers: [PRIOR] }));
const ANSWER_KEYS = [["answerId", "C", "isReadableAnswer（isRefId）"], ["itemKey", "C", "isReadableAnswer（isItemKeyText）"], ["kind", "A", "isReadableAnswer（KINDS）"], ["value", "C", "hasReadableValue（rejectionReasonOf）"], ["valueDigest", "B", "isReadableAnswer（DIGEST_RE）"],
  ["selectedCandidateRef", "C", "isReadableAnswer（isRefText）"], ["boundObservationDigest", "B", "isReadableAnswer（DIGEST_RE）"], ["answeredAt", "B", "isReadableAnswer（parseInstant）"], ["state", "A", "isReadableAnswer（ANSWER_STATES）"], ["rejectionReason", "A", "isReadableAnswer（REJECTION_REASONS）"]];

const buildRows = [
  BD("BD.draftId", "draftId", "C", "isRefId", "draft-1", (v) => draftWith({ draftId: v }), refusedInput),
  BD("BD.targetRef", "targetRef", "C", "isRefName", TARGET, (v) => draftWith({ targetRef: v, observedItems: [] }), refusedInput),
  BD("BD.catalog.itemKey", "catalog[].itemKey", "C", "isReadableCatalogItem", "extra_note", (v) => draftWith({ catalog: [...CATALOG, { ...NOTE_ITEM, itemKey: v }] }), refusedInput),
  ...[["valueType", "A", "list"], ["normalization", "A", "exact"], ["elementShape", "A", "setting-pair"], ["userAnswerable", "A", true]].map(([key, cls, legit]) => BD(`BD.catalog.${key}`, `catalog[].${key}`, cls, "比べるだけ（FORMATS・NORMALIZATIONS・ELEMENT_SHAPES）", legit, (v) => draftWith({ catalog: catalogOf({ [key]: v }) }), fixedForm)),
  BD("BD.catalog.sources.kind", "catalog[].sources[].kind", "A", "isReadableCatalogItem（SOURCE_KINDS）", "aidlc_settings", (v) => draftWith({ catalog: catalogOf({ sources: [{ kind: v, requiredForConfirmed: true, targetBinding: "by-location" }] }) }), refusedInput),
  BD("BD.catalog.sources.required", "catalog[].sources[].requiredForConfirmed", "A", "isRequiredSource", true, (v) => draftWith({ catalog: catalogOf({ sources: [{ kind: "aidlc_settings", requiredForConfirmed: v, targetBinding: "by-location" }] }) }), fixedForm),
  BD("BD.catalog.sources.binding", "catalog[].sources[].targetBinding", "A", "targetBindingOf", "by-location", (v) => draftWith({ catalog: catalogOf({ sources: [{ kind: "aidlc_settings", requiredForConfirmed: true, targetBinding: v }] }) }), fixedForm),
  ...ANSWER_KEYS.map(([key, cls, check]) => BD(`BD.answers.${key}`, `answers[].${key}`, cls, check, getIn(PRIOR, [key]), (v) => draftWith({ answers: [cloneWith(PRIOR, [key], v)] }), refusedInput, { ok: (r) => json(r) === BASE_ANSWERS })),
  BD("BD.answers.extra", "answers[]（知らない欄の名前）", "A", "isReadableAnswer（ANSWER_KEYS）", "kind", (v) => draftWith({ answers: [v === "kind" ? PRIOR : { ...PRIOR, [v]: 1 }] }), refusedInput),
  BD("BD.answers.entry", "answers[]（object でない件）", "B", "isReadableAnswer（object だけ）", PRIOR, (v) => draftWith({ answers: [v] }), refusedInput),
  BD("BD.list.catalog", "catalog（配列でない）", "B", "Array.isArray", CATALOG, (v) => draftWith({ catalog: v }), refusedInput),
  BD("BD.list.answers", "answers（配列でない）", "B", "Array.isArray", [], (v) => draftWith({ answers: v }), refusedInput),
  BD("BD.input", "入力の全体（object でない）", "B", "typeof input", buildInput(), (v) => ws.buildDraft(v), refusedInput),
];

// buildGuidance の入力の欄。draft は buildDraft の結果でなくても手で作れる。
const guideWith = (draft, over = {}) => ws.buildGuidance({ draft, catalog: CATALOG, conformance: GATE_FAIL, ...over });
const GU = (id, field, cls, check, source, path, refused, extra = {}) => {
  const draft = DRAFTS[source];
  const legit = getIn(draft, path);
  const bj = json(guideWith(draft));
  return { id, entry: "buildGuidance", field, cls, check, legit, run: (v) => guideWith(cloneWith(draft, path, v)), ok: (r) => json(r) === bj, refused, ...extra };
};
const itemPath = (source, itemKey, ...rest) => ["items", indexOf(DRAFTS[source], itemKey), ...rest];
const conflictAt = (...rest) => itemPath("closed", "sds_commit", "candidates", 0, ...rest);
const openAt = (...rest) => itemPath("open", "aidlc_settings", "candidates", 1, ...rest);
const SHOWN = (r) => built(r);

const guidanceRows = [
  GU("GU.draft.targetRef", "draft.targetRef", "C", "isRefName", "closed", ["targetRef"], refusedInput),
  GU("GU.draft.observationRefs", "draft.observationRefs[]", "C", "isShowableRef", "closed", ["observationRefs", 0], SHOWN),
  GU("GU.item.itemKey", "draft.items[].itemKey", "C", "isItemName", "closed", itemPath("closed", "sds_commit", "itemKey"), refusedInput),
  GU("GU.item.state", "draft.items[].state", "A", "ITEM_STATES", "closed", itemPath("closed", "sds_commit", "state"), refusedInput),
  GU("GU.item.answerRef", "draft.items[].answerRef", "A", "!== undefined だけ", "closed", itemPath("closed", "sds_commit", "answerRef"), SHOWN),
  GU("GU.cand.sourceKind", "draft.items[].candidates[].sourceRef.sourceKind", "C", "isShowableName", "closed", conflictAt("sourceRef", "sourceKind"), SHOWN),
  GU("GU.cand.locator", "draft.items[].candidates[].sourceRef.locator", "C", "isShowableName", "closed", conflictAt("sourceRef", "locator"), SHOWN),
  GU("GU.cand.presence", "draft.items[].candidates[].presence", "A", "=== absent だけ", "closed", conflictAt("presence"), SHOWN),
  GU("GU.cand.displayValue", "draft.items[].candidates[].displayValue", "C", "shownValueOf（classifyValue）", "closed", conflictAt("displayValue"), SHOWN),
  GU("GU.cand.candidateRef", "draft.items[].candidates[].candidateRef", "C", "isShowableRef（質問の候補の参照）", "closed", conflictAt("candidateRef"), SHOWN),
  GU("GU.cand.lengthBucket", "draft.items[].candidates[].lengthBucket", "A", "isLengthBucket", "open", openAt("lengthBucket"), SHOWN),
  GU("GU.cand.matchGroup", "draft.items[].candidates[].matchGroup", "B", "Number.isInteger", "open", openAt("matchGroup"), SHOWN),
  GU("GU.invalid.sourceKind", "draft.items[].invalidSources[].sourceRef.sourceKind", "C", "isShowableName", "invalid", itemPath("invalid", "sds_commit", "invalidSources", 0, "sourceRef", "sourceKind"), SHOWN),
  GU("GU.invalid.locator", "draft.items[].invalidSources[].sourceRef.locator", "C", "isShowableName", "invalid", itemPath("invalid", "sds_commit", "invalidSources", 0, "sourceRef", "locator"), SHOWN),
  GU("GU.invalid.withheld", "draft.items[].invalidSources[].withheld", "A", "=== secret_like だけ", "invalid", itemPath("invalid", "sds_commit", "invalidSources", 0, "withheld"), SHOWN),
  GU("GU.wrong.namedTarget", "draft.items[].wrongTargets[].namedTarget", "C", "isShowableName", "differs", itemPath("differs", "sds_commit", "wrongTargets", 0, "namedTarget"), SHOWN),
  GU("GU.wrong.sourceKind", "draft.items[].wrongTargets[].sourceRef.sourceKind", "U", "読まない", "differs", itemPath("differs", "sds_commit", "wrongTargets", 0, "sourceRef", "sourceKind"), SHOWN),
  GU("GU.cause", "draft.items[].unobservableCauses[]", "A", "isKnownCause", "unavailable", itemPath("unavailable", "sds_commit", "unobservableCauses", 0), SHOWN),
  GU("GU.item.observationRefs", "draft.items[].observationRefs[]", "U", "読まない", "closed", itemPath("closed", "sds_commit", "observationRefs", 0), SHOWN),
].map((r) => (r.cls === "U" ? { ...r, cls: "A" } : r));

const withInput = (over) => (v) => guideWith(DRAFTS.closed, over(v));
const GC = (id, field, cls, check, legit, over, refused) => ({ id, entry: "buildGuidance", field, cls, check, legit, run: withInput(over), ok: (r) => json(r) === json(guideWith(DRAFTS.closed)), refused });
const catalogEdit = (patch) => (v) => ({ catalog: CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? { ...entry, ...patch(v) } : entry)) });
const inputRows = [
  GC("GU.catalog.itemKey", "catalog[].itemKey", "C", "entryOf（比べるだけ）", "sds_commit", catalogEdit((v) => ({ itemKey: v })), SHOWN),
  GC("GU.catalog.valueType", "catalog[].valueType", "A", "FORMATS（未知は開いた形）", "commit-oid", catalogEdit((v) => ({ valueType: v })), SHOWN),
  GC("GU.catalog.userAnswerable", "catalog[].userAnswerable", "A", "=== true だけ", true, catalogEdit((v) => ({ userAnswerable: v })), SHOWN),
  GC("GU.catalog.sources.kind", "catalog[].sources[].kind", "A", "=== tool_probe だけ", "sds_pin", catalogEdit((v) => ({ sources: [{ kind: v }] })), SHOWN),
  GC("GU.conformance.outcome", "conformance.outcome", "A", "OUTCOMES", "FAIL", (v) => ({ conformance: { ...GATE_FAIL, outcome: v } }), SHOWN),
  { ...GC("GU.conformance.reasons", "conformance.reasons[]", "C", "conformanceOf（isItemKeyText）", GATE_FAIL.reasons, (v) => ({ conformance: { outcome: "FAIL", reasons: Array.isArray(v) ? v : [GATE_FAIL.reasons[0], v] } }), SHOWN), leak: LEAK_UPPER },
  GC("GU.conformance.extra", "conformance（知らない欄）", "A", "読まない", "outcome", (v) => ({ conformance: v === "outcome" ? GATE_FAIL : { ...GATE_FAIL, [v]: 1 } }), SHOWN),
  GC("GU.conformance.list", "conformance.reasons（配列でない）", "B", "Array.isArray", GATE_FAIL.reasons, (v) => ({ conformance: { outcome: "FAIL", reasons: v } }), SHOWN),
  GC("GU.catalog.list", "catalog（配列でない）", "B", "Array.isArray", CATALOG, (v) => ({ catalog: v }), refusedInput),
  GC("GU.input", "入力の全体（object でない）", "B", "isObject", {}, (v) => (typeof v === "string" ? v : {}), refusedInput),
];
inputRows[inputRows.length - 1].run = (v) => ws.buildGuidance(typeof v === "string" ? v : { draft: DRAFTS.closed, catalog: CATALOG, conformance: GATE_FAIL });
inputRows[inputRows.length - 1].ok = (r) => built(r);

export const DRAFT_ROWS = [...buildRows, ...guidanceRows, ...inputRows];
