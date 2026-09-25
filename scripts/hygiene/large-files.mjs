// Bulky-file guard (anti-bloat v5 §4.1 "生成物・秘密", AB-10) and secret-suppression guard (AB-18 b/c, v6 proposal).
// 1. Every added or modified file larger than limits.large_file_bytes fails, whatever its extension (audit B05).
//    Only lockfiles and paths listed in profile.large_file_allow (with a reason on the profile page) are exempt.
// 2. A `gitleaks:allow` marker added to a code or config file, or a change to .gitleaks.toml / .gitleaksignore /
//    a gitleaks baseline, needs a profile exception bound to that path (kind, reason, issue, review_by not expired).
//    Mentions in documentation (.md / .txt / .rst) are not suppressions and need no exception (audit B02).
// The secret scan itself is the gitleaks step; this script only guards bulk and suppressions.
// Usage: node large-files.mjs --profile <md> --base <sha> --head <sha> [--today YYYY-MM-DD] [--cwd .]
import { join } from "node:path";
import { main, readProfile, git, matchesAny, isLockfile, extensionOf, report } from "./lib.mjs";

const CHECK = "large-files";
const DOC_EXT = new Set(["md", "txt", "rst"]);
const SUPPRESSION_FILES = /(^|\/)(\.gitleaks\.toml|\.gitleaksignore|gitleaks-baseline\.json)$/;

function changedFiles(cwd, base, head) {
  return git(cwd, ["diff", "--name-only", "-z", "--diff-filter=AM", `${base}...${head}`]).split("\0").filter(Boolean);
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

// An exception covers a path only when it is bound to it, of the right kind, and not expired.
function covered(file, kind, exceptions) {
  return exceptions.some((e) => e.kind === kind && !e.expired && matchesAny(file, [e.path]));
}

function markerAdditions(cwd, base, head, files) {
  const out = new Set();
  for (const f of files.filter((f) => !DOC_EXT.has(extensionOf(f)))) {
    const diff = git(cwd, ["diff", "--unified=0", `${base}...${head}`, "--", f]);
    if (diff.split("\n").some((l) => l.startsWith("+") && !l.startsWith("+++") && l.includes("gitleaks:allow"))) out.add(f);
  }
  return [...out];
}

function suppressionFailures(cwd, base, head, files, exceptions) {
  const failures = [];
  for (const f of files.filter((f) => SUPPRESSION_FILES.test(f))) {
    if (!covered(f, "gitleaks-config", exceptions)) failures.push({ file: f, why: "gitleaks config / ignore / baseline changed without a valid path-bound exception (AB-18 b)" });
  }
  for (const f of markerAdditions(cwd, base, head, files)) {
    if (!covered(f, "gitleaks-allow", exceptions)) failures.push({ file: f, why: "gitleaks:allow added without a valid path-bound exception (AB-18 b)" });
  }
  return failures;
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  const files = changedFiles(cwd, args.base, args.head);
  const failures = [...bulkFailures(cwd, args.head, files, profile), ...suppressionFailures(cwd, args.base, args.head, files, profile.exceptions)];
  const expired = profile.exceptions.filter((e) => e.expired).map((e) => e.path);
  return report(CHECK, failures.length ? "FAIL" : "PASS", { changed: files.length, expired_exceptions: expired, failures });
}

main(CHECK, run);
