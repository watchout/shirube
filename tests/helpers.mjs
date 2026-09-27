// Test helpers: build a throwaway git repository and run a check script against it.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const SCRIPTS = resolve(import.meta.dirname, "../scripts/hygiene");

export const PROFILE = (limits = {}, extra = {}) => `# profile\n\n\`\`\`json\n${JSON.stringify({
  language: "js",
  lines: { include: ["src/**"], exclude: ["src/generated/**"] },
  exclude_generated: ["src/generated/**"],
  own_code: { include: ["src/**"], exclude: [] },
  exceptions: [],
  limits: { new_file_lines: 300, pr_added_lines: 400, pr_changed_files: 20, large_file_bytes: 102400, baseline_max_entries: 1, own_code_lines: 1500, ...limits },
  ...extra,
})}\n\`\`\`\n`;

export function repo() {
  const dir = mkdtempSync(join(tmpdir(), "shirube-test-"));
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "t@example.com"]);
  git(dir, ["config", "user.name", "t"]);
  write(dir, ".shirube/hygiene-profile.md", PROFILE());
  commit(dir, "init");
  return dir;
}

export function write(dir, file, content) {
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), content);
}

export function lines(n, prefix = "line") {
  return Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`).join("\n") + "\n";
}

export function git(dir, args) {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}

export function commit(dir, msg) {
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "--allow-empty", "-m", msg]);
  return git(dir, ["rev-parse", "HEAD"]);
}

export function run(script, dir, args = []) {
  const r = spawnSync(process.execPath, [join(SCRIPTS, script), "--cwd", dir, ...args], { encoding: "utf8" });
  const line = r.stdout.trim().split("\n").pop();
  let summary = null;
  try { summary = JSON.parse(line); } catch { summary = { raw: r.stdout, stderr: r.stderr }; }
  return { status: r.status, summary };
}
