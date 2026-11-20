// U2 観測値・回答が共有する判定の関数（value-exposure）のうち、BR5.2 の秘密らしさの集合（a〜e）と固定の分類の試験。
// 返すのは固定の分類 valid | invalid_format | secret_like だけで、入力を写さない。判定できなければ secret_like（fail closed）。
// 開いた形の分類（withheld）の持ち主はこの関数で、LC2・LC3・LC5 は同じ 1 つを呼ぶ（Owner の決定 116・120・122）。
// 決定 122: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6964964182 （本文 SHA-256 6662e49d…）。
// fixture は架空の値だけ。実在の形式の固定長の英数字を source に直接書かず、部品から組み立てる（gitleaks に拾われない）。
import assert from "node:assert/strict";
import test from "node:test";
import * as workingState from "../scripts/working-state/index.mjs";

// 名前空間で受ける: 未実装の間は import で全体が落ちず、試験ごとに失敗として数えられる。
const { VALUE_TYPES, isAllowedFormat } = workingState;
const { VALUE_CLASSIFICATIONS } = workingState;

const OID = "0123456789abcdef".repeat(2) + "01234567";
const filler = (n, c = "x") => c.repeat(n);
const cls = (type, value, shape) => workingState.classifyValue(type, value, shape);
const is = (expected, type, value, shape) => assert.equal(cls(type, value, shape), expected, `${String(type)} ${expected}`);

// 集合 (a)〜(e) の各形。実在の形を直書きしない（部品から組み立てる）。
const SECRETS = {
  a_private_key: ["-----BEGIN ", "RSA PRIVATE KEY", "-----"].join(""),
  a_private_key_plain: ["-----BEGIN ", "PRIVATE KEY", "-----"].join(""),
  a_certificate: ["-----BEGIN ", "CERTIFICATE", "-----"].join(""),
  b_ghp: "ghp" + "_" + filler(8),
  b_gho: "gho" + "_" + filler(8),
  b_ghu: "ghu" + "_" + filler(8),
  b_ghs: "ghs" + "_" + filler(8),
  b_ghr: "ghr" + "_" + filler(8),
  b_github_pat: "github" + "_pat_" + filler(8),
  b_akia: "AKI" + "A" + filler(8, "Z"),
  b_sk: "s" + "k-" + filler(8),
  b_xoxb: "xox" + "b-" + filler(8),
  b_xoxp: "xox" + "p-" + filler(8),
  c_bearer: "Bearer " + filler(16, "q"),
  d_jwt: [filler(12, "a"), filler(12, "b"), filler(12, "c")].join("."),
  e_run20: filler(20, "k"),
  e_run_symbols: "ab+/_-=cdefghijklmnopqrst",
};

test("T5.2+ 集合 (a)〜(e) の各形は secret_like（string・list の要素のどちらでも）", () => {
  for (const [name, value] of Object.entries(SECRETS)) {
    is("secret_like", "string", value);
    is("secret_like", "list", [value]);
    is("secret_like", "list", ["ok-element", value]);
    assert.equal(cls("string", value), "secret_like", name);
  }
});

test("T5.2+ 秘密らしい形は、許される形式の見た目に合っていても secret_like（形式の合致が先に勝たない）", () => {
  // 空白なしの 1 語なので string の境界には合う。それでも (b) の接頭辞が先に当たる。
  assert.equal(isAllowedFormat("string", SECRETS.b_ghp), true);
  is("secret_like", "string", SECRETS.b_ghp);
  assert.equal(isAllowedFormat("list", [SECRETS.d_jwt]), true);
  is("secret_like", "list", [SECRETS.d_jwt]);
});

test("T5.2+ 集合に当たらない普通の値は valid（実物に近い架空の値）", () => {
  is("valid", "commit-oid", OID);
  is("valid", "version", "2.11.1");
  is("valid", "version", "0.1.0");
  is("valid", "boolean", true);
  is("valid", "boolean", "false");
  is("valid", "string", "sample-work");
  is("valid", "list", []);
  is("valid", "list", [".github/workflows/**", ".shirube/**", "CODEOWNERS", "docs/CODEOWNERS", ".claude/settings.json", ".aidlc-version"]);
  is("valid", "list", ["schemaVersion=1", "models.schemaVersion=1", "models.preset=thorough"], "setting-pair");
});

test("T5.2+ (e) の境界: 20 文字の連なりから秘密らしい、19 文字までは当たらない（実装で決めた数値 = 20）", () => {
  is("valid", "string", filler(19, "k"));
  is("secret_like", "string", filler(20, "k"));
  is("secret_like", "string", filler(256, "k"));
  is("valid", "list", [filler(19, "k")]);
  is("secret_like", "list", [filler(20, "k")]);
});

test("T5.2+ (e) は空白を含まない 1 語だけ。. など集合の外の字を含む語・空白で分かれた短い語は当たらない", () => {
  is("valid", "string", "kit/skills/sds-audit/SKILL.md");
  is("valid", "list", ["scripts/hygiene/lines-baseline.mjs", "kit/skills/sds-audit/SKILL.md"]);
  is("valid", "list", [".github/workflows/**"]);
  is("invalid_format", "string", "aaaaaaaaaa bbbbbbbbbb");
});

test("T5.2+ (e) の例外: commit-oid の形（40 文字の 16 進）は連なりにしない。設定の対の value は、読める単語の列なら 20 文字以上でも secret_like にしない", () => {
  is("valid", "commit-oid", OID);
  is("valid", "commit-oid", OID.toUpperCase());
  is("valid", "list", ["k=" + ["abcdefghijklmnopqrs", "abcdefghijklmnopqrs", "abcdefghijklmnopqrs", "wxyz"].join("-")], "setting-pair");
  is("valid", "list", ["models.preset=claude-sonnet-4-5-20250929"], "setting-pair");
});

test("T5.2- (e) の例外は構造のある形だけ。形式に当たらない長い連なりは secret_like", () => {
  is("secret_like", "commit-oid", OID + "0");
  is("secret_like", "commit-oid", OID.slice(1));
  is("secret_like", "version", filler(20, "k"));
  is("secret_like", "boolean", filler(20, "k"));
  is("secret_like", "list", [filler(20, "k")], "setting-pair");
});

test("T5.2- (c) Bearer の後ろの語の境界: 16 文字から、15 文字までは当たらない（実装で決めた数値 = 16）", () => {
  is("secret_like", "string", "Bearer " + filler(16, "q"));
  is("invalid_format", "string", "Bearer " + filler(15, "q"));
  is("secret_like", "list", ["Bearer " + filler(16, "q")]);
});

test("T5.2r (c) Bearer の scheme の大小文字は区別しない（RFC 9110 §11.1）。全部の門で同じく秘密らしい側に倒れる", () => {
  const { carriesSecretShape, exposesText, GATE_CLASSES, hasSecretShape, isAnswerValue, isGuidanceText, isItemKeyText, isRefName } = workingState;
  for (const scheme of ["Bearer", "bearer", "bEaReR", "BEARER"]) {
    const value = `${scheme} ${filler(16, "q")}`;
    const short = `${scheme} ${filler(15, "q")}`;
    is("secret_like", "string", value);
    is("secret_like", "list", [value]);
    is("invalid_format", "string", short);
    assert.equal(hasSecretShape(value), true, scheme);
    assert.equal(hasSecretShape(short), false, scheme);
    for (const gateClass of GATE_CLASSES) assert.equal(exposesText(gateClass, value), true, `${gateClass} ${scheme}`);
    assert.equal(isRefName(value), false, scheme);
    assert.equal(isGuidanceText(`確認: ${value}`), false, scheme);
    assert.equal(isAnswerValue(value), false, scheme);
    assert.equal(isAnswerValue([value]), false, scheme);
    assert.equal(isItemKeyText(value), false, scheme);
    assert.equal(carriesSecretShape({ nested: [value] }), true, scheme);
    assert.equal(carriesSecretShape({ nested: [short] }), false, scheme);
  }
  // scheme と語の間の区切り: 空白の種類・個数に依らず当たる（\s+）。区切りでない零幅の文字は当たらないが、値は形式にも合わない（valid にならない）。
  for (const gap of [" ", "  ", "\t", "\n", "\u00a0", "\u3000", " \t "]) {
    is("secret_like", "string", `bEaReR${gap}${filler(16, "q")}`);
    assert.equal(hasSecretShape(`Authorization: BEARER${gap}${filler(16, "q")}`), true);
  }
  assert.notEqual(cls("string", `Bearer\u200b${filler(16, "q")}`), "valid");
  // 直前が英数字なら語の一部（別の語の末尾）で、従来どおり当てない。大小文字の緩めが境界を広げない。
  is("invalid_format", "string", `xbearer ${filler(16, "q")}`);
});

test("T5.2- (d) JWT の形の境界: 3 つの部分で、先の 2 つが 10 文字以上（実装で決めた数値 = 10）", () => {
  is("secret_like", "string", [filler(10, "a"), filler(10, "b"), "c"].join("."));
  is("secret_like", "string", [filler(10, "a"), filler(10, "b"), ""].join("."));
  is("valid", "string", [filler(9, "a"), filler(10, "b"), filler(10, "c")].join("."));
  is("valid", "string", [filler(10, "a"), filler(9, "b"), filler(10, "c")].join("."));
  is("valid", "string", [filler(10, "a"), filler(10, "b")].join("."));
  is("valid", "string", [filler(10, "a"), filler(10, "b"), filler(5, "c"), filler(5, "d")].join("."));
});

test("T5.2- (d) JWT の形は各部分の _ と - も含めて同じ（base64url の 3 つの部分それぞれ）", () => {
  const part = "b_b-b_b-b_b";
  is("secret_like", "string", [part, filler(10, "b"), filler(10, "c")].join("."));
  is("secret_like", "string", [filler(10, "a"), part, filler(10, "c")].join("."));
  is("secret_like", "string", [filler(10, "a"), filler(10, "b"), part].join("."));
  is("secret_like", "string", ["-" + filler(9, "a"), "_" + filler(9, "b"), "-_"].join("."));
});

test("T5.2- 形式に合わず秘密らしくもない値は invalid_format（型違い・範囲外・形の違い）", () => {
  is("invalid_format", "version", "abc");
  is("invalid_format", "version", "1");
  is("invalid_format", "commit-oid", "abc123");
  is("invalid_format", "boolean", "yes");
  is("invalid_format", "boolean", "True");
  is("invalid_format", "string", "");
  is("invalid_format", "string", "a b");
  is("invalid_format", "string", "a\nb");
  is("invalid_format", "list", "a,b");
  is("invalid_format", "list", [""]);
  is("invalid_format", "list", ["a b"]);
  is("invalid_format", "list", [1]);
  is("invalid_format", "list", Array.from({ length: 257 }, (_, i) => `item${i}`));
  is("invalid_format", "list", [], "setting-pair");
  is("invalid_format", "list", ["models.preset"], "setting-pair");
  for (const t of VALUE_TYPES) {
    for (const v of [undefined, null, 0, 1, {}, 10n, Symbol("s")]) {
      if (t === "list" || t === "boolean") continue;
      is("invalid_format", t, v);
    }
  }
});

test("T5.2- 秘密らしい形と形式の不正が同時に当たる時は secret_like が先（安全な側）", () => {
  is("secret_like", "commit-oid", filler(39, "a"));
  is("secret_like", "version", SECRETS.b_ghp);
  is("secret_like", "boolean", SECRETS.b_sk);
  is("secret_like", "list", ["a b", SECRETS.b_ghp]);
});

test("T3.4p 判定できない時は secret_like（未知の型・未知の要素の形・例外を起こす入力）", () => {
  for (const t of ["object", "number", "VERSION", "", "__proto__", "constructor", "toString", undefined, null, 1, {}]) {
    is("secret_like", t, "1.2.3");
    is("secret_like", t, []);
  }
  for (const shape of ["free-form", "STRING", "", null, 1, {}]) {
    is("secret_like", "list", ["k=v"], shape);
  }
  const throwing = { toString() { throw new Error("must-not-surface"); } };
  const hostile = new Proxy([], { get() { throw new Error("must-not-surface"); } });
  const hostileElement = [{ toString() { throw new Error("must-not-surface"); } }];
  for (const t of VALUE_TYPES) {
    assert.doesNotThrow(() => cls(t, throwing));
    assert.doesNotThrow(() => cls(t, hostile));
    // 列として中を読めない入力（読むと例外）は secret_like。列でない型にとっては型違いの値なので invalid_format。
    assert.equal(cls(t, hostile), t === "list" ? "secret_like" : "invalid_format", t);
  }
  assert.doesNotThrow(() => cls("list", hostileElement));
  assert.equal(cls("list", hostileElement), "invalid_format");
});

test("T3.4p 返すのは固定の分類だけで、入力を写さない（例外の文面・値の一部・派生形のどれも載らない）", () => {
  assert.deepEqual([...VALUE_CLASSIFICATIONS], ["valid", "invalid_format", "secret_like"]);
  assert.equal(Object.isFrozen(VALUE_CLASSIFICATIONS), true);
  const inputs = [...Object.values(SECRETS), "plain-value", "a b", OID, "must-not-surface"];
  for (const value of inputs) {
    for (const wrap of [(v) => v, (v) => [v]]) {
      const result = cls("list", wrap(value));
      assert.equal(VALUE_CLASSIFICATIONS.includes(result), true);
      assert.equal(typeof result, "string");
      assert.equal(result.includes(String(value).slice(0, 4)) && String(value).length > 8, false);
    }
  }
  const hostile = new Proxy([], { get() { throw new Error("must-not-surface"); } });
  assert.equal(cls("list", hostile).includes("must-not-surface"), false);
});

test("T5.1 と T5.2 は同じ表: 形式に合う ⇒ valid か secret_like、valid ⇒ 形式に合う（表の複製なし）", () => {
  const samples = [
    ["string", "sample-work"], ["string", ""], ["string", filler(30)], ["version", "1.2.3"], ["version", "x"],
    ["commit-oid", OID], ["commit-oid", "abc"], ["boolean", "true"], ["boolean", "no"], ["list", ["a"]], ["list", ["a b"]],
    ["list", [SECRETS.b_ghp]], ["list", []],
  ];
  for (const [type, value] of samples) {
    const allowed = isAllowedFormat(type, value);
    const result = cls(type, value);
    if (allowed) assert.notEqual(result, "invalid_format", `${type}`);
    if (result === "valid") assert.equal(allowed, true, `${type}`);
  }
});

test("T5.2- 回答も観測値も同じ関数: 同じ入力は同じ分類（2 回呼んで同じ・呼び出しの順に依らない）", () => {
  const values = [["string", SECRETS.e_run20], ["string", "sample-work"], ["version", "1.2.3"], ["list", ["a b"]]];
  const first = values.map(([t, v]) => cls(t, v));
  const second = [...values].reverse().map(([t, v]) => cls(t, v)).reverse();
  assert.deepEqual(first, second);
  assert.deepEqual(first, ["secret_like", "valid", "valid", "invalid_format"]);
});
