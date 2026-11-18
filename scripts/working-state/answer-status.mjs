// LC5 回答の状態の言い方（BR6.3・BR6.4）。答えただけで「設定完了」と言わず、再観測で実際の設定と照合した結果だけを示す。
// 照合できるのは閉じた形だけ（観測値を持つため）。開いた形は観測値を保持しないので比べられず、一致も確認済みも示さない（Owner の決定 120）。
// 適用の実行と結果は U5 の持ち物で、ここは適用済みを主張しない。時刻・乱数・環境変数・file を使わない（S4）。
import { closedMatches, closedMatchesItem } from "./answer-match.mjs";
import { evaluateItem } from "./item-state.mjs";
import { factsOf, itemObservationDigestOf } from "./observation-facts.mjs";
import { valueFormOf } from "./value-exposure.mjs";

// 固定の言い方。「適用済み」「完了」の語は作らない。
export const ANSWER_STATUSES = Object.freeze(["answered_unapplied", "match_confirmed", "mismatch", "unobservable", "not_comparable", "invalidated", "rejected"]);
const [UNAPPLIED, MATCH, MISMATCH, UNOBSERVABLE, NOT_COMPARABLE, INVALIDATED, REJECTED] = ANSWER_STATUSES;

// 閉じた形の照合。一致の判定は answer-match.mjs の 1 か所が持つ。一致でない時、無い（missing）・値のある（confirmed）・
// 食い違い（conflict）は不一致、読めない・対象違い・不正の出典は観測できず。
function compareClosed(answer, item) {
  if (closedMatchesItem(answer, item)) return MATCH;
  return ["missing", "confirmed", "conflict"].includes(item.state) ? MISMATCH : UNOBSERVABLE;
}

const isObject = (value) => typeof value === "object" && value !== null;
const FIXED_BY_STATE = new Map([["rejected", REJECTED], ["invalidated", INVALIDATED]]);

// 回答の状態と結びだけで決まる言い方。決まらない（有効で結びが保たれている）時は null。
// 観測 digest が結びから変わっていても、閉じた形で再観測の値が回答と一致する時は無効にしない（BR6.2 の判定の順 (1)）。
function standing(answer, entry, observedItems) {
  if (answer?.state !== "answered") return FIXED_BY_STATE.get(answer?.state) ?? UNOBSERVABLE;
  const unchanged = itemObservationDigestOf(answer.itemKey, factsOf(observedItems)) === answer.boundObservationDigest;
  return unchanged || closedMatches(answer, entry, observedItems) ? null : INVALIDATED;
}

// 回答 1 件の言い方。入力: { answer, entry（項目の定義）, observedItems（LC2 の項目）, reobserved（呼出側が再観測した時だけ true）}。
// 観測 digest が変わった回答は、閉じた形で値が一致する時だけ一致を確認と示し、それ以外は invalidated（BR6.2 の順）。読めない入力は一致と示さず unobservable。
export function answerStatusOf({ answer, entry, observedItems, reobserved }) {
  try {
    const fixed = standing(answer, entry, observedItems);
    if (fixed !== null) return fixed;
    if (reobserved !== true) return UNAPPLIED;
    if (!isObject(entry)) return UNOBSERVABLE;
    return valueFormOf(entry.valueType) === "open" ? NOT_COMPARABLE : compareClosed(answer, evaluateItem(entry, observedItems));
  } catch {
    return UNOBSERVABLE;
  }
}
