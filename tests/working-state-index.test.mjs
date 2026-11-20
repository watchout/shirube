// U2 集約 file（index.mjs）と knip の entry（R-09・NFR10.1・Q6 = A）。公開の記号は集約 file から全部 import でき、knip の entry は 1 件だけ足す（ignore には足さない）。
// 核・LC6 は `export *`、LC1（file の読取り・子 process）は公開の記号だけを名前で再 export する（内部の受け渡しの記号は出さない）。
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";

const DIR = new URL("../scripts/working-state/", import.meta.url);
const LC1_FILES = new Set(["read-file.mjs", "probe-path.mjs", "probe-run.mjs", "probe-tool.mjs"]);
// 内側の部品: observation.mjs の中だけで使う observation-fields（外から呼ぶ入口は observeAll）と、source-extract の中だけで使う
// 呼び出し workflow の取り出し（workflow-caller・workflow-lines・workflow-tree。外から呼ぶ入口は parseSourceContent・pickItem）。公開の記号ではない。
const INTERNAL_FILES = new Set(["observation-fields.mjs", "workflow-caller.mjs", "workflow-lines.mjs", "workflow-tree.mjs"]);
const LC1_PUBLIC = ["CHUNK_BYTES", "loadBudgetProfile", "probeToolFact", "readFileFact", "readResolvedFile", "resolveFile"];
const LC1_INTERNAL = ["REAL_CLOCK", "identityOf", "killGroupOf", "locateTool", "readProfile", "runChild"];

const knipConfig = () => JSON.parse(readFileSync(new URL("../knip.jsonc", import.meta.url), "utf8").split("\n").filter((line) => !line.trimStart().startsWith("//")).join("\n"));

test("T11.1 核・LC6 の file が export する記号は、全部、集約 file から import できる（`export *`。値が同じ）。observation.mjs だけが使う内部の部品は出さない", async () => {
  const names = readdirSync(DIR).filter((name) => name !== "index.mjs" && !LC1_FILES.has(name) && !INTERNAL_FILES.has(name));
  assert.equal(names.length > 0, true);
  assert.equal("interpretItem" in ws, false);
  for (const symbol of ["readCallerRefs", "readContentLines", "classifyBody", "readWorkflowTree"]) assert.equal(symbol in ws, false, symbol);
  for (const name of names) {
    const module = await import(new URL(name, DIR));
    for (const [symbol, value] of Object.entries(module)) assert.equal(ws[symbol], value, `${name}:${symbol}`);
  }
});

test("T11.2 LC1 の公開の記号（file の読取り・子 process の確かめ・試験が使う定数）は集約 file から import できる。内部の受け渡しの記号は出さない", async () => {
  const read = await import("../scripts/working-state/read-file.mjs");
  const probe = await import("../scripts/working-state/probe-tool.mjs");
  for (const symbol of LC1_PUBLIC) {
    assert.notEqual(ws[symbol], undefined, symbol);
    assert.equal(ws[symbol], read[symbol] ?? probe[symbol], symbol);
  }
  for (const symbol of LC1_INTERNAL) assert.equal(symbol in ws, false, symbol);
});

test("T11.3 knip の entry に集約 file を 1 件だけ足す。ignore には足さず、既存の entry・project・ignore は変えない", () => {
  const config = knipConfig();
  assert.equal(config.entry.filter((entry) => entry === "scripts/working-state/index.mjs!").length, 1);
  assert.equal(config.entry.some((entry) => entry.includes("working-state") && entry !== "scripts/working-state/index.mjs!"), false);
  assert.equal(config.ignore.some((entry) => entry.includes("working-state")), false);
  assert.deepEqual(config.entry.filter((entry) => !entry.includes("working-state")), ["scripts/hygiene/*.mjs!", "scripts/sds/*.mjs!", "scripts/unit-done/*.mjs!", "scripts/coverage-gate/cli.mjs!", "scripts/coverage-gate/events-reporter.mjs!", "configs/*.config.mjs!", "configs/profile-eslint.mjs!", "tests/*.test.mjs"]);
  assert.deepEqual(config.project, ["scripts/**/*.mjs!", "configs/**/*.mjs!", "tests/**/*.mjs"]);
  assert.deepEqual(config.ignore, ["tests/fixtures/**", "configs/dependency-cruiser.template.cjs"]);
});
