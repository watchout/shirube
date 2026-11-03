// unit-done core (PR-1a): from one sds-unit-done-facts/1 JSON, the nine items K1 to K9, the exceptions and the overall answer (design docs/design/unit-done-check.md v5 §3.4, §3.6;
// work order iyasaka-arc#24 6603553960). The collectors read GitHub and the CI logs; this file only compares what they hand over. It reads no clock, random source, file or network (S4).
const FACTS = "sds-unit-done-facts/1", CHECKLIST = "sds-unit-done-checklist/2", RESULT = "sds-unit-done-result/1", MIN_LINES = 80, DESCRIPTION_MAX = 140;
const EXCEPTION_URL = /^https:\/\/github\.com\/watchout\/iyasaka-arc\/issues\/49#issuecomment-\d+$/, SHA256 = /^[0-9a-f]{64}$/;

const list = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (typeof value === "string" ? value.trim() : "");
const unmet = (target, reason) => ({ target, reason });
const out = (bad = [], seen = []) => ({ unmet: bad, unobserved: seen });
const merge = (parts) => out(parts.flatMap((p) => p.unmet), parts.flatMap((p) => p.unobserved));
const glob = (pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("**", "\0").replaceAll("*", "[^/]*").replaceAll("\0", ".*")}$`);
const inside = (path, patterns) => patterns.some((pattern) => glob(pattern).test(path));

// Every test the junit facts name, by "path::suite::name". A name that is not there is unmet when every junit fact was read, and unobserved when one was not.
function testsOf(facts) {
  const wanted = list(facts.profile?.facts).filter((f) => f.kind === "junit"), read = wanted.map((f) => facts.results?.[f.name]);
  return { wanted, read, status: new Map(read.flatMap((r) => list(r?.cases)).map((c) => [c.id, c.status])), whole: wanted.length > 0 && read.every(Boolean) };
}

function named(tests, names, target) {
  if (!Array.isArray(names) || names.length === 0) return out([unmet(target, "no test named")]);
  return merge(names.map((name) => {
    if (tests.status.get(name) === "pass") return out();
    if (!tests.status.has(name) && !tests.whole) return out([], [`${target}: a junit fact was not read`]);
    return out([unmet(target, `${name} ${tests.status.has(name) ? "did not pass" : "is not in junit"}`)]);
  }));
}

const sourceProblem = (facts) => {
  const files = list(facts.source?.files);
  return files.length > 0 && files.every((f) => f.manifest_sha256 && f.manifest_sha256 === f.actual_sha256) ? null : "source copy differs from its manifest";
};

// K1: every junit fact read, its job succeeded, one test or more, none but passed.
function k1(tests) {
  if (tests.wanted.length === 0) return out([], ["no junit fact in the profile"]);
  return merge(tests.wanted.map((fact, i) => {
    const r = tests.read[i], bad = list(r?.cases).filter((c) => c.status !== "pass").map((c) => unmet(fact.name, `${c.id} ${c.status}`));
    if (!r) return out([], [`${fact.name} not read`]);
    if (r.conclusion !== "success") bad.push(unmet(fact.name, `job ${r.conclusion}`));
    if (list(r.cases).length === 0) bad.push(unmet(fact.name, "0 tests"));
    return out(bad);
  }));
}

function k2(facts) {
  const fact = list(facts.profile?.facts).find((f) => f.kind === "coverage"), r = fact && facts.results?.[fact.name], c = r?.coverage ?? {};
  if (!r) return out([], ["coverage not read"]);
  return out([r.conclusion !== "success" && `job ${r.conclusion}`, c.exit_code !== 0 && `exit_code ${c.exit_code}`, !(c.lines_threshold >= MIN_LINES) && `lines_threshold ${c.lines_threshold} < ${MIN_LINES}`].filter(Boolean).map((why) => unmet(fact.name, why)));
}

function k3(facts, tests, source) {
  const set = facts.source?.acceptance, table = facts.checklist.acceptance ?? {};
  if (source || !Array.isArray(set)) return out([], [source ?? facts.source?.reasons?.acceptance ?? "acceptance not extracted"]);
  const extra = Object.keys(table).filter((id) => !set.includes(id)).map((id) => unmet(id, "not in the unit's acceptance set"));
  return merge([out(extra), ...set.map((id) => named(tests, table[id], id))]);
}

function k4(facts, tests) {
  const records = list(facts.design?.records), mine = list(facts.checklist.design_records), ids = records.map((path) => list(facts.design.ids?.[path]));
  if (records.length === 0 || ids.some((one) => one.length === 0)) return out([], [records.length === 0 ? "no design record named by the handoff" : "no case id in a design record section"]);
  const bad = [...records.filter((p) => !mine.includes(p)).map((p) => unmet(p, "design record missing from the checklist")), ...mine.filter((p) => !records.includes(p)).map((p) => unmet(p, "design record the handoff does not name"))];
  const { design_cases: cases = {}, design_refs: refs = {} } = facts.checklist;
  const one = (id) => (list(cases[id]).length ? named(tests, cases[id], id) : text(refs[id]) ? out() : out([unmet(id, "neither a test nor a reason")]));
  return merge([out(bad), ...[...new Set(ids.flat())].map(one)]);
}

// K5: a pr that changed code_paths files must begin with a commit that adds or changes a test file and touches only test_paths and docs.
function firstCommit(n, first, profile) {
  const tests = list(profile.test_paths), stray = first.filter((f) => !inside(f.path, tests) && !inside(f.path, ["docs/**"]));
  if (!first.some((f) => f.status !== "removed" && inside(f.path, tests))) return unmet(`#${n}`, "first commit adds or changes no test file");
  return stray.length ? unmet(`#${n}`, `first commit changes ${stray[0].path}`) : null;
}

function k5(facts) {
  const bad = [], seen = [];
  for (const n of list(facts.checklist.prs)) {
    const pr = facts.prs?.[n];
    if (!Array.isArray(pr?.files)) seen.push(`#${n} files not read`);
    else if (pr.files.some((p) => inside(p, list(facts.profile.code_paths)))) {
      const found = Array.isArray(pr.first_commit?.files) ? firstCommit(n, pr.first_commit.files, facts.profile) : "unread";
      if (found === "unread") seen.push(`#${n} first commit not read`);
      else if (found) bad.push(found);
    }
  }
  return out(bad, seen);
}

// K6: the collector decides (a) to (f) from the audit records; only the exact value "met" counts.
function k6(facts) {
  const bad = [], seen = [];
  for (const n of list(facts.checklist.prs)) {
    const k = facts.prs?.[n]?.k6;
    if (!k) seen.push(`#${n} audit record not read`);
    for (const letter of k ? "abcdef" : "") {
      if (k[letter] === "unmet") bad.push(unmet(`#${n}`, `(${letter}) unmet`));
      else if (k[letter] !== "met") seen.push(`#${n} (${letter}) unobserved`);
    }
  }
  return out(bad, seen);
}

function k7(facts) {
  const { node_prs: node, closing } = facts.unit_prs ?? {}, mine = list(facts.checklist.prs), unbound = facts.checklist.unbound_prs ?? {};
  if (!Array.isArray(node)) return out([], ["unit prs not read"]);
  return out([...node.filter((n) => !mine.includes(n)).map((n) => unmet(`#${n}`, "names the node but is not in prs")),
    ...mine.filter((n) => n === closing).map((n) => unmet(`#${n}`, "the unit-closing pr must not be in prs")),
    ...mine.filter((n) => !node.includes(n) && n !== closing && !text(unbound[n])).map((n) => unmet(`#${n}`, "does not name the node and has no reason in unbound_prs"))]);
}

function k8(facts, tests, source) {
  const delivery = facts.source?.delivery;
  if (source || !delivery) return out([], [source ?? "delivery plan not extracted"]);
  return delivery.has_demo ? named(tests, facts.checklist.demo, "demo") : { ...out(), na: true };
}

// K9: each condition of the plan (unit conditions, common ones, the stories' own) has a test, a K that is met, or an audit reason.
function condition(item, c, tests, before) {
  if (!c) return out([unmet(item.id, "not in conditions")]);
  if (c.text_sha256 !== item.text_sha256) return out([unmet(item.id, "text_sha256 differs: the plan changed or the checklist is old")]);
  if (list(c.tests).length) return named(tests, c.tests, item.id);
  if (typeof c.k === "string") return before[c.k] === "met" ? out() : out([unmet(item.id, `${c.k} is not met`)]);
  return text(c.audit) ? out() : out([unmet(item.id, "no test, no K and no audit reason")]);
}

function k9(facts, tests, source, before) {
  const delivery = facts.source?.delivery, table = facts.checklist.conditions ?? {};
  if (source || !delivery || list(delivery.dod).length === 0) return out([], [source ?? "no unit condition extracted"]);
  return merge([...list(delivery.dod), ...list(delivery.common), ...list(facts.source.story_conditions)].map((item) => condition(item, table[item.id], tests, before)));
}

// 3.6: only an exception with all five fields and an Owner decision url counts; it turns one unmet finding (item and target) into an excepted one. An unobserved finding is never excepted.
const valid = (e) => ["item", "target", "owner_decision"].every((key) => text(e?.[key])) && EXCEPTION_URL.test(e.url ?? "") && SHA256.test(e.sha256 ?? "");
const rawValue = (o) => (o.na ? "not_applicable" : o.unmet.length ? "unmet" : o.unobserved.length ? "unobserved" : "met");

function settle(id, o, exceptions) {
  const marked = o.unmet.map((f) => ({ ...f, kind: "unmet", excepted: exceptions.some((e) => e.item === id && e.target === f.target) }));
  const value = rawValue({ ...o, unmet: marked.filter((f) => !f.excepted) });
  return { id, value: value === "met" && marked.length ? "excepted" : value, findings: [...marked, ...o.unobserved.map((reason) => ({ target: id, reason, kind: "unobserved" }))] };
}

// The overall answer from the values alone. not_applicable is K8's value only; anywhere else it is unmet.
export function conclude(items) {
  const fixed = items.map((i) => (i.value === "not_applicable" && i.id !== "K8" ? { ...i, value: "unmet", findings: [...list(i.findings), { target: i.id, reason: "not_applicable outside K8", kind: "unmet" }] } : i));
  const clean = fixed.length > 0 && fixed.every((i) => ["met", "excepted"].includes(i.value) || (i.id === "K8" && i.value === "not_applicable"));
  return { result: !clean ? "FAIL" : fixed.some((i) => i.value === "excepted") ? "PASS_WITH_EXCEPTIONS" : "PASS", items: fixed };
}

const firstProblem = (items) => {
  const first = items.find((i) => i.value === "unmet" || i.value === "unobserved"), why = first?.findings.find((f) => f.kind === first.value);
  return first ? `${first.id} ${first.value}: ${why?.target} ${why?.reason}` : "facts unobserved";
};

function statusOf(result, items, listed) {
  const description = { PASS: "PASS", PASS_WITH_EXCEPTIONS: `PASS_WITH_EXCEPTIONS ${listed.length}` }[result] ?? firstProblem(items);
  return { state: result === "FAIL" ? "failure" : "success", description: description.slice(0, DESCRIPTION_MAX) };
}

const answer = (result, items, description) => {
  const listed = items.flatMap((i) => i.findings.filter((f) => f.excepted).map((f) => ({ item: i.id, target: f.target, reason: f.reason })));
  return { schema: RESULT, result, status: description ? { state: "failure", description } : statusOf(result, items, listed), items, exceptions: listed };
};

const shapeProblem = (facts) => {
  const profile = facts?.profile ?? {}, fine = Array.isArray(profile.facts) && ["code_paths", "test_paths"].every((key) => Array.isArray(profile[key])) && text(profile.auditor_login);
  if (facts?.schema !== FACTS) return `facts: not ${FACTS}`;
  return facts.checklist?.schema !== CHECKLIST ? `checklist: not ${CHECKLIST}` : fine ? null : "profile";
};

// facts (sds-unit-done-facts/1) -> { schema: "sds-unit-done-result/1", result, status: { state, description }, items: [{ id, value, findings }], exceptions }.
export function judge(facts) {
  const problem = shapeProblem(facts);
  if (problem) return answer("FAIL", [], problem);
  const tests = testsOf(facts), source = sourceProblem(facts), exceptions = list(facts.checklist.exceptions).filter(valid), before = {};
  const steps = [["K1", () => k1(tests)], ["K2", () => k2(facts)], ["K3", () => k3(facts, tests, source)], ["K4", () => k4(facts, tests)], ["K5", () => k5(facts)], ["K6", () => k6(facts)],
    ["K7", () => k7(facts)], ["K8", () => k8(facts, tests, source)], ["K9", () => k9(facts, tests, source, before)]];
  const items = steps.map(([id, run]) => { const o = run(); before[id] = rawValue(o); return settle(id, o, exceptions); });
  const done = conclude(items);
  return answer(done.result, done.items);
}
