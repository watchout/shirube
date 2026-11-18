// U2 観測の読取り（LC1。file）の試験が共有する入力の作り方。実際の一時 dir（試験が作って片付ける）と、差し替えられる時計・profile・file 系の部品。
// 名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する（架空の値だけ）。
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as ws from "../scripts/working-state/index.mjs";

export const lc1 = await import("../scripts/working-state/read-file.mjs").catch(() => ({}));

export const INSTANT = "2026-11-18T00:00:00.000Z";
export const PIN_LOCATOR = ".shirube/sds-pin.json";
export const PIN_TEXT = JSON.stringify({ schema: "sds-pin/1", sds_commit: "0123456789abcdef".repeat(2) + "01234567", kit_version: "0.1.0", protected_paths: [".github/workflows/**"] });

// 信頼版の profile の形（U1 の BUDGET と同じ欄）。値は試験の都合で差し替える。
export const profileOf = (over = {}) => ({ version: "test-profile/1", budget: { timeoutMs: 5000, totalTimeoutMs: 20000, maxRequests: 8, maxBytesPerResponse: 65536, automaticRetries: 0, ...over } });
export const clockOf = (step = 1) => {
  let now = 0;
  return { instant: () => new Date(INSTANT), monotonic: () => { now += step; return now; } };
};
export const depsOf = (over = {}) => ({ clock: clockOf(1), loadProfile: async () => profileOf(), ...over });

// 一時 dir（base の下に root と outside）。cleanup は権限を戻してから消す。
export function workdir() {
  const base = mkdtempSync(path.join(os.tmpdir(), "ws-read-"));
  const root = path.join(base, "root");
  const outside = path.join(base, "outside");
  mkdirSync(root);
  mkdirSync(outside);
  const locked = [];
  return {
    base, root, outside,
    put(relative, content, where = root) {
      const target = path.join(where, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
      return target;
    },
    lock(directory) {
      locked.push(directory);
      chmodSync(directory, 0o000);
    },
    cleanup() {
      for (const directory of locked) chmodSync(directory, 0o755);
      rmSync(base, { recursive: true, force: true });
    },
  };
}

export async function withDir(run) {
  const dir = workdir();
  try {
    return await run(dir);
  } finally {
    dir.cleanup();
  }
}

// file 系の部品の呼び出しを数える（開いた回数が 0 であることを確かめる）。
export function countingFs(over = {}) {
  const calls = { open: 0 };
  const fs = { ...fsPromises, open: async (...args) => { calls.open += 1; return fsPromises.open(...args); }, ...over };
  return { fs, calls };
}

// 読み（read）の呼び出しごとに onRead(回数) を呼ぶ file 系の部品。読取り中に file を書き換える試験に使う。
export function mutatingFs(onRead) {
  return {
    ...fsPromises,
    open: async (...args) => {
      const handle = await fsPromises.open(...args);
      let calls = 0;
      return { stat: (...rest) => handle.stat(...rest), close: () => handle.close(), read: (...rest) => { calls += 1; onRead(calls); return handle.read(...rest); } };
    },
  };
}

// 核（LC2）の根の内外の判定を、解決の事実に当てて「読んでよいか」にする（呼出側が包む関数の形）。
const ACCESS_OF = { denied: "denied", absent: "absent" };
export function allowByCore(view) {
  const text = "{}";
  const digest = ws.sha256Hex(text);
  const access = view.resolution === "resolved" ? "ok" : (ACCESS_OF[view.resolution] ?? "failed");
  const outcome = ws.interpretFile({ ...view, access, identity: "same", budget: { maxElapsedMs: 1, maxBytes: 1, maxRequests: 1 }, measured: { elapsedMs: 0, bytesRead: 0, requests: 1 }, content: text, digestBefore: digest, digestAfter: digest });
  return !(outcome.status === "unavailable" && outcome.cause === "out_of_boundary");
}
export const request = (dir, locator = PIN_LOCATOR, sourceKind = "sds_pin") => ({ root: dir.root, locator, sourceKind });
export const readThrough = (dir, locator, over = {}) => lc1.readFileFact(request(dir, locator), allowByCore, depsOf(over));
