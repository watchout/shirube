// U2 回答の受付（LC5。BR5.1〜BR5.4）。回答はデータとして受け、型・長さ・文字・path の境界を検査する。
// 秘密らしい入力は保持せず、値も digest も理由への写しも残さない。回答ごとに独立で、二重の送信は 1 件のまま、「最新」は呼出側の answeredAt。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, OID_B, fileRead, goodReads, pinText } from "./working-state-fixtures.mjs";
import { CATALOG, T1, T2, T3, answerInput, observeWith, send, stateOf, withContent } from "./working-state-answer-fixtures.mjs";

const TOKEN = "gh" + "p_" + "s".repeat(12);
// sds_commit だけ、利用者が答えられない項目（初期の項目一覧の実物）にした一覧。
const PLAIN_COMMIT_CATALOG = CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? ws.findItem("sds_commit") : entry));

test("T5.1+ 許される形式の回答は answered。値は正規化して持ち、観測 digest と結ぶ。入力は書き換えず、結果は凍結される", () => {
  const input = answerInput();
  const before = JSON.stringify(input);
  const result = send(input);
  assert.equal(result.status, "recorded");
  const [answer] = result.answers;
  assert.deepEqual(
    { ...answer, boundObservationDigest: undefined },
    { answerId: "ans-1", itemKey: "aidlc_settings", kind: "value", value: ["models.preset=thorough"], valueDigest: ws.digestOf(["models.preset=thorough"]), boundObservationDigest: undefined, state: "answered", answeredAt: T1 },
  );
  assert.equal(answer.boundObservationDigest, ws.itemObservationDigestOf("aidlc_settings", ws.factsOf(observeWith().items)));
  assert.equal(JSON.stringify(input), before);
  assert.equal(Object.isFrozen(result) && Object.isFrozen(result.answers) && Object.isFrozen(answer.value), true);
  assert.notEqual(answer.value, input.value);
});

test("T5.1+ 閉じた形の回答は正規化（版は数字の 0 埋めを外す）して digest にする。観測の digest と同じ作り方", () => {
  const result = send(answerInput({ itemKey: "aidlc_version", value: "02.011.1" }));
  assert.equal(result.answers[0].value, "2.11.1");
  assert.equal(result.answers[0].valueDigest, ws.digestOf("2.11.1"));
});

test("T5.1- 型・長さ・文字・形・path の不正は rejected（固定の分類）。値も valueDigest も理由への入力の写しも持たない", () => {
  const cases = [
    [{ value: "models.preset=thorough" }, "invalid_type"],
    [{ value: Array.from({ length: 65 }, (_, i) => `k${i}=v`) }, "too_long"],
    [{ value: ["models.preset=has space"] }, "invalid_character"],
    [{ value: ["Bad=1"] }, "invalid_format"],
    [{ itemKey: "note_text", value: "../escape" }, "out_of_boundary"],
    [{ itemKey: "sds_commit", value: OID_A }, "out_of_boundary"],
    [{ kind: "replace" }, "invalid_type"],
  ];
  for (const [over, reason] of cases) {
    const result = send(answerInput(over), { catalog: PLAIN_COMMIT_CATALOG });
    const [answer] = result.answers;
    assert.deepEqual([result.status, answer.state, answer.rejectionReason], ["rejected", "rejected", reason], JSON.stringify(over).slice(0, 40));
    for (const key of ["value", "valueDigest", "selectedCandidateRef"]) assert.equal(key in answer, false, key);
    assert.equal(JSON.stringify(result).includes("escape"), false);
  }
  assert.equal("kind" in send(answerInput({ kind: "replace" })).answers[0], false);
});

test("T5.2+ 秘密らしい回答は rejected = secret_like。value も valueDigest も持たず、結果のどこにも入力の一部・digest が現れない", () => {
  for (const value of [[`${TOKEN}=1`], [TOKEN], ["a=b", "-----BEGIN " + "PRIVATE KEY-----"]]) {
    const result = send(answerInput({ value }));
    const [answer] = result.answers;
    assert.deepEqual([answer.state, answer.rejectionReason, "value" in answer, "valueDigest" in answer], ["rejected", "secret_like", false, false]);
    const text = JSON.stringify(result);
    for (const trace of [TOKEN, TOKEN.slice(0, 8), ws.digestOf(value), "PRIVATE"]) assert.equal(text.includes(trace), false, trace);
  }
  const run = send(answerInput({ itemKey: "note_text", value: "x".repeat(30) })).answers[0];
  assert.deepEqual([run.state, run.rejectionReason], ["rejected", "secret_like"]);
});

test("T5.2- 判定できない入力（例外を起こす入力）は secret_like で、例外は外へ出ず入力も出ない", () => {
  const hostile = new Proxy([], { get() { throw new Error(TOKEN); }, getPrototypeOf() { throw new Error(TOKEN); } });
  let result;
  assert.doesNotThrow(() => { result = send(answerInput({ value: hostile })); });
  assert.deepEqual([result.answers[0].state, result.answers[0].rejectionReason], ["rejected", "secret_like"]);
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test("T5.1- 読めない入力（回答の識別・項目の名前・時刻が使えない）は回答として保持しない（unreadable）。入力は結果に写らない", () => {
  const prior = send(answerInput()).answers;
  const bad = [{ answerId: `${TOKEN} x` }, { answerId: "" }, { answerId: 5 }, { itemKey: "no_such_item" }, { itemKey: TOKEN }, { answeredAt: "yesterday" }, { answeredAt: undefined }];
  for (const over of bad) {
    const result = send(answerInput(over), { answers: prior });
    assert.deepEqual([result.status, result.answer, result.answers.length], ["unreadable", null, 1], JSON.stringify(over).slice(0, 30));
    assert.equal(JSON.stringify(result).includes(TOKEN), false);
  }
  for (const input of [null, undefined, "text", 7]) assert.equal(send(input).status, "unreadable");
});

test("T5.3 回答ごとに独立: 1 件が rejected でも他の answered はそのまま。不足は残った項目として示せる", () => {
  const first = send(answerInput());
  const second = send(answerInput({ answerId: "ans-2", itemKey: "aidlc_version", value: "3.0.0", answeredAt: T2 }), { answers: first.answers });
  const third = send(answerInput({ answerId: "ans-3", itemKey: "note_text", value: TOKEN, answeredAt: T3 }), { answers: second.answers });
  assert.deepEqual(third.answers.map((answer) => [answer.answerId, answer.state]), [["ans-1", "answered"], ["ans-2", "answered"], ["ans-3", "rejected"]]);
  assert.deepEqual(third.answers.slice(0, 2), second.answers);
});

test("T5.4 同じ (項目, 値) の二重の送信は 1 件のまま。既存の answerId を返し、別の answerId で来ても増えない", () => {
  const first = send(answerInput());
  const again = send(answerInput({ answerId: "ans-9", answeredAt: T3 }), { answers: first.answers });
  assert.deepEqual([again.status, again.answer.answerId, again.answers.length], ["duplicate", "ans-1", 1]);
  const sameId = send(answerInput({ value: ["models.preset=fast"] }), { answers: first.answers });
  assert.deepEqual([sameId.status, sameId.answer.answerId, sameId.answers.length], ["duplicate", "ans-1", 1]);
});

test("T5.4 同じ項目の別の値は answeredAt が新しい方が有効。前は invalidated。届いた順では決めない", () => {
  const old = send(answerInput({ value: ["models.preset=thorough"], answeredAt: T1 }));
  const newer = send(answerInput({ answerId: "ans-2", value: ["models.preset=fast"], answeredAt: T2 }), { answers: old.answers });
  assert.deepEqual(newer.answers.map((answer) => [answer.answerId, answer.state]), [["ans-1", "invalidated"], ["ans-2", "answered"]]);
  const late = send(answerInput({ answerId: "ans-3", value: ["models.preset=balanced"], answeredAt: T1 }), { answers: newer.answers });
  assert.equal(late.status, "rejected");
  assert.deepEqual([late.answer.state, late.answer.rejectionReason, "value" in late.answer], ["rejected", "stale_answer", false]);
  assert.equal(late.answers.filter((answer) => answer.state === "answered").length, 1);
  assert.equal(stateOf(late, "ans-2"), "answered");
});

test("T5.4 answeredAt が同じで値が違う時は、既存を保ち、新しい方を曖昧として rejected = duplicate_conflict にする", () => {
  const first = send(answerInput({ answeredAt: T2 }));
  const clash = send(answerInput({ answerId: "ans-2", value: ["models.preset=fast"], answeredAt: T2 }), { answers: first.answers });
  assert.deepEqual([clash.answer.state, clash.answer.rejectionReason, stateOf(clash, "ans-1")], ["rejected", "duplicate_conflict", "answered"]);
});

test("T5.4 時刻の比べ方は時刻としての新旧（表記が違っても同じ時刻は同じ）", () => {
  const first = send(answerInput({ answeredAt: "2026-11-18T10:00:00+09:00" }));
  const same = send(answerInput({ answerId: "ans-2", value: ["models.preset=fast"], answeredAt: "2026-11-18T01:00:00Z" }), { answers: first.answers });
  assert.equal(same.answer.rejectionReason, "duplicate_conflict");
});

test("T5.4 選択の回答（choose-source）: 値のある候補は値の回答、無い候補は keep-absent。同じ候補の再送は 1 件", () => {
  const reads = [...goodReads().filter((read) => read.sourceKind !== "sds_pin"), fileRead("sds_pin", pinText({ sds_commit: OID_B }))];
  const observed = observeWith(CATALOG, reads);
  const item = ws.evaluateItem(CATALOG[1], observed.items);
  assert.equal(item.state, "conflict");
  const [fromPin, fromCaller] = item.candidates.map((candidate) => candidate.candidateRef);
  const chosen = send(answerInput({ itemKey: "sds_commit", value: undefined, selectedCandidateRef: fromPin }), { observed });
  assert.deepEqual([chosen.answers[0].kind, chosen.answers[0].value, chosen.answers[0].valueDigest, chosen.answers[0].selectedCandidateRef], ["value", OID_B, ws.digestOf(OID_B), fromPin]);
  const again = send(answerInput({ answerId: "ans-2", itemKey: "sds_commit", selectedCandidateRef: fromPin, answeredAt: T3 }), { observed, answers: chosen.answers });
  assert.deepEqual([again.status, again.answers.length], ["duplicate", 1]);
  const absentReads = [...goodReads().filter((read) => read.sourceKind !== "sds_pin"), fileRead("sds_pin", JSON.stringify({ schema: "sds-pin/1" }))];
  const absentObserved = observeWith(CATALOG, absentReads);
  const absentItem = ws.evaluateItem(CATALOG[1], absentObserved.items);
  const absentRef = absentItem.candidates.find((candidate) => candidate.presence === "absent").candidateRef;
  const keep = send(answerInput({ itemKey: "sds_commit", kind: "keep-absent", value: undefined, selectedCandidateRef: absentRef }), { observed: absentObserved });
  assert.deepEqual([keep.answers[0].kind, keep.answers[0].state, "value" in keep.answers[0], "valueDigest" in keep.answers[0]], ["keep-absent", "answered", false, false]);
  const keepAgain = send(answerInput({ answerId: "ans-4", itemKey: "sds_commit", kind: "keep-absent", selectedCandidateRef: absentRef }), { observed: absentObserved, answers: keep.answers });
  assert.deepEqual([keepAgain.status, keepAgain.answers.length], ["duplicate", 1]);
  assert.notEqual(fromCaller, fromPin);
});

test("T5.1- 選択の回答の不正: 候補が見つからない・値のない候補で value・開いた形の項目の選択は rejected = invalid_format", () => {
  const observed = observeWith(CATALOG, [...goodReads().filter((read) => read.sourceKind !== "sds_pin"), fileRead("sds_pin", pinText({ sds_commit: OID_B }))]);
  const missing = send(answerInput({ itemKey: "sds_commit", value: undefined, selectedCandidateRef: "sds_commit@sds_pin:no-such" }), { observed });
  assert.deepEqual([missing.answers[0].state, missing.answers[0].rejectionReason], ["rejected", "invalid_format"]);
  const keepNoRef = send(answerInput({ itemKey: "sds_commit", kind: "keep-absent", value: undefined }), { observed });
  assert.equal(keepNoRef.answers[0].rejectionReason, "invalid_format");
  const open = send(answerInput({ selectedCandidateRef: "aidlc_settings@aidlc_settings:aidlc.settings.json" }));
  assert.equal(open.answers[0].rejectionReason, "invalid_format");
  assert.equal(JSON.stringify(missing).includes("no-such"), false);
});

test("T5.1 回答の識別と時刻は呼出側が渡す（核が作らない）。同じ入力は同じ結果になる", () => {
  const a = send(answerInput());
  const b = send(answerInput());
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a.answers).includes("ans-1"), true);
});

test("T5.4 古い observedItems（項目の観測が取り替わった後）に結んだ回答は、受付の時点で invalidated にそろえてから処理する", () => {
  const first = send(answerInput());
  const changed = observeWith(CATALOG, withContent(goodReads(), "aidlc_settings", JSON.stringify({ "has space": "x y" })));
  const next = send(answerInput({ answerId: "ans-2", itemKey: "aidlc_version", value: "3.0.0", answeredAt: T2 }), { answers: first.answers, observed: changed });
  assert.deepEqual(next.answers.map((answer) => [answer.answerId, answer.state]), [["ans-1", "invalidated"], ["ans-2", "answered"]]);
});
