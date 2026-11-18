// LC5 回答の状態の言い方（BR6.3・BR6.4）。答えただけで「設定完了」と言わず、再観測で実際の設定と照合した結果だけを示す。
// 照合できるのは閉じた形だけ（観測値を持つため）。開いた形は観測値を保持しないので比べられず、一致も確認済みも示さない（Owner の決定 120）。
// 適用の実行と結果は U5 の持ち物で、ここは適用済みを主張しない。時刻・乱数・環境変数・file を使わない（S4）。
import { digestOf } from "./canonical.mjs";
import { evaluateItem } from "./item-state.mjs";
import { factsOf, itemObservationDigestOf } from "./observation-facts.mjs";
import { valueFormOf } from "./value-exposure.mjs";

// 固定の言い方。「適用済み」「完了」の語は作らない。
export const ANSWER_STATUSES = Object.freeze(["answered_unapplied", "match_confirmed", "mismatch", "unobservable", "not_comparable", "invalidated", "rejected"]);
const [UNAPPLIED, MATCH, MISMATCH, UNOBSERVABLE, NOT_COMPARABLE, INVALIDATED, REJECTED] = ANSWER_STATUSES;

// 閉じた形の照合。無い（missing）は「選ばなかった」回答だけが一致、値のある（confirmed）は値の digest の一致、
// 食い違い（conflict）は一致でない。読めない・対象違い・不正の出典は観測できず。
function compareClosed(answer, item) {
  if (item.state === "missing") return answer.kind === "keep-absent" ? MATCH : MISMATCH;
  if (item.state === "confirmed") return answer.kind === "value" && digestOf(item.confirmedValue) === answer.valueDigest ? MATCH : MISMATCH;
  return item.state === "conflict" ? MISMATCH : UNOBSERVABLE;
}

const isObject = (value) => typeof value === "object" && value !== null;
const FIXED_BY_STATE = new Map([["rejected", REJECTED], ["invalidated", INVALIDATED]]);

// 回答の状態と結びだけで決まる言い方。決まらない（有効で結びが保たれている）時は null。
function standing(answer, observedItems) {
  if (answer?.state !== "answered") return FIXED_BY_STATE.get(answer?.state) ?? UNOBSERVABLE;
  return itemObservationDigestOf(answer.itemKey, factsOf(observedItems)) === answer.boundObservationDigest ? null : INVALIDATED;
}

// 回答 1 件の言い方。入力: { answer, entry（項目の定義）, observedItems（LC2 の項目）, reobserved（呼出側が再観測した時だけ true）}。
// 結びの先の観測 digest が変わった回答は、一致していても invalidated（BR6.2 の文面どおり）。読めない入力は一致と示さず unobservable。
export function answerStatusOf({ answer, entry, observedItems, reobserved }) {
  try {
    const fixed = standing(answer, observedItems);
    if (fixed !== null) return fixed;
    if (reobserved !== true) return UNAPPLIED;
    if (!isObject(entry)) return UNOBSERVABLE;
    return valueFormOf(entry.valueType) === "open" ? NOT_COMPARABLE : compareClosed(answer, evaluateItem(entry, observedItems));
  } catch {
    return UNOBSERVABLE;
  }
}
