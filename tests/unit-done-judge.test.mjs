// Tests T of the unit-done core (design docs/design/unit-done-check.md v5 §4 "核 (T)"): one all-met facts file, and each case breaks one thing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { conclude, judge } from "../scripts/unit-done/judge.mjs";

const GOOD = JSON.parse(readFileSync(new URL("./fixtures/unit-done/facts-good.json", import.meta.url), "utf8"));
const CORE = new URL("../scripts/unit-done/judge.mjs", import.meta.url);
const made = (change = () => {}) => { const f = structuredClone(GOOD); change(f); return judge(f); };
const item = (r, id) => r.items.find((i) => i.id === id);
const cases = (f) => f.results["junit-unit"].cases;
const k6 = (letter, value) => (f) => { f.prs["72"].k6[letter] = value; };
const exception = { item: "K5", target: "#72", owner_decision: "OD-EXAMPLE-001", url: "https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-1", sha256: "a".repeat(64) };
const bad = (f) => { f.prs["72"].first_commit.files.push({ path: "src/x.mjs", status: "added" }); };
const noJunit = (f) => { f.profile.facts = f.profile.facts.filter((x) => x.kind !== "junit"); };
const own = (f) => { f.checklist.conditions["common-1"] = { text_sha256: "1".repeat(64), audit: "this condition is read by the audit of the closing pr" }; };

// [name, change, item, value, part of a finding that must show]
const TABLE = [
  ["T-2 a failed test", (f) => { cases(f)[0].status = "fail"; }, "K1", "unmet", "t1"],
  ["T-3 skip", (f) => { cases(f)[1].status = "skip"; }, "K1", "unmet", "skip"],
  ["T-3 todo", (f) => { cases(f)[1].status = "todo"; }, "K1", "unmet", "todo"],
  ["T-4 no test", (f) => { cases(f).length = 0; }, "K1", "unmet", "0 tests"],
  ["T-5 job failed", (f) => { f.results["junit-unit"].conclusion = "failure"; }, "K1", "unmet", "failure"],
  ["K1 not read", (f) => { f.results["junit-unit"] = null; }, "K1", "unobserved", "not read"],
  ["T-6 exit code 1", (f) => { f.results.coverage.coverage.exit_code = 1; }, "K2", "unmet", "exit_code 1"],
  ["T-6 threshold 79", (f) => { f.results.coverage.coverage.lines_threshold = 79; }, "K2", "unmet", "79"],
  ["K2 job failed", (f) => { f.results.coverage.conclusion = "failure"; }, "K2", "unmet", "failure"],
  ["K2 not read", (f) => { delete f.results.coverage; }, "K2", "unobserved", "not read"],
  ["T-7 AC missing from the checklist", (f) => { delete f.checklist.acceptance["AC1.1.2"]; }, "K3", "unmet", "AC1.1.2"],
  ["T-7b AC not in the set", (f) => { f.checklist.acceptance["AC9.9.9"] = ["x"]; }, "K3", "unmet", "AC9.9.9"],
  ["T-8 test name not in junit", (f) => { f.checklist.acceptance["AC1.1.1"] = ["tests/a.test.mjs::suite::none"]; }, "K3", "unmet", "not in junit"],
  ["K3 acceptance not extracted", (f) => { f.source.acceptance = null; f.source.reasons = { acceptance: "unit not in story map" }; }, "K3", "unobserved", "unit not in story map"],
  ["T-9 case without test or reason", (f) => { delete f.checklist.design_cases["E-1"]; }, "K4", "unmet", "E-1"],
  ["T-9 empty reason", (f) => { f.checklist.design_refs["R-01"] = " "; }, "K4", "unmet", "R-01"],
  ["T-9b no design record in the handoff", (f) => { f.design.records = []; }, "K4", "unobserved", "design record"],
  ["T-9c one record fewer", (f) => { f.checklist.design_records = []; }, "K4", "unmet", "u2-example.md"],
  ["T-9c one record more", (f) => { f.checklist.design_records.push("docs/design/other.md"); }, "K4", "unmet", "other.md"],
  ["T-9d no id in the section", (f) => { f.design.ids["docs/design/u2-example.md"] = []; }, "K4", "unobserved", "case id"],
  ["T-10 first commit holds code", bad, "K5", "unmet", "src/x.mjs"],
  ["T-10b first commit docs only", (f) => { f.prs["72"].first_commit.files = [{ path: "docs/a.md", status: "added" }]; }, "K5", "unmet", "no test"],
  ["T-10b empty first commit", (f) => { f.prs["72"].first_commit.files = []; }, "K5", "unmet", "no test"],
  ["K5 first commit not read", (f) => { f.prs["72"].first_commit = null; }, "K5", "unobserved", "first commit"],
  ["T-11 docs-only pr is out of K5", (f) => { f.prs["72"].files = ["docs/a.md"]; f.prs["72"].first_commit.files = [{ path: "src/x.mjs", status: "added" }]; }, "K5", "met", ""],
  ["T-12b (b) of K6 unmet", k6("b", "unmet"), "K6", "unmet", "(b)"],
  ["T-12c (e) of K6 unmet", k6("e", "unmet"), "K6", "unmet", "(e)"],
  ["T-12d (f) of K6 unmet", k6("f", "unmet"), "K6", "unmet", "(f)"],
  ["T-12e (f) of K6 unobserved", k6("f", "unobserved"), "K6", "unobserved", "(f)"],
  ["K6 not met is not met", k6("a", true), "K6", "unobserved", "(a)"],
  ["T-13 node pr missing", (f) => { f.unit_prs.node_prs.push(73); }, "K7", "unmet", "#73"],
  ["T-13 unbound pr without reason", (f) => { f.checklist.unbound_prs["71"] = " "; }, "K7", "unmet", "#71"],
  ["T-13 closing pr in prs", (f) => { f.checklist.prs.push(80); }, "K7", "unmet", "#80"],
  ["T-15 copy differs from the manifest", (f) => { f.source.files[0].actual_sha256 = "zz"; }, "K3", "unobserved", "manifest"],
  ["T-15 K8 too", (f) => { f.source.files[0].actual_sha256 = "zz"; }, "K8", "unobserved", "manifest"],
  ["T-15 K9 too", (f) => { f.source.files[0].actual_sha256 = "zz"; }, "K9", "unobserved", "manifest"],
  ["T-19 demo wanted, none given", (f) => { f.checklist.demo = []; }, "K8", "unmet", "no test"],
  ["T-19 no demo in the plan", (f) => { f.checklist.demo = []; f.source.delivery.has_demo = false; }, "K8", "not_applicable", ""],
  ["T-20 plan condition missing", (f) => { delete f.checklist.conditions["dod-1"]; }, "K9", "unmet", "dod-1"],
  ["T-20b text_sha256 differs", (f) => { f.checklist.conditions["dod-1"].text_sha256 = "0".repeat(64); }, "K9", "unmet", "text_sha256"],
  ["T-20c empty audit reason", (f) => { f.checklist.conditions["story:US3.3"].audit = " "; }, "K9", "unmet", "story:US3.3"],
  ["T-20d K it points at is unmet", (f) => { f.results.coverage.coverage.exit_code = 1; f.checklist.conditions["common-1"].k = "K2"; }, "K9", "unmet", "K2"],
  ["K9 no unit condition", (f) => { f.source.delivery.dod = []; }, "K9", "unobserved", "unit condition"],
  ["K9 common conditions not read are not empty", (f) => { f.source.delivery.common = null; delete f.checklist.conditions["common-1"]; }, "K9", "unobserved", "not extracted"],
  ["K9 story conditions not read are not empty", (f) => { delete f.source.story_conditions; delete f.checklist.conditions["story:US3.3"]; }, "K9", "unobserved", "not extracted"],
  ["K9 common conditions read as empty", (f) => { f.source.delivery.common = []; delete f.checklist.conditions["common-1"]; }, "K9", "met", ""],
  ["K9 story conditions read as empty", (f) => { f.source.story_conditions = []; delete f.checklist.conditions["story:US3.3"]; }, "K9", "met", ""],
  ["K8 has_demo missing is not no demo", (f) => { delete f.source.delivery.has_demo; f.checklist.demo = ["tests/none"]; }, "K8", "unobserved", "has_demo"],
  ["K8 has_demo null is not no demo", (f) => { f.source.delivery.has_demo = null; f.checklist.demo = []; }, "K8", "unobserved", "has_demo"],
  ["K1 no junit fact in the profile", noJunit, "K1", "unobserved", "no junit fact"],
  ["K2 no threshold", (f) => { delete f.results.coverage.coverage.lines_threshold; }, "K2", "unmet", "undefined"],
  ["K2 a threshold string is not a number", (f) => { f.results.coverage.coverage.lines_threshold = "80"; }, "K2", "unmet", "integer"],
  ["K2 a threshold array is not a number", (f) => { f.results.coverage.coverage.lines_threshold = [80]; }, "K2", "unmet", "integer"],
  ["K2 a threshold must be an integer", (f) => { f.results.coverage.coverage.lines_threshold = 80.5; }, "K2", "unmet", "integer"],
  ["K2 a higher integer threshold", (f) => { f.results.coverage.coverage.lines_threshold = 100; }, "K2", "met", ""],
  ["K3 a failed test", (f) => { cases(f)[0].status = "fail"; }, "K3", "unmet", "did not pass"],
  ["K3 no junit fact: not read, not missing", noJunit, "K3", "unobserved", "junit fact was not read"],
  ["K3 a second junit fact not read", (f) => { f.profile.facts.push({ name: "junit-it", job: "it", kind: "junit" }); f.checklist.acceptance["AC1.1.1"] = ["tests/a.test.mjs::suite::none"]; }, "K3", "unobserved", "not read"],
  ["K3 an empty source", (f) => { f.source.files = []; }, "K3", "unobserved", "manifest"],
  ["K3 fingerprints both missing", (f) => { f.source.files = [{ role: "stories" }]; }, "K3", "unobserved", "manifest"],
  ["K4 an empty case list with a reason", (f) => { f.checklist.design_cases["E-1"] = []; f.checklist.design_refs["E-1"] = "a reason"; }, "K4", "met", ""],
  ["K5 first commit removes the test", (f) => { f.prs["72"].first_commit.files = [{ path: "tests/a.test.mjs", status: "removed" }]; }, "K5", "unmet", "no test"],
  ["K5 first commit adds a test and a doc", (f) => { f.prs["72"].first_commit.files.push({ path: "docs/a.md", status: "added" }); }, "K5", "met", ""],
  ["K5 a star stays inside one directory", (f) => { f.profile.code_paths = ["src/*.mjs", "lib/a.b"]; f.prs["72"].files = ["src/deep/x.mjs", "lib/aXb"]; bad(f); }, "K5", "met", ""],
  ["K5 a dot is a dot", (f) => { f.profile.code_paths = ["lib/a.b"]; f.prs["72"].files = ["lib/a.b"]; bad(f); }, "K5", "unmet", "src/x.mjs"],
  ["K6 audit record not read", (f) => { delete f.prs["72"].k6; }, "K6", "unobserved", "audit record not read"],
  ["K7 unit prs not read", (f) => { delete f.unit_prs; }, "K7", "unobserved", "unit prs not read"],
  ["K7 the closing pr not read", (f) => { delete f.unit_prs.closing; }, "K7", "unobserved", "unit prs not read"],
  ["K5 a file list that holds no path is not read", (f) => { f.prs["72"].files = [null]; }, "K5", "unobserved", "files not read"],
  ["K5 a first commit that holds no path is not read", (f) => { f.prs["72"].first_commit.files = [null]; }, "K5", "unobserved", "first commit"],
  ["an exception for another item", (f) => { bad(f); f.checklist.exceptions = [{ ...exception, item: "K1" }]; }, "K5", "unmet", "src/x.mjs"],
  ["an exception without owner_decision", (f) => { bad(f); f.checklist.exceptions = [{ ...exception, owner_decision: "" }]; }, "K5", "unmet", "src/x.mjs"],
  ["T-16 a valid exception", (f) => { bad(f); f.checklist.exceptions = [exception]; }, "K5", "excepted", "src/x.mjs"],
  ["T-17 an exception without sha256", (f) => { bad(f); f.checklist.exceptions = [{ ...exception, sha256: "" }]; }, "K5", "unmet", "src/x.mjs"],
  ["T-17 an exception with another url", (f) => { bad(f); f.checklist.exceptions = [{ ...exception, url: "https://example.com/a#issuecomment-1" }]; }, "K5", "unmet", "src/x.mjs"],
  ["an exception for another target", (f) => { bad(f); f.checklist.exceptions = [{ ...exception, target: "#71" }]; }, "K5", "unmet", "src/x.mjs"],
];

for (const [name, change, id, value, shown] of TABLE) {
  test(name, () => {
    const got = item(made(change), id);
    assert.equal(got.value, value);
    assert.ok(JSON.stringify(got.findings).includes(shown), `${shown} in ${JSON.stringify(got.findings)}`);
  });
}

test("T-1 all met: PASS and a success status", () => {
  const r = made();
  assert.deepEqual([r.result, r.status], ["PASS", { state: "success", description: "PASS" }]);
  assert.deepEqual(r.items.map((i) => i.value), Array(9).fill("met"));
});

test("T-14 an unobserved fact is a FAIL; the status names the first item", () => {
  const r = made((f) => { delete f.results.coverage; });
  assert.deepEqual([r.result, r.status.state], ["FAIL", "failure"]);
  assert.match(r.status.description, /^K2 unobserved/);
  assert.ok(r.status.description.length <= 140);
});

test("T-16 a valid exception: PASS_WITH_EXCEPTIONS with the list; T-16c an unmet K3 on top is a FAIL naming K3", () => {
  const r = made((f) => { bad(f); own(f); f.checklist.exceptions = [exception]; f.source.delivery.has_demo = false; f.checklist.demo = []; });
  assert.deepEqual([r.result, r.status, r.exceptions.length], ["PASS_WITH_EXCEPTIONS", { state: "success", description: "PASS_WITH_EXCEPTIONS 1" }, 1]);
  const worse = made((f) => { bad(f); own(f); f.checklist.exceptions = [exception]; delete f.checklist.acceptance["AC1.1.1"]; });
  assert.deepEqual([worse.result, worse.status.description], ["FAIL", "K3 unmet: AC1.1.1 no test named"]);
});

test("a condition that points at a K which is only excepted is unmet, until that condition has its own exception", () => {
  const pointing = (f) => { bad(f); f.checklist.exceptions = [exception]; };
  assert.deepEqual([item(made(pointing), "K5").value, item(made(pointing), "K9").value], ["excepted", "unmet"]);
  const both = made((f) => { pointing(f); f.checklist.exceptions.push({ ...exception, item: "K9", target: "common-1" }); });
  assert.deepEqual([both.result, item(both, "K9").value], ["PASS_WITH_EXCEPTIONS", "excepted"]);
});

test("T-16d a value K8 only may have: anywhere else it becomes unmet; T-16e every mix lands in exactly one branch", () => {
  const r = conclude(["K5", "K8"].map((id) => ({ id, value: "not_applicable" })));
  assert.deepEqual(r.items.map((i) => i.value), ["unmet", "not_applicable"]);
  assert.equal(r.result, "FAIL");
  const m = (...values) => conclude(values.map((value, i) => ({ id: i === values.length - 1 && value === "not_applicable" ? "K8" : `K${i + 1}`, value }))).result;
  assert.equal(m("met", "met"), "PASS");
  assert.equal(m("met", "not_applicable"), "PASS");
  assert.equal(m("met", "excepted"), "PASS_WITH_EXCEPTIONS");
  assert.equal(m("met", "excepted", "not_applicable"), "PASS_WITH_EXCEPTIONS");
  for (const worst of ["unmet", "unobserved", "nonsense"]) for (const rest of [["met"], ["excepted"], ["excepted", "not_applicable"]]) assert.equal(m(worst, ...rest), "FAIL");
  assert.equal(conclude([]).result, "FAIL");
});

test("T-18 the same facts give the same bytes; a bad facts file is a FAIL, never an exception", () => {
  assert.equal(JSON.stringify(made()), JSON.stringify(made()));
  for (const change of [(f) => { f.schema = "x"; }, (f) => { delete f.checklist; }, (f) => { f.checklist.schema = "sds-unit-done-checklist/1"; }, (f) => { f.profile.code_paths = "src/**"; }, (f) => { f.profile.auditor_login = ""; }, (f) => { f.profile.facts = {}; }, (f) => { delete f.profile.test_paths; }]) {
    const r = made(change);
    assert.deepEqual([r.result, r.status.state, r.items], ["FAIL", "failure", []]);
  }
  assert.equal(judge(null).result, "FAIL");
});

test("what was not read is never an empty set: the whole answer is a FAIL", () => {
  for (const change of [(f) => { f.source.delivery.common = null; delete f.checklist.conditions["common-1"]; }, (f) => { delete f.source.delivery.has_demo; }]) assert.equal(made(change).result, "FAIL");
});

test("a value the core cannot read is a FAIL with a reason and no items, never an exception", () => {
  const broken = [(f) => { f.profile.facts = [null]; }, (f) => { f.profile.facts = [{ kind: "junit" }]; }, (f) => { f.profile.code_paths = [null]; }, (f) => { f.profile.code_paths = []; }, (f) => { f.profile.test_paths = [80]; },
    (f) => { f.source.files = [null]; }, (f) => { f.source.delivery.dod = [null]; }, (f) => { f.checklist.design_cases = null; }, (f) => { f.checklist.design_refs = null; }, (f) => { f.results["junit-unit"].cases = [null]; }];
  for (const change of broken) {
    const r = made(change);
    assert.deepEqual([r.result, r.items, r.status.state], ["FAIL", [], "failure"]);
    assert.ok(r.status.description.length > 0);
  }
});

test("the core reads no clock, random source, file, network or child process (S4)", () => {
  const source = readFileSync(CORE, "utf8");
  for (const word of ["Date.now", "new Date()", "Math.random", "randomUUID", "node:fs", "fetch", "child_process"]) assert.ok(!source.includes(word), word);
});

test("the status description is cut to 140 characters", () => {
  assert.equal(made((f) => { cases(f)[0] = { id: `tests/a.test.mjs::suite::${"x".repeat(200)}`, status: "fail" }; }).status.description.length, 140);
});

test("a finding is made once: a case id two design records name, and the unit-closing pr", () => {
  const twice = made((f) => { f.design.records.push("docs/design/b.md"); f.design.ids["docs/design/b.md"] = ["E-1"]; f.checklist.design_records.push("docs/design/b.md"); delete f.checklist.design_cases["E-1"]; });
  assert.equal(item(twice, "K4").findings.length, 1);
  assert.equal(item(made((f) => { f.checklist.prs.push(80); }), "K7").findings.length, 1);
});
