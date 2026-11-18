// LC2 の後半の核: 解釈した読取りの結果（read-check）から、1 つの項目・1 つの出典の事実の欄を作る。
// 値の分類は共有の 1 つの関数（classifyValue）に 1 回だけ通す。閉じた形は形式に合う時だけ値と digest を保持し、
// 開いた形は値を持たず presence・lengthBucket と、一致の比較に使う鍵（key。出力に出さない）だけを返す（Owner の決定 116・120・122）。
// 返す形: { fields, key }。fields は ObservedItem の欄（unavailable の時は unobservableCause を持つ）。入力は出力に写さない。
// 時刻・乱数・環境変数・file を使わない（S4）。
import { canonicalJson, digestOf } from "./canonical.mjs";
import { elementShapeOf, normalizationOf, targetBindingOf } from "./catalog.mjs";
import { compareVersions, lengthBucketOf, lengthOf, normalizeValue } from "./normalize.mjs";
import { extractToolVersion, pickItem } from "./source-extract.mjs";
import { classifyValue, valueFormOf } from "./value-exposure.mjs";

const TOOL_PROBE = "tool_probe";
const ABSENT = Object.freeze({ presence: "absent" });

const gone = (cause, notes) => ({ fields: notes === undefined ? { unobservableCause: cause } : { unobservableCause: cause, probeNotes: notes }, key: null });
const isGone = (result) => result.fields.unobservableCause !== undefined;

// 出典が実際に名指した対象（読取りの結果だけから）と渡された対象の突き合わせ（BR1.1）。名指さない出典は targetBinding で決める。
function targetOf(context, source, read) {
  const named = typeof read.namedTarget === "string" && read.namedTarget !== "" ? read.namedTarget : undefined;
  if (named !== undefined) return { targetMatch: named === context.targetRef ? "matches" : "differs", namedTarget: named };
  return { targetMatch: targetBindingOf(source) === "by-location" ? "matches" : "unspecified" };
}

// 取り出した値（なし・無し・破損）。道具の出力からは版の識別だけを取り出す。
function pickedOf(entry, outcome) {
  if (outcome.status === "absent") return ABSENT;
  if (outcome.status === "output") return { presence: "value", value: extractToolVersion(outcome.output) };
  return pickItem(entry.source.kind, entry.item.itemKey, outcome.doc);
}

// 値の分類（1 回だけ）と、分類が有効な時の持ち方。開いた形は鍵だけを比べるために返し、値・digest は持たない。
function valueResult(item, raw) {
  const classification = classifyValue(item.valueType, raw, elementShapeOf(item));
  if (classification !== "valid") return { fields: { presence: "value", withheld: classification }, key: null };
  const normalized = normalizeValue(item.valueType, normalizationOf(item), raw);
  if (valueFormOf(item.valueType) === "closed") return { fields: { presence: "value", value: normalized, valueDigest: digestOf(normalized) }, key: null };
  return { fields: { presence: "value", lengthBucket: lengthBucketOf(lengthOf(item.valueType, normalized)) }, key: canonicalJson(normalized) };
}

// 道具の版が必要な版以上か（BR2.3）。必要な版は呼出側が渡した入力だけ。比べられなければ malformed、下回れば tool_unsupported_version。
function fitRequired(context, entry, result) {
  const { item, source } = entry;
  if (source.kind !== TOOL_PROBE || result.fields.value === undefined || !context.required.has(item.itemKey)) return result;
  const order = compareVersions(result.fields.value, context.required.get(item.itemKey));
  if (order === null) return gone("malformed");
  return order < 0 ? gone("tool_unsupported_version") : result;
}

// 解釈した読取り 1 つ（outcome）から、項目 1 つの欄を作る。
export function interpretItem(context, entry, read, outcome) {
  if (outcome.status === "unavailable") return gone(outcome.cause, outcome.notes);
  const picked = pickedOf(entry, outcome);
  if (picked.presence === "malformed") return gone("malformed");
  const target = targetOf(context, entry.source, read);
  if (target.targetMatch === "unspecified") return gone("malformed");
  if (target.targetMatch === "differs") return { fields: target, key: null };
  if (picked.presence === "absent") return { fields: { ...target, presence: "absent" }, key: null };
  const result = fitRequired(context, entry, valueResult(entry.item, picked.value));
  return isGone(result) ? result : { fields: { ...target, ...result.fields }, key: result.key };
}
