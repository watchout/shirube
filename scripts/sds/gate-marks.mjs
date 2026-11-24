// The marks that make a PR comment worth re-judging, and the `if:` the sds-gate callers carry.
// The marks are read out of the checker's own sources, never copied here (S3): a mark the checker stops reading, or one
// spelled differently, makes readMarks throw, so no caller keeps narrowing on a stale list. Read-only; fails closed.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCES = [
  ["scripts/hygiene/audit-admission.mjs", /r\.schema === "(sds-audit-request\/1)"/],
  ["scripts/hygiene/audit-admission.mjs", /record\.schema === "(sds-audit-review\/1)"/],
  ["scripts/sds/plan-binding.mjs", /(shirube-v3:control-handoff)\(\?:/],
];

export function readMarks(root) {
  return SOURCES.map(([path, pattern]) => {
    const found = readFileSync(resolve(root, path), "utf8").match(pattern)?.[1];
    if (!found) throw new Error(`gate mark not found in ${path}`);
    return found;
  });
}

// A comment is worth a run when its body, or for an edit the body before the edit, carries a mark, or when the PR body names
// it by URL (the gate reads a comment the PR body points to, marked or not). An empty or missing body, and an edit whose payload
// has no previous body, run: an unreadable comment is judged, never skipped. A comment id that is the start of a longer named id
// also matches; that only adds a run.
export function renderIf(marks) {
  const has = (path) => marks.map((mark) => `contains(${path}, '${mark}')`);
  const terms = [
    "!github.event.comment.body",
    ...has("github.event.comment.body"),
    "(github.event.action == 'edited' && !github.event.changes.body.from)",
    ...has("github.event.changes.body.from"),
    "contains(github.event.issue.body, format('#issuecomment-{0}', github.event.comment.id))",
  ];
  return [
    "    if: ${{ github.event_name == 'pull_request_target' || (github.event.issue.pull_request && (",
    ...terms.map((term, i) => `      ${term}${i < terms.length - 1 ? " ||" : ")) }}"}`),
  ].join("\n");
}

const load = (root, file) => readFileSync(resolve(root, file), "utf8");

export function checkCallers(root, files, read = load) {
  const expected = renderIf(readMarks(root));
  return files.map((file) => {
    const text = read(root, file);
    return { file, ok: text.includes(`\n${expected}\n`) && (text.match(/^ {4}if:/gm) ?? []).length === 1 };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, ...files] = process.argv.slice(2);
  try {
    if (mode === "--print") process.stdout.write(`${renderIf(readMarks("."))}\n`);
    else if (mode === "--check" && files.length) {
      const results = checkCallers(".", files);
      process.stdout.write(`${JSON.stringify({ check: "gate-marks", verdict: results.every((r) => r.ok) ? "PASS" : "DRIFT", results })}\n`);
      if (!results.every((r) => r.ok)) process.exitCode = 1;
    } else throw new Error("usage: gate-marks.mjs --print | --check <caller files...>");
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ check: "gate-marks", verdict: "ERROR", reason: error.message })}\n`);
    process.exitCode = 2;
  }
}
