// U2 観測の古さの判定（BR8.3）と項目ごとの観測 digest（BR6.2）、読めない単位の判定の失敗側。
// 結びの digest は今の観測の事実から再計算した値と比べ、結びが読めない・観測が読めない・例外が起きる入力は古い側に倒す（一致と読み替えない）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_B, callerText, fileRead, goodReads, observe } from "./working-state-fixtures.mjs";

const swapCaller = (ref) => goodReads().map((read) => (read.sourceKind === "workflow_caller" ? fileRead("workflow_caller", callerText(ref)) : read));

test("T8.3+ 結びの digest が今の観測の事実の digest と一致すれば古くない。読んだ中身が変われば古い", () => {
  const items = observe().items;
  const owner = { boundObservationDigest: ws.observationDigestOf(ws.factsOf(items)) };
  assert.equal(ws.isObservationStale(owner, "boundObservationDigest", items), false);
  assert.equal(ws.isObservationStale(owner, "boundObservationDigest", observe({ reads: swapCaller(OID_B) }).items), true);
});

test("T8.3- 結びが文字列でない・欄が無い・観測が読めない（例外が起きる）入力は古い側（一致と読み替えない）", () => {
  const items = observe().items;
  for (const owner of [{}, { boundObservationDigest: null }, { boundObservationDigest: 5 }, { boundObservationDigest: {} }]) {
    assert.equal(ws.isObservationStale(owner, "boundObservationDigest", items), true, JSON.stringify(owner));
  }
  const good = ws.observationDigestOf(ws.factsOf(items));
  assert.equal(ws.isObservationStale({ boundObservationDigest: good }, "boundObservationDigest", null), true);
  assert.equal(ws.isObservationStale({ boundObservationDigest: good }, "boundObservationDigest", [{ get itemKey() { throw new Error("boom"); } }]), true);
  assert.equal(ws.isObservationStale(null, "boundObservationDigest", items), true);
  assert.equal(ws.isObservationStale(undefined, "boundObservationDigest", items), true);
});

test("T6.2+ 項目ごとの観測 digest は、その項目の出典の事実だけから作る（別の項目の変化では変わらない。その項目の中身が変われば変わる）", () => {
  const before = ws.factsOf(observe().items);
  const after = ws.factsOf(observe({ reads: swapCaller(OID_B) }).items);
  assert.equal(ws.itemObservationDigestOf("aidlc_version", before), ws.itemObservationDigestOf("aidlc_version", after));
  assert.notEqual(ws.itemObservationDigestOf("sds_commit", before), ws.itemObservationDigestOf("sds_commit", after));
  assert.equal(ws.itemObservationDigestOf("sds_commit", before), ws.digestOf(before.filter((fact) => fact.unit.itemKey === "sds_commit")));
  assert.notEqual(ws.itemObservationDigestOf("sds_commit", before), ws.itemObservationDigestOf("no_such_item", before));
});

test("T3.4- 単位の欄が getter で例外を起こす・欄の型が違う単位は読めない（失敗側。読める単位だけが残る）", () => {
  const items = observe().items;
  const throwing = { ...items[0], get observation() { throw new Error("boom"); } };
  assert.equal(ws.isReadableUnit(throwing), false);
  assert.equal(ws.isReadableUnit(items[0]), true);
  assert.equal(ws.isReadableUnit({ ...items[0], matchGroup: 0 }), false);
  assert.equal(ws.isReadableUnit({ ...items[0], presence: "bogus" }), false);
  assert.equal(ws.isReadableUnit(null), false);
});
