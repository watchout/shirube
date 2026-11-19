// U2 回答の列の整合（reconcileAnswers）で、読めない回答の扱い（G-2(a)）。読めない回答はその 1 件だけを、位置で示す無効（invalidated）の回答に置き換え、
// 列は返す（空の列にしない）。置き換えた件は、門を通らなかった値も項目名も識別も写さない（位置の名前は、項目名の形に合わない）。新しい状態・理由の符号は作らない。
// receiveAnswer の入口の門（今までの回答の列に読めない件があれば unreadable）と、draft の入口（invalid_input）は変わらない。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { CATALOG, T2, answerInput, observeWith, send } from "./working-state-answer-fixtures.mjs";
import { buildInput } from "./working-state-draft-fixtures.mjs";

const LEAK = "k3j9x0q2m7v1z8w4n6b5c3d2f1g0h9j8k7l6m5n4b3v2c1x0z9a8s7d6f5g4h3j2";
const ITEM_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const observed = observeWith();
const good = send(answerInput({ answerId: "ans-1", itemKey: "aidlc_version", value: "3.0.0" })).answers[0];
const second = send(answerInput({ answerId: "ans-2", itemKey: "sds_commit", value: "0".repeat(40), answeredAt: T2 })).answers[0];
const reconcile = (answers) => ws.reconcileAnswers(answers, observed.items, CATALOG);
const placeholderAt = (position) => ({ answerId: `answer-position-${position}`, itemKey: `answer-position-${position}`, state: "invalidated" });

const BAD = {
  itemKey: { ...good, itemKey: LEAK },
  value: { ...good, value: LEAK },
  answerId: { ...good, answerId: LEAK },
  selectedCandidateRef: { ...good, selectedCandidateRef: LEAK },
  answeredAt: { ...good, answeredAt: LEAK },
  kind: { ...good, kind: LEAK },
  state: { ...good, state: LEAK },
  rejectionReason: { ...good, rejectionReason: LEAK },
  valueDigest: { ...good, valueDigest: LEAK },
  boundObservationDigest: { ...good, boundObservationDigest: LEAK },
  extraKey: { ...good, [LEAK]: 1 },
  nestedValue: { ...good, value: [["x", LEAK]] },
  notObject: LEAK,
  nullEntry: null,
  arrayEntry: [LEAK],
  getter: { ...good, get itemKey() { throw new Error(LEAK); } },
};

test("T6.2q 読めない回答は、その 1 件だけが位置で示す invalidated になり、ほかの件はそのまま。列は返る（空の列にしない）", () => {
  for (const [name, bad] of Object.entries(BAD)) {
    const result = reconcile([good, bad, second]);
    assert.equal(result.length, 3, name);
    assert.deepEqual(result[1], placeholderAt(1), name);
    assert.equal(result[0].state, "answered", name);
    assert.equal(result[2].state, "answered", name);
    assert.equal(result[0].answerId, "ans-1", name);
    assert.equal(result[2].answerId, "ans-2", name);
  }
});

test("T6.2q 読めない回答の置き換えは、門を通らなかった値・項目名・識別・欄の名前のどれも結果へ写さない", () => {
  for (const [name, bad] of Object.entries(BAD)) {
    assert.equal(JSON.stringify(reconcile([bad])).includes(LEAK), false, name);
    assert.equal(JSON.stringify(reconcile([good, bad, bad])).includes(LEAK), false, name);
  }
});

test("T6.2q 置き換えは位置の名前だけを持ち（answerId・itemKey・state の 3 つ）、項目名の形に合わず、新しい状態・理由の符号を作らない", () => {
  const result = reconcile([BAD.itemKey, BAD.value, BAD.notObject]);
  for (const [position, entry] of result.entries()) {
    assert.deepEqual(Object.keys(entry).sort(), ["answerId", "itemKey", "state"], String(position));
    assert.equal(ITEM_NAME.test(entry.itemKey), false, entry.itemKey);
    assert.equal(CATALOG.some((item) => item.itemKey === entry.itemKey), false, entry.itemKey);
    assert.equal(ws.REJECTION_REASONS.includes(entry.state), false);
    assert.equal(entry.state, "invalidated");
  }
  assert.deepEqual(result.map((entry) => entry.itemKey), ["answer-position-0", "answer-position-1", "answer-position-2"]);
  assert.equal(Object.isFrozen(result) && Object.isFrozen(result[0]), true);
});

test("T6.2q 置き換えた件は有効な回答ではなく、wire の answers にも状態の確認にも現れない（answered でないので）", () => {
  const result = reconcile([BAD.value]);
  assert.equal(result.filter((entry) => entry.state === "answered").length, 0);
});

test("T6.2q 入口の門は変わらない: 読めない件を含む今までの回答の列は、receiveAnswer では unreadable（answers は []）、draft では invalid_input", () => {
  for (const [name, bad] of Object.entries(BAD)) {
    const received = send(answerInput({ answerId: "ans-9", itemKey: "aidlc_version", value: "3.0.0", answeredAt: T2 }), { answers: [good, bad] });
    assert.deepEqual([received.status, received.answers], ["unreadable", []], name);
    const built = ws.buildDraft(buildInput({ answers: [good, bad] }));
    assert.deepEqual([built.status, built.reason], ["refused", "invalid_input"], name);
    assert.equal(JSON.stringify([received, built]).includes(LEAK), false, name);
  }
});

test("T6.2q 置き換えた列を、入口の門へ戻しても読めない（位置の名前は項目一覧に無い）。呼出側は自分の列を持ち続ける", () => {
  const result = reconcile([good, BAD.value]);
  const received = send(answerInput({ answerId: "ans-9", itemKey: "aidlc_version", value: "3.0.0", answeredAt: T2 }), { answers: result });
  assert.deepEqual([received.status, received.answers], ["unreadable", []]);
});
