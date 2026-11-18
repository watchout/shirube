// 入力の欄の表（観測 observeAll の入口）の行のデータ。1 行 = 呼出側が渡す 1 つの欄。試験は working-state-fields-observe.test.mjs、表の生成はこの file の export を読む。
// 行: { id, entry, field, cls（A 閉じた一覧・B 固定の形・C 唯一の門）, check（守りの場所の名前）, legit（正しい値）, run(value), ok(結果), refused(結果), throws? }。
import * as ws from "../scripts/working-state/index.mjs";
import { OID_A, callerText, fileRead, goodReads, pinText, probeRead, settingsText } from "./working-state-fixtures.mjs";
import { CATALOG, NOTE_ITEM, observeWith } from "./working-state-answer-fixtures.mjs";

const MARKER = /^catalog-position-\d+$/;
const INITIAL = ws.INITIAL_CATALOG;
const find = (result, itemKey, kind) => result.items.find((unit) => unit.itemKey === itemKey && (kind === undefined || unit.sourceRef.sourceKind === kind));
const swapKind = (kind, next) => goodReads().map((read) => (read.sourceKind === kind ? next : read));
const swapTool = (tool, next) => goodReads().map((read) => (read.sourceKind === "tool_probe" && read.locator === tool ? next : read));
const pinOf = (result) => find(result, "sds_commit", "sds_pin");
const nodeOf = (result) => find(result, "tool_node");
const settingsOf = (result) => find(result, "aidlc_settings");
const hasValue = (unit) => unit?.presence === "value" && unit.withheld === undefined;
const isWithheld = (unit) => unit?.withheld !== undefined && unit.value === undefined && unit.valueDigest === undefined;
const isMalformed = (unit) => unit?.observation.availability === "unavailable" && unit.unobservableCause === "malformed";
const isUnread = (unit) => unit?.observation.availability === "unavailable";
const observed = (result) => result.status === "observed" && result.items.length > 0;
const withSettings = (over) => CATALOG.map((entry) => (entry.itemKey === "aidlc_settings" ? { ...entry, ...over } : entry));
const withCommit = (map) => CATALOG.map((entry) => (entry.itemKey === "sds_commit" ? map(entry) : entry));
const withNodeCatalog = (reads, over) => observeWith(INITIAL, reads, over);

const row = (id, field, cls, check, legit, run, ok, refused, extra = {}) => ({ id, entry: "observeAll", field, cls, check, legit, run, ok, refused, ...extra });

const content = [
  ["O16a", "reads[].content（sds_pin の sds_commit）", "valueGate", OID_A, (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText({ sds_commit: v })))), pinOf],
  ["O16b", "reads[].content（sds_pin の kit_version）", "valueGate", "0.1.0", (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText({ kit_version: v })))), (r) => find(r, "kit_version")],
  ["O16c", "reads[].content（sds_pin の protected_paths の要素）", "valueGate", "docs/**", (v) => observeWith(INITIAL, swapKind("sds_pin", fileRead("sds_pin", pinText({ protected_paths: [v] })))), (r) => find(r, "protected_paths")],
  ["O16d", "reads[].content（aidlc_version の本文）", "valueGate", "2.11.1", (v) => observeWith(CATALOG, swapKind("aidlc_version", fileRead("aidlc_version", `${v}\n`))), (r) => find(r, "aidlc_version")],
  ["O16e", "reads[].content（aidlc_settings の値）", "valueGate", "thorough", (v) => observeWith(CATALOG, swapKind("aidlc_settings", fileRead("aidlc_settings", settingsText({ models: { preset: v } })))), settingsOf],
  ["O16f", "reads[].content（aidlc_settings の key）", "valueGate", "preset2", (v) => observeWith(CATALOG, swapKind("aidlc_settings", fileRead("aidlc_settings", settingsText({ models: { [v]: "x" } })))), settingsOf],
  ["O16g", "reads[].content（workflow_caller の uses の参照）", "valueGate", OID_A, (v) => observeWith(CATALOG, swapKind("workflow_caller", fileRead("workflow_caller", callerText(v)))), (r) => find(r, "sds_commit", "workflow_caller")],
].map(([id, field, check, legit, run, pick]) => row(id, field, "C", check, legit, run, (r) => hasValue(pick(r)), (r) => isWithheld(pick(r))));

const COUNT_FIELDS = ["maxElapsedMs", "maxBytes", "maxRequests"];
const MEASURED_FIELDS = ["elapsedMs", "bytesRead", "requests"];
const counts = [
  row("O19a", "reads[].budget（全体）", "B", "isCountRecord", fileRead("sds_pin", "{}").budget, (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText(), { budget: v }))), (r) => hasValue(find(r, "kit_version")), (r) => isMalformed(pinOf(r))),
  row("O19b", "reads[].measured（全体）", "B", "isCountRecord", fileRead("sds_pin", "{}").measured, (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText(), { measured: v }))), (r) => hasValue(find(r, "kit_version")), (r) => isMalformed(pinOf(r))),
  ...COUNT_FIELDS.map((key, i) => row(`O19${"cde"[i]}`, `reads[].budget.${key}`, "B", "isCount", 5000, (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText(), { budget: { maxElapsedMs: 5000, maxBytes: 65536, maxRequests: 8, [key]: v } }))), (r) => hasValue(find(r, "kit_version")), (r) => isMalformed(pinOf(r)))),
  ...MEASURED_FIELDS.map((key, i) => row(`O19${"fgh"[i]}`, `reads[].measured.${key}`, "B", "isCount", 3, (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText(), { measured: { elapsedMs: 3, bytesRead: 100, requests: 1, [key]: v } }))), (r) => hasValue(find(r, "kit_version")), (r) => isMalformed(pinOf(r)))),
];

// 読取りの生の事実のうち、比べる・引くだけで結果に写らない欄（正しい値は元のまま。外の値は読めなかった単位になる）。
const fileLookup = [
  ["O20a", "resolution", "resolved"], ["O20b", "realPath", "/work/sample-root/.shirube/sds-pin.json"], ["O20c", "rootRealPath", "/work/sample-root"],
  ["O20d", "identity", "same"], ["O20e", "access", "ok"], ["O20f", "digestBefore", null], ["O20g", "digestAfter", null],
].map(([id, key, legit]) => row(id, `reads[].${key}`, key.startsWith("digest") ? "B" : "A", key.startsWith("digest") ? "digestOfContent" : "boundaryCause", legit, (v) => {
  const base = fileRead("sds_pin", pinText());
  return observeWith(CATALOG, swapKind("sds_pin", { ...base, [key]: v === null ? base[key] : v }));
}, (r) => hasValue(pinOf(r)), (r) => isUnread(pinOf(r))));

const probeLookup = [
  ["O21a", "exitCode", 0, "interpretProbe"], ["O21b", "launch", "ok", "launchOutcome"], ["O21c", "stop", null, "interpretProbe"],
].map(([id, key, legit, check]) => row(id, `reads[].${key}（道具の確かめ）`, "A", check, legit, (v) => withNodeCatalog(swapTool("node", probeRead("node", "v24.22.3\n", { [key]: v }))), (r) => hasValue(nodeOf(r)), (r) => isUnread(nodeOf(r))));

const notFound = (dropped) => withNodeCatalog(swapTool("node", probeRead("node", "", { launch: "not_found", dropped })));
const droppedRows = [
  row("O21d", "reads[].dropped（道具の確かめの落とした欄）", "A", "droppedNotes", { count: 0, kinds: [] }, (v) => notFound(v), (r) => nodeOf(r).unobservableCause === "tool_missing", (r) => nodeOf(r).unobservableCause === "tool_cannot_start"),
  row("O21e", "reads[].dropped.count", "B", "isCount", 0, (v) => notFound({ count: v, kinds: [] }), (r) => nodeOf(r).unobservableCause === "tool_missing", (r) => nodeOf(r).unobservableCause === "tool_cannot_start"),
  row("O21f", "reads[].dropped.kinds[]", "A", "DROPPED_KINDS", "relative", (v) => notFound({ count: 1, kinds: [v] }), (r) => nodeOf(r).probeNotes?.droppedKinds?.[0] === "relative", (r) => nodeOf(r).unobservableCause === "tool_cannot_start" && nodeOf(r).probeNotes === undefined),
];

export const OBSERVE_ROWS = [
  row("O01", "targetRef", "C", "isCallerRefText", "sample-work", (v) => observeWith(CATALOG, goodReads(), { targetRef: v }), (r) => observed(r) && r.items.every((unit) => unit.sourceRef.targetRef === "sample-work"), (r) => r.status === "target_required" && r.items.length === 0),
  row("O02", "now", "B", "parseInstant", "2026-11-18T09:00:00+09:00", (v) => observeWith(CATALOG, goodReads(), { now: v }), observed, (r) => r.status === "now_required" && r.items.length === 0),
  row("O03", "catalog[].itemKey", "C", "isReadableCatalogItem", "extra_note", (v) => observeWith([...CATALOG, { ...NOTE_ITEM, itemKey: v }]), (r) => find(r, "extra_note") !== undefined, (r) => r.items.filter((unit) => MARKER.test(unit.itemKey)).length === 1),
  row("O04", "catalog[].valueType", "A", "FORMATS", "list", (v) => observeWith(withSettings({ valueType: v })), (r) => hasValue(settingsOf(r)), (r) => settingsOf(r).withheld === "secret_like"),
  row("O05", "catalog[].normalization", "A", "normalizationOf", "lowercase-hex", (v) => observeWith(withCommit((entry) => ({ ...entry, normalization: v }))), (r) => hasValue(pinOf(r)), (r) => hasValue(pinOf(r))),
  row("O06", "catalog[].elementShape", "A", "elementShapeOf", "setting-pair", (v) => observeWith(withSettings({ elementShape: v })), (r) => hasValue(settingsOf(r)), (r) => settingsOf(r).withheld !== undefined || hasValue(settingsOf(r))),
  row("O07", "catalog[].userAnswerable", "A", "（観測は読まない。回答 R の行で確かめる）", true, (v) => observeWith(CATALOG.map((entry) => ({ ...entry, userAnswerable: v }))), observed, observed),
  row("O08", "catalog[].sources[].kind", "A", "isReadableCatalogItem", "aidlc_settings", (v) => observeWith([...CATALOG, { ...NOTE_ITEM, itemKey: "extra_note", sources: [{ kind: v, requiredForConfirmed: true, targetBinding: "by-location" }] }], [...goodReads(), { ...fileRead("aidlc_settings", settingsText()), sourceKind: v }]), (r) => find(r, "extra_note") !== undefined, (r) => find(r, "extra_note") === undefined && r.items.some((unit) => MARKER.test(unit.itemKey))),
  row("O09", "catalog[].sources[].requiredForConfirmed", "A", "isRequiredSource", true, (v) => observeWith(withCommit((entry) => ({ ...entry, sources: entry.sources.map((source) => ({ ...source, requiredForConfirmed: v })) }))), observed, observed),
  row("O10", "catalog[].sources[].targetBinding", "A", "targetBindingOf", "by-location", (v) => observeWith(withSettings({ sources: [{ kind: "aidlc_settings", requiredForConfirmed: true, targetBinding: v }] })), (r) => hasValue(settingsOf(r)), (r) => isMalformed(settingsOf(r))),
  row("O11", "reads[].sourceKind", "A", "entriesFor（項目一覧の種類との一致）", "sds_pin", (v) => observeWith(CATALOG, swapKind("sds_pin", { ...fileRead("sds_pin", pinText()), sourceKind: v })), (r) => hasValue(pinOf(r)), (r) => pinOf(r).unobservableCause === "fetch_failed"),
  row("O12", "reads[].locator（file）", "C", "isWithheldLocator", ".shirube/sds-pin.json", (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText(), { locator: v }))), (r) => hasValue(pinOf(r)) && pinOf(r).sourceRef.locator === ".shirube/sds-pin.json", (r) => isMalformed(pinOf(r)) && pinOf(r).sourceRef.locator === "sds_pin"),
  row("O13", "reads[].locator（道具の確かめ）", "C", "entriesFor（道具の名前との一致）", "node", (v) => withNodeCatalog(swapTool("node", probeRead("node", "v24.22.3\n", { locator: v }))), (r) => hasValue(nodeOf(r)), (r) => nodeOf(r).unobservableCause === "fetch_failed" && nodeOf(r).sourceRef.locator === "node"),
  row("O14", "reads[].observedAt", "B", "parseInstant", "2026-11-18T09:00:00+09:00", (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText(), { observedAt: v }))), (r) => hasValue(pinOf(r)), (r) => isMalformed(pinOf(r))),
  row("O15", "reads[].namedTarget", "C", "isSecretLike", "other-work", (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText(), { namedTarget: v }))), (r) => pinOf(r).namedTarget === "other-work", (r) => pinOf(r).targetMatch === "differs" && pinOf(r).namedTarget === undefined),
  ...content,
  row("O17", "reads[].content（取り出さない欄）", "A", "pickItem（取り出す欄だけ）", "x", (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", pinText({ extra: v, nested: { deep: [v] } })))), (r) => JSON.stringify(r.items) === JSON.stringify(observeWith().items), (r) => JSON.stringify(r.items) === JSON.stringify(observeWith().items)),
  row("O17b", "reads[].content（解釈できない中身）", "A", "parseSourceContent", pinText(), (v) => observeWith(CATALOG, swapKind("sds_pin", fileRead("sds_pin", v))), (r) => hasValue(pinOf(r)), (r) => isMalformed(pinOf(r))),
  row("O18", "reads[].output（道具の出力）", "C", "extractToolVersion", "v24.22.3\n", (v) => withNodeCatalog(swapTool("node", probeRead("node", v))), (r) => hasValue(nodeOf(r)), (r) => isWithheld(nodeOf(r))),
  row("O18b", "reads[].output（版に続く文字列）", "B", "TOOL_VERSION_RE（版の数字だけ取り出す）", "plain", (v) => withNodeCatalog(swapTool("node", probeRead("node", `v24.22.3 ${v}`))), (r) => nodeOf(r).value === "24.22.3", (r) => nodeOf(r).value === "24.22.3"),
  ...counts, ...fileLookup, ...probeLookup, ...droppedRows,
  row("O22", "reads[].parentReadable", "A", "accessOutcome", true, (v) => observeWith(CATALOG, swapKind("sds_pin", { ...fileRead("sds_pin", pinText()), parentReadable: v })), (r) => hasValue(pinOf(r)), (r) => hasValue(pinOf(r))),
  row("O23", "requiredVersions（値）", "B", "compareVersions", "20.0.0", (v) => withNodeCatalog(goodReads(), { requiredVersions: { tool_node: v } }), (r) => hasValue(nodeOf(r)), (r) => isMalformed(nodeOf(r))),
  row("O23b", "requiredVersions（key）", "A", "（項目名との一致だけ）", "tool_node", (v) => withNodeCatalog(goodReads(), { requiredVersions: { [v]: "99.0.0" } }), (r) => nodeOf(r).unobservableCause === "tool_unsupported_version", (r) => hasValue(nodeOf(r))),
  row("O24", "reads（配列でない）", "B", "reads.filter（配列だけ）", goodReads(), (v) => observeWith(CATALOG, v), observed, () => false, { throws: true }),
  row("O24b", "catalog（配列でない）", "B", "given.filter（配列だけ）", CATALOG, (v) => observeWith(v, goodReads()), observed, () => false, { throws: true }),
  row("O24c", "入力の全体（object でない）", "B", "destructure（欄を読むだけ）", { targetRef: "sample-work", now: "2026-11-18T09:00:00+09:00", catalog: CATALOG, reads: goodReads(), requiredVersions: {} }, (v) => ws.observeAll(v), observed, (r) => r.status === "target_required", { throws: true }),
];
