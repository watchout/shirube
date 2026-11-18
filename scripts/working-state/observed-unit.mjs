// 観測の単位（LC2 の ObservedItem）の読み方（LC3・LC5 の入口）。観測の単位は呼出側が手で作れるので、写す欄を読む前に、1 か所のこの判定に通す
// （閉じた一覧 A・固定の形 B・唯一の門 C。決定 95 の 2 回目の追い指示）。通らない単位は値を写さず、観測した物にも成功にも数えず、
// 列の位置で示す観測できず（unavailable・malformed）の単位に置き換える（印は項目名の形の observed-position-N。入力から作らない）。
// 他の部品へ import するのは閉じた一覧・門だけ（判定の持ち主は value-exposure・catalog・guidance-actions の各 1 か所）。時刻・乱数・環境変数・file を使わない（S4）。
import { isDigest } from "./canonical.mjs";
import { SOURCE_KINDS, elementShapeOf } from "./catalog.mjs";
import { LENGTH_BUCKETS, isKnownCause } from "./normalize.mjs";
import { classifyValue, isItemKeyText, isRefName, isSecretLike, valueFormOf } from "./value-exposure.mjs";

// 置き換えた単位の出典の種類・位置・対象に使う固定の語（入力を写さない）。
const UNREADABLE = "unreadable";
const AVAILABILITIES = ["observed", "unavailable"];
const TARGET_MATCHES = ["matches", "differs"];
const PRESENCES = ["value", "absent"];
const WITHHELD = ["invalid_format", "secret_like"];

// 位置は 0 以上の安全な整数だけ（それ以外は入力を写さない固定の文面で例外にする。項目の位置の鍵 positionKeyOf と同じ固定の形 B）。
export const observedPositionKeyOf = (position) => {
  if (!Number.isSafeInteger(position) || position < 0) throw new TypeError("position must be a non-negative integer");
  return `observed-position-${position}`;
};

const isObject = (value) => typeof value === "object" && value !== null;
const optional = (value, isGood) => value === undefined || isGood(value);
const oneOf = (list) => (value) => list.includes(value);
const isNamedTarget = (value) => typeof value === "string" && value !== "" && !isSecretLike("string", value);
const isMatchGroup = (value) => Number.isInteger(value) && value >= 1;
const isReadableRef = (ref) => isObject(ref) && [...SOURCE_KINDS, UNREADABLE].includes(ref.sourceKind) && isRefName(ref.locator) && isRefName(ref.targetRef);
const isReadableObservation = (observation) => isObject(observation) && AVAILABILITIES.includes(observation.availability) && isRefName(observation.observationId);

// 任意の欄ごとの検査（欄の名前 → 値の検査）。ここに無い欄は読まない（値は項目の定義が要るので unitFits が見る）。
const OPTIONAL_CHECKS = [
  ["targetMatch", oneOf(TARGET_MATCHES)], ["presence", oneOf(PRESENCES)], ["withheld", oneOf(WITHHELD)], ["unobservableCause", isKnownCause],
  ["lengthBucket", oneOf(LENGTH_BUCKETS)], ["matchGroup", isMatchGroup], ["valueDigest", isDigest], ["namedTarget", isNamedTarget],
];

// 単位の値以外の欄が読めるか。getter などで例外を起こす入力は読めない（失敗側）。
export function isReadableUnit(unit) {
  try {
    return isObject(unit) && isItemKeyText(unit.itemKey) && isReadableRef(unit.sourceRef) && isReadableObservation(unit.observation)
      && OPTIONAL_CHECKS.every(([field, isGood]) => optional(unit[field], isGood));
  } catch {
    return false;
  }
}

// 値が項目の定義に合うか。値を持てるのは閉じた形の項目の形式に合う値だけ（開いた形・知らない項目の単位は値を持たない側は問わず、値は写らない）。
export function unitFits(entry, unit) {
  if (entry === undefined || unit.value === undefined) return true;
  return valueFormOf(entry.valueType) === "closed" && classifyValue(entry.valueType, unit.value, elementShapeOf(entry)) === "valid";
}

// 読めない単位の代わり。観測できず（malformed）で、値・presence・対象の結びを持たない。この形自身も isReadableUnit を通る（置き換えは何度しても同じ）。
const placeholderAt = (position) => ({
  itemKey: observedPositionKeyOf(position),
  sourceRef: { sourceKind: UNREADABLE, locator: UNREADABLE, targetRef: UNREADABLE },
  observation: { observationId: observedPositionKeyOf(position), availability: "unavailable" },
  unobservableCause: "malformed",
});

// 観測の単位の列。読めない単位は列の位置で示す単位に置き換える。配列でない入力は例外（文面は固定）。
export function readableUnitsOf(observedItems) {
  if (!Array.isArray(observedItems)) throw new TypeError("observedItems must be an array");
  return Array.from({ length: observedItems.length }, (_, position) => (isReadableUnit(observedItems[position]) ? observedItems[position] : placeholderAt(position)));
}

const entryOf = (catalog, itemKey) => catalog.find((entry) => entry?.itemKey === itemKey);

// 呼出側の単位の列が、全部読めて項目の定義に合うか（draft・回答の入口。1 つでも外れたら受けない）。
export const unitsFit = (catalog, observedItems) => Array.isArray(observedItems) && observedItems.every((unit) => isReadableUnit(unit) && unitFits(entryOf(catalog, unit.itemKey), unit));
