import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply, check, legacyParts } from "../scripts/sds/kit.mjs";

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
  const out = apply({ target: dir, commit: A });
  assert.deepEqual(out.written.sort(), [".claude/skills/sds-audit/SKILL.md", ".github/workflows/sds-preflight.yml", ".shirube/sds-pin.json", "CLAUDE.md"].sort());
  const claude = read(dir, "CLAUDE.md");
  assert.match(claude, /^# Repo rules/); assert.match(claude, /local note/);
  assert.doesNotMatch(claude, /shirube-v3-runtime/); assert.match(claude, new RegExp(`watchout/shirube@${A}`));
  assert.match(read(dir, ".github/workflows/sds-preflight.yml"), new RegExp(`sds-preflight.yml@${A}`));
  const pin = JSON.parse(read(dir, ".shirube/sds-pin.json"));
  assert.equal(pin.sds_commit, A); assert.ok(pin.protected_paths.includes(".github/workflows/**"));
  assert.deepEqual(check({ target: dir }), { command: "check", verdict: "OK", sds_commit: A, findings: [], legacy: [] });
});
test("upgrade replaces the SDS-V2 block once and re-pins; re-applying is idempotent", () => {
  const dir = consumer({ "AGENTS.md": "# Agents\n" });
  apply({ target: dir, commit: A }); apply({ target: dir, commit: B }); apply({ target: dir, commit: B });
  const agents = read(dir, "AGENTS.md");
  assert.equal(agents.match(/sds-v2:start/g).length, 1); assert.doesNotMatch(agents, new RegExp(A));
  assert.equal(check({ target: dir }).verdict, "OK");
});
test("check reports drift and old parts without changing anything", () => {
  const dir = consumer({ "CLAUDE.md": "x\n", ".shirube/runtime/rapid-lite/lib.mjs": "", ".github/workflows/merge-authority.yml": "" });
  apply({ target: dir, commit: A });
  writeFileSync(join(dir, ".claude/skills/sds-audit/SKILL.md"), "edited");
  const r = check({ target: dir });
  assert.equal(r.verdict, "DRIFT");
  assert.deepEqual(r.findings, [".claude/skills/sds-audit/SKILL.md differs from the pin"]);
  assert.deepEqual(r.legacy, [".shirube/runtime", ".github/workflows/merge-authority.yml"]);
});
test("a repo without the kit is DRIFT; an unpinned commit is refused", () => {
  assert.equal(check({ target: consumer({ "CLAUDE.md": OLD }) }).legacy[0], "CLAUDE.md#shirube-v3-runtime");
  assert.throws(() => apply({ target: consumer({}), commit: "main" }), /40-hex/);
});
test("legacyParts works over any read source (used by status through the API)", () => {
  const files = { ".framework": "", "AGENTS.md": OLD };
  assert.deepEqual(legacyParts((p) => p in files, (p) => files[p]), [".framework", "AGENTS.md#shirube-v3-runtime"]);
});
