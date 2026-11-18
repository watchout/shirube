// LC5 ConfigurationDraft の組み立てと古さ（BR8.3〜BR8.5）。項目の状態（LC3）・回答（結びを再確認した列）・観測の事実から作る内部の構造体で、
// C02 へは c02-wire.mjs の変換だけを通して渡す。古さの契機は観測 digest だけ（参照名・回答からは作らない。S5）。
// 途中で失敗したら draft を返さない。許可・効果の入力（explicitStart・requestId ほか）は作らない（BR8.1・BR8.4）。
// 時刻・乱数・識別子は呼出側が渡す（S4）。draft は対話の間だけ持つ値で、何も保存しない（BR6.1）。
import { isRefId, reconcileAnswers } from "./answers.mjs";
import { deepFreeze, digestOf } from "./canonical.mjs";
import { evaluateItems } from "./item-state.mjs";
import { factsOf, isObservationStale, observationDigestOf } from "./observation-facts.mjs";

// draft を返さない理由の固定の分類（入力を写さない）。
export const DRAFT_REFUSALS = Object.freeze(["invalid_input", "build_failed"]);

const isName = (value) => typeof value === "string" && value !== "";
const refuse = (reason) => deepFreeze({ status: "refused", draft: null, reason });

// 作れる入力か。観測の対象が draft の対象と違う観測は混ぜない（別の対象の事実で draft を作らない）。
function usable({ draftId, targetRef, catalog, observedItems, answers }) {
  const shapes = [catalog, observedItems, answers].every(Array.isArray);
  return isRefId(draftId) && isName(targetRef) && shapes && observedItems.every((unit) => unit.sourceRef.targetRef === targetRef);
}

const itemKeysIn = (items, state) => items.filter((item) => item.state === state).map((item) => item.itemKey);

function assemble({ draftId, targetRef, catalog, observedItems, answers }) {
  const { items: evaluated, unknownItemKeys } = evaluateItems(catalog, observedItems);
  const current = reconcileAnswers(answers, observedItems);
  const bound = new Map(current.filter((answer) => answer.state === "answered").map((answer) => [answer.itemKey, answer.answerId]));
  const items = evaluated.map((item) => (bound.has(item.itemKey) ? { ...item, answerRef: bound.get(item.itemKey) } : item));
  const observationFacts = factsOf(observedItems);
  const observationRefs = [...new Set(observedItems.map((unit) => unit.observation.observationId))].sort();
  return {
    draftId,
    targetRef,
    items,
    answers: current,
    missingItems: itemKeysIn(items, "missing"),
    conflicts: itemKeysIn(items, "conflict"),
    observationRefs,
    observationFacts,
    observationDigest: observationDigestOf(observationFacts),
    draftDigest: digestOf({ items, answers: current, observationRefs }),
    unknownItemKeys,
  };
}

// draft を作る。入力: { draftId（呼出側が渡す）, targetRef, catalog, observedItems（LC2 の項目）, answers（今までの回答）}。
// 戻り値: { status: built, draft } か { status: refused, draft: null, reason }。入力は書き換えず、結果は凍結する。
// 不足・食い違いは回答があっても埋めた扱いにしない（missingItems・conflicts は項目の状態から導く）。
export function buildDraft(input) {
  try {
    if (typeof input !== "object" || input === null || !usable(input)) return refuse("invalid_input");
    return deepFreeze({ status: "built", draft: assemble(input) });
  } catch {
    return refuse("build_failed");
  }
}

// draft が古いか（BR8.3）。再観測の事実から再計算した観測 digest が、draft の結びと違えば古い。回答を足すだけでは変わらない。
export const isDraftStale = (draft, observedItems) => isObservationStale(draft ?? {}, "observationDigest", observedItems);
