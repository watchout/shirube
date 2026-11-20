// 観測の単位（LC2 の ObservedItem）の読み方（LC3・LC5 の入口）。観測の単位は呼出側が手で作れるので、写す欄を読む前に、1 か所のこの判定に通す
// （閉じた一覧 A・固定の形 B・唯一の門 C。決定 95 の 2 回目の追い指示）。通らない単位は値を写さず、観測した物にも成功にも数えず、
// 列の位置で示す観測できず（unavailable・malformed）の単位に置き換える（印は項目名の形の observed-position-N。入力から作らない）。
// 他の部品へ import するのは閉じた一覧・門だけ（判定の持ち主は value-exposure・catalog・guidance-actions の各 1 か所）。時刻・乱数・環境変数・file を使わない（S4）。
import { digestOf, isDigest } from "./canonical.mjs";
import { SOURCE_KINDS } from "./catalog.mjs";
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

// 値を持てる単位の形（観測できて、出典が対象に結ばれ、値があり、保留されていない）。値・digest はこの形の単位だけが持つ（LC2 の interpretItem と同じ関係）。
const bearsValue = (unit) => unit.observation.availability === "observed" && unit.targetMatch === "matches" && unit.presence === "value" && unit.withheld === undefined;

// 値と digest の関係（S5: 渡された digest は証拠でない）。digest は値から計算し直して照らし、値のない digest・値だけの単位・値を持てない形の値は受けない。
const isValueCoherent = (unit) => (unit.value === undefined ? unit.valueDigest === undefined : bearsValue(unit) && unit.valueDigest === digestOf(unit.value));

// 出典が名指した対象と targetMatch の関係。名指した対象が出典の対象と同じ時だけ matches（観測した事実から再計算する）。
const isTargetCoherent = (unit) => unit.namedTarget === undefined || (unit.targetMatch !== undefined && (unit.targetMatch === "matches") === (unit.namedTarget === unit.sourceRef.targetRef));

// 単位が読めるか（値以外の各欄の形と、欄どうしの関係）。getter などで例外を起こす入力は読めない（失敗側）。
export function isReadableUnit(unit) {
  try {
    return isObject(unit) && isItemKeyText(unit.itemKey) && isReadableRef(unit.sourceRef) && isReadableObservation(unit.observation)
      && OPTIONAL_CHECKS.every(([field, isGood]) => optional(unit[field], isGood)) && isValueCoherent(unit) && isTargetCoherent(unit);
  } catch {
    return false;
  }
}

// 値を持つ形の単位（presence が value で保留なし）が、項目の定義の形で証拠を持つか。閉じた形は形式に合う値（digest は isReadableUnit が値から照らし済み）、
// 開いた形は値・digest を持たず、長さの区分と一致の番号を持つ。値を持てない形の単位は、値を持たない（isReadableUnit が見る）ので問わない。
function bearsEvidence(entry, unit) {
  if (valueFormOf(entry.valueType) === "closed") return classifyValue(entry.valueType, unit.value) === "valid";
  return unit.value === undefined && unit.lengthBucket !== undefined && unit.matchGroup !== undefined;
}

// 単位が項目の定義に合うか。項目が一覧にない単位は値を使わない（evaluate は無視し、一覧にない項目として示す）ので、定義を問わない。
export function unitFits(entry, unit) {
  if (entry === undefined) return true;
  return !bearsValue(unit) || bearsEvidence(entry, unit);
}

// 読めない単位の代わり。観測できず（malformed）で、値・presence・対象の結びを持たない。この形自身も isReadableUnit を通る（置き換えは何度しても同じ）。
const placeholderAt = (position) => ({
  itemKey: observedPositionKeyOf(position),
  sourceRef: { sourceKind: UNREADABLE, locator: UNREADABLE, targetRef: UNREADABLE },
  observation: { observationId: observedPositionKeyOf(position), availability: "unavailable" },
  unobservableCause: "malformed",
});

// 単位の識別（対象・項目・出典の種類・位置）。同じ識別の単位は 1 つだけ受ける。
const identityOf = (unit) => [unit.sourceRef.targetRef, unit.itemKey, unit.sourceRef.sourceKind, unit.sourceRef.locator].join("\u0000");

// 観測の単位の列。読めない単位と、同じ識別の単位（再送・食い違う 2 つ目。どちらが本物か決めない）は、全部列の位置で示す単位に置き換える。配列でない入力は例外（文面は固定）。
export function readableUnitsOf(observedItems) {
  if (!Array.isArray(observedItems)) throw new TypeError("observedItems must be an array");
  const readable = observedItems.map((unit) => isReadableUnit(unit));
  const counts = new Map();
  observedItems.forEach((unit, position) => { if (readable[position]) counts.set(identityOf(unit), (counts.get(identityOf(unit)) ?? 0) + 1); });
  return observedItems.map((unit, position) => (readable[position] && counts.get(identityOf(unit)) === 1 ? unit : placeholderAt(position)));
}

// 1 回の評価に入る単位が 1 つの対象だけか。別の対象の出典を互いの必須の証拠にしない（読めない単位の代わりは対象を持たないので数えない）。
export const sharesOneTarget = (units) => new Set(units.filter((unit) => unit.sourceRef.sourceKind !== UNREADABLE).map((unit) => unit.sourceRef.targetRef)).size <= 1;

const entryOf = (catalog, itemKey) => catalog.find((entry) => entry?.itemKey === itemKey);

// 呼出側の単位の列が、全部読めて（重複なし）項目の定義に合い、1 つの対象にそろうか（draft・回答の入口。1 つでも外れたら受けない）。
export function unitsFit(catalog, observedItems) {
  if (!Array.isArray(observedItems)) return false;
  const units = readableUnitsOf(observedItems);
  return units.every((unit, position) => unit === observedItems[position] && unitFits(entryOf(catalog, unit.itemKey), unit)) && sharesOneTarget(units);
}
