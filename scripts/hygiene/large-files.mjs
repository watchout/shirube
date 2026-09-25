// Generated / bulky file guard (anti-bloat v5 §4.1 "生成物・秘密", AB-10) and secret-suppression guard (AB-18 b/c/d).
// 1. Any added or modified non-source file larger than limits.large_file_bytes (100KB) fails.
// 2. Any change that adds `gitleaks:allow`, or touches .gitleaks.toml / .gitleaksignore / a gitleaks baseline,
//    must be listed in profile.exceptions[] (reason + issue + review date); otherwise FAIL.
// The actual secret scan is the gitleaks step in the workflow; this script only guards the suppressions.
// Usage: node large-files.mjs --profile <md> --base <sha> --head <sha> [--cwd .]
import { join } from "node:path";
import { main, readProfile, git, report } from "./lib.mjs";

const CHECK = "large-files";
const SOURCE_EXT = new Set(["js", "mjs", "cjs", "ts", "tsx", "py", "md", "yml", "yaml", "json", "toml", "sh", "sql", "css", "html", "txt"]);
const SUPPRESSION_FILES = /(^|\/)(\.gitleaks\.toml|\.gitleaksignore|gitleaks-baseline\.json)$/;

function changedFiles(cwd, base, head) {
  return git(cwd, ["diff", "--name-only", "--diff-filter=AM", `${base}...${head}`]).split("\n").filter(Boolean);
}

function blobSize(cwd, head, file) {
  return Number(git(cwd, ["cat-file", "-s", `${head}:${file}`]).trim());
}

function largeFailures(cwd, head, files, limit) {
  return files
    .filter((f) => !SOURCE_EXT.has(f.split(".").pop()))
    .map((f) => ({ file: f, bytes: blobSize(cwd, head, f) }))
    .filter((x) => x.bytes > limit)
    .map((x) => ({ ...x, why: `non-source file over ${limit} bytes` }));
}

function suppressionFailures(cwd, base, head, files, exceptions) {
  const touched = files.filter((f) => SUPPRESSION_FILES.test(f));
  const diff = git(cwd, ["diff", "--unified=0", `${base}...${head}`]);
  const allowAdded = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++") && /gitleaks:allow/.test(l));
  const registered = new Set((exceptions || []).map((e) => e.file));
  const failures = [];
  for (const f of touched) if (!registered.has(f)) failures.push({ file: f, why: "secret suppression file changed without a profile.exceptions entry (AB-18 b)" });
  if (allowAdded.length && !registered.has("gitleaks:allow")) failures.push({ count: allowAdded.length, why: "gitleaks:allow added without a profile.exceptions entry (AB-18 b)" });
  return failures;
}

function run(args) {
  const cwd = args.cwd || process.cwd();
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"));
  const files = changedFiles(cwd, args.base, args.head);
  const failures = [...largeFailures(cwd, args.head, files, profile.limits.large_file_bytes), ...suppressionFailures(cwd, args.base, args.head, files, profile.exceptions)];
  return report(CHECK, failures.length ? "FAIL" : "PASS", { changed: files.length, failures });
}

main(CHECK, run);
