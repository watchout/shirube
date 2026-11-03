// I1b (design docs/design/u1-engine-judge.md v13 §3-1 to §3-4, §3-6, §4 tests 1, 2, 3, 3b and 6): the judgment the child process makes.
// The engine is a test double built from data: the functions the real engine exports, answering from the spec. CI never loads the real engine (§3-6).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { childJudgment, childReport } from "../scripts/sds/engine-judge.mjs";

const RECORD = "aidlc/spaces/default/intents/i1", SHARD = `${RECORD}/audit/h.md`, UNITS = ["u1", "u2"];
const stage = (slug, phase, perUnit = false) => ({ slug, phase, for_each: perUnit ? "unit-of-work" : undefined });
const GRAPH = [stage("workspace-scaffold", "initialization"), stage("workspace-detection", "initialization"), stage("state-init", "initialization"), stage("requirements", "inception"),
  stage("user-stories", "inception"), stage("functional-design", "construction", true), stage("code-generation", "construction", true), stage("build-and-test", "construction")];
const MARK = { x: "completed", S: "skipped", "-": "in-progress", " ": "pending" };
const field = (block, name) => block.match(new RegExp(`^\\*\\*${name}\\*\\*: (.*)$`, "m"))?.[1] ?? null;
const audit = (name, at, fields) => ({ event: name, timestamp: at, block: ["## X", `**Timestamp**: ${at}`, `**Event**: ${name}`, ...Object.entries(fields).map(([k, v]) => `**${k}**: ${v}`)].join("\n") });
const gate = (slug, at = "2026-11-01T00:00:00Z") => audit("GATE_APPROVED", at, { Stage: slug });
const done = (slug, unit, floor, at = "2026-11-01T00:00:00Z") => audit("UNIT_COMPLETED", at, { Stage: slug, Unit: unit, "Run floor": floor });
const HEALTHY = [gate("requirements"), gate("user-stories"), gate("build-and-test"), ...["functional-design", "code-generation"].flatMap((s) => UNITS.map((u) => done(s, u, "F1")))];

// A real directory holding the state file and one audit shard, because the child reads them and hashes the shard.
function workspace(spec) {
  const root = mkdtempSync(join(tmpdir(), "ejr-")), marks = { ...Object.fromEntries(GRAPH.map((s) => [s.slug, "x"])), ...spec.marks };
  const state = ["Scope: feature", `Construction Iteration: ${spec.iteration ?? "unit-major"}`, ...GRAPH.map((s) => `- [${marks[s.slug]}] ${s.slug} — EXECUTE`)].join("\n");
  const shard = join(root, SHARD), events = (spec.events ?? HEALTHY).map((e) => ({ ...e, shard }));
  for (const [path, text] of [[join(RECORD, "aidlc-state.md"), state], [SHARD, events.map((e) => e.block).join("\n---\n")]]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return { root, state, events, shard };
}

function engine(ws, spec) {
  const has = (list, slug, unit) => (list ?? []).includes(`${slug}:${unit}`);
  const lib = {
    loadStageGraph: () => GRAPH, isPerUnitStage: (e) => e.for_each === "unit-of-work", auditBlockField: field, auditShards: () => [ws.shard], readAuditShardEvents: () => ws.events,
    parseCheckboxes: (s) => [...s.matchAll(/^- \[(.)\] (\S+)/gm)].map(([, m, slug]) => ({ slug, state: MARK[m] })),
    getField: (s, name) => s.match(new RegExp(`^${name}: (.*)$`, "m"))?.[1] ?? null,
    resolveBoltDag: () => spec.dag ?? { state: "ok", units: UNITS, unitKinds: null }, usesStageLevelPerUnitArtifacts: () => false, isTeamUnitOwnership: () => spec.team ?? false,
    isConstructionSwarmEnabled: () => spec.swarm ?? false,
    unitMajorConstructionStageSlugs: () => spec.walk ?? ["functional-design", "code-generation"], checkSummaryConfirmationEvidence: () => ({ ok: true, summaryCoverage: "covered" }),
  };
  const orch = {
    engineSelection: () => ({ space: "default", intent: "i1", sessionId: null, binding: null }), engineRelativeRecordDir: () => RECORD, codekbCtxFor: () => ({}),
    unitLedgerFor: (root, slug) => ({ skipped: new Set(spec.skipped?.[slug] ?? []), open: (spec.open?.[slug] ?? []).map((unit) => ({ unit })) }),
    unitExempt: (st, unit, kind, ledger) => ledger.skipped.has(unit) || has(spec.vacuous, st.slug, unit),
    unitStageStop: (root, state, st, unit) => (has(spec.stops, st.slug, unit) ? { kind: "work" } : null),
  };
  return async (path) => ({ "aidlc-version.ts": { AIDLC_VERSION: "2.11.1" }, "aidlc-lib.ts": lib, "aidlc-orchestrate.ts": orch })[path.split("/").pop()];
}

const judged = async (spec = {}) => { const ws = workspace(spec); return { ...(await childJudgment(ws.root, engine(ws, spec))), ws }; };
const view = (out, slug) => out.rows.filter((r) => r.stage === slug).map((r) => [String(r.unit), r.status, r.started].join(" "));

test("initialization stages: [x] is exempt without a gate, anything else is not_approved, and none of them carries evidence (4-1)", async () => {
  const out = await judged({ marks: { "state-init": " " } });
  assert.deepEqual(out.rows.filter((r) => r.kind === "initialization").map((r) => [r.stage, r.status, r.started, r.evidence]),
    [["workspace-scaffold", "exempt", null, null], ["workspace-detection", "exempt", null, null], ["state-init", "not_approved", null, null]]);
});

test("Unit stages: the engine's own answers decide, with the newest completion as evidence; the walk's block is not used (4-2)", async () => {
  const events = [done("functional-design", "u1", "F2", "2026-11-02T00:00:00Z"), ...HEALTHY]; // listed first, newest by time
  const out = await judged({ marks: { "code-generation": "-" }, events, stops: ["functional-design:u2", "code-generation:u1", "code-generation:u2"], open: { "code-generation": ["u1"] } });
  assert.deepEqual(view(out, "functional-design"), ["u1 approved true", "u2 not_approved false"]);
  assert.deepEqual(view(out, "code-generation"), ["u1 not_approved true", "u2 not_approved false"]);
  const evidence = out.rows.find((r) => r.stage === "functional-design" && r.unit === "u1").evidence;
  assert.deepEqual([evidence.completedBlock, evidence.completedAt, evidence.runFloorOrdinal, evidence.summary.ok, evidence.sourceAuditRef], [events[0].block, "2026-11-02T00:00:00Z", 2, true, SHARD]);
  // The engine says approved but nothing records the completion, or the completion has no Run floor to number: not confirmable.
  await assert.rejects(judged({ events: HEALTHY.filter((e) => e.event !== "UNIT_COMPLETED") }), { code: "EVIDENCE_MISSING" });
  await assert.rejects(judged({ events: [...HEALTHY, audit("UNIT_COMPLETED", "2026-11-02T00:00:00Z", { Stage: "functional-design", Unit: "u1" })] }), { code: "EVIDENCE_MISSING" });
});

test("stage gates: [x] with a GATE_APPROVED is approved, [S] is exempt, [x] alone cannot be confirmed (4-3)", async () => {
  const out = await judged({ marks: { "user-stories": "S" }, events: [...HEALTHY, gate("requirements", "2026-11-02T00:00:00Z")] });
  const requirements = out.rows.find((r) => r.stage === "requirements");
  assert.deepEqual([requirements.status, requirements.started, requirements.evidence.gateOrdinal, requirements.evidence.gateAt, requirements.evidence.sourceAuditRef], ["approved", true, 2, "2026-11-02T00:00:00Z", SHARD]);
  assert.deepEqual(view(out, "user-stories"), ["null exempt false"]);
  await assert.rejects(judged({ events: HEALTHY.filter((e) => field(e.block, "Stage") !== "build-and-test") }), { code: "EVIDENCE_MISSING" });
});

test("skip and exclusion are told apart: a skipped stage, a skipped Unit and a Unit the kind leaves out are exempt, never not_approved (4-3b)", async () => {
  assert.deepEqual(view(await judged({ marks: { "code-generation": "S" } }), "code-generation"), ["u1 exempt false", "u2 exempt false"]);
  assert.deepEqual(view(await judged({ skipped: { "functional-design": ["u2"] } }), "functional-design"), ["u1 approved true", "u2 exempt false"]);
  assert.deepEqual(view(await judged({ vacuous: ["functional-design:u1"] }), "functional-design"), ["u1 exempt false", "u2 approved true"]);
  await assert.rejects(judged({ walk: ["code-generation"] }), { code: "UNSUPPORTED_SHAPE" });
});

test("started: approving upstream again does not start the stage after it; starting it again does (4-6)", async () => {
  assert.deepEqual(view(await judged({ marks: { "user-stories": " " } }), "user-stories"), ["null not_approved false"]);
  assert.deepEqual(view(await judged({ marks: { "user-stories": "-" } }), "user-stories"), ["null not_approved true"]);
  assert.deepEqual(view(await judged({}), "user-stories"), ["null approved true"]);
});

test("shapes the judgment does not cover are UNSUPPORTED_SHAPE, and the audit shards are digested as one (3-1, BR5.6)", async () => {
  await assert.rejects(judged({ dag: { state: "none" } }), { code: "UNSUPPORTED_SHAPE" });
  for (const spec of [{ team: true }, { swarm: true }, { iteration: "stage-major" }]) await assert.rejects(judged(spec), { code: "UNSUPPORTED_SHAPE" });
  const out = await judged({});
  assert.equal(out.sourceDigest, createHash("sha256").update(readFileSync(out.ws.shard)).digest("hex"));
});

test("the child's report: version and selection first, the judgment only when the version is the pinned one", async () => {
  const ws = workspace({}), good = engine(ws, {});
  assert.deepEqual(Object.keys(await childReport(ws.root, good)).sort(), ["engineVersion", "rows", "selection", "sourceDigest"]);
  const old = async (path) => (path.endsWith("aidlc-version.ts") ? { AIDLC_VERSION: "2.11.0" } : good(path));
  assert.deepEqual(Object.keys(await childReport(ws.root, old)).sort(), ["engineVersion", "selection"]);
  // Asked for an intent other than the one the engine selects, the child judges nothing: the parent then says SELECTION_MISMATCH.
  assert.equal("rows" in (await childReport(ws.root, good, { space: "default", intent: "i1" })), true);
  assert.equal("rows" in (await childReport(ws.root, good, { space: "default", intent: "other" })), false);
});
