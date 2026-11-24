// The CI-cost pattern for a repository's ci.yml, checked by machine (CI-COST-REDUCE). Read-only, fail closed. The file is read ONCE, by the
// reader in yaml-subset.mjs, into a structure; every rule below judges that structure, never the text. A file the reader refuses (outside its
// small YAML subset, broken, no jobs, a job with no steps) is a FAIL (P7), never a pass. It judges the file only; it runs nothing.
//   P1 a pull request's older run is cancelled and a push to main is not   P2 a job that installs dependencies caches them
//   P3 the required check names stay                                       P4 a required job is never skipped (no job-level if on it or, however far, on a job it needs)
// The rules ACCEPT a small table of known-good forms (P1 groups, P6 guard and pin) and read widely when they look for what they must flag (P2 installs):
// a form outside the table is a finding, never a pass.
//   P5 the workflow runs for a pull request and has no paths filter        P6 ci-scope is pinned to a commit and guards a step by its code answer
//   P7 the file is readable and has jobs, and every job has steps or a reusable workflow
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseYaml, YamlError } from "./yaml-subset.mjs";

const finding = (id, message) => ({ id, message });
const isMap = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");

const validNeeds = (needs) => typeof needs === "string" || (Array.isArray(needs) && needs.every((need) => typeof need === "string"));
function jobShape(id, job) {
  if (!isMap(job)) return `job ${id} is not a mapping`;
  if ("needs" in job && !validNeeds(job.needs)) return `job ${id}: needs must be a job name or a list of job names`;
  if (str(job.uses) !== "") return "steps" in job ? `job ${id} has both uses and steps` : null;
  if (!Array.isArray(job.steps) || job.steps.length === 0) return `job ${id} has neither a reusable workflow nor a non-empty list of steps`;
  const bad = job.steps.findIndex((step) => !isMap(step) || (str(step.run) === "" && str(step.uses) === ""));
  return bad < 0 ? null : `job ${id}: step ${bad + 1} has neither run nor uses`;
}
function readJobs(doc) {
  if (!isMap(doc.jobs) || Object.keys(doc.jobs).length === 0) return { problem: "no jobs were found" };
  const jobs = [];
  for (const [id, job] of Object.entries(doc.jobs)) {
    const problem = jobShape(id, job);
    if (problem) return { problem };
    jobs.push({ id, job, shown: str(job.name) || id, steps: job.steps ?? [] });
  }
  return { jobs };
}

// P1: the cancel condition is exactly "this is a pull request" and the group is one of a small table of forms that give a pull request its own group
// and every other run (a push to main) a group of its own, so only a pull request's older run is cancelled. The group is literal text and ${{ }}
// expressions; every expression must be in the table and at least one must be a run-owning one. A job may carry its own concurrency only with the same
// condition or false.
const CANCEL = /^\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*\}\}$/;
const OWNING = new Set([
  "github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id)",
  "github.head_ref || github.run_id",
  "github.event.pull_request.number || github.run_id",
]);
const DECOR = new Set(["github.workflow"]);
function groupFinding(group) {
  const exprs = [...group.matchAll(/\$\{\{([\s\S]*?)\}\}/g)].map((m) => m[1].trim().replace(/\s+/g, " "));
  const literal = group.replace(/\$\{\{[\s\S]*?\}\}/g, "");
  const known = exprs.every((expr) => OWNING.has(expr) || DECOR.has(expr));
  if (known && !literal.includes("${{") && !literal.includes("}}") && exprs.some((expr) => OWNING.has(expr))) return null;
  return finding("P1", "the concurrency group must be literal text plus expressions from the table in docs/sds/ci-cost-pattern.md (a pull request's own group, and a group of its own for every other run)");
}
function p1(doc, jobs) {
  const top = doc.concurrency;
  const out = [];
  if (!isMap(top)) out.push(finding("P1", "the workflow needs a concurrency map with a group and cancel-in-progress"));
  else {
    if (str(top.group) === "") out.push(finding("P1", "the concurrency group is missing"));
    else {
      const bad = groupFinding(top.group);
      if (bad) out.push(bad);
    }
    if (!CANCEL.test(str(top["cancel-in-progress"]))) out.push(finding("P1", "cancel-in-progress must be exactly ${{ github.event_name == 'pull_request' }} (true only for a pull request, never for a push to main)"));
  }
  for (const { id, job } of jobs) {
    const own = job.concurrency;
    if (isMap(own) && !CANCEL.test(str(own["cancel-in-progress"])) && str(own["cancel-in-progress"]) !== "false") out.push(finding("P1", `job ${id}: its own concurrency cancels more than a pull request's older run`));
  }
  return out;
}

// P2: a job that installs dependencies must cache them: an actions/cache step, or else every setup-node step in it caches (and one exists). Only the
// run value is read, and read widely (a wrong "yes" only asks for a cache): each command (cut at newline ; & |) is split into words, and it is an install
// when a package manager's name is followed by ci, install, i or add anywhere after it (any spacing, quotes, options), or yarn has only options. A shell comment
// line is not an install. An install hidden in a script the file only calls is not seen.
const MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
const VERBS = new Set(["ci", "install", "i", "add"]);
function installCommand(command) {
  const words = command.split(/[\s()'"`]+/).filter((word) => word !== "");
  const at = words.findIndex((word) => MANAGERS.has(word.split("/").at(-1)));
  if (at < 0) return false;
  const rest = words.slice(at + 1);
  const bareYarn = words[at].endsWith("yarn") && rest.every((word) => word.startsWith("-")); // yarn alone, or with only options, installs
  return bareYarn || rest.some((word) => VERBS.has(word));
}
const installs = (step) => str(step.run).split("\n").filter((line) => !line.trim().startsWith("#")).join("\n").split(/[;&|\n]+/).some(installCommand);
const setupCaches = (step) => /^actions\/setup-(?:node|python|java|go|dotnet)@/.test(str(step.uses)) && isMap(step.with) && !["", "false"].includes(str(step.with.cache));
const actionCaches = (step) => /^actions\/cache(?:\/restore)?@/.test(str(step.uses));
function p2(jobs) {
  return jobs.filter(({ steps }) => steps.some(installs)).flatMap(({ id, steps }) => {
    if (steps.some(actionCaches)) return [];
    const setups = steps.filter((step) => /^actions\/setup-node@/.test(str(step.uses)));
    const uncached = setups.filter((step) => !setupCaches(step));
    if (uncached.length) return uncached.map(() => finding("P2", `job ${id}: installs dependencies but a setup-node step has no cache`));
    return setups.length ? [] : [finding("P2", `job ${id}: installs dependencies and nothing caches them`)];
  });
}

const named = (shown, name) => shown === name || shown.startsWith(`${name} (`);
const p3 = (jobs, required) => required.filter((name) => !jobs.some(({ shown }) => named(shown, name))).map((name) => finding("P3", `no job shows the required check name ${JSON.stringify(name)}`));

// P4: a required job has no job-level if, and does not need (however far back) a job that has one: a skipped job skips every job that needs it.
function needsOf(job) {
  if (typeof job.needs === "string") return [job.needs];
  return Array.isArray(job.needs) ? job.needs : [];
}
function p4(jobs, required) {
  const byId = new Map(jobs.map((entry) => [entry.id, entry]));
  const skippedBy = (id, seen) => { // the job (this one or one it needs, at any depth) whose if can skip `id`, or null
    if (seen.has(id) || !byId.has(id)) return null;
    seen.add(id);
    const { job } = byId.get(id);
    if ("if" in job) return id;
    for (const need of needsOf(job)) {
      const found = skippedBy(need, seen);
      if (found) return found;
    }
    return null;
  };
  return jobs.filter(({ shown }) => required.some((name) => named(shown, name))).flatMap(({ id, job }) => {
    if ("if" in job) return [finding("P4", `job ${id} is required and has a job-level if`)];
    const found = skippedBy(id, new Set());
    return found ? [finding("P4", `job ${id} is required and is skipped when ${found} is skipped (a job-level if, reached through needs)`)] : [];
  });
}

// P5: the workflow must run for a pull request, and no trigger may carry a paths filter (a required check would stay pending).
function triggerNames(on) {
  if (isMap(on)) return Object.keys(on);
  if (Array.isArray(on)) return on;
  return typeof on === "string" ? [on] : [];
}
function p5(doc) {
  const out = [];
  if (!triggerNames(doc.on).some((name) => name === "pull_request" || name === "pull_request_target")) out.push(finding("P5", "the workflow must run for a pull_request (a required check would stay pending)"));
  for (const [name, config] of Object.entries(isMap(doc.on) ? doc.on : {})) {
    if (isMap(config) && ("paths" in config || "paths-ignore" in config)) out.push(finding("P5", `${name}: a paths or paths-ignore filter leaves a required check pending`));
  }
  return out;
}

// P6: the ci-scope step's own uses value is pinned to a 40-hex commit of watchout/shirube, it has an id, and every step that reads its answer
// (before or after it) reads it as exactly "steps.<id>.outputs.scope == 'code'" and comes after it; at least one step does.
const PINNED = /^watchout\/shirube\/\.github\/actions\/ci-scope@[0-9a-f]{40}$/;
const mentions = (condition, id) => new RegExp(`steps\\s*[.\\[]\\s*['"]?${id}\\b`).test(condition) || /\.outputs\.scope\b/.test(condition);
const guardsCode = (condition, id) => condition.replace(/^\$\{\{\s*/, "").replace(/\s*\}\}$/, "").replace(/\s+/g, " ") === `steps.${id}.outputs.scope == 'code'`;
function guards(jobId, steps, step, at, id) {
  const out = [];
  let guarded = 0;
  steps.forEach((other, k) => {
    const condition = str(other.if);
    if (other === step || !mentions(condition, id)) return;
    if (k < at || !guardsCode(condition, id)) out.push(finding("P6", `job ${jobId}: a step that reads ${id}'s answer must have exactly if: steps.${id}.outputs.scope == 'code' and come after the ci-scope step`));
    else guarded++;
  });
  if (guarded === 0 && out.length === 0) out.push(finding("P6", `job ${jobId}: no step runs only when ${id}'s scope is 'code'`));
  return out;
}
function scopeStep(jobId, steps, step, at) {
  const out = PINNED.test(str(step.uses)) ? [] : [finding("P6", `job ${jobId}: the ci-scope step's uses must be watchout/shirube/.github/actions/ci-scope@<40-hex commit>`)];
  const id = str(step.id);
  if (!/^[A-Za-z_][\w-]*$/.test(id)) return [...out, finding("P6", `job ${jobId}: the ci-scope step needs an id to read its answer`)];
  return [...out, ...guards(jobId, steps, step, at, id)];
}
const p6 = (jobs) => jobs.flatMap(({ id, steps }) => steps.flatMap((step, at) => (str(step.uses).includes("/.github/actions/ci-scope") ? scopeStep(id, steps, step, at) : [])));

export function checkPattern(text, { required } = {}) {
  const fail = (findings) => ({ verdict: findings.length ? "FAIL" : "PASS", findings });
  if (typeof text !== "string" || text.trim() === "") return fail([finding("P7", "the file is empty or unreadable")]);
  if (!Array.isArray(required) || required.length === 0 || !required.every((name) => typeof name === "string" && name !== "")) return fail([finding("P7", "give the required check names (--required a,b)")]);
  let doc;
  try { doc = parseYaml(text); } catch (error) {
    if (!(error instanceof YamlError)) throw error;
    return fail([finding("P7", `the file is outside the YAML subset this check reads (${error.message})`)]);
  }
  const { jobs, problem } = readJobs(doc);
  if (problem) return fail([finding("P7", problem)]);
  return fail([...p1(doc, jobs), ...p2(jobs), ...p3(jobs, required), ...p4(jobs, required), ...p5(doc), ...p6(jobs)]);
}

function cli(argv) {
  const [file, flag, names] = argv;
  if (!file || flag !== "--required" || !names || argv.length !== 3) throw new Error("usage: pattern-check.mjs <ci.yml> --required <name,name,...>");
  return checkPattern(readFileSync(file, "utf8"), { required: names.split(",").map((name) => name.trim()) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = cli(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify({ check: "ci-pattern", ...result })}\n`);
    if (result.verdict !== "PASS") process.exitCode = 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ check: "ci-pattern", verdict: "ERROR", reason: error.message })}\n`);
    process.exitCode = 2;
  }
}
