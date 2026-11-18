// U2 回答の結びと状態の言い方（LC5。BR6.1〜BR6.4）。回答は回答した時点の項目の観測 digest と結び、観測が変われば invalidated にする。
// 答えただけで「設定完了」と言わず、閉じた形だけ実際の設定と一致・不一致を示す。開いた形は「比べられず観測できず」（決定 120）。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { LATER, OID_A, fileRead, goodReads } from "./working-state-fixtures.mjs";
import { CATALOG, T2, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";

const VERSION = CATALOG[0];
const SETTINGS = CATALOG[2];
const answered = (over, options) => send(answerInput(over), options).answers;
const versionAnswer = (value = "3.0.0", options) => answered({ itemKey: "aidlc_version", value }, options);
const status = (answers, entry, observed, reobserved = true) => ws.answerStatusOf({ answer: answers[0], entry, observedItems: observed.items, reobserved });

test("T6.2+ 観測が変わらない再観測（時刻・予算だけが違う）では、回答は answered のまま。入力は書き換えず新しい配列を返す", () => {
  const answers = versionAnswer();
  const later = observeWith(CATALOG, goodReads().map((read) => ({ ...read, observedAt: LATER })));
  const before = JSON.stringify(answers);
  const result = ws.reconcileAnswers(answers, later.items);
  assert.equal(result[0].state, "answered");
  assert.equal(JSON.stringify(answers), before);
  assert.equal(Object.isFrozen(result), true);
});

test("T6.2+ 結びの先の項目の観測が変わると invalidated になり、ほかの項目の回答は保持される", () => {
  const first = send(answerInput({ itemKey: "aidlc_version", value: "3.0.0" }));
  const both = send(answerInput({ answerId: "ans-2", value: ["models.preset=fast"], answeredAt: T2 }), { answers: first.answers });
  const changed = observeWith(CATALOG, withContent(goodReads(), "aidlc_version", "9.9.9\n"));
  const result = ws.reconcileAnswers(both.answers, changed.items);
  assert.deepEqual(result.map((answer) => [answer.answerId, answer.state]), [["ans-1", "invalidated"], ["ans-2", "answered"]]);
  assert.equal(ws.evaluateItem(VERSION, changed.items).state, "confirmed");
});

test("T6.2+ 項目の出典が取れなくなる（observed → unavailable）・項目が現れなくなる、でも invalidated", () => {
  const answers = versionAnswer();
  const gone = observeWith(CATALOG, goodReads().filter((read) => read.sourceKind !== "aidlc_version"));
  assert.equal(ws.reconcileAnswers(answers, gone.items)[0].state, "invalidated");
  assert.equal(ws.reconcileAnswers(answers, [])[0].state, "invalidated");
});

test("T6.2+ invalidated・rejected の回答はそのまま（状態を戻さない）。再び結び直すのは新しい回答だけ", () => {
  const first = send(answerInput({ itemKey: "aidlc_version", value: "3.0.0" }));
  const changed = observeWith(CATALOG, withContent(goodReads(), "aidlc_version", "9.9.9\n"));
  const invalid = ws.reconcileAnswers(first.answers, changed.items);
  const back = ws.reconcileAnswers(invalid, observeWith().items);
  assert.equal(back[0].state, "invalidated");
  const bad = send(answerInput({ answerId: "ans-2", value: "x" })).answers;
  assert.equal(ws.reconcileAnswers(bad, observeWith().items)[0].state, "rejected");
});

test("T6.2o 開いた形: 分類の変化（有効 → invalid_format）は検出して invalidated。同じ分類の中の中身だけの変化は検出しない（決定 120 の限り）", () => {
  const answers = answered({ value: ["models.preset=thorough"] });
  const sameClass = observeWith(CATALOG, withContent(goodReads(), "aidlc_settings", JSON.stringify({ models: { preset: "balanced" } })));
  assert.equal(ws.reconcileAnswers(answers, sameClass.items)[0].state, "answered");
  const classChanged = observeWith(CATALOG, withContent(goodReads(), "aidlc_settings", JSON.stringify({ "has space": "x y" })));
  assert.equal(ws.reconcileAnswers(answers, classChanged.items)[0].state, "invalidated");
  assert.equal(ws.evaluateItem(SETTINGS, classChanged.items).state, "invalid");
});

test("T6.3 答えただけでは「回答済み・未適用」。再観測しない限り一致も完了も示さない。適用済みの語を作らない", () => {
  const answers = versionAnswer("2.11.1");
  const result = status(answers, VERSION, observeWith(), false);
  assert.equal(result, "answered_unapplied");
  assert.equal(ws.ANSWER_STATUSES.includes("applied"), false);
  assert.equal(ws.ANSWER_STATUSES.some((name) => /^applied|complete|done/.test(name)), false);
  assert.equal(Object.isFrozen(ws.ANSWER_STATUSES), true);
});

test("T6.4+ 閉じた形: 再観測で実際の設定が回答と一致なら match_confirmed、違えば mismatch、読めなければ unobservable", () => {
  assert.equal(status(versionAnswer("2.11.1"), VERSION, observeWith()), "match_confirmed");
  assert.equal(status(versionAnswer("02.011.1"), VERSION, observeWith()), "match_confirmed");
  assert.equal(status(versionAnswer("3.0.0"), VERSION, observeWith()), "mismatch");
  const unread = observeWith(CATALOG, goodReads().filter((read) => read.sourceKind !== "aidlc_version"));
  assert.equal(status(versionAnswer("3.0.0", { observed: unread }), VERSION, unread), "unobservable");
  const wrongTarget = observeWith(CATALOG, withContent(goodReads(), "aidlc_version", "2.11.1\n", { namedTarget: "other-work" }));
  assert.equal(status(versionAnswer("2.11.1", { observed: wrongTarget }), VERSION, wrongTarget), "unobservable");
});

test("T6.4- 観測の digest が変わり、値が回答と一致しない回答は invalidated（一致する時は T6.2m で一致を確認）。invalidated・rejected はそのまま示す", () => {
  const answers = versionAnswer("9.9.9");
  const changed = observeWith(CATALOG, withContent(goodReads(), "aidlc_version", "8.8.8\n"));
  assert.equal(status(answers, VERSION, changed), "invalidated");
  assert.equal(status(ws.reconcileAnswers(answers, changed.items), VERSION, changed), "invalidated");
  const rejected = send(answerInput({ value: "x" })).answers;
  assert.equal(status(rejected, SETTINGS, observeWith()), "rejected");
});

test("T6.4o 開いた形は観測値を持たないので比べられない: 一致していても、中身だけを変えた再観測でも not_comparable（match_confirmed にしない）", () => {
  const answers = answered({ value: ["models.preset=thorough", "schemaVersion=1", "models.schemaVersion=1"] });
  assert.equal(status(answers, SETTINGS, observeWith()), "not_comparable");
  const sameClass = observeWith(CATALOG, withContent(goodReads(), "aidlc_settings", JSON.stringify({ models: { preset: "balanced" } })));
  assert.equal(status(answers, SETTINGS, sameClass), "not_comparable");
  assert.equal(status(answers, SETTINGS, observeWith(), false), "answered_unapplied");
  const seen = [observeWith(), sameClass].map((observed) => status(answers, SETTINGS, observed));
  assert.deepEqual(seen, ["not_comparable", "not_comparable"]);
});

test("T6.4 選ばなかった（keep-absent）の回答: 実際の設定が全部「無い」なら match_confirmed、それ以外は mismatch、読めなければ unobservable", () => {
  const absentPin = JSON.stringify({ schema: "sds-pin/1" });
  const noCaller = "name: sample\njobs: {}\n";
  const allAbsent = observeWith(CATALOG, withContent(withContent(goodReads(), "sds_pin", absentPin), "workflow_caller", noCaller));
  const base = { answerId: "ans-1", itemKey: "sds_commit", kind: "keep-absent", state: "answered", answeredAt: T2, selectedCandidateRef: "sds_commit@sds_pin:.shirube/sds-pin.json" };
  const bind = (observed) => ({ ...base, boundObservationDigest: ws.itemObservationDigestOf("sds_commit", ws.factsOf(observed.items)) });
  const run = (answer, observed) => ws.answerStatusOf({ answer, entry: CATALOG[1], observedItems: observed.items, reobserved: true });
  assert.equal(run(bind(allAbsent), allAbsent), "match_confirmed");
  const present = observeWith();
  assert.equal(run(bind(present), present), "mismatch");
  const unread = observeWith(CATALOG, goodReads().filter((read) => read.sourceKind !== "sds_pin"));
  assert.equal(run(bind(unread), unread), "unobservable");
});

test("T6.4 読めない入力・項目の定義が無い時は、一致と示さず unobservable（失敗側）", () => {
  const answers = versionAnswer("2.11.1");
  assert.equal(ws.answerStatusOf({ answer: answers[0], entry: undefined, observedItems: observeWith().items, reobserved: true }), "unobservable");
  assert.equal(ws.answerStatusOf({ answer: null, entry: VERSION, observedItems: observeWith().items, reobserved: true }), "unobservable");
  assert.equal(ws.answerStatusOf({ answer: { ...answers[0], state: "weird" }, entry: VERSION, observedItems: observeWith().items, reobserved: true }), "unobservable");
  assert.equal(ws.answerStatusOf({ answer: answers[0], entry: VERSION, observedItems: null, reobserved: true }), "unobservable");
});

test("T5.1- 読むと例外を起こす入力（欄の取得で例外）は unreadable。例外は外へ出ず、入力も結果に出ない", () => {
  const marker = "gh" + "p_" + "t".repeat(12);
  const hostile = { get answerId() { throw new Error(marker); } };
  let result;
  assert.doesNotThrow(() => { result = send(hostile); });
  assert.deepEqual([result.status, result.answer], ["unreadable", null]);
  assert.equal(JSON.stringify(result).includes(marker), false);
});

test("T6.1 回答・draft・選択は対話の間だけ: 回答の部品は file・子 process・network・時計・乱数・環境変数に触れず、何も保存しない", () => {
  for (const file of ["answers.mjs", "answer-status.mjs", "observation-facts.mjs"]) {
    const source = readFileSync(new URL(`../scripts/working-state/${file}`, import.meta.url), "utf8");
    for (const banned of [/node:fs/, /node:child_process/, /node:net|node:http|fetch\(/, /Date\.now|new Date\(\)/, /Math\.random|randomUUID/, /process\.env/]) assert.equal(banned.test(source), false, `${file}: ${banned}`);
  }
  const first = send(answerInput());
  assert.equal(JSON.stringify(first.answers).length > 0, true);
  const fresh = send(answerInput({ answerId: "ans-2", value: ["models.preset=fast"], answeredAt: T2 }));
  assert.deepEqual(fresh.answers.map((answer) => answer.answerId), ["ans-2"]);
});

test("T6.2 項目の回答がほかの項目の観測の変化で無効にならない（結びは項目ごと）", () => {
  const answers = versionAnswer();
  const otherChanged = observeWith(CATALOG, [...goodReads().filter((read) => read.sourceKind !== "sds_pin"), fileRead("sds_pin", JSON.stringify({ schema: "sds-pin/1", sds_commit: OID_A, kit_version: "7.0.0", protected_paths: ["a"] }))]);
  assert.equal(ws.reconcileAnswers(answers, otherChanged.items)[0].state, "answered");
});
