// U2 の出口の全部の道（案内の文面・質問・draft・C02 の wire・選択・回答・観測の項目）に、秘密らしい値が出ないこと。
// 入力の出どころごとに 1 件ずつ、秘密らしい架空の値を入れて、返り値の全体のどこにも現れないことを確かめる（出る項目の表は code-summary.md）。
// 試験の秘密らしい値は架空で、gitleaks に拾われないよう分けて作る。位置（locator）・対象違いの名前・値は別の file の試験を再利用する（表に書く）。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { NOW, OID_B, TARGET, callerText, fileRead, goodReads, pinText, probeRead } from "./working-state-fixtures.mjs";
import { CATALOG, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";
import { buildDraft, builtDraft, conflictObserved, createSelection, createdSelection, guidanceOf } from "./working-state-draft-fixtures.mjs";
import { guide, guided, handDraft } from "./working-state-guidance-fixtures.mjs";

const SECRET = "gh" + "p_" + "u".repeat(12);
const KEY_LIKE = "s" + "k" + "-" + "v".repeat(24);
const REASON_LIKE = "AK" + "IA" + "W".repeat(16);
const NORMAL_TARGET = "other-work";
const absent = (secret, ...values) => values.every((value) => !JSON.stringify(value).includes(secret));
const pinRead = (over) => fileRead("sds_pin", pinText(), over);
const readsWith = (replaced) => goodReads().map((read) => (read.sourceKind === replaced.sourceKind && read.locator === replaced.locator ? replaced : read));
const allOutputs = (reads, catalog = CATALOG) => {
  const observed = observeWith(catalog, reads);
  const draft = builtDraft({ catalog, observedItems: observed.items });
  const result = guided(draft, { catalog });
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
  // 時刻が読めない読取りは、同じ単位の唯一の読取りに差し替える（足すだけでは、ほかの正しい読取りに負けて出口に届かない）。
  const stray = [[...goodReads(), { ...pinRead(), sourceKind: SECRET }], readsWith({ ...pinRead(), observedAt: SECRET }), [...goodReads(), { ...probeRead("node", "v24.22.3\n"), locator: SECRET }], [...goodReads(), { ...probeRead("node", "v24.22.3\n"), sourceKind: KEY_LIKE }]];
  for (const catalog of [CATALOG, ws.INITIAL_CATALOG]) {
    for (const reads of stray) {
      const outputs = allOutputs(reads, catalog);
      assert.equal(absent(SECRET, ...outputs), true);
      assert.equal(absent(KEY_LIKE, ...outputs), true);
    }
  }
  assert.equal(ws.INITIAL_CATALOG.some((entry) => entry.itemKey === "tool_node"), true);
});

test("O3+ 観測の入力 道具の出力: 秘密らしい出力は版として取り出されず、どの出口にも写らない", () => {
  // 道具の項目（tool_node）を持つ項目一覧で流す（試験用の項目一覧には道具の項目が無く、何も確かめられない）。
  const outputs = allOutputs(goodReads().map((read) => (read.locator === "node" ? probeRead("node", `${SECRET}\n`) : read)), ws.INITIAL_CATALOG);
  assert.equal(absent(SECRET, ...outputs), true);
  assert.equal(outputs[0].items.find((item) => item.itemKey === "tool_node").withheld, "invalid_format");
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
  // 食い違いのある draft で流す（候補の無い draft では、どの入力も最初の検査で断られ、後の検査を確かめられない）。
  const draft = builtDraft({ observedItems: conflictObserved().items });
  assert.equal(createSelection(draft).status, "created");
  for (const [over, reason] of [[{ candidateRef: `sds_commit@sds_pin:${SECRET}` }, "unknown_candidate"], [{ observationRef: SECRET }, "unknown_observation"]]) {
    const result = createSelection(draft, over);
    assert.equal(result.reason, reason);
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

test("O9+ 呼出側の識別・対象（draftId・selectionId・answerId・targetRef）にも (e) を当てる: UUID の形・20 文字以上のハイフン名の識別は断る（意図した限界。報告に書く）。読める短い名前は受ける", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  const longTarget = "omotenasu-ai-control-plane-sample";
  assert.equal(ws.isRefId(uuid), false);
  assert.equal(ws.isRefId(longTarget), false);
  assert.equal(ws.classifyValue("string", uuid), "secret_like");
  assert.equal(buildDraft({ draftId: uuid, targetRef: TARGET, catalog: CATALOG, observedItems: observeWith().items, answers: [] }).reason, "invalid_input");
  const result = buildDraft({ draftId: "draft-1", targetRef: TARGET, catalog: CATALOG, observedItems: observeWith().items, answers: [] });
  assert.equal(result.status, "built");
  assert.equal(ws.draftToC02Wire(result.draft).wire.draftId, "draft-1");
});

test("O11+ 呼出側の識別・対象（draftId・targetRef・answerId・selectionId）が既知の token の接頭辞で始まる形なら、draft・回答・選択は作らない", () => {
  assert.equal(ws.isRefId(SECRET), false);
  assert.equal(buildDraft({ draftId: SECRET }).reason, "invalid_input");
  assert.equal(observeWith(CATALOG, goodReads(), { targetRef: SECRET }).status, "target_required");
  assert.equal(buildDraft({ targetRef: SECRET, observedItems: [] }).reason, "invalid_input");
  assert.equal(buildDraft({ observedItems: [] }).status, "built");
  assert.equal(send(answerInput({ answerId: SECRET })).status, "unreadable");
  const draft = builtDraft({ observedItems: conflictObserved().items });
  assert.equal(createSelection(draft).status, "created");
  assert.equal(createSelection(draft, { selectionId: SECRET }).reason, "invalid_input");
  assert.equal(createSelection({ ...draft, targetRef: SECRET }).reason, "invalid_input");
  assert.equal(createSelection(draft, { guidance: { ...guidanceOf(), text: `選択 ${SECRET} です` } }).reason, "invalid_guidance");
  assert.equal(guide(handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }], { targetRef: SECRET })).reason, "invalid_input");
});

test("O12+ C02 の wire（呼出側が手で作った draft・選択）: 識別・項目名・参照・選んだ候補が既知の token の接頭辞で始まる形なら、変換を断る。普通の形は変換する", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
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

test("O10+ （R-07 で解消した限界）設定の対の = の後ろに付いた秘密らしい形は、BR5.2 (b) が区切りの直後も見るので拒まれる。通常の対は拒まれない", () => {
  assert.equal(ws.rejectionReasonOf("list", [`models.token=${SECRET}`], "setting-pair"), "secret_like");
  assert.equal(ws.rejectionReasonOf("list", ["models.preset=thorough"], "setting-pair"), null);
  assert.equal(ws.rejectionReasonOf("list", [SECRET], "setting-pair"), "secret_like");
});

const nested = (depth) => (depth === 0 ? "x" : [nested(depth - 1)]);

test("O13+ C02 の wire の回答の値（手で作った draft）: 値・値の要素・入れ子の中が既知の token の接頭辞で始まる形、または深すぎて確かめられない形なら、変換を断る。通常の値は変換する", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  const answer = { answerId: "ans-1", itemKey: "note_text", kind: "value", value: ["models.preset=thorough"], state: "answered" };
  for (const value of ["thorough", ["models.preset=thorough", "a.b=c"], true]) {
    assert.equal(ws.draftToC02Wire({ ...draft, answers: [{ ...answer, value }] }).status, "converted", JSON.stringify(value));
  }
  for (const value of [SECRET, [SECRET], ["a", `x ${SECRET}`], { inner: [SECRET] }, { inner: ["x"] }, nested(40)]) { // 入れ子の object は回答の値の形（真偽・文字列・文字列の列）でないので、中身が無害でも断る。
    const result = ws.draftToC02Wire({ ...draft, answers: [{ ...answer, value }] });
    assert.equal(result.status, "refused", JSON.stringify(value));
    assert.equal(absent(SECRET, result), true);
  }
});

test("O14+ draft の回答の入口（手で作った回答の列）: 回答の値が既知の token の接頭辞で始まる形なら、draft を作らない。通常の回答は受ける", () => {
  const answer = { answerId: "ans-1", itemKey: "aidlc_settings", kind: "value", value: ["models.preset=thorough"], state: "answered", answeredAt: "2026-11-18T09:00:00+09:00" }; // 値のある回答は項目一覧の項目に当たる物だけ受ける。
  assert.equal(buildDraft({ answers: [answer] }).status, "built");
  for (const value of [SECRET, [SECRET], { inner: [`x ${SECRET}`] }]) {
    assert.equal(buildDraft({ answers: [{ ...answer, value }] }).reason, "invalid_input", JSON.stringify(value));
  }
});

test("O15+ 選択の入口（手で作った案内の構造体）: 案内のどの欄でも既知の token の接頭辞で始まる語を含むなら、選択にしない。通常の案内は受ける", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  assert.equal(createSelection(draft).status, "created");
  const bad = [{ targetRef: SECRET }, { conclusion: `結論 ${SECRET}` }, { nextAction: { kind: "choose-source", text: `操作 ${SECRET}` } }, { causes: [{ itemKey: "sds_commit", state: `x ${SECRET}` }] }, { reasons: [SECRET] }, { observationRefs: [SECRET] }];
  for (const over of bad) {
    const result = createSelection(draft, { guidance: guidanceOf(over) });
    assert.equal(result.reason, "invalid_guidance", JSON.stringify(over));
    assert.equal(absent(SECRET, result), true);
  }
});

test("O16+ 呼出側の識別・対象・参照が、区切り（| @ :）の後ろに既知の token の接頭辞を持つ形でも、識別・対象にならず、wire に渡らない", () => {
  const behind = [`a:${SECRET}`, `a@${SECRET}`, `a|${SECRET}`];
  for (const text of behind) {
    assert.equal(ws.isRefId(text), false, text);
    assert.equal(observeWith(CATALOG, goodReads(), { targetRef: text }).status, "target_required", text);
    assert.equal(buildDraft({ targetRef: text, observedItems: [] }).reason, "invalid_input", text);
    assert.equal(guide(handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }], { targetRef: text })).reason, "invalid_input", text);
  }
  const draft = builtDraft({ observedItems: conflictObserved().items });
  const ref = `sds_commit|sds_pin|${SECRET}|${NOW}`;
  const answer = { answerId: "ans-1", itemKey: "note_text", kind: "value", value: ["models.preset=thorough"], state: "answered" };
  for (const over of [{ observationRefs: [ref] }, { missingItems: [`a@${SECRET}`] }, { conflicts: [`a:${SECRET}`] }, { answers: [{ ...answer, selectedCandidateRef: `sds_commit@sds_pin:${SECRET}` }] }]) {
    const result = ws.draftToC02Wire({ ...draft, answers: [answer], ...over });
    assert.equal(result.status, "refused", JSON.stringify(over));
    assert.equal(absent(SECRET, result), true);
  }
  const selection = createdSelection(draft);
  for (const over of [{ candidateRef: `sds_commit@sds_pin:${SECRET}` }, { observationRef: ref }, { selectionId: `a:${SECRET}` }]) {
    assert.equal(ws.selectionToC02Wire({ ...selection, ...over }).status, "refused", JSON.stringify(over));
  }
});

test("O17+ 残りの入力: 一致の組・回答の参照・不正の分類・必要な版・現在時刻・道具の落とした欄・実測が秘密らしい形でも、どの出口にも写らない。項目一覧の項目名は案内と wire が断る", () => {
  const normal = { sourceKind: "sds_pin", locator: ".shirube/sds-pin.json" };
  const hand = [
    { itemKey: "aidlc_settings", state: "conflict", candidates: [{ candidateRef: "c1", sourceRef: normal, presence: "value", lengthBucket: "short", matchGroup: SECRET }], observationRefs: [] },
    { itemKey: "aidlc_version", state: "missing", answerRef: SECRET, observationRefs: [] },
    { itemKey: "sds_commit", state: "invalid", invalidSources: [{ sourceRef: normal, withheld: SECRET }], observationRefs: [] },
  ];
  for (const item of hand) assert.equal(absent(SECRET, guided(handDraft([item]))), true, JSON.stringify(item));
  assert.equal(guided(handDraft([hand[0]])).guidance.text.includes("一致の組 不明"), true);
  const initial = ws.INITIAL_CATALOG;
  const reads = goodReads().map((read) => (read.locator === "node" ? probeRead("node", "", { launch: "not_found", dropped: { count: 1, kinds: [SECRET] } }) : read));
  const outputs = (catalog, over, list = goodReads()) => {
    const observed = observeWith(catalog, list, over);
    const draft = builtDraft({ catalog, observedItems: observed.items });
    return [observed, draft, guided(draft, { catalog }), ws.draftToC02Wire(draft)];
  };
  for (const list of [reads, readsWith({ ...pinRead(), measured: { elapsedMs: SECRET, bytesRead: 1, requests: 1 } })]) assert.equal(absent(SECRET, ...outputs(initial, {}, list)), true);
  assert.equal(absent(SECRET, ...outputs(initial, { requiredVersions: { tool_node: SECRET } })), true);
  assert.equal(observeWith(CATALOG, goodReads(), { now: SECRET }).status, "now_required");
  assert.equal(absent(SECRET, observeWith(CATALOG, goodReads(), { now: SECRET })), true);
  const named = CATALOG.map((entry, index) => (index === 0 ? { ...entry, itemKey: SECRET } : entry));
  const refusedDraft = buildDraft({ catalog: named, observedItems: observeWith(named).items }); // 項目名が秘密らしい項目一覧からは、draft を作らない（決定 95。以前は draft を作り、案内と wire が断った）。
  assert.deepEqual([refusedDraft.status, refusedDraft.reason], ["refused", "invalid_input"]);
  assert.equal(absent(SECRET, observeWith(named), refusedDraft), true);
});
