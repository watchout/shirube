// U2 出口の項目 × BR5.2 の (a)〜(e) の全部の組（code-summary「出口の項目 × BR5.2 の表」の 1 行 = 1 つの試験 M1〜M19）。
// 各試験は 5 つの列（a 秘密鍵の見出し・b 接頭辞・c Bearer・d JWT・e 20 文字以上の連なり）に同じ入力の作り方を当て、
// 当てる列は拒まれるか写らないこと、当てない列（意図した限界）はその場面の通常の入力として通ることを、その場で示す。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { OID_B, callerText, goodReads, pinText, probeRead, settingsText } from "./working-state-fixtures.mjs";
import { CATALOG, NOTE_ITEM, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";
import { buildDraft, builtDraft, conflictObserved, createSelection, createdSelection, guidanceOf } from "./working-state-draft-fixtures.mjs";
import { guide, handDraft } from "./working-state-guidance-fixtures.mjs";
import { COLUMNS, JWT3, RUN, SHAPES, absent, pinAt, variants } from "./working-state-secret-fixtures.mjs";

const APPLIED = ["a", "b", "c", "d"];
const BASE = builtDraft({ observedItems: conflictObserved().items });
const ANSWER = { answerId: "ans-1", itemKey: "note_text", kind: "value", value: ["models.preset=thorough"], state: "answered" };
const candidate = (over) => ({ candidateRef: "sds_commit@sds_pin:p", sourceRef: { sourceKind: "sds_pin", locator: "p" }, presence: "value", lengthBucket: "short", matchGroup: 1, ...over });
const eachColumn = (body) => COLUMNS.forEach((column) => variants(SHAPES[column]).forEach((form) => body(column, SHAPES[column], form)));
const withCandidateRef = (draft, candidateRef) => ({ ...draft, items: draft.items.map((item) => (item.candidates === undefined ? item : { ...item, candidates: item.candidates.map((entry, i) => (i === 0 ? { ...entry, candidateRef } : entry)) })) });
const wireOf = (over) => ws.draftToC02Wire({ ...BASE, ...over }).status;
const selectionWireOf = (over) => ws.selectionToC02Wire({ ...createdSelection(BASE), ...over }).status;

test("M1+ 位置（locator）: (a)〜(e) の全部。使えない観測（malformed）になり、観測・draft・案内・wire のどこにも写らない", () => {
  eachColumn((column, secret, form) => {
    const observed = observeWith(CATALOG, pinAt({ locator: form }));
    const pin = observed.items.find((item) => item.itemKey === "sds_commit" && item.sourceRef.sourceKind === "sds_pin");
    assert.equal(pin.unobservableCause, "malformed", `${column} ${form}`);
    const draft = builtDraft({ observedItems: observed.items });
    assert.equal(absent(secret, observed, draft, guide(draft), ws.draftToC02Wire(draft)), true, `${column} ${form}`);
  });
});

test("M2+ 対象違いの名前（namedTarget）: (a)〜(e) の全部。対象違いの項目になるが、名前は案内・wire のどこにも写らない", () => {
  eachColumn((column, secret, form) => {
    const draft = builtDraft({ observedItems: observeWith(CATALOG, pinAt({ namedTarget: form })).items });
    const result = guide(draft);
    assert.equal(draft.items.find((item) => item.itemKey === "sds_commit").state, "wrong_target", `${column} ${form}`);
    assert.equal(result.guidance.text.includes("対象の名前は表示しません"), true, `${column} ${form}`);
    assert.equal(absent(secret, result, ws.draftToC02Wire(draft)), true, `${column} ${form}`);
  });
});

test("M3+ 出典の種類（sourceKind）: 案内に出る候補・不正・対象違いの出典の種類は、(a)〜(e) の全部で写らない", () => {
  eachColumn((column, secret, form) => {
    const sourceRef = { sourceKind: form, locator: "p" };
    const draft = handDraft([
      { itemKey: "sds_commit", state: "conflict", candidates: [candidate({ sourceRef }), candidate({ sourceRef, matchGroup: 2 })], observationRefs: [] },
      { itemKey: "aidlc_version", state: "wrong_target", wrongTargets: [{ sourceRef, namedTarget: "other-work" }], observationRefs: [] },
      { itemKey: "aidlc_settings", state: "invalid", invalidSources: [{ sourceRef, withheld: "secret_like" }], observationRefs: [] },
    ]);
    const result = guide(draft);
    assert.equal(result.status, "built", `${column} ${form}`);
    assert.equal(absent(secret, result), true, `${column} ${form}`);
  });
});

test("M4+ 呼出側の対象（targetRef）: (a)〜(d) は観測・draft・案内・選択・wire のどれも作らない。(e) は通常の対象として通る（意図した限界）", () => {
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      assert.equal(observeWith(CATALOG, goodReads(), { targetRef: form }).status, "target_required", `${column} ${form}`);
      assert.equal(buildDraft({ targetRef: form, observedItems: [] }).reason, "invalid_input", `${column} ${form}`);
      assert.equal(guide(handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }], { targetRef: form })).reason, "invalid_input", `${column} ${form}`);
      assert.equal(createSelection({ ...BASE, targetRef: form }).reason, "invalid_input", `${column} ${form}`);
      assert.equal(wireOf({ targetRef: form }), "refused", `${column} ${form}`);
      assert.equal(selectionWireOf({ targetRef: form }), "refused", `${column} ${form}`);
    }
  }
  assert.equal(wireOf({ targetRef: RUN }), "converted");
  assert.equal(guide(handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }], { targetRef: RUN })).status, "built");
});

test("M5+ 呼出側の識別（draftId・selectionId・answerId・draftRef）: (a)〜(d) は識別にならず、(a)(c) は文字の範囲（空白なし）でも拒まれる。(e) は通常の識別として通る（意図した限界）", () => {
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      assert.equal(ws.isRefId(form), false, `${column} ${form}`);
      assert.equal(buildDraft({ draftId: form }).reason, "invalid_input", `${column} ${form}`);
      assert.equal(send(answerInput({ answerId: form })).status, "unreadable", `${column} ${form}`);
      assert.equal(createSelection(BASE, { selectionId: form }).reason, "invalid_input", `${column} ${form}`);
      assert.equal(wireOf({ draftId: form, answers: [ANSWER] }), "refused", `${column} ${form}`);
      assert.equal(wireOf({ answers: [{ ...ANSWER, answerId: form }] }), "refused", `${column} ${form}`);
      assert.equal(selectionWireOf({ selectionId: form }), "refused", `${column} ${form}`);
      assert.equal(selectionWireOf({ draftRef: form }), "refused", `${column} ${form}`);
    }
  }
  assert.equal(ws.isRefId(RUN), true);
  assert.equal(buildDraft({ draftId: RUN }).status, "built");
  assert.equal(send(answerInput({ answerId: RUN })).status, "recorded");
  assert.equal(selectionWireOf({ selectionId: RUN, draftRef: RUN }), "converted");
});

test("M6+ 観測の参照（observationRefs・observationRef）: 案内は (a)〜(e) の全部を表示しない。選択は (a)〜(d) で作らず、wire は (a)〜(d) で断る。(e) は通常の参照として通る（意図した限界）", () => {
  eachColumn((column, secret, form) => {
    const result = guide(handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }], { observationRefs: [form] }));
    assert.equal(result.status, "built", `${column} ${form}`);
    assert.equal(result.guidance.text.includes("表示しない参照 1 件"), true, `${column} ${form}`);
    assert.equal(absent(secret, result), true, `${column} ${form}`);
  });
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      assert.equal(wireOf({ observationRefs: [form] }), "refused", `${column} ${form}`);
      assert.equal(createSelection({ ...BASE, observationRefs: [form] }, { observationRef: form }).reason, "invalid_input", `${column} ${form}`);
      assert.equal(selectionWireOf({ observationRef: form }), "refused", `${column} ${form}`);
    }
  }
  assert.equal(wireOf({ observationRefs: [RUN] }), "converted");
  assert.equal(createSelection({ ...BASE, observationRefs: [RUN] }, { observationRef: RUN }).status, "created");
});

test("M7+ 候補の参照（candidateRef・selectedCandidateRef）: 案内は (a)〜(e) の全部を質問に出さない。選択・wire は (a)〜(d) で断る。(e) は通常の参照として通る（意図した限界）", () => {
  eachColumn((column, secret, form) => {
    const draft = handDraft([{ itemKey: "sds_commit", state: "conflict", candidates: [candidate({ candidateRef: form }), candidate({ matchGroup: 2 })], observationRefs: [] }]);
    const result = guide(draft);
    assert.equal(result.questions[0].candidateRefs.length, 1, `${column} ${form}`);
    assert.equal(absent(secret, result), true, `${column} ${form}`);
    // 回答の入力の選んだ候補（selectedCandidateRef）は、項目の候補に当たる物だけ受ける。当たらない形は拒まれ、記録に写らない。
    const answered = send(answerInput({ kind: "value", selectedCandidateRef: form }), { observed: observeWith() });
    assert.equal(answered.status, "rejected", `${column} ${form}`);
    assert.equal(absent(secret, answered), true, `${column} ${form}`);
  });
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      assert.equal(createSelection(withCandidateRef(BASE, form), { candidateRef: form }).reason, "invalid_input", `${column} ${form}`);
      assert.equal(selectionWireOf({ candidateRef: form }), "refused", `${column} ${form}`);
      assert.equal(wireOf({ answers: [{ answerId: "ans-1", itemKey: "sds_commit", kind: "keep-absent", selectedCandidateRef: form, state: "answered" }] }), "refused", `${column} ${form}`);
    }
  }
  assert.equal(createSelection(withCandidateRef(BASE, RUN), { candidateRef: RUN }).status, "created");
  assert.equal(selectionWireOf({ candidateRef: RUN }), "converted");
});

test("M8+ 項目名（itemKey・原因の欄・質問・wire の項目の列）: (a)〜(d) は案内・wire が断る。(e) は大文字混じりを文字の範囲で断り、小文字・数字・_ の長い名前は項目名の形が説明する（意図した限界）", () => {
  for (const form of [...COLUMNS.map((column) => SHAPES[column]), `x_${SHAPES.b}`]) {
    assert.equal(guide(handDraft([{ itemKey: form, state: "missing", observationRefs: [] }])).reason, "invalid_input", form);
    const catalog = [{ ...NOTE_ITEM, itemKey: form }];
    const { draft } = buildDraft({ catalog, observedItems: [] });
    assert.equal(guide(draft, { catalog }).reason, "invalid_input", form);
    assert.equal(absent(form, ws.draftToC02Wire(draft)), true, form);
    // 回答の入力の項目名は、項目一覧の項目名に当たる物だけ読む。当たらない形は読まれず（unreadable）、記録に写らない。
    const unread = send(answerInput({ itemKey: form }), { observed: observeWith() });
    assert.equal(unread.status, "unreadable", form);
    assert.equal(absent(form, unread), true, form);
  }
  for (const column of APPLIED) {
    assert.equal(wireOf({ missingItems: [SHAPES[column]] }), "refused", column);
    assert.equal(wireOf({ conflicts: [SHAPES[column]] }), "refused", column);
    assert.equal(wireOf({ answers: [{ ...ANSWER, itemKey: SHAPES[column] }] }), "refused", column);
  }
  assert.equal(guide(handDraft([{ itemKey: "a".repeat(24), state: "missing", observationRefs: [] }])).status, "built");
  assert.equal(wireOf({ missingItems: [RUN], conflicts: [RUN] }), "converted");
});

test("M9+ 理由の符号（門の結果の reasons）: (a)〜(d) と大文字混じりの連なり (e) は符号の形（大文字・数字・_）で断り、結果を確認できずと書く。大文字・数字・_ の長い符号は符号の形が説明する（意図した限界）", () => {
  const draft = handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }]);
  const reasonsOf = (reason) => guide(draft, { conformance: { outcome: "FAIL", reasons: [reason] } }).guidance;
  for (const reason of [...COLUMNS.map((column) => SHAPES[column]), "AKIA" + "X".repeat(16), "X_AKIA" + "X".repeat(16), "SK-" + "X".repeat(16)]) {
    const guidance = reasonsOf(reason);
    assert.equal(guidance.reasons.length, 0, reason);
    assert.equal(guidance.text.includes("結果を確認できず"), true, reason);
    assert.equal(absent(reason, guidance), true, reason);
  }
  assert.deepEqual(reasonsOf("ABCDEFGHIJ".repeat(2) + "KLMN").reasons, ["ABCDEFGHIJ".repeat(2) + "KLMN"]);
});

test("M10+ 回答の値（文字列の項目）: (a)〜(e) の全部が拒まれ、回答・draft・案内・wire のどこにも写らない", () => {
  const observed = observeWith();
  eachColumn((column, secret, form) => {
    const result = send(answerInput({ itemKey: "note_text", value: form }), { observed });
    assert.equal(result.status, "rejected", `${column} ${form}`);
    assert.equal(result.answer.rejectionReason, "secret_like", `${column} ${form}`);
    const draft = builtDraft({ observedItems: observed.items, answers: result.answers });
    assert.equal(absent(secret, result, draft, guide(draft), ws.draftToC02Wire(draft)), true, `${column} ${form}`);
  });
});

test("M11+ 回答の値（列の要素。設定の対の列と文字列の列）: (a)〜(e) の全部が拒まれ、どの出口にも写らない", () => {
  const listItem = { ...NOTE_ITEM, itemKey: "note_list", valueType: "list", elementShape: "string" };
  const catalog = [...CATALOG, listItem];
  const observed = observeWith(catalog);
  eachColumn((column, secret, form) => {
    for (const input of [answerInput({ value: [form] }), answerInput({ itemKey: "note_list", value: [form] })]) {
      const result = send(input, { observed, catalog });
      assert.equal(result.status, "rejected", `${column} ${form}`);
      assert.equal(result.answer.rejectionReason, "secret_like", `${column} ${form}`);
      const draft = builtDraft({ catalog, observedItems: observed.items, answers: result.answers });
      assert.equal(absent(secret, result, draft, guide(draft, { catalog }), ws.draftToC02Wire(draft)), true, `${column} ${form}`);
    }
  });
});

test("M12+ 回答の値（設定の対の = の後ろ）: (a)〜(d) は拒まれ、どの出口にも写らない。(e) は設定の対の形が説明する値として通る（意図した限界）", () => {
  const observed = observeWith();
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      const result = send(answerInput({ value: [`models.token=${form}`] }), { observed });
      assert.equal(result.status, "rejected", `${column} ${form}`);
      assert.equal(result.answer.rejectionReason, "secret_like", `${column} ${form}`);
      const draft = builtDraft({ observedItems: observed.items, answers: result.answers });
      assert.equal(absent(SHAPES[column], result, draft, guide(draft), ws.draftToC02Wire(draft)), true, `${column} ${form}`);
    }
  }
  assert.equal(send(answerInput({ value: [`models.token=${RUN}`] }), { observed }).status, "recorded");
});

test("M13+ wire の回答の値（手で作った draft）: (a)〜(d) は文字列・列・入れ子のどれでも変換を断る。(e) は通常の値として通る（意図した限界。回答の受付が (e) を断る）", () => {
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      for (const value of [form, [form], { inner: [`z ${form}`] }]) assert.equal(wireOf({ answers: [{ ...ANSWER, value }] }), "refused", `${column} ${form}`);
    }
  }
  assert.equal(wireOf({ answers: [{ ...ANSWER, value: [RUN] }] }), "converted");
});

test("M14+ 選択に写す案内の構造体（text・conclusion・nextAction・causes・unconfirmed・reasons・observationRefs）と wire の案内の文: (a)〜(d) は断る。(e) は通常の文として通る（意図した限界）", () => {
  const fieldsOf = (form) => [{ text: form }, { conclusion: `結論 ${form}` }, { nextAction: { kind: "choose-source", text: form } }, { causes: [{ itemKey: "sds_commit", state: form }] }, { unconfirmed: [form] }, { reasons: [form] }, { observationRefs: [form] }];
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      for (const over of fieldsOf(form)) assert.equal(createSelection(BASE, { guidance: guidanceOf(over) }).reason, "invalid_guidance", `${column} ${form}`);
      assert.equal(selectionWireOf({ guidance: { text: form } }), "refused", `${column} ${form}`);
    }
  }
  for (const over of fieldsOf(RUN)) assert.equal(createSelection(BASE, { guidance: guidanceOf(over) }).status, "created");
  assert.equal(selectionWireOf({ guidance: { text: RUN } }), "converted");
});

test("M15+ draft を作る時の手で作った回答の列（回答の識別・項目名・値・選んだ候補）: (a)〜(d) は draft を作らない。(e) は通常の値として通る（意図した限界）", () => {
  for (const column of APPLIED) {
    for (const form of variants(SHAPES[column])) {
      for (const over of [{ value: form }, { value: [form] }, { answerId: form }, { itemKey: form }, { selectedCandidateRef: form }]) {
        assert.equal(buildDraft({ answers: [{ ...ANSWER, ...over }] }).reason, "invalid_input", `${column} ${form}`);
      }
    }
  }
  assert.equal(buildDraft({ answers: [{ ...ANSWER, value: [RUN] }] }).status, "built");
});

test("M16+ 案内の固定の語彙の欄（状態・観測できない原因・長さの区分・一致の組・存在・不正の分類・門の結果の種類）: (a)〜(e) の全部が案内に写らない", () => {
  eachColumn((column, secret, form) => {
    const items = [
      { itemKey: "aidlc_version", state: "unobservable", unobservableCauses: [form], observationRefs: [] },
      { itemKey: "sds_commit", state: "conflict", candidates: [candidate({ lengthBucket: form, matchGroup: form }), candidate({ presence: form, matchGroup: 2 })], observationRefs: [] },
      { itemKey: "aidlc_settings", state: "invalid", invalidSources: [{ sourceRef: { sourceKind: "sds_pin", locator: "p" }, withheld: form }], observationRefs: [] },
    ];
    const result = guide(handDraft(items), { conformance: { outcome: form, reasons: [] } });
    assert.equal(result.status, "built", `${column} ${form}`);
    assert.equal(guide(handDraft([{ itemKey: "aidlc_version", state: form, observationRefs: [] }])).reason, "invalid_input", `${column} ${form}`);
    assert.equal(absent(secret, result), true, `${column} ${form}`);
    // 回答の時刻（answeredAt）は時刻の形だけ読む。読めない形は読まれず（unreadable）、記録に写らない。
    const unread = send(answerInput({ answeredAt: form }), { observed: observeWith() });
    assert.equal(unread.status, "unreadable", `${column} ${form}`);
    assert.equal(absent(secret, unread), true, `${column} ${form}`);
  });
});

test("M17+ 手で作った観測の項目（項目名・観測の識別・出典の種類・位置）と draft の内部の欄（unknownItemKeys・items・observationFacts）: (a)〜(e) の全部が案内・選択・wire のどれにも写らない", () => {
  const baseItems = observeWith(CATALOG, withContent(goodReads(), "workflow_caller", callerText(OID_B))).items;
  const tweaks = [
    (form) => (unit) => ({ ...unit, itemKey: form }),
    (form) => (unit) => ({ ...unit, observation: { ...unit.observation, observationId: form } }),
    (form) => (unit) => ({ ...unit, sourceRef: { ...unit.sourceRef, sourceKind: form } }),
    (form) => (unit) => ({ ...unit, sourceRef: { ...unit.sourceRef, locator: form } }),
  ];
  eachColumn((column, secret, form) => {
    tweaks.forEach((tweak, index) => {
      const { draft } = buildDraft({ observedItems: baseItems.map((unit, i) => (i === 0 ? tweak(form)(unit) : unit)) });
      assert.notEqual(draft, null, `${column} ${form}`);
      assert.equal(absent(secret, guide(draft)), true, `${column} ${form}`);
      // 観測の識別（index 1）は観測の参照になる。選択と wire は参照に (e) を当てない（M6+ の限界）ので、(e) の列は案内だけを調べる。
      if (column === "e" && index === 1) return;
      assert.equal(absent(secret, ws.draftToC02Wire(draft), createSelection(draft, { observationRef: draft.observationRefs[0] })), true, `${column} ${form}`);
    });
  });
  assert.equal(buildDraft({ observedItems: baseItems.map((unit, i) => (i === 0 ? { ...unit, itemKey: JWT3 } : unit)) }).draft.unknownItemKeys.includes(JWT3), true);
});

test("M18+ 候補の表示値（displayValue。閉じた形の項目の食い違い）: (a)〜(e) の全部が案内に写らず、形式に合う値だけが示される", () => {
  const oid = "0123456789abcdef".repeat(2) + "01234567";
  eachColumn((column, secret, form) => {
    const draft = handDraft([{ itemKey: "sds_commit", state: "conflict", candidates: [candidate({ displayValue: form }), candidate({ displayValue: oid, matchGroup: 2 })], observationRefs: [] }]);
    const result = guide(draft);
    assert.equal(result.status, "built", `${column} ${form}`);
    assert.equal(absent(secret, result), true, `${column} ${form}`);
    assert.equal(result.guidance.text.includes("（表示しません）"), true, `${column} ${form}`);
    assert.equal(result.guidance.text.includes(oid), true, `${column} ${form}`);
  });
});

test("M19+ 観測した値（file の中の値・道具の出力。閉じた形・開いた形）: (a)〜(e) の全部が、観測の項目・draft・案内・wire のどこにも写らない", () => {
  eachColumn((column, secret, form) => {
    const replaced = [
      withContent(goodReads(), "sds_pin", pinText({ sds_commit: form })),
      withContent(goodReads(), "aidlc_version", `${form}\n`),
      goodReads().map((read) => (read.locator === "node" ? probeRead("node", `${form}\n`) : read)),
      withContent(goodReads(), "aidlc_settings", settingsText({ models: { schemaVersion: 1, preset: form } })),
    ];
    for (const reads of replaced) {
      const observed = observeWith(CATALOG, reads);
      const draft = builtDraft({ observedItems: observed.items });
      assert.equal(absent(secret, observed, draft, guide(draft), ws.draftToC02Wire(draft)), true, `${column} ${form}`);
    }
  });
});
