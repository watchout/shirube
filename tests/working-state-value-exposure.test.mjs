// U2 観測値・回答が共有する判定の関数（value-exposure）のうち、許される形式の表の試験。BR5.1・BR3.4。
// 表は valueType ごとに 1 か所だけが持ち、LC3 の invalid の判定と LC5 の回答の検査が同じ関数を通す（S3）。
// fixture は架空の値だけ。秘密らしさの集合（BR5.2 の a〜e）は Step 6 で足す。
// 見えない文字・紛れやすい文字は、file に生で書かず code point から作る（読む人に見えない文字を source に置かない）。
import assert from "node:assert/strict";
import test from "node:test";
import { inspect } from "node:util";
import { ELEMENT_SHAPES, VALUE_TYPES, isAllowedFormat, valueFormOf } from "../scripts/working-state/index.mjs";

const OID = "0123456789abcdef".repeat(2) + "01234567";
const cp = (n) => String.fromCodePoint(n);
const ok = (type, value, shape) => assert.equal(isAllowedFormat(type, value, shape), true, `${String(type)} ${inspect(value)}`);
const ng = (type, value, shape) => assert.equal(isAllowedFormat(type, value, shape), false, `${String(type)} ${inspect(value)}`);
const NON_STRINGS = [undefined, null, 0, 1, true, {}, [], ["x"], Symbol("s"), 10n];

test("T5.1+ valueType の列挙は設計のとおり、形式の表は全部の型を持つ", () => {
  assert.deepEqual([...VALUE_TYPES], ["string", "version", "commit-oid", "list", "boolean"]);
  assert.deepEqual([...ELEMENT_SHAPES], ["string", "setting-pair"]);
});

test("T3.4+ 閉じた形は version・commit-oid・boolean、開いた形は string・list", () => {
  for (const t of ["version", "commit-oid", "boolean"]) assert.equal(valueFormOf(t), "closed", t);
  for (const t of ["string", "list"]) assert.equal(valueFormOf(t), "open", t);
});

test("T3.4- 未知・不正な valueType は開いた形（保持しない側）として扱う", () => {
  for (const t of ["object", "number", "VERSION", "", "__proto__", "constructor", undefined, null, 1, {}]) {
    assert.equal(valueFormOf(t), "open", String(t));
  }
});

test("T5.1+ commit-oid は 40 桁の 16 進（大文字も形式としては受ける。小文字化は normalization）", () => {
  ok("commit-oid", OID);
  ok("commit-oid", OID.toUpperCase());
  ok("commit-oid", "a".repeat(40));
});

test("T5.1- commit-oid は桁数・文字・空白・型が違えば受けない", () => {
  ng("commit-oid", OID.slice(1));
  ng("commit-oid", OID + "0");
  ng("commit-oid", "g" + OID.slice(1));
  ng("commit-oid", ` ${OID}`);
  ng("commit-oid", `${OID} `);
  ng("commit-oid", `${OID}\n`);
  ng("commit-oid", `${OID}\n${OID}`);
  ng("commit-oid", "");
  ng("commit-oid", OID.slice(0, 39) + cp(0x661));
  for (const v of NON_STRINGS) ng("commit-oid", v);
});

test("T5.1+ version は数字を . でつないだ 2〜4 個と、任意の接尾辞", () => {
  for (const v of ["2.11.1", "0.1.0", "22.0", "1.2.3.4", "24.22.3", "1.2.3-rc.1", "1.2.3+build5", "1.0.0-beta-2"]) ok("version", v);
});

test("T5.1- version は個数・先頭の v・区切り・接尾辞・空白・型が違えば受けない", () => {
  for (const v of ["", "1", "v2.11.1", "2.11.", ".1", "1..2", "1.2.3.4.5", "1.a.3", "1.2.3-", "1.2.3+", `1.2.3-${cp(0xe9)}`, "2.11.1 ", " 2.11.1", "2.11.1\n", "2.11.1\n2.11.2", "1.2.3 rc", "1,2,3", "1.2.3-rc;x", `${cp(0x661)}.2.3`, "1234567890.1", `1.2.3-${"a".repeat(33)}`]) ng("version", v);
  for (const v of NON_STRINGS) ng("version", v);
});

test("T5.1+ boolean は真偽値と、小文字の true・false だけ", () => {
  for (const v of [true, false, "true", "false"]) ok("boolean", v);
});

test("T5.1- boolean は大文字・数・ほかの語・空白・型が違えば受けない", () => {
  for (const v of ["True", "FALSE", "yes", "no", "1", "0", "", " true", "true ", "true\n", 1, 0, null, undefined, {}, [], [true]]) ng("boolean", v);
});

test("T5.1+ string は空白と制御文字を含まない 1〜256 文字（code point で数える）", () => {
  ok("string", "sample-work");
  ok("string", "x");
  ok("string", "a".repeat(256));
  ok("string", cp(0x20bb7).repeat(256));
  ok("string", "日本語の名前");
});

test("T5.1- string は空・長すぎ・空白・制御文字・不可視の文字・型が違えば受けない", () => {
  ng("string", "");
  ng("string", "a".repeat(257));
  ng("string", cp(0x20bb7).repeat(257));
  const inner = [0xa0, 0x3000, 0x2028, 0x200b, 0x202e, 0xfeff, 0xe000, 0x378].map((n) => `a${cp(n)}b`);
  for (const bad of [" ", "a b", "a\tb", "a\nb", "a\rb", "a\u0000b", "a\u007fb", "a\ud800b", ...inner]) ng("string", bad);
  for (const v of NON_STRINGS) ng("string", v);
});

test("T5.1+ list は string の要素の列（0〜256 個）。要素ごとに string の境界", () => {
  ok("list", []);
  ok("list", ["a"]);
  ok("list", [".github/workflows/**", "CODEOWNERS", ".aidlc-version"]);
  ok("list", Array.from({ length: 256 }, (_, i) => `item${i}`));
});

test("T5.1- list は要素の数・要素の形・配列でない値を受けない", () => {
  ng("list", Array.from({ length: 257 }, (_, i) => `item${i}`));
  ng("list", ["a", ""]);
  ng("list", ["a b"]);
  ng("list", ["a", 1]);
  ng("list", [["a"]]);
  ng("list", [null]);
  ng("list", ["a".repeat(257)]);
  ng("list", ["a\nb"]);
  ng("list", "a,b");
  ng("list", "a");
  ng("list", { 0: "a", length: 1 });
  for (const v of [undefined, null, 0, true, {}]) ng("list", v);
});

test("T5.1- list は穴のある配列と、長さ以外の余計な値を持つ配列を受けない", () => {
  ng("list", new Array(3));
  const holey = ["a", "b"];
  delete holey[0];
  ng("list", holey);
  const extra = ["a"];
  extra.note = "x";
  ng("list", extra);
});

test("T5.1+ setting-pair の要素は key=value（key は . でつなぐ 1〜4 個、value は英数字と . _ -）", () => {
  ok("list", ["schemaVersion=1", "models.schemaVersion=1", "models.preset=thorough"], "setting-pair");
  ok("list", ["a.b.c.d=x"], "setting-pair");
  ok("list", ["k=" + ["abcdefghijklmnopqrs", "abcdefghijklmnopqrs", "abcdefghijklmnopqrs", "wxyz"].join("-")], "setting-pair");
  ok("list", Array.from({ length: 64 }, (_, i) => `k${i}=v`), "setting-pair");
});

test("T5.1- setting-pair は空の列・形の違う要素・数の超過を受けない（迷えば rejected。A-08）", () => {
  ng("list", [], "setting-pair");
  const shapes = ["models.preset", "models.preset=", "=x", "Models.preset=x", "models..preset=x", ".models=x", "models.=x", "a.b.c.d.e=1", "k=a b", "k=a=b", "k=a/b", "k=a,b", `k=${cp(0xe9)}`, "k=" + "v".repeat(65), `${"k".repeat(33)}=v`, "k=v\n", " k=v", "1k=v", "k-1=v", "k_1=v"];
  for (const e of shapes) ng("list", [e], "setting-pair");
  ng("list", Array.from({ length: 65 }, (_, i) => `k${i}=v`), "setting-pair");
  ng("list", ["k=v", ""], "setting-pair");
  ng("list", ["k=v", 1], "setting-pair");
  ng("list", "k=v", "setting-pair");
});

test("T5.1- 未知・不正な要素の形は何も受けない（失敗側）", () => {
  for (const shape of ["free-form", "STRING", "", null, 1, {}]) {
    ng("list", ["k=v"], shape);
    ng("list", [], shape);
  }
});

test("T5.1+ 要素の形は list だけに効き、省略すれば string の形", () => {
  ok("list", ["a/b"]);
  ok("list", ["a/b"], undefined);
  ok("list", ["a/b"], "string");
  ok("version", "1.2.3", "setting-pair");
  ng("version", "1.2.3.4.5", "setting-pair");
});

test("T5.1- 未知・不正な valueType は何も受けない（失敗側）", () => {
  for (const t of ["object", "number", "VERSION", "", "__proto__", "constructor", "toString", undefined, null, 1, {}]) {
    ng(t, "1.2.3");
    ng(t, "sample-work");
    ng(t, []);
    ng(t, true);
  }
});

test("T5.1- 形式の判定は値の文面を例外へ載せず、例外を起こす入力でも例外にしない", () => {
  const throwing = { toString() { throw new Error("must-not-surface"); } };
  const hostile = new Proxy([], { get() { throw new Error("must-not-surface"); } });
  for (const t of VALUE_TYPES) {
    assert.doesNotThrow(() => isAllowedFormat(t, throwing));
    assert.doesNotThrow(() => isAllowedFormat(t, hostile));
    assert.equal(isAllowedFormat(t, throwing), false);
    assert.equal(isAllowedFormat(t, hostile), false);
  }
});
