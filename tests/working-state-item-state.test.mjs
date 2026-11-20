// U2 項目状態（LC3）: 出典ごとの観測を value・absent・unavailable・wrong_target・invalid に分け、決める順
// （wrong_target → invalid → conflict → unobservable → missing → confirmed）で項目状態をちょうど 1 つ決める。BR3.1〜BR3.4。
// 回答を入力に取らない。値は閉じた形の有効な値だけ示し、開いた形は presence・lengthBucket・matchGroup だけ（Owner の決定 116・120・122）。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, OID_B, TARGET, callerText, fileRead, goodReads, observe, pinText } from "./working-state-fixtures.mjs";

const NOW_REF = "2026-11-18T09:00:00+09:00";
const COMMIT = ws.findItem("sds_commit");
const TOKEN = "gh" + "p_" + "q".repeat(12);

// LC2 の出力と同じ形の項目を、読取りを通さずに作る（LC3 が読む欄だけ）。
const mk = (itemKey, sourceKind, locator, fields = {}) => ({
  itemKey, sourceRef: { sourceKind, locator, targetRef: TARGET }, observedAt: NOW_REF,
  observation: { observationId: `${itemKey}|${sourceKind}|${locator}|${NOW_REF}`, availability: fields.unobservableCause === undefined ? "observed" : "unavailable" },
  ...fields,
});
const valueOf = (oid) => ({ targetMatch: "matches", presence: "value", value: oid, valueDigest: ws.digestOf(oid) });
const OUTCOMES = {
  vA: valueOf(OID_A), vB: valueOf(OID_B), abs: { targetMatch: "matches", presence: "absent" }, una: { unobservableCause: "fetch_failed" },
  wrong: { targetMatch: "differs", namedTarget: "other-work" }, inv: { targetMatch: "matches", presence: "value", withheld: "invalid_format" },
};
const commitUnits = (pin, caller) => [mk("sds_commit", "sds_pin", ".shirube/sds-pin.json", OUTCOMES[pin]), mk("sds_commit", "workflow_caller", ".github/workflows/sds-gate.yml", OUTCOMES[caller])];
const stateOf = (pin, caller) => ws.evaluateItem(COMMIT, commitUnits(pin, caller)).state;

// 出典の組み合わせの期待する状態を、BR3.1 の表として 1 行ずつ書く（実装の写しにしない）。
const SPOT = [
  ["vA", "vA", "confirmed"], ["vA", "vB", "conflict"], ["vA", "abs", "conflict"], ["abs", "vA", "conflict"], ["vA", "una", "unobservable"], ["una", "vA", "unobservable"],
  ["abs", "abs", "missing"], ["abs", "una", "unobservable"], ["una", "una", "unobservable"], ["vA", "wrong", "wrong_target"], ["wrong", "una", "wrong_target"],
  ["vA", "inv", "invalid"], ["inv", "abs", "invalid"], ["wrong", "inv", "wrong_target"], ["inv", "una", "invalid"], ["vA", "vA", "confirmed"],
];

test("T3.1+ 出典の組み合わせの表（BR3.1 の決める順）どおりに状態が決まる", () => {
  for (const [pin, caller, expected] of SPOT) assert.equal(stateOf(pin, caller), expected, `${pin} / ${caller}`);
});

test("T3.1x 出典 2 つの結果 6 × 6 の全部の組み合わせが、必ず ItemState のちょうど 1 つに決まる", () => {
  const states = new Set(["confirmed", "missing", "conflict", "unobservable", "wrong_target", "invalid"]);
  let count = 0;
  for (const pin of Object.keys(OUTCOMES)) {
    for (const caller of Object.keys(OUTCOMES)) {
      const state = stateOf(pin, caller);
      assert.equal(states.has(state), true, `${pin} / ${caller}: ${state}`);
      assert.equal(state, stateOf(caller, pin), `並べ替えても同じ: ${pin} / ${caller}`);
      count += 1;
    }
  }
  assert.equal(count, 36);
});

test("T3.1x 出典の一覧の読み方: requiredForConfirmed が false の出典の absent だけを無視する。書かれていない出典は必須（失敗側）", () => {
  const entry = (flag) => ({ itemKey: "sds_commit", valueType: "commit-oid", normalization: "lowercase-hex", sources: [{ kind: "sds_pin", targetBinding: "by-location", requiredForConfirmed: flag }, { kind: "workflow_caller", targetBinding: "by-location" }] });
  const state = (flag, pin, caller) => ws.evaluateItem(entry(flag), commitUnits(pin, caller)).state;
  assert.equal(state(false, "abs", "vA"), "confirmed");
  assert.equal(state(false, "abs", "abs"), "missing");
  assert.equal(state(true, "abs", "vA"), "conflict");
  assert.equal(state(undefined, "abs", "vA"), "conflict");
  assert.equal(state("false", "abs", "vA"), "conflict");
  assert.equal(state(false, "vB", "vA"), "conflict");
  assert.equal(state(false, "una", "vA"), "unobservable");
  assert.equal(state(false, "wrong", "vA"), "wrong_target");
});

test("T3.1- 必須の出典の観測が渡されない（欠落）時は、読めなかった出典として unobservable。確認済み・未導入にしない", () => {
  const draft = ws.evaluateItem(COMMIT, [commitUnits("vA", "vA")[0]]);
  assert.deepEqual([draft.state, draft.unobservableCauses], ["unobservable", ["fetch_failed"]]);
  assert.equal(ws.evaluateItem(COMMIT, []).state, "unobservable");
  const stray = ws.evaluateItem(COMMIT, [...commitUnits("vA", "vA"), mk("sds_commit", "claude_settings", "x.json", OUTCOMES.vB)]);
  assert.equal(stray.state, "confirmed");
});

test("T3.2+ 食い違い: 読めた全出典（値のある出典と「この出典には無い」出典）を順位なしで candidates に載せる", () => {
  const draft = ws.evaluateItem(COMMIT, commitUnits("vA", "vB"));
  assert.equal(draft.state, "conflict");
  assert.deepEqual(draft.candidates.map((c) => [c.sourceRef.sourceKind, c.presence, c.displayValue, c.valueDigest]), [["sds_pin", "value", OID_A, ws.digestOf(OID_A)], ["workflow_caller", "value", OID_B, ws.digestOf(OID_B)]]);
  assert.equal(new Set(draft.candidates.map((c) => c.candidateRef)).size, 2);
  for (const rank of ["rank", "priority", "preferred", "score", "order"]) assert.equal(JSON.stringify(draft).includes(`"${rank}"`), false, rank);
  const absent = ws.evaluateItem(COMMIT, commitUnits("vA", "abs"));
  assert.deepEqual(absent.candidates.map((c) => [c.sourceRef.sourceKind, c.presence]), [["sds_pin", "value"], ["workflow_caller", "absent"]]);
  for (const key of ["valueDigest", "displayValue", "lengthBucket", "matchGroup"]) assert.equal(key in absent.candidates[1], false, key);
  assert.equal("confirmedValue" in draft, false);
});

test("T3.2+ 値の比べは項目の normalization の規則（大文字の commit は同じ値）。観測の並びを変えても同じ結果", () => {
  const lowered = ws.observeAll({ targetRef: TARGET, now: NOW_REF, catalog: ws.INITIAL_CATALOG, reads: [fileRead("sds_pin", pinText({ sds_commit: OID_A.toUpperCase() })), ...goodReads().filter((r) => r.sourceKind !== "sds_pin")], requiredVersions: {} });
  assert.equal(ws.evaluateItem(COMMIT, lowered.items.filter((i) => i.itemKey === "sds_commit")).state, "confirmed");
  const forward = JSON.stringify(ws.evaluateItem(COMMIT, commitUnits("vA", "vB")));
  assert.equal(JSON.stringify(ws.evaluateItem(COMMIT, [...commitUnits("vA", "vB")].reverse())), forward);
});

test("T3.2o 開いた形の食い違いは matchGroup の違いだけを根拠にし、値・digest・表示値を示さない。選ばせず fix-source の対象（candidates は出典・presence・lengthBucket・matchGroup だけ）", () => {
  const entry = ws.findItem("protected_paths");
  const open = (group, at) => mk("protected_paths", "sds_pin", `.shirube/p${at}.json`, { targetMatch: "matches", presence: "value", lengthBucket: "short", matchGroup: group });
  const same = ws.evaluateItem({ ...entry, sources: [{ kind: "sds_pin", requiredForConfirmed: true, targetBinding: "by-location" }] }, [open(1, 1), open(1, 2)]);
  assert.equal(same.state, "confirmed");
  assert.equal("confirmedValue" in same, false);
  const differ = ws.evaluateItem({ ...entry, sources: [{ kind: "sds_pin", requiredForConfirmed: true, targetBinding: "by-location" }] }, [open(1, 1), open(2, 2)]);
  assert.equal(differ.state, "conflict");
  assert.deepEqual(differ.candidates.map((c) => [c.presence, c.lengthBucket, c.matchGroup]), [["value", "short", 1], ["value", "short", 2]]);
  for (const key of ["valueDigest", "displayValue", "value"]) assert.equal(differ.candidates.some((c) => key in c), false, key);
});

test("T3.3+ 対象違いの出典は使わず、名指した対象を示す。別の出典の有効な値は「参考」として分け、candidates にも confirmedValue にも入れない", () => {
  const draft = ws.evaluateItem(COMMIT, commitUnits("vA", "wrong"));
  assert.equal(draft.state, "wrong_target");
  assert.deepEqual(draft.wrongTargets, [{ sourceRef: { sourceKind: "workflow_caller", locator: ".github/workflows/sds-gate.yml", targetRef: TARGET }, namedTarget: "other-work" }]);
  assert.deepEqual(draft.referenceValues.map((r) => [r.sourceRef.sourceKind, r.presence, r.displayValue]), [["sds_pin", "value", OID_A]]);
  for (const key of ["candidates", "confirmedValue"]) assert.equal(key in draft, false, key);
  const none = ws.evaluateItem(COMMIT, commitUnits("wrong", "una"));
  assert.deepEqual([none.state, none.referenceValues], ["wrong_target", []]);
});

test("T3.4+ 不正・秘密らしい観測値の出典は、項目・出典・固定の分類だけ。値・digest・候補・参考・案内の欄を作らない", () => {
  const draft = ws.evaluateItem(COMMIT, [mk("sds_commit", "sds_pin", "p.json", { targetMatch: "matches", presence: "value", withheld: "secret_like" }), ...commitUnits("vA", "vA").slice(1)]);
  assert.equal(draft.state, "invalid");
  assert.deepEqual(draft.invalidSources, [{ sourceRef: { sourceKind: "sds_pin", locator: "p.json", targetRef: TARGET }, withheld: "secret_like" }]);
  for (const key of ["candidates", "confirmedValue", "referenceValues", "wrongTargets"]) assert.equal(key in draft, false, key);
  assert.equal(ws.evaluateItem(COMMIT, commitUnits("inv", "inv")).invalidSources.length, 2);
});

test("T3.4p LC2 → LC3: 秘密らしい観測値は、観測から項目状態までのどこにも現れず、分類と出典だけが出る。形式に合う値は示される", () => {
  const reads = [fileRead("sds_pin", pinText({ sds_commit: TOKEN, kit_version: "0.1.0" })), ...goodReads().filter((r) => r.sourceKind !== "sds_pin")];
  const result = ws.observeAll({ targetRef: TARGET, now: NOW_REF, catalog: ws.INITIAL_CATALOG, reads, requiredVersions: {} });
  const drafts = ws.evaluateItems(ws.INITIAL_CATALOG, result.items);
  const commit = drafts.items.find((d) => d.itemKey === "sds_commit");
  assert.deepEqual([commit.state, commit.invalidSources.map((s) => s.withheld)], ["invalid", ["secret_like"]]);
  const text = JSON.stringify([result, drafts]);
  assert.equal(text.includes(TOKEN), false);
  assert.equal(text.includes(TOKEN.slice(0, 8)), false);
  assert.equal(drafts.items.find((d) => d.itemKey === "kit_version").confirmedValue, "0.1.0");
});

test("T3.1+ unobservable: 読めなかった出典の原因を示す（重複なし・辞書順）。確認済み・未導入と断定しない", () => {
  const two = ws.evaluateItem(COMMIT, [mk("sds_commit", "sds_pin", "a", { unobservableCause: "timed_out" }), mk("sds_commit", "workflow_caller", "b", { unobservableCause: "permission_denied" }), mk("sds_commit", "workflow_caller", "c", { unobservableCause: "permission_denied" })]);
  assert.deepEqual([two.state, two.unobservableCauses], ["unobservable", ["permission_denied", "timed_out"]]);
  const noCause = ws.evaluateItem(COMMIT, [{ ...mk("sds_commit", "sds_pin", "a", { unobservableCause: "timed_out" }), unobservableCause: undefined }, ...commitUnits("vA", "vA").slice(1)]);
  assert.deepEqual([noCause.state, noCause.unobservableCauses], ["unobservable", ["malformed"]]);
});

test("T3.1- 形が読めない観測（observed なのに結びも presence も無い）は有効な値にせず、観測できず（malformed）として扱う", () => {
  const broken = [{ ...mk("sds_commit", "sds_pin", "a"), targetMatch: undefined }, { ...mk("sds_commit", "workflow_caller", "b", { targetMatch: "matches" }), presence: undefined }];
  const draft = ws.evaluateItem(COMMIT, broken);
  assert.deepEqual([draft.state, draft.unobservableCauses], ["unobservable", ["malformed"]]);
});

test("T3.1+ confirmed: 閉じた形は有効な値だけを confirmedValue に持つ。開いた形は値を持たない。回答の欄は LC3 が作らない", () => {
  const closed = ws.evaluateItem(COMMIT, commitUnits("vA", "vA"));
  assert.deepEqual([closed.state, closed.confirmedValue], ["confirmed", OID_A]);
  assert.equal("answerRef" in closed, false);
  assert.deepEqual(closed.observationRefs, commitUnits("vA", "vA").map((u) => u.observation.observationId).sort());
});

test("T3.4+ 未知の項目（一覧にない項目）は無視せず、項目の名前だけを unknownItemKeys に示す。項目は一覧の順で 1 つずつ", () => {
  const result = observe();
  const strange = mk("mystery_item", "sds_pin", "z", OUTCOMES.vA);
  const drafts = ws.evaluateItems(ws.INITIAL_CATALOG, [...result.items, strange]);
  assert.deepEqual(drafts.unknownItemKeys, ["mystery_item"]);
  assert.deepEqual(drafts.items.map((d) => d.itemKey), ws.INITIAL_CATALOG.map((c) => c.itemKey));
  assert.equal(drafts.items.every((d) => d.state === "confirmed"), true);
  assert.deepEqual(ws.evaluateItems(ws.INITIAL_CATALOG, result.items).unknownItemKeys, []);
});

test("T3.2+ LC2 → LC3: 時刻の違う 2 出典の食い違い（sds_pin と workflow_caller）は conflict で、全出典を示す。揃っていれば confirmed", () => {
  const caller = (ref, observedAt) => fileRead("workflow_caller", callerText(ref), { observedAt });
  const drafts = (reads) => ws.evaluateItems(ws.INITIAL_CATALOG, ws.observeAll({ targetRef: TARGET, now: NOW_REF, catalog: ws.INITIAL_CATALOG, reads, requiredVersions: {} }).items);
  const rest = goodReads().filter((r) => r.sourceKind !== "workflow_caller");
  const differ = drafts([caller(OID_B, "2026-11-18T09:03:00+09:00"), ...rest]).items.find((d) => d.itemKey === "sds_commit");
  assert.equal(differ.state, "conflict");
  assert.deepEqual(differ.candidates.map((c) => c.sourceRef.sourceKind), ["sds_pin", "workflow_caller"]);
  const late = drafts([caller(OID_B, "2026-11-18T09:03:00+09:00"), caller(OID_A, "2026-11-18T08:50:00+09:00"), ...rest]).items.find((d) => d.itemKey === "sds_commit");
  assert.equal(late.state, "conflict");
  assert.equal(drafts([...rest, caller(OID_A, NOW_REF)]).items.find((d) => d.itemKey === "sds_commit").state, "confirmed");
  const noUses = drafts([fileRead("workflow_caller", "name: sample\n"), ...rest]).items.find((d) => d.itemKey === "sds_commit");
  assert.deepEqual([noUses.state, noUses.candidates.map((c) => c.presence)], ["conflict", ["value", "absent"]]);
});

test("T3.1+ LC2 → LC3: 読めない出典（権限不足）は unobservable、道具の版が足りない項目は unobservable（tool_unsupported_version）", () => {
  const reads = [...goodReads().filter((r) => r.sourceKind !== "workflow_caller"), fileRead("workflow_caller", "x", { access: "denied" })];
  const result = ws.observeAll({ targetRef: TARGET, now: NOW_REF, catalog: ws.INITIAL_CATALOG, reads, requiredVersions: { tool_node: "99.0.0" } });
  const drafts = ws.evaluateItems(ws.INITIAL_CATALOG, result.items).items;
  assert.deepEqual(drafts.find((d) => d.itemKey === "sds_commit").unobservableCauses, ["permission_denied"]);
  assert.deepEqual(drafts.find((d) => d.itemKey === "tool_node").unobservableCauses, ["tool_unsupported_version"]);
  assert.equal(drafts.find((d) => d.itemKey === "tool_aidlc").state, "confirmed");
});

test("T9.1+ 入力を書き換えない・同じ入力は同じ出力・結果は凍結される。LC3 は回答の部品を import しない（回答を入力に取らない）", () => {
  const units = commitUnits("vA", "vB");
  const before = JSON.stringify(units);
  const first = JSON.stringify(ws.evaluateItem(COMMIT, units));
  assert.equal(JSON.stringify(units), before);
  assert.equal(JSON.stringify(ws.evaluateItem(COMMIT, units)), first);
  const draft = ws.evaluateItem(COMMIT, units);
  assert.equal(Object.isFrozen(draft), true);
  assert.equal(Object.isFrozen(draft.candidates), true);
  assert.equal(Object.isFrozen(draft.candidates[0]), true);
  const source = readFileSync(new URL("../scripts/working-state/item-state.mjs", import.meta.url), "utf8");
  assert.equal(/^import .*from "\.\/(?:answers|draft|guidance)/mu.test(source), false);
});
