// U2 観測の読取り（LC1。子 process）の試験が共有する入力の作り方。実際の一時 dir（試験が作って片付ける）と、架空の実行ファイル（sh の script）。
// 実在する道具（node の実体・aidlc）は実行しない。名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する（架空の値だけ）。
import { spawn as realSpawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clockOf, profileOf } from "./working-state-read-file-fixtures.mjs";

export const lcProbe = await import("../scripts/working-state/probe-tool.mjs").catch(() => ({}));
export { clockOf, profileOf };

// 一時 dir（base の下に root = 対象の根、outside = 根の外、other = 根の外の別の dir）。macOS の /var → /private/var を解いた実体で作る。
export function box() {
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), "ws-probe-")));
  const dir = (...parts) => {
    const made = path.join(base, ...parts);
    mkdirSync(made, { recursive: true });
    return made;
  };
  const root = dir("root");
  const outside = dir("outside");
  const other = dir("other");
  return {
    base, root, outside, other, dir,
    flag: (name) => path.join(base, `flag-${name}`),
    ran: (name) => existsSync(path.join(base, `flag-${name}`)),
    // 架空の実行ファイル（sh の script）。body は sh の組込みだけで書く（子の PATH は絞られている）。
    exe(where, name, body, mode = 0o755) {
      const file = path.join(where, name);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, `#!/bin/sh\n${body}\n`);
      chmodSync(file, mode);
      return file;
    },
    // 中身をそのまま書く実行ファイル（先頭の行の指定が壊れた物を作る時に使う）。
    raw(where, name, text, mode = 0o755) {
      const file = path.join(where, name);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text);
      chmodSync(file, mode);
      return file;
    },
    cleanup: () => rmSync(base, { recursive: true, force: true }),
  };
}

// 動いたことを印（flag の file）で残し、版を 1 行出す body。
export const marking = (b, name, text = "aidlc 2.11.1") => `echo ran > "${b.flag(name)}"\necho "${text}"`;

// 作業中の dir を変えて run を流し、必ず戻す（相対・空の PATH の欄の負例だけで使う）。
export async function inCwd(dir, run) {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return await run();
  } finally {
    process.chdir(before);
  }
}

export async function inBox(run) {
  const made = box();
  try {
    return await run(made);
  } finally {
    made.cleanup();
  }
}

export const sampleEnv = (b, over = {}) => ({ PATH: b.outside, HOME: "/home/sample-user", LANG: "C", LC_ALL: "C", ...over });

// 道具を 1 回確かめる。既定: 根 = b.root、PATH = b.outside だけ、profile = 既定の予算。
export const probe = (tool, b, over = {}, root = b.root) =>
  lcProbe.probeToolFact({ tool, root }, { clock: clockOf(1), loadProfile: async () => profileOf(), env: sampleEnv(b), execPath: path.join(b.other, "node-sample"), ...over });

// 起動の呼び出しを記録して、本物の spawn へ渡す。
export function spawnSpy() {
  const calls = [];
  return { calls, spawn: (...args) => { calls.push(args); return realSpawn(...args); } };
}

export const fsWith = (over) => ({ ...fsPromises, ...over });

// 子 process が終わっている（生きていない）ことを、短く待って確かめる。
export async function isGone(pid) {
  for (let tries = 0; tries < 100; tries += 1) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      return error?.code === "ESRCH";
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
}
