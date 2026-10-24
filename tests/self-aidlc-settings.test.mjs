// Moved from the U1 protected-surface PR #66 to keep that PR inside the size limit (iyasaka-arc#49 6377584568): settings, pin, .gitignore and profile contracts; the budget is the Owner's (6379138360).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const ignored = (p) => spawnSync("git", ["check-ignore", "-q", p], { cwd: root }).status === 0;

test("AI-DLC settings: the Agent tool is denied, no .mcp.json exists, the version is pinned, and aidlc.settings.json is valid JSON that names no model id", () => {
  assert.ok(JSON.parse(read(".claude/settings.json")).permissions.deny.includes("Agent"));
  assert.equal(existsSync(resolve(root, ".mcp.json")), false);
  assert.match(read(".aidlc-version"), /^\d+\.\d+\.\d+\n?$/);
  assert.doesNotMatch(JSON.stringify(JSON.parse(read("aidlc.settings.json"))), /"(?:model|modelId|model_id)"\s*:/i, "valid JSON, and the presets never set a model id");
});

test("NFR6.1: the profile leaves AI-DLC records out of size counts, sets the Owner's budget, and loosens no other limit", () => {
  const profile = JSON.parse(read(".shirube/hygiene-profile.md").match(/```json\n([\s\S]*?)\n```/)[1]), { own_code_lines: budget, ...rest } = profile.limits;
  for (const g of ["aidlc/**/*.md", "aidlc/**/*.json", "aidlc/**/*.txt", "docs/**/*.md"]) assert.ok(profile.exclude_generated.includes(g), g);
  assert.deepEqual(rest, { new_file_lines: 300, pr_added_lines: 400, pr_changed_files: 20, large_file_bytes: 102400, baseline_max_entries: 0 });
  assert.equal(budget, 4000, "changing the own-code budget is a protected change that needs the Owner's decision");
});

test("BR7.5: engine copies and audit records stay out of git; the settings and the audit skill stay in", () => {
  for (const p of [".claude/tools/x.ts", ".claude/skills/aidlc-init/SKILL.md", ".claude/agents/a.md", "aidlc/spaces/default/intents/i/audit/a.md"]) assert.ok(ignored(p), `${p} is ignored`);
  for (const p of [".claude/settings.json", ".claude/skills/sds-audit/SKILL.md", "aidlc/spaces/default/intents/i/aidlc-state.md"]) assert.ok(!ignored(p), `${p} is tracked`);
});
