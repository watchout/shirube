// SDS-V2 kit v0 CLI (docs/sds/distribution.md §3/§5). It never commits, pushes or merges: a seat opens the PR.
//   apply  --target <checkout> --commit <shirube sha> --protected <comma globs|none> [--adoption <url> --adoption-sha256 <hex> --adopted-at <ISO>]
//          (also upgrade). --protected lists the repo's own protected paths (secrets, DB migrations, authority, deploy) on top
//          of the defaults; "none" must be said explicitly so a migration path is never left out by omission.
//   check  --target <consumer checkout>        compare with .shirube/sds-pin.json and list old Shirube parts
//   status [--latest <sha>]                    read every repo in docs/sds/consumers.json through the GitHub API
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../hygiene/lib.mjs";
import { DEFAULT_PROTECTED } from "./gate.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const KIT_VERSION = "0.1.0";
const PIN = ".shirube/sds-pin.json";
const BLOCK = /<!-- (?:sds-v2|shirube-v3-runtime):start -->[\s\S]*?<!-- (?:sds-v2|shirube-v3-runtime):end -->\n?/g;
// Removed parts (docs/sds/distribution.md §2): fixed paths, V3 state files under .shirube/ by name, and old hooks.
const LEGACY = [".shirube/runtime", ".github/workflows/merge-authority.yml", ".github/workflows/shirube-rapid-lite-gates-report.yml", ".framework", ".shirube/profiles"];
const V3_STATE = /^(?:shirube-)?(execution-context|lifecycle-state|control-state-completeness|enforcement-policy|route-policy|repo-spec|framework-lock|adoption-intake|existing-state-scan|v3-normalization|open-pr-inventory|pr-body-refs)(\.|$)/;
const OLD_HOOK = /^(pre-code-gate|framework-runner|framework-mode-check|gate-[\w-]+|skill-tracker)\.sh$/;
const REMOVED_REFS = [".shirube/runtime", ".framework", "pre-code-gate", "framework-runner", "framework-mode-check", "skill-tracker", "hooks/gate-", "merge-authority", "rapid-lite"];
// Active entry points (docs/sds/distribution.md §2.1); directories are walked recursively.
const ENTRIES = [".claude/settings.json", ".claude/skills", ".claude/hooks", ".claude/agents", ".agents/skills/shirube-v3-runtime", ".codex", ".github/workflows", "CLAUDE.md", "AGENTS.md"];
const digest = (s) => createHash("sha256").update(s).digest("hex");
const kit = (p) => readFileSync(join(ROOT, p), "utf8");
// Kit parts are read from the pinned commit itself, so the pin and the written parts always come from one version.
export const gitSource = (commit, p) => execFileSync("git", ["-C", ROOT, "show", `${commit}:${p}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
function need(ok, why) { if (!ok) throw new Error(why); }

export function render(commit, source = gitSource) {
  need(/^[a-f0-9]{40}$/.test(commit ?? ""), "--commit must be a 40-hex shirube commit");
  const part = (p) => source(commit, p).replaceAll("<SHIRUBE_COMMIT>", commit);
  return {
    files: { ".github/workflows/sds-gate.yml": part("kit/sds-gate-caller.yml"), ".claude/skills/sds-audit/SKILL.md": part("kit/skills/sds-audit/SKILL.md"),
      ".github/pull_request_template.md": part("templates/PULL_REQUEST_TEMPLATE.md") },
    block: part("kit/instructions-block.md"),
  };
}
// The first old or SDS-V2 block is replaced in place; any further ones are removed, so a file keeps exactly one.
function withBlock(text, block) {
  let first = true;
  const out = text.replace(BLOCK, () => { const keep = first ? block : ""; first = false; return keep; });
  return first ? `${text.replace(/\n*$/, "\n\n")}${block}` : out;
}
function protectedList(arg, kept) {
  need(typeof arg === "string" && arg.length > 0, "--protected is required: the repo's protected path globs, comma separated, or none");
  const extra = arg === "none" ? [] : arg.split(",").map((g) => g.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_PROTECTED, ...kept, ...extra])];
}
function adoptionRecord(ref, sha256, at) {
  if (!ref) return null;
  need(/^[a-f0-9]{64}$/.test(sha256 ?? ""), "--adoption needs --adoption-sha256 (64-hex body SHA-256 of the adoption record)");
  const when = at ?? new Date().toISOString();
  need(/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(when) && !Number.isNaN(Date.parse(when)), "--adopted-at must be an ISO 8601 time");
  return { ref, sha256, adopted_at: when };
}
const instructionFiles = (target) => { const docs = ["CLAUDE.md", "AGENTS.md"].filter((p) => existsSync(join(target, p))); return docs.length ? docs : ["AGENTS.md"]; };
const readPin = (target) => (existsSync(join(target, PIN)) ? JSON.parse(readFileSync(join(target, PIN), "utf8")) : {});
function confined(target, p) {
  const root = realpathSync(target);
  let cur = join(target, p);
  while (!lstatSync(cur, { throwIfNoEntry: false })) cur = dirname(cur);
  const real = (() => { try { return realpathSync(cur); } catch { return null; } })(); // writes must land inside --target; a dangling or outward link is refused up front
  need(real && (real === root || real.startsWith(root + sep)), `${p} resolves outside --target through a symlink: refused`);
}
// apply and upgrade keep what an existing pin already records: its protected paths and its adoption.
export function apply({ target, commit, protected: prot, adoption, "adoption-sha256": adoptionSha, "adopted-at": adoptedAt }, source = gitSource) {
  const { files, block } = render(commit, source);
  const old = readPin(target);
  const protectedPaths = protectedList(prot, old.protected_paths ?? []);
  const adopted = adoptionRecord(adoption, adoptionSha, adoptedAt) ?? old.adoption ?? null;
  const instructions = instructionFiles(target);
  for (const p of [...Object.keys(files), ...instructions, PIN]) confined(target, p);
  const written = [];
  const write = (p, s) => { mkdirSync(dirname(join(target, p)), { recursive: true }); writeFileSync(join(target, p), s); written.push(p); };
  for (const [p, s] of Object.entries(files)) write(p, s);
  for (const p of instructions) write(p, withBlock(existsSync(join(target, p)) ? readFileSync(join(target, p), "utf8") : "", block));
  const pin = { schema: "sds-pin/1", sds_commit: commit, kit_version: KIT_VERSION, files: Object.fromEntries(Object.entries(files).map(([p, s]) => [p, digest(s)])),
    instructions, protected_paths: protectedPaths, adoption: adopted };
  write(PIN, `${JSON.stringify(pin, null, 2)}\n`);
  return { command: "apply", sds_commit: commit, written, adoption: adopted ? "RECORDED" : "NOT_RECORDED" };
}
export function legacyParts(exists, read, list) {
  const found = LEGACY.filter(exists);
  found.push(...list(".shirube").filter((n) => V3_STATE.test(n)).map((n) => `.shirube/${n}`));
  found.push(...list(".claude/hooks").filter((n) => OLD_HOOK.test(n)).map((n) => `.claude/hooks/${n}`));
  if (exists(".shirube/profile.json") && read(".shirube/profile.json").includes('"shirube_v3"')) found.push(".shirube/profile.json#shirube_v3");
  for (const p of ["CLAUDE.md", "AGENTS.md"]) {
    if (exists(p) && read(p).includes("<!-- shirube-v3-runtime:start -->")) found.push(`${p}#shirube-v3-runtime`);
    if (exists(p) && /^#+ Pre-Code Gate/m.test(read(p))) found.push(`${p}#pre-code-gate`);
  }
  return found;
}
function pinFindings(pin, exists, read, source) {
  const findings = Object.entries(pin.files).filter(([p, sha]) => !exists(p) || digest(read(p)) !== sha).map(([p]) => `${p} differs from the pin`);
  const { block } = render(pin.sds_commit, source);
  // The instruction files the kit wrote must still exist and carry the block (older pins: whichever exist).
  for (const p of pin.instructions ?? ["CLAUDE.md", "AGENTS.md"].filter(exists)) {
    if (!exists(p)) findings.push(`${p} (instruction file written by the kit) is missing`);
    else if (!read(p).includes(block)) findings.push(`${p} lacks the pinned SDS-V2 block`);
  }
  return findings;
}
function walk(root, p) {
  const full = join(root, p);
  if (!existsSync(full)) return [];
  return statSync(full).isDirectory() ? readdirSync(full).flatMap((n) => walk(root, join(p, n))) : [p];
}
export function staleRefs(target) {
  return ENTRIES.flatMap((e) => walk(target, e)).flatMap((p) => {
    const text = readFileSync(join(target, p), "utf8");
    return REMOVED_REFS.filter((r) => text.includes(r)).map((r) => `${p} -> ${r}`);
  });
}
export function check({ target }, source = gitSource) {
  const exists = (p) => existsSync(join(target, p));
  const read = (p) => readFileSync(join(target, p), "utf8");
  const list = (p) => (exists(p) && statSync(join(target, p)).isDirectory() ? readdirSync(join(target, p)) : []);
  const pin = exists(PIN) ? JSON.parse(read(PIN)) : null;
  const findings = pin ? pinFindings(pin, exists, read, source) : [`${PIN} missing`];
  const legacy = legacyParts(exists, read, list);
  const stale = staleRefs(target);
  return { command: "check", verdict: findings.length || legacy.length || stale.length ? "DRIFT" : "OK", sds_commit: pin?.sds_commit ?? null, findings, legacy, stale_refs: stale };
}
function gh(path) { return JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", timeout: 20000 })); }
function remote(api, repo) {
  const errors = [];
  const get = (p) => {
    try { return api(`repos/${repo}/contents/${p}`); }
    catch (error) { if (!/\(HTTP 404\)|\b404\b/.test(error.message)) errors.push(`${p}: ${error.message}`); return null; }
  };
  const read = (p) => Buffer.from(get(p)?.content ?? "", "base64").toString("utf8");
  return { errors, get, read, list: (p) => (get(p) ?? []).map((f) => f.name) };
}
// The pinned parts match their digests and every instruction file the kit wrote still carries the pinned block (repo text may differ).
function pinnedDigests(pin, get, read, source) {
  if (!pin) return null;
  const { block } = render(pin.sds_commit, source);
  return Object.entries(pin.files ?? {}).every(([p, sha]) => get(p) && digest(read(p)) === sha)
    && (pin.instructions ?? ["CLAUDE.md", "AGENTS.md"].filter((p) => get(p))).every((p) => get(p) && read(p).includes(block));
}
// Every shirube reusable workflow a repo calls (*.yml / *.yaml) must use the pinned commit (@main or a tag never matches).
function usesMatch(pin, get, read) {
  const workflows = (get(".github/workflows") ?? []).filter((f) => /\.ya?ml$/.test(f.name)).map((f) => read(f.path)).join("\n");
  const uses = [...workflows.matchAll(/watchout\/shirube\/\.github\/workflows\/[\w.-]+@([^\s"'#]+)/g)].map((m) => m[1]);
  return uses.length ? uses.every((sha) => sha === pin?.sds_commit) : null;
}
const latestFields = (pin, latest) => (latest ? { latest_adopted: latest, up_to_date: pin?.sds_commit === latest }
  : { latest_adopted: null, up_to_date: null, latest_adopted_reason: "not given: pass --latest <commit of the latest adoption record>" });
// Read-only (GET only). A 404 means "absent"; any other failure is reported per repo, never read as "absent".
// latest: the commit of the latest adoption record, passed by the seat (--latest); the kit keeps no registry of adoptions.
export function status(api = gh, consumers = JSON.parse(kit("docs/sds/consumers.json")), latest = undefined, source = gitSource) {
  need(latest === undefined || /^[a-f0-9]{40}$/.test(latest), "--latest must be a 40-hex shirube commit");
  return consumers.map(({ repo }) => {
    const { errors, get, read, list } = remote(api, repo);
    const pin = get(PIN) ? JSON.parse(read(PIN)) : null;
    const hygiene_pin_match = usesMatch(pin, get, read);
    let digest_match = null; try { digest_match = pinnedDigests(pin, get, read, source); } catch (error) { errors.push(`pin ${pin.sds_commit}: ${error.message}`); }
    const legacy = legacyParts((p) => get(p) !== null, read, list);
    return { repo, verdict: errors.length ? "UNKNOWN" : "READ", sds_commit: pin?.sds_commit ?? null, kit_version: pin?.kit_version ?? null,
      adoption: pin?.adoption ?? null, ...latestFields(pin, latest), digest_match, hygiene_pin_match, legacy, errors };
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const run = { apply: () => apply(args), upgrade: () => apply(args), check: () => check(args), status: () => status(gh, undefined, args.latest) }[command];
  try {
    need(run, "usage: kit.mjs apply|upgrade|check|status ...");
    const out = run();
    process.stdout.write(`${JSON.stringify(out)}\n`);
    if (out.verdict === "DRIFT") process.exitCode = 1;
  } catch (error) { process.stdout.write(`${JSON.stringify({ command, verdict: "ERROR", reason: error.message })}\n`); process.exitCode = 2; }
}
