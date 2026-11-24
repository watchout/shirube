import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMarks, renderIf, checkCallers } from "../scripts/sds/gate-marks.mjs";

// U2: the kit caller runs the gate on PR comments only when the comment can change a judgment.
// The caller is read as a string (like tests/sds-gate.test.mjs). The evaluator below is a copy of the
// `if:` expression's meaning, not GitHub's own evaluation (design 6: that is observed at a consumer).
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const caller = read("kit/sds-gate-caller.yml");

// The job `if:`: the text between `    if: ${{` and its closing `}}`, joined by single spaces.
function ifExpr(text) {
  const found = [...text.matchAll(/^ {4}if: \$\{\{([\s\S]*?)\}\}\s*$/gm)];
  assert.equal(found.length, 1, "exactly one job `if:` expression");
  return found[0][1].replace(/\s+/g, " ").trim();
}
const EXPR = ifExpr(caller);

// Marks: the one place is scripts/sds/gate-marks.mjs, which reads them out of the checker's own sources (S3).
const [requestMark, reviewMark, planMark] = readMarks(new URL("..", import.meta.url).pathname);
const SELF = read(".github/workflows/sds-gate-self.yml");

// Evaluator for the `if:` language only: contains, ==, !=, !, &&, ||, parentheses, 'strings', github.* paths.
// A missing or null property is the empty string; `!` is true for empty / null / missing, false otherwise.
// This is the one place where those values are interpreted. Anything else throws.
function evaluate(src, ctx) {
  const tokens = src.match(/'[^']*'|==|!=|&&|\|\||[()!,]|[A-Za-z_][\w.]*/g) ?? [];
  assert.equal(tokens.join("").replace(/\s/g, ""), src.replace(/\s/g, ""), `unreadable expression: ${src}`);
  let i = 0;
  const take = (t) => { assert.equal(tokens[i], t, `expected ${t}, got ${tokens[i]}`); i++; };
  const text = (v) => (v == null ? "" : String(v));
  const truthy = (v) => (v == null ? false : typeof v === "string" ? v !== "" : Boolean(v));
  function primary() {
    const t = tokens[i++];
    if (t === "(") { const v = or(); take(")"); return v; }
    if (t === "!") return !truthy(primary());
    if (t?.startsWith("'")) return t.slice(1, -1);
    if (t === "format") {
      take("("); const template = or(); const args = [];
      while (tokens[i] === ",") { i++; args.push(or()); }
      take(")");
      return text(template).replace(/\{(\d+)\}/g, (_, n) => text(args[n]));
    }
    if (t === "contains") {
      take("("); const a = or(); take(","); const b = or(); take(")");
      return text(a).toLowerCase().includes(text(b).toLowerCase());
    }
    assert.ok(t?.startsWith("github."), `unknown token: ${t}`);
    return t.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  }
  function eq() {
    let v = primary();
    while (tokens[i] === "==" || tokens[i] === "!=") { const op = tokens[i++]; const r = primary(); v = op === "==" ? text(v) === text(r) : text(v) !== text(r); }
    return v;
  }
  function and() { let v = eq(); while (tokens[i] === "&&") { i++; const r = eq(); v = truthy(v) ? r : v; } return v; }
  function or() { let v = and(); while (tokens[i] === "||") { i++; const r = and(); v = truthy(v) ? v : r; } return v; }
  const result = or();
  assert.equal(i, tokens.length, `trailing tokens in: ${src}`);
  return truthy(result);
}
const comment = (action, body, issue = { pull_request: { url: "x" } }, id = 1) => ({
  github: { event_name: "issue_comment", event: { action, issue, comment: body === undefined ? { id } : { id, body } } },
});
const prTarget = (action) => ({ github: { event_name: "pull_request_target", event: { action, pull_request: { number: 7 } } } });
const run = (ctx, src = EXPR) => evaluate(src, ctx);

test("T1 the marks in `if:` are exactly the marks the checker uses, for the body and for the body before an edit", () => {
  for (const path of ["comment.body", "changes.body.from"]) {
    const used = [...EXPR.matchAll(new RegExp(`contains\\(github\\.event\\.${path.replace(/\./g, "\\.")}, '([^']+)'\\)`, "g"))].map((m) => m[1]);
    assert.deepEqual([...used].sort(), [requestMark, reviewMark, planMark].sort(), path);
    assert.equal(new Set(used).size, used.length, "each mark appears once");
  }
});

test("T2 the gate still reads PR labels, so labeled / unlabeled stay as triggers", () => {
  assert.match(read("scripts/sds/gate.mjs"), /\(p\.labels \?\? \[\]\)\.map\(\(l\) => l\.name\)\.filter\(\(n\) => \/\^risk:R\[0-4\]\$\/\.test\(n\)\)/);
  assert.match(caller, /pull_request_target:\n\s+types: \[opened, synchronize, reopened, edited, ready_for_review, labeled, unlabeled\]/);
});

test("T3 triggers, permissions, reusable call and input are not widened", () => {
  assert.match(caller, /issue_comment:\n\s+types: \[created, edited, deleted\]/);
  const on = caller.split("\non:\n")[1].split("\npermissions:")[0];
  assert.deepEqual([...on.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]), ["pull_request_target", "issue_comment"]);
  const perms = caller.split("\npermissions:\n")[1].split("\njobs:")[0].trim().split("\n").map((l) => l.trim());
  assert.deepEqual(perms, ["contents: read", "pull-requests: read", "issues: read", "actions: read", "checks: read", "statuses: write"]);
  assert.match(caller, /uses: watchout\/shirube\/\.github\/workflows\/sds-gate\.yml@<SHIRUBE_COMMIT>\n/);
  assert.match(caller, /pr: \$\{\{ github\.event\.pull_request\.number \|\| github\.event\.issue\.number \}\}/);
});

test("T4 a comment without a mark does not run; PR-target events and non-PR issues behave as before", () => {
  assert.equal(run(comment("created", "looks fine to me")), false);
  assert.equal(run(comment("created", "author receipt: accepted")), false);
  assert.equal(run(comment("created", "plain", {})), false);
  assert.equal(run(comment("created", requestMark, {})), false);
  for (const a of ["opened", "synchronize", "reopened", "edited", "ready_for_review", "labeled", "unlabeled"]) assert.equal(run(prTarget(a)), true, a);
});

test("T5 a created comment with a mark runs; an empty, missing or null body runs; blank text is not empty", () => {
  for (const m of [requestMark, reviewMark, planMark]) {
    assert.equal(run(comment("created", `x ${m} y`)), true, m);
    assert.equal(run(comment("created", m.toUpperCase())), true, `${m} upper`);
  }
  assert.equal(run(comment("created", "")), true);
  assert.equal(run(comment("created", undefined)), true);
  assert.equal(run(comment("created", null)), true);
  assert.equal(run(comment("created", "   ")), false);
  const without = EXPR.replace("!github.event.comment.body ||", "");
  assert.notEqual(without, EXPR, "the empty-body clause is present in the expression");
  assert.equal(run(comment("created", ""), without), false, "without the clause an empty body would not run");
});

const edited = (now, before, issue = { pull_request: { url: "x" } }, id = 1) => ({ github: { event_name: "issue_comment", event: { action: "edited", issue, comment: { id, body: now }, changes: before === undefined ? {} : { body: { from: before } } } } });

test("T6 an edit or deletion runs only when the comment, or the body before the edit, carries a mark; a missing body or missing previous body runs", () => {
  assert.equal(run(comment("edited", "plain talk")), true, "edit with no previous body in the payload fails closed");
  assert.equal(run(edited("plain talk", "other talk")), false);
  assert.equal(run(edited("plain talk", `was ${reviewMark}`)), true, "a mark removed by the edit re-judges");
  assert.equal(run(edited(`now ${requestMark}`, "plain")), true, "a mark added by the edit re-judges");
  assert.equal(run(edited("", "plain")), true);
  assert.equal(run(edited(undefined, "plain")), true);
  assert.equal(run(comment("deleted", "plain talk")), false);
  assert.equal(run(comment("deleted", `x ${planMark}`)), true, "a deleted marked comment re-judges the same head");
  assert.equal(run(comment("deleted", undefined)), true, "a deleted comment with no body fails closed");
  assert.equal(run(comment("created", `x ${planMark}`, { pull_request: { url: "x" } })), true);
});

test("T7 no failure hiding, no comment text in run/with, and unreadable expressions throw", () => {
  assert.ok(!/continue-on-error|\|\| true|--if-present/.test(caller));
  assert.ok(!/\brun:/.test(caller));
  assert.ok(!/github\.event\.comment/.test(caller.split("    with:")[1]));
  for (const bad of ["", "(github.event_name == 'x'", "foo(github.event_name)", "github.event_name ==", "github.event_name 'x'"]) {
    assert.throws(() => run(comment("created", "x"), bad), undefined, `must throw: ${bad}`);
  }
  assert.throws(() => ifExpr("name: x\n"), /exactly one/);
  assert.throws(() => ifExpr(`${caller}\n    if: \${{ true }}\n`), /exactly one/);
});

test("T8 removing the added clause restores the old condition; the skip note is in the header", () => {
  const narrowed = /^(github\.event_name == 'pull_request_target' \|\| )\(github\.event\.issue\.pull_request && \(([\s\S]*)\)\)$/.exec(EXPR);
  assert.ok(narrowed, "the narrowing is one parenthesized group after the PR-only condition");
  const old = `${narrowed[1]}github.event.issue.pull_request`;
  assert.equal(run(comment("created", "plain talk"), old), true, "without the clause nothing is narrowed");
  assert.equal(run(comment("created", "plain talk")), false);
  const header = caller.split("\nname: sds-gate\n")[0].split("\n");
  assert.equal(header.filter((l) => /skipped job/i.test(l) && /commit status/i.test(l)).length, 1);
  assert.ok(header.every((l) => l.startsWith("# ")), "the notes are comment lines");
});

test("T9 both callers carry the `if:` that gate-marks.mjs writes; a hand edit or a stale list fails the check", () => {
  const root = new URL("..", import.meta.url).pathname;
  assert.deepEqual(checkCallers(root, ["kit/sds-gate-caller.yml", ".github/workflows/sds-gate-self.yml"]).map((r) => r.ok), [true, true]);
  assert.match(renderIf(readMarks(root)), /^ {4}if: \$\{\{ github\.event_name == 'pull_request_target'/);
  assert.equal(checkCallers(root, ["kit/sds-gate-caller.yml"], () => "# nothing\n")[0].ok, false);
  const dir = mkdtempSync(join(tmpdir(), "marks-"));
  try {
    for (const [path, body] of [["scripts/hygiene/audit-admission.mjs", `r.schema === "sds-audit-request/1"; record.schema === "sds-audit-review/1"`], ["scripts/sds/plan-binding.mjs", "no mark here"]]) {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
    assert.throws(() => readMarks(dir), /gate mark not found in scripts\/sds\/plan-binding\.mjs/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T10 the self caller narrows the same way, and the job's check run is never named like the required check", () => {
  for (const text of [caller, SELF]) {
    assert.equal(ifExpr(text), EXPR);
    const jobId = text.split("\njobs:\n")[1].match(/^ {2}([\w-]+):/m)[1];
    assert.notEqual(jobId, "sds-gate", "a skipped caller job leaves a check run named after the job");
    assert.ok(!/^concurrency:/m.test(text), "a workflow-level group would let a skipped run cancel a judgment in flight");
  }
  const reusable = read(".github/workflows/sds-gate.yml");
  assert.match(reusable, /\n {4}concurrency:\n {6}group: sds-gate-\$\{\{ github\.repository \}\}-\$\{\{ inputs\.pr \}\}\n {6}cancel-in-progress: true\n/);
  assert.match(reusable, /-f context=sds-gate /);
});

test("T11 negative: after a comment without a mark the earlier verdict stays; only a marked event or an edit of a marked comment replaces it", () => {
  const verdicts = {};
  const apply = (ctx, head, verdict) => { if (run(ctx)) verdicts[head] = verdict; };
  apply(prTarget("synchronize"), "h1", "failure");
  for (const ctx of [comment("created", "author receipt: accepted"), comment("created", "thanks"), comment("deleted", "plain"), edited("still plain", "plain")]) apply(ctx, "h1", "success");
  assert.equal(verdicts.h1, "failure", "no unmarked comment can turn a failure into a success");
  apply(edited("plain", `${reviewMark} was here`), "h1", "success");
  assert.equal(verdicts.h1, "success", "removing a marked body re-judges the head");
});

test("T12 the command prints the `if:`, passes on the two callers, reports DRIFT on a stale one and ERROR on a misuse", () => {
  const cli = (...args) => spawnSync(process.execPath, ["scripts/sds/gate-marks.mjs", ...args], { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" });
  const printed = cli("--print");
  assert.equal([printed.status, printed.stdout.trimEnd()].join(), [0, renderIf(readMarks(new URL("..", import.meta.url).pathname))].join());
  const ok = cli("--check", "kit/sds-gate-caller.yml", ".github/workflows/sds-gate-self.yml");
  assert.equal([ok.status, JSON.parse(ok.stdout).verdict].join(), "0,PASS");
  const drift = cli("--check", "kit/sds-gate-caller.yml", "package.json");
  assert.equal([drift.status, JSON.parse(drift.stdout).verdict].join(), "1,DRIFT");
  for (const args of [[], ["--check"], ["--unknown"], ["--check", "no/such/file.yml"]]) {
    const bad = cli(...args);
    assert.equal([bad.status, JSON.parse(bad.stdout).verdict].join(), "2,ERROR", args.join(" "));
  }
});

test("T13 a comment the PR body names by URL re-judges when it is edited or deleted, marked or not; one it does not name does not", () => {
  const pr = (body) => ({ pull_request: { url: "x" }, body });
  const named = pr("audit: https://github.com/watchout/shirube/pull/7#issuecomment-4242 and the plan");
  const event = { edited: (issue, id) => edited("plain talk", "plain before", issue, id), deleted: (issue, id) => comment("deleted", "plain talk", issue, id) };
  for (const [action, make] of Object.entries(event)) {
    assert.equal(run(make(named, 4242)), true, `${action} a named comment`);
    assert.equal(run(make(named, 4243)), false, `${action} an unnamed comment`);
    assert.equal(run(make(pr(undefined), 4242)), false, `${action} with no PR body`);
  }
  assert.equal(run(comment("created", "plain talk", named, 4243)), false);
});
