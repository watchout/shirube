// 入力の欄の表（回答の入口 receiveAnswer・reconcileAnswers）の行のデータ。入力の欄・項目一覧の欄・今までの回答の列の 1 件の欄を、1 欄 1 行にする。
// 欄の種類: A = 閉じた一覧（比べるだけ）、B = 固定の形（時刻・digest）、C = 唯一の門（文字列）。
import * as ws from "../scripts/working-state/index.mjs";
import { T1, CATALOG, NOTE_ITEM, answerInput, observeWith, send } from "./working-state-answer-fixtures.mjs";
import { PIN_CANDIDATE, conflictObserved } from "./working-state-draft-fixtures.mjs";
import { cloneWith, getIn, json } from "./working-state-field-fixtures.mjs";

const NOTE = answerInput({ answerId: "ans-0", itemKey: "note_text", value: "hello" });
const PRIOR = send(NOTE).answers[0];
const BASE_INPUT = answerInput({ answerId: "ans-1" });

const recorded = (r) => r.status === "recorded";
const unreadable = (r) => r.status === "unreadable";
const rejectedAs = (reason) => (r) => r.status === "rejected" && r.answer.rejectionReason === reason;
const fixedStatus = (r) => ["recorded", "rejected", "unreadable", "duplicate"].includes(r.status);
const row = (id, field, cls, check, legit, run, ok, refused, extra = {}) => ({ id, entry: "receiveAnswer", field, cls, check, legit, run, ok, refused, ...extra });
const on = (over, options) => send(answerInput({ answerId: "ans-1", ...over }), options);

const inputRows = [
  row("RA.answerId", "input.answerId", "C", "isRefId", "ans-1", (v) => on({ answerId: v }), recorded, unreadable),
  row("RA.input.itemKey", "input.itemKey", "C", "isItemKeyText（項目一覧に有ること）", "aidlc_settings", (v) => on({ itemKey: v }), recorded, unreadable),
  row("RA.kind", "input.kind", "A", "KINDS", "value", (v) => on({ kind: v }), recorded, rejectedAs("invalid_type")),
  row("RA.value.list", "input.value（list の値）", "C", "rejectionReasonOf（classifyValue）", ["models.preset=thorough"], (v) => on({ value: v }), recorded, (r) => r.status === "rejected"),
  row("RA.value.element", "input.value（list の要素）", "C", "rejectionReasonOf（classifyValue）", "models.preset=thorough", (v) => on({ value: [v] }), recorded, (r) => r.status === "rejected"),
  row("RA.value.string", "input.value（string の項目）", "C", "rejectionReasonOf（classifyValue）", "hello", (v) => on({ itemKey: "note_text", value: v }), recorded, (r) => r.status === "rejected"),
  row("RA.selectedCandidateRef", "input.selectedCandidateRef", "C", "chosen（候補の参照と一致した時だけ）", PIN_CANDIDATE, (v) => on({ itemKey: "sds_commit", value: undefined, selectedCandidateRef: v }, { observed: conflictObserved() }), recorded, rejectedAs("invalid_format")),
  row("RA.answeredAt", "input.answeredAt", "B", "parseInstant", T1, (v) => on({ answeredAt: v }), recorded, unreadable),
  row("RA.input", "input（object でない）", "B", "snapshot", BASE_INPUT, (v) => send(v), recorded, unreadable),
];

// 項目一覧の 1 項目の欄。項目一覧の定義は回答の検査・評価の入口で比べるだけで、結果には項目名だけが写る。
const catalogOf = (itemKey, over) => [...CATALOG.filter((entry) => entry.itemKey !== itemKey), { ...CATALOG.find((entry) => entry.itemKey === itemKey), ...over }];
const catalogField = (id, field, cls, check, legit, over) => row(id, `catalog[].${field}`, cls, check, legit, (v) => on({}, { catalog: catalogOf("aidlc_settings", over(v)) }), (r) => recorded(r) || rejectedAs("secret_like")(r), fixedStatus);
const catalogRows = [
  row("RA.catalog.itemKey", "catalog[].itemKey", "C", "isItemKeyText（入力の項目名との一致だけ）", "extra_note", (v) => send(answerInput({ answerId: "ans-1", itemKey: v, value: "hello" }), { catalog: [...CATALOG, { ...NOTE_ITEM, itemKey: v }] }), recorded, unreadable),
  catalogField("RA.catalog.valueType", "valueType", "A", "FORMATS（未知は secret_like）", "list", (v) => ({ valueType: v })),
  catalogField("RA.catalog.normalization", "normalization", "A", "normalizationOf", "exact", (v) => ({ normalization: v })),
  catalogField("RA.catalog.elementShape", "elementShape", "A", "elementShapeOf", "setting-pair", (v) => ({ elementShape: v })),
  catalogField("RA.catalog.userAnswerable", "userAnswerable", "A", "=== true だけ", true, (v) => ({ userAnswerable: v })),
  catalogField("RA.catalog.sources.kind", "sources[].kind", "A", "比べるだけ", "aidlc_settings", (v) => ({ sources: [{ kind: v, requiredForConfirmed: true, targetBinding: "by-location" }] })),
  catalogField("RA.catalog.sources.required", "sources[].requiredForConfirmed", "A", "isRequiredSource", true, (v) => ({ sources: [{ kind: "aidlc_settings", requiredForConfirmed: v, targetBinding: "by-location" }] })),
  catalogField("RA.catalog.sources.binding", "sources[].targetBinding", "A", "targetBindingOf", "by-location", (v) => ({ sources: [{ kind: "aidlc_settings", requiredForConfirmed: true, targetBinding: v }] })),
];

// 今までの回答の列の 1 件の欄（結果の answers にそのまま写る欄）。
const ANSWER_FIELDS = [["answerId", "C", "isReadableAnswer（isRefId）"], ["itemKey", "C", "isReadableAnswer（isItemKeyText）"], ["kind", "A", "isReadableAnswer（KINDS）"], ["value", "C", "hasReadableValue（rejectionReasonOf）"],
  ["valueDigest", "B", "isReadableAnswer（DIGEST_RE）"], ["selectedCandidateRef", "C", "isReadableAnswer（isRefText）"], ["boundObservationDigest", "B", "isReadableAnswer（DIGEST_RE）"], ["answeredAt", "B", "isReadableAnswer（parseInstant）"],
  ["state", "A", "isReadableAnswer（ANSWER_STATES）"], ["rejectionReason", "A", "isReadableAnswer（REJECTION_REASONS）"]];
const patched = (key, value) => [cloneWith(PRIOR, [key], value)];
const OBSERVED = observeWith();
const BASE_RECONCILED = json(ws.reconcileAnswers([PRIOR], OBSERVED.items, CATALOG));
// 読めない件は、その 1 件だけが位置で示す invalidated の回答になる（値・項目名・識別は写さない）。
const IS_POSITIONED = (r) => json(r) === json([{ answerId: "answer-position-0", itemKey: "answer-position-0", state: "invalidated" }]);

const answerRows = ANSWER_FIELDS.flatMap(([key, cls, check]) => [
  row(`RA.answers.${key}`, `answers[].${key}`, cls, check, getIn(PRIOR, [key]), (v) => on({ answerId: "ans-2" }, { answers: patched(key, v) }), (r) => recorded(r) && json(r.answers[0]) === json(PRIOR), (r) => unreadable(r) && r.answers.length === 0),
  { id: `RC.answers.${key}`, entry: "reconcileAnswers", field: `answers[].${key}`, cls, check, legit: getIn(PRIOR, [key]), run: (v) => ws.reconcileAnswers(patched(key, v), OBSERVED.items, CATALOG), ok: (r) => json(r) === BASE_RECONCILED, refused: IS_POSITIONED },
]);
const extraKey = (v) => (v === "kind" ? [cloneWith(PRIOR, ["kind"], PRIOR.kind)] : [{ ...PRIOR, [v]: 1 }]);
const listRows = [
  row("RA.answers.extra", "answers[]（知らない欄の名前）", "A", "isReadableAnswer（ANSWER_KEYS）", "kind", (v) => on({ answerId: "ans-2" }, { answers: extraKey(v) }), recorded, (r) => unreadable(r) && r.answers.length === 0),
  row("RA.answers.entry", "answers[]（object でない件）", "B", "isReadableAnswer（object だけ）", PRIOR, (v) => on({ answerId: "ans-2" }, { answers: [v] }), recorded, (r) => unreadable(r) && r.answers.length === 0),
  { id: "RC.answers.extra", entry: "reconcileAnswers", field: "answers[]（知らない欄の名前）", cls: "A", check: "isReadableAnswer（ANSWER_KEYS）", legit: "kind", run: (v) => ws.reconcileAnswers(extraKey(v), OBSERVED.items, CATALOG), ok: (r) => json(r) === BASE_RECONCILED, refused: IS_POSITIONED },
  { id: "RC.answers.entry", entry: "reconcileAnswers", field: "answers[]（object でない件）", cls: "B", check: "isReadableAnswer（object だけ）", legit: PRIOR, run: (v) => ws.reconcileAnswers([v], OBSERVED.items, CATALOG), ok: (r) => json(r) === BASE_RECONCILED, refused: IS_POSITIONED },
  { id: "RC.catalog", entry: "reconcileAnswers", field: "catalog[].itemKey", cls: "C", check: "entryIn（比べるだけ）", legit: "aidlc_settings", run: (v) => ws.reconcileAnswers([PRIOR], OBSERVED.items, [...CATALOG, { ...NOTE_ITEM, itemKey: v }]), ok: (r) => json(r) === BASE_RECONCILED, refused: (r) => json(r) === BASE_RECONCILED },
];

export const ANSWER_ROWS = [...inputRows, ...catalogRows, ...answerRows, ...listRows];
