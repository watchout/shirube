// U2 観測の解釈（LC2）の試験が共有する、LC1 から届く生の事実の作り方（架空の値だけ）。
// 名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する。
import * as ws from "../scripts/working-state/index.mjs";

export const ROOT = "/work/sample-root";
export const TARGET = "sample-work";
export const NOW = "2026-11-18T09:00:00+09:00";
export const LATER = "2026-11-18T09:05:00+09:00";
export const EARLIER = "2026-11-18T08:55:00+09:00";
export const OID_A = "0123456789abcdef".repeat(2) + "01234567";
export const OID_B = "fedcba9876543210".repeat(2) + "fedcba98";
export const BUDGET = Object.freeze({ maxElapsedMs: 5000, maxBytes: 65536, maxRequests: 8 });
export const LOCATORS = Object.freeze({
  sds_pin: ".shirube/sds-pin.json",
  workflow_caller: ".github/workflows/sds-gate.yml",
  aidlc_version: ".aidlc-version",
  aidlc_settings: "aidlc.settings.json",
});

export const pinText = (over = {}) => JSON.stringify({ schema: "sds-pin/1", sds_commit: OID_A, kit_version: "0.1.0", protected_paths: [".github/workflows/**", ".shirube/**", "CODEOWNERS"], ...over });
export const callerText = (ref = OID_A) => `name: sample\njobs:\n  gate:\n    uses: watchout/shirube/.github/workflows/sds-gate.yml@${ref}\n`;
export const settingsText = (over = {}) => JSON.stringify({ schemaVersion: 1, models: { schemaVersion: 1, preset: "thorough" }, ...over });

// 読めた file の生の事実。over で欄を上書きする（欄を消すには undefined を渡す）。
export function fileRead(sourceKind, content, over = {}) {
  const locator = over.locator ?? LOCATORS[sourceKind];
  const digest = typeof content === "string" ? ws.sha256Hex(content) : undefined;
  return {
    sourceKind, locator, observedAt: NOW, budget: { ...BUDGET }, measured: { elapsedMs: 3, bytesRead: 100, requests: 1 },
    resolution: "resolved", realPath: `${ROOT}/${locator}`, rootRealPath: ROOT, identity: "same", access: "ok", parentReadable: true,
    digestBefore: digest, digestAfter: digest, content, ...over,
  };
}

// 道具の子 process の生の事実（起動できて正常に終わった形）。
export function probeRead(tool, output, over = {}) {
  return {
    sourceKind: "tool_probe", locator: tool, observedAt: NOW, budget: { ...BUDGET }, measured: { elapsedMs: 40, bytesRead: 12, requests: 1 },
    launch: "ok", exitCode: 0, output, stop: null, dropped: { count: 0, kinds: [] }, ...over,
  };
}

// 初期の項目一覧の全部の出典が、実物と同じ形で読めた入力。
export function goodReads() {
  return [
    fileRead("sds_pin", pinText()),
    fileRead("workflow_caller", callerText()),
    fileRead("aidlc_version", "2.11.1\n"),
    fileRead("aidlc_settings", settingsText()),
    probeRead("node", "v24.22.3\n"),
    probeRead("aidlc", "aidlc 2.11.1\n"),
  ];
}

export function observe(over = {}) {
  return ws.observeAll({ targetRef: TARGET, now: NOW, catalog: ws.INITIAL_CATALOG, reads: goodReads(), requiredVersions: {}, ...over });
}

// 観測の単位（項目・出典の種類・locator）の結果を 1 件引く。見つからなければ失敗させる。
export function unit(result, itemKey, sourceKind, locator) {
  const found = result.items.filter((i) => i.itemKey === itemKey && i.sourceRef.sourceKind === sourceKind && (locator === undefined || i.sourceRef.locator === locator));
  if (found.length !== 1) throw new Error(`unit not found exactly once: ${itemKey} ${sourceKind} (${found.length})`);
  return found[0];
}

export const availabilityOf = (item) => item.observation.availability;
