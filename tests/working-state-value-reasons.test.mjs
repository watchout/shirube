// U2 値の門（value-exposure）の、入れ物の中の秘密らしさ（carriesSecretShape）・回答を拒む固定の理由（rejectionReasonOf）と、
// 項目一覧の位置の符号（positionKeyOf）の試験。土台の PR の試験が当てていなかった部分を、この PR の head 単独で 100% にする。
// 試験の秘密らしい値は架空で、gitleaks に拾われないよう分けて作る。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";

const TOKEN = "gh" + "p_" + "u".repeat(12);
const nest = (depth, leaf) => (depth === 0 ? leaf : [nest(depth - 1, leaf)]);

test("BR5.2 入れ物の中: 文字列・key のどこかに秘密らしい形があれば含む側。型の違う値と読める文字だけの入れ物は含まない", () => {
  assert.equal(ws.carriesSecretShape(TOKEN), true);
  assert.equal(ws.carriesSecretShape("sample-name"), false);
  for (const plain of [1, true, null, undefined, 1n]) assert.equal(ws.carriesSecretShape(plain), false, String(plain));
  assert.equal(ws.carriesSecretShape({ name: ["a", { b: "c" }] }), false);
  assert.equal(ws.carriesSecretShape({ name: ["a", { b: TOKEN }] }), true);
  assert.equal(ws.carriesSecretShape({ [TOKEN]: "x" }), true);
  assert.equal(ws.carriesSecretShape(Object.assign(Object.create(null), { a: "b" })), false);
});

test("BR5.2 入れ物の中: Map・Set は key と値の両方を調べる。同じ入れ物は 1 回だけ調べ、循環で止まらない", () => {
  assert.equal(ws.carriesSecretShape(new Map([["a", "b"]])), false);
  assert.equal(ws.carriesSecretShape(new Map([[TOKEN, "b"]])), true);
  assert.equal(ws.carriesSecretShape(new Map([["a", TOKEN]])), true);
  assert.equal(ws.carriesSecretShape(new Set(["a", "b"])), false);
  assert.equal(ws.carriesSecretShape(new Set(["a", TOKEN])), true);
  const cycle = ["a"];
  cycle.push(cycle);
  assert.equal(ws.carriesSecretShape(cycle), false);
  const shared = { a: "b" };
  assert.equal(ws.carriesSecretShape([shared, shared]), false);
});

test("BR5.2 入れ物の中: 確かめきれない形は含む側（関数・symbol・symbol の key・getter・知らない入れ物・深すぎる入れ込み・例外）", () => {
  assert.equal(ws.carriesSecretShape(() => "a"), true);
  assert.equal(ws.carriesSecretShape(Symbol("a")), true);
  assert.equal(ws.carriesSecretShape({ [Symbol("a")]: "b" }), true);
  assert.equal(ws.carriesSecretShape({ get a() { return "b"; } }), true);
  assert.equal(ws.carriesSecretShape(new Date(0)), true);
  assert.equal(ws.carriesSecretShape(new (class Sample { constructor() { this.a = "b"; } })()), true);
  assert.equal(ws.carriesSecretShape(nest(8, "a")), false);
  assert.equal(ws.carriesSecretShape(nest(9, "a")), true);
  const hostile = new Proxy({}, { ownKeys() { throw new TypeError("blocked"); } });
  assert.equal(ws.carriesSecretShape(hostile), true);
});

test("BR5.1 回答を拒む理由: 受け入れてよい値は null（型ごとの代表）", () => {
  assert.equal(ws.rejectionReasonOf("string", "sample-name"), null);
  assert.equal(ws.rejectionReasonOf("version", "2.11.1"), null);
  assert.equal(ws.rejectionReasonOf("boolean", true), null);
  assert.equal(ws.rejectionReasonOf("list", ["a", "b"]), null);
  assert.equal(ws.rejectionReasonOf("list", ["a=b"], "setting-pair"), null);
});

test("BR5.1 回答を拒む理由: 型 → 長さ → 文字 → 形の順で、固定の理由を 1 つだけ返す（入力を写さない）", () => {
  assert.equal(ws.rejectionReasonOf("string", TOKEN), "secret_like");
  assert.equal(ws.rejectionReasonOf("string", 5), "invalid_type");
  assert.equal(ws.rejectionReasonOf("list", "a"), "invalid_type");
  assert.equal(ws.rejectionReasonOf("list", [1]), "invalid_type");
  assert.equal(ws.rejectionReasonOf("string", "ab/".repeat(90)), "too_long");
  assert.equal(ws.rejectionReasonOf("list", Array.from({ length: 65 }, () => "a=b"), "setting-pair"), "too_long");
  assert.equal(ws.rejectionReasonOf("string", "a b"), "invalid_character");
  assert.equal(ws.rejectionReasonOf("string", "a\u0000b"), "invalid_character");
  assert.equal(ws.rejectionReasonOf("version", "x.y"), "invalid_format");
  assert.equal(ws.rejectionReasonOf("boolean", "yes"), "invalid_format");
  assert.equal(ws.rejectionReasonOf("list", ["a"], "setting-pair"), "invalid_format");
});

test("BR5.1 回答を拒む理由: 対象の根の外へ出る path は out_of_boundary（区切りで始まる・drive 付き・.. の段）", () => {
  for (const text of ["/abs/path", "\\abs", "C:/x", "c:\\x", "../x", "a/../b", "a\\..\\b"]) {
    assert.equal(ws.rejectionReasonOf("string", text), "out_of_boundary", text);
  }
  assert.equal(ws.rejectionReasonOf("string", "a/b/c"), null);
  assert.equal(ws.rejectionReasonOf("string", "a..b"), null);
});

test("BR5.1 回答を拒む理由: 判定できない（未知の型・未知の要素の形）は secret_like、読むたびに例外を起こす入力も投げずに secret_like（失敗側）", () => {
  assert.equal(ws.rejectionReasonOf("unknown", "a"), "secret_like");
  assert.equal(ws.rejectionReasonOf("list", ["a"], "unknown"), "secret_like");
  const outcomes = new Set();
  for (let allowed = 0; allowed < 400; allowed += 1) {
    let reads = 0;
    const flaky = new Proxy(["a", "b"], {
      get(target, key, receiver) {
        reads += 1;
        if (reads > allowed) throw new TypeError("blocked");
        return Reflect.get(target, key, receiver);
      },
    });
    outcomes.add(ws.rejectionReasonOf("list", flaky));
  }
  assert.equal(outcomes.has("secret_like"), true);
  assert.equal([...outcomes].every((reason) => reason === null || reason === "secret_like"), true);
});

test("BR3.5 位置の符号: 0 以上の整数だけが固定の形になり、それ以外は入力を写さない固定の文面で例外になる", () => {
  assert.equal(ws.positionKeyOf(0), "catalog-position-0");
  assert.equal(ws.positionKeyOf(12), "catalog-position-12");
  for (const bad of [-1, 1.5, "1", Number.NaN, Number.MAX_SAFE_INTEGER + 1, undefined, null, {}]) {
    assert.throws(() => ws.positionKeyOf(bad), { name: "TypeError", message: "position must be a non-negative integer" }, String(bad));
  }
});
