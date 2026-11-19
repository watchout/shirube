// U2 項目の一覧（LC3 が使う入力の持ち主）の試験。BR3.5・BR4.4・Q5 = A。
// 一覧は 1 か所だけが持つ（S3）。許される形式の検査は value-exposure.mjs が持ち、ここでは持たない。
import assert from "node:assert/strict";
import test from "node:test";
import {
  ELEMENT_SHAPES,
  INITIAL_CATALOG,
  NOT_HANDLED_BY_U2,
  NORMALIZATIONS,
  SOURCE_KINDS,
  TARGET_BINDINGS,
  VALUE_TYPES,
  elementShapeOf,
  findItem,
  findNotHandled,
  isRequiredSource,
  normalizationOf,
  targetBindingOf,
} from "../scripts/working-state/index.mjs";

const KEYS = ["sds_commit", "kit_version", "aidlc_version", "aidlc_settings", "protected_paths", "tool_node", "tool_aidlc"];

test("T3.5+ 初期の一覧は設計の 7 項目だけを、設計の順で持つ", () => {
  assert.deepEqual(INITIAL_CATALOG.map((e) => e.itemKey), KEYS);
});

test("T3.5+ 各項目の型・正規化・利用者の答えやすさ・出典が設計の initialCatalog のとおり", () => {
  const by = (k) => findItem(k);
  assert.equal(by("sds_commit").valueType, "commit-oid");
  assert.equal(by("sds_commit").normalization, "lowercase-hex");
  assert.deepEqual(by("sds_commit").sources.map((s) => s.kind), ["sds_pin", "workflow_caller"]);
  for (const k of ["kit_version", "aidlc_version", "tool_node", "tool_aidlc"]) {
    assert.equal(by(k).valueType, "version");
    assert.equal(by(k).normalization, "version-compare");
  }
  assert.deepEqual(by("kit_version").sources.map((s) => s.kind), ["sds_pin"]);
  assert.deepEqual(by("aidlc_version").sources.map((s) => s.kind), ["aidlc_version"]);
  assert.deepEqual(by("tool_node").sources.map((s) => s.kind), ["tool_probe"]);
  assert.deepEqual(by("tool_aidlc").sources.map((s) => s.kind), ["tool_probe"]);
  assert.equal(by("aidlc_settings").valueType, "list");
  assert.equal(by("protected_paths").valueType, "list");
  assert.deepEqual(by("aidlc_settings").sources.map((s) => s.kind), ["aidlc_settings"]);
  assert.deepEqual(by("protected_paths").sources.map((s) => s.kind), ["sds_pin"]);
});

test("T3.5+ 利用者が答えられる項目は aidlc_settings だけで、ほかは答えられない（Q3 = A）", () => {
  const answerable = INITIAL_CATALOG.filter((e) => e.userAnswerable).map((e) => e.itemKey);
  assert.deepEqual(answerable, ["aidlc_settings"]);
});

test("T3.5+ 全出典に requiredForConfirmed = true と targetBinding = by-location が書かれている", () => {
  for (const entry of INITIAL_CATALOG) {
    for (const source of entry.sources) {
      assert.equal(source.requiredForConfirmed, true, `${entry.itemKey}/${source.kind}`);
      assert.equal(source.targetBinding, "by-location", `${entry.itemKey}/${source.kind}`);
    }
  }
});

test("T3.5+ 一覧は自己整合している（型・出典・正規化・結びが列挙の内側、項目名が重ならない）", () => {
  assert.equal(new Set(INITIAL_CATALOG.map((e) => e.itemKey)).size, INITIAL_CATALOG.length);
  for (const entry of INITIAL_CATALOG) {
    assert.ok(VALUE_TYPES.includes(entry.valueType), entry.itemKey);
    assert.ok(NORMALIZATIONS.includes(normalizationOf(entry)), entry.itemKey);
    assert.ok(entry.sources.length >= 1, entry.itemKey);
    for (const source of entry.sources) {
      assert.ok(SOURCE_KINDS.includes(source.kind), `${entry.itemKey}/${source.kind}`);
      assert.ok(TARGET_BINDINGS.includes(targetBindingOf(source)), `${entry.itemKey}/${source.kind}`);
    }
  }
});

test("T3.5+ 項目に書かれた要素の形・正規化は列挙の内側で、要素の形は list の項目だけが持つ（書き間違いを一覧の自己検査で止める）", () => {
  for (const entry of INITIAL_CATALOG) {
    if ("elementShape" in entry) {
      assert.equal(entry.valueType, "list", entry.itemKey);
      assert.ok(ELEMENT_SHAPES.includes(entry.elementShape), entry.itemKey);
    }
    if ("normalization" in entry) assert.ok(NORMALIZATIONS.includes(entry.normalization), entry.itemKey);
  }
});

test("T3.5+ 出典の種類・結び・正規化の列挙は設計の enum のとおり", () => {
  assert.deepEqual([...SOURCE_KINDS], ["sds_pin", "aidlc_version", "aidlc_settings", "claude_settings", "workflow_caller", "tool_probe", "remote_metadata"]);
  assert.deepEqual([...TARGET_BINDINGS], ["by-location", "named"]);
  assert.deepEqual([...NORMALIZATIONS], ["exact", "lowercase-hex", "version-compare"]);
  assert.deepEqual([...VALUE_TYPES], ["string", "version", "commit-oid", "list", "boolean"]);
});

test("T3.5+ 一覧は凍結されていて、呼出側が書き換えられない", () => {
  assert.throws(() => INITIAL_CATALOG.push({ itemKey: "x" }), TypeError);
  assert.throws(() => { findItem("sds_commit").valueType = "string"; }, TypeError);
  assert.throws(() => findItem("sds_commit").sources.push({ kind: "sds_pin" }), TypeError);
  assert.throws(() => { findItem("sds_commit").sources[0].requiredForConfirmed = false; }, TypeError);
  assert.throws(() => NOT_HANDLED_BY_U2.push({ itemKey: "x" }), TypeError);
});

test("T3.5+ aidlc_settings の要素の形は setting-pair、ほかの list は既定の string（A-08）", () => {
  assert.equal(elementShapeOf(findItem("aidlc_settings")), "setting-pair");
  assert.equal(elementShapeOf(findItem("protected_paths")), "string");
  assert.equal(elementShapeOf(findItem("sds_commit")), "string");
});

test("T3.5- 要素の形が未知・欠落なら string（狭い側ではなく既定の側）として扱う", () => {
  assert.equal(elementShapeOf({ valueType: "list", elementShape: "free-form" }), "string");
  assert.equal(elementShapeOf({ valueType: "list" }), "string");
  assert.equal(elementShapeOf(undefined), "string");
  assert.equal(elementShapeOf(null), "string");
});

test("T3.5+ findItem は一覧にある項目を返し、無い項目は undefined", () => {
  assert.equal(findItem("kit_version").itemKey, "kit_version");
  assert.equal(findItem("unknown_item"), undefined);
});

test("T3.5- findItem は継承された名前や綴り違いを項目として返さない", () => {
  for (const key of ["__proto__", "constructor", "toString", "hasOwnProperty", "SDS_COMMIT", "sds_commit ", "", undefined, null, 1, {}]) {
    assert.equal(findItem(key), undefined, String(key));
  }
});

test("T3.5+ required_checks は項目に入らず、U2 では確認しないと理由つきで返る（Q5 = A）", () => {
  assert.equal(findItem("required_checks"), undefined);
  assert.ok(!INITIAL_CATALOG.some((e) => e.itemKey === "required_checks"));
  const notHandled = findNotHandled("required_checks");
  assert.equal(notHandled.itemKey, "required_checks");
  assert.equal(typeof notHandled.reason, "string");
  assert.ok(notHandled.reason.length > 0);
  assert.deepEqual(NOT_HANDLED_BY_U2.map((e) => e.itemKey), ["required_checks"]);
});

test("T3.5- 確認する項目は「確認しない項目」に入らず、未知の名前・継承された名前も返らない", () => {
  for (const key of KEYS) assert.equal(findNotHandled(key), undefined, key);
  for (const key of ["unknown_item", "__proto__", "constructor", "REQUIRED_CHECKS", "required_checks ", "", undefined, null, 1]) {
    assert.equal(findNotHandled(key), undefined, String(key));
  }
});

test("T3.5- 項目と「確認しない項目」は重ならない", () => {
  for (const entry of NOT_HANDLED_BY_U2) assert.equal(findItem(entry.itemKey), undefined, entry.itemKey);
});

test("T4.4+ requiredForConfirmed は false と明記された時だけ任意になる", () => {
  assert.equal(isRequiredSource({ kind: "sds_pin", requiredForConfirmed: true }), true);
  assert.equal(isRequiredSource({ kind: "sds_pin", requiredForConfirmed: false }), false);
});

test("T4.4- requiredForConfirmed の記載が無い・不正な出典は必須として扱う（失敗側）", () => {
  assert.equal(isRequiredSource({ kind: "sds_pin" }), true);
  for (const bad of [undefined, null, "false", "no", 0, "", [], {}]) {
    assert.equal(isRequiredSource({ kind: "sds_pin", requiredForConfirmed: bad }), true, String(bad));
  }
  assert.equal(isRequiredSource(undefined), true);
  assert.equal(isRequiredSource(null), true);
});

test("T4.4+ targetBinding は by-location と明記された時だけ by-location", () => {
  assert.equal(targetBindingOf({ kind: "sds_pin", targetBinding: "by-location" }), "by-location");
  assert.equal(targetBindingOf({ kind: "remote_metadata", targetBinding: "named" }), "named");
});

test("T4.4- targetBinding の記載が無い・不正な出典は named（対象を名指す必要がある側）として扱う", () => {
  assert.equal(targetBindingOf({ kind: "sds_pin" }), "named");
  for (const bad of [undefined, null, "By-Location", "location", "", 1, {}]) {
    assert.equal(targetBindingOf({ kind: "sds_pin", targetBinding: bad }), "named", String(bad));
  }
  assert.equal(targetBindingOf(undefined), "named");
});

test("T4.4+ normalization の記載が無い項目は exact、書かれていればその値", () => {
  assert.equal(normalizationOf({ valueType: "string" }), "exact");
  assert.equal(normalizationOf(findItem("sds_commit")), "lowercase-hex");
  assert.equal(normalizationOf(findItem("kit_version")), "version-compare");
  assert.equal(normalizationOf(findItem("aidlc_settings")), "exact");
});

test("T4.4- normalization が未知・不正なら exact（最も厳しい比べ方）として扱う", () => {
  for (const bad of ["lowercase", "EXACT", "", 1, null, {}]) {
    assert.equal(normalizationOf({ valueType: "string", normalization: bad }), "exact", String(bad));
  }
  assert.equal(normalizationOf(undefined), "exact");
});
