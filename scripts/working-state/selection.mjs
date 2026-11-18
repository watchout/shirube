// LC5 GuidanceSelection（BR8.1・BR8.2・BR8.4）。利用者が食い違う候補を 1 つ選んだことを、draft と案内に結んで C02 へ渡せる形にするだけ。
// 開始・適用の許可でも公開の Owner 決定でもなく、explicitStart・requestId ほかの欄を作らない。選べるのは、利用者が答えられる閉じた形の項目の
// 食い違いの候補（値のある出典・無い出典）に限る。案内（GuidanceMessage）の文・外から来た文字列は、データとして保つだけで命令として評価しない。
// 時刻・乱数・識別子は呼出側が渡す（S4）。
import { isRefId } from "./answers.mjs";
import { deepFreeze, isDigest } from "./canonical.mjs";
import { guidanceCopyOf } from "./guidance-copy.mjs";
import { isObservationStale } from "./observation-facts.mjs";
import { isItemKeyText, isRefName, valueFormOf } from "./value-exposure.mjs";

// 選択にしない理由の固定の分類（入力を写さない）。
export const SELECTION_REFUSALS = Object.freeze(["invalid_input", "unknown_candidate", "not_selectable", "unknown_observation", "invalid_guidance"]);

const refuse = (reason) => deepFreeze({ status: "refused", selection: null, reason });
const isObject = (value) => typeof value === "object" && value !== null;

const wellFormed = ({ selectionId, draft, catalog }) =>
  isRefId(selectionId) && isObject(draft) && Array.isArray(draft.items) && Array.isArray(draft.observationRefs) && Array.isArray(catalog) && isRefId(draft.draftId) && isRefName(draft.targetRef)
  && (draft.observationDigest === undefined || isDigest(draft.observationDigest)); // 結びの観測 digest は結果の欄に写るので、digest の形だけ（未指定は可）。

// 候補を持つ項目（食い違いの項目）。見つからなければ null。
const itemOf = (draft, candidateRef) => draft.items.find((item) => item.candidates?.some((candidate) => candidate.candidateRef === candidateRef)) ?? null;
const selectable = (catalog, item) => {
  const entry = catalog.find((candidate) => candidate.itemKey === item.itemKey);
  return entry?.userAnswerable === true && valueFormOf(entry.valueType) === "closed";
};

function check(input) {
  if (!wellFormed(input)) return "invalid_input";
  const item = itemOf(input.draft, input.candidateRef);
  if (item === null) return "unknown_candidate";
  if (!isItemKeyText(item.itemKey)) return "invalid_input"; // 候補の参照（項目名@…）に入る項目名も、(e) を当てる門を通す。
  if (!selectable(input.catalog, item)) return "not_selectable";
  if (!input.draft.observationRefs.includes(input.observationRef)) return "unknown_observation";
  // 選んだ候補・観測の参照は選択の構造体にそのまま入るので、手で作った draft の参照でも (a)〜(d) の形を持たないこと。
  if (!isRefName(input.candidateRef) || !isRefName(input.observationRef)) return "invalid_input";
  return guidanceCopyOf(input.guidance) === null ? "invalid_guidance" : null;
}

// 選択を作る。入力: { selectionId（呼出側が渡す）, draft（buildDraft の draft）, catalog, candidateRef, observationRef, guidance }。
// 戻り値: { status: created, selection } か { status: refused, selection: null, reason }。draftObservationDigest は内部の結びで、wire に渡らない。
export function createSelection(input) {
  try {
    const reason = check(input);
    if (reason !== null) return refuse(reason);
    const { selectionId, draft, candidateRef, observationRef, guidance } = input;
    const selection = { selectionId, draftRef: draft.draftId, candidateRef, targetRef: draft.targetRef, guidance: guidanceCopyOf(guidance), observationRef, draftObservationDigest: draft.observationDigest };
    return deepFreeze({ status: "created", selection });
  } catch {
    return refuse("invalid_input");
  }
}

// 選択が古いか（BR8.3）。結びの観測 digest が、再観測の事実から再計算した digest と違えば古い。
export const isSelectionStale = (selection, observedItems) => isObservationStale(selection ?? {}, "draftObservationDigest", observedItems);
