// U2 BR5.2 の秘密らしさの判定（value-exposure）。語の先頭だけでなく、区切り・引用符・括弧・URL の利用者情報・設定の対の = の後ろ・
// 別の語の末尾の . の後ろなど、語の中のどこに埋まっていても当たること（(b) 接頭辞・(c) Bearer・(d) JWT・(e) 語の中の 20 文字以上の連なり）。
// 区切りの種類は先に列挙して、全部に同じ秘密らしい値を付ける（E1〜E5 の媒体別の列挙）。読める path・名前は誤って断らない（E6）。
// 試験の秘密らしい値は架空で、gitleaks に拾われないよう分けて作る。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";

const TOKEN = "gh" + "p_" + "u".repeat(12);
const OTHER_PREFIXES = ["gho_", "ghu_", "ghs_", "ghr_", "github_pat_", "AKI" + "A", "s" + "k-", "xox" + "b-", "xox" + "p-"].map((prefix) => prefix + "Q".repeat(12));
const RUN = "Zq".repeat(12);
const JWT = ["a".repeat(12), "b".repeat(12), "c".repeat(12)].join(".");
const WORD16 = "w".repeat(16);
// 区切りの類（空白を除く）。引用符・括弧・: ; , . ~ # ? % @ / \ | & = ! * + と、名前の中の - と _。
const DELIMS = ['"', "'", "(", ")", "[", "]", "{", "}", "<", ">", ":", ";", ",", ".", "~", "#", "?", "%", "@", "/", "\\", "|", "&", "=", "!", "*", "+", "-", "_"];
const embedded = (payload) => DELIMS.flatMap((delim) => [`x${delim}${payload}`, `${delim}${payload}`, `x${delim}${payload}${delim}`]);
const URL_FORMS = (payload) => [`https://x-access-token:${payload}@github.com/o/r`, `https://${payload}@github.com/o/r`, `git+https://oauth2:${payload}@host.example/x.git`, `https://user%3A${payload}@h.example/r`, `ssh://git:${payload}@h.example`];
const isSecret = (type, value, shape) => ws.classifyValue(type, value, shape) === "secret_like";

test("E1+ (b) 接頭辞: 先頭・全部の区切りの直後・語の末尾の . の後ろ・URL の利用者情報・%XX の直後のどこでも秘密らしい（string・list の要素・回答の拒否）", () => {
  for (const form of [...embedded(TOKEN), ...URL_FORMS(TOKEN)]) {
    assert.equal(isSecret("string", form), true, form);
    assert.equal(isSecret("list", [form]), true, form);
    assert.equal(ws.rejectionReasonOf("string", form), "secret_like", form);
    assert.equal(ws.rejectionReasonOf("list", [form]), "secret_like", form);
  }
  assert.equal(DELIMS.length, 29);
});

test("E1+ (b) 接頭辞の全部の種類（ghp_ 以外の 9 種）が、代表の区切りの直後で秘密らしい", () => {
  for (const token of OTHER_PREFIXES) {
    for (const form of [token, `x.${token}`, `(${token})`, `a:${token}`, `p?k=${token}`, `cfg~${token}`, `x#${token}`, `user%3A${token}`]) assert.equal(isSecret("string", form), true, form);
  }
});

test("E2+ (e) 語の中の 20 文字以上の連なり: 接頭辞の無い連なりも、全部の区切りの直後・URL の利用者情報の中で秘密らしい。語の全体の一致でなくてよい", () => {
  for (const form of [...embedded(RUN), ...URL_FORMS(RUN), `.${"k".repeat(20)}`, `a.${"k".repeat(20)}`]) {
    assert.equal(isSecret("string", form), true, form);
    assert.equal(isSecret("list", [form]), true, form);
  }
  assert.equal(isSecret("string", `a.${"k".repeat(19)}`), false);
});

test("E3+ (d) JWT の形: 区切りの直後・引用符や括弧の中・別の部品の後ろでも秘密らしい。3 つの部分でない形・短い部分は当たらない", () => {
  for (const form of [JWT, `x.${JWT}`, `(${JWT})`, `a:${JWT}`, `"${JWT}"`, `a=${JWT}`, `u/${JWT}`, `q|${JWT}`, `[${JWT}]`]) assert.equal(isSecret("string", form), true, form);
  const parts = (...lengths) => lengths.map((n, i) => "abc"[i].repeat(n)).join(".");
  for (const form of [parts(9, 10, 10), parts(10, 9, 10), parts(10, 10), `${parts(10, 10, 5)}.dddd`]) assert.equal(isSecret("string", form), false, form);
});

test("E4+ (c) Bearer: 区切り・引用符・括弧の直後の Bearer + 長い語も秘密らしい。語が短い・Bearer の前が英数字なら当たらない", () => {
  for (const form of [`Bearer ${WORD16}`, `Authorization:Bearer ${WORD16}`, `"Bearer ${WORD16}"`, `x=Bearer ${WORD16}`, `(Bearer ${WORD16})`, `h.Bearer ${WORD16}`]) assert.equal(isSecret("string", form), true, form);
  for (const form of [`Bearer ${"w".repeat(15)}`, `xBearer ${WORD16}`]) assert.equal(isSecret("string", form), false, form);
});

test("E5+ (a) 鍵の見出し: 区切りの直後でも秘密らしい。設定の対の = の後ろの接頭辞も拒む（O10+ の限界の解消）", () => {
  const header = ["-----BEGIN ", "PRIVATE KEY", "-----"].join("");
  for (const form of [header, `x:${header}`, `"${header}"`, `(${header})`]) assert.equal(isSecret("string", form), true, form);
  assert.equal(ws.rejectionReasonOf("list", [`models.token=${TOKEN}`], "setting-pair"), "secret_like");
  assert.equal(ws.rejectionReasonOf("list", [`models.preset=${"v".repeat(40)}`], "setting-pair"), null);
});

test("E6+ 読める path・名前は誤って断らない: 長い path・拡張子つきの名前・英数字に挟まれた sk- は valid。20 文字以上の 1 語・大小の混ざった語は断る", () => {
  const readable = [".github/workflows/sds-gate.yml", "kit/skills/sds-audit/SKILL.md", ".shirube/sds-pin.json", "docs/design-audit-request-2026-11-18.json", "scripts/hygiene/lines-baseline.mjs",
    "tests/working-state-observation-locator.test.mjs", "src/__init__.py", "docs/CODEOWNERS", "disk-usage", "task-list", "ask-me-later", "x.y.z", "2026-11-18T10:00:00.000Z", "a/b/c/d/e", "xghp_" + "u".repeat(4)];
  for (const form of readable) {
    assert.equal(ws.classifyValue("string", form), "valid", form);
    assert.equal(ws.classifyValue("list", [form]), "valid", form);
  }
  for (const form of [`.shirube/${"n".repeat(120)}.json`, `docs/${"a".repeat(20)}.md`, "x.AbCdEfGhIjKlMnOpQrStUvWx", "docs/AbCdEfGhIjKlMnOpQrStUvWx.md", "a/" + "0123456789abcdef".repeat(2) + "01234567"]) {
    assert.equal(isSecret("string", form), true, form);
  }
});

test("E7+ 限界を書いた試験: 接頭辞が英数字に直結した短い形は (b) に当たらない（(e) の 20 文字から当たる）。他の符号化は対象外", () => {
  assert.equal(ws.classifyValue("string", `x${TOKEN}`), "valid");
  assert.equal(isSecret("string", `x${TOKEN}${"u".repeat(8)}`), true);
  assert.equal(ws.classifyValue("string", "x%67" + "hp_" + "u".repeat(6)), "valid");
});
