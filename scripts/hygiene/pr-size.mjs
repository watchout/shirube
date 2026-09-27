// PR size check (anti-bloat v5 §4.1 "PR の大きさ"): added lines <= limits.pr_added_lines (400)
// and changed files <= limits.pr_changed_files (20). Deletions are free. Lockfiles, generated files
// (profile.exclude_generated, matched on the real / renamed-to path) and deleted files do not count.
// Binary files added or modified count as a changed file with 0 added lines. Paths are read NUL-separated,
// so quoting and renames cannot corrupt them (audit B07). Raising the limits is a hand edit + owner line.
// Usage: node pr-size.mjs --profile <md> --base <sha> --head <sha> [--cwd .]
import { join } from "node:path";
import { main, readProfile, git, matchesAny, isLockfile, report } from "./lib.mjs";

const CHECK = "pr-size";

// `git diff --numstat -z -M`: "<added>\t<deleted>\t<path>\0" or, for renames, "<added>\t<deleted>\t\0<old>\0<new>\0".
function parseNumstat(text) {
  const parts = text.split("\0");
  const rows = [];
  for (let i = 0; i < parts.length; i += 1) {
    const rec = parts[i];
    if (!rec) continue;
    const [added, deleted, path] = rec.split("\t");
    const rename = path === "";
    const file = rename ? parts[i + 2] : path;
    if (rename) i += 2;
    rows.push({ file, added: added === "-" ? 0 : Number(added), deleted: deleted === "-" ? 0 : Number(deleted), binary: added === "-" });
  }
  return rows;
}

// `git diff --name-status -z -M`: "<status>\0<path>\0" or "R<score>\0<old>\0<new>\0".
function parseStatus(text) {
  const parts = text.split("\0");
  const status = new Map();
  for (let i = 0; i < parts.length; i += 1) {
    const s = parts[i];
    if (!s) continue;
    const rename = s.startsWith("R") || s.startsWith("C");
    const file = rename ? parts[i + 2] : parts[i + 1];
    status.set(file, s[0]);
    i += rename ? 2 : 1;
  }
  return status;
}

function countable(row, status, generated) {
  if (status.get(row.file) === "D") return false;   // deletions are free, binary or not
  if (isLockfile(row.file)) return false;
  if (matchesAny(row.file, generated)) return false; // adopted generated paths, on the real path
  return row.added > 0 || row.binary;                 // pure renames without additions do not count
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  const range = `${args.base}...${args.head}`;
  const rows = parseNumstat(git(cwd, ["diff", "--numstat", "-z", "-M", range]));
  const status = parseStatus(git(cwd, ["diff", "--name-status", "-z", "-M", range]));
  const counted = rows.filter((r) => countable(r, status, profile.exclude_generated));
  const added = counted.reduce((n, r) => n + r.added, 0);
  const { pr_added_lines: maxAdded, pr_changed_files: maxFiles } = profile.limits;
  const failures = [];
  if (added > maxAdded) failures.push({ why: `added ${added} lines > ${maxAdded}` });
  if (counted.length > maxFiles) failures.push({ why: `changed ${counted.length} files > ${maxFiles}` });
  return report(CHECK, failures.length ? "FAIL" : "PASS", { added, files: counted.length, deleted: rows.reduce((n, r) => n + r.deleted, 0), excluded: rows.length - counted.length, failures });
}

main(CHECK, run);
