// U2 唯一の門（Owner の決定 95）の試験 その 1: 設定の対（key=value）と、形が自分の長い連なりを説明する閉じた形。
// 門は生の文字列全体に BR5.2 の (a)〜(d) を先に当て、例外（形の説明・読める名前）は門を通った後でだけ (e) を外す。
// 設定の対は = で分けた key と value を別々の部品として (e) に通す（設計が「構造が説明する」とした全体の例外は無い）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { B64URL43, HEX40, KEY32, MIXED40, READABLE64, pair, pairClass, pairReason, reachOf } from "./working-state-gate-fixtures.mjs";
import { BEARER, JWT3, KEY_HEADING, TOKEN } from "./working-state-secret-fixtures.mjs";

const RANDOM_VALUES = { mixed40: MIXED40, hex40: HEX40, b64url43: B64URL43, repeated40: "v".repeat(40), repeated64: "v".repeat(64) };

test("G1+ 設定の対の value: 20 文字以上の読めない連なり (e) は secret_like（形が説明する例外にしない）。回答の入口から出口まで写らない", () => {
  for (const [name, value] of Object.entries(RANDOM_VALUES)) {
    assert.equal(pairClass(value), "secret_like", name);
    assert.equal(pairReason(value), "secret_like", name);
    const reach = reachOf(value);
    assert.equal(reach.status, "rejected", name);
    assert.equal(reach.reason, "secret_like", name);
    assert.equal(reach.absent, true, name);
  }
});

test("G1- 設定の対の value: 読める単語の列は 20 文字以上でも通り、普通の値は変わらない", () => {
  for (const value of ["claude-sonnet-4-5-20250929", READABLE64, "thorough", "1", "x", "a.b.c", "true"]) assert.equal(pairClass(value), "valid", value);
  assert.equal(READABLE64.length, 64);
  assert.equal(reachOf("claude-sonnet-4-5-20250929").status, "recorded");
});

test("G2+ 設定の対の key: 20 文字以上の読めない 1 段 (e) は secret_like。2 段目以降も同じ", () => {
  assert.equal(KEY32.length, 32);
  assert.equal(pairClass("1", KEY32), "secret_like");
  assert.equal(pairClass("1", `models.${KEY32}`), "secret_like");
  assert.equal(pairClass("1", `a.b.c.${KEY32}`), "secret_like");
  assert.equal(pairReason("1", KEY32), "secret_like");
  assert.equal(reachOf("1", KEY32).absent, true);
  assert.equal(reachOf("1", KEY32).status, "rejected");
});

test("G2- 設定の対の key: 読める key は通る（実物に近い key）", () => {
  for (const key of ["schemaVersion", "models.schemaVersion", "models.preset", "a.b.c.d", "k0", "reviewClass"]) assert.equal(pairClass("1", key), "valid", key);
});

test("G3+ 設定の対の key と value に (a)〜(d) の形があれば、形の説明が先でも secret_like（生の文字列に門を先に当てる）", () => {
  const forms = { b: TOKEN, d: JWT3 };
  for (const [column, secret] of Object.entries(forms)) {
    assert.equal(pairClass(secret), "secret_like", `value ${column}`);
    assert.equal(pairClass(secret, "models.preset"), "secret_like", `value ${column}`);
    assert.equal(pairClass(`x.${secret}`), "secret_like", `value with prefix ${column}`);
    assert.equal(ws.rejectionReasonOf("list", [`${secret}=1`], "setting-pair"), "secret_like", `key ${column}`);
    assert.equal(reachOf(secret).absent, true, `reach ${column}`);
  }
  assert.equal(ws.classifyValue("list", ["aaaaaaaaaaaa.bbbbbbbbbbbb.cccc=1"], "setting-pair"), "secret_like"); // key の側の JWT の形（小文字で始まる key の語の範囲に収まる）
  assert.equal(ws.classifyValue("list", ["models.preset=aaaaaaaaaaaa.bbbbbbbbbbbb."], "setting-pair"), "secret_like"); // 署名の無い JWT の形
  for (const secret of [BEARER, KEY_HEADING]) assert.equal(ws.classifyValue("list", [`models.preset=${secret}`], "setting-pair"), "secret_like", "空白を含む形は設定の対の形でなくても、門が先に secret_like にする");
});

test("G3+ 設定の対でない文字列には全体の (e) が当たる（部品に分けるのは形に合った対だけ）", () => {
  assert.equal(ws.classifyValue("list", [`models.preset=${MIXED40}=x`], "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", [MIXED40], "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", [`models.preset=${MIXED40}`], "string"), "secret_like");
  assert.equal(ws.classifyValue("list", ["docs/abcdefghijklmnopqrs-abcdefghij=x"], "setting-pair"), "secret_like"); // 対の形でない（key に / がある）読める path の = は部品に分けない
  assert.equal(ws.classifyValue("list", ["models.preset=thorough"], "string"), "valid");
});

test("G4+ 版（version）の接尾辞: 読めない 20 文字以上の連なりは secret_like（形が説明する例外にしない）。読める接尾辞は通る", () => {
  assert.equal(ws.classifyValue("version", `1.2.3-${KEY32}`), "secret_like");
  assert.equal(ws.classifyValue("version", `1.2.3-${MIXED40.slice(0, 32)}`), "secret_like");
  assert.equal(ws.rejectionReasonOf("version", `1.2.3-${KEY32}`), "secret_like");
  for (const value of ["1.2.3", "2.11.1", "0.1.0", "1.2.3-rc.1", "1.2.3-alpha-20261117-build", "1.2.3+build.5"]) assert.equal(ws.classifyValue("version", value), "valid", value);
});

test("G5 commit-oid: 40 文字の 16 進は形そのものが連なり (e) なので門の (e) を外す（意図した限界）。(a)〜(d) の形・長さ違いは通らない", () => {
  assert.equal(ws.classifyValue("commit-oid", HEX40), "valid");
  assert.equal(ws.classifyValue("commit-oid", HEX40.toUpperCase()), "valid");
  assert.equal(ws.classifyValue("commit-oid", HEX40.slice(0, 39)), "secret_like"); // 形に合わない 39 文字は説明されない連なり
  assert.equal(ws.classifyValue("commit-oid", "abc123"), "invalid_format");
  assert.equal(ws.classifyValue("commit-oid", `${TOKEN}${HEX40}`), "secret_like");
  assert.equal(ws.classifyValue("commit-oid", `x.${HEX40}`), "secret_like");
});

test("G6 boolean: true・false・文字列の true・false だけ。長い連なりは secret_like", () => {
  for (const value of [true, false, "true", "false"]) assert.equal(ws.classifyValue("boolean", value), "valid", String(value));
  assert.equal(ws.classifyValue("boolean", MIXED40), "secret_like");
  assert.equal(ws.classifyValue("boolean", "yes"), "invalid_format");
});

test("G7 門の分類は固定の定数だけを返し、入力を写さない（例外を起こす入力・未知の種類は secret_like）", () => {
  const hostile = new Proxy([], { get() { throw new Error(MIXED40); } });
  assert.equal(ws.classifyValue("list", hostile, "setting-pair"), "secret_like");
  assert.equal(ws.classifyValue("list", pair("1"), "unknown-shape"), "secret_like");
  assert.equal(ws.classifyValue("unknown-type", MIXED40), "secret_like");
  assert.deepEqual([...ws.VALUE_CLASSIFICATIONS], ["valid", "invalid_format", "secret_like"]);
});
