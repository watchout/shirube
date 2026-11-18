// U2 唯一の門（value-exposure の gate）の試験が共有する架空の値。乱数らしい値は部品から組み立てる（gitleaks に拾われない）。
import * as ws from "../scripts/working-state/index.mjs";
import { answerInput, observeWith, send } from "./working-state-answer-fixtures.mjs";
import { builtDraft, conflictObserved, createdSelection } from "./working-state-draft-fixtures.mjs";
import { guide } from "./working-state-guidance-fixtures.mjs";
import { absent } from "./working-state-secret-fixtures.mjs";

// 大文字小文字・数字が混ざった 40 文字。読める単語に分けられない（乱数らしい連なり (e)）。
export const MIXED40 = ["Zk3Qw9Xv1L", "m7Rt5Yp2Nb", "8Hd4Gs6Jf0", "Ca9Bv7Cx5D"].join("");
// 16 進の 40 文字（接頭辞の無い token の形）。
export const HEX40 = ["3fa91c0b7d", "e24a58f6c1", "09bd7e3a52", "c84f1d6a90"].join("");
// base64url の 43 文字。
export const B64URL43 = ["Qm9ydDEyMz", "Q1Njc4OWFiY2", "RlZmdoaWprbG", "1ub3BxcnN0_-"].join("");
// 32 文字（設定の対の key の 1 段の上限）。小文字で始まる。
export const KEY32 = ["aZk3Qw9Xv1", "Lm7Rt5Yp2N", "b8Hd4Gs6Jf", "0C"].join("");
// 読める単語を - でつないだ 64 文字の値（設定の対の value の上限。19 文字の単語 3 つ + 4 文字）。
export const READABLE64 = ["abcdefghijklmnopqrs", "abcdefghijklmnopqrs", "abcdefghijklmnopqrs", "wxyz"].join("-").slice(0, 64);

// 出口の試験が共有する、手で作る draft・回答・wire の変換（working-state-exit-matrix.test.mjs と同じ作り方）。
export const BASE = builtDraft({ observedItems: conflictObserved().items });
export const ANSWER = { answerId: "ans-1", itemKey: "note_text", kind: "value", value: ["models.preset=thorough"], state: "answered" };
export const wireOf = (over) => ws.draftToC02Wire({ ...BASE, ...over }).status;
export const selectionWireOf = (over) => ws.selectionToC02Wire({ ...createdSelection(BASE), ...over }).status;

export const pair = (value, key = "models.preset") => [`${key}=${value}`];
export const pairClass = (value, key) => ws.classifyValue("list", pair(value, key), "setting-pair");
export const pairReason = (value, key) => ws.rejectionReasonOf("list", pair(value, key), "setting-pair");

// 設定の対の回答を受けてから、回答・draft・案内・wire のどこにも秘密らしい部分（key を渡した時は key、無ければ value）が写らないことを調べる（回答の入口から出口まで）。
export function reachOf(value, key) {
  const observed = observeWith();
  const secret = key ?? value;
  const result = send(answerInput({ value: pair(value, key) }), { observed });
  if (result.status !== "recorded") return { status: result.status, reason: result.answer?.rejectionReason, absent: absent(secret, result) };
  const draft = builtDraft({ observedItems: observed.items, answers: result.answers });
  return { status: result.status, absent: absent(secret, result, draft, guide(draft), ws.draftToC02Wire(draft)) };
}
