// 呼出側が手で作った入力の「読み直し」（確かめた後に getter が別の値を返す）が、wire・案内の写しの出口へ届かないことを確かめる（F3）。
// 方針: 出口へ渡す物は、入力を 1 回だけ写し（structuredClone）、その写しに門・検査を当て、写しから出す。確かめた後に元を読み直さない。
// 試験: 先頭の okReads 回は無害な値、その後は秘密らしい値を返す getter を、値・列の要素・案内の文に置く。出口に LEAK が現れてはならない（断るか、安全な写しを返す）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { answerInput, send } from "./working-state-answer-fixtures.mjs";
import { builtDraft, conflictObserved, createSelection, createdSelection, guidanceOf } from "./working-state-draft-fixtures.mjs";

const LEAK = "k3j9x0q2m7v1z8w4n6b5c3d2f1g0h9j8k7l6m5n4b3v2c1x0z9a8s7d6f5g4h3j2";
const READS = [1, 2, 3, 4, 5, 6, 7, 8];

// 先頭の okReads 回は ok、その後は LEAK を返す読み出しの関数。
const flipping = (ok, okReads) => {
  let reads = 0;
  return () => {
    reads += 1;
    return reads <= okReads ? ok : LEAK;
  };
};
const withGetter = (object, key, ok, okReads) => Object.defineProperty(object, key, { enumerable: true, configurable: true, get: flipping(ok, okReads) });
const answeredOf = (extra) => ({ ...send(answerInput({ answerId: "ans-1", itemKey: "aidlc_version", value: "3.0.0" })).answers[0], ...extra });
const noLeak = (result, label) => assert.equal(JSON.stringify(result).includes(LEAK), false, label);

test("T8.5+ 再読: 回答の値の getter が、確かめた後に別の値を返しても、wire に届かない（断るか、最初に読んだ安全な値の写し）", () => {
  for (const okReads of READS) {
    const answer = withGetter({ ...answeredOf() }, "value", "3.0.0", okReads);
    const result = ws.draftToC02Wire({ ...builtDraft(), answers: [answer] });
    noLeak(result, `value okReads=${okReads}`);
    if (result.status === "converted") assert.equal(result.wire.answers.aidlc_version.value, "3.0.0", `okReads=${okReads}`);
  }
});

test("T8.5+ 再読: 開いた形の回答の列の要素の getter も同じ（列を 1 回だけ写して確かめ、写しから出す）", () => {
  for (const okReads of READS) {
    const list = withGetter(["models.preset=thorough"], "0", "models.preset=thorough", okReads);
    const answer = answeredOf({ itemKey: "aidlc_settings", answerId: "ans-open", value: list });
    const result = ws.draftToC02Wire({ ...builtDraft(), answers: [answer] });
    noLeak(result, `element okReads=${okReads}`);
    if (result.status === "converted") assert.deepEqual(result.wire.answers.aidlc_settings.value, ["models.preset=thorough"], `okReads=${okReads}`);
  }
});

test("T8.5+ 再読: 回答の他の欄（answerId・kind・itemKey）の getter も、確かめた後に別の値を返しても wire に届かない", () => {
  for (const key of ["answerId", "itemKey", "kind", "selectedCandidateRef"]) {
    for (const okReads of READS) {
      const answer = withGetter({ ...answeredOf() }, key, key === "kind" ? "value" : key === "itemKey" ? "aidlc_version" : "ans-1", okReads);
      noLeak(ws.draftToC02Wire({ ...builtDraft(), answers: [answer] }), `${key} okReads=${okReads}`);
    }
  }
});

test("T8.5+ 再読: 選択の案内の文（guidance.text）の getter が、確かめた後に別の値を返しても、wire に届かない", () => {
  const selection = createdSelection(builtDraft({ observedItems: conflictObserved().items }));
  for (const okReads of READS) {
    const guidance = withGetter({ ...selection.guidance }, "text", "結論と次の操作を平文で示す案内の文", okReads);
    const result = ws.selectionToC02Wire({ ...selection, guidance });
    noLeak(result, `text okReads=${okReads}`);
    if (result.status === "converted") assert.equal(result.wire.guidance, "結論と次の操作を平文で示す案内の文", `okReads=${okReads}`);
  }
  for (const okReads of READS) {
    const inherited = Object.create(withGetter({}, "text", "結論と次の操作を平文で示す案内の文", okReads)); // 自分の欄ではなく、元の object から継ぐ getter
    const result = ws.selectionToC02Wire({ ...selection, guidance: inherited });
    noLeak(result, `inherited text okReads=${okReads}`);
    if (result.status === "converted") assert.equal(result.wire.guidance, "結論と次の操作を平文で示す案内の文", `inherited okReads=${okReads}`);
  }
});

test("T8.5+ 再読: 選択の識別・参照の getter も同じ（selectionId・draftRef・candidateRef・targetRef・observationRef）", () => {
  const selection = createdSelection(builtDraft({ observedItems: conflictObserved().items }));
  for (const key of ["selectionId", "draftRef", "candidateRef", "targetRef", "observationRef"]) {
    for (const okReads of READS) {
      const hostile = withGetter({ ...selection }, key, selection[key], okReads);
      noLeak(ws.selectionToC02Wire(hostile), `${key} okReads=${okReads}`);
    }
  }
});

test("T8.5+ 再読: draft の識別・参照・列の getter も同じ（draftId・targetRef・missingItems・conflicts・observationRefs）", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  for (const key of ["draftId", "targetRef", "missingItems", "conflicts", "observationRefs"]) {
    for (const okReads of READS) {
      const hostile = withGetter({ ...draft }, key, draft[key], okReads);
      noLeak(ws.draftToC02Wire(hostile), `${key} okReads=${okReads}`);
    }
  }
});

const COPY_OK = { conclusion: "結論の文です。", text: "案内の文です。" };
test("S10+ 再読: 案内の写し（guidanceCopyOf）は、確かめた後に getter が別の値を返しても、その値を写さない（null か、最初に読んだ安全な値の写し）", () => {
  const holders = {
    text: (okReads) => withGetter({ ...COPY_OK }, "text", COPY_OK.text, okReads),
    conclusion: (okReads) => withGetter({ ...COPY_OK }, "conclusion", COPY_OK.conclusion, okReads),
    targetRef: (okReads) => withGetter({ ...COPY_OK }, "targetRef", "sample-work", okReads),
    nextActionText: (okReads) => ({ ...COPY_OK, nextAction: withGetter({ kind: "none" }, "text", "次の操作の文です。", okReads) }),
    unconfirmedElement: (okReads) => ({ ...COPY_OK, unconfirmed: withGetter(["aidlc_version"], "0", "aidlc_version", okReads) }),
  };
  for (const [name, make] of Object.entries(holders)) {
    for (const okReads of READS) {
      const copy = ws.guidanceCopyOf(make(okReads));
      noLeak(copy, `${name} okReads=${okReads}`);
    }
  }
});

test("S10+ 再読: 選択の作成（createSelection）に渡した案内の getter も、選択に写る文は最初に読んだ安全な値か、断る", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  for (const okReads of READS) {
    const guidance = withGetter(guidanceOf(), "text", guidanceOf().text, okReads);
    const result = createSelection(draft, { guidance });
    noLeak(result, `createSelection okReads=${okReads}`);
  }
});
