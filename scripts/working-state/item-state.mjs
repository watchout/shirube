// LC3 項目状態: 出典ごとの観測（LC2 の ObservedItem）を、項目ごとにちょうど 1 つの項目状態へ決める（BR3.1〜BR3.4）。
// 決める順は wrong_target → invalid → conflict → unobservable → missing → confirmed。回答を入力に取らない（回答の部品を import しない）。
// 値は閉じた形の有効な値だけ示す。開いた形は presence・lengthBucket・matchGroup だけで、値・digest・表示値を作らない（Owner の決定 116・120・122）。
// 不正・秘密らしい観測値の出典は、項目・出典・固定の分類だけ。時刻・乱数・環境変数・file を使わない（S4）。
import { deepFreeze } from "./canonical.mjs";
import { isReadableCatalogItem, isRequiredSource, positionKeyOf } from "./catalog.mjs";
import { readableUnitsOf, unitFits } from "./observed-unit.mjs";
import { valueFormOf } from "./value-exposure.mjs";

const unitKey = (unit) => `${unit.sourceRef.sourceKind}\u0000${unit.sourceRef.locator}`;
const byUnit = (a, b) => (unitKey(a) < unitKey(b) ? -1 : unitKey(a) > unitKey(b) ? 1 : 0);

// 出典ごとの読取り結果は 5 つのどれか 1 つ。形が読めない観測は有効な値にせず、観測できず（unavailable）として数える。
function kindOf(unit) {
  if (unit.observation.availability !== "observed") return "unavailable";
  if (unit.targetMatch === "differs") return "wrong_target";
  if (unit.targetMatch !== "matches") return "unavailable";
  if (unit.presence === "absent") return "absent";
  if (unit.presence !== "value") return "unavailable";
  return unit.withheld === undefined ? "value" : "invalid";
}

// 項目の観測を結果にする。出典の一覧にない出典の観測は使わず、観測が 1 つも渡されない出典は読めなかった出典（fetch_failed）として数える。
// 値が項目の定義に合わない単位（unitFits）は有効な値にせず、観測できず（malformed）として数える。
function resultsOf(entry, units) {
  const own = units.filter((unit) => unit.itemKey === entry.itemKey).sort(byUnit);
  const known = own.filter((unit) => entry.sources.some((source) => source.kind === unit.sourceRef.sourceKind));
  const results = known.map((unit) => ({ unit, kind: unitFits(entry, unit) ? kindOf(unit) : "unavailable", required: isRequiredSource(entry.sources.find((source) => source.kind === unit.sourceRef.sourceKind)) }));
  const unread = entry.sources.filter((source) => !known.some((unit) => unit.sourceRef.sourceKind === source.kind));
  return { known, results: [...results, ...unread.map((source) => ({ unit: null, kind: "unavailable", required: isRequiredSource(source) }))] };
}

const KINDS = ["wrong_target", "invalid", "value", "absent", "unavailable"];
const groupsOf = (results) => Object.fromEntries(KINDS.map((kind) => [kind, results.filter((result) => result.kind === kind)]));

// 決める順（BR3.1）。requiredForConfirmed が false の出典の absent だけを無視する。
function stateOf(groups, valueKeyOf) {
  if (groups.wrong_target.length > 0) return "wrong_target";
  if (groups.invalid.length > 0) return "invalid";
  const hasValue = groups.value.length > 0;
  const differs = new Set(groups.value.map((result) => valueKeyOf(result.unit))).size > 1;
  if (hasValue && (differs || groups.absent.some((result) => result.required))) return "conflict";
  if (groups.unavailable.length > 0) return "unobservable";
  return hasValue ? "confirmed" : "missing";
}

// 出典の参照は写す欄を名指しで取る（知らない欄を持ち込まない）。
const copyRef = (unit) => ({ sourceKind: unit.sourceRef.sourceKind, locator: unit.sourceRef.locator, targetRef: unit.sourceRef.targetRef });

// 示す値。閉じた形は digest と表示値、開いた形は長さの区分と一致の番号だけ。
function viewOf(result, form) {
  const { unit, kind } = result;
  const base = { sourceRef: copyRef(unit), presence: kind === "absent" ? "absent" : "value" };
  if (kind === "absent") return base;
  return form === "closed" ? { ...base, valueDigest: unit.valueDigest, displayValue: String(unit.value) } : { ...base, lengthBucket: unit.lengthBucket, matchGroup: unit.matchGroup };
}

const candidateOf = (result, form) => ({ candidateRef: `${result.unit.itemKey}@${result.unit.sourceRef.sourceKind}:${result.unit.sourceRef.locator}`, ...viewOf(result, form) });

// 状態ごとに示す物。順位はつけず、読めた全出典を並びの順に示す。
function detailsOf(state, groups, form) {
  if (state === "confirmed") return form === "closed" ? { confirmedValue: groups.value[0].unit.value } : {};
  if (state === "conflict") return { candidates: [...groups.value, ...groups.absent].sort((a, b) => byUnit(a.unit, b.unit)).map((result) => candidateOf(result, form)) };
  if (state === "wrong_target") {
    return {
      wrongTargets: groups.wrong_target.map((result) => ({ sourceRef: copyRef(result.unit), ...(result.unit.namedTarget === undefined ? {} : { namedTarget: result.unit.namedTarget }) })),
      referenceValues: groups.value.map((result) => viewOf(result, form)),
    };
  }
  if (state === "invalid") return { invalidSources: groups.invalid.map((result) => ({ sourceRef: copyRef(result.unit), withheld: result.unit.withheld === "invalid_format" ? "invalid_format" : "secret_like" })) };
  return {};
}

const causeOf = (result) => result.unit?.unobservableCause ?? (result.unit === null ? "fetch_failed" : "malformed");

// 読めない項目の代わり（観測できず・malformed）。項目名は項目一覧の中の位置の印（項目名の形に当たらない catalog-position-N）で、入力を写さない。
const unreadableItem = (position) => ({ itemKey: positionKeyOf(position), state: "unobservable", unobservableCauses: ["malformed"], observationRefs: [] });

function stateOfItem(entry, units, position) {
  if (!isReadableCatalogItem(entry)) return deepFreeze(unreadableItem(position));
  const { known, results } = resultsOf(entry, units);
  const form = valueFormOf(entry.valueType);
  const groups = groupsOf(results);
  const state = stateOf(groups, form === "closed" ? (unit) => unit.valueDigest : (unit) => unit.matchGroup);
  const causes = [...new Set(groups.unavailable.map(causeOf))].sort();
  return deepFreeze({
    itemKey: entry.itemKey,
    state,
    ...detailsOf(state, groups, form),
    ...(causes.length > 0 ? { unobservableCauses: causes } : {}),
    observationRefs: known.map((unit) => unit.observation.observationId).sort(),
  });
}

// 項目 1 つの状態（DraftItem の欄）。entry は項目一覧の 1 項目、observedItems は LC2 の出力の項目（ほかの項目が混ざっていてよい）。
// 読めない項目・単位は値を写さず、観測できずで示す。position は項目一覧の中の位置（読めない項目の印に使う。既定 0）。
export const evaluateItem = (entry, observedItems, position = 0) => stateOfItem(entry, readableUnitsOf(observedItems), position);

// 項目一覧の全項目の状態（一覧の順）と、一覧にない項目の名前（無視せず示す。BR3.4。読めない単位の印 observed-position-N もここに出る）。
export function evaluateItems(catalog, observedItems) {
  const units = readableUnitsOf(observedItems);
  const listed = new Set(catalog.map((entry) => entry?.itemKey));
  const unknownItemKeys = [...new Set(units.map((unit) => unit.itemKey).filter((itemKey) => !listed.has(itemKey)))].sort();
  return deepFreeze({ items: catalog.map((entry, position) => stateOfItem(entry, units, position)), unknownItemKeys });
}
