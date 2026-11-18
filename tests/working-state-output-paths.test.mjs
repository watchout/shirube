// U2 の出口の全部の道（案内の文面・質問・draft・C02 の wire・選択・回答・観測の項目）に、秘密らしい値が出ないこと。
// 入力の出どころごとに 1 件ずつ、秘密らしい架空の値を入れて、返り値の全体のどこにも現れないことを確かめる（出る項目の表は code-summary.md）。
// 試験の秘密らしい値は架空で、gitleaks に拾われないよう分けて作る。位置（locator）・対象違いの名前・値は別の file の試験を再利用する（表に書く）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { NOW, OID_B, TARGET, callerText, fileRead, goodReads, pinText, probeRead } from "./working-state-fixtures.mjs";
import { CATALOG, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";
import { buildDraft, builtDraft, createSelection, createdSelection, guidanceOf } from "./working-state-draft-fixtures.mjs";
import { guide, guided, handDraft } from "./working-state-guidance-fixtures.mjs";

const SECRET = "gh" + "p_" + "u".repeat(12);
const KEY_LIKE = "s" + "k" + "-" + "v".repeat(24);
const REASON_LIKE = "AK" + "IA" + "W".repeat(16);
const NORMAL_TARGET = "other-work";
const absent = (secret, ...values) => values.every((value) => !JSON.stringify(value).includes(secret));
const pinRead = (over) => fileRead("sds_pin", pinText(), over);
const readsWith = (replaced) => goodReads().map((read) => (read.sourceKind === replaced.sourceKind && read.locator === replaced.locator ? replaced : read));
const allOutputs = (reads) => {
  const observed = observeWith(CATALOG, reads);
  const draft = builtDraft({ observedItems: observed.items });
  const result = guided(draft);
  return [observed, draft, result, ws.draftToC02Wire(draft)];
};

test("O1+ 観測の入力 namedTarget: 違う対象を名指す出典の名前が秘密らしい形なら、観測の項目・draft・案内・wire のどこにも写らない。普通の名前は示す", () => {
  for (const secret of [SECRET, KEY_LIKE, "q".repeat(24)]) {
    const outputs = allOutputs(readsWith(pinRead({ namedTarget: secret })));
    assert.equal(absent(secret, ...outputs), true, secret);
    const [, draft, { guidance }] = outputs;
    const item = draft.items.find((entry) => entry.itemKey === "sds_commit");
    assert.equal(item.state, "wrong_target");
    assert.equal(guidance.text.includes("対象の名前は表示しません"), true);
  }
  const normal = allOutputs(readsWith(pinRead({ namedTarget: NORMAL_TARGET })));
  assert.equal(normal[1].items.find((entry) => entry.itemKey === "sds_commit").wrongTargets[0].namedTarget, NORMAL_TARGET);
  assert.equal(normal[2].guidance.text.includes(NORMAL_TARGET), true);
});

test("O2+ 観測の入力 sourceKind・観測の時刻・道具の位置: 秘密らしい形は項目一覧の出典に当たらず、または時刻が読めず、どの出口にも写らない", () => {
  const stray = [{ ...pinRead(), sourceKind: SECRET }, { ...pinRead(), observedAt: SECRET }, { ...probeRead("node", "v24.22.3\n"), locator: SECRET }, { ...probeRead("node", "v24.22.3\n"), sourceKind: KEY_LIKE }];
  for (const read of stray) {
    const outputs = allOutputs([...goodReads(), read]);
    assert.equal(absent(SECRET, ...outputs), true);
    assert.equal(absent(KEY_LIKE, ...outputs), true);
  }
});

test("O3+ 観測の入力 道具の出力: 秘密らしい出力は版として取り出されず、どの出口にも写らない", () => {
  const outputs = allOutputs(goodReads().map((read) => (read.locator === "node" ? probeRead("node", `${SECRET}\n`) : read)));
  assert.equal(absent(SECRET, ...outputs), true);
});

test("O4+ 回答の入力 値・選んだ候補・項目名・回答の時刻: 秘密らしい形は拒まれるか読まれず、回答・draft・案内・wire のどこにも写らない", () => {
  const observed = observeWith();
  for (const input of [answerInput({ value: [SECRET] }), answerInput({ itemKey: "note_text", value: KEY_LIKE }), answerInput({ kind: "value", selectedCandidateRef: `sds_commit@sds_pin:${SECRET}` }), answerInput({ itemKey: SECRET }), answerInput({ answeredAt: SECRET })]) {
    const result = send(input, { observed });
    const draft = builtDraft({ observedItems: observed.items, answers: result.answers });
    assert.equal(absent(SECRET, result, draft, guided(draft), ws.draftToC02Wire(draft)), true);
    assert.equal(absent(KEY_LIKE, result, draft, guided(draft), ws.draftToC02Wire(draft)), true);
  }
});

test("O5+ 呼出側の入力 選択の候補・観測の参照: 秘密らしい形は選択にならず、結果にも wire にも写らない", () => {
  const draft = builtDraft({ observedItems: observeWith().items });
  for (const over of [{ candidateRef: `sds_commit@sds_pin:${SECRET}` }, { observationRef: SECRET }]) {
    const result = createSelection(draft, over);
    assert.equal(result.status, "refused");
    assert.equal(absent(SECRET, result), true);
    assert.equal(ws.selectionToC02Wire(result.selection).status, "refused");
  }
});

test("O6+ 呼出側の入力 門の結果（U1）の理由: 大文字の秘密らしい形（AKIA の形）は読めない門の結果になり、案内に写らない", () => {
  const draft = handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }]);
  const { guidance } = guided(draft, { conformance: { outcome: "FAIL", reasons: ["TARGET_MISMATCH", REASON_LIKE] } });
  assert.equal(absent(REASON_LIKE, guidance), true);
  assert.equal(guidance.text.includes("ゲートの結果: 結果を確認できず"), true);
});

test("O7+ 案内の draft の欄（手で作った draft）: 項目名・状態・原因・表示値・長さの区分・参照が秘密らしい形でも、案内・質問のどこにも写らない", () => {
  const ref = `sds_commit|sds_pin|${SECRET}|${NOW}`;
  const candidate = (over) => ({ candidateRef: `sds_commit@sds_pin:${SECRET}`, sourceRef: { sourceKind: "sds_pin", locator: ".shirube/sds-pin.json" }, presence: "value", ...over });
  const cases = [
    handDraft([{ itemKey: KEY_LIKE, state: "missing", observationRefs: [] }]),
    handDraft([{ itemKey: "aidlc_version", state: SECRET, observationRefs: [] }]),
    handDraft([{ itemKey: "aidlc_version", state: "unobservable", unobservableCauses: [SECRET], observationRefs: [] }]),
    handDraft([{ itemKey: "sds_commit", state: "conflict", candidates: [candidate({ displayValue: SECRET }), candidate({ displayValue: "0123456789abcdef".repeat(2) + "01234567" })], observationRefs: [] }]),
    handDraft([{ itemKey: "aidlc_settings", state: "conflict", candidates: [candidate({ lengthBucket: SECRET, matchGroup: 1 })], observationRefs: [] }]),
    handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [ref] }], { observationRefs: [ref] }),
  ];
  for (const draft of cases) {
    const result = guide(draft);
    assert.equal(absent(SECRET, result), true, JSON.stringify(draft));
    assert.equal(absent(KEY_LIKE, result), true, JSON.stringify(draft));
  }
});

test("O8+ 通常の入力は変わらない: 項目名・状態・原因・閉じた形の値・長さの区分・参照・候補の参照は、そのまま案内に出る", () => {
  const draft = builtDraft({ observedItems: observeWith(CATALOG, withContent(goodReads(), "workflow_caller", callerText(OID_B))).items });
  const { guidance, questions } = guided(draft);
  assert.equal(guidance.text.includes("- sds_commit: 食い違い（候補 2 件）"), true);
  assert.equal(guidance.text.includes(OID_B), true);
  assert.equal(guidance.text.includes(draft.observationRefs[0]), true);
  assert.deepEqual(guidance.observationRefs, draft.observationRefs);
  assert.deepEqual(questions.find((q) => q.itemKey === "sds_commit").candidateRefs, draft.items.find((item) => item.itemKey === "sds_commit").candidates.map((candidate) => candidate.candidateRef));
  assert.equal(guidance.causes.every((cause) => draft.items.some((item) => item.itemKey === cause.itemKey && item.state === cause.state)), true);
});

test("O9+ 呼出側の識別・対象（draftId・selectionId・answerId・targetRef）は呼出側が作る値で、形の制限だけを受ける: UUID の形・長いハイフン名の識別は拒まない（意図した限界）", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  const longTarget = "omotenasu-ai-control-plane-sample";
  assert.equal(ws.isRefId(uuid), true);
  assert.equal(ws.classifyValue("string", uuid), "secret_like");
  const result = buildDraft({ draftId: uuid, targetRef: TARGET, catalog: CATALOG, observedItems: observeWith().items, answers: [] });
  assert.equal(result.status, "built");
  assert.equal(ws.draftToC02Wire(result.draft).wire.draftId, uuid);
  assert.equal(longTarget.length > 20, true);
});

test("O11+ 呼出側の識別・対象（draftId・targetRef・answerId・selectionId）が既知の token の接頭辞で始まる形なら、draft・回答・選択は作らない", () => {
  assert.equal(ws.isRefId(SECRET), false);
  assert.equal(buildDraft({ draftId: SECRET }).reason, "invalid_input");
  assert.equal(buildDraft({ targetRef: SECRET, observedItems: observeWith(CATALOG, goodReads(), { targetRef: SECRET }).items }).reason, "invalid_input");
  assert.equal(send(answerInput({ answerId: SECRET })).status, "unreadable");
  const draft = builtDraft({ observedItems: observeWith().items });
  assert.equal(createSelection(draft, { selectionId: SECRET }).reason, "invalid_input");
  assert.equal(createSelection({ ...draft, targetRef: SECRET }).reason, "invalid_input");
  assert.equal(createSelection(draft, { guidance: { ...guidanceOf(), text: `選択 ${SECRET} です` } }).reason, "invalid_guidance");
  assert.equal(guide(handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }], { targetRef: SECRET })).reason, "invalid_input");
});

test("O12+ C02 の wire（呼出側が手で作った draft・選択）: 識別・項目名・参照・選んだ候補が既知の token の接頭辞で始まる形なら、変換を断る。普通の形は変換する", () => {
  const draft = builtDraft({ observedItems: observeWith().items });
  const answer = { answerId: "ans-1", itemKey: "note_text", kind: "value", value: ["models.preset=thorough"], state: "answered" };
  assert.equal(ws.draftToC02Wire({ ...draft, answers: [answer] }).status, "converted");
  const stray = [{ draftId: SECRET }, { targetRef: SECRET }, { missingItems: [SECRET] }, { conflicts: [SECRET] }, { observationRefs: [SECRET] },
    { answers: [{ ...answer, answerId: SECRET }] }, { answers: [{ ...answer, itemKey: SECRET }] }, { answers: [{ ...answer, selectedCandidateRef: SECRET }] }];
  for (const over of stray) assert.equal(ws.draftToC02Wire({ ...draft, answers: [answer], ...over }).status, "refused", JSON.stringify(over));
  const selection = createdSelection(draft);
  for (const over of [{ selectionId: SECRET }, { draftRef: SECRET }, { candidateRef: SECRET }, { targetRef: SECRET }, { observationRef: SECRET }]) {
    assert.equal(ws.selectionToC02Wire({ ...selection, ...over }).status, "refused", JSON.stringify(over));
  }
  assert.equal(ws.selectionToC02Wire({ ...selection, guidance: { ...selection.guidance, text: `選択 ${SECRET} です` } }).status, "refused");
});

test("O10+ 既知の限界（設計の集合 BR5.2 (b) は語の先頭の接頭辞だけを見る）: 設定の対の = の後ろに付いた秘密らしい形は、この判定では拒まれない（設計の判断が要る。監査の項目）", () => {
  assert.equal(ws.rejectionReasonOf("list", [`models.token=${SECRET}`], "setting-pair"), null);
  assert.equal(ws.rejectionReasonOf("list", [SECRET], "setting-pair"), "secret_like");
});
