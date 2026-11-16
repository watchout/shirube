// BR2.x-BR3.x: which commits a CI job may show, whether each declared commit is seen and exists in its own repo,
// what the receipt looks like, and how many questions the checker may ask GitHub. Reasons are written out in full here.
import test from "node:test";
import assert from "node:assert/strict";
import { workflowCheck, successfulRun } from "../scripts/hygiene/audit-admission.mjs";
import { intake, decl, ids, key, logText, existence, COMMON, PR_REPO } from "./audit-intake-extra-fixtures.mjs";

const MISSING = "Missing or ambiguous checkout commit", EXTRA = "Undeclared extra checkout commit", UNSEEN = "Declared extra checkout not in CI log";
const ABSENT = "Declared extra checkout not found in declared repo", PARENTS = "Tested merge parents differ from requested base/head";
const D0 = decl(0, 0), { merge, base, head, other } = ids(0), JOB = 101;
const one = (extra = {}) => ({ targets: [{ declare: [D0], ...extra }] });
const accepted = (spec) => { const f = intake(spec); return { f, r: f.preflight() }; };
const refused = (spec, why, mutate) => { const f = intake(spec); mutate?.(f); assert.throws(() => f.preflight(), { message: why }); return f; };
const flip = (sha) => `${sha.slice(0, 39)}${sha.endsWith("0") ? "1" : "0"}`;

test("BR2.2/BR2.3: a declared checkout beside the merge version is accepted, and the merge version is what is reported", () => {
  const { f, r } = accepted(one());
  assert.equal(r.verdict, "READY_FOR_REVIEW"); assert.equal(r.checks[0].runs[0].tested_merge, merge);
  assert.deepEqual(existence(f.calls), [`repos/${COMMON}/git/commits/${D0.commit}`]);
});

test("BR2.5/FR2.8: neither the order of the lines nor repeated lines change the answer", () => {
  accepted(one({ logs: { test: [D0.commit, merge, D0.commit, merge] } }));
  accepted({ targets: [{ declare: [D0], checks: ["lint", "test"], logs: { test: [merge, D0.commit], lint: [merge] } }] });
});

test("BR3.1: a declared commit may show in only some of the target's jobs, but it must show in one", () => {
  accepted({ targets: [{ declare: [D0], checks: ["test", "lint"], logs: { test: [merge, D0.commit], lint: [merge] } }] });
  refused({ targets: [{ declare: [D0], checks: ["test", "lint"], logs: { test: [merge], lint: [merge] } }] }, UNSEEN);
  refused({ targets: [{ declare: [D0], checks: ["test", "lint"], logs: { test: [merge, D0.commit], lint: [merge, other] } }] }, EXTRA);
});

test("BR2.2/BR2.4: a checkout nobody declared, or one digit off a declared one, is refused", () => {
  refused(one({ logs: { test: [merge, D0.commit, other] } }), EXTRA);
  refused(one({ logs: { test: [merge, flip(D0.commit)] } }), EXTRA);
  refused(one({ logs: { test: [merge, D0.commit, decl(0, 1).commit] } }), EXTRA);
});

test("BR2.2: no merge version at all, or the declared commit standing in for it, is refused", () => {
  refused(one({ logs: { test: [D0.commit] } }), MISSING);
  refused(one({ logs: { test: [] } }), MISSING);
  refused({ targets: [{ declare: [{ repo: COMMON, commit: merge }], logs: { test: [merge] } }] }, MISSING);
});

test("BR2.3: the merge version must have exactly the requested base and head as parents, in either order", () => {
  const set = (value) => (f) => f.maps.commits.set(key(PR_REPO, merge), value);
  refused(one(), PARENTS, set({ sha: merge, parents: [{ sha: base }, { sha: other }] }));
  refused(one(), PARENTS, set({ sha: merge, parents: [{ sha: base }] }));
  refused(one(), PARENTS, set({ sha: other, parents: [{ sha: base }, { sha: head }] }));
  assert.equal(intake(one()).preflight().verdict, "READY_FOR_REVIEW");
  const swapped = intake(one()); set({ sha: merge, parents: [{ sha: head }, { sha: base }] })(swapped);
  assert.equal(swapped.preflight().verdict, "READY_FOR_REVIEW");
});

test("BR2.4: a short or upper-case spelling of a declared commit in the log is not that commit", () => {
  for (const shown of [D0.commit.slice(0, 39), D0.commit.slice(0, 7), D0.commit.toUpperCase()]) {
    refused(one(), UNSEEN, (f) => f.maps.logs.set(JOB, logText([merge]) + `2026-10-01T00:00:09Z ${shown}\n`));
  }
});

test("BR3.2: a declared commit that cannot be observed in its own repo is refused, after one question and no retry", () => {
  const answers = [new Error("404"), new Error("ETIMEDOUT"), { sha: other }, { sha: D0.commit.slice(0, 39) }, { sha: D0.commit.toUpperCase() }, "oops", {}, null];
  for (const answer of answers) {
    const f = refused(one(), ABSENT, (g) => g.maps.commits.set(key(COMMON, D0.commit), answer));
    assert.equal(existence(f.calls).length, 1);
  }
});

test("BR3.2: a commit that exists only in another repo does not exist in the declared repo", () => {
  refused(one(), ABSENT, (f) => { f.maps.commits.delete(key(COMMON, D0.commit)); f.maps.commits.set(key("example-org/another-repo", D0.commit), { sha: D0.commit, parents: [] }); });
});

test("BR3.2: four declarations are asked about one by one in the declared order, and the first failure stops the asking", () => {
  const four = [0, 1, 2, 3].map((k) => decl(0, k));
  const { f } = accepted({ targets: [{ declare: four }] });
  assert.deepEqual(existence(f.calls), four.map((d) => `repos/${COMMON}/git/commits/${d.commit}`));
  const g = refused({ targets: [{ declare: four }] }, ABSENT, (x) => x.maps.commits.delete(key(COMMON, four[1].commit)));
  assert.equal(existence(g.calls).length, 2);
});

test("BR3.3: the receipt has the very same shape as one for a request without declarations, and shows no declared value", () => {
  const legacy = intake({ targets: [{ declare: undefined }] }), withDecl = intake(one());
  const a = legacy.preflight(), b = withDecl.preflight(), c = legacy.run(), d = withDecl.run();
  assert.deepEqual(Object.keys(b), Object.keys(a)); assert.deepEqual(Object.keys(b.checks[0].runs[0]), Object.keys(a.checks[0].runs[0]));
  assert.deepEqual(Object.keys(d), Object.keys(c)); assert.equal(d.verdict, "RECEIPT_ACCEPTED");
  for (const text of [JSON.stringify(b), JSON.stringify(d)]) { assert.ok(!text.includes(D0.commit)); assert.ok(!text.includes("example-org")); }
});

test("BR3.6: every reason is one of the fixed sentences and never carries a declared value", () => {
  const marker = "zz-marker-repo", d = { repo: `example-org/${marker}`, commit: decl(0, 0).commit };
  const allowed = [MISSING, EXTRA, UNSEEN, ABSENT, PARENTS, "Invalid extra_checkouts declaration", "Too many extra_checkouts declarations", "Duplicate extra_checkouts commit", "extra_checkouts repo equals the PR repo", "extra_checkouts requires a required check", "Declared extra checkout derives from requested base/head"];
  const cases = [
    [{ declare: [d], logs: { test: [merge, d.commit, other] } }], [{ declare: [d], logs: { test: [merge] } }], [{ declare: [d] }, (f) => f.maps.commits.delete(key(d.repo, d.commit))],
    [{ declare: [d, d] }], [{ declare: [{ ...d, repo: PR_REPO }] }], [{ declare: [d], checks: [] }], [{ declare: [{ ...d, extra: marker }] }], [{ declare: [d, d, d, d, d] }],
    [{ declare: [d] }, (f) => f.maps.commits.set(key(PR_REPO, merge), { sha: merge, parents: [] })],
    [{ declare: [d] }, (f) => f.maps.commits.set(key(d.repo, d.commit), { sha: d.commit, parents: [{ sha: base }] })],
  ];
  for (const [target, mutate] of cases) {
    const f = intake({ targets: [target] }); mutate?.(f);
    assert.throws(() => f.preflight(), (e) => allowed.includes(e.message) && !e.message.includes(marker) && !e.message.includes(d.commit));
  }
});

test("NFR5: the extra questions are at most 4 per target per observation: 8 when asking, 16 when checking a review, for two full targets", () => {
  const full = (i) => ({ declare: [0, 1, 2, 3].map((k) => decl(i, k)) });
  const f = intake({ targets: [full(0), full(1)] });
  assert.equal(f.preflight().verdict, "READY_FOR_REVIEW"); assert.equal(existence(f.calls).length, 8);
  const g = intake({ targets: [full(0), full(1)] });
  assert.equal(g.run().verdict, "RECEIPT_ACCEPTED"); assert.equal(existence(g.calls).length, 16);
});

test("NFR1.5: the review check observes the declared commits a second time and refuses an answer that changed in between", () => {
  const f = intake(one()); let asked = 0;
  const flaky = (p) => { if (p.startsWith(`repos/${COMMON}/`) && ++asked === 2) throw new Error("gone"); return f.api(p); };
  assert.throws(() => f.run({}, flaky), { message: ABSENT });
  assert.equal(asked, 2);
});

test("NFR1.5: a declared commit that stops showing in the job log by the second observation of a review check is refused", () => {
  const f = intake(one()); let reads = 0;
  const later = (p) => (p.endsWith(`/actions/jobs/${JOB}/logs`) && ++reads === 2 ? logText([merge]) : f.api(p));
  assert.throws(() => f.run({}, later), { message: UNSEEN });
});

test("NFR6.1: the same input gives the same output twice, for an acceptance and for a refusal", () => {
  assert.equal(JSON.stringify(intake(one()).run()), JSON.stringify(intake(one()).run()));
  const why = () => { try { intake(one({ logs: { test: [merge] } })).preflight(); } catch (e) { return e.message; } return "accepted"; };
  assert.equal(why(), why()); assert.equal(why(), UNSEEN);
});

test("NFR5.4: a request without declarations asks GitHub the same questions in the same order as before, and none about declarations", () => {
  const f = intake({ targets: [{ declare: undefined }] }), P = `repos/${PR_REPO}`;
  f.preflight();
  assert.deepEqual(f.calls, ["repos/watchout/shirube/issues/comments/1", `${P}/pulls/21`, `${P}/commits/${head}/check-runs?per_page=100`, `${P}/actions/runs/10`, `${P}/actions/jobs/${JOB}`, `${P}/actions/jobs/${JOB}/logs`, `${P}/git/commits/${merge}`, `${P}/contents/items.json?ref=${head}`]);
  const g = intake({ targets: [{ declare: undefined }] }); g.run(); assert.equal(g.calls.length, 19);
});

test("NFR2.2: a caller that does not confirm declarations (the CI-record path) gets the old one-checkout rule, so it fails closed", () => {
  const f = intake(one()), t = f.request.targets[0], run = successfulRun(f.maps.runs.get(head).check_runs, "test", head);
  assert.throws(() => workflowCheck(run, t, f.api), { message: MISSING });
  const seen = new Set();
  assert.equal(workflowCheck(run, t, f.api, seen), merge); assert.deepEqual([...seen], [D0.commit]);
});
