import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { apply as applyKit, check as checkKit, legacyParts, render, status } from "../scripts/sds/kit.mjs";

// Tests read kit parts from this working tree under fake commits; production reads them with git at the pinned commit.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const src = (commit, p) => readFileSync(join(ROOT, p), "utf8");
const apply = (args) => applyKit(args, src);
const check = (args) => checkKit(args, src);
const none = () => [];

const A = "a".repeat(40), B = "b".repeat(40);
const OLD = "<!-- shirube-v3-runtime:start -->\n# Shirube V3 Runtime Overlay\npolicy_ref: /Users/x\n<!-- shirube-v3-runtime:end -->\n";
function consumer(files) {
  const dir = mkdtempSync(join(tmpdir(), "sds-kit-"));
  for (const [p, s] of Object.entries(files)) { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), s); }
  return dir;
}
const read = (dir, p) => readFileSync(join(dir, p), "utf8");
// A read-only fake of the GitHub contents API over a { path: text } map; anything else is a 404.
const fakeApi = (files) => (path) => {
  const p = path.replace(/^repos\/watchout\/x\/contents\//, "");
  if (p === ".github/workflows") return Object.keys(files).filter((f) => f.startsWith(".github/workflows/")).map((f) => ({ name: f.split("/").pop(), path: f }));
  if (!(p in files)) throw new Error("gh: Not Found (HTTP 404)");
  return { content: Buffer.from(files[p]).toString("base64") };
};

test("apply replaces the V3 managed block in place, keeps repo text, pins the kit, and check is OK", () => {
  const dir = consumer({ "CLAUDE.md": `# Repo rules\n\n${OLD}\nlocal note\n` });
  const out = apply({ target: dir, commit: A, protected: "none" });
  assert.deepEqual(out.written.sort(), [".claude/skills/sds-audit/SKILL.md", ".github/pull_request_template.md", ".github/workflows/sds-gate.yml", ".shirube/sds-pin.json", "CLAUDE.md"].sort());
  assert.match(read(dir, ".github/pull_request_template.md"), /```json sds-pr/);
  const claude = read(dir, "CLAUDE.md");
  assert.match(claude, /^# Repo rules/); assert.match(claude, /local note/);
  assert.doesNotMatch(claude, /shirube-v3-runtime/); assert.match(claude, new RegExp(`watchout/shirube@${A}`));
  assert.match(read(dir, ".github/workflows/sds-gate.yml"), new RegExp(`sds-gate.yml@${A}`));
  const pin = JSON.parse(read(dir, ".shirube/sds-pin.json"));
  assert.equal(pin.sds_commit, A); assert.ok(pin.protected_paths.includes(".github/workflows/**"));
  assert.deepEqual(check({ target: dir }), { command: "check", verdict: "OK", sds_commit: A, findings: [], legacy: [], stale_refs: [] });
});
test("upgrade replaces the SDS-V2 block once and re-pins; re-applying is idempotent", () => {
  const dir = consumer({ "AGENTS.md": "# Agents\n" });
  apply({ target: dir, commit: A, protected: "none" }); apply({ target: dir, commit: B, protected: "none" }); apply({ target: dir, commit: B, protected: "none" });
  const agents = read(dir, "AGENTS.md");
  assert.equal(agents.match(/sds-v2:start/g).length, 1); assert.doesNotMatch(agents, new RegExp(A));
  assert.equal(check({ target: dir }).verdict, "OK");
});
test("check reports drift and old parts without changing anything", () => {
  const dir = consumer({ "CLAUDE.md": "x\n", ".shirube/runtime/rapid-lite/lib.mjs": "", ".github/workflows/merge-authority.yml": "" });
  apply({ target: dir, commit: A, protected: "none" });
  writeFileSync(join(dir, ".claude/skills/sds-audit/SKILL.md"), "edited");
  const r = check({ target: dir });
  assert.equal(r.verdict, "DRIFT");
  assert.deepEqual(r.findings, [".claude/skills/sds-audit/SKILL.md differs from the pin"]);
  assert.deepEqual(r.legacy, [".shirube/runtime", ".github/workflows/merge-authority.yml"]);
});
test("a repo without the kit is DRIFT; an unpinned commit is refused", () => {
  assert.equal(check({ target: consumer({ "CLAUDE.md": OLD }) }).legacy[0], "CLAUDE.md#shirube-v3-runtime");
  assert.throws(() => apply({ target: consumer({}), commit: "main", protected: "none" }), /40-hex/);
});
test("legacyParts works over any read source (used by status through the API)", () => {
  const files = { ".framework": "", "AGENTS.md": OLD };
  assert.deepEqual(legacyParts((p) => p in files, (p) => files[p], none), [".framework", "AGENTS.md#shirube-v3-runtime"]);
});
test("check lists active entries that still call removed parts (PR36 §2.1)", () => {
  const dir = consumer({ "CLAUDE.md": "x\n", ".claude/settings.json": '{"hooks":{"PreToolUse":[{"command":".claude/hooks/pre-code-gate.sh"}]}}', ".claude/skills/implement/SKILL.md": "check .framework/gates.json", ".claude/hooks/post-task.sh": "bash .claude/hooks/framework-runner.sh",
    ".codex/instructions.md": "read .framework/gates.json", ".agents/skills/shirube-v3-runtime/SKILL.md": "run .shirube/runtime/rapid-lite", ".claude/agents/shirube-v3-check.md": "merge-authority" });
  apply({ target: dir, commit: A, protected: "none" });
  const r = check({ target: dir });
  assert.equal(r.verdict, "DRIFT");
  assert.deepEqual(r.stale_refs.sort(), [".claude/hooks/post-task.sh -> framework-runner", ".claude/settings.json -> pre-code-gate", ".claude/skills/implement/SKILL.md -> .framework",
    ".codex/instructions.md -> .framework", ".agents/skills/shirube-v3-runtime/SKILL.md -> .shirube/runtime", ".agents/skills/shirube-v3-runtime/SKILL.md -> rapid-lite",
    ".claude/agents/shirube-v3-check.md -> merge-authority"].sort());
});
test("apply needs the repo's protected paths explicitly and records adoption time (ARC A, C)", () => {
  assert.throws(() => apply({ target: consumer({}), commit: A }), /--protected is required/);
  const dir = consumer({});
  apply({ target: dir, commit: A, protected: "migrations/**, src/stores/pg-migrations.ts", adoption: "https://github.com/watchout/x/issues/1#issuecomment-2", "adoption-sha256": "f".repeat(64), "adopted-at": "2026-10-08T00:00:00Z" });
  const pin = JSON.parse(read(dir, ".shirube/sds-pin.json"));
  assert.ok(pin.protected_paths.includes("migrations/**") && pin.protected_paths.includes(".github/workflows/**"));
  assert.equal(pin.adoption.adopted_at, "2026-10-08T00:00:00Z");
});
test("status reads every workflow for the pinned shirube sha and reports drift read-only (ARC D)", () => {
  const files = {
    ".shirube/sds-pin.json": JSON.stringify({ sds_commit: A, kit_version: "0.1.0" }),
    ".github/workflows/ci.yml": `uses: watchout/shirube/.github/workflows/hygiene.yml@${A}`,
    ".github/workflows/sds-gate.yml": `uses: watchout/shirube/.github/workflows/sds-gate.yml@${B}`,
  };
  const [r] = status(fakeApi(files), [{ repo: "watchout/x" }]);
  assert.equal(r.sds_commit, A); assert.equal(r.hygiene_pin_match, false); assert.deepEqual(r.legacy, []);
  // F03: a branch or tag ref (@main, @v1) is not a match.
  const run = (refs) => {
    const files = { ".shirube/sds-pin.json": JSON.stringify({ sds_commit: A, files: {} }) };
    refs.forEach((r, i) => { files[`.github/workflows/w${i}.yaml`] = `uses: watchout/shirube/.github/workflows/hygiene.yml@${r}`; });
    return status(fakeApi(files), [{ repo: "watchout/x" }])[0].hygiene_pin_match;
  };
  assert.deepEqual([run([A, A]), run([A, "main"]), run([A, "v1"]), run([])], [true, false, false, null]);
});

test("kit parts come from the pinned commit itself; a commit that is not in the shirube history is refused", () => {
  assert.throws(() => render("0".repeat(40)), /0{40}/);
});
test("a file holding both an old and an SDS-V2 block ends with exactly one SDS-V2 block", () => {
  const dir = consumer({ "CLAUDE.md": "# R\n" });
  apply({ target: dir, commit: A, protected: "none" });
  writeFileSync(join(dir, "CLAUDE.md"), `${OLD}\n${read(dir, "CLAUDE.md")}`);
  apply({ target: dir, commit: B, protected: "none" });
  const text = read(dir, "CLAUDE.md");
  assert.equal(text.match(/sds-v2:start/g).length, 1); assert.doesNotMatch(text, /shirube-v3-runtime/); assert.match(text, /# R/);
});
test("upgrade keeps the pin's own protected paths and adoption when they are not given again", () => {
  const dir = consumer({});
  const adoption = { adoption: "https://github.com/watchout/x/issues/1#issuecomment-2", "adoption-sha256": "f".repeat(64), "adopted-at": "2026-10-08T00:00:00Z" };
  apply({ target: dir, commit: A, protected: "migrations/**", ...adoption });
  const out = apply({ target: dir, commit: B, protected: "none" });
  const pin = JSON.parse(read(dir, ".shirube/sds-pin.json"));
  assert.ok(pin.protected_paths.includes("migrations/**")); assert.equal(pin.adoption.sha256, "f".repeat(64)); assert.equal(out.adoption, "RECORDED");
});
test("an adoption needs its body SHA-256 and an ISO time; without one the pin says it is not recorded", () => {
  const ref = "https://github.com/watchout/x/issues/1#issuecomment-2";
  assert.throws(() => apply({ target: consumer({}), commit: A, protected: "none", adoption: ref }), /--adoption-sha256/);
  assert.throws(() => apply({ target: consumer({}), commit: A, protected: "none", adoption: ref, "adoption-sha256": "f".repeat(64), "adopted-at": "yesterday" }), /ISO 8601/);
  assert.equal(apply({ target: consumer({}), commit: A, protected: "none" }).adoption, "NOT_RECORDED");
  const dir = consumer({}), before = Date.now(); // F05: an omitted --adopted-at records the apply time
  apply({ target: dir, commit: A, protected: "none", adoption: ref, "adoption-sha256": "f".repeat(64) });
  const at = Date.parse(JSON.parse(read(dir, ".shirube/sds-pin.json")).adoption.adopted_at);
  assert.ok(at >= before - 1000 && at <= Date.now() + 1000, "adopted_at is the apply time");
});
test("check finds the V3 state files, profiles/, old hooks, the shirube_v3 profile section and the Pre-Code Gate section", () => {
  const dir = consumer({ "CLAUDE.md": "## Pre-Code Gate\nx\n", ".shirube/execution-context.json": "{}", ".shirube/route-policy.yaml": "", ".shirube/profiles/a.json": "",
    ".shirube/profile.json": '{"shirube_v3":{}}', ".shirube/hygiene-profile.md": "", ".claude/hooks/skill-tracker.sh": "", ".claude/hooks/gate-quality.sh": "", ".claude/hooks/channel-routing.sh": "" });
  assert.deepEqual(check({ target: dir }).legacy.sort(), [".shirube/profiles", ".shirube/execution-context.json", ".shirube/route-policy.yaml",
    ".claude/hooks/gate-quality.sh", ".claude/hooks/skill-tracker.sh", ".shirube/profile.json#shirube_v3", "CLAUDE.md#pre-code-gate"].sort());
});
test("status reports the pinned files' digests and adoption, and an API failure other than 404 is UNKNOWN, not absent", () => {
  const ok = status(() => { throw new Error("gh: Not Found (HTTP 404)"); }, [{ repo: "watchout/x" }])[0];
  assert.equal(ok.verdict, "READ"); assert.equal(ok.sds_commit, null);
  const bad = status(() => { throw new Error("gh: Forbidden (HTTP 403)"); }, [{ repo: "watchout/x" }])[0];
  assert.equal(bad.verdict, "UNKNOWN"); assert.ok(bad.errors.length > 0);
  const sha = (t) => createHash("sha256").update(t).digest("hex");
  const files = { ".shirube/sds-pin.json": JSON.stringify({ sds_commit: A, files: { "a.md": sha("kit") }, adoption: { ref: "r" } }), "a.md": "edited" };
  const api = fakeApi(files);
  const r = status(api, [{ repo: "watchout/x" }])[0];
  assert.equal(r.digest_match, false); assert.deepEqual(r.adoption, { ref: "r" });
  files["a.md"] = "kit";
  assert.equal(status(api, [{ repo: "watchout/x" }])[0].digest_match, true);
  // F04: the latest adopted version, or why it is not known.
  assert.equal(r.latest_adopted, null); assert.match(r.latest_adopted_reason, /--latest/);
  assert.deepEqual([B, A].map((l) => status(api, [{ repo: "watchout/x" }], l)[0].up_to_date), [false, true]);
  assert.throws(() => status(api, [], "main"), /40-hex/);
});

// Audit 6055476241 F01-F05.
test("F01/F05: a missing instruction file or a removed block is DRIFT", () => {
  const dir = consumer({ "AGENTS.md": "# A\n" });
  apply({ target: dir, commit: A, protected: "none" });
  assert.deepEqual(JSON.parse(read(dir, ".shirube/sds-pin.json")).instructions, ["AGENTS.md"]);
  const after = (change) => { change(); return check({ target: dir }).findings; };
  assert.deepEqual(after(() => writeFileSync(join(dir, "AGENTS.md"), "# A\n")), ["AGENTS.md lacks the pinned SDS-V2 block"]);
  assert.deepEqual(after(() => rmSync(join(dir, "AGENTS.md"))), ["AGENTS.md (instruction file written by the kit) is missing"]);
});
test("F02: calls to removed hooks and the shirube- prefixed V3 state files are found", () => {
  const dir = consumer({ "CLAUDE.md": "x\n", ".claude/settings.json": '{"hooks":[{"command":"bash .claude/hooks/skill-tracker.sh"},{"command":".claude/hooks/gate-quality.sh"}]}',
    ".shirube/shirube-framework-lock.yaml": "", ".github/workflows/sds-gate.yml": "uses: x/sds-gate.yml@y" });
  apply({ target: dir, commit: A, protected: "none" });
  const { stale_refs: refs, legacy } = check({ target: dir });
  assert.deepEqual(refs.sort(), [".claude/settings.json -> hooks/gate-", ".claude/settings.json -> skill-tracker"]); assert.ok(legacy.includes(".shirube/shirube-framework-lock.yaml"));
});
