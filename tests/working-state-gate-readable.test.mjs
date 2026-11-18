// U2 唯一の門（Owner の決定 95）の試験 その 3: (e) の中にある「読める path・名前」の例外の上限と、門の細部（レビュー回 4 の R-13・R-14）。
// 例外は (a)〜(d) を通った後でだけ (e) を外す。語の長さ・数字と英字が混ざった部品の合計に上限がある。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { MIXED40 } from "./working-state-gate-fixtures.mjs";
import { TOKEN } from "./working-state-secret-fixtures.mjs";

const cls = (value) => ws.classifyValue("string", value);
const word = (length, char = "a") => char.repeat(length);

test("R1+ 読める部品の長さ: 小文字・数字は 19 文字まで、大文字・数字は 19 文字まで、先頭だけ大文字は 19 文字まで（20 文字は読めない 1 語）", () => {
  assert.equal(cls(`a/${word(19)}`), "valid");
  assert.equal(cls(`a/${word(20)}`), "secret_like");
  assert.equal(cls(`A/${word(19, "B")}`), "valid");
  assert.equal(cls(`A/${word(20, "B")}`), "secret_like");
  assert.equal(cls(`A/B${word(18)}`), "valid");
  assert.equal(cls(`A/B${word(19)}`), "secret_like");
  assert.equal(cls(`a/${word(20, "0")}`), "secret_like");
  assert.equal(cls(`a/${word(20, "A")}`), "secret_like");
  assert.equal(cls(`a/B${word(20)}`), "secret_like");
});

test("R2+ 読める部品の合計: 数字と英字が混ざった部品（4 文字以上）の長さの合計は 16 文字まで（UUID・16 進を区切って並べた形は読めない）", () => {
  const dense = (n) => Array.from({ length: n }, (_, i) => `a${i % 10}bc`).join("-");
  assert.equal(cls(`x/${dense(4)}`), "valid");
  assert.equal(cls(`x/${dense(5)}`), "secret_like");
  assert.equal(cls("x/" + Array.from({ length: 6 }, () => "a1b").join("-") + "-aaaaaaaaaaaa"), "valid"); // 3 文字の部品は数えない（6 つで 18 文字でも合計に入れない）
  assert.equal(cls("x/" + Array.from({ length: 6 }, () => "a1b2c").join("-")), "secret_like"); // 5 文字の部品を 6 つ（30 文字）
  for (const uuid of ["123e4567-e89b-12d3-a456-426614174000", "7d6e8f9a-0b1c-4d2e-8f3a-5b6c7d8e9f01"]) {
    assert.equal(cls(`a.${uuid}`), "secret_like", uuid);
    assert.equal(cls(`docs/${uuid}/x`), "secret_like", uuid);
    assert.equal(cls(`a/${uuid.replaceAll("-", "_")}`), "secret_like", uuid);
  }
  assert.equal(cls("a/" + ["3fa91c0b", "7de24a58", "f6c109bd"].join("/")), "secret_like"); // 16 進を / で区切った並び
});

test("R3+ 読める path は * を含められる（glob の形）。* を使った長い語は読める path として通る", () => {
  assert.equal(cls("docs/**/some-long-readable-name/**/spec.md"), "valid");
  assert.equal(cls("src/*/some-long-readable-name.test.js"), "valid");
  assert.equal(cls("a/**/" + word(20)), "secret_like");
  assert.equal(cls(`src/${word(19)}*${word(19)}/x.js`), "secret_like"); // * で分けても、* を除いた 1 つの部品の長さで数える
});

test("R8+ 読める path は / か . を含む語に限る（- と _ だけで続く 1 語の長い名前は読める path にしない）。空の部品（先頭の ./ ・ // ）は数えない", () => {
  assert.equal(cls(`${word(19)}-${word(19)}`), "secret_like");
  assert.equal(cls(`${word(10)}_${word(10)}`), "secret_like");
  assert.equal(cls("./docs/shirube/readable-long-path/spec.md"), "valid");
  assert.equal(cls("docs//shirube/readable-long-path//spec.md"), "valid");
});

test("R4+ 語は空白で分けて 1 語ずつ (e) に通す（空白を含む文でも、読める path は連なりに数えない）", () => {
  const sentence = "see docs/shirube/readable-long-path/spec.md now";
  assert.equal(ws.rejectionReasonOf("string", sentence), "invalid_character");
  assert.equal(ws.rejectionReasonOf("string", "see\tdocs/shirube/readable-long-path/spec.md\tnow"), "invalid_character");
  assert.equal(ws.rejectionReasonOf("string", "see\ndocs/shirube/readable-long-path/spec.md now"), "invalid_character");
  assert.equal(ws.rejectionReasonOf("string", `see ${MIXED40} now`), "secret_like");
  assert.equal(ws.rejectionReasonOf("string", `see\t${MIXED40}\tnow`), "secret_like");
});

test("R5+ Bearer と語の間の空白は 1 文字の空白に限らない（タブ・改行・連続・no-break space）", () => {
  const long = "abcdefghijklmnop"; // 16 文字（(e) の 20 文字に届かない長さ）
  for (const gap of [" ", "\t", "\n", "  ", " ", " \t "]) {
    assert.equal(ws.hasSecretShape(`Bearer${gap}${long}`), true, JSON.stringify(gap));
    assert.equal(ws.isRefName(`Bearer${gap}${long}`), false, JSON.stringify(gap));
  }
  assert.equal(ws.hasSecretShape(`Bearer ${long.slice(0, 15)}`), false);
  assert.equal(ws.hasSecretShape(`xBearer ${long}`), false);
  assert.equal(ws.hasSecretShape(`1Bearer ${long}`), false);
});

test("R6+ 参照の区切り（| @ :）で分けた部品ごとに (e) を調べる: 区切りの前後の読める path は 1 語の連なりに数えない。(a)〜(d) は全体に先に当たる", () => {
  const path = "docs/shirube/readable-long-path/spec.md";
  for (const delimiter of ["|", "@", ":"]) {
    assert.equal(ws.isShowableRef(`item${delimiter}${path}`), true, delimiter);
    assert.equal(ws.isShowableRef(`${path}${delimiter}item`), true, delimiter);
    assert.equal(ws.isShowableRef(`item${delimiter}${MIXED40}`), false, delimiter);
    assert.equal(ws.isShowableRef(`item${delimiter}${TOKEN}`), false, delimiter);
  }
  assert.equal(ws.isShowableRef(`a|b@${path}:12`), true);
  assert.equal(ws.isShowableRef(`a ${path}`), true);
  assert.equal(ws.isShowableRef(`a b${"|"}${MIXED40}`), false);
  assert.equal(ws.isShowableRef(`item#${path}`), false);
});

test("R7+ 配列の検査は元の配列の差し替え（filter・every・iterator を書き換えた配列）に左右されない（複製を作って調べる）", () => {
  const filtered = [TOKEN];
  filtered.filter = () => [];
  assert.equal(ws.classifyValue("list", filtered, "string"), "secret_like");
  const everyTrue = [7];
  everyTrue.every = () => true;
  assert.equal(ws.rejectionReasonOf("list", everyTrue, "string"), "invalid_type");
  const iterated = [TOKEN];
  iterated[Symbol.iterator] = function* empty() {};
  assert.equal(ws.classifyValue("list", iterated, "string"), "secret_like");
  assert.equal(ws.rejectionReasonOf("list", new Array(2), "string"), "invalid_type");
  assert.equal(ws.classifyValue("list", ["ok", "fine"], "string"), "valid");
});
