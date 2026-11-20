// U2 回答を拒む固定の理由（BR5.1・BR5.2。value-exposure の rejectionReasonOf）と、項目一覧の位置の印（catalog の positionKeyOf）、
// 構造体の確かめきれない入力の失敗側（carriesSecretShape）。PR 1 の head 単独で行の網羅率 100% を満たすための試験で、fixture は架空の値だけ。
import assert from "node:assert/strict";
import test from "node:test";
import { VALUE_REJECTION_REASONS, carriesSecretShape, classifyValue, positionKeyOf, rejectionReasonOf } from "../scripts/working-state/index.mjs";

const ok = ["ok/x", "ok.txt"];
const reason = (type, value, shape) => rejectionReasonOf(type, value, shape);

test("T5.2+ 拒む理由は固定の分類だけで、型 → 長さ → 文字 → 形の順に 1 つに絞る", () => {
  assert.deepEqual([...VALUE_REJECTION_REASONS], ["secret_like", "invalid_type", "too_long", "invalid_character", "invalid_format", "out_of_boundary"]);
  assert.equal(reason("string", 5), "invalid_type");
  assert.equal(reason("list", "x", "string"), "invalid_type");
  assert.equal(reason("boolean", 1), "invalid_type");
  assert.equal(reason("string", "ab/cd/".repeat(60)), "too_long");
  assert.equal(reason("list", Array.from({ length: 300 }, () => "a"), "string"), "too_long");
  assert.equal(reason("list", Array.from({ length: 65 }, () => "a=b"), "setting-pair"), "too_long");
  assert.equal(reason("string", "a\u0000b"), "invalid_character");
  assert.equal(reason("string", "a b"), "invalid_character");
  assert.equal(reason("version", "zzz"), "invalid_format");
  assert.equal(reason("commit-oid", "12"), "invalid_format");
});

test("T5.1 形式に合う値は null、根の外へ出る path は out_of_boundary", () => {
  for (const value of ok) assert.equal(reason("string", value), null);
  assert.equal(reason("boolean", "true"), null);
  assert.equal(reason("list", ["a"], "string"), null);
  for (const value of ["../etc/x", "/abs/x", "\\win", "C:\\x", "a/../b"]) assert.equal(reason("string", value), "out_of_boundary", value);
});

test("T5.2o 秘密らしい値・判定できない入力は secret_like（失敗側。理由に入力を写さない）", () => {
  assert.equal(reason("string", "Bearer " + "q".repeat(16)), "secret_like");
  assert.equal(reason("unknown-type", "x"), "secret_like");
  assert.equal(reason("list", ["a=b"], "unknown-shape"), "secret_like");
  assert.equal(reason("string", { toString() { throw new Error("boom"); } }), "invalid_type");
  const hostile = new Proxy([], { get() { throw new Error("secret-detail"); } });
  assert.equal(reason("list", hostile, "string"), "secret_like");
});

test("T5.2o 分類の後の 2 回目の読みで例外を起こす入力（読むたびに変わる入れ物）も secret_like（失敗側）", () => {
  const counting = (limit) => {
    let reads = 0;
    const proxy = new Proxy(["a"], {
      get(target, key, receiver) {
        reads += 1;
        if (reads > limit) throw new Error("changed-after-classification");
        return Reflect.get(target, key, receiver);
      },
    });
    return { proxy, reads: () => reads };
  };
  // 分類（classifyValue）だけが読む回数を数え、その回数を使い切った後の読みで例外にする。理由を決める 2 回目の読みが例外なら secret_like。
  const classifyOnly = counting(Number.POSITIVE_INFINITY);
  assert.equal(classifyValue("list", classifyOnly.proxy, "string"), "valid");
  const classifyReads = classifyOnly.reads();
  const whole = counting(Number.POSITIVE_INFINITY);
  assert.equal(reason("list", whole.proxy, "string"), null);
  assert.ok(whole.reads() > classifyReads, "理由を決める読みが分類の後にもある");
  assert.equal(reason("list", counting(classifyReads).proxy, "string"), "secret_like");
});

test("T3.4p 位置の印は 0 以上の整数だけで、それ以外は入力を写さない固定の文面で例外にする", () => {
  assert.equal(positionKeyOf(0), "catalog-position-0");
  assert.equal(positionKeyOf(12), "catalog-position-12");
  for (const bad of [-1, 1.5, NaN, Infinity, "3", null, undefined, 2 ** 60]) {
    assert.throws(() => positionKeyOf(bad), (error) => error instanceof TypeError && error.message === "position must be a non-negative integer", String(bad));
  }
});

test("T5.2o 構造体の確かめきれない入力は含む側（getter・未知の入れ物・深すぎる入れ物・例外）", () => {
  const getter = {};
  Object.defineProperty(getter, "x", { get: () => "plain", enumerable: true });
  assert.equal(carriesSecretShape(getter), true);
  assert.equal(carriesSecretShape(new Date()), true);
  assert.equal(carriesSecretShape(() => 1), true);
  assert.equal(carriesSecretShape(Symbol("s")), true);
  let deep = "plain";
  for (let i = 0; i < 10; i += 1) deep = { deep };
  assert.equal(carriesSecretShape(deep), true);
  const cycle = { a: [] };
  cycle.a.push(cycle);
  assert.equal(carriesSecretShape(cycle), false);
  assert.equal(carriesSecretShape(new Map([["k", new Set(["v"])]])), false);
  assert.equal(carriesSecretShape({ list: ["plain", 1, null, true] }), false);
});
