// Bulky-file guard (anti-bloat v5 §4.1 "生成物・秘密", AB-10) and gitleaks-config guard (AB-18 b/c, v6 proposal).
// 1. Every added, modified or renamed-to file larger than limits.large_file_bytes fails, whatever its extension
//    (review B05 / R02). Only lockfiles and paths in profile.large_file_allow (with a reason on the page) are exempt.
// 2. A change to .gitleaks.toml / .gitleaksignore / a gitleaks baseline needs a profile exception of kind
//    `gitleaks-config` bound to that path (unexpired). Marker suppressions are judged by gitleaks itself in
//    secret-suppressions.mjs (review R01), not by text heuristics here.
// Paths come NUL-separated from `git diff --name-status -z -M`, so renames map to their destination (review R02).
// Usage: node large-files.mjs --profile <md> --base <sha> --head <sha> [--today YYYY-MM-DD] [--cwd .]
import { join } from "node:path";
import { main, readProfile, git, matchesAny, isLockfile, report } from "./lib.mjs";

const CHECK = "large-files";
const SUPPRESSION_FILES = /(^|\/)(\.gitleaks\.toml|\.gitleaksignore|gitleaks-baseline\.json)$/;

// Added (A), modified (M), renamed (R) and copied (C) entries; deletions are skipped. Renames yield the new path.
function changedFiles(cwd, base, head) {
  const parts = git(cwd, ["diff", "--name-status", "-z", "-M", `${base}...${head}`]).split("\0");
  const files = [];
  for (let i = 0; i < parts.length; i += 1) {
    const s = parts[i];
    if (!s) continue;
    const rename = s.startsWith("R") || s.startsWith("C");
    const file = rename ? parts[i + 2] : parts[i + 1];
    i += rename ? 2 : 1;
    if (s[0] !== "D") files.push(file);
  }
  return files;
}

function blobSize(cwd, head, file) {
  return Number(git(cwd, ["cat-file", "-s", `${head}:${file}`]).trim());
}

function bulkFailures(cwd, head, files, profile) {
  return files
    .filter((f) => !isLockfile(f) && !matchesAny(f, profile.large_file_allow))
    .map((f) => ({ file: f, bytes: blobSize(cwd, head, f) }))
    .filter((x) => x.bytes > profile.limits.large_file_bytes)
    .map((x) => ({ ...x, why: `file over ${profile.limits.large_file_bytes} bytes (add to profile.large_file_allow with a reason if legitimate)` }));
}

function configFailures(files, exceptions) {
  return files
    .filter((f) => SUPPRESSION_FILES.test(f))
    .filter((f) => !exceptions.some((e) => e.kind === "gitleaks-config" && !e.expired && matchesAny(f, [e.path])))
    .map((f) => ({ file: f, why: "gitleaks config / ignore / baseline changed without a valid path-bound exception (AB-18 b)" }));
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  const files = changedFiles(cwd, args.base, args.head);
  const failures = [...bulkFailures(cwd, args.head, files, profile), ...configFailures(files, profile.exceptions)];
  const expired = profile.exceptions.filter((e) => e.expired).map((e) => e.path);
  return report(CHECK, failures.length ? "FAIL" : "PASS", { changed: files.length, expired_exceptions: expired, failures });
}

main(CHECK, run);
