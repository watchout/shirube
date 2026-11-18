// U2 出口の全部の道（観測 → draft → 案内 → C02 の wire・選択・回答）に、語の中に埋まった秘密らしい値（区切りの直後・括弧の中・URL の利用者情報）が
// 出ないこと。位置（locator）・対象違いの名前・呼出側の識別と対象・回答の値・手で作った構造体のそれぞれに、同じ形の値を入れる（P1〜P6）。
// 通常の位置・名前・識別の挙動は変えない。試験の秘密らしい値は架空で、gitleaks に拾われないよう分けて作る。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { NOW, OID_B, callerText, fileRead, goodReads, pinText } from "./working-state-fixtures.mjs";
import { CATALOG, answerInput, observeWith, send, withContent } from "./working-state-answer-fixtures.mjs";
import { buildDraft, builtDraft, conflictObserved, createSelection, createdSelection, guidanceOf } from "./working-state-draft-fixtures.mjs";
import { guide, guided, handDraft } from "./working-state-guidance-fixtures.mjs";

const TOKEN = "gh" + "p_" + "u".repeat(12);
const RUN = "Zq".repeat(12);
const JWT3 = ["a".repeat(12), "b".repeat(12), "c".repeat(12)].join(".");
const BEARER = "Bearer " + "w".repeat(20);
const KEY_HEADING = ["-----BEGIN ", "PRIVATE KEY", "-----"].join("");
// 位置・対象違いの名前・値に付ける埋まった形。区切り・括弧・URL の利用者情報（接頭辞つきと、接頭辞の無い長い連なり）。
const forms = (secret) => [`a.${secret}`, `cfg~${secret}`, `x#${secret}`, `p?token=${secret}`, `(${secret})`, `a:${secret}`, `u/${secret}`, `q|${secret}`, `v@${secret}`, `m,${secret}`, `n;${secret}`, `"${secret}"`,
  `https://x-access-token:${secret}@github.com/o/r`, `https://${secret}@github.com/o/r`];
const EMBEDDED = [...forms(TOKEN), ...forms(RUN)];
const absent = (secret, ...values) => values.every((value) => !JSON.stringify(value).includes(secret));
const pinAt = (over) => goodReads().map((read) => (read.sourceKind === "sds_pin" ? fileRead("sds_pin", pinText(), over) : read));
const secretOf = (form) => (form.includes(TOKEN) ? TOKEN : RUN);

test("P1+ 位置（locator）が埋まった秘密らしい形: 観測の項目・draft・案内・wire のどこにも写らず、使えない観測（malformed）になる", () => {
  for (const form of EMBEDDED) {
    const observed = observeWith(CATALOG, pinAt({ locator: form }));
    const pin = observed.items.find((item) => item.itemKey === "sds_commit" && item.sourceRef.sourceKind === "sds_pin");
    assert.equal(pin.unobservableCause, "malformed", form);
    assert.equal(pin.sourceRef.locator, "sds_pin", form);
    const draft = builtDraft({ observedItems: observed.items });
    const { guidance } = guided(draft);
    const wire = ws.draftToC02Wire(draft);
    assert.equal(wire.status, "converted");
    assert.equal(absent(secretOf(form), observed, draft, guidance, wire), true, form);
  }
});

test("P2+ 食い違いのある時も、埋まった位置を指す候補の参照では選択を作れず、位置はどこにも写らない", () => {
  for (const form of EMBEDDED) {
    const observed = observeWith(CATALOG, withContent(pinAt({ locator: form }), "workflow_caller", callerText(OID_B)));
    const draft = builtDraft({ observedItems: observed.items });
    const refused = createSelection(draft, { candidateRef: `sds_commit@sds_pin:${form}` });
    assert.notEqual(refused.status, "created", form);
    // wire の参照は (a)〜(d) だけを見る（限界。(e) は参照の名前に当てない）。位置が接頭辞・JWT の形を含む手作りの参照は wire が断る。
    const wire = ws.selectionToC02Wire({ selectionId: "s-1", draftRef: draft.draftId, candidateRef: `sds_commit@sds_pin:${form}`, targetRef: draft.targetRef, guidance: guidanceOf(), observationRef: draft.observationRefs[0] });
    if (secretOf(form) === TOKEN) assert.equal(wire.status, "refused", form);
    assert.equal(absent(secretOf(form), draft, refused), true, form);
  }
});

test("P3+ 違う対象を名指す出典の名前（namedTarget）が埋まった秘密らしい形: 対象違いの項目になるが、名前はどの出口にも写らない。普通の名前は示す", () => {
  for (const form of EMBEDDED) {
    const observed = observeWith(CATALOG, pinAt({ namedTarget: form }));
    const draft = builtDraft({ observedItems: observed.items });
    const result = guided(draft);
    assert.equal(draft.items.find((item) => item.itemKey === "sds_commit").state, "wrong_target", form);
    assert.equal(result.guidance.text.includes("対象の名前は表示しません"), true, form);
    assert.equal(absent(secretOf(form), observed, draft, result, ws.draftToC02Wire(draft)), true, form);
  }
  const normal = guided(builtDraft({ observedItems: observeWith(CATALOG, pinAt({ namedTarget: "other-work" })).items }));
  assert.equal(normal.guidance.text.includes("other-work"), true);
});

test("P4+ 案内の draft の欄（手で作った draft）に埋まった秘密らしい形の位置・参照・候補の参照・対象の名前: 案内・質問のどこにも写らない", () => {
  const sourceOf = (locator) => ({ sourceKind: "sds_pin", locator });
  for (const form of EMBEDDED) {
    const ref = `sds_commit|sds_pin|${form}|${NOW}`;
    const candidate = { candidateRef: `sds_commit@sds_pin:${form}`, sourceRef: sourceOf(form), presence: "value", lengthBucket: "short", matchGroup: 1 };
    const draft = handDraft([
      { itemKey: "aidlc_settings", state: "conflict", candidates: [candidate, { ...candidate, matchGroup: 2 }], observationRefs: [] },
      { itemKey: "sds_commit", state: "wrong_target", wrongTargets: [{ sourceRef: sourceOf(form), namedTarget: form }], observationRefs: [] },
      { itemKey: "aidlc_version", state: "invalid", invalidSources: [{ sourceRef: sourceOf(form), withheld: "secret_like" }], observationRefs: [] },
    ], { observationRefs: [ref] });
    assert.equal(absent(secretOf(form), guide(draft)), true, form);
  }
});

test("P5+ 呼出側の対象（targetRef）が Bearer + 長い語・秘密鍵の見出し・JWT の形・それらの埋まった形: 観測・draft・案内・選択・wire のどれも作らない", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  assert.equal(createSelection(draft).status, "created");
  for (const form of [BEARER, KEY_HEADING, JWT3, `a:${JWT3}`, `x.${JWT3}`, `(${BEARER})`, `a=${BEARER}`, `https://u:${TOKEN}@h.example/r`]) {
    assert.equal(observeWith(CATALOG, goodReads(), { targetRef: form }).status, "target_required", form);
    assert.equal(buildDraft({ targetRef: form, observedItems: [] }).reason, "invalid_input", form);
    assert.equal(guide(handDraft([{ itemKey: "aidlc_version", state: "missing", observationRefs: [] }], { targetRef: form })).reason, "invalid_input", form);
    assert.equal(createSelection({ ...draft, targetRef: form }).reason, "invalid_input", form);
    assert.equal(ws.draftToC02Wire({ ...draft, targetRef: form }).status, "refused", form);
    assert.equal(ws.selectionToC02Wire({ ...createdSelection(draft), targetRef: form }).status, "refused", form);
  }
});

test("P6+ 呼出側の識別（draftId・selectionId・answerId）と wire の参照が JWT の形・埋まった接頭辞なら、識別にならず、wire に渡らない。通常の識別は通る", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  const answer = { answerId: "ans-1", itemKey: "note_text", kind: "value", value: ["models.preset=thorough"], state: "answered" };
  assert.equal(ws.isRefId("draft-1"), true);
  for (const form of [JWT3, `a.${JWT3}`, `a:${TOKEN}`, `x.${TOKEN}`, `a-${TOKEN}`]) {
    assert.equal(ws.isRefId(form), false, form);
    assert.equal(buildDraft({ draftId: form }).reason, "invalid_input", form);
    assert.equal(send(answerInput({ answerId: form })).status, "unreadable", form);
    assert.equal(createSelection(draft, { selectionId: form }).reason, "invalid_input", form);
    assert.equal(ws.draftToC02Wire({ ...draft, draftId: form, answers: [answer] }).status, "refused", form);
    assert.equal(ws.draftToC02Wire({ ...draft, answers: [{ ...answer, answerId: form }] }).status, "refused", form);
    assert.equal(ws.draftToC02Wire({ ...draft, observationRefs: [form] }).status, "refused", form);
    assert.equal(ws.selectionToC02Wire({ ...createdSelection(draft), selectionId: form }).status, "refused", form);
  }
});

test("P7+ 回答の値が埋まった秘密らしい形（区切りの直後・括弧の中・設定の対の = の後ろ・接頭辞の無い長い連なり）なら拒まれ、回答・draft・案内・wire のどこにも写らない", () => {
  const observed = observeWith();
  for (const form of EMBEDDED.filter((entry) => !/[\s]/u.test(entry))) {
    // 設定の対の = の後ろは、その形が説明する値なので (e) の連なりは当てない（限界。接頭辞・JWT・Bearer・鍵の見出しの (a)〜(d) は当てる）。
    const pair = secretOf(form) === TOKEN ? [answerInput({ value: [`models.token=${form}`] })] : [];
    for (const input of [answerInput({ itemKey: "note_text", value: form }), answerInput({ value: [form] }), ...pair]) {
      const result = send(input, { observed });
      assert.equal(result.status, "rejected", form);
      assert.equal(result.answer.rejectionReason, "secret_like", form);
      const draft = builtDraft({ observedItems: observed.items, answers: result.answers });
      assert.equal(absent(secretOf(form), result, draft, guided(draft), ws.draftToC02Wire(draft)), true, form);
    }
  }
});

test("P8+ 手で作った回答の値・案内の構造体に埋まった秘密らしい形: wire・draft・選択の入口が断る。通常の値は通る", () => {
  const draft = builtDraft({ observedItems: conflictObserved().items });
  const answer = { answerId: "ans-1", itemKey: "note_text", kind: "value", value: ["models.preset=thorough"], state: "answered" };
  for (const form of [`x.${TOKEN}`, `(${TOKEN})`, `a:${TOKEN}`, `p?k=${TOKEN}`, JWT3, `x.${JWT3}`, `h.${BEARER}`, `https://u:${TOKEN}@h.example/r`]) {
    for (const value of [form, [form], { inner: [`z ${form}`] }]) {
      assert.equal(ws.draftToC02Wire({ ...draft, answers: [{ ...answer, value }] }).status, "refused", form);
      assert.equal(buildDraft({ answers: [{ ...answer, value }] }).reason, "invalid_input", form);
    }
    assert.equal(createSelection(draft, { guidance: guidanceOf({ conclusion: `結論 ${form}` }) }).reason, "invalid_guidance", form);
    assert.equal(createSelection(draft, { guidance: guidanceOf({ causes: [{ itemKey: "sds_commit", state: form }] }) }).reason, "invalid_guidance", form);
  }
  assert.equal(ws.draftToC02Wire({ ...draft, answers: [answer] }).status, "converted");
});
