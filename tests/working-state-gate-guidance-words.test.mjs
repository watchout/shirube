// U2 唯一の門（Owner の決定 95）の試験 その 4: 案内の文（isGuidanceText）の語の分け方と例外、回答の値の列の自分の欄。
// 案内の文は区切り（| @ : 空白）で語に分け、読める path・項目名の形・40 桁の 16 進の語だけを連なりに数えない。区切りを越えて 64 文字の乱数らしい連なりは通さない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { LEAK } from "./working-state-field-fixtures.mjs";

const LONG_NAME = "aidlc_settings_extra_long_name";
const LONG_PATH = "scripts/working-state/guidance-copy.mjs";
const HEX40 = ["0123456789", "abcdef0123", "456789abcd", "ef01234567"].join("");

test("W1+ 案内の文の例外: 20 文字以上でも、項目名の形・読める path・40 桁の 16 進の語は通す（1 つずつ、どの例外も外れない）", () => {
  for (const word of [LONG_NAME, LONG_PATH, HEX40]) assert.equal(ws.isGuidanceText(word), true, word);
});

test("W2+ 案内の文は区切り（| @ : 空白）で語に分ける: 区切りの前後に付いても、例外の語は通し、64 文字の乱数らしい連なりは区切りがあっても断る", () => {
  for (const delimiter of ["|", "@", ":", " "]) {
    for (const word of [LONG_NAME, LONG_PATH, HEX40]) assert.equal(ws.isGuidanceText(`x${delimiter}${word}`), true, `${delimiter} ${word}`);
    assert.equal(ws.isGuidanceText(`x${delimiter}${LEAK}`), false, `区切り ${delimiter} の後の乱数らしい連なり`);
    assert.equal(ws.isGuidanceText(`${LEAK}${delimiter}x`), false, `区切り ${delimiter} の前の乱数らしい連なり`);
  }
});

test("W3+ 案内の文: 読める名前でない 20 文字以上の語は例外にならない（例外の語に乱数らしい連なりを混ぜた形も断る）", () => {
  assert.equal(ws.isGuidanceText(LEAK), false);
  assert.equal(ws.isGuidanceText(`${LONG_NAME}${LEAK}`), false);
  assert.equal(ws.isGuidanceText(`${LONG_PATH}/${LEAK}`), false);
  assert.equal(ws.isGuidanceText(`${HEX40}${LEAK}`), false);
});

test("W4+ 案内の文は文字列だけ: 文字列でない値は、読める形（数・真偽・列・object・文字列の object）でも断る", () => {
  for (const value of [5, true, null, undefined, {}, ["hello"], new String("hello"), { toString: () => "hello" }, () => "hello"]) assert.equal(ws.isGuidanceText(value), false, String(typeof value));
});

test("W5+ 回答の値の列は自分の欄だけ: 余分な欄（乱数らしい名前を含む）・穴のある列は断り、普通の列は通す", () => {
  assert.equal(ws.isAnswerValue(["a", "b"]), true);
  assert.equal(ws.isAnswerValue(Object.assign(["a"], { extra: "x" })), false);
  assert.equal(ws.isAnswerValue(Object.assign(["a"], { [LEAK]: "x" })), false);
  assert.equal(ws.isAnswerValue(["a", , "b"]), false); // eslint-disable-line no-sparse-arrays
});
