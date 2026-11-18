// U2 構造の試験（Step 12）。scripts/working-state/ の file をディスクから全部列挙して照らす（NFR1.1・NFR2.5・NFR2.6・NFR5.1・NFR5.2・NFR7・NFR10.2）。
// 検査の関数は tests/working-state-structure-sources.mjs（試験の部品）。各検査に、実物が通ることと、違反の例を捕まえることの両方を置く。
// 名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する。1 file ずつの検査（T6.1 など）は各部品の試験にあり、ここはそれを重ねない。
import assert from "node:assert/strict";
import test from "node:test";
import { REASONS } from "../scripts/sds/ci-record-policy.mjs";
import { BUDGET, fileRead, goodReads, observe, pinText, unit } from "./working-state-fixtures.mjs";

const sx = await import("./working-state-structure-sources.mjs").catch(() => ({}));
const real = sx.loadSources?.() ?? new Map();
const only = (name, text) => new Map([[name, text]]);
const flagged = (found, ...words) => {
  assert.equal(found.length > 0, true, "違反を 1 件も捕まえなかった");
  for (const word of words) assert.equal(found.some((entry) => entry.includes(word)), true, word);
};

test("T12.0 実物の分母は空でなく、全部の file がどれかの部品に分類される（分類のない新しい file は失敗）", () => {
  assert.equal(real.size > 0, true);
  assert.deepEqual(sx.unclassifiedFiles(real), []);
  flagged(sx.unclassifiedFiles(only("brand-new-part.mjs", "export const x = 1;\n")), "brand-new-part.mjs");
});

test("T12.a+ 核（LC2〜LC5・末端）は Date・乱数・UUID・環境変数・file・子 process・network を使わない（全 file をディスクから列挙）", () => {
  assert.deepEqual(sx.coreEffectViolations(real), []);
  const bad = ['const t = new Date();', "const n = Math.random();", 'import { randomUUID } from "node:crypto";', "const v = process.env.HOME;", 'import fs from "node:fs";', 'import fsp from "node:fs/promises";',
    'import { spawn } from "node:child_process";', 'import http from "node:http";', 'import net from "node:net";', "await fetch(url);", "const t = Date.now();"];
  for (const line of bad) flagged(sx.coreEffectViolations(only("guidance.mjs", `${line}\n`)), "guidance.mjs");
});

test("T12.a- 注釈の中の語・名前の一部（isValidDate）・LC1 の file では核の検査に当たらない", () => {
  assert.deepEqual(sx.coreEffectViolations(only("guidance.mjs", "// Date.now は使わない（process.env も）\nconst isValidDate = () => true;\n")), []);
  assert.deepEqual(sx.coreEffectViolations(only("read-file.mjs", "const t = new Date();\nimport fs from \"node:fs\";\n")), []);
});

test("T12.b+ LC1・LC6 に分類・判定の語（原因の名前・項目状態の名前・判定の関数の名前）が無い。LC1 の事実の語（not_found・denied・same など）は許す", () => {
  assert.deepEqual(sx.adapterWordViolations(real), []);
  for (const word of ["budget_exceeded", "timed_out", "out_of_boundary", "changed_during_read", "wrong_target", "tool_missing", "permission_denied", "malformed", "conflict"]) {
    flagged(sx.adapterWordViolations(only("probe-run.mjs", `const cause = "${word}";\n`)), "probe-run.mjs", word);
  }
  flagged(sx.adapterWordViolations(only("escape.mjs", "function classifyValue(text) { return text; }\n")), "escape.mjs");
  assert.deepEqual(sx.adapterWordViolations(only("probe-path.mjs", 'return { state: "not_found" }; // 見つからなかった事実\n')), []);
});

test("T12.b+ LC1 は子 process を group ごと止める経路を持つ（detached で起動し、group 宛てに signal を送る）。持たなければ失敗", () => {
  assert.deepEqual(sx.groupKillViolations(real), []);
  flagged(sx.groupKillViolations(only("probe-run.mjs", "spawn(file, args, { shell: false });\n")), "probe-run.mjs");
  flagged(sx.groupKillViolations(only("probe-run.mjs", "spawn(file, args, { detached: true });\nprocess.kill(pid, signal);\n")), "probe-run.mjs");
  flagged(sx.groupKillViolations(new Map()), "probe-run.mjs");
});

test("T12.b+ LC2 の file が予算の名前を持つのは LC1 の事実（read.budget）の読み・使った量の記録・必須の欄の一覧だけ。入口の引数に予算が無い", () => {
  assert.deepEqual(sx.budgetFlowViolations(real), []);
  flagged(sx.budgetFlowViolations(only("read-check.mjs", "const limit = input.budget.maxBytes;\n")), "read-check.mjs");
  flagged(sx.budgetFlowViolations(only("observation.mjs", "export function observeAll({ targetRef, now, catalog, reads, budget }) { return 1; }\n")), "observation.mjs");
  assert.deepEqual(sx.budgetFlowViolations(only("read-check.mjs", "const over = read.measured.bytesRead > read.budget.maxBytes;\n")), []);
});

test("T12.b+ 呼出側が足した予算（入力の欄）は LC2 の判定に使われない。超過の判定は LC1 の事実の宣言と実測だけで決まる", () => {
  const extras = (b) => ({ budget: b, budgetProfile: { version: "caller", budget: b }, limits: b, maxBytes: b.maxBytes, timeoutMs: b.maxElapsedMs });
  const tiny = { maxElapsedMs: 1, maxBytes: 1, maxRequests: 1 };
  const huge = { maxElapsedMs: 1e9, maxBytes: 1e9, maxRequests: 1e9 };
  const baseline = JSON.stringify(observe());
  assert.equal(JSON.stringify(observe(extras(tiny))), baseline);
  assert.equal(unit(observe(extras(tiny)), "sds_commit", "sds_pin").observation.availability, "observed");
  const over = (b) => observe({ ...extras(b), reads: goodReads().map((read) => (read.sourceKind === "sds_pin" ? fileRead("sds_pin", pinText(), { measured: { elapsedMs: 3, bytesRead: BUDGET.maxBytes + 1, requests: 1 } }) : read)) });
  for (const b of [tiny, huge]) assert.equal(unit(over(b), "sds_commit", "sds_pin").unobservableCause, "budget_exceeded");
});

test("T12.c+ 理由コードの定義が無い（U1 の REASONS の値も、大文字の理由コードの形の文字列も核・adapter に無い）。案内は読むだけ", () => {
  assert.equal(REASONS.length > 0, true);
  assert.deepEqual(sx.reasonCodeViolations(real, REASONS), []);
  flagged(sx.reasonCodeViolations(only("guidance.mjs", `const x = "${REASONS[0]}";\n`), REASONS), "guidance.mjs", REASONS[0]);
  flagged(sx.reasonCodeViolations(only("guidance.mjs", 'const codes = ["SOMETHING_NEW", "OTHER_CODE"];\n'), REASONS), "guidance.mjs");
  assert.deepEqual(sx.reasonCodeViolations(only("guidance.mjs", "const pattern = /^[A-Z][A-Z0-9_]{0,63}$/;\n"), REASONS), []);
});

test("T12.d+ 規則の判定の持ち主は 1 file だけ（同じ名前の定義が 2 か所に無い）。規則の値の literal・同じ正規表現が持ち主の外に無い", () => {
  assert.deepEqual(sx.ownershipViolations(real), []);
  flagged(sx.ownershipViolations(new Map([["answers.mjs", "function classifyValue(v) { return v; }\n"], ["value-exposure.mjs", "export function classifyValue(v) { return v; }\n"]])), "classifyValue");
  flagged(sx.ownershipViolations(only("guidance.mjs", "const max = 256;\n")), "guidance.mjs");
  flagged(sx.ownershipViolations(only("answers.mjs", "const OID = /^[0-9a-f]{40}$/;\n")), "answers.mjs");
  flagged(sx.ownershipViolations(new Map([["answers.mjs", "const R = /^[a-z]+-[0-9]{3}$/u;\n"], ["draft.mjs", "const S = /^[a-z]+-[0-9]{3}$/u;\n"]])), "[a-z]+");
  flagged(sx.ownershipViolations(only("observation.mjs", "const bounds = { maxBytes: 65536 };\n")), "observation.mjs");
});

test("T12.e+ import に循環が無い。核は LC1・LC6・試験を import しない。LC3 は回答・案内を import しない。LC2 は項目状態を import しない。末端は何も import しない", () => {
  assert.deepEqual(sx.cycleViolations(real), []);
  assert.deepEqual(sx.importDirectionViolations(real), []);
  flagged(sx.cycleViolations(new Map([["a.mjs", 'import { b } from "./b.mjs";\n'], ["b.mjs", 'import { a } from "./a.mjs";\n']])), "a.mjs", "b.mjs");
  const into = (name, target) => sx.importDirectionViolations(only(name, `import { x } from "${target}";\n`));
  flagged(into("guidance.mjs", "./read-file.mjs"), "guidance.mjs");
  flagged(into("draft.mjs", "./probe-tool.mjs"), "draft.mjs");
  flagged(into("answers.mjs", "./escape.mjs"), "answers.mjs");
  flagged(into("answers.mjs", "../../tests/working-state-coverage.test.mjs"), "answers.mjs");
  flagged(into("item-state.mjs", "./answers.mjs"), "item-state.mjs");
  flagged(into("catalog.mjs", "./draft.mjs"), "catalog.mjs");
  flagged(into("observation.mjs", "./item-state.mjs"), "observation.mjs");
  flagged(into("value-exposure.mjs", "./canonical.mjs"), "value-exposure.mjs");
  flagged(into("instant.mjs", "./canonical.mjs"), "instant.mjs");
  assert.deepEqual(into("read-file.mjs", "./canonical.mjs"), []);
  assert.deepEqual(into("guidance.mjs", "./canonical.mjs"), []);
});

test("T12.f+ 外部への効果の経路（書込み・削除・push・投稿・network・標準出力・shell）が無い。LC1 の file の open は読み取り専用", () => {
  assert.deepEqual(sx.effectPathViolations(real), []);
  const bad = ["await fs.writeFile(p, d);", "await fsp.appendFile(p, d);", "fs.createWriteStream(p);", "await fsp.rm(p);", "await fsp.unlink(p);", "await fsp.mkdir(p);", 'run("git push origin main");',
    'run("gh pr comment 1");', "console.log(x);", "process.stdout.write(x);", "spawn(file, args, { shell: true });", "exec(command);", "execSync(command);", 'await fs.open(path, "w");'];
  for (const line of bad) flagged(sx.effectPathViolations(only("read-file.mjs", `${line}\n`)), "read-file.mjs");
  flagged(sx.effectPathViolations(only("guidance.mjs", "console.error(x);\n")), "guidance.mjs");
  assert.deepEqual(sx.effectPathViolations(only("read-file.mjs", "const h = await fs.open(p, constants.O_RDONLY | constants.O_NOFOLLOW);\n")), []);
});

test("T12.g+ 新しい file（scripts/working-state/ と tests/working-state-*）は 300 行以内。ちょうど 300 行は通り、301 行は失敗", () => {
  const texts = sx.loadWorkTexts();
  assert.equal(texts.size > 0, true);
  assert.deepEqual(sx.sizeViolations(texts), []);
  assert.deepEqual(sx.sizeViolations(only("f.mjs", "x\n".repeat(300))), []);
  flagged(sx.sizeViolations(only("f.mjs", "x\n".repeat(301))), "f.mjs");
});

test("T12.h+ import は Node の組込み（node: 付き）と、実在する相対 path だけ。bare specifier・動的な import・require・実在しない相対 path は失敗", () => {
  assert.deepEqual(sx.importSpecifierViolations(sx.loadWorkTexts(), sx.resolvesOnDisk), []);
  const check = (text) => sx.importSpecifierViolations(only("scripts/working-state/x.mjs", `${text}\n`), () => true);
  for (const line of ['import x from "left-pad";', 'const m = await import("lodash");', 'const r = require("x");', 'import fs from "fs";', 'import x from "node:no-such-module";', 'export * from "@scope/pkg";']) flagged(check(line), "x.mjs");
  for (const line of ['import path from "node:path";', 'import { x } from "./a.mjs";', 'import { y } from "../../tests/b.mjs";', 'import fsp from "node:fs/promises";']) assert.deepEqual(check(line), []);
  flagged(sx.importSpecifierViolations(only("scripts/working-state/x.mjs", 'import { x } from "./missing.mjs";\n'), () => false), "missing.mjs");
});

test("T12.i+ 開いた形の値: 判定の関数の file は何も import せず、LC2・LC5 が同じ 1 つを呼ぶ（定義の複製が無い）。核の例外の文面に値が入らない", () => {
  assert.deepEqual(sx.openFormStaticViolations(real), []);
  flagged(sx.openFormStaticViolations(new Map([["value-exposure.mjs", 'import { digestOf } from "./canonical.mjs";\nexport const classifyValue = () => 1;\n']])), "value-exposure.mjs");
  flagged(sx.openFormStaticViolations(new Map([["value-exposure.mjs", "export const classifyValue = () => 1;\n"], ["observation-fields.mjs", "const x = 1;\n"], ["answers.mjs", 'import { rejectionReasonOf } from "./value-exposure.mjs";\n']])), "observation-fields.mjs");
  flagged(sx.openFormStaticViolations(only("normalize.mjs", "throw new TypeError(`bad value ${value}`);\n")), "normalize.mjs");
  flagged(sx.openFormStaticViolations(only("normalize.mjs", 'throw new TypeError("bad " + value);\n')), "normalize.mjs");
  assert.deepEqual(sx.openFormStaticViolations(only("normalize.mjs", 'throw new TypeError("length must be a non-negative integer");\n')), []);
});
