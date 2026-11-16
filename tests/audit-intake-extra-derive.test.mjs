// BR3.2 (parents must be readable), BR3.7 (a declared commit never derives from the target's base/head), and the
// declaration-wide negatives: every declared commit must be seen, in the right log form, in its own target, with the
// merge version's parents exactly [base, head]. Reasons are written out in full.
import test from "node:test";
import assert from "node:assert/strict";
import { intake, decl, ids, key, logText, existence, COMMON, PR_REPO } from "./audit-intake-extra-fixtures.mjs";

const DERIVES = "Declared extra checkout derives from requested base/head", ABSENT = "Declared extra checkout not found in declared repo";
const UNSEEN = "Declared extra checkout not in CI log", PARENTS = "Tested merge parents differ from requested base/head";
const D0 = decl(0, 0), { merge, base, head, other } = ids(0), JOB = 101;
const parents = (...shas) => shas.map((sha) => ({ sha }));
const withParents = (d, list) => (f) => f.maps.commits.set(key(d.repo, d.commit), { sha: d.commit, parents: list });
const refused = (spec, why, mutate) => { const f = intake(spec); mutate?.(f); assert.throws(() => f.preflight(), { message: why }); return f; };

test("BR3.7: a second merge version with the same parents, declared under another repo, is refused (one job and two jobs)", () => {
  const twin = withParents(D0, parents(base, head));
  const one = refused({ targets: [{ declare: [D0] }] }, DERIVES, twin);
  assert.equal(existence(one.calls).length, 1);
  refused({ targets: [{ declare: [D0], checks: ["test", "lint"], logs: { test: [merge, D0.commit], lint: [merge] } }] }, DERIVES, twin);
  refused({ targets: [{ declare: [D0], checks: ["test", "lint"], logs: { test: [merge], lint: [merge, D0.commit] } }] }, DERIVES, twin);
});

test("BR3.7: a declared commit that is the base or the head itself is refused", () => {
  for (const commit of [base, head]) refused({ targets: [{ declare: [{ repo: COMMON, commit }], logs: { test: [merge, commit] } }] }, DERIVES);
});

test("BR3.7: one parent equal to the base, or to the head, is enough to refuse", () => {
  for (const list of [parents(base, other), parents(other, base), parents(head, other), parents(other, head), parents(base), parents(head)]) refused({ targets: [{ declare: [D0] }] }, DERIVES, withParents(D0, list));
});

test("BR3.7: parents unrelated to the base and the head, or none, are accepted; the check reads the same one answer", () => {
  for (const list of [parents(other), parents(other, merge), []]) {
    const f = intake({ targets: [{ declare: [D0] }] }); withParents(D0, list)(f);
    assert.equal(f.preflight().verdict, "READY_FOR_REVIEW"); assert.equal(existence(f.calls).length, 1);
  }
});

test("BR3.7: only the target's own base and head count; another target's base is not 'derived from'", () => {
  const f = intake({ targets: [{ declare: undefined }, { declare: [decl(1, 0)] }] }); withParents(decl(1, 0), parents(ids(0).base))(f);
  assert.equal(f.preflight().verdict, "READY_FOR_REVIEW");
});

test("BR3.2: an answer whose parents cannot be read as 40 lower-case hex SHAs is 'not found', never accepted", () => {
  const sha = D0.commit, bad = [undefined, null, "x", {}, 7, [null], [{}], [{ sha: "abc" }], [{ sha: other.toUpperCase() }], [{ sha: 5 }], [other]];
  for (const value of bad) {
    const f = refused({ targets: [{ declare: [D0] }] }, ABSENT, (g) => g.maps.commits.set(key(COMMON, sha), { sha, parents: value }));
    assert.equal(existence(f.calls).length, 1);
  }
  refused({ targets: [{ declare: [D0] }] }, ABSENT, (g) => g.maps.commits.set(key(COMMON, sha), { sha }));
});

test("BR3.7: declarations are judged one by one in order, and the first failure stops further questions", () => {
  const [a, b, c] = [0, 1, 2].map((k) => decl(0, k));
  const f = refused({ targets: [{ declare: [a, b, c] }] }, DERIVES, withParents(b, parents(base)));
  assert.deepEqual(existence(f.calls).map((p) => p.split("/").pop()), [a.commit, b.commit]);
});

test("NFR1.7: the nine new reasons are exactly the sentences of the design's list, each reached by its own case", () => {
  const dup = [D0, { ...D0 }], over = [0, 1, 2, 3, 4].map((k) => decl(0, k));
  const cases = [
    ["Invalid extra_checkouts declaration", { declare: "x" }], ["Too many extra_checkouts declarations", { declare: over }], ["Duplicate extra_checkouts commit", { declare: dup }],
    ["extra_checkouts repo equals the PR repo", { declare: [{ repo: PR_REPO, commit: D0.commit }] }], ["extra_checkouts requires a required check", { declare: [D0], checks: [] }],
    ["Undeclared extra checkout commit", { declare: [D0], logs: { test: [merge, D0.commit, other] } }], [UNSEEN, { declare: [D0], logs: { test: [merge] } }],
    [ABSENT, { declare: [D0] }, (f) => f.maps.commits.delete(key(COMMON, D0.commit))], [DERIVES, { declare: [D0] }, withParents(D0, parents(base, head))],
  ];
  const seen = new Set();
  for (const [why, target, mutate] of cases) { refused({ targets: [target] }, why, mutate); seen.add(why); }
  assert.equal(seen.size, 9);
});

test("A1: every declared commit must be seen, not only one of them", () => {
  const two = [D0, decl(0, 1)], four = [0, 1, 2, 3].map((k) => decl(0, k));
  refused({ targets: [{ declare: two, logs: { test: [merge, D0.commit] } }] }, UNSEEN);
  refused({ targets: [{ declare: two, logs: { test: [merge, two[1].commit] } }] }, UNSEEN);
  refused({ targets: [{ declare: four, logs: { test: [merge, ...four.slice(0, 3).map((d) => d.commit)] } }] }, UNSEEN);
  refused({ targets: [{ declare: four, checks: ["test", "lint"], logs: { test: [merge, four[0].commit, four[1].commit], lint: [merge, four[2].commit] } }] }, UNSEEN);
});

test("A2: a declared commit counts as seen only in the output line of `git log -1 --format=%H`", () => {
  const out = (n, text) => `2026-10-01T00:00:0${n}Z ${text}\n`, cmd = (n, fmt) => out(n, `[command]/usr/bin/git log -1 --format=${fmt}`);
  const forms = {
    "inside another sentence": logText([merge]) + out(5, `note ${D0.commit} in a sentence`),
    "after a %h command": logText([merge]) + cmd(5, "%h") + out(6, D0.commit),
    "with text after the sha": logText([merge]) + cmd(5, "%H") + out(6, `${D0.commit} trailing`),
    "bare, with no command line": logText([merge]) + out(5, D0.commit),
  };
  for (const [label, log] of Object.entries(forms)) refused({ targets: [{ declare: [D0] }] }, UNSEEN, (f) => f.maps.logs.set(JOB, log)), assert.ok(label);
  const ok = intake({ targets: [{ declare: [D0] }] }); ok.maps.logs.set(JOB, logText([merge]) + cmd(5, "%H") + out(6, D0.commit));
  assert.equal(ok.preflight().verdict, "READY_FOR_REVIEW");
});

test("A3: what one target's log shows never counts for another target's declaration, in either order", () => {
  const shared = decl(0, 0);
  refused({ targets: [{ declare: [shared], logs: { test: [ids(0).merge] } }, { declare: [shared] }] }, UNSEEN);
  refused({ targets: [{ declare: [shared] }, { declare: [shared], logs: { test: [ids(1).merge] } }] }, UNSEEN);
  assert.equal(intake({ targets: [{ declare: [shared] }, { declare: [shared] }] }).preflight().verdict, "READY_FOR_REVIEW");
});

test("A4: the merge version's parents must be exactly [base, head] (no third parent, no repeated parent), with or without declarations", () => {
  const set = (list) => (f) => f.maps.commits.set(key(PR_REPO, merge), { sha: merge, parents: list });
  for (const list of [parents(base, head, other), parents(head, head), parents(base, base), parents(head), parents(other, head)]) {
    refused({ targets: [{ declare: [D0] }] }, PARENTS, set(list));
    refused({ targets: [{ declare: undefined }] }, PARENTS, set(list));
  }
});

test("A5: with one declaration, intake asks GitHub exactly these questions in this order, and the declared commit only in its own repo", () => {
  const f = intake({ targets: [{ declare: [D0] }] }), P = `repos/${PR_REPO}`;
  f.preflight();
  assert.deepEqual(f.calls, ["repos/watchout/shirube/issues/comments/1", `${P}/pulls/21`, `${P}/commits/${head}/check-runs?per_page=100`, `${P}/actions/runs/10`, `${P}/actions/jobs/${JOB}`, `${P}/actions/jobs/${JOB}/logs`, `${P}/git/commits/${merge}`, `repos/${COMMON}/git/commits/${D0.commit}`, `${P}/contents/items.json?ref=${head}`]);
});
