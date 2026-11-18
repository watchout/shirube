// LC5 回答（BR5.1〜BR5.4・BR6.2）。回答はデータとして受け、型・長さ・文字・path の境界と秘密らしさを検査する。許される形式の表と
// 秘密らしさの判定は value-exposure の 1 か所が持ち、ここは呼ぶだけ（S3）。rejected の回答は value も valueDigest も持たず、
// 理由は入力から作らない固定の分類だけ（入力の一部も写さない）。時刻・乱数・識別子は呼出側が渡す（S4）。回答は対話の間だけ持つ値で、何も保存しない（BR6.1）。
import { closedMatches } from "./answer-match.mjs";
import { deepFreeze, digestOf } from "./canonical.mjs";
import { elementShapeOf, normalizationOf } from "./catalog.mjs";
import { parseInstant } from "./instant.mjs";
import { evaluateItem } from "./item-state.mjs";
import { normalizeValue } from "./normalize.mjs";
import { factsOf, itemObservationDigestOf } from "./observation-facts.mjs";
import { VALUE_REJECTION_REASONS, hasRefTokenPrefix, rejectionReasonOf } from "./value-exposure.mjs";

// 回答を拒む理由の固定の分類（BR5.1）。値の検査の分類に、受付の分類（古い回答・同時刻で値が違う回答）を足した全部。
export const REJECTION_REASONS = Object.freeze([...VALUE_REJECTION_REASONS, "stale_answer", "duplicate_conflict"]);
const KINDS = ["value", "keep-absent"];
const ID_RE = /^[A-Za-z0-9._:-]{1,64}$/;

// 呼出側が渡す識別（回答・draft・選択）の形。識別の許される形はここ 1 か所が持つ（S3）。
// 区切り（| @ :）の後ろも含めて既知の token の接頭辞で始まる部品を持つ形は識別にしない（識別は出力・wire にそのまま写るため。判定は value-exposure の 1 か所）。
export const isRefId = (value) => typeof value === "string" && ID_RE.test(value) && !hasRefTokenPrefix(value);

const entryIn = (catalog, itemKey) => (Array.isArray(catalog) ? catalog.find((candidate) => candidate?.itemKey === itemKey) : undefined);

// 結びの先の項目の観測 digest が変わった有効な回答は、閉じた形で再観測の値が回答と一致する時（判定は answer-match の 1 か所）だけ無効にしない。
const isStale = (answer, facts, catalog, observedItems) =>
  answer.state === "answered"
  && itemObservationDigestOf(answer.itemKey, facts) !== answer.boundObservationDigest
  && !closedMatches(answer, entryIn(catalog, answer.itemKey), observedItems);

// 有効な回答のうち、結びの先の項目の観測 digest が変わったものを invalidated にする（BR6.2。順は (1) 一致を確認を先に、(2) それ以外で無効）。
// catalog（項目の定義）が無い・項目が見つからない時は (1) を成立させず従来の (2)（一致と読み替えない側）。ほかの回答はそのまま。
export function reconcileAnswers(answers, observedItems, catalog) {
  const facts = factsOf(observedItems);
  return deepFreeze(answers.map((answer) => (isStale(answer, facts, catalog, observedItems) ? { ...answer, state: "invalidated" } : answer)));
}

// 入力の欄を 1 回だけ読む。object でない・読むと例外を起こす入力は null（保持しない）。
function snapshot(input) {
  try {
    if (typeof input !== "object" || input === null) return null;
    const { answerId, itemKey, kind, value, selectedCandidateRef, answeredAt } = input;
    return { answerId, itemKey, kind, value, selectedCandidateRef, answeredAt };
  } catch {
    return null;
  }
}

const reject = (reason, kind) => ({ reason, kind });
const accept = (kind, parts) => ({ accepted: { kind, ...parts } });

// 候補（DraftItem.candidates の 1 つ）を指す選択の回答。値は候補の閉じた形の値だけ。開いた形は値を持たないので受けない。
function chosen(kind, candidate) {
  if (candidate?.presence === "absent" && kind === "keep-absent") return accept(kind, { selectedCandidateRef: candidate.candidateRef });
  const usable = kind === "value" && candidate?.presence === "value" && candidate.valueDigest !== undefined;
  return usable ? accept(kind, { value: candidate.displayValue, valueDigest: candidate.valueDigest, selectedCandidateRef: candidate.candidateRef }) : reject("invalid_format", kind);
}

function typed(entry, kind, value) {
  const reason = rejectionReasonOf(entry.valueType, value, elementShapeOf(entry));
  if (reason !== null) return reject(reason, kind);
  const normalized = normalizeValue(entry.valueType, normalizationOf(entry), value);
  return accept(kind, { value: normalized, valueDigest: digestOf(normalized) });
}

// 回答の中身の検査。拒む時は { reason, kind }（kind が読めない時は null）、受ける時は { accepted }。
function check(entry, item, fields) {
  if (!KINDS.includes(fields.kind)) return reject("invalid_type", null);
  if (entry.userAnswerable !== true) return reject("out_of_boundary", fields.kind);
  const named = fields.selectedCandidateRef !== undefined || fields.kind === "keep-absent";
  if (!named) return typed(entry, fields.kind, fields.value);
  return chosen(fields.kind, item.candidates?.find((candidate) => candidate.candidateRef === fields.selectedCandidateRef));
}

const outcome = (status, answer, answers) => deepFreeze({ status, answer, answers });

function rejectedRecord(base, kind, reason) {
  return { ...base, ...(kind === null ? {} : { kind }), state: "rejected", rejectionReason: reason };
}

const sameContent = (a, b) => a.kind === b.kind && (a.kind === "value" ? a.valueDigest === b.valueDigest : a.selectedCandidateRef === b.selectedCandidateRef);

// 同じ項目の有効な回答との関係（BR5.4）。同じ内容は 1 件のまま。別の内容は answeredAt が新しい方が有効（届いた順では決めない）。
function place(current, base, answer) {
  const active = current.find((existing) => existing.itemKey === answer.itemKey && existing.state === "answered");
  if (active === undefined) return outcome("recorded", answer, [...current, answer]);
  if (sameContent(active, answer)) return outcome("duplicate", active, current);
  const order = parseInstant(answer.answeredAt) - parseInstant(active.answeredAt);
  if (order <= 0) {
    const record = rejectedRecord(base, answer.kind, order < 0 ? "stale_answer" : "duplicate_conflict");
    return outcome("rejected", record, [...current, record]);
  }
  return outcome("recorded", answer, [...current.map((existing) => (existing === active ? { ...existing, state: "invalidated" } : existing)), answer]);
}

// 回答 1 件を受ける。入力: { catalog, observedItems（LC2 の項目）, answers（今までの回答）, input }。入力を書き換えず、結果は凍結する。
// status: recorded（新しい回答・置き換え）、duplicate（同じ内容・同じ回答の識別。既存を返す）、rejected（理由つきで保持）、
// unreadable（回答の識別・項目の名前・時刻が使えない。保持せず、入力も写さない）。
export function receiveAnswer({ catalog, observedItems, answers, input }) {
  const fields = snapshot(input);
  const current = reconcileAnswers(answers, observedItems, catalog);
  const entry = fields === null ? undefined : catalog.find((candidate) => candidate.itemKey === fields.itemKey);
  const usable = entry !== undefined && isRefId(fields.answerId) &&parseInstant(fields.answeredAt) !== null;
  if (!usable) return outcome("unreadable", null, current);
  const existing = current.find((answer) => answer.answerId === fields.answerId);
  if (existing !== undefined) return outcome("duplicate", existing, current);
  const base = { answerId: fields.answerId, itemKey: entry.itemKey, boundObservationDigest: itemObservationDigestOf(entry.itemKey, factsOf(observedItems)), answeredAt: fields.answeredAt };
  const checked = check(entry, evaluateItem(entry, observedItems), fields);
  if (checked.accepted === undefined) {
    const record = rejectedRecord(base, checked.kind, checked.reason);
    return outcome("rejected", record, [...current, record]);
  }
  return place(current, base, { ...base, ...checked.accepted, state: "answered" });
}
