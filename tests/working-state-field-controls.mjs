// U2 入力の欄の表の「正しい値は通る」の対照（決定 95 の 4 回目の追い指示 C）。行の ok（正しい値の結果）と refused（64 文字の乱数らしい連なりの結果）が同じ判定の行は、
// 守りを外す変異（既定へ落とす守りを外す・何でも通す・何でも断る）で結果が変わっても、型や「観測できた」だけの確かめでは通ってしまう。
// ここは、その行の ok と refused を結果の値そのもの（固定の語・真偽・数・固定の digest・項目の状態の並び・観測の項目の全体）に置き換える。
// 行のデータ（working-state-field-rows-*.mjs）は変えず、fieldTest が行の id でこの表を引いて上書きする。
import { createHash } from "node:crypto";
import * as ws from "../scripts/working-state/index.mjs";
import { CATALOG, observeWith } from "./working-state-answer-fixtures.mjs";
import { conflictObserved } from "./working-state-draft-fixtures.mjs";
import { LEAK } from "./working-state-field-fixtures.mjs"; // 循環の import。LEAK は試験が走る時（全部の読み込みが済んだ後）にだけ読む。

const json = (value) => JSON.stringify(value);
const NAMED_GUIDANCE_KEYS = ["blocking", "causes", "conclusion", "nextAction", "observationRefs", "reasons", "targetRef", "text", "unconfirmed"].join();
const namedOnly = (r) => r !== null && typeof r === "object" && Object.keys(r).sort().join() === NAMED_GUIDANCE_KEYS;
const BASE_EVALUATED = json(ws.evaluateItems(CATALOG, conflictObserved().items));
const BASE_OBSERVED = json(observeWith().items);
const same = (expected) => (r) => r === expected;
const sameBoth = (ok, refused = ok) => ({ ok, refused });
const exactly = (legit, leaked) => ({ ok: same(legit), refused: same(leaked) });
const baseEvaluated = (r) => json(r) === BASE_EVALUATED;
const baseObserved = (r) => json(r.items) === BASE_OBSERVED;
const digestIs = (expected) => (r) => r === expected;
const sha256Of = (text) => createHash("sha256").update(text).digest("hex");
const HEX64 = /^[0-9a-f]{64}$/;

const answerStatus = (leaked) => exactly("not_comparable", leaked);
const hash = (golden, leaked = (r) => HEX64.test(r)) => ({ ok: digestIs(golden), refused: leaked });

export const CONTROLS = new Map([
  ["guidanceCopyOf.guidance.（知らない欄の名前）", sameBoth(namedOnly)],
  ["guidanceCopyOf.guidance.（知らない欄の値）", sameBoth(namedOnly)],
  ["EV.catalog.valueType", { ok: baseEvaluated, refused: (r) => r.items.find((item) => item.itemKey === "sds_commit").state === "unobservable" && r.items.filter((item) => item.state !== "unobservable").length === 3 }],
  ["EV.catalog.normalization", sameBoth(baseEvaluated)],
  ["EV.catalog.elementShape", sameBoth(baseEvaluated)],
  ["EV.catalog.userAnswerable", sameBoth(baseEvaluated)],
  ["EV.catalog.required", sameBoth(baseEvaluated)],
  ["EV.catalog.binding", sameBoth(baseEvaluated)],
  ["answerStatusOf.answer.itemKey", answerStatus("invalidated")],
  ["answerStatusOf.answer.state", answerStatus("unobservable")],
  ["answerStatusOf.answer.kind", answerStatus("not_comparable")],
  ["answerStatusOf.answer.valueDigest", answerStatus("not_comparable")],
  ["answerStatusOf.answer.boundObservationDigest", answerStatus("invalidated")],
  ["closedMatchesItem.item.state", exactly(true, false)],
  ["lengthOf.valueType", { ok: same(3), refused: () => false }],
  ["lengthBucketOf.length", { ok: same("short"), refused: () => false }],
  ["digestOf.value", hash("ba2df4903a2c14e86dc3bcca58911b44ac1d2514b7227bf6eb08cfb978f55a1b")],
  ["sha256Hex.text", hash(sha256Of("x"), (r) => r === sha256Of(LEAK))],
  ["observationDigestOf.facts", hash("cd65ea2c2ad99e94a85b1b6df72efef9cb2ed0ae933a60c32ce16317f7d7d6aa")],
  ["itemObservationDigestOf.itemKey", hash("4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945")],
  ["O07", sameBoth(baseObserved)],
  ["O09", sameBoth(baseObserved)],
  ["O05", sameBoth(baseObserved)],
  ["O22", sameBoth(baseObserved)],
  ["evaluateItem.entry.valueType", { ok: (r) => r.state === "conflict", refused: (r) => r.state === "unobservable" }],
]);
