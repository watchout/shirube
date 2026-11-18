// U2 唯一の門（Owner の決定 95）の試験 その 4: 門の種類と、例外は門を通った後でだけ (e) を外すこと（レビュー回 4 の R-11・R-12・R-14）。
// 読める名前・形の説明の例外が当たる文字列に (a)〜(d) の形が埋まっていても、門が先に断る。例外を門の前へ動かすと、この file の試験が落ちる。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { MIXED40 } from "./working-state-gate-fixtures.mjs";
import { BEARER, KEY_HEADING, TOKEN } from "./working-state-secret-fixtures.mjs";

const JWT_LOWER = "aaaaaaaaaaaa.bbbbbbbbbbbb.cccc"; // 小文字だけの JWT の形（読める path にも見える）
const WORDS_BEARER = "Bearer abcdefghijklmnop";
const cls = (value) => ws.classifyValue("string", value);

test("X1+ 門の種類: 未知の種類・文字列でない物は秘密らしい（失敗側）。回答・名前は (e) を当て、識別・構造体は当てない", () => {
  assert.deepEqual([...ws.GATE_CLASSES], ["answer", "name", "ref", "structure"]);
  for (const bad of ["bogus", "", undefined, null, 1]) assert.equal(ws.exposesText(bad, "harmless"), true, String(bad));
  for (const bad of [5, null, undefined, {}, ["x"]]) assert.equal(ws.exposesText("answer", bad), true, String(bad));
  for (const gateClass of ["answer", "name"]) {
    assert.equal(ws.exposesText(gateClass, "harmless"), false, gateClass);
    assert.equal(ws.exposesText(gateClass, MIXED40), true, gateClass);
    assert.equal(ws.exposesText(gateClass, TOKEN), true, gateClass);
  }
  for (const gateClass of ["ref", "structure"]) {
    assert.equal(ws.exposesText(gateClass, MIXED40), false, gateClass);
    assert.equal(ws.exposesText(gateClass, TOKEN), true, gateClass);
    assert.equal(ws.exposesText(gateClass, JWT_LOWER), true, gateClass);
  }
});

test("X2+ 読める path の例外は門の後: 読める path に見える文字列に (a)〜(d) の形が埋まっていれば secret_like（string・list の要素・version）", () => {
  const embedded = ["docs/ghp_a/readable.md", "docs/sk-a/readable.md", "x/AKIA1/y.md", "a/xoxb-b/c.md", JWT_LOWER, `docs/${JWT_LOWER}`];
  for (const value of embedded) {
    assert.equal(cls(value), "secret_like", value);
    assert.equal(ws.classifyValue("list", [value], "string"), "secret_like", value);
    assert.equal(ws.rejectionReasonOf("string", value), "secret_like", value);
  }
  for (const value of [`docs/readable/path.md ${WORDS_BEARER}`, `docs/readable/path.md ${KEY_HEADING}`, `docs/readable/path.md ${BEARER}`]) assert.equal(cls(value), "secret_like", value);
  assert.equal(ws.classifyValue("version", `1.2.3-${JWT_LOWER}`), "secret_like");
  assert.equal(ws.classifyValue("version", "1.2.3-ghp-a"), "valid");
});

test("X3+ 設定の対の例外は門の後: 対の形に合う key・value に (b)(d) の形があれば secret_like。(a)(c) は空白を含むので対の形に合わず、自由な文字列の門が断る", () => {
  assert.equal(ws.classifyValue("list", ["models.preset=ghp_abc"], "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", ["models.preset=sk-abc"], "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", [`${JWT_LOWER}=1`], "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", [`models.preset=${JWT_LOWER}`], "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", [`models.preset=${WORDS_BEARER}`], "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", ["models.preset=thorough"], "setting-pair"), "valid");
});

test("X4+ 参照の例外は門の後: 区切り（| @ : 空白）で分けた読める部品でも、全体に (a)〜(d) の形があれば表示しない", () => {
  for (const delimiter of ["|", "@", ":"]) {
    assert.equal(ws.isShowableRef(`item${delimiter}ghp_abc`), false, delimiter);
    assert.equal(ws.isShowableRef(`item${delimiter}${JWT_LOWER}`), false, delimiter);
    assert.equal(ws.isShowableRef(`${WORDS_BEARER}${delimiter}x`), false, delimiter);
    assert.equal(ws.isShowableRef(`${KEY_HEADING}${delimiter}x`), false, delimiter);
  }
  for (const delimiter of ["|", "@", ":"]) assert.equal(ws.isShowableRef(`Bearer docs/readable/path.md${delimiter}x`), false, delimiter); // Bearer の後ろの語が読める path でも、門が生の全体に (c) を当てる
  assert.equal(ws.isShowableRef("item|docs/readable/path.md:12"), true);
});

test("X5+ 40 桁の 16 進（commit-oid）の形そのものの例外は、(a)〜(d) の形を作れない文字の範囲に限る。形に合わない長さは (e) が当たる", () => {
  const hex = "0123456789abcdef";
  assert.equal(ws.classifyValue("commit-oid", hex.repeat(2) + hex.slice(0, 8)), "valid");
  for (const prefix of ["ghp_", "sk-", "AKIA", "xoxb-"]) assert.equal(ws.classifyValue("commit-oid", `${prefix}${hex.repeat(3)}`.slice(0, 40)), "secret_like", prefix);
  assert.equal(ws.classifyValue("commit-oid", hex.repeat(2) + hex.slice(0, 9)), "secret_like");
});

test("X7+ 判定できない入力は秘密らしい（失敗側）: 文字列でない物・未知の要素の形（空の列でも）・未知の種類。識別は空・文字列でない物・(a)〜(d) の形を受けない", () => {
  for (const bad of [5, null, undefined, {}, ["x"], Symbol("s")]) assert.equal(ws.hasSecretShape(bad), true, String(bad));
  assert.equal(ws.hasSecretShape(""), false);
  assert.equal(ws.classifyValue("list", [], "unknown-shape"), "secret_like");
  assert.equal(ws.classifyValue("list", [], "string"), "valid");
  assert.equal(ws.classifyValue("nope", ""), "secret_like");
  for (const bad of ["", 5, null, undefined, {}, TOKEN, JWT_LOWER, WORDS_BEARER, KEY_HEADING]) assert.equal(ws.isRefName(bad), false, String(bad));
  assert.equal(ws.isRefName(MIXED40), true);
});

test("X6+ 性能: 長い連なりの (d) の判定は文字列の長さの二乗にならない（直前の条件の守り。長さに上限の無い案内の文・識別にも当たる）", () => {
  const started = performance.now();
  for (const text of ["a".repeat(100000), `${"a".repeat(100000)}.`, `${"a".repeat(50000)}.${"b".repeat(50000)}`, "a_".repeat(100000), "a-".repeat(100000)]) assert.equal(ws.hasSecretShape(text), false); // _ と - も名前の文字（直前の条件が数える）
  assert.equal(ws.hasSecretShape(`${"a".repeat(30)}.${"b".repeat(30)}.c`), true);
  assert.ok(performance.now() - started < 1500, "長い連なりの判定が遅い");
});
