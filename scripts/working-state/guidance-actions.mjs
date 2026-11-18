// LC4 質問と次の操作（BR4.1〜BR4.4）。項目の状態から、利用者に聞く質問と、行き止まりにならない次の操作を決める。
// 次の操作の種類・観測できない原因ごとの操作は、この表だけが持つ（S3）。値を作らず、開始・適用の操作を持たない。
// 決める順は NEXT_ACTIONS の並び（先にあるほど先に済ませる操作）。時刻・乱数・環境変数・file を使わない（S4）。
import { deepFreeze } from "./canonical.mjs";
import { valueFormOf } from "./value-exposure.mjs";

// 次の操作の種類（E05 の nextAction.kind）。並びが優先の順（権限 → 道具 → 質問 → 選択 → 対象 → 出典 → 待ち → なし）。
export const NEXT_ACTIONS = Object.freeze(["confirm-permission", "install-or-upgrade-tool", "answer-question", "choose-source", "review-target", "fix-source", "wait-for-person", "none"]);

// 次の操作の文（利用者が自分で行う操作だけ。案内は開始・適用を行わない）。
export const ACTION_TEXTS = Object.freeze({
  "confirm-permission": "読み取りの権限と、対象が存在するかを確認してください。",
  "install-or-upgrade-tool": "必要な道具の有無と版を確認し、入れる・上げる操作は利用者が行ってください。",
  "answer-question": "次の質問に、実際の値で答えてください。",
  "choose-source": "食い違っている出典のうち、正しい方を選んでください。",
  "review-target": "観測した対象が、今の作業の対象と同じかを確認してください。",
  "fix-source": "出典の形式と中身を確認し、直せる人に知らせてください。",
  "wait-for-person": "状態が変わったかを確認してから、もう一度観測してください。",
  none: "追加の操作はありません。開始・適用はこの案内の範囲外です。",
});

// 観測できない原因ごとの確認操作。表にない原因は、止まらずに人へ戻す（wait-for-person）。
const CAUSE_ACTIONS = new Map([
  ["permission_denied", "confirm-permission"], ["not_found_unconfirmed", "confirm-permission"],
  ["tool_missing", "install-or-upgrade-tool"], ["tool_unsupported_version", "install-or-upgrade-tool"], ["tool_cannot_start", "install-or-upgrade-tool"],
  ["out_of_boundary", "review-target"], ["malformed", "fix-source"],
  ["fetch_failed", "wait-for-person"], ["timed_out", "wait-for-person"], ["budget_exceeded", "wait-for-person"], ["changed_during_read", "wait-for-person"],
]);
const FALLBACK_ACTION = "wait-for-person";
const rankOf = (kind) => NEXT_ACTIONS.indexOf(kind);
const strongest = (kinds) => kinds.reduce((best, kind) => (rankOf(kind) < rankOf(best) ? kind : best), "none");

const causesOf = (item) => (Array.isArray(item.unobservableCauses) ? item.unobservableCauses : []);
const unobservableAction = (item) => {
  const kinds = causesOf(item).map((cause) => CAUSE_ACTIONS.get(cause) ?? FALLBACK_ACTION);
  return kinds.length === 0 ? FALLBACK_ACTION : strongest(kinds);
};

// 状態ごとの次の操作。答えられる項目だけが質問になり、答えられない項目・直せない形は出典を直す操作になる。
const BY_STATE = new Map([
  ["confirmed", () => "none"],
  ["missing", ({ answerable, tool }) => (answerable ? "answer-question" : tool ? "install-or-upgrade-tool" : "fix-source")],
  ["conflict", ({ answerable, closed }) => (answerable && closed ? "choose-source" : "fix-source")],
  ["invalid", ({ answerable }) => (answerable ? "answer-question" : "fix-source")],
  ["wrong_target", () => "review-target"],
  ["unobservable", ({ item }) => unobservableAction(item)],
]);
const QUESTION_KINDS = new Set(["answer-question", "choose-source"]);

const entryOf = (catalog, itemKey) => catalog.find((entry) => entry?.itemKey === itemKey);

// 項目の値の形（閉じた形か開いた形か）。項目一覧にない項目は開いた形として扱い、値を示さない側に倒す。
export const formOf = (catalog, itemKey) => {
  const entry = entryOf(catalog, itemKey);
  return entry !== undefined && valueFormOf(entry.valueType) === "closed" ? "closed" : "open";
};

const contextOf = (item, catalog) => {
  const entry = entryOf(catalog, item.itemKey);
  return {
    item,
    answerable: entry?.userAnswerable === true,
    closed: formOf(catalog, item.itemKey) === "closed",
    tool: Array.isArray(entry?.sources) && entry.sources.some((source) => source?.kind === "tool_probe"),
  };
};

// 項目 1 つの次の操作。現在の観測に結ぶ回答（answerRef）がある項目は、再び聞かない（BR4.3）。
export function actionOf(item, catalog) {
  const kind = (BY_STATE.get(item.state) ?? (() => FALLBACK_ACTION))(contextOf(item, catalog));
  return item.answerRef !== undefined && QUESTION_KINDS.has(kind) ? "none" : kind;
}

// 未確認の項目のうち、いちばん先に済ませる操作とその項目。全部が none なら none（項目は無い）。
export function strongestAction(items, catalog) {
  const found = items.map((item) => ({ item, kind: actionOf(item, catalog) })).filter((entry) => entry.kind !== "none");
  const best = found.reduce((top, entry) => (top === null || rankOf(entry.kind) < rankOf(top.kind) ? entry : top), null);
  return best === null ? { kind: "none", itemKey: null } : { kind: best.kind, itemKey: best.item.itemKey };
}

const refsOf = (item) => (Array.isArray(item.candidates) ? item.candidates.map((candidate) => candidate.candidateRef).filter((ref) => typeof ref === "string") : []);

// 利用者に聞く質問（BR4.1）。答えられる項目の不足・閉じた形の食い違い・直せる不正だけ。値・回答を作らない。
export function questionsOf(items, catalog) {
  const asked = items.filter((item) => item.state !== "confirmed").map((item) => ({ item, kind: actionOf(item, catalog) })).filter((entry) => QUESTION_KINDS.has(entry.kind));
  return deepFreeze(asked.map(({ item, kind }) => ({ itemKey: item.itemKey, state: item.state, kind, ...(kind === "choose-source" ? { candidateRefs: refsOf(item) } : {}) })));
}
