// 選択に写す案内の構造体（E05 の GuidanceMessage）の読み方（LC5）。案内は呼出側が手で作れるので、写す前に欄ごとの形を 1 か所のこの判定に通す
// （閉じた一覧 A・固定の形 B・唯一の門 C。決定 95 の 2 回目の追い指示）。通らない構造体は写さず null を返す。
// 語彙・形の持ち主は guidance-actions（種類・状態・原因・理由の符号・項目名・参照）と value-exposure（文の門）の各 1 か所で、ここは欄ごとに呼ぶだけ（S3）。
// 写すのは名指しの欄だけ（上位の知らない欄は写さない。入れ子の欄は、知らない名前があれば構造体ごと断る）。時刻・乱数・環境変数・file を使わない（S4）。
import { ITEM_STATES, NEXT_ACTIONS, isItemName, isReasonCode, isShowableRef } from "./guidance-actions.mjs";
import { isKnownCause } from "./normalize.mjs";
import { isGuidanceText, isRefName } from "./value-exposure.mjs";

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const optional = (value, isGood) => value === undefined || isGood(value);
const listOf = (isGood) => (value) => Array.isArray(value) && Array.from({ length: value.length }, (_, i) => value[i]).every(isGood);
const hasOnly = (value, keys) => isObject(value) && Reflect.ownKeys(value).every((key) => keys.includes(key));

const isNextAction = (value) => hasOnly(value, ["kind", "text"]) && NEXT_ACTIONS.includes(value.kind) && isGuidanceText(value.text);
const isCause = (value) => hasOnly(value, ["itemKey", "state", "unobservableCause"]) && isItemName(value.itemKey) && ITEM_STATES.includes(value.state) && optional(value.unobservableCause, isKnownCause);

// 案内の欄ごとの検査（欄の名前 → 値の検査）。ここに無い上位の欄は持たない。
const FIELD_CHECKS = {
  targetRef: isRefName,
  conclusion: isGuidanceText,
  nextAction: isNextAction,
  causes: listOf(isCause),
  unconfirmed: listOf(isItemName),
  reasons: listOf(isReasonCode),
  observationRefs: listOf(isShowableRef),
  blocking: (value) => typeof value === "boolean",
  text: isGuidanceText,
};

// 写してよい案内の写し（名指しの欄だけ）。text が無い・読めない欄がある・例外を起こす（getter など）入力は null。
export function guidanceCopyOf(guidance) {
  try {
    if (!isObject(guidance) || !isGuidanceText(guidance.text)) return null;
    const keys = Object.keys(FIELD_CHECKS).filter((key) => guidance[key] !== undefined);
    if (!keys.every((key) => FIELD_CHECKS[key](guidance[key]))) return null;
    return Object.fromEntries(keys.map((key) => [key, structuredClone(guidance[key])]));
  } catch {
    return null;
  }
}
