// BR1.1-BR1.8: reading the extra_checkouts declaration. Every violation refuses the whole request before any
// declared commit is looked up; the only GitHub read allowed first is the request comment itself.
import test from "node:test";
import assert from "node:assert/strict";
import { intake, decl, ids, COMMON, PR_REPO, existence } from "./audit-intake-extra-fixtures.mjs";

const SHAPE = "Invalid extra_checkouts declaration";
const one = (declare, extra = {}) => ({ targets: [{ declare, ...extra }] });
const refused = (spec, why, label = why) => {
  const f = intake(spec);
  assert.throws(() => f.preflight(), { message: why }, label);
  assert.deepEqual(f.calls, ["repos/watchout/shirube/issues/comments/1"], "nothing but the request comment was read");
  return f;
};

test("BR1.1: no field and an empty list are judged exactly as a request without a declaration", () => {
  for (const declare of [undefined, []]) {
    const f = intake(one(declare)), r = f.preflight();
    assert.equal(r.verdict, "READY_FOR_REVIEW");
    assert.equal(existence(f.calls).length, 0);
    assert.throws(() => intake(one(declare, { logs: { test: [ids(0).merge, decl(0, 0).commit] } })).preflight(), { message: "Missing or ambiguous checkout commit" });
  }
});

test("BR1.2: the field must be a list of {repo, commit} pairs and nothing else", () => {
  const good = decl(0, 0);
  const bad = [
    ["null", null], ["a string", "x"], ["an object", { repo: COMMON, commit: good.commit }], ["a number", 7], ["true", true],
    ["a string element", [good.repo]], ["a null element", [null]], ["a list element", [[good.repo, good.commit]]], ["a number element", [7]],
    ["repo missing", [{ commit: good.commit }]], ["commit missing", [{ repo: COMMON }]], ["a third key", [{ ...good, note: "x" }]],
    ["another name for a key", [{ repository: COMMON, commit: good.commit }]], ["one bad element among good ones", [good, { repo: COMMON }]],
  ];
  for (const [label, declare] of bad) refused(one(declare), SHAPE, label);
});

test("BR1.3: a commit is 40 lower-case hex digits and nothing else", () => {
  const sha = decl(0, 0).commit;
  const commits = [sha.slice(0, 39), sha.slice(0, 7), `${sha}0`, sha.toUpperCase(), `g${sha.slice(1)}`, ` ${sha}`, `${sha}\n`, "", 12, null, [sha]];
  for (const commit of commits) refused(one([{ repo: COMMON, commit }]), SHAPE);
});

test("BR1.3: a repo is owner/name, with no path trickery and no list-shaped value", () => {
  const repos = ["example-org", "a/b/c", "/b", "a/", "", "../b", "a/..", "a/.", "a/...", " a/b", "a/b ", "a b/c", "a/b?x=1", "a/b#x", "a/b\n", "o_w/x", "o.w/x", [COMMON], 5, null];
  for (const repo of repos) refused(one([{ repo, commit: decl(0, 0).commit }]), SHAPE);
});

test("BR1.3: mixed-case owner and a name with . _ - are valid spellings", () => {
  const declare = [{ repo: "Example-Org/Example.Common_1-x", commit: decl(0, 0).commit }];
  assert.equal(intake(one(declare)).preflight().verdict, "READY_FOR_REVIEW");
});

test("BR1.4: the same commit twice is refused, even under two different repos", () => {
  const a = decl(0, 0);
  refused(one([a, { ...a }]), "Duplicate extra_checkouts commit");
  refused(one([a, { repo: "example-org/other-common", commit: a.commit }]), "Duplicate extra_checkouts commit");
});

test("BR1.5: four declarations are the most; the fifth is refused before the elements are read", () => {
  const four = [0, 1, 2, 3].map((k) => decl(0, k)), f = intake(one(four));
  assert.equal(f.preflight().verdict, "READY_FOR_REVIEW");
  assert.equal(existence(f.calls).length, 4);
  refused(one([...four, decl(0, 4)]), "Too many extra_checkouts declarations");
  refused(one([1, 2, 3, 4, 5].map(() => ({ nonsense: true }))), "Too many extra_checkouts declarations");
});

test("BR1.6: a declared repo equal to the PR repo is refused, whatever the letter case", () => {
  for (const repo of [PR_REPO, PR_REPO.toUpperCase(), "Watchout/Example-Product"]) refused(one([{ repo, commit: decl(0, 0).commit }]), "extra_checkouts repo equals the PR repo");
  assert.equal(intake(one([decl(0, 0, "watchout/example-common")])).preflight().verdict, "READY_FOR_REVIEW");
});

test("BR1.7: a declaration needs a required check to be observed in", () => {
  refused(one([decl(0, 0)], { checks: [] }), "extra_checkouts requires a required check");
  assert.equal(intake(one([], { checks: [] })).preflight().verdict, "READY_FOR_REVIEW");
});

test("BR1.1/BR1.8: a declaration binds its own target only, and one bad target refuses the whole request unread", () => {
  const f = intake({ targets: [{ declare: undefined, logs: { test: [ids(0).merge, decl(1, 0).commit] } }, { declare: [decl(1, 0)] }] });
  assert.throws(() => f.preflight(), { message: "Missing or ambiguous checkout commit" });
  const g = intake({ targets: [{ declare: [decl(0, 0)] }, { declare: [{ repo: COMMON }] }] });
  assert.throws(() => g.preflight(), { message: SHAPE });
  assert.deepEqual(g.calls, ["repos/watchout/shirube/issues/comments/1"]);
  const ok = intake({ targets: [{ declare: undefined }, { declare: [decl(1, 0)] }] });
  assert.deepEqual(ok.preflight().checks.map((c) => c.target), ["t0", "t1"]);
});
