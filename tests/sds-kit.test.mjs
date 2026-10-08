import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply, check, legacyParts, status } from "../scripts/sds/kit.mjs";

const A = "a".repeat(40), B = "b".repeat(40);
const OLD = "<!-- shirube-v3-runtime:start -->\n# Shirube V3 Runtime Overlay\npolicy_ref: /Users/x\n<!-- shirube-v3-runtime:end -->\n";
function consumer(files) {
  const dir = mkdtempSync(join(tmpdir(), "sds-kit-"));
  for (const [p, s] of Object.entries(files)) { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), s); }
  return dir;
}
const read = (dir, p) => readFileSync(join(dir, p), "utf8");

test("apply replaces the V3 managed block in place, keeps repo text, pins the kit, and check is OK", () => {
  const dir = consumer({ "CLAUDE.md": `# Repo rules\n\n${OLD}\nlocal note\n` });
  const out = apply({ target: dir, commit: A, protected: "none" });
  assert.deepEqual(out.written.sort(), [".claude/skills/sds-audit/SKILL.md", ".github/workflows/sds-gate.yml", ".shirube/sds-pin.json", "CLAUDE.md"].sort());
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
  assert.deepEqual(legacyParts((p) => p in files, (p) => files[p]), [".framework", "AGENTS.md#shirube-v3-runtime"]);
});
test("check lists active entries that still call removed parts (PR36 §2.1)", () => {
  const dir = consumer({ "CLAUDE.md": "x\n", ".claude/settings.json": '{"hooks":{"PreToolUse":[{"command":".claude/hooks/pre-code-gate.sh"}]}}', ".claude/skills/implement/SKILL.md": "check .framework/gates.json", ".claude/hooks/post-task.sh": "bash .claude/hooks/framework-runner.sh" });
  apply({ target: dir, commit: A, protected: "none" });
  const r = check({ target: dir });
  assert.equal(r.verdict, "DRIFT");
  assert.deepEqual(r.stale_refs.sort(), [".claude/hooks/post-task.sh -> framework-runner", ".claude/settings.json -> pre-code-gate", ".claude/skills/implement/SKILL.md -> .framework"].sort());
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
  const api = (path) => {
    const p = path.replace(/^repos\/watchout\/x\/contents\//, "");
    if (p === ".github/workflows") return Object.keys(files).filter((f) => f.startsWith(".github/workflows/")).map((f) => ({ name: f.split("/").pop(), path: f }));
    if (!(p in files)) throw new Error("404");
    return { content: Buffer.from(files[p]).toString("base64") };
  };
  const [r] = status(api, [{ repo: "watchout/x" }]);
  assert.equal(r.sds_commit, A); assert.equal(r.hygiene_pin_match, false); assert.deepEqual(r.legacy, []);
});
