// LC4 案内（BR7.1〜BR7.7、BR9.2、BR9.4）。draft の項目の状態と門の結果（U1 の ConformanceAssessment。読むだけ）から、
// GuidanceMessage（E05）の決まった欄と飾りのない文面を作る。未確認を確認済みにせず、値・秘密を出さず、開始・適用の許可の欄を作らない。
// 開いた形の値は示さない（長さの区分と一致の組だけ）。外から来た文字列は固定の文字の範囲だけ写す。同じ入力は同じ案内（BR7.3）。
// 時刻・乱数・識別子・環境変数・file を使わない（S4）。
import { deepFreeze } from "./canonical.mjs";
import { ACTION_TEXTS, ITEM_STATES, WITHHELD_NAME, formOf, isItemName, isKnownCause, isLengthBucket, isShowableName, isShowableRef, questionsOf, shownValueOf, strongestAction } from "./guidance-actions.mjs";
import { hasTokenPrefix, isRefName } from "./value-exposure.mjs";

// 案内にしない理由の固定の分類（入力を写さない）。
export const GUIDANCE_REFUSALS = Object.freeze(["invalid_input", "build_failed"]);

const OUTCOMES = ["PASS", "FAIL", "UNKNOWN"];
const REASON_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const UNREAD_RESULT = "結果を確認できず";
const ANSWERED = "回答済み・未適用（実際の設定はまだ確認できていません）";
const NOT_STARTABLE = "開始できない理由: 未確認の項目が残っているため、開始できません。";

const isObject = (value) => typeof value === "object" && value !== null;
const listOf = (value) => (Array.isArray(value) ? value.filter(isObject) : []);
// 語彙・形の検査は guidance-actions が持つ（項目名・状態・原因・区分・参照・値は、固定の集合か秘密らしさの 1 か所の判定に通した物だけ写す）。
const nameOr = (value) => (isShowableName(value) ? value : WITHHELD_NAME);
const bucketOr = (value) => (isLengthBucket(value) ? value : WITHHELD_NAME);
const sourceName = (ref) => `${nameOr(ref?.sourceKind)}:${nameOr(ref?.locator)}`;
const causesOf = (item) => (Array.isArray(item.unobservableCauses) ? item.unobservableCauses.filter(isKnownCause) : []);

// 門の結果。読めない形（欠け・型違い・U1 の符号の形でない文字）は null で、結果を確認できずと書く。
function conformanceOf(value) {
  try {
    if (!isObject(value) || !OUTCOMES.includes(value.outcome) || !Array.isArray(value.reasons)) return null;
    const reasons = [...value.reasons];
    return reasons.every((reason) => typeof reason === "string" && REASON_PATTERN.test(reason) && !hasTokenPrefix(reason)) ? { outcome: value.outcome, reasons } : null;
  } catch {
    return null;
  }
}
const gateLine = (gate) => (gate === null ? UNREAD_RESULT : `${gate.outcome}${gate.reasons.length > 0 ? `（${gate.reasons.join(", ")}）` : ""}`);

function candidateLine(candidate, closed, shown) {
  const name = sourceName(candidate.sourceRef);
  if (candidate.presence === "absent") return `  - ${name}: 無し`;
  if (closed) return `  - ${name}: ${shown(candidate.displayValue)}`;
  return `  - ${name}: 長さ ${bucketOr(candidate.lengthBucket)}・一致の組 ${Number.isInteger(candidate.matchGroup) ? candidate.matchGroup : "不明"}`;
}
const withheldNote = (sources) => (sources.some((source) => source.withheld === "secret_like") ? "秘密に見える値のため、値は表示しません。存在と参照名だけを知らせてください" : "形式が正しくありません");

// 状態ごとの行（先頭の行 + 補足の行）。値は閉じた形の有効な値だけ示す。
const LINES = new Map([
  ["missing", (item) => [`- ${item.itemKey}: 不足`]],
  ["conflict", (item, form, shown) => {
    const candidates = listOf(item.candidates);
    return [`- ${item.itemKey}: 食い違い（候補 ${candidates.length} 件）`, ...candidates.map((candidate) => candidateLine(candidate, form === "closed", shown))];
  }],
  ["invalid", (item) => {
    const sources = listOf(item.invalidSources);
    return [`- ${item.itemKey}: 不正（${withheldNote(sources)}）`, ...sources.map((source) => `  - ${sourceName(source.sourceRef)}`)];
  }],
  ["wrong_target", (item) => [`- ${item.itemKey}: 対象違い（観測の対象名: ${listOf(item.wrongTargets).map((entry) => (isShowableName(entry.namedTarget) ? entry.namedTarget : "対象の名前は表示しません")).join(", ")}）`]],
  ["unobservable", (item) => [`- ${item.itemKey}: 観測不能${causesOf(item).length > 0 ? `（原因: ${causesOf(item).join(", ")}）` : ""}`]],
]);

function linesOf(item, catalog) {
  if (item.answerRef !== undefined) return [`- ${item.itemKey}: ${ANSWERED}`];
  return LINES.get(item.state)(item, formOf(catalog, item.itemKey), (value) => shownValueOf(catalog, item.itemKey, value));
}

// 原因の欄。観測できない項目は原因ごとに 1 つ、ほかは状態だけ。
function causesFor(item) {
  const causes = item.state === "unobservable" ? causesOf(item) : [];
  return causes.length === 0 ? [{ itemKey: item.itemKey, state: item.state }] : causes.map((unobservableCause) => ({ itemKey: item.itemKey, state: item.state, unobservableCause }));
}

const validItem = (item) => isObject(item) && isItemName(item.itemKey) && ITEM_STATES.includes(item.state);
const isTextList = (value) => Array.isArray(value) && value.every((entry) => typeof entry === "string");

// 作れる入力か。draft は項目 1 つ以上・対象・観測の参照を持ち、項目一覧は配列。
function wellFormed(input) {
  if (!isObject(input) || !isObject(input.draft) || !Array.isArray(input.catalog)) return false;
  const { items, targetRef, observationRefs } = input.draft;
  return Array.isArray(items) && items.length > 0 && items.every(validItem) && isRefName(targetRef) && isTextList(observationRefs);
}

const refuse = (reason) => deepFreeze({ status: "refused", guidance: null, questions: null, reason });

function compose(input) {
  const { draft, catalog } = input;
  const unconfirmed = draft.items.filter((item) => item.state !== "confirmed");
  const gate = conformanceOf(input.conformance);
  const best = strongestAction(unconfirmed, catalog);
  const nextAction = { kind: best.kind, text: best.itemKey === null ? ACTION_TEXTS[best.kind] : `${best.itemKey}: ${ACTION_TEXTS[best.kind]}` };
  const conclusion = unconfirmed.length === 0 ? "確認が必要な項目はありません。" : `未確認の項目が ${unconfirmed.length} 件あります。`;
  const lines = unconfirmed.flatMap((item) => linesOf(item, catalog));
  const refs = draft.observationRefs.filter(isShowableRef);
  const hidden = draft.observationRefs.length - refs.length;
  const text = [
    `結論: ${conclusion}`, `次の操作: ${nextAction.text}`, "原因・未確認:", ...(lines.length > 0 ? lines : ["- なし"]),
    `ゲートの結果: ${gateLine(gate)}`, ...(unconfirmed.length > 0 ? [NOT_STARTABLE] : []),
    `根拠の参照: ${refs.length > 0 ? refs.join(", ") : "なし"}${hidden > 0 ? `（表示しない参照 ${hidden} 件）` : ""}`,
  ].join("\n");
  const guidance = {
    targetRef: draft.targetRef, conclusion, nextAction,
    causes: unconfirmed.flatMap(causesFor), unconfirmed: unconfirmed.map((item) => item.itemKey), reasons: gate === null ? [] : gate.reasons,
    observationRefs: refs, blocking: best.kind !== "none", text,
  };
  return deepFreeze({ status: "built", guidance, questions: questionsOf(draft.items, catalog) });
}

// draft・項目一覧・門の結果から案内と質問を作る。作れない入力は固定の分類だけ返し、入力を写さない。例外は外へ出さない。
export function buildGuidance(input) {
  try {
    return wellFormed(input) ? compose(input) : refuse("invalid_input");
  } catch {
    return refuse("build_failed");
  }
}
