// U2 観測の解釈（LC2）のうち、値の扱い: 閉じた形だけ保持・digest、開いた形は presence・lengthBucket・matchGroup だけ、
// 形式に合わない・秘密らしい値は固定の分類（withheld）だけ（Owner の決定 116・120・122）。BR3.4・BR5.2・BR8.3。
// 決定 122: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6964964182 （本文 SHA-256 6662e49d…）。
// fixture は架空の値だけ。実在の形式の固定長の英数字を source に直接書かず、部品から組み立てる（gitleaks に拾われない）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { availabilityOf, fileRead, goodReads, observe, pinText, probeRead, settingsText, unit } from "./working-state-fixtures.mjs";

const swap = (replacement) => goodReads().map((r) => (r.sourceKind === replacement.sourceKind && r.locator === replacement.locator ? replacement : r));
const pinWith = (over) => observe({ reads: swap(fileRead("sds_pin", pinText(over))) });
const openItem = (result, key) => result.items.find((i) => i.itemKey === key);
const TOKEN = "gh" + "p_" + "q".repeat(12);
const BEARER_SECRET = "Bearer " + "z".repeat(18);
const JWT_LIKE = ["h".repeat(12), "p".repeat(12), "s".repeat(12)].join(".");
const SECRETS = [TOKEN, BEARER_SECRET, JWT_LIKE, "k".repeat(24), "-----BEGIN " + "PRIVATE KEY" + "-----"];
const assertNoTrace = (result, values) => {
  const text = JSON.stringify(result);
  for (const value of values) {
    assert.equal(text.includes(value), false, `${value.slice(0, 6)}… が出力に残る`);
    assert.equal(text.includes(value.slice(0, 10)), false, `${value.slice(0, 6)}… の先頭が出力に残る`);
  }
};
// 開いた形（要素が自由な文字列の list）の 1 つの要素に架空の値を置いた入力。
const listWith = (element) => observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: [element] }))) });

test("T3.4+ 形式に合わない・秘密らしい閉じた形の値は withheld（固定の分類）だけで、値・valueDigest を持たず、入力は出力に残らない", () => {
  for (const [value, expected] of [[TOKEN, "secret_like"], ["k".repeat(24), "secret_like"], [JWT_LIKE, "secret_like"], ["not-a-commit-name", "invalid_format"], ["f0".repeat(19) + "f", "secret_like"], [42, "invalid_format"], [null, "invalid_format"]]) {
    const result = pinWith({ sds_commit: value });
    const item = unit(result, "sds_commit", "sds_pin");
    assert.deepEqual([availabilityOf(item), item.presence, item.withheld], ["observed", "value", expected], String(value).slice(0, 6));
    for (const field of ["value", "valueDigest", "lengthBucket", "matchGroup"]) assert.equal(field in item, false, field);
    assert.equal(item.observation.observedDigest, null);
    if (typeof value === "string") assertNoTrace(result, [value]);
  }
});

test("T3.4+ 形式に合う閉じた形の値は保持・digest される（決定 116）。分類が変わると観測の事実が変わる", () => {
  const good = unit(pinWith({ kit_version: "0.1.0" }), "kit_version", "sds_pin");
  const bad = unit(pinWith({ kit_version: "latest" }), "kit_version", "sds_pin");
  assert.equal(good.value, "0.1.0");
  assert.equal("withheld" in good, false);
  assert.equal(bad.withheld, "invalid_format");
  assert.notEqual(JSON.stringify(good), JSON.stringify(bad));
});

test("T3.4o 開いた形の値は、形式に合っていても保持・digest・表示をしない（presence・lengthBucket・matchGroup だけ）", () => {
  const result = observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: ["docs/sample-guide.md", "CODEOWNERS"] }))) });
  const item = openItem(result, "protected_paths");
  assert.deepEqual([item.presence, item.lengthBucket, item.matchGroup, "withheld" in item], ["value", "short", 1, false]);
  for (const field of ["value", "valueDigest"]) assert.equal(field in item, false, field);
  assertNoTrace(result, ["docs/sample-guide.md"]);
});

test("T3.4p 開いた形の秘密らしい・形式に合わない値は withheld だけ（lengthBucket・matchGroup なし）。値・一部・別の綴りが出力に残らない", () => {
  for (const secret of SECRETS) {
    const result = listWith(secret);
    const item = openItem(result, "protected_paths");
    assert.deepEqual([item.presence, item.withheld, "lengthBucket" in item, "matchGroup" in item], ["value", "secret_like", false, false], secret.slice(0, 6));
    assertNoTrace(result, [secret]);
  }
  const bad = observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: ["has space"] }))) });
  assert.equal(openItem(bad, "protected_paths").withheld, "invalid_format");
  assertNoTrace(bad, ["has space"]);
  const empty = observe({ reads: swap(fileRead("aidlc_settings", "{}")) });
  assert.equal(openItem(empty, "aidlc_settings").withheld, "invalid_format");
});

test("T3.4p 秘密らしい値が複数あっても、出力の全体のどこにも現れない（返り値の全体を走査する）", () => {
  const result = observe({ reads: swap(fileRead("sds_pin", pinText({ sds_commit: TOKEN, kit_version: BEARER_SECRET, protected_paths: [JWT_LIKE] }))) });
  assertNoTrace(result, [TOKEN, BEARER_SECRET, JWT_LIKE]);
  assert.equal(unit(result, "sds_commit", "sds_pin").withheld, "secret_like");
  assert.equal(unit(result, "kit_version", "sds_pin").withheld, "secret_like");
});

test("T3.4p 道具の出力は保持しない: 版が取り出せない出力は withheld = invalid_format になり、未加工の出力は出力に残らない", () => {
  const raw = "Usage: tool " + BEARER_SECRET;
  const result = observe({ reads: goodReads().map((r) => (r.locator === "node" ? probeRead("node", raw) : r)) });
  const item = unit(result, "tool_node", "tool_probe");
  assert.deepEqual([item.presence, item.withheld, "value" in item], ["value", "invalid_format", false]);
  assertNoTrace(result, [raw, BEARER_SECRET]);
});

test("T3.2o 開いた形の長さの区分: 0 = empty、1〜16 = short、17〜64 = medium、65 以上 = long（list は要素の数）", () => {
  const bucket = (count) => openItem(observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: Array.from({ length: count }, (_, i) => `p${i}`) }))) }), "protected_paths").lengthBucket;
  for (const [count, expected] of [[0, "empty"], [1, "short"], [16, "short"], [17, "medium"], [64, "medium"], [65, "long"], [256, "long"]]) assert.equal(bucket(count), expected, String(count));
});

test("T3.2o 長さの区分は選ばれた値の長さだけを表す（値の文字は表さない）。同じ長さの別の値は同じ事実になる", () => {
  const a = observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: ["aaa", "bbb", "ccc"] }))) });
  const b = observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: ["xxx", "yyy", "zzz"] }))) });
  assert.equal(JSON.stringify(openItem(a, "protected_paths")), JSON.stringify(openItem(b, "protected_paths")));
});

test("T8.3o 開いた形の中身だけの変化（分類・presence・長さの区分・一致の番号が同じ）は事実が変わらず、検出できたことにならない", () => {
  const a = observe({ reads: swap(fileRead("aidlc_settings", settingsText({ models: { preset: "thorough" } }))) });
  const b = observe({ reads: swap(fileRead("aidlc_settings", settingsText({ models: { preset: "balanced" } }))) });
  assert.equal(JSON.stringify(openItem(a, "aidlc_settings")), JSON.stringify(openItem(b, "aidlc_settings")));
});

test("T8.3p 開いた形の分類の変化（有効 → invalid_format → secret_like）は観測の事実が変わる。閉じた形の中身の変化は digest で検出する", () => {
  const valid = JSON.stringify(openItem(observe(), "protected_paths"));
  const invalid = JSON.stringify(openItem(observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: ["a b"] }))) }), "protected_paths"));
  const secret = JSON.stringify(openItem(observe({ reads: swap(fileRead("sds_pin", pinText({ protected_paths: [TOKEN] }))) }), "protected_paths"));
  assert.equal(new Set([valid, invalid, secret]).size, 3);
  const one = unit(pinWith({ kit_version: "0.1.0" }), "kit_version", "sds_pin").valueDigest;
  const two = unit(pinWith({ kit_version: "0.1.1" }), "kit_version", "sds_pin").valueDigest;
  assert.notEqual(one, two);
});

test("T3.2o 開いた形の一致: 同じ値の出典に同じ番号、違う値に違う番号（出典の辞書順の最初に現れた順で 1 から）。値は残らない", () => {
  const catalog = [{ itemKey: "aidlc_settings", valueType: "list", elementShape: "setting-pair", sources: [{ kind: "aidlc_settings", targetBinding: "by-location" }] }];
  const read = (locator, content) => fileRead("aidlc_settings", JSON.stringify(content), { locator });
  const groups = (contents) => {
    const reads = contents.map((c, i) => read(`conf-${i}.json`, c));
    const result = ws.observeAll({ targetRef: "sample-work", now: "2026-11-18T09:00:00+09:00", catalog, reads, requiredVersions: {} });
    return result.items.map((i) => i.matchGroup ?? null);
  };
  assert.deepEqual(groups([{ a: "x" }]), [1]);
  assert.deepEqual(groups([{ a: "x" }, { a: "x" }]), [1, 1]);
  assert.deepEqual(groups([{ a: "x" }, { a: "y" }]), [1, 2]);
  assert.deepEqual(groups([{ a: "x" }, { a: "y" }, { a: "x" }]), [1, 2, 1]);
  assert.deepEqual(groups([{ a: "x" }, { a: "y" }, { a: "z" }, { a: "y" }]), [1, 2, 3, 2]);
  assert.deepEqual(groups([{ a: "y" }, { a: "x" }]), [1, 2]);
});

test("T3.4p 秘密らしい出典は一致の番号づけから除かれ、番号を詰める（withheld は matchGroup を持たない）", () => {
  const catalog = [{ itemKey: "aidlc_settings", valueType: "list", elementShape: "setting-pair", sources: [{ kind: "aidlc_settings", targetBinding: "by-location" }] }];
  const reads = [{ a: "x" }, { [TOKEN]: "x" }, { a: "y" }].map((c, i) => fileRead("aidlc_settings", JSON.stringify(c), { locator: `conf-${i}.json` }));
  const result = ws.observeAll({ targetRef: "sample-work", now: "2026-11-18T09:00:00+09:00", catalog, reads, requiredVersions: {} });
  assert.deepEqual(result.items.map((i) => [i.matchGroup ?? null, i.withheld ?? null]), [[1, null], [null, "secret_like"], [2, null]]);
  assertNoTrace(result, [TOKEN]);
});
