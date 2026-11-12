import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

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

// Marks: taken from the scripts the gate uses, not copied here (S3).
const admission = read("scripts/hygiene/audit-admission.mjs");
const requestMark = admission.match(/r\.schema === "(sds-audit-request\/1)"/)?.[1];
const reviewMark = admission.match(/record\.schema === "(sds-audit-review\/1)"/)?.[1];
const planMark = read("scripts/sds/plan-binding.mjs").match(/(shirube-v3:control-handoff)\(\?:/)?.[1];

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
const comment = (action, body, issue = { pull_request: { url: "x" } }) => ({
  github: { event_name: "issue_comment", event: { action, issue, comment: body === undefined ? {} : { body } } },
});
const prTarget = (action) => ({ github: { event_name: "pull_request_target", event: { action, pull_request: { number: 7 } } } });
const run = (ctx, src = EXPR) => evaluate(src, ctx);

test("T1 the marks in `if:` are exactly the marks the gate's scripts use", () => {
  const used = [...EXPR.matchAll(/contains\(github\.event\.comment\.body, '([^']+)'\)/g)].map((m) => m[1]);
  assert.deepEqual([...used].sort(), [requestMark, reviewMark, planMark].sort());
  assert.equal(new Set(used).size, used.length, "each mark appears once");
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

test("T6 edits and deletions run without looking at the body", () => {
  for (const a of ["edited", "deleted"]) {
    assert.equal(run(comment(a, "plain talk")), true, a);
    assert.equal(run(comment(a, undefined)), true, `${a} no body`);
  }
  assert.ok(!/github\.event\.changes/.test(EXPR));
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
