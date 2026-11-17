// Backward compatibility (BR8.5, NFR8.1): a run with no threshold and no mode gives the same four surfaces as U3, byte
// for byte, on the four paths: match, mismatch, unobservable and an input failure.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runCli } from "../scripts/coverage-gate/cli.mjs";
import { judge } from "../scripts/coverage-gate/judge.mjs";
import { buildDocument, buildInputFailureDocument, renderJson, renderNotice, renderOutputs, renderSummary } from "../scripts/coverage-gate/report.mjs";
import { PASS_TEST, SOURCE_A, makeRepo, removeDir } from "./coverage-gate-fixtures.mjs";
import { GOLDEN_FAILING_INPUT, GOLDEN_INPUT, GOLDEN_MEASUREMENTS, GOLDEN_PATHS } from "./coverage-gate-golden.mjs";
import { GOLDEN } from "./coverage-gate-golden-text.mjs";

const repo = makeRepo({ "src/a.mjs": SOURCE_A, "tests/a.test.mjs": PASS_TEST, "input.json": GOLDEN_INPUT, "bad.json": GOLDEN_FAILING_INPUT });
test.after(() => removeDir(repo));

const FAILURE = { reasonCode: "INPUT_FIELD_UNKNOWN", field: "excludes", detail: "The input has a field this version does not accept: excludes." };

function documentFor(name) {
  if (name === "inputFailure") return buildInputFailureDocument({ runId: "local", failure: FAILURE });
  const measurement = GOLDEN_MEASUREMENTS[name]();
  const denominatorPaths = ["src/a.mjs"];
  const verdict = judge({ denominatorPaths, requiredTestPaths: ["tests/a.test.mjs"], measurement });
  return buildDocument({ runId: "local", declaredTargets: ["src"], denominatorPaths, measurement, verdict });
}

test("the golden covers the four paths and each has the four surfaces", () => {
  assert.deepEqual(Object.keys(GOLDEN), [...GOLDEN_PATHS]);
  for (const name of GOLDEN_PATHS) assert.deepEqual(Object.keys(GOLDEN[name]), ["exitCode", "json", "summary", "notice", "outputs"], name);
});

test("the report builds the four surfaces of a run with no threshold and no mode exactly as the golden says", () => {
  for (const name of GOLDEN_PATHS) {
    const document = documentFor(name);
    assert.equal(renderJson(document), GOLDEN[name].json, `${name} json`);
    assert.equal(renderSummary(document), GOLDEN[name].summary, `${name} summary`);
    assert.equal(`${renderNotice(document)}\n`, GOLDEN[name].notice, `${name} notice`);
    assert.equal(renderOutputs(document), GOLDEN[name].outputs, `${name} outputs`);
  }
});

test("the entry point writes the four surfaces of a run with no threshold and no mode exactly as the golden says, with the golden exit code", async () => {
  for (const name of GOLDEN_PATHS) {
    let notice = "";
    const env = { GITHUB_STEP_SUMMARY: join(repo, `s-${name}.md`), GITHUB_OUTPUT: join(repo, `o-${name}.txt`) };
    const argv = ["--input", name === "inputFailure" ? "bad.json" : "input.json", "--result", `r-${name}.json`];
    const measure = async () => GOLDEN_MEASUREMENTS[name]();
    const code = await runCli({ argv, env, cwd: repo, stdout: { write: (t) => { notice += t; } }, stderr: { write: () => {} }, measure });
    assert.equal(code, GOLDEN[name].exitCode, `${name} exit code`);
    assert.equal(readFileSync(join(repo, `r-${name}.json`), "utf8"), GOLDEN[name].json, `${name} json`);
    assert.equal(readFileSync(join(repo, `s-${name}.md`), "utf8"), GOLDEN[name].summary, `${name} summary`);
    assert.equal(notice, GOLDEN[name].notice, `${name} notice`);
    assert.equal(readFileSync(join(repo, `o-${name}.txt`), "utf8"), GOLDEN[name].outputs, `${name} outputs`);
  }
});
