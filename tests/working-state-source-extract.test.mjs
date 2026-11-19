// U2 観測の解釈（LC2）の内側の、出典ごとの取り出し（BR1.2・BR3.4）の試験。実際に読んだ中身から項目の値を取り出すだけで、
// 宣言・既定値を足さない。読めて項目が無ければ absent、壊れていれば malformed。fixture は実物と同じ形の架空の値だけ。
import assert from "node:assert/strict";
import test from "node:test";
import * as workingState from "../scripts/working-state/index.mjs";

const ws = workingState;
const OID_A = "0123456789abcdef".repeat(2) + "01234567";
const parsed = (kind, content) => {
  const result = ws.parseSourceContent(kind, content);
  assert.equal(result.ok, true, `${kind} が解釈できる`);
  return result.doc;
};
const pick = (kind, key, content) => ws.pickItem(kind, key, parsed(kind, content));
const pin = (extra = {}) => JSON.stringify({ schema: "sds-pin/1", sds_commit: OID_A, kit_version: "0.1.0", protected_paths: [".shirube/**", "CODEOWNERS"], ...extra });

test("T1.2+ sds_pin: 読んだ JSON の欄から sds_commit・kit_version・protected_paths を取り出す", () => {
  assert.deepEqual(pick("sds_pin", "sds_commit", pin()), { presence: "value", value: OID_A });
  assert.deepEqual(pick("sds_pin", "kit_version", pin()), { presence: "value", value: "0.1.0" });
  assert.deepEqual(pick("sds_pin", "protected_paths", pin()), { presence: "value", value: [".shirube/**", "CODEOWNERS"] });
});

test("T2.1+ sds_pin: 読めて欄が無ければ absent（親が読めて無いと分かる）。欄が空でも absent にしない", () => {
  const withoutKit = JSON.stringify({ schema: "sds-pin/1", sds_commit: OID_A });
  assert.deepEqual(pick("sds_pin", "kit_version", withoutKit), { presence: "absent" });
  assert.deepEqual(pick("sds_pin", "kit_version", pin({ kit_version: "" })), { presence: "value", value: "" });
  assert.deepEqual(pick("sds_pin", "protected_paths", pin({ protected_paths: [] })), { presence: "value", value: [] });
  assert.deepEqual(pick("sds_pin", "kit_version", pin({ kit_version: null })), { presence: "value", value: null });
});

test("T3.4+ sds_pin: prototype の欄は欄として数えない（__proto__・constructor）", () => {
  const evil = '{"__proto__":{"kit_version":"9.9.9"},"constructor":"x"}';
  assert.deepEqual(pick("sds_pin", "kit_version", evil), { presence: "absent" });
});

test("T3.4- 壊れた出典は解釈できず malformed 側（JSON でない・object でない・空・未知の欄）", () => {
  for (const content of ["", "{", "not json", "[]", "null", "1", '"x"', "{} trailing", undefined, null, 5]) {
    assert.deepEqual(ws.parseSourceContent("sds_pin", content), { ok: false }, String(content));
    assert.deepEqual(ws.parseSourceContent("aidlc_settings", content), { ok: false }, String(content));
  }
  assert.deepEqual(ws.pickItem("sds_pin", "tool_node", parsed("sds_pin", pin())), { presence: "malformed" });
  assert.deepEqual(ws.pickItem("sds_pin", "__proto__", parsed("sds_pin", pin())), { presence: "malformed" });
});

test("T3.4- 取り出し方の無い出典の種類（claude_settings・remote_metadata・未知）は解釈しない（推測で値を作らない）", () => {
  for (const kind of ["claude_settings", "remote_metadata", "tool_probe", "unknown", "__proto__", undefined, 1]) {
    assert.deepEqual(ws.parseSourceContent(kind, "x"), { ok: false }, String(kind));
  }
});

test("T1.2+ aidlc_version: 中身の 1 つの末尾の改行だけを落とした 1 行の文字列を値にする", () => {
  assert.deepEqual(pick("aidlc_version", "aidlc_version", "2.11.1\n"), { presence: "value", value: "2.11.1" });
  assert.deepEqual(pick("aidlc_version", "aidlc_version", "2.11.1\r\n"), { presence: "value", value: "2.11.1" });
  assert.deepEqual(pick("aidlc_version", "aidlc_version", "2.11.1"), { presence: "value", value: "2.11.1" });
  assert.deepEqual(pick("aidlc_version", "tool_node", "2.11.1\n"), { presence: "malformed" });
});

test("F01- aidlc_version: 空・複数行・制御文字を含む中身は値にせず malformed（版の識別として読めない）", () => {
  for (const content of ["", "\n", "2.11.1\n\n", "2.11.1\n2.12.0\n", "2.11\r1", "2.11.1\u0000", "2.\t11.1", "2.11.1\u2028", "\u007f2.11.1", "\ufeff2.11.1"]) {
    assert.deepEqual(pick("aidlc_version", "aidlc_version", content), { presence: "malformed" }, JSON.stringify(content));
  }
});

test("T1.2+ aidlc_settings: 入れ子の欄を key=value の列にする（key は . でつなぎ、辞書順）", () => {
  const settings = JSON.stringify({ schemaVersion: 1, models: { schemaVersion: 1, preset: "thorough" } });
  assert.deepEqual(pick("aidlc_settings", "aidlc_settings", settings), {
    presence: "value",
    value: ["models.preset=thorough", "models.schemaVersion=1", "schemaVersion=1"],
  });
  assert.deepEqual(pick("aidlc_settings", "aidlc_settings", "{}"), { presence: "value", value: [] });
  assert.deepEqual(pick("aidlc_settings", "aidlc_settings", '{"a":{"b":{}}}'), { presence: "value", value: [] });
  assert.deepEqual(pick("aidlc_settings", "aidlc_settings", '{"on":true,"n":2.5}'), { presence: "value", value: ["n=2.5", "on=true"] });
});

test("T3.4+ aidlc_settings: 値が文字・数・真偽でない欄は、= を持たない要素にして形式の不正へ回す（値を作らない）", () => {
  assert.deepEqual(pick("aidlc_settings", "aidlc_settings", '{"a":null,"b":[1],"c":"x"}'), { presence: "value", value: ["a", "b", "c=x"] });
  const deep = JSON.stringify({ a: { b: { c: { d: { e: { f: { g: { h: { i: "x" } } } } } } } } });
  const [element] = pick("aidlc_settings", "aidlc_settings", deep).value;
  assert.equal(element.includes("="), false);
  assert.deepEqual(pick("aidlc_settings", "other", "{}"), { presence: "malformed" });
});

test("T2.2+ 道具の出力: 版の識別だけを取り出し、未加工の出力を返さない", () => {
  assert.equal(ws.extractToolVersion("v24.22.3\n"), "24.22.3");
  assert.equal(ws.extractToolVersion("aidlc 2.11.1"), "2.11.1");
  assert.equal(ws.extractToolVersion("tool version: 1.2\nbuilt for linux"), "1.2");
  assert.equal(ws.extractToolVersion("v1.2.3-rc.1"), "1.2.3");
});

test("F01- 道具の出力: 版らしい列が 2 つ以上ある・制御文字を含むなら null（先頭を黙って選ばない）", () => {
  for (const out of ["node v24.1.0 (npm 10.2.3)", "1.2.3 1.2.3", "tool 1.2\nbuilt 3.4", "v1.2.3\u0000", "1.2.3\u001b[0m", "\u2028v1.2.3"]) {
    assert.equal(ws.extractToolVersion(out), null, JSON.stringify(out));
  }
  assert.equal(ws.extractToolVersion("v24.22.3\r\n"), "24.22.3");
  assert.equal(ws.extractToolVersion("tool: 1.2.3\tbuilt"), "1.2.3");
});

test("T2.2- 道具の出力: 版が取り出せない・形が違うなら null（観測値なしの形式の不正へ回す）", () => {
  for (const out of ["", "Usage: tool [options]", "1", "v1", "abc1.2.3", "1.2.3abc", "1.2.3.4.5", undefined, null, 5, {}]) {
    assert.equal(ws.extractToolVersion(out), null, String(out));
  }
});
