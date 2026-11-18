// 入力の欄の表（公開の補助の関数の入口）の行のデータ。結果が固定の集合（真偽・数・固定の語）の関数と、項目名を結果へ写す関数（evaluateItem・strongestAction・questionsOf・positionKeyOf）の欄を、
// 1 欄 1 行にする。結果が入力そのものである関数（canonicalJson・escapeForDisplay・normalizeValue・parseSourceContent・pickItem・extractToolVersion・interpretFile・interpretProbe・deepFreeze と
// file・子 process の生の事実の関数）は、写すことが定義なので行にしない（表の「入力を写す関数」の節で扱いを書く）。
import * as ws from "../scripts/working-state/index.mjs";
import { NOW } from "./working-state-fixtures.mjs";
import { CATALOG, NOTE_ITEM, answerInput, send } from "./working-state-answer-fixtures.mjs";
import { conflictObserved } from "./working-state-draft-fixtures.mjs";
import { json } from "./working-state-field-fixtures.mjs";

const ITEMS = conflictObserved().items;
const SDS = CATALOG.find((entry) => entry.itemKey === "sds_commit");
const EVALUATED = ws.evaluateItems(CATALOG, ITEMS).items;
const ANSWER = send(answerInput({ answerId: "ans-0", itemKey: "note_text", value: "hello" })).answers[0];
const isBool = (r) => typeof r === "boolean";
const isNum = (r) => typeof r === "number" || r === null;
const among = (list) => (r) => list.includes(r);
const sameJson = (run, legit) => { const base = json(run(legit)); return (r) => json(r) === base; };

// 行の作り: 入口名・欄・種類・守り・正しい値・呼び方・外れた時の固定の形。ok は「正しい値の結果が型の決まった形」で足りる関数は型の確認、写す関数は元の結果との一致。
const H = (entry, field, cls, check, legit, run, refused, ok = refused) => ({ id: `${entry}.${field}`, entry, field, cls, check, legit, run, ok, refused });
const bool = (entry, field, cls, check, legit, run) => H(entry, field, cls, check, legit, run, isBool);
const num = (entry, field, cls, check, legit, run) => H(entry, field, cls, check, legit, run, isNum);
const wordsOf = (entry, field, cls, check, legit, run, list) => H(entry, field, cls, check, legit, run, among(list));
const echo = (entry, field, cls, check, legit, run, refused) => H(entry, field, cls, check, legit, run, refused, sameJson(run, legit));

const answerFields = ["itemKey", "state", "kind", "valueDigest", "boundObservationDigest"];
const statusRows = answerFields.map((key) => wordsOf("answerStatusOf", `answer.${key}`, "A", "固定の語だけ返す", ANSWER[key], (v) => ws.answerStatusOf({ answer: { ...ANSWER, [key]: v }, entry: NOTE_ITEM, observedItems: ITEMS, reobserved: true }), ws.ANSWER_STATUSES));
const matchRows = [
  ...["kind", "valueDigest"].map((key) => bool("closedMatches", `answer.${key}`, "A", "真偽だけ返す", ANSWER[key], (v) => ws.closedMatches({ ...ANSWER, [key]: v }, CATALOG[0], ITEMS))),
  bool("closedMatches", "entry.valueType", "A", "valueFormOf", "commit-oid", (v) => ws.closedMatches(ANSWER, { ...CATALOG[0], valueType: v }, ITEMS)),
  bool("closedMatchesItem", "item.state", "A", "比べるだけ", "confirmed", (v) => ws.closedMatchesItem(ANSWER, { ...EVALUATED[0], state: v })),
  bool("closedMatchesItem", "item.confirmedValue", "C", "digestOf の比べだけ", "x", (v) => ws.closedMatchesItem(ANSWER, { state: "confirmed", confirmedValue: v })),
];
const staleRows = [
  ["isObservationStale", (owner, field) => ws.isObservationStale(owner, field, ITEMS)],
  ["isDraftStale", (owner, field) => ws.isDraftStale({ ...owner, [field]: owner[field] }, ITEMS)],
].flatMap(([name, call]) => [bool(name, "owner[field]", "B", "digest の比べだけ", "observationDigest", (v) => call({ observationDigest: v }, "observationDigest")), bool(name, "field（名前）", "A", "owner[field] の引きだけ", "observationDigest", (v) => call({ observationDigest: "x" }, v))]);
const pureRows = [
  num("parseInstant", "text", "B", "INSTANT_RE（固定の形）", NOW, (v) => ws.parseInstant(v)),
  num("compareVersions", "a", "B", "数の比べ", "1.2.3", (v) => ws.compareVersions(v, "1.2.3")),
  num("compareVersions", "b", "B", "数の比べ", "1.2.3", (v) => ws.compareVersions("1.2.3", v)),
  num("lengthOf", "value", "B", "長さの数だけ返す", "abc", (v) => ws.lengthOf("string", v)),
  num("lengthOf", "valueType", "A", "長さの数だけ返す", "string", (v) => ws.lengthOf(v, "abc")),
  wordsOf("lengthBucketOf", "length", "B", "固定の区分だけ返す", 3, (v) => ws.lengthBucketOf(v), ws.LENGTH_BUCKETS),
  wordsOf("targetBindingOf", "sourceEntry.targetBinding", "A", "TARGET_BINDINGS の既定", "by-location", (v) => ws.targetBindingOf({ targetBinding: v }), ws.TARGET_BINDINGS),
  wordsOf("normalizationOf", "entry.normalization", "A", "NORMALIZATIONS の既定", "none", (v) => ws.normalizationOf({ normalization: v }), ws.NORMALIZATIONS),
  wordsOf("elementShapeOf", "entry.elementShape", "A", "ELEMENT_SHAPES の既定", "string", (v) => ws.elementShapeOf({ elementShape: v }), ws.ELEMENT_SHAPES),
  bool("isRequiredSource", "sourceEntry.requiredForConfirmed", "A", "!== false だけ", true, (v) => ws.isRequiredSource({ requiredForConfirmed: v })),
  bool("isReadableCatalogItem", "entry.itemKey", "C", "isItemKeyText", "sds_commit", (v) => ws.isReadableCatalogItem({ ...CATALOG[0], itemKey: v })),
  bool("isReadableCatalogItem", "entry.sources[].kind", "A", "SOURCE_KINDS", "sds_pin", (v) => ws.isReadableCatalogItem({ ...CATALOG[0], sources: [{ kind: v }] })),
  echo("positionKeyOf", "position", "B", "整数だけ（固定の形）", 0, (v) => ws.positionKeyOf(v), (r) => /^catalog-position-\d+$/.test(r)),
  echo("findItem", "itemKey", "A", "表を引くだけ", "sds_commit", (v) => ws.findItem(v) ?? null, (r) => r === null),
  echo("findNotHandled", "itemKey", "A", "表を引くだけ", "x", (v) => ws.findNotHandled(v) ?? null, (r) => r === null),
  H("usageOf", "read.measured", "B", "数だけ写す", { measured: { requests: 1, bytesRead: 2, elapsedMs: 3 } }, (v) => ws.usageOf({ measured: { requests: v, bytesRead: v, elapsedMs: v } }), (r) => r.requests === 0, () => true),
  wordsOf("valueFormOf", "valueType", "A", "固定の語だけ返す", "commit-oid", (v) => ws.valueFormOf(v), ["closed", "open"]),
  bool("isAllowedFormat", "value", "C", "形式の検査", "0123456789abcdef0123456789abcdef01234567", (v) => ws.isAllowedFormat("commit-oid", v)),
  bool("isAllowedFormat", "valueType", "A", "FORMATS の引き", "commit-oid", (v) => ws.isAllowedFormat(v, "x")),
  bool("isAllowedFormat", "elementShape", "A", "LIST_RULES の引き", "string", (v) => ws.isAllowedFormat("list", ["x"], v)),
  wordsOf("classifyValue", "value", "C", "固定の語だけ返す", "hello", (v) => ws.classifyValue("string", v), ws.VALUE_CLASSIFICATIONS),
  wordsOf("classifyValue", "valueType", "A", "FORMATS の引き", "string", (v) => ws.classifyValue(v, "hello"), ws.VALUE_CLASSIFICATIONS),
  wordsOf("classifyValue", "elementShape", "A", "LIST_RULES の引き", "string", (v) => ws.classifyValue("list", ["x"], v), ws.VALUE_CLASSIFICATIONS),
  bool("isSecretLike", "value", "C", "classifyValue", "hello", (v) => ws.isSecretLike("string", v)),
  H("rejectionReasonOf", "value", "C", "固定の理由だけ返す", "hello", (v) => ws.rejectionReasonOf("string", v), (r) => r === null || ws.REJECTION_REASONS.includes(r) || ws.VALUE_REJECTION_REASONS.includes(r)),
  bool("hasSecretShape", "text", "C", "(a)〜(d)", "hello", (v) => ws.hasSecretShape(v)),
  bool("exposesText", "text", "C", "単一の門", "hello", (v) => ws.exposesText("name", v)),
  bool("exposesText", "gateClass", "A", "GATE_CLASSES", "name", (v) => ws.exposesText(v, "hello")),
  bool("isSecretLikeRefText", "text", "C", "単一の門（ref の語）", "hello", (v) => ws.isSecretLikeRefText(v)),
  bool("isRefName", "value", "C", "単一の門（ref）", "hello", (v) => ws.isRefName(v)),
  bool("isItemKeyText", "value", "C", "単一の門（項目名）", "hello", (v) => ws.isItemKeyText(v)),
  bool("isRefId", "value", "C", "ID_RE と isRefName", "ans-0", (v) => ws.isRefId(v)),
  bool("carriesSecretShape", "value", "C", "構造体を歩く門", "hello", (v) => ws.carriesSecretShape(v)),
  bool("isItemName", "value", "C", "ITEM_NAME と isItemKeyText", "note_text", (v) => ws.isItemName(v)),
  bool("isShowableName", "value", "C", "isSecretLike", "hello", (v) => ws.isShowableName(v)),
  bool("isShowableRef", "value", "C", "isRefName の語", "hello", (v) => ws.isShowableRef(v)),
  bool("isLengthBucket", "value", "A", "LENGTH_BUCKETS", "short", (v) => ws.isLengthBucket(v)),
  bool("isKnownCause", "cause", "A", "CAUSE_ACTIONS", "denied", (v) => ws.isKnownCause(v)),
];
const hashRows = [
  ["digestOf", "value", (v) => ws.digestOf(v)],
  ["sha256Hex", "text", (v) => ws.sha256Hex(v)],
  ["observationDigestOf", "facts", (v) => ws.observationDigestOf([v])],
  ["itemObservationDigestOf", "itemKey", (v) => ws.itemObservationDigestOf(v, [])],
].map(([entry, field, run]) => H(entry, field, "B", "固定の長さの digest だけ返す", "x", run, (r) => /^[0-9a-f]{64}$/.test(r)));
const actionRows = [
  wordsOf("formOf", "itemKey", "A", "固定の語だけ返す", "sds_commit", (v) => ws.formOf(CATALOG, v), ["closed", "open"]),
  wordsOf("actionOf", "item.state", "A", "BY_STATE の引き", "conflict", (v) => ws.actionOf({ itemKey: "sds_commit", state: v }, CATALOG), ws.NEXT_ACTIONS),
  wordsOf("actionOf", "item.itemKey", "C", "固定の語だけ返す", "sds_commit", (v) => ws.actionOf({ itemKey: v, state: "missing" }, CATALOG), ws.NEXT_ACTIONS),
  H("shownValueOf", "value", "C", "classifyValue（閉じた形で valid だけ示す）", "0123456789abcdef0123456789abcdef01234567", (v) => ws.shownValueOf(CATALOG, "sds_commit", v), (r) => r === ws.WITHHELD_NAME, () => true),
  H("shownValueOf", "itemKey", "C", "項目一覧を引くだけ", "sds_commit", (v) => ws.shownValueOf(CATALOG, v, "0123456789abcdef0123456789abcdef01234567"), (r) => r === ws.WITHHELD_NAME, () => true),
  H("strongestAction", "items[].itemKey", "C", "isItemName", "note_text", (v) => ws.strongestAction([{ itemKey: v, state: "missing" }], [{ ...NOTE_ITEM, itemKey: v }]), (r) => r.kind === "none" || ws.isItemName(r.itemKey), (r) => r.kind === "answer-question" && r.itemKey === "note_text"),
  H("strongestAction", "items[].state", "A", "ITEM_STATES", "conflict", (v) => ws.strongestAction([{ itemKey: "sds_commit", state: v }], CATALOG), (r) => ws.NEXT_ACTIONS.includes(r.kind), () => true),
  H("questionsOf", "items[].itemKey", "C", "isItemName", "note_text", (v) => ws.questionsOf([{ itemKey: v, state: "missing", candidates: [] }], [{ ...NOTE_ITEM, itemKey: v }]), (r) => r.length === 0, (r) => r.length === 1 && r[0].itemKey === "note_text"),
  H("questionsOf", "items[].state", "A", "ITEM_STATES", "conflict", (v) => ws.questionsOf([{ itemKey: "sds_commit", state: v, candidates: [] }], CATALOG), (r) => r.length === 0, (r) => r.length === 1),
  H("questionsOf", "items[].candidates[].candidateRef", "C", "isShowableRef", "sds_commit@sds_pin:.shirube/sds-pin.json", (v) => ws.questionsOf([{ itemKey: "sds_commit", state: "conflict", candidates: [{ candidateRef: v }] }], CATALOG), (r) => r[0].candidateRefs.length === 0, (r) => r[0].candidateRefs.length === 1),
];
const evalRows = [
  H("evaluateItem", "entry.itemKey", "C", "isItemKeyText", "sds_commit", (v) => ws.evaluateItem({ ...SDS, itemKey: v }, ITEMS), (r) => ws.isItemKeyText(r.itemKey), (r) => r.itemKey === "sds_commit"),
  H("evaluateItem", "entry.valueType", "A", "valueFormOf", "commit-oid", (v) => ws.evaluateItem({ ...SDS, valueType: v }, ITEMS), (r) => ws.ITEM_STATES.includes(r.state), (r) => ws.ITEM_STATES.includes(r.state)),
  H("evaluateItem", "observedItems（配列でない）", "B", "Array.isArray", ITEMS, (v) => ws.evaluateItem(SDS, v), () => false, (r) => r.state === "conflict"),
];

// 例外を起こして断る欄（例外の文面は固定で、入力を写さない。試験が文面にも LEAK が無いことを確かめる）。
const THROWS = new Set(["lengthOf.valueType", "lengthBucketOf.length", "evaluateItem.observedItems（配列でない）"]);

export const HELPER_ROWS =[...statusRows, ...matchRows, ...staleRows, ...pureRows, ...hashRows, ...actionRows, ...evalRows].map((row) => (THROWS.has(row.id) ? { ...row, throws: true } : row));
