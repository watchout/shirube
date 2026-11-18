// U2 回答（LC5）の試験が共有する、項目一覧・観測・回答の入力の作り方（架空の値だけ）。
// 名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する。
import * as ws from "../scripts/working-state/index.mjs";
import { NOW, TARGET, fileRead, goodReads } from "./working-state-fixtures.mjs";

export const T1 = "2026-11-18T10:00:00+09:00";
export const T2 = "2026-11-18T10:05:00+09:00";
export const T3 = "2026-11-18T10:10:00+09:00";

// 利用者が答えられる閉じた形の項目（版・commit）と、開いた形の文字列の項目。初期の項目一覧の実物から作る。
export const VERSION_ITEM = { ...ws.findItem("aidlc_version"), userAnswerable: true };
export const COMMIT_ITEM = { ...ws.findItem("sds_commit"), userAnswerable: true };
export const NOTE_ITEM = { itemKey: "note_text", valueType: "string", userAnswerable: true, sources: [{ kind: "aidlc_settings", requiredForConfirmed: true, targetBinding: "by-location" }] };
export const SETTINGS_ITEM = ws.findItem("aidlc_settings");
export const CATALOG = Object.freeze([VERSION_ITEM, COMMIT_ITEM, SETTINGS_ITEM, NOTE_ITEM, ws.findItem("kit_version")]);

export const observeWith = (catalog = CATALOG, reads = goodReads(), over = {}) => ws.observeAll({ targetRef: TARGET, now: NOW, catalog, reads, requiredVersions: {}, ...over });

// 読取りの組から 1 つの出典の中身だけを差し替える（参照名は同じまま）。
export const withContent = (reads, kind, content, over) => reads.map((read) => (read.sourceKind === kind ? fileRead(kind, content, over) : read));

export const answerInput = (over = {}) => ({ answerId: "ans-1", itemKey: "aidlc_settings", kind: "value", value: ["models.preset=thorough"], answeredAt: T1, ...over });

// 回答 1 件を受ける。answers は前の結果の answers を渡す（対話の間だけ持つ値）。
export function send(input, { answers = [], observed = observeWith(), catalog = CATALOG } = {}) {
  return ws.receiveAnswer({ catalog, observedItems: observed.items, answers, input });
}

export const stateOf = (result, answerId) => result.answers.find((answer) => answer.answerId === answerId)?.state;
