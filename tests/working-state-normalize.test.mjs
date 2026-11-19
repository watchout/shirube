// U2 観測の解釈（LC2）が使う末端の純粋な部品の試験: 正規の JSON と digest、時刻の解釈、値の正規化と版の比較、長さの区分。
// 核は時計を読まない（S4）ので、時刻は呼出側が渡した文字列を自前で解釈する。長さの区分の境界はここの 1 か所（S3）。
import assert from "node:assert/strict";
import test from "node:test";
import * as workingState from "../scripts/working-state/index.mjs";

// 名前空間で受ける: 未実装の間は import で全体が落ちず、試験ごとに失敗として数えられる。
const ws = workingState;
const ABC_DIGEST = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const OID_LOWER = "0123456789abcdef".repeat(2) + "01234567";

test("T9.1+ canonicalJson: キーの順に依らず同じ文字列、配列の順は保つ、余計な空白なし", () => {
  assert.equal(ws.canonicalJson({ b: 1, a: { d: [3, 1, 2], c: "x" } }), '{"a":{"c":"x","d":[3,1,2]},"b":1}');
  assert.equal(ws.canonicalJson({ a: 1, b: 2 }), ws.canonicalJson({ b: 2, a: 1 }));
  assert.equal(ws.canonicalJson([{ z: null, y: true }]), '[{"y":true,"z":null}]');
  assert.equal(ws.canonicalJson("日本語"), '"日本語"');
});

test("T9.1- canonicalJson: JSON で表せない値・普通でない object・深すぎる入れ子は例外（黙って別の形にしない）", () => {
  assert.equal(ws.canonicalJson({}), "{}");
  for (const bad of [undefined, () => 1, Symbol("s"), 10n, Number.NaN, Number.POSITIVE_INFINITY, new Map(), new Date(0), [undefined], { a: undefined }]) {
    assert.throws(() => ws.canonicalJson(bad), TypeError, String(typeof bad));
  }
  let deep = "x";
  for (let i = 0; i < 40; i += 1) deep = [deep];
  assert.throws(() => ws.canonicalJson(deep), RangeError);
});

test("T9.1+ sha256Hex と digestOf: 既知の値と一致し、64 桁の小文字 16 進、同じ入力は同じ", () => {
  assert.equal(ws.sha256Hex("abc"), ABC_DIGEST);
  assert.match(ws.sha256Hex(""), /^[0-9a-f]{64}$/);
  assert.equal(ws.digestOf({ b: 1, a: 2 }), ws.sha256Hex('{"a":2,"b":1}'));
  assert.notEqual(ws.digestOf("a"), ws.digestOf("b"));
});

test("T9.1+ parseInstant: offset つきの ISO 8601 を同じ基準の整数（ミリ秒）にする。offset が違っても同じ時刻は同じ", () => {
  assert.equal(ws.parseInstant("1970-01-01T00:00:00Z"), 0);
  assert.equal(ws.parseInstant("2026-11-18T00:00:00Z"), 1794960000000);
  assert.equal(ws.parseInstant("2026-11-18T09:00:00+09:00"), 1794960000000);
  assert.equal(ws.parseInstant("2026-11-17T20:00:00-04:00"), 1794960000000);
  assert.equal(ws.parseInstant("2026-11-18T00:00:00.123Z"), 1794960000123);
  assert.equal(ws.parseInstant("2026-11-18T00:00:00.123456789Z"), 1794960000123);
  assert.equal(ws.parseInstant("2024-02-29T12:34:56Z"), 1709210096000);
  assert.equal(ws.parseInstant("2000-03-01T00:00:00Z"), 951868800000);
  assert.equal(ws.parseInstant("0001-01-01T00:00:00Z"), -62135596800000);
});

test("T9.1- parseInstant: 形・範囲が不正、offset が無い、型違いは null（時刻を推測しない）", () => {
  const bad = [
    "2026-11-18T00:00:00", "2026-11-18", "2026-11-18 00:00:00Z", "2026-11-18t00:00:00z", "2026-13-01T00:00:00Z", "2026-00-01T00:00:00Z",
    "2026-02-30T00:00:00Z", "2023-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2026-04-31T00:00:00Z", "2026-11-18T24:00:00Z",
    "2026-11-18T00:60:00Z", "2026-11-18T00:00:60Z", "2026-11-18T00:00:00+24:00", "2026-11-18T00:00:00+09:60", "2026-11-18T00:00:00+0900",
    "2026-11-18T00:00:00.Z", " 2026-11-18T00:00:00Z", "2026-11-18T00:00:00Z ", "", "x",
  ];
  for (const text of bad) assert.equal(ws.parseInstant(text), null, text);
  for (const v of [undefined, null, 0, {}, [], true]) assert.equal(ws.parseInstant(v), null);
  assert.equal(ws.parseInstant("2000-02-29T00:00:00Z"), 951782400000);
});

test("T9.1+ normalizeValue: lowercase-hex は小文字に、version-compare は数の先頭の 0 を落とし、boolean は文字列の true・false に", () => {
  assert.equal(ws.normalizeValue("commit-oid", "lowercase-hex", OID_LOWER.toUpperCase()), OID_LOWER);
  assert.equal(ws.normalizeValue("commit-oid", "exact", OID_LOWER.toUpperCase()), OID_LOWER.toUpperCase());
  assert.equal(ws.normalizeValue("version", "version-compare", "02.011.1"), "2.11.1");
  assert.equal(ws.normalizeValue("version", "version-compare", "1.2.3-rc.1"), "1.2.3-rc.1");
  assert.equal(ws.normalizeValue("version", "exact", "02.011.1"), "02.011.1");
  assert.equal(ws.normalizeValue("boolean", "exact", true), "true");
  assert.equal(ws.normalizeValue("boolean", "exact", "false"), "false");
  assert.equal(ws.normalizeValue("string", "exact", "sample-work"), "sample-work");
  assert.deepEqual(ws.normalizeValue("list", "exact", ["a", "b"]), ["a", "b"]);
});

test("T9.1- normalizeValue: list は元の配列を返さず写しを返す。未知の normalization は何も変えない（比べる側が厳しくなる）", () => {
  const source = ["a", "b"];
  assert.notEqual(ws.normalizeValue("list", "exact", source), source);
  assert.equal(ws.normalizeValue("commit-oid", "unknown-rule", OID_LOWER.toUpperCase()), OID_LOWER.toUpperCase());
  assert.equal(ws.normalizeValue("version", undefined, "02.1"), "02.1");
});

test("T2.3+ compareVersions: 数の部分を大きさで比べ、足りない部分は 0、接尾辞つきは同じ版より小さく、+ 以降は無視", () => {
  assert.equal(ws.compareVersions("2.11.1", "2.9.0"), 1);
  assert.equal(ws.compareVersions("2.9.0", "2.11.1"), -1);
  assert.equal(ws.compareVersions("2.11.1", "2.11.1"), 0);
  assert.equal(ws.compareVersions("1.2", "1.2.0"), 0);
  assert.equal(ws.compareVersions("1.2.0.0", "1.2"), 0);
  assert.equal(ws.compareVersions("02.011", "2.11"), 0);
  assert.equal(ws.compareVersions("1.2.3-rc1", "1.2.3"), -1);
  assert.equal(ws.compareVersions("1.2.3", "1.2.3-rc1"), 1);
  assert.equal(ws.compareVersions("1.2.3+build5", "1.2.3"), 0);
  assert.equal(ws.compareVersions("1.2.3-rc1", "1.2.3-rc2"), -1);
  assert.equal(ws.compareVersions("24.22.3", "22.0"), 1);
});

test("T2.3- compareVersions: 版の形でない・型違いの入力は null（比べられない。一致・不一致にしない）", () => {
  for (const [a, b] of [["abc", "1.2.3"], ["1.2.3", "abc"], ["1", "1.2.3"], ["", ""], ["1.2.3 ", "1.2.3"], [undefined, "1.2.3"], ["1.2.3", null], [1.2, "1.2"]]) {
    assert.equal(ws.compareVersions(a, b), null, `${String(a)} ${String(b)}`);
  }
});

test("T3.2o 長さの区分の境界は 1 か所: 0 = empty、1〜16 = short、17〜64 = medium、65 以上 = long（実装で決めた数値）", () => {
  assert.deepEqual({ ...ws.LENGTH_BUCKET_BOUNDS }, { shortMax: 16, mediumMax: 64 });
  assert.equal(Object.isFrozen(ws.LENGTH_BUCKET_BOUNDS), true);
  const table = [[0, "empty"], [1, "short"], [16, "short"], [17, "medium"], [64, "medium"], [65, "long"], [256, "long"]];
  for (const [n, bucket] of table) assert.equal(ws.lengthBucketOf(n), bucket, String(n));
});

test("T3.2o- lengthBucketOf: 負の数・小数・数でない値は TypeError（区分を推測しない）", () => {
  assert.equal(ws.lengthBucketOf(1), "short");
  for (const n of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, "3", null, undefined]) {
    assert.throws(() => ws.lengthBucketOf(n), { name: "TypeError", message: /length/ }, String(n));
  }
});

test("T3.2o lengthOf: string は code point の数、list は要素の数（測る量は valueType ごとに 1 つ）", () => {
  const astral = String.fromCodePoint(0x20bb7);
  assert.equal(ws.lengthOf("string", ""), 0);
  assert.equal(ws.lengthOf("string", "abc"), 3);
  assert.equal(ws.lengthOf("string", astral.repeat(5)), 5);
  assert.equal(ws.lengthOf("list", []), 0);
  assert.equal(ws.lengthOf("list", ["a", "bb", "ccc"]), 3);
  assert.throws(() => ws.lengthOf("version", "1.2.3"), TypeError);
  assert.throws(() => ws.lengthOf("string", 5), TypeError);
  assert.throws(() => ws.lengthOf("list", "ab"), TypeError);
});
