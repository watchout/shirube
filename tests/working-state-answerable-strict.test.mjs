// U2 項目一覧の userAnswerable は「true だけ」を利用者が答えられる印として読む（真らしい値で読み替えない）。
// 真らしい値（1・"true"・"yes"・object・配列）は答えられない項目として扱う。入口（回答の受付）と次の操作（案内の質問）の 2 か所で確かめる。
import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG, answerInput, send } from "./working-state-answer-fixtures.mjs";
import { conflictObserved } from "./working-state-draft-fixtures.mjs";
import { draftOf, guided } from "./working-state-guidance-fixtures.mjs";

const TRUTHY_NOT_TRUE = [1, "true", "yes", {}, []];
const withAnswerable = (itemKey, userAnswerable) => CATALOG.map((entry) => (entry.itemKey === itemKey ? { ...entry, userAnswerable } : entry));

test("T5.1+ 回答の入口: userAnswerable が true だけが答えられる。真らしい値は out_of_boundary で断る（true なら記録する）", () => {
  const input = answerInput({ itemKey: "note_text", value: "hello" });
  assert.equal(send(input, { catalog: withAnswerable("note_text", true) }).status, "recorded");
  for (const value of TRUTHY_NOT_TRUE) {
    const result = send(input, { catalog: withAnswerable("note_text", value) });
    assert.deepEqual([result.status, result.answers[0].state, result.answers[0].rejectionReason], ["rejected", "rejected", "out_of_boundary"], JSON.stringify(value));
  }
});

test("T4.1- 次の操作: userAnswerable が真らしい値の項目は質問にしない（答えられる項目は true だけ。true なら質問にする）", () => {
  const questionsOf = (catalog) => guided(draftOf(catalog, conflictObserved()), { catalog }).questions;
  assert.equal(questionsOf(withAnswerable("sds_commit", true)).length, 1);
  for (const value of TRUTHY_NOT_TRUE) assert.deepEqual(questionsOf(withAnswerable("sds_commit", value)), [], JSON.stringify(value));
});
