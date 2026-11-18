// LC5 C02 の既存の受渡し形への変換（BR8.5）。内部の ConfigurationDraft・GuidanceSelection は保ち、渡す時は純粋なこの変換だけを通す。
// 契約の型（contract-summary「既存entityの受渡し形と所有」）は変えず、欄を足さず落とさない。変換できなければ渡さない。
// answers は state = answered の回答だけを itemKey をキーにした object にし、開いた形の項目の回答の値はここ（wire）にだけ現れる。
// items・draftDigest・observationFacts・observationDigest は wire に渡らない。全部が空でも「確認済み」の意味は持たない（BR8.5）。
import { deepFreeze } from "./canonical.mjs";

// 変換できない時の固定の分類（入力を写さない）。
export const WIRE_REFUSALS = Object.freeze(["not_convertible"]);

const refused = () => deepFreeze({ status: "refused", wire: null, reason: WIRE_REFUSALS[0] });
const converted = (wire) => deepFreeze({ status: "converted", wire });
const isRef = (value) => typeof value === "string" && value !== "";
const isList = (value) => Array.isArray(value) && value.every(isRef);

// 回答 1 件が C02 の entry にできるか。値の回答は値が要り、選んだ候補があれば名前が要る。無いまま（keep-absent）は選んだ候補が要る。
function convertible({ answerId, kind, value, selectedCandidateRef }) {
  if (!isRef(answerId)) return false;
  if (kind === "keep-absent") return isRef(selectedCandidateRef);
  return kind === "value" && value !== undefined && (selectedCandidateRef === undefined || isRef(selectedCandidateRef));
}

function entryOf(answer) {
  const { answerId, kind, value, selectedCandidateRef } = answer;
  return { answerId, kind, ...(kind === "value" ? { value: structuredClone(value) } : {}), ...(selectedCandidateRef === undefined ? {} : { selectedCandidateRef }) };
}

// 有効な回答の object。変換できない回答・同じ項目の有効な回答が 2 件以上なら null。
function answersObject(answers) {
  if (!Array.isArray(answers)) return null;
  const answered = answers.filter((answer) => answer?.state === "answered");
  const unique = new Set(answered.map((answer) => answer.itemKey)).size === answered.length;
  if (!unique || !answered.every((answer) => isRef(answer.itemKey) && convertible(answer))) return null;
  return Object.fromEntries(answered.map((answer) => [answer.itemKey, entryOf(answer)]));
}

// ConfigurationDraft → C02 の draft。戻り値: { status: converted, wire } か { status: refused, wire: null, reason }。
export function draftToC02Wire(draft) {
  try {
    const { draftId, targetRef, missingItems, conflicts, observationRefs } = draft;
    const answers = answersObject(draft.answers);
    const valid = answers !== null && isRef(draftId) && isRef(targetRef) && [missingItems, conflicts, observationRefs].every(isList);
    return valid ? converted({ draftId, targetRef, answers, missingItems: [...missingItems], conflicts: [...conflicts], observationRefs: [...observationRefs] }) : refused();
  } catch {
    return refused();
  }
}

// GuidanceSelection → C02 の selection。guidance は案内の text（平文の文字列）。構造体の全体と結びの観測 digest は渡さない。
export function selectionToC02Wire(selection) {
  try {
    const { selectionId, draftRef, candidateRef, targetRef, guidance, observationRef } = selection;
    const valid = [selectionId, draftRef, candidateRef, targetRef, observationRef].every(isRef) && isRef(guidance?.text);
    return valid ? converted({ selectionId, draftRef, candidateRef, targetRef, guidance: guidance.text, observationRef }) : refused();
  } catch {
    return refused();
  }
}
