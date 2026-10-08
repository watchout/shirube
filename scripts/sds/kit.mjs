// SDS-V2 kit v0 CLI (docs/sds/distribution.md §3/§5). It never commits, pushes or merges: a seat opens the PR.
//   apply  --target <consumer checkout> --commit <shirube sha> [--adoption <url> --adoption-sha256 <hex>]  (also upgrade)
//   check  --target <consumer checkout>        compare with .shirube/sds-pin.json and list old Shirube parts
//   status                                     read every repo in docs/sds/consumers.json through the GitHub API
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../hygiene/lib.mjs";
import { DEFAULT_PROTECTED } from "./preflight.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const KIT_VERSION = "0.1.0";
const PIN = ".shirube/sds-pin.json";
const BLOCK = /<!-- (?:sds-v2|shirube-v3-runtime):start -->[\s\S]*?<!-- (?:sds-v2|shirube-v3-runtime):end -->\n?/;
const LEGACY = [".shirube/runtime", ".github/workflows/merge-authority.yml", ".github/workflows/shirube-rapid-lite-gates-report.yml", ".framework", ".claude/hooks/pre-code-gate.sh"];
const digest = (s) => createHash("sha256").update(s).digest("hex");
const kit = (p) => readFileSync(join(ROOT, p), "utf8");
function need(ok, why) { if (!ok) throw new Error(why); }

export function render(commit) {
  need(/^[a-f0-9]{40}$/.test(commit ?? ""), "--commit must be a 40-hex shirube commit");
  const sub = (s) => s.replaceAll("<SHIRUBE_COMMIT>", commit);
  return {
    files: { ".github/workflows/sds-preflight.yml": sub(kit("kit/sds-preflight-caller.yml")), ".claude/skills/sds-audit/SKILL.md": kit("kit/skills/sds-audit/SKILL.md") },
    block: sub(kit("kit/instructions-block.md")),
  };
}
function withBlock(text, block) {
  if (BLOCK.test(text)) return text.replace(BLOCK, block);
  return `${text.replace(/\n*$/, "\n\n")}${block}`;
}
export function apply({ target, commit, adoption, "adoption-sha256": adoptionSha }) {
  const { files, block } = render(commit);
  const written = [];
  const write = (p, s) => { mkdirSync(dirname(join(target, p)), { recursive: true }); writeFileSync(join(target, p), s); written.push(p); };
  for (const [p, s] of Object.entries(files)) write(p, s);
  const docs = ["CLAUDE.md", "AGENTS.md"].filter((p) => existsSync(join(target, p)));
  for (const p of docs.length ? docs : ["AGENTS.md"]) write(p, withBlock(existsSync(join(target, p)) ? readFileSync(join(target, p), "utf8") : "", block));
  const pin = { schema: "sds-pin/1", sds_commit: commit, kit_version: KIT_VERSION, files: Object.fromEntries(Object.entries(files).map(([p, s]) => [p, digest(s)])), protected_paths: DEFAULT_PROTECTED, adoption: adoption ? { ref: adoption, sha256: adoptionSha ?? null } : null };
  write(PIN, `${JSON.stringify(pin, null, 2)}\n`);
  return { command: "apply", sds_commit: commit, written };
}
export function legacyParts(exists, read) {
  const found = LEGACY.filter(exists);
  for (const p of ["CLAUDE.md", "AGENTS.md"]) if (exists(p) && read(p).includes("<!-- shirube-v3-runtime:start -->")) found.push(`${p}#shirube-v3-runtime`);
  return found;
}
function pinFindings(pin, exists, read) {
  const findings = Object.entries(pin.files).filter(([p, sha]) => !exists(p) || digest(read(p)) !== sha).map(([p]) => `${p} differs from the pin`);
  const { block } = render(pin.sds_commit);
  for (const p of ["CLAUDE.md", "AGENTS.md"]) if (exists(p) && !read(p).includes(block)) findings.push(`${p} lacks the pinned SDS-V2 block`);
  return findings;
}
export function check({ target }) {
  const exists = (p) => existsSync(join(target, p));
  const read = (p) => readFileSync(join(target, p), "utf8");
  const pin = exists(PIN) ? JSON.parse(read(PIN)) : null;
  const findings = pin ? pinFindings(pin, exists, read) : [`${PIN} missing`];
  const legacy = legacyParts(exists, read);
  return { command: "check", verdict: findings.length || legacy.length ? "DRIFT" : "OK", sds_commit: pin?.sds_commit ?? null, findings, legacy };
}
function gh(path) { return JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", timeout: 20000 })); }
export function status(api = gh) {
  return JSON.parse(kit("docs/sds/consumers.json")).map(({ repo }) => {
    const get = (p) => { try { return api(`repos/${repo}/contents/${p}`); } catch { return null; } };
    const read = (p) => Buffer.from(get(p)?.content ?? "", "base64").toString("utf8");
    const pin = get(PIN) ? JSON.parse(read(PIN)) : null;
    return { repo, sds_commit: pin?.sds_commit ?? null, kit_version: pin?.kit_version ?? null, legacy: legacyParts((p) => get(p) !== null, read) };
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const run = { apply: () => apply(args), upgrade: () => apply(args), check: () => check(args), status: () => status() }[command];
  try {
    need(run, "usage: kit.mjs apply|upgrade|check|status ...");
    const out = run();
    process.stdout.write(`${JSON.stringify(out)}\n`);
    if (out.verdict === "DRIFT") process.exitCode = 1;
  } catch (error) { process.stdout.write(`${JSON.stringify({ command, verdict: "ERROR", reason: error.message })}\n`); process.exitCode = 2; }
}
