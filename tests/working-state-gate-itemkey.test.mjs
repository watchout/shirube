// U2 項目名（itemKey）の (e)（審査 4 回目の後の arc の決定 95）: 項目名も、秘密らしさの判定の 1 か所の門（exposesText）に (e) つきで通す。
// 64 文字の乱数らしい小文字・数字の連なり（架空）が、観測・draft・回答・選択・案内（text・unconfirmed）・wire のどこにも写らない。正当な項目名は全部通る。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { INITIAL_CATALOG } from "../scripts/working-state/catalog.mjs";
import { goodReads, probeRead } from "./working-state-fixtures.mjs";
import { CATALOG, NOTE_ITEM, answerInput, observeWith, send } from "./working-state-answer-fixtures.mjs";
import { BASE, wireOf } from "./working-state-gate-fixtures.mjs";
import { buildDraft, createSelection } from "./working-state-draft-fixtures.mjs";
import { guide, handDraft, unobservableItem } from "./working-state-guidance-fixtures.mjs";
import { COLUMNS, SHAPES, absent } from "./working-state-secret-fixtures.mjs";

const LEAK = "k3j9x0q2m7v1z8w4n6b5c3d2f1g0h9j8k7l6m5n4b3v2c1x0z9a8s7d6f5g4h3j2"; // 架空の 64 文字（先頭は英字）
const LONG_OK = "aidlc_settings_extra_long_name"; // 30 文字。区切りの `_` で分かれた部品が全部 19 文字以下の正当な形
const leakItem = (over) => ({ ...NOTE_ITEM, itemKey: LEAK, ...over });
const keyed = (itemKey) => ({ ...BASE, items: BASE.items.map((item) => (item.candidates === undefined ? item : { ...item, itemKey })) });

test("I1+ 案内: 64 文字の乱数らしい項目名は案内を作らず（invalid_input）、text・unconfirmed・原因・質問のどこにも写らない", () => {
  const result = guide(handDraft([unobservableItem(LEAK, "tool_missing")]));
  assert.deepEqual([result.status, result.reason, result.guidance, result.questions], ["refused", "invalid_input", null, null]);
  assert.equal(absent(LEAK, result), true);
  const withGood = guide(handDraft([unobservableItem("tool_node", "tool_missing"), unobservableItem(LEAK, "tool_missing")]));
  assert.equal(withGood.reason, "invalid_input");
  assert.equal(absent(LEAK, withGood), true);
  const catalog = [leakItem()];
  assert.equal(guide(handDraft([{ itemKey: LEAK, state: "missing", observationRefs: [] }]), { catalog }).reason, "invalid_input");
});

test("I2+ 観測: 項目一覧の項目名が乱数らしい項目は観測せず、項目名・observationId・位置のどこにも写らない。ほかの項目は今までどおり観測する", () => {
  const observed = observeWith([...CATALOG, leakItem(), leakItem({ itemKey: `tool_${LEAK.slice(0, 40)}`, sources: [{ kind: "tool_probe", requiredForConfirmed: true, targetBinding: "by-location" }] })], [...goodReads(), probeRead(LEAK.slice(0, 40), "1.0.0")]);
  assert.equal(observed.status, "observed");
  assert.equal(absent(LEAK.slice(0, 40), observed), true);
  assert.equal(observed.items.some((item) => item.itemKey === "sds_commit"), true);
});

test("I3+ draft: 項目一覧・観測の単位・回答のどれかの項目名が乱数らしい入力は draft を作らず（invalid_input）、何も写らない", () => {
  const good = observeWith();
  const inputs = [
    { catalog: [...CATALOG, leakItem()] },
    { observedItems: good.items.map((unit, i) => (i === 0 ? { ...unit, itemKey: LEAK } : unit)) },
    { answers: [{ answerId: "ans-1", itemKey: LEAK, kind: "value", value: ["models.preset=thorough"], state: "answered" }] },
  ];
  for (const input of inputs) {
    const result = buildDraft(input);
    assert.deepEqual([result.status, result.draft, result.reason], ["refused", null, "invalid_input"], Object.keys(input).join());
    assert.equal(absent(LEAK, result), true);
  }
});

test("I4+ 回答: 項目名が乱数らしい回答は、項目一覧に同じ名前の項目があっても読まず（unreadable）、記録に写さない", () => {
  const catalog = [...CATALOG, leakItem()];
  const result = send(answerInput({ itemKey: LEAK }), { catalog, observed: observeWith(catalog) });
  assert.equal(result.status, "unreadable");
  assert.equal(absent(LEAK, result), true);
});

test("I5+ 選択: 候補を持つ項目の項目名が乱数らしい draft からは選択を作らず（invalid_input）、何も写らない", () => {
  const result = createSelection(keyed(LEAK));
  assert.deepEqual([result.status, result.selection, result.reason], ["refused", null, "invalid_input"]);
  assert.equal(absent(LEAK, result), true);
  assert.equal(createSelection(keyed("sds_commit")).status, "created");
});

test("I6+ wire: 回答の項目名・missingItems・conflicts が乱数らしい draft は変換せず（not_convertible）、何も写らない", () => {
  const forms = [{ missingItems: [LEAK] }, { conflicts: [LEAK] }, { answers: [{ answerId: "ans-1", itemKey: LEAK, kind: "value", value: ["models.preset=thorough"], state: "answered" }] }];
  for (const over of forms) {
    const result = ws.draftToC02Wire({ ...BASE, ...over });
    assert.deepEqual([result.status, result.wire, result.reason], ["refused", null, "not_convertible"], Object.keys(over).join());
    assert.equal(absent(LEAK, result), true);
  }
});

test("I7+ 正当な項目名は全部通る: 項目一覧の全項目名・tool_<名前>・区切りで分かれた長い名前が、案内・draft・wire・回答の全部の出口を通る", () => {
  const names = [...INITIAL_CATALOG.map((entry) => entry.itemKey), "tool_gh", "tool_node", LONG_OK, "a".repeat(19), `${"b".repeat(19)}_${"c".repeat(19)}_${"d".repeat(19)}`];
  for (const itemKey of names) {
    assert.equal(guide(handDraft([{ itemKey, state: "missing", observationRefs: [] }])).status, "built", itemKey);
    assert.equal(wireOf({ missingItems: [itemKey], conflicts: [itemKey] }), "converted", itemKey);
    assert.equal(buildDraft({ catalog: [{ ...NOTE_ITEM, itemKey }], observedItems: [] }).status, "built", itemKey);
  }
  const catalog = [...CATALOG, { ...NOTE_ITEM, itemKey: LONG_OK }];
  assert.equal(send(answerInput({ itemKey: LONG_OK, value: "thorough" }), { catalog, observed: observeWith(catalog) }).status, "recorded");
});

test("I8+ 限界の試験: 区切りの無い 20 文字以上の連なりは項目名として断る（乱数らしい形と区別できないため）。区切りがあれば 1 部品 19 文字以下で通る", () => {
  assert.equal(guide(handDraft([{ itemKey: "a".repeat(20), state: "missing", observationRefs: [] }])).reason, "invalid_input");
  assert.equal(wireOf({ missingItems: ["a".repeat(20)] }), "refused");
  assert.equal(guide(handDraft([{ itemKey: `${"a".repeat(19)}_${"a".repeat(19)}`, state: "missing", observationRefs: [] }])).status, "built");
});

test("I9+ 手で作った観測の単位の項目名: (a)〜(e) の全部が draft の入口で断られ（invalid_input）、unknownItemKeys にも写らない（以前は内部の欄に入った）", () => {
  const units = observeWith().items;
  for (const column of COLUMNS) {
    const result = buildDraft({ observedItems: units.map((unit, i) => (i === 0 ? { ...unit, itemKey: SHAPES[column] } : unit)) });
    assert.deepEqual([result.status, result.draft, result.reason], ["refused", null, "invalid_input"], column);
    assert.equal(absent(SHAPES[column], result), true, column);
  }
  assert.equal(buildDraft({ observedItems: units.map((unit, i) => (i === 0 ? { ...unit, itemKey: "legacy_item" } : unit)) }).draft.unknownItemKeys.includes("legacy_item"), true);
});

test("I10+ 空の項目名: 空の文字列は項目名にしない。wire・draft・回答・選択・観測のどこでも断られる（門の「空でない」の確かめの守り）", () => {
  const units = observeWith().items;
  assert.equal(ws.isItemKeyText(""), false);
  assert.equal(wireOf({ missingItems: [""] }), "refused");
  assert.equal(wireOf({ conflicts: [""] }), "refused");
  assert.equal(ws.draftToC02Wire({ ...BASE, answers: [{ answerId: "ans-1", itemKey: "", kind: "value", value: ["models.preset=thorough"], state: "answered" }] }).reason, "not_convertible");
  assert.equal(buildDraft({ catalog: [...CATALOG, { ...NOTE_ITEM, itemKey: "" }] }).reason, "invalid_input");
  assert.equal(buildDraft({ observedItems: units.map((unit, i) => (i === 0 ? { ...unit, itemKey: "" } : unit)) }).reason, "invalid_input");
  assert.equal(buildDraft({ answers: [{ answerId: "ans-1", itemKey: "", kind: "value", value: ["models.preset=thorough"], state: "answered" }] }).reason, "invalid_input");
  const catalog = [...CATALOG, { ...NOTE_ITEM, itemKey: "" }];
  assert.equal(send(answerInput({ itemKey: "" }), { catalog, observed: observeWith(catalog) }).status, "unreadable");
  assert.equal(createSelection(keyed("")).reason, "invalid_input");
  assert.equal(observeWith([...CATALOG, { ...NOTE_ITEM, itemKey: "" }]).items.some((unit) => unit.itemKey === ""), false);
});

const POSITION = /^catalog-position-\d+$/;
const droppedIn = (observed) => observed.items.filter((unit) => POSITION.test(unit.itemKey));

test("I11+ 観測（決定 95 (b)）: 項目名が門を通らない項目は黙って外さず、観測できず（unavailable・malformed）の単位として返す。項目名は書かず、項目一覧の位置で示す", () => {
  const catalog = [...CATALOG.slice(0, 2), leakItem(), ...CATALOG.slice(2), leakItem({ itemKey: "" })];
  const observed = observeWith(catalog);
  assert.equal(observed.status, "observed");
  const dropped = droppedIn(observed);
  assert.deepEqual(dropped.map((unit) => unit.itemKey).sort(), ["catalog-position-2", "catalog-position-6"]);
  for (const unit of dropped) {
    assert.deepEqual([unit.observation.availability, unit.unobservableCause, unit.presence, unit.valueDigest, unit.observation.observedDigest], ["unavailable", "malformed", undefined, undefined, null]);
    assert.equal(unit.observedAt, observed.items[0].observedAt);
    assert.equal(unit.sourceRef.sourceKind, "aidlc_settings");
  }
  assert.equal(absent(LEAK, observed), true);
  assert.equal(observed.items.some((unit) => unit.itemKey === ""), false);
});

test("I12+ 外した項目は観測した物にも成功にも数えない: 外した項目の単位は observed にならず、ほかの項目の単位・状態は変わらず、一覧にない項目として示し、draft を作らない", () => {
  const clean = observeWith();
  const catalog = [...CATALOG, leakItem()];
  const observed = observeWith(catalog);
  assert.equal(droppedIn(observed).length, 1);
  assert.equal(observed.items.some((unit) => POSITION.test(unit.itemKey) && unit.observation.availability === "observed"), false);
  assert.deepEqual(observed.items.filter((unit) => !POSITION.test(unit.itemKey)), clean.items);
  const evaluated = ws.evaluateItems(CATALOG, observed.items);
  assert.deepEqual(evaluated.items, ws.evaluateItems(CATALOG, clean.items).items);
  assert.deepEqual(evaluated.unknownItemKeys, ["catalog-position-5"]);
  assert.equal(buildDraft({ catalog, observedItems: observed.items }).reason, "invalid_input");
  const draft = buildDraft({ observedItems: observed.items }).draft;
  assert.deepEqual(draft.unknownItemKeys, ["catalog-position-5"]);
  assert.equal(draft.items.some((item) => item.state === "confirmed" && POSITION.test(item.itemKey)), false);
  assert.equal(absent(LEAK, [observed, draft]), true);
});

test("I13+ 外した項目の単位の形: 出典の種類は参照に入れてよい最初の種類（無い・読めない時は tool_probe）、使用量・一致の番号を持たず、null・出典の無い項目でも例外にしない（守りを外す実測で足した）", () => {
  const source = (kind) => ({ kind, requiredForConfirmed: true, targetBinding: "by-location" });
  const catalog = [...CATALOG, leakItem({ sources: [source(LEAK), source("sds_pin")] }), leakItem({ sources: [source(LEAK)] }), { itemKey: LEAK }, leakItem({ sources: "x" }), null];
  const observed = observeWith(catalog);
  const dropped = droppedIn(observed).sort((a, b) => a.itemKey.localeCompare(b.itemKey, "en", { numeric: true }));
  assert.deepEqual(dropped.map((unit) => unit.sourceRef.sourceKind), ["sds_pin", "tool_probe", "tool_probe", "tool_probe", "tool_probe"]);
  for (const unit of dropped) assert.deepEqual([unit.budgetUsed, unit.matchGroup], [{ requests: 0, bytes: 0, elapsedMs: 0 }, undefined]);
  assert.equal(absent(LEAK, observed), true);
});
