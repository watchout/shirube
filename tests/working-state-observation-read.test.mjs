// U2 観測の解釈（LC2）のうち、1 回の読取りの扱い: 実際の読取りだけ・3 値・予算・根の内外・読取り中の変化・未導入の確定。
// BR1.2〜BR1.6・BR2.1。LC1 の生の事実（呼出側が渡す）から Observation を組み立てる。核は時計・環境・file を使わない（S4）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, OID_B, ROOT, availabilityOf, callerText, fileRead, goodReads, observe, pinText, unit } from "./working-state-fixtures.mjs";

// 同じ種類の出典の読取りを置き換える（locator を変えた読取りも、元の読取りの代わりに入る）。道具は名前（locator）で選ぶ。
const swap = (replacement) => goodReads().map((r) => (r.sourceKind === replacement.sourceKind && (r.sourceKind !== "tool_probe" || r.locator === replacement.locator) ? replacement : r));
const pinItems = ["sds_commit", "kit_version", "protected_paths"];
const absentKeys = ["presence", "targetMatch", "value", "valueDigest", "lengthBucket", "matchGroup", "withheld"];

function assertUnavailable(item, cause) {
  assert.equal(availabilityOf(item), "unavailable", `${item.itemKey} は観測できず`);
  assert.equal(item.unobservableCause, cause, item.itemKey);
  assert.equal(item.observation.observedDigest, null);
  for (const key of absentKeys) assert.equal(key in item, false, `観測できずは ${key} を持たない`);
}

const pinResult = (over) => observe({ reads: swap(fileRead("sds_pin", pinText(), over)) });
const assertPin = (result, cause) => {
  for (const key of pinItems) assertUnavailable(unit(result, key, "sds_pin"), cause);
};

test("T1.2+ 全部の出典が読めた時: 閉じた形は値と digest を持ち、開いた形は値も digest も持たない", () => {
  const result = observe();
  assert.equal(result.status, "observed");
  assert.equal(result.items.length, 8);
  const commit = unit(result, "sds_commit", "sds_pin");
  assert.deepEqual([commit.value, commit.valueDigest, commit.presence, commit.targetMatch], [OID_A, ws.digestOf(OID_A), "value", "matches"]);
  assert.equal(commit.observation.observedDigest, commit.valueDigest);
  assert.equal(unit(result, "sds_commit", "workflow_caller").valueDigest, commit.valueDigest);
  assert.equal(unit(result, "kit_version", "sds_pin").value, "0.1.0");
  assert.equal(unit(result, "aidlc_version", "aidlc_version").value, "2.11.1");
  assert.equal(unit(result, "tool_node", "tool_probe").value, "24.22.3");
  for (const key of ["aidlc_settings", "protected_paths"]) {
    const open = result.items.find((i) => i.itemKey === key);
    assert.deepEqual([open.presence, open.lengthBucket, open.matchGroup], ["value", "short", 1], key);
    for (const field of ["value", "valueDigest", "withheld"]) assert.equal(field in open, false, `${key} は開いた形で ${field} を持たない`);
    assert.equal(open.observation.observedDigest, null);
  }
});

test("T1.2- 宣言・cache・既定値・期待値の欄を読取りの事実に足しても観測は変わらない。読んだ中身を変えると変わる", () => {
  const base = JSON.stringify(observe());
  const decorated = goodReads().map((r) => ({ ...r, desired: OID_B, expected: OID_B, cached: OID_B, default: OID_B, declared: { value: OID_B } }));
  assert.equal(JSON.stringify(observe({ reads: decorated })), base);
  const changed = observe({ reads: swap(fileRead("workflow_caller", callerText(OID_B))) });
  assert.equal(unit(changed, "sds_commit", "workflow_caller").valueDigest, ws.digestOf(OID_B));
  assert.equal(unit(changed, "sds_commit", "sds_pin").valueDigest, ws.digestOf(OID_A));
});

test("T1.2+ normalization の規則で比べる形にする: 大文字の commit は小文字の値・digest、先頭の 0 のある版は正規の版", () => {
  const upper = observe({ reads: swap(fileRead("sds_pin", pinText({ sds_commit: OID_A.toUpperCase(), kit_version: "00.01.0" }))) });
  assert.equal(unit(upper, "sds_commit", "sds_pin").value, OID_A);
  assert.equal(unit(upper, "sds_commit", "sds_pin").valueDigest, ws.digestOf(OID_A));
  assert.equal(unit(upper, "kit_version", "sds_pin").value, "0.1.0");
});

test("T1.3+ 3 値: 読めない・変わった・権限不足・予算超過は観測できず（原因つき）で、presence・値を持たず、成功にも未導入にもならない", () => {
  assertPin(pinResult({ access: "denied" }), "permission_denied");
  assertPin(pinResult({ access: "failed" }), "fetch_failed");
  assertPin(pinResult({ digestAfter: "0".repeat(64) }), "changed_during_read");
  assertPin(pinResult({ measured: { elapsedMs: 3, bytesRead: 100, requests: 99 } }), "budget_exceeded");
});

test("T1.3- 他の出典は影響を受けない（1 件の失敗を理由に全体を捨てない）", () => {
  const result = pinResult({ access: "denied" });
  assert.equal(unit(result, "aidlc_version", "aidlc_version").value, "2.11.1");
  assert.equal(unit(result, "sds_commit", "workflow_caller").value, OID_A);
});

test("T1.4+ 予算: 時間・読んだ大きさ・回数は、宣言の値と等しい間は通り、超えたら timed_out / budget_exceeded", () => {
  const ok = observe({ reads: swap(fileRead("sds_pin", pinText(), { measured: { elapsedMs: 5000, bytesRead: 65536, requests: 8 } })) });
  assert.deepEqual(unit(ok, "kit_version", "sds_pin").budgetUsed, { requests: 8, bytes: 65536, elapsedMs: 5000 });
  assert.equal(unit(ok, "kit_version", "sds_pin").value, "0.1.0");
  assertPin(pinResult({ measured: { elapsedMs: 5001, bytesRead: 1, requests: 1 } }), "timed_out");
  assertPin(pinResult({ measured: { elapsedMs: 1, bytesRead: 65537, requests: 1 } }), "budget_exceeded");
  assertPin(pinResult({ measured: { elapsedMs: 1, bytesRead: 1, requests: 9 } }), "budget_exceeded");
});

test("T1.4- 予算の profile が読めない（budget が無い・不正）時は読取りを使わず malformed。既定の予算で代用しない", () => {
  const bad = [null, undefined, {}, [], "x", { maxElapsedMs: 1, maxBytes: 1 }, { maxElapsedMs: -1, maxBytes: 1, maxRequests: 1 }, { maxElapsedMs: "5", maxBytes: 1, maxRequests: 1 },
    { maxElapsedMs: 1.5, maxBytes: 1, maxRequests: 1 }, { maxElapsedMs: Number.NaN, maxBytes: 1, maxRequests: 1 }, { maxElapsedMs: 1, maxBytes: Number.POSITIVE_INFINITY, maxRequests: 1 }];
  for (const budget of bad) assertPin(pinResult({ budget }), "malformed");
  for (const measured of [null, {}, { elapsedMs: -1, bytesRead: 0, requests: 0 }, { elapsedMs: "3", bytesRead: 0, requests: 0 }, { elapsedMs: 0, bytesRead: Number.NaN, requests: 0 }]) {
    assertPin(pinResult({ measured }), "malformed");
  }
});

test("T1.5+ 根の外・循環・同じ実体でない・付随ファイルは out_of_boundary（読んだ中身を使わない）", () => {
  const cases = [
    { realPath: "/work/other/pin.json" }, { realPath: `${ROOT}-evil/.shirube/sds-pin.json` }, { realPath: `${ROOT}/../x/pin.json` }, { realPath: ROOT },
    { realPath: undefined }, { rootRealPath: undefined }, { resolution: "loop" }, { resolution: undefined }, { identity: "different" }, { identity: "unchecked" },
    { identity: undefined }, { locator: "../outside/pin.json", realPath: `${ROOT}/../outside/pin.json` }, { locator: "/etc/pin.json", realPath: "/etc/pin.json" },
    { locator: "a/../../pin.json", realPath: `${ROOT}/pin.json` },
  ];
  for (const over of cases) assertPin(observe({ reads: swap(fileRead("sds_pin", pinText(), { ...over })) }), "out_of_boundary");
});

test("T1.5+ OS の付随ファイル・編集の一時ファイルは値として読まず out_of_boundary", () => {
  for (const name of [".DS_Store", "._sds-pin.json", "Thumbs.db", "desktop.ini", "sds-pin.json~", ".#sds-pin.json", "#sds-pin.json#", "sds-pin.json.swp", "sds-pin.json.tmp"]) {
    const locator = `.shirube/${name}`;
    const result = observe({ reads: [fileRead("sds_pin", pinText(), { locator }), ...goodReads().filter((r) => r.sourceKind !== "sds_pin")] });
    assertUnavailable(unit(result, "kit_version", "sds_pin", locator), "out_of_boundary");
  }
});

test("T1.5- 特殊文字・空白・非 ASCII・長い名前（読める語を - でつないだ名前）の通常の file は通常と同じに扱う。20 文字以上の 1 語の名前は秘密らしい連なりとして使わない（malformed）", () => {
  const long = Array.from({ length: 20 }, () => "name").join("-");
  const secretLike = pinResult({ locator: `.shirube/${"n".repeat(120)}.json` });
  assertUnavailable(unit(secretLike, "kit_version", "sds_pin", "sds_pin"), "malformed");
  for (const locator of [".shirube/sample file.json", ".shirube/日本語の名前.json", `.shirube/${long}.json`, ".shirube/a;b$c`d.json", ".shirube/sds-pin.json.bak2"]) {
    const result = observe({ reads: [fileRead("sds_pin", pinText(), { locator }), ...goodReads().filter((r) => r.sourceKind !== "sds_pin")] });
    assert.equal(unit(result, "kit_version", "sds_pin", locator).value, "0.1.0", locator);
  }
});

test("T1.6+ 前後の digest が違う・digest が無い・読んだ中身が無いなら changed_during_read / fetch_failed。同じなら使う", () => {
  for (const over of [{ digestBefore: "a".repeat(64) }, { digestAfter: undefined }, { digestBefore: undefined, digestAfter: undefined }]) {
    assertPin(pinResult(over), "changed_during_read");
  }
  assertPin(pinResult({ content: undefined }), "fetch_failed");
  assert.equal(unit(pinResult({}), "kit_version", "sds_pin").value, "0.1.0");
});

test("T2.1+ 未導入の確定は親が読めて無いと分かる時だけ: absent は presence = absent（値を持たない）", () => {
  const result = observe({ reads: swap(fileRead("sds_pin", undefined, { access: "absent", parentReadable: true })) });
  for (const key of pinItems) {
    const item = unit(result, key, "sds_pin");
    assert.deepEqual([availabilityOf(item), item.presence, item.targetMatch], ["observed", "absent", "matches"], key);
    for (const field of ["value", "valueDigest", "lengthBucket", "matchGroup", "withheld", "unobservableCause"]) assert.equal(field in item, false, field);
  }
});

test("T2.1- 404 だけ（親が確認できない）・権限拒否・取得失敗・未知の結果は未導入にしない", () => {
  const absent = (over) => pinResult({ access: "absent", content: undefined, digestBefore: undefined, digestAfter: undefined, ...over });
  assertPin(absent({ parentReadable: false }), "not_found_unconfirmed");
  assertPin(absent({ parentReadable: undefined }), "not_found_unconfirmed");
  assertPin(absent({ parentReadable: "yes" }), "not_found_unconfirmed");
  assertPin(pinResult({ access: "denied", parentReadable: true }), "permission_denied");
  assertPin(pinResult({ access: "unknown" }), "fetch_failed");
  assertPin(pinResult({ access: undefined }), "fetch_failed");
});

test("T3.4+ 破損した出典は、それに依存する項目だけを malformed にする（他の項目は使い続ける）。欄が無い項目は absent", () => {
  const broken = observe({ reads: swap(fileRead("sds_pin", "{ not json")) });
  assertPin(broken, "malformed");
  assert.equal(unit(broken, "aidlc_version", "aidlc_version").value, "2.11.1");
  assert.equal(unit(broken, "sds_commit", "workflow_caller").value, OID_A);
  const partial = observe({ reads: swap(fileRead("sds_pin", JSON.stringify({ schema: "sds-pin/1", sds_commit: OID_A }))) });
  assert.equal(unit(partial, "kit_version", "sds_pin").presence, "absent");
  assert.equal(unit(partial, "sds_commit", "sds_pin").value, OID_A);
});

test("T9.1+ 同じ入力は同じ出力（2 回実行でバイト一致）。読取りの並びを変えても同じ", () => {
  const first = JSON.stringify(observe());
  assert.equal(JSON.stringify(observe()), first);
  assert.equal(JSON.stringify(observe({ reads: [...goodReads()].reverse() })), first);
  const result = observe();
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.items), true);
  assert.equal(Object.isFrozen(result.items[0]), true);
  assert.equal(Object.isFrozen(result.items[0].observation), true);
});
