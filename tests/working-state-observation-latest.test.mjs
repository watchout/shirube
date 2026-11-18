// U2 観測の解釈（LC2）のうち、観測の単位ごとの「最新 1 件」・出典の補完・対象の結び・入力の欠け。BR1.1・BR9.1（S4: 時刻は呼出側が渡す）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { EARLIER, LATER, NOW, OID_A, OID_B, TARGET, availabilityOf, fileRead, goodReads, observe, pinText, unit } from "./working-state-fixtures.mjs";

const without = (kind) => goodReads().filter((r) => r.sourceKind !== kind);
const pinAt = (observedAt, over = {}) => fileRead("sds_pin", pinText(over), { observedAt });
const commitOf = (result) => unit(result, "sds_commit", "sds_pin").value;
const named = (binding) => [{ itemKey: "aidlc_version", valueType: "version", normalization: "version-compare", sources: [{ kind: "aidlc_version", requiredForConfirmed: true, targetBinding: binding }] }];
const namedResult = (binding, over) => {
  const reads = [fileRead("aidlc_version", "2.11.1\n", over)];
  return ws.observeAll({ targetRef: TARGET, now: NOW, catalog: named(binding), reads, requiredVersions: {} });
};

test("T9.1+ 同じ単位の観測が複数届いたら、observedAt が最も新しい 1 件だけを使う。届いた順に依らない", () => {
  const older = pinAt(EARLIER, { sds_commit: OID_B });
  const newer = pinAt(LATER);
  for (const order of [[older, newer], [newer, older]]) {
    const result = observe({ reads: [...order, ...without("sds_pin")] });
    assert.equal(result.items.filter((i) => i.itemKey === "sds_commit" && i.sourceRef.sourceKind === "sds_pin").length, 1);
    assert.equal(commitOf(result), OID_A);
    assert.equal(unit(result, "sds_commit", "sds_pin").observation.observedAt, LATER);
  }
});

test("T9.1+ observedAt は時刻として比べる（書き方・時差が違っても、新しい方が選ばれる。文字列の順ではない）", () => {
  const utcEarly = pinAt("2026-11-18T00:04:00Z", { sds_commit: OID_B });
  const jstLate = pinAt("2026-11-18T09:05:00+09:00");
  const result = observe({ reads: [jstLate, utcEarly, ...without("sds_pin")] });
  assert.equal(commitOf(result), OID_A);
});

test("T9.1+ 単位が違う観測（同じ項目の別の出典・別の locator）は互いに捨てず、全部が残る", () => {
  const a = fileRead("sds_pin", pinText(), { observedAt: EARLIER });
  const b = fileRead("sds_pin", pinText({ sds_commit: OID_B }), { observedAt: LATER, locator: "other/sds-pin.json" });
  const result = observe({ reads: [a, b, ...without("sds_pin")] });
  assert.equal(unit(result, "sds_commit", "sds_pin", ".shirube/sds-pin.json").value, OID_A);
  assert.equal(unit(result, "sds_commit", "sds_pin", "other/sds-pin.json").value, OID_B);
  assert.equal(unit(result, "sds_commit", "workflow_caller").value, OID_A);
});

test("T9.1+ 遅れて届いた古い観測は捨てる。最新の観測が観測できずでも、古い値を使わない", () => {
  const newerFailed = fileRead("sds_pin", pinText(), { observedAt: LATER, access: "denied" });
  const result = observe({ reads: [pinAt(EARLIER), newerFailed, ...without("sds_pin")] });
  const item = unit(result, "sds_commit", "sds_pin");
  assert.deepEqual([availabilityOf(item), item.unobservableCause, "value" in item], ["unavailable", "permission_denied", false]);
});

test("T9.1+ 同じ observedAt で同じ内容の 2 件は 1 件として扱う。内容が違うなら、どちらも採らず changed_during_read", () => {
  const same = observe({ reads: [pinAt(LATER), pinAt(LATER), ...without("sds_pin")] });
  assert.equal(same.items.filter((i) => i.itemKey === "sds_commit" && i.sourceRef.sourceKind === "sds_pin").length, 1);
  assert.equal(commitOf(same), OID_A);
  const differ = observe({ reads: [pinAt(LATER), pinAt(LATER, { sds_commit: OID_B }), pinAt(EARLIER), ...without("sds_pin")] });
  const item = unit(differ, "sds_commit", "sds_pin");
  assert.deepEqual([availabilityOf(item), item.unobservableCause, "value" in item], ["unavailable", "changed_during_read", false]);
  assert.equal(differ.items.filter((i) => i.itemKey === "sds_commit" && i.sourceRef.sourceKind === "sds_pin").length, 1);
});

test("T9.1- observedAt が時刻として読めない観測は使わず malformed（最新の判定に混ぜない）", () => {
  for (const observedAt of ["yesterday", "2026-11-18", "2026-11-18T09:00:00", undefined, 5, null]) {
    const result = observe({ reads: [pinAt(observedAt), ...without("sds_pin")] });
    const item = unit(result, "sds_commit", "sds_pin");
    assert.deepEqual([availabilityOf(item), item.unobservableCause], ["unavailable", "malformed"], String(observedAt));
  }
});

test("T1.3+ 一覧にある出典の読取りが渡されなかった時は、読めなかった単位として観測できず（fetch_failed）を足す。成功・未導入にしない", () => {
  const result = observe({ reads: without("workflow_caller") });
  const item = unit(result, "sds_commit", "workflow_caller");
  assert.deepEqual([availabilityOf(item), item.unobservableCause, item.observation.observedAt], ["unavailable", "fetch_failed", NOW]);
  assert.equal(result.items.length, 8);
  const tool = unit(observe({ reads: goodReads().filter((r) => r.locator !== "node") }), "tool_node", "tool_probe");
  assert.deepEqual([availabilityOf(tool), tool.unobservableCause, tool.sourceRef.locator], ["unavailable", "fetch_failed", "node"]);
  assert.equal(observe({ reads: [] }).items.every((i) => availabilityOf(i) === "unavailable"), true);
});

test("T1.3- 一覧にない出典の読取りは項目を作らない（読んだだけで項目を増やさない）", () => {
  const stray = fileRead("claude_settings", "{}", { locator: ".claude/settings.json" });
  const result = observe({ reads: [stray, ...goodReads()] });
  assert.equal(JSON.stringify(result), JSON.stringify(observe()));
});

test("T1.1- 対象が渡されない時は観測せず、対象が要ると示して止まる。探して補わない", () => {
  for (const targetRef of [undefined, null, "", 5, {}]) {
    const result = observe({ targetRef });
    assert.deepEqual([result.status, result.items], ["target_required", []], String(targetRef));
  }
});

test("T9.1- 現在時刻が渡されない・読めない時は、核が自分で時計を読まず now_required で止まる（観測の時刻に now を足さない）", () => {
  for (const now of [undefined, null, "", "today", "2026-11-18", 7]) {
    const result = observe({ now });
    assert.deepEqual([result.status, result.items], ["now_required", []], String(now));
  }
  assert.equal(observe({ now: LATER }).items.every((i) => i.observation.observedAt === NOW), true);
  assert.equal(observe({ now: LATER, reads: [] }).items.every((i) => i.observation.observedAt === LATER), true);
});

test("T1.1+ named の出典: 出典が名指した対象が渡した対象と同じなら matches で値を使い、名指した対象を持つ", () => {
  const item = namedResult("named", { namedTarget: TARGET }).items[0];
  assert.deepEqual([availabilityOf(item), item.targetMatch, item.presence, item.value, item.namedTarget], ["observed", "matches", "value", "2.11.1", TARGET]);
});

test("T1.1+ 別の対象を名指す出典は differs（wrong_target）。値・digest・presence を使わず、名指した対象だけを持つ。binding が by-location でも同じ", () => {
  for (const binding of ["named", "by-location"]) {
    const item = namedResult(binding, { namedTarget: "other-work" }).items[0];
    assert.deepEqual([availabilityOf(item), item.targetMatch, item.namedTarget], ["observed", "differs", "other-work"], binding);
    for (const key of ["presence", "value", "valueDigest", "lengthBucket", "matchGroup", "withheld", "unobservableCause"]) assert.equal(key in item, false, `${binding}: ${key}`);
  }
});

test("T1.1u 対象を名指さない出典: by-location は読む位置で結ばれて matches、named（書かれていない時も）は unspecified = 観測できず（malformed）", () => {
  const byLocation = namedResult("by-location", {}).items[0];
  assert.deepEqual([byLocation.targetMatch, byLocation.value, "namedTarget" in byLocation], ["matches", "2.11.1", false]);
  const catalog = named("named");
  delete catalog[0].sources[0].targetBinding;
  for (const entries of [named("named"), catalog, named("bogus")]) {
    const item = ws.observeAll({ targetRef: TARGET, now: NOW, catalog: entries, reads: [fileRead("aidlc_version", "2.11.1\n")], requiredVersions: {} }).items[0];
    assert.deepEqual([availabilityOf(item), item.unobservableCause, "targetMatch" in item, "value" in item, "namedTarget" in item], ["unavailable", "malformed", false, false, false]);
  }
});

test("T1.1- 名指した対象は実際の読取りの結果だけから作る。項目一覧・呼出側の対象を写さない", () => {
  const result = ws.observeAll({ targetRef: TARGET, now: NOW, catalog: named("by-location"), reads: [fileRead("aidlc_version", "2.11.1\n")], requiredVersions: {} });
  assert.equal("namedTarget" in result.items[0], false);
  assert.equal(JSON.stringify(result).includes(`"namedTarget"`), false);
});

test("T1.3- 出典の読取りに必須の欄（sourceKind・locator）が無い・型が違う読取りは使わず、他の出典に影響しない", () => {
  const broken = [{ ...fileRead("sds_pin", pinText()), locator: undefined }, { ...fileRead("sds_pin", pinText()), sourceKind: undefined }, null, "x", 3, []];
  const result = observe({ reads: [...broken, ...without("sds_pin")] });
  assert.equal(unit(result, "sds_commit", "sds_pin").unobservableCause, "fetch_failed");
  assert.equal(unit(result, "aidlc_version", "aidlc_version").value, "2.11.1");
});

test("T9.1+ 入力（読取り・一覧・要る版）を書き換えない。返す値は並びが決まり、項目の識別が重複しない", () => {
  const reads = goodReads();
  const before = JSON.stringify(reads);
  const required = { tool_node: "22.0.0" };
  const result = observe({ reads, requiredVersions: required });
  assert.equal(JSON.stringify(reads), before);
  assert.deepEqual(required, { tool_node: "22.0.0" });
  const ids = result.items.map((i) => `${i.itemKey}|${i.sourceRef.sourceKind}|${i.sourceRef.locator}`);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [...ids].sort());
});
