// 入力の欄の表（項目の評価 evaluateItems の入口）の行のデータ。項目の一覧（catalog）の 1 項目の欄を 1 欄 1 行にする。
// 項目の一覧は呼出側が手で作れるので、項目名は門（isReadableCatalogItem）、種類・形式・正規化・要素の形・必須・対象の結びは閉じた一覧（既定の側に倒す）、出典の一覧は配列だけを受ける。
// 行: { id, entry, field, cls（A 閉じた一覧・B 固定の形・C 唯一の門）, check, legit, run(value), ok(結果), refused(結果), throws? }。試験は working-state-fields-evaluate.test.mjs。
import * as ws from "../scripts/working-state/index.mjs";
import { CATALOG } from "./working-state-answer-fixtures.mjs";
import { conflictObserved } from "./working-state-draft-fixtures.mjs";

const ITEMS = conflictObserved().items;
const MARKER = /^catalog-position-\d+$/;
const stateOf = (result, itemKey) => result.items.find((item) => item.itemKey === itemKey)?.state;
const fixedForm = (result) => Array.isArray(result.items) && result.items.every((item) => (MARKER.test(item.itemKey) || ws.isItemKeyText(item.itemKey)) && ws.ITEM_STATES.includes(item.state));
const patched = (over) => CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? { ...entry, ...over } : entry));
const sourcesOf = (over) => CATALOG.find((entry) => entry.itemKey === "sds_commit").sources.map((source) => ({ ...source, ...over }));
const row = (id, field, cls, check, legit, run, refused, ok = fixedForm) => ({ id: `EV.catalog.${id}`, entry: "evaluateItems", field: `catalog[].${field}`, cls, check, legit, run, ok, refused });

export const EVALUATE_ROWS = [
  row("itemKey", "itemKey", "C", "isReadableCatalogItem", "sds_commit", (v) => ws.evaluateItems(patched({ itemKey: v }), ITEMS), (r) => r.items.some((item) => MARKER.test(item.itemKey)) && fixedForm(r), (r) => stateOf(r, "sds_commit") === "conflict"),
  row("valueType", "valueType", "A", "valueFormOf（未知は開いた形）", "commit-oid", (v) => ws.evaluateItems(patched({ valueType: v }), ITEMS), fixedForm),
  row("normalization", "normalization", "A", "normalizationOf（未知は exact）", "lowercase-hex", (v) => ws.evaluateItems(patched({ normalization: v }), ITEMS), fixedForm),
  row("elementShape", "elementShape", "A", "elementShapeOf（未知は string）", "string", (v) => ws.evaluateItems(patched({ elementShape: v }), ITEMS), fixedForm),
  row("userAnswerable", "userAnswerable", "A", "=== true だけ", true, (v) => ws.evaluateItems(patched({ userAnswerable: v }), ITEMS), fixedForm),
  row("sourceKind", "sources[].kind", "A", "isReadableCatalogItem（SOURCE_KINDS）", "sds_pin", (v) => ws.evaluateItems(patched({ sources: sourcesOf({}).map((source, i) => (i === 0 ? { ...source, kind: v } : source)) }), ITEMS), (r) => r.items.some((item) => MARKER.test(item.itemKey)) && fixedForm(r), (r) => stateOf(r, "sds_commit") === "conflict"),
  row("required", "sources[].requiredForConfirmed", "A", "isRequiredSource（false だけ任意）", true, (v) => ws.evaluateItems(patched({ sources: sourcesOf({ requiredForConfirmed: v }) }), ITEMS), fixedForm),
  row("binding", "sources[].targetBinding", "A", "targetBindingOf（未知は named）", "by-location", (v) => ws.evaluateItems(patched({ sources: sourcesOf({ targetBinding: v }) }), ITEMS), fixedForm),
  row("sources", "sources（配列でない）", "B", "Array.isArray", sourcesOf({}), (v) => ws.evaluateItems(patched({ sources: v }), ITEMS), (r) => r.items.some((item) => MARKER.test(item.itemKey)) && fixedForm(r), (r) => stateOf(r, "sds_commit") === "conflict"),
  { id: "EV.catalog.list", entry: "evaluateItems", field: "catalog（配列でない）", cls: "B", check: "Array.isArray", legit: CATALOG, run: (v) => ws.evaluateItems(v, ITEMS), ok: fixedForm, refused: () => false, throws: true },
];
