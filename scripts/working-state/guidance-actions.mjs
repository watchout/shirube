// LC4 質問と次の操作（BR4.1〜BR4.4）。項目の状態から、利用者に聞く質問と、行き止まりにならない次の操作を決める。
// 次の操作の種類・観測できない原因ごとの操作は、この表だけが持つ（S3）。値を作らず、開始・適用の操作を持たない。
// 決める順は NEXT_ACTIONS の並び（先にあるほど先に済ませる操作）。時刻・乱数・環境変数・file を使わない（S4）。
import { deepFreeze } from "./canonical.mjs";
import { CAUSE_ACTIONS, LENGTH_BUCKETS } from "./normalize.mjs";
import { ITEM_NAME_RE, classifyValue, isItemKeyText, isRefName, isSecretLike, isSecretLikeRefText, valueFormOf } from "./value-exposure.mjs";

// 案内に出す語の固定の語彙（この file が持つ。案内の文面・質問・原因の欄は、入力の文字列をこの語彙と形の検査に通した物だけ写す）。
// 項目名・状態・原因・長さの区分・参照・値は入力（呼出側の draft）から来るので、固定の集合か、秘密らしさの判定の 1 か所（value-exposure）に通す。
export const WITHHELD_NAME = "（表示しません）";
const UNSAFE_TEXT = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}「」]/u;
const NAME_MAX = 64;
const REF_MAX = 200;

// 安全な文字の範囲の 1〜64 文字の文字列か。
const isPlain = (value, max) => typeof value === "string" && value !== "" && value.length <= max && !UNSAFE_TEXT.test(value);
const isSafe = (value) => isPlain(value, NAME_MAX);
// 項目名: 項目一覧の語の形（小文字の英数字と _）で、門（name の種類。(e) も当てる）を通る。
export const isItemName = (value) => typeof value === "string" && ITEM_NAME_RE.test(value) && isItemKeyText(value);
// 対象の名前・出典の種類と位置: 安全な文字の範囲で、秘密らしい・判定できない文字列は示さない。
export const isShowableName = (value) => isSafe(value) && !isSecretLike("string", value);
// 参照（観測の参照・候補の参照）: 安全な文字の範囲の 1〜200 文字で、門が全体に (a)〜(d) を先に当て、区切りで分けた部品ごとに (e) を調べて秘密らしくない。
export const isShowableRef = (value) => isPlain(value, REF_MAX) && !isSecretLikeRefText(value);
// 門の結果の理由の符号（U1 の形。大文字の英数字と _）。案内の理由の欄も同じ判定（案内を作る側・選択に写す側が 1 か所を共有する）。
const REASON_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
export const isReasonCode = (value) => typeof value === "string" && REASON_PATTERN.test(value) && isRefName(value);
// 長さの区分は固定の集合の値だけ。
export const isLengthBucket = (value) => LENGTH_BUCKETS.includes(value);

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
// 項目の状態の固定の集合（BY_STATE の鍵。案内に出す状態も同じ集合）。
export const ITEM_STATES = Object.freeze([...BY_STATE.keys()]);

const entryOf = (catalog, itemKey) => catalog.find((entry) => entry?.itemKey === itemKey);

// 閉じた形の候補の表示値。項目一覧の値の型の形式に合う値（valid）だけ示し、ほかは示さない（値の分類は value-exposure の 1 か所）。
export function shownValueOf(catalog, itemKey, value) {
  const entry = entryOf(catalog, itemKey);
  return entry !== undefined && valueFormOf(entry.valueType) === "closed" && classifyValue(entry.valueType, value) === "valid" ? value : WITHHELD_NAME;
}

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
  // 項目名が門を通らない項目は、名前を写さないので次の操作の候補にしない（questionsOf と同じ）。
  const found = items.filter((item) => isItemName(item.itemKey)).map((item) => ({ item, kind: actionOf(item, catalog) })).filter((entry) => entry.kind !== "none");
  const best = found.reduce((top, entry) => (top === null || rankOf(entry.kind) < rankOf(top.kind) ? entry : top), null);
  return best === null ? { kind: "none", itemKey: null } : { kind: best.kind, itemKey: best.item.itemKey };
}

const refsOf = (item) => (Array.isArray(item.candidates) ? item.candidates.map((candidate) => candidate.candidateRef).filter(isShowableRef) : []);

// 利用者に聞く質問（BR4.1）。答えられる項目の不足・閉じた形の食い違い・直せる不正だけ。値・回答を作らない。
export function questionsOf(items, catalog) {
  const asked = items.filter((item) => item.state !== "confirmed" && isItemName(item.itemKey)).map((item) => ({ item, kind: actionOf(item, catalog) })).filter((entry) => QUESTION_KINDS.has(entry.kind));
  return deepFreeze(asked.map(({ item, kind }) => ({ itemKey: item.itemKey, state: item.state, kind, ...(kind === "choose-source" ? { candidateRefs: refsOf(item) } : {}) })));
}
