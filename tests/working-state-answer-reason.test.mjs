// U2 回答の値の検査（BR5.1・BR5.2）の固定の拒否の分類。許される形式の表と秘密らしさの判定は value-exposure の 1 か所が持ち、
// 回答の検査（LC5）はここの関数を呼ぶだけ（S3）。分類は入力から作らない固定の値で、入力の一部も写さない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A } from "./working-state-fixtures.mjs";

const TOKEN = "gh" + "p_" + "q".repeat(12);
const LONG_TEXT = "a.".repeat(150);
const reason = (valueType, value, shape) => ws.rejectionReasonOf(valueType, value, shape);

test("T5.1+ 許される形式の値は null（拒否の理由なし）。閉じた形・開いた形の全部の型", () => {
  assert.equal(reason("version", "1.2.3"), null);
  assert.equal(reason("commit-oid", OID_A), null);
  assert.equal(reason("boolean", true), null);
  assert.equal(reason("boolean", "false"), null);
  assert.equal(reason("string", "sample-work"), null);
  assert.equal(reason("list", ["models.preset=thorough", "schemaVersion=1"], "setting-pair"), null);
  assert.equal(reason("list", ["alpha", "beta"]), null);
});

test("T5.1- 型違いは invalid_type（値の型・要素の型・穴のある列）", () => {
  const cases = [["version", 123], ["commit-oid", null], ["string", 5], ["string", { a: 1 }], ["boolean", 1], ["list", "models.preset=thorough"]];
  for (const [valueType, value] of cases) assert.equal(reason(valueType, value, "setting-pair"), "invalid_type", valueType);
  assert.equal(reason("list", ["models.preset=thorough", 7], "setting-pair"), "invalid_type");
  assert.equal(reason("list", new Array(2), "setting-pair"), "invalid_type");
});

test("T5.1- 長すぎる値は too_long（文字列・要素・個数）", () => {
  assert.equal(reason("string", LONG_TEXT), "too_long");
  assert.equal(reason("list", [LONG_TEXT]), "too_long");
  assert.equal(reason("list", Array.from({ length: 65 }, (_, i) => `k${i}=v`), "setting-pair"), "too_long");
  assert.equal(reason("list", Array.from({ length: 257 }, (_, i) => `n.${i}`)), "too_long");
});

test("T5.1- 空白・制御文字・書式文字を含む値は invalid_character（\\u{...} で書く）", () => {
  assert.equal(reason("string", "a b"), "invalid_character");
  assert.equal(reason("string", `a${String.fromCodePoint(0)}b`), "invalid_character");
  assert.equal(reason("string", `a${String.fromCodePoint(0x200b)}b`), "invalid_character");
  assert.equal(reason("list", ["models.preset=has space"], "setting-pair"), "invalid_character");
  assert.equal(reason("version", "1.2\n3"), "invalid_character");
});

test("T5.1- 形が合わない値は invalid_format（空・短すぎる・対の形でない・版でない）", () => {
  assert.equal(reason("version", "abc"), "invalid_format");
  assert.equal(reason("commit-oid", "0123"), "invalid_format");
  assert.equal(reason("string", ""), "invalid_format");
  assert.equal(reason("list", [], "setting-pair"), "invalid_format");
  assert.equal(reason("list", ["Bad=1"], "setting-pair"), "invalid_format");
  assert.equal(reason("boolean", "yes"), "invalid_format");
});

test("T5.1- 対象の根の外へ出る path（.. の段・先頭の区切り・drive）は、形式に合っていても out_of_boundary", () => {
  for (const text of ["../escape", "a/../b", "/etc/sample", "\\share\\sample", "C:\\sample", "..", "x/.."]) {
    assert.equal(reason("string", text), "out_of_boundary", text);
  }
  assert.equal(reason("list", ["fine", "../escape"]), "out_of_boundary");
  assert.equal(reason("string", "a..b"), null);
  assert.equal(reason("string", "a/b"), null);
});

test("T5.2+ 秘密らしい入力は secret_like（形式に合っていても先に勝つ）。値の一部は理由に写らない", () => {
  assert.equal(reason("string", TOKEN), "secret_like");
  assert.equal(reason("list", ["ok", TOKEN]), "secret_like");
  assert.equal(reason("list", [`${TOKEN}=1`], "setting-pair"), "secret_like");
  assert.equal(reason("string", "-----BEGIN " + "PRIVATE KEY-----"), "secret_like");
  assert.equal(reason("string", "x".repeat(30)), "secret_like");
  const fixed = new Set(["secret_like", "invalid_type", "too_long", "invalid_character", "invalid_format", "out_of_boundary"]);
  for (const value of [TOKEN, "a b", LONG_TEXT, 7, "../x", ""]) {
    const result = reason("string", value);
    assert.equal(fixed.has(result), true, String(result));
    assert.equal(String(result).includes(String(value)), false);
  }
});

test("T5.2- 判定できない入力（未知の型・未知の要素の形・例外を起こす入力）は secret_like（失敗側）。例外の文面も値も出ない", () => {
  assert.equal(reason("unknown-type", "abc"), "secret_like");
  assert.equal(reason("list", ["a=1"], "no-such-shape"), "secret_like");
  const hostile = new Proxy([], { get() { throw new Error(TOKEN); }, getPrototypeOf() { throw new Error(TOKEN); } });
  let result;
  assert.doesNotThrow(() => { result = reason("list", hostile, "setting-pair"); });
  assert.equal(result, "secret_like");
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test("T5.1 拒否の分類の一覧は固定の定数で、classifyValue の判定と矛盾しない（valid ⇔ null）", () => {
  assert.deepEqual([...ws.VALUE_REJECTION_REASONS].sort(), ["invalid_character", "invalid_format", "invalid_type", "out_of_boundary", "secret_like", "too_long"]);
  assert.equal(Object.isFrozen(ws.VALUE_REJECTION_REASONS), true);
  // 形式に合う値の理由は null か out_of_boundary（根の外へ出る path）だけ。形式に合わない・秘密らしい値の理由は必ずある。
  const samples = [["version", "1.2.3"], ["version", "x"], ["string", "../a"], ["boolean", "true"], ["commit-oid", TOKEN]];
  for (const [valueType, value] of samples) {
    const found = ws.rejectionReasonOf(valueType, value);
    const allowed = ws.classifyValue(valueType, value) === "valid" ? [null, "out_of_boundary"] : ws.VALUE_REJECTION_REASONS;
    assert.equal(allowed.includes(found), true, `${valueType}:${String(value).slice(0, 3)}`);
  }
});
