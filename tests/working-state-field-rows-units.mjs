// 入力の欄の表（観測の単位 observedItems の欄）の行のデータ。観測の単位は呼出側が手で作れるので、evaluateItems・factsOf・buildDraft・receiveAnswer の入口が受ける欄を
// 1 欄 × 入口ごとに 1 行にする。基の入力は 5 つ（閉じた形・開いた形・観測できず・不正・対象違い）で、欄ごとに写る道のある基を選ぶ。
// 欄の種類: A = 閉じた一覧（比べるだけ）、B = 固定の形（桁の決まった digest・整数）、C = 唯一の門を通す文字列、U = どの入口も読まない欄（外の値は結果を変えない）。
import * as ws from "../scripts/working-state/index.mjs";
import { NOW, fileRead, goodReads, pinText } from "./working-state-fixtures.mjs";
import { CATALOG, SETTINGS_ITEM, answerInput, observeWith } from "./working-state-answer-fixtures.mjs";
import { buildInput, conflictObserved } from "./working-state-draft-fixtures.mjs";
import { cloneWith, getIn, json } from "./working-state-field-fixtures.mjs";

const POSITION = /^observed-position-\d+$/;
const unitAt = (items, itemKey, kind) => items.findIndex((unit) => unit.itemKey === itemKey && unit.sourceRef.sourceKind === kind);
const pinRead = (over, text = pinText()) => goodReads().map((read) => (read.sourceKind === "sds_pin" ? fileRead("sds_pin", text, over) : read));
const base = (catalog, units, itemKey, kind) => ({ catalog, units, itemKey, index: unitAt(units, itemKey, kind) });

const settingsSource = (kind) => ({ kind, requiredForConfirmed: true, targetBinding: "by-location" });
function openBase() {
  const first = observeWith(CATALOG).items.find((unit) => unit.itemKey === "aidlc_settings");
  const second = { ...structuredClone(first), sourceRef: { ...first.sourceRef, sourceKind: "claude_settings", locator: "claude.json" }, matchGroup: 2, observation: { ...first.observation, observationId: `aidlc_settings|claude_settings|claude.json|${NOW}` } };
  return base([{ ...SETTINGS_ITEM, sources: [settingsSource("aidlc_settings"), settingsSource("claude_settings")] }], [structuredClone(first), second], "aidlc_settings", "claude_settings");
}

export const BASES = {
  closed: base(CATALOG, conflictObserved().items, "sds_commit", "sds_pin"),
  unavailable: base(CATALOG, observeWith(CATALOG, pinRead({ access: "denied" })).items, "sds_commit", "sds_pin"),
  invalid: base(CATALOG, observeWith(CATALOG, pinRead({}, pinText({ sds_commit: "not-a-commit" }))).items, "sds_commit", "sds_pin"),
  differs: base(CATALOG, observeWith(CATALOG, pinRead({ namedTarget: "other-work" })).items, "sds_commit", "sds_pin"),
  open: openBase(),
};
const stateOf = (result, itemKey) => result.items.find((item) => item.itemKey === itemKey)?.state;

// 入口ごとの呼び方と、外れた時の固定の形。baseline は元の単位での結果で、正しい値の対照はこれと同じになる。
const ENTRIES = [
  ["EV", "evaluateItems", (b, units) => ws.evaluateItems(b.catalog, units), (b, bj) => (r) => json(r) === bj || stateOf(r, b.itemKey) === "unobservable"],
  ["FA", "factsOf", (b, units) => ws.factsOf(units), (b, bj) => (r) => json(r) === bj || r.some((fact) => POSITION.test(fact.unit.itemKey))],
  ["BD", "buildDraft", (b, units) => ws.buildDraft(buildInput({ catalog: b.catalog, observedItems: units })), (b, bj) => (r) => json(r) === bj || (r.status === "refused" && r.reason === "invalid_input")],
  ["RA", "receiveAnswer", (b, units) => ws.receiveAnswer({ catalog: b.catalog, observedItems: units, answers: [], input: answerInput({ answerId: "ans-9" }) }), (b, bj) => (r) => json(r) === bj || (r.status === "unreadable" && r.answers.length === 0)],
];

// [欄の名前, 基, path, 種類, 守りの場所]。U の欄は、どの入口も読まない（外の値で結果が変わらない）。
const FIELDS = [
  ["itemKey", "closed", ["itemKey"], "C", "isReadableUnit（isItemKeyText）"],
  ["sourceRef.sourceKind", "closed", ["sourceRef", "sourceKind"], "A", "isReadableUnit（SOURCE_KINDS）"],
  ["sourceRef.locator", "closed", ["sourceRef", "locator"], "C", "isReadableUnit（isRefName）"],
  ["sourceRef.targetRef", "closed", ["sourceRef", "targetRef"], "C", "isReadableUnit（isRefName）"],
  ["observation.observationId", "closed", ["observation", "observationId"], "C", "isReadableUnit（isRefName）"],
  ["observation.availability", "closed", ["observation", "availability"], "A", "isReadableUnit（AVAILABILITIES）"],
  ["targetMatch", "closed", ["targetMatch"], "A", "isReadableUnit（TARGET_MATCHES）"],
  ["presence", "closed", ["presence"], "A", "isReadableUnit（PRESENCES）"],
  ["value", "closed", ["value"], "C", "unitFits（classifyValue）"],
  ["valueDigest", "closed", ["valueDigest"], "B", "isReadableUnit（DIGEST_RE）"],
  ["withheld", "invalid", ["withheld"], "A", "isReadableUnit（WITHHELD）"],
  ["unobservableCause", "unavailable", ["unobservableCause"], "A", "isReadableUnit（isKnownCause）"],
  ["namedTarget", "differs", ["namedTarget"], "C", "isReadableUnit（isSecretLike）"],
  ["lengthBucket", "open", ["lengthBucket"], "A", "isReadableUnit（LENGTH_BUCKETS）"],
  ["matchGroup", "open", ["matchGroup"], "B", "isReadableUnit（Number.isInteger）"],
  ["observedAt", "closed", ["observedAt"], "U", "読まない"],
  ["observation.sourceRef", "closed", ["observation", "sourceRef"], "U", "読まない"],
  ["observation.target", "closed", ["observation", "target"], "U", "読まない"],
  ["observation.versionRef", "closed", ["observation", "versionRef"], "U", "読まない"],
  ["observation.observedDigest", "closed", ["observation", "observedDigest"], "U", "読まない"],
  ["observation.issuerObservation", "closed", ["observation", "issuerObservation"], "U", "読まない"],
  ["budgetUsed", "closed", ["budgetUsed"], "U", "読まない"],
  ["probeNotes", "unavailable", ["probeNotes"], "U", "読まない"],
];

function fieldRow(code, label, run, refusedOf, [name, baseName, path, cls, check]) {
  const given = BASES[baseName];
  const withValue = (value) => run(given, given.units.map((unit, i) => (i === given.index ? cloneWith(unit, path, value) : unit)));
  const bj = json(withValue(getIn(given.units[given.index], path)));
  const refused = refusedOf(given, bj);
  const cleanPath = cls === "U" ? () => true : refused;
  return { id: `${code}.${name}`, entry: label, field: `observedItems[].${name}`, cls: cls === "U" ? "A" : cls, check, legit: getIn(given.units[given.index], path), run: withValue, ok: (r) => json(r) === bj, refused: cleanPath };
}

const unitRows = ENTRIES.flatMap(([code, label, run, refusedOf]) => FIELDS.map((field) => fieldRow(code, label, run, refusedOf, field)));

// 入れ物そのもの: 配列でない observedItems・object でない単位。
const containerRows = ENTRIES.flatMap(([code, label, run, refusedOf]) => {
  const given = BASES.closed;
  const bj = json(run(given, given.units));
  const refused = refusedOf(given, bj);
  return [
    { id: `${code}.unit`, entry: label, field: "observedItems[]（object でない単位）", cls: "B", check: "isReadableUnit（object だけ）", legit: given.units[0], run: (value) => run(given, [value, ...given.units.slice(1)]), ok: (r) => json(r) !== undefined, refused: (r) => refused(r) || (r.unknownItemKeys ?? []).some((key) => POSITION.test(key)) },
    { id: `${code}.list`, entry: label, field: "observedItems（配列でない）", cls: "B", check: "Array.isArray", legit: given.units, run: (value) => run(given, value), ok: (r) => json(r) === bj, refused, throws: true },
  ];
});

// 知らない欄: 単位・出典の参照に呼出側が足した欄（名前も値も）。写す欄を名指しで取るので、どれも結果に現れない。
const extraRows = ENTRIES.flatMap(([code, label, run, refusedOf]) => {
  const given = BASES.closed;
  const bj = json(run(given, given.units));
  const refused = refusedOf(given, bj);
  const at = (patch) => run(given, given.units.map((unit, i) => (i === given.index ? patch(structuredClone(unit)) : unit)));
  const row = (id, field, legit, patch) => ({ id: `${code}.${id}`, entry: label, field, cls: "A", check: "写す欄を名指しで取る", legit, run: (value) => at((unit) => patch(unit, value)), ok: (r) => json(r) === bj, refused });
  const key = (target) => (unit, value) => { target(unit)[value] ??= 1; return unit; };
  const val = (target) => (unit, value) => { if (value === undefined) delete target(unit).extra; else target(unit).extra = value; return unit; };
  return [
    row("sourceRef.extraKey", "observedItems[].sourceRef（知らない欄の名前）", "locator", key((unit) => unit.sourceRef)),
    row("sourceRef.extraValue", "observedItems[].sourceRef（知らない欄の値）", undefined, val((unit) => unit.sourceRef)),
    row("unit.extraKey", "observedItems[]（知らない欄の名前）", "itemKey", key((unit) => unit)),
    row("unit.extraValue", "observedItems[]（知らない欄の値）", undefined, val((unit) => unit)),
  ];
});

export const UNIT_ROWS = [...unitRows, ...containerRows, ...extraRows];
