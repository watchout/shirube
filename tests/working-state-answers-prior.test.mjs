// U2 回答の受付が受け取る「今までの回答の列」（answers。呼出側が渡す。手で作れる）の門（審査 4 回目の後の arc の決定 95 の追い指示 (a)）。
// 列の項目名・回答の識別・値・そのほかの欄のどれかが門を通らなければ、receiveAnswer は読まず（unreadable）、渡された列を結果の answers に写さない。
// 値は架空。秘密らしい形は gitleaks に拾われないよう分けて作る（working-state-secret-fixtures.mjs）。
import assert from "node:assert/strict";
import test from "node:test";
import { T1, answerInput, send } from "./working-state-answer-fixtures.mjs";
import { COLUMNS, RUN, SHAPES, absent } from "./working-state-secret-fixtures.mjs";

const LEAK = "k3j9x0q2m7v1z8w4n6b5c3d2f1g0h9j8k7l6m5n4b3v2c1x0z9a8s7d6f5g4h3j2"; // 架空の 64 文字（先頭は英字）
const NEW_ID = "ans-2";
// 値を持たない（選択して「無い」を残した）回答。項目名・識別の検査だけを確かめる時に使う。
const marked = (over) => ({ answerId: "ans-0", itemKey: "aidlc_settings", kind: "keep-absent", state: "answered", boundObservationDigest: "a".repeat(64), answeredAt: T1, selectedCandidateRef: "aidlc_settings@aidlc_settings:aidlc_settings", ...over });
// 実際に受け付けて作った回答の記録（値を持つ）を土台にして、欄を 1 つ差し替える。
const recorded = (over) => ({ ...send(answerInput({ answerId: "ans-0" })).answers[0], ...over });
const next = (answers) => send(answerInput({ answerId: NEW_ID }), { answers });
const refused = (result) => [result.status, result.answer, result.answers];

test("J1+ 項目名: 64 文字の乱数らしい項目名の回答が列にあると、次の回答を読まず（unreadable）、その項目名も、ほかの回答も結果に写さない", () => {
  const result = next([marked({ itemKey: LEAK })]);
  assert.deepEqual(refused(result), ["unreadable", null, []]);
  assert.equal(absent(LEAK, result), true);
  const withGood = next([recorded(), marked({ answerId: "ans-1", itemKey: LEAK })]);
  assert.deepEqual(refused(withGood), ["unreadable", null, []]);
  assert.equal(absent(LEAK, withGood), true);
});

test("J2+ 項目名の (a)〜(e) の形: 項目名が (a)〜(e) のどの形でも、列があれば読まず（unreadable）、写さない", () => {
  for (const column of COLUMNS) {
    const result = next([marked({ itemKey: SHAPES[column] })]);
    assert.deepEqual(refused(result), ["unreadable", null, []], column);
    assert.equal(absent(SHAPES[column], result), true, column);
  }
  assert.equal(next([marked({ itemKey: "" })]).status, "unreadable");
});

test("J3+ 回答の識別: (a)〜(e) の形の識別は読まず（unreadable）、写さない（識別も (e) を当てる門を通る。決定 95 の 2 回目の追い指示。UUID の形の識別も断る）", () => {
  for (const column of COLUMNS) {
    const result = next([marked({ answerId: SHAPES[column] })]);
    assert.deepEqual(refused(result), ["unreadable", null, []], column);
    assert.equal(absent(SHAPES[column], result), true, column);
  }
  assert.equal(next([marked({ answerId: RUN })]).status, "unreadable");
});

test("J4+ 値: (a)〜(e) の形・設定の対の値・入れ子の配列と object の中の形は、どれも読まず（unreadable）、写さない", () => {
  const values = [
    ...COLUMNS.map((column) => [`models.preset=${SHAPES[column]}`]),
    [`models.token=${LEAK}`],
    [`models.preset=${LEAK}`],
    [[`models.token=${LEAK}`]],
    { nested: [LEAK] },
    LEAK,
    [LEAK],
  ];
  for (const value of values) {
    const result = next([recorded({ value })]);
    assert.deepEqual(refused(result), ["unreadable", null, []], JSON.stringify(value).slice(0, 40));
    assert.equal(absent(LEAK, result), true);
    for (const column of COLUMNS) assert.equal(absent(SHAPES[column], result), true, column);
  }
});

test("J5+ そのほかの欄: 選んだ候補の参照・digest・時刻・分類は決まった形だけ通す。知らない欄（値・key）と形の違う値は読まず（unreadable）、写さない", () => {
  for (const column of COLUMNS) {
    assert.equal(next([marked({ selectedCandidateRef: SHAPES[column] })]).status, "unreadable", `ref ${column}`);
    assert.equal(next([recorded({ extra: SHAPES[column] })]).status, "unreadable", `extra ${column}`);
    assert.equal(next([recorded({ [SHAPES[column]]: "x" })]).status, "unreadable", `key ${column}`);
    for (const field of ["boundObservationDigest", "valueDigest", "answeredAt", "kind", "state", "rejectionReason"]) {
      const result = next([recorded({ [field]: SHAPES[column] })]);
      assert.deepEqual(refused(result), ["unreadable", null, []], `${field} ${column}`);
      assert.equal(absent(SHAPES[column], result), true, `${field} ${column}`);
    }
  }
  const hex = recorded().boundObservationDigest;
  assert.equal(/^[0-9a-f]{64}$/.test(hex), true);
  assert.equal(next([recorded({ boundObservationDigest: LEAK })]).status, "unreadable");
  assert.equal(next([recorded({ boundObservationDigest: undefined })]).status, "recorded");
});

test("J6+ 読めない列: object でない要素、項目一覧に無い項目の値は、読まず（unreadable）、例外にしない。値を持たない回答は項目一覧に無い項目でも通る", () => {
  for (const entry of [null, "ans-0", 7, undefined]) assert.deepEqual(refused(next([entry])), ["unreadable", null, []], String(entry));
  assert.deepEqual(refused(next([recorded({ itemKey: "legacy_item" })])), ["unreadable", null, []]);
  assert.equal(next([marked({ itemKey: "legacy_item" })]).status, "recorded");
});

test("J8+ 欄の形: digest は小文字 16 進の 64 文字だけ、識別は決まった文字・長さだけ、種類は 2 つだけ、参照は空でなく、値を持たない回答は値を持たない（守りを外す実測で足した）", () => {
  const hex = "a".repeat(64);
  for (const digest of [`z${hex}`, `${hex}z`, "a".repeat(63), [hex], `${hex}\n`, 7]) assert.equal(next([recorded({ boundObservationDigest: digest })]).status, "unreadable", String(digest).slice(0, 12));
  for (const answerId of ["a b", "a".repeat(65), ""]) assert.equal(next([marked({ answerId })]).status, "unreadable", answerId);
  assert.equal(next([marked({ kind: "other" })]).status, "unreadable");
  assert.equal(next([marked({ selectedCandidateRef: "" })]).status, "unreadable");
  assert.equal(next([marked({ value: ["models.preset=thorough"] })]).status, "unreadable");
  assert.equal(next([recorded({ state: "rejected", rejectionReason: "stale_answer" })]).status, "unreadable");
  assert.equal(next([marked({ state: "rejected", rejectionReason: "stale_answer" })]).status, "recorded");
});

test("J9+ 読めない作り: 穴のある列・getter を持つ回答・知らない prototype の回答は、欄の値が正当でも読まず（unreadable）、例外にしない", () => {
  assert.deepEqual(refused(next(new Array(1))), ["unreadable", null, []]);
  const getter = Object.defineProperty({ ...marked() }, "itemKey", { get: () => "aidlc_settings", enumerable: true });
  assert.deepEqual(refused(next([getter])), ["unreadable", null, []]);
  assert.deepEqual(refused(next([Object.assign(Object.create({}), marked())])), ["unreadable", null, []]);
  assert.equal(next([Object.assign(Object.create(null), marked())]).status, "recorded");
});

test("J7+ 正当な列は今までどおり通る: 受け付けた回答・拒んだ回答・置き換えた回答が並ぶ列で、次の回答を受け付け、列を返す", () => {
  const first = send(answerInput({ answerId: "ans-0" }));
  assert.equal(first.status, "recorded");
  const second = send(answerInput({ answerId: "ans-1", value: ["models.preset=claude-sonnet-4-5-20250929"], answeredAt: "2026-11-18T10:05:00+09:00" }), { answers: first.answers });
  assert.equal(second.status, "recorded");
  const rejected = send(answerInput({ answerId: "ans-3", value: [`models.token=${LEAK}`], answeredAt: "2026-11-18T10:06:00+09:00" }), { answers: second.answers });
  assert.equal(rejected.status, "rejected");
  const third = send(answerInput({ answerId: NEW_ID, answeredAt: "2026-11-18T10:07:00+09:00" }), { answers: rejected.answers });
  assert.equal(third.status, "recorded");
  assert.equal(third.answers.length, rejected.answers.length + 1);
  assert.equal(absent(LEAK, third), true);
  assert.deepEqual(next([marked()]).answers.slice(0, 1).map((answer) => answer.answerId), ["ans-0"]);
});
