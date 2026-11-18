// LC2 観測の解釈: LC1 が渡す読取りの生の事実から、項目 × 出典（観測の単位 = 対象・項目・出典）ごとの ObservedItem を組み立てる（BR1〜BR3.4・BR9.1）。
// 観測は実際の読取りの結果だけ。宣言・cache・既定値・期待値を写さない。核は現在時刻・乱数・識別子を自分で取得せず、呼出側が now と対象を渡す（S4）。
// 同じ単位は observedAt が最も新しい 1 件だけ。同じ項目の別の出典は互いに捨てずに全部返す。返す値は深く凍結する。
import { deepFreeze } from "./canonical.mjs";
import { parseInstant } from "./instant.mjs";
import { interpretItem } from "./observation-fields.mjs";
import { interpretFile, interpretProbe, usageOf } from "./read-check.mjs";
import { isItemKeyText, isRefName, isSecretLike } from "./value-exposure.mjs";

const TOOL_PROBE = "tool_probe";
const NO_USAGE = Object.freeze({ requests: 0, bytes: 0, elapsedMs: 0 });
const unitKey = (candidate) => [candidate.parts.itemKey, candidate.parts.ref.sourceKind, candidate.parts.ref.locator].join("\u0000");
const compareUnits = (a, b) => (unitKey(a) < unitKey(b) ? -1 : unitKey(a) > unitKey(b) ? 1 : 0);

// 道具の項目は tool_<名前>。道具の確かめの locator は道具の名前（項目一覧の規約を 1 か所で持つ）。
const toolNameOf = (itemKey) => (itemKey.startsWith("tool_") ? itemKey.slice("tool_".length) : itemKey);

const isReadFact = (read) => typeof read === "object" && read !== null && typeof read.sourceKind === "string" && typeof read.locator === "string";

// 読取り 1 つが当たる（項目、出典）の組。道具の確かめは、名前が locator と同じ項目だけに当たる。
function entriesFor(catalog, read) {
  return catalog.flatMap((item) => {
    const source = item.sources.find((candidate) => candidate.kind === read.sourceKind);
    const applies = source !== undefined && (read.sourceKind !== TOOL_PROBE || toolNameOf(item.itemKey) === read.locator);
    return applies ? [{ item, source }] : [];
  });
}

// 読取りのない単位の位置（固定）。道具の確かめは道具の名前、そのほかは出典の種類（項目一覧が持つ名前だけ。入力から作らない）。
const fixedLocatorOf = (itemKey, kind) => (kind === TOOL_PROBE ? toolNameOf(itemKey) : kind);

// 参照（observationId・sourceRef・candidateRef・observationRefs）に入る前の 1 か所の門。位置が秘密らしい・判定できない読取りは、位置を
// 参照に入れない（秘密らしさの判定は value-exposure の 1 か所）。道具の確かめの位置は項目一覧の名前と一致した時だけ当たる（entriesFor）ので対象にしない。
const isWithheldLocator = (read) => read.sourceKind !== TOOL_PROBE && isSecretLike("string", read.locator);

// 1 つの観測の候補。時刻が読めない・位置が秘密らしい観測は使わず（malformed）、最新の判定では最も古い扱いにする（混ぜない）。
// 位置が秘密らしい観測の参照は、固定の位置（読取りのない単位と同じ）で作り、入力の位置を写さない。
function candidateOf(context, entry, read) {
  const time = parseInstant(read.observedAt);
  const withheld = isWithheldLocator(read);
  const usable = time !== null && !withheld;
  const interpret = read.sourceKind === TOOL_PROBE ? interpretProbe : interpretFile;
  const outcome = usable ? interpret(read) : { status: "unavailable", cause: "malformed" };
  const locator = withheld ? fixedLocatorOf(entry.item.itemKey, read.sourceKind) : read.locator;
  const parts = { context, itemKey: entry.item.itemKey, ref: { sourceKind: read.sourceKind, locator }, usage: usageOf(read), observedAt: usable ? read.observedAt : context.now };
  return { time: usable ? time : Number.NEGATIVE_INFINITY, parts, ...interpretItem(context, entry, read, outcome) };
}

// 同じ単位で最新の 1 件。最新の時刻が同じで内容が違う 2 件は、どちらも採らず changed_during_read。
function latestOf(group) {
  const top = Math.max(...group.map((candidate) => candidate.time));
  const tied = group.filter((candidate) => candidate.time === top);
  const same = new Set(tied.map((candidate) => JSON.stringify([candidate.fields, candidate.key]))).size === 1;
  return same ? tied[0] : { ...tied[0], fields: { unobservableCause: "changed_during_read" }, key: null };
}

function latestPerUnit(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = unitKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  return [...groups.values()].map(latestOf);
}

// 読取りが 1 つも渡されなかった出典は、読めなかった単位として観測できず（fetch_failed）にする。成功にも未導入にもしない。
function unreadUnits(context, catalog, selected) {
  const seen = new Set(selected.map((candidate) => `${candidate.parts.itemKey}\u0000${candidate.parts.ref.sourceKind}`));
  const units = [];
  for (const item of catalog) {
    for (const source of item.sources) {
      const key = `${item.itemKey}\u0000${source.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      units.push({ parts: { context, itemKey: item.itemKey, ref: { sourceKind: source.kind, locator: fixedLocatorOf(item.itemKey, source.kind) }, usage: NO_USAGE, observedAt: context.now }, fields: { unobservableCause: "fetch_failed" }, key: null });
    }
  }
  return units;
}

// 開いた形の一致の番号: 項目ごとに、出典の辞書順の最初に現れた順で 1 から。同じ鍵の出典に同じ番号。鍵のある（有効な）出典だけ。
function numberMatchGroups(sorted) {
  const numbering = new Map();
  return sorted.map((candidate) => {
    if (candidate.key === null) return candidate;
    const byKey = numbering.get(candidate.parts.itemKey) ?? new Map();
    const matchGroup = byKey.get(candidate.key) ?? byKey.size + 1;
    numbering.set(candidate.parts.itemKey, byKey.set(candidate.key, matchGroup));
    return { ...candidate, fields: { ...candidate.fields, matchGroup } };
  });
}

// ObservedItem（contract の Observation を含む）を組み立てる。観測できずの項目は値・presence を持たない。
function assemble({ context, itemKey, ref, usage, observedAt }, fields) {
  const unavailable = fields.unobservableCause !== undefined;
  return {
    itemKey,
    sourceRef: { sourceKind: ref.sourceKind, locator: ref.locator, targetRef: context.targetRef },
    observedAt,
    observation: {
      observationId: [itemKey, ref.sourceKind, ref.locator, observedAt].join("|"),
      sourceRef: `${ref.sourceKind}:${ref.locator}`,
      target: context.targetRef,
      versionRef: "working-tree",
      availability: unavailable ? "unavailable" : "observed",
      observedAt,
      observedContentRef: null,
      observedDigest: fields.valueDigest ?? null,
      issuerObservation: { basis: "local-read-result", unconfirmed: ["issuer-authenticity"] },
    },
    budgetUsed: { ...usage },
    ...fields,
  };
}

const stopped = (status) => deepFreeze({ status, items: [] });

// 項目名が門を通らない項目は、観測しない・黙って外さない。観測できず（unavailable・malformed）の単位として返し、項目名は書かず項目一覧の中の位置で示す（決定 95 の追い指示 (b)）。
// 出典の種類は、項目の出典のうち参照に入れてよい最初の種類（無ければ道具の確かめ）。値・presence は持たず、観測した物にも確認にも数えない（item-state は一覧に無い項目として扱う）。
const positionKeyOf = (position) => `catalog_position_${position}`;
function droppedUnits(context, given) {
  return given.flatMap((item, position) => {
    if (isItemKeyText(item?.itemKey)) return [];
    const kind = (Array.isArray(item?.sources) ? item.sources : []).map((source) => source?.kind).find(isRefName) ?? TOOL_PROBE;
    return [{ parts: { context, itemKey: positionKeyOf(position), ref: { sourceKind: kind, locator: positionKeyOf(position) }, usage: NO_USAGE, observedAt: context.now }, fields: { unobservableCause: "malformed" }, key: null }];
  });
}

// 入力: { targetRef, now, catalog, reads, requiredVersions }。対象・現在時刻が無ければ観測せず止まる（補わない）。
// 項目名が項目名の門（(e) も当てる）を通らない項目は観測しない（項目名・observationId・位置に写さない）が、黙って外さず droppedUnits の単位で返す。draft の入口（buildDraft）は同じ項目一覧を invalid_input にする。
export function observeAll({ targetRef, now, catalog: given, reads, requiredVersions }) {
  if (!isRefName(targetRef)) return stopped("target_required");
  if (parseInstant(now) === null) return stopped("now_required");
  const catalog = given.filter((item) => isItemKeyText(item?.itemKey));
  const context = { targetRef, now, required: new Map(Object.entries(Object(requiredVersions))) };
  const candidates = reads.filter(isReadFact).flatMap((read) => entriesFor(catalog, read).map((entry) => candidateOf(context, entry, read)));
  const selected = latestPerUnit(candidates);
  const sorted = [...selected, ...unreadUnits(context, catalog, selected), ...droppedUnits(context, given)].sort(compareUnits);
  return deepFreeze({ status: "observed", items: numberMatchGroups(sorted).map((candidate) => assemble(candidate.parts, candidate.fields)) });
}
