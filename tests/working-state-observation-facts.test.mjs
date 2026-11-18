// U2 観測の事実（ObservationFact）と観測 digest（BR6.2・BR8.3）。観測した結果から再計算し、参照名・時刻からは作らない（S5）。
// 閉じた形は値の digest、開いた形は presence・lengthBucket・matchGroup・固定の分類（withheld）だけ。値は事実に入らない（決定 116・120・122）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { LATER, LOCATORS, OID_A, OID_B, fileRead, goodReads, observe, pinText, settingsText } from "./working-state-fixtures.mjs";

const swapRead = (reads, kind, content, over) => reads.map((read) => (read.sourceKind === kind ? fileRead(kind, content, over) : read));
const digestOf = (result) => ws.observationDigestOf(ws.factsOf(result.items));
const factOf = (result, itemKey, kind) => ws.factsOf(result.items).find((fact) => fact.unit.itemKey === itemKey && fact.unit.sourceRef.sourceKind === kind);

test("T8.3+ 事実は観測の単位ごとに 1 件で、単位の識別を持ち、決まった並び（単位の辞書順）になる", () => {
  const facts = ws.factsOf(observe().items);
  assert.equal(facts.length, observe().items.length);
  const keys = facts.map((fact) => [fact.unit.targetRef, fact.unit.itemKey, fact.unit.sourceRef.sourceKind, fact.unit.sourceRef.locator].join("\u0000"));
  assert.deepEqual(keys, [...keys].sort());
  const pin = factOf(observe(), "sds_commit", "sds_pin");
  assert.deepEqual(pin.unit, { targetRef: "sample-work", itemKey: "sds_commit", sourceRef: { sourceKind: "sds_pin", locator: LOCATORS.sds_pin } });
  assert.equal(Object.isFrozen(facts) && Object.isFrozen(facts[0]), true);
});

test("T8.3+ 閉じた形は valueDigest、開いた形は lengthBucket と matchGroup だけ。欄の全部が決まった形で出る", () => {
  const closed = factOf(observe(), "sds_commit", "sds_pin");
  assert.deepEqual(
    { ...closed, unit: undefined },
    { unit: undefined, availability: "observed", targetMatch: "matches", presence: "value", valueDigest: ws.digestOf(OID_A), lengthBucket: null, matchGroup: null, withheld: null, unobservableCause: null },
  );
  const open = factOf(observe(), "aidlc_settings", "aidlc_settings");
  assert.deepEqual(
    { ...open, unit: undefined },
    { unit: undefined, availability: "observed", targetMatch: "matches", presence: "value", valueDigest: null, lengthBucket: "short", matchGroup: 1, withheld: null, unobservableCause: null },
  );
});

test("T8.3+ 観測できず・対象違い・無い・値を保持しない分類の事実の形（原因・分類だけで、値も名指した対象の文字も入らない）", () => {
  const reads = [...goodReads().filter((read) => read.sourceKind !== "aidlc_version" && read.sourceKind !== "sds_pin"), fileRead("sds_pin", pinText({ sds_commit: "zz" }), { namedTarget: "other-work" })];
  const result = observe({ reads });
  const gone = factOf(result, "aidlc_version", "aidlc_version");
  assert.deepEqual({ ...gone, unit: undefined }, { unit: undefined, availability: "unavailable", targetMatch: null, presence: null, valueDigest: null, lengthBucket: null, matchGroup: null, withheld: null, unobservableCause: "fetch_failed" });
  const wrong = factOf(result, "sds_commit", "sds_pin");
  assert.deepEqual([wrong.targetMatch, wrong.presence, wrong.valueDigest, wrong.withheld], ["differs", null, null, null]);
  assert.equal(JSON.stringify(ws.factsOf(result.items)).includes("other-work"), false);
  const bad = observe({ reads: swapRead(goodReads(), "sds_pin", pinText({ sds_commit: "zz" })) });
  const withheld = factOf(bad, "sds_commit", "sds_pin");
  assert.deepEqual([withheld.presence, withheld.valueDigest, withheld.withheld], ["value", null, "invalid_format"]);
  const absent = observe({ reads: swapRead(goodReads(), "sds_pin", JSON.stringify({ schema: "sds-pin/1" })) });
  assert.deepEqual([factOf(absent, "sds_commit", "sds_pin").presence, factOf(absent, "sds_commit", "sds_pin").valueDigest], ["absent", null]);
});

test("T8.3+ 同じ入力は同じ digest（64 桁の小文字 16 進）。観測の時刻・予算の使用量だけが違っても変わらない（事実に入れない）", () => {
  const a = digestOf(observe());
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(digestOf(observe()), a);
  const later = observe({ reads: goodReads().map((read) => ({ ...read, observedAt: LATER, measured: { ...read.measured, elapsedMs: 4 } })) });
  assert.equal(digestOf(later), a);
});

test("T8.3+ 参照名（locator・観測の識別）が同じまま 1 出典の中身だけを変えると digest が変わる（宣言は証拠でない）", () => {
  const before = observe();
  const after = observe({ reads: swapRead(goodReads(), "sds_pin", pinText({ sds_commit: OID_B })) });
  assert.deepEqual(before.items.map((i) => i.observation.observationId), after.items.map((i) => i.observation.observationId));
  assert.notEqual(digestOf(before), digestOf(after));
});

test("T8.3+ observed → unavailable、項目の有無の変化で digest が変わる", () => {
  const base = digestOf(observe());
  const withoutRead = observe({ reads: goodReads().filter((read) => read.sourceKind !== "aidlc_version") });
  assert.notEqual(digestOf(withoutRead), base);
  const fewer = observe({ catalog: ws.INITIAL_CATALOG.filter((entry) => entry.itemKey !== "kit_version"), reads: goodReads() });
  assert.notEqual(digestOf(fewer), base);
  assert.notEqual(digestOf({ items: [] }), base);
});

test("T8.3+ 対象違いの有無・出典の追加でも digest が変わる。単位の識別（対象）も含む", () => {
  const base = digestOf(observe());
  const wrong = observe({ reads: swapRead(goodReads(), "sds_pin", pinText(), { namedTarget: "other-work" }) });
  assert.notEqual(digestOf(wrong), base);
  const other = ws.observeAll({ targetRef: "other-work", now: "2026-11-18T09:00:00+09:00", catalog: ws.INITIAL_CATALOG, reads: goodReads(), requiredVersions: {} });
  assert.notEqual(digestOf(other), base);
});

test("T8.3p 開いた形は、値が合う → invalid_format、合う → secret_like の分類の変化で digest が変わる。出力に値は現れない", () => {
  const withSettings = (content) => observe({ reads: swapRead(goodReads(), "aidlc_settings", content) });
  const valid = digestOf(withSettings(settingsText()));
  const SECRET = "gh" + "p_" + "r".repeat(12);
  const invalid = withSettings(settingsText({ models: { preset: "has space" } }));
  const secret = withSettings(JSON.stringify({ [SECRET]: "1" }));
  const digests = new Set([valid, digestOf(invalid), digestOf(secret)]);
  assert.equal(digests.size, 3);
  assert.equal(factOf(invalid, "aidlc_settings", "aidlc_settings").withheld, "invalid_format");
  assert.equal(factOf(secret, "aidlc_settings", "aidlc_settings").withheld, "secret_like");
  const text = JSON.stringify([ws.factsOf(invalid.items), ws.factsOf(secret.items), digestOf(invalid), digestOf(secret)]);
  for (const trace of [SECRET, "has space", "thorough", SECRET.slice(0, 8)]) assert.equal(text.includes(trace), false, trace);
});

test("T8.3o 開いた形の、同じ分類・長さの区分・一致の番号のままの中身だけの変化は digest に現れない（決定 120 の限り。検出を保証しない）", () => {
  const a = observe({ reads: swapRead(goodReads(), "aidlc_settings", settingsText({ models: { preset: "thorough" } })) });
  const b = observe({ reads: swapRead(goodReads(), "aidlc_settings", settingsText({ models: { preset: "balanced" } })) });
  assert.equal(digestOf(a), digestOf(b));
  const longer = observe({ reads: swapRead(goodReads(), "aidlc_settings", settingsText({ extra: { one: "1", two: "2" } })) });
  assert.equal(factOf(longer, "aidlc_settings", "aidlc_settings").lengthBucket, "short");
});

test("T6.2+ 項目の観測 digest は、その項目の全出典の事実だけから作る。ほかの項目の変化では変わらない。回答（答え）は入力に入らない", () => {
  const facts = ws.factsOf(observe().items);
  const commit = ws.itemObservationDigestOf("sds_commit", facts);
  assert.match(commit, /^[0-9a-f]{64}$/);
  const changedOther = ws.factsOf(observe({ reads: swapRead(goodReads(), "aidlc_version", "9.9.9\n") }).items);
  assert.equal(ws.itemObservationDigestOf("sds_commit", changedOther), commit);
  assert.notEqual(ws.itemObservationDigestOf("aidlc_version", changedOther), ws.itemObservationDigestOf("aidlc_version", facts));
  const changedPin = ws.factsOf(observe({ reads: swapRead(goodReads(), "workflow_caller", "name: x\njobs:\n  g:\n    uses: watchout/shirube/.github/workflows/sds-gate.yml@" + OID_B + "\n") }).items);
  assert.notEqual(ws.itemObservationDigestOf("sds_commit", changedPin), commit);
  assert.equal(ws.itemObservationDigestOf("not_listed", facts), ws.itemObservationDigestOf("also_not_listed", facts));
});

test("T8.3 入力を書き換えず、読めない入力は例外を起こさず失敗側に倒れる（事実を作れなければ digest を作らない）", () => {
  const items = observe().items;
  const before = JSON.stringify(items);
  ws.factsOf(items);
  assert.equal(JSON.stringify(items), before);
  assert.throws(() => ws.factsOf(null), TypeError);
  assert.throws(() => ws.factsOf([null]), TypeError);
  assert.throws(() => ws.observationDigestOf([{ unit: 1n }]), TypeError);
});
