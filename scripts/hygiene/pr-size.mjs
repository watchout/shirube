// PR size check (anti-bloat v5 §4.1 "PR の大きさ"): added lines <= limits.pr_added_lines (400)
// and changed files <= limits.pr_changed_files (20). Deletions are free. Lockfiles, generated files
// (profile.exclude_generated) and deletion-only files do not count. Binary files count as 0 added lines
// but still count as a changed file. Raising the limits is a hand edit of the profile + owner line.
// Usage: node pr-size.mjs --profile <md> --base <sha> --head <sha> [--cwd .]
import { join } from "node:path";
import { main, readProfile, git, matchesAny, report } from "./lib.mjs";

const CHECK = "pr-size";
const LOCKFILES = ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "uv.lock", "Cargo.lock", "Gemfile.lock"];

function parseNumstat(text) {
  return text.split("\n").filter(Boolean).map((line) => {
    const [added, deleted, ...rest] = line.split("\t");
    const file = rest.join("\t");
    return { file, added: added === "-" ? 0 : Number(added), deleted: deleted === "-" ? 0 : Number(deleted), binary: added === "-" };
  });
}

function countable(row, generated) {
  const base = row.file.split("/").pop();
  if (LOCKFILES.includes(base)) return false;
  if (matchesAny(row.file, generated)) return false;
  if (row.added === 0 && !row.binary) return false; // deletion-only or pure rename
  return true;
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"));
  const rows = parseNumstat(git(cwd, ["diff", "--numstat", "-M", `${args.base}...${args.head}`]));
  const counted = rows.filter((r) => countable(r, profile.exclude_generated || []));
  const added = counted.reduce((n, r) => n + r.added, 0);
  const files = counted.length;
  const { pr_added_lines: maxAdded, pr_changed_files: maxFiles } = profile.limits;
  const failures = [];
  if (added > maxAdded) failures.push({ why: `added ${added} lines > ${maxAdded}` });
  if (files > maxFiles) failures.push({ why: `changed ${files} files > ${maxFiles}` });
  return report(CHECK, failures.length ? "FAIL" : "PASS", { added, files, deleted: rows.reduce((n, r) => n + r.deleted, 0), excluded: rows.length - files, failures });
}

main(CHECK, run);
