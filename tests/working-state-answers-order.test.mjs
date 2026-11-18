// U2 回答の判定の順（BR6.2・BR6.3。T6.2m・T6.2n・T6.2o・T6.2p）。閉じた形で再観測の値が回答と一致し、全出典が値を持つ時は、
// 観測 digest が変わっていても「一致を確認」を先に判定し、無効にしない。それ以外で観測 digest が変われば invalidated。
// 開いた形は値を比べないので先の判定に入らない。順は arc の読み（決定 95）で、Owner の言葉ではない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, OID_B, callerText, goodReads, pinText } from "./working-state-fixtures.mjs";
import { CATALOG, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";

const [VERSION, COMMIT, SETTINGS] = CATALOG;
const versionAnswers = (value) => send(answerInput({ itemKey: "aidlc_version", value })).answers;
const commitAnswers = (value, observed) => send(answerInput({ itemKey: "sds_commit", value }), { observed }).answers;
const reconcile = (answers, observed, catalog = CATALOG) => ws.reconcileAnswers(answers, observed.items, catalog);
const verdict = (answers, entry, observed, reobserved = true) => ws.answerStatusOf({ answer: answers[0], entry, observedItems: observed.items, reobserved });
const withVersion = (text) => observeWith(CATALOG, withContent(goodReads(), "aidlc_version", text));
const withoutSource = (kind) => observeWith(CATALOG, goodReads().filter((read) => read.sourceKind !== kind));
const stateOf = (entry, observed) => ws.evaluateItem(entry, observed.items).state;

// 利用者が答えられる sds_commit の観測を、2 つの出典（sds_pin・workflow_caller）の中身で作る。
const commitReads = (pin, caller, over) => withContent(withContent(goodReads(), "sds_pin", pin), "workflow_caller", caller, over);
const commitWorld = (pin = pinText(), caller = callerText(), over) => observeWith(CATALOG, commitReads(pin, caller, over));

// keep-absent の回答は候補を指す形で作られ、本体の入力からは作れないので、結びを観測から計算して作る。
const keepAbsent = (observed) => [{
  answerId: "ans-1", itemKey: "sds_commit", kind: "keep-absent", state: "answered", answeredAt: "2026-11-18T10:00:00+09:00",
  selectedCandidateRef: "sds_commit@sds_pin:.shirube/sds-pin.json",
  boundObservationDigest: ws.itemObservationDigestOf("sds_commit", ws.factsOf(observed.items)),
}];
const ABSENT = () => commitWorld(JSON.stringify({ schema: "sds-pin/1" }), "name: sample\njobs: {}\n");

test("T6.2m 閉じた形: 観測 digest が変わっても、再観測の値が回答と一致すれば answered のまま残り、一致を確認と示す", () => {
  const answers = versionAnswers("9.9.9");
  const applied = withVersion("9.9.9\n");
  assert.notEqual(ws.itemObservationDigestOf("aidlc_version", ws.factsOf(applied.items)), answers[0].boundObservationDigest);
  assert.equal(stateOf(VERSION, applied), "confirmed");
  assert.equal(reconcile(answers, applied)[0].state, "answered");
  assert.equal(verdict(answers, VERSION, applied), "match_confirmed");
  assert.equal(verdict(reconcile(answers, applied), VERSION, applied), "match_confirmed");
  assert.equal(verdict(answers, VERSION, applied, false), "answered_unapplied");
});

test("T6.2m 値が回答と同じ値に正規化される（桁の 0）再観測でも、一致を確認。ほかの回答を受ける・draft を作る経路でも無効にしない", () => {
  const answers = versionAnswers("09.009.9");
  const applied = withVersion("9.9.9\n");
  assert.equal(verdict(answers, VERSION, applied), "match_confirmed");
  const next = send(answerInput({ answerId: "ans-2", itemKey: "aidlc_settings", value: ["models.preset=fast"], answeredAt: "2026-11-18T10:05:00+09:00" }), { answers, observed: applied });
  assert.deepEqual(next.answers.map((answer) => [answer.answerId, answer.state]), [["ans-1", "answered"], ["ans-2", "answered"]]);
  const built = ws.buildDraft({ draftId: "draft-1", targetRef: "sample-work", catalog: CATALOG, observedItems: applied.items, answers });
  assert.equal(built.status, "built");
  assert.equal(built.draft.answers[0].state, "answered");
  assert.equal(built.draft.items.find((item) => item.itemKey === "aidlc_version").answerRef, "ans-1");
});

test("T6.2m keep-absent（選ばなかった）の回答: 観測が変わっても、項目が missing（全出典が無い）なら一致を確認", () => {
  const present = commitWorld();
  const answers = keepAbsent(present);
  const gone = ABSENT();
  assert.equal(stateOf(COMMIT, gone), "missing");
  assert.equal(reconcile(answers, gone)[0].state, "answered");
  assert.equal(verdict(answers, COMMIT, gone), "match_confirmed");
});

test("T6.2m 項目の定義（catalog）が渡されない・項目が見つからない時は、先の判定を成立させず従来どおり invalidated（一致と読み替えない）", () => {
  const answers = versionAnswers("9.9.9");
  const applied = withVersion("9.9.9\n");
  assert.equal(ws.reconcileAnswers(answers, applied.items)[0].state, "invalidated");
  assert.equal(reconcile(answers, applied, [])[0].state, "invalidated");
  assert.equal(reconcile(answers, applied, [COMMIT])[0].state, "invalidated");
  assert.equal(verdict(answers, undefined, applied), "invalidated");
});

test("T6.2m 項目の定義が壊れていて評価が例外を起こしても、例外は外へ出ず、一致と読み替えず invalidated", () => {
  const answers = versionAnswers("9.9.9");
  const applied = withVersion("9.9.9\n");
  const broken = { itemKey: "aidlc_version", valueType: "version" };
  assert.equal(ws.closedMatches(answers[0], broken, applied.items), false);
  assert.doesNotThrow(() => reconcile(answers, applied, [broken]));
  assert.equal(reconcile(answers, applied, [broken])[0].state, "invalidated");
  assert.equal(ws.closedMatches(answers[0], VERSION, applied.items), true);
  assert.equal(ws.closedMatches(answers[0], VERSION, null), false);
});

test("T6.2n 観測 digest が変わり、再観測の値が回答と食い違う時は invalidated（reconcile も答えの言い方も）", () => {
  const answers = versionAnswers("9.9.9");
  const other = withVersion("8.8.8\n");
  assert.equal(stateOf(VERSION, other), "confirmed");
  assert.equal(reconcile(answers, other)[0].state, "invalidated");
  assert.equal(verdict(answers, VERSION, other), "invalidated");
  assert.equal(verdict(reconcile(answers, other), VERSION, other), "invalidated");
});

test("T6.2n 観測 digest が変わり、出典が読めなくなった（観測不能）時は invalidated。一致を確認と示さない", () => {
  const answers = versionAnswers("9.9.9");
  const unread = withoutSource("aidlc_version");
  assert.equal(stateOf(VERSION, unread), "unobservable");
  assert.equal(reconcile(answers, unread)[0].state, "invalidated");
  assert.equal(verdict(answers, VERSION, unread), "invalidated");
  assert.equal(reconcile(answers, observeWith(CATALOG, [])).at(0).state, "invalidated");
});

test("T6.2n keep-absent の回答で、観測が変わって値が現れた（missing でない）時は invalidated", () => {
  const answers = keepAbsent(ABSENT());
  const present = commitWorld();
  assert.equal(stateOf(COMMIT, present), "confirmed");
  assert.equal(reconcile(answers, present)[0].state, "invalidated");
  assert.equal(verdict(answers, COMMIT, present), "invalidated");
});

test("T6.2o 開いた形: 観測 digest が変われば、値を比べず invalidated。一致していても一致を確認と示さない（not_comparable にもしない）", () => {
  const answers = send(answerInput({ value: ["models.preset=thorough"] })).answers;
  const gone = withoutSource("aidlc_settings");
  assert.equal(reconcile(answers, gone)[0].state, "invalidated");
  assert.equal(verdict(answers, SETTINGS, gone), "invalidated");
  const classChanged = observeWith(CATALOG, withContent(goodReads(), "aidlc_settings", JSON.stringify({ "has space": "x y" })));
  assert.equal(stateOf(SETTINGS, classChanged), "invalid");
  assert.equal(reconcile(answers, classChanged)[0].state, "invalidated");
  assert.equal(verdict(answers, SETTINGS, classChanged), "invalidated");
});

test("T6.2o 開いた形: 観測 digest が変わらなければ answered のまま not_comparable。観測された開いた形の値はどの出力にも現れない", () => {
  const marker = "zeta-quasar-" + "7".repeat(5);
  const answers = send(answerInput({ value: ["models.preset=thorough"] })).answers;
  const sameClass = observeWith(CATALOG, withContent(goodReads(), "aidlc_settings", JSON.stringify({ models: { preset: marker } })));
  const settled = reconcile(answers, sameClass);
  assert.equal(settled[0].state, "answered");
  assert.equal(verdict(answers, SETTINGS, sameClass), "not_comparable");
  const shown = JSON.stringify([settled, verdict(answers, SETTINGS, sameClass), reconcile(answers, withoutSource("aidlc_settings"))]);
  assert.equal(shown.includes(marker), false);
});

const OTHER_STATES = [
  ["wrong_target", () => commitWorld(pinText(), callerText(), { namedTarget: "other-work" })],
  ["invalid", () => commitWorld(pinText(), callerText("main"))],
  ["conflict", () => commitWorld(pinText(), callerText(OID_B))],
  ["unobservable", () => withoutSource("workflow_caller")],
];

for (const [kind, build] of OTHER_STATES) {
  test(`T6.2p 値が一致する出典（sds_pin）のほかに ${kind} の出典があれば invalidated。一致を確認と示さない`, () => {
    const answers = commitAnswers(OID_A, commitWorld());
    const changed = build();
    assert.equal(stateOf(COMMIT, changed), kind);
    assert.equal(reconcile(answers, changed)[0].state, "invalidated");
    assert.equal(verdict(answers, COMMIT, changed), "invalidated");
    assert.equal(verdict(reconcile(answers, changed), COMMIT, changed), "invalidated");
  });
}

test("T6.2p 複数の出典が全部、回答と同じ新しい値になれば一致を確認。全部が別の値になれば invalidated", () => {
  const moved = commitWorld(pinText({ sds_commit: OID_B }), callerText(OID_B));
  assert.equal(stateOf(COMMIT, moved), "confirmed");
  const toB = commitAnswers(OID_B, commitWorld());
  assert.equal(reconcile(toB, moved)[0].state, "answered");
  assert.equal(verdict(toB, COMMIT, moved), "match_confirmed");
  const toA = commitAnswers(OID_A, commitWorld());
  assert.equal(reconcile(toA, moved)[0].state, "invalidated");
  assert.equal(verdict(toA, COMMIT, moved), "invalidated");
});

test("T6.2p 回答の時は読めなかった出典が、後から現れた時: 回答と同じ値なら一致を確認、食い違う値なら invalidated", () => {
  const before = withoutSource("workflow_caller");
  const answers = commitAnswers(OID_A, before);
  assert.equal(stateOf(COMMIT, before), "unobservable");
  const agrees = commitWorld();
  assert.equal(verdict(answers, COMMIT, agrees), "match_confirmed");
  const disagrees = commitWorld(pinText(), callerText(OID_B));
  assert.equal(reconcile(answers, disagrees)[0].state, "invalidated");
  assert.equal(verdict(answers, COMMIT, disagrees), "invalidated");
});
