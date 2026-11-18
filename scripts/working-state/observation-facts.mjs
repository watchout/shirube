// 観測の事実（ObservationFact）と観測 digest（LC5。BR6.2・BR8.3）。観測の単位 (対象, 項目, 出典) ごとに、実際に読んだ結果
// （LC2 の ObservedItem）から再計算する。参照名（observationId・locator）や観測の時刻・予算の使用量からは作らない（S5。参照は同じまま
// 中身が変わりうる）。閉じた形は値の digest、開いた形は presence・lengthBucket・matchGroup・固定の分類（withheld）だけで、値は事実に入らない
// （Owner の決定 116・120・122）。同じ分類の中での開いた形の中身だけの変化は事実に現れない（決定 120 の限界。U2 は保証しない）。
// 時刻・乱数・環境変数・file を使わない（S4）。
import { deepFreeze, digestOf } from "./canonical.mjs";

const VALUE_KEYS = ["presence", "valueDigest", "lengthBucket", "matchGroup", "withheld"];

const unitOf = (item) => ({
  targetRef: item.sourceRef.targetRef,
  itemKey: item.itemKey,
  sourceRef: { sourceKind: item.sourceRef.sourceKind, locator: item.sourceRef.locator },
});

const unitKey = (fact) => [fact.unit.targetRef, fact.unit.itemKey, fact.unit.sourceRef.sourceKind, fact.unit.sourceRef.locator].join("\u0000");
const byUnit = (a, b) => (unitKey(a) < unitKey(b) ? -1 : unitKey(a) > unitKey(b) ? 1 : 0);

// 値に関する欄は、観測できて、出典が対象に結ばれている（matches）時だけ持つ。differs・観測できずの出典は値・分類を持たない。
function factOf(item) {
  const observed = item.observation.availability === "observed";
  const matches = observed && item.targetMatch === "matches";
  const fact = {
    unit: unitOf(item),
    availability: observed ? "observed" : "unavailable",
    targetMatch: observed ? (item.targetMatch ?? null) : null,
    unobservableCause: observed ? null : (item.unobservableCause ?? null),
  };
  for (const key of VALUE_KEYS) fact[key] = matches ? (item[key] ?? null) : null;
  return fact;
}

// 全単位の事実を、単位の辞書順に並べて返す。
export function factsOf(observedItems) {
  return deepFreeze(observedItems.map(factOf).sort(byUnit));
}

// 事実の列（factsOf の出力）から、正規の JSON の SHA-256。古さの判定（BR8.3）に使う。回答・参照名は入力に入らない。
export const observationDigestOf = (facts) => digestOf(facts);

// 1 つの項目の観測 digest（BR6.2）。その項目の全出典の事実だけから作る。
export const itemObservationDigestOf = (itemKey, facts) => digestOf(facts.filter((fact) => fact.unit.itemKey === itemKey));
