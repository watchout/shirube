// 入力の欄の表（判定・写しの関数を直接呼ぶ入口）の行のデータ。観測の単位・回答・案内を読む判定（isReadableUnit・unitFits・unitsFit・readableUnitsOf・isReadableAnswer・guidanceCopyOf・isAnswerValue・
// isGuidanceText・isReasonCode・isDigest・isSelectionStale・observedPositionKeyOf）は、上の入口（evaluateItems・receiveAnswer・createSelection ほか）の中でも呼ばれるが、公開の関数なので、
// 呼出側が直接渡す欄も 1 欄 1 行にする。基の入力は、ほかの行と同じ部品（working-state-field-rows-units.mjs の BASES・answer の部品）から取る。
// 欄の種類: A = 閉じた一覧（比べるだけ）、B = 固定の形（桁の決まった digest・整数・配列）、C = 唯一の門を通す文字列。
import * as ws from "../scripts/working-state/index.mjs";
import { CATALOG, NOTE_ITEM, answerInput, send } from "./working-state-answer-fixtures.mjs";
import { cloneWith, getIn, json } from "./working-state-field-fixtures.mjs";
import { BASES } from "./working-state-field-rows-units.mjs";

const isBool = (r) => typeof r === "boolean";
const POSITION = /^observed-position-\d+$/;
const DIGEST = ws.sha256Hex("x");
const ANSWER = send(answerInput({ answerId: "ans-0", itemKey: "note_text", value: "hello" })).answers[0];
const CLOSED = BASES.closed;
const UNIT = CLOSED.units[CLOSED.index];
const SDS = CATALOG.find((entry) => entry.itemKey === "sds_commit");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";

// 行の作り: 入口名・欄・種類・守り・正しい値・呼び方・正しい値の結果・外れた時の固定の形。
const row = (entry, field, cls, check, legit, run, ok, refused, extra = {}) => ({ id: `${entry}.${field}`, entry, field, cls, check, legit, run, ok, refused, ...extra });
const truth = (entry, field, cls, check, legit, run) => row(entry, field, cls, check, legit, run, (r) => r === true, (r) => r === false);

// 観測の単位の判定（isReadableUnit）。読む欄は読めない時に false。読まない欄は結果を変えない。
const UNIT_FIELDS = [
  ["itemKey", ["itemKey"], "C", "isItemKeyText"],
  ["sourceRef.sourceKind", ["sourceRef", "sourceKind"], "A", "SOURCE_KINDS"],
  ["sourceRef.locator", ["sourceRef", "locator"], "C", "isRefName"],
  ["sourceRef.targetRef", ["sourceRef", "targetRef"], "C", "isRefName"],
  ["observation.observationId", ["observation", "observationId"], "C", "isRefName"],
  ["observation.availability", ["observation", "availability"], "A", "AVAILABILITIES"],
  ["targetMatch", ["targetMatch"], "A", "TARGET_MATCHES"],
  ["presence", ["presence"], "A", "PRESENCES"],
  ["valueDigest", ["valueDigest"], "B", "isDigest"],
  ["lengthBucket", ["lengthBucket"], "A", "LENGTH_BUCKETS"],
  ["matchGroup", ["matchGroup"], "B", "Number.isInteger"],
  ["namedTarget", ["namedTarget"], "C", "isSecretLike"],
  ["unobservableCause", ["unobservableCause"], "A", "isKnownCause"],
  ["withheld", ["withheld"], "A", "WITHHELD"],
];
const withField = (path, value) => cloneWith(UNIT, path, value);
const readableUnitRows = UNIT_FIELDS.map(([name, path, cls, check]) => {
  const legit = getIn(UNIT, path);
  const sameOutside = (value) => ws.isReadableUnit(withField(path, value));
  // 欄が元の単位に無い（任意の欄）時は、正しい値の対照に判定を通る値を持たせる。
  const good = legit ?? { targetMatch: "matches", presence: "value", valueDigest: DIGEST, lengthBucket: "short", matchGroup: 1, namedTarget: "other-work", unobservableCause: "permission_denied", withheld: "secret_like" }[name];
  return truth("isReadableUnit", `unit.${name}`, cls, check, good, sameOutside);
});

// 単位の判定の入れ物: object でない単位・知らない欄。
const unitContainerRows = [
  truth("isReadableUnit", "unit（object でない）", "B", "isObject", UNIT, (value) => ws.isReadableUnit(value)),
  row("isReadableUnit", "unit.（知らない欄の値）", "A", "写す欄を名指しで取る", undefined, (value) => ws.isReadableUnit({ ...UNIT, extra: value }), (r) => r === true, (r) => r === true),
];

// 値が項目の定義に合うか（unitFits）。
const fitsRows = [
  truth("unitFits", "unit.value", "C", "classifyValue（閉じた形で valid だけ）", COMMIT, (value) => ws.unitFits(SDS, { ...UNIT, value })),
  truth("unitFits", "entry.valueType", "A", "valueFormOf（閉じた形だけ）", "commit-oid", (value) => ws.unitFits({ ...SDS, valueType: value }, { ...UNIT, value: COMMIT })),
  row("unitFits", "entry.elementShape", "A", "読まない（閉じた形の形式は要素の形を読まない。unitFits は elementShapeOf を呼ばない）", "string", (value) => ws.unitFits({ itemKey: "x_list", valueType: "list", elementShape: value }, { ...UNIT, value: ["a"] }), (r) => r === false, (r) => r === false),
];

// 全部の単位が読めて合うか（unitsFit）。
const unitsFitRows = [
  truth("unitsFit", "observedItems[].itemKey", "C", "isReadableUnit", UNIT.itemKey, (value) => ws.unitsFit(CLOSED.catalog, CLOSED.units.map((unit, i) => (i === CLOSED.index ? { ...unit, itemKey: value } : unit)))),
  truth("unitsFit", "observedItems[].sourceRef.locator", "C", "isReadableUnit", "location", (value) => ws.unitsFit(CLOSED.catalog, CLOSED.units.map((unit, i) => (i === CLOSED.index ? cloneWith(unit, ["sourceRef", "locator"], value) : unit)))),
  truth("unitsFit", "observedItems[].value", "C", "unitFits", COMMIT, (value) => ws.unitsFit(CLOSED.catalog, [{ ...UNIT, value }])),
  truth("unitsFit", "observedItems（配列でない）", "B", "Array.isArray", CLOSED.units, (value) => ws.unitsFit(CLOSED.catalog, value)),
  row("unitsFit", "catalog[].valueType", "A", "valueFormOf", "commit-oid", (value) => ws.unitsFit([{ ...SDS, valueType: value }], [{ ...UNIT, value: COMMIT }]), (r) => r === true, (r) => r === false),
];

// 読めない単位を位置で示す単位に置き換える（readableUnitsOf）。
const unitsOf = (path, value) => ws.readableUnitsOf(CLOSED.units.map((unit, i) => (i === CLOSED.index ? cloneWith(unit, path, value) : unit)));
const placed = (r) => POSITION.test(r[CLOSED.index].itemKey) && r[CLOSED.index].unobservableCause === "malformed";
const readableUnitsRows = [
  ["itemKey", ["itemKey"], "C"], ["sourceRef.sourceKind", ["sourceRef", "sourceKind"], "A"], ["sourceRef.locator", ["sourceRef", "locator"], "C"],
  ["sourceRef.targetRef", ["sourceRef", "targetRef"], "C"], ["observation.observationId", ["observation", "observationId"], "C"], ["valueDigest", ["valueDigest"], "B"],
].map(([name, path, cls]) => {
  const legit = getIn(UNIT, path) ?? DIGEST;
  const baseline = json(unitsOf(path, legit));
  return row("readableUnitsOf", `observedItems[].${name}`, cls, "isReadableUnit", legit, (value) => unitsOf(path, value), (r) => json(r) === baseline && !placed(r), placed);
});
readableUnitsRows.push(row("readableUnitsOf", "observedItems（配列でない）", "B", "Array.isArray", CLOSED.units, (value) => ws.readableUnitsOf(value), (r) => r.length === CLOSED.units.length, () => false, { throws: true }));

// 位置の鍵: 0 以上の安全な整数だけ。
const positionRows = [row("observedPositionKeyOf", "position", "B", "整数だけ（固定の形）", 0, (value) => ws.observedPositionKeyOf(value), (r) => POSITION.test(r), () => false, { throws: true })];

// 回答の判定（isReadableAnswer）。
const answerAt = (path, value) => cloneWith(ANSWER, path, value);
const readableAnswerRows = [
  ["answerId", "C", "isRefId"], ["itemKey", "C", "isItemKeyText"], ["kind", "A", "KINDS"], ["value", "C", "rejectionReasonOf（項目一覧の形式）"],
  ["state", "A", "ANSWER_STATES"], ["answeredAt", "B", "parseInstant"], ["boundObservationDigest", "B", "isDigest"], ["valueDigest", "B", "isDigest"],
  ["selectedCandidateRef", "C", "isRefName"], ["rejectionReason", "A", "REJECTION_REASONS"],
].map(([name, cls, check]) => {
  const legit = ANSWER[name] ?? { boundObservationDigest: DIGEST, valueDigest: DIGEST, selectedCandidateRef: "sds_commit@sds_pin:.shirube/sds-pin.json", rejectionReason: undefined }[name];
  return truth("isReadableAnswer", `answer.${name}`, cls, check, legit, (value) => ws.isReadableAnswer(answerAt([name], value), [NOTE_ITEM]));
});
const answerContainerRows = [
  truth("isReadableAnswer", "answer（object でない）", "B", "typeof object", ANSWER, (value) => ws.isReadableAnswer(value, [NOTE_ITEM])),
  row("isReadableAnswer", "answer.（知らない欄の名前）", "A", "ANSWER_KEYS（名指しの欄だけ）", undefined, (value) => ws.isReadableAnswer(value === undefined ? ANSWER : { ...ANSWER, [value]: 1 }, [NOTE_ITEM]), (r) => r === true, (r) => r === false),
  truth("isReadableAnswer", "catalog[].valueType", "A", "rejectionReasonOf", "string", (value) => ws.isReadableAnswer(ANSWER, [{ ...NOTE_ITEM, valueType: value }])),
  row("isReadableAnswer", "catalog（配列でない）", "B", "Array.isArray（配列でない項目一覧は省いた時と同じ。値は門だけを通す）", [NOTE_ITEM], (value) => ws.isReadableAnswer(ANSWER, value), (r) => r === true, (r) => r === true),
];

// 公開の文字列の判定（どれも真偽だけ返す）。
const textRows = [
  truth("isAnswerValue", "value", "C", "単一の門（回答の値）", "hello", (value) => ws.isAnswerValue(value)),
  truth("isAnswerValue", "value[]（列の要素）", "C", "単一の門（回答の値）", "hello", (value) => ws.isAnswerValue([value])),
  truth("isGuidanceText", "value", "C", "単一の門（案内の文）", "hello", (value) => ws.isGuidanceText(value)),
  truth("isReasonCode", "value", "C", "REASON_PATTERN と isRefName", "GATE_FAILED", (value) => ws.isReasonCode(value)),
  truth("isDigest", "value", "B", "DIGEST_RE（小文字の 16 進 64 桁）", DIGEST, (value) => ws.isDigest(value)),
];

// 選択が古いか（isSelectionStale）。
const staleRows = [
  row("isSelectionStale", "selection.draftObservationDigest", "B", "digest の比べだけ", "x", (value) => ws.isSelectionStale({ draftObservationDigest: value }, CLOSED.units), isBool, isBool),
  row("isSelectionStale", "observedItems[].itemKey", "C", "readableUnitsOf", UNIT.itemKey, (value) => ws.isSelectionStale({ draftObservationDigest: "x" }, CLOSED.units.map((unit, i) => (i === CLOSED.index ? { ...unit, itemKey: value } : unit))), isBool, isBool),
  row("isSelectionStale", "selection（欠け）", "B", "?? {}", {}, (value) => ws.isSelectionStale(value, CLOSED.units), isBool, isBool),
];

// 案内の写し（guidanceCopyOf）。名指しの欄だけを欄ごとの検査に通して写し、通らなければ null。
const GUIDANCE = {
  targetRef: "other-work", conclusion: "ok", nextAction: { kind: "answer-question", text: "ask" },
  causes: [{ itemKey: "sds_commit", state: "conflict", unobservableCause: "permission_denied" }], unconfirmed: ["sds_commit"], reasons: ["GATE_FAILED"],
  observationRefs: ["sds_commit@sds_pin:.shirube/sds-pin.json"], blocking: true, text: "hello",
};
const guidanceAt = (path, value) => ws.guidanceCopyOf(cloneWith(GUIDANCE, path, value));
const isCopy = (r) => r !== null && json(r) === json(GUIDANCE);
const GUIDANCE_FIELDS = [
  ["text", ["text"], "C"], ["conclusion", ["conclusion"], "C"], ["targetRef", ["targetRef"], "C"],
  ["nextAction.kind", ["nextAction", "kind"], "A"], ["nextAction.text", ["nextAction", "text"], "C"],
  ["causes[].itemKey", ["causes", 0, "itemKey"], "C"], ["causes[].state", ["causes", 0, "state"], "A"], ["causes[].unobservableCause", ["causes", 0, "unobservableCause"], "A"],
  ["unconfirmed[]", ["unconfirmed", 0], "C"], ["reasons[]", ["reasons", 0], "C"], ["observationRefs[]", ["observationRefs", 0], "C"], ["blocking", ["blocking"], "A"],
];
const guidanceRows = GUIDANCE_FIELDS.map(([name, path, cls]) => row("guidanceCopyOf", `guidance.${name}`, cls, "欄ごとの検査（FIELD_CHECKS）", getIn(GUIDANCE, path), (value) => guidanceAt(path, value), isCopy, (r) => r === null));
const guidanceExtraRows = [
  row("guidanceCopyOf", "guidance.（知らない欄の名前）", "A", "名指しの欄だけ写す", "extra", (value) => ws.guidanceCopyOf({ ...GUIDANCE, [value]: 1 }), isCopy, isCopy),
  row("guidanceCopyOf", "guidance.（知らない欄の値）", "A", "名指しの欄だけ写す", undefined, (value) => ws.guidanceCopyOf({ ...GUIDANCE, extra: value }), isCopy, isCopy),
  row("guidanceCopyOf", "guidance.nextAction.（知らない欄の値）", "A", "hasOnly（入れ子の知らない欄は構造体ごと断る）", undefined, (value) => ws.guidanceCopyOf({ ...GUIDANCE, nextAction: { ...GUIDANCE.nextAction, ...(value === undefined ? {} : { extra: value }) } }), isCopy, (r) => r === null),
  row("guidanceCopyOf", "guidance（object でない）", "B", "isObject", GUIDANCE, (value) => ws.guidanceCopyOf(value), isCopy, (r) => r === null),
];

export const CHECK_ROWS = [
  ...readableUnitRows, ...unitContainerRows, ...fitsRows, ...unitsFitRows, ...readableUnitsRows, ...positionRows,
  ...readableAnswerRows, ...answerContainerRows, ...textRows, ...staleRows, ...guidanceRows, ...guidanceExtraRows,
];
